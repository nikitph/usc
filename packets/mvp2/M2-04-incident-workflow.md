# Packet M2-04: Incident-from-logs workflow
**Subsystem:** runtime/apps     **Depends on:** M2-03
**Spec:** specs/runtime/SPEC.md Evidence Fixpoint Engine + Fixtures     **Blueprint:** docs/BLUEPRINT.md §6.2,§11 MVP 2
**Fixtures in scope:** draft one golden incident fixture with at least one false-terminal detection into fixtures/_proposed/
**Out of scope:** Pattern KG; intervention recommendations; production extractor bars
**Deliverables:** log-to-action-gate smoke workflow, hypothesis view over fixpoint retractions, diagnostic artifact bundle for a golden incident, dashboard metric extension for false-terminal detection.
**Exit:** make verify green; golden incident smoke produces adjudication-ready bundle; no production decision consumes experimental ancestry.
**Protected paths touched:** none.
