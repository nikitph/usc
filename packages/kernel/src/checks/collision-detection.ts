import type { FactIndex } from "../facts/fact-index.ts";
import type { Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict, type CheckVerdict, type EvidenceGap } from "../verdict/build.ts";
import { evaluateAnd, type Verdict3Value } from "../verdict/kleene.ts";

/**
 * spec §4.4: registry match on node motif signatures → invalid.
 * A qualified collision (e.g. gödelian incompleteness requires COMPLETE
 * self-reference) whose qualifier cannot be verified from structural facts
 * yields unknown, not invalid — the structure is suspicious but the registry
 * entry's own precondition is unestablished (INV-1: never guess).
 */
export function checkCollisionDetection(rulebase: Rulebase, index: FactIndex): CheckVerdict[] {
  const collisions = [...rulebase.collisions].sort((a, b) => (a.name < b.name ? -1 : 1));
  const verdicts: CheckVerdict[] = [];
  for (const nodeId of [...index.nodes].sort()) {
    const claimed = index.claimsByNode.get(nodeId) ?? new Set<string>();
    let value: Verdict3Value = "valid";
    const bindings: Record<string, string> = {};
    const gaps: EvidenceGap[] = [];
    for (const collision of collisions) {
      if (!collision.motifs.every((motif) => claimed.has(motif))) continue;
      if (collision.qualifier === null) {
        value = evaluateAnd(value, "invalid");
        if (bindings["collision"] === undefined) bindings["collision"] = collision.name;
      } else {
        value = evaluateAnd(value, "unknown");
        if (bindings["candidateCollision"] === undefined) {
          bindings["candidateCollision"] = collision.name;
        }
        gaps.push({
          kind: "missing_evidence",
          description: `node "${nodeId}" matches collision "${collision.name}" structurally, but its qualifier cannot be verified from facts: ${collision.qualifier}`,
        });
      }
    }
    verdicts.push(
      buildCheckVerdict({
        check: "collision_detection",
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
