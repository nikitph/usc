import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { KernelFixtureSchema } from "@usc/shared";

import { evaluate } from "../src/evaluate.ts";
import type { Fact } from "../src/facts/types.ts";
import { loadRulebase } from "../src/rulebase/load.ts";

// Minimal kernel fixture runner — packet K-04's stated choice for its exit
// criterion ("listed fixtures pass"; the packet allows a minimal runner here
// instead of waiting on K-06). K-06's scripts/run-fixtures.ts supersedes this
// for repo-wide verification; envelopes come from K-02 (@usc/shared), so the
// two runners cannot drift on fixture shape.

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/kernel");
const rulebase = loadRulebase();

for (const fileName of readdirSync(FIXTURES_DIR).filter((name) => name.endsWith(".json")).sort()) {
  const fixture = KernelFixtureSchema.parse(
    JSON.parse(readFileSync(join(FIXTURES_DIR, fileName), "utf8")),
  );
  test(`${fileName}: ${fixture.name}`, () => {
    assert.equal(fixture.rulebaseOverride, undefined, "rulebaseOverride support lands with K-06");
    const facts: Fact[] = [...fixture.facts];
    if (fixture.mode !== undefined) facts.push({ fact: "mode", args: [fixture.mode] });

    const report = evaluate(rulebase, facts);
    const matching = report.verdicts.filter(
      (entry) => entry.check === fixture.expect.check && entry.nodeOrClaim === fixture.expect.nodeOrClaim,
    );
    assert.equal(
      matching.length,
      1,
      `expected exactly one ${fixture.expect.check} verdict for ${fixture.expect.nodeOrClaim}, got ${matching.length}`,
    );
    const { verdict } = matching[0] as (typeof matching)[number];
    assert.equal(verdict.value, fixture.expect.value);
    for (const [key, expected] of Object.entries(fixture.expect.bindingsInclude ?? {})) {
      assert.equal(verdict.bindings[key], expected, `bindings.${key}`);
    }
    for (const expectedKind of fixture.expect.gapKinds ?? []) {
      assert.ok(
        (verdict.gaps ?? []).some((gap) => gap.kind === expectedKind),
        `expected a gap of kind "${expectedKind}", got [${(verdict.gaps ?? []).map((gap) => gap.kind).join(", ")}]`,
      );
    }
  });
}
