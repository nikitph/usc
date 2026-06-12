import { canonicalJson } from "@usc/shared/hashing";

import type { CheckId, MotifName, Rulebase } from "../rulebase/types.ts";
import { buildCheckVerdict } from "../verdict/build.ts";
import type {
  AstNodeFacts,
  GradientEntry,
  HubCrossing,
  MotifVector,
  RulebaseSection,
  RuleDiff,
  ViabilityVerdict,
} from "./types.ts";

const FULL_STRENGTH = 1;
const HUB_MOTIFS = ["authority", "boundary", "composition", "feedback", "representation", "scarcity"] as const;

const RULE_DEPENDENCIES: readonly { readonly section: RulebaseSection; readonly checks: readonly CheckId[] }[] = [
  { section: "motifs", checks: ["composition_completeness", "fep_viability", "collision_detection"] },
  { section: "composition", checks: ["composition_completeness"] },
  { section: "collisions", checks: ["collision_detection"] },
  { section: "obligation_rules", checks: ["terminal_validity"] },
  { section: "diagnostics", checks: ["fep_viability", "provenance_check"] },
  { section: "facets", checks: [] },
] as const;

export function innovationGradient(rulebase: Rulebase, vector: MotifVector): GradientEntry[] {
  const baseClosure = reachableComposites(rulebase, fullStrengthMotifs(rulebase, vector));
  const candidates = rulebase.motifs
    .map((motif) => motif.name)
    .filter((motif) => (vector[motif] ?? 0) < FULL_STRENGTH)
    .sort();
  return candidates
    .map((motif) => {
      const upgraded = fullStrengthMotifs(rulebase, { ...vector, [motif]: FULL_STRENGTH });
      const upgradedClosure = reachableComposites(rulebase, upgraded);
      const unlockedComposites = [...upgradedClosure]
        .filter((composite) => !baseClosure.has(composite) && composite !== motif)
        .sort();
      return {
        motif,
        unlockCount: unlockedComposites.length,
        unlockedComposites,
      };
    })
    .sort((left, right) => {
      if (left.unlockCount !== right.unlockCount) return right.unlockCount - left.unlockCount;
      return left.motif < right.motif ? -1 : left.motif > right.motif ? 1 : 0;
    });
}

export function viabilityCheck(rulebase: Rulebase, node: AstNodeFacts): ViabilityVerdict {
  const fepDefinition = rulebase.semanticChecks.find((check) => check.name === "fep_viability");
  const requiredMotifs = fepDefinition?.requiredMotifs ?? [];
  const missingMotifs = requiredMotifs.filter((motif) => (node.vector[motif] ?? 0) < FULL_STRENGTH).sort();
  const bindings: Record<string, string> = {};
  if (missingMotifs.length > 0) {
    bindings["missingMotif"] = missingMotifs[0] as string;
    bindings["missingMotifs"] = missingMotifs.join(",");
  }
  return buildCheckVerdict({
    check: "fep_viability",
    nodeOrClaim: node.nodeId,
    value: missingMotifs.length === 0 ? "valid" : "invalid",
    bindings,
    kernelVersion: rulebase.hash,
  }).verdict;
}

export function phaseTransitions(prev: MotifVector, next: MotifVector): HubCrossing[] {
  return HUB_MOTIFS.flatMap((motif) => {
    const from = prev[motif] ?? 0;
    const to = next[motif] ?? 0;
    const wasPresent = from > 0;
    const isPresent = to > 0;
    if (wasPresent === isPresent) return [];
    const direction: HubCrossing["direction"] = isPresent ? "entered" : "exited";
    return [{ motif, from, to, direction }];
  }).sort((left, right) => (left.motif < right.motif ? -1 : left.motif > right.motif ? 1 : 0));
}

export function ruleDiff(a: Rulebase, b: Rulebase): RuleDiff {
  const changedSections = rulebaseSections().filter(
    (section) => canonicalJson(sectionPayload(a, section)) !== canonicalJson(sectionPayload(b, section)),
  );
  return Object.freeze({
    fromHash: a.hash,
    toHash: b.hash,
    changedSections: Object.freeze(changedSections),
  });
}

export function affectedChecks(diff: RuleDiff): readonly CheckId[] {
  const affected = new Set<CheckId>();
  for (const section of diff.changedSections) {
    const dependency = RULE_DEPENDENCIES.find((entry) => entry.section === section);
    for (const check of dependency?.checks ?? []) affected.add(check);
  }
  return Object.freeze([...affected].sort());
}

function fullStrengthMotifs(rulebase: Rulebase, vector: MotifVector): Set<MotifName> {
  const motifs = new Set<MotifName>();
  for (const motif of rulebase.motifs) {
    if ((vector[motif.name] ?? 0) >= FULL_STRENGTH) motifs.add(motif.name);
  }
  return motifs;
}

function reachableComposites(rulebase: Rulebase, seedMotifs: ReadonlySet<MotifName>): Set<MotifName> {
  const reachable = new Set(seedMotifs);
  let changed = true;
  while (changed) {
    changed = false;
    for (const requirement of rulebase.requires) {
      if (reachable.has(requirement.motif)) continue;
      if (requirement.prerequisites.every((prerequisite) => reachable.has(prerequisite))) {
        reachable.add(requirement.motif);
        changed = true;
      }
    }
  }
  return reachable;
}

function rulebaseSections(): readonly RulebaseSection[] {
  return ["motifs", "composition", "collisions", "obligation_rules", "diagnostics", "facets"];
}

function sectionPayload(rulebase: Rulebase, section: RulebaseSection): unknown {
  switch (section) {
    case "motifs":
      return rulebase.motifs;
    case "composition":
      return { requires: rulebase.requires, emergentComposites: rulebase.emergentComposites };
    case "collisions":
      return rulebase.collisions;
    case "obligation_rules":
      return {
        eventTypes: rulebase.eventTypes,
        obligationRules: rulebase.obligationRules,
        terminalClaimObligationTypes: rulebase.terminalClaimObligationTypes,
      };
    case "diagnostics":
      return { semanticChecks: rulebase.semanticChecks, diagnosticPasses: rulebase.diagnosticPasses };
    case "facets":
      return rulebase.facets;
  }
}
