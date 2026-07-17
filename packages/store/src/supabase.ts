import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ArtifactSchema } from "@usc/shared/generated";
import { canonicalJson } from "@usc/shared/hashing";

import {
  ArtifactHashMismatchError,
  ArtifactNotFoundError,
  ArtifactStoreError,
  ImmutabilityViolationError,
} from "./errors.ts";
import { expectedArtifactId } from "./hash.ts";
import type {
  ArtifactEnvelope,
  ArtifactId,
  ArtifactKind,
  ArtifactPage,
  ArtifactRepository,
  ArtifactTag,
  PageRequest,
  TagEvent,
} from "./types.ts";

type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [key: string]: Json };

interface ArtifactRow extends Record<string, unknown> {
  id: string;
  kind: string;
  body: Json;
  rulebase_hash: string;
  extractor_version: string | null;
  tags: string[];
  created_at: string;
  created_by: string;
}

interface ArtifactParentRow extends Record<string, unknown> {
  child: string;
  parent: string;
}

interface ArtifactTagEventRow extends Record<string, unknown> {
  artifact_id: string;
  tag: string;
  op: "tag" | "untag";
  actor: string;
  at: string;
}

interface Database {
  public: {
    Tables: {
      artifacts: {
        Row: ArtifactRow;
        Insert: ArtifactRow;
        Update: Partial<Pick<ArtifactRow, "tags">>;
        Relationships: [];
      };
      artifact_parents: {
        Row: ArtifactParentRow;
        Insert: ArtifactParentRow;
        Update: Record<string, never>;
        Relationships: [];
      };
      artifact_tag_events: {
        Row: ArtifactTagEventRow & { id: number };
        Insert: Omit<ArtifactTagEventRow, "at">;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export interface SupabaseArtifactRepositoryOptions {
  readonly url: string;
  readonly serviceRoleKey: string;
}

export class SupabaseArtifactRepository implements ArtifactRepository {
  readonly #client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.#client = client;
  }

  get tagEvents(): readonly TagEvent[] {
    return [];
  }

  async putArtifact(envelope: ArtifactEnvelope, createdBy: string): Promise<ArtifactEnvelope> {
    if (createdBy.length === 0) throw new ArtifactStoreError("createdBy is required");
    const parsed = ArtifactSchema.parse(envelope);
    const expected = expectedArtifactId(parsed);
    if (parsed.id !== expected) throw new ArtifactHashMismatchError(expected, parsed.id);
    await this.#assertParentsExist(parsed.parents);

    const existing = await this.#maybeGetArtifact(parsed.id);
    if (existing !== undefined) {
      if (canonicalJson(existing) !== canonicalJson(parsed)) {
        throw new ImmutabilityViolationError(`artifact id collision for ${parsed.id}`);
      }
      return existing;
    }

    const { error } = await this.#client.from("artifacts").insert(artifactInsert(parsed, createdBy));
    if (error !== null) throw new ArtifactStoreError(error.message);
    if (parsed.parents.length > 0) {
      const parents = parsed.parents.map((parent) => ({ child: parsed.id, parent }));
      const parentInsert = await this.#client.from("artifact_parents").insert(parents);
      if (parentInsert.error !== null) throw new ArtifactStoreError(parentInsert.error.message);
    }
    return parsed;
  }

  async getArtifact(id: ArtifactId): Promise<ArtifactEnvelope> {
    const artifact = await this.#maybeGetArtifact(id);
    if (artifact === undefined) throw new ArtifactNotFoundError(id);
    return artifact;
  }

  async getDerivationDag(id: ArtifactId): Promise<readonly ArtifactEnvelope[]> {
    const visited = new Set<ArtifactId>();
    const ordered: ArtifactEnvelope[] = [];
    const visit = async (artifactId: ArtifactId): Promise<void> => {
      if (visited.has(artifactId)) return;
      visited.add(artifactId);
      const artifact = await this.getArtifact(artifactId);
      ordered.push(artifact);
      for (const parent of artifact.parents) {
        await visit(parent);
      }
    };
    await visit(id);
    return ordered;
  }

  async findByKind(kind: ArtifactKind, page: PageRequest): Promise<ArtifactPage> {
    const offset = page.offset ?? 0;
    const end = offset + page.limit - 1;
    const { data, error } = await this.#client
      .from("artifacts")
      .select("*")
      .eq("kind", kind)
      .order("created_at", { ascending: true })
      .range(offset, end);
    if (error !== null) throw new ArtifactStoreError(error.message);
    const items = await Promise.all((data ?? []).map((row) => this.#rowWithParents(row)));
    return { items, nextOffset: items.length === page.limit ? offset + items.length : null };
  }

  async nearestVectors(flat: readonly number[], k: number): Promise<readonly ArtifactEnvelope[]> {
    throw new ArtifactStoreError(`nearestVectors requires a Supabase RPC backed by pgvector (dims=${flat.length}, k=${k})`);
  }

  async tagArtifact(id: ArtifactId, tag: ArtifactTag, actor: string): Promise<ArtifactEnvelope> {
    return await this.#setTag(id, tag, actor, "tag");
  }

  async untagArtifact(id: ArtifactId, tag: ArtifactTag, actor: string): Promise<ArtifactEnvelope> {
    return await this.#setTag(id, tag, actor, "untag");
  }

  async hasExperimentalAncestor(id: ArtifactId): Promise<boolean> {
    const dag = await this.getDerivationDag(id);
    return dag.some((artifact) => artifact.tags.includes("experimental"));
  }

  async #maybeGetArtifact(id: ArtifactId): Promise<ArtifactEnvelope | undefined> {
    const { data, error } = await this.#client.from("artifacts").select("*").eq("id", id).maybeSingle();
    if (error !== null) throw new ArtifactStoreError(error.message);
    return data === null ? undefined : await this.#rowWithParents(data);
  }

  async #rowWithParents(row: ArtifactRow): Promise<ArtifactEnvelope> {
    const { data, error } = await this.#client
      .from("artifact_parents")
      .select("parent")
      .eq("child", row.id)
      .order("parent", { ascending: true });
    if (error !== null) throw new ArtifactStoreError(error.message);
    return rowToArtifact(row, (data ?? []).map((parentRow) => parentRow.parent));
  }

  async #assertParentsExist(parents: readonly ArtifactId[]): Promise<void> {
    for (const parent of parents) {
      await this.getArtifact(parent);
    }
  }

  async #setTag(
    id: ArtifactId,
    tag: ArtifactTag,
    actor: string,
    op: TagEvent["op"],
  ): Promise<ArtifactEnvelope> {
    if (actor.length === 0) throw new ArtifactStoreError("actor is required");
    const artifact = await this.getArtifact(id);
    const tags = new Set(artifact.tags);
    if (op === "tag") tags.add(tag);
    else tags.delete(tag);
    const update = await this.#client.from("artifacts").update({ tags: [...tags].sort() }).eq("id", id);
    if (update.error !== null) throw new ArtifactStoreError(update.error.message);
    const event = await this.#client.from("artifact_tag_events").insert({
      artifact_id: id,
      tag,
      op,
      actor,
    });
    if (event.error !== null) throw new ArtifactStoreError(event.error.message);
    return await this.getArtifact(id);
  }
}

export function createSupabaseArtifactRepository(
  options: SupabaseArtifactRepositoryOptions,
): SupabaseArtifactRepository {
  return new SupabaseArtifactRepository(createClient<Database>(options.url, options.serviceRoleKey));
}

function artifactInsert(artifact: ArtifactEnvelope, createdBy: string): ArtifactRow {
  return {
    id: artifact.id,
    kind: artifact.kind,
    body: artifact.body as unknown as Json,
    rulebase_hash: artifact.rulebaseHash,
    extractor_version: artifact.extractorVersion ?? null,
    tags: [...artifact.tags],
    created_at: artifact.createdAt,
    created_by: createdBy,
  };
}

function rowToArtifact(row: ArtifactRow, parents: readonly string[]): ArtifactEnvelope {
  return ArtifactSchema.parse({
    id: row.id,
    kind: row.kind,
    body: row.body,
    rulebaseHash: row.rulebase_hash,
    parents,
    ...(row.extractor_version === null ? {} : { extractorVersion: row.extractor_version }),
    tags: row.tags,
    createdAt: row.created_at,
  });
}
