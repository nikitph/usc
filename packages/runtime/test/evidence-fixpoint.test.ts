import assert from "node:assert/strict";
import { test } from "node:test";

import { EvidenceFixpointEngine, RuntimeError, type EvidenceDerivationRule } from "../src/index.ts";

const assertedAt = "2026-06-13T00:00:00.000Z";

test("should_track_support_sets_when_deriving_fact", () => {
  const engine = new EvidenceFixpointEngine();
  engine.assertFact({ id: "log:1", body: { message: "deploy complete" }, assertedAt });

  const derived = engine.deriveFact({
    id: "claim:terminal",
    body: { terminal: true },
    assertedAt,
    supports: ["log:1"],
  });

  assert.deepEqual(derived.supports, ["log:1"]);
  assert.equal(engine.getFact("claim:terminal").status, "active");
});

test("should_run_worklist_deterministically_until_fixpoint", () => {
  const engine = new EvidenceFixpointEngine();
  engine.assertFact({ id: "a", body: { value: 1 }, assertedAt });
  const rules: EvidenceDerivationRule[] = [
    {
      id: "derive-c",
      derive: (facts) => facts.some((fact) => fact.id === "b")
        ? [{ id: "c", body: { value: 3 }, assertedAt, supports: ["b"] }]
        : [],
    },
    {
      id: "derive-b",
      derive: (facts) => facts.some((fact) => fact.id === "a")
        ? [{ id: "b", body: { value: 2 }, assertedAt, supports: ["a"] }]
        : [],
    },
  ];

  const report = engine.runFixpoint(rules);

  assert.deepEqual(report.derivedFactIds, ["b", "c"]);
  assert.deepEqual(engine.activeFacts().map((fact) => fact.id), ["a", "b", "c"]);
});

test("should_reject_derived_fact_with_missing_support", () => {
  const engine = new EvidenceFixpointEngine();

  assert.throws(
    () => engine.deriveFact({ id: "claim:terminal", body: { terminal: true }, assertedAt, supports: ["missing"] }),
    RuntimeError,
  );
});

test("should_reject_conflicting_fact_with_same_id", () => {
  const engine = new EvidenceFixpointEngine();
  engine.assertFact({ id: "log:1", body: { message: "first" }, assertedAt });

  assert.throws(
    () => engine.assertFact({ id: "log:1", body: { message: "second" }, assertedAt }),
    RuntimeError,
  );
});
