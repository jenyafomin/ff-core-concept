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
  type Act,
  type Edge,
  type PredicateRegistry,
} from '../src/index.js';

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
