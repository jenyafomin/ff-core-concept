// SPEC-access-and-overview Part A: per-scope write (`write_scopes`) and the `overview` preset (A1–A4).
import type { Act } from '@ff/engine';
import { afterEach, describe, expect, it } from 'vitest';

import { LIMITS, type Reader, type ReadersFile } from '../../src/contract.js';
import { lastRecordActOf } from '../../src/domain/index.js';
import { find, resolveReader, type ReadDeps } from '../../src/read/index.js';
import { writeScopeWarnings } from '../../src/service/readers.js';
import { err, ok, openBrain, topicReader, type Brain } from '../domain/harness.js';
import { GROUP, OWNER_ID, THREAD_BRAIN, ownerInTopic } from '../support/brain-fixture.js';

let b: Brain;
afterEach(() => b?.close());

const deps = (br: Brain): ReadDeps => ({ engine: br.d.engine, store: br.d.store, clock: br.clock });
const asReader = (r: Reader | { ok: false }): Reader => {
  if ('ok' in r) throw new Error(`expected a reader, got ${JSON.stringify(r)}`);
  return r;
};

/** brain = read+write, personal = read only (slug and id spellings mixed on purpose). */
const mixed = (over: Partial<Reader> = {}): Reader =>
  topicReader({ scopes: ['scope:brain', 'personal'], write_scopes: ['brain'], default_scope: 'scope:brain', ...over });

let seq = 0;
function makeCold(br: Brain, id: string): void {
  const last = lastRecordActOf(br.acts(), id)!;
  const payload = structuredClone(last.payload) as Record<string, any>;
  payload.meta.temperature = 'cold';
  const ack = br.d.engine.write({ ...last, id: `a_cold${(seq += 1).toString(36)}`, payload, edges: [] } as Act);
  if (!ack.ok) throw new Error(ack.reason);
}

describe('A1 — resolveReader carries write_scopes', () => {
  const readers = (thread: Record<string, unknown>): ReadersFile => ({
    owner_id: OWNER_ID,
    chats: { [GROUP]: { scopes: ['scope:brain', 'scope:personal'], write: true }, [THREAD_BRAIN]: thread },
  });

  it('write_scopes set → carried; write = non-empty (a topic-level write:false does not matter)', () => {
    const r = asReader(resolveReader(readers({ write_scopes: ['scope:brain'], write: false }), ownerInTopic(THREAD_BRAIN)));
    expect(r.write_scopes).toEqual(['scope:brain']);
    expect(r.write).toBe(true);
    expect(r.scopes).toEqual(['scope:brain', 'scope:personal']); // inherited from the chat (shallow merge)
  });

  it('empty or malformed write_scopes → no write (fail closed), legacy write:true is NOT used', () => {
    for (const ws of [[], 'scope:brain', [42]]) {
      const r = asReader(resolveReader(readers({ write_scopes: ws }), ownerInTopic(THREAD_BRAIN)));
      expect(r.write).toBe(false);
      expect(r.write_scopes).toEqual([]);
    }
  });

  it('legacy binding (no write_scopes) → no write_scopes on the reader, write as before', () => {
    const r = asReader(resolveReader(readers({}), ownerInTopic(THREAD_BRAIN)));
    expect(r.write_scopes).toBeUndefined();
    expect(r.write).toBe(true);
  });

  it('loader warns about write_scopes outside scopes (slug ≡ scope:id); topic inherits chat scopes', () => {
    expect(writeScopeWarnings(readers({ write_scopes: ['brain', 'scope:personal'] }))).toEqual([]);
    const w = writeScopeWarnings(readers({ write_scopes: ['brain', 'agents'] }));
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('agents');
  });
});

describe('A2 — write checks per scope', () => {
  it('record into a read-only scope → SCOPE_DENIED with a read-only hint, nothing written', () => {
    b = openBrain();
    const before = b.acts().length;
    const e = err(b.record({ type: 'note', label: 'Личное', scopes: ['personal'] }, mixed()));
    expect(e.code).toBe('SCOPE_DENIED');
    expect(e.hint).toContain('personal');
    expect(e.hint).toContain('только чтение');
    expect(b.acts().length).toBe(before);
    // mixed write+read-only in one request → refused as a whole
    expect(err(b.record({ type: 'note', label: 'Два', scopes: ['brain', 'personal'] }, mixed())).code).toBe('SCOPE_DENIED');
    // the writable scope works
    ok(b.record({ type: 'note', label: 'Мозг', scopes: ['brain'] }, mixed()));
  });

  it('update / link of a record sitting in a read-only scope → SCOPE_DENIED; reading it is fine', () => {
    b = openBrain();
    const owner = topicReader(); // legacy writer over brain/agents/personal
    const shared = ok(b.record({ type: 'task', label: 'Общая', scopes: ['brain', 'personal'] }, owner));
    const other = ok(b.record({ type: 'task', label: 'Другая', scopes: ['brain'] }, owner));
    expect(err(b.record({ id: shared.id, type: 'task', fields: { status: 'done' } } as never, mixed())).code).toBe('SCOPE_DENIED');
    // moving it out of the read-only scope is a write there too
    expect(err(b.record({ id: shared.id, type: 'task', scopes: ['brain'] } as never, mixed())).code).toBe('SCOPE_DENIED');
    expect(err(b.link({ from: shared.id, pred: 'about', to: other.id }, mixed())).code).toBe('SCOPE_DENIED');
    ok(b.link({ from: other.id, pred: 'about', to: shared.id }, mixed()));
    expect(ok(find(mixed(), {}, deps(b))).items.map((i) => i.id)).toContain(shared.id);
  });

  it('default_scope outside write_scopes → the first write scope is used', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'note', label: 'Без области' }, mixed({ default_scope: 'personal', write_scopes: ['brain'] })));
    expect(b.get(r.id).scopes).toEqual(['scope:brain']);
  });

  it('write_scopes outside scopes are ignored (write ⇒ read)', () => {
    b = openBrain();
    const r = mixed({ write_scopes: ['agents'] }); // agents is not readable → nothing writable
    expect(err(b.record({ type: 'note', label: 'A', scopes: ['agents'] }, r)).code).toBe('SCOPE_DENIED');
    expect(err(b.record({ type: 'note', label: 'B', scopes: ['brain'] }, r)).code).toBe('SCOPE_DENIED');
  });

  it('legacy write:true without write_scopes → writes to every reader scope, as before', () => {
    b = openBrain();
    const legacy = topicReader({ scopes: ['scope:brain', 'scope:personal'] });
    ok(b.record({ type: 'note', label: 'Личное', scopes: ['personal'] }, legacy));
    const t = ok(b.record({ type: 'task', label: 'Оба', scopes: ['brain', 'personal'] }, legacy));
    ok(b.record({ id: t.id, type: 'task', fields: { status: 'done' } } as never, legacy));
    expect(err(b.record({ type: 'note', label: 'X' }, topicReader({ write: false }))).code).toBe('WRITE_DENIED');
  });
});

describe('A3 — preset overview (the memory map)', () => {
  it('per visible scope: mode, type × status counts, cold, last write; foreign scope hidden; no items/bodies', () => {
    b = openBrain();
    const owner = topicReader();
    ok(b.record({ type: 'task', label: 'Секретная метка задачи', fields: { status: 'open', note: 'ТЕЛО-НЕ-ПОКАЗЫВАТЬ' }, scopes: ['brain'] }, owner));
    ok(b.record({ type: 'task', label: 'Вторая', fields: { status: 'done' }, scopes: ['brain'] }, owner));
    const cold = ok(b.record({ type: 'note', label: 'Старая заметка', scopes: ['brain'] }, owner));
    makeCold(b, cold.id);
    ok(b.record({ type: 'note', label: 'Личная', scopes: ['personal'] }, owner));
    ok(b.record({ type: 'task', label: 'Чужая', scopes: ['agents'] }, owner));

    const r = ok(find(mixed(), { preset: 'overview' }, deps(b)));
    expect(r.items).toEqual([]);
    expect(r.total).toBe(4); // agents is not counted
    expect(r.next_cursor).toBeUndefined();
    const d = r.digest!;
    expect(d.length).toBeLessThanOrEqual(LIMITS.overviewMaxChars);
    const lines = d.split('\n');
    expect(lines[0]).toMatch(/^Карта памяти · областей 2 \(✍️ 1 · 👁 1\) · записей 4 · cold 1 · посл\. \d{4}-\d{2}-\d{2}$/);
    expect(d).toMatch(/^✍️ brain «Мозг» · 3 · cold 1 · посл\. /m);
    expect(d).toContain('  task 2: done 1, open 1');
    expect(d).toContain('  note 1: active 1');
    expect(d).toMatch(/^👁 personal «Личное» · 1 · посл\. /m);
    expect(d).not.toContain('agents');
    expect(d).not.toContain('Агенты');
    expect(d).not.toContain('Секретная');
    expect(d).not.toContain('ТЕЛО');
  });

  it('a scope with no records is still listed; legacy writer shows ✍️ everywhere', () => {
    b = openBrain();
    const d = ok(find(topicReader({ scopes: ['scope:brain', 'scope:personal'] }), { preset: 'overview' }, deps(b))).digest!;
    expect(d.split('\n')).toEqual(['Карта памяти · областей 2 (✍️ 2 · 👁 0) · записей 0', '✍️ brain «Мозг» · 0', '✍️ personal «Личное» · 0']);
  });

  it('over the ceiling → cut with a «… обрезано» marker, ≤1500 chars', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ slug: `p${i}`, name: `Проект номер ${i} с длинным именем`, kind: 'project' as const }));
    b = openBrain({ scopes: many });
    const owner = topicReader({ scopes: many.map((s) => s.slug), write_scopes: ['p0'] });
    ok(b.record({ type: 'task', label: 'x', scopes: ['p0'] }, owner));
    const d = ok(find(owner, { preset: 'overview' }, deps(b))).digest!;
    expect(d.length).toBeLessThanOrEqual(LIMITS.overviewMaxChars);
    expect(d.split('\n').at(-1)).toMatch(/^… обрезано \(ещё \d+ строк\)$/);
  });
});
