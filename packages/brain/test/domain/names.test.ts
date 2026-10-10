// SPEC-brain-data-doors door 1 — names (AC-D01…AC-D08): grammar, who may define what, write-time and
// fold-time checks, alias identity (u:idea in typedef:idea), predicate spellings, names out of ref positions.
import { afterEach, describe, expect, it } from 'vitest';

import { edgeIdOf } from '@ff/engine';

import {
  CORE_PREDICATE_NAMES,
  CORE_TYPE_NAMES,
  GENESIS_ACTOR,
  GENESIS_PREDICATES,
  GENESIS_TYPES,
  buildEdgeAct,
  buildPredicateDefAct,
  buildTypeDefAct,
  canonicalName,
  checkDefinition,
  genesisActs,
  makeEdge,
  planDefinition,
  type TypeDef,
} from '../../src/domain/index.js';
import { find } from '../../src/read/find.js';
import { frictionId } from '../../src/service/friction.js';
import type { RunningBrain } from '../../src/service/server.js';
import { FIXED_NOW, type BrainFixture } from '../support/brain-fixture.js';
import { makeHome, start } from '../service/_helpers.js';
import { err, ok, openBrain, topicReader, type Brain } from './harness.js';

let b: Brain | undefined;
let fx: BrainFixture | undefined;
let svc: RunningBrain | undefined;
afterEach(async () => {
  b?.close();
  b = undefined;
  await svc?.stop();
  svc = undefined;
  fx?.cleanup();
  fx = undefined;
});

const plan = (p: ReturnType<typeof planDefinition>) => {
  if ('ok' in p) throw new Error(`expected a plan, got ${p.code}: ${p.message}`);
  return p;
};

describe('AC-D01: core name sets are derived from genesis', () => {
  it('CORE_TYPE_NAMES / CORE_PREDICATE_NAMES = the genesis names', () => {
    expect([...CORE_TYPE_NAMES].sort()).toEqual(GENESIS_TYPES.map((d) => d.name).sort());
    expect([...CORE_PREDICATE_NAMES].sort()).toEqual(GENESIS_PREDICATES.map((d) => d.name).sort());
  });
});

describe('grammar (R-1.2)', () => {
  it('canonicalName', () => {
    expect(canonicalName('type', 'task')).toBe('task');
    expect(canonicalName('type', 'core:task')).toBe('task');
    expect(canonicalName('type', 'idea')).toBe('u:idea');
    expect(canonicalName('type', 'u:idea')).toBe('u:idea');
    expect(canonicalName('type', 'sys:prompt-layer')).toBe('sys:prompt-layer');
    expect(canonicalName('type', 'pack:bt/issue')).toBe('pack:bt/issue');
    expect(canonicalName('predicate', 'about')).toBe('about');
    expect(canonicalName('predicate', 'lives-in')).toBe('u:lives-in');
    for (const bad of ['x:foo', 'core:nope', 'pack:bt', 'pack:BT/issue', 'pack:bt/Issue', 'sys:a/b', 'u:', 'Idea', '']) {
      expect(canonicalName('type', bad), bad).toBeNull();
    }
  });
});

describe('AC-D03: invalid names and writer-bound packs', () => {
  it('x:foo and core:nope are refused; pack:bt/issue only from pack:bt', () => {
    expect(checkDefinition('type', 'x:foo', 'user:owner')).toEqual({ ok: false, reason: 'invalid-name' });
    expect(checkDefinition('type', 'core:nope', GENESIS_ACTOR)).toEqual({ ok: false, reason: 'invalid-name' });
    expect(checkDefinition('type', 'pack:bt/issue', 'pack:other').ok).toBe(false);
    expect(checkDefinition('type', 'pack:bt/issue', 'pack:bt')).toEqual({ ok: true, canonical: 'pack:bt/issue' });
    expect(checkDefinition('predicate', 'pack:bt/blocks-release', 'pack:bt').ok).toBe(true);
  });
});

describe('AC-D05: sys: names (flat) from any sys:* writer', () => {
  it('sys:prompt-layer from sys:brain accepted; from pack:x / user:owner refused', () => {
    const def: TypeDef = { name: 'sys:prompt-layer', version: 1, status: 'active', fields: { body: { kind: 'text' } } };
    const reg = openBrain();
    b = reg;
    expect(plan(planDefinition({ kind: 'type', def }, 'sys:brain', b.d.registry, { now: FIXED_NOW })).nodeId).toBe('typedef:sys:prompt-layer');
    expect(checkDefinition('predicate', 'sys:applies-to', 'sys:gateway').ok).toBe(true);
    expect(err(planDefinition({ kind: 'type', def }, 'pack:x', b.d.registry, { now: FIXED_NOW })).code).toBe('WRITE_DENIED');
    expect(err(planDefinition({ kind: 'type', def }, 'user:owner', b.d.registry, { now: FIXED_NOW })).code).toBe('WRITE_DENIED');
  });
});

describe('AC-D04: a core type is not redefined by a non-genesis writer', () => {
  it('planDefinition refuses (journal and typedef:task unchanged); the bypass is ignored by the registry; genesis may', () => {
    b = openBrain();
    const v1 = b.d.registry.type('task')!;
    const v2: TypeDef = { ...v1, version: 2, fields: { ...v1.fields, effort: { kind: 'number' } } };
    const journal = b.journal();
    const snapshot = JSON.stringify(b.d.store.readNode('typedef:task'));

    expect(err(planDefinition({ kind: 'type', def: v2 }, 'user:owner', b.d.registry, { now: FIXED_NOW })).code).toBe('WRITE_DENIED');
    expect(b.journal()).toBe(journal);
    expect(JSON.stringify(b.d.store.readNode('typedef:task'))).toBe(snapshot);
    expect(b.d.registry.type('task')!.version).toBe(1);

    // the same act smuggled past planDefinition (direct engine.write): the registry keeps v1 and the def
    // read for node typedef:task comes from the registry, not from the (overwritten) projection
    expect(b.d.engine.write(buildTypeDefAct(v2, { now: FIXED_NOW, actor: 'user:owner' })).ok).toBe(true);
    b.restart();
    expect(b.d.registry.type('task')!.version).toBe(1);
    expect(b.d.registry.definitionAt('typedef:task')).toEqual({ kind: 'type', def: v1 });
    expect(b.d.registry.rejected.map((r) => [r.name, r.reason])).toEqual([['task', 'core-name-not-genesis']]);

    // genesis may evolve a core type
    expect(b.d.engine.write(plan(planDefinition({ kind: 'type', def: { ...v2, version: 3 } }, GENESIS_ACTOR, b.d.registry, { now: FIXED_NOW })).act).ok).toBe(true);
    b.restart();
    expect(b.d.registry.type('task')!.version).toBe(3);
  });
});

describe('AC-D02: a bypassed def from the wrong writer → registry ignores it, ONE friction across restarts', () => {
  it('type-def `comment` by pack:bt appended raw → not in the registry; 2 restarts → exactly 1 DEF_REJECTED', async () => {
    fx = makeHome();
    svc = await start(fx);
    await svc.stop();
    const act = buildTypeDefAct({ name: 'comment', version: 1, status: 'active', fields: { text: { kind: 'text' } } }, { now: FIXED_NOW, actor: 'pack:bt' });
    const { appendFileSync } = await import('node:fs');
    appendFileSync(fx.journalPath, `${JSON.stringify(act)}\n`);

    const frictionOf = (r: RunningBrain) =>
      r.service.brain.store.load().filter((n) => n.type === 'friction' && (n.body as { code?: string }).code === 'DEF_REJECTED');
    for (let i = 0; i < 2; i++) {
      svc = await start(fx);
      await svc.service.ready;
      expect(svc.service.brain.registry.type('comment')).toBeUndefined();
      expect(svc.service.brain.registry.type('u:comment')).toBeUndefined();
      const fr = frictionOf(svc);
      expect(fr).toHaveLength(1);
      expect(fr[0]!.id).toBe(frictionId('DEF_REJECTED', act.id));
      await svc.stop();
    }
    svc = await start(fx);
    await svc.service.ready;
    expect(frictionOf(svc)).toHaveLength(1);
    // the friction act itself is written by the in-process service principal (frozen format)
    expect(svc.service.brain.store.acts().filter((a) => (a.payload as { code?: string } | undefined)?.code === 'DEF_REJECTED')).toHaveLength(1);
    expect(svc.service.brain.store.acts().at(-1)?.actor).not.toBe('system:brain');
  });
});

describe('AC-D06: a legacy bare type `idea` is the alias of u:idea — one def, one node', () => {
  it('lookups by either spelling, v2 lands in typedef:idea, instance-of targets typedef:idea, bytes kept', () => {
    b = openBrain();
    b.appendRaw(JSON.stringify(buildTypeDefAct({ name: 'idea', version: 1, status: 'active', fields: { text: { kind: 'text' } } }, { now: FIXED_NOW, actor: 'user:owner' })));
    b.restart();
    const before = b.journal();
    const viaBare = b.d.registry.type('idea');
    expect(viaBare).toBeDefined();
    expect(viaBare).toBe(b.d.registry.type('u:idea'));
    expect(viaBare!.name).toBe('u:idea');
    expect(b.d.registry.defNodeId('type', 'u:idea')).toBe('typedef:idea');

    const v2: TypeDef = { ...viaBare!, version: 2, fields: { ...viaBare!.fields, why: { kind: 'text' } } };
    const p = plan(planDefinition({ kind: 'type', def: v2 }, 'user:owner', b.d.registry, { now: FIXED_NOW }));
    expect(p.nodeId).toBe('typedef:idea');
    expect((p.act.provenance as { source_ref: string }).source_ref).toBe('typedef:idea');
    expect(b.d.engine.write(p.act).ok).toBe(true);
    b.restart();
    expect(b.d.registry.type('idea')!.version).toBe(2);
    expect(b.d.registry.rejected).toEqual([]);

    const n = ok(b.record({ type: 'note', label: 'Мысль' }));
    const u = ok(b.record({ id: n.id, type: 'idea', label: 'Мысль' }));
    expect(u.type).toBe('u:idea');
    const inst = b.get(n.id).edges.find((e) => e.predicate === 'instance-of')!;
    expect(inst.target).toBe('typedef:idea');
    expect(b.get(n.id).type).toBe('u:idea');
    expect(b.journal().startsWith(before)).toBe(true); // append-only: the legacy bytes are untouched
  });

  it('a raw def that would split identity (u:idea into typedef:u:idea over legacy typedef:idea) is refused', () => {
    b = openBrain();
    b.appendRaw(JSON.stringify(buildTypeDefAct({ name: 'idea', version: 1, status: 'active', fields: {} }, { now: FIXED_NOW, actor: 'user:owner' })));
    b.appendRaw(JSON.stringify(buildTypeDefAct({ name: 'u:idea', version: 2, status: 'active', fields: {} }, { now: FIXED_NOW, actor: 'user:owner' })));
    b.restart();
    expect(b.d.registry.type('idea')!.version).toBe(1);
    expect(b.d.registry.rejected.map((r) => r.reason)).toEqual(['node-mismatch']);
  });
});

describe('AC-D07: a legacy `lives-in` (one) edge and the canonical u:lives-in are one predicate', () => {
  it('cardinality kept, found by either spelling, same target → same edge, other target → legacy retracted', () => {
    b = openBrain();
    b.appendRaw(JSON.stringify(buildPredicateDefAct(
      { name: 'lives-in', cardinality: 'one', from_hint: [], to_hint: [], meaning: 'где живёт', status: 'active' },
      { now: FIXED_NOW, actor: 'user:owner' },
    )));
    b.restart();
    const task = ok(b.record({ type: 'task', label: 'Задача' }));
    // a legacy edge as the pre-door code wrote it (bare spelling), appended straight to the journal
    const legacy = makeEdge(task.id, 'lives-in', 'scope:brain', { author: 'user:owner', status: 'active', created_at: FIXED_NOW.toISOString() });
    b.appendRaw(JSON.stringify(buildEdgeAct({ from: task.id, actId: 'a_legacyedge1', actor: 'user:owner', type: 'task', type_v: 1, edges: [legacy], now: FIXED_NOW })));
    b.restart();

    expect(b.d.registry.cardinalities()['lives-in']).toBe('one');
    expect(b.d.registry.cardinalities()['u:lives-in']).toBe('one');
    const deps = { engine: b.d.engine, store: b.d.store };
    for (const pred of ['lives-in', 'u:lives-in']) {
      const r = find(topicReader(), { edge: { pred } }, deps);
      expect(r.ok && r.items.map((i) => i.id), pred).toEqual([task.id]);
    }

    const active = () => b!.get(task.id).edges.filter((e) => e.predicate.endsWith('lives-in') && e.meta?.status !== 'retracted');
    const same = ok(b.link({ from: task.id, pred: 'u:lives-in', to: 'scope:brain' }));
    expect(same.edge_id).toBe(legacy.id); // no second edge for one fact
    expect(active().map((e) => [e.predicate, e.target])).toEqual([['lives-in', 'scope:brain']]);

    ok(b.link({ from: task.id, pred: 'u:lives-in', to: 'scope:agents' }));
    expect(active().map((e) => [e.predicate, e.target])).toEqual([['u:lives-in', 'scope:agents']]);
    b.restart();
    expect(active().map((e) => [e.predicate, e.target])).toEqual([['u:lives-in', 'scope:agents']]);
    const legacyNow = b.get(task.id).edges.find((e) => e.predicate === 'lives-in')!;
    expect(legacyNow.meta?.status).toBe('retracted');
  });
});

describe('AC-D08: names on the wire, never in ref positions; core identity unchanged', () => {
  it('core:task → task; u:x / pack:bt/issue in ref positions → BAD_REQUEST, nothing written', () => {
    b = openBrain();
    const t = ok(b.record({ type: 'core:task', label: 'Ядро' }));
    expect(t.type).toBe('task');
    const n = b.acts().length;
    expect(err(b.record({ type: 'task', label: 'x', scopes: ['u:x'] })).code).toBe('BAD_REQUEST');
    expect(err(b.record({ type: 'task', label: 'x', edges: [{ pred: 'about', to: 'pack:bt/issue' }] })).code).toBe('BAD_REQUEST');
    expect(err(b.link({ from: t.id, pred: 'about', to: 'pack:bt/issue' })).code).toBe('BAD_REQUEST');
    expect(err(b.link({ from: t.id, pred: 'about', to: 'core:task' })).code).toBe('BAD_REQUEST');
    expect(b.acts().length).toBe(n);

    // core identity: genesis via planDefinition = the historical genesis acts byte for byte; core edge ids
    // keep the bare spelling
    const genesisNow = b.acts().filter((a) => a.actor === GENESIS_ACTOR && String((a.provenance as { source_ref: string }).source_ref).startsWith('typedef:'));
    const genesisNowAt = new Date((genesisNow[0]!.payload as { meta: { created_at: string } }).meta.created_at);
    const historical = genesisActs({ now: genesisNowAt }).filter((a) => String((a.provenance as { source_ref: string }).source_ref).startsWith('typedef:'));
    expect(genesisNow.map((a) => [a.id, a.provenance, a.payload])).toEqual(historical.map((a) => [a.id, a.provenance, a.payload]));
    expect(b.d.registry.defNodeId('type', 'core:task')).toBe('typedef:task');
    const other = ok(b.record({ type: 'note', label: 'Цель' }));
    const l = ok(b.link({ from: t.id, pred: 'core:about', to: other.id }));
    expect(l.edge_id).toBe(edgeIdOf(t.id, { predicate: 'about', target: other.id }));
  });

  it('a scope slug with ":" is refused at genesis', () => {
    expect(() => openBrain({ scopes: [{ slug: 'u:x', name: 'X', kind: 'project' }] })).toThrow(/slug/);
  });
});
