import type { FactIndex } from "../facts/fact-index.ts";
import type { Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict, type CheckVerdict } from "../verdict/build.ts";

/**
 * INV-6's single implementation point (spec §4): in production mode an
 * artifact whose derivation DAG (self included) carries an experimental-
 * tagged ancestor is invalid; research mode returns valid with an advisory
 * binding. Verdicts are emitted per declared artifact(id, kind) fact.
 */
export function checkProvenance(rulebase: Rulebase, index: FactIndex): CheckVerdict[] {
  const verdicts: CheckVerdict[] = [];
  for (const artifactId of [...index.artifactKinds.keys()].sort()) {
    const experimentalAncestors = collectExperimentalAncestors(artifactId, index).sort();
    const bindings: Record<string, string> = {};
    let value: "valid" | "invalid" = "valid";
    if (experimentalAncestors.length > 0) {
      bindings["experimentalAncestor"] = experimentalAncestors[0] as string;
      if (index.mode === "production") {
        value = "invalid";
      } else {
        bindings["advisory"] =
          "research mode: derivation DAG contains experimental-tagged extraction";
      }
    }
    verdicts.push(
      buildCheckVerdict({
        check: "provenance_check",
        nodeOrClaim: artifactId,
        value,
        bindings,
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
