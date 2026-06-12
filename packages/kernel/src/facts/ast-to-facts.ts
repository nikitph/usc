import { SchemaValidationError } from "../errors.ts";
import type { MotifName } from "../rulebase/types.ts";
import type { Fact, MotifAstNode } from "./types.ts";

/**
 * Deterministic AST flattening (spec §2). The scope-chain walk lives HERE,
 * not in the rules (spec §3: recursion exists only in the fixed library
 * walks): provided_in_scope_chain(n, m) holds for every motif claimed at n
 * or at any ancestor Boundary scope. Output is sorted, never insertion-order
 * dependent (spec §5).
 */
export function astToFacts(root: MotifAstNode): Fact[] {
  const facts: Fact[] = [];
  const seenIds = new Set<string>();
  walk(root, new Set<MotifName>(), facts, seenIds);
  return facts.sort(compareFacts);
}

function walk(
  node: MotifAstNode,
  inheritedMotifs: ReadonlySet<MotifName>,
  facts: Fact[],
  seenIds: Set<string>,
): void {
  if (node.id.length === 0) throw new SchemaValidationError("MotifAst", "empty node id");
  if (seenIds.has(node.id)) {
    throw new SchemaValidationError("MotifAst", `duplicate node id "${node.id}"`);
  }
  seenIds.add(node.id);
  facts.push({ fact: "node", args: [node.id] });
  if (node.autonomous === true) facts.push({ fact: "autonomous", args: [node.id] });
  const scopeMotifs = new Set<MotifName>(inheritedMotifs);
  for (const motif of node.claims) {
    facts.push({ fact: "claims", args: [node.id, motif] });
    scopeMotifs.add(motif);
  }
  for (const motif of scopeMotifs) {
    facts.push({ fact: "provided_in_scope_chain", args: [node.id, motif] });
  }
  for (const child of node.children ?? []) walk(child, scopeMotifs, facts, seenIds);
}

function compareFacts(a: Fact, b: Fact): number {
  const keyA = `${a.fact}(${a.args.join(",")})`;
  const keyB = `${b.fact}(${b.args.join(",")})`;
  return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
}
