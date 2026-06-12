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

interface StoredArtifact {
  readonly envelope: ArtifactEnvelope;
  readonly createdBy: string;
}

export class InMemoryArtifactRepository implements ArtifactRepository {
  readonly #artifacts = new Map<ArtifactId, StoredArtifact>();
  readonly #tagEvents: TagEvent[] = [];

  get tagEvents(): readonly TagEvent[] {
    return this.#tagEvents.map((event) => ({ ...event }));
  }

  async putArtifact(envelope: ArtifactEnvelope, createdBy: string): Promise<ArtifactEnvelope> {
    if (createdBy.length === 0) {
      throw new ArtifactStoreError("createdBy is required");
    }
    const parsed = ArtifactSchema.parse(envelope);
    const expected = expectedArtifactId(parsed);
    if (parsed.id !== expected) {
      throw new ArtifactHashMismatchError(expected, parsed.id);
    }
    for (const parent of parsed.parents) {
      if (!this.#artifacts.has(parent)) {
        throw new ArtifactNotFoundError(parent);
      }
    }

    const existing = this.#artifacts.get(parsed.id);
    if (existing !== undefined) {
      if (canonicalJson(existing.envelope) !== canonicalJson(parsed)) {
        throw new ImmutabilityViolationError(`artifact id collision for ${parsed.id}`);
      }
      return cloneArtifact(existing.envelope);
    }

    const stored = freezeArtifact(parsed);
    this.#artifacts.set(parsed.id, { envelope: stored, createdBy });
    return cloneArtifact(stored);
  }

  async getArtifact(id: ArtifactId): Promise<ArtifactEnvelope> {
    return cloneArtifact(this.#readArtifact(id).envelope);
  }

  async getDerivationDag(id: ArtifactId): Promise<readonly ArtifactEnvelope[]> {
    this.#readArtifact(id);
    const visited = new Set<ArtifactId>();
    const ordered: ArtifactEnvelope[] = [];
    const visit = (artifactId: ArtifactId): void => {
      if (visited.has(artifactId)) return;
      visited.add(artifactId);
      const stored = this.#readArtifact(artifactId);
      ordered.push(stored.envelope);
      for (const parent of [...stored.envelope.parents].sort()) {
        visit(parent);
      }
    };
    visit(id);
    return ordered.map((artifact) => cloneArtifact(artifact));
  }

  async findByKind(kind: ArtifactKind, page: PageRequest): Promise<ArtifactPage> {
    if (!Number.isInteger(page.limit) || page.limit < 1) {
      throw new ArtifactStoreError("page.limit must be a positive integer");
    }
    const offset = page.offset ?? 0;
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ArtifactStoreError("page.offset must be a non-negative integer");
    }
    const matches = [...this.#artifacts.values()]
      .map((stored) => stored.envelope)
      .filter((artifact) => artifact.kind === kind)
      .sort(compareArtifacts);
    const items = matches.slice(offset, offset + page.limit).map((artifact) => cloneArtifact(artifact));
    const nextOffset = offset + items.length < matches.length ? offset + items.length : null;
    return { items, nextOffset };
  }

  async nearestVectors(flat: readonly number[], k: number): Promise<readonly ArtifactEnvelope[]> {
    if (flat.length === 0 || !Number.isInteger(k) || k < 1) {
      throw new ArtifactStoreError("nearestVectors requires a non-empty vector and positive k");
    }
    throw new ArtifactStoreError("nearestVectors requires the Postgres pgvector adapter");
  }

  async tagArtifact(id: ArtifactId, tag: ArtifactTag, actor: string): Promise<ArtifactEnvelope> {
    return this.#applyTag(id, tag, actor, "tag");
  }

  async untagArtifact(id: ArtifactId, tag: ArtifactTag, actor: string): Promise<ArtifactEnvelope> {
    return this.#applyTag(id, tag, actor, "untag");
  }

  async hasExperimentalAncestor(id: ArtifactId): Promise<boolean> {
    const dag = await this.getDerivationDag(id);
    return dag.some((artifact) => artifact.tags.includes("experimental"));
  }

  #readArtifact(id: ArtifactId): StoredArtifact {
    const stored = this.#artifacts.get(id);
    if (stored === undefined) {
      throw new ArtifactNotFoundError(id);
    }
    return stored;
  }

  #applyTag(
    id: ArtifactId,
    tag: ArtifactTag,
    actor: string,
    op: TagEvent["op"],
  ): ArtifactEnvelope {
    if (actor.length === 0) {
      throw new ArtifactStoreError("actor is required");
    }
    const stored = this.#readArtifact(id);
    const tagSet = new Set(stored.envelope.tags);
    if (op === "tag") {
      tagSet.add(tag);
    } else {
      tagSet.delete(tag);
    }
    const updated = freezeArtifact({
      ...stored.envelope,
      tags: [...tagSet].sort(),
    });
    this.#artifacts.set(id, { ...stored, envelope: updated });
    this.#tagEvents.push({ artifactId: id, tag, op, actor, at: new Date().toISOString() });
    return cloneArtifact(updated);
  }
}

function compareArtifacts(left: ArtifactEnvelope, right: ArtifactEnvelope): number {
  const created = left.createdAt.localeCompare(right.createdAt);
  return created === 0 ? left.id.localeCompare(right.id) : created;
}

function cloneArtifact(artifact: ArtifactEnvelope): ArtifactEnvelope {
  return ArtifactSchema.parse(JSON.parse(JSON.stringify(artifact)));
}

function freezeArtifact(artifact: ArtifactEnvelope): ArtifactEnvelope {
  return deepFreeze(cloneArtifact(artifact));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }
  return value;
}
