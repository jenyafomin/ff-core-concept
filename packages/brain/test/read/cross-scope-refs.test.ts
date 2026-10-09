// F-2 (critic-live-run): references into scopes the reader cannot see. A hidden target is answered EXACTLY
// like a non-existent one — link → dangling, read → dangling edge, no neighbour, find/record identical —
// so the reader gets no existence oracle and no foreign scope label.
import { afterEach, describe, expect, it } from 'vitest';

import { planLink, recordVisibleTo } from '../../src/domain/index.js';
import { find, read, type ReadDeps } from '../../src/read/index.js';
import { ok, openBrain, topicReader, type Brain } from '../domain/harness.js';

let b: Brain;
afterEach(() => b?.close());

const deps = (br: Brain): ReadDeps => ({ engine: br.d.engine, store: br.d.store, clock: br.clock });
// p1 = scope:agents (foreign to p2), p2 = scope:brain
const p2 = () => topicReader({ scopes: ['scope:brain'], default_scope: 'scope:brain', personal: false, principal: 'agent:p2' });
const MISSING = 'u_doesnotexist1';

function setup() {
  b = openBrain();
  const foreign = ok(b.record({ type: 'note', label: 'Только p1', scopes: ['agents'] }));
  const mine = ok(b.record({ type: 'task', label: 'Моё в p2' }, p2()));
  return { foreign: foreign.id, mine: mine.id };
}

describe('F-2 — out-of-scope reference targets ≡ non-existent', () => {
  it('link to a foreign record answers exactly like a link to a missing id (dangling:true)', () => {
    const { foreign, mine } = setup();
    const toForeign = ok(b.link({ from: mine, pred: 'about', to: foreign }, p2()));
    const toMissing = ok(b.link({ from: mine, pred: 'about', to: MISSING }, p2()));
    expect(toForeign.dangling).toBe(true);
    expect(toMissing.dangling).toBe(true);
    expect(Object.keys(toForeign).sort()).toEqual(Object.keys(toMissing).sort());
    // the full reader (sees p1) gets the honest answer
    const full = ok(b.link({ from: mine, pred: 'informed', to: foreign }));
    expect(full.dangling).toBe(false);
  });

  it('read back: foreign and missing edges look the same (dangling), the foreign record is not a neighbour', () => {
    const { foreign, mine } = setup();
    ok(b.link({ from: mine, pred: 'about', to: foreign }, p2()));
    ok(b.link({ from: mine, pred: 'blocks', to: MISSING }, p2()));
    const r = ok(read(p2(), { id: mine }, deps(b)));
    const f = r.edges.find((e) => e.to === foreign)!;
    const m = r.edges.find((e) => e.to === MISSING)!;
    expect(f).toMatchObject({ dangling: true, status: 'active' });
    expect(m).toMatchObject({ dangling: true, status: 'active' });
    expect(Object.keys(f).sort()).toEqual(Object.keys(m).sort());
    expect(r.neighbors).toEqual([]);
    expect(JSON.stringify(r)).not.toContain('Только p1');
  });

  it('record.edges / derived_from toward a foreign id are answered like toward a missing id', () => {
    const { foreign } = setup();
    const a = ok(b.record({ type: 'note', label: 'A', edges: [{ pred: 'about', to: foreign }], derived_from: [`${foreign}@1`] }, p2()));
    const c = ok(b.record({ type: 'note', label: 'A', edges: [{ pred: 'about', to: MISSING }], derived_from: [`${MISSING}@1`] }, p2()));
    const strip = (x: Record<string, unknown>) => Object.keys(x).filter((k) => k !== 'id' && k !== 'receipt').sort();
    expect(strip(a as never)).toEqual(strip(c as never));
    expect((a as { warnings?: unknown }).warnings).toEqual((c as { warnings?: unknown }).warnings);
  });

  it('find.edge.to: a foreign id behaves like a missing id (matches only the reader\'s own edges, never reveals the target)', () => {
    const { foreign, mine } = setup();
    const ids = (to: string) => ok(find(p2(), { edge: { pred: 'about', to } }, deps(b))).items.map((i) => i.id);
    expect(ids(foreign)).toEqual([]);
    expect(ids(MISSING)).toEqual([]);
    ok(b.link({ from: mine, pred: 'about', to: foreign }, p2()));
    ok(b.link({ from: mine, pred: 'about', to: MISSING }, p2()));
    expect(ids(foreign)).toEqual([mine]);
    expect(ids(MISSING)).toEqual([mine]);
  });

  it('link receipt names a scope the reader holds, not the foreign one the record also sits in', () => {
    b = openBrain();
    const shared = ok(b.record({ type: 'note', label: 'Общая', scopes: ['agents', 'brain'] }));
    const plan = planLink({ from: shared.id, pred: 'about', to: MISSING }, p2(), b.ctx());
    if ('ok' in plan) throw new Error(plan.message);
    expect(plan.scopeLabel).toBe('brain');
  });

  it('recordVisibleTo mirrors the read gate: scope gate and readable_by (owner-only hidden from agents)', () => {
    const { foreign, mine } = setup();
    const person = ok(b.record({ type: 'person', label: 'Иван', fields: { name: 'Иван' } }));
    const lookup = b.ctx().lookup;
    expect(recordVisibleTo(p2(), lookup(mine)!, lookup)).toBe(true);
    expect(recordVisibleTo(p2(), lookup(foreign)!, lookup)).toBe(false);
    expect(recordVisibleTo(topicReader({ personal: false }), lookup(person.id)!, lookup)).toBe(false);
    expect(recordVisibleTo(topicReader({ personal: true }), lookup(person.id)!, lookup)).toBe(true);
  });
});
