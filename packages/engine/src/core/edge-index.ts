/**
 * edge-index — inverse edges are COMPUTED, only one side is stored (DEC-12).
 * Ported from the `reverse` map + `inverseSources` helper shared by all three seeds.
 */
import type { Graph } from './types.js';

export interface EdgeIndex {
  /** Sources that point at `target` via `predicate`. */
  inverseSources(target: string, predicate: string): string[];
  /** Total stored edges (one side). */
  readonly storedEdgeCount: number;
  /** Number of targets that have at least one incoming edge. */
  readonly inboundTargetCount: number;
}

export function buildIndex(graph: Graph): EdgeIndex {
  const reverse = new Map<string, { predicate: string; source: string }[]>();
  let storedEdgeCount = 0;
  for (const n of graph.nodes) {
    for (const e of n.edges ?? []) {
      storedEdgeCount++;
      let bucket = reverse.get(e.target);
      if (!bucket) {
        bucket = [];
        reverse.set(e.target, bucket);
      }
      bucket.push({ predicate: e.predicate, source: n.id });
    }
  }
  return {
    inverseSources: (target, predicate) =>
      (reverse.get(target) ?? []).filter((r) => r.predicate === predicate).map((r) => r.source),
    storedEdgeCount,
    inboundTargetCount: reverse.size,
  };
}
