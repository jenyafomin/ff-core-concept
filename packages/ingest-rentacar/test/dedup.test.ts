/**
 * dedup.test — M2 slice A gates (specs/04 R1/R2, specs/06 S2/S3/S4):
 *   T1 (candidates) — high/medium/none confidence per the real A1 rows (Kriukovskyi/Kushnerev/Mohammad).
 *   D5 (structural)  — candidates are never projectable acts (no auto-merge path exists).
 *   T2 (reversible)  — confirm → un-merge → re-merge are THREE distinct acts (R-LIGHT-1: distinct
 *                       snapshotHash so the idempotency dedup never swallows a toggle) and the real
 *                       engine actually reflects each toggle in the projected graph.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { Engine, MemoryStore, FIXED_POLICY, type Act, type EnvelopeNode } from '@ff/engine';
import { generateCandidates, type CustomerRecord } from '../src/dedup/candidates.js';
import {
  buildSameAsAct,
  confirmSameAs,
  unmergeSameAs,
  isActiveSameAs,
} from '../src/dedup/same-as-writer.js';

// Engine refuses to START without a policy:constitution ceiling (mirrors ingest.test.ts).
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

function newEngine(): { store: MemoryStore; engine: Engine } {
  const store = new MemoryStore([MIN_CONSTITUTION]);
  return { store, engine: new Engine(store, FIXED_POLICY) };
}

/** Project a bare `customer` node via a real `domain_event` (NOT a base/substrate seed — MemoryStore's
 * `base` and `projection` are separate maps, so a same-as act's edges must fold onto a PROJECTED node
 * with the same source_ref, or `store.load()` returns two distinct entries for that id). */
function seedCustomer(engine: Engine, sourceRef: string): void {
  const ack = engine.write({
    id: `act:seed:${sourceRef}`,
    actor: 'test:seed',
    provenance: { source_ref: sourceRef, snapshotHash: `seed:${sourceRef}` },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload: { type: 'customer' },
  });
  expect(ack.ok).toBe(true);
}

// ── real rows, from specs/04 §5 / A1 ──────────────────────────────────────────────────────────────
const KRIUKOVSKYI: CustomerRecord[] = [
  { sourceRef: 'sheets:Orders#45638-2856:customer', name: 'Kriukovskyi Oleksii', phone: '380674842880' },
  { sourceRef: 'sheets:Orders#45618-2854:customer', name: 'Kriukovskyi Oleksii', phone: '380674842880' },
  { sourceRef: 'sheets:Orders#45570-2852:customer', name: 'Oleksii Kriukovskyi', phone: '380674842880' }, // reorder
];
const KUSHNEREV: CustomerRecord[] = [
  { sourceRef: 'sheets:Orders#45731-2861:customer', name: 'Kushnerev Vladislav', phone: '79263869765' },
  { sourceRef: 'sheets:Orders#45456-2849:customer', name: 'Vladislav Kushnerev', phone: '79263869765' }, // reorder
];
const MOHAMMAD_VS_MOHAMED: CustomerRecord[] = [
  { sourceRef: 'transactions:row12:customer', name: 'MOHAMMAD IBRAHIM KHAN SHARIF KHAN', phone: '971559998877' },
  { sourceRef: 'unpaid:row34:customer', name: 'Mohamed Aziz Rebai', phone: '971521112233' },
];

describe('S2 — generateCandidates: high/medium/none confidence (R1, AC1/AC2/AC3)', () => {
  it('Kriukovskyi ×3 (same phone+name, name reordered) → 3 pairwise HIGH candidates (AC1)', () => {
    const candidates = generateCandidates(KRIUKOVSKYI);
    expect(candidates).toHaveLength(3); // C(3,2)
    for (const c of candidates) {
      expect(c.confidence).toBe('high');
      expect(c.provenance).toBe('phone+name');
    }
  });

  it('Kushnerev ×2 (same phone+name, name reordered) → 1 HIGH candidate (AC1)', () => {
    const candidates = generateCandidates(KUSHNEREV);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ confidence: 'high', provenance: 'phone+name' });
  });

  it('Mohammad vs Mohamed (transliteration near-match, DIFFERENT phones) → NO candidate (AC2)', () => {
    const candidates = generateCandidates(MOHAMMAD_VS_MOHAMED);
    expect(candidates).toHaveLength(0); // name_norm deliberately does not fuzzy-match transliteration
  });

  it('same phone, DIFFERENT names → MEDIUM/phone (AC3 design hypothesis)', () => {
    const candidates = generateCandidates([
      { sourceRef: 'a:customer', name: 'Ahmed Hassan', phone: '971501234567' },
      { sourceRef: 'b:customer', name: 'Someone Else', phone: '971501234567' },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ confidence: 'medium', provenance: 'phone' });
  });

  it('same name, EMPTY/absent phone (Armen Llchlyan-style row) → MEDIUM/name, never HIGH (AC3/F4)', () => {
    const candidates = generateCandidates([
      { sourceRef: 'c:customer', name: 'Armen Llchlyan', phone: undefined },
      { sourceRef: 'd:customer', name: 'Armen Llchlyan', phone: undefined },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ confidence: 'medium', provenance: 'name' });
  });
});

describe('D5 — candidates are non-projectable BY CONSTRUCTION (never auto-written)', () => {
  it('a candidate has no actKind/edges — it cannot be handed to engine.write as-is', () => {
    const [candidate] = generateCandidates(KUSHNEREV);
    expect(candidate).toBeDefined();
    expect(candidate).not.toHaveProperty('actKind');
    expect(candidate).not.toHaveProperty('edges');
    expect(candidate).not.toHaveProperty('payload');
  });

  it('candidates never appear as active same-as edges without a SEPARATE manual confirm act', () => {
    const refs = KUSHNEREV.map((r) => r.sourceRef);
    const { store, engine } = newEngine();
    for (const ref of refs) seedCustomer(engine, ref);
    // generateCandidates ran (see above) but NOTHING was ever written to the engine for it.
    generateCandidates(KUSHNEREV);
    const nodeA = store.load().find((n) => n.id === refs[0]);
    expect(nodeA?.edges ?? []).toHaveLength(0); // no same-as edge exists — candidates never touch the store
  });
});

describe('T2 — S3/S4 reversible confirm / un-merge / re-merge (R2, AC4, R-LIGHT-1)', () => {
  const A = 'sheets:Orders#45731-2861:customer';
  const B = 'sheets:Orders#45456-2849:customer';

  it('confirm and un-merge produce two acts with DISTINCT snapshotHash (R-LIGHT-1)', () => {
    const confirmAct = confirmSameAs({ sourceRef: A, target: B, confidence: 'high', seq: 'seq-1' });
    const unmergeAct = unmergeSameAs({ sourceRef: A, target: B, confidence: 'high', seq: 'seq-2' });
    const hashOf = (a: Act) => (typeof a.provenance === 'object' ? a.provenance.snapshotHash : undefined);

    expect(hashOf(confirmAct)).toBeDefined();
    expect(hashOf(unmergeAct)).toBeDefined();
    expect(hashOf(confirmAct)).not.toBe(hashOf(unmergeAct)); // distinct — un-merge is NOT a no-op dedup
    expect(confirmAct.id).not.toBe(unmergeAct.id);
  });

  it('same seq would collide (guards the R-LIGHT-1 rationale itself)', () => {
    const a = buildSameAsAct({ sourceRef: A, target: B, confidence: 'high', tombstone: false, seq: 'same' });
    const b = buildSameAsAct({ sourceRef: A, target: B, confidence: 'high', tombstone: false, seq: 'same' });
    expect(a.id).toBe(b.id); // identical inputs ⇒ identical hash — proves seq is the discriminator in use
  });

  it('confirm → un-merge → re-merge on a REAL engine: all three toggles apply (none dedup to no-op)', () => {
    const { store, engine } = newEngine();
    seedCustomer(engine, A);
    seedCustomer(engine, B);

    const confirmAck = engine.write(confirmSameAs({ sourceRef: A, target: B, confidence: 'high', seq: 't2-1' }));
    expect(confirmAck.ok).toBe(true);
    expect(confirmAck.dedup).toBeFalsy();
    let nodeA = store.load().find((n) => n.id === A)!;
    expect(nodeA.edges?.some((e) => isActiveSameAs(e) && e.target === B)).toBe(true);

    const unmergeAck = engine.write(unmergeSameAs({ sourceRef: A, target: B, confidence: 'high', seq: 't2-2' }));
    expect(unmergeAck.ok).toBe(true);
    expect(unmergeAck.dedup).toBeFalsy(); // R-LIGHT-1: distinct hash — real toggle, not swallowed
    nodeA = store.load().find((n) => n.id === A)!;
    expect(nodeA.edges?.some((e) => isActiveSameAs(e) && e.target === B)).toBe(false); // tombstoned, not deleted
    expect(nodeA.edges).toHaveLength(1); // replace-in-place: still exactly one same-as edge, tombstoned
    // both nodes intact (LOSE-NOTHING) — neither customer node vanished
    expect(store.load().find((n) => n.id === B)).toBeDefined();

    const remergeAck = engine.write(confirmSameAs({ sourceRef: A, target: B, confidence: 'high', seq: 't2-3' }));
    expect(remergeAck.ok).toBe(true);
    expect(remergeAck.dedup).toBeFalsy(); // the critical R-LIGHT-1 assertion: re-merge is NOT a no-op
    nodeA = store.load().find((n) => n.id === A)!;
    expect(nodeA.edges?.some((e) => isActiveSameAs(e) && e.target === B)).toBe(true); // active again

    // rebuild-from-journal (AC6): same active same-as set after tearing down the projection.
    engine.rebuild('journal');
    const rebuilt = store.load().find((n) => n.id === A)!;
    expect(rebuilt.edges?.some((e) => isActiveSameAs(e) && e.target === B)).toBe(true);
    expect(rebuilt.edges).toHaveLength(1);
  });

  it('a same-as edge carries only label meta — admission never refuses it (R-LIGHT-2)', () => {
    const { engine } = newEngine();
    seedCustomer(engine, A);
    seedCustomer(engine, B);
    const ack = engine.write(confirmSameAs({ sourceRef: A, target: B, confidence: 'medium', seq: 'admission-check' }));
    expect(ack.ok).toBe(true); // no raw PII / phone-shaped string in edge.meta ⇒ admission allows
  });
});
