import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ArtifactHashMismatchError,
  ArtifactNotFoundError,
  ArtifactStoreError,
  InMemoryArtifactRepository,
  computeArtifactId,
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
