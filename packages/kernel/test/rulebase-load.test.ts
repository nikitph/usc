import assert from "node:assert/strict";
import { test } from "node:test";

import { loadRulebase } from "../src/rulebase/load.ts";
import { PROCESS_IR_EVENT_TYPES } from "../src/rulebase/types.ts";

// Pins the loadRulebase contract (K-03). The full kernel property suites
// (Kleene/monotonicity/determinism, fast-check) land with packet K-05.

test("should_load_complete_rulebase_when_files_are_consistent", () => {
  const { rulebase } = loadRulebase();
  assert.equal(rulebase.motifs.length, 32);
  assert.deepEqual(
    rulebase.motifs.filter((motif) => motif.hub).map((motif) => motif.name).sort(),
    ["authority", "boundary", "composition", "feedback", "representation", "scarcity"],
  );
  assert.equal(rulebase.facets.length, 32);
  const facetsWithContent = rulebase.facets.filter(
    (entry) => entry.status === "transcribed" || entry.status === "drafted",
  );
  for (const entry of facetsWithContent) {
    assert.ok(entry.facets.length >= 3 && entry.facets.length <= 5, `${entry.motif} facet count`);
  }
  for (const eventType of PROCESS_IR_EVENT_TYPES) {
    assert.ok(
      rulebase.obligationRules.some((rule) => rule.eventType === eventType),
      `obligation rule coverage for ${eventType}`,
    );
  }
});

test("should_return_byte_identical_hash_when_called_twice", () => {
  assert.equal(loadRulebase().rulebaseHash, loadRulebase().rulebaseHash);
  assert.match(loadRulebase().rulebaseHash, /^[a-f0-9]{64}$/);
});

test("should_freeze_rulebase_when_loaded", () => {
  const { rulebase } = loadRulebase();
  assert.ok(Object.isFrozen(rulebase));
  assert.ok(Object.isFrozen(rulebase.motifs));
  assert.ok(Object.isFrozen(rulebase.motifs[0]));
  assert.ok(Object.isFrozen(rulebase.obligationRules[0]));
});

test("should_never_carry_allow_as_safe_default_in_any_rule", () => {
  // INV-7: fail-open is unrepresentable in the obligation safeDefault enum;
  // this pins that the loaded data never smuggles it in as a plain string.
  const { rulebase } = loadRulebase();
  for (const rule of rulebase.obligationRules) {
    assert.notEqual(rule.safeDefault, "allow");
  }
});
