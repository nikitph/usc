// Packet K-06 (Approved-Protected-Change: K-06).
// Packet M1-04 (Approved-Protected-Change: M1-04).
// Discovers adjudicated fixtures, runs implemented runners, and loudly SKIPs
// registered future runners. A fixture may never pass by omission.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { ExtractionCaseSchema, KernelFixtureSchema, TrapFixtureSchema } from "@usc/shared";

import { createDefaultActionGateService } from "../apps/gate/src/index.ts";
import { evaluate } from "../packages/kernel/src/evaluate.ts";
import type { Fact } from "../packages/kernel/src/facts/types.ts";
import { loadRulebase } from "../packages/kernel/src/rulebase/load.ts";

interface RunStats {
  readonly passed: string[];
  readonly skipped: string[];
  readonly failed: string[];
}

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES_ROOT = join(REPO_ROOT, "fixtures");
const rulebase = loadRulebase();

const stats: RunStats = { passed: [], skipped: [], failed: [] };

main().catch((error: unknown) => {
  console.error(errorMessage(error));
  process.exit(1);
});

async function main(): Promise<void> {
  for (const filePath of collectJsonFixtures(FIXTURES_ROOT)) {
    await runFixture(filePath, stats);
  }

  for (const line of stats.passed) console.log(`PASS ${line}`);
  for (const line of stats.skipped) console.warn(`SKIP ${line}`);
  for (const line of stats.failed) console.error(`FAIL ${line}`);

  console.log(
    `fixtures: ${stats.passed.length} passed, ${stats.skipped.length} skipped, ${stats.failed.length} failed`,
  );

  if (stats.failed.length > 0) process.exit(1);
}

function collectJsonFixtures(directory: string): string[] {
  const collected: string[] = [];
  for (const entryName of readdirSync(directory).sort()) {
    const entryPath = join(directory, entryName);
    if (statSync(entryPath).isDirectory()) {
      if (entryName === "_proposed") continue;
      collected.push(...collectJsonFixtures(entryPath));
    } else if (entryName.endsWith(".json")) {
      collected.push(entryPath);
    }
  }
  return collected;
}

async function runFixture(filePath: string, runStats: RunStats): Promise<void> {
  const displayPath = relative(REPO_ROOT, filePath);
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    if (relative(FIXTURES_ROOT, filePath).split(sep).includes("extraction")) {
      ExtractionCaseSchema.parse(parsed);
      runStats.skipped.push(`${displayPath} (extraction scorer lands with K-08)`);
      return;
    }

    const runner = runnerKind(parsed);
    switch (runner) {
      case "kernel":
        runKernelFixture(displayPath, parsed);
        runStats.passed.push(displayPath);
        return;
      case "trap":
        await runTrapFixture(displayPath, parsed);
        runStats.passed.push(displayPath);
        return;
      case "store":
        runStats.skipped.push(`${displayPath} (store runner lands with store packets)`);
        return;
      case "runtime":
        runStats.skipped.push(`${displayPath} (runtime runner lands with runtime packets)`);
        return;
      default:
        throw new FixtureRunnerError(displayPath, `unknown runner kind ${JSON.stringify(runner)}`);
    }
  } catch (error) {
    runStats.failed.push(`${displayPath}: ${errorMessage(error)}`);
  }
}

async function runTrapFixture(displayPath: string, rawFixture: unknown): Promise<void> {
  const fixture = TrapFixtureSchema.parse(rawFixture);
  const service = createDefaultActionGateService(() => undefined);
  const response = await service.handle(fixture.input);
  if (response.terminalValidity !== fixture.expect.terminalValidity) {
    throw new FixtureRunnerError(
      displayPath,
      `expected terminalValidity ${fixture.expect.terminalValidity}, got ${response.terminalValidity}`,
    );
  }
  if (response.verdict !== fixture.expect.verdict) {
    throw new FixtureRunnerError(
      displayPath,
      `expected verdict ${fixture.expect.verdict}, got ${response.verdict}`,
    );
  }
  if (fixture.expect.mustNotContain?.verdict !== undefined && response.verdict === fixture.expect.mustNotContain.verdict) {
    throw new FixtureRunnerError(displayPath, `verdict must not be ${response.verdict}`);
  }
  for (const expectedKind of fixture.expect.gapKinds ?? []) {
    if (!response.gaps.some((gap) => gap.kind === expectedKind)) {
      throw new FixtureRunnerError(
        displayPath,
        `expected gate gap kind ${expectedKind}, got [${response.gaps.map((gap) => gap.kind).join(", ")}]`,
      );
    }
  }
  for (const expectedText of fixture.expect.rationaleMentions ?? []) {
    if (!response.rationale.some((line) => line.toLowerCase().includes(expectedText.toLowerCase()))) {
      throw new FixtureRunnerError(
        displayPath,
        `expected rationale to mention ${JSON.stringify(expectedText)}, got ${JSON.stringify(response.rationale)}`,
      );
    }
  }
}

function runKernelFixture(displayPath: string, rawFixture: unknown): void {
  const fixture = KernelFixtureSchema.parse(rawFixture);
  if (fixture.rulebaseOverride !== undefined) {
    throw new FixtureRunnerError(displayPath, "rulebaseOverride support is not implemented in K-06");
  }
  const facts: Fact[] = [...fixture.facts];
  if (fixture.mode !== undefined) facts.push({ fact: "mode", args: [fixture.mode] });
  const report = evaluate(rulebase, facts);
  const matching = report.verdicts.filter(
    (entry) => entry.check === fixture.expect.check && entry.nodeOrClaim === fixture.expect.nodeOrClaim,
  );
  if (matching.length !== 1) {
    throw new FixtureRunnerError(
      displayPath,
      `expected exactly one ${fixture.expect.check} verdict for ${fixture.expect.nodeOrClaim}, got ${matching.length}`,
    );
  }
  const verdict = matching[0]?.verdict;
  if (verdict === undefined) throw new FixtureRunnerError(displayPath, "matched verdict unexpectedly absent");
  if (verdict.value !== fixture.expect.value) {
    throw new FixtureRunnerError(
      displayPath,
      `expected value ${fixture.expect.value}, got ${verdict.value}`,
    );
  }
  for (const [key, expected] of Object.entries(fixture.expect.bindingsInclude ?? {})) {
    if (verdict.bindings[key] !== expected) {
      throw new FixtureRunnerError(
        displayPath,
        `expected bindings.${key}=${JSON.stringify(expected)}, got ${JSON.stringify(verdict.bindings[key])}`,
      );
    }
  }
  for (const expectedKind of fixture.expect.gapKinds ?? []) {
    if (!(verdict.gaps ?? []).some((gap) => gap.kind === expectedKind)) {
      throw new FixtureRunnerError(
        displayPath,
        `expected gap kind ${expectedKind}, got [${(verdict.gaps ?? []).map((gap) => gap.kind).join(", ")}]`,
      );
    }
  }
}

function runnerKind(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("runner" in value)) return undefined;
  const runner = (value as { readonly runner?: unknown }).runner;
  return typeof runner === "string" ? runner : undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return JSON.stringify(error);
}

class FixtureRunnerError extends Error {
  constructor(filePath: string, message: string) {
    super(`${filePath}: ${message}`);
    this.name = "FixtureRunnerError";
  }
}
