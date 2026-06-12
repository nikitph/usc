import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluate, graftCheck, loadRulebase, type Fact, type MotifName } from "@usc/kernel";
import type { MotifToken } from "@usc/shared/generated";

import {
  applyAstOperations,
  buildProcessIrLite,
  classifyEventText,
  ComplianceChecklistEmitter,
  createGraftPlanBody,
  createCodegenEmitterRegistry,
  EngineeringSpecEmitter,
  feedbackEventArtifact,
  graftPlanArtifact,
  materializeObligationLedger,
  obligationLedgerToFacts,
  parseMotifTokens,
  processIrTerminalClaimFacts,
  rankRecommendations,
  recommendationArtifact,
  runtimeFactsForKernel,
  validateMandatoryRecompile,
  RuntimeError,
  type RuntimeAstNode,
} from "../src/index.ts";

const sourceArtifactId = "source-trace";

test("should_parse_boundary_scope_nesting_from_span_containment", () => {
  const ast = parseMotifTokens(
    [
      token("b1", "boundary", 0, 100, { boundaryRole: "scope_delimiter" }),
      token("state1", "state", 10, 20),
      token("b2", "boundary", 30, 80, { boundaryRole: "scope_delimiter" }),
      token("feedback1", "feedback", 40, 50),
    ],
    { rootId: "trace" },
  );

  assert.deepEqual(ast.claims, []);
  assert.equal(ast.children?.[0]?.id, "scope:b1");
  assert.deepEqual(ast.children?.[0]?.claims, ["boundary", "state"]);
  assert.equal(ast.children?.[0]?.children?.[0]?.id, "scope:b2");
  assert.deepEqual(ast.children?.[0]?.children?.[0]?.claims, ["boundary", "feedback"]);
});

test("should_keep_boundary_concept_reference_as_claim_without_opening_scope", () => {
  const ast = parseMotifTokens(
    [
      token("boundary-concept", "boundary", 0, 8, { boundaryRole: "concept_reference" }),
      token("representation1", "representation", 10, 20),
    ],
    { rootId: "trace" },
  );

  assert.deepEqual(ast.claims, ["boundary", "representation"]);
  assert.equal(ast.children?.length, 0);
});

test("should_map_unknown_event_text_to_observation", () => {
  assert.equal(classifyEventText("noted a possible cleanup in a comment"), "observation");
  assert.equal(classifyEventText("deleted the production cache"), "state_destruction");
});

test("should_materialize_ledger_from_ir_events_only", () => {
  const rulebase = loadRulebase();
  const ir = buildProcessIrLite([
    { id: "event-1", text: "deleted the production cache", sourceTokenIds: ["state1"], terminalClaimId: "claim-1", nodeId: "trace" },
    { id: "event-2", text: "noted a comment", sourceTokenIds: ["state1"], terminalClaimId: "claim-2", nodeId: "trace" },
  ]);

  const ledger = materializeObligationLedger(rulebase, ir, "case-1");

  assert.equal(ledger.length, 1);
  assert.equal(ledger[0]?.claimId, "claim-1");
  assert.equal(ledger[0]?.obligation.type, "evidence");
  assert.equal(ledger[0]?.obligation.status, "unknown");
});

test("should_emit_structured_facts_consumable_by_kernel_evaluate", () => {
  const rulebase = loadRulebase();
  const ast = parseMotifTokens([token("terminal", "terminal_state", 0, 20)], { rootId: "trace" });
  const ir = buildProcessIrLite([
    { id: "event-1", text: "deleted the production cache", sourceTokenIds: ["terminal"], terminalClaimId: "claim-1", nodeId: "trace" },
  ]);
  const ledger = materializeObligationLedger(rulebase, ir, "case-1");
  const facts = flattenFacts(runtimeFactsForKernel(ast, ir, ledger));

  const report = evaluate(rulebase, facts);
  const verdict = report.verdicts.find(
    (entry) => entry.check === "terminal_validity" && entry.nodeOrClaim === "claim-1",
  );

  assert.equal(verdict?.verdict.value, "unknown");
  assert.deepEqual(processIrTerminalClaimFacts(ir), [{ fact: "terminal_claim", args: ["claim-1", "trace"] }]);
  assert.equal(obligationLedgerToFacts(ledger).length, 1);
});

test("should_apply_ast_operations_and_recompile_graft_plan_body", () => {
  const baseAst = runtimeAst();
  const graftCheckResult = graftCheck({
    facts: [
      { fact: "node", args: ["target"] },
      { fact: "provided_in_scope_chain", args: ["target", "authority"] },
    ],
    requirements: [{ id: "requires-authority", patternNodeId: "pattern-close", motif: "authority" }],
    candidates: [{ patternNodeId: "pattern-close", targetNodeId: "target" }],
  });

  const body = createGraftPlanBody({
    id: "graft-plan:test",
    baseAst,
    graftCheck: graftCheckResult,
    operations: [{ op: "add_claim", nodeId: "target", motif: "authority" }],
  });
  const modifiedAst = applyAstOperations(baseAst, body.operations);

  assert.equal(body.status, "graftable");
  assert.equal(body.recompile.status, "passed");
  assert.notEqual(body.recompile.beforeFactsHash, body.recompile.afterFactsHash);
  assert.deepEqual(modifiedAst.claims, ["authority", "boundary"]);
});

test("should_build_graft_plan_artifact_with_required_parent_links", () => {
  const body = createGraftPlanBody({
    id: "graft-plan:test",
    baseAst: runtimeAst(),
    graftCheck: graftCheck({
      facts: [
        { fact: "node", args: ["target"] },
        { fact: "provided_in_scope_chain", args: ["target", "authority"] },
      ],
      requirements: [{ id: "requires-authority", patternNodeId: "pattern-close", motif: "authority" }],
      candidates: [{ patternNodeId: "pattern-close", targetNodeId: "target" }],
    }),
    operations: [{ op: "add_claim", nodeId: "target", motif: "authority" }],
  });

  const artifact = graftPlanArtifact({
    body,
    patternArtifactId: "b".repeat(64),
    targetArtifactId: "a".repeat(64),
    verdictArtifactId: "c".repeat(64),
    rulebaseHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    createdAt: "2026-06-13T00:00:00.000Z",
  });

  assert.equal(artifact.kind, "graft_plan");
  assert.deepEqual(artifact.parents, ["a".repeat(64), "b".repeat(64), "c".repeat(64)]);
});

test("should_reject_graft_plan_when_recompile_hash_is_missing", () => {
  const body = createGraftPlanBody({
    id: "graft-plan:test",
    baseAst: runtimeAst(),
    graftCheck: graftCheck({
      facts: [
        { fact: "node", args: ["target"] },
        { fact: "provided_in_scope_chain", args: ["target", "authority"] },
      ],
      requirements: [{ id: "requires-authority", patternNodeId: "pattern-close", motif: "authority" }],
      candidates: [{ patternNodeId: "pattern-close", targetNodeId: "target" }],
    }),
    operations: [{ op: "add_claim", nodeId: "target", motif: "authority" }],
  });

  assert.throws(
    () => validateMandatoryRecompile({ ...body, recompile: { ...body.recompile, afterFactsHash: "" } }),
    RuntimeError,
  );
});

test("should_rank_recommendations_by_multi_symptom_collapse", () => {
  const ranked = rankRecommendations([
    {
      id: "recommendation:single",
      title: "Patch missing feedback",
      graftPlanArtifactId: "a".repeat(64),
      collapsedSymptoms: ["missing_feedback"],
      noveltyScore: 0.9,
      antiPatternWarnings: [],
    },
    {
      id: "recommendation:collapse",
      title: "Add bounded feedback authority",
      graftPlanArtifactId: "b".repeat(64),
      collapsedSymptoms: ["missing_feedback", "stale_authority", "terminal_overclaim"],
      noveltyScore: 0.8,
      antiPatternWarnings: [{ antiPatternId: "anti-pattern:stale-authority", proximity: 0.5, severity: "medium" }],
    },
  ]);

  assert.equal(ranked[0]?.candidate.id, "recommendation:collapse");
  assert.equal(ranked[0]?.rank, 1);
  assert.equal(ranked[0]?.diagnosisInformationGain, 2.35);
});

test("should_create_recommendation_artifact_with_rank_and_warnings", () => {
  const ranked = rankRecommendations([
    {
      id: "recommendation:collapse",
      title: "Add bounded feedback authority",
      graftPlanArtifactId: "b".repeat(64),
      collapsedSymptoms: ["terminal_overclaim", "missing_feedback"],
      noveltyScore: 0.75,
      antiPatternWarnings: [{ antiPatternId: "anti-pattern:stale-authority", proximity: 0.6, severity: "high" }],
    },
  ]);
  const topRecommendation = ranked[0];
  assert.ok(topRecommendation !== undefined);

  const artifact = recommendationArtifact({
    rankedRecommendation: topRecommendation,
    rulebaseHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    createdAt: "2026-06-13T00:00:00.000Z",
  });

  assert.equal(artifact.kind, "recommendation");
  assert.deepEqual(artifact.parents, ["b".repeat(64)]);
  assert.equal(artifact.body["diagnosisInformationGainRank"], 1);
  assert.equal(artifact.body["emitterReady"], false);
});

test("should_emit_engineering_spec_artifact_with_recommendation_provenance", () => {
  const registry = createCodegenEmitterRegistry();
  registry.register(new EngineeringSpecEmitter());
  const artifact = registry.get("engineering_spec").emit(emitterInput());

  assert.equal(artifact.kind, "recommendation");
  assert.deepEqual(artifact.parents, ["d".repeat(64)]);
  assert.equal(artifact.body["target"], "engineering_spec");
  assert.equal(artifact.body["autoApplied"], false);
  assert.match(String(artifact.body["content"]), /Acceptance Checks/);
});

test("should_emit_compliance_checklist_with_anti_pattern_warnings", () => {
  const registry = createCodegenEmitterRegistry();
  registry.register(new ComplianceChecklistEmitter());
  const artifact = registry.get("compliance_checklist").emit(emitterInput());

  assert.equal(artifact.body["target"], "compliance_checklist");
  assert.match(String(artifact.body["content"]), /near anti-pattern/);
});

test("should_reject_duplicate_codegen_emitter_registration", () => {
  const registry = createCodegenEmitterRegistry();
  registry.register(new EngineeringSpecEmitter());

  assert.throws(() => registry.register(new EngineeringSpecEmitter()), RuntimeError);
});

test("should_capture_recommendation_feedback_event_with_outcome_links", () => {
  const feedback = feedbackEventArtifact({
    id: "feedback:golden-incident",
    recommendationArtifactId: "d".repeat(64),
    emittedArtifactIds: ["e".repeat(64), "f".repeat(64)],
    outcome: "accepted",
    reviewer: "golden-reviewer",
    notes: "recommendation matched expected expired-authority diagnosis",
    observedAt: "2026-06-13T00:00:00.000Z",
    rulebaseHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  });

  assert.equal(feedback.kind, "feedback_event");
  assert.deepEqual(feedback.parents, ["d".repeat(64), "e".repeat(64), "f".repeat(64)]);
  assert.equal(feedback.body["outcome"], "accepted");
});

function token(
  id: string,
  motif: MotifName,
  start: number,
  end: number,
  options: { readonly boundaryRole?: "scope_delimiter" | "concept_reference" } = {},
): MotifToken {
  const base = {
    id,
    motif,
    evidence: [
      {
        sourceArtifactId,
        span: { start, end },
        extractionMethod: "deterministic" as const,
      },
    ],
    confidence: 1,
    role: "explicit" as const,
    domainTerm: motif,
    extractorVersion: "test-parser-v1",
  };
  return options.boundaryRole === undefined ? base : { ...base, boundaryRole: options.boundaryRole };
}

function flattenFacts(parts: {
  readonly astFacts: readonly Fact[];
  readonly terminalClaimFacts: readonly Fact[];
  readonly obligationFacts: readonly Fact[];
}): readonly Fact[] {
  return [...parts.astFacts, ...parts.terminalClaimFacts, ...parts.obligationFacts];
}

function runtimeAst(): RuntimeAstNode {
  return {
    id: "target",
    claims: ["boundary"],
    sourceTokenIds: ["boundary-token"],
    children: [],
  };
}

function emitterInput() {
  return {
    recommendationArtifactId: "d".repeat(64),
    recommendationTitle: "Add bounded feedback authority",
    collapsedSymptoms: ["missing_feedback", "terminal_overclaim"],
    antiPatternWarnings: ["near anti-pattern: stale authority close"],
    rulebaseHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    createdAt: "2026-06-13T00:00:00.000Z",
  };
}
