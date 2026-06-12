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
