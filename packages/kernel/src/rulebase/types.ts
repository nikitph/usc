import type { MotifObligation, MotifToken } from "@usc/shared/generated";

/** The 32 motif names — the type is owned by schemas/motif_token.schema.json (INV-9). */
export type MotifName = MotifToken["motif"];

/** ProcessIR event types obligations may trigger on (specs/kernel/SPEC.md §3 — closed union). */
export const PROCESS_IR_EVENT_TYPES = [
  "privileged_transition",
  "state_destruction",
  "external_commitment",
  "scope_exit",
  "irreversible_effect",
] as const;
export type ProcessIrEventType = (typeof PROCESS_IR_EVENT_TYPES)[number];

export type ObligationType = MotifObligation["type"];
export type ObligationSafeDefault = MotifObligation["safeDefault"];

/** The six checks evaluate() implements (specs/kernel/SPEC.md §4). */
export const SEMANTIC_CHECK_IDS = [
  "composition_completeness",
  "invariant_propagation",
  "fep_viability",
  "collision_detection",
  "terminal_validity",
  "provenance_check",
] as const;
export type CheckId = (typeof SEMANTIC_CHECK_IDS)[number];

export type MotifGroup = "A" | "B" | "C" | "D" | "E" | "F";

export interface MotifDefinition {
  readonly id: number;
  readonly name: MotifName;
  readonly displayName: string;
  readonly group: MotifGroup;
  readonly groupName: string;
  readonly question: string;
  readonly definition: string;
  readonly hub: boolean;
  readonly provenance: string;
}

export interface CompositionRequirement {
  readonly motif: MotifName;
  readonly prerequisites: readonly MotifName[];
  readonly provenance: string;
}

export interface EmergentComposite {
  readonly name: string;
  readonly recipe: readonly MotifName[];
  readonly structuralMeaning: string;
  readonly provenance: string;
}

export interface MotifCollision {
  readonly name: string;
  readonly motifs: readonly MotifName[];
  readonly structuralImpossibility: string;
  readonly qualifier: string | null;
  readonly provenance: string;
}

/**
 * Provenance statuses for rulebase data: "transcribed" = copied from
 * paper/blueprint/adjudicated fixtures; "drafted" = agent-drafted with
 * explicit owner approval, grounded but not spelled out in the sources.
 */
export type RulebaseEntryStatus = "transcribed" | "drafted";

/** A rule with encoded semantics, ready for the evaluator. */
export interface ActiveObligationRule {
  readonly id: string;
  readonly eventType: ProcessIrEventType;
  readonly opens: ObligationType;
  readonly dischargedBy: string;
  readonly safeDefault: ObligationSafeDefault;
  readonly mandatory: boolean;
  readonly blocking: boolean;
  readonly status: RulebaseEntryStatus;
  readonly provenance: string;
}

/** An event type whose mapping is not yet sourced; the evaluator must treat it as opening nothing. */
export interface TodoObligationRule {
  readonly id: string;
  readonly eventType: ProcessIrEventType;
  readonly opens: null;
  readonly dischargedBy: null;
  readonly mandatory: null;
  readonly blocking: null;
  readonly safeDefault: null;
  readonly status: "todo_human_adjudication";
  readonly provenance: string;
}

export type ObligationRule = ActiveObligationRule | TodoObligationRule;

export interface SemanticCheckDefinition {
  readonly name: string;
  readonly question: string;
  readonly requiredMotifs?: readonly MotifName[];
  readonly provenance: string;
}

export interface DiagnosticPassDefinition {
  readonly name: string;
  readonly question: string;
  readonly provenance: string;
}

export interface MotifFacets {
  readonly motif: MotifName;
  readonly facets: readonly string[];
  readonly status: RulebaseEntryStatus | "todo_human_adjudication";
  readonly provenance: string;
}

export interface Rulebase {
  readonly hash: RulebaseHash;
  readonly motifs: readonly MotifDefinition[];
  readonly requires: readonly CompositionRequirement[];
  readonly emergentComposites: readonly EmergentComposite[];
  readonly collisions: readonly MotifCollision[];
  readonly eventTypes: readonly ProcessIrEventType[];
  readonly obligationRules: readonly ObligationRule[];
  readonly terminalClaimObligationTypes: readonly ObligationType[];
  readonly semanticChecks: readonly SemanticCheckDefinition[];
  readonly diagnosticPasses: readonly DiagnosticPassDefinition[];
  readonly facets: readonly MotifFacets[];
}

/** Branded at the boundary (STANDARDS.md D2); constructed only by loadRulebase. */
export type RulebaseHash = string & { readonly __brand: "RulebaseHash" };
