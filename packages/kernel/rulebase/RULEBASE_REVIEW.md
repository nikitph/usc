# RULEBASE_REVIEW — Rulebase v0 transcription summary (packet K-03)

**Status: NOT TRUSTED until a human pair-reviews this transcription** (packet K-03 header).
Sources: `docs/endtoendmotifsystemv2.pdf` ("the paper"), `docs/BLUEPRINT.md`, `specs/kernel/SPEC.md`,
and (for two safe defaults) the adjudicated trap fixtures. Every entry in every file carries its own
`provenance` field; this document summarizes what was transcribed, from where, and every judgment
call that needs your adjudication.

Verified mechanically: `loadRulebase()` validates all six files (motif names against the generated
schema enum, obligation types/safe-defaults against the generated obligation schema, requires-DAG
acyclicity, 6 hubs, full 32-motif coverage) and hashes deterministically.
`rulebaseHash` at transcription time: `0f84c055bab28896d9bb1ced282f96462487c2d3324227af46d2fc3fe3a6d3e0`.

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

1. **Facets: packet says "8 motifs in blueprint §7.1", blueprint spells out 4.**
   §7.1 lists facets only for Feedback, Reconciliation, Invariant, Authority, then an ellipsis
   ("full facet table maintained in the rulebase"). I transcribed those 4 and stubbed the other 28
   as `todo_human_adjudication` rather than invent facet names. If 4 more were intended, name them.

2. **Obligation rules: only 2 of 5 event types have sourced mappings.**
   Sourced: `privileged_transition → authority` (blueprint §3.1 example rule) and
   `state_destruction → evidence` (blueprint §6.3; trap-002 adjudication). The paper never maps
   `external_commitment`, `scope_exit`, or `irreversible_effect` to obligation types.
   *Unsourced candidates for your consideration (deliberately NOT encoded in the data):*
   external_commitment → reconciliation; scope_exit → inherited_invariant;
   irreversible_effect → evidence + freshness. Accept, amend, or leave TODO.

3. **Safe defaults are sourced from trap fixtures, not the paper.**
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
