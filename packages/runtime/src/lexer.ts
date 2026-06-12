import { MotifTokenSchema } from "@usc/shared/generated";
import { canonicalJson, sha256Hex } from "@usc/shared/hashing";
import { computeArtifactId, type ArtifactEnvelope } from "@usc/store";

import { RuntimeError } from "./errors.ts";
import type {
  CandidateTerminalClaim,
  ExtractionBackend,
  ExtractionInput,
  ExtractionRegistry,
  LexerRunRequest,
  LexerRunResult,
  MotifName,
  MotifToken,
  RawExtraction,
  TerminalClaimDetector,
} from "./types.ts";

interface ValidTokenCandidate {
  readonly token: MotifToken;
  readonly sampleIndex: number;
}

interface Cluster {
  candidates: ValidTokenCandidate[];
}

const motifKeywords: ReadonlyMap<MotifName, readonly string[]> = new Map([
  ["boundary", ["boundary", "scope"]],
  ["state", ["state", "cache", "database"]],
  ["transition", ["transition", "change"]],
  ["feedback", ["feedback", "signal"]],
  ["authority", ["authority", "approved", "permission"]],
  ["terminal_state", ["done", "completed", "finished"]],
  ["representation", ["representation", "model"]],
]);

const terminalClaimKeywords = ["done", "completed", "finished", "approved", "deployed", "deleted"];

export function createExtractionRegistry(): ExtractionRegistry {
  const backends = new Map<string, ExtractionBackend>();
  return {
    register(backend: ExtractionBackend): void {
      if (backend.name.length === 0) throw new RuntimeError("backend name is required");
      if (backends.has(backend.name)) throw new RuntimeError(`duplicate extraction backend "${backend.name}"`);
      backends.set(backend.name, backend);
    },
    get(name: string): ExtractionBackend {
      const backend = backends.get(name);
      if (backend === undefined) throw new RuntimeError(`unknown extraction backend "${name}"`);
      return backend;
    },
  };
}

export class KeywordExtractionBackend implements ExtractionBackend {
  readonly name = "keyword-test-double";
  readonly extractorVersion = "keyword-test-double-v1";

  async extract(input: ExtractionInput): Promise<RawExtraction> {
    return {
      rawText: input.sourceText,
      tokens: extractKeywordTokens(input.sourceText, input.sourceArtifactId, this.extractorVersion),
    };
  }
}

export class TerminalClaimKeywordDetector implements TerminalClaimDetector {
  readonly name = "terminal-claim-keyword-test-double";

  detect(sourceText: string, sourceArtifactId: string): readonly CandidateTerminalClaim[] {
    return findKeywordSpans(sourceText, terminalClaimKeywords).map((match, index) => ({
      id: `claim_${sha256Hex(canonicalJson({ sourceArtifactId, start: match.start, end: match.end, index })).slice(0, 16)}`,
      text: sourceText.slice(match.start, match.end),
      sourceArtifactId,
      span: { start: match.start, end: match.end },
    }));
  }
}

export async function runLexer(request: LexerRunRequest): Promise<LexerRunResult> {
  if (!Number.isInteger(request.sampleCount) || request.sampleCount < 1) {
    throw new RuntimeError("sampleCount must be a positive integer");
  }
  const backend = request.registry.get(request.backendName);
  const rawOutputArtifacts: ArtifactEnvelope[] = [];
  const extractionFailures: ArtifactEnvelope[] = [];
  const candidates: ValidTokenCandidate[] = [];

  for (let sampleIndex = 0; sampleIndex < request.sampleCount; sampleIndex += 1) {
    const raw = await backend.extract({
      sourceText: request.sourceText,
      sourceArtifactId: request.sourceArtifactId,
      sampleIndex,
    });
    const rawArtifact = await putArtifact(request, "source", {
      kind: "raw_extraction_output",
      backend: backend.name,
      extractorVersion: backend.extractorVersion,
      sampleIndex,
      rawText: raw.rawText,
    }, [request.sourceArtifactId]);
    rawOutputArtifacts.push(rawArtifact);

    for (const rawToken of raw.tokens) {
      const parsed = MotifTokenSchema.safeParse(rawToken);
      if (parsed.success) {
        candidates.push({ token: parsed.data, sampleIndex });
      } else {
        extractionFailures.push(await putArtifact(request, "extraction_failure", {
          backend: backend.name,
          extractorVersion: backend.extractorVersion,
          sampleIndex,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }, [rawArtifact.id]));
      }
    }
  }

  const tokens = resolveEnsemble(candidates, request.sampleCount);
  const tokenStreamArtifact = await putArtifact(request, "token_stream", {
    backend: backend.name,
    extractorVersion: backend.extractorVersion,
    tokens,
  }, rawOutputArtifacts.map((artifact) => artifact.id));
  return { rawOutputArtifacts, extractionFailures, tokenStreamArtifact, tokens };
}

function extractKeywordTokens(
  sourceText: string,
  sourceArtifactId: string,
  extractorVersion: string,
): readonly MotifToken[] {
  const tokens: MotifToken[] = [];
  for (const [motif, keywords] of motifKeywords) {
    for (const match of findKeywordSpans(sourceText, keywords)) {
      const base = {
        id: `tok_${sha256Hex(canonicalJson({ motif, start: match.start, end: match.end, sourceArtifactId })).slice(0, 16)}`,
        motif,
        evidence: [
          {
            sourceArtifactId,
            span: { start: match.start, end: match.end },
            extractionMethod: "deterministic" as const,
          },
        ],
        confidence: 1,
        role: "explicit" as const,
        domainTerm: sourceText.slice(match.start, match.end),
        extractorVersion,
      };
      tokens.push(motif === "boundary" ? { ...base, boundaryRole: "concept_reference" } : base);
    }
  }
  return tokens.sort(compareTokens);
}

function resolveEnsemble(candidates: readonly ValidTokenCandidate[], sampleCount: number): readonly MotifToken[] {
  return buildClusters(candidates)
    .map((cluster) => representativeToken(cluster, sampleCount))
    .sort(compareTokens);
}

function buildClusters(candidates: readonly ValidTokenCandidate[]): readonly Cluster[] {
  const clusters: Cluster[] = [];
  for (const candidate of candidates) {
    const existing = clusters.find((cluster) =>
      cluster.candidates.some((clustered) =>
        clustered.token.motif === candidate.token.motif && spansOverlap(clustered.token, candidate.token),
      ),
    );
    if (existing === undefined) clusters.push({ candidates: [candidate] });
    else existing.candidates.push(candidate);
  }
  return clusters;
}

function representativeToken(cluster: Cluster, sampleCount: number): MotifToken {
  const representative = [...cluster.candidates]
    .map((candidate) => candidate.token)
    .sort((left, right) => right.confidence - left.confidence || compareTokens(left, right))[0];
  if (representative === undefined) throw new RuntimeError("empty token cluster");
  const votes = new Set(cluster.candidates.map((candidate) => candidate.sampleIndex)).size;
  const isMajority = votes > sampleCount / 2;
  const confidence = isMajority ? representative.confidence : representative.confidence * 0.5;
  const role = isMajority ? representative.role : "candidate";
  return MotifTokenSchema.parse({ ...representative, confidence, role });
}

async function putArtifact(
  request: LexerRunRequest,
  kind: ArtifactEnvelope["kind"],
  body: ArtifactEnvelope["body"],
  parents: readonly string[],
): Promise<ArtifactEnvelope> {
  const draft = { kind, body, rulebaseHash: request.rulebaseHash, parents: [...parents] };
  const artifact = {
    id: computeArtifactId(draft),
    ...draft,
    extractorVersion: request.registry.get(request.backendName).extractorVersion,
    tags: ["experimental" as const],
    createdAt: request.createdAt,
  };
  return request.repository.putArtifact(artifact, request.createdBy);
}

function findKeywordSpans(sourceText: string, keywords: readonly string[]) {
  const normalized = sourceText.toLowerCase();
  const spans: Array<{ readonly start: number; readonly end: number }> = [];
  for (const keyword of keywords) {
    let cursor = normalized.indexOf(keyword);
    while (cursor !== -1) {
      spans.push({ start: cursor, end: cursor + keyword.length });
      cursor = normalized.indexOf(keyword, cursor + keyword.length);
    }
  }
  return spans.sort((left, right) => left.start - right.start || left.end - right.end);
}

function spansOverlap(left: MotifToken, right: MotifToken): boolean {
  const leftSpan = mergedSpan(left);
  const rightSpan = mergedSpan(right);
  return leftSpan.start < rightSpan.end && rightSpan.start < leftSpan.end;
}

function mergedSpan(token: MotifToken): { readonly start: number; readonly end: number } {
  return {
    start: Math.min(...token.evidence.map((evidence) => evidence.span.start)),
    end: Math.max(...token.evidence.map((evidence) => evidence.span.end)),
  };
}

function compareTokens(left: MotifToken, right: MotifToken): number {
  const leftSpan = mergedSpan(left);
  const rightSpan = mergedSpan(right);
  return leftSpan.start - rightSpan.start || leftSpan.end - rightSpan.end || left.id.localeCompare(right.id);
}
