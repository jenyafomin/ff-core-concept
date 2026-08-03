/**
 * latest-wins.test — EQ-1 read-path reducer (spec §8 AC-1..AC-6, AC-7/AC-8 deferred to M3).
 * Pure Act fixtures — no engine/store/observer instantiated.
 */
import { describe, it, expect } from 'vitest';
import type { Act } from '@ff/engine';
import { latestObservationsPerKey, currentObservation, observationKey } from '../src/observation/latest-wins.js';

let seq = 0;
/** Minimal observation Act fixture. `recordedAt` is caller-controlled here (unlike engine writes) so
 * AC-3 can construct an inverted-clock scenario. */
function obsAct(payload: Record<string, unknown>, opts: { recordedAt?: string; ref?: string } = {}): Act {
  seq += 1;
  return {
    id: `act:obs:test:${seq}`,
    actor: 'sync:test',
    provenance: { source_ref: opts.ref ?? String(payload.ref ?? 'r'), kind: 'test-observation' },
    recordedAt: opts.recordedAt ?? new Date(2026, 0, seq).toISOString(),
    actKind: 'observation',
    edges: [],
    payload,
  };
}

describe('latestObservationsPerKey (EQ-1)', () => {
  it('AC-1/AC-2: two observations, same key — later wins current, earlier retained as superseded', () => {
    const stale = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 100 });
    const fixed = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 40 });
    const { current, superseded } = latestObservationsPerKey([stale, fixed]);

    expect(current).toHaveLength(1);
    expect(current[0]).toBe(fixed);
    expect((current[0]!.payload as any).remaining).toBe(40);

    expect(superseded).toHaveLength(1);
    expect(superseded[0]).toBe(stale);
  });

  it('AC-3: journal position decides, not recordedAt — inverted clock does not flip the winner', () => {
    const earlyByPosition = obsAct(
      { type: 'balance-observation', subject: 'order', ref: 'R', remaining: 100 },
      { recordedAt: '2026-07-30T12:00:00.000Z' }, // later wall-clock timestamp
    );
    const laterByPosition = obsAct(
      { type: 'balance-observation', subject: 'order', ref: 'R', remaining: 40 },
      { recordedAt: '2026-07-30T09:00:00.000Z' }, // earlier wall-clock timestamp (clock stepped back)
    );
    const { current } = latestObservationsPerKey([earlyByPosition, laterByPosition]);

    expect(current).toHaveLength(1);
    expect(current[0]).toBe(laterByPosition); // last-by-position wins despite smaller recordedAt
  });

  it('AC-4: different subjects with the same ref do not collide into one key', () => {
    const orderObs = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 40 });
    const orphanObs = obsAct({ type: 'balance-observation', subject: 'orphan-payment', ref: 'R', remaining: 15 });
    const { current } = latestObservationsPerKey([orderObs, orphanObs]);

    expect(current).toHaveLength(2);
    expect(current).toContain(orderObs);
    expect(current).toContain(orphanObs);
    expect(observationKey(orderObs)).not.toBe(observationKey(orphanObs));
  });

  it('AC-5: an observation act missing type/subject/ref is excluded from current AND superseded', () => {
    const good = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 40 });
    const malformed = obsAct({ remaining: 999 }); // no type/subject/ref
    const { current, superseded } = latestObservationsPerKey([good, malformed]);

    expect(current).toEqual([good]);
    expect(superseded).toHaveLength(0);
    expect(observationKey(malformed)).toBeUndefined();
  });

  it('a later correction (new act, later position) supersedes the prior one', () => {
    const v1 = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 100 });
    const v2 = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 40 });
    const v3 = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 25 });
    const { current, superseded } = latestObservationsPerKey([v1, v2, v3]);

    expect(current).toEqual([v3]);
    expect(superseded).toEqual([v1, v2]);
  });

  it('empty input yields empty output', () => {
    expect(latestObservationsPerKey([])).toEqual({ current: [], superseded: [] });
  });

  it('AC-6: LOSE-NOTHING — current+superseded accounts for every valid observation act, deterministically', () => {
    const acts = [
      obsAct({ type: 'balance-observation', subject: 'order', ref: 'R1', remaining: 100 }),
      obsAct({ type: 'balance-observation', subject: 'order', ref: 'R1', remaining: 40 }),
      obsAct({ type: 'balance-observation', subject: 'orphan-payment', ref: 'R1', remaining: 15 }),
      obsAct({ remaining: 999 }), // malformed — excluded, not counted
      obsAct({ type: 'balance-observation', subject: 'order', ref: 'R2', remaining: 5 }),
    ];
    const validCount = 4; // all but the malformed one

    const run1 = latestObservationsPerKey(acts);
    const run2 = latestObservationsPerKey(acts);

    expect(run1.current.length + run1.superseded.length).toBe(validCount);
    expect(run1).toEqual(run2); // deterministic — same input, same output
    // nothing mutated
    expect(acts[3]!.payload).toEqual({ remaining: 999 });
  });

  it('currentObservation returns the winning act for a given key, or undefined', () => {
    const stale = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 100 });
    const fixed = obsAct({ type: 'balance-observation', subject: 'order', ref: 'R', remaining: 40 });
    const acts = [stale, fixed];

    expect(currentObservation(acts, 'balance-observation:order:R')).toBe(fixed);
    expect(currentObservation(acts, 'balance-observation:order:NOPE')).toBeUndefined();
  });
});
