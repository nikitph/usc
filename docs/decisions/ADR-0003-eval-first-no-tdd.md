# ADR-0003: Eval-first gating; no TDD
Contracts are human-adjudicated fixtures + kernel property tests + schema validation.
No unit-test mandates, no coverage targets. Rationale: fixtures the agent did not author
are an oracle the agent cannot game; TDD ceremony rejected by owner. Property tests are
scoped to the one component whose claim is mathematical (the Kleene evaluator).
Supersedes Phase 9 of UNIVERSAL_CODING_STANDARDS v1.1 for this repo (STANDARDS.md D1).
