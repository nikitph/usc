import { buildFactIndex, type FactIndex, type ProvisionQualifier } from "./facts/fact-index.ts";
import type { Fact } from "./facts/types.ts";
import type { MotifName } from "./rulebase/types.ts";
import { evaluateAnd, evaluateOr, type Verdict3Value } from "./verdict/kleene.ts";

export type GraftCheckStatus = "graftable" | "not_graftable" | "graftable_pending_evidence";
export type BindingStatus = "bound" | "unknown" | "failed";

export interface ValenceRequirement {
  readonly id: string;
  readonly patternNodeId: string;
  readonly motif: MotifName;
}

export interface BindingCandidate {
  readonly patternNodeId: string;
  readonly targetNodeId: string;
}

export interface GraftBinding {
  readonly requirementId: string;
  readonly patternNodeId: string;
  readonly targetNodeId: string;
  readonly motif: MotifName;
  readonly status: BindingStatus;
}

export interface GraftEvidenceGap {
  readonly requirementId: string;
  readonly patternNodeId: string;
  readonly motif: MotifName;
  readonly reason: "no_candidate" | "unverified_provision" | "experimental_provision";
}

export interface GraftRankingInputs {
  readonly boundCount: number;
  readonly unknownCount: number;
  readonly failedCount: number;
  readonly candidateCount: number;
}

export interface GraftCheckResult {
  readonly status: GraftCheckStatus;
  readonly verdict: Verdict3Value;
  readonly bindings: readonly GraftBinding[];
  readonly gaps: readonly GraftEvidenceGap[];
  readonly rankingInputs: GraftRankingInputs;
}

export interface GraftCheckInput {
  readonly facts: readonly Fact[];
  readonly requirements: readonly ValenceRequirement[];
  readonly candidates: readonly BindingCandidate[];
}

export function graftCheck(input: GraftCheckInput): GraftCheckResult {
  const index = buildFactIndex(input.facts);
  const requirementResults = input.requirements.map((requirement) => checkRequirement(requirement, input.candidates, index));
  const verdict = requirementResults.reduce<Verdict3Value>(
    (current, requirementResult) => evaluateAnd(current, requirementResult.verdict),
    "valid",
  );
  const bindings = requirementResults.flatMap((requirementResult) => requirementResult.bindings);
  const gaps = requirementResults.flatMap((requirementResult) => requirementResult.gaps);
  const boundCount = bindings.filter((binding) => binding.status === "bound").length;
  const unknownCount = bindings.filter((binding) => binding.status === "unknown").length;
  return Object.freeze({
    status: statusFor(verdict),
    verdict,
    bindings: Object.freeze(bindings),
    gaps: Object.freeze(gaps),
    rankingInputs: Object.freeze({
      boundCount,
      unknownCount,
      failedCount: input.requirements.length - boundCount - unknownCount,
      candidateCount: input.candidates.length,
    }),
  });
}

interface RequirementCheck {
  readonly verdict: Verdict3Value;
  readonly bindings: readonly GraftBinding[];
  readonly gaps: readonly GraftEvidenceGap[];
}

function checkRequirement(
  requirement: ValenceRequirement,
  candidates: readonly BindingCandidate[],
  index: FactIndex,
): RequirementCheck {
  const matchingCandidates = candidates
    .filter((candidate) => candidate.patternNodeId === requirement.patternNodeId)
    .sort((left, right) => left.targetNodeId.localeCompare(right.targetNodeId));
  if (matchingCandidates.length === 0) {
    return {
      verdict: "invalid",
      bindings: [],
      gaps: [{
        requirementId: requirement.id,
        patternNodeId: requirement.patternNodeId,
        motif: requirement.motif,
        reason: "no_candidate",
      }],
    };
  }

  const candidatesWithVerdicts = matchingCandidates.map((candidate) => ({
    candidate,
    verdict: verdictForProvision(index.providedByNode.get(candidate.targetNodeId)?.get(requirement.motif)),
  }));
  const verdict = candidatesWithVerdicts.reduce<Verdict3Value>(
    (current, candidateWithVerdict) => evaluateOr(current, candidateWithVerdict.verdict),
    "invalid",
  );
  const confirmed = candidatesWithVerdicts.find((candidateWithVerdict) => candidateWithVerdict.verdict === "valid");
  if (confirmed !== undefined) {
    return {
      verdict,
      bindings: [bindingFor(requirement, confirmed.candidate, "bound")],
      gaps: [],
    };
  }
  const unknown = candidatesWithVerdicts.find((candidateWithVerdict) => candidateWithVerdict.verdict === "unknown");
  if (unknown !== undefined) {
    const qualifier = index.providedByNode.get(unknown.candidate.targetNodeId)?.get(requirement.motif);
    return {
      verdict,
      bindings: [bindingFor(requirement, unknown.candidate, "unknown")],
      gaps: [gapFor(requirement, qualifier)],
    };
  }
  return { verdict, bindings: [], gaps: [] };
}

function verdictForProvision(qualifier: ProvisionQualifier | undefined): Verdict3Value {
  switch (qualifier) {
    case "confirmed":
      return "valid";
    case "experimental":
    case "unverified":
      return "unknown";
    case undefined:
      return "invalid";
  }
}

function bindingFor(
  requirement: ValenceRequirement,
  candidate: BindingCandidate,
  status: BindingStatus,
): GraftBinding {
  return {
    requirementId: requirement.id,
    patternNodeId: requirement.patternNodeId,
    targetNodeId: candidate.targetNodeId,
    motif: requirement.motif,
    status,
  };
}

function gapFor(requirement: ValenceRequirement, qualifier: ProvisionQualifier | undefined): GraftEvidenceGap {
  return {
    requirementId: requirement.id,
    patternNodeId: requirement.patternNodeId,
    motif: requirement.motif,
    reason: qualifier === "experimental" ? "experimental_provision" : "unverified_provision",
  };
}

function statusFor(verdict: Verdict3Value): GraftCheckStatus {
  switch (verdict) {
    case "valid":
      return "graftable";
    case "invalid":
      return "not_graftable";
    case "unknown":
      return "graftable_pending_evidence";
  }
}
