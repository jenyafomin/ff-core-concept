/**
 * consent-not-enforced — TRIPWIRE (not a feature test). F2-closure reserved the `subjectRole.consent`
 * SHAPE (types.ts, ARCH-F2-closure.design.md §1) but deliberately shipped ZERO enforcement (critic
 * Attack 2). This file documents that fact IN CODE, not just in a comment, so it cannot silently drift:
 *
 *   - it asserts `admit()` does NOT refuse an act whose edge carries `consent.status: 'revoked'` —
 *     the admission-gate only screens for inline PII (R-G3.1/R-G3.5), never for consent state.
 *   - it asserts `Engine.write()` (the write-side PEP, GAP 3(c)) does NOT refuse a `domain_event` that
 *     targets/asserts a `revoked`/`withdrawn`-consent edge — the engine happily acts along it today.
 *
 * These are INVERTED tripwires: they assert today's (non-)behaviour and are written to FAIL the moment
 * someone wires real enforcement (e.g. a future PEP that refuses acts along a non-`granted` edge) — that
 * failure is the intended signal to come back and update the `types.ts` "SCHEMA-ONLY, NOT ENFORCED"
 * doc-comment (and this file) to describe the new, real behaviour instead of deleting the warning.
 */
import { describe, it, expect } from 'vitest';
import {
  admit,
  Engine,
  MemoryStore,
  FIXED_POLICY,
  type Act,
  type ConsentAssurance,
  type EnvelopeNode,
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

const revoked: ConsentAssurance = { status: 'revoked', asOf: '2026-08-13', evidenceRef: 'blob:consent-1' };

describe('TRIPWIRE — consent.status is schema-only; nothing reads it to gate an act (yet)', () => {
  it('admit() does NOT refuse a domain_event carrying a `revoked` consent edge', () => {
    const act: Act = {
      id: 'act:1',
      actor: 'agent:crm',
      provenance: 'ingest',
      recordedAt: '2026-08-13T00:00:00Z',
      actKind: 'domain_event',
      edges: [{ predicate: 'referent', target: 'user:jenya', subjectRole: { consent: revoked } }],
    };
    // If this ever flips to `false`, enforcement has landed — go update types.ts's warning + this file.
    expect(admit(act).ok).toBe(true);
  });

  it('Engine.write() does NOT refuse a projectable act whose edge asserts `revoked`/`withdrawn` consent', () => {
    const engine = new Engine(new MemoryStore([MIN_CONSTITUTION]), FIXED_POLICY);
    const act: Act = {
      id: 'act:2',
      actor: 'agent:crm',
      provenance: { source_ref: 'car:1', snapshotHash: 'h1' },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [{ predicate: 'referent', target: 'user:jenya', subjectRole: { consent: { status: 'withdrawn' } } }],
      payload: { type: 'car' },
    };
    const ack = engine.write(act);
    // Same inversion: a `false` here means someone wired consent-gating into the write PEP — expected,
    // just come update the doc-comment in types.ts (and promote this test out of "tripwire" status).
    expect(ack.ok).toBe(true);
  });
});
