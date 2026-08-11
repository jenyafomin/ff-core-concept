/**
 * second-form-spine.test — S3 proof: memory grows a 2nd structural form (`time-on-edge`) WITHOUT a
 * migration, folded through the IDENTICAL reducer (`project` / `foldEdges`) used by form-1.
 *
 * The 2nd form is structurally different: its edges carry a time interval on the already-reserved
 * `validFrom`/`validTo` fields (types.ts:38-41) — ZERO type-delta on `Edge`/`Act`. Growth is a tenant
 * registry-DATA insert (`drives: 'many'`) plus a read lens; the fold spine is untouched.
 *
 * The load-bearing proof lives at the FOLD RESIDUAL (write-side), NOT a read lens (abstract-thinker):
 * a mutant that makes `foldEdges` value-AWARE (drops the reserved interval fields) must go RED, while
 * identity/version/topology stay GREEN — targeted, not a blanket breakage (anti-tautology, GATE-2).
 *
 * Contains, alongside the positive spine test:
 *  - own-C tooth (Q-S3-C-tooth): a genuine erasable by-ref referent (buildErasedAct succeeds + witness
 *    non-reversible) vs a payload-less structural edge (throws) — proving C is a genuine own axis, not
 *    degenerate to I+S. Mutant M2 (remove witness guard) turns the "throws" case RED.
 *  - monument-attribution probe (ADR-0009 ③ / Law-2 exception): an `erased` monument carrying an
 *    erasable requester-name must NOT project — mutant M3 (admit 'erased' to isProjectable) reifies the
 *    requester-name into the identity node → RED.
 *
 * Grounding: predicates.ts:98-119 (foldEdges, value-blind {...edge}) · projection.ts:42,84 · erasure.ts:85-138.
 */
import { describe, it, expect } from 'vitest';
import {
  project,
  isProjectable,
  buildErasedAct,
  isErasureVerifiable,
  isWitnessNonReversible,
  type Act,
  type Edge,
  type PredicateRegistry,
} from '../src/index.js';

// `drives` is a NEW predicate (no pre-folded history) registered `'many'` as tenant DATA — so the two
// distinct-target holdings ACCUMULATE (growth), not re-fold existing history. Zero @ff/engine edit.
const REG: PredicateRegistry = { drives: 'many' };

/** A `time-on-edge` domain_event: the edge carries a validFrom/validTo interval (the 2nd form). */
function timeEdgeEvent(
  id: string,
  source_ref: string,
  snapshotHash: string,
  edge: Edge,
  payload: Record<string, unknown> = { type: 'person' },
): Act {
  return { id, actor: 'sync:test', provenance: { source_ref, snapshotHash }, recordedAt: '', actKind: 'domain_event', edges: [edge], payload };
}

describe('S3 — 2nd structural form `time-on-edge` folds through the UNCHANGED reducer (grows without migration)', () => {
  // Three domain_events on ONE source_ref (person:masha). A3 is a CORRECTION of A1's stint (same
  // pred+target, fixed end-date) → refresh-in-place; A2 is a genuine second coexisting fact (distinct
  // target) → accumulate. The reducer is called with NO migration step.
  const A1 = timeEdgeEvent('a1', 'person:masha', 'h1', { predicate: 'drives', target: 'car:X', validFrom: '2026-01-01', validTo: '2026-01-10' });
  const A2 = timeEdgeEvent('a2', 'person:masha', 'h2', { predicate: 'drives', target: 'car:Y', validFrom: '2026-02-01', validTo: '2026-02-10' });
  const A3 = timeEdgeEvent('a3', 'person:masha', 'h3', { predicate: 'drives', target: 'car:X', validFrom: '2026-01-01', validTo: '2026-01-15' });

  const node = project([A1, A2, A3], REG).get('person:masha')!;
  const drives = node.edges!.filter((e) => e.predicate === 'drives');
  const carX = drives.find((e) => e.target === 'car:X')!;
  const carY = drives.find((e) => e.target === 'car:Y')!;

  it('1 — identity survives folding the new form', () => {
    expect(node.id).toBe('person:masha'); // GREEN under M1 (targeted, not blanket)
  });

  it('2 — state axis alive (3 acts folded)', () => {
    expect(node.state!.version).toBe(3); // GREEN under M1
  });

  it('3 — topology preserved: 2 distinct `drives` edges (A3 refreshed car:X, did NOT duplicate)', () => {
    expect(drives).toHaveLength(2); // GREEN under M1 — count is value-blind either way
  });

  // Assertions 4-5 are the TOOTH: the interval VALUES only survive because foldEdges copies reserved
  // fields blind (`{...edge}`). Strip that copy (mutant M1 at predicates.ts:110/114/115) ⇒ these go RED.
  it('4 — interval residual rides through the REFRESH (correction arm, :114): car:X = [Jan01..Jan15]', () => {
    expect(carX.validTo).toBe('2026-01-15'); // A3 correction won
    expect(carX.validFrom).toBe('2026-01-01'); // RED under M1
  });

  it('5 — interval residual rides through the FIRST-INSERT (accumulate arm, :115): car:Y = [Feb01..Feb10]', () => {
    expect(carY.validFrom).toBe('2026-02-01');
    expect(carY.validTo).toBe('2026-02-10'); // RED under M1 (critic fix: :115 must be mutated too)
  });

  // Explicit NON-claim (Q-S3-fixture-noreify / F6): two DISJOINT stints on the SAME (drives, car:X)
  // (e.g. Jan + Mar) do NOT both survive today — the dedup key is (predicate,target) only, so they
  // collapse to one edge (freshest-wins). Asserting their survival here would be RED on real code. This
  // is the open F6 fork requiring an opaque edgeId (UNIT-SPEC §4(d)). Named, not hidden.
  it.todo('F6 (OPEN): two disjoint stints on the SAME (drives,car:X) both survive — needs opaque edgeId');
});

describe('S3 — 2nd form through the `one`-cardinality REPLACE branch: interval residual rides the :110 push (Wave-4 harden)', () => {
  // The spine block above only exercises `many` (ACCUMULATE arms :114/:115). This block closes the
  // uncaught site flagged by Wave-3 independent review: the REPLACE branch (predicates.ts:105-110).
  //
  // A `one`-cardinality time-on-edge — a person holds at most ONE `current-lease`, and that edge carries
  // a validFrom/validTo interval (the 2nd form). Superseding the lease to a new car fires REPLACE: the
  // prior edge is spliced out and the freshest edge is PUSHED at :110. The interval VALUES survive that
  // push ONLY because it copies the edge blind (`{...edge}`). Stripping the reserved fields at :110 alone
  // (`result.push({ predicate: edge.predicate, target: edge.target })`) turns the interval assertion RED
  // while target/topology stay GREEN — targeted, not blanket (anti-tautology, GATE-2).
  const REG_ONE: PredicateRegistry = { 'current-lease': 'one' };

  // Two domain_events on ONE source_ref (person:lena). B2 supersedes B1's lease to a different car →
  // REPLACE (drop car:X, push car:Y at :110). Real project()/foldEdges, no mock; residual non-empty.
  const B1 = timeEdgeEvent('b1', 'person:lena', 'hb1', { predicate: 'current-lease', target: 'car:X', validFrom: '2026-01-01', validTo: '2026-01-10' });
  const B2 = timeEdgeEvent('b2', 'person:lena', 'hb2', { predicate: 'current-lease', target: 'car:Y', validFrom: '2026-02-01', validTo: '2026-02-10' });

  const node = project([B1, B2], REG_ONE).get('person:lena')!;
  const leases = node.edges!.filter((e) => e.predicate === 'current-lease');
  const lease = leases[0]!;

  it('REPLACE topology: exactly ONE `current-lease` edge, superseded to car:Y (value-blind — GREEN under :110 strip)', () => {
    expect(leases).toHaveLength(1); // `one` REPLACE, no stale dup
    expect(lease.target).toBe('car:Y'); // freshest target — kept even if reserved fields are stripped at :110
  });

  it('interval residual rides through the REPLACE push (:110): current-lease = [Feb01..Feb10] (RED under :110-only strip)', () => {
    expect(lease.validFrom).toBe('2026-02-01'); // RED if :110 stops copying reserved fields
    expect(lease.validTo).toBe('2026-02-10'); // RED under the :110-only mutation
  });
});

describe('S3 — own-C tooth (Q-S3-C-tooth): consent/erasure is a GENUINE own axis, not degenerate to I+S', () => {
  // own-C = YES: a time-on-edge holding whose referent PII travels BY-REF with a salted witness.
  const A3erasable: Act = {
    id: 'a3e',
    actor: 'sync:test',
    provenance: { source_ref: 'person:masha', snapshotHash: 'h3e' },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [{ predicate: 'drives', target: 'car:X', validFrom: '2026-01-01', validTo: '2026-01-15' }],
    payloadRef: 'blob:masha-license-4100',
    payloadHash: 'sha256:deadbeefsalted',
    hashScheme: 'salted-sha256-v1', // ADR-0009 ① — salt co-shredded ⇒ witness non-reversible
  };

  // own-C = NO: a pure structural `drives` edge, no payloadRef — consent has nothing to act on.
  const Astruct: Act = timeEdgeEvent('astruct', 'person:masha', 'hs', { predicate: 'drives', target: 'car:Z', validFrom: '2026-03-01', validTo: '2026-03-10' });

  it('own-C=yes reachable — buildErasedAct succeeds, witness retained + non-reversible', () => {
    const monument = buildErasedAct(A3erasable, { actor: 'agent:ff', id: 'act:erase-1' });
    expect(monument.actKind).toBe('erased');
    expect(monument.edges).toEqual([{ predicate: 'erases', target: 'a3e' }]);
    expect(monument.payloadHash).toBe('sha256:deadbeefsalted'); // witness retained
    expect(monument.hashScheme).toBe('salted-sha256-v1');
    expect(isErasureVerifiable(A3erasable)).toBe(true);
    expect(isWitnessNonReversible(A3erasable)).toBe(true);
  });

  it('own-C=no (degenerate) — buildErasedAct THROWS on a witness-less structural edge (M2 turns this RED)', () => {
    // If C degenerated to I+S, this structural act would behave like the erasable one. It does not:
    // the witness guard (erasure.ts:118) refuses — proving C is a genuine own axis with teeth.
    expect(() => buildErasedAct(Astruct, { actor: 'agent:ff', id: 'act:erase-2' })).toThrow();
  });
});

describe('S3 — monument-attribution probe (ADR-0009 ③ / Law-2 exception): the erased monument is a RESERVED facet, not a relation-with-identity', () => {
  const A1 = timeEdgeEvent('a1', 'person:masha', 'h1', { predicate: 'drives', target: 'car:X', validFrom: '2026-01-01', validTo: '2026-01-10' });
  const A2 = timeEdgeEvent('a2', 'person:masha', 'h2', { predicate: 'drives', target: 'car:Y', validFrom: '2026-02-01', validTo: '2026-02-10' });
  const A3erasable: Act = {
    id: 'a3e',
    actor: 'sync:test',
    provenance: { source_ref: 'person:masha', snapshotHash: 'h3e' },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [{ predicate: 'drives', target: 'car:X', validFrom: '2026-01-01', validTo: '2026-01-15' }],
    payloadRef: 'blob:masha-license-4100',
    payloadHash: 'sha256:deadbeefsalted',
    hashScheme: 'salted-sha256-v1',
  };

  const REQUESTER = 'R. Renter (GDPR requester)';
  // buildErasedAct emits NO payload of its own (erasure.ts:127-137). To make the grep-clean assertion
  // NON-vacuous (critic fix), we LITERALLY attach an erasable requester-name (facet ③) to the monument
  // before probing. Its source_ref is the target's own (`person:masha`) — so IF the monument were made
  // projectable, this GDPR-class personal fact would reify straight into Masha's canonical identity.
  const monument = buildErasedAct(A3erasable, { actor: 'agent:ff', id: 'act:erase-1' });
  const monumentWithAttribution: Act = { ...monument, payload: { requesterName: REQUESTER } };

  it('crux — an `erased` monument (even carrying a requester-name) is NOT projectable (M3 turns this RED)', () => {
    expect(isProjectable(monumentWithAttribution)).toBe(false); // erased ≠ domain_event (projection.ts:42)
  });

  it('no reify — folding the monument does NOT bump the identity node version', () => {
    const node = project([A1, A2, A3erasable, monumentWithAttribution], REG).get('person:masha')!;
    expect(node.state!.version).toBe(3); // monument skipped by foldInto; 4 under M3 → RED
  });

  it('grep-clean — the requester-name string appears in 0 projected node bodies (ADR-0009 Validation §5)', () => {
    const graph = project([A1, A2, A3erasable, monumentWithAttribution], REG);
    const leaked = [...graph.values()].filter((n) => JSON.stringify(n.body ?? {}).includes(REQUESTER));
    expect(leaked).toHaveLength(0); // real data attached ⇒ under M3 requesterName reifies into body → RED
  });
});
