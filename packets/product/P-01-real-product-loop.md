# Packet P-01: Real product loop foundation
**Subsystem:** product UI, API boundary, store adapter, offline extraction worker
**Depends on:** MVP-0 through MVP-4 completed implementation
**Spec:** specs/runtime/SPEC.md Components 1-6; specs/store/SPEC.md Repository API
**Blueprint:** docs/BLUEPRINT.md §5, §6.3, §9.3

**Problem:** MVP-0 through MVP-4 prove kernel/runtime/intervention mechanics, but the user-facing app is only a static dashboard and the only implemented extractor is a deterministic test double. That is not a real product surface.

**Plan before coding:**
1. Keep deterministic keyword extraction as test-only scaffold, not the product default.
2. Convert `apps/web` to a light-mode React/Vite/Tailwind workbench with shadcn-style primitives.
3. Make the UI submit real case-analysis requests and clearly surface unconfigured backend state.
4. Add a Supabase repository adapter without replacing the in-memory test repository.
5. Add a Python extraction worker seam with a DeepSeek adapter and typed failure modes.
6. Preserve research-mode semantics: LLM-derived extraction remains experimental until calibration bars exist.
7. Do not touch protected fixtures/schemas/rulebase for this packet.

**Deliverables:** React case workbench, product-analysis UI state helpers, Supabase store adapter, Python LLM adapter skeleton with DeepSeek implementation.

**Exit:** `make verify` green; app dev server renders the product workbench; no silent keyword fallback in the product UI.

**Protected paths touched:** none.
