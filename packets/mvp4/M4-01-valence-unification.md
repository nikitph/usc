# Packet M4-01: Valence unification and graft checks
**Subsystem:** intervention/kernel/runtime     **Depends on:** M3-05
**Spec:** specs/intervention/SPEC.md     **Blueprint:** docs/BLUEPRINT.md §9
**Fixtures in scope:** draft positive graft-check and unknown-binding fixtures into fixtures/_proposed/
**Out of scope:** AST mutation; emitters; feedback capture
**Deliverables:** GraftCheck query API using kernel facts, binding search over pattern-node to target-node candidates, unknown binding gaps, deterministic ranking inputs.
**Exit:** make verify green; intervention tests green; proposed fixtures documented.
**Protected paths touched:** none.
