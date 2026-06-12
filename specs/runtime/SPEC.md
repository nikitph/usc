# SPEC — packages/runtime + apps/gate (DLR Runtime + Action Gate)

Blueprint §5, §6, §9.3. Owner invariants: INV-5, INV-7, INV-8.

## Components
1. **Lexer** (`runtime/core/lexer`): orchestrates Tier-1 LLM extraction via the LLM
   adapter [VARIATION-POINT: extraction backend]. Ensemble path: k samples; cluster
   tokens by (motif, overlapping span); majority-kept, minority demoted to
   role=candidate with discounted confidence. Raw LLM output stored as a `source`-parented
   artifact BEFORE parsing (CLAUDE.md §6). Output: `token_stream` artifact. Every token
   validates against motif_token.schema — rejects are `extraction_failure` artifacts.
2. **Parser** (`runtime/core/parser`): deterministic Boundary-scope nesting per blueprint;
   tokens with boundaryRole=concept_reference NEVER open scopes. Output: `ast` artifact.
3. **Terminal-claim surface detector** [VARIATION-POINT: extraction backend]: Tier-1,
   recall-tuned (target ≥0.95 recall on extraction benchmark); emits candidate claims
   with spans. Precision is allowed to be mediocre — the IR stage filters.
4. **ProcessIR-lite builder**: maps detected events to the CLOSED event-type union:
   privileged_transition | state_destruction | external_commitment | scope_exit |
   irreversible_effect | observation. Exhaustive switch; unknown event text maps to
   observation (which opens no obligations) — it does NOT invent new types.
5. **Obligation ledger**: materializes obligations from kernel obligation_rules fired on
   IR events ONLY (blueprint §6.3 — surface keywords never open/close obligations).
   Evidence resolution per rule; budget exhaustion → status unknown, gap budget_exhausted.
6. **Gate API** (`apps/gate`, thin presentation): POST /v1/action-gate, idempotent by
   (agentId, sha256(canonicalJson(action))) — replay returns the SAME verdict artifact.
   Pipeline: lex → parse → IR → ledger → kernel.evaluate → respond.
   p95 budget 800ms with warm evidence. On ANY timeout, LLM failure, or internal error:
   verdict = pending + named gaps (INV-7) — there is no code path that returns allow
   from an error handler. Response embeds verdict artifact id and mode
   (research|production, resolved via kernel provenance_check on the extractor version's
   benchmark status). Structured log per verdict with correlationId and full Verdict3.

## Evidence Fixpoint Engine
MVP 2 — NOT in scope for MVP 0/1 packets. Do not stub its interfaces preemptively (YAGNI).

## Fixtures (fixtures/runtime/ + fixtures/trap_set/)
Parser scope-nesting (incl. boundary-as-concept negative case), ensemble vote resolution,
IR event-type mapping, gate end-to-end against trap_set. Headline gate metric:
overconfident closure = 0 on trap fixtures (a trap fixture passing means the gate said
pending/invalid/unknown where surface language said success).
