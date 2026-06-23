import type { FileNodeStore } from './store';

/**
 * Configured-context cascade — the CLAUDE.md-style layering applied to the node tree.
 *
 * A chat/group/agent node carries a `context` field (its role, rules, goal). The
 * EFFECTIVE context of a node is the concatenation of every ancestor's context, from
 * root down to the node itself. This is the static, authored context — it does NOT
 * fill up (contrast with conversation context, which is handled by compaction).
 *
 * See CHAT-HIERARCHY-AND-CONTEXT.md §4 (the two kinds of "context").
 */

export interface ContextLayer {
  nodeId: string;
  title: string;
  context: string;
}

/** Ordered root → … → node. Only layers that actually declare a context are included. */
export async function contextLayers(store: FileNodeStore, id: string): Promise<ContextLayer[]> {
  const ancestors = await store.ancestors(id);
  const self = await store.get(id);
  const chain = self ? [...ancestors, self] : ancestors;
  const layers: ContextLayer[] = [];
  for (const n of chain) {
    if (n.context && n.context.trim()) {
      layers.push({ nodeId: n.id, title: n.title, context: n.context.trim() });
    }
  }
  return layers;
}

/** Merged effective context string, layers separated by a labelled divider. */
export async function effectiveContext(store: FileNodeStore, id: string): Promise<string> {
  const layers = await contextLayers(store, id);
  return layers.map((l) => `### ${l.title}\n${l.context}`).join('\n\n');
}
