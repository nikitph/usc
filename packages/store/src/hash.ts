import { canonicalJson, sha256Hex } from "@usc/shared/hashing";

import type { ArtifactEnvelope, ArtifactId } from "./types.ts";

export interface ArtifactHashInput {
  readonly kind: ArtifactEnvelope["kind"];
  readonly body: ArtifactEnvelope["body"];
  readonly rulebaseHash: ArtifactEnvelope["rulebaseHash"];
  readonly parents: readonly ArtifactId[];
}

export function computeArtifactId(input: ArtifactHashInput): ArtifactId {
  return sha256Hex(
    canonicalJson({
      kind: input.kind,
      body: input.body,
      rulebaseHash: input.rulebaseHash,
      parents: [...input.parents],
    }),
  );
}

export function expectedArtifactId(envelope: ArtifactEnvelope): ArtifactId {
  return computeArtifactId({
    kind: envelope.kind,
    body: envelope.body,
    rulebaseHash: envelope.rulebaseHash,
    parents: envelope.parents,
  });
}
