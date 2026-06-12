import { AntiPatternBodySchema, PatternBodySchema, type AntiPatternBody, type PatternBody } from "@usc/shared/generated";
import { canonicalJson } from "@usc/shared/hashing";

import type { ArtifactEnvelope, ArtifactId } from "./types.ts";

export interface MotifFacetCoverage {
  readonly motif: string;
  readonly facets: readonly string[];
}

export interface PatternRetrievalCandidate {
  readonly artifact: ArtifactEnvelope;
  readonly facetCoverage: readonly MotifFacetCoverage[];
}

export interface PatternRetrievalQuery {
  readonly motifWeights: Readonly<Record<string, number>>;
  readonly targetPattern?: PatternLikeBody;
  readonly requiredFacets?: readonly MotifFacetCoverage[];
  readonly limit: number;
}

export interface HybridRetrievalHit {
  readonly artifactId: ArtifactId;
  readonly bodyId: string;
  readonly kind: "pattern" | "anti_pattern";
  readonly domain: string;
  readonly vectorScore: number;
  readonly structuralScore: number;
  readonly richnessScore: number;
  readonly score: number;
  readonly autoInsertEnabled: false;
  readonly rationale: readonly string[];
}

export interface RichnessLadderStep {
  readonly artifactId: ArtifactId;
  readonly bodyId: string;
  readonly facetCount: number;
  readonly facets: readonly string[];
}

export interface RichnessLadder {
  readonly structuralKey: string;
  readonly steps: readonly RichnessLadderStep[];
}

type PatternLikeBody = PatternBody | AntiPatternBody;

export function hybridPatternRetrieval(
  candidates: readonly PatternRetrievalCandidate[],
  query: PatternRetrievalQuery,
): readonly HybridRetrievalHit[] {
  if (!Number.isInteger(query.limit) || query.limit < 1) {
    throw new PatternRetrievalError("query.limit must be a positive integer");
  }
  return candidates
    .map((candidate) => scoreCandidate(candidate, query))
    .sort(compareHits)
    .slice(0, query.limit);
}

export function richnessLadders(candidates: readonly PatternRetrievalCandidate[]): readonly RichnessLadder[] {
  const grouped = new Map<string, RichnessLadderStep[]>();
  for (const candidate of candidates) {
    const body = reviewableBody(candidate.artifact);
    const structuralKey = structuralTemplateKey(body);
    const facets = flattenedFacets(candidate.facetCoverage);
    const steps = grouped.get(structuralKey) ?? [];
    grouped.set(structuralKey, [
      ...steps,
      {
        artifactId: candidate.artifact.id,
        bodyId: body.id,
        facetCount: facets.length,
        facets,
      },
    ]);
  }

  return [...grouped.entries()]
    .map(([structuralKey, steps]) => ({
      structuralKey,
      steps: steps.sort(compareLadderSteps),
    }))
    .filter((ladder) => ladder.steps.length > 1 && hasStrictFacetSubset(ladder.steps))
    .sort((left, right) => left.structuralKey.localeCompare(right.structuralKey));
}

export class PatternRetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatternRetrievalError";
  }
}

function scoreCandidate(candidate: PatternRetrievalCandidate, query: PatternRetrievalQuery): HybridRetrievalHit {
  const body = reviewableBody(candidate.artifact);
  const kind = candidate.artifact.kind === "pattern" ? "pattern" : "anti_pattern";
  const vectorScore = cosineScore(query.motifWeights, motifWeights(body.motifSignature));
  const structuralScore = query.targetPattern === undefined ? vectorScore : structuralCompatibility(body, query.targetPattern);
  const richnessScore = query.requiredFacets === undefined ? 1 : facetCoverageScore(candidate.facetCoverage, query.requiredFacets);
  const score = round6((0.45 * vectorScore) + (0.4 * structuralScore) + (0.15 * richnessScore));
  return {
    artifactId: candidate.artifact.id,
    bodyId: body.id,
    kind,
    domain: body.domain,
    vectorScore,
    structuralScore,
    richnessScore,
    score,
    autoInsertEnabled: false,
    rationale: [
      `vector=${vectorScore}`,
      `structural=${structuralScore}`,
      `richness=${richnessScore}`,
      "retrieval only; valence gate and auto-insert are out of scope",
    ],
  };
}

function reviewableBody(artifact: ArtifactEnvelope): PatternLikeBody {
  if (artifact.kind === "pattern") return PatternBodySchema.parse(artifact.body);
  if (artifact.kind === "anti_pattern") return AntiPatternBodySchema.parse(artifact.body);
  throw new PatternRetrievalError(`retrieval only accepts pattern artifacts, got ${artifact.kind}`);
}

function motifWeights(motifs: readonly string[]): Readonly<Record<string, number>> {
  return Object.fromEntries(motifs.map((motif) => [motif, 1]));
}

function cosineScore(left: Readonly<Record<string, number>>, right: Readonly<Record<string, number>>): number {
  const motifs = new Set([...Object.keys(left), ...Object.keys(right)]);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const motif of motifs) {
    const leftValue = left[motif] ?? 0;
    const rightValue = right[motif] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue ** 2;
    rightMagnitude += rightValue ** 2;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return round6(dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude)));
}

function structuralCompatibility(left: PatternLikeBody, right: PatternLikeBody): number {
  const leftEdges = structuralEdges(left);
  const rightEdges = structuralEdges(right);
  if (leftEdges.size === 0 && rightEdges.size === 0) return cosineScore(motifWeights(left.motifSignature), motifWeights(right.motifSignature));
  const overlap = [...leftEdges].filter((edge) => rightEdges.has(edge)).length;
  const denominator = leftEdges.size + rightEdges.size - overlap;
  return round6(denominator === 0 ? 0 : overlap / denominator);
}

function structuralEdges(body: PatternLikeBody): ReadonlySet<string> {
  const motifsByNode = new Map(body.nodes.map((node) => [node.id, node.motifs.slice().sort().join("+")]));
  return new Set(
    body.edges.map((edge) => `${motifsByNode.get(edge.from) ?? ""}->${edge.relation}->${motifsByNode.get(edge.to) ?? ""}`),
  );
}

function structuralTemplateKey(body: PatternLikeBody): string {
  return canonicalJson({
    motifs: [...body.motifSignature].sort(),
    edges: [...structuralEdges(body)].sort(),
  });
}

function facetCoverageScore(
  actualCoverage: readonly MotifFacetCoverage[],
  requiredCoverage: readonly MotifFacetCoverage[],
): number {
  const actual = new Set(flattenedFacetKeys(actualCoverage));
  const required = flattenedFacetKeys(requiredCoverage);
  if (required.length === 0) return 1;
  return round6(required.filter((facet) => actual.has(facet)).length / required.length);
}

function flattenedFacetKeys(coverage: readonly MotifFacetCoverage[]): readonly string[] {
  return coverage.flatMap((entry) => entry.facets.map((facet) => `${entry.motif}.${facet}`)).sort();
}

function flattenedFacets(coverage: readonly MotifFacetCoverage[]): readonly string[] {
  return flattenedFacetKeys(coverage);
}

function hasStrictFacetSubset(steps: readonly RichnessLadderStep[]): boolean {
  for (let index = 0; index < steps.length - 1; index += 1) {
    const left = new Set(steps[index]?.facets ?? []);
    const right = new Set(steps[index + 1]?.facets ?? []);
    if (left.size < right.size && [...left].every((facet) => right.has(facet))) {
      return true;
    }
  }
  return false;
}

function compareHits(left: HybridRetrievalHit, right: HybridRetrievalHit): number {
  const score = right.score - left.score;
  return score === 0 ? left.artifactId.localeCompare(right.artifactId) : score;
}

function compareLadderSteps(left: RichnessLadderStep, right: RichnessLadderStep): number {
  const facetCount = left.facetCount - right.facetCount;
  return facetCount === 0 ? left.artifactId.localeCompare(right.artifactId) : facetCount;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
