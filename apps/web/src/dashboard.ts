export type GateVerdict = "allow" | "deny" | "pending" | "manual_review" | "retry" | "hold";
export type TerminalValidity = "valid" | "invalid" | "unknown";
export type PatternReviewState = "pending" | "accepted" | "rejected";

export interface TrapRun {
  readonly id: string;
  readonly name: string;
  readonly expected: {
    readonly verdict: GateVerdict;
    readonly terminalValidity: TerminalValidity;
  };
  readonly actual: {
    readonly verdict: GateVerdict;
    readonly terminalValidity: TerminalValidity;
  };
  readonly obligations: readonly LedgerRow[];
  readonly gaps: readonly string[];
  readonly rationale: readonly string[];
}

export interface LedgerRow {
  readonly id: string;
  readonly type: string;
  readonly status: "satisfied" | "violated" | "unknown";
  readonly safeDefault: GateVerdict;
  readonly evidence: string;
}

export interface DashboardMetrics {
  readonly total: number;
  readonly passing: number;
  readonly overconfidentClosure: number;
  readonly overcautiousNonClosure: number;
  readonly falseTerminalDetections: number;
}

export interface PatternReviewRow {
  readonly id: string;
  readonly artifactKind: "pattern" | "anti_pattern";
  readonly name: string;
  readonly domain: string;
  readonly state: PatternReviewState;
  readonly reviewer?: string;
}

export interface PatternReviewMetrics {
  readonly pending: number;
  readonly accepted: number;
  readonly rejected: number;
}

export interface RetrievalRow {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly domain: string;
  readonly vectorScore: number;
  readonly structuralScore: number;
  readonly richnessScore: number;
  readonly score: number;
  readonly autoInsertEnabled: false;
}

export interface RecommendationRow {
  readonly id: string;
  readonly title: string;
  readonly rank: number;
  readonly diagnosisInformationGain: number;
  readonly collapsedSymptoms: readonly string[];
  readonly warnings: readonly string[];
}

export interface FeedbackSummaryRow {
  readonly id: string;
  readonly recommendationId: string;
  readonly outcome: "accepted" | "rejected" | "needs_more_evidence" | "succeeded" | "failed";
  readonly reviewer: string;
}

export const trapRuns: readonly TrapRun[] = [
  {
    id: "trap-001",
    name: "Expired authority on success-shaped completion",
    expected: { terminalValidity: "invalid", verdict: "deny" },
    actual: { terminalValidity: "invalid", verdict: "deny" },
    obligations: [
      {
        id: "authority_on_privileged_transition",
        type: "authority",
        status: "violated",
        safeDefault: "deny",
        evidence: "CAB-9913 expired before execution",
      },
    ],
    gaps: [],
    rationale: ["authority obligation violated", "approval evidence expired before execution"],
  },
  {
    id: "trap-002",
    name: "Evidence timeout stays pending",
    expected: { terminalValidity: "unknown", verdict: "pending" },
    actual: { terminalValidity: "unknown", verdict: "pending" },
    obligations: [
      {
        id: "evidence_on_state_destruction",
        type: "evidence",
        status: "unknown",
        safeDefault: "pending",
        evidence: "retention check timed out",
      },
    ],
    gaps: ["budget_exhausted"],
    rationale: ["terminal_validity=unknown", "verdict=pending"],
  },
];

export const patternReviewRows: readonly PatternReviewRow[] = [
  {
    id: "pattern:distributed-systems:circuit-breaker",
    artifactKind: "pattern",
    name: "Circuit breaker containment",
    domain: "distributed-systems",
    state: "pending",
  },
  {
    id: "pattern:cooperative-bank-compliance:exposure-cutoff",
    artifactKind: "pattern",
    name: "Exposure limit cutoff",
    domain: "cooperative-bank-compliance",
    state: "accepted",
    reviewer: "human-reviewer",
  },
  {
    id: "anti-pattern:distributed-systems:stale-cache-contract",
    artifactKind: "anti_pattern",
    name: "Stale cache contract",
    domain: "distributed-systems",
    state: "rejected",
    reviewer: "human-reviewer",
  },
];

export const retrievalRows: readonly RetrievalRow[] = [
  {
    id: "transfer:circuit-breaker:exposure-cutoff",
    source: "Circuit breaker containment",
    target: "Exposure limit cutoff",
    domain: "cooperative-bank-compliance",
    vectorScore: 1,
    structuralScore: 1,
    richnessScore: 1,
    score: 1,
    autoInsertEnabled: false,
  },
  {
    id: "transfer:stale-cache:expired-sanction",
    source: "Stale cache contract",
    target: "Expired sanction handling",
    domain: "cooperative-bank-compliance",
    vectorScore: 1,
    structuralScore: 1,
    richnessScore: 0.5,
    score: 0.925,
    autoInsertEnabled: false,
  },
  {
    id: "transfer:idempotency-key:duplicate-entry",
    source: "Idempotency key suppression",
    target: "Duplicate-entry suppression in CBS",
    domain: "cooperative-bank-compliance",
    vectorScore: 0.816497,
    structuralScore: 0.5,
    richnessScore: 0.5,
    score: 0.642424,
    autoInsertEnabled: false,
  },
];

export const recommendationRows: readonly RecommendationRow[] = [
  {
    id: "recommendation:bounded-feedback-authority",
    title: "Add bounded feedback authority",
    rank: 1,
    diagnosisInformationGain: 2.35,
    collapsedSymptoms: ["missing_feedback", "stale_authority", "terminal_overclaim"],
    warnings: ["near anti-pattern: stale authority close"],
  },
  {
    id: "recommendation:patch-feedback",
    title: "Patch missing feedback",
    rank: 2,
    diagnosisInformationGain: 0.9,
    collapsedSymptoms: ["missing_feedback"],
    warnings: [],
  },
];

export const feedbackSummaryRows: readonly FeedbackSummaryRow[] = [
  {
    id: "feedback:golden-expired-authority",
    recommendationId: "recommendation:bounded-feedback-authority",
    outcome: "accepted",
    reviewer: "golden-reviewer",
  },
];

export function dashboardMetrics(runs: readonly TrapRun[]): DashboardMetrics {
  return {
    total: runs.length,
    passing: runs.filter((run) => run.actual.verdict === run.expected.verdict && run.actual.terminalValidity === run.expected.terminalValidity).length,
    overconfidentClosure: runs.filter((run) => run.actual.verdict === "allow" && run.expected.verdict !== "allow").length,
    overcautiousNonClosure: runs.filter((run) => run.actual.verdict !== "allow" && run.expected.verdict === "allow").length,
    falseTerminalDetections: runs.filter((run) => run.expected.terminalValidity === "invalid" && run.actual.terminalValidity === "invalid").length,
  };
}

export function patternReviewMetrics(rows: readonly PatternReviewRow[]): PatternReviewMetrics {
  return {
    pending: rows.filter((row) => row.state === "pending").length,
    accepted: rows.filter((row) => row.state === "accepted").length,
    rejected: rows.filter((row) => row.state === "rejected").length,
  };
}

export function verdictClass(verdict: GateVerdict): string {
  switch (verdict) {
    case "allow":
      return "ok";
    case "deny":
      return "bad";
    case "pending":
    case "manual_review":
    case "retry":
    case "hold":
      return "warn";
  }
}

export function reviewStateClass(state: PatternReviewState): string {
  switch (state) {
    case "accepted":
      return "ok";
    case "pending":
      return "warn";
    case "rejected":
      return "bad";
  }
}

export function topRetrievalRows(rows: readonly RetrievalRow[], limit: number): readonly RetrievalRow[] {
  return [...rows]
    .sort((left, right) => {
      const score = right.score - left.score;
      return score === 0 ? left.id.localeCompare(right.id) : score;
    })
    .slice(0, limit);
}

export function orderedRecommendationRows(rows: readonly RecommendationRow[]): readonly RecommendationRow[] {
  return [...rows].sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id));
}

export function feedbackOutcomeCounts(rows: readonly FeedbackSummaryRow[]): Readonly<Record<FeedbackSummaryRow["outcome"], number>> {
  return {
    accepted: rows.filter((row) => row.outcome === "accepted").length,
    rejected: rows.filter((row) => row.outcome === "rejected").length,
    needs_more_evidence: rows.filter((row) => row.outcome === "needs_more_evidence").length,
    succeeded: rows.filter((row) => row.outcome === "succeeded").length,
    failed: rows.filter((row) => row.outcome === "failed").length,
  };
}
