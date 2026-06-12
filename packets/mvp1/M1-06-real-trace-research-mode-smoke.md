# Packet M1-06: Real trace research-mode smoke
**Subsystem:** runtime/apps/store     **Depends on:** M1-04,M1-05
**Spec:** specs/runtime/SPEC.md Components 1-6     **Blueprint:** docs/BLUEPRINT.md §11 MVP 1
**Fixtures in scope:** one agent-trace fixture drafted into fixtures/_proposed/ for human adjudication
**Out of scope:** production-mode extractor bars, Pattern KG, Evidence Fixpoint Engine
**Deliverables:** run the gate against a real local agent trace in research mode with experimental-tagged extraction artifacts, store full derivation DAG, publish a self-contained diagnostic artifact bundle.
**Exit:** make verify green; trace smoke produces verdict artifact with provenance DAG; no production decision consumes experimental ancestry.
**Protected paths touched:** none (fixtures/_proposed only).
