/**
 * projection.test — the CQRS core (ADR-0008): graph = deterministic projection of the acts-log.
 * Covers: write→node projection, idempotency (T1), rebuild bit-equivalence (Validation §2), superseding
 * (freshest wins, log keeps both), tombstone (archived, not deleted), and "only domain_event replays".
 */
import { describe, it, expect } from 'vitest';
import {
  Engine,
  MemoryStore,
  FIXED_POLICY,
  project,
  isProjectable,
  sourceRefOf,
  type Act,
  type EnvelopeNode,
} from '../src/index.js';

// Minimal constitution node (engine refuses to START without a policy:constitution ceiling).
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

/** A projectable domain_event: carries a source_ref key + snapshotHash + non-PII payload fields. */
function domainEvent(
  id: string,
  source_ref: string,
  snapshotHash: string,
  payload: Record<string, unknown>,
): Act {
  return {
    id,
    actor: 'sync:ga-rentacar',
    provenance: { source_ref, snapshotHash },
    recordedAt: '', // engine-assigned, ignored
    actKind: 'domain_event',
    edges: [],
    payload,
  };
}

function newEngine(): { store: MemoryStore; engine: Engine } {
  const store = new MemoryStore([MIN_CONSTITUTION]);
  return { store, engine: new Engine(store, FIXED_POLICY) };
}

const nodeOf = (store: MemoryStore, id: string) => store.load().find((n) => n.id === id);

describe('projection — a domain_event projects into a graph node (write→node)', () => {
  it('a domain_event becomes a node keyed by source_ref, fields from payload', () => {
    const { store, engine } = newEngine();
    const ack = engine.write(domainEvent('act:o1', 'sheets:Orders#100', 'h1', { type: 'order', total: 500 }));
    expect(ack.ok).toBe(true);

    const node = nodeOf(store, 'sheets:Orders#100');
    expect(node).toBeDefined();
    expect(node?.type).toBe('order');
    expect(node?.body).toEqual({ total: 500 }); // reserved key `type` is not a body field
    expect(node?.state?.version).toBe(1);
    expect(store.acts()).toHaveLength(1); // one act in the write-model
  });

  it('only domain_event replays — a non-domain_event act with a source_ref does NOT project', () => {
    const { store, engine } = newEngine();
    const observation: Act = {
      id: 'act:obs1',
      actor: 'agent:memory',
      provenance: { source_ref: 'sheets:Orders#100', snapshotHash: 'obs-h' },
      recordedAt: '',
      actKind: 'observation',
      edges: [],
      payload: { note: 'seen it' },
    };
    const ack = engine.write(observation);
    expect(ack.ok).toBe(true);
    expect(store.acts()).toHaveLength(1); // it IS in the log (side-journal)
    expect(isProjectable(observation)).toBe(false);
    expect(nodeOf(store, 'sheets:Orders#100')).toBeUndefined(); // but NOT in the read-model
    expect(store.load()).toEqual([MIN_CONSTITUTION]); // canonical state untouched
  });
});

describe('idempotency (T1) — same source_ref + snapshotHash ⇒ no-op, log does not grow', () => {
  it('a byte-identical re-write appends 0 new acts and returns dedup', () => {
    const { store, engine } = newEngine();
    const a = domainEvent('act:o1', 'sheets:Orders#100', 'h1', { type: 'order', total: 500 });
    const first = engine.write(a);
    const second = engine.write({ ...a, id: 'act:o1-again' }); // same ref+hash, different id

    expect(first.ok).toBe(true);
    if (first.ok) expect(first.dedup).toBeFalsy();
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.dedup).toBe(true);
    expect(store.acts()).toHaveLength(1); // grew by 1, not 2
    if (second.ok) expect(second.act.id).toBe('act:o1'); // returns the existing entry
  });

  it('a CHANGED snapshotHash is a superseding domain_event — log grows, projection takes the freshest', () => {
    const { store, engine } = newEngine();
    engine.write(domainEvent('act:o1', 'sheets:Orders#100', 'h1', { type: 'order', total: 500 }));
    engine.write(domainEvent('act:o2', 'sheets:Orders#100', 'h2', { type: 'order', total: 999 }));

    expect(store.acts()).toHaveLength(2); // log keeps BOTH acts (append-only)
    const node = nodeOf(store, 'sheets:Orders#100');
    expect(node?.body).toEqual({ total: 999 }); // node reflects the freshest
    expect(node?.state?.version).toBe(2); // version = depth of the act chain
  });
});

describe('rebuild-from-journal — bit-for-bit equivalent (ADR-0008 Validation §2)', () => {
  it('tear the projection down, rebuild from the log ⇒ deep-equal the incremental graph', () => {
    const { store, engine } = newEngine();
    // a series of writes: creates, a supersede, an unrelated node, a non-domain_event side-act
    engine.write(domainEvent('a1', 'sheets:Orders#100', 'h1', { type: 'order', total: 500 }));
    engine.write(domainEvent('a2', 'sheets:Cars#PLATE-1', 'c1', { type: 'car', model: 'X' }));
    engine.write(domainEvent('a3', 'sheets:Orders#100', 'h2', { type: 'order', total: 999 })); // supersede
    engine.write({
      id: 'trace-1',
      actor: 'agent:x',
      provenance: 'debug',
      recordedAt: '',
      actKind: 'agent_trace',
      edges: [],
      payload: { thought: 'noise' },
    });

    const incremental = structuredClone(store.load());

    // "снести current-state" — tear the read-model down to empty (base substrate remains).
    store.dropProjection();
    expect(store.load()).toEqual([MIN_CONSTITUTION]); // projection is gone

    engine.rebuild('journal'); // deterministic re-fold from acts[]
    const rebuilt = store.load();

    expect(rebuilt).toEqual(incremental); // bit-for-bit, 0 loss of knowledge
  });

  it('pure reducer: project(journal) equals the store projection folded incrementally', () => {
    const { store } = newEngine();
    store.writeAct(domainEvent('a1', 'r1', 'h1', { type: 'order', total: 1 }));
    store.writeAct(domainEvent('a2', 'r1', 'h2', { type: 'order', total: 2 }));
    store.writeAct(domainEvent('a3', 'r2', 'h3', { type: 'car' }));

    const batch = [...project(store.acts()).values()];
    const incremental = store.load().filter((n) => n.id !== 'policy:constitution');
    expect(batch).toEqual(incremental);
  });
});

describe('tombstone — an archived domain_event marks the node, it does NOT disappear', () => {
  it('an archived act flips tombstone=archived, node persists with its last snapshot', () => {
    const { store, engine } = newEngine();
    engine.write(domainEvent('a1', 'sheets:Orders#100', 'h1', { type: 'order', total: 500 }));
    // row vanished upstream → an archival domain_event on the same source_ref (payload marks archived)
    engine.write(domainEvent('a2', 'sheets:Orders#100', 'h2', { archived: true }));

    const node = nodeOf(store, 'sheets:Orders#100');
    expect(node).toBeDefined(); // NOT deleted
    expect(node?.state?.tombstone).toBe('archived');
    expect(node?.body).toEqual({ total: 500 }); // last known snapshot preserved
    expect(node?.state?.version).toBe(2);
    expect(sourceRefOf(store.acts()[1])).toBe('sheets:Orders#100');
  });
});
