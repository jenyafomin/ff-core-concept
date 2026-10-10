// Launch kit assumptions (docs/_log/2026-10-05-personal-memory-launch/launch/): the starting config must be
// safe to extend. Pins: (1) genesis scopes are ADDITIVE across restarts — a new slug in service.json appears,
// existing scopes are left untouched; (2) the todo protocol — one type `task`, the "kind" as a free field —
// is accepted and findable with an explicit scope by the per-topic binding of the launch readers.json.
import { afterEach, describe, expect, it } from 'vitest';

import { bootBrain, decodeNode, type BrainDomain, type ScopeSeed } from '../../src/domain/index.js';
import { find, type ReadDeps } from '../../src/read/index.js';
import { makeBrainFixture, type BrainFixture } from '../support/brain-fixture.js';
import { ok, openBrain, tickingClock, topicReader, type Brain } from './harness.js';

process.setMaxListeners(0);

const PERSONAL: ScopeSeed = { slug: 'personal', name: 'Личное — дела владельца', kind: 'personal' };
/** The binding launch-brain.sh writes for `<chat>:<topic>`. */
const launchReader = () =>
  topicReader({ scopes: ['personal'], default_scope: 'personal', write: true, personal: true });

let fx: BrainFixture | undefined;
let d: BrainDomain | undefined;
let b: Brain | undefined;
afterEach(() => {
  d?.store.close();
  fx?.cleanup();
  b?.close();
  fx = d = b = undefined;
});

describe('launch: genesis scopes are additive', () => {
  it('a later boot with more scopes adds them and leaves existing scopes untouched', () => {
    fx = makeBrainFixture();
    const clock = tickingClock();
    d = bootBrain({ storeDir: fx.storeDir, scopes: [PERSONAL], clock });
    expect(d.store.readNode('scope:personal')).toBeTruthy();
    const before = JSON.stringify(d.store.readNode('scope:personal'));
    d.store.close();

    // owner later dictates companies → projects; also tries to rename the existing scope (ignored)
    const later: ScopeSeed[] = [
      { ...PERSONAL, name: 'Переименовано' },
      { slug: 'acme', name: 'Acme', kind: 'company' },
      { slug: 'ff', name: 'FF', kind: 'project', member_of: ['acme'] },
    ];
    d = bootBrain({ storeDir: fx.storeDir, scopes: later, clock });
    expect(d.genesisWritten).toBe(2);
    expect(JSON.stringify(d.store.readNode('scope:personal'))).toBe(before);
    const ff = decodeNode(d.store.readNode('scope:ff')!);
    expect(ff.edges.some((e) => e.predicate.endsWith('member-of') && e.target === 'scope:acme')).toBe(true);
    d.store.close();

    // dropping a scope from service.json does not remove it either
    d = bootBrain({ storeDir: fx.storeDir, scopes: [], clock });
    expect(d.genesisWritten).toBe(0);
    expect(d.store.readNode('scope:acme')).toBeTruthy();
  });
});

describe('launch: what is NOT additive (why the start set is only `personal`)', () => {
  it('an existing scope cannot be re-parented later — neither via service.json nor via link', () => {
    b = openBrain({ scopes: [{ slug: 'ff', name: 'FF', kind: 'project' }] });
    // service.json later says ff ∈ acme → acme is created, but the existing ff node is skipped (no edge)
    b.d.store.close();
    const d2 = bootBrain({
      storeDir: b.fx.storeDir,
      scopes: [{ slug: 'acme', name: 'Acme', kind: 'company' }, { slug: 'ff', name: 'FF', kind: 'project', member_of: ['acme'] }],
      clock: b.clock,
    });
    expect(decodeNode(d2.store.readNode('scope:ff')!).edges.some((e) => e.target === 'scope:acme')).toBe(false);
    d2.store.close();
    b.restart();
    const r = topicReader({ scopes: ['ff', 'acme'] });
    expect(b.link({ from: 'scope:ff', pred: 'member-of', to: 'scope:acme' }, r).ok).toBe(false);
  });
});

describe('launch: todo protocol on the per-topic binding', () => {
  it('task with fields.kind is accepted, owner-only (personal scope) and found with an explicit scope', () => {
    b = openBrain({ scopes: [PERSONAL] });
    const r = launchReader();
    const t = ok(b.record({ type: 'task', label: 'Оплатить интернет за октябрь', fields: { kind: 'быт', due: '2026-10-15' }, scopes: ['personal'] }, r));
    expect(b.get(t.id).fields).toMatchObject({ kind: 'быт', status: 'open', due: '2026-10-15' });

    const deps: ReadDeps = { engine: b.d.engine, store: b.d.store, clock: b.clock };
    const open = ok(find(r, { scope: 'personal', type: 'task', status: 'open' }, deps));
    expect(open.items.map((i) => i.id)).toEqual([t.id]);
    // personal scope → readable_by owner: a non-personal binding of the same scope sees nothing
    expect(ok(find(topicReader({ scopes: ['personal'], personal: false }), { scope: 'personal' }, deps)).items).toEqual([]);

    ok(b.record({ id: t.id, type: 'task', label: 'Оплатить интернет за октябрь', fields: { status: 'done', done_at: '2026-10-10' } }, r));
    expect(ok(find(r, { scope: 'personal', type: 'task', status: 'open' }, deps)).items).toEqual([]);
  });
});
