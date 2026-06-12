# Packet M1-01: Artifact Store foundation
**Subsystem:** store     **Depends on:** K-01,K-04,K-06
**Spec:** specs/store/SPEC.md Tables, Repository API, Roles     **Blueprint:** docs/BLUEPRINT.md §4
**Fixtures in scope:** draft fixtures/store/store-001-dedup.json, store-002-dag.json, store-003-experimental-ancestor.json into fixtures/_proposed/
**Out of scope:** pgvector nearestVectors implementation beyond a typed placeholder; runtime/gate API
**Deliverables:** packages/store scaffold, migrations 0001 up/down, typed repository API, in-memory adapter for local fixtures, artifact hash verification via @usc/shared, DAG reconstruction, experimental-ancestor query matching kernel semantics.
**Exit:** make verify green; store package tests green; proposed store fixtures documented for human adjudication.
**Protected paths touched:** none (fixtures/_proposed only; migrations live under packages/store).
