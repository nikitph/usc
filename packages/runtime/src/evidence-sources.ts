import type { MotifObligation } from "@usc/shared/generated";
import { sha256Hex, canonicalJson } from "@usc/shared/hashing";

import { EvidenceFixpointEngine } from "./evidence.ts";
import { RuntimeError } from "./errors.ts";
import type {
  EvidenceDerivationRule,
  EvidenceFact,
  EvidenceFactDraft,
  EvidenceGapLike,
  EvidenceSource,
  EvidenceSourceInput,
  EvidenceSourceRegistry,
  LedgerEntry,
} from "./types.ts";

export function createEvidenceSourceRegistry(): EvidenceSourceRegistry {
  const sources = new Map<string, EvidenceSource>();
  return {
    register(source: EvidenceSource): void {
      if (source.name.length === 0) throw new RuntimeError("evidence source name is required");
      if (sources.has(source.name)) throw new RuntimeError(`duplicate evidence source "${source.name}"`);
      sources.set(source.name, source);
    },
    get(name: string): EvidenceSource {
      const source = sources.get(name);
      if (source === undefined) throw new RuntimeError(`unknown evidence source "${name}"`);
      return source;
    },
  };
}

export class DeterministicTextEvidenceSource implements EvidenceSource {
  readonly name = "deterministic-text";

  fetch(input: EvidenceSourceInput): readonly EvidenceFactDraft[] {
    const text = input.contextTexts.join("\n");
    const lower = text.toLowerCase();
    const factId = factIdFor("source", input.obligation.id, lower);
    if (/timeout|budget exhausted/i.test(text)) {
      return [{
        id: factId,
        body: { kind: "budget_exhausted", obligationId: input.obligation.id },
        assertedAt: input.observedAt,
      }];
    }
    if (input.obligation.type === "authority" && /valid until/i.test(text)) {
      const validUntil = validUntilFrom(text);
      if (validUntil !== undefined && Date.parse(validUntil) < Date.parse(input.observedAt)) {
        return [{
          id: factIdFor("source", input.obligation.id, lower, "stale"),
          body: { kind: "stale_authority", obligationId: input.obligation.id, validUntil },
          assertedAt: input.observedAt,
        }];
      }
      return [{
        id: factId,
        body: { kind: "authority_evidence", obligationId: input.obligation.id, validUntil },
        assertedAt: input.observedAt,
        ...(validUntil === undefined ? {} : { validUntil }),
      }];
    }
    if (/contradict|conflict|disagree/i.test(text)) {
      return [{
        id: factId,
        body: { kind: "contradictory_evidence", obligationId: input.obligation.id },
        assertedAt: input.observedAt,
      }];
    }
    if (/evidence resolved|retention check passed|approved/i.test(text)) {
      return [{
        id: factId,
        body: { kind: "resolved_evidence", obligationId: input.obligation.id },
        assertedAt: input.observedAt,
      }];
    }
    return [];
  }
}

export function evidenceJoinRulesForLedger(
  entries: readonly LedgerEntry[],
  observedAt: string,
): readonly EvidenceDerivationRule[] {
  return entries.map((entry) => ({
    id: `join:${entry.obligation.id}`,
    derive: (facts) => evidenceJoinDrafts(entry.obligation, facts, observedAt),
  }));
}

export function resolveLedgerWithEvidence(
  entries: readonly LedgerEntry[],
  source: EvidenceSource,
  contextTexts: readonly string[],
  observedAt: string,
): readonly LedgerEntry[] {
  const engine = new EvidenceFixpointEngine();
  for (const entry of entries) {
    for (const draft of source.fetch({ obligation: entry.obligation, contextTexts, observedAt })) {
      engine.assertFact(draft);
    }
  }
  engine.expireFacts(observedAt);
  engine.runFixpoint(evidenceJoinRulesForLedger(entries, observedAt));
  return entries.map((entry) => ({
    ...entry,
    obligation: {
      ...entry.obligation,
      status: statusForObligation(entry.obligation, engine.activeFacts()),
      ...(statusReasonForObligation(entry.obligation, engine.activeFacts()) === "budget_exhausted"
        ? { requiredEvidence: ["budget_exhausted"] }
        : {}),
    },
  }));
}

export function evidenceGapsForLedger(entries: readonly LedgerEntry[]): readonly EvidenceGapLike[] {
  return entries
    .filter((entry) => entry.obligation.status === "unknown")
    .map((entry) => ({
      kind: entry.obligation.requiredEvidence?.includes("budget_exhausted") === true
        ? "budget_exhausted"
        : entry.obligation.type === "freshness"
          ? "stale_evidence"
          : "missing_evidence",
      description: `evidence unresolved for obligation "${entry.obligation.id}"`,
      obligationId: entry.obligation.id,
    }));
}

function evidenceJoinDrafts(
  obligation: MotifObligation,
  facts: readonly EvidenceFact[],
  observedAt: string,
): readonly EvidenceFactDraft[] {
  const relevant = facts.filter((fact) => bodyObligationId(fact) === obligation.id);
  const budget = relevant.find((fact) => bodyKind(fact) === "budget_exhausted");
  if (budget !== undefined) {
    return [statusDraft(obligation, "unknown", "budget_exhausted", [budget.id], observedAt)];
  }
  const contradictory = relevant.find((fact) => bodyKind(fact) === "contradictory_evidence");
  if (contradictory !== undefined) {
    return [statusDraft(obligation, "violated", "contradictory_evidence", [contradictory.id], observedAt)];
  }
  const staleAuthority = relevant.find((fact) => bodyKind(fact) === "stale_authority");
  if (staleAuthority !== undefined && obligation.type === "authority") {
    return [statusDraft(obligation, "violated", "stale_authority", [staleAuthority.id], observedAt)];
  }
  const activeEvidence = relevant.find(
    (fact) => bodyKind(fact) === "authority_evidence" || bodyKind(fact) === "resolved_evidence",
  );
  if (activeEvidence !== undefined) {
    return [statusDraft(obligation, "satisfied", "evidence_join", [activeEvidence.id], observedAt)];
  }
  return [];
}

function statusForObligation(
  obligation: MotifObligation,
  facts: readonly EvidenceFact[],
): MotifObligation["status"] {
  const statuses = facts
    .filter((fact) => bodyKind(fact) === "obligation_status" && bodyObligationId(fact) === obligation.id)
    .sort((left, right) => left.id.localeCompare(right.id));
  const status = statusBody(statuses[0]);
  return status ?? obligation.status;
}

function statusReasonForObligation(
  obligation: MotifObligation,
  facts: readonly EvidenceFact[],
): string | undefined {
  const statuses = facts
    .filter((fact) => bodyKind(fact) === "obligation_status" && bodyObligationId(fact) === obligation.id)
    .sort((left, right) => left.id.localeCompare(right.id));
  const value = bodyRecord(statuses[0])?.["reason"];
  return typeof value === "string" ? value : undefined;
}

function statusDraft(
  obligation: MotifObligation,
  status: MotifObligation["status"],
  reason: string,
  supports: readonly string[],
  assertedAt: string,
): EvidenceFactDraft {
  return {
    id: factIdFor("status", obligation.id, status, reason, supports),
    body: { kind: "obligation_status", obligationId: obligation.id, status, reason },
    assertedAt,
    supports,
  };
}

function factIdFor(...parts: readonly unknown[]): string {
  return `evidence:${sha256Hex(canonicalJson(parts)).slice(0, 24)}`;
}

function validUntilFrom(text: string): string | undefined {
  return /valid until ([0-9T:-]+Z)/i.exec(text)?.[1];
}

function bodyRecord(fact: EvidenceFact | undefined): Record<string, unknown> | undefined {
  return typeof fact?.body === "object" && fact.body !== null && !Array.isArray(fact.body)
    ? fact.body as Record<string, unknown>
    : undefined;
}

function bodyKind(fact: EvidenceFact): string | undefined {
  const value = bodyRecord(fact)?.["kind"];
  return typeof value === "string" ? value : undefined;
}

function bodyObligationId(fact: EvidenceFact): string | undefined {
  const value = bodyRecord(fact)?.["obligationId"];
  return typeof value === "string" ? value : undefined;
}

function statusBody(fact: EvidenceFact | undefined): MotifObligation["status"] | undefined {
  const value = bodyRecord(fact)?.["status"];
  return value === "satisfied" || value === "violated" || value === "unknown" ? value : undefined;
}
