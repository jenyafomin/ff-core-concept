/**
 * process-view — a READ LENS over the `agent_trace` SIDE-JOURNAL: «что происходит во флоте». It is the
 * second tenant of the graph, read WITHOUT touching the first (the owner's day). Where `day-graph.ts` reads
 * the owner's life AFTER it folded into graph NODES (`store.load()`), process-view reads the SYSTEM's runtime
 * events straight off the ACTS log (`store.acts()`) — because an `agent_trace` NEVER projects (`isProjectable`
 * filters it, core/projection.ts:42), so it is simply not present in the projected node list. That absence is
 * the proof, not a bug: «телеметрия ≠ жизнь» holds by structure. Same shape as agent-run.ts/day-graph.ts.
 *
 * Ranking is by process-health severity (critical → ok), then observation time — NOT by salience/degree
 * (there is no weight engine). Pure over the write-model.
 */
import { sourceRefOf } from '../core/projection.js';
import type { Act } from '../core/types.js';
import { AGENT_EVENT_PREFIX } from './agent-event-ingest.js';

/** Severity → sort rank (critical first) and display marker, mirroring FleetObserver 🔴🟠🟡🟢. */
const SEVERITY: Record<string, { rank: number; mark: string }> = {
  critical: { rank: 0, mark: '🔴' },
  warn: { rank: 1, mark: '🟠' },
  watch: { rank: 2, mark: '🟡' },
  ok: { rank: 3, mark: '🟢' },
};

/** One runtime event as the lens sees it (read off its `agent_trace` act). */
export interface ProcessNode {
  /** The event's natural key (`agent-event:<eventId>`). */
  id: string;
  kind: string;
  severity: string;
  unit: string;
  summary: string;
  /** Source observation time (provenance.observed_at) or the engine's recordedAt if absent. */
  observedAt: string;
  /** RESERVED bidirectionality marker — 'export' today (W2-02 §5). */
  direction: string;
}

export interface ProcessView {
  events: ProcessNode[];
  /** Count of events by severity word (e.g. { critical: 1, warn: 1, … }). */
  bySeverity: Record<string, number>;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function provenanceObj(a: Act): Record<string, unknown> {
  const p = a.provenance;
  return p !== null && typeof p === 'object' ? (p as Record<string, unknown>) : {};
}

/** Is this act a seam runtime-event (an `agent_trace` in the `agent-event:` namespace)? */
function isSeamTrace(a: Act): boolean {
  return a.actKind === 'agent_trace' && (sourceRefOf(a) ?? '').startsWith(AGENT_EVENT_PREFIX);
}

function toProcessNode(a: Act): ProcessNode {
  const body = (a.payload ?? {}) as Record<string, unknown>;
  const prov = provenanceObj(a);
  return {
    id: sourceRefOf(a) as string,
    kind: asString(body.kind, 'unknown'),
    severity: asString(body.severity, 'ok'),
    unit: asString(body.unit),
    summary: asString(body.summary),
    observedAt: asString(prov.observed_at, a.recordedAt),
    direction: asString(body.direction, 'export'),
  };
}

/**
 * Build the process-view from the write-model (`store.acts()`). Filters to seam `agent_trace` events, ranks
 * by severity then observation time, and tallies by severity. Pure over the acts log.
 */
export function processView(acts: readonly Act[]): ProcessView {
  const events = acts
    .filter(isSeamTrace)
    .map(toProcessNode)
    .sort(
      (a, b) =>
        (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9) ||
        a.observedAt.localeCompare(b.observedAt),
    );

  const bySeverity: Record<string, number> = {};
  for (const e of events) bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;

  return { events, bySeverity };
}

/** Render the process-view as a plain string: severity-marked runtime events, critical first. */
export function renderProcessView(acts: readonly Act[]): string {
  const view = processView(acts);
  const lines: string[] = [`Процесс-вид — флот  (${view.events.length} событий)`, ''];
  for (const e of view.events) {
    const mark = SEVERITY[e.severity]?.mark ?? '·';
    lines.push(`${mark} [${e.kind}] ${e.unit} — ${e.summary}`);
  }
  return lines.join('\n');
}
