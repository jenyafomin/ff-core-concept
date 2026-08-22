/**
 * day-graph — a READ LENS over the CQRS read-model: «граф дня». Where `day-mirror` is a lens over the
 * `observation` SIDE-JOURNAL (observations never project — core/projection.ts), day-graph reads the OWNER's
 * day AFTER it has been folded into real GRAPH NODES (`domain_event` acts, one node per source_ref) wired by
 * typed `Edge`s. It renders the day as what it now IS in memory: points + typed edges, read back off the
 * store's projected graph (`store.load()`) — i.e. after a reboot, straight from disk.
 *
 * This is a lens over ENVELOPE NODES (the projected graph), NOT a compiled `ViewDef` — the frozen view enum
 * (`cost-tree | visible-to | actions-by-agent`, core/types.ts) does not include a "day" kind, and inventing
 * a fourth would edit a frozen enum. A plain lens over projected nodes stays honest to the real API.
 *
 * Ranking is by graph structure, not salience: there is deliberately NO weight/decay engine yet. `body.salience`
 * is a RESERVED empty slot (F-B, always null today) — `salienceReserved` surfaces its presence, never a value.
 */
import type { EnvelopeNode } from '../core/types.js';

/** id-prefixes that mark the day's projected nodes (source_ref namespaces from day-graph-seed.mjs). */
const DAY_PREFIX = 'day:';
const PERSON_PREFIX = 'person:';

/** The thread drawn as a standalone condition-line ("условие для всего"), by its source_ref suffix. */
export const CONDITION_SUFFIX = ':эмоц-ресурс';

/** Statuses rendered "present but dimmed" (○). No decay engine yet — mirrors day-mirror. */
const COLD_STATUSES = new Set(['blocked', 'cold']);

/** One outgoing typed edge, resolved to the target's human label for rendering. */
export interface DayGraphEdge {
  predicate: string;
  target: string;
  targetLabel: string;
}

/** One projected day/person node as the lens sees it. */
export interface DayGraphNode {
  id: string;
  kind: string; // node.type — 'life-node' | 'person' | …
  label: string;
  status: string;
  summary: string;
  cold: boolean;
  /** F-B: whether the reserved (empty) salience slot is present on the node body. Never a value — always empty today. */
  salienceReserved: boolean;
  out: DayGraphEdge[];
}

export interface DayGraphView {
  date: string;
  /** The day-threads (id `day:…`), condition thread included. */
  nodes: DayGraphNode[];
  /** The people (id `person:…`) — real nodes, Ц6. */
  people: DayGraphNode[];
  /** Total typed edges across all day-threads. */
  edgeCount: number;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function isDayNode(n: EnvelopeNode): boolean {
  return n.id.startsWith(DAY_PREFIX);
}
function isPersonNode(n: EnvelopeNode): boolean {
  return n.id.startsWith(PERSON_PREFIX);
}

/** The date component of a `day:<date>:<node>` id, or '' if none is present. */
function dateOf(id: string): string {
  const parts = id.split(':');
  return parts[0] === 'day' && parts.length >= 3 ? parts[1]! : '';
}

function toGraphNode(n: EnvelopeNode, labelOf: (id: string) => string): DayGraphNode {
  const body = (n.body ?? {}) as Record<string, unknown>;
  const status = asString(body.status, 'unknown');
  return {
    id: n.id,
    kind: asString(n.type, 'record'),
    label: asString(body.label, n.id),
    status,
    summary: asString(body.summary),
    cold: COLD_STATUSES.has(status),
    salienceReserved: 'salience' in body, // F-B: slot present (empty), never surfaces a value
    out: (n.edges ?? []).map((e) => ({
      predicate: e.predicate,
      target: e.target,
      targetLabel: labelOf(e.target),
    })),
  };
}

/**
 * Build the day-graph view from the projected graph (`store.load()`). Filters to the day's own nodes
 * (`day:` / `person:`), resolves each edge's target to its label, and counts edges. Pure over the read-model.
 */
export function dayGraphView(nodes: readonly EnvelopeNode[]): DayGraphView {
  const dayNodes = nodes.filter(isDayNode);
  const personNodes = nodes.filter(isPersonNode);

  const labelById = new Map<string, string>();
  for (const n of [...dayNodes, ...personNodes]) {
    const body = (n.body ?? {}) as Record<string, unknown>;
    labelById.set(n.id, asString(body.label, n.id));
  }
  const labelOf = (id: string) => labelById.get(id) ?? id;

  const graphNodes = dayNodes.map((n) => toGraphNode(n, labelOf));
  const people = personNodes.map((n) => toGraphNode(n, labelOf));
  const edgeCount = graphNodes.reduce((s, n) => s + n.out.length, 0);
  const date = dayNodes.map((n) => dateOf(n.id)).find(Boolean) ?? '';

  return { date, nodes: graphNodes, people, edgeCount };
}

/** Render the day-graph as a plain string: points + typed edges + people. */
export function renderDayGraph(nodes: readonly EnvelopeNode[]): string {
  const view = dayGraphView(nodes);
  const condition = view.nodes.find((n) => n.id.endsWith(CONDITION_SUFFIX));
  const main = view.nodes.filter((n) => n.id !== condition?.id);

  const lines: string[] = [
    `Граф дня — ${view.date}  (${view.nodes.length + view.people.length} узлов · ${view.edgeCount} рёбер)`,
    '',
  ];
  for (const n of main) {
    const bullet = n.cold ? '○' : '●';
    lines.push(`${bullet} ${n.label} — ${n.status} · ${n.summary}`);
    for (const e of n.out) lines.push(`    → ${e.predicate}: ${e.targetLabel}`);
  }
  if (condition) {
    lines.push('', `⚑ Условие (${condition.label}): ${condition.summary}`);
    for (const e of condition.out) lines.push(`    → ${e.predicate}: ${e.targetLabel}`);
  }
  if (view.people.length) {
    lines.push('', 'Люди:');
    for (const p of view.people) lines.push(`· ${p.label}`);
  }
  return lines.join('\n');
}
