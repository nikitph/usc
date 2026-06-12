import type { FactIndex } from "../facts/fact-index.ts";
import type { Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict, type CheckVerdict, type EvidenceGap } from "../verdict/build.ts";
import { evaluateAnd, type Verdict3Value } from "../verdict/kleene.ts";

/**
 * spec §4.2: child transitions vs inherited invariants — a child may
 * strengthen, never weaken (paper §8.3). Fact vocabulary (no seed fixture
 * pins this check yet; adjudicated fixtures may refine it):
 *   inherited_invariant(node, invariantId)        — invariant binds the node
 *   weakens_inherited_invariant(node, invariantId) — a child transition weakens it
 *   invariant_status_unknown(node, invariantId)    — compliance unestablished
 */
export function checkInvariantPropagation(rulebase: Rulebase, index: FactIndex): CheckVerdict[] {
  const verdicts: CheckVerdict[] = [];
  for (const nodeId of [...index.inheritedInvariantsByNode.keys()].sort()) {
    const invariantIds = [...(index.inheritedInvariantsByNode.get(nodeId) ?? [])].sort();
    let value: Verdict3Value = "valid";
    const bindings: Record<string, string> = {};
    const gaps: EvidenceGap[] = [];
    for (const invariantId of invariantIds) {
      if (index.weakenedInvariantsByNode.get(nodeId)?.has(invariantId)) {
        value = evaluateAnd(value, "invalid");
        if (bindings["weakenedInvariant"] === undefined) {
          bindings["weakenedInvariant"] = invariantId;
        }
      } else if (index.unknownInvariantsByNode.get(nodeId)?.has(invariantId)) {
        value = evaluateAnd(value, "unknown");
        gaps.push({
          kind: "missing_evidence",
          description: `compliance with inherited invariant "${invariantId}" at node "${nodeId}" cannot be established`,
        });
      }
    }
    verdicts.push(
      buildCheckVerdict({
        check: "invariant_propagation",
        nodeOrClaim: nodeId,
        value,
        bindings,
        ...(value === "unknown" ? { gaps } : {}),
        kernelVersion: rulebase.hash,
      }),
    );
  }
  return verdicts;
}
