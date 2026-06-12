# Packet M1-04: Action Gate API vertical path
**Subsystem:** runtime/apps     **Depends on:** M1-01,M1-02,M1-03
**Spec:** specs/runtime/SPEC.md Components 6     **Blueprint:** docs/BLUEPRINT.md §11 MVP 1
**Fixtures in scope:** fixtures/trap_set/trap-001 and trap-002 (must no longer SKIP)
**Out of scope:** browser UI dashboard; Evidence Fixpoint Engine; Pattern KG
**Deliverables:** apps/gate POST /v1/action-gate, idempotency by (agentId, action hash), pipeline lex→parse→IR→ledger→kernel.evaluate→artifact verdict, pending-on-error with named gaps, structured JSON logs with correlationId.
**Exit:** make verify green; trap fixtures pass through scripts/run-fixtures.ts; p95 budget smoke test uses deterministic test double.
**Protected paths touched:** scripts/run-fixtures.ts if trap runner registration changes (Approved-Protected-Change trailer required).
