import assert from "node:assert/strict";
import { test } from "node:test";

import {
  affectedChecks,
  innovationGradient,
  loadRulebase,
  phaseTransitions,
  ruleDiff,
  viabilityCheck,
  type MotifVector,
  type Rulebase,
} from "../src/index.ts";

const rulebase = loadRulebase();

test("should_rank_hand_computed_innovation_gradient_fixture", () => {
  const vector: MotifVector = {
    representation: 1,
    feedback: 1,
    search: 1,
    scarcity: 1,
    communication: 1,
    invariant: 1,
  };

  assert.deepEqual(innovationGradient(rulebase, vector).slice(0, 3), [
    { motif: "authority", unlockCount: 2, unlockedComposites: ["negotiation", "reconciliation"] },
    { motif: "boundary", unlockCount: 2, unlockedComposites: ["abstraction", "model"] },
    { motif: "composition", unlockCount: 2, unlockedComposites: ["emergence", "queue"] },
  ]);
});

test("should_return_valid_viability_when_required_motifs_are_full_strength", () => {
  const verdict = viabilityCheck(rulebase, {
    nodeId: "n1",
    vector: { state: 1, boundary: 1, transition: 1, feedback: 1 },
  });

  assert.equal(verdict.value, "valid");
});

test("should_return_invalid_viability_when_required_motif_is_missing", () => {
  const verdict = viabilityCheck(rulebase, {
    nodeId: "n1",
    vector: { state: 1, boundary: 1, transition: 1 },
  });

  assert.equal(verdict.value, "invalid");
  assert.equal(verdict.bindings["missingMotif"], "feedback");
});

test("should_report_hub_zero_nonzero_phase_transitions", () => {
  assert.deepEqual(
    phaseTransitions({ authority: 0, feedback: 0.4, representation: 1 }, { authority: 1, feedback: 0 }),
    [
      { motif: "authority", from: 0, to: 1, direction: "entered" },
      { motif: "feedback", from: 0.4, to: 0, direction: "exited" },
      { motif: "representation", from: 1, to: 0, direction: "exited" },
    ],
  );
});

test("should_map_rule_diff_sections_to_affected_checks", () => {
  const changedCollisions: Rulebase = {
    ...rulebase,
    collisions: [],
  };
  const diff = ruleDiff(rulebase, changedCollisions);

  assert.deepEqual(diff.changedSections, ["collisions"]);
  assert.deepEqual(affectedChecks(diff), ["collision_detection"]);
});
