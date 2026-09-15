/**
 * THROWAWAY oracle — packages/engine/test/_throwaway/read-expr-oracle.ts
 *
 * Interprets ONLY `EnvelopeNode.body.read_expr`, a self-describing AST:
 *   { op: 'AND' | 'OR', terms: ReadExprAST[] }
 *   { op: 'NOT', terms: [ReadExprAST] }
 *   { op: 'member', group: string }                      // leaf: is `viewer` a member of `group`?
 *
 * This is NOT a second production read-path and must never become one. It exists ONLY so a test can
 * compute what a composite, per-viewer-negatable READ law WOULD decide, and compare that against the
 * REAL engine's `resolveRead()` (core/resolve.ts) to prove — or disprove — that the law actually lives
 * in the engine. Per the design (F2 in
 * docs/02-project/core/01-brain/04-observer-mvp/adversarial-checkpoint-2026-09-04.analysis.md §3):
 *
 *   - it does NOT import `core/resolve.ts` or `core/projection.ts` (only TYPE-ONLY imports from
 *     `core/types.ts`, which carry no decision logic);
 *   - it does NOT read `node.visibility.readable_by` or `node.access.can_read` anywhere — those are the
 *     engine's OWN flat-allowlist mechanism (`resolve.ts:243`), orthogonal to this test primitive;
 *   - it is pure (no I/O, no engine calls) and disposable — nothing outside `test/` may import it.
 *
 * Group membership is FIXTURE-ONLY plumbing invented for this test: a graph node `group:<name>` with
 * `body.members: SubjectRef[]` lists the subjects belonging to that group. There is no `group` node type
 * or membership concept in production code — this convention exists solely to give `member:<group>`
 * leaves something to check against.
 */
import type { EnvelopeNode, Graph, SubjectRef } from '../../src/core/types.js';

export interface ReadExprAndOr {
  op: 'AND' | 'OR';
  terms: ReadExprAST[];
}
export interface ReadExprNot {
  op: 'NOT';
  terms: [ReadExprAST];
}
export interface ReadExprMember {
  op: 'member';
  group: string;
}
export type ReadExprAST = ReadExprAndOr | ReadExprNot | ReadExprMember;

function isMember(graph: Graph, group: string, viewer: SubjectRef): boolean {
  const groupNode = graph.byId.get(`group:${group}`);
  const members = (groupNode?.body?.members as SubjectRef[] | undefined) ?? [];
  return members.includes(viewer);
}

/** Pure recursive evaluator. Returns true iff the AST allows `viewer`. No side effects, no engine imports. */
export function evalReadExpr(ast: ReadExprAST, viewer: SubjectRef, graph: Graph): boolean {
  switch (ast.op) {
    case 'AND':
      return ast.terms.every((t) => evalReadExpr(t, viewer, graph));
    case 'OR':
      return ast.terms.some((t) => evalReadExpr(t, viewer, graph));
    case 'NOT':
      return !evalReadExpr(ast.terms[0], viewer, graph);
    case 'member':
      return isMember(graph, ast.group, viewer);
  }
}

/**
 * Oracle decision for a node's `body.read_expr`. Fail-closed to mirror the engine's own default-deny
 * floor: a node with no `read_expr` is DENY, not ALLOW-by-absence.
 */
export function oracleResolveRead(node: EnvelopeNode, viewer: SubjectRef, graph: Graph): 'allow' | 'deny' {
  const expr = node.body?.read_expr as ReadExprAST | undefined;
  if (!expr) return 'deny';
  return evalReadExpr(expr, viewer, graph) ? 'allow' : 'deny';
}
