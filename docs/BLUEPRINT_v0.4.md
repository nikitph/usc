# Engineering Blueprint: Universal Systems Compiler
## Version 0.4 — Productized, End-to-End, No Theater

---

## 0. Why v0.4 Exists

v0.3 has the right epistemology: LLMs generate candidates, the kernel validates
structure, unknown is first-class, provenance matters, and production decisions
must not consume uncalibrated extraction as truth.

Its failure is execution detail. Beyond MVP-0 it leaves too much room for agents
to fill gaps with process-shaped scaffolding: deterministic keyword extraction,
static dashboards, in-memory stores, fixture theater, and packet completion that
does not correspond to a user receiving value.

v0.4 is a productization blueprint. It keeps the theory and deletes the illusion
that scaffolded internals are progress.

The new standard is:

> If a user cannot submit a real case, get a traceable result, understand the
> uncertainty, and provide feedback that becomes a durable artifact, the product
> loop is not done.

---

## 1. Operating Law

The USC operating law becomes:

```text
Users bring real cases.
LLMs extract candidate structure with spans.
The system stores every derivation.
The kernel evaluates structural claims without pretending uncertainty is truth.
The UI explains verdicts, gaps, and recommended next actions.
Users own downstream domain consequences.
USC owns provenance, non-overclaiming, and reproducible reasoning.
```

This is indirection, not abstraction. USC does not become a banking expert, a
distributed systems expert, or a biology expert. It compiles candidate structure
and exposes where the structure is strong, weak, missing, contradictory, stale,
or below bar.

---

## 2. Product North Star

Given a real-world system description, incident, policy, architecture, or
workflow, USC should answer:

1. What structural motifs are present, missing, or uncertain?
2. Which claims are unsafe to close?
3. What evidence supports each structural claim?
4. What gaps prevent a stronger verdict?
5. Which known structural repairs or transfer candidates may help?
6. What action artifact can the user export or hand to their own workflow?
7. What feedback did the user provide, and how is that feedback preserved?

The product is not a rulebase viewer. It is a case workbench.

---

## 3. Product Personas

### 3.1 Primary User: Case Owner

The case owner has a system, incident, policy, product, or process they want to
diagnose. They are not expected to understand the motif theory in depth.

They need:

- a place to submit a real case;
- a readable structural diagnosis;
- evidence spans tied to the original source;
- uncertainty surfaced honestly;
- recommendations they can accept, reject, export, or annotate;
- a durable history of what was concluded and why.

### 3.2 Secondary User: System Maintainer

The maintainer improves prompts, schemas, rulebases, benchmarks, and evaluation.

They need:

- extraction failure reports;
- per-motif confusion data;
- provenance and artifact DAGs;
- user feedback linked to recommendations;
- benchmark dashboards;
- safe migration tools.

### 3.3 Explicit Non-User: Domain Oracle

USC does not require the creator or maintainer to adjudicate domain-specific
truth in every target domain. End users own domain consequences. USC owns the
quality of extraction, provenance, uncertainty, and structural reasoning.

---

## 4. Anti-Theater Rules

These rules override packet convenience.

1. **No product path may use keyword extraction.**
   Keyword extraction is allowed only in tests and fixtures explicitly named
   `test_double` or `deterministic_fixture`.

2. **No static dashboard may be presented as product value.**
   Dashboards are acceptable only if backed by persisted runs, artifacts, or
   benchmark results.

3. **No in-memory store beyond tests.**
   Product and development runs use Supabase Postgres. In-memory repositories
   exist only for deterministic unit tests.

4. **No fake production mode.**
   Until extraction benchmarks meet bars, all LLM-derived outputs are research
   mode and carry experimental provenance.

5. **No hidden fallback from LLM failure to deterministic success.**
   LLM failure becomes `unknown`, `pending`, or an extraction failure artifact.

6. **No packet is done unless it advances the user loop.**
   Internal packets are allowed, but their exit criteria must name the product
   behavior they unlock.

7. **No domain-transfer adjudication burden on the creator.**
   The system may ask the creator whether a generated transfer follows USC's
   process. It must not ask them to validate domain nuances they do not own.

8. **No "green verify" as product proxy.**
   Verification proves invariants. It does not prove usefulness.

---

## 5. What Determinism Is Still For

v0.4 does not reject determinism. It rejects fake sensing.

Deterministic components are required for:

- hashing and artifact identity;
- schema validation;
- kernel evaluation;
- three-valued logic;
- provenance checks;
- parser behavior after token extraction;
- vector and graph computations over already-extracted artifacts;
- migrations and replay;
- test fixtures.

Deterministic components are forbidden as substitutes for:

- semantic motif extraction from natural language;
- terminal claim detection from ambiguous source text;
- domain transfer generation;
- evidence interpretation where source semantics matter.

The boundary is simple:

```text
Deterministic code may validate, transform, store, compare, rank, and replay.
It may not pretend to perceive meaning from real-world language.
```

---

## 6. v0.4 Architecture

### 6.1 Frontend

Stack:

- React;
- Vite;
- TypeScript strict;
- Tailwind;
- shadcn-style components;
- light mode first;
- Supabase Auth client;
- no direct service-role access from browser.

Primary screens:

1. Case Workbench
2. Extraction Trace
3. Artifact DAG
4. Verdict and Gaps
5. Recommendation Review
6. Feedback History
7. Benchmark and Calibration Admin

The first screen is the usable app, not a marketing page.

### 6.2 Backend

Stack:

- Supabase Postgres;
- Supabase Auth;
- Supabase Storage for raw uploads;
- Supabase Realtime for job status;
- Python FastAPI worker service for extraction and offline jobs;
- TypeScript API layer only where it wraps existing kernel/runtime packages;
- service-role keys only server-side.

Supabase is the durable system of record. Python workers perform LLM extraction,
benchmarking, ingestion, and long-running jobs. TypeScript kernel/runtime packages
remain deterministic libraries.

### 6.3 LLM Providers

LLMs are accessed through adapters.

Initial provider:

- DeepSeek.

Future providers:

- OpenAI;
- Anthropic;
- local/open-weight extraction models;
- ensemble mode across providers.

Every adapter declares:

- provider name;
- model;
- extractor version;
- max tokens;
- timeout;
- temperature;
- failure behavior;
- JSON/schema mode;
- raw output persistence contract.

Every LLM call stores raw output before parsing. Parse failure produces an
`extraction_failure` artifact.

### 6.4 Kernel

The kernel remains deterministic and pure:

- no I/O;
- no LLM calls;
- no Supabase imports;
- no time;
- no randomness.

The kernel evaluates facts generated by the runtime and artifact store. It does
not know about React, Supabase, Python workers, or providers.

### 6.5 Runtime

Runtime owns compilation:

```text
source/chunk
  -> raw extraction output
  -> motif tokens
  -> AST
  -> ProcessIR
  -> obligation ledger
  -> kernel facts
  -> verdict artifacts
  -> recommendations
  -> feedback events
```

Runtime code must distinguish:

- real LLM extraction;
- human annotation;
- imported benchmark labels;
- deterministic test doubles.

Those are not interchangeable.

---

## 7. Data Model

v0.4 keeps the immutable artifact discipline but adds product-facing tables.

### 7.1 Core Tables

`projects`

- `id`
- `owner_user_id`
- `name`
- `created_at`

`cases`

- `id`
- `project_id`
- `title`
- `case_type`
- `status`
- `created_by`
- `created_at`
- `latest_run_id`

`case_sources`

- `id`
- `case_id`
- `source_kind`
- `storage_path`
- `text_preview`
- `created_at`

`runs`

- `id`
- `case_id`
- `mode`
- `status`
- `requested_extractor`
- `extractor_version`
- `rulebase_hash`
- `started_at`
- `completed_at`
- `failure_kind`
- `failure_message`

`artifacts`

- immutable, content-addressed;
- stores all derived objects;
- includes `kind`, `body`, `rulebase_hash`, `extractor_version`, `tags`,
  `created_at`, `created_by`.

`artifact_parents`

- derivation DAG edges.

`run_artifacts`

- links runs to produced artifacts;
- records role: `source`, `raw_output`, `tokens`, `ast`, `ledger`, `verdict`,
  `recommendation`, `feedback`.

`feedback_events`

- product-facing view over feedback artifacts;
- links user action to recommendation/verdict.

`extraction_benchmarks`

- benchmark run metadata;
- provider/version;
- per-motif scores;
- confusion matrix summary;
- calibration status.

### 7.2 Storage Rules

- Browser uploads go to Supabase Storage.
- Text extraction creates `source` artifacts.
- Raw LLM responses are artifacts before parse.
- Parsed tokens are artifacts after schema validation.
- Failed parse or schema validation creates `extraction_failure`.
- No product decision consumes artifacts with experimental ancestry in
  production mode.

---

## 8. API Surface

### 8.1 Case APIs

`POST /v1/cases`

Creates a case and source artifact.

`GET /v1/cases/:id`

Returns case summary, latest run, and status.

`POST /v1/cases/:id/runs`

Starts an analysis run.

Request:

```json
{
  "mode": "research",
  "extractor": "deepseek",
  "caseText": "...",
  "caseType": "incident"
}
```

Response:

```json
{
  "runId": "...",
  "status": "queued"
}
```

`GET /v1/runs/:id`

Returns run status and artifact IDs.

### 8.2 Analysis APIs

`GET /v1/runs/:id/extraction`

Returns token list, spans, raw-output artifact IDs, and failures.

`GET /v1/runs/:id/verdict`

Returns verdict, gaps, obligations, and supporting artifact IDs.

`GET /v1/runs/:id/recommendations`

Returns ranked recommendations and warnings.

`POST /v1/recommendations/:id/feedback`

Creates feedback artifact.

### 8.3 Artifact APIs

`GET /v1/artifacts/:id`

Returns artifact body if user has access.

`GET /v1/artifacts/:id/dag`

Returns derivation DAG.

### 8.4 Benchmark APIs

`POST /v1/benchmarks/extraction`

Starts benchmark run for an extractor version.

`GET /v1/benchmarks/extraction/:id`

Returns per-motif metrics, confusion matrix, and production eligibility.

---

## 9. End-to-End User Flow

### 9.1 Submit Case

User opens Case Workbench, creates a project/case, pastes text or uploads a
document. The UI shows:

- source preview;
- privacy/project context;
- extractor selection;
- mode: research by default.

### 9.2 Run Extraction

Backend creates a run and queues a worker job. Worker:

1. chunks input if needed;
2. calls DeepSeek through adapter;
3. stores raw response;
4. validates JSON;
5. validates motif tokens;
6. rejects tokens without spans;
7. emits token stream or extraction failures.

UI shows:

- running status;
- provider/model;
- raw output artifact ID when available;
- failure state if extraction failed.

### 9.3 Compile

Runtime compiles token stream into AST, ProcessIR, obligations, facts, verdicts.

UI shows:

- motif table with spans;
- source text highlights;
- AST/ProcessIR summarized in human-readable form;
- verdict;
- evidence gaps.

### 9.4 Recommend

Intervention plane ranks candidate repairs using only available, provenance-safe
artifacts. In research mode it may show experimental recommendations, but they
are labeled as such.

UI shows:

- recommendation title;
- symptoms collapsed;
- supporting motifs;
- anti-pattern warnings;
- exportable implementation note/checklist;
- "accept", "reject", "needs evidence", "not relevant" actions.

### 9.5 Feedback

User feedback becomes an artifact. It does not rewrite the original verdict.

Feedback updates:

- recommendation history;
- future ranking features;
- benchmark review queue;
- transfer success statistics only if provenance rules allow.

---

## 10. Extraction Reliability Program

v0.4 changes the benchmark stance.

The gold corpus is still needed, but the product cannot wait for a perfect corpus.
Therefore:

### 10.1 Research Mode Launch

Research mode may launch with uncalibrated LLM extraction if:

- every output is marked experimental;
- UI says "research mode";
- production decisions are disabled;
- feedback is collected separately from calibrated success metrics.

### 10.2 Production Unlock

Production mode requires benchmark bars.

Initial bars:

- all six hub motifs F1 >= 0.85;
- all other motifs F1 >= 0.75;
- boundary scope classification >= 0.85;
- adjacent-pair confusion <= 10%;
- span IoU threshold met for accepted labels;
- calibration report generated for extractor version.

### 10.3 Benchmark Ownership

The system owner adjudicates extraction process quality, not every target-domain
truth. Domain users own whether a recommendation is usable in their context.

---

## 11. UI Blueprint

### 11.1 Case Workbench

Required:

- create/select project;
- create case;
- paste/upload source;
- choose extractor;
- run analysis;
- see run status.

### 11.2 Extraction Trace

Required:

- token list;
- motif;
- role;
- confidence;
- span;
- source highlight;
- raw response artifact;
- parse/schema failures.

### 11.3 Verdict and Gaps

Required:

- verdict value;
- gate status;
- mode;
- evidence gaps;
- obligations;
- supporting facts;
- "why unknown" explanation.

### 11.4 Recommendation Review

Required:

- ranked recommendations;
- warnings;
- linked graft plan;
- export artifact;
- feedback buttons.

### 11.5 Artifact DAG

Required:

- source to verdict lineage;
- parent/child links;
- experimental ancestry;
- extractor version;
- rulebase hash.

### 11.6 Admin/Eval

Required later:

- extraction benchmark results;
- confusion matrix;
- per-motif drift;
- failed extraction queue;
- prompt/version comparisons.

---

## 12. Worker Blueprint

Python workers own all non-interactive, fallible, or expensive jobs.

### 12.1 Worker Types

`extraction_worker`

- LLM calls;
- chunking;
- raw output storage;
- token validation.

`compile_worker`

- token stream to runtime artifacts;
- calls TypeScript runtime through service boundary or shared CLI;
- persists artifacts.

`benchmark_worker`

- runs extractor versions against gold corpus;
- computes metrics;
- writes benchmark artifacts.

`ingestion_worker`

- imports documents;
- creates candidate patterns;
- never auto-promotes to live KG.

`feedback_worker`

- aggregates feedback;
- prepares ranking updates;
- respects provenance.

### 12.2 Job Semantics

Every job has:

- id;
- type;
- status;
- input artifact IDs;
- output artifact IDs;
- retries;
- failure kind;
- failure message;
- timestamps.

Failures are product data.

---

## 13. Supabase Blueprint

### 13.1 Required Features

- Auth for users/projects;
- Postgres for cases, runs, jobs, artifacts;
- Storage for uploaded sources and raw large outputs;
- Realtime for run/job status;
- RLS on project membership;
- service-role access only in backend/workers.

### 13.2 RLS Principle

Users can read artifacts only through cases/runs they can access. They cannot
write artifacts directly. Workers write artifacts through service-role APIs.

### 13.3 Migration Discipline

All schema changes use migrations. The current in-memory repository may remain
for unit tests but is not a product dependency.

---

## 14. Intervention and Transfer

Transfer remains central, but v0.4 reframes ownership.

USC may say:

- "this source structure resembles this solved structure";
- "this motif gap appears analogous";
- "this graft is structurally admissible";
- "this recommendation is experimental";
- "this transfer has user feedback in similar cases."

USC must not say:

- "this is domain-safe";
- "this is legally compliant";
- "this operational action will work";
- "this transfer is true because the source domain says so."

The product must expose transfer as a candidate structural analogy with provenance,
not as domain authority.

---

## 15. Revised MVP Sequence

### MVP-A: Product Skeleton With Real Persistence

Exit:

- Supabase project schema;
- auth;
- projects/cases/runs/jobs;
- React workbench;
- create case;
- persist source;
- show run status.

No extraction yet.

### MVP-B: Real LLM Extraction Loop

Exit:

- DeepSeek adapter;
- raw output artifact;
- schema-validated motif tokens;
- extraction failure artifacts;
- source span highlights;
- no keyword fallback.

This is the first meaningful product milestone.

### MVP-C: Compile to Verdict

Exit:

- tokens compile to AST/ProcessIR/ledger/verdict;
- artifacts persisted in DAG;
- UI shows verdict, obligations, gaps, and lineage;
- all runs research mode unless benchmark says otherwise.

### MVP-D: Recommendation Review

Exit:

- recommendation artifacts generated from verdict/gaps;
- UI review panel;
- feedback artifacts;
- exportable engineering/compliance notes;
- no domain overclaiming.

### MVP-E: Benchmark and Calibration

Exit:

- extraction gold corpus workflow;
- benchmark worker;
- per-motif metrics;
- confusion matrix;
- extractor version production eligibility.

### MVP-F: Pattern Plane

Exit:

- candidate pattern ingestion;
- dedup;
- review queue;
- transfer candidates;
- no auto-promotion from generated artifacts.

### MVP-G: Production Mode

Exit:

- production eligibility enforced by provenance;
- calibrated extractor version;
- production decisions reject experimental ancestry;
- admin can see why a run is research or production.

---

## 16. Migration From Current Repo

### 16.1 Keep

- generated schema discipline;
- kernel three-valued logic;
- content-addressed artifact IDs;
- fixture runner as invariant guard;
- Python worker project;
- React/Tailwind direction;
- Supabase migrations as starting point;
- DeepSeek adapter seam.

### 16.2 Quarantine

- keyword extractor;
- terminal keyword detector;
- static dashboard data;
- in-memory repository outside tests;
- golden intervention flows that depend on toy extraction;
- proposed fixtures that encode scaffold assumptions.

### 16.3 Rewrite

- runtime extraction product path;
- gate service as real API over persisted runs;
- UI around cases/runs/artifacts instead of fixture dashboards;
- worker orchestration;
- benchmark program;
- pattern plane after real extraction exists.

### 16.4 Delete Later

After the new product loop is stable:

- old dashboard code;
- scaffold packets whose exit criteria are not product-facing;
- keyword-test-double imports from non-test code.

---

## 17. Development Process

Packets are allowed but demoted.

A packet is not an authority. The blueprint, product loop, schemas, and invariants
are authority. A packet is merely a task slice.

Each task slice must include:

- product behavior unlocked;
- user-visible screen/API/job affected;
- artifacts produced;
- invariants protected;
- what is explicitly not real yet.

No task slice may claim completion solely because tests pass.

---

## 18. v0.4 Definition of Done

The v0.4 product foundation is done when:

1. A user can sign in.
2. A user can create a project and case.
3. A user can submit real text.
4. DeepSeek extraction runs through a worker.
5. Raw LLM output is stored.
6. Motif tokens are schema-validated and span-grounded.
7. Extraction failures are visible.
8. Runtime compiles successful tokens into artifacts.
9. Kernel verdicts are shown with gaps.
10. Recommendations are shown as candidates, not truths.
11. User feedback is stored as artifacts.
12. Artifact DAG is inspectable.
13. Research/production mode is enforced by provenance.
14. No product path uses keyword extraction.

---

## 19. The One-Sentence Check

If someone asks "what does USC do today?", the answer after v0.4 should be:

> USC lets a user submit a real case, extracts candidate structural motifs with
> span-grounded LLM evidence, compiles them into traceable verdicts and gaps,
> proposes experimental repairs, and preserves user feedback in an immutable
> artifact graph.

Anything that does not contribute to that sentence is secondary.
