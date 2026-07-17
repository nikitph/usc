import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dashboardMetrics,
  feedbackOutcomeCounts,
  feedbackSummaryRows,
  patternReviewMetrics,
  patternReviewRows,
  orderedRecommendationRows,
  recommendationRows,
  reviewStateClass,
  retrievalRows,
  topRetrievalRows,
  trapRuns,
  verdictClass,
  type TrapRun,
} from "../src/dashboard.ts";
import {
  backendStatus,
  blockedAnalysis,
  canSubmit,
  sampleAnalysis,
  sampleRequest,
  summarizeMotifs,
} from "../src/lib/product-analysis.ts";

test("should_reflect_current_trap_fixture_results", () => {
  const metrics = dashboardMetrics(trapRuns);

  assert.equal(metrics.total, 2);
  assert.equal(metrics.passing, 2);
  assert.equal(metrics.overconfidentClosure, 0);
  assert.equal(metrics.overcautiousNonClosure, 0);
  assert.equal(metrics.falseTerminalDetections, 1);
});

test("should_count_overconfident_closure_when_gate_allows_unsafe_trap", () => {
  const unsafeAllow: TrapRun = {
    ...trapRuns[0] as TrapRun,
    actual: { terminalValidity: "valid", verdict: "allow" },
  };

  assert.equal(dashboardMetrics([unsafeAllow]).overconfidentClosure, 1);
});

test("should_map_verdict_classes_for_dashboard_badges", () => {
  assert.equal(verdictClass("allow"), "ok");
  assert.equal(verdictClass("deny"), "bad");
  assert.equal(verdictClass("pending"), "warn");
});

test("should_summarize_pattern_review_queue_states", () => {
  assert.deepEqual(patternReviewMetrics(patternReviewRows), { pending: 1, accepted: 1, rejected: 1 });
});

test("should_map_review_state_classes_for_dashboard_badges", () => {
  assert.equal(reviewStateClass("accepted"), "ok");
  assert.equal(reviewStateClass("pending"), "warn");
  assert.equal(reviewStateClass("rejected"), "bad");
});

test("should_sort_read_only_retrieval_rows_by_score", () => {
  assert.deepEqual(
    topRetrievalRows(retrievalRows, 2).map((row) => row.id),
    ["transfer:circuit-breaker:exposure-cutoff", "transfer:stale-cache:expired-sanction"],
  );
});

test("should_order_recommendation_rows_by_diagnosis_gain_rank", () => {
  assert.deepEqual(
    orderedRecommendationRows(recommendationRows).map((row) => row.id),
    ["recommendation:bounded-feedback-authority", "recommendation:patch-feedback"],
  );
});

test("should_count_feedback_outcomes_for_dashboard_summary", () => {
  assert.equal(feedbackOutcomeCounts(feedbackSummaryRows).accepted, 1);
  assert.equal(feedbackOutcomeCounts(feedbackSummaryRows).failed, 0);
});

test("should_keep_product_submit_path_on_deepseek_only", () => {
  assert.equal(canSubmit(sampleRequest), true);
  assert.equal(canSubmit({ ...sampleRequest, extractor: "deterministic-test-double" }), false);
  assert.equal(canSubmit({ ...sampleRequest, caseText: "too short" }), false);
});

test("should_summarize_product_motifs_and_backend_status", () => {
  assert.deepEqual(summarizeMotifs(sampleAnalysis.tokens), ["authority", "feedback", "terminal_state"]);
  assert.equal(backendStatus(sampleAnalysis), "research mode, experimental extraction");
  assert.equal(backendStatus(blockedAnalysis("missing env")), "backend not configured");
});
