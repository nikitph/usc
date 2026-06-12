import assert from "node:assert/strict";
import { test } from "node:test";

import fc from "fast-check";

import { canonicalJson } from "@usc/shared/hashing";

import { evaluate } from "../src/evaluate.ts";
import type { Fact } from "../src/facts/types.ts";
import { loadRulebase } from "../src/rulebase/load.ts";
import { evaluateAnd, evaluateNot, evaluateOr } from "../src/verdict/kleene.ts";

const rulebase = loadRulebase();
const verdictValues = ["valid", "invalid", "unknown"] as const;
const nodeIds = ["n1", "n2", "n3"] as const;
const motifNames = ["authority", "communication", "invariant", "reconciliation", "prediction", "self_reference", "terminal_state", "state", "boundary", "transition", "feedback"] as const;
const artifactIds = ["a1", "a2", "a3"] as const;

const verdictValueArbitrary = fc.constantFrom(...verdictValues);
const nodeIdArbitrary = fc.constantFrom(...nodeIds);
const motifNameArbitrary = fc.constantFrom(...motifNames);
const artifactIdArbitrary = fc.constantFrom(...artifactIds);

const factArbitrary: fc.Arbitrary<Fact> = fc.oneof(
  nodeIdArbitrary.map((nodeId) => ({ fact: "node", args: [nodeId] })),
  fc.tuple(nodeIdArbitrary, motifNameArbitrary).map(([nodeId, motif]) => ({
    fact: "claims",
    args: [nodeId, motif],
  })),
  fc.tuple(nodeIdArbitrary, motifNameArbitrary).map(([nodeId, motif]) => ({
    fact: "provided_in_scope_chain",
    args: [nodeId, motif],
  })),
  fc.tuple(nodeIdArbitrary, motifNameArbitrary, fc.constantFrom("experimental", "unverified")).map(
    ([nodeId, motif, qualifier]) => ({
      fact: "provided_in_scope_chain",
      args: [nodeId, motif, qualifier],
    }),
  ),
  nodeIdArbitrary.map((nodeId) => ({ fact: "autonomous", args: [nodeId] })),
  fc.tuple(fc.constantFrom("t1", "t2"), nodeIdArbitrary).map(([claimId, nodeId]) => ({
    fact: "terminal_claim",
    args: [claimId, nodeId],
  })),
  fc
    .tuple(
      fc.constantFrom("o1", "o2", "o3"),
      fc.constantFrom("t1", "t2"),
      fc.constantFrom("authority", "evidence", "freshness"),
      fc.constantFrom("mandatory", "optional"),
      fc.constantFrom("blocking", "nonblocking"),
      fc.constantFrom("satisfied", "violated", "unknown"),
    )
    .map(([obligationId, claimId, obligationType, mandatory, blocking, status]) => ({
      fact: "obligation",
      args: [obligationId, claimId, obligationType, mandatory, blocking, status],
    })),
  fc.tuple(artifactIdArbitrary, fc.constantFrom("verdict", "ast", "token_stream")).map(([artifactId, kind]) => ({
    fact: "artifact",
    args: [artifactId, kind],
  })),
  fc.tuple(artifactIdArbitrary, artifactIdArbitrary).map(([child, parent]) => ({
    fact: "parent",
    args: [child, parent],
  })),
  fc.tuple(artifactIdArbitrary, fc.constantFrom("experimental", "stale_kernel", "superseded", "golden")).map(
    ([artifactId, tag]) => ({
      fact: "tagged",
      args: [artifactId, tag],
    }),
  ),
  fc.tuple(nodeIdArbitrary, fc.constantFrom("inv1", "inv2")).map(([nodeId, invariantId]) => ({
    fact: "inherited_invariant",
    args: [nodeId, invariantId],
  })),
  fc.tuple(nodeIdArbitrary, fc.constantFrom("inv1", "inv2")).map(([nodeId, invariantId]) => ({
    fact: "weakens_inherited_invariant",
    args: [nodeId, invariantId],
  })),
  fc.tuple(nodeIdArbitrary, fc.constantFrom("inv1", "inv2")).map(([nodeId, invariantId]) => ({
    fact: "invariant_status_unknown",
    args: [nodeId, invariantId],
  })),
  fc.constantFrom<Fact>({ fact: "mode", args: ["production"] }, { fact: "mode", args: ["research"] }),
);

// Kleene AND/OR are commutative and associative with valid/invalid identities, so truth folding never depends on operand order.
test("property_kleene_commutativity_associativity_and_identity", () => {
  fc.assert(
    fc.property(verdictValueArbitrary, verdictValueArbitrary, verdictValueArbitrary, (a, b, c) => {
      assert.equal(evaluateAnd(a, b), evaluateAnd(b, a));
      assert.equal(evaluateOr(a, b), evaluateOr(b, a));
      assert.equal(evaluateAnd(evaluateAnd(a, b), c), evaluateAnd(a, evaluateAnd(b, c)));
      assert.equal(evaluateOr(evaluateOr(a, b), c), evaluateOr(a, evaluateOr(b, c)));
      assert.equal(evaluateAnd(a, "valid"), a);
      assert.equal(evaluateOr(a, "invalid"), a);
    }),
  );
});

// Kleene NOT obeys De Morgan's laws, so negation preserves unknown instead of collapsing it to a boolean.
test("property_kleene_de_morgan", () => {
  fc.assert(
    fc.property(verdictValueArbitrary, verdictValueArbitrary, (a, b) => {
      assert.equal(evaluateNot(evaluateAnd(a, b)), evaluateOr(evaluateNot(a), evaluateNot(b)));
      assert.equal(evaluateNot(evaluateOr(a, b)), evaluateAnd(evaluateNot(a), evaluateNot(b)));
    }),
  );
});

// Removing one supporting fact must never make an already-invalid verdict become valid for the same check and target.
test("property_removing_fact_never_flips_invalid_to_valid", () => {
  fc.assert(
    fc.property(fc.array(factArbitrary, { minLength: 1, maxLength: 35 }), fc.nat(), (facts, removalSeed) => {
      const fullFacts = normalizeGeneratedFacts(facts);
      const removableIndexes = fullFacts
        .map((fact, index) => ({ fact, index }))
        .filter(({ fact }) => isSupportingFact(fact))
        .map(({ index }) => index);
      if (removableIndexes.length === 0) return;
      const removedIndex = removableIndexes[removalSeed % removableIndexes.length] as number;
      const reducedFacts = fullFacts.filter((_, index) => index !== removedIndex);
      const fullReport = evaluate(rulebase, fullFacts);
      const reducedReport = evaluate(rulebase, reducedFacts);
      const reducedValues = new Map(
        reducedReport.verdicts.map((entry) => [`${entry.check}/${entry.nodeOrClaim}`, entry.verdict.value]),
      );
      for (const entry of fullReport.verdicts) {
        if (entry.verdict.value !== "invalid") continue;
        assert.notEqual(reducedValues.get(`${entry.check}/${entry.nodeOrClaim}`), "valid");
      }
    }),
    { numRuns: 150 },
  );
});

// Shuffling facts cannot change the byte-identical kernel report because all indexing and output ordering are deterministic.
test("property_evaluate_is_deterministic_under_fact_shuffle", () => {
  fc.assert(
    fc.property(fc.array(factArbitrary, { maxLength: 35 }), fc.integer(), (facts, seed) => {
      const normalizedFacts = normalizeGeneratedFacts(facts);
      const shuffledFacts = deterministicShuffle(normalizedFacts, seed);
      assert.equal(canonicalJson(evaluate(rulebase, normalizedFacts)), canonicalJson(evaluate(rulebase, shuffledFacts)));
    }),
    { numRuns: 150 },
  );
});

// Loading byte-identical rulebase files repeatedly yields the same hash.
test("property_load_rulebase_hash_is_stable", () => {
  fc.assert(
    fc.property(fc.nat({ max: 20 }), () => {
      assert.equal(loadRulebase().hash, rulebase.hash);
    }),
  );
});

function normalizeGeneratedFacts(facts: readonly Fact[]): Fact[] {
  const singleValues = new Map<string, string>();
  const normalized: Fact[] = [];
  for (const fact of facts) {
    const singleValueKey = singleValuedFactKey(fact);
    if (singleValueKey === null) {
      normalized.push(fact);
      continue;
    }
    const value = fact.args.join("\u0000");
    const existing = singleValues.get(singleValueKey);
    if (existing === undefined) {
      singleValues.set(singleValueKey, value);
      normalized.push(fact);
    } else if (existing === value) {
      normalized.push(fact);
    }
  }
  return normalized;
}

function singleValuedFactKey(fact: Fact): string | null {
  switch (fact.fact) {
    case "artifact":
    case "terminal_claim":
    case "obligation":
      return `${fact.fact}/${fact.args[0] ?? ""}`;
    case "mode":
      return "mode";
    default:
      return null;
  }
}

function isSupportingFact(fact: Fact): boolean {
  if (fact.fact === "weakens_inherited_invariant") return false;
  if (fact.fact === "inherited_invariant") return false;
  if (fact.fact === "invariant_status_unknown") return false;
  if (fact.fact === "tagged" && fact.args[1] === "experimental") return false;
  if (fact.fact === "obligation") {
    const status = fact.args[5];
    return status !== "violated" && status !== "unknown";
  }
  return true;
}

function deterministicShuffle<T>(values: readonly T[], seed: number): T[] {
  const decorated = values.map((value, index) => ({
    value,
    key: hashNumber(seed, index),
  }));
  decorated.sort((left, right) => left.key - right.key);
  return decorated.map((entry) => entry.value);
}

function hashNumber(seed: number, index: number): number {
  let value = (seed ^ (index * 0x9e3779b9)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}
