# Engineering Blueprint: Universal Systems Compiler + DLR Stack
## Version 0.3 — Theory-Faithful, Eval-First, Wedge-First

---

## 0. What Changed From v0.2 and Why

v0.2 is a solid module catalog, but it has four structural weaknesses when measured against the paper it implements:

**W1 — The theory is under-exploited.** The paper's strongest deterministic assets — Coordinate Space Theory (innovation gradient, viability manifold, phase transitions, empty-cell search) and valence-as-type-system — appear in v0.2 only as scoring weights and prose. They should be Tier-0 computable features of the kernel, because they are the cheapest differentiation the system has: pure graph algorithms, no LLM, no data dependency.

**W2 — The epistemic foundation is unguarded.** Everything downstream of the lexer inherits its errors. v0.2 has fidelity calibration for *patterns* but no reliability program for *motif extraction itself* — no gold corpus, no per-motif precision/recall, no confusion analysis between adjacent motifs (Synchronization vs Reconciliation, Invariant vs Boundary, Hierarchy vs Authority). If the lexer is 70% reliable, the Pattern KG is a 70%-reliable institution compounding its own noise.

**W3 — Unknown is local, not pervasive.** v0.2 confines three-valued logic to DLR-O. The paper says unknown is first-class. In v0.3 every kernel predicate — composition completeness, invariant propagation, FEP viability, collision, terminal validity — evaluates in Kleene three-valued logic with provenance. One propagation semantics, defined once, used everywhere.

**W4 — The build order fights the product wedge.** v0.2 builds the seed pattern library (MVP 1) before the action gate (MVP 2), but the agent-safety wedge needs *zero patterns* — it needs Kernel + DLR-lite + DLR-O. The pattern KG is the long-term moat; the gate is the revenue and feedback source that funds the moat. v0.3 builds one vertical slice first and lets production traffic seed the flywheel.

Other deltas, summarized:

| # | v0.2 | v0.3 |
|---|---|---|
| D1 | Kernel = registry + validators in code | Kernel = formal rule language (Datalog-style), rules are versioned data, property-tested |
| D2 | Many overlapping artifact schemas | One content-addressed, event-sourced Artifact Store; every artifact immutable + kernel-versioned |
| D3 | DLR-λ and DLR-λ2 as separate modules | One Evidence Fixpoint Engine (incremental computation with retraction; λ2 = retraction propagation) |
| D4 | 32-dim dense motif vector | Richness-faceted vectors (32×k) + motif-typed graph embeddings; hybrid retrieval |
| D5 | Obligation triggers = keyword list | Two-stage: high-recall surface detector → kernel confirmation over ProcessIR event types |
| D6 | Transfer = ranking formula | Transfer = valence **unification** (typed gate) + ranking (preference); explicit graft bindings |
| D7 | Patterns only | Patterns + first-class **anti-patterns** (known failures) + richness ladders with promotion procedure |
| D8 | 50 generic seed patterns | Two **dense twin domains** seeded deep (distributed systems ↔ cooperative-bank compliance), generic breadth deferred |
| D9 | Evaluation framework as a late section | Eval-first development: benchmarks exist before the components they measure |
| D10 | — | Geometry Engine module (innovation gradient, viability check, trajectory, empty-cell) |
| D11 | — | Self-application: the system compiles its own architecture every release |
| D12 | — | Project risk register with structural mitigations |

The v0.2 invariants, feedback flywheel, fidelity calibration, kernel versioning, cost tiers, and budget-aware unknown are all **retained** — they were right.

---

## 1. System Goals (unchanged, sharpened)

**Product goal:** given any system description, answer — what structural problem is this, which motifs are missing or impoverished, which terminal claims are unsafe, where has this region of motif space been solved densely, and what is the validated graft plan?

**Research goal:** operationalize the thesis that knowledge is organized by substrate but its deepest solutions are structural — and *measure* it, via empirical transfer success rate.

**Engineering goal:** one deterministic kernel, one immutable artifact store, one fixpoint engine, one LLM discovery layer — composed into an offline knowledge plane and an online diagnosis plane.

**The operating law (unchanged):**

```
LLM generates candidates.
Kernel validates structure.
DLR-O decides closure.
Pattern KG supplies transfer.
Feedback makes the system learn.
Unknown is never coerced into success.
```

---

## 2. Architecture: Five Subsystems, Two Planes

v0.2's fifteen modules collapse into five subsystems with crisp ownership. Every module in v0.2 maps into exactly one of these.

```
┌─────────────────────────────────────────────────────────────┐
│  S1  ATLAS KERNEL          deterministic structural physics │
│      registry · grammar · valence · collisions ·            │
│      obligations · three-valued evaluator · GEOMETRY ENGINE │
├─────────────────────────────────────────────────────────────┤
│  S2  ARTIFACT STORE        content-addressed, event-sourced │
│      tokens · ASTs · vectors · ProcessIR · ledgers ·        │
│      verdicts · patterns · feedback events                  │
├─────────────────────────────────────────────────────────────┤
│  S3  DLR RUNTIME           compilation + evidence fixpoint  │
│      lexer · parser · semantic analysis · Evidence Fixpoint │
│      Engine (λ+λ2 unified) · DLR-O obligation ledger        │
├─────────────────────────────────────────────────────────────┤
│  S4  PATTERN PLANE         knowledge construction           │
│      ingestion · extraction · fidelity calibration ·        │
│      dedup · KG · anti-patterns · richness ladders          │
├─────────────────────────────────────────────────────────────┤
│  S5  INTERVENTION PLANE    diagnosis → action               │
│      diagnostics · transfer/unification · AST modification ·│
│      recommendation · codegen · action gate · feedback      │
└─────────────────────────────────────────────────────────────┘
```

The compiler analogy upgrades accordingly:

```
S1 Kernel          = language spec + type checker (the spec is data, not code)
S2 Artifact Store  = build cache + object files + debug symbols
S3 DLR Runtime     = parser, linker, incremental recompiler, runtime type-checker
S4 Pattern Plane   = standard library + package registry with provenance
S5 Intervention    = optimizer + codegen + production telemetry
```

---

## 3. S1 — Atlas Kernel as a Formal Rule System

### 3.1 The core upgrade: rules are data in a rule language

In v0.2 the kernel's rules live in TypeScript functions. That makes them unauditable, undiffable, and hard to version. In v0.3 the kernel is an **interpreter for a small declarative rule language** — Datalog-flavored, with stratified negation and three-valued evaluation. The 32 motifs, the composition graph, valence rules, collision registry, obligation rules, and diagnostic rules are all *facts and rules* in this language. The interpreter is ~2–3k lines, property-tested, and never changes per-release; the *rulebase* is what versions.

```prolog
% Composition grammar as facts
requires(prediction, representation).
requires(prediction, feedback).
requires(reconciliation, communication).
requires(reconciliation, invariant).
requires(reconciliation, authority).

% Valence check as a rule (3-valued: holds / fails / unknown)
dangling_valence(Node, Motif, Prereq) :-
    claims(Node, Motif),
    requires(Motif, Prereq),
    not provided_in_scope_chain(Node, Prereq).

% Collision registry
collision(halting, [prediction, self_reference, terminal_state]).

% Obligation rule over ProcessIR event types (not keywords — see §6.3)
opens_obligation(Event, authority_obligation) :-
    event_type(Event, privileged_transition),
    not authority_evidence(Event).
```

Why this matters:

1. **Auditability.** A regulator, a reviewer, or Amul-in-six-months can read the rulebase as a document. Kernel diffs between versions are semantic diffs of rules, not code diffs.
2. **Versioning becomes trivial.** `motifRegistryHash`, `compositionGraphHash` etc. from v0.2 become one `rulebaseHash`. Migration analysis = rule diff → affected-artifact query.
3. **Checks are queries.** Composition completeness, invariant propagation, FEP viability, collision detection, terminal validity — all five semantic checks from the paper become Datalog queries over the AST-as-facts. Adding a sixth check is adding rules, not shipping code.
4. **Property-based testing.** The interpreter is tested with generated rulebases and generated ASTs: monotonicity of unknown propagation, confluence of fixpoint evaluation, "no verdict flips from invalid→valid when evidence is removed."

Implementation note: do not build a Datalog engine from scratch. Use Soufflé, Datalog-in-SQLite (recursive CTEs are sufficient at MVP scale), or an embedded engine (Crepe/ascent in Rust, pyDatalog at prototype stage). The AST is small; performance is a non-issue until pattern-mining scale.

### 3.2 Three-valued logic, defined once

Every kernel predicate evaluates to **valid | invalid | unknown** with Kleene semantics:

```
AND:  valid∧valid=valid;  invalid∧x=invalid;  valid∧unknown=unknown
OR :  invalid∨invalid=invalid;  valid∨x=valid;  invalid∨unknown=unknown
NOT:  ¬valid=invalid;  ¬invalid=valid;  ¬unknown=unknown
```

Every `unknown` carries provenance: *which* evidence was unavailable, stale, or contradictory, and what budget decision produced it. This is the single most important data structure in the system, because the product promise is "we tell you exactly why we cannot close."

```typescript
type Verdict3 = {
  value: "valid" | "invalid" | "unknown";
  rule: RuleId;                    // which kernel rule produced this
  bindings: Record<string, string>;
  evidence: EvidenceRef[];         // what supported it
  gaps?: EvidenceGap[];            // for unknown: what was missing/stale/over-budget
  kernelVersion: string;
};
```

The v0.2 `terminalValidity()` function is now just one query among many, and DLR-O's "safe non-closure" is no longer a special module behavior — it is the kernel's logic applied at terminal claims.

### 3.3 The Geometry Engine (new module, pure Tier-0)

The paper's Coordinate Space Theory is directly computable from the rulebase plus a motif vector. None of this needs an LLM, and all of it is product surface:

**Innovation gradient.** For system vector *v*, for each absent or weak motif *m*: count composites in the composition DAG whose prerequisite sets become satisfied (or newly reachable) if *m* is added. Rank. Output: "the highest-leverage missing motif is X; adding it unlocks composites {…}." This is a graph reachability computation, milliseconds.

**Viability check.** FEP minimum set {State, Boundary, Transition, Feedback} per autonomous node — already a kernel query; surface it as a named verdict.

**Phase-transition detection.** Flag zero→nonzero crossings on the six hub motifs (Representation, Scarcity, Boundary, Authority, Feedback, Composition) between two compiled versions of the same system. This is the changelog feature: "between v1 and v2 of your architecture, you crossed a Feedback phase boundary."

**Empty-cell search.** Given the corpus of compiled systems, compute occupied cells (quantized motif signatures) per domain; report regions dense in domain A and vacant in domain B. This is the "Mendeleev query" and it is a `GROUP BY` over the Artifact Store once vectors exist.

**Trajectory.** Time-ordered vectors for one system or one domain; current direction = predicted next motif acquisition. Cheap, demo-friendly, and a genuinely novel analytic.

### 3.4 Kernel evolution (retained from v0.2, simplified)

Everything in v0.2's versioning section stands, with one simplification: because artifacts are content-addressed (§4) and every artifact records `rulebaseHash`, staleness detection is a join, and migration is "recompile artifacts whose rule-dependency set intersects the rule diff." The kernel ships with a `rule_dependency(check, rule)` index to make that intersection precise — you only recompile what a rule change can actually affect.

**Invariant (unchanged):** never silently reinterpret old patterns under a new kernel.

---

## 4. S2 — Artifact Store: One Immutable Substrate

v0.2 scatters `CompiledArtifact`, `StructuralPattern`, `ProcessIR`, ledgers, and feedback across module-local schemas. v0.3 unifies storage under one discipline:

**Every artifact is an immutable, content-addressed node.** `artifactId = hash(kind, body, rulebaseHash, parentIds)`. Kinds: `source`, `chunk`, `token_stream`, `ast`, `motif_vector`, `process_ir`, `obligation_ledger`, `verdict`, `pattern`, `anti_pattern`, `graft_plan`, `recommendation`, `feedback_event`, `transfer_evaluation`.

**Every artifact records its parents.** The full derivation DAG — source → tokens → AST → vector → diagnosis → recommendation → feedback — is reconstructible for any output. This *is* the v0.2 audit log, but structural rather than bolted on: the audit trail is the data model.

**Mutation is appending.** Revision (λ2), kernel migration, pattern lifecycle transitions, and feedback all append new artifacts pointing at old ones. Nothing is overwritten; "current" is a view.

What this buys, concretely:

1. **Caching for free.** Same chunk + same rulebase + same extractor version = same hash = skip the LLM call. v0.2's cost-control caching section becomes a one-line consequence.
2. **Migration for free.** Stale = `rulebaseHash ≠ current ∧ rule-diff intersects dependencies`. Old verdicts preserved by construction.
3. **Reproducibility.** Any verdict can be re-derived: inputs are immutable, kernel is deterministic, LLM steps store their raw outputs as artifacts.
4. **The system instantiates its own atlas.** Storage + Identity + Invariant (immutability) + Feedback (event log) — the architecture passes its own viability check (§12).

**Physical layout (MVP):** Postgres. `artifacts(id, kind, body JSONB, rulebase_hash, created_at)`, `artifact_parents(child, parent)`, `pgvector` columns on vector-kind artifacts, object storage for raw sources. Graph DB deferred exactly as v0.2 says — but the trigger condition is now explicit: *adopt a graph DB when pattern-subgraph isomorphism queries exceed what recursive CTEs handle in <1s at p95.*

---

## 5. The Extraction Reliability Program (new, and prerequisite to everything)

This is the most important addition in v0.3. The lexer is the system's sensory organ; an uncalibrated lexer makes every downstream guarantee vacuous.

### 5.1 The Motif Extraction Benchmark (build first)

Before building the production lexer, build:

- **Gold corpus:** 200–300 passages across ≥6 domains (distributed systems docs, RBI/NABARD circulars, incident postmortems, biology mechanism descriptions, governance case studies, agent traces), each hand-labeled with motif tokens + spans + scope structure. Two annotators minimum, adjudicated; report inter-annotator agreement (Cohen's κ per motif). If humans can't agree on a motif's presence, the motif's *definition* needs sharpening before any LLM is prompted with it — this feeds back into the Atlas itself.
- **Per-motif precision/recall**, not aggregate. Aggregate hides the failure mode that matters: a lexer can be 90% overall while being 40% on Reconciliation.
- **Confusion matrix** over the known-adjacent pairs: Synchronization↔Reconciliation, Invariant↔Boundary, Hierarchy↔Authority, Representation↔Model, Replication↔Storage, Composition↔Modularity. These pairs get dedicated disambiguation guidance in the lexer prompt and dedicated test slices.
- **Scope benchmark:** separately measure Boundary-as-scope-delimiter vs Boundary-as-concept classification (the paper flags this as the critical lexer operation; it deserves its own metric).

### 5.2 Extraction architecture

- **Ensemble lexing for high-stakes paths:** k=3 samples (or 2 models), token kept if majority-agreed; disagreement → token emitted with `role: "candidate"`, confidence discounted. Production gate paths and pattern-mining paths use the ensemble; cheap exploratory paths use single-shot.
- **Span grounding is mandatory:** every token cites a source span; tokens without spans are rejected at schema validation. (v0.2 had the field; v0.3 makes it a hard gate.)
- **Confusion-aware prompting:** the lexer prompt embeds the disambiguation table for adjacent pairs, with one positive and one negative example each, drawn from the gold corpus's adjudication notes.
- **Calibration:** extraction confidence must be calibrated (reliability diagram against gold labels) before any confidence-weighted downstream use. Until calibrated, confidence is treated as ordinal only.

### 5.3 Acceptance bars: two-mode regime

Bars: per-motif F1 ≥ 0.75 on all 32, ≥ 0.85 on the six hubs, scope-classification accuracy ≥ 0.85, confusion-pair error ≤ 10%. These numbers are initial guesses, revised after the first benchmark run — but the *existence* of a bar is non-negotiable.

The bars gate **modes**, not development:

- **Research mode (bars not required):** extraction runs freely; every downstream artifact derived from below-bar extraction is tagged `experimental` (with the specific failing motifs/metrics in the tag), surfaced with warnings in any UI, and excluded from pattern-KG insertion, fidelity calibration data, transfer scoring, and feedback statistics. Experimental artifacts live in the same Artifact Store — the tag is metadata, so a run can be re-classified retroactively if a later benchmark shows the extractor version actually met bar.
- **Production mode (bars enforced):** any **production decision** — an action-gate verdict, a shipped recommendation, a pattern inserted into the KG, an empirical transfer-score update — may only consume extraction output from an extractor version whose benchmark run met the bars. The kernel enforces this as a provenance check: production-decision artifacts whose derivation DAG contains an `experimental` extraction are rejected at validation, not by convention.

This keeps early development unblocked while making the safety property structural: the gap between "we can run it" and "we can act on it" is a query over artifact provenance, not team discipline.

---

## 6. S3 — DLR Runtime

### 6.1 Lexer and parser (as v0.2, with §5 discipline)

Token and AST schemas carry over from v0.2 unchanged, plus span-grounding as a hard gate and `Verdict3` provenance on every semantic annotation.

### 6.2 The Evidence Fixpoint Engine (DLR-λ and DLR-λ2 unified)

v0.2 treats distributed recovery (λ) and revision (λ2) as separate engines. They are one engine: **incremental fixpoint computation with retraction**, the classic truth-maintenance / differential-dataflow pattern.

- Facts arrive with timestamps and validity windows (`assert(fact, t, ttl)`).
- Derived facts record their support set (which base facts they depend on).
- Late or contradicting evidence = **retraction**: remove or supersede a base fact, propagate through support sets, re-derive. Expired authority, stale cache, invalidated exemption, changed policy — all are retractions, not a special module.
- The worklist algorithm, joins, and fixpoint termination rules from v0.2 carry over verbatim; "λ2" is simply running the same worklist when the input set changes.

```typescript
type Fact = {
  id: string;
  body: unknown;
  assertedAt: string;
  validUntil?: string;        // decay as TTL
  supports: string[];         // derivation support set (empty = base fact)
  status: "active" | "retracted" | "superseded";
};
```

This halves the engineering surface, and it makes the `StructuralHypothesis` revision history from v0.2 a *view over the retraction log* rather than a hand-maintained structure.

**Termination rule (unchanged from v0.2):** terminate only when worklist is empty, or budget is exhausted with unresolved items explicitly marked unknown. Never silently drop.

### 6.3 DLR-O: obligation triggers over IR, not keywords

v0.2 triggers obligations on a keyword list ("done, approved, deployed…"). Keywords are the right *recall* layer but the wrong *semantics* layer. v0.3 uses two stages:

1. **Surface detector (Tier-1 LLM, high recall):** flags candidate terminal claims and candidate privileged transitions in text/traces. Tuned for recall ≥ 0.95; precision is allowed to be mediocre.
2. **Kernel confirmation (Tier-0):** obligation rules are written over **ProcessIR event types** — `privileged_transition`, `state_destruction`, `external_commitment`, `scope_exit`, `irreversible_effect` — and fire only when the parsed IR confirms the event class. A keyword "deleted" in a comment opens nothing; a `state_destruction` event in the causal graph opens an evidence obligation regardless of what word triggered detection.

The obligation schema, safe defaults, terminal-validity rule, and budget-aware-unknown from v0.2 carry over unchanged — they were correct. The only change is *where* the trigger semantics live.

### 6.4 Runtime routing (simplified)

```
any input              → lex → parse → semantic queries (always)
evidence is distributed → Evidence Fixpoint Engine
terminal claims in IR   → obligation ledger + terminal-validity query
transfer requested      → Pattern Plane search (§8)
implementation requested→ Intervention Plane (§9)
```

One router, four optional escalations. The v0.2 spectrum table collapses because λ/λ2 are one engine and DLR-O is a kernel query.

---

## 7. Representation Upgrade: Vectors That Preserve Richness

The paper's deepest diagnostic concept is **architectural impoverishment** — Feedback present but as a bare scalar vs Feedback with redundancy, aggregation, validation, constraints. A flat 32-dim vector with a 0–1 richness scalar per motif cannot express *why* an implementation is impoverished, and therefore cannot search for the *specific kind* of richness that is missing.

### 7.1 Richness facets

Each motif gets 3–5 named facets, derived from the paper's own richness discussions, stored in the kernel rulebase like everything else:

```
Feedback:        source_redundancy · aggregation · validation_pipeline · constraint_bounds · latency
Reconciliation:  divergence_detection · resolution_authority · automation_degree · audit_trail
Invariant:       enforcement_mechanism · coverage · violation_detection · constitutionalization
Authority:       legitimacy_source · revocability · scope_precision · accountability_loop
... (full facet table maintained in the rulebase, versioned with it)
```

The working representation is a **32×k faceted matrix**; the flat 32-dim vector is its row-max projection, kept for cheap prefiltering. Impoverishment diagnosis becomes facet subtraction: "your Feedback has aggregation but no validation pipeline; here are domains dense in Feedback.validation."

### 7.2 Hybrid retrieval

Three stages, matching the paper's three representations exactly:

1. **Vector prefilter** (pgvector, flat 32-dim or flattened facet matrix): cheap candidate generation across millions of systems.
2. **Pattern-graph rerank:** candidates re-scored by motif-typed subgraph compatibility. Patterns get a **canonical form** via Weisfeiler-Leman hashing over motif-typed nodes — this same canonical form drives deduplication in the Pattern Plane (two extractions of two-phase commit from different papers hash identically or near-identically).
3. **Valence unification gate** (§9.1): hard typed check before anything is recommended.

The v0.2 ranking formula survives as stage-2 preference ordering, with one change: `transferRisk` is replaced by the empirical `transferScore` once feedback data exists (the formula's hand-set weight is the cold-start prior, explicitly labeled as such and scheduled for replacement).

---

## 8. S4 — Pattern Plane

Retained from v0.2: ingestion pipeline, fidelity calibration with gold/rejected/ambiguous sets, insertion policy bands, auto-insert disabled until calibrated, human review loop, lifecycle states, operational stats, transfer evaluation. All of that was right. Three additions:

### 8.1 Anti-patterns are first-class

The Pattern KG stores **known failures** with the same schema rigor as successes: motif signature of the failure, the missing/impoverished motif that caused it, evidence (postmortems are the richest source — they are natural anti-pattern documents). Diagnostic power doubles: "your signature is 0.91-similar to the Knight Capital deployment anti-pattern (Replication without Synchronization-of-configuration; missing Terminal-State validity on deployment)" is a stronger product moment than any positive recommendation. Anti-patterns also serve as the negative class for fidelity calibration and as collision-adjacent warnings during graft planning.

### 8.2 Richness ladders get a procedure

v0.2 has `RICHER_THAN` edges with no construction method. v0.3: when dedup clustering (WL canonical form, §7.2) groups multiple instantiations of the same structural template, order them by facet coverage (§7.1). The ladder is computed, not asserted. "Impoverished version of" = same canonical form, strict facet subset. Upgrade recommendations walk the ladder.

### 8.3 Seed strategy: two dense twin domains, not 50 broad patterns

Replace v0.2's 50 generic seed patterns with **deep seeding of one twin pair** where transfer can actually be demonstrated and where proprietary corpus access exists:

- **Domain A: distributed systems / agent infrastructure** (public corpus is excellent: papers, postmortems, design docs).
- **Domain B: cooperative banking compliance and reconciliation** (RBI/NABARD circulars, concurrent-audit findings, CBS reconciliation workflows, NPA processes — a corpus most competitors cannot touch, and the paper's own opening example: divergent copies converging under constraints).

Target: ~30 patterns + ~15 anti-patterns per domain, hand-compiled to full schema, with at least **5 demonstrated A↔B transfer candidates** written up end-to-end (e.g., reconciliation-job pattern ↔ inter-branch DCCB reconciliation; circuit breaker ↔ exposure-limit cutoffs; cache-staleness contract ↔ stale-authority/expired-sanction handling; idempotency keys ↔ duplicate-entry suppression in CBS; canary deploy ↔ pilot-branch policy rollout). These five write-ups validate that USC generated, ranked, routed, and preserved provenance for the transfer candidates; they are not creator adjudications of domain truth. Domain-specific failure modes are owned by downstream users/operators and enter the system as feedback events and empirical transfer scores. Generic breadth (biology, governance, markets) is added *after* the twin pair proves the pipeline, because density beats breadth for transfer quality — the paper says so itself (dense regions seed sparse ones).

---

## 9. S5 — Intervention Plane

### 9.1 Transfer as valence unification (the typed gate)

The paper's claim is that valence makes grafting "precise rather than analogical." v0.2 operationalized that as a scoring term, which is exactly how it degrades back into analogy. v0.3 makes it a **unification problem**:

```
GraftCheck(pattern P, target AST node N):
  for each requirement r ∈ P.valence.requires:
    find binding b: r ↦ provision in N's scope chain      // kernel query, 3-valued
  result:
    all bound           → graftable, with explicit bindings
    any binding fails    → not graftable (hard gate, regardless of score)
    any binding unknown  → graftable-pending-evidence (listed gaps)
```

Output is a `graft_plan` artifact: pattern-node→target-node bindings, satisfied/unsatisfied/unknown requirements, obligations the graft will create, and anti-patterns within threshold distance of the post-graft signature. The ranking formula orders the *graftable* set; it never overrides the gate. False analogies are eliminated structurally, which is the paper's promise.

### 9.2 AST modification, recommendation, codegen

Carried over from v0.2 essentially unchanged (the operation vocabulary, recompile-after-every-edit, recommendation schema, emitter rule that nothing is final unless DLR-O discharges or marks unknown). One addition: every recommendation embeds its **diagnosis-information-gain rank** — recommendations that collapse multiple symptoms into one structural cause (the paper's "multi-symptom collapse") outrank single-symptom fixes. This operationalizes the craft section's "one insight that reorganizes a field is worth ten confirmations" instead of mechanically gap-filling all 32 questions — the diagnostic output is ranked by surprise (deviation from domain-prior signatures), not by completeness.

### 9.3 Action gate (the wedge — unchanged in design, promoted in priority)

The v0.2 agent-OS-kernel design (`ActionGateRequest/Response`, propose → parse → ledger → evidence → verdict) carries over verbatim. What changes is its position in the build order (§11) and one hardening requirement: the gate must publish its **decision latency budget** (p95 target, e.g. < 800ms for cached-evidence verdicts) and its fallback verdict on budget exhaustion (`pending`, never `allow`) — because a gate that is slow or fails-open will be removed from the loop by its users, and a gate that fails-closed-silently will be resented. `pending` with named evidence gaps is the only sustainable failure mode.

### 9.4 Feedback flywheel

Retained from v0.2 in full (`RecommendationFeedback`, `PatternOperationalStats`, transfer evaluation modes, pattern-level learning). One addition: feedback events are artifacts in the store (§4), so pattern confidence at any past date is reconstructible — which is what makes the empirical transfer score auditable rather than a drifting float.

---

## 10. Evaluation: Eval-First Development

v0.2 had the right metrics but treated evaluation as a module. v0.3's rule: **a benchmark exists before the component it measures.** The build plan (§11) interleaves them explicitly.

The benchmark suite:

1. **Motif Extraction Benchmark** (§5.1) — before the lexer.
2. **Kernel verdict regression suite** — hand-built ASTs with known verdicts for all five semantic checks, including unknown-propagation cases; before the rule interpreter ships.
3. **Trap set for overconfident closure** — 50+ adversarial cases where the *correct* answer is unknown or invalid despite success-shaped surface language (the tool returned 200 but the authority had expired; the migration "completed" but reconciliation evidence is stale). **Overconfident closure rate on the trap set is the headline safety metric**, exactly as v0.2 said — v0.3 adds the labeled set that makes it measurable, and adds the symmetric metric: **over-cautious non-closure rate** (valid closures wrongly marked unknown), because a gate that cries unknown constantly gets unplugged. Both trend lines ship on the internal dashboard from MVP 1.
4. **Golden incident compilations** — 10–15 fully hand-compiled real cases (public postmortems + anonymized cooperative-banking cases) with adjudicated ASTs, diagnoses, and expected recommendations; the end-to-end regression test.
5. **Transfer validation set** — the 5 twin-domain transfer write-ups (§8.3), initially validating USC pipeline behavior only. Domain fitness is scored later by downstream users/operators through feedback events and empirical transfer outcomes.

---

## 11. Build Plan (re-sequenced: vertical slice first)

**MVP 0 — Kernel + benchmarks (3–4 wk).** Rule interpreter, full rulebase v0 (32 motifs, composition graph, facets, collisions, obligation rules, FEP viability), three-valued evaluator, Geometry Engine (gradient + viability), kernel regression suite, Motif Extraction Benchmark corpus + first lexer calibration run, trap set v0. *Exit: kernel answers all five semantic checks on hand-built ASTs; lexer baseline numbers known.*

**MVP 1 — Action Gate vertical slice (4–6 wk).** Artifact Store, lexer (ensemble path, may run in research mode initially), parser, ProcessIR-lite, surface terminal-claim detector + IR-confirmed obligations, ledger, gate API, ledger UI, trap-set dashboard (both closure metrics). **No pattern KG.** *Exit: gate runs against real agent traces (own Claude-agent workflows are the first customer) — in research mode with `experimental`-tagged verdicts until the extractor version meets bar, at which point production-mode verdicts unlock; overconfident closure on trap set < 5%; p95 verdict latency within budget.*

**MVP 2 — Evidence Fixpoint Engine (4 wk).** Chunked recovery, joins, retraction propagation, decay-as-TTL, hypothesis views; incident-from-logs workflow. *Exit: golden incident compilations reproduce adjudicated root causes including ≥1 false-terminal detection.*

**MVP 3 — Twin-domain Pattern Plane (5–6 wk).** Pattern + anti-pattern schemas, WL canonical dedup, fidelity scorer + calibration gold sets, review queue, hand-seeded twin domains (§8.3), hybrid retrieval, richness ladders. *Exit: the 5 transfer write-ups pass pipeline review for generation, ranking, provenance, and uncertainty preservation; fidelity scorer calibration report exists; auto-insert still disabled.*

**MVP 4 — Intervention Plane (4–5 wk).** Valence unification + graft plans, AST modification with recompile, recommendations ranked by multi-symptom collapse, codegen for two emitter targets (engineering spec; compliance checklist), feedback capture. *Exit: end-to-end diagnose→recommend→feedback on golden cases, with feedback explicitly carrying downstream outcome ownership.*

**MVP 5 — Automated ingestion + controlled auto-insert (ongoing).** Large-scale ingestion, candidate mining, calibrated auto-insert (precision ≥ 0.95 bar from v0.2 retained), KG visualization, empty-cell and trajectory analytics surfaced as product.

Cost tiers, budget schema, and escalation policy from v0.2 Module O carry over unchanged and apply from MVP 1 onward.

---

## 12. Self-Application (new invariant)

Every release, the system compiles **its own architecture document** through its own pipeline and publishes the diagnostic report internally: its motif signature, its innovation gradient, its unresolved obligations (open migrations, uncalibrated scorers, disabled-but-pending auto-insert). Three reasons: it is the cheapest continuous integration test of the full pipeline on a document that the team can adjudicate perfectly; it is the most honest marketing artifact conceivable; and a structural-diagnosis system that cannot survive its own diagnosis should not be trusted to diagnose others.

---

## 13. Project Risk Register (the blueprint applied to itself)

| Risk | Structural reading | Mitigation in this blueprint |
|---|---|---|
| Lexer unreliability compounds | Representation impoverishment at the root | §5 reliability program; acceptance bars; ensemble path |
| Pattern KG pollution | Decay ⊗ Invariant (corruption) | Calibration gates, lifecycle, anti-patterns, auto-insert bar, content-addressed provenance |
| False transfer | Dangling valence at graft | Unification gate (§9.1), empirical transfer score, expert-scored validation set |
| Ontology lock-in (32 motifs wrong/incomplete) | Self-Reference ⊗ Invariant tension | Rulebase-as-data + kernel versioning makes Atlas revision a migration, not a rewrite; IAA results feed definition fixes |
| Gate gets bypassed by users | Authority without legitimacy | Latency budget, pending-not-allow fail mode, over-caution metric tracked symmetrically |
| Eval leakage (LLM has seen the postmortems) | Feedback validation impoverishment | Private twin-domain corpus; held-out paraphrase variants of golden cases |
| Cost blowout | Scarcity unmanaged | Content-addressed caching, tiering, budgets — all retained from v0.2 |
| Scope sprawl | Boundary failure | Five subsystems, one vertical slice first, exit criteria per MVP |

---

## 14. Non-Negotiable Invariants (v0.2's 20, revised to 22)

v0.2's invariants 1–20 are retained with three edits and two additions:

- (3, revised) Every terminal claim *confirmed at the IR level* opens an obligation ledger; surface-keyword detection alone never opens or closes one.
- (4, revised) Every pattern transfer must pass **valence unification**, not merely score above threshold.
- (5, extended) Every LLM structural claim must be schema-validated **and span-grounded**.
- (21, new) No **production decision** (gate verdict, shipped recommendation, KG insertion, transfer-score update) consumes extraction output unless benchmark bars are met for that extractor version; research/dev runs may proceed below bar but their artifacts are tagged `experimental` and the kernel rejects production-decision artifacts whose provenance contains them.
- (22, new) Each release, the system is compiled by itself and the self-diagnosis is reviewed before ship.

---

## 15. Final Architecture Summary

```
S1 Kernel:    the laws, written as auditable rules, evaluated in three values,
              with geometry (gradient, viability, phase, empty cells) computed for free.
S2 Store:     one immutable, content-addressed memory; audit, cache, and
              migration as consequences, not features.
S3 Runtime:   calibrated sensing (lexer), one fixpoint engine for distribution
              and revision, obligations grounded in IR semantics.
S4 Patterns:  dense twin domains first; anti-patterns beside patterns;
              richness ladders computed, not asserted; nothing self-certified.
S5 Action:    transfer gated by unification; recommendations ranked by
              multi-symptom collapse; the gate fails to pending, never to allow;
              every outcome feeds the flywheel.
```

The v0.2 closing principle stands and gains one clause:

Do not build a one-shot recommender. Build a structural learning system whose recommendations become more trustworthy every time reality responds — **and whose every claim about reality can be traced back, through immutable artifacts and auditable rules, to the evidence and the law that produced it.**
