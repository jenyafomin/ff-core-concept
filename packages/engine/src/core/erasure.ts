/**
 * erasure — the V7 (Согласие / consent) right-to-erasure SEAM. Shape-level only; NOT the feature.
 *
 * WHY NOW (the critic's Risk 1, seal-vs-values-review §3): the durable journal is append-only, so if the
 * erasable payload lived INLINE and entangled with the immutable act meta, a future hard-erase would force
 * either rewriting the append-only log (breaking its own contract) or a costly indirection layer that had
 * to be laid BEFORE the first durable write. V7's own card marks hard-erase "заложить СЕЙЧАС — ретрофит
 * невозможен". This module lays the cheap, reversible part of that seam TODAY: it NAMES and locks (by test)
 * the boundary between an act's IMMUTABLE audit meta and its ERASABLE payload zone, so a later hard-erase
 * can strip/shred payload without ever touching the audit trail.
 *
 * It deliberately does NOT decide WHERE erasable payload physically lives (out-of-journal blob vs inline)
 * — that is the genuinely irreversible owner call (recorded in docs/_inbox/), flagged CRITICAL by the
 * critic. What is safe and additive now: the pure split/redact functions below, which perturb no frozen
 * type and no adapter, and prove the two zones are separable.
 */
import type { Act } from './types.js';

/**
 * The act fields that are IMMUTABLE audit meta — never erasable, always retained through a hard-erase so
 * the log stays auditable ("this act happened, by whom, when, of what kind"). `payloadHash` is meta on
 * purpose: it is the cryptographic WITNESS of what the (now-erased) payload was, so erasure stays
 * VERIFIABLE without retaining the content. The erasable zone is exactly `payload` (everything else here).
 */
export const IMMUTABLE_ACT_META = [
  'id',
  'actor',
  'provenance',
  'recordedAt',
  'actKind',
  'edges',
  'payloadRef',
  'payloadHash',
] as const;

/** An act cleaved into its immutable audit meta and its (erasable) payload zone. */
export interface ActSplit {
  /** Never erasable — the audit trail that survives a hard-erase byte-for-byte. */
  meta: Omit<Act, 'payload'>;
  /** The erasable payload zone (what a future hard-erase removes). `undefined` if the act carried none. */
  erasable: unknown | undefined;
}

/**
 * Split an act into (immutable meta, erasable payload). Pure, lossless: `{ ...meta, payload: erasable }`
 * reconstructs the original act exactly (proven by test) — which is precisely what "separable zones" means.
 */
export function splitAct(act: Act): ActSplit {
  const { payload, ...meta } = act;
  return { meta, erasable: payload };
}

/**
 * The journal shape a hard-erase WOULD leave: the immutable meta with the erasable `payload` removed,
 * `payloadRef`/`payloadHash` retained (the blob at the ref is shredded separately; the hash remains as the
 * verifiable witness). Pure — returns a new act, never mutates. This is the SHAPE of an erased-but-audited
 * act; HOW it is applied to a durable log (rewrite-line vs external-blob-shred) is the deferred owner fork.
 */
export function redactAct(act: Act): Act {
  const { payload: _payload, ...meta } = act;
  return meta as Act;
}

/**
 * Whether erasing this act would leave a cryptographic witness of what was removed. True only when the
 * payload traveled BY REFERENCE (`payloadRef` + `payloadHash`): then shredding the blob still lets an
 * auditor verify the erasure against the retained hash. Inline payload has no such witness — which is the
 * concrete reason the seam recommends erasable content travel by-ref (the deferred owner decision).
 */
export function isErasureVerifiable(act: Act): boolean {
  return act.payloadRef !== undefined && typeof act.payloadHash === 'string' && act.payloadHash !== '';
}
