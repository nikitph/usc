import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dashboardMetrics,
  patternReviewMetrics,
  patternReviewRows,
  reviewStateClass,
  retrievalRows,
  topRetrievalRows,
  trapRuns,
  verdictClass,
  type TrapRun,
} from "../src/dashboard.ts";

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
