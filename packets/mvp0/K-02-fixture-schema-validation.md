# Packet K-02: Fixture schema validation
**Depends on:** K-01
**Deliverables:** scripts/validate-fixture-schemas.mjs — validates every fixture file's
shape (runner-specific envelope) and every embedded body (tokens, obligations, verdict
expectations) against generated Zod schemas. Unknown runner kind = failure.
**Exit:** all seed fixtures validate; a deliberately-broken fixture in a temp dir is rejected (demonstrate in commit description, do not commit it).
**Protected paths touched:** scripts/ (trailer required).
