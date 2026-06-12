import { RulebaseConflictError } from "../errors.ts";
import type { FactIndex } from "../facts/fact-index.ts";
import type { Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict, type CheckVerdict, type EvidenceGap } from "../verdict/build.ts";
import { evaluateAnd, type Verdict3Value } from "../verdict/kleene.ts";

/**
 * spec §4.3: autonomous nodes must instantiate the viability manifold —
 * the required motif set is DATA (diagnostics.json fep_viability.requiredMotifs:
 * state, boundary, transition, feedback per paper §5), not code.
 */
export function checkFepViability(rulebase: Rulebase, index: FactIndex): CheckVerdict[] {
  const fepDefinition = rulebase.semanticChecks.find((check) => check.name === "fep_viability");
  const requiredMotifs = fepDefinition?.requiredMotifs;
  if (requiredMotifs === undefined || requiredMotifs.length === 0) {
    throw new RulebaseConflictError("diagnostics.json", "fep_viability has no requiredMotifs");
  }
  const verdicts: CheckVerdict[] = [];
  for (const nodeId of [...index.autonomousNodes].sort()) {
    const claimed = index.claimsByNode.get(nodeId) ?? new Set<string>();
    let value: Verdict3Value = "valid";
    const bindings: Record<string, string> = {};
    const gaps: EvidenceGap[] = [];
    const missingMotifs: string[] = [];
    for (const motif of [...requiredMotifs].sort()) {
      const provision = index.providedByNode.get(nodeId)?.get(motif);
      if (claimed.has(motif) || provision === "confirmed") continue;
      if (provision === "experimental" || provision === "unverified") {
        value = evaluateAnd(value, "unknown");
        gaps.push({
          kind: provision === "experimental" ? "below_extraction_bar" : "missing_evidence",
          description: `viability motif "${motif}" at autonomous node "${nodeId}" is present only via a ${provision} token`,
        });
      } else {
        value = evaluateAnd(value, "invalid");
        missingMotifs.push(motif);
      }
    }
    if (missingMotifs.length > 0) {
      const sortedMissing = missingMotifs.sort();
      bindings["missingMotif"] = sortedMissing[0] as string;
      bindings["missingMotifs"] = sortedMissing.join(",");
    }
    verdicts.push(
      buildCheckVerdict({
        check: "fep_viability",
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
