/**
 * write-plane.test — GAP 3 write/identity-plane invariants (RED→GREEN, see
 * docs/02-project/core/00-kernel/analyses/invariants-enforcement/01-enforce-write-plane.analysis.md).
 *
 * This file houses the "already-root" write-plane locks. Shipped in this file so far:
 *
 *   (b) `same-as` cardinality is LOCKED to `'many'` — a KERNEL structural-identity predicate whose
 *       merge semantics no caller registry may narrow. `'one'` on `same-as` would silently un-merge
 *       identity history (mine A-C2). NOT a tenant noun (does not violate G1): identity is a root
 *       concern the engine holds for ANY content, so the lock lives in the kernel by name.
 *
 *   (a·same-as instance) The concrete replay-collapse (a) warns about: two `same-as` acts folded under
 *       `many` MUST NOT collapse to one edge when a later registry declares `same-as: 'one'`. The (b)
 *       lock closes this specific mine (the general (a) guard for OTHER identity-bearing predicates —
 *       refuse-on-narrow vs versioned-registry-per-act — is a deferred architect fork, see analysis).
 */
import { describe, it, expect } from 'vitest';
import {
  cardinalityOf,
  foldEdges,
  project,
  DEFAULT_PREDICATES,
  LOCKED_MANY_PREDICATES,
  Engine,
  MemoryStore,
  FIXED_POLICY,
  type Act,
  type Edge,
  type EnvelopeNode,
  type HomeRegistry,
  type PredicateRegistry,
} from '../src/index.js';

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

function paymentEvent(id: string, source_ref: string, domain: string): Act {
  return {
    id,
    actor: `sync:${domain}`,
    provenance: { source_ref, snapshotHash: id, fact_kind: 'payment', domain },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payloadRef: `blob:${id}`,
    payloadHash: `sha256:${id}`,
  };
}

function sameAsEvent(id: string, source_ref: string, snapshotHash: string, target: string): Act {
  return {
    id,
    actor: 'sync:test',
    provenance: { source_ref, snapshotHash },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [{ predicate: 'same-as', target }],
    payload: { type: 'customer' },
  };
}

describe('(b) same-as cardinality is LOCKED to many (kernel identity ceiling, wins over any registry)', () => {
  it('same-as is a declared kernel-locked structural predicate (not an accident of the fallback default)', () => {
    expect(LOCKED_MANY_PREDICATES.has('same-as')).toBe(true);
  });

  it('a registry that declares same-as:one is IGNORED — cardinalityOf still returns many', () => {
    const badRegistry: PredicateRegistry = { ...DEFAULT_PREDICATES, 'same-as': 'one' };
    // RED today: bare `registry[predicate] ?? 'many'` would honour the caller and return 'one'.
    expect(cardinalityOf('same-as', badRegistry)).toBe('many');
    // Unlocked predicates are unaffected — the lock is surgical, not a blanket clamp.
    expect(cardinalityOf('for-car', { 'for-car': 'one' })).toBe('one');
  });

  it('foldEdges never REPLACES a same-as edge, even under a same-as:one registry (no un-merge)', () => {
    const prev: Edge[] = [{ predicate: 'same-as', target: 'identity:A' }];
    const merged = foldEdges(prev, [{ predicate: 'same-as', target: 'identity:B' }], { 'same-as': 'one' });
    const sameAs = merged.filter((e) => e.predicate === 'same-as').map((e) => e.target).sort();
    expect(sameAs).toEqual(['identity:A', 'identity:B']); // both identities coexist; last did NOT overwrite
  });
});

describe('(a·same-as) a late same-as:one narrowing must not collapse historical edges on replay', () => {
  it('project() over two same-as acts keeps BOTH edges even when the registry declares same-as:one', () => {
    // Two acts on the same source_ref, each asserting a DIFFERENT same-as target, written under `many`.
    const acts: Act[] = [
      sameAsEvent('a', 'customer:42', 'h1', 'identity:A'),
      sameAsEvent('b', 'customer:42', 'h2', 'identity:B'),
    ];
    // REPLAY the SAME history under a registry that narrows same-as to 'one' (the D1 "late registration"
    // the analysis warns about). RED today: foldEdges' one-branch would drop identity:A silently → 1 edge.
    const node = project(acts, { 'same-as': 'one' }).get('customer:42')!;
    const sameAs = node.edges!.filter((e) => e.predicate === 'same-as').map((e) => e.target).sort();
    expect(sameAs).toEqual(['identity:A', 'identity:B']); // history intact, no silent collapse to identity:B
  });
});

describe('(c) one-home barrier — a factKind has exactly ONE writer-home domain (write=one-home law)', () => {
  // Design: docs/02-project/core/00-kernel/analyses/invariants-enforcement/02-design-forks-a-general-and-c-home.design.md §Fork (c).
  // Enforced STATELESSLY per-act at factKind granularity (no durable admission state, no cross-source_ref
  // fact-key identity): a `payment` fact is homed to 'rental-balance'; a 'sheets' act claiming to write it
  // is refused BEFORE the journal — even though its DIFFERENT source_ref evades Engine.write's ref-dedup.
  const homeRegistry: HomeRegistry = { homes: { payment: 'rental-balance' } };

  function engineWithHome() {
    const store = new MemoryStore([MIN_CONSTITUTION]);
    const engine = new Engine(store, FIXED_POLICY, [], homeRegistry);
    return { store, engine };
  }

  it('the home domain writes its own factKind: admitted and journaled (baseline GREEN)', () => {
    const { store, engine } = engineWithHome();
    const ack = engine.write(paymentEvent('pay-42', 'rental-balance:pay-42', 'rental-balance'));
    expect(ack.ok).toBe(true);
    expect(store.acts()).toHaveLength(1);
  });

  it('a FOREIGN domain claiming a homed factKind is REFUSED before any journal write', () => {
    const { store, engine } = engineWithHome();
    expect(engine.write(paymentEvent('pay-42', 'rental-balance:pay-42', 'rental-balance')).ok).toBe(true);
    // sheets claims `payment` with a DIFFERENT source_ref — ref-dedup can NOT catch it; the domain barrier must.
    const ack = engine.write(paymentEvent('pay-123', 'sheets:payment-123', 'sheets'));
    expect(ack.ok).toBe(false);
    if (!ack.ok) expect(ack.reason).toMatch(/one-home|second.writer|home/i);
    expect(store.acts()).toHaveLength(1); // refuse-before-journal: the foreign act never landed
  });

  it('CONTROL — a legitimately new payment from the HOME domain (different ref) still writes', () => {
    // Proves it is a DOMAIN barrier, not a blanket block on a homed factKind: the home may keep writing.
    const { store, engine } = engineWithHome();
    expect(engine.write(paymentEvent('pay-42', 'rental-balance:pay-42', 'rental-balance')).ok).toBe(true);
    const ack = engine.write(paymentEvent('pay-99', 'rental-balance:pay-99', 'rental-balance'));
    expect(ack.ok).toBe(true);
    expect(store.acts()).toHaveLength(2);
  });

  it('barrier OFF by default — no homeRegistry injected ⇒ a foreign-domain payment writes (behaviour unchanged)', () => {
    const store = new MemoryStore([MIN_CONSTITUTION]);
    const engine = new Engine(store, FIXED_POLICY); // no 4th arg
    expect(engine.write(paymentEvent('pay-42', 'rental-balance:pay-42', 'rental-balance')).ok).toBe(true);
    expect(engine.write(paymentEvent('pay-123', 'sheets:payment-123', 'sheets')).ok).toBe(true);
    expect(store.acts()).toHaveLength(2); // reversibility: the injected barrier is opt-in
  });
});
