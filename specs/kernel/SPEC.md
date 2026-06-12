# SPEC — packages/kernel (Atlas Kernel)

Blueprint sections: §3 (entire), §14 invariants 1–5, 10, 12–13, 17, 21–22.
Owner invariants: INV-1, INV-2, INV-6 (provenance query lives here).

## 1. Purpose

A pure, deterministic interpreter over the Atlas rulebase. Input: facts (an AST or
ProcessIR rendered as facts) + the rulebase. Output: `Verdict3[]` for the five semantic
checks, geometry analytics, and the provenance/two-mode check. No I/O. The Postgres
recursive-CTE implementations of the same checks (in `packages/store`) must agree with
this package byte-for-byte on fixtures — the TS evaluator is the reference semantics.

## 2. Public API (index.ts exports exactly these)

```ts
loadRulebase(rules: RulebaseFile[]): Rulebase            // validates, computes rulebaseHash
astToFacts(ast: MotifAst): Fact[]                        // deterministic flattening
evaluate(rulebase: Rulebase, facts: Fact[]): KernelReport // all checks, all Verdict3s
evaluateAnd(a: Verdict3Value, b: Verdict3Value): Verdict3Value   // Kleene
evaluateOr(a: Verdict3Value, b: Verdict3Value): Verdict3Value
evaluateNot(a: Verdict3Value): Verdict3Value
innovationGradient(rulebase: Rulebase, vector: MotifVector): GradientEntry[]
viabilityCheck(rulebase: Rulebase, node: AstNodeFacts): Verdict3
phaseTransitions(prev: MotifVector, next: MotifVector): HubCrossing[]
ruleDiff(a: Rulebase, b: Rulebase): RuleDiff             // for migration analysis
affectedChecks(diff: RuleDiff): CheckId[]                // rule_dependency intersection
```

## 3. The Rulebase

Lives in `packages/kernel/rulebase/` as JSON files (protected path), one file per
concern: `motifs.json` (32 entries + facet definitions), `composition.json` (requires
edges), `collisions.json`, `obligation_rules.json` (triggers over ProcessIR event types:
`privileged_transition`, `state_destruction`, `external_commitment`, `scope_exit`,
`irreversible_effect`), `diagnostics.json`, `facets.json`.
`rulebaseHash = sha256(canonicalJson(concatenated sorted files))` via shared hashing.

Rule shapes are constrained: this is NOT a general Datalog engine. The evaluator supports
exactly the rule forms the five checks need — conjunctive body, stratified negation over
`provided_in_scope_chain`, no recursion in rules themselves (recursion exists only in the
fixed scope-chain and composition-reachability walks, implemented as library functions).
If a future rule needs more expressive power, that is a kernel-versioning event and a
human decision, not an evaluator extension inside a packet.

## 4. The Five Checks (each returns Verdict3 per relevant node/claim)

1. **composition_completeness** — every claimed composite's prerequisites present in
   scope chain. Missing → invalid (dangling valence, names the missing prereq in
   bindings). Prereq presence depends on an `experimental` or below-confidence token →
   unknown with gap `below_extraction_bar` or `missing_evidence`.
2. **invariant_propagation** — child transitions vs inherited invariants. A child may
   strengthen, never weaken.
3. **fep_viability** — autonomous nodes have {state, boundary, transition, feedback}.
4. **collision_detection** — registry match on node motif signatures → invalid.
5. **terminal_validity** — Kleene-AND over the node's mandatory blocking obligations:
   any violated → invalid; else any unknown → unknown (with the union of gaps); else
   valid. Implemented ONLY via evaluateAnd; no boolean shortcuts.

Plus: **provenance_check(artifactDag, mode)** — in `production` mode, returns invalid if
any ancestor carries tag `experimental`; in `research` mode returns valid with an
advisory. This is INV-6's single implementation point.

## 5. Determinism Rules (lint-enforced)

- No imports outside: local files, `packages/shared/src/hashing`, `packages/shared/src/generated`.
- Banned identifiers anywhere in package: `Date.now`, `Math.random`, `fetch`, `process.env`,
  `setTimeout`, `crypto.randomUUID`. IDs of derived facts are content hashes.
- All exported functions referentially transparent; output ordering is sorted, never
  insertion-order dependent.

## 6. Fixtures (the contract — see fixtures/kernel/)

Format per fixture: `{ name, rulebaseOverride?, facts, expect: { check, nodeOrClaim,
value, gapKinds?, bindingsInclude? } }`. The runner loads the live rulebase unless
overridden, runs `evaluate`, and asserts. Seed set covers: dangling valence,
inherited-invariant violation, halting-collision, viability pass/fail, terminal
valid/invalid/unknown (one per), unknown-propagation through AND, experimental-provenance
rejection, innovation-gradient ranking on a hand-computed example.

## 7. Property Tests (fast-check; the only mandated tests in the repo)

- Kleene laws: commutativity, associativity, identity, De Morgan via evaluateNot.
- Monotonicity: removing a supporting fact never flips any verdict invalid→valid.
- Determinism: evaluate(rb, shuffle(facts)) ≡ evaluate(rb, facts).
- Hash stability: loadRulebase on byte-identical files yields identical rulebaseHash.

## 8. Non-Goals (do not build in this package)

LLM anything; persistence; HTTP; the WL pattern hashing (lives in workers); facet
*scoring* (kernel defines facets, runtime scores them).
