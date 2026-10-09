import type { FileNodeStore } from './store.js';
import type { FFNode, Importance } from './node.js';

/**
 * Every agent action writes a trace node back into the graph. This is the mechanism
 * that makes "graph = memory": aggregation, observability ("who did what / who
 * interacted with whom") and context recovery after compaction all come for free
 * because the trace lives in the same graph as everything else.
 *
 * A trace links to what it read (rel: 'read') and what it produced (rel: 'wrote'),
 * and optionally to the chat it happened in (rel: 'in').
 */
export interface TraceInput {
  /** Who acted: an agent id (or 'user'). */
  actor: string;
  /** Short imperative summary of the action — becomes the trace title (L1). */
  action: string;
  /** Optional longer detail — the trace body (L3). */
  detail?: string;
  /** Node ids the action consumed. */
  read?: string[];
  /** Node ids the action created/changed. */
  wrote?: string[];
  /** Chat/group this happened in, if any. */
  inChat?: string;
  importance?: Importance;
  tags?: string[];
}

export async function recordTrace(store: FileNodeStore, input: TraceInput): Promise<FFNode> {
  const trace = await store.create({
    kind: 'trace',
    title: input.action,
    body: input.detail ?? '',
    actor: input.actor,
    importance: input.importance ?? 'normal',
    tags: input.tags ?? [],
    parentId: input.inChat,
  });
  for (const id of input.read ?? []) await store.link(trace.id, id, 'read');
  for (const id of input.wrote ?? []) await store.link(trace.id, id, 'wrote');
  if (input.inChat) await store.link(trace.id, input.inChat, 'in');
  return store.require(trace.id);
}
