/**
 * agent-run — a READ LENS over the CQRS read-model: «граф прогона». The system's OWN orchestration (agent
 * waves) after it has been folded into real GRAPH NODES (`domain_event` acts, one node per source_ref) wired
 * by typed `Edge`s. It renders the run as what it now IS in memory: agents · tasks · findings · verdicts +
 * typed edges, read back off the store's projected graph (`store.load()`) — i.e. after a reboot, straight
 * from disk. This is memory REMEMBERING ITSELF: the run that built the memory is now durable memory.
 *
 * Like day-graph.ts, this is a lens over ENVELOPE NODES (the projected graph), NOT a compiled `ViewDef` —
 * the frozen view enum (`cost-tree | visible-to | actions-by-agent`, core/types.ts) has no "run" kind and
 * inventing a fourth would edit a frozen enum. A plain lens over projected nodes stays honest to the API.
 *
 * Ranking is by graph structure, not salience: there is deliberately NO weight/decay engine yet.
 * `body.salience` is a RESERVED empty slot (F-B, always null today) — `salienceReserved` surfaces its
 * presence, never a value. Superseded / patched threads are shown DIMMED, never dropped (Ц4 — living memory).
 */
import type { EnvelopeNode } from '../core/types.js';

/** id-prefixes that mark the run's projected nodes (source_ref namespaces from agent-run-seed.mjs). */
const AGENT_PREFIX = 'agent:';
const RUN_PREFIX = 'run:';

/** Statuses rendered "present but dimmed" (○). No decay engine yet — mirrors day-graph. Superseded/patch
 * threads stay in the graph (Ц4) but are marked as no-longer-current. */
const COLD_STATUSES = new Set(['superseded', 'patch', 'blocked', 'cold']);

/** One outgoing typed edge, resolved to the target's human label for rendering. */
export interface RunGraphEdge {
  predicate: string;
  target: string;
  targetLabel: string;
}

/** One projected run/agent node as the lens sees it. */
export interface RunGraphNode {
  id: string;
  kind: string; // node.type — 'agent' | 'task' | 'finding' | 'verdict'
  label: string;
  status: string;
  summary: string;
  cold: boolean;
  /** F-B: whether the reserved (empty) salience slot is present on the node body. Never a value — empty today. */
  salienceReserved: boolean;
  /** verdict only: the resulting commit, if the thread recorded one (body data, not a node). */
  commit?: string;
  out: RunGraphEdge[];
}

export interface RunGraphView {
  /** The session date (from the `run:<date>:…` ids). */
  run: string;
  /** The agent-referents (id `agent:…`) — real nodes, Ц6. */
  agents: RunGraphNode[];
  /** The tasks (id `run:…:task:…`). */
  tasks: RunGraphNode[];
  /** The findings / analyses (id `run:…:finding:…`). */
  findings: RunGraphNode[];
  /** The verdicts (id `run:…:verdict:…`). */
  verdicts: RunGraphNode[];
  /** Total typed edges across every node. */
  edgeCount: number;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function isAgentNode(n: EnvelopeNode): boolean {
  return n.id.startsWith(AGENT_PREFIX);
}
function isRunNode(n: EnvelopeNode): boolean {
  return n.id.startsWith(RUN_PREFIX);
}

/** The date component of a `run:<date>:<slug>` id, or '' if none is present. */
function dateOf(id: string): string {
  const parts = id.split(':');
  return parts[0] === 'run' && parts.length >= 3 ? parts[1]! : '';
}

function toGraphNode(n: EnvelopeNode, labelOf: (id: string) => string): RunGraphNode {
  const body = (n.body ?? {}) as Record<string, unknown>;
  const status = asString(body.status, 'unknown');
  const node: RunGraphNode = {
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
  if (typeof body.commit === 'string') node.commit = body.commit;
  return node;
}

/**
 * Build the run-graph view from the projected graph (`store.load()`). Filters to the run's own nodes
 * (`agent:` / `run:`), partitions the run-threads by type, resolves each edge target to its label, and
 * counts edges. Pure over the read-model.
 */
export function runGraphView(nodes: readonly EnvelopeNode[]): RunGraphView {
  const agentNodes = nodes.filter(isAgentNode);
  const runNodes = nodes.filter(isRunNode);

  const labelById = new Map<string, string>();
  for (const n of [...agentNodes, ...runNodes]) {
    const body = (n.body ?? {}) as Record<string, unknown>;
    labelById.set(n.id, asString(body.label, n.id));
  }
  const labelOf = (id: string) => labelById.get(id) ?? id;

  const agents = agentNodes.map((n) => toGraphNode(n, labelOf));
  const run = runNodes.map((n) => toGraphNode(n, labelOf));
  const tasks = run.filter((n) => n.kind === 'task');
  const findings = run.filter((n) => n.kind === 'finding');
  const verdicts = run.filter((n) => n.kind === 'verdict');

  const edgeCount =
    agents.reduce((s, n) => s + n.out.length, 0) + run.reduce((s, n) => s + n.out.length, 0);
  const date = runNodes.map((n) => dateOf(n.id)).find(Boolean) ?? '';

  return { run: date, agents, tasks, findings, verdicts, edgeCount };
}

/** Render the run-graph as a plain string: agents · tasks · findings · verdicts + typed edges. */
export function renderRunGraph(nodes: readonly EnvelopeNode[]): string {
  const view = runGraphView(nodes);
  const total = view.agents.length + view.tasks.length + view.findings.length + view.verdicts.length;

  const lines: string[] = [
    `Граф прогона — ${view.run}  (${total} узлов · ${view.edgeCount} рёбер)`,
    '',
    'Агенты:',
  ];
  for (const a of view.agents) {
    lines.push(`· ${a.label}`);
    for (const e of a.out) lines.push(`    → ${e.predicate}: ${e.targetLabel}`);
  }

  const section = (title: string, ns: RunGraphNode[]) => {
    if (!ns.length) return;
    lines.push('', `${title}:`);
    for (const n of ns) {
      const bullet = n.cold ? '○' : '●';
      const commit = n.commit ? ` · commit ${n.commit}` : '';
      lines.push(`${bullet} ${n.label} — ${n.status} · ${n.summary}${commit}`);
      for (const e of n.out) lines.push(`    → ${e.predicate}: ${e.targetLabel}`);
    }
  };
  section('Задачи', view.tasks);
  section('Находки', view.findings);
  section('Вердикты', view.verdicts);

  return lines.join('\n');
}
