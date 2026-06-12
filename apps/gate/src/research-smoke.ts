import { loadRulebase } from "@usc/kernel";
import {
  KeywordExtractionBackend,
  TerminalClaimKeywordDetector,
  createExtractionRegistry,
} from "@usc/runtime";
import { InMemoryArtifactRepository } from "@usc/store";

import { ActionGateService } from "./service.ts";
import type { ActionGateRequest, ActionGateResponse } from "./types.ts";

export interface ResearchTraceSmokeBundle {
  readonly traceId: string;
  readonly mode: "research";
  readonly request: ActionGateRequest;
  readonly response: ActionGateResponse;
  readonly derivationDag: readonly {
    readonly id: string;
    readonly kind: string;
    readonly parents: readonly string[];
    readonly tags: readonly string[];
    readonly extractorVersion?: string;
  }[];
  readonly experimentalArtifactIds: readonly string[];
  readonly productionWouldBeInvalid: boolean;
  readonly adjudicationStatus: "proposed";
}

export const localAgentTraceRequest: ActionGateRequest = {
  agentId: "codex-local",
  action: {
    name: "report_completion",
    target: "mvp1-action-gate-slice",
    declaredGoal: "summarize implementation progress through M1-05",
  },
  context: [
    { text: "738693c feat: M1-01 artifact store foundation", ts: "2026-06-13T01:00:00Z" },
    { text: "ad0d575 feat: M1-02 runtime core", ts: "2026-06-13T01:20:00Z" },
    { text: "556f279 feat: M1-03 runtime extraction doubles", ts: "2026-06-13T01:40:00Z" },
    { text: "a146c06 feat: M1-04 action gate API", ts: "2026-06-13T02:00:00Z" },
    { text: "49d9d89 feat: M1-05 gate dashboard UI", ts: "2026-06-13T02:20:00Z" },
  ],
};

export async function runResearchTraceSmoke(
  request: ActionGateRequest = localAgentTraceRequest,
): Promise<ResearchTraceSmokeBundle> {
  const repository = new InMemoryArtifactRepository();
  const registry = createExtractionRegistry();
  registry.register(new KeywordExtractionBackend());
  const service = new ActionGateService({
    repository,
    registry,
    terminalDetector: new TerminalClaimKeywordDetector(),
    rulebase: loadRulebase(),
    createdAt: "2026-06-13T00:00:00.000Z",
    log: () => undefined,
  });
  const response = await service.handle(request);
  const dag = await repository.getDerivationDag(response.verdictArtifactId);
  const experimentalArtifactIds = dag
    .filter((artifact) => artifact.tags.includes("experimental"))
    .map((artifact) => artifact.id)
    .sort();
  return {
    traceId: "local-agent-trace-m1",
    mode: "research",
    request,
    response,
    derivationDag: dag.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      parents: artifact.parents,
      tags: artifact.tags,
      ...(artifact.extractorVersion === undefined ? {} : { extractorVersion: artifact.extractorVersion }),
    })),
    experimentalArtifactIds,
    productionWouldBeInvalid: await repository.hasExperimentalAncestor(response.verdictArtifactId),
    adjudicationStatus: "proposed",
  };
}
