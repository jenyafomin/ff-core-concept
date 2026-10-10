// record validation through the real Engine + DurableFsStore: label, types, fields, scopes, update/merge,
// expected_rev, retract, initiative, visibility (AC-10, AC-34, AC-35, AC-42, AC-45).
import { afterEach, describe, expect, it } from 'vitest';

import { RESERVED_BODY_KEYS } from '../../src/contract.js';
import { decodeNode, planRecord, readerScopeIds, recordExtrasOf, lastRecordActOf } from '../../src/domain/index.js';
import { err, ok, openBrain, topicReader, type Brain } from './harness.js';

let b: Brain;
afterEach(() => b?.close());

describe('label (LABEL_REQUIRED)', () => {
  it('missing / empty / >120 chars → LABEL_REQUIRED; nothing written', () => {
    b = openBrain();
    const n = b.acts().length;
    expect(err(b.record({ type: 'task' } as never)).code).toBe('LABEL_REQUIRED');
    expect(err(b.record({ type: 'task', label: '   ' })).code).toBe('LABEL_REQUIRED');
    expect(err(b.record({ type: 'task', label: 'я'.repeat(121) })).code).toBe('LABEL_REQUIRED');
    expect(b.acts()).toHaveLength(n);
    expect(ok(b.record({ type: 'task', label: 'я'.repeat(120) })).ok).toBe(true);
  });
});

describe('types', () => {
  it('unknown type → raw + declared_type + warning + friction signal (AC-35)', () => {
    b = openBrain();
    const plan = planRecord({ type: 'recipe', label: 'Борщ' }, topicReader(), b.ctx());
    if ('ok' in plan) throw new Error(plan.message);
    expect(plan.friction).toHaveLength(1);
    expect(plan.friction[0]!.code).toBe('UNKNOWN_TYPE');
    expect(plan.friction[0]!.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(plan.friction)).not.toContain('Борщ');

    const r = ok(b.record({ type: 'recipe', label: 'Борщ' }));
    expect(r.type).toBe('raw');
    expect(r.warnings.map((w) => w.code)).toEqual(['UNKNOWN_TYPE_AS_RAW']);
    const rec = b.get(r.id);
    expect(rec.declared_type).toBe('raw');
    expect(rec.fields.declared_type).toBe('recipe');
  });

  it('registry types (type-def / predicate-def / scope) cannot be created via record → raw', () => {
    b = openBrain();
    expect(ok(b.record({ type: 'type-def', label: 'x' })).type).toBe('raw');
    expect(ok(b.record({ type: 'scope', label: 'y' })).type).toBe('raw');
  });

  it('task status enum: default open, invalid value refused', () => {
    b = openBrain();
    const t = ok(b.record({ type: 'task', label: 'Сделать' }));
    expect(b.get(t.id).fields.status).toBe('open');
    expect(err(b.record({ type: 'task', label: 'Плохо', fields: { status: 'finished' } })).code).toBe('BAD_REQUEST');
    expect(err(b.record({ type: 'task', label: 'Плохо', fields: { priority: 'p9' } })).code).toBe('BAD_REQUEST');
    expect(err(b.record({ type: 'task', label: 'Плохо', fields: { due: 'завтра' } })).code).toBe('BAD_REQUEST');
    expect(ok(b.record({ type: 'task', label: 'Ок', fields: { status: 'done', priority: 'p0', due: '2026-10-10' } })).ok).toBe(true);
  });

  it('required fields of a type (day.date) are enforced', () => {
    b = openBrain();
    expect(err(b.record({ type: 'day', label: 'Итог' })).code).toBe('BAD_REQUEST');
    expect(ok(b.record({ type: 'day', label: 'Итог', fields: { date: '2026-10-09' } })).ok).toBe(true);
  });
});

describe('reserved / identity fields (AC-34, AC-06)', () => {
  it.each([...RESERVED_BODY_KEYS])('fields.%s → RESERVED_FIELD', (k) => {
    b = openBrain();
    expect(err(b.record({ type: 'note', label: 'x', fields: { [k]: 'v' } })).code).toBe('RESERVED_FIELD');
  });

  it('top-level reserved key, brain-owned field names, identity keys', () => {
    b = openBrain();
    expect(err(b.record({ type: 'note', label: 'x', tenant: 'project:ff' } as never)).code).toBe('RESERVED_FIELD');
    for (const k of ['meta', 'label', 'type', 'archived']) {
      expect(err(b.record({ type: 'note', label: 'x', fields: { [k]: 'v' } })).code).toBe('RESERVED_FIELD');
    }
    expect(err(b.record({ type: 'note', label: 'x', author: 'me' } as never)).code).toBe('IDENTITY_FIELD');
    expect(err(b.record({ type: 'note', label: 'x', fields: { sender: 'me' } })).code).toBe('IDENTITY_FIELD');
  });
});

describe('scopes (AC-04, AC-10, AC-42 write side)', () => {
  it('no scopes → binding default_scope; slug resolves to the scope node id', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'task', label: 'В топике' }));
    expect(b.get(r.id).scopes).toEqual(['scope:brain']);
    expect(r.receipt).toContain('→ brain');
    const two = ok(b.record({ type: 'task', label: 'Общая', scopes: ['brain', 'scope:agents'] }));
    expect(b.get(two.id).scopes).toEqual(['scope:brain', 'scope:agents']);
  });

  it('scope outside the reader → SCOPE_DENIED, nothing written', () => {
    b = openBrain();
    const n = b.acts().length;
    expect(err(b.record({ type: 'task', label: 'x', scopes: ['acme'] })).code).toBe('SCOPE_DENIED');
    expect(err(b.record({ type: 'task', label: 'x', edges: [{ pred: 'in-scope', to: 'scope:acme' }] })).code).toBe('SCOPE_DENIED');
    expect(b.acts()).toHaveLength(n);
    expect([...readerScopeIds(topicReader(), b.ctx().lookup)]).toContain('scope:personal');
  });

  it('changing scopes on update keeps the id; the dropped scope edge is retracted, meta preserved', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'task', label: 'Переезд', scopes: ['brain'] }));
    const created = b.get(r.id).edges.find((e) => e.predicate === 'in-scope')!;
    const u = ok(b.record({ id: r.id, type: 'task', label: 'Переезд', scopes: ['agents'] }));
    expect(u.id).toBe(r.id);
    const rec = b.get(r.id);
    expect(rec.scopes).toEqual(['scope:agents']);
    const dropped = rec.edges.find((e) => e.predicate === 'in-scope' && e.target === 'scope:brain')!;
    expect(dropped.meta?.status).toBe('retracted');
    expect(dropped.meta?.created_at).toBe(created.meta?.created_at);
    expect(dropped.meta?.author).toBe(created.meta?.author);
  });

  it('no write right → WRITE_DENIED', () => {
    b = openBrain();
    expect(err(b.record({ type: 'task', label: 'x' }, topicReader({ write: false }))).code).toBe('WRITE_DENIED');
  });
});

describe('update / retract', () => {
  it('update merges the old body with changes (foldInto replaces body wholesale)', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'task', label: 'Слить', fields: { why: 'причина', priority: 'p1' } }));
    const u = ok(b.record({ id: r.id, type: 'task', label: 'Слить', fields: { status: 'doing' } }));
    expect(u.rev).toBe(2);
    const rec = b.get(r.id);
    expect(rec.fields).toMatchObject({ why: 'причина', priority: 'p1', status: 'doing' });
    expect(rec.meta.author).toBe('user:owner');
    expect(rec.meta.created_at < rec.meta.updated_at).toBe(true);
    // label omitted on update → kept; null clears a field
    ok(b.record({ id: r.id, fields: { why: null } } as never));
    expect(b.get(r.id).label).toBe('Слить');
    expect(b.get(r.id).fields.why).toBeUndefined();
    // survives restart (journal replay = same merged body)
    b.restart();
    expect(b.get(r.id).fields).toMatchObject({ priority: 'p1', status: 'doing' });
  });

  it('expected_rev mismatch → CONFLICT; match → ok', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'note', label: 'v1' }));
    expect(err(b.record({ id: r.id, type: 'note', label: 'v2', expected_rev: 5 })).code).toBe('CONFLICT');
    expect(ok(b.record({ id: r.id, type: 'note', label: 'v2', expected_rev: 1 })).rev).toBe(2);
  });

  it('update of an unknown id → NOT_FOUND; malformed id → BAD_REQUEST', () => {
    b = openBrain();
    expect(err(b.record({ id: 'u_nothere', type: 'note', label: 'x' })).code).toBe('NOT_FOUND');
    expect(err(b.record({ id: 'project:ff', type: 'note', label: 'x' })).code).toBe('BAD_REQUEST');
  });

  it('retract: status retracted + reason, body kept, id the same (AC-42)', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'task', label: 'Выдумка', fields: { why: 'нет' } }));
    const x = ok(b.record({ id: r.id, type: 'task', label: 'Выдумка', retract: true, reason: 'не то' }));
    expect(x.status).toBe('retracted');
    expect(x.receipt).toContain('task/retracted');
    const rec = b.get(r.id);
    expect(rec.status).toBe('retracted');
    expect(rec.retract_reason).toBe('не то');
    expect(rec.fields.why).toBe('нет');
    expect(err(b.record({ type: 'task', label: 'x', retract: true })).code).toBe('BAD_REQUEST');
  });

  it('reclassification on update = instance-of edge; id unchanged (D5)', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'note', label: 'На самом деле задача' }));
    const u = ok(b.record({ id: r.id, type: 'task', label: 'На самом деле задача' }));
    expect(u.type).toBe('task');
    const rec = b.get(r.id);
    expect(rec.declared_type).toBe('note');
    expect(rec.type).toBe('task');
  });
});

describe('initiative (AC-45)', () => {
  it('initiative:agent → proposed and the receipt says so; owner confirmation activates', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'task', label: 'Предложение агента', initiative: 'agent' }));
    expect(r.status).toBe('proposed');
    expect(r.receipt).toMatch(/^Записано: Предложение агента → brain · task\/proposed · #[a-z0-9]{6}$/);
    expect(b.get(r.id).initiative).toBe('agent');
    // SPEC-brain-data-doors R-5 (option A, was: main-token reader activates): the main token is agent authority
    // → self-approval is refused; only an owner-authority reader (gateway mandate) activates.
    expect(err(b.record({ id: r.id, type: 'task', label: 'Предложение агента', initiative: 'owner' })).code).toBe('WRITE_DENIED');
    expect(b.get(r.id).status).toBe('proposed');
    const owner = topicReader({ principal: 'sys:gateway', authority: 'owner' });
    expect(ok(b.record({ id: r.id, type: 'task', label: 'Предложение агента', initiative: 'owner' }, owner)).status).toBe('active');
    expect(ok(b.record({ type: 'task', label: 'По просьбе' })).status).toBe('active');
  });
});

describe('visibility (AC-10, AC-31)', () => {
  it('person → visibility owner, readable_by owner only', () => {
    b = openBrain();
    const p = ok(b.record({ type: 'person', label: 'Иван — бухгалтер', fields: { name: 'Иван Петров', role: 'бухгалтер' } }));
    const rec = b.get(p.id);
    expect(rec.visibility).toBe('owner');
    expect(rec.readable_by).toEqual(['user:owner']);
    expect(rec.fields.name).toBe('Иван Петров');
  });

  it('referent ≠ owner → visibility owner even if scoped was asked', () => {
    b = openBrain();
    const p = ok(b.record({ type: 'person', label: 'Мария', fields: { name: 'Мария' } }));
    const n = ok(b.record({ type: 'note', label: 'Про Марию', visibility: 'scoped', edges: [{ pred: 'referent', to: p.id }] }));
    expect(b.get(n.id).visibility).toBe('owner');
    expect(b.get(n.id).readable_by).toEqual(['user:owner']);
    const plain = ok(b.record({ type: 'note', label: 'Обычная' }));
    expect(b.get(plain.id).visibility).toBe('scoped');
    expect(b.get(plain.id).readable_by).toEqual(['user:owner', 'agent:*']);
  });

  it('personal scope → readable_by owner only', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'note', label: 'Личное', scopes: ['personal'] }));
    expect(b.get(r.id).readable_by).toEqual(['user:owner']);
  });

  it('owner edge is server-set (request owner edge refused)', () => {
    b = openBrain();
    const r = ok(b.record({ type: 'note', label: 'x' }));
    expect(b.get(r.id).meta.owner).toBe('user:owner');
    expect(err(b.record({ type: 'note', label: 'x', edges: [{ pred: 'owner', to: 'user:evil' }] })).code).toBe('RESERVED_FIELD');
  });
});

describe('edges in record (AC-38 write side, AC-39)', () => {
  it('unknown predicate → UNKNOWN_PREDICATE + known list; nothing written', () => {
    b = openBrain();
    const n = b.acts().length;
    const e = err(b.record({ type: 'note', label: 'x', edges: [{ pred: 'likes', to: 'u_abc' }] }));
    expect(e.code).toBe('UNKNOWN_PREDICATE');
    expect(e.known).toContain('about');
    expect(e.hint).not.toBe('');
    expect(b.acts()).toHaveLength(n);
  });

  it('edge ids are stamped = edgeIdOf; link retraction merges meta (author/confidence/created_at kept)', async () => {
    const { edgeIdOf } = await import('@ff/engine');
    b = openBrain();
    const a = ok(b.record({ type: 'task', label: 'A' }));
    const l = ok(b.link({ from: a.id, pred: 'blocks', to: 'u_missing', confidence: 0.7 }));
    expect(l.dangling).toBe(true);
    expect(l.edge_id).toBe(edgeIdOf(a.id, { predicate: 'blocks', target: 'u_missing' }));
    const before = b.get(a.id).edges.find((e) => e.predicate === 'blocks')!;
    ok(b.link({ from: a.id, pred: 'blocks', to: 'u_missing', status: 'retracted' }, topicReader({ principal: 'cli:/x' })));
    const after = b.get(a.id).edges.find((e) => e.predicate === 'blocks')!;
    expect(after.meta).toMatchObject({ status: 'retracted', author: before.meta!.author, confidence: 0.7, created_at: before.meta!.created_at });
  });
});

describe('provenance form (AC-43)', () => {
  it('derived_from / source / layer / idem land in provenance and read back', () => {
    b = openBrain();
    const t = ok(b.record({ type: 'note', label: 'Факт' }));
    const plan = planRecord(
      { type: 'note', label: 'Вывод', derived_from: [`${t.id}@1`], source: { kind: 'file', ref: 'docs/a.md#L3', hash: 'abcdef0123456789' }, layer: 1 },
      topicReader(),
      b.ctx(),
      { idem: 'deadbeef' },
    );
    if ('ok' in plan) throw new Error(plan.message);
    const ack = b.d.engine.write(plan.act);
    expect(ack.ok).toBe(true);
    const extras = recordExtrasOf(lastRecordActOf(b.acts(), plan.id));
    expect(extras).toMatchObject({ derived_from: [`${t.id}@1`], source: { kind: 'file', ref: 'docs/a.md#L3', hash: 'abcdef0123456789' }, layer: 1, idem: 'deadbeef' });
    expect(decodeNode(b.d.store.readNode(plan.id)!).label).toBe('Вывод');
  });
});

describe('date fields (F-6)', () => {
  it('free-text due → BAD_REQUEST with a concrete format hint, nothing written', () => {
    b = openBrain();
    const n = b.acts().length;
    const e = err(b.record({ type: 'task', label: 'Позвонить в DMV', fields: { due: 'завтра 14:30' } }));
    expect(e.code).toBe('BAD_REQUEST');
    expect(e.hint).toContain('YYYY-MM-DD');
    expect(e.hint).toContain('YYYY-MM-DDTHH:MM');
    expect(e.hint).not.toBe('Проверь форму запроса.');
    expect(b.acts()).toHaveLength(n);
  });
});
