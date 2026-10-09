// AC-47 bench (opt-in: BRAIN_BENCH=1): 10k records → start ≤2 s, find p95 ≤100 ms, write p95 measured and
// reported in /health. The 10k journal is generated with the real planner (planRecord) and the store's own
// line format (splitAct), appended in one go — Engine.write is O(N) per act (risk R-7), so seeding through
// it would bench the seeding, not the service.
import { appendFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { splitAct } from '@ff/engine';
import { describe, expect, it } from 'vitest';

import { LIMITS } from '../src/contract.js';
import { cryptoRandom, systemClock } from '../src/domain/ids.js';
import { planRecord } from '../src/domain/validate-act.js';
import { BrainService } from '../src/service/runtime.js';

import { SEED_SCOPES, topicReader } from './domain/harness.js';
import { makeBrainFixture, OWNER_ID, THREAD_BRAIN } from './support/brain-fixture.js';

process.setMaxListeners(0);

const N = 10_000;
const p95 = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]!;
};
const r2 = (x: number) => Math.round(x * 100) / 100;

describe.skipIf(process.env.BRAIN_BENCH !== '1')('bench AC-47 (BRAIN_BENCH=1)', () => {
  it(`${N} records: start ≤2 s, find p95 ≤100 ms, write p95 in /health`, { timeout: 300_000 }, async () => {
    const fx = makeBrainFixture();
    const opts = { home: fx.home, scopes: SEED_SCOPES, nightlyBackup: false, backupEveryMs: 0 };
    try {
      // seed
      const seeder = BrainService.open(opts);
      await seeder.ready;
      const ctx = {
        registry: seeder.brain.registry,
        lookup: (id: string) => seeder.brain.store.readNode(id),
        clock: systemClock,
        random: cryptoRandom,
      };
      const reader = topicReader();
      const lines: string[] = [];
      const t0 = performance.now();
      for (let i = 0; i < N; i++) {
        const isTask = i % 3 !== 0;
        const plan = planRecord(
          {
            type: isTask ? 'task' : 'note',
            label: `${isTask ? 'Задача' : 'Заметка'} номер ${i}${i % 997 === 0 ? ' needle' : ''}`,
            scopes: [i % 2 ? 'brain' : 'agents'],
            ...(isTask ? { fields: { due: `2026-${String(1 + (i % 12)).padStart(2, '0')}-15`, priority: `p${i % 4}` } } : { fields: { text: `текст ${i}` } }),
          },
          reader,
          ctx,
        );
        if ('ok' in plan) throw new Error(plan.message);
        const { meta, erasable } = splitAct({ ...plan.act, recordedAt: new Date().toISOString() });
        lines.push(`${JSON.stringify({ ...meta, erasable })}\n`);
      }
      await seeder.close();
      appendFileSync(fx.journalPath, lines.join(''));
      const seedMs = performance.now() - t0;

      // start
      const s0 = performance.now();
      const svc = BrainService.open(opts);
      await svc.ready;
      const startMs = performance.now() - s0;
      try {
        const caller = { conversation_id: THREAD_BRAIN, message_id: '1', sender_id: OWNER_ID };
        const owner = { conversation_id: '-1004351636302', sender_id: OWNER_ID };
        const queries = [
          { text: 'needle' },
          { type: 'task', status: 'open', limit: 50 },
          { preset: 'scope' as const, scope: 'brain' },
          { preset: 'morning' as const },
          { due_before: '2026-03-01' },
        ];
        const times: number[] = [];
        let scopeDigest = '';
        for (let round = 0; round < 10; round++) {
          for (const q of queries) {
            const f0 = performance.now();
            const r = await svc.find(round % 2 ? caller : owner, q);
            times.push(performance.now() - f0);
            if (!r.ok) throw new Error(r.code);
            if (q.preset === 'scope') scopeDigest = r.digest ?? '';
          }
        }
        const findP95 = p95(times);

        const writeTimes: number[] = [];
        for (let i = 0; i < 30; i++) {
          const w0 = performance.now();
          const r = await svc.record({ ...caller, message_id: `w${i}` }, { type: 'task', label: `bench write ${i}` });
          writeTimes.push(performance.now() - w0);
          if (!r.ok) throw new Error(r.code);
        }
        const h = await svc.health();

        console.log(
          `[bench AC-47] records=${h.records} acts=${h.acts} seed=${r2(seedMs)}ms start=${r2(startMs)}ms ` +
            `find p95=${r2(findP95)}ms (max ${r2(Math.max(...times))}ms, n=${times.length}) ` +
            `write p95 (service)=${r2(p95(writeTimes))}ms /health.write_p95_ms=${h.write_p95_ms} ` +
            `scope digest=${scopeDigest.length} chars/${scopeDigest.split('\n').length} lines`,
        );
        expect(h.records).toBeGreaterThanOrEqual(N);
        expect(startMs).toBeLessThanOrEqual(2000);
        expect(findP95).toBeLessThanOrEqual(100);
        expect(typeof h.write_p95_ms).toBe('number');
        expect(scopeDigest.length).toBeLessThanOrEqual(LIMITS.presetMaxChars); // AC-44 at 10k
      } finally {
        await svc.close();
      }
    } finally {
      fx.cleanup();
    }
  });
});
