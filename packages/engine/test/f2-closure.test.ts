/**
 * f2-closure.test — the three closures of ARCH-F2-closure.design.md, driven by the wave2 critic attacks:
 *
 *   C1 (consent-by-ref) — the edge `subjectRole.consent` shape has NO free-form slot; consent PII travels
 *      ONLY via `evidenceRef`+`evidenceHash`. An attempt to inline raw PII (an object with name/phone) into
 *      `evidenceRef` instead of a string ref is REFUSED by the admission-gate (R-G3.5). This test is
 *      designed to FAIL if any inline-content slot for consent PII exists.
 *
 *   C2 (role-dedup) — `SubjectRoleAssurance` carries NO `role` field; the sole home of an edge's role is
 *      `Edge.predicate`. Enforced structurally by the type (see the compile-only note below); typecheck is
 *      the gate.
 *
 *   C3 (owner/referent kernel-lock) — `owner` is kernel-locked to `'one'` and `referent` to `'many'`,
 *      un-overridable by any tenant registry. Two owner-reassignment acts fold to EXACTLY ONE owner edge
 *      (replace, not accumulate) even when the registry declares `owner:'many'`.
 *
 * See docs/_log/2026-08-13-metric-and-minimal-slice/wave3-route/TASK-F2-build.task.md.
 */
import { describe, it, expect } from 'vitest';
import {
  admit,
  foldEdges,
  cardinalityOf,
  LOCKED_PREDICATES,
  type Act,
  type Edge,
  type PredicateRegistry,
  type ConsentAssurance,
  type SubjectRoleAssurance,
} from '../src/index.js';

const base = {
  id: 'act:1',
  actor: 'agent:crm',
  provenance: 'ingest',
  recordedAt: '2026-08-13T00:00:00Z',
  actKind: 'domain_event' as const,
  edges: [],
};

// ── C1: consent PII is by-ref only — no inline channel survives admission ──────────────────────────
describe('C1 (exploit) — consent PII cannot be inlined; only a by-ref witness passes', () => {
  it('PASSES a subjectRole whose consent uses a STRING evidenceRef (the by-ref witness rail)', () => {
    const consent: ConsentAssurance = {
      status: 'granted',
      asOf: '2026-08-13',
      basis: 'policy:consent-v1',
      evidenceRef: 'blob:consent-000123456789', // long numeric ref must NOT false-trip the phone heuristic
      evidenceHash: 'sha256:deadbeef',
      hashScheme: 'salted-sha256-v1',
    };
    const act: Act = { ...base, edges: [{ predicate: 'owner', target: 'user:jenya', subjectRole: { consent } }] };
    expect(admit(act).ok).toBe(true);
  });

  it('EXPLOIT — inlining a raw PII object into evidenceRef (instead of a string ref) is REFUSED', () => {
    // The type says `evidenceRef?: string`; the attacker reaches for `as any` to smuggle an inline object.
    // If ANY inline-content slot for consent PII existed, this act would slip past the gate — it must not.
    const evilConsent = {
      status: 'granted',
      evidenceRef: { name: 'Ali Hassan', phone: '+971501234567' }, // raw PII, not a ref
    } as unknown as ConsentAssurance;
    const act: Act = { ...base, edges: [{ predicate: 'owner', target: 'user:jenya', subjectRole: { consent: evilConsent } }] };
    const verdict = admit(act);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/edges\[0\]\.subjectRole|inline PII|channel/i);
  });

  it('EXPLOIT (C1 string-channel) — raw PII string in evidenceRef (not a well-formed ref) is REFUSED', () => {
    // A string smuggled into the by-ref slot must NOT get a blanket pass just for being a string.
    // An email-like value is inline content abusing the ref rail → fail-closed.
    const evil = { status: 'granted', evidenceRef: 'ali.hassan@example.com' } as unknown as ConsentAssurance;
    const act: Act = { ...base, edges: [{ predicate: 'owner', target: 'user:x', subjectRole: { consent: evil } }] };
    const verdict = admit(act);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/consent\.evidenceRef|inline PII|channel|ref/i);
  });

  it('EXPLOIT (C1 string-channel) — raw PII string in evidenceHash (free-form text) is REFUSED', () => {
    const evil = { status: 'granted', evidenceHash: 'contact jenya@example.com for details' } as unknown as ConsentAssurance;
    const act: Act = { ...base, edges: [{ predicate: 'referent', target: 'user:x', subjectRole: { consent: evil } }] };
    const verdict = admit(act);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/consent\.evidenceHash|inline PII|channel|ref/i);
  });

  it('PASSES a well-formed opaque ref pointer (blob:abc-123, no PII) in evidenceRef', () => {
    const consent: ConsentAssurance = { status: 'granted', evidenceRef: 'blob:abc-123', evidenceHash: 'sha256:deadbeef' };
    const act: Act = { ...base, edges: [{ predicate: 'owner', target: 'user:x', subjectRole: { consent } }] };
    expect(admit(act).ok).toBe(true);
  });

  it('EXPLOIT — a phone-like value in a NON-ref consent field (basis) is caught by the heuristic (fail-closed)', () => {
    const evil = { status: 'granted', basis: 'call +971501234567' } as unknown as ConsentAssurance;
    const act: Act = { ...base, edges: [{ predicate: 'referent', target: 'user:x', subjectRole: { consent: evil } }] };
    expect(admit(act).ok).toBe(false);
  });

  it('EXPLOIT — a PII-keyed value anywhere under subjectRole is refused (no free-form escape hatch)', () => {
    const evil = { consent: { status: 'granted' }, customerPhone: '+971501234567' } as unknown as SubjectRoleAssurance;
    const act: Act = { ...base, edges: [{ predicate: 'owner', target: 'user:x', subjectRole: evil }] };
    expect(admit(act).ok).toBe(false);
  });

  it('C2 (compile-only) — SubjectRoleAssurance/ConsentAssurance admit ONLY their declared fields', () => {
    // The single home of the edge's role is Edge.predicate — there is NO `role` field to drift.
    const sr: SubjectRoleAssurance = { consent: { status: 'revoked', asOf: '2026-08-13' } };
    expect(Object.keys(sr)).toEqual(['consent']);
    expect('role' in sr).toBe(false);
    // @ts-expect-error — SubjectRoleAssurance has no `role` field (C2: predicate is the sole role home).
    const _bad: SubjectRoleAssurance = { role: 'owner' };
    void _bad;
    // @ts-expect-error — ConsentAssurance has no free-form/unknown slot (C1: no inline-PII channel).
    const _bad2: ConsentAssurance = { raw: { name: 'x' } };
    void _bad2;
  });
});

// ── C3: owner/referent kernel-lock — replace, don't double; lock beats tenant registry ─────────────
describe('C3 (exploit) — owner is kernel-locked to one (replace), referent to many; un-overridable', () => {
  it('cardinalityOf is un-overridable: owner=one and referent=many even under a hostile registry', () => {
    const hostile: PredicateRegistry = { owner: 'many', referent: 'one' };
    expect(cardinalityOf('owner', hostile)).toBe('one'); // INV-C3.1 — lock beats registry
    expect(cardinalityOf('referent', hostile)).toBe('many'); // INV-C3.2 — lock beats registry
    expect(LOCKED_PREDICATES.owner).toBe('one');
    expect(LOCKED_PREDICATES.referent).toBe('many');
  });

  it('EXPLOIT — two owner reassignments fold to EXACTLY ONE owner edge, even under registry {owner:"many"}', () => {
    const hostile: PredicateRegistry = { owner: 'many' };
    const ownerA: Edge = { predicate: 'owner', target: 'user:alice' };
    const ownerB: Edge = { predicate: 'owner', target: 'user:bob' };
    // Transfer of ownership: A then B on the same subject. Kernel-lock must REPLACE, not accumulate.
    const afterA = foldEdges([], [ownerA], hostile);
    const afterB = foldEdges(afterA, [ownerB], hostile);
    const owners = afterB.filter((e) => e.predicate === 'owner');
    expect(owners).toHaveLength(1); // NOT two owners (the silent hand-over-becomes-co-ownership bug)
    expect(owners[0]!.target).toBe('user:bob'); // the freshest assignment wins
  });

  it('referent accumulates and a registry cannot narrow it to one (no silent drop on replay)', () => {
    const hostile: PredicateRegistry = { referent: 'one' };
    const r1: Edge = { predicate: 'referent', target: 'doc:a' };
    const r2: Edge = { predicate: 'referent', target: 'doc:b' };
    const merged = foldEdges(foldEdges([], [r1], hostile), [r2], hostile);
    const refs = merged.filter((e) => e.predicate === 'referent').map((e) => e.target).sort();
    expect(refs).toEqual(['doc:a', 'doc:b']); // both survive — lock kept it 'many'
  });
});
