export type ProductRunState = "idle" | "running" | "ready" | "blocked";
export type ExtractorBackend = "deepseek" | "deterministic-test-double";
export type AnalysisMode = "research" | "production";

export interface ProductAnalysisRequest {
  readonly caseText: string;
  readonly caseType: string;
  readonly extractor: ExtractorBackend;
}

export interface ProductGap {
  readonly kind: string;
  readonly description: string;
}

export interface ProductMotifToken {
  readonly id: string;
  readonly motif: string;
  readonly role: string;
  readonly confidence: number;
  readonly domainTerm: string;
  readonly span: {
    readonly start: number;
    readonly end: number;
  };
}

export interface ProductAnalysis {
  readonly caseId: string;
  readonly title: string;
  readonly mode: AnalysisMode;
  readonly extractor: {
    readonly backend: ExtractorBackend;
    readonly version: string;
    readonly configured: boolean;
    readonly experimental: boolean;
  };
  readonly verdict: {
    readonly value: "valid" | "invalid" | "unknown";
    readonly gate: "allow" | "deny" | "pending" | "manual_review" | "retry" | "hold";
  };
  readonly gaps: readonly ProductGap[];
  readonly tokens: readonly ProductMotifToken[];
  readonly recommendations: readonly {
    readonly id: string;
    readonly title: string;
    readonly gain: number;
    readonly status: "candidate" | "ready" | "blocked";
  }[];
  readonly artifactIds: readonly string[];
}

export const sampleRequest: ProductAnalysisRequest = {
  caseType: "incident",
  extractor: "deepseek",
  caseText:
    "A deployment ticket was marked done after the pipeline reported success. The CAB approval had expired an hour before closure, and no one revalidated authority before terminal closure.",
};

export const sampleAnalysis: ProductAnalysis = {
  caseId: "sample-expired-authority",
  title: "Expired authority before terminal closure",
  mode: "research",
  extractor: {
    backend: "deepseek",
    version: "deepseek-motif-extractor-v0",
    configured: true,
    experimental: true,
  },
  verdict: {
    value: "invalid",
    gate: "deny",
  },
  gaps: [
    {
      kind: "below_extraction_bar",
      description: "LLM extraction is research-mode until benchmark calibration exists.",
    },
  ],
  tokens: [
    token("tok-authority", "authority", "explicit", "CAB approval", 0.94, 67, 79),
    token("tok-terminal", "terminal_state", "explicit", "marked done", 0.91, 24, 35),
    token("tok-feedback", "feedback", "implicit", "revalidated", 0.72, 111, 122),
  ],
  recommendations: [
    {
      id: "recommendation:bounded-authority-freshness",
      title: "Require bounded authority freshness before terminal closure",
      gain: 2.5,
      status: "candidate",
    },
  ],
  artifactIds: [
    "source:sample-expired-authority",
    "token_stream:deepseek-research",
    "verdict:invalid-terminal-closure",
  ],
};

export function backendStatus(analysis: ProductAnalysis): string {
  if (!analysis.extractor.configured) return "backend not configured";
  return analysis.extractor.experimental ? "research mode, experimental extraction" : "production calibrated";
}

export function summarizeMotifs(tokens: readonly ProductMotifToken[]): readonly string[] {
  return [...new Set(tokens.map((token) => token.motif))].sort();
}

export function canSubmit(request: ProductAnalysisRequest): boolean {
  return request.caseText.trim().length >= 40 && request.extractor === "deepseek";
}

export function blockedAnalysis(reason: string): ProductAnalysis {
  return {
    caseId: "blocked-local-run",
    title: "Live analysis unavailable",
    mode: "research",
    extractor: {
      backend: "deepseek",
      version: "deepseek-motif-extractor-v0",
      configured: false,
      experimental: true,
    },
    verdict: {
      value: "unknown",
      gate: "pending",
    },
    gaps: [{ kind: "backend_unconfigured", description: reason }],
    tokens: [],
    recommendations: [],
    artifactIds: [],
  };
}

function token(
  id: string,
  motif: string,
  role: string,
  domainTerm: string,
  confidence: number,
  start: number,
  end: number,
): ProductMotifToken {
  return { id, motif, role, domainTerm, confidence, span: { start, end } };
}
