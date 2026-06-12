import type { ArtifactEnvelope, ArtifactId, ArtifactKind } from "./types.ts";
import { computeArtifactId } from "./hash.ts";

export interface TwinDomainSeedBundle {
  readonly id: string;
  readonly generatedAt: string;
  readonly domains: readonly string[];
  readonly artifacts: readonly ArtifactEnvelope[];
  readonly transferWriteups: readonly TwinDomainTransferWriteup[];
}

export interface TwinDomainTransferWriteup {
  readonly id: string;
  readonly sourcePatternId: string;
  readonly targetPatternId: string;
  readonly rationale: string;
  readonly status: "seeded_for_review";
}

const seedRulebaseHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const generatedAt = "2026-06-13T00:00:00.000Z";

export function twinDomainSeedBundle(): TwinDomainSeedBundle {
  const circuitBreaker = artifactOf("pattern", {
    id: "pattern:distributed-systems:circuit-breaker",
    name: "Circuit breaker containment",
    domain: "distributed-systems",
    motifSignature: ["boundary", "feedback", "terminal_state"],
    nodes: [
      { id: "service", label: "remote dependency boundary", motifs: ["boundary"] },
      { id: "breaker", label: "failure counter and open state", motifs: ["feedback", "terminal_state"] },
    ],
    edges: [{ from: "service", to: "breaker", relation: "requires" }],
    provenance: {
      sourceArtifactIds: ["seed:distributed-systems:circuit-breaker"],
      rationale: "M3-04 hand seed for the distributed-systems side of the twin-domain corpus.",
    },
    richness: "seed",
  });
  const exposureCutoff = artifactOf("pattern", {
    id: "pattern:cooperative-bank-compliance:exposure-cutoff",
    name: "Exposure limit cutoff",
    domain: "cooperative-bank-compliance",
    motifSignature: ["boundary", "feedback", "terminal_state"],
    nodes: [
      { id: "borrower", label: "borrower exposure boundary", motifs: ["boundary"] },
      { id: "cutoff", label: "limit monitor and sanction hold", motifs: ["feedback", "terminal_state"] },
    ],
    edges: [{ from: "borrower", to: "cutoff", relation: "requires" }],
    provenance: {
      sourceArtifactIds: ["seed:cooperative-bank-compliance:exposure-cutoff"],
      rationale: "M3-04 hand seed for the cooperative-bank side of the twin-domain corpus.",
    },
    richness: "seed",
  });
  const staleCache = artifactOf("anti_pattern", {
    id: "anti-pattern:distributed-systems:stale-cache-contract",
    name: "Stale cache contract",
    domain: "distributed-systems",
    failureMode: "Cached authorization state outlives the freshness contract and closes as if current.",
    motifSignature: ["authority", "freshness", "terminal_state"],
    triggeringPatternIds: [circuitBreaker.id],
    nodes: [
      { id: "cache", label: "stale cached authority", motifs: ["authority", "freshness"] },
      { id: "close", label: "success-shaped terminal close", motifs: ["terminal_state"] },
    ],
    edges: [{ from: "cache", to: "close", relation: "causes" }],
    provenance: {
      sourceArtifactIds: ["seed:distributed-systems:stale-cache-contract"],
      rationale: "M3-04 anti-pattern seed for cache freshness transfer review.",
    },
    severity: "high",
  });
  const expiredSanction = artifactOf("anti_pattern", {
    id: "anti-pattern:cooperative-bank-compliance:expired-sanction",
    name: "Expired sanction handling",
    domain: "cooperative-bank-compliance",
    failureMode: "Expired approval evidence is treated as live authority during closure.",
    motifSignature: ["authority", "freshness", "terminal_state"],
    triggeringPatternIds: [exposureCutoff.id],
    nodes: [
      { id: "sanction", label: "expired sanction evidence", motifs: ["authority", "freshness"] },
      { id: "close", label: "loan workflow close", motifs: ["terminal_state"] },
    ],
    edges: [{ from: "sanction", to: "close", relation: "causes" }],
    provenance: {
      sourceArtifactIds: ["seed:cooperative-bank-compliance:expired-sanction"],
      rationale: "M3-04 anti-pattern seed for stale-authority transfer review.",
    },
    severity: "high",
  });

  return {
    id: "m3-04-twin-domain-seed-bundle",
    generatedAt,
    domains: ["distributed-systems", "cooperative-bank-compliance"],
    artifacts: [circuitBreaker, exposureCutoff, staleCache, expiredSanction],
    transferWriteups: [
      {
        id: "transfer:circuit-breaker:exposure-cutoff",
        sourcePatternId: circuitBreaker.id,
        targetPatternId: exposureCutoff.id,
        rationale: "Both patterns gate terminal closure by feedback across a bounded exposure surface.",
        status: "seeded_for_review",
      },
      {
        id: "transfer:stale-cache:expired-sanction",
        sourcePatternId: staleCache.id,
        targetPatternId: expiredSanction.id,
        rationale: "Both failures convert stale authority evidence into an invalid terminal close.",
        status: "seeded_for_review",
      },
    ],
  };
}

function artifactOf(kind: Extract<ArtifactKind, "pattern" | "anti_pattern">, body: ArtifactEnvelope["body"]): ArtifactEnvelope {
  const draft = {
    kind,
    body,
    rulebaseHash: seedRulebaseHash,
    parents: [] as ArtifactId[],
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [],
    createdAt: generatedAt,
  };
}
