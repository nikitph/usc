import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { request as httpRequest } from "node:http";
import { test } from "node:test";

import {
  createDefaultActionGateService,
  createGateServer,
  type ActionGateRequest,
  type StructuredGateLog,
} from "../src/index.ts";

test("should_deny_when_completion_claim_uses_expired_authority", async () => {
  const logs: StructuredGateLog[] = [];
  const service = createDefaultActionGateService((entry) => logs.push(entry));

  const response = await service.handle(expiredAuthorityRequest());

  assert.equal(response.terminalValidity, "invalid");
  assert.equal(response.verdict, "deny");
  assert.ok(response.rationale.some((line) => /authority/i.test(line)));
  assert.ok(response.rationale.some((line) => /expired/i.test(line)));
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.correlationId, response.correlationId);
});

test("should_return_pending_with_budget_gap_when_evidence_times_out", async () => {
  const service = createDefaultActionGateService(() => undefined);

  const response = await service.handle(timeoutRequest());

  assert.equal(response.terminalValidity, "unknown");
  assert.equal(response.verdict, "pending");
  assert.ok(response.gaps.some((gap) => gap.kind === "budget_exhausted"));
});

test("should_replay_same_verdict_artifact_for_idempotent_action", async () => {
  const service = createDefaultActionGateService(() => undefined);
  const first = await service.handle(timeoutRequest());
  const second = await service.handle(timeoutRequest());

  assert.equal(second.verdictArtifactId, first.verdictArtifactId);
  assert.equal(second.actionHash, first.actionHash);
});

test("should_serve_post_action_gate_route", async () => {
  const server = createGateServer(createDefaultActionGateService(() => undefined));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.equal(typeof address, "object");
  assert.notEqual(address, null);
  const port = (address as AddressInfo).port;
  assert.equal(typeof port, "number");

  try {
    const response = await postJson(port as number, timeoutRequest());
    assert.equal(response.verdict, "pending");
  } finally {
    server.close();
    await once(server, "close");
  }
});

function expiredAuthorityRequest(): ActionGateRequest {
  return {
    agentId: "agent-x",
    action: { name: "report_completion", target: "prod-deploy-441", declaredGoal: "close deployment ticket" },
    context: [
      { text: "Deploy pipeline finished: SUCCESS. All 212 tests green. Marking ticket done.", ts: "2026-06-12T10:00:00Z" },
      { text: "Change approval CAB-9913 granted, valid until 2026-06-12T09:00:00Z", ts: "2026-06-11T17:00:00Z" },
    ],
  };
}

function timeoutRequest(): ActionGateRequest {
  return {
    agentId: "agent-y",
    action: { name: "delete_records", target: "customer_table.stale_rows", declaredGoal: "cleanup" },
    context: [{ text: "Retention check service: TIMEOUT after 3 retries", ts: "2026-06-12T10:00:00Z" }],
  };
}

function postJson(port: number, body: ActionGateRequest): Promise<{ readonly verdict: string }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        host: "127.0.0.1",
        port,
        method: "POST",
        path: "/v1/action-gate",
        headers: { "content-type": "application/json" },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as { readonly verdict: string }));
      },
    );
    request.on("error", reject);
    request.write(JSON.stringify(body));
    request.end();
  });
}
