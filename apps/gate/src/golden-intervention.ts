import { graftCheck } from "@usc/kernel";
import {
  ComplianceChecklistEmitter,
  EngineeringSpecEmitter,
  RuntimeError,
  createGraftPlanBody,
  feedbackEventArtifact,
  graftPlanArtifact,
  rankRecommendations,
  recommendationArtifact,
  type RuntimeAstNode,
} from "@usc/runtime";
import type { ArtifactEnvelope } from "@usc/store";

import { runIncidentWorkflow } from "./incident-workflow.ts";

export interface GoldenInterventionBundle {
  readonly id: string;
  readonly diagnosisVerdictArtifactId: string;
  readonly recommendationArtifactId: string;
  readonly feedbackArtifactId: string;
  readonly artifacts: readonly ArtifactEnvelope[];
  readonly feedbackOutcome: string;
  readonly adjudicationStatus: "proposed";
}

const rulebaseHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const createdAt = "2026-06-13T00:00:00.000Z";

export async function runGoldenInterventionSmoke(): Promise<GoldenInterventionBundle> {
  const incident = await runIncidentWorkflow();
  const graftPlan = graftPlanArtifact({
    body: createGraftPlanBody({
      id: "graft-plan:expired-authority-feedback",
      baseAst: targetAst(),
      graftCheck: graftCheck({
        facts: [
          { fact: "node", args: ["target"] },
          { fact: "provided_in_scope_chain", args: ["target", "authority"] },
          { fact: "provided_in_scope_chain", args: ["target", "feedback"] },
        ],
        requirements: [
          { id: "requires-authority", patternNodeId: "pattern-close", motif: "authority" },
          { id: "requires-feedback", patternNodeId: "pattern-close", motif: "feedback" },
        ],
        candidates: [{ patternNodeId: "pattern-close", targetNodeId: "target" }],
      }),
      operations: [{ op: "add_claim", nodeId: "target", motif: "authority" }],
    }),
    patternArtifactId: "a".repeat(64),
    targetArtifactId: "b".repeat(64),
    verdictArtifactId: incident.response.verdictArtifactId,
    rulebaseHash,
    createdAt,
  });
  const ranked = rankRecommendations([
    {
      id: "recommendation:golden-expired-authority",
      title: "Add bounded authority freshness check",
      graftPlanArtifactId: graftPlan.id,
      collapsedSymptoms: ["expired_authority", "terminal_overclaim", "missing_revalidation"],
      noveltyScore: 0.9,
      antiPatternWarnings: [{ antiPatternId: "anti-pattern:stale-authority-close", proximity: 0.4, severity: "high" }],
    },
  ]);
  const topRecommendation = ranked[0];
  if (topRecommendation === undefined) {
    throw new RuntimeError("golden intervention smoke requires a ranked recommendation");
  }
  const recommendation = recommendationArtifact({
    rankedRecommendation: topRecommendation,
    rulebaseHash,
    createdAt,
  });
  const emitterInput = {
    recommendationArtifactId: recommendation.id,
    recommendationTitle: String(recommendation.body["title"]),
    collapsedSymptoms: topRecommendation.candidate.collapsedSymptoms,
    antiPatternWarnings: topRecommendation.candidate.antiPatternWarnings.map((warning) => `near anti-pattern: ${warning.antiPatternId}`),
    rulebaseHash,
    createdAt,
  };
  const engineeringSpec = new EngineeringSpecEmitter().emit(emitterInput);
  const complianceChecklist = new ComplianceChecklistEmitter().emit(emitterInput);
  const feedback = feedbackEventArtifact({
    id: "feedback:golden-expired-authority",
    recommendationArtifactId: recommendation.id,
    emittedArtifactIds: [engineeringSpec.id, complianceChecklist.id],
    outcome: "accepted",
    reviewer: "golden-reviewer",
    notes: "expected recommendation addresses expired authority before terminal closure",
    observedAt: createdAt,
    rulebaseHash,
  });

  return {
    id: "golden-diagnose-recommend-feedback",
    diagnosisVerdictArtifactId: incident.response.verdictArtifactId,
    recommendationArtifactId: recommendation.id,
    feedbackArtifactId: feedback.id,
    artifacts: [graftPlan, recommendation, engineeringSpec, complianceChecklist, feedback],
    feedbackOutcome: "accepted",
    adjudicationStatus: "proposed",
  };
}

function targetAst(): RuntimeAstNode {
  return {
    id: "target",
    claims: ["boundary", "feedback"],
    sourceTokenIds: ["golden-target"],
    children: [],
  };
}
