/**
 * view-compiler — compiles a ViewDef into an executable `(graph, ctx) => Result`.
 *
 * ONE generic 4-stage pipeline: `from · traverse · filter · shape`. Ported from run-view.mjs
 * (depth-1: cost-tree, visible-to, actions-by-agent), run-view-depth2.mjs (subtree-vs-direct
 * rollup + loop-guard) and run-capability.mjs (the GATED cost-tree/visible-to that prune via
 * resolveRead — Hole B).
 *
 * I-7 (single PEP): every read lens routes visibility through `ctx.policy.resolve('read', …)`.
 * There is NO second/allow-all visibility path. `costTree` and `visibleTo` both call the same
 * `resolve`. Pure aggregation (subtree/direct rollup, loop-guard) operates only on the tree that
 * survives resolve() pruning — it never re-emits access-controlled content on its own.
 *
 * The `sum(cost)` aggregation enum (R1/R3 boundary) is deliberately NOT frozen (M0-spec §6).
 */
import { assertValid } from './envelope-validator.js';
import { buildIndex, type EdgeIndex } from './edge-index.js';
import { ALLOW } from './types.js';
import type { EnvelopeNode, Graph, GraphContext, SubjectRef, ViewDef } from './types.js';

/** Static tree-walk depth bound (delegates-to). Separate mechanism from the loop-run guard. */
export const DEFAULT_MAX_DELEGATION_DEPTH = 10_000;

// ── cost-tree ────────────────────────────────────────────────────────────────────────────────
export interface CostNode {
  id: string;
  depth: number;
  own: number;
  /** self + ALL descendants. */
  subtree: number;
  /** self + ONLY direct children. */
  direct: number;
  measurement: string;
  children: CostNode[];
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

/**
 * Sum a node's own cost. GATED when the policy is FIXED: each measuring snapshot must pass
 * resolveRead for the viewer (I-7 applied to aggregation). Under NAIVE the cost path does NOT
 * consult the viewer at all — this faithfully reproduces the historical "cost-tree has no viewer"
 * bug (Hole B, the boundary-doc-as-written baseline) so the fix can be locked red→green.
 */
function ownCostGated(
  index: EdgeIndex,
  graph: Graph,
  agentId: string,
  ctx: GraphContext,
  field: string,
): number {
  const gated = ctx.policy.mode === 'FIXED';
  return index
    .inverseSources(agentId, 'measures')
    .map((sid) => graph.byId.get(sid))
    .filter((snap): snap is EnvelopeNode => !!snap && (!gated || ctx.policy.resolve('read', ctx.viewer, snap, graph) === ALLOW))
    .reduce((sum, snap) => sum + (Number(getPath(snap, field)) || 0), 0);
}

/**
 * Cost tree over `delegates-to`. ITERATIVE (not recursive) with a `visited` set (loop-guard) +
 * a `maxDelegationDepth` bound — the two mechanisms are SEPARATE, both present (M0-spec §3.1).
 * A branch the viewer cannot read is PRUNED entirely (Hole B: id absent, not zeroed).
 */
export function costTree(graph: Graph, rootId: string, ctx: GraphContext, field = 'body.tokens'): CostNode {
  const index = buildIndex(graph);
  const maxDepth = ctx.maxDelegationDepth ?? DEFAULT_MAX_DELEGATION_DEPTH;

  const makeRow = (id: string, depth: number): CostNode => {
    const snap = index
      .inverseSources(id, 'measures')
      .map((s) => graph.byId.get(s))
      .find((s): s is EnvelopeNode => !!s);
    return {
      id,
      depth,
      own: ownCostGated(index, graph, id, ctx, field),
      subtree: 0,
      direct: 0,
      measurement: (snap?.body?.measurement as string | undefined) ?? '?',
      children: [],
    };
  };

  const gated = ctx.policy.mode === 'FIXED';
  const root = makeRow(rootId, 0);
  const visited = new Set<string>([rootId]);
  const stack: CostNode[] = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.depth >= maxDepth) continue; // static depth bound
    const kids = (graph.byId.get(cur.id)?.edges ?? [])
      .filter((e) => e.predicate === 'delegates-to')
      .map((e) => e.target)
      // FIXED: PRUNE branches the viewer cannot read — id/edge must not appear at all (I-7 on
      // traversal, Hole B green). NAIVE: no gating (reproduces the leak, Hole B red).
      .filter((t) => {
        const child = graph.byId.get(t);
        if (!child) return false;
        return !gated || ctx.policy.resolve('read', ctx.viewer, child, graph) === ALLOW;
      })
      .filter((t) => !visited.has(t)); // loop-guard: never revisit (cycle safety)
    for (const t of kids) {
      visited.add(t);
      const row = makeRow(t, cur.depth + 1);
      cur.children.push(row);
      stack.push(row);
    }
  }

  // rollup (post-order over the pruned tree): subtree = self + all descendants; direct = self + direct children.
  const rollup = (row: CostNode): void => {
    row.children.forEach(rollup);
    row.subtree = row.own + row.children.reduce((s, r) => s + r.subtree, 0);
    row.direct = row.own + row.children.reduce((s, r) => s + r.own, 0);
  };
  rollup(root);
  return root;
}

/** Flatten a cost tree to the set of node ids it references (Hole B assertion target). */
export function treeIds(node: CostNode): string[] {
  return [node.id, ...node.children.flatMap(treeIds)];
}

/** Sum of grandchildren-and-deeper own cost — the amount by which subtree honestly exceeds direct (Q-10). */
export function grandchildSum(root: CostNode): number {
  let s = 0;
  const rec = (r: CostNode): void => {
    if (r.depth >= 2) s += r.own;
    r.children.forEach(rec);
  };
  rec(root);
  return s;
}

// ── visible-to (gated) ─────────────────────────────────────────────────────────────────────
/** Every node the viewer may read — routed through the SINGLE resolve() (I-7). */
export function visibleTo(graph: Graph, ctx: GraphContext): string[] {
  return graph.nodes.filter((n) => ctx.policy.resolve('read', ctx.viewer, n, graph) === ALLOW).map((n) => n.id);
}

// ── actions-by-agent ─────────────────────────────────────────────────────────────────────────
export interface ActionsByAgent {
  agent: string;
  actions: { id: string; kind: string | undefined }[];
}

export function actionsByAgent(graph: Graph): ActionsByAgent[] {
  const index = buildIndex(graph);
  const groups = new Map<string, { id: string; kind: string | undefined }[]>();
  for (const a of graph.nodes.filter((n) => n.type === 'action')) {
    const agent = index.inverseSources(a.id, 'performs')[0] ?? '(none)';
    let bucket = groups.get(agent);
    if (!bucket) {
      bucket = [];
      groups.set(agent, bucket);
    }
    bucket.push({ id: a.id, kind: a.body?.kind as string | undefined });
  }
  return [...groups.entries()].map(([agent, actions]) => ({ agent, actions }));
}

// ── loop-guard (Q-9) ─────────────────────────────────────────────────────────────────────────
export interface LoopTrip {
  loop: string;
  max: number;
  iters: number;
  backs: number;
  trippedAt: number;
  action: string;
}

/** loop-run whose iterations exceed policy:loop-guard.max_iterations trips the guard. */
export function loopGuard(graph: Graph): LoopTrip[] {
  const trips: LoopTrip[] = [];
  for (const n of graph.nodes.filter((x) => x.type === 'loop-run')) {
    const guard = (n.policy_ref ?? [])
      .map((pid) => graph.byId.get(pid))
      .find((p) => p?.body?.target === 'loop');
    if (!guard) continue;
    const max = guard.body?.max_iterations as number;
    const iters = (n.body?.iterations as number | undefined) ?? 0;
    const backs = (n.body?.loop_backs as number | undefined) ?? 0;
    if (iters > max) {
      trips.push({ loop: n.id, max, iters, backs, trippedAt: max + 1, action: guard.body?.on_exceed as string });
    }
  }
  return trips;
}

// ── compile(viewDef) → (graph, ctx) => Result ────────────────────────────────────────────────
export type ViewResult =
  | { kind: 'cost-tree'; tree: CostNode }
  | { kind: 'visible-to'; ids: string[] }
  | { kind: 'actions-by-agent'; groups: ActionsByAgent[] };

/**
 * Compile a declarative ViewDef into a runnable, GATED view function.
 * Fail-closed BY BEHAVIOUR: the compiled fn calls assertValid() and REFUSES (throws RefusalError)
 * before computing anything if the graph is invalid — not "compute, then report".
 */
export function compile(def: ViewDef): (graph: Graph, ctx: GraphContext) => ViewResult {
  return (graph, ctx) => {
    assertValid(graph); // refuse-before-compute (fail-closed, not exit-code)
    switch (def.kind) {
      case 'cost-tree': {
        const from = typeof def.body.from === 'string' ? def.body.from : '';
        const field = def.body.cost_via?.field ?? 'body.tokens';
        return { kind: 'cost-tree', tree: costTree(graph, from, ctx, field) };
      }
      case 'visible-to': {
        // The `{ visible_to: "$viewer" }` filter clause is the PEP hook: it routes through resolve().
        // Any additional structural conds (type/field/contains) narrow further.
        const conds = def.body.filter ?? [{ visible_to: '$viewer' }];
        const fromType = typeof def.body.from === 'object' ? def.body.from.type : '*';
        const seed = fromType === '*' ? graph.nodes : graph.nodes.filter((n) => n.type === fromType);
        const ids = seed
          .filter((n) => matchStructural(n, conds, ctx))
          .filter((n) =>
            conds.some((c) => c.visible_to) ? ctx.policy.resolve('read', ctx.viewer, n, graph) === ALLOW : true,
          )
          .map((n) => n.id);
        return { kind: 'visible-to', ids };
      }
      case 'actions-by-agent':
        return { kind: 'actions-by-agent', groups: actionsByAgent(graph) };
    }
  };
}

/** Structural (non-access) filter — type match + field-contains. Access is resolve()'s job, not this. */
function matchStructural(node: EnvelopeNode, conds: ViewDef['body']['filter'], ctx: GraphContext): boolean {
  for (const cond of conds ?? []) {
    if (cond.type && node.type !== cond.type) return false;
    if (cond.field && cond.contains !== undefined) {
      let want: unknown = cond.contains;
      if (typeof want === 'string' && want.startsWith('$')) want = ctx.params?.[want.slice(1)] ?? undefined;
      const arr = getPath(node, cond.field);
      if (!Array.isArray(arr) || !arr.includes(want)) return false;
    }
  }
  return true;
}

export { getPath as _getPath };
