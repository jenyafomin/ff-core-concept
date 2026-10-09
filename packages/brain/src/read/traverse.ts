// @ff/brain/read/traverse — bounded neighbourhood walk for `read` (SPEC R-6, AC-40).
//
// BFS over ACTIVE outgoing edges from the root, ≤depth hops, ≤maxNodes nodes (root included), with a
// visited set so a cycle (part-of loop) terminates. Only records the reader may see are neighbours:
// invisible / retracted / non-record targets (scopes, registry, principals) are skipped silently, dangling
// targets too. Hitting maxNodes while more visible neighbours remain → `truncated: true`.
import type { NeighborView } from '../contract.js';
import { decodeNode, edgeStatus } from '../domain/to-act.js';

import type { ReadDeps, ReadGate } from './access.js';

export interface TraverseOptions {
  depth: number;
  maxNodes: number;
  /** Follow only these predicates (all when omitted). */
  preds?: readonly string[];
}

export interface TraverseResult {
  neighbors: NeighborView[];
  truncated: boolean;
}

export function traverse(rootId: string, gate: ReadGate, deps: ReadDeps, opts: TraverseOptions): TraverseResult {
  const visited = new Set<string>([rootId]);
  const neighbors: NeighborView[] = [];
  const predSet = opts.preds ? new Set(opts.preds) : null;
  let truncated = false;
  let frontier = [rootId];

  for (let d = 0; d < opts.depth && frontier.length && !truncated; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      if (truncated) break;
      const node = deps.store.readNode(id);
      for (const e of node?.edges ?? []) {
        if (edgeStatus(e) !== 'active') continue;
        if (predSet && !predSet.has(e.predicate)) continue;
        const target = e.target;
        if (visited.has(target)) continue;
        visited.add(target);
        const tn = deps.store.readNode(target);
        if (!tn) continue; // dangling
        const rec = decodeNode(tn);
        if (rec.status === 'retracted' || !gate.canSee(tn, rec)) continue; // invisible neighbours are omitted
        if (1 + neighbors.length >= opts.maxNodes) {
          truncated = true;
          break;
        }
        neighbors.push({ id: rec.id, type: rec.type, label: rec.label });
        next.push(target);
      }
    }
    frontier = next;
  }
  return { neighbors, truncated };
}
