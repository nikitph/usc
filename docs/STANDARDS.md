# USC Coding Standards — Project Adaptation of UNIVERSAL_CODING_STANDARDS v1.1

This document adapts CREDIT IQ's Universal Coding Standards to the USC repo. The generic
standards apply IN FULL except where the Deviations table below overrides them. Where this
file is silent, the generic standard governs. The generic document is vendored at
`docs/UNIVERSAL_CODING_STANDARDS_v1_1.md` for reference.

## Why deviations exist

The generic standards target line-of-business CRUD systems (loans, GST, audits) where the
domain model is entities-with-lifecycles. USC's core is a deterministic interpreter, an
append-only artifact store, and LLM pipelines. Several generic rules are either already
satisfied structurally by the architecture (and re-applying them adds ceremony) or are
calibrated for a different shape of system. Each deviation states what replaces the rule,
so nothing is dropped silently.

## Deviations

| ID | Generic rule (v1.1) | USC adaptation | Rationale |
|----|---------------------|----------------|-----------|
| D1 | Phase 9: tests written WITH every public function; unit tests for all domain logic | **Replaced by the eval-first gate.** Contracts are adjudicated fixtures (`fixtures/`) + property tests on the kernel evaluator + schema validation. Unit tests are optional and only to pin actually-encountered bugs. No coverage targets. | Owner's explicit decision: no TDD. Fixtures the agent didn't author are a stronger oracle than tests it did. |
| D2 | Phase 6.5: no primitive types for domain concepts anywhere; value objects for everything | **Branded types at boundaries only.** `ArtifactId`, `MotifId`, `RulebaseHash`, `CaseId`, `Confidence` (0–1), `SourceSpan` are branded/validated. Intermediate locals inside a module may be plain. No `Money`-style value-object proliferation — USC has few quantities. | Full value-object discipline is calibrated for financial CRUD; here it would wrap strings in strings. The leak points are module boundaries, which is where branding is enforced. |
| D3 | Phase 2.2 / 4.3: any branch on type/kind MUST be a Strategy; even two variants | **Closed unions + exhaustive `switch` by default.** Strategy/registry ONLY at spec-marked `[VARIATION-POINT]`s: codegen emitters, extraction backends, evidence fetchers, dedup hashers, LLM providers. Kernel rule evaluation is data-driven already — the rulebase IS the open-closed mechanism; adding a Strategy layer on top would duplicate it. | Discriminated unions with exhaustiveness checking (`never` default arm) give the same safety with less indirection. Variation points that genuinely vary are explicitly listed. |
| D4 | Phase 1.1: four-layer architecture (Domain/Application/Infrastructure/Presentation) in every component | **Two layers per package: pure core + adapters.** `packages/kernel` is 100% pure (the Domain layer, enforced by import lint). `packages/store` and `packages/runtime` each have `core/` (types + logic) and `adapters/` (Postgres, LLM, HTTP). `apps/web` and the gate API are presentation and import only package public APIs. | The dependency-direction principle is kept absolutely (kernel imports nothing); the four-layer ceremony per package is overhead at this codebase size. Revisit if a package's adapters exceed ~10 files. |
| D5 | Phase 13.1: 3NF as baseline | **Artifact store is deliberately a JSONB document table** (`artifacts`, `artifact_parents`) — this is the documented denormalization, with consistency guaranteed by immutability (no update anomalies on append-only data). Relational 3NF applies to everything else: rulebase tables, pattern operational stats, feedback events, benchmark results. | Content-addressed immutable artifacts are the design (blueprint §4); normalizing them would destroy the hash discipline. |
| D6 | Max 50 lines per function (hard) | Guideline, not gate. Exceeding requires a one-line justification comment. Lint warns, doesn't fail. | Datalog-style evaluators and SQL builders have legitimately long cohesive functions; forced splits hurt readability. |
| D7 | Phase 4.2: Adapter mandatory for ALL external dependencies | Mandatory for: LLM providers, object storage, embedding services, queue. NOT required for: Zod, the Postgres driver inside `store/adapters` (it IS the adapter), std-lib-grade utilities (lodash-class). | Wrapping the wrapper is ceremony. The rule's intent — replaceability of services with failure modes — is preserved. |
| D8 | Phase 10.3: health endpoints + metrics on every service | Required on the gate API and workers. Not required on `apps/web` (Vercel platform metrics suffice) or pure packages. | Scope to where it means something. |
| D9 | Singleton ban via DI container | No DI container at all. Explicit constructor injection by hand; composition roots in `apps/*` and `workers/*` entry files. | A DI framework is conceptual overhead the codebase size doesn't justify; the principle (inject, never instantiate inline) is kept verbatim. |

## Rules kept in full force (highlights — see vendored doc for complete text)

- **Phase 3.5 Abstraction Hygiene — entire section, verbatim.** This is the most valuable
  section for this project: the kernel's three-valued verdicts are exactly "deleted
  information made first-class," and every wrapper around an LLM must inherit its
  foundation's leaks honestly (Principle 6 = INV-8). The 7-question review checklist
  applies to every new interface PR.
- Phase 6: fail fast, immutability default, explicit absence, boundary validation.
- Phase 7: typed errors per failure domain; no swallowed errors; infra errors translated
  at boundaries. (Elevated to CLAUDE.md INV-8.)
- Phase 8: naming as documentation, greppability, enforcement list verbatim.
- Phase 10.1–10.2: structured logging + correlation IDs.
- Phase 11: all of it. Parameterized queries non-negotiable; least privilege via two
  Supabase roles (`usc_reader`, `usc_writer`) from day one; PII masking is N/A until
  client corpora land — at which point Phase 11.4 applies in full to ingestion workers.
- Phase 12: pagination everywhere, idempotency keys on all write APIs (the gate API is
  idempotent by `(agentId, action-hash)` — same proposal twice returns the same verdict
  artifact).
- Phase 13.2–13.4: DB-enforced integrity, migrations with up/down, audit columns, soft
  deletes (artifacts are never hard-deleted, ever — regulatory posture from day one).
- Phase 14: conventional commits, CI gates, ADRs in `docs/decisions/`.
- Phase 15: one concept per file, explicit package public APIs (`index.ts` exports only).
- Phase 16: config and secrets rules verbatim.

## USC-specific additions (not in the generic doc)

1. **Three-valued logic is part of the type system.** `Verdict3` is the only verdict
   type. Boolean-returning functions over structural claims are a lint error in
   `packages/kernel` (`scripts/lint-kernel-purity.mjs` checks this and the import ban).
2. **Hash discipline.** Anything content-addressed is hashed by ONE function
   (`packages/shared/src/hashing.ts`, canonical-JSON + SHA-256). Two hash code paths is
   a correctness bug, not a style issue.
3. **Generated code is untouchable.** `packages/shared/src/generated/` and
   `workers/offline/generated/` carry a header comment and a CI check; edits fail.
4. **Every PR description lists deviations-from-spec it knowingly made** (target: zero).
