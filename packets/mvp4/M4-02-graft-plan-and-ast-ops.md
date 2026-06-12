# Packet M4-02: Graft plans and AST modification ops
**Subsystem:** intervention/runtime/store     **Depends on:** M4-01
**Spec:** specs/intervention/SPEC.md     **Blueprint:** docs/BLUEPRINT.md §9
**Fixtures in scope:** draft graft_plan artifact and mandatory-recompile fixtures into fixtures/_proposed/
**Out of scope:** code emitters; feedback capture
**Deliverables:** graft_plan artifact body, AST modification operations, mandatory recompile validation, parent links to pattern/target/verdict artifacts.
**Exit:** make verify green; graft plan tests green; proposed fixtures documented.
**Protected paths touched:** schemas/** with Approved-Protected-Change trailer required if graft_plan body schema changes.
