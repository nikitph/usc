import { canonicalJson, sha256Hex } from "@usc/shared/hashing";
import { computeArtifactId, type ArtifactEnvelope, type ArtifactId } from "@usc/store";

export interface AntiPatternWarning {
  readonly antiPatternId: string;
  readonly proximity: number;
  readonly severity: "low" | "medium" | "high";
}

export interface RecommendationCandidate {
  readonly id: string;
  readonly title: string;
  readonly graftPlanArtifactId: ArtifactId;
  readonly collapsedSymptoms: readonly string[];
  readonly noveltyScore: number;
  readonly antiPatternWarnings: readonly AntiPatternWarning[];
}

export interface RankedRecommendation {
  readonly candidate: RecommendationCandidate;
  readonly diagnosisInformationGain: number;
  readonly rank: number;
}

export interface RecommendationArtifactBody {
  readonly id: string;
  readonly title: string;
  readonly diagnosisInformationGainRank: number;
  readonly diagnosisInformationGain: number;
  readonly collapsedSymptoms: readonly string[];
  readonly antiPatternWarnings: readonly AntiPatternWarning[];
  readonly emitterReady: false;
}

export interface RecommendationArtifactInput {
  readonly rankedRecommendation: RankedRecommendation;
  readonly rulebaseHash: string;
  readonly createdAt: string;
}

export function rankRecommendations(
  candidates: readonly RecommendationCandidate[],
): readonly RankedRecommendation[] {
  return candidates
    .map((candidate) => ({
      candidate,
      diagnosisInformationGain: diagnosisInformationGain(candidate),
      rank: 0,
    }))
    .sort(compareRankedRecommendations)
    .map((rankedRecommendation, index) => ({
      ...rankedRecommendation,
      rank: index + 1,
    }));
}

export function recommendationArtifact(input: RecommendationArtifactInput): ArtifactEnvelope {
  const body = recommendationBody(input.rankedRecommendation);
  const draft = {
    kind: "recommendation" as const,
    body: body as unknown as ArtifactEnvelope["body"],
    rulebaseHash: input.rulebaseHash,
    parents: [input.rankedRecommendation.candidate.graftPlanArtifactId],
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [],
    createdAt: input.createdAt,
  };
}

function recommendationBody(rankedRecommendation: RankedRecommendation): RecommendationArtifactBody {
  return {
    id: rankedRecommendation.candidate.id,
    title: rankedRecommendation.candidate.title,
    diagnosisInformationGainRank: rankedRecommendation.rank,
    diagnosisInformationGain: rankedRecommendation.diagnosisInformationGain,
    collapsedSymptoms: [...rankedRecommendation.candidate.collapsedSymptoms].sort(),
    antiPatternWarnings: [...rankedRecommendation.candidate.antiPatternWarnings].sort(compareWarnings),
    emitterReady: false,
  };
}

function diagnosisInformationGain(candidate: RecommendationCandidate): number {
  const symptomCollapse = candidate.collapsedSymptoms.length;
  const warningPenalty = candidate.antiPatternWarnings.reduce(
    (penalty, warning) => penalty + severityPenalty(warning.severity) * warning.proximity,
    0,
  );
  return round6((symptomCollapse * candidate.noveltyScore) - warningPenalty);
}

function severityPenalty(severity: AntiPatternWarning["severity"]): number {
  switch (severity) {
    case "low":
      return 0.05;
    case "medium":
      return 0.1;
    case "high":
      return 0.2;
  }
}

function compareRankedRecommendations(left: RankedRecommendation, right: RankedRecommendation): number {
  const gain = right.diagnosisInformationGain - left.diagnosisInformationGain;
  if (gain !== 0) return gain;
  const leftKey = sha256Hex(canonicalJson(left.candidate));
  const rightKey = sha256Hex(canonicalJson(right.candidate));
  return leftKey.localeCompare(rightKey);
}

function compareWarnings(left: AntiPatternWarning, right: AntiPatternWarning): number {
  const proximity = right.proximity - left.proximity;
  return proximity === 0 ? left.antiPatternId.localeCompare(right.antiPatternId) : proximity;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
