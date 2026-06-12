# MVP 2 — Evidence Fixpoint Engine

Goal: implement the runtime Evidence Fixpoint Engine from Blueprint §6.2: chunked recovery, joins, retraction propagation, decay-as-TTL, hypothesis views, and an incident-from-logs workflow.

Packets:
- M2-01 — Fixpoint fact store, support sets, and deterministic worklist.
- M2-02 — Retraction propagation and decay-as-TTL.
- M2-03 — Evidence joins, budget-aware unknowns, and test-double evidence sources.
- M2-04 — Incident-from-logs workflow and golden incident smoke.

MVP 2 exit: golden incident compilations reproduce adjudicated root causes including at least one false-terminal detection; `make verify` remains green.
