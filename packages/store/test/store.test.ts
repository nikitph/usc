import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ArtifactHashMismatchError,
  ArtifactNotFoundError,
  ArtifactStoreError,
  InMemoryArtifactRepository,
  InMemoryPatternReviewQueue,
  computeArtifactId,
  twinDomainSeedBundle,
  type ArtifactEnvelope,
  type ArtifactKind,
} from "../src/index.ts";

const rulebaseHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("should_deduplicate_when_content_addressed_artifact_already_exists", async () => {
  const repository = new InMemoryArtifactRepository();
  const artifact = artifactOf("source", { uri: "file:///tmp/a.txt" });

  const first = await repository.putArtifact(artifact, "worker");
  const second = await repository.putArtifact(artifact, "worker");
  const page = await repository.findByKind("source", { limit: 10 });

  assert.deepEqual(second, first);
  assert.equal(page.items.length, 1);
  assert.equal(page.nextOffset, null);
});

test("should_reject_artifact_when_id_does_not_match_envelope_hash", async () => {
  const repository = new InMemoryArtifactRepository();
  const artifact = { ...artifactOf("source", { uri: "file:///tmp/a.txt" }), id: "f".repeat(64) };

  await assert.rejects(repository.putArtifact(artifact, "worker"), ArtifactHashMismatchError);
});

test("should_reject_child_when_parent_is_missing", async () => {
  const repository = new InMemoryArtifactRepository();
  const missingParent = "a".repeat(64);
  const artifact = artifactOf("verdict", { value: "valid" }, [missingParent]);

  await assert.rejects(repository.putArtifact(artifact, "worker"), ArtifactNotFoundError);
});

test("should_reconstruct_self_inclusive_derivation_dag", async () => {
  const repository = new InMemoryArtifactRepository();
  const source = await repository.putArtifact(artifactOf("source", { uri: "file:///tmp/a.txt" }), "worker");
  const tokens = await repository.putArtifact(artifactOf("token_stream", { tokens: ["feedback"] }, [source.id]), "worker");
  const verdict = await repository.putArtifact(artifactOf("verdict", { check: "provenance_check" }, [tokens.id]), "worker");

  const dag = await repository.getDerivationDag(verdict.id);

  assert.deepEqual(
    dag.map((artifact) => artifact.id),
    [verdict.id, tokens.id, source.id],
  );
});

test("should_detect_experimental_ancestor_using_kernel_self_inclusive_semantics", async () => {
  const repository = new InMemoryArtifactRepository();
  const source = await repository.putArtifact(
    artifactOf("source", { uri: "file:///tmp/a.txt" }, [], ["experimental"]),
    "worker",
  );
  const tokens = await repository.putArtifact(artifactOf("token_stream", { tokens: ["feedback"] }, [source.id]), "worker");
  const verdict = await repository.putArtifact(artifactOf("verdict", { check: "provenance_check" }, [tokens.id]), "worker");
  const clean = await repository.putArtifact(artifactOf("source", { uri: "file:///tmp/b.txt" }), "worker");

  assert.equal(await repository.hasExperimentalAncestor(verdict.id), true);
  assert.equal(await repository.hasExperimentalAncestor(clean.id), false);
});

test("should_append_tag_events_when_tags_mutate", async () => {
  const repository = new InMemoryArtifactRepository();
  const source = await repository.putArtifact(artifactOf("source", { uri: "file:///tmp/a.txt" }), "worker");

  const tagged = await repository.tagArtifact(source.id, "golden", "owner");
  const untagged = await repository.untagArtifact(source.id, "golden", "owner");

  assert.deepEqual(tagged.tags, ["golden"]);
  assert.deepEqual(untagged.tags, []);
  assert.deepEqual(
    repository.tagEvents.map((event) => [event.op, event.tag, event.actor]),
    [
      ["tag", "golden", "owner"],
      ["untag", "golden", "owner"],
    ],
  );
});

test("should_expose_typed_placeholder_for_pgvector_search", async () => {
  const repository = new InMemoryArtifactRepository();

  await assert.rejects(repository.nearestVectors([0, 1], 1), ArtifactStoreError);
});

test("should_validate_pattern_and_anti_pattern_bodies_by_kind", async () => {
  const repository = new InMemoryArtifactRepository();
  const pattern = await repository.putArtifact(artifactOf("pattern", patternBody()), "worker");
  const antiPattern = await repository.putArtifact(artifactOf("anti_pattern", antiPatternBody(pattern.id)), "worker");

  assert.equal(pattern.kind, "pattern");
  assert.equal(antiPattern.kind, "anti_pattern");
});

test("should_reject_pattern_artifact_when_body_misses_schema", async () => {
  const repository = new InMemoryArtifactRepository();

  await assert.rejects(repository.putArtifact(artifactOf("pattern", { id: "p1" }), "worker"));
});

test("should_track_pattern_review_queue_lifecycle", async () => {
  const queue = new InMemoryPatternReviewQueue(fixedClock());
  const pattern = artifactOf("pattern", patternBody());
  const antiPattern = artifactOf("anti_pattern", antiPatternBody(pattern.id));

  const pendingPattern = queue.submitCandidate(pattern, "seed-worker");
  const pendingAntiPattern = queue.submitCandidate(antiPattern, "seed-worker");
  const acceptedPattern = queue.decide({
    artifactId: pendingPattern.artifactId,
    state: "accepted",
    reviewer: "reviewer",
    rationale: "schema and motif transfer are plausible",
  });
  const rejectedAntiPattern = queue.decide({
    artifactId: pendingAntiPattern.artifactId,
    state: "rejected",
    reviewer: "reviewer",
    rationale: "duplicate of existing anti-pattern seed",
  });

  assert.equal(acceptedPattern.state, "accepted");
  assert.equal(rejectedAntiPattern.state, "rejected");
  assert.deepEqual(queue.summary(), { pending: 0, accepted: 1, rejected: 1 });
  assert.deepEqual(
    queue.events.map((event) => [event.fromState, event.toState, event.actor]),
    [
      [null, "pending", "seed-worker"],
      [null, "pending", "seed-worker"],
      ["pending", "accepted", "reviewer"],
      ["pending", "rejected", "reviewer"],
    ],
  );
});

test("should_reject_non_pattern_review_queue_entries", () => {
  const queue = new InMemoryPatternReviewQueue(fixedClock());

  assert.throws(() => queue.submitCandidate(artifactOf("source", { uri: "file:///tmp/a.txt" }), "worker"), ArtifactStoreError);
});

test("should_build_twin_domain_seed_bundle_with_reviewable_artifacts", async () => {
  const repository = new InMemoryArtifactRepository();
  const queue = new InMemoryPatternReviewQueue(fixedClock());
  const bundle = twinDomainSeedBundle();

  for (const artifact of bundle.artifacts) {
    const stored = await repository.putArtifact(artifact, "seed-worker");
    queue.submitCandidate(stored, "seed-worker");
  }

  assert.deepEqual(bundle.domains, ["distributed-systems", "cooperative-bank-compliance"]);
  assert.equal(bundle.artifacts.length, 4);
  assert.equal(bundle.transferWriteups.length, 2);
  assert.deepEqual(queue.summary(), { pending: 4, accepted: 0, rejected: 0 });
});

function artifactOf(
  kind: ArtifactKind,
  body: ArtifactEnvelope["body"],
  parents: readonly string[] = [],
  tags: ArtifactEnvelope["tags"] = [],
): ArtifactEnvelope {
  const draft = {
    kind,
    body,
    rulebaseHash,
    parents: [...parents],
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [...tags],
    createdAt: "2026-06-13T00:00:00.000Z",
  };
}

function patternBody(): ArtifactEnvelope["body"] {
  return {
    id: "pattern:boundary-authority",
    name: "Boundary-authority closure",
    domain: "agent-trace",
    motifSignature: ["boundary", "authority", "terminal_state"],
    nodes: [
      { id: "n1", label: "scope boundary", motifs: ["boundary"] },
      { id: "n2", label: "approval", motifs: ["authority"] },
    ],
    edges: [{ from: "n1", to: "n2", relation: "requires" }],
    provenance: {
      sourceArtifactIds: ["source:golden-incident"],
      rationale: "seeded from adjudicated expired-authority trap",
    },
    richness: "seed",
  };
}

function antiPatternBody(patternArtifactId: string): ArtifactEnvelope["body"] {
  return {
    id: "anti-pattern:stale-authority-close",
    name: "Stale authority close",
    domain: "agent-trace",
    failureMode: "Terminal claim closes after authority evidence expires.",
    motifSignature: ["authority", "freshness", "terminal_state"],
    triggeringPatternIds: [patternArtifactId],
    nodes: [
      { id: "n1", label: "expired approval", motifs: ["authority", "freshness"] },
    ],
    edges: [],
    provenance: {
      sourceArtifactIds: ["source:golden-incident"],
      rationale: "seeded from false-terminal diagnosis",
    },
    severity: "high",
  };
}

function fixedClock(): () => string {
  return () => "2026-06-13T00:00:00.000Z";
}
