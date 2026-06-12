# ADR-0002: JSON Schema as single source of truth
schemas/*.schema.json → codegen → Zod (TS) + Pydantic (Python). Generated code is
read-only, CI-checked for drift and hand-edits. Schema changes are protected-path events.
**Rejected:** Zod-first (Python becomes second-class), protobuf (poor JSONB ergonomics).
