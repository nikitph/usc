import type { GraftCheckResult, MotifName } from "@usc/kernel";
import { canonicalJson, sha256Hex } from "@usc/shared/hashing";
import { computeArtifactId, type ArtifactEnvelope, type ArtifactId } from "@usc/store";

import { RuntimeError } from "./errors.ts";
import { runtimeAstToFacts } from "./parser.ts";
import type { RuntimeAstNode } from "./types.ts";

export type AstModificationOperation =
  | {
      readonly op: "add_claim";
      readonly nodeId: string;
      readonly motif: MotifName;
    }
  | {
      readonly op: "remove_claim";
      readonly nodeId: string;
      readonly motif: MotifName;
    }
  | {
      readonly op: "add_child";
      readonly parentNodeId: string;
      readonly child: RuntimeAstNode;
    };

export interface GraftPlanBody {
  readonly id: string;
  readonly status: GraftCheckResult["status"];
  readonly graftCheck: GraftCheckResult;
  readonly operations: readonly AstModificationOperation[];
  readonly recompile: {
    readonly status: "passed";
    readonly beforeFactsHash: string;
    readonly afterFactsHash: string;
  };
}

export interface GraftPlanDraft {
  readonly id: string;
  readonly baseAst: RuntimeAstNode;
  readonly graftCheck: GraftCheckResult;
  readonly operations: readonly AstModificationOperation[];
}

export interface GraftPlanArtifactInput {
  readonly body: GraftPlanBody;
  readonly patternArtifactId: ArtifactId;
  readonly targetArtifactId: ArtifactId;
  readonly verdictArtifactId: ArtifactId;
  readonly rulebaseHash: string;
  readonly createdAt: string;
}

export function applyAstOperations(
  ast: RuntimeAstNode,
  operations: readonly AstModificationOperation[],
): RuntimeAstNode {
  return operations.reduce((currentAst, operation) => applyAstOperation(currentAst, operation), ast);
}

export function createGraftPlanBody(draft: GraftPlanDraft): GraftPlanBody {
  const modifiedAst = applyAstOperations(draft.baseAst, draft.operations);
  return Object.freeze({
    id: draft.id,
    status: draft.graftCheck.status,
    graftCheck: draft.graftCheck,
    operations: Object.freeze([...draft.operations]),
    recompile: Object.freeze({
      status: "passed",
      beforeFactsHash: factsHash(draft.baseAst),
      afterFactsHash: factsHash(modifiedAst),
    }),
  });
}

export function graftPlanArtifact(input: GraftPlanArtifactInput): ArtifactEnvelope {
  validateMandatoryRecompile(input.body);
  const parents = [input.patternArtifactId, input.targetArtifactId, input.verdictArtifactId].sort();
  const draft = {
    kind: "graft_plan" as const,
    body: input.body as unknown as ArtifactEnvelope["body"],
    rulebaseHash: input.rulebaseHash,
    parents,
  };
  return {
    id: computeArtifactId(draft),
    ...draft,
    tags: [],
    createdAt: input.createdAt,
  };
}

export function validateMandatoryRecompile(body: GraftPlanBody): void {
  if (body.recompile.status !== "passed") {
    throw new RuntimeError("graft_plan requires a passed recompile");
  }
  if (body.recompile.beforeFactsHash.length === 0 || body.recompile.afterFactsHash.length === 0) {
    throw new RuntimeError("graft_plan requires before and after fact hashes");
  }
}

function applyAstOperation(ast: RuntimeAstNode, operation: AstModificationOperation): RuntimeAstNode {
  switch (operation.op) {
    case "add_claim":
      return updateNode(ast, operation.nodeId, (node) => ({
        ...node,
        claims: [...new Set([...node.claims, operation.motif])].sort(),
      }));
    case "remove_claim":
      return updateNode(ast, operation.nodeId, (node) => ({
        ...node,
        claims: node.claims.filter((motif) => motif !== operation.motif),
      }));
    case "add_child":
      return updateNode(ast, operation.parentNodeId, (node) => ({
        ...node,
        children: [...(node.children ?? []), deepFreezeAst(operation.child)],
      }));
  }
}

function updateNode(
  node: RuntimeAstNode,
  nodeId: string,
  update: (node: RuntimeAstNode) => RuntimeAstNode,
): RuntimeAstNode {
  const result = updateNodeWalk(node, nodeId, update);
  if (!result.found) {
    throw new RuntimeError(`AST node not found for graft operation: ${nodeId}`);
  }
  return result.node;
}

interface AstUpdateResult {
  readonly node: RuntimeAstNode;
  readonly found: boolean;
}

function updateNodeWalk(
  node: RuntimeAstNode,
  nodeId: string,
  update: (node: RuntimeAstNode) => RuntimeAstNode,
): AstUpdateResult {
  const childResults = node.children?.map((child) => updateNodeWalk(child, nodeId, update)) ?? [];
  const children = childResults.map((childResult) => childResult.node);
  const withUpdatedChildren = { ...node, children };
  if (node.id === nodeId) {
    return { node: deepFreezeAst(update(withUpdatedChildren)), found: true };
  }
  const found = childResults.some((childResult) => childResult.found);
  return { node: deepFreezeAst(withUpdatedChildren), found };
}

function factsHash(ast: RuntimeAstNode): string {
  return sha256Hex(canonicalJson(runtimeAstToFacts(ast)));
}

function deepFreezeAst(node: RuntimeAstNode): RuntimeAstNode {
  Object.freeze(node.claims);
  Object.freeze(node.sourceTokenIds);
  Object.freeze(node.children ?? []);
  return Object.freeze(node);
}
