# ADR-0005: Transfer Adjudication Boundary

Status: accepted

USC is an indirection system, not an abstraction that erases domain reality. A cross-domain
transfer produced by USC is a structured, provenance-bearing candidate. It is not a claim
that the creator has personally validated every downstream domain nuance.

Creator adjudication is limited to pipeline behavior:

- the transfer was generated through the intended USC mechanism;
- provenance, parent links, warnings, and uncertainty were preserved;
- the system did not mark candidates as production-safe without the required gates;
- fixtures assert generation, ranking, routing, and feedback behavior rather than domain truth.

Domain-specific failure modes are owned by downstream users/operators and captured through
feedback events, review outcomes, and empirical transfer scoring. The creator should not be
asked to adjudicate hidden domain expertise during intermediate development steps.

Development process rule: proposed fixtures and generated artifacts may exercise transfer
directions, but promotion to live ground truth must state whether the fixture validates USC
pipeline behavior or domain fitness. Unless a downstream domain owner has supplied feedback,
the fixture validates pipeline behavior only.
