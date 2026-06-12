import type { EvidenceGap, Verdict3Value } from "@usc/kernel";

export type GateVerdict = "allow" | "deny" | "pending" | "manual_review" | "retry" | "hold";

export interface ActionGateAction {
  readonly name: string;
  readonly target: string;
  readonly declaredGoal: string;
}

export interface ActionGateContextEvent {
  readonly text: string;
  readonly ts: string;
}

export interface ActionGateRequest {
  readonly agentId: string;
  readonly action: ActionGateAction;
  readonly context: readonly ActionGateContextEvent[];
  readonly correlationId?: string;
}

export interface ActionGateResponse {
  readonly correlationId: string;
  readonly verdict: GateVerdict;
  readonly terminalValidity: Verdict3Value;
  readonly verdictArtifactId: string;
  readonly mode: "research" | "production";
  readonly actionHash: string;
  readonly rationale: readonly string[];
  readonly gaps: readonly EvidenceGap[];
}

export interface StructuredGateLog {
  readonly correlationId: string;
  readonly actionHash: string;
  readonly verdict: GateVerdict;
  readonly terminalValidity: Verdict3Value;
  readonly verdictArtifactId: string;
}
