import type { FactIndex } from "../facts/fact-index.ts";
import type { MotifName, Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict, type CheckVerdict, type EvidenceGap } from "../verdict/build.ts";
import { evaluateAnd, type Verdict3Value } from "../verdict/kleene.ts";

/**
 * spec §4.1: every claimed composite's prerequisites present in the scope
 * chain. Missing → invalid (dangling valence, names the missing prereq).
 * Prereq present only via an experimental or unverified token → unknown.
 */
export function checkCompositionCompleteness(
  rulebase: Rulebase,
  index: FactIndex,
): CheckVerdict[] {
  const prerequisitesByComposite = new Map<MotifName, readonly MotifName[]>(
    rulebase.requires.map((requirement) => [requirement.motif, requirement.prerequisites]),
  );
  const verdicts: CheckVerdict[] = [];
  for (const nodeId of [...index.nodes].sort()) {
    const claimed = index.claimsByNode.get(nodeId);
    if (claimed === undefined) continue;
    const claimedComposites = [...claimed]
      .filter((motif) => prerequisitesByComposite.has(motif))
      .sort();
    if (claimedComposites.length === 0) continue;

    let value: Verdict3Value = "valid";
    const bindings: Record<string, string> = {};
    const gaps: EvidenceGap[] = [];
    const missingPrereqs: string[] = [];
    for (const composite of claimedComposites) {
      const prerequisites = [...(prerequisitesByComposite.get(composite) ?? [])].sort();
      for (const prerequisite of prerequisites) {
        const provision = index.providedByNode.get(nodeId)?.get(prerequisite);
        if (claimed.has(prerequisite) || provision === "confirmed") continue;
        if (provision === "experimental") {
          value = evaluateAnd(value, "unknown");
          gaps.push({
            kind: "below_extraction_bar",
            description: `prerequisite "${prerequisite}" of composite "${composite}" at node "${nodeId}" is provided only by an experimental-tagged token`,
          });
        } else if (provision === "unverified") {
          value = evaluateAnd(value, "unknown");
          gaps.push({
            kind: "missing_evidence",
            description: `prerequisite "${prerequisite}" of composite "${composite}" at node "${nodeId}" lacks confirming evidence`,
          });
        } else {
          value = evaluateAnd(value, "invalid");
          missingPrereqs.push(prerequisite);
          if (bindings["missingPrereq"] === undefined) {
            bindings["missingPrereq"] = prerequisite;
            bindings["composite"] = composite;
          }
        }
      }
    }
    if (missingPrereqs.length > 1) bindings["missingPrereqs"] = missingPrereqs.sort().join(",");
    verdicts.push(
      buildCheckVerdict({
        check: "composition_completeness",
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
