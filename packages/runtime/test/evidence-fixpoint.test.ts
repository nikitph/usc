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

test("should_propagate_retraction_through_support_sets", () => {
  const engine = new EvidenceFixpointEngine();
  engine.assertFact({ id: "log:1", body: { message: "terminal" }, assertedAt });
  engine.deriveFact({ id: "claim:terminal", body: { terminal: true }, assertedAt, supports: ["log:1"] });

  engine.retractFact("log:1");

  assert.equal(engine.getFact("log:1").status, "retracted");
  assert.equal(engine.getFact("claim:terminal").status, "retracted");
  assert.deepEqual(engine.activeFacts(), []);
});

test("should_supersede_fact_and_retract_dependents", () => {
  const engine = new EvidenceFixpointEngine();
  engine.assertFact({ id: "policy:v1", body: { threshold: 1 }, assertedAt });
  engine.deriveFact({ id: "decision:old", body: { allowed: true }, assertedAt, supports: ["policy:v1"] });

  const replacement = engine.supersedeFact("policy:v1", {
    id: "policy:v2",
    body: { threshold: 2 },
    assertedAt,
  });

  assert.equal(engine.getFact("policy:v1").status, "superseded");
  assert.equal(engine.getFact("decision:old").status, "retracted");
  assert.equal(replacement.status, "active");
});

test("should_expire_facts_by_injected_clock_and_propagate_decay", () => {
  const engine = new EvidenceFixpointEngine();
  engine.assertFact({
    id: "approval:1",
    body: { approved: true },
    assertedAt,
    validUntil: "2026-06-13T01:00:00.000Z",
  });
  engine.deriveFact({ id: "authority:ok", body: { authority: true }, assertedAt, supports: ["approval:1"] });

  const expired = engine.expireFacts("2026-06-13T02:00:00.000Z");

  assert.deepEqual(expired.map((fact) => fact.id), ["approval:1"]);
  assert.equal(engine.getFact("approval:1").status, "retracted");
  assert.equal(engine.getFact("authority:ok").status, "retracted");
});
