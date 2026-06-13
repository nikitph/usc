// Packet K-02 (Approved-Protected-Change: K-02).
// Validates every fixture under fixtures/ (or a directory passed as argv[2])
// against the runner-specific envelopes in packages/shared/src/fixture-envelopes.ts,
// which embed the GENERATED Zod schemas (INV-9). Failure modes are exhaustive:
// unparseable JSON, unknown runner kind, runner kind whose envelope packet has
// not landed, or schema mismatch — nothing validates by default (INV-8).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { register } from "tsx/esm/api";

register();
const envelopes = await import("../packages/shared/src/fixture-envelopes.ts");

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesRoot = process.argv[2] ?? join(REPO_ROOT, "fixtures");

/** Runner kinds declared in fixtures/README.md but whose envelope packet has not landed yet. */
const ENVELOPE_PENDING_PACKET = { store: "store packets" };

function collectFixtureFiles(directory) {
  const collected = [];
  for (const entryName of readdirSync(directory).sort()) {
    const entryPath = join(directory, entryName);
    if (statSync(entryPath).isDirectory()) {
      if (entryName === "_proposed") continue; // human adjudication queue, not live ground truth
      collected.push(...collectFixtureFiles(entryPath));
    } else if (entryName.endsWith(".json")) {
      collected.push(entryPath);
    }
  }
  return collected;
}

function envelopeFor(filePath, fixture) {
  const isExtractionCase = relative(fixturesRoot, filePath).split(sep).includes("extraction");
  if (isExtractionCase) return { schema: envelopes.ExtractionCaseSchema, failure: null };
  const runner = fixture?.runner;
  if (runner === "kernel") return { schema: envelopes.KernelFixtureSchema, failure: null };
  if (runner === "trap") return { schema: envelopes.TrapFixtureSchema, failure: null };
  if (runner === "runtime") return { schema: envelopes.RuntimeFixtureSchema, failure: null };
  if (runner === "pattern") return { schema: envelopes.PatternFixtureSchema, failure: null };
  if (runner === "intervention") return { schema: envelopes.InterventionFixtureSchema, failure: null };
  if (runner in ENVELOPE_PENDING_PACKET) {
    return { schema: null, failure: `runner "${runner}" has no envelope yet (lands with ${ENVELOPE_PENDING_PACKET[runner]}) — extend fixture-envelopes.ts there` };
  }
  return { schema: null, failure: `unknown runner kind ${JSON.stringify(runner)} (declared kinds: ${envelopes.DECLARED_RUNNER_KINDS.join(", ")})` };
}

const failures = [];
const fixtureFiles = collectFixtureFiles(fixturesRoot);
if (fixtureFiles.length === 0) {
  console.error(`✗ no fixture files found under ${fixturesRoot}`);
  process.exit(1);
}

for (const filePath of fixtureFiles) {
  const displayPath = relative(process.cwd(), filePath);
  let fixture;
  try {
    fixture = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (parseError) {
    failures.push(`${displayPath}: unparseable JSON — ${parseError.message}`);
    continue;
  }
  const { schema, failure } = envelopeFor(filePath, fixture);
  if (failure !== null) {
    failures.push(`${displayPath}: ${failure}`);
    continue;
  }
  const validation = schema.safeParse(fixture);
  if (!validation.success) {
    const issueLines = validation.error.issues.map(
      (issue) => `    ${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.message}`,
    );
    failures.push(`${displayPath}:\n${issueLines.join("\n")}`);
  }
}

if (failures.length > 0) {
  console.error(`✗ ${failures.length} of ${fixtureFiles.length} fixture file(s) failed schema validation:\n`);
  for (const failureReport of failures) console.error(`  ${failureReport}\n`);
  process.exit(1);
}
console.log(`✓ ${fixtureFiles.length} fixture file(s) validate against generated schemas`);
