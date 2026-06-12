import { loadRulebase } from "@usc/kernel";
import {
  KeywordExtractionBackend,
  TerminalClaimKeywordDetector,
  createExtractionRegistry,
} from "@usc/runtime";
import { InMemoryArtifactRepository } from "@usc/store";

import { ActionGateService } from "./service.ts";
import type { ActionGateRequest, ActionGateResponse } from "./types.ts";

export interface IncidentHypothesis {
  readonly id: string;
  readonly status: "supported" | "retracted";
  readonly summary: string;
  readonly supports: readonly string[];
}

export interface IncidentWorkflowBundle {
  readonly incidentId: string;
  readonly request: ActionGateRequest;
  readonly response: ActionGateResponse;
  readonly falseTerminalDetected: boolean;
  readonly hypothesisView: readonly IncidentHypothesis[];
  readonly derivationDag: readonly {
    readonly id: string;
    readonly kind: string;
    readonly parents: readonly string[];
    readonly tags: readonly string[];
    readonly extractorVersion?: string;
  }[];
  readonly productionWouldBeInvalid: boolean;
  readonly adjudicationStatus: "proposed";
}

export const goldenIncidentRequest: ActionGateRequest = {
  agentId: "incident-smoke",
  action: {
    name: "report_completion",
    target: "prod-deploy-441",
    declaredGoal: "close deployment ticket",
  },
  context: [
    { text: "Deploy pipeline finished: SUCCESS. All 212 tests green. Marking ticket done.", ts: "2026-06-12T10:00:00Z" },
    { text: "Change approval CAB-9913 granted, valid until 2026-06-12T09:00:00Z", ts: "2026-06-11T17:00:00Z" },
    { text: "Incident note: closure was reported before authority evidence was revalidated.", ts: "2026-06-12T10:05:00Z" },
  ],
};

export async function runIncidentWorkflow(
  request: ActionGateRequest = goldenIncidentRequest,
): Promise<IncidentWorkflowBundle> {
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
  const falseTerminalDetected = response.terminalValidity === "invalid" && response.verdict === "deny";
  return {
    incidentId: "golden-incident-expired-authority",
    request,
    response,
    falseTerminalDetected,
    hypothesisView: [
      {
        id: "h-terminal-success",
        status: falseTerminalDetected ? "retracted" : "supported",
        summary: "surface logs claimed deployment completion was safe",
        supports: ["Deploy pipeline finished: SUCCESS", "Marking ticket done"],
      },
      {
        id: "h-expired-authority",
        status: "supported",
        summary: "authority evidence expired before completion was reported",
        supports: ["CAB-9913 valid until 2026-06-12T09:00:00Z", "completion at 2026-06-12T10:00:00Z"],
      },
    ],
    derivationDag: dag.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      parents: artifact.parents,
      tags: artifact.tags,
      ...(artifact.extractorVersion === undefined ? {} : { extractorVersion: artifact.extractorVersion }),
    })),
    productionWouldBeInvalid: await repository.hasExperimentalAncestor(response.verdictArtifactId),
    adjudicationStatus: "proposed",
  };
}
