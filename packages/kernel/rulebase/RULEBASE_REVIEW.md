# RULEBASE_REVIEW — Rulebase v0 transcription summary (packet K-03)

**Status: NOT TRUSTED until a human pair-reviews this transcription** (packet K-03 header).
Sources: `docs/endtoendmotifsystemv2.pdf` ("the paper"), `docs/BLUEPRINT.md`, `specs/kernel/SPEC.md`,
and (for two safe defaults) the adjudicated trap fixtures. Every entry in every file carries its own
`provenance` field; this document summarizes what was transcribed, from where, and every judgment
call that needs your adjudication.

Verified mechanically: `loadRulebase()` validates all six files (motif names against the generated
schema enum, obligation types/safe-defaults against the generated obligation schema, requires-DAG
acyclicity, 6 hubs, full 32-motif coverage) and hashes deterministically.
`rulebaseHash` after the owner-approved drafting pass (2026-06-12):
`6b5af89ede5faa19f19f90c356b5805092c9862ba69230e4a1ab4cbc22c52a4c`.

**Update (2026-06-12, owner-approved drafting pass):** the owner judged the TODO-stub queue
excessive process and approved agent drafting. 27 facet lists and 4 obligation rules (covering the
3 unmapped event types) are now encoded with `status: "drafted"` — distinguishable from
`transcribed` forever, so provenance stays honest while nothing blocks. Communication's facets
turned out to be directly transcribable (paper §3.6.1: bandwidth, latency, fidelity, cost).
Review now = reading the two data files' diffs; items 1–3 below are restated accordingly.

## What each file contains

| File | Contents | Source |
|---|---|---|
| `motifs.json` | 32 motifs: id, name, group A–F, question, definition, hub flag | paper Table 2 + §3.1–3.6 (questions/definitions verbatim or lightly condensed); hubs (boundary, representation, feedback, composition, scarcity, authority) per §4.1 |
| `composition.json` | 12 requires edges; 5 emergent composites | per-motif "Composition:" lines (§3.3.3–3.6.4) + §4.1; Table 3 / §4.2 |
| `collisions.json` | 2 collisions: halting; gödelian incompleteness | paper §4.4 |
| `obligation_rules.json` | 2 transcribed rules + 3 TODO stubs over the 5 IR event types; terminal-claim obligation classes | blueprint §3.1 + §6.3; paper §3.1.6; trap fixtures (safe defaults) |
| `diagnostics.json` | 6 semantic checks + 3 diagnostic passes | paper Table 4 + §8.4–8.5; provenance_check from specs/kernel/SPEC.md §4 |
| `facets.json` | 4 transcribed facet lists + 28 TODO stubs | blueprint §7.1 |

## Items requiring your adjudication

1. **Facets: 5 transcribed (Feedback, Reconciliation, Invariant, Authority from blueprint §7.1;
   Communication from paper §3.6.1), 27 drafted.** Each drafted entry's provenance names the paper
   section it was grounded in. Review = skim `facets.json`; rename/veto any facet list, flip
   approved entries to `transcribed` (or a future `adjudicated` status) at your discretion.
   Note: the packet said "8 motifs in §7.1" but the blueprint spells out only 4 — unresolved
   discrepancy, now moot unless you meant 4 specific additional motifs.

2. **Obligation rules: all 5 event types now mapped — 2 transcribed + 4 drafted.**
   Drafted: `external_commitment → reconciliation`, `scope_exit → inherited_invariant`,
   `irreversible_effect → evidence` AND `irreversible_effect → freshness` (two rules, per
   trap-001's expired-authority pattern). Each carries its rationale in `provenance`. All drafted
   safe defaults are `pending` (INV-7-conservative); all are mandatory+blocking. These four lines
   change gate verdicts — they are the highest-value review target in this file.

3. **Safe defaults for the two transcribed rules are sourced from trap fixtures, not the paper.**
   `authority → deny` (trap-001 expects deny on violated authority) and `evidence → pending`
   (trap-002 expects pending on budget exhaustion). The paper/blueprint state only that "allow"
   is never a safe default (INV-7). Confirm these two.

4. **The collision registry is presumptively incomplete.** Paper §4.4's table is titled
   "Collision registry *examples*" and gives exactly two. The gödelian entry carries the paper's
   "Complete Self-Reference" qualifier as data — the detector must not fire on partial
   self-reference; decide whether "complete" should become a facet/threshold instead.

5. **rulebaseHash construction.** Spec §3 says `sha256(canonicalJson(concatenated sorted files))`.
   Implemented as: canonical JSON of one object keyed by file basename (canonicalJson sorts keys,
   giving the "sorted files" order) — i.e. `sha256Hex(canonicalJson({"collisions.json": …, …}))`.
   `$comment` keys are part of the hashed content. Confirm this reading before any artifact
   records the hash durably.

6. **Table 4's "Three-valued verdicts" row** is the verdict space itself (INV-1), not a check;
   it is therefore not an entry in `diagnostics.json`. The five semantic checks + provenance_check
   (spec §4) are.

7. **Motif definitions are 1–3 sentence condensations** of each paper section's opening, with
   compiler-relevant clauses kept (Boundary's scope-delimiter role §3.1.5; Terminal State's
   obligation-discharge rule §3.1.6). Spot-check at least Boundary, Terminal State, Decay,
   Self-Reference against the paper.
