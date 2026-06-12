import type { MotifName } from "../rulebase/types.ts";

/** One Datalog-style fact, the kernel's only input shape besides the rulebase. */
export interface Fact {
  readonly fact: string;
  readonly args: readonly string[];
}

/**
 * Minimal motif AST for astToFacts (specs/kernel/SPEC.md §2). Boundary nesting
 * is the only hierarchy (paper §8.3): children inherit everything the scope
 * chain provides.
 */
export interface MotifAstNode {
  readonly id: string;
  readonly claims: readonly MotifName[];
  readonly autonomous?: boolean;
  readonly children?: readonly MotifAstNode[];
}
