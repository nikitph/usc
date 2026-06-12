# ADR-0001: Bilingual stack on Supabase
**Decision:** TypeScript (pnpm monorepo: packages/kernel|store|runtime|shared, apps/web|gate
on Vite/shadcn/Vercel + Supabase edge or small Node service for the gate) for the online
plane; Python (uv) workers for the offline plane (extraction, calibration, WL hashing,
benchmarks). Postgres/Supabase is the artifact store, rulebase store, pgvector index, and
hosts recursive-CTE implementations of provenance/scope queries.
**Rejected:** Rust (premature — latency dominated by IO/LLM; agent velocity cost), pure
Python (loses shared Zod schemas with frontend), standalone Datalog engine for MVP
(recursive CTEs + the TS reference evaluator suffice; revisit at pattern-mining scale).
**Consequence:** kernel semantics exist twice (TS reference + SQL); fixtures pin their agreement.
