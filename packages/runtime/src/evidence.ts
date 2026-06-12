import { canonicalJson } from "@usc/shared/hashing";

import { RuntimeError } from "./errors.ts";
import type {
  EvidenceDerivationRule,
  EvidenceFact,
  EvidenceFactDraft,
  FixpointRunReport,
} from "./types.ts";

export class EvidenceFixpointEngine {
  readonly #facts = new Map<string, EvidenceFact>();

  assertFact(draft: EvidenceFactDraft): EvidenceFact {
    return this.#putFact({ ...draft, supports: draft.supports ?? [] });
  }

  deriveFact(draft: EvidenceFactDraft): EvidenceFact {
    if (draft.supports === undefined || draft.supports.length === 0) {
      throw new RuntimeError(`derived fact "${draft.id}" must name at least one support`);
    }
    for (const supportId of draft.supports) {
      const support = this.#facts.get(supportId);
      if (support === undefined || support.status !== "active") {
        throw new RuntimeError(`derived fact "${draft.id}" references missing inactive support "${supportId}"`);
      }
    }
    return this.#putFact({ ...draft, supports: [...draft.supports].sort() });
  }

  runFixpoint(
    rules: readonly EvidenceDerivationRule[],
    options: { readonly maxIterations?: number } = {},
  ): FixpointRunReport {
    const maxIterations = options.maxIterations ?? 100;
    const derivedFactIds = new Set<string>();
    let iterations = 0;
    for (; iterations < maxIterations; iterations += 1) {
      const beforeCount = this.#facts.size;
      for (const rule of [...rules].sort((left, right) => left.id.localeCompare(right.id))) {
        for (const draft of [...rule.derive(this.activeFacts())].sort(compareDrafts)) {
          const fact = this.deriveFact(draft);
          derivedFactIds.add(fact.id);
        }
      }
      if (this.#facts.size === beforeCount) {
        return { iterations: iterations + 1, derivedFactIds: [...derivedFactIds].sort() };
      }
    }
    throw new RuntimeError(`fixpoint did not converge within ${maxIterations} iterations`);
  }

  retractFact(id: string): EvidenceFact {
    const fact = this.#readFact(id);
    if (fact.status !== "active") return cloneFact(fact);
    const retracted = freezeFact({ ...fact, status: "retracted" });
    this.#facts.set(id, retracted);
    this.#propagateInactiveSupports();
    return cloneFact(retracted);
  }

  supersedeFact(id: string, replacement: EvidenceFactDraft): EvidenceFact {
    const fact = this.#readFact(id);
    if (fact.status === "active") {
      this.#facts.set(id, freezeFact({ ...fact, status: "superseded" }));
      this.#propagateInactiveSupports();
    }
    return this.assertFact(replacement);
  }

  expireFacts(nowIso: string): readonly EvidenceFact[] {
    const nowMs = Date.parse(nowIso);
    if (!Number.isFinite(nowMs)) throw new RuntimeError(`invalid clock value "${nowIso}"`);
    const expired: EvidenceFact[] = [];
    for (const fact of this.activeFacts()) {
      if (fact.validUntil !== undefined && Date.parse(fact.validUntil) < nowMs) {
        const retracted = freezeFact({ ...fact, status: "retracted" });
        this.#facts.set(fact.id, retracted);
        expired.push(cloneFact(retracted));
      }
    }
    if (expired.length > 0) this.#propagateInactiveSupports();
    return expired.sort(compareFacts);
  }

  getFact(id: string): EvidenceFact {
    return cloneFact(this.#readFact(id));
  }

  activeFacts(): readonly EvidenceFact[] {
    return [...this.#facts.values()]
      .filter((fact) => fact.status === "active")
      .sort(compareFacts)
      .map((fact) => cloneFact(fact));
  }

  #putFact(draft: EvidenceFactDraft & { readonly supports: readonly string[] }): EvidenceFact {
    if (draft.id.length === 0) throw new RuntimeError("evidence fact id is required");
    if (draft.assertedAt.length === 0) throw new RuntimeError(`evidence fact "${draft.id}" requires assertedAt`);
    const fact = freezeFact({
      id: draft.id,
      body: draft.body,
      assertedAt: draft.assertedAt,
      ...(draft.validUntil === undefined ? {} : { validUntil: draft.validUntil }),
      supports: [...draft.supports].sort(),
      status: "active",
    });
    const existing = this.#facts.get(fact.id);
    if (existing !== undefined) {
      if (canonicalJson(existing) !== canonicalJson(fact)) {
        throw new RuntimeError(`conflicting evidence fact "${fact.id}"`);
      }
      return cloneFact(existing);
    }
    this.#facts.set(fact.id, fact);
    return cloneFact(fact);
  }

  #readFact(id: string): EvidenceFact {
    const fact = this.#facts.get(id);
    if (fact === undefined) throw new RuntimeError(`evidence fact "${id}" not found`);
    return fact;
  }

  #propagateInactiveSupports(): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const fact of [...this.#facts.values()].sort(compareFacts)) {
        if (fact.status !== "active") continue;
        const hasInactiveSupport = fact.supports.some((supportId) => this.#readFact(supportId).status !== "active");
        if (hasInactiveSupport) {
          this.#facts.set(fact.id, freezeFact({ ...fact, status: "retracted" }));
          changed = true;
        }
      }
    }
  }
}

function compareFacts(left: EvidenceFact, right: EvidenceFact): number {
  return left.id.localeCompare(right.id);
}

function compareDrafts(left: EvidenceFactDraft, right: EvidenceFactDraft): number {
  return left.id.localeCompare(right.id);
}

function cloneFact(fact: EvidenceFact): EvidenceFact {
  return {
    ...fact,
    supports: [...fact.supports],
  };
}

function freezeFact(fact: EvidenceFact): EvidenceFact {
  Object.freeze(fact.supports);
  return Object.freeze(fact);
}
