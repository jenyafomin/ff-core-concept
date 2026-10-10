// AC-11, AC-12, AC-13, AC-09: genesis idempotence, two-pass registry, legacy tenant, schema_v/type_v.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  GENESIS_PREDICATES,
  GENESIS_TYPES,
  buildPredicateDefAct,
  buildTypeDefAct,
  samePredicate,
  scanJournalRegistry,
} from '../../src/domain/index.js';
import { FIXED_NOW } from '../support/brain-fixture.js';
import { SEED_SCOPES, err, ok, openBrain, type Brain } from './harness.js';

let b: Brain | undefined;
afterEach(() => {
  b?.close();
  b = undefined;
});

const lines = (s: string) => s.split('\n').filter((l) => l.trim() !== '');

describe('genesis (AC-12)', () => {
  it('empty journal → genesis acts written; second start → 0 new acts, file unchanged', () => {
    b = openBrain();
    const expected = GENESIS_TYPES.length + GENESIS_PREDICATES.length + SEED_SCOPES.length;
    // SPEC-R1 R-02 / AC-R01: the `sys:` seed follows genesis (3 types + 1 predicate + scope + lens = 6)
    const SYS_SEED = 6;
    expect(b.d.genesisWritten).toBe(expected);
    expect(b.d.sysSeedWritten).toBe(SYS_SEED);
    expect(lines(b.journal())).toHaveLength(expected + SYS_SEED);
    const before = b.journal();

    b.restart();
    expect(b.d.genesisWritten).toBe(0);
    expect(b.d.sysSeedWritten).toBe(0);
    expect(b.journal()).toBe(before);
    b.restart();
    expect(b.d.genesisWritten).toBe(0);
    expect(b.acts()).toHaveLength(expected + SYS_SEED);
  });

  it('registry after genesis is read from the journal (all genesis names, cardinalities)', () => {
    b = openBrain();
    for (const t of GENESIS_TYPES) expect(b.d.registry.type(t.name)).toEqual(t);
    for (const p of GENESIS_PREDICATES) expect(b.d.registry.predicate(p.name)).toEqual(p);
    const scan = scanJournalRegistry(b.d.journalPath).registry;
    expect(scan.cardinalities()).toEqual(b.d.registry.cardinalities());
    expect(scan.cardinalities()['instance-of']).toBe('one');
    expect(scan.cardinalities()['in-scope']).toBe('many');
  });
});

describe('two-pass registry (AC-13)', () => {
  it('a pred-def / type-def appended by a fixture is in the registry after restart — no code change', () => {
    b = openBrain();
    // before: unknown type → raw, unknown predicate → refused
    const t0 = ok(b.record({ type: 'idea', label: 'Идея до рестарта' }));
    expect(t0.type).toBe('raw');
    const task = ok(b.record({ type: 'task', label: 'Задача' }));
    expect(err(b.link({ from: task.id, pred: 'lives-in', to: 'scope:brain' })).code).toBe('UNKNOWN_PREDICATE');

    // fixture appends defs straight into journal.jsonl (legacy inline line format)
    b.appendRaw(JSON.stringify(buildPredicateDefAct(
      { name: 'lives-in', cardinality: 'one', from_hint: [], to_hint: [], meaning: 'где живёт', status: 'active' },
      { now: FIXED_NOW, actor: 'user:owner' },
    )));
    b.appendRaw(JSON.stringify(buildTypeDefAct(
      { name: 'idea', version: 1, status: 'active', fields: { text: { kind: 'text' } } },
      { now: FIXED_NOW, actor: 'user:owner' },
    )));
    b.restart();

    expect(b.d.registry.predicate('lives-in')?.cardinality).toBe('one');
    expect(b.d.registry.activeType('idea')?.version).toBe(1);
    const idea = ok(b.record({ type: 'idea', label: 'Идея после рестарта', fields: { text: 'x' } }));
    // SPEC-brain-data-doors R-1.8 (option A, was 'idea'): the answer carries the canonical name
    expect(idea.type).toBe('u:idea');
    expect(idea.warnings).toEqual([]);

    // cardinality `one` applied by the store: a second target REPLACES the first
    ok(b.link({ from: task.id, pred: 'lives-in', to: 'scope:brain' }));
    ok(b.link({ from: task.id, pred: 'lives-in', to: 'scope:agents' }));
    // SPEC-brain-data-doors R-1.7 (option A, was predicate === 'lives-in'): new links write the canonical
    // spelling u:lives-in; compare spellings with samePredicate
    const livesIn = b.get(task.id).edges.filter((e) => samePredicate(e.predicate, 'lives-in'));
    expect(livesIn.map((e) => e.target)).toEqual(['scope:agents']);

    // and it survives yet another restart (store re-folds with the journal's cardinalities)
    b.restart();
    expect(b.get(task.id).edges.filter((e) => samePredicate(e.predicate, 'lives-in')).map((e) => e.target)).toEqual(['scope:agents']);
  });

  it('pass 1 skips corrupt lines and the torn tail', () => {
    b = openBrain();
    b.appendRaw('{not json');
    // fixture INPUT (not an assertion) adjusted for SPEC-brain-data-doors R-1.3: the default actor is
    // system:genesis, which may define only core names — a u: name needs a user/agent/cli writer
    b.appendRaw(JSON.stringify(buildPredicateDefAct(
      { name: 'after-bad', cardinality: 'many', from_hint: [], to_hint: [], meaning: '', status: 'active' },
      { now: FIXED_NOW, actor: 'user:owner' },
    )));
    const scan = scanJournalRegistry(b.d.journalPath);
    expect(scan.badLines).toBe(1);
    expect(scan.registry.predicate('after-bad')).toBeDefined();
  });
});

describe('legacy tenant → in-scope (AC-09)', () => {
  it('a legacy act with body.tenant reads as in-scope X; without tenant → project:ff; journal bytes unchanged', () => {
    b = openBrain();
    const legacy = (id: string, payload: Record<string, unknown>) =>
      JSON.stringify({
        id: `a_legacy${id.slice(-3)}`,
        actor: 'agent:old',
        provenance: { source_ref: id },
        recordedAt: '2026-08-01T00:00:00.000Z',
        actKind: 'domain_event',
        edges: [],
        payload,
      });
    b.appendRaw(legacy('legacy:one', { type: 'task', title: 'Старое дело', tenant: 'company:x' }));
    b.appendRaw(legacy('legacy:two', { type: 'note', label: 'Без tenant' }));
    const hash = () => createHash('sha256').update(readFileSync(b!.fx.journalPath)).digest('hex');
    const before = hash();
    b.restart();
    expect(hash()).toBe(before);

    const one = b.get('legacy:one');
    expect(one.legacy).toBe(true);
    expect(one.scopes).toEqual(['company:x']);
    expect(one.label).toBe('Старое дело');
    expect(one.status).toBe('active');
    expect(b.get('legacy:two').scopes).toEqual(['project:ff']);
    expect(hash()).toBe(before);
  });
});

describe('schema_v / type_v on every act (AC-11)', () => {
  it('genesis, create, update, retract and link acts all carry provenance.schema_v and type_v', () => {
    b = openBrain();
    const t = ok(b.record({ type: 'task', label: 'Проверить акты' }));
    ok(b.record({ id: t.id, type: 'task', label: 'Проверить акты', fields: { status: 'doing' } }));
    const n = ok(b.record({ type: 'note', label: 'Заметка' }));
    ok(b.link({ from: t.id, pred: 'about', to: n.id }));
    ok(b.record({ id: n.id, type: 'note', label: 'Заметка', retract: true, reason: 'дубль' }));
    expect(b.acts().length).toBeGreaterThan(GENESIS_TYPES.length);
    for (const a of b.acts()) {
      const p = a.provenance as Record<string, unknown>;
      expect(p.schema_v, a.id).toBe(1);
      expect(typeof p.type_v, a.id).toBe('number');
      expect(typeof p.type, a.id).toBe('string');
    }
  });
});
