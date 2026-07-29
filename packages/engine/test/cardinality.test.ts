/**
 * cardinality.test — the D1 regression-lock on the `foldInto` edge-fold (BUILD-P1 DoD T-cardinality).
 *
 * Locks the fix for the vintage `mergeEdges` bug (SYNTHESIS §2): edges are folded by a predicate→
 * cardinality REGISTRY (data), not hard-replaced and not blindly accumulated.
 *   - `one`  → a new target for the same subject+predicate REPLACES the prior edge (no stale dup).
 *   - `many` → distinct targets accumulate; a repeat refreshes meta in place.
 *   - foreign predicates (not mentioned by the incoming act) are NEVER wiped — even across actors.
 *
 * Exercised at the reducer level with a custom registry (so both cardinalities are proven without
 * inventing a domain `many` edge), plus an end-to-end supersede through the real Engine.
 */
import { describe, it, expect } from 'vitest';
import {
  Engine,
  MemoryStore,
  FIXED_POLICY,
  foldEdges,
  cardinalityOf,
  project,
  DEFAULT_PREDICATES,
  type Act,
  type Edge,
  type EnvelopeNode,
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

const REGISTRY: PredicateRegistry = { 'for-car': 'one', 'tagged-with': 'many' };

function domainEvent(id: string, source_ref: string, snapshotHash: string, edges: Edge[], payload: Record<string, unknown>): Act {
  return { id, actor: 'sync:test', provenance: { source_ref, snapshotHash }, recordedAt: '', actKind: 'domain_event', edges, payload };
}

describe('D1 registry — cardinality is data (default many, domain predicates registered one)', () => {
  it('unregistered predicate defaults to many; registered domain predicates are one', () => {
    expect(cardinalityOf('who-knows')).toBe('many'); // non-destructive default
    expect(cardinalityOf('for-car')).toBe('one');
    expect(cardinalityOf('paid-against')).toBe('one');
    expect(DEFAULT_PREDICATES['for-customer']).toBe('one');
  });
});

describe('foldEdges — one replaces, many accumulates, foreign edges survive', () => {
  it('one: a new target for the same predicate REPLACES the old (car reassigned, no stale dup)', () => {
    const prev: Edge[] = [{ predicate: 'for-car', target: 'car:A' }];
    const merged = foldEdges(prev, [{ predicate: 'for-car', target: 'car:B' }], REGISTRY);
    expect(merged.filter((e) => e.predicate === 'for-car')).toHaveLength(1);
    expect(merged.find((e) => e.predicate === 'for-car')?.target).toBe('car:B');
  });

  it('many: distinct targets accumulate; a repeat refreshes meta in place (no duplicate)', () => {
    const prev: Edge[] = [{ predicate: 'tagged-with', target: 'tag:x' }];
    const step1 = foldEdges(prev, [{ predicate: 'tagged-with', target: 'tag:y' }], REGISTRY);
    expect(step1.filter((e) => e.predicate === 'tagged-with').map((e) => e.target)).toEqual(['tag:x', 'tag:y']);
    const step2 = foldEdges(step1, [{ predicate: 'tagged-with', target: 'tag:x', meta: { note: 'fresh' } }], REGISTRY);
    const tags = step2.filter((e) => e.predicate === 'tagged-with');
    expect(tags).toHaveLength(2); // still x + y, not x + y + x
    expect(tags.find((e) => e.target === 'tag:x')?.meta).toEqual({ note: 'fresh' });
  });

  it('foreign predicates are never wiped by an act that does not mention them', () => {
    const prev: Edge[] = [
      { predicate: 'for-car', target: 'car:A' },
      { predicate: 'for-customer', target: 'cust:1' }, // asserted by a DIFFERENT act/actor
    ];
    const merged = foldEdges(prev, [{ predicate: 'for-car', target: 'car:B' }], REGISTRY);
    expect(merged.find((e) => e.predicate === 'for-customer')?.target).toBe('cust:1'); // survived
    expect(merged.find((e) => e.predicate === 'for-car')?.target).toBe('car:B'); // replaced
  });
});

describe('projection — a superseding domain_event replaces a `one` edge, keeps foreign edges', () => {
  it('two acts on the same source_ref: for-car replaced, for-customer (other act) preserved', () => {
    // act A: order with for-customer only. act B (supersede): for-car v1. act C (supersede): for-car v2.
    const acts: Act[] = [
      domainEvent('a', 'order:1', 'h1', [{ predicate: 'for-customer', target: 'cust:1' }], { type: 'order', total: 100 }),
      domainEvent('b', 'order:1', 'h2', [{ predicate: 'for-car', target: 'car:A' }], { type: 'order', total: 100 }),
      domainEvent('c', 'order:1', 'h3', [{ predicate: 'for-car', target: 'car:B' }], { type: 'order', total: 100 }),
    ];
    const node = project(acts, DEFAULT_PREDICATES).get('order:1')!;
    const forCar = node.edges!.filter((e) => e.predicate === 'for-car');
    expect(forCar).toHaveLength(1); // NOT accumulated (the bug); replaced
    expect(forCar[0]!.target).toBe('car:B');
    expect(node.edges!.find((e) => e.predicate === 'for-customer')?.target).toBe('cust:1'); // foreign edge kept
  });

  it('end-to-end through the Engine: supersede does not duplicate a `one` edge', () => {
    const store = new MemoryStore([MIN_CONSTITUTION]);
    const engine = new Engine(store, FIXED_POLICY);
    engine.write(domainEvent('p1', 'order:9', 'h1', [{ predicate: 'drives', target: 'car:X' }], { type: 'order', total: 1 }));
    engine.write(domainEvent('p2', 'order:9', 'h2', [{ predicate: 'drives', target: 'car:Y' }], { type: 'order', total: 2 }));
    const node = store.load().find((n) => n.id === 'order:9')!;
    expect(node.edges!.filter((e) => e.predicate === 'drives')).toHaveLength(1);
    expect(node.edges![0]!.target).toBe('car:Y');
  });
});
