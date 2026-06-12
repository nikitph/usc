import type { Verdict3 } from "@usc/shared/generated";

import type { CheckId, MotifName, RulebaseHash } from "../rulebase/types.ts";

export type MotifVector = Readonly<Partial<Record<MotifName, number>>>;

export interface GradientEntry {
  readonly motif: MotifName;
  readonly unlockCount: number;
  readonly unlockedComposites: readonly MotifName[];
}

export interface AstNodeFacts {
  readonly nodeId: string;
  readonly vector: MotifVector;
}

export interface HubCrossing {
  readonly motif: MotifName;
  readonly from: number;
  readonly to: number;
  readonly direction: "entered" | "exited";
}

export interface RuleDiff {
  readonly fromHash: RulebaseHash;
  readonly toHash: RulebaseHash;
  readonly changedSections: readonly RulebaseSection[];
}

export type RulebaseSection =
  | "motifs"
  | "composition"
  | "collisions"
  | "obligation_rules"
  | "diagnostics"
  | "facets";

export type ViabilityVerdict = Verdict3;

export interface RuleDependency {
  readonly section: RulebaseSection;
  readonly checks: readonly CheckId[];
}
