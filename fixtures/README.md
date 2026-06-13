# Fixtures — Adjudicated Ground Truth

These files are the contract. Agents NEVER edit them (CLAUDE.md §4). Agents may propose
new fixtures into `fixtures/_proposed/` with a rationale block; a human adjudicates and
moves them in. For transfer fixtures, creator adjudication means USC generated, routed,
ranked, and preserved provenance/uncertainty correctly unless a downstream domain owner
has supplied feedback. It is not an adjudication that every domain-specific failure mode
has been understood by the creator. If code cannot satisfy a fixture, the agent files
BLOCKED.md — the fixture might be wrong, but that is a human's call.

Format: one JSON file per case. Runner: `scripts/run-fixtures.ts` (packet K-06 builds it).
Each fixture declares the runner kind: kernel | store | runtime | trap | pattern | intervention.
