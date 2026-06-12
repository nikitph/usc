import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluate } from "../src/evaluate.ts";
import { loadRulebase } from "../src/rulebase/load.ts";

// Regression pins for owner-reported INV-1 violations (2026-06-13 review):
// short-circuits that resolved missing/below-bar evidence to success.

const rulebase = loadRulebase();

test("should_return_unknown_when_claimed_prerequisite_is_only_experimentally_provided", () => {
  // Reported repro: abstraction with an experimental representation
  // prerequisite returned valid — claims() upgraded a below-bar token.
  const report = evaluate(rulebase, [
    { fact: "node", args: ["n1"] },
    { fact: "claims", args: ["n1", "abstraction"] },
    { fact: "claims", args: ["n1", "boundary"] },
    { fact: "claims", args: ["n1", "representation"] },
    { fact: "provided_in_scope_chain", args: ["n1", "representation", "experimental"] },
  ]);
  const verdict = report.verdicts.find(
    (entry) => entry.check === "composition_completeness" && entry.nodeOrClaim === "n1",
  );
  assert.equal(verdict?.verdict.value, "unknown");
  assert.ok(verdict?.verdict.gaps?.some((gap) => gap.kind === "below_extraction_bar"));
});

test("should_return_unknown_when_viability_motif_is_only_experimentally_provided", () => {
  // Reported repro: FEP viability with experimental feedback returned valid.
  const report = evaluate(rulebase, [
    { fact: "autonomous", args: ["n1"] },
    { fact: "claims", args: ["n1", "state"] },
    { fact: "claims", args: ["n1", "boundary"] },
    { fact: "claims", args: ["n1", "transition"] },
    { fact: "claims", args: ["n1", "feedback"] },
    { fact: "provided_in_scope_chain", args: ["n1", "feedback", "experimental"] },
  ]);
  const verdict = report.verdicts.find(
    (entry) => entry.check === "fep_viability" && entry.nodeOrClaim === "n1",
  );
  assert.equal(verdict?.verdict.value, "unknown");
  assert.ok(verdict?.verdict.gaps?.some((gap) => gap.kind === "below_extraction_bar"));
});

test("should_return_unknown_when_mode_undeclared_and_ancestry_is_experimental", () => {
  // Reported repro: verdict artifact with an experimental parent and no mode
  // fact returned valid — mode omission silently chose the permissive path.
  const report = evaluate(rulebase, [
    { fact: "artifact", args: ["a_verdict", "verdict"] },
    { fact: "parent", args: ["a_verdict", "a_tokens"] },
    { fact: "tagged", args: ["a_tokens", "experimental"] },
  ]);
  const verdict = report.verdicts.find(
    (entry) => entry.check === "provenance_check" && entry.nodeOrClaim === "a_verdict",
  );
  assert.equal(verdict?.verdict.value, "unknown");
  assert.ok(verdict?.verdict.gaps?.some((gap) => gap.kind === "missing_evidence"));
  assert.equal(verdict?.verdict.bindings["experimentalAncestor"], "a_tokens");
});

test("should_stay_valid_when_mode_undeclared_and_ancestry_is_clean", () => {
  // Mode only matters when it would change the answer; a clean DAG is valid
  // in both modes.
  const report = evaluate(rulebase, [
    { fact: "artifact", args: ["a_verdict", "verdict"] },
    { fact: "parent", args: ["a_verdict", "a_ast"] },
  ]);
  const verdict = report.verdicts.find(
    (entry) => entry.check === "provenance_check" && entry.nodeOrClaim === "a_verdict",
  );
  assert.equal(verdict?.verdict.value, "valid");
});
