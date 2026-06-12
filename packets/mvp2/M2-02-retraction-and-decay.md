# Packet M2-02: Retraction propagation and decay-as-TTL
**Subsystem:** runtime     **Depends on:** M2-01
**Spec:** specs/runtime/SPEC.md Evidence Fixpoint Engine     **Blueprint:** docs/BLUEPRINT.md §6.2
**Fixtures in scope:** draft retraction propagation, supersession, and TTL expiry fixtures into fixtures/_proposed/
**Out of scope:** live clocks in kernel; external evidence adapters; UI
**Deliverables:** active/retracted/superseded fact transitions, validity-window evaluation with injected clock, propagation through support sets, explicit unknown outputs for expired support.
**Exit:** make verify green; runtime evidence tests green; proposed fixtures documented.
**Protected paths touched:** none.
