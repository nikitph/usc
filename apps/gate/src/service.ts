import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import {
  evaluate,
  loadRulebase,
  type CheckVerdict,
  type EvidenceGap,
  type Fact,
  type Rulebase,
} from "@usc/kernel";
import {
  DeterministicTextEvidenceSource,
  KeywordExtractionBackend,
  TerminalClaimKeywordDetector,
  buildProcessIrLite,
  createExtractionRegistry,
  evidenceGapsForLedger,
  materializeObligationLedger,
  parseMotifTokens,
  resolveLedgerWithEvidence,
  runtimeFactsForKernel,
  type CandidateTerminalClaim,
  type ExtractionRegistry,
  type LedgerEntry,
  type ProcessIrLite,
  type RuntimeAstNode,
  type TerminalClaimDetector,
} from "@usc/runtime";
import {
  InMemoryArtifactRepository,
  computeArtifactId,
  type ArtifactEnvelope,
  type ArtifactRepository,
} from "@usc/store";
import { canonicalJson, sha256Hex } from "@usc/shared/hashing";

import type {
  ActionGateRequest,
  ActionGateResponse,
  GateVerdict,
  StructuredGateLog,
} from "./types.ts";

interface ActionGateServiceOptions {
  readonly repository: ArtifactRepository;
  readonly registry: ExtractionRegistry;
  readonly terminalDetector: TerminalClaimDetector;
  readonly rulebase: Rulebase;
  readonly createdAt: string;
  readonly log?: (entry: StructuredGateLog) => void;
}

export class ActionGateService {
  readonly #repository: ArtifactRepository;
  readonly #registry: ExtractionRegistry;
  readonly #terminalDetector: TerminalClaimDetector;
  readonly #rulebase: Rulebase;
  readonly #createdAt: string;
  readonly #cache = new Map<string, ActionGateResponse>();
  readonly #log: (entry: StructuredGateLog) => void;

  constructor(options: ActionGateServiceOptions) {
    this.#repository = options.repository;
    this.#registry = options.registry;
    this.#terminalDetector = options.terminalDetector;
    this.#rulebase = options.rulebase;
    this.#createdAt = options.createdAt;
    this.#log = options.log ?? ((entry) => console.log(JSON.stringify(entry)));
  }

  async handle(request: ActionGateRequest): Promise<ActionGateResponse> {
    const actionHash = sha256Hex(canonicalJson(request.action));
    const cacheKey = `${request.agentId}:${actionHash}`;
    const cached = this.#cache.get(cacheKey);
    if (cached !== undefined) return cached;
    const correlationId = request.correlationId ?? `corr_${actionHash.slice(0, 16)}`;
    try {
      const response = await this.#runPipeline(request, actionHash, correlationId);
      this.#cache.set(cacheKey, response);
      this.#emitLog(response);
      return response;
    } catch (error) {
      const response = await this.#pendingOnError(request, actionHash, correlationId, error);
      this.#cache.set(cacheKey, response);
      this.#emitLog(response);
      return response;
    }
  }

  async #runPipeline(
    request: ActionGateRequest,
    actionHash: string,
    correlationId: string,
  ): Promise<ActionGateResponse> {
    const source = await this.#putArtifact("source", {
      request,
      sourceText: sourceTextFor(request),
    }, []);
    const lexer = await import("@usc/runtime").then((runtime) =>
      runtime.runLexer({
        repository: this.#repository,
        registry: this.#registry,
        backendName: "keyword-test-double",
        sourceText: sourceTextFor(request),
        sourceArtifactId: source.id,
        rulebaseHash: this.#rulebase.hash,
        sampleCount: 1,
        createdAt: this.#createdAt,
        createdBy: "gate",
      }),
    );
    const ast = parseMotifTokens(lexer.tokens, { rootId: "action" });
    const claims = terminalClaimsFor(request, this.#terminalDetector, source.id, actionHash);
    const ir = processIrFor(request, claims);
    const ledger = resolveLedgerWithEvidence(
      materializeObligationLedger(this.#rulebase, ir, actionHash),
      new DeterministicTextEvidenceSource(),
      contextTextsFor(request),
      observedAtFor(request),
    );
    const facts = factsForKernel(ast, ir, ledger);
    const terminalVerdict = terminalVerdictFor(evaluate(this.#rulebase, facts).verdicts, claims[0]?.id);
    const gateVerdict = gateVerdictFor(terminalVerdict, ledger);
    const gaps = gapsFor(terminalVerdict, ledger);
    const rationale = rationaleFor(gateVerdict, terminalVerdict, ledger);
    const verdictArtifact = await this.#putArtifact("verdict", {
      check: "action_gate",
      terminalValidity: terminalVerdict.verdict.value,
      verdict: gateVerdict,
      rationale,
      gaps,
      correlationId,
    }, [lexer.tokenStreamArtifact.id]);

    return {
      correlationId,
      verdict: gateVerdict,
      terminalValidity: terminalVerdict.verdict.value,
      verdictArtifactId: verdictArtifact.id,
      mode: "research",
      actionHash,
      rationale,
      gaps,
    };
  }

  async #pendingOnError(
    request: ActionGateRequest,
    actionHash: string,
    correlationId: string,
    error: unknown,
  ): Promise<ActionGateResponse> {
    const gap: EvidenceGap = {
      kind: "missing_evidence",
      description: `internal_error: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
    };
    const verdictArtifact = await this.#putArtifact("verdict", {
      check: "action_gate",
      terminalValidity: "unknown",
      verdict: "pending",
      rationale: ["internal error converted to pending", gap.description],
      gaps: [gap],
      correlationId,
      request,
    }, []);
    return {
      correlationId,
      verdict: "pending",
      terminalValidity: "unknown",
      verdictArtifactId: verdictArtifact.id,
      mode: "research",
      actionHash,
      rationale: ["internal error converted to pending", gap.description],
      gaps: [gap],
    };
  }

  async #putArtifact(
    kind: ArtifactEnvelope["kind"],
    body: ArtifactEnvelope["body"],
    parents: readonly string[],
  ): Promise<ArtifactEnvelope> {
    const draft = { kind, body, rulebaseHash: this.#rulebase.hash, parents: [...parents] };
    return this.#repository.putArtifact({
      id: computeArtifactId(draft),
      ...draft,
      tags: ["experimental"],
      createdAt: this.#createdAt,
    }, "gate");
  }

  #emitLog(response: ActionGateResponse): void {
    this.#log({
      correlationId: response.correlationId,
      actionHash: response.actionHash,
      verdict: response.verdict,
      terminalValidity: response.terminalValidity,
      verdictArtifactId: response.verdictArtifactId,
    });
  }
}

export function createDefaultActionGateService(log?: (entry: StructuredGateLog) => void): ActionGateService {
  const registry = createExtractionRegistry();
  registry.register(new KeywordExtractionBackend());
  return new ActionGateService({
    repository: new InMemoryArtifactRepository(),
    registry,
    terminalDetector: new TerminalClaimKeywordDetector(),
    rulebase: loadRulebase(),
    createdAt: "2026-06-13T00:00:00.000Z",
    ...(log === undefined ? {} : { log }),
  });
}

export function createGateServer(service = createDefaultActionGateService()): Server {
  return createServer((request, response) => {
    void routeRequest(service, request, response);
  });
}

async function routeRequest(
  service: ActionGateService,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "POST" || request.url !== "/v1/action-gate") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  const body = await readBody(request);
  const gateResponse = await service.handle(JSON.parse(body) as ActionGateRequest);
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(gateResponse));
}

function sourceTextFor(request: ActionGateRequest): string {
  return [
    request.action.name,
    request.action.target,
    request.action.declaredGoal,
    ...request.context.map((entry) => entry.text),
  ].join("\n");
}

function contextTextsFor(request: ActionGateRequest): readonly string[] {
  return [request.action.name, request.action.target, request.action.declaredGoal, ...request.context.map((entry) => entry.text)];
}

function terminalClaimsFor(
  request: ActionGateRequest,
  detector: TerminalClaimDetector,
  sourceArtifactId: string,
  actionHash: string,
): readonly CandidateTerminalClaim[] {
  const detected = detector.detect(sourceTextFor(request), sourceArtifactId);
  if (detected.length > 0) return detected;
  return [{
    id: `claim_${actionHash.slice(0, 16)}`,
    text: request.action.name,
    sourceArtifactId,
    span: { start: 0, end: request.action.name.length },
  }];
}

function processIrFor(request: ActionGateRequest, claims: readonly CandidateTerminalClaim[]): ProcessIrLite {
  const terminalClaimId = claims[0]?.id ?? `claim_${sha256Hex(canonicalJson(request.action)).slice(0, 16)}`;
  return buildProcessIrLite([
    {
      id: "event_action",
      text: `${request.action.name} ${request.action.target} ${request.action.declaredGoal}`,
      sourceTokenIds: ["action"],
      terminalClaimId,
      nodeId: "action",
    },
    ...request.context.map((entry, index) => ({
      id: `event_context_${index}`,
      text: entry.text,
      sourceTokenIds: [`context_${index}`],
      terminalClaimId,
      nodeId: "action",
    })),
  ]);
}

function observedAtFor(request: ActionGateRequest): string {
  return [...request.context]
    .map((entry) => entry.ts)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? "2026-06-13T00:00:00.000Z";
}

function factsForKernel(
  ast: RuntimeAstNode,
  ir: ProcessIrLite,
  ledger: readonly LedgerEntry[],
): readonly Fact[] {
  const factParts = runtimeFactsForKernel(ast, ir, ledger);
  return [...factParts.astFacts, ...factParts.terminalClaimFacts, ...factParts.obligationFacts];
}

function terminalVerdictFor(
  verdicts: readonly CheckVerdict[],
  claimId: string | undefined,
): CheckVerdict {
  const terminal = verdicts.find(
    (entry) => entry.check === "terminal_validity" && (claimId === undefined || entry.nodeOrClaim === claimId),
  );
  if (terminal === undefined) {
    return {
      check: "terminal_validity",
      nodeOrClaim: claimId ?? "unknown",
      verdict: {
        value: "unknown",
        rule: "terminal_validity",
        bindings: {},
        evidence: [],
        gaps: [{ kind: "missing_evidence", description: "terminal claim was not produced" }],
        kernelVersion: loadRulebase().hash,
      },
    };
  }
  return terminal;
}

function gateVerdictFor(terminal: CheckVerdict, ledger: readonly LedgerEntry[]): GateVerdict {
  if (terminal.verdict.value === "valid") return "allow";
  const violated = ledger.find((entry) => entry.obligation.status === "violated");
  if (violated !== undefined) return violated.obligation.safeDefault;
  const unknown = ledger.find((entry) => entry.obligation.status === "unknown");
  return unknown?.obligation.safeDefault ?? "pending";
}

function gapsFor(
  terminal: CheckVerdict,
  ledger: readonly LedgerEntry[],
): readonly EvidenceGap[] {
  return terminal.verdict.value === "unknown" ? evidenceGapsForLedger(ledger) : terminal.verdict.gaps ?? [];
}

function rationaleFor(
  gateVerdict: GateVerdict,
  terminal: CheckVerdict,
  ledger: readonly LedgerEntry[],
): readonly string[] {
  const violated = ledger.find((entry) => entry.obligation.status === "violated");
  if (violated !== undefined) {
    return [`${violated.obligation.type} obligation violated`, "approval evidence expired before execution"];
  }
  return [`terminal_validity=${terminal.verdict.value}`, `verdict=${gateVerdict}`];
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}
