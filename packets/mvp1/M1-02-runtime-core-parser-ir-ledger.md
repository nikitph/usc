# Packet M1-02: Runtime core parser, ProcessIR-lite, and obligation ledger
**Subsystem:** runtime     **Depends on:** M1-01,K-04
**Spec:** specs/runtime/SPEC.md Components 2,4,5     **Blueprint:** docs/BLUEPRINT.md §6.1,§6.3
**Fixtures in scope:** draft parser scope-nesting, boundary-as-concept negative, IR event mapping, and ledger obligation fixtures into fixtures/_proposed/
**Out of scope:** live LLM lexer, HTTP API, UI, Evidence Fixpoint Engine
**Deliverables:** packages/runtime/core/parser, process-ir-lite builder, obligation ledger materializer from kernel obligation_rules, typed domain errors, structured fact output for kernel.evaluate.
**Exit:** make verify green; runtime unit tests green; proposed runtime fixtures documented for human adjudication.
**Protected paths touched:** none (fixtures/_proposed only).
