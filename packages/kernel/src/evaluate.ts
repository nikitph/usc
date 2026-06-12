import { checkCollisionDetection } from "./checks/collision-detection.ts";
import { checkCompositionCompleteness } from "./checks/composition-completeness.ts";
import { checkFepViability } from "./checks/fep-viability.ts";
import { checkInvariantPropagation } from "./checks/invariant-propagation.ts";
import { checkProvenance } from "./checks/provenance-check.ts";
import { checkTerminalValidity } from "./checks/terminal-validity.ts";
import { buildFactIndex } from "./facts/fact-index.ts";
import type { Fact } from "./facts/types.ts";
import type { Rulebase, RulebaseHash } from "./rulebase/types.ts";
import type { CheckVerdict } from "./verdict/build.ts";

export interface KernelReport {
  readonly kernelVersion: RulebaseHash;
  readonly verdicts: readonly CheckVerdict[];
}

/**
 * The interpreter (spec §2): all checks, all Verdict3s, sorted by
 * (check, nodeOrClaim) — same rulebase + same facts = byte-identical report
 * regardless of fact order (INV-2; the property suite shuffles to prove it).
 */
export function evaluate(rulebase: Rulebase, facts: readonly Fact[]): KernelReport {
  const index = buildFactIndex(facts);
  const verdicts = [
    ...checkCompositionCompleteness(rulebase, index),
    ...checkInvariantPropagation(rulebase, index),
    ...checkFepViability(rulebase, index),
    ...checkCollisionDetection(rulebase, index),
    ...checkTerminalValidity(rulebase, index),
    ...checkProvenance(rulebase, index),
  ].sort(compareVerdicts);
  return Object.freeze({ kernelVersion: rulebase.hash, verdicts: Object.freeze(verdicts) });
}

function compareVerdicts(a: CheckVerdict, b: CheckVerdict): number {
  if (a.check !== b.check) return a.check < b.check ? -1 : 1;
  return a.nodeOrClaim < b.nodeOrClaim ? -1 : a.nodeOrClaim > b.nodeOrClaim ? 1 : 0;
}
