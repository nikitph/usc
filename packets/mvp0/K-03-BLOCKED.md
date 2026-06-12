# BLOCKED — K-03 facet-table source discrepancy

Packet K-03 asks for a facet table "for the 8 motifs in blueprint §7.1 with TODO
markers for the rest."

The cited source, `docs/BLUEPRINT.md` §7.1, explicitly lists facet names for only
four motifs:

- `feedback`
- `reconciliation`
- `invariant`
- `authority`

The remaining text is an ellipsis: "full facet table maintained in the rulebase,
versioned with it." No additional four motif facet lists are present in the
packet's cited source.

The current rulebase therefore transcribes those four sourced facet lists and
marks the other 28 motifs as `todo_human_adjudication`. This avoids inventing
rulebase semantics in a protected path.

Human adjudication needed:

1. Confirm that K-03 should accept four transcribed facet tables plus 28 TODO
   entries, or
2. Provide the four missing motif facet lists and their source, then update
   `packages/kernel/rulebase/facets.json` in a protected-path-reviewed change.

## Verification gate note

`make verify` also cannot be green at the K-03 boundary without starting later
packets. The `fixtures` target invokes `scripts/run-fixtures.ts`, whose runner is
explicitly assigned to K-06, while the kernel evaluator needed by the kernel
fixtures is assigned to K-04.

Do not make this green by skipping fixtures or returning success from the
placeholder runner. That would mask adjudicated fixture coverage. Acceptable
resolutions are:

1. Treat K-03 as human-review-blocked until the packet ordering reaches K-04 and
   K-06, or
2. Explicitly revise the MVP-0 packet workflow so pre-K-06 packets use a narrower
   verification target.
