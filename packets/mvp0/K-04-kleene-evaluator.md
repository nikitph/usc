# Packet K-04: Three-valued evaluator + five checks
**Depends on:** K-03
**Spec:** specs/kernel/SPEC.md §2,§4,§5
**Fixtures in scope:** fixtures/kernel/kernel-001..003, kernel-008 (and any added by adjudication)
**Deliverables:** evaluateAnd/Or/Not; astToFacts; evaluate() implementing the five checks +
provenance_check per spec; typed errors; purity lint green.
**Out of scope:** geometry, ruleDiff.
**Exit:** listed fixtures pass via the K-06 runner (coordinate: K-06 may land first with
kernel stubs, or this packet includes a minimal runner — agent picks, states choice).
