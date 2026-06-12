# Packet M2-03: Evidence joins and budget-aware unknowns
**Subsystem:** runtime     **Depends on:** M2-02
**Spec:** specs/runtime/SPEC.md Evidence Fixpoint Engine + Components 5-6     **Blueprint:** docs/BLUEPRINT.md §6.2,§9.3
**Fixtures in scope:** draft evidence join, contradictory evidence, and budget_exhausted fixtures into fixtures/_proposed/
**Out of scope:** production evidence services; Pattern KG; browser UI changes
**Deliverables:** closed evidence-source registry [VARIATION-POINT], deterministic test-double evidence source, join rules over support sets, budget exhaustion mapped to unknown gaps, gate integration for evidence resolution.
**Exit:** make verify green; trap fixtures remain green; new runtime evidence tests green.
**Protected paths touched:** none.
