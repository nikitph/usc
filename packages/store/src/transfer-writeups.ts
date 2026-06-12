import type { ArtifactEnvelope, ArtifactId } from "./types.ts";
import { computeArtifactId } from "./hash.ts";

export interface TransferWriteupBody {
  readonly id: string;
  readonly sourceDomain: string;
  readonly targetDomain: string;
  readonly sourcePattern: string;
  readonly targetPattern: string;
  readonly structuralClaim: string;
  readonly evidenceNeeded: readonly string[];
  readonly reviewState: "expert_review_pending";
  readonly autoInsertEnabled: false;
}

const transferRulebaseHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const generatedAt = "2026-06-13T00:00:00.000Z";

export function transferWriteupArtifacts(): readonly ArtifactEnvelope[] {
  return [
    transferArtifact({
      id: "transfer:circuit-breaker:exposure-cutoff",
      sourceDomain: "distributed-systems",
      targetDomain: "cooperative-bank-compliance",
      sourcePattern: "Circuit breaker containment",
      targetPattern: "Exposure limit cutoff",
      structuralClaim: "Both stop terminal closure when feedback crosses a bounded risk threshold.",
      evidenceNeeded: ["expert confirms threshold semantics", "domain owner confirms terminal hold semantics"],
      reviewState: "expert_review_pending",
      autoInsertEnabled: false,
    }),
    transferArtifact({
      id: "transfer:stale-cache:expired-sanction",
      sourceDomain: "distributed-systems",
      targetDomain: "cooperative-bank-compliance",
      sourcePattern: "Stale cache contract",
      targetPattern: "Expired sanction handling",
      structuralClaim: "Both failures treat stale authority evidence as if it were current.",
      evidenceNeeded: ["expert confirms authority freshness bar", "reviewer checks anti-pattern severity"],
      reviewState: "expert_review_pending",
      autoInsertEnabled: false,
    }),
    transferArtifact({
      id: "transfer:reconciliation-job:interbranch-dccb",
      sourceDomain: "distributed-systems",
      targetDomain: "cooperative-bank-compliance",
      sourcePattern: "Replica reconciliation job",
      targetPattern: "Inter-branch DCCB reconciliation",
      structuralClaim: "Both converge divergent ledgers under an authority-backed resolution procedure.",
      evidenceNeeded: ["expert verifies reconciliation authority", "audit trail requirements mapped"],
      reviewState: "expert_review_pending",
      autoInsertEnabled: false,
    }),
    transferArtifact({
      id: "transfer:idempotency-key:duplicate-entry",
      sourceDomain: "distributed-systems",
      targetDomain: "cooperative-bank-compliance",
      sourcePattern: "Idempotency key suppression",
      targetPattern: "Duplicate-entry suppression in CBS",
      structuralClaim: "Both bind repeated requests to a stable identity before mutating state.",
      evidenceNeeded: ["expert confirms duplicate detection key", "operator validates retry boundary"],
      reviewState: "expert_review_pending",
      autoInsertEnabled: false,
    }),
    transferArtifact({
      id: "transfer:canary-deploy:pilot-branch-rollout",
      sourceDomain: "distributed-systems",
      targetDomain: "cooperative-bank-compliance",
      sourcePattern: "Canary deployment",
      targetPattern: "Pilot branch policy rollout",
      structuralClaim: "Both constrain blast radius while feedback validates the rollout before expansion.",
      evidenceNeeded: ["expert confirms pilot branch scope", "reviewer maps feedback escalation path"],
      reviewState: "expert_review_pending",
      autoInsertEnabled: false,
    }),
  ];
}

function transferArtifact(body: TransferWriteupBody): ArtifactEnvelope {
  const draft = {
    kind: "transfer_evaluation" as const,
    body: { ...body },
    rulebaseHash: transferRulebaseHash,
    parents: [] as ArtifactId[],
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [],
    createdAt: generatedAt,
  };
}
