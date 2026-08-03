/**
 * erasure-seam.test — V7 right-to-erasure SEAM (shape-level; see core/erasure.ts + seal-vs-values §3 Risk 1).
 *
 * Locks the boundary between an act's IMMUTABLE audit meta and its ERASABLE payload zone, so a future
 * hard-erase can strip payload without ever rewriting the append-only audit trail. This is the cheap,
 * reversible part of the seam; the physical-location decision (blob vs inline) is a deferred owner fork.
 */
import { describe, it, expect } from 'vitest';
import { splitAct, redactAct, isErasureVerifiable, IMMUTABLE_ACT_META, admit, type Act } from '../src/index.js';

const base = {
  id: 'act:1',
  actor: 'agent:crm',
  provenance: { source_ref: 'customer:42', snapshotHash: 'h1' } as const,
  recordedAt: '2026-08-03T00:00:00Z',
  actKind: 'domain_event' as const,
  edges: [{ predicate: 'same-as', target: 'identity:A' }],
};

const inlineAct: Act = { ...base, payload: { type: 'customer', note: 'inline erasable content' } };
const refAct: Act = { ...base, payloadRef: 'blob:order-4100', payloadHash: 'sha256:deadbeef' };

describe('V7 erasure seam — immutable meta ⟂ erasable payload are SEPARABLE', () => {
  it('splitAct is lossless: meta + erasable reconstruct the original act exactly', () => {
    const s = splitAct(inlineAct);
    expect(s.erasable).toEqual(inlineAct.payload);
    expect({ ...s.meta, payload: s.erasable }).toEqual(inlineAct); // round-trip ⇒ zones are truly separable
  });

  it('redactAct preserves EVERY immutable-meta field byte-for-byte and removes only the payload', () => {
    const erased = redactAct(inlineAct);
    for (const k of IMMUTABLE_ACT_META) {
      expect((erased as Record<string, unknown>)[k]).toEqual((inlineAct as Record<string, unknown>)[k]);
    }
    expect('payload' in erased).toBe(false); // the erasable zone is gone; the audit trail is intact
  });
});

describe('V7 erasure seam — erasure of a by-ref act stays VERIFIABLE; inline does not', () => {
  it('a by-ref act keeps its hash witness after redaction (erasure is provable without the content)', () => {
    expect(isErasureVerifiable(refAct)).toBe(true);
    const erased = redactAct(refAct);
    expect(erased.payloadHash).toBe('sha256:deadbeef'); // the witness survives the erase
    expect(erased.payloadRef).toBe('blob:order-4100');
  });

  it('an inline-payload act is NOT verifiably erasable — the seam’s reason to prefer by-ref', () => {
    expect(isErasureVerifiable(inlineAct)).toBe(false);
    const erased = redactAct(inlineAct);
    expect(erased.payloadHash).toBeUndefined(); // no witness ⇒ cannot prove WHAT was erased
  });

  it('a redacted by-ref act is still a valid journal citizen (admission passes it)', () => {
    const erased = redactAct(refAct);
    expect(admit(erased).ok).toBe(true); // an erased act remains admissible: audit stays, content gone
  });
});
