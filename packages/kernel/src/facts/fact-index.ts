import { ArtifactSchema, MotifObligationSchema, MotifTokenSchema } from "@usc/shared/generated";

import { SchemaValidationError } from "../errors.ts";
import type { MotifName, ObligationType } from "../rulebase/types.ts";
import type { Fact } from "./types.ts";

/** How a prerequisite reached the scope chain (spec §4.1's unknown path). */
export type ProvisionQualifier = "confirmed" | "experimental" | "unverified";

export type DischargeStatus = "satisfied" | "violated" | "unknown";

export interface ObligationFact {
  readonly id: string;
  readonly obligationType: ObligationType;
  readonly status: DischargeStatus;
  readonly mandatory: boolean;
  readonly blocking: boolean;
}

export type EvaluationMode = "production" | "research";

export interface FactIndex {
  readonly nodes: ReadonlySet<string>;
  readonly claimsByNode: ReadonlyMap<string, ReadonlySet<MotifName>>;
  readonly providedByNode: ReadonlyMap<string, ReadonlyMap<MotifName, ProvisionQualifier>>;
  readonly autonomousNodes: ReadonlySet<string>;
  readonly terminalClaims: ReadonlyMap<string, string>;
  readonly obligationsByClaim: ReadonlyMap<string, readonly ObligationFact[]>;
  readonly artifactKinds: ReadonlyMap<string, string>;
  readonly parentsByChild: ReadonlyMap<string, ReadonlySet<string>>;
  readonly tagsByArtifact: ReadonlyMap<string, ReadonlySet<string>>;
  readonly inheritedInvariantsByNode: ReadonlyMap<string, ReadonlySet<string>>;
  readonly weakenedInvariantsByNode: ReadonlyMap<string, ReadonlySet<string>>;
  readonly unknownInvariantsByNode: ReadonlyMap<string, ReadonlySet<string>>;
  /** undefined = no mode fact was given; checks must treat that as unknown, never pick a side (INV-1/INV-6). */
  readonly mode: EvaluationMode | undefined;
}

const MOTIF_NAMES = new Set<string>(MotifTokenSchema.innerType().shape.motif.options);
const OBLIGATION_TYPES = new Set<string>(MotifObligationSchema.shape.type.options);
const ARTIFACT_KINDS = new Set<string>(ArtifactSchema.shape.kind.options);
const ARTIFACT_TAGS = new Set<string>(ArtifactSchema.shape.tags.element.options);
const DISCHARGE_STATUSES = new Set<string>(["satisfied", "violated", "unknown"]);
const PROVISION_QUALIFIERS = new Set<string>(["experimental", "unverified"]);

function fail(message: string): never {
  throw new SchemaValidationError("facts", message);
}

function arg(factInstance: Fact, position: number, arity: number): string {
  if (factInstance.args.length !== arity) {
    fail(`${factInstance.fact}(${factInstance.args.join(", ")}): expected arity ${arity}`);
  }
  const value = factInstance.args[position];
  if (value === undefined || value.length === 0) {
    fail(`${factInstance.fact}: empty argument at position ${position}`);
  }
  return value;
}

function motifArg(factInstance: Fact, position: number, arity: number): MotifName {
  const value = arg(factInstance, position, arity);
  if (!MOTIF_NAMES.has(value)) fail(`${factInstance.fact}: "${value}" is not a motif name`);
  return value as MotifName;
}

function addTo(map: Map<string, Set<string>>, key: string, value: string): void {
  const existing = map.get(key);
  if (existing === undefined) map.set(key, new Set([value]));
  else existing.add(value);
}

/**
 * Validates and indexes the closed fact vocabulary. Unknown predicates and
 * malformed arities are typed errors, never ignored (INV-8): a misspelled
 * fact that silently matched nothing would corrupt verdicts.
 */
export function buildFactIndex(facts: readonly Fact[]): FactIndex {
  const nodes = new Set<string>();
  const claims = new Map<string, Set<string>>();
  const provided = new Map<string, Map<MotifName, ProvisionQualifier>>();
  const autonomousNodes = new Set<string>();
  const terminalClaims = new Map<string, string>();
  const obligationsByClaim = new Map<string, ObligationFact[]>();
  const artifactKinds = new Map<string, string>();
  const parentsByChild = new Map<string, Set<string>>();
  const tagsByArtifact = new Map<string, Set<string>>();
  const inherited = new Map<string, Set<string>>();
  const weakened = new Map<string, Set<string>>();
  const unknownInvariants = new Map<string, Set<string>>();
  const obligationById = new Map<string, string>();
  let mode: EvaluationMode | undefined;

  for (const factInstance of facts) {
    switch (factInstance.fact) {
      case "node":
        nodes.add(arg(factInstance, 0, 1));
        break;
      case "claims": {
        const nodeId = arg(factInstance, 0, 2);
        nodes.add(nodeId);
        addTo(claims, nodeId, motifArg(factInstance, 1, 2));
        break;
      }
      case "provided_in_scope_chain": {
        const arity = factInstance.args.length === 3 ? 3 : 2;
        const nodeId = arg(factInstance, 0, arity);
        const motif = motifArg(factInstance, 1, arity);
        let qualifier: ProvisionQualifier = "confirmed";
        if (arity === 3) {
          const rawQualifier = arg(factInstance, 2, 3);
          if (!PROVISION_QUALIFIERS.has(rawQualifier)) {
            fail(`provided_in_scope_chain: unknown qualifier "${rawQualifier}"`);
          }
          qualifier = rawQualifier as ProvisionQualifier;
        }
        nodes.add(nodeId);
        const forNode = provided.get(nodeId) ?? new Map<MotifName, ProvisionQualifier>();
        // confirmed provision wins over weaker qualifiers for the same motif
        const existing = forNode.get(motif);
        if (existing === undefined || qualifier === "confirmed") forNode.set(motif, qualifier);
        provided.set(nodeId, forNode);
        break;
      }
      case "autonomous":
        autonomousNodes.add(arg(factInstance, 0, 1));
        nodes.add(arg(factInstance, 0, 1));
        break;
      case "terminal_claim":
        setSingleValue(
          terminalClaims,
          arg(factInstance, 0, 2),
          arg(factInstance, 1, 2),
          "terminal_claim",
        );
        break;
      case "obligation": {
        const obligationId = arg(factInstance, 0, 6);
        setSingleValue(obligationById, obligationId, factInstance.args.join("\u0000"), "obligation");
        const claimId = arg(factInstance, 1, 6);
        const obligationType = arg(factInstance, 2, 6);
        if (!OBLIGATION_TYPES.has(obligationType)) {
          fail(`obligation: "${obligationType}" is not an obligation type`);
        }
        const mandatoryFlag = arg(factInstance, 3, 6);
        if (mandatoryFlag !== "mandatory" && mandatoryFlag !== "optional") {
          fail(`obligation: expected "mandatory"|"optional", got "${mandatoryFlag}"`);
        }
        const blockingFlag = arg(factInstance, 4, 6);
        if (blockingFlag !== "blocking" && blockingFlag !== "nonblocking") {
          fail(`obligation: expected "blocking"|"nonblocking", got "${blockingFlag}"`);
        }
        const status = arg(factInstance, 5, 6);
        if (!DISCHARGE_STATUSES.has(status)) {
          fail(`obligation: unknown status "${status}"`);
        }
        const entry: ObligationFact = {
          id: obligationId,
          obligationType: obligationType as ObligationType,
          status: status as DischargeStatus,
          mandatory: mandatoryFlag === "mandatory",
          blocking: blockingFlag === "blocking",
        };
        const list = obligationsByClaim.get(claimId) ?? [];
        list.push(entry);
        obligationsByClaim.set(claimId, list);
        break;
      }
      case "artifact": {
        const kind = arg(factInstance, 1, 2);
        if (!ARTIFACT_KINDS.has(kind)) fail(`artifact: unknown kind "${kind}"`);
        setSingleValue(artifactKinds, arg(factInstance, 0, 2), kind, "artifact");
        break;
      }
      case "parent":
        addTo(parentsByChild, arg(factInstance, 0, 2), arg(factInstance, 1, 2));
        break;
      case "tagged": {
        const tag = arg(factInstance, 1, 2);
        if (!ARTIFACT_TAGS.has(tag)) fail(`tagged: unknown tag "${tag}"`);
        addTo(tagsByArtifact, arg(factInstance, 0, 2), tag);
        break;
      }
      case "inherited_invariant":
        addTo(inherited, arg(factInstance, 0, 2), arg(factInstance, 1, 2));
        break;
      case "weakens_inherited_invariant":
        addTo(weakened, arg(factInstance, 0, 2), arg(factInstance, 1, 2));
        break;
      case "invariant_status_unknown":
        addTo(unknownInvariants, arg(factInstance, 0, 2), arg(factInstance, 1, 2));
        break;
      case "mode": {
        const rawMode = arg(factInstance, 0, 1);
        if (rawMode !== "production" && rawMode !== "research") {
          fail(`mode: expected "production"|"research", got "${rawMode}"`);
        }
        if (mode !== undefined && mode !== rawMode) fail("mode: conflicting mode facts");
        mode = rawMode;
        break;
      }
      default:
        fail(`unknown fact predicate "${factInstance.fact}"`);
    }
  }
  return {
    nodes,
    claimsByNode: claims as ReadonlyMap<string, ReadonlySet<MotifName>>,
    providedByNode: provided,
    autonomousNodes,
    terminalClaims,
    obligationsByClaim,
    artifactKinds,
    parentsByChild,
    tagsByArtifact,
    inheritedInvariantsByNode: inherited,
    weakenedInvariantsByNode: weakened,
    unknownInvariantsByNode: unknownInvariants,
    mode,
  };
}

function setSingleValue(map: Map<string, string>, key: string, value: string, predicate: string): void {
  const existing = map.get(key);
  if (existing !== undefined && existing !== value) {
    fail(`${predicate}: conflicting values for "${key}"`);
  }
  map.set(key, value);
}
