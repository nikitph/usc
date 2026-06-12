import { canonicalJson, sha256Hex } from "@usc/shared/hashing";
import { MotifObligationSchema, MotifTokenSchema } from "@usc/shared/generated";

import collisionsJson from "../../rulebase/collisions.json" with { type: "json" };
import compositionJson from "../../rulebase/composition.json" with { type: "json" };
import diagnosticsJson from "../../rulebase/diagnostics.json" with { type: "json" };
import facetsJson from "../../rulebase/facets.json" with { type: "json" };
import motifsJson from "../../rulebase/motifs.json" with { type: "json" };
import obligationRulesJson from "../../rulebase/obligation_rules.json" with { type: "json" };

import { RulebaseConflictError, SchemaValidationError } from "../errors.ts";
import {
  PROCESS_IR_EVENT_TYPES,
  SEMANTIC_CHECK_IDS,
  type MotifName,
  type Rulebase,
  type RulebaseHash,
} from "./types.ts";

/** Vocabularies owned by schemas/ (INV-9): never re-declared here. */
const MOTIF_NAMES = new Set<string>(MotifTokenSchema.innerType().shape.motif.options);
const OBLIGATION_TYPES = new Set<string>(MotifObligationSchema.shape.type.options);
const SAFE_DEFAULTS = new Set<string>(MotifObligationSchema.shape.safeDefault.options);
const EVENT_TYPES = new Set<string>(PROCESS_IR_EVENT_TYPES);

const HUB_COUNT = 6; // paper §4.1

/**
 * Validates the six rulebase files against each other and the schema-owned
 * vocabularies, deep-freezes the result, and computes rulebaseHash =
 * sha256(canonicalJson of the six files keyed by sorted basename) via the
 * single shared hash path (specs/kernel/SPEC.md §3).
 */
export function loadRulebase(): Rulebase {
  const motifs = validateMotifs(motifsJson);
  const { requires, emergentComposites } = validateComposition(compositionJson);
  const collisions = validateCollisions(collisionsJson);
  const { eventTypes, obligationRules, terminalClaimObligationTypes } =
    validateObligationRules(obligationRulesJson);
  const { semanticChecks, diagnosticPasses } = validateDiagnostics(diagnosticsJson);
  const facets = validateFacets(facetsJson);

  const hash = sha256Hex(
    canonicalJson({
      "collisions.json": collisionsJson,
      "composition.json": compositionJson,
      "diagnostics.json": diagnosticsJson,
      "facets.json": facetsJson,
      "motifs.json": motifsJson,
      "obligation_rules.json": obligationRulesJson,
    }),
  ) as RulebaseHash;
  return deepFreeze({
    hash,
    motifs,
    requires,
    emergentComposites,
    collisions,
    eventTypes,
    obligationRules,
    terminalClaimObligationTypes,
    semanticChecks,
    diagnosticPasses,
    facets,
  });
}

function fail(file: string, message: string): never {
  throw new SchemaValidationError(file, message);
}

function conflict(file: string, message: string): never {
  throw new RulebaseConflictError(file, message);
}

function requireMotifName(file: string, value: unknown, where: string): MotifName {
  if (typeof value !== "string" || !MOTIF_NAMES.has(value)) {
    fail(file, `${where}: ${JSON.stringify(value)} is not a motif name from schemas/motif_token.schema.json`);
  }
  return value as MotifName;
}

function requireNonEmptyString(file: string, value: unknown, where: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(file, `${where}: expected non-empty string, got ${JSON.stringify(value)}`);
  }
  return value;
}

function validateMotifs(raw: typeof motifsJson): Rulebase["motifs"] {
  const file = "motifs.json";
  if (raw.motifs.length !== MOTIF_NAMES.size) {
    fail(file, `expected ${MOTIF_NAMES.size} motifs, found ${raw.motifs.length}`);
  }
  const seenIds = new Set<number>();
  const seenNames = new Set<string>();
  let hubCount = 0;
  for (const motif of raw.motifs) {
    const name = requireMotifName(file, motif.name, `motif id ${motif.id}`);
    if (!Number.isInteger(motif.id) || motif.id < 1 || motif.id > 32) {
      fail(file, `motif "${name}": id ${motif.id} outside 1..32`);
    }
    if (seenIds.has(motif.id)) conflict(file, `duplicate motif id ${motif.id}`);
    if (seenNames.has(name)) conflict(file, `duplicate motif name "${name}"`);
    seenIds.add(motif.id);
    seenNames.add(name);
    if (!["A", "B", "C", "D", "E", "F"].includes(motif.group)) {
      fail(file, `motif "${name}": unknown group "${motif.group}"`);
    }
    requireNonEmptyString(file, motif.question, `motif "${name}" question`);
    requireNonEmptyString(file, motif.definition, `motif "${name}" definition`);
    requireNonEmptyString(file, motif.provenance, `motif "${name}" provenance`);
    if (typeof motif.hub !== "boolean") fail(file, `motif "${name}": hub must be boolean`);
    if (motif.hub) hubCount += 1;
  }
  if (hubCount !== HUB_COUNT) {
    conflict(file, `expected exactly ${HUB_COUNT} hub motifs (paper §4.1), found ${hubCount}`);
  }
  return raw.motifs as Rulebase["motifs"];
}

function validateComposition(raw: typeof compositionJson): {
  requires: Rulebase["requires"];
  emergentComposites: Rulebase["emergentComposites"];
} {
  const file = "composition.json";
  const seenComposites = new Set<string>();
  for (const requirement of raw.requires) {
    const motif = requireMotifName(file, requirement.motif, "requires entry");
    if (seenComposites.has(motif)) conflict(file, `duplicate requires entry for "${motif}"`);
    seenComposites.add(motif);
    if (requirement.prerequisites.length === 0) fail(file, `"${motif}": empty prerequisites`);
    for (const prerequisite of requirement.prerequisites) {
      const prerequisiteName = requireMotifName(file, prerequisite, `"${motif}" prerequisite`);
      if (prerequisiteName === motif) conflict(file, `"${motif}" requires itself`);
    }
    requireNonEmptyString(file, requirement.provenance, `"${motif}" provenance`);
  }
  assertRequiresAcyclic(file, raw.requires);
  for (const composite of raw.emergentComposites) {
    requireNonEmptyString(file, composite.name, "emergent composite name");
    if (composite.recipe.length < 2) fail(file, `emergent composite "${composite.name}": recipe needs ≥2 motifs`);
    for (const ingredient of composite.recipe) {
      requireMotifName(file, ingredient, `emergent composite "${composite.name}" recipe`);
    }
    requireNonEmptyString(file, composite.structuralMeaning, `"${composite.name}" structuralMeaning`);
  }
  return {
    requires: raw.requires as Rulebase["requires"],
    emergentComposites: raw.emergentComposites as Rulebase["emergentComposites"],
  };
}

/** The composition grammar is a DAG (paper §4.1); a cycle is a transcription error. */
function assertRequiresAcyclic(file: string, requires: typeof compositionJson.requires): void {
  const edges = new Map<string, readonly string[]>(
    requires.map((requirement) => [requirement.motif, requirement.prerequisites]),
  );
  const finished = new Set<string>();
  const inProgress = new Set<string>();
  const visit = (motif: string, path: readonly string[]): void => {
    if (finished.has(motif)) return;
    if (inProgress.has(motif)) {
      conflict(file, `requires cycle: ${[...path, motif].join(" -> ")}`);
    }
    inProgress.add(motif);
    for (const prerequisite of edges.get(motif) ?? []) visit(prerequisite, [...path, motif]);
    inProgress.delete(motif);
    finished.add(motif);
  };
  for (const motif of edges.keys()) visit(motif, []);
}

function validateCollisions(raw: typeof collisionsJson): Rulebase["collisions"] {
  const file = "collisions.json";
  const seenNames = new Set<string>();
  for (const collision of raw.collisions) {
    requireNonEmptyString(file, collision.name, "collision name");
    if (seenNames.has(collision.name)) conflict(file, `duplicate collision "${collision.name}"`);
    seenNames.add(collision.name);
    if (collision.motifs.length < 2) fail(file, `collision "${collision.name}": needs ≥2 motifs`);
    for (const motif of collision.motifs) {
      requireMotifName(file, motif, `collision "${collision.name}"`);
    }
    requireNonEmptyString(file, collision.structuralImpossibility, `"${collision.name}" structuralImpossibility`);
    if (collision.qualifier !== null) {
      requireNonEmptyString(file, collision.qualifier, `"${collision.name}" qualifier`);
    }
  }
  return raw.collisions as Rulebase["collisions"];
}

function validateObligationRules(raw: typeof obligationRulesJson): {
  eventTypes: Rulebase["eventTypes"];
  obligationRules: Rulebase["obligationRules"];
  terminalClaimObligationTypes: Rulebase["terminalClaimObligationTypes"];
} {
  const file = "obligation_rules.json";
  if (canonicalJson(raw.eventTypes) !== canonicalJson(PROCESS_IR_EVENT_TYPES)) {
    conflict(file, `eventTypes must be exactly the closed union from specs/kernel/SPEC.md §3: ${PROCESS_IR_EVENT_TYPES.join(", ")}`);
  }
  const seenIds = new Set<string>();
  const coveredEventTypes = new Set<string>();
  // Widened view: the JSON import's literal types would otherwise narrow the
  // defensive runtime checks below into dead (never-typed) branches.
  type RawObligationRule = {
    readonly id: string;
    readonly eventType: string;
    readonly opens: string | null;
    readonly dischargedBy: string | null;
    readonly mandatory: boolean | null;
    readonly blocking: boolean | null;
    readonly safeDefault: string | null;
    readonly status: string;
    readonly provenance: string;
  };
  for (const rule of raw.rules as readonly RawObligationRule[]) {
    requireNonEmptyString(file, rule.id, "rule id");
    if (seenIds.has(rule.id)) conflict(file, `duplicate rule id "${rule.id}"`);
    seenIds.add(rule.id);
    if (!EVENT_TYPES.has(rule.eventType)) fail(file, `rule "${rule.id}": unknown eventType "${rule.eventType}"`);
    coveredEventTypes.add(rule.eventType);
    if (rule.status === "transcribed" || rule.status === "drafted") {
      if (typeof rule.opens !== "string" || !OBLIGATION_TYPES.has(rule.opens)) {
        fail(file, `rule "${rule.id}": opens ${JSON.stringify(rule.opens)} is not an obligation type from schemas/obligation.schema.json`);
      }
      requireNonEmptyString(file, rule.dischargedBy, `rule "${rule.id}" dischargedBy`);
      if (typeof rule.mandatory !== "boolean" || typeof rule.blocking !== "boolean") {
        fail(file, `rule "${rule.id}": mandatory/blocking must be boolean`);
      }
      if (typeof rule.safeDefault !== "string" || !SAFE_DEFAULTS.has(rule.safeDefault)) {
        fail(file, `rule "${rule.id}": safeDefault ${JSON.stringify(rule.safeDefault)} is not in the obligation safeDefault enum (INV-7: "allow" is unrepresentable)`);
      }
    } else if (rule.status === "todo_human_adjudication") {
      if (rule.opens !== null || rule.dischargedBy !== null || rule.safeDefault !== null) {
        fail(file, `rule "${rule.id}": todo rules must not encode semantics (opens/dischargedBy/safeDefault must be null)`);
      }
    } else {
      fail(file, `rule "${rule.id}": unknown status "${rule.status}"`);
    }
  }
  for (const eventType of PROCESS_IR_EVENT_TYPES) {
    if (!coveredEventTypes.has(eventType)) {
      conflict(file, `event type "${eventType}" has no rule entry (transcribed or todo)`);
    }
  }
  const terminalTypes = raw.terminalClaimObligationTypes.types;
  for (const obligationType of terminalTypes) {
    if (!OBLIGATION_TYPES.has(obligationType)) {
      fail(file, `terminalClaimObligationTypes: "${obligationType}" is not an obligation type`);
    }
  }
  return {
    eventTypes: raw.eventTypes as Rulebase["eventTypes"],
    obligationRules: raw.rules as Rulebase["obligationRules"],
    terminalClaimObligationTypes: terminalTypes as Rulebase["terminalClaimObligationTypes"],
  };
}

function validateDiagnostics(raw: typeof diagnosticsJson): {
  semanticChecks: Rulebase["semanticChecks"];
  diagnosticPasses: Rulebase["diagnosticPasses"];
} {
  const file = "diagnostics.json";
  const checkNames = new Set(raw.semanticChecks.map((check) => check.name));
  for (const required of SEMANTIC_CHECK_IDS) {
    if (!checkNames.has(required)) conflict(file, `missing required semantic check "${required}"`);
  }
  if (checkNames.size !== raw.semanticChecks.length) conflict(file, "duplicate semantic check names");
  for (const check of raw.semanticChecks) {
    requireNonEmptyString(file, check.question, `check "${check.name}" question`);
    if ("requiredMotifs" in check && check.requiredMotifs !== undefined) {
      for (const motif of check.requiredMotifs) requireMotifName(file, motif, `check "${check.name}" requiredMotifs`);
    }
    if (check.name === "fep_viability") {
      const requiredMotifs = "requiredMotifs" in check ? check.requiredMotifs : undefined;
      if (requiredMotifs === undefined || requiredMotifs.length === 0) {
        conflict(file, "fep_viability must declare requiredMotifs (the viability manifold, paper §5)");
      }
    }
  }
  for (const diagnosticPass of raw.diagnosticPasses) {
    requireNonEmptyString(file, diagnosticPass.name, "diagnostic pass name");
    requireNonEmptyString(file, diagnosticPass.question, `pass "${diagnosticPass.name}" question`);
  }
  return {
    semanticChecks: raw.semanticChecks as Rulebase["semanticChecks"],
    diagnosticPasses: raw.diagnosticPasses as Rulebase["diagnosticPasses"],
  };
}

function validateFacets(raw: typeof facetsJson): Rulebase["facets"] {
  const file = "facets.json";
  const seenMotifs = new Set<string>();
  for (const entry of raw.facets) {
    const motif = requireMotifName(file, entry.motif, "facet entry");
    if (seenMotifs.has(motif)) conflict(file, `duplicate facet entry for "${motif}"`);
    seenMotifs.add(motif);
    if (entry.status === "transcribed" || entry.status === "drafted") {
      if (entry.facets.length < 3 || entry.facets.length > 5) {
        fail(file, `"${motif}": facet lists must have 3–5 entries (blueprint §7.1), found ${entry.facets.length}`);
      }
      for (const facet of entry.facets) requireNonEmptyString(file, facet, `"${motif}" facet`);
    } else if (entry.status === "todo_human_adjudication") {
      if (entry.facets.length !== 0) {
        fail(file, `"${motif}": todo facet entries must not encode facet names`);
      }
    } else {
      fail(file, `"${motif}": unknown status "${(entry as { status: string }).status}"`);
    }
  }
  if (seenMotifs.size !== MOTIF_NAMES.size) {
    conflict(file, `facets must cover all ${MOTIF_NAMES.size} motifs, found ${seenMotifs.size}`);
  }
  return raw.facets as Rulebase["facets"];
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
