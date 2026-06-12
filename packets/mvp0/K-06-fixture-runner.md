# Packet K-06: Fixture runner
**Depends on:** K-04
**Deliverables:** scripts/run-fixtures.ts — discovers fixtures/, dispatches by runner kind
(kernel implemented now; store/runtime/trap kinds registered but skipped-with-warning
until their subsystems land — a SKIP is printed loudly, never silently), asserts expect
blocks incl. gapKinds and bindingsInclude, non-zero exit on any failure.
**Exit:** make fixtures green with kernel fixtures passing and others explicitly SKIPPED.
**Protected paths touched:** scripts/ (trailer required).
