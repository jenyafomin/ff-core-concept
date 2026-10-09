// @ff/brain/read/presets — morning · evening · open · scope digests (SPEC R-6, AC-44).
//
// Ceiling for every digest: ≤4000 chars, ≤12 lines, the remainder as «ещё N»; every item line carries the
// label and the id tail. Presets are data-driven by FIELD VALUES (`status`, `priority`, `due`), never by
// type names (AC-14): any record whose `status` field is an open/done value takes part.
// Cold records are hidden from presets unless `include_cold` (find itself still finds them).
import { LIMITS, RECEIPT_ID_TAIL, type FindPreset } from '../contract.js';

import type { VisibleRecord } from './access.js';

/** `status` field values that mean «not closed yet». */
export const OPEN_STATUS_VALUES: readonly string[] = ['open', 'doing', 'blocked'];
/** `status` field value that means «closed as done». */
export const DONE_STATUS_VALUE = 'done';
/** evening: open and not touched for longer than this. */
export const STALE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PresetResult {
  /** Ordered items the preset returns (paginated by find). */
  items: VisibleRecord[];
  digest: string;
  overdue?: number;
}

// ─── helpers ───────────────────────────────────────────────────────────────────────────────────────

const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);

export const statusFieldOf = (v: VisibleRecord): string | undefined => str(v.rec.fields.status);
export const dueOf = (v: VisibleRecord): string | undefined => str(v.rec.fields.due);
export const isOpen = (v: VisibleRecord): boolean => OPEN_STATUS_VALUES.includes(statusFieldOf(v) ?? '');
export const updatedAtOf = (v: VisibleRecord): string => v.rec.meta.updated_at || v.touched_at;

/** Local calendar day `YYYY-MM-DD` (the service runs on the owner's machine → owner's day). */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const isoDayKey = (iso: string): string | undefined => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : dayKey(d);
};

function priorityRank(v: VisibleRecord): number {
  const m = /^p(\d)$/.exec(str(v.rec.fields.priority) ?? '');
  return m ? Number(m[1]) : 9;
}

export const byUpdatedDesc = (a: VisibleRecord, b: VisibleRecord): number => {
  const ua = updatedAtOf(a);
  const ub = updatedAtOf(b);
  if (ua !== ub) return ua < ub ? 1 : -1;
  return a.rec.id < b.rec.id ? 1 : a.rec.id > b.rec.id ? -1 : 0;
};

/** Carrier order: pinned → priority (p0 first) → due (earliest first, none last) → freshest. */
export function byCarrier(a: VisibleRecord, b: VisibleRecord): number {
  if (a.rec.meta.pinned !== b.rec.meta.pinned) return a.rec.meta.pinned ? -1 : 1;
  const pa = priorityRank(a);
  const pb = priorityRank(b);
  if (pa !== pb) return pa - pb;
  const da = dueOf(a) ?? '9999';
  const db = dueOf(b) ?? '9999';
  if (da !== db) return da < db ? -1 : 1;
  return byUpdatedDesc(a, b);
}

export function isOverdue(v: VisibleRecord, today: string): boolean {
  const due = dueOf(v);
  return isOpen(v) && due !== undefined && due.slice(0, 10) < today;
}

/** One digest line: `<mark> <label> · <status/due> · #<id tail>`. */
export function itemLine(v: VisibleRecord, mark = '•'): string {
  const bits = [statusFieldOf(v), dueOf(v) ? `до ${dueOf(v)}` : undefined].filter(Boolean);
  const extra = bits.length ? ` · ${bits.join(' · ')}` : '';
  return `${mark} ${v.rec.label}${extra} · #${v.rec.id.slice(-RECEIPT_ID_TAIL)}`;
}

export interface DigestLine {
  text: string;
  /** Item lines count toward «ещё N»; headers do not. */
  item: boolean;
}

/**
 * Join lines under the ceiling (≤presetMaxLines, ≤presetMaxChars). Lines that do not fit are dropped from
 * the end and replaced by one «ещё N» line (N = item lines not shown + `hiddenExtra`).
 */
export function capDigest(lines: DigestLine[], hiddenExtra = 0): string {
  const maxLines = LIMITS.presetMaxLines;
  const maxChars = LIMITS.presetMaxChars;
  const totalItems = lines.filter((l) => l.item).length + hiddenExtra;
  const render = (kept: DigestLine[]): string => {
    const shown = kept.filter((l) => l.item).length;
    const rest = totalItems - shown;
    return [...kept.map((l) => l.text), ...(rest > 0 ? [`ещё ${rest}`] : [])].join('\n');
  };
  const fits = (kept: DigestLine[]): boolean => {
    const s = render(kept);
    return s.split('\n').length <= maxLines && s.length <= maxChars;
  };
  // never more than maxLines candidates — keeps this O(maxLines) on a 10k-record preset
  const kept = lines.slice(0, maxLines);
  while (kept.length && !fits(kept)) kept.pop();
  return render(kept);
}

// ─── presets ───────────────────────────────────────────────────────────────────────────────────────

export interface PresetInput {
  preset: FindPreset;
  /** Records already through the gates and find's filters. */
  records: VisibleRecord[];
  now: Date;
  includeCold: boolean;
  /** Human label of the scope filter (preset `scope`). */
  scopeLabel?: string;
}

export function runPreset(i: PresetInput): PresetResult {
  const pool = i.includeCold ? i.records : i.records.filter((v) => v.rec.meta.temperature !== 'cold');
  switch (i.preset) {
    case 'morning':
      return morning(pool, i.now);
    case 'evening':
      return evening(pool, i.now);
    case 'open':
      return openPreset(pool);
    case 'scope':
      return scopePreset(pool, i.scopeLabel);
  }
}

/** morning: ≤2 carriers (pin → p0 → due) + the number of overdue open items. */
function morning(pool: VisibleRecord[], now: Date): PresetResult {
  const today = dayKey(now);
  const open = pool.filter(isOpen).sort(byCarrier);
  const overdue = open.filter((v) => isOverdue(v, today)).length;
  const carriers = open.slice(0, LIMITS.morningCarriersMax);
  const lines: DigestLine[] = [
    { text: `Утро · открыто ${open.length} · просрочено ${overdue}`, item: false },
    ...carriers.map((v) => ({ text: itemLine(v, isOverdue(v, today) ? '!' : '•'), item: true })),
  ];
  return { items: carriers, digest: capDigest(lines, open.length - carriers.length), overdue };
}

/** evening: done today + changed today (by the act's `recordedAt`) + open untouched > 7 days. */
function evening(pool: VisibleRecord[], now: Date): PresetResult {
  const today = dayKey(now);
  const staleBefore = new Date(now.getTime() - STALE_DAYS * DAY_MS).toISOString();
  const touchedToday = (v: VisibleRecord) => isoDayKey(v.touched_at) === today;
  const done = pool.filter((v) => touchedToday(v) && statusFieldOf(v) === DONE_STATUS_VALUE).sort(byUpdatedDesc);
  const changed = pool.filter((v) => touchedToday(v) && statusFieldOf(v) !== DONE_STATUS_VALUE).sort(byUpdatedDesc);
  const stale = pool
    .filter((v) => isOpen(v) && v.touched_at !== '' && v.touched_at < staleBefore)
    .sort((a, b) => (a.touched_at < b.touched_at ? -1 : a.touched_at > b.touched_at ? 1 : 0));
  const lines: DigestLine[] = [
    { text: `Вечер · закрыто ${done.length} · изменено ${changed.length} · не тронуто >${STALE_DAYS} дн ${stale.length}`, item: false },
    ...done.map((v) => ({ text: itemLine(v, '✓'), item: true })),
    ...changed.map((v) => ({ text: itemLine(v, '•'), item: true })),
    ...stale.map((v) => ({ text: itemLine(v, '⏳'), item: true })),
  ];
  return { items: [...done, ...changed, ...stale], digest: capDigest(lines) };
}

function openPreset(pool: VisibleRecord[]): PresetResult {
  const open = pool.filter(isOpen).sort(byCarrier);
  const lines: DigestLine[] = [
    { text: `Открыто ${open.length}`, item: false },
    ...open.map((v) => ({ text: itemLine(v), item: true })),
  ];
  return { items: open, digest: capDigest(lines) };
}

function scopePreset(pool: VisibleRecord[], scopeLabel?: string): PresetResult {
  const all = [...pool].sort(byUpdatedDesc);
  const lines: DigestLine[] = [
    { text: `${scopeLabel ? `Область ${scopeLabel}` : 'Все области'} · ${all.length}`, item: false },
    ...all.map((v) => ({ text: itemLine(v), item: true })),
  ];
  return { items: all, digest: capDigest(lines) };
}
