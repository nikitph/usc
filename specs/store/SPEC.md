# SPEC — packages/store (Artifact Store)

Blueprint §4. Owner invariants: INV-3, INV-4. DB: Supabase Postgres.

## Tables (migrations in packages/store/migrations/, up+down each)
- `artifacts(id text pk, kind text not null check (kind in (...per schema)), body jsonb not null,
   rulebase_hash text not null, extractor_version text, tags text[] not null default '{}',
   created_at timestamptz not null default now(), created_by text not null)`
  Trigger `forbid_artifact_update`: raises on UPDATE of any column except `tags`.
  No DELETE grant to any role (supersession = tag `superseded`; hard delete never).
- `artifact_parents(child text references artifacts, parent text references artifacts,
   primary key(child, parent))`
- `motif_vectors(artifact_id text pk references artifacts, flat vector(32), facets jsonb)` — pgvector
- `rulebase_versions(hash text pk, released_at timestamptz, rules jsonb, diff_from_previous jsonb)`
- `artifact_tag_events(id bigserial pk, artifact_id text, tag text, op text, actor text, at timestamptz)`

## Repository API (packages/store public exports — all access via these, INV per CLAUDE.md §7)
- `putArtifact(envelope)` — verifies id == recomputed hash (shared hashing), validates
  envelope against artifact.schema AND body against the kind's schema, inserts
  artifact+parents in one transaction. If id already present: return existing row
  silently — content-addressed dedup IS the LLM cache.
- `getArtifact(id)`, `getDerivationDag(id)` (recursive CTE), `findByKind(kind, page)`,
  `nearestVectors(flat, k)` (pgvector cosine).
- `tagArtifact(id, tag, actor)` / `untagArtifact(...)` — the only mutation; every call
  appends to artifact_tag_events.
- `hasExperimentalAncestor(id): Promise<boolean>` — recursive CTE over parents. MUST agree
  with kernel `provenance_check` on the shared fixtures (same inputs, same answer).

## Roles
`usc_writer` (workers, gate API), `usc_reader` (web, analytics). Created in migration 0001.
Least privilege: reader has no INSERT anywhere; neither role has UPDATE on artifacts
beyond tags or DELETE anywhere.

## Fixtures (fixtures/store/)
dedup-on-identical-content, update-rejection (expects DB error surfaced as typed
`ImmutabilityViolationError`), dag-reconstruction, experimental-ancestor-detection
(mirror of kernel fixture kernel-008, identical expected output).
