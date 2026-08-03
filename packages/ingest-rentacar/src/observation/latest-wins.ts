/**
 * latest-wins — EQ-1 read-path reducer (spec §4-§5): collapses `observation` acts to ONE current
 * act per observation key, losing nothing. Pure fold over `Act[]` in journal order — no engine,
 * no store, no clock. Journal POSITION is the only order that decides a winner (§3): the act
 * encountered LAST in the input array wins its key; `recordedAt` is never consulted (wall-clock,
 * can go backwards under NTP/multi-writer skew).
 *
 * Key (§4): `${payload.type}:${payload.subject}:${payload.ref}` — derived from `payload`, NOT
 * `provenance` (provenance.source_ref + kind alone cannot distinguish subjects sharing a ref).
 * An `observation` act missing any of `{type, subject, ref}` in its payload is EXCLUDED from the
 * fold entirely (not merged into any group) — a signal to fix the write side, not a silent merge.
 *
 * LOSE-NOTHING (doc-tree law 10 / ADR-0008 discipline applied to the observation side-journal):
 * every accepted act ends up in exactly one of `current` / `superseded`; nothing is dropped or
 * mutated.
 */
import type { Act } from '@ff/engine';

/** The three payload fields the reducer requires to compute an observation key (§4). */
interface ObservationPayload {
  type: string;
  subject: string;
  ref: string;
  [k: string]: unknown;
}

export interface LatestWinsResult {
  /** One act per observation key: the latest-by-journal-position act. */
  current: Act[];
  /** Every non-winning act of a multi-act key, retained in journal order (audit/history). */
  superseded: Act[];
}

function observationPayload(act: Act): ObservationPayload | null {
  if (act.actKind !== 'observation') return null;
  const p = act.payload as Partial<ObservationPayload> | undefined;
  if (
    p === undefined ||
    p === null ||
    typeof p !== 'object' ||
    typeof p.type !== 'string' ||
    typeof p.subject !== 'string' ||
    typeof p.ref !== 'string'
  ) {
    return null;
  }
  return p as ObservationPayload;
}

/** `obsKey(act)` (§4) — undefined if the act carries no complete observation key. */
export function observationKey(act: Act): string | undefined {
  const p = observationPayload(act);
  return p ? `${p.type}:${p.subject}:${p.ref}` : undefined;
}

/**
 * The core fold (§5). Input `acts` MUST be in journal order (as `store.acts()` returns it).
 * Acts without `actKind === 'observation'` or without a full `{type, subject, ref}` payload key
 * are excluded from both `current` and `superseded` (§5 step 1) — they are simply not observations
 * this reducer has an opinion about.
 */
export function latestObservationsPerKey(acts: Act[]): LatestWinsResult {
  // Track the winner's index per key as we walk forward — the LAST-seen act per key wins (§5.3).
  const winnerIndexByKey = new Map<string, number>();
  const keyedIndices: Array<{ key: string; index: number }> = [];

  acts.forEach((act, index) => {
    const key = observationKey(act);
    if (key === undefined) return; // no key ⇒ excluded from the fold entirely (§5 step 1 / AC-5)
    keyedIndices.push({ key, index });
    winnerIndexByKey.set(key, index); // later occurrence overwrites — last write (by position) wins
  });

  const winningIndices = new Set(winnerIndexByKey.values());
  const current: Act[] = [];
  const superseded: Act[] = [];

  for (const { index } of keyedIndices) {
    (winningIndices.has(index) ? current : superseded).push(acts[index]!);
  }

  return { current, superseded };
}

/** Convenience: the current act's payload for a given observation key, or undefined if absent. */
export function currentObservation(acts: Act[], key: string): Act | undefined {
  return latestObservationsPerKey(acts).current.find((act) => observationKey(act) === key);
}
