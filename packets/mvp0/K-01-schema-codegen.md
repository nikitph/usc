# Packet K-01: Schema codegen pipeline
**Subsystem:** shared   **Depends on:** —
**Spec:** CLAUDE.md INV-9   **Blueprint:** §11 MVP 0
**Fixtures in scope:** none (infrastructure)
**Deliverables:** scripts/codegen.mjs working end-to-end: schemas/*.schema.json →
packages/shared/src/generated/*.ts (Zod, via json-schema-to-zod or hand-rolled emitter if
the library mishandles $ref/allOf) and workers/offline/generated/*.py (Pydantic v2 via
datamodel-code-generator). Resolve usc:// $refs locally. Generated-file header + the CI
hand-edit check must pass. pnpm workspace + packages/shared scaffold (hashing.ts:
canonicalJson + sha256, with 5 fixture-style unit cases for hash stability).
**Out of scope:** any kernel logic.
**Exit:** make codegen idempotent (second run = no diff); typecheck green.
**Protected paths touched:** scripts/codegen.mjs replacement (trailer required).
