import { computeArtifactId, type ArtifactEnvelope, type ArtifactId } from "@usc/store";

export type RecommendationOutcome = "accepted" | "rejected" | "needs_more_evidence" | "succeeded" | "failed";

export interface RecommendationFeedbackInput {
  readonly id: string;
  readonly recommendationArtifactId: ArtifactId;
  readonly emittedArtifactIds: readonly ArtifactId[];
  readonly outcome: RecommendationOutcome;
  readonly reviewer: string;
  readonly notes: string;
  readonly observedAt: string;
  readonly rulebaseHash: string;
}

export function feedbackEventArtifact(input: RecommendationFeedbackInput): ArtifactEnvelope {
  const body = {
    id: input.id,
    recommendationArtifactId: input.recommendationArtifactId,
    emittedArtifactIds: [...input.emittedArtifactIds].sort(),
    outcome: input.outcome,
    reviewer: input.reviewer,
    notes: input.notes,
    observedAt: input.observedAt,
  };
  const draft = {
    kind: "feedback_event" as const,
    body,
    rulebaseHash: input.rulebaseHash,
    parents: [input.recommendationArtifactId, ...input.emittedArtifactIds].sort(),
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [],
    createdAt: input.observedAt,
  };
}
