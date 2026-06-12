# Packet M3-01: Pattern and anti-pattern schemas
**Subsystem:** schemas/shared/store     **Depends on:** M2-04
**Spec:** specs/patterns/SPEC.md     **Blueprint:** docs/BLUEPRINT.md §7,§8
**Fixtures in scope:** draft pattern and anti-pattern artifact examples into fixtures/_proposed/
**Out of scope:** auto-insert; retrieval; fidelity scoring
**Deliverables:** proposed pattern/anti_pattern body schemas, generated TS/Python types via make codegen, store body validation coverage for new artifact kinds.
**Exit:** make verify green; schema validation tests green; proposed fixtures documented.
**Protected paths touched:** schemas/** with Approved-Protected-Change trailer required.
