*UNIVERSAL CODING STANDARDS**CREDIT IQ*

**UNIVERSAL CODING STANDARDS**

FOR AI-ASSISTED SOFTWARE DEVELOPMENT

*Language-Agnostic Principles for Agent-Generated Code*

Every principle that CS education taught as ideal — now achievable and mandatory.

**CREDIT IQ**

Version 1.0  •  April 2026

# Preamble: The Fundamental Shift

When a human writes code, every abstraction carries a time cost. Teams rationally, if regrettably, defer structural investment. When an AI agent writes code, the cost of writing a Strategy pattern versus a switch statement is identical. The only remaining cost is specification — telling the agent what you want.

This document codifies every principle that computer science education taught as the ideal way to write software — principles that industry routinely deferred under the guise of pragmatism, premature optimization, or velocity. With agent-generated code, these principles become not only achievable but mandatory. The excuse of cost is gone. What remains is the standard.

| **⚠ KEY INSIGHT: **These were never optimizations. They were always about correctness and maintainability. The industry confused “expensive to implement” with “unnecessary.” Separation of concerns was always necessary. It was just expensive. That constraint is now removed. |
| --- |

# Phase 0: Before a Line of Code Exists

## 0.1 Requirements as Formal Contracts

An agent cannot infer intent — it can only follow specification. Every piece of work begins with:

- **Problem Statement** — Describes what the user or system needs to accomplish, not how. “The system must allow a branch auditor to flag a transaction as suspicious and notify the compliance officer” — not “add a button that sends an email.”

- **Preconditions and Postconditions** — For every operation. From Hoare logic: disburse(loan) has preconditions (loan is approved, account is active, sufficient funds exist) and postconditions (loan status is Disbursed, account balance is credited, event is emitted). These become the agent’s specification AND the test assertions.

- **Invariants** — Things that must always be true. “The sum of all ledger entries for an account must equal the account balance.” “No loan can exist without an associated borrower.” These constraints must be enforced structurally, not through hope.

- **Boundary Conditions** — What happens at the edges. Zero items, maximum capacity, concurrent access, network failure, partial completion. Every professor drills this. Every production system fails here.

## 0.2 Domain Modeling Before Architecture

Before deciding on patterns or layers, model the domain. This is Domain-Driven Design — taught as ideal, rarely practiced because modeling takes time. An agent can generate the model from a well-described domain specification. The modeling conversation is now the most valuable thing a human does.

| **Concept** | **Definition** | **Example** |
| --- | --- | --- |
| Entity | A thing with identity that persists over time. Identity survives changes to attributes. | LoanAccount (its identity survives balance/status changes) |
| Value Object | Defined by attributes, no independent identity. Two instances with same attributes are equal. | MonetaryAmount, Address, InterestRate, DateRange |
| Aggregate | A cluster of entities and value objects forming a consistency boundary. The root enforces all invariants. | LoanAccount + RepaymentSchedule + DisbursementHistory |
| Domain Event | An immutable fact about something that happened. Past tense. | LoanDisbursed, AccountFrozen, AuditObservationRaised |
| Bounded Context | Recognition that the same word means different things in different parts of the business. | "Account" in lending vs. deposits vs. authentication |

# Phase 1: Architectural Decisions

## 1.1 Layered Architecture with Strict Dependency Direction

Every software architecture course teaches this. The layers, with their dependency rules:

| **Layer** | **Contains** | **Depends On** | **Never Depends On** |
| --- | --- | --- | --- |
| Domain (innermost) | Entities, value objects, aggregates, domain services, domain events, repository interfaces | Nothing | Any framework, library, database, or HTTP package |
| Application | Use cases / interactors. Each represents one system operation. | Domain only | Infrastructure, presentation, frameworks |
| Infrastructure | Repository implementations, external service adapters, message queues, file I/O, config | Domain + Application | Presentation |
| Presentation (outermost) | Controllers, API endpoints, CLI handlers, batch job entry points | Application only | Domain directly, Infrastructure directly |

| **⚠ KEY INSIGHT: **If you deleted every framework and library from your project, the Domain layer should still compile. It is pure business logic expressed in the language of the domain. |
| --- |

## 1.2 The Dependency Rule Extends to Data

Data structures also respect layer boundaries. A database entity (ORM model) is NOT the same as a domain entity. A JSON response DTO is NOT the same as a domain object. Each boundary has its own data structures and mappers that translate between them. This feels like boilerplate. Agents generate it instantly. And it prevents the catastrophic coupling where a database schema change cascades to the API response format.

| **Boundary** | **Data Type** | **Purpose** |
| --- | --- | --- |
| Database | LoanAccountRow / ORM Model | Maps to database schema |
| Domain | LoanAccount (Entity) | Expresses business rules and invariants |
| API Response | LoanAccountResponse (DTO) | Shaped for consumer needs |
| Between layers | Mappers / Assemblers | Translate between representations at each boundary |

# Phase 2: SOLID Principles — The Precise Versions

## 2.1 Single Responsibility Principle

*Shallow version: *"A class should have one reason to change."

**Precise version: **A module should be answerable to exactly one stakeholder. If the CEO cares about report format and the DBA cares about query performance, those concerns live in different modules.

**The test: **Can you describe what this module does in one sentence without the word “and”? If not, it has multiple responsibilities.

**Agent error pattern: **Conflating “one entity” with “one responsibility.” A UserService with 15 methods that all relate to users feels like SRP but isn’t. Split into UserAuthenticationService, UserProfileService, UserNotificationPreferences.

**Enforcement: **No service/module with more than one aggregate root or domain concept. No class named just [Entity]Service or [Entity]Manager without a qualifying verb or concern.

## 2.2 Open-Closed Principle

**Precise version: **When a new business requirement arrives that is a variation of an existing one, you should be able to satisfy it by adding a new file, not by opening an existing file and inserting an else-if branch.

This is exactly where the Strategy pattern is not premature. When code branches on “type” or “kind” to select an algorithm, each future variant requires modifying that file. The Strategy version means adding a new class in a new file. The existing code does not change. Nothing is retested except the new class.

**Enforcement: **Any branching on type/kind/category that determines which algorithm to run MUST be a Strategy. The branch exists in exactly one place — the factory or registry that maps type to strategy. Nowhere else.

## 2.3 Liskov Substitution Principle

**Precise version: **If code works with a base type, it must work with any implementation of that base type without knowing which one it got, and without defensive checks like if (instance is SpecificSubtype).

**Agent error pattern: **Generating inheritance hierarchies where child classes throw NotImplementedError on methods they don’t support. A ReadOnlyRepository extends Repository that throws on save() violates Liskov. The correct design: separate Readable and Writable interfaces, composed as needed.

**Enforcement: **No method in any implementation may throw “not supported” or “not implemented” for an interface method. No instanceof or type-checking of a variable already typed to an interface. Composition over inheritance by default.

## 2.4 Interface Segregation Principle

**Precise version: **An interface should represent a role that a consumer needs, not the full surface area of the object behind it. Interfaces are defined by their consumers, not their implementers.

A LoanAccount object might support 30 operations. But the reporting module only needs getBalance(), getAccountId(), and getStatus(). It should depend on a LoanAccountSummary interface with those three methods, not the full LoanAccount.

**Enforcement: **Name interfaces after the role they play for the consumer: Reportable, Auditable, Disbursable — not after the entity. Maximum 5–7 methods per interface.

## 2.5 Dependency Inversion Principle

**Precise version (Plugin Architecture): **The core of your application defines sockets (interfaces). External concerns plug into those sockets. The database is a plugin. The web framework is a plugin. The email service is a plugin. You should be able to replace any plugin without the core knowing.

**Enforcement: **The Domain layer has ZERO imports from any framework, library, or infrastructure package. Repository interfaces defined in Domain. Implementations live in Infrastructure. If your domain model imports an ORM decorator or an HTTP annotation, the architecture is violated.

# Phase 3: Simplicity Guards

## 3.1 KISS — Correctly Understood

KISS does not mean “write naive code” or “fewest lines of code.” It means: among all solutions that correctly solve the problem with proper separation of concerns, choose the one with the least conceptual overhead. A Strategy pattern for two strategies is simpler than a chain of if-else that will grow to twelve. Simplicity is measured over the lifetime of the code, not at the moment of first writing.

**Enforcement: **Simplicity is measured by the number of things you need to hold in your head to understand a single unit. A function should require understanding at most 3–4 concepts. A 200-line function in one file is more complex than five 40-line classes in five files.

## 3.2 YAGNI — Correctly Scoped

YAGNI forbids speculative features. It does NOT forbid structural investment. These are different things:

| **Type** | **Example** | **Verdict** |
| --- | --- | --- |
| Speculative Feature | Building multi-currency support because someday we might need it | Forbidden by YAGNI |
| Structural Investment | Putting currency handling behind a CurrencyConverter interface | Required — always do this |

**The test: **“Am I writing business logic that nobody asked for?” (bad) vs. “Am I putting a clean boundary around business logic that was asked for?” (good, always do this). The interface costs nothing. The speculative implementation costs a lot.

## 3.3 DRY — Correctly Scoped

DRY does not mean “never repeat a line of code.” It means: every piece of knowledge should have a single authoritative source. Two functions with similar-looking code but representing different business concepts should NOT be merged.

**The test: **If the business rule behind one changes, should the other change too? If no, they are coincidences, not duplicates. Name extracted functions after the business concept, not the mechanical operation. Not processItems() but applyGSTRateToLineItems().


# Phase 3.5: Abstraction Hygiene

Every function, class, module, and API is an abstraction. It makes a promise to its caller by presenting a simpler interface over a more complex reality. The quality of that abstraction — whether it is tight or leaky — is not determined by the spec. It is determined by implementation discipline. Two teams building the same spec can produce one abstraction that feels like joy and another that requires conference talks to explain the gotchas.

This section codifies the discipline that produces tight abstractions.

| **⚠ KEY INSIGHT:** If the code looks simple but you need a 40-minute conference talk to explain the gotchas, the abstraction deleted too much. Mental gymnastics in the caller is always a sign of implementation failure in the callee. |
| --- |

## 3.5.1 The Three Operations of Abstraction

Every abstraction layer applies three transforms to the layer below:

| **Operation** | **What it does** | **When it causes leaks** |
| --- | --- | --- |
| Interface mutation | Changes the shape of what the caller interacts with. Raw complexity becomes a simpler interface. | When the new shape doesn't match how the caller naturally thinks about the problem. |
| Data injection | Silently adds information the caller didn't provide — defaults, timeouts, retry policies, encoding, implicit ordering. | When the injected default is wrong for the caller's context and the caller can't discover or override it. |
| Information deletion | Removes details from the visible surface. The ORM deletes the SQL. The API deletes the topology. | When the deleted information becomes relevant to the caller's situation and there's no clean way to recover it. |

**The leak prediction rule:** For every abstraction you design, enumerate what you mutated, injected, and deleted. Each deletion is a potential leak point. Each injection is a potential wrong default. Audit them explicitly before shipping.

## 3.5.2 Seven Principles of Tight Abstraction

### Principle 1: Mutate toward the caller's mental model

The interface should match how the caller thinks about the problem, not how the implementation solves it. If the caller thinks "save this user," the interface is `save(user)` — not `serialize_and_insert_into_btree()`.

**Test:** Can a caller guess what a method does by reading its signature? If yes, the mutation is tight.

**Agent error pattern:** Exposing implementation structure in the interface. A method called `insertIntoRedisAndInvalidateCache()` instead of `updateUserProfile()` reveals the mechanism instead of the intent.

### Principle 2: Delete downward, never sideways

Delete implementation details (how the machine does it). Never delete conceptual details (what the caller needs to reason about correctly).

The ORM can safely delete SQL syntax — that's downward, toward the machine. But if the ORM also deletes the cost model — making a query that triggers a full table scan look identical to one that hits an index — it has deleted sideways. The caller still needs cost awareness for correct usage.

**Test:** For every deletion, ask: "Will the caller need this for correct usage — not just for optimization, but for correctness?" If yes, you deleted sideways. Restore it or make it discoverable.

**Enforcement:** When designing an interface that wraps a lower layer, list every piece of information from the lower layer that will NOT be visible in the new interface. For each: classify as "implementation detail the caller never needs" or "conceptual detail the caller sometimes needs." The second category must be accessible through an escape hatch, not deleted entirely.

### Principle 3: Make injections visible, overridable, and honest

Every default the abstraction injects must be: discoverable (the caller can find out what was injected), overridable (the caller can change it), and honest (the default matches the common case, not the convenient one).

**Test:** Can the caller list every default this abstraction injected without reading source code? If not, the injections are too hidden.

**Enforcement:** All injected defaults must appear in configuration, constructor parameters, or documentation. No silent defaults buried in implementation. No default that optimises for the demo case over the production case (e.g., ORM lazy loading: convenient for demos, catastrophic at scale).

**Agent error pattern:** Hardcoding timeouts, retry counts, batch sizes, or pool sizes inside implementation code instead of making them configurable with documented defaults.

### Principle 4: Provide escape hatches, not cliffs

When the abstraction leaks — and it will — the caller needs a clean path down to the layer below for that specific case, without abandoning the abstraction entirely.

**Test:** When the abstraction fails for one case, how much unrelated code must be rewritten? If the answer is "everything," it's a cliff.

**Enforcement:** Every abstraction layer must expose a controlled mechanism for reaching the layer below. SQLAlchemy allows raw SQL via `session.execute()`. React allows refs for direct DOM access. These are not violations of the abstraction — they are the abstraction being honest about its limits.

**Agent error pattern:** Generating wrappers that completely seal the underlying layer with no passthrough mechanism. If the agent wraps a database client, it must also expose a method for executing raw queries when the wrapper's abstraction is insufficient.

### Principle 5: Make different costs look different

If two operations have vastly different computational, memory, or I/O costs but identical syntax, the interface is lying. The syntax should hint at the cost difference, even if it doesn't expose the full cost model.

**Test:** Can two syntactically identical calls in this interface differ in cost by 10x or more? If yes, the syntax is deleting cost information the caller needs.

**Enforcement:** Operations with fundamentally different cost profiles should have distinct method names, distinct types, or at minimum, documentation that surfaces the cost difference. A `findById(id)` (indexed O(1) lookup) and a `findByComplexPredicate(pred)` (full scan) should not be the same method with different parameters. They are categorically different operations and should look different.

**Agent error pattern:** Generating a single generic `find(criteria)` method that hides whether the underlying query hits an index or performs a full table scan. Separate the indexed path from the scan path in the interface.

### Principle 6: Inherit your foundation's leaks honestly

You cannot build a tight abstraction over a leaky foundation by hiding the foundation's leaks. If the underlying layer can fail, your abstraction must surface that failure — not swallow it.

**Test:** Does this abstraction hide a known failure mode of the layer below? If yes, you are not creating a tighter abstraction — you are creating a more dangerous one.

**Enforcement:** This is an extension of Phase 7's error handling rules. If the underlying function returns an error or throws an exception, the wrapping function must either handle it meaningfully, translate it to a domain error, or propagate it. Never swallow it. The same applies to non-error leaks: if the underlying database has eventual consistency, the repository interface must not promise strong consistency by omission.

**Agent error pattern:** Wrapping a network call in a try-catch that returns a default value on failure, silently converting a network outage into a wrong answer instead of a visible error.

### Principle 7: Test the abstraction by testing the deletion

Before shipping, for every piece of information deleted from the interface, ask: "Will the caller need this back? How often? How urgently? What happens if they can't get it?"

**Test:** Walk through 10 real usage scenarios. In how many does the caller need information the abstraction deleted? If more than 2 out of 10, the deletion is too aggressive.

**Enforcement:** During code review of any new interface, service, or API: the reviewer lists the top 5 things the new abstraction deletes from the layer below and asks the three questions (how often needed, how urgently, what if unavailable) for each. This takes 5 minutes and catches the most common abstraction design errors.

## 3.5.3 Review Checklist for Abstraction Hygiene

For every PR that introduces or modifies an abstraction (interface, service, API, wrapper, facade):

1. Does the mutation match the caller's mental model or the implementation's structure?
2. Did you delete only implementation details, or also concepts the caller needs?
3. Can the caller discover and override every injected default without reading source code?
4. When this leaks, is there an escape hatch or a cliff?
5. Can two syntactically identical calls differ in cost by 10x or more?
6. Does this hide a known failure mode of the layer below?
7. For each deletion — in 10 real scenarios, how many need the deleted information back?

---

# Phase 4: Design Patterns as Structural Vocabulary

Patterns are not recipes but a shared vocabulary for recurring design problems. The following are organized by their purpose, with precise signals for when an agent should apply each one.

## 4.1 Creational Patterns

### Factory Method / Abstract Factory

**Signal: **The new keyword used inside business logic with conditional logic around which type to create.

**Fix: **A factory that takes the discriminator and returns the correct type. Construction decisions live in exactly one place.

### Builder

**Signal: **Constructors with more than 4–5 parameters. Functions that create objects with lots of null or default values.

**Fix: **A builder with fluent API that makes construction readable and validates the final object.

### Singleton

**Verdict: **Almost always an anti-pattern in application code. If you need “only one instance,” the DI container ensures that. The code itself does not know or care that it is the only instance.

## 4.2 Structural Patterns

### Adapter

Mandatory for all external dependencies. Your domain defines the interface it wants. An adapter wraps the external library to conform. The adapter lives in the infrastructure layer. This is not optional — it is the standard way to integrate anything third-party.

### Decorator

For adding behavior without modifying the core. Logging, caching, retry logic, authorization checks, metrics — all decorators around the core service. The core service does not know it is being decorated.

### Facade

When a subsystem is complex and consumers need a simplified interface. This is how bounded contexts expose themselves to each other — through a facade with 3–4 methods, not through direct access to internal classes.

### Composite

When you need to treat individual objects and groups uniformly. Organizational hierarchies (PACS → DCCB → StCB), nested categorizations, tree-structured data.

## 4.3 Behavioral Patterns

### Strategy

**Signal: **Any switch/case or if/else chain that selects between different algorithms or business rules. Any parameter named type, mode, kind, variant. Even two variants benefit from Strategy because the structure communicates intent.

### Observer / Event Emitter

**Signal: **Completion of operation A should trigger operations B, C, D that belong to different concerns. A emits an event; separate listeners handle each concern. Adding a new side effect means adding a new listener — existing code does not change.

### Command

Encapsulates a request as an object. Gives you undo/redo, request queuing, request logging/audit, and macro operations. Every write operation in a system with audit requirements should arguably be a Command, because the command object IS the audit record.

### State Machine

**Signal: **An entity with a lifecycle: Applied → Approved → Disbursed → Active → Delinquent → NPA → Closed. Each state has different rules about what operations are allowed. The State pattern makes this explicit rather than scattering if (status === "ACTIVE") checks.

### Chain of Responsibility

When a request should be handled by one of several handlers in sequence. Validation chains (each validator checks one aspect and passes to the next), approval workflows, middleware pipelines.

### Template Method

When an algorithm has fixed steps but some steps vary by type. Report generation: every report loads data, validates, formats, distributes — but each step varies. Prefer composition (Strategy per step) over inheritance for this in agent-generated code.

# Phase 5: Data Structures and Algorithms

## 5.1 Choose the Right Data Structure

This is not premature optimization. It is correctness. Using a list where you need constant-time lookup is a design error, not a “later” problem.

| **Need** | **Correct Structure** | **Wrong Choice** |
| --- | --- | --- |
| Checking membership | Set / HashSet | Linear scan through a list |
| Mapping keys to values | Map / Dictionary / HashMap | Parallel arrays or repeated lookups |
| Ordered access | Sorted set / tree / sorted array | Sorting on every access |
| Queue semantics (FIFO) | Queue / Deque | Array with shift operations |
| Stack semantics (LIFO) | Stack | Array with manual index tracking |

## 5.2 Algorithmic Complexity

**Enforcement: **No nested iteration over the same or related collections without a documented reason. All collection lookups inside loops must use indexed or hashed structures. The agent must not generate O(n²) algorithms where O(n log n) or O(n) solutions exist, unless the dataset is provably small and bounded.

## 5.3 Concurrency Primitives

From operating systems courses: shared mutable state is the root of all concurrency bugs. The hierarchy of correctness:

- No shared state — each unit of work has its own data. (Best)

- Shared immutable state — everyone reads, nobody writes. (Good)

- Shared mutable state with proper synchronization — locks, semaphores, atomics. (Acceptable)

- Shared mutable state without synchronization. (Forbidden — always a bug)

# Phase 6: Defensive Programming

## 6.1 Design by Contract

From Bertrand Meyer’s work: every function has a contract consisting of preconditions (what must be true when called), postconditions (what the function guarantees on return), and invariants (what remains true throughout).

- Precondition validation at the start of every public method. Not deep inside the logic where the failure manifests as a cryptic error, but at the entry point with a clear, domain-meaningful error message.

- Postcondition assertions where practical — especially in critical financial calculations. “The sum of the split amounts must equal the original amount” — assert this after the split operation.

- Invariant enforcement in constructors and any method that modifies state. An Account object should never exist with a negative ID, a null holder, or an invalid status.

## 6.2 Fail Fast, Fail Loud

The worst bugs corrupt state silently and manifest hours later in unrelated code. The system should fail immediately and loudly when something is wrong. A null where a value was expected: throw immediately. An invalid state transition: throw immediately. A database constraint violation: surface it as a domain error, do not catch and continue.

## 6.3 Immutability as Default

All data structures should be immutable by default. A LoanApplication once created should not be mutated — you create a new one with the changed fields. This eliminates shared mutable state bugs, race conditions, and unexpected side effects. Mutable state is allowed only when there is an explicit reason, and must be encapsulated so no external code can observe the mutation.

**Enforcement: **All fields are read-only/final/const by default. All collections returned from methods are copies or immutable views. Any method that changes state returns a new instance rather than modifying the existing one, unless documented otherwise.

## 6.4 Null / Absence Safety

Null references are never used to represent business concepts. If a value might be absent, that is modeled explicitly — Optional, Maybe, Option, nullable type annotations, or a domain-specific concept like NotYetDisbursed. The caller must handle absence explicitly.

**Enforcement: **No function returns null without an explicit type annotation declaring it can. Domain entities never have null fields — either the field is required (set at construction) or it is explicitly Optional.

## 6.5 Boundary Validation and Value Objects

All data entering the system from outside is validated and transformed into domain types at the boundary. Once inside, code operates on trusted domain types. No raw strings flowing through business logic.

An account number is an AccountNumber value object that validated its format at construction. A monetary amount is a Money type that carries its currency. A date is a domain date type that rejected invalid values at the boundary.

**Enforcement: **No primitive types (string, number, boolean) for domain concepts in function signatures. Create value objects for anything that has validation rules or business meaning. The value object’s constructor IS the validation.

# Phase 7: Error Handling as Architecture

Errors are not exceptional — they are expected outcomes that the system must handle gracefully. The architecture must account for them from the start.

## 7.1 Custom Error Types Per Failure Domain

InsufficientBalanceError, AccountFrozenError, GSTValidationError, AuthorizationDeniedError. Never generic Error("something went wrong"). The error type IS the documentation of what can fail.

## 7.2 Error Propagation Rules

- Errors in the domain layer are domain errors.

- Infrastructure errors (database timeout, network failure) are translated to domain-meaningful errors at the boundary.

- Business logic never catches infrastructure-specific exceptions directly.

## 7.3 No Swallowed Errors

Every catch block must either: handle the error meaningfully (recover, retry, compensate), translate it (wrap in a domain error and re-throw), or log and re-throw. A catch block that logs and continues as if nothing happened is a bug.

# Phase 8: Naming as Documentation

Code is read far more than it is written. With agents, it is read exponentially more than it is written. Names must reveal intent, scope, and domain.

| **Category** | **Rule** | **Good** | **Bad** |
| --- | --- | --- | --- |
| Variables | Reveal what it IS without reading assignment code | remainingLoanPrincipal | bal, amount, data |
| Functions | Reveal what it DOES without reading the body | calculateProportionalNPAProvision(account, quarter) | calculate(a, q), process(data) |
| Booleans | Read as a yes/no question | isAccountDelinquent, hasValidGSTRegistration | flag, status, check |
| Collections | Always plural, descriptive of contents | activeAccounts, pendingDisbursements | list, items, arr |
| Constants | Named after the business concept | MAX_RETRY_ATTEMPTS, NPA_PROVISION_RATE_SUBSTANDARD | N, RATE, VAL |

**Enforcement: **No single-letter variables except loop counters in trivially short loops. No data, result, info, item, obj, temp as standalone names. Every name must be greppable — you should be able to search the codebase for it and find all relevant usages without noise.

# Phase 9: Testing as Specification

Tests are not an afterthought. They are the formal specification of what the code does. An agent that generates code without tests has generated unverified claims.

## 9.1 Unit Tests for All Domain Logic

Every public method on every domain service, entity, and value object. Tests express the business rule in executable form: expect(calculateNPAProvision(subStandardAsset)).toBe(15%) is more precise than any comment or documentation.

## 9.2 Integration Tests for All Boundaries

Repository implementations tested against real databases or realistic fakes. External service adapters tested against recorded responses. These verify that the infrastructure fulfills the contracts defined by the domain interfaces.

## 9.3 Test Hygiene

- No test should depend on another test’s state.

- No test should require external services to be running.

- No flaky tests. If a test is flaky, fix the design, not the test.

- Test naming reveals the specification: should_rejectDisbursement_when_accountIsFrozen, not test1 or testDisbursement.

# Phase 10: Observability from Line One

## 10.1 Structured Logging

Every log entry is a structured record (JSON or equivalent) with fields for: timestamp, correlation ID, service name, operation, outcome, and relevant domain identifiers. Not print("disbursement done"). Instead: log.info("loan.disbursement.completed", { loanId, amount, branchId, correlationId }).

## 10.2 Correlation IDs

Every operation that spans multiple services or steps carries a correlation ID generated at the entry point. Passed through all function calls, included in all log entries, propagated to downstream services. When something fails at 3 AM, this is how you trace the full chain.

## 10.3 Health and Metrics

Every service exposes its health status and key metrics. Not as a “later” addition. The agent generates the health endpoint and basic counters alongside the business logic.

# Phase 11: Security

## 11.1 Authentication and Authorization as Cross-Cutting Concerns

Never implemented inside business logic. Always as middleware, decorator, or aspect that wraps business logic. The business logic receives an already-authenticated, already-authorized context. Authorization is declarative: @RequiresRole("BRANCH_AUDITOR") or equivalent, not if (user.role === "BRANCH_AUDITOR") scattered through the codebase.

## 11.2 Input Validation as Security Boundary

All external input is hostile until validated. SQL injection, XSS, command injection, path traversal — prevented structurally (parameterized queries, output encoding, safe APIs), not by “remembering to sanitize.” The agent must generate parameterized queries always, never string concatenation for data access. Non-negotiable.

## 11.3 Principle of Least Privilege

Every component has the minimum permissions it needs. The reporting service has read-only database access. The disbursement service can write to loan tables but not user tables. Enforced at the infrastructure level.

## 11.4 Sensitive Data Handling

PII and financial data: logged with masking (last 4 digits only), encrypted at rest and in transit, access-controlled and audit-logged. The domain model distinguishes between sensitive and non-sensitive fields at the type level, not as a runtime annotation.

# Phase 12: Performance Engineering

## 12.1 Performance is a Design Constraint

The distinction between “premature optimization” and “design for performance” is crucial. Choosing the wrong algorithm is a design error, not a premature optimization concern.

| **Category** | **Example** | **When to Decide** |
| --- | --- | --- |
| Design-time (always do) | Data access patterns: single query vs. N+1 | At architecture time |
| Design-time (always do) | Batch vs. real-time processing | At architecture time |
| Design-time (always do) | Pagination and streaming for all collections | At interface design time |
| Design-time (always do) | Idempotency for all write operations | At interface design time |
| Later (only when measured) | Micro-optimizing loop counters | Only after profiling |
| Later (only when measured) | Hand-optimizing generated SQL | Only after profiling |
| Later (only when measured) | Pre-computing values accessed once | Only after profiling |

## 12.2 Pagination and Streaming

No API endpoint returns unbounded collections. Everything is paginated. Large data processing uses streaming/iterators, not “load everything into memory.” A repository method returns Page<LoanAccount>, not List<LoanAccount>.

## 12.3 Idempotency

From distributed systems: any operation that modifies state must be safe to retry. A disbursement request with the same idempotency key processed twice must not disburse twice. Built into the design from day one, not bolted on after the first duplicate transaction.

# Phase 13: Database Design

## 13.1 Normalization as Default

Third normal form as the baseline. Every table represents one entity. No repeated groups. No transitive dependencies. Denormalization happens only when there is a measured performance need, it is documented as a deliberate trade-off, and there is a mechanism to keep the denormalized data consistent.

## 13.2 Referential Integrity by the Database

Foreign keys, unique constraints, check constraints, not-null constraints live in the database, not just in application code. The database is the last line of defense against data corruption. If the application has a bug, the database rejects invalid data.

## 13.3 Migration-Based Schema Evolution

Schema changes happen through versioned, ordered migration scripts. Never manual DDL. The migration history is version-controlled alongside the code. Every migration has an up and down. The agent generates migrations, not raw DDL.

## 13.4 Audit Columns on All Tables

created_at, created_by, updated_at, updated_by on every table. Soft deletes (deleted_at) rather than hard deletes for any data with regulatory retention requirements. In regulated domains, you never truly delete a record.

# Phase 14: Software Engineering Process

## 14.1 Version Control Hygiene

Every commit represents a single, coherent change. Not “work done today” but “added NPA provision calculation for sub-standard assets.” Commit messages follow a convention: feat: add NPA provision strategy for sub-standard assets, fix: correct rounding error in GST output tax calculation, refactor: extract audit trail concern from LoanService.

## 14.2 Code Review

Even when agents generate code, a human reviews it. The review checklist mirrors these principles: Does it follow layered architecture? Are dependencies pointing inward? Are concerns separated? Are types meaningful? Are error cases handled? Are tests present and meaningful?

## 14.3 Continuous Integration

Every push triggers: compilation/build, all unit tests, all integration tests, static analysis (linting, type checking), dependency vulnerability scanning, and code coverage reporting. If any fail, the code does not merge. This is the automated enforcement layer.

## 14.4 Documentation as Code

- **Code-level** — Meaningful names and types serve as documentation. Comments explain why, never what. If you need a comment to explain what code does, the code is too complex.

- **API-level** — Every public interface has documented contracts — what it expects, what it returns, what errors it can produce. Generated from annotations, never maintained separately.

- **Architecture-level** — Bounded contexts, their relationships, key architectural decisions (ADRs) with context, decision, and consequences.

# Phase 15: Code Organization

## 15.1 Feature-Based, Not Layer-Based

Not controllers/, services/, repositories/ with files from every feature mixed together. Instead: loans/, deposits/, compliance/ with each feature’s controller, service, and repository co-located. When you work on loans, everything you need is in one place.

## 15.2 One Concept Per File

Not “all DTOs in one file” or “all enums in one file.” Each type gets its own file, named after the type. This seems pedantic until you have 50 types and need to find one.

## 15.3 Explicit Public API Per Module

Each feature module exports only what other modules need. Internal implementation details are not accessible from outside. This creates clear boundaries and prevents cross-module spaghetti dependencies.

# Phase 16: Configuration and Environment

- No hardcoded values for anything that might differ across environments: connection strings, API endpoints, feature flags, thresholds, timeouts. All from injected configuration.

- No secrets in code, ever. Not in comments, not in test files, not in “temporary” hardcoded values. Secrets come from environment variables or secret managers.

- All configuration has safe development defaults. The system starts with zero configuration and works in a degraded/local mode. Production configuration is additive.

# Appendix A: Agent Enforcement Template

The following is a condensed version of all rules, formatted for inclusion in agent system prompts, CLAUDE.md, .cursorrules, AGENTS.md, or equivalent configuration files.

## CODE GENERATION RULES (NON-NEGOTIABLE)

 

### ARCHITECTURE

- All data access goes through Repository interfaces defined in Domain.

- All business rule variations use Strategy pattern.

- All object creation decisions use Factory pattern.

- All cross-concern side effects use Events/Observer pattern.

- Entity lifecycles use explicit State Machine pattern.

- No business logic in controllers/handlers/presenters.

- Layered architecture: Domain -> Application -> Infrastructure -> Presentation.

- Dependency arrows point inward ONLY. Domain imports ZERO frameworks.

- Feature-based file organization, not layer-based.

 

### STRUCTURE

- Maximum one responsibility per class (one-sentence description, no "and").

- Maximum 50 lines per function.

- Maximum 5-7 methods per interface.

- Maximum 3-4 concepts to understand per unit.

- Composition over inheritance by default.

- One concept per file.

 

### TYPES AND DOMAIN MODELING

- No primitive types for domain concepts in function signatures.

- Value objects for anything with validation rules or business meaning.

- Entities have identity. Value objects have equality by attributes.

- Aggregates enforce consistency boundaries.

- Separate data types at each layer boundary (DB row, domain, DTO) with mappers.

 

### DEPENDENCIES

- All dependencies injected, never instantiated inline.

- All external services behind Adapter interfaces.

- No framework-specific types in domain layer.

- External libraries wrapped in Adapters in infrastructure layer.

 

### DEFENSIVE DESIGN

- Immutable by default. All fields read-only/final/const.

- Null/absence modeled explicitly (Optional/Maybe/Option).

- Validate all input at system boundaries; domain operates on trusted types.

- Precondition checks at entry of every public method.

- Postcondition assertions for critical calculations.

- Invariant enforcement in constructors.

 

### NAMING

- Domain-specific names only. No generic data, result, handler, item.

- Names reveal intent. Functions describe what they DO, variables what they ARE.

- Booleans read as yes/no questions: isX, hasY, canZ.

- Collections are plural and describe contents.

- No single-letter variables except trivial loop counters.

 

### ERROR HANDLING

- Custom error types per failure domain.

- No swallowed exceptions. No catch-all without re-throw.

- Infrastructure errors translated to domain errors at boundaries.

- Errors are part of the function's contract.

- Fail fast on invalid state.

 

### TESTING

- Every public function has corresponding tests.

- Tests written WITH the implementation, never deferred.

- Test names are specifications: should_[outcome]_when_[condition].

- No test depends on another test's state.

- No test requires external services running.

 

### OBSERVABILITY

- Structured logging (JSON) at service boundaries.

- Correlation IDs on all cross-service calls.

- Health endpoints and basic metrics generated alongside business logic.

 

### SECURITY

- Auth as cross-cutting concern, never in business logic.

- Parameterized queries always, never string concatenation.

- Principle of least privilege for every component.

- Sensitive data masked in logs, encrypted at rest/transit.

 

### DATA

- 3NF as baseline. Denormalization only when measured and documented.

- Referential integrity enforced by database constraints.

- Schema changes via versioned migration scripts only.

- Audit columns (created_at/by, updated_at/by) on all tables.

- Soft deletes for regulated data.

 

### PERFORMANCE

- Correct data structures (set for membership, map for lookup).

- No O(n²) where O(n log n) or O(n) exists without documented reason.

- All collections paginated. Large processing uses streaming.

- All write operations idempotent.

 

### CONFIGURATION

- No hardcoded environment-specific values.

- No secrets in code, comments, or test files.

- Safe development defaults. Production config is additive.

 

### PROCESS

- One coherent change per commit with conventional commit message.

- CI pipeline: build, test, lint, type-check, vulnerability scan, coverage.

- Code review against this checklist even for agent-generated code.


### ABSTRACTION HYGIENE

- Every interface mutation matches caller's mental model, not implementation structure.
- Every deletion audited: only implementation details deleted, never conceptual details the caller needs.
- All injected defaults (timeouts, retries, pool sizes, batch sizes) configurable and documented.
- Every wrapper/facade exposes an escape hatch to the underlying layer.
- Operations with 10x+ cost differences have distinct names or types, not identical signatures.
- No swallowed errors from lower layers. Foundation failures propagated or translated, never hidden.
- Abstraction review: for each deletion, answer "will the caller need this back? how often? how urgently?"

# Appendix B: The Meta-Principle

Everything in this document serves one goal: making the system’s behavior predictable by making its structure explicit.

Every pattern, every principle, every practice exists because implicit behavior — hidden dependencies, implicit type conversions, implicit state mutations, implicit side effects, implicit ordering constraints — is where bugs live.

When an agent generates code that follows these principles, the result is a system where:

- Reading any single module tells you everything that module does.

- Changing any single module has predictable, bounded impact.

- Testing any single module requires no complex setup.

- Onboarding any new developer (or agent) requires only reading the domain model.

- Debugging any issue is a matter of following the explicit chain of calls and events.

- Adding any new feature is additive, not invasive.

This was the promise of software engineering education. The obstacle was always cost. That obstacle is gone.