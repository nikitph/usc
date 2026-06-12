import assert from "node:assert/strict";
import { test } from "node:test";

import { graftCheck, type Fact, type ValenceRequirement } from "../src/index.ts";

const requirements: readonly ValenceRequirement[] = [
  { id: "requires-authority", patternNodeId: "pattern-close", motif: "authority" },
  { id: "requires-feedback", patternNodeId: "pattern-close", motif: "feedback" },
];

test("should_bind_valence_requirements_to_confirmed_target_provisions", () => {
  const result = graftCheck({
    facts: [
      fact("node", "target-close"),
      fact("provided_in_scope_chain", "target-close", "authority"),
      fact("provided_in_scope_chain", "target-close", "feedback"),
    ],
    requirements,
    candidates: [{ patternNodeId: "pattern-close", targetNodeId: "target-close" }],
  });

  assert.equal(result.status, "graftable");
  assert.equal(result.verdict, "valid");
  assert.deepEqual(
    result.bindings.map((binding) => [binding.requirementId, binding.targetNodeId, binding.status]),
    [
      ["requires-authority", "target-close", "bound"],
      ["requires-feedback", "target-close", "bound"],
    ],
  );
  assert.deepEqual(result.rankingInputs, { boundCount: 2, unknownCount: 0, failedCount: 0, candidateCount: 1 });
});

test("should_return_pending_when_best_binding_uses_unverified_provision", () => {
  const result = graftCheck({
    facts: [
      fact("node", "target-close"),
      fact("provided_in_scope_chain", "target-close", "authority"),
      fact("provided_in_scope_chain", "target-close", "feedback", "unverified"),
    ],
    requirements,
    candidates: [{ patternNodeId: "pattern-close", targetNodeId: "target-close" }],
  });

  assert.equal(result.status, "graftable_pending_evidence");
  assert.equal(result.verdict, "unknown");
  assert.deepEqual(result.gaps, [
    {
      requirementId: "requires-feedback",
      patternNodeId: "pattern-close",
      motif: "feedback",
      reason: "unverified_provision",
    },
  ]);
  assert.deepEqual(result.rankingInputs, { boundCount: 1, unknownCount: 1, failedCount: 0, candidateCount: 1 });
});

test("should_reject_graft_when_required_binding_is_absent", () => {
  const result = graftCheck({
    facts: [
      fact("node", "target-close"),
      fact("provided_in_scope_chain", "target-close", "authority"),
    ],
    requirements,
    candidates: [{ patternNodeId: "pattern-close", targetNodeId: "target-close" }],
  });

  assert.equal(result.status, "not_graftable");
  assert.equal(result.verdict, "invalid");
  assert.deepEqual(result.rankingInputs, { boundCount: 1, unknownCount: 0, failedCount: 1, candidateCount: 1 });
});

function fact(predicate: string, ...args: readonly string[]): Fact {
  return { fact: predicate, args };
}
