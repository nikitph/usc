import type { FactIndex } from "../facts/fact-index.ts";
import type { ObligationType, Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict, type CheckVerdict, type EvidenceGap } from "../verdict/build.ts";
import { evaluateAnd, type Verdict3Value } from "../verdict/kleene.ts";

/**
 * spec §4.5: Kleene-AND over the claim's mandatory blocking obligations —
 * any violated → invalid; else any unknown → unknown with the union of gaps;
 * else valid. Implemented ONLY via evaluateAnd (INV-1); no boolean shortcuts.
 */
export function checkTerminalValidity(rulebase: Rulebase, index: FactIndex): CheckVerdict[] {
  const verdicts: CheckVerdict[] = [];
  for (const claimId of [...index.terminalClaims.keys()].sort()) {
    const nodeId = index.terminalClaims.get(claimId) as string;
    const gatingObligations = (index.obligationsByClaim.get(claimId) ?? [])
      .filter((entry) => entry.mandatory && entry.blocking)
      .sort((a, b) => (a.id < b.id ? -1 : 1));

    let value: Verdict3Value = "valid";
    const bindings: Record<string, string> = { node: nodeId };
    const gaps: EvidenceGap[] = [];
    for (const entry of gatingObligations) {
      const contribution: Verdict3Value =
        entry.status === "satisfied" ? "valid" : entry.status === "violated" ? "invalid" : "unknown";
      value = evaluateAnd(value, contribution);
      if (entry.status === "violated" && bindings["violatedObligation"] === undefined) {
        bindings["violatedObligation"] = entry.id;
      }
      if (entry.status === "unknown") {
        gaps.push({
          kind: gapKindForObligationType(entry.obligationType),
          description: `obligation "${entry.id}" (${entry.obligationType}) on terminal claim "${claimId}" is undischarged`,
          obligationId: entry.id,
        });
      }
    }
    verdicts.push(
      buildCheckVerdict({
        check: "terminal_validity",
        nodeOrClaim: claimId,
        value,
        bindings,
        ...(value === "unknown" ? { gaps } : {}),
        kernelVersion: rulebase.hash,
      }),
    );
  }
  return verdicts;
}

/**
 * An undischarged freshness obligation means the evidence exists but its
 * validity window is unestablished → stale_evidence (pinned by kernel-002);
 * every other obligation type's unknown is an absence of evidence.
 */
function gapKindForObligationType(obligationType: ObligationType): EvidenceGap["kind"] {
  return obligationType === "freshness" ? "stale_evidence" : "missing_evidence";
}
