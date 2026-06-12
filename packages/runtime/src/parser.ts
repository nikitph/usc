import { astToFacts } from "@usc/kernel";
import type { MotifName } from "@usc/kernel";
import { MotifTokenSchema } from "@usc/shared/generated";

import { ParserError } from "./errors.ts";
import type { ParseOptions, RuntimeAstNode, TokenWithSpan } from "./types.ts";

interface BoundaryScope {
  readonly token: TokenWithSpan;
  readonly children: readonly BoundaryScope[];
}

export function parseMotifTokens(
  tokens: readonly unknown[],
  options: ParseOptions = {},
): RuntimeAstNode {
  const annotated = tokens.map((token) => annotateToken(token)).sort(compareTokenSpans);
  validateBoundaryOverlaps(annotated);
  const delimiterTokens = annotated.filter(isScopeDelimiter);
  const topLevelScopes = delimiterTokens
    .filter((token) => nearestParent(token, delimiterTokens) === undefined)
    .map((token) => buildScope(token, delimiterTokens));
  const rootId = options.rootId ?? "root";
  return freezeAst(withAutonomous({
    id: rootId,
    claims: uniqueSortedMotifs(directClaims(undefined, annotated, topLevelScopes)),
    sourceTokenIds: directTokenIds(undefined, annotated, topLevelScopes),
    children: topLevelScopes.map((scope) => scopeToNode(scope, annotated, options)),
  }, options.autonomousNodeIds?.has(rootId) === true));
}

export function runtimeAstToFacts(ast: RuntimeAstNode) {
  return astToFacts(ast);
}

function annotateToken(raw: unknown): TokenWithSpan {
  const token = MotifTokenSchema.parse(raw);
  const starts = token.evidence.map((evidence) => evidence.span.start);
  const ends = token.evidence.map((evidence) => evidence.span.end);
  const start = Math.min(...starts);
  const end = Math.max(...ends);
  if (end < start) {
    throw new ParserError(`token "${token.id}" has an invalid span ${start}-${end}`);
  }
  return { token, start, end };
}

function buildScope(token: TokenWithSpan, delimiters: readonly TokenWithSpan[]): BoundaryScope {
  const children = delimiters
    .filter((candidate) => nearestParent(candidate, delimiters)?.token.id === token.token.id)
    .sort(compareTokenSpans)
    .map((child) => buildScope(child, delimiters));
  return { token, children };
}

function scopeToNode(
  scope: BoundaryScope,
  tokens: readonly TokenWithSpan[],
  options: ParseOptions,
): RuntimeAstNode {
  const id = scopeId(scope.token);
  return freezeAst(withAutonomous({
    id,
    claims: uniqueSortedMotifs(["boundary", ...directClaims(scope.token, tokens, scope.children)]),
    sourceTokenIds: [scope.token.token.id, ...directTokenIds(scope.token, tokens, scope.children)].sort(),
    children: scope.children.map((child) => scopeToNode(child, tokens, options)),
  }, options.autonomousNodeIds?.has(id) === true));
}

function directClaims(
  owner: TokenWithSpan | undefined,
  tokens: readonly TokenWithSpan[],
  childScopes: readonly BoundaryScope[],
) {
  return tokens
    .filter((token) => !isScopeDelimiter(token))
    .filter((token) => belongsDirectlyTo(token, owner, childScopes))
    .map((token) => token.token.motif);
}

function directTokenIds(
  owner: TokenWithSpan | undefined,
  tokens: readonly TokenWithSpan[],
  childScopes: readonly BoundaryScope[],
) {
  return tokens
    .filter((token) => !isScopeDelimiter(token))
    .filter((token) => belongsDirectlyTo(token, owner, childScopes))
    .map((token) => token.token.id)
    .sort();
}

function belongsDirectlyTo(
  token: TokenWithSpan,
  owner: TokenWithSpan | undefined,
  childScopes: readonly BoundaryScope[],
): boolean {
  if (owner === undefined) {
    return !childScopes.some((scope) => contains(scope.token, token));
  }
  return contains(owner, token) && !childScopes.some((scope) => contains(scope.token, token));
}

function validateBoundaryOverlaps(tokens: readonly TokenWithSpan[]): void {
  const delimiters = tokens.filter(isScopeDelimiter);
  for (let leftIndex = 0; leftIndex < delimiters.length; leftIndex += 1) {
    const left = delimiters[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < delimiters.length; rightIndex += 1) {
      const right = delimiters[rightIndex];
      if (right === undefined) continue;
      const overlaps = left.start < right.end && right.start < left.end;
      const nested = contains(left, right) || contains(right, left);
      if (overlaps && !nested) {
        throw new ParserError(`crossing boundary scopes "${left.token.id}" and "${right.token.id}"`);
      }
    }
  }
}

function nearestParent(
  child: TokenWithSpan,
  candidates: readonly TokenWithSpan[],
): TokenWithSpan | undefined {
  return candidates
    .filter((candidate) => candidate.token.id !== child.token.id && contains(candidate, child))
    .sort((left, right) => spanWidth(left) - spanWidth(right))[0];
}

function isScopeDelimiter(token: TokenWithSpan): boolean {
  return token.token.motif === "boundary" && token.token.boundaryRole === "scope_delimiter";
}

function contains(outer: TokenWithSpan, inner: TokenWithSpan): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

function spanWidth(token: TokenWithSpan): number {
  return token.end - token.start;
}

function compareTokenSpans(left: TokenWithSpan, right: TokenWithSpan): number {
  return left.start - right.start || right.end - left.end || left.token.id.localeCompare(right.token.id);
}

function scopeId(token: TokenWithSpan): string {
  return `scope:${token.token.id}`;
}

function uniqueSortedMotifs(motifs: readonly MotifName[]): readonly MotifName[] {
  return [...new Set(motifs)].sort();
}

function freezeAst<T extends RuntimeAstNode>(node: T): T {
  Object.freeze(node.sourceTokenIds);
  Object.freeze(node.claims);
  Object.freeze(node.children ?? []);
  return Object.freeze(node);
}

function withAutonomous<T extends Omit<RuntimeAstNode, "autonomous">>(
  node: T,
  isAutonomous: boolean,
): RuntimeAstNode {
  return isAutonomous ? { ...node, autonomous: true } : node;
}
