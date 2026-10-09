// Presets morning · evening · open · scope (R-6, AC-44): ceilings, carriers, overdue, today-by-recordedAt,
// cold hidden from presets but found by find.
import type { Act } from '@ff/engine';
import { afterEach, describe, expect, it } from 'vitest';

import { LIMITS, RECEIPT_ID_TAIL } from '../../src/contract.js';
import { lastRecordActOf, planRecord } from '../../src/domain/index.js';
import { find, runPreset, type ReadDeps, type VisibleRecord } from '../../src/read/index.js';
import { ok, openBrain, topicReader, type Brain } from '../domain/harness.js';

let b: Brain;
afterEach(() => b?.close());

const R = () => topicReader();
const deps = (br: Brain, now?: Date): ReadDeps => ({
  engine: br.d.engine,
  store: br.d.store,
  clock: now ? { now: () => now } : br.clock,
});

let seq = 0;
function patchMeta(br: Brain, id: string, patch: Record<string, unknown>): void {
  const last = lastRecordActOf(br.acts(), id)!;
  const payload = structuredClone(last.payload) as Record<string, any>;
  Object.assign(payload.meta, patch);
  const ack = br.d.engine.write({ ...last, id: `a_meta${(seq += 1).toString(36)}`, payload, edges: [] } as Act);
  if (!ack.ok) throw new Error(ack.reason);
}

function checkCeiling(digest: string): void {
  expect(digest.length).toBeLessThanOrEqual(LIMITS.presetMaxChars);
  expect(digest.split('\n').length).toBeLessThanOrEqual(LIMITS.presetMaxLines);
}

describe('morning', () => {
  it('≤2 carriers ordered pin → p0 → due, plus the overdue count', () => {
    b = openBrain(); // clock day = 2026-10-09
    ok(b.record({ type: 'task', label: 'Низкий без срока', fields: { priority: 'p2' } }));
    const p0 = ok(b.record({ type: 'task', label: 'Главное', fields: { priority: 'p0', due: '2026-10-20' } }));
    ok(b.record({ type: 'task', label: 'Просрочено', fields: { priority: 'p1', due: '2026-10-01' } }));
    ok(b.record({ type: 'task', label: 'Тоже просрочено', fields: { due: '2026-09-30' } }));
    const pinned = ok(b.record({ type: 'task', label: 'Закреплённое', fields: { priority: 'p3' } }));
    patchMeta(b, pinned.id, { pinned: true });
    ok(b.record({ type: 'task', label: 'Готово давно', fields: { status: 'done', due: '2026-01-01' } }));
    ok(b.record({ type: 'note', label: 'Не задача' }));

    const r = ok(find(R(), { preset: 'morning' }, deps(b)));
    expect(r.items.map((i) => i.id)).toEqual([pinned.id, p0.id]);
    expect(r.overdue).toBe(2);
    checkCeiling(r.digest!);
    expect(r.digest).toContain('открыто 5');
    expect(r.digest).toContain('просрочено 2');
    expect(r.digest).toContain(`#${p0.id.slice(-RECEIPT_ID_TAIL)}`);
    expect(r.digest!.split('\n').at(-1)).toBe('ещё 3');
  });

  it('due ties broken by priority first: p0 beats an earlier due', () => {
    b = openBrain();
    const early = ok(b.record({ type: 'task', label: 'Рано', fields: { due: '2026-10-10' } }));
    const p0 = ok(b.record({ type: 'task', label: 'p0', fields: { priority: 'p0' } }));
    const r = ok(find(R(), { preset: 'morning' }, deps(b)));
    expect(r.items.map((i) => i.id)).toEqual([p0.id, early.id]);
    expect(r.overdue).toBe(0);
  });
});

describe('evening (today by the act recordedAt)', () => {
  it('done today + changed today + open untouched > 7 days', () => {
    b = openBrain();
    const now = new Date();
    // an old open task whose only act was recorded 10 days ago. The engine stamps recordedAt with the wall
    // clock, so this piece of history is planned normally and appended straight to the store, backdated.
    const plan = planRecord({ type: 'task', label: 'Висит' }, R(), b.ctx());
    if ('ok' in plan) throw new Error(plan.message);
    const ancient = new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString();
    b.d.store.writeAct({ ...plan.act, recordedAt: ancient });
    const old = plan.id;

    const done = ok(b.record({ type: 'task', label: 'Закрыл' }));
    ok(b.record({ id: done.id, type: 'task', fields: { status: 'done' } } as never));
    const changed = ok(b.record({ type: 'note', label: 'Записал' }));

    const r = ok(find(R(), { preset: 'evening' }, deps(b, now)));
    expect(r.items.map((i) => i.id)).toEqual([done.id, changed.id, old]);
    checkCeiling(r.digest!);
    expect(r.digest).toContain('закрыто 1');
    expect(r.digest).toContain('изменено 1');
    expect(r.digest).toContain('не тронуто >7 дн 1');
    expect(r.digest).toContain('✓ Закрыл');
    expect(r.digest).toContain('⏳ Висит');

    // tomorrow nothing is "today" any more; the stale task is still listed
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    expect(ok(find(R(), { preset: 'evening' }, deps(b, tomorrow))).items.map((i) => i.id)).toEqual([old]);
  });
});

describe('cold records', () => {
  it('cold is hidden from presets but found by find; include_cold brings it back', () => {
    b = openBrain();
    const hot = ok(b.record({ type: 'task', label: 'Горячая' }));
    const cold = ok(b.record({ type: 'task', label: 'Холодная' }));
    patchMeta(b, cold.id, { temperature: 'cold' });
    const ids = (q: object) => ok(find(R(), q, deps(b))).items.map((i) => i.id);
    for (const preset of ['morning', 'open', 'scope'] as const) {
      expect(ids({ preset })).toEqual([hot.id]);
      expect(ids({ preset, include_cold: true }).sort()).toEqual([hot.id, cold.id].sort());
    }
    expect(ids({ text: 'холодная' })).toEqual([cold.id]);
  });
});

describe('scope / open ceilings (AC-44)', () => {
  it('scope preset over many long-label records: ≤12 lines, ≤4000 chars, «ещё N», each line has label + id tail', () => {
    b = openBrain();
    const made = [];
    for (let i = 0; i < 30; i++) made.push(ok(b.record({ type: 'note', label: `${String(i).padStart(2, '0')} ${'д'.repeat(110)}` })));
    const r = ok(find(R(), { preset: 'scope', scope: 'brain' }, deps(b)));
    checkCeiling(r.digest!);
    const lines = r.digest!.split('\n');
    expect(lines[0]).toBe('Область brain · 30');
    const itemLines = lines.slice(1, -1);
    expect(itemLines.length).toBeGreaterThan(0);
    for (const l of itemLines) {
      const rec = made.find((m) => l.includes(`#${m.id.slice(-RECEIPT_ID_TAIL)}`));
      expect(rec).toBeDefined();
      expect(l).toContain('д'.repeat(110));
    }
    expect(lines.at(-1)).toBe(`ещё ${30 - itemLines.length}`);
    expect(r.total).toBe(30);
  });

  it('runPreset on 10k records stays under the ceiling (pure, no journal)', () => {
    const now = new Date('2026-10-09T12:00:00Z');
    const records: VisibleRecord[] = [];
    for (let i = 0; i < 10_000; i++) {
      const id = `u_${i.toString(36).padStart(8, '0')}`;
      records.push({
        node: { id, type: 'task' } as never,
        touched_at: now.toISOString(),
        rec: {
          id,
          declared_type: 'task',
          type: 'task',
          type_v: 1,
          label: `${'я'.repeat(100)} ${i}`,
          status: 'active',
          visibility: 'scoped',
          fields: { status: 'open', due: i % 3 ? '2026-10-01' : '2026-11-01', priority: `p${i % 4}` },
          scopes: ['scope:brain'],
          edges: [],
          meta: { author: 'user:owner', created_at: '', updated_at: now.toISOString(), rev: 1, temperature: 'hot', pinned: false },
          readable_by: [],
          legacy: false,
        },
      });
    }
    for (const preset of ['morning', 'evening', 'open', 'scope'] as const) {
      const t0 = Date.now();
      const r = runPreset({ preset, records, now, includeCold: false });
      expect(Date.now() - t0).toBeLessThan(2000);
      checkCeiling(r.digest);
      expect(r.digest).toMatch(/ещё \d+$/);
      for (const l of r.digest.split('\n').slice(1, -1)) expect(l).toMatch(/я{100} \d+ .*#[0-9a-z]{6}$/);
    }
    const m = runPreset({ preset: 'morning', records, now, includeCold: false });
    expect(m.items).toHaveLength(LIMITS.morningCarriersMax);
    expect(m.overdue).toBe(records.filter((_, i) => i % 3).length);
  });
});
