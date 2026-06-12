# USC — Universal Systems Compiler

Implementation of docs/BLUEPRINT.md (v0.3). Read order for any agent or human:
1. CLAUDE.md (binding) → 2. your packet in packets/ → 3. the spec sections it lists.

## Handover state
- Specs: kernel/store/runtime full; patterns/intervention reserved stubs (do not build).
- Fixtures: seed kernel + trap cases committed; extraction corpus awaits human gold labels.
- Verify gate: Makefile + CI wired; runner/codegen are HONEST-FAILING placeholders that
  packets K-01/K-02/K-06 replace — `make verify` is intentionally red on day zero and
  goes green only by building the real thing, never by weakening the gate.
- Packets: MVP-0 fully decomposed in packets/mvp0 (order in its README).

## Day-one human checklist (before first agent session)
1. `git init && git add -A && git commit -m "chore: USC starting kit"` ; push; protect main.
2. Create Supabase project; set SUPABASE_URL/keys in Vercel + GH secrets (never in repo).
3. Read packets/mvp0/K-03 — block out an hour to adjudicate the rulebase when it lands.
4. Start drafting extraction gold cases (fixtures/extraction/README.md — Tier-4 work only you can do).
5. Hand agent packet K-01 with: "Read CLAUDE.md, then packets/mvp0/K-01. Execute exactly that."
