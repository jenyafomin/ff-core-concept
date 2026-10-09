// find / read / traverse over the real Engine + DurableFsStore (R-6; AC-18, AC-38…43).
import { edgeIdOf, type Act } from '@ff/engine';
import { afterEach, describe, expect, it } from 'vitest';

import { lastRecordActOf } from '../../src/domain/index.js';
import { find, read, type ReadDeps } from '../../src/read/index.js';
import { err, ok, openBrain, topicReader, type Brain } from '../domain/harness.js';

let b: Brain;
afterEach(() => b?.close());

const deps = (br: Brain): ReadDeps => ({ engine: br.d.engine, store: br.d.store, clock: br.clock });
const R = () => topicReader();

let seq = 0;
/** Re-write the record's latest full-body act with a patched payload (simulates history / foreign writers). */
function patchRecord(br: Brain, id: string, patch: (payload: Record<string, any>) => void): void {
  const last = lastRecordActOf(br.acts(), id)!;
  const payload = structuredClone(last.payload) as Record<string, any>;
  patch(payload);
  const ack = br.d.engine.write({ ...last, id: `a_patch${(seq += 1).toString(36)}`, payload, edges: [] } as Act);
  if (!ack.ok) throw new Error(ack.reason);
}

describe('find', () => {
  it('returns no bodies — only id/type/label/status/due/scopes/updated_at', () => {
    b = openBrain();
    ok(b.record({ type: 'task', label: 'Сделать отчёт', fields: { why: 'секретная причина', due: '2026-10-20' } }));
    const r = ok(find(R(), {}, deps(b)));
    expect(r.items).toHaveLength(1);
    expect(Object.keys(r.items[0]!).sort()).toEqual(['due', 'id', 'label', 'scopes', 'status', 'type', 'updated_at']);
    expect(JSON.stringify(r)).not.toContain('секретная');
    expect(r.items[0]).toMatchObject({ type: 'task', status: 'open', due: '2026-10-20', scopes: ['scope:brain'] });
  });

  it('filters: type · status · text (also in fields) · due_before · edge · scope', () => {
    b = openBrain();
    const a = ok(b.record({ type: 'task', label: 'Альфа', fields: { due: '2026-10-10' } }));
    const c = ok(b.record({ type: 'task', label: 'Бета', fields: { status: 'done', why: 'ключевое слово' } }));
    const n = ok(b.record({ type: 'note', label: 'Гамма', scopes: ['agents'], edges: [{ pred: 'about', to: a.id }] }));
    const ids = (q: object) => ok(find(R(), q, deps(b))).items.map((i) => i.id).sort();
    expect(ids({ type: 'task' })).toEqual([a.id, c.id].sort());
    expect(ids({ status: 'done' })).toEqual([c.id]);
    expect(ids({ status: 'active' })).toEqual([a.id, c.id, n.id].sort()); // record-level status also matches
    expect(ids({ text: 'КЛЮЧЕВОЕ' })).toEqual([c.id]);
    expect(ids({ due_before: '2026-10-11' })).toEqual([a.id]);
    expect(ids({ edge: { pred: 'about' } })).toEqual([n.id]);
    expect(ids({ edge: { pred: 'about', to: a.id } })).toEqual([n.id]);
    expect(ids({ edge: { pred: 'about', to: c.id } })).toEqual([]);
    expect(ids({ scope: 'agents' })).toEqual([n.id]);
    expect(ids({ scope: 'acme' })).toEqual([a.id, c.id, n.id].sort()); // parent scope covers members
  });

  it('limit (≤50, default 20) + cursor paginate; total counts all matches', () => {
    b = openBrain();
    for (let i = 0; i < 25; i++) ok(b.record({ type: 'note', label: `Заметка ${i}` }));
    const p1 = ok(find(R(), {}, deps(b)));
    expect(p1.items).toHaveLength(20);
    expect(p1.total).toBe(25);
    expect(p1.next_cursor).toBeDefined();
    const p2 = ok(find(R(), { cursor: p1.next_cursor! }, deps(b)));
    expect(p2.items).toHaveLength(5);
    expect(p2.next_cursor).toBeUndefined();
    expect(new Set([...p1.items, ...p2.items].map((i) => i.id)).size).toBe(25);
    expect(ok(find(R(), { limit: 500 }, deps(b))).items).toHaveLength(25); // clamped to 50
    expect(err(find(R(), { limit: 0 }, deps(b))).code).toBe('BAD_REQUEST');
    expect(err(find(R(), { cursor: 'garbage' }, deps(b))).code).toBe('BAD_REQUEST');
    expect(err(find(R(), { preset: 'noon' as never }, deps(b))).code).toBe('BAD_REQUEST');
    expect(err(find(R(), { conversationId: 'x' } as never, deps(b))).code).toBe('BAD_REQUEST');
  });

  it('retracted records are hidden from find, presets and read neighbours (AC-42)', () => {
    b = openBrain();
    const keep = ok(b.record({ type: 'task', label: 'Живая' }));
    const gone = ok(b.record({ type: 'task', label: 'Выдумка', edges: [{ pred: 'part-of', to: keep.id }] }));
    ok(b.link({ from: keep.id, pred: 'part-of', to: gone.id }));
    ok(b.record({ id: gone.id, type: 'task', label: 'Выдумка', retract: true, reason: 'не то' }));
    const ids = (q: object) => ok(find(R(), q, deps(b))).items.map((i) => i.id);
    expect(ids({})).toEqual([keep.id]);
    for (const preset of ['morning', 'open', 'scope', 'evening'] as const) {
      expect(ids({ preset, include_cold: true })).not.toContain(gone.id);
    }
    expect(ok(read(R(), { id: keep.id }, deps(b))).neighbors).toEqual([]);
  });

  it('changing a record scope changes findability; the id stays the same (AC-42)', () => {
    b = openBrain();
    const t = ok(b.record({ type: 'task', label: 'Переезд' }));
    const agentsOnly = topicReader({ scopes: ['scope:agents'] });
    expect(ok(find(agentsOnly, {}, deps(b))).items).toEqual([]);
    ok(b.record({ id: t.id, type: 'task', scopes: ['agents'] } as never));
    expect(ok(find(agentsOnly, {}, deps(b))).items.map((i) => i.id)).toEqual([t.id]);
    expect(ok(find(topicReader({ scopes: ['scope:brain'] }), {}, deps(b))).items).toEqual([]);
  });

  it('a record with unknown type_v / type / extra fields does not break find, read or presets (AC-18)', () => {
    b = openBrain();
    const t = ok(b.record({ type: 'task', label: 'Из будущего', fields: { priority: 'p0' } }));
    patchRecord(b, t.id, (p) => {
      p.meta.type_v = 99;
      p.mystery = { nested: ['x'] };
    });
    const n = ok(b.record({ type: 'note', label: 'Чужой тип' }));
    patchRecord(b, n.id, (p) => {
      p.type = 'alien-kind';
      p.meta.type_v = 7;
    });
    const all = ok(find(R(), {}, deps(b)));
    expect(all.items.map((i) => i.id).sort()).toEqual([t.id, n.id].sort());
    expect(all.items.find((i) => i.id === n.id)!.type).toBe('alien-kind');
    const r = ok(read(R(), { id: t.id }, deps(b)));
    expect(r.node.type_v).toBe(99);
    for (const preset of ['morning', 'evening', 'open', 'scope'] as const) {
      expect(ok(find(R(), { preset }, deps(b))).ok).toBe(true);
    }
  });
});

describe('read', () => {
  it('node view: effective type, fields without server keys, meta.rev, D7 extras returned, stale not computed (AC-43)', () => {
    b = openBrain();
    const src = ok(b.record({ type: 'note', label: 'Источник' }));
    const d = ok(
      b.record({
        type: 'decision',
        label: 'Выбрали X',
        fields: { rationale: 'дешевле' },
        derived_from: [`${src.id}@1`],
        source: { kind: 'file', ref: 'docs/x.md#L3' },
        layer: 1,
      }),
    );
    const r = ok(read(R(), { id: d.id }, deps(b)));
    expect(r.node).toMatchObject({
      id: d.id,
      type: 'decision',
      declared_type: 'decision',
      label: 'Выбрали X',
      status: 'active',
      fields: { rationale: 'дешевле' },
      derived_from: [`${src.id}@1`],
      source: { kind: 'file', ref: 'docs/x.md#L3' },
      layer: 1,
    });
    expect(r.node.meta.rev).toBe(1);
    expect(r.node.meta.owner).toBe('user:owner');
    expect(Object.keys(r.node.fields)).not.toContain('readable_by');
    expect(JSON.stringify(r)).not.toContain('stale');
  });

  it('unknown / invisible id → NOT_FOUND; malformed request → BAD_REQUEST', () => {
    b = openBrain();
    expect(err(read(R(), { id: 'u_nope' }, deps(b))).code).toBe('NOT_FOUND');
    expect(err(read(R(), { id: '' }, deps(b))).code).toBe('BAD_REQUEST');
    expect(err(read(R(), { id: 'u_x', depth: -1 }, deps(b))).code).toBe('BAD_REQUEST');
    expect(err(read(R(), { id: 'u_x', max_nodes: 0 }, deps(b))).code).toBe('BAD_REQUEST');
  });

  it('edge id = edgeIdOf(from, {predicate, target}); missing target → dangling (AC-39)', () => {
    b = openBrain();
    const a = ok(b.record({ type: 'task', label: 'A' }));
    const c = ok(b.record({ type: 'task', label: 'C' }));
    const l1 = ok(b.link({ from: a.id, pred: 'blocks', to: c.id }));
    const l2 = ok(b.link({ from: a.id, pred: 'about', to: 'u_ghost1' }));
    expect(l2.dangling).toBe(true);
    const r = ok(read(R(), { id: a.id }, deps(b)));
    for (const e of r.edges) expect(e.id).toBe(edgeIdOf(a.id, { predicate: e.pred, target: e.to }));
    const blocks = r.edges.find((e) => e.pred === 'blocks')!;
    expect(blocks.id).toBe(l1.edge_id);
    expect(blocks.dangling).toBeUndefined();
    const ghost = r.edges.find((e) => e.to === 'u_ghost1')!;
    expect(ghost).toMatchObject({ id: l2.edge_id, dangling: true, status: 'active' });
    expect(r.neighbors.map((n) => n.id)).toEqual([c.id]);
  });

  it('edge retraction merges meta (author/confidence/created_at kept); retracted instance-of drops the reclassification (AC-41)', () => {
    b = openBrain();
    const a = ok(b.record({ type: 'task', label: 'A' }));
    const c = ok(b.record({ type: 'note', label: 'C' }));
    ok(b.link({ from: a.id, pred: 'informed', to: c.id, confidence: 0.7 }));
    const before = ok(read(R(), { id: a.id }, deps(b))).edges.find((e) => e.pred === 'informed')!;
    ok(b.link({ from: a.id, pred: 'informed', to: c.id, status: 'retracted' }, topicReader({ principal: 'agent:other' })));
    const after = ok(read(R(), { id: a.id }, deps(b)));
    const e = after.edges.find((x) => x.pred === 'informed')!;
    expect(e).toMatchObject({ id: before.id, status: 'retracted', author: before.author, confidence: 0.7, created_at: before.created_at });
    expect(after.neighbors).toEqual([]); // retracted edges are not walked

    ok(b.record({ id: a.id, type: 'note' } as never)); // reclassify task → note
    expect(ok(read(R(), { id: a.id }, deps(b))).node.type).toBe('note');
    ok(b.link({ from: a.id, pred: 'instance-of', to: 'typedef:note', status: 'retracted' }));
    const back = ok(read(R(), { id: a.id }, deps(b))).node;
    expect(back.type).toBe('task');
    expect(back.declared_type).toBe('task');
  });

  it('cycle (part-of) terminates at depth 2 via the visited set (AC-40)', () => {
    b = openBrain();
    const x = ok(b.record({ type: 'note', label: 'X' }));
    const y = ok(b.record({ type: 'note', label: 'Y', edges: [{ pred: 'part-of', to: x.id }] }));
    ok(b.link({ from: x.id, pred: 'part-of', to: y.id }));
    const r = ok(read(R(), { id: x.id, depth: 2 }, deps(b)));
    expect(r.neighbors.map((n) => n.id)).toEqual([y.id]);
    expect(r.truncated).toBe(false);
    expect(ok(read(R(), { id: x.id, depth: 0 }, deps(b))).neighbors).toEqual([]);
    expect(ok(read(R(), { id: x.id, depth: 9 }, deps(b))).ok).toBe(true); // clamped to 2
  });

  it('depth 2 reaches grandchildren; max_nodes truncates with truncated:true (AC-40)', () => {
    b = openBrain();
    const root = ok(b.record({ type: 'note', label: 'Корень' }));
    const kids = [];
    for (let i = 0; i < 4; i++) kids.push(ok(b.record({ type: 'note', label: `Ребёнок ${i}` })));
    for (const k of kids) ok(b.link({ from: root.id, pred: 'part-of', to: k.id }));
    const grand = ok(b.record({ type: 'note', label: 'Внук' }));
    ok(b.link({ from: kids[0]!.id, pred: 'part-of', to: grand.id }));

    const d1 = ok(read(R(), { id: root.id, depth: 1 }, deps(b)));
    expect(d1.neighbors).toHaveLength(4);
    const d2 = ok(read(R(), { id: root.id, depth: 2 }, deps(b)));
    expect(d2.neighbors.map((n) => n.id)).toContain(grand.id);
    expect(d2.truncated).toBe(false);

    const cut = ok(read(R(), { id: root.id, depth: 2, max_nodes: 3 }, deps(b)));
    expect(cut.neighbors).toHaveLength(2); // root + 2 = 3 nodes
    expect(cut.truncated).toBe(true);
    expect(ok(read(R(), { id: root.id, preds: ['about'] }, deps(b))).neighbors).toEqual([]);
  });

  it('invisible neighbours are omitted (their edges read as dangling, F-2); reading them directly → NOT_FOUND', () => {
    b = openBrain();
    const hidden = ok(b.record({ type: 'note', label: 'В агентах', scopes: ['agents'] }));
    const shown = ok(b.record({ type: 'note', label: 'В мозге', edges: [{ pred: 'about', to: hidden.id }] }));
    const brainOnly = topicReader({ scopes: ['scope:brain'] });
    const r = ok(read(brainOnly, { id: shown.id }, deps(b)));
    expect(r.neighbors).toEqual([]);
    expect(r.edges.find((e) => e.to === hidden.id)).toMatchObject({ dangling: true }); // ≡ a missing target
    expect(err(read(brainOnly, { id: hidden.id }, deps(b))).code).toBe('NOT_FOUND');
    // the full reader sees both
    expect(ok(read(R(), { id: shown.id }, deps(b))).neighbors.map((n) => n.id)).toEqual([hidden.id]);
  });
});

describe('unknown predicate (AC-38)', () => {
  it('record.edges / link with an unknown predicate → UNKNOWN_PREDICATE + known list; nothing written', () => {
    b = openBrain();
    const a = ok(b.record({ type: 'task', label: 'A' }));
    const n = b.acts().length;
    const e1 = err(b.record({ type: 'task', label: 'B', edges: [{ pred: 'loves', to: a.id }] }));
    expect(e1.code).toBe('UNKNOWN_PREDICATE');
    expect(e1.known).toContain('part-of');
    const e2 = err(b.link({ from: a.id, pred: 'loves', to: a.id }));
    expect(e2.code).toBe('UNKNOWN_PREDICATE');
    expect(b.acts()).toHaveLength(n);
  });
});
