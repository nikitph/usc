import type { FactIndex } from "../facts/fact-index.ts";
import type { Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict, type CheckVerdict, type EvidenceGap } from "../verdict/build.ts";
import type { Verdict3Value } from "../verdict/kleene.ts";

/**
 * INV-6's single implementation point (spec §4): in production mode an
 * artifact whose derivation DAG (self included) carries an experimental-
 * tagged ancestor is invalid; research mode returns valid with an advisory
 * binding. An UNDECLARED mode with an experimental ancestor is unknown with
 * a named gap — the permissive reading is never the silent default (INV-1).
 * Verdicts are emitted per declared artifact(id, kind) fact.
 */
export function checkProvenance(rulebase: Rulebase, index: FactIndex): CheckVerdict[] {
  const verdicts: CheckVerdict[] = [];
  for (const artifactId of [...index.artifactKinds.keys()].sort()) {
    const experimentalAncestors = collectExperimentalAncestors(artifactId, index).sort();
    const bindings: Record<string, string> = {};
    const gaps: EvidenceGap[] = [];
    let value: Verdict3Value = "valid";
    if (experimentalAncestors.length > 0) {
      bindings["experimentalAncestor"] = experimentalAncestors[0] as string;
      if (index.mode === "production") {
        value = "invalid";
      } else if (index.mode === "research") {
        bindings["advisory"] =
          "research mode: derivation DAG contains experimental-tagged extraction";
      } else {
        value = "unknown";
        gaps.push({
          kind: "missing_evidence",
          description: `artifact "${artifactId}" has experimental-tagged ancestry but no evaluation mode was declared — production would be invalid, research valid-with-advisory; declare mode to resolve`,
        });
      }
    }
    verdicts.push(
      buildCheckVerdict({
        check: "provenance_check",
        nodeOrClaim: artifactId,
        value,
        bindings,
        ...(value === "unknown" ? { gaps } : {}),
        kernelVersion: rulebase.hash,
      }),
    );
  }
  return verdicts;
}

function collectExperimentalAncestors(artifactId: string, index: FactIndex): string[] {
  const visited = new Set<string>([artifactId]);
  const queue = [artifactId];
  const experimental: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (index.tagsByArtifact.get(current)?.has("experimental")) experimental.push(current);
    for (const parentId of index.parentsByChild.get(current) ?? []) {
      if (!visited.has(parentId)) {
        visited.add(parentId);
        queue.push(parentId);
      }
    }
  }
  return experimental;
}
