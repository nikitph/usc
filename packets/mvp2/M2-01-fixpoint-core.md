# Packet M2-01: Evidence fixpoint core
**Subsystem:** runtime     **Depends on:** M1-06
**Spec:** specs/runtime/SPEC.md Evidence Fixpoint Engine     **Blueprint:** docs/BLUEPRINT.md §6.2
**Fixtures in scope:** draft fixpoint support-set and deterministic-worklist fixtures into fixtures/_proposed/
**Out of scope:** external evidence adapters; incident UI; Pattern KG
**Deliverables:** runtime/core/evidence fact model, asserted/derived fact APIs, support-set tracking, deterministic worklist iteration, typed fixpoint errors.
**Exit:** make verify green; runtime evidence tests green; proposed fixtures documented for human adjudication.
**Protected paths touched:** none.
