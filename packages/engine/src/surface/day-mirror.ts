/**
 * day-mirror — a READ LENS over the durable log: «зеркало дня» (the first real code-grain of the arc:
 * prove the wire "write a real life-node into memory → read it back with a lens" on the owner's actual day).
 *
 * WHY A LENS, NOT A ViewDef (honest about the real API): the frozen view-compiler `ViewDef.kind` enum is
 * the three GRAPH lenses (`cost-tree | visible-to | actions-by-agent`, core/types.ts §ViewDef) over the
 * CQRS read-model. The owner's day-nodes are written as `observation` acts, and observations are a
 * SIDE-JOURNAL: `isProjectable` (core/projection.ts) folds ONLY `domain_event` into graph nodes, so
 * observations ride the append-only log but NEVER become graph nodes. The faithful "read back" is therefore
 * a lens over `store.acts()` (the durable write-model / system-of-record), NOT a compiled ViewDef of a new
 * kind — inventing a fourth ViewDef kind would edit a frozen enum. Ranking is by `recordedAt` (a recency
 * proxy; there is deliberately NO salience/decay engine yet — deferred). The `эмоц-ресурс` condition is
 * SHOWN, never gated (no enforcement — deferred).
 */
import type { Act } from '../core/types.js';

/** One rendered row of the mirror, projected from an owner `observation` act's payload. */
export interface DayMirrorRow {
  /** Stable node handle (payload.node), e.g. `движ`. */
  node: string;
  /** Human label (payload.label; falls back to `node`). */
  label: string;
  /** Reserved body status (payload.status): `active | blocked | draft | …`. */
  status: string;
  /** Date portion of the engine-assigned `recordedAt` (recency proxy for "last_touched"). */
  lastTouched: string;
  /** One-line verbatim summary (payload.summary). */
  summary: string;
  /** Named people this node refers to (payload.referent) — Ц7 consent-FORM dogfood, NOT enforced. */
  referents: string[];
  /** `blocked`/`cold` → render with ○ (shown, but marked). Everything else → ●. */
  cold: boolean;
}

/** Statuses rendered "present but dimmed" (○). No decay engine yet — `cold` is reserved for later. */
const COLD_STATUSES = new Set(['blocked', 'cold']);

/** The node drawn as a standalone condition-line, not ranked in the list ("condition for everything"). */
export const CONDITION_NODE = 'эмоц-ресурс';

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/**
 * Extract mirror rows from the durable log. Filters to owner `observation` acts carrying a `payload.node`,
 * then ranks by `recordedAt` descending (freshest first). Array.sort is stable, so acts written in the same
 * millisecond keep their append (write) order — an honest recency proxy for a single day's writes.
 */
export function dayMirrorRows(acts: readonly Act[]): DayMirrorRow[] {
  const observations = acts.filter(
    (a) => a.actKind === 'observation' && a.payload != null && typeof a.payload === 'object',
  );
  const byRecency = [...observations].sort((a, b) => (b.recordedAt ?? '').localeCompare(a.recordedAt ?? ''));

  const rows: DayMirrorRow[] = [];
  for (const a of byRecency) {
    const p = a.payload as Record<string, unknown>;
    const node = asString(p.node);
    if (!node) continue;
    const status = asString(p.status, 'unknown');
    const referents = Array.isArray(p.referent)
      ? (p.referent.filter((x) => typeof x === 'string') as string[])
      : [];
    rows.push({
      node,
      label: asString(p.label, node),
      status,
      lastTouched: (a.recordedAt ?? '').slice(0, 10),
      summary: asString(p.summary),
      referents,
      cold: COLD_STATUSES.has(status),
    });
  }
  return rows;
}

/** Render the day-mirror as a plain string. `date` defaults to the freshest row's `lastTouched`. */
export function renderDayMirror(acts: readonly Act[], opts: { date?: string } = {}): string {
  const rows = dayMirrorRows(acts);
  const condition = rows.find((r) => r.node === CONDITION_NODE);
  const main = rows.filter((r) => r.node !== CONDITION_NODE);
  const date = opts.date ?? main[0]?.lastTouched ?? condition?.lastTouched ?? '';

  const lines: string[] = [`Зеркало дня — ${date}`, ''];
  for (const r of main) {
    const bullet = r.cold ? '○' : '●';
    let line = `${bullet} ${r.label} — ${r.status} · ${r.lastTouched} · ${r.summary}`;
    if (r.referents.length) line += `  ↳ referent: ${r.referents.join(', ')}`;
    lines.push(line);
  }
  if (condition) {
    lines.push('', `⚑ Условие (${condition.node}): ${condition.summary}`);
  }
  return lines.join('\n');
}
