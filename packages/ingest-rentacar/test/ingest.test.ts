/**
 * ingest.test — the M1 DoD gates on the fixture (spec §9): T1 idempotency · G3 no-inline-PII +
 * journal-grep · RB rebuild-from-journal bit-equivalence · QN quarantine visibility.
 *
 * Reuses the REAL engine core (@ff/engine): MemoryStore (journal + projection), FIXED_POLICY,
 * admission-gate, projection reducer. The ingest package adds only the row→act transform.
 * (T2 — 0 collisions over the full 4102 rows — is GATED on F-D and NOT exercised here; see report.)
 */
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  Engine,
  MemoryStore,
  FIXED_POLICY,
  type Act,
  type EnvelopeNode,
} from '@ff/engine';
import {
  FixtureRowSource,
  FilePayloadStore,
  runIngest,
  ACTOR,
  RENTACAR_PREDICATES,
} from '../src/index.js';

// Engine refuses to START without a policy:constitution ceiling — minimal test fixture (as in engine tests).
const MIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  body: { synthetic: true, no_read: [], protected_namespaces: [], default: 'deny' },
};

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));

function newEngine(): { store: MemoryStore; engine: Engine } {
  const store = new MemoryStore([MIN_CONSTITUTION], RENTACAR_PREDICATES);
  return { store, engine: new Engine(store, FIXED_POLICY) };
}
function newSource(): FixtureRowSource {
  return new FixtureRowSource(FIXTURES);
}
function newPayloadStore(): FilePayloadStore {
  return new FilePayloadStore(mkdtempSync(join(tmpdir(), 'ff-ingest-pii-')));
}
const nodesOf = (store: MemoryStore) => store.load().filter((n) => n.id !== 'policy:constitution');
const nodeById = (store: MemoryStore, id: string) => store.load().find((n) => n.id === id);

// PII present in the fixtures — must NEVER surface on the journal (G3), only in the payload-store.
const PII_STRINGS = [
  '380674842880',
  '+971501234567',
  '971559998877',
  '971521112233',
  'Kriukovskyi Oleksii',
  'Ahmed Hassan',
  'Called about extension',
];

describe('T1 — idempotency: a second identical sync appends 0 new acts (all dedup)', () => {
  it('run twice on the same engine ⇒ 2nd run emits 0, dedups all, journal does not grow', () => {
    const { store, engine } = newEngine();
    const source = newSource();
    const pii = newPayloadStore();

    const first = runIngest(engine, source, pii);
    expect(first.refused).toBe(0); // clean ingest never trips admission
    expect(first.quarantined).toBe(3); // 2 broken-# orders + 1 unkeyable car
    expect(first.emitted).toBe(16); // 6 cars + (5 orders × [order+customer])
    expect(first.deduped).toBe(0);
    const afterFirst = store.acts().length;
    expect(afterFirst).toBe(16);

    const second = runIngest(engine, source, pii);
    expect(second.emitted).toBe(0); // T1: nothing new
    expect(second.deduped).toBe(16); // every act recognised as a byte-identical re-write
    expect(second.quarantined).toBe(3);
    expect(store.acts().length).toBe(afterFirst); // the journal did NOT grow
  });
});

describe('G3 — admission: inline-PII refused before write; journal carries 0 PII', () => {
  it('(a) an act with inline PII in payload AND edge-meta is REFUSED before any journal write', () => {
    const { store, engine } = newEngine();
    const before = store.acts().length;
    const inlinePii: Act = {
      id: 'act:evil',
      actor: ACTOR,
      provenance: { source_ref: 'sheets:Orders#999-999', snapshotHash: 'x' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [{ predicate: 'rented', target: 'x', meta: { phone: '380674842880' } }], // PII in edge meta
      payload: { type: 'order', name: 'John Doe', phone: '380674842880' }, // PII inline in payload
    };
    const ack = engine.write(inlinePii);
    expect(ack.ok).toBe(false); // REFUSED
    expect(store.acts().length).toBe(before); // and never journaled
  });

  it('(b) after a normal run, grepping the journal for any phone/name/note = 0 hits', () => {
    const { store, engine } = newEngine();
    const pii = newPayloadStore();
    runIngest(engine, newSource(), pii);

    const journal = JSON.stringify(store.acts());
    for (const secret of PII_STRINGS) {
      expect(journal.includes(secret), `journal must not contain PII: ${secret}`).toBe(false);
    }
  });

  it('(b′) the PII is not lost — it lives in the payload-store (proving it was moved, not dropped)', () => {
    const { engine } = newEngine();
    const dir = mkdtempSync(join(tmpdir(), 'ff-ingest-pii-'));
    runIngest(engine, newSource(), new FilePayloadStore(dir));

    const stored = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    expect(stored.includes('380674842880')).toBe(true); // phone IS in the payload-store
    expect(stored.includes('Kriukovskyi Oleksii')).toBe(true); // name too
  });
});

describe('RB — rebuild-from-journal is bit-for-bit equal to the incremental graph (ADR-0008 §2)', () => {
  it('drop the projection, rebuild from acts[] ⇒ deep-equal the incrementally-built graph', () => {
    const { store, engine } = newEngine();
    runIngest(engine, newSource(), newPayloadStore());

    const incremental = structuredClone(store.load());
    store.dropProjection();
    expect(store.load()).toEqual([MIN_CONSTITUTION]); // projection torn down

    engine.rebuild('journal');
    expect(store.load()).toEqual(incremental); // 0 loss of knowledge
  });
});

describe('QN — quarantine: broken rows produce no node, counted + logged (not silent)', () => {
  it('broken/empty # and unkeyable car are quarantined; no nodes exist for them', () => {
    const { store, engine } = newEngine();
    const summary = runIngest(engine, newSource(), newPayloadStore());

    expect(summary.quarantined).toBe(3);
    expect(summary.quarantineLog).toHaveLength(3);
    expect(summary.quarantineLog.some((m) => m.includes('Check Levels'))).toBe(true);

    // no node carries the junk key
    expect(nodesOf(store).some((n) => n.id.includes('Check Levels'))).toBe(false);
    expect(nodeById(store, 'sheets:Cars#-')).toBeUndefined();
  });

  it('the 5 valid orders + 5 customers + 6 cars project (SOLD-* cars stay DISTINct, §3)', () => {
    const { store, engine } = newEngine();
    runIngest(engine, newSource(), newPayloadStore());

    const ids = nodesOf(store).map((n) => n.id);
    expect(ids).toContain('sheets:Orders#45832-2865'); // glued "Long term" stripped by leading-regex
    expect(ids).toContain('sheets:Orders#45875-2870'); // spaced " [AL]" stripped too
    expect(ids).toContain('sheets:Orders#45832-2865:customer'); // per-occurrence customer

    // §3 fix: two SOLD cars sharing plate "SOLD-123" do NOT collapse into one node
    expect(nodeById(store, 'sheets:Cars#SOLD:C-1005')).toBeDefined();
    expect(nodeById(store, 'sheets:Cars#SOLD:C-1006')).toBeDefined();
    const carNode = nodeById(store, 'sheets:Cars#SOLD:C-1005');
    expect(carNode?.body?.placeholder_plate).toBe(true);

    expect(nodesOf(store)).toHaveLength(16); // 5 orders + 5 customers + 6 cars
  });
});
