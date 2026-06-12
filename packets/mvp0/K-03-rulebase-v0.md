# Packet K-03: Rulebase v0 (DATA ONLY — human pair-review required)
**Depends on:** K-01
**Spec:** specs/kernel/SPEC.md §3   **Blueprint:** §3.1, paper Tables 1–4
**Deliverables:** packages/kernel/rulebase/{motifs,composition,collisions,obligation_rules,
diagnostics,facets}.json transcribed from BLUEPRINT + the paper (32 motifs, composition
edges from paper §3 'Composition:' lines + §4.1, 6 hubs flagged, collision registry,
obligation rules over the 5 IR event types, facet table for the 8 motifs in blueprint §7.1
with TODO markers for the rest). loadRulebase() + rulebaseHash in packages/kernel.
**Exit:** loadRulebase validates and hashes; a RULEBASE_REVIEW.md diff summary produced
for human adjudication. THIS PACKET'S OUTPUT IS NOT TRUSTED UNTIL HUMAN-REVIEWED.
**Protected paths touched:** packages/kernel/rulebase (trailer required — this is its creation).
