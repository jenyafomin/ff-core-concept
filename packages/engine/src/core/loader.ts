/**
 * loader — StorePort result → in-memory Graph.
 * Ported from the `byId` build shared by all three seeds.
 */
import type { EnvelopeNode, Graph } from './types.js';

/** Build the id index over a flat node list. Pure; no I/O. */
export function load(nodes: EnvelopeNode[]): Graph {
  const byId = new Map<string, EnvelopeNode>();
  for (const n of nodes) byId.set(n.id, n);
  return { nodes, byId };
}
