import type { Artifact } from "@usc/shared/generated";

export type ArtifactEnvelope = Artifact;
export type ArtifactId = Artifact["id"];
export type ArtifactKind = Artifact["kind"];
export type ArtifactTag = Artifact["tags"][number];

export interface ArtifactPage {
  readonly items: readonly ArtifactEnvelope[];
  readonly nextOffset: number | null;
}

export interface PageRequest {
  readonly limit: number;
  readonly offset?: number;
}

export interface TagEvent {
  readonly artifactId: ArtifactId;
  readonly tag: ArtifactTag;
  readonly op: "tag" | "untag";
  readonly actor: string;
  readonly at: string;
}

export interface ArtifactRepository {
  putArtifact(envelope: ArtifactEnvelope, createdBy: string): Promise<ArtifactEnvelope>;
  getArtifact(id: ArtifactId): Promise<ArtifactEnvelope>;
  getDerivationDag(id: ArtifactId): Promise<readonly ArtifactEnvelope[]>;
  findByKind(kind: ArtifactKind, page: PageRequest): Promise<ArtifactPage>;
  nearestVectors(flat: readonly number[], k: number): Promise<readonly ArtifactEnvelope[]>;
  tagArtifact(id: ArtifactId, tag: ArtifactTag, actor: string): Promise<ArtifactEnvelope>;
  untagArtifact(id: ArtifactId, tag: ArtifactTag, actor: string): Promise<ArtifactEnvelope>;
  hasExperimentalAncestor(id: ArtifactId): Promise<boolean>;
  readonly tagEvents: readonly TagEvent[];
}
