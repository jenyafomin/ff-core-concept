/**
 * The single primitive of the whole system.
 *
 * Everything is a node: tasks, notes, thoughts, but also groups (directions),
 * chats, agents, messages, traces and summaries. Structure is `parentId`
 * (nesting), directions are `tags`, connections are `links`, and configured
 * context cascades down the `parentId` chain (see context.ts).
 *
 * Levels (zoom) are NOT stored — they are computed from title/body (see levels.ts):
 *   L1 = title, L2 = snippet of body, L3 = full body.
 */

/** Kinds of node. The graph is uniform; kind is a discriminator/filter, not a separate table. */
export const NODE_KINDS = [
  'task', // actionable; carries status + due
  'note', // a knowledge-base entry
  'thought', // raw captured idea (inbox), not yet triaged
  'group', // a container/direction/super-chat (e.g. "Финансы")
  'chat', // a workspace where agents and the user converse
  'agent', // an agent definition (role + instructions live in body/context)
  'message', // a single message inside a chat
  'trace', // a record of an agent action (what it read → what it wrote)
  'summary', // a compaction of a chat's conversation context
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

/** Importance governs what survives context compaction. `pinned` never gets summarized away. */
export const IMPORTANCE = ['low', 'normal', 'high', 'pinned'] as const;
export type Importance = (typeof IMPORTANCE)[number];

/** Status only carries meaning for tasks; a note simply has no status. */
export const TASK_STATUS = ['open', 'doing', 'blocked', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

/** A typed, directed edge to another node (the "links table", embedded per node). */
export interface Link {
  to: string;
  rel: string;
}

export interface FFNode {
  id: string;
  kind: NodeKind;
  /** L1 — the one-line essence. */
  title: string;
  /** L3 — the full text (markdown). L2 is derived from this. */
  body: string;
  /** Directions and free tags. A node can belong to many directions at once. */
  tags: string[];
  /** Nesting / hierarchy. A subtask extends its parent's context. */
  parentId?: string;
  /** Outgoing cross-links (peer relationships, not nesting). */
  links: Link[];
  /** Task-only. */
  status?: TaskStatus;
  /** ISO date (YYYY-MM-DD) or datetime. Task-only. */
  due?: string;
  importance: Importance;
  /** CLAUDE.md-like configured context for this node; cascades to descendants. */
  context?: string;
  /** Who created/owns the node: 'user' or an agent id. */
  actor?: string;
  /** ISO timestamps. */
  created: string;
  updated: string;
  /** Escape hatch for kind-specific fields without schema churn. */
  meta?: Record<string, unknown>;
}

/** Fields accepted when creating a node; the store fills in the rest. `id` is optional (auto-generated if omitted). */
export type NodeInput = Partial<Omit<FFNode, 'created' | 'updated'>> &
  Pick<FFNode, 'kind' | 'title'>;
