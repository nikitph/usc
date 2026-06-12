export type GateVerdict = "allow" | "deny" | "pending" | "manual_review" | "retry" | "hold";
export type TerminalValidity = "valid" | "invalid" | "unknown";

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

export function dashboardMetrics(runs: readonly TrapRun[]): DashboardMetrics {
  return {
    total: runs.length,
    passing: runs.filter((run) => run.actual.verdict === run.expected.verdict && run.actual.terminalValidity === run.expected.terminalValidity).length,
    overconfidentClosure: runs.filter((run) => run.actual.verdict === "allow" && run.expected.verdict !== "allow").length,
    overcautiousNonClosure: runs.filter((run) => run.actual.verdict !== "allow" && run.expected.verdict === "allow").length,
    falseTerminalDetections: runs.filter((run) => run.expected.terminalValidity === "invalid" && run.actual.terminalValidity === "invalid").length,
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
