import assert from "node:assert/strict";
import { test } from "node:test";

import { computeArtifactId, InMemoryArtifactRepository, type ArtifactEnvelope } from "@usc/store";
import type { MotifToken } from "@usc/shared/generated";

import {
  KeywordExtractionBackend,
  RuntimeError,
  TerminalClaimKeywordDetector,
  createExtractionRegistry,
  runLexer,
  type ExtractionBackend,
  type ExtractionInput,
  type RawExtraction,
} from "../src/index.ts";

const rulebaseHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const createdAt = "2026-06-13T00:00:00.000Z";

test("should_register_extraction_backend_variation_point", () => {
  const registry = createExtractionRegistry();
  const backend = new KeywordExtractionBackend();

  registry.register(backend);

  assert.equal(registry.get(backend.name), backend);
  assert.throws(() => registry.register(backend), RuntimeError);
});

test("should_extract_keyword_tokens_with_grounded_spans", async () => {
  const backend = new KeywordExtractionBackend();
  const source = sourceArtifact("state boundary feedback");

  const raw = await backend.extract({ sourceText: "state boundary feedback", sourceArtifactId: source.id, sampleIndex: 0 });

  assert.deepEqual(
    raw.tokens.map((token) => (token as MotifToken).motif),
    ["state", "boundary", "feedback"],
  );
  assert.deepEqual((raw.tokens[0] as MotifToken).evidence[0]?.span, { start: 0, end: 5 });
});

test("should_record_raw_outputs_before_token_stream_and_resolve_ensemble_votes", async () => {
  const repository = new InMemoryArtifactRepository();
  const source = await repository.putArtifact(sourceArtifact("feedback plus authority"), "test");
  const registry = createExtractionRegistry();
  registry.register(new ScriptedBackend([
    { rawText: "sample-0", tokens: [token("feedback-a", "feedback", source.id, 0, 8, 0.9)] },
    { rawText: "sample-1", tokens: [token("feedback-b", "feedback", source.id, 1, 8, 0.8)] },
    { rawText: "sample-2", tokens: [token("authority-a", "authority", source.id, 20, 29, 0.7)] },
  ]));

  const run = await runLexer({
    repository,
    registry,
    backendName: "scripted",
    sourceText: "feedback plus authority",
    sourceArtifactId: source.id,
    rulebaseHash,
    sampleCount: 3,
    createdAt,
    createdBy: "test",
  });

  assert.equal(run.rawOutputArtifacts.length, 3);
  assert.equal(run.tokenStreamArtifact.kind, "token_stream");
  assert.deepEqual(run.tokenStreamArtifact.parents, run.rawOutputArtifacts.map((artifact) => artifact.id));
  assert.equal(run.tokens.find((candidate) => candidate.motif === "feedback")?.role, "explicit");
  assert.equal(run.tokens.find((candidate) => candidate.motif === "authority")?.role, "candidate");
  assert.equal(run.tokens.find((candidate) => candidate.motif === "authority")?.confidence, 0.35);
});

test("should_record_extraction_failure_artifact_for_invalid_token", async () => {
  const repository = new InMemoryArtifactRepository();
  const source = await repository.putArtifact(sourceArtifact("bad token"), "test");
  const registry = createExtractionRegistry();
  registry.register(new ScriptedBackend([{ rawText: "bad", tokens: [{ id: "missing-required-fields" }] }]));

  const run = await runLexer({
    repository,
    registry,
    backendName: "scripted",
    sourceText: "bad token",
    sourceArtifactId: source.id,
    rulebaseHash,
    sampleCount: 1,
    createdAt,
    createdBy: "test",
  });

  assert.equal(run.extractionFailures.length, 1);
  assert.equal(run.extractionFailures[0]?.kind, "extraction_failure");
  assert.equal(run.tokens.length, 0);
});

test("should_detect_terminal_claim_candidates_with_spans", () => {
  const source = sourceArtifact("the deployment is done and approved");
  const detector = new TerminalClaimKeywordDetector();

  const claims = detector.detect("the deployment is done and approved", source.id);

  assert.deepEqual(
    claims.map((claim) => claim.text),
    ["done", "approved"],
  );
  assert.deepEqual(claims[0]?.span, { start: 18, end: 22 });
});

class ScriptedBackend implements ExtractionBackend {
  readonly name = "scripted";
  readonly extractorVersion = "scripted-v1";
  readonly #samples: readonly RawExtraction[];

  constructor(samples: readonly RawExtraction[]) {
    this.#samples = samples;
  }

  async extract(input: ExtractionInput): Promise<RawExtraction> {
    const sample = this.#samples[input.sampleIndex];
    if (sample === undefined) throw new RuntimeError(`missing scripted sample ${input.sampleIndex}`);
    return sample;
  }
}

function sourceArtifact(text: string): ArtifactEnvelope {
  const draft = {
    kind: "source" as const,
    body: { text },
    rulebaseHash,
    parents: [],
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [],
    createdAt,
  };
}

function token(
  id: string,
  motif: MotifToken["motif"],
  sourceArtifactId: string,
  start: number,
  end: number,
  confidence: number,
): MotifToken {
  return {
    id,
    motif,
    evidence: [{ sourceArtifactId, span: { start, end }, extractionMethod: "deterministic" }],
    confidence,
    role: "explicit",
    domainTerm: motif,
    extractorVersion: "scripted-v1",
  };
}
