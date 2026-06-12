# Packet M3-02: WL canonical dedup worker
**Subsystem:** workers/offline     **Depends on:** M3-01
**Spec:** specs/patterns/SPEC.md     **Blueprint:** docs/BLUEPRINT.md §8
**Fixtures in scope:** draft isomorphic-pattern dedup and non-isomorphic-negative fixtures into fixtures/_proposed/
**Out of scope:** review queue UI; hybrid retrieval
**Deliverables:** WL canonical hashing [VARIATION-POINT: dedup hasher], deterministic canonical id, collision-safe duplicate reporting, benchmark-sized worker tests.
**Exit:** make verify green; worker tests green; proposed fixtures documented.
**Protected paths touched:** none.
