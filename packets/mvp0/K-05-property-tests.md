# Packet K-05: Kernel property tests
**Depends on:** K-04
**Spec:** specs/kernel/SPEC.md §7
**Deliverables:** fast-check suites: Kleene laws, monotonicity (fact removal never flips
invalid→valid), determinism under fact shuffle, rulebase hash stability. Wire to
`pnpm --filter @usc/kernel test:properties`.
**Exit:** make properties green; each property documented in one sentence above its test.
