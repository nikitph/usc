import assert from "node:assert/strict";
import { test } from "node:test";

import { runResearchTraceSmoke } from "../src/index.ts";

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
