import type { ArtifactEnvelope, ArtifactId } from "./types.ts";
import { ArtifactStoreError } from "./errors.ts";

export type PatternReviewState = "pending" | "accepted" | "rejected";
export type ReviewablePatternKind = "pattern" | "anti_pattern";

export interface PatternReviewEntry {
  readonly artifactId: ArtifactId;
  readonly artifactKind: ReviewablePatternKind;
  readonly state: PatternReviewState;
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly reviewer?: string;
  readonly decidedAt?: string;
  readonly rationale?: string;
}

export interface PatternReviewDecision {
  readonly artifactId: ArtifactId;
  readonly state: Exclude<PatternReviewState, "pending">;
  readonly reviewer: string;
  readonly rationale: string;
}

export interface PatternReviewEvent {
  readonly artifactId: ArtifactId;
  readonly fromState: PatternReviewState | null;
  readonly toState: PatternReviewState;
  readonly actor: string;
  readonly at: string;
  readonly rationale?: string;
}

export interface PatternReviewSummary {
  readonly pending: number;
  readonly accepted: number;
  readonly rejected: number;
}

export interface PatternReviewQueue {
  submitCandidate(artifact: ArtifactEnvelope, submittedBy: string): PatternReviewEntry;
  decide(decision: PatternReviewDecision): PatternReviewEntry;
  listEntries(state?: PatternReviewState): readonly PatternReviewEntry[];
  summary(): PatternReviewSummary;
  readonly events: readonly PatternReviewEvent[];
}

export class InMemoryPatternReviewQueue implements PatternReviewQueue {
  readonly #entries = new Map<ArtifactId, PatternReviewEntry>();
  readonly #events: PatternReviewEvent[] = [];
  readonly #clock: () => string;

  constructor(clock: () => string = () => new Date().toISOString()) {
    this.#clock = clock;
  }

  get events(): readonly PatternReviewEvent[] {
    return this.#events.map(cloneReviewEvent);
  }

  submitCandidate(artifact: ArtifactEnvelope, submittedBy: string): PatternReviewEntry {
    if (artifact.kind !== "pattern" && artifact.kind !== "anti_pattern") {
      throw new ArtifactStoreError(`review queue only accepts pattern artifacts, got ${artifact.kind}`);
    }
    if (submittedBy.length === 0) {
      throw new ArtifactStoreError("submittedBy is required");
    }
    const existingEntry = this.#entries.get(artifact.id);
    if (existingEntry !== undefined) {
      return cloneReviewEntry(existingEntry);
    }

    const entry = freezeReviewEntry({
      artifactId: artifact.id,
      artifactKind: artifact.kind,
      state: "pending",
      submittedBy,
      submittedAt: this.#clock(),
    });
    this.#entries.set(artifact.id, entry);
    this.#events.push({
      artifactId: artifact.id,
      fromState: null,
      toState: "pending",
      actor: submittedBy,
      at: entry.submittedAt,
    });
    return cloneReviewEntry(entry);
  }

  decide(decision: PatternReviewDecision): PatternReviewEntry {
    if (decision.reviewer.length === 0) {
      throw new ArtifactStoreError("reviewer is required");
    }
    if (decision.rationale.length === 0) {
      throw new ArtifactStoreError("decision rationale is required");
    }
    const existingEntry = this.#entries.get(decision.artifactId);
    if (existingEntry === undefined) {
      throw new ArtifactStoreError(`review entry not found: ${decision.artifactId}`);
    }
    if (existingEntry.state !== "pending") {
      throw new ArtifactStoreError(`review entry already ${existingEntry.state}: ${decision.artifactId}`);
    }

    const decidedAt = this.#clock();
    const updatedEntry = freezeReviewEntry({
      ...existingEntry,
      state: decision.state,
      reviewer: decision.reviewer,
      decidedAt,
      rationale: decision.rationale,
    });
    this.#entries.set(decision.artifactId, updatedEntry);
    this.#events.push({
      artifactId: decision.artifactId,
      fromState: "pending",
      toState: decision.state,
      actor: decision.reviewer,
      at: decidedAt,
      rationale: decision.rationale,
    });
    return cloneReviewEntry(updatedEntry);
  }

  listEntries(state?: PatternReviewState): readonly PatternReviewEntry[] {
    return [...this.#entries.values()]
      .filter((entry) => state === undefined || entry.state === state)
      .sort(compareReviewEntries)
      .map(cloneReviewEntry);
  }

  summary(): PatternReviewSummary {
    const counts: Record<PatternReviewState, number> = {
      pending: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const entry of this.#entries.values()) {
      counts[entry.state] += 1;
    }
    return { ...counts };
  }
}

function compareReviewEntries(left: PatternReviewEntry, right: PatternReviewEntry): number {
  const submitted = left.submittedAt.localeCompare(right.submittedAt);
  return submitted === 0 ? left.artifactId.localeCompare(right.artifactId) : submitted;
}

function cloneReviewEntry(entry: PatternReviewEntry): PatternReviewEntry {
  return { ...entry };
}

function cloneReviewEvent(event: PatternReviewEvent): PatternReviewEvent {
  return { ...event };
}

function freezeReviewEntry(entry: PatternReviewEntry): PatternReviewEntry {
  return Object.freeze({ ...entry });
}
