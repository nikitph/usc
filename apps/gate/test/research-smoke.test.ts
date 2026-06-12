import assert from "node:assert/strict";
import { test } from "node:test";

import { runGoldenInterventionSmoke, runIncidentWorkflow, runResearchTraceSmoke } from "../src/index.ts";

test("should_publish_research_trace_smoke_with_experimental_derivation_dag", async () => {
  const bundle = await runResearchTraceSmoke();

  assert.equal(bundle.mode, "research");
  assert.equal(bundle.response.mode, "research");
  assert.equal(bundle.response.verdict, "allow");
  assert.ok(bundle.derivationDag.some((artifact) => artifact.id === bundle.response.verdictArtifactId));
  assert.ok(bundle.derivationDag.some((artifact) => artifact.kind === "token_stream"));
  assert.ok(bundle.experimentalArtifactIds.length >= 1);
  assert.equal(bundle.productionWouldBeInvalid, true);
});

test("should_detect_false_terminal_in_golden_incident_workflow", async () => {
  const bundle = await runIncidentWorkflow();

  assert.equal(bundle.falseTerminalDetected, true);
  assert.equal(bundle.response.terminalValidity, "invalid");
  assert.equal(bundle.response.verdict, "deny");
  assert.ok(bundle.hypothesisView.some((hypothesis) => hypothesis.id === "h-terminal-success" && hypothesis.status === "retracted"));
  assert.ok(bundle.derivationDag.some((artifact) => artifact.id === bundle.response.verdictArtifactId));
  assert.equal(bundle.productionWouldBeInvalid, true);
});

test("should_generate_golden_diagnose_recommend_feedback_smoke", async () => {
  const bundle = await runGoldenInterventionSmoke();

  assert.equal(bundle.feedbackOutcome, "accepted");
  assert.ok(bundle.artifacts.some((artifact) => artifact.kind === "graft_plan"));
  assert.ok(bundle.artifacts.some((artifact) => artifact.id === bundle.recommendationArtifactId && artifact.kind === "recommendation"));
  assert.ok(bundle.artifacts.some((artifact) => artifact.id === bundle.feedbackArtifactId && artifact.kind === "feedback_event"));
  assert.ok(bundle.artifacts.some((artifact) => artifact.parents.includes(bundle.recommendationArtifactId)));
});
