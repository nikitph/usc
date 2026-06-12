# Packet M1-03: Lexer and terminal detector test doubles
**Subsystem:** runtime     **Depends on:** M1-01,M1-02,K-08
**Spec:** specs/runtime/SPEC.md Components 1,3     **Blueprint:** docs/BLUEPRINT.md §5,§6.3
**Fixtures in scope:** ensemble vote resolution fixture; terminal-claim detector fixture in fixtures/_proposed/
**Out of scope:** live LLM calls; production extractor calibration; Pattern KG ingestion
**Deliverables:** runtime extraction backend registry [VARIATION-POINT], deterministic keyword extractor test double, ensemble vote clustering by motif+overlapping span, terminal-claim surface detector test double, raw-output artifact recording before parse.
**Exit:** make verify green; runtime extraction tests green; no LLM/network dependency.
**Protected paths touched:** none (fixtures/_proposed only).
