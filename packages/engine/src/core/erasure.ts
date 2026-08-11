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
 * REALITY (2026-08-06): the ga-rentacar path already stores erasable payload BY-REF (payloadRef/payloadHash
 * blob), not inline. `shredPayload` on disk today erases only the INLINE erasable zone; hard-erasing the
 * by-ref blob (where the real PII lives) is an OPEN, load-bearing fork — T-D1b-shred-by-ref-pii — so real
 * PII must NOT enter the store until it closes (dev/test-only fence). What is safe and additive now: the
 * pure split/redact functions below, which perturb no frozen type and no adapter, and prove the two zones
 * are separable.
 */
import type { Act } from './types.js';

/**
 * The act fields that are IMMUTABLE audit meta — never erasable, always retained through a hard-erase so
 * the log stays auditable ("this act happened, by whom, when, of what kind"). `payloadHash` is meta on
 * purpose: it is the cryptographic WITNESS of what the (now-erased) payload was.
 *
 * ⚠ QUALIFIER (corrected 2026-08-07): the witness is only NON-REVERSIBLE — i.e. erasure stays verifiable
 * WITHOUT re-exposing the content — when the hash was SALTED with high-entropy bytes that were CO-SHREDDED
 * with the payload. That is what `hashScheme` records (`salted-sha256-v1`). An UNSALTED hash of low-entropy
 * PII (a phone, a name) is a brute-force confirmation oracle: retaining it would let anyone confirm the
 * "erased" value by hashing candidates. So the witness's safety DEPENDS on `hashScheme` being a salted,
 * co-shredded scheme — a bare-sha256 witness of raw PII is NOT safe to retain. The erasable zone is exactly
 * `payload` (everything else here); for by-ref payloads the content+salt live in the blob, shredded together.
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
  'hashScheme',
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
 *
 * ⚠ STRUCTURAL only: this returns whether a witness EXISTS, NOT whether retaining it is SAFE. A witness is
 * safe to keep after erasure only if `hashScheme` is a salted+co-shredded scheme (see `isWitnessNonReversible`);
 * a bare-unsalted witness of low-entropy PII is a brute-force oracle. "Verifiable" here = "an auditor can
 * check the retained hash", which presumes the salt (the thing that made it non-reversible) is now gone.
 */
export function isErasureVerifiable(act: Act): boolean {
  return act.payloadRef !== undefined && typeof act.payloadHash === 'string' && act.payloadHash !== '';
}

/**
 * Whether the retained `payloadHash` witness is safe to KEEP after erasure — i.e. it will not act as a
 * brute-force confirmation oracle for the erased (possibly low-entropy) content. This is TRUE only when the
 * hash was produced by a salted scheme whose salt was co-shredded with the payload (`salted-sha256-v1`).
 * A missing/plain scheme means the witness is an unsalted digest of raw content ⇒ reversible ⇒ NOT safe.
 * (The kernel does not enumerate schemes; it recognizes the `salted-` family the PayloadStore stamps.)
 */
export function isWitnessNonReversible(act: Act): boolean {
  return typeof act.hashScheme === 'string' && act.hashScheme.startsWith('salted-');
}

/** Predicate an `erased` act uses to point at the act whose payload it retired. */
export const ERASES_PREDICATE = 'erases';

/**
 * Build the terminal `erased` act that CONDUCTS a by-ref erasure (I-4 canon, by-ref separation): it points
 * at the target act, and carries the target's `payloadRef` / `payloadHash` / `hashScheme` forward as the
 * retained WITNESS. It carries NO payload of its own. The append-only journal is NEVER rewritten — the
 * original act stays byte-for-byte; this new act simply records "the payload behind that ref was shredded".
 *
 * SIDE-EFFECT NOT DONE HERE (pure by design): the actual crypto-shred of the blob is `PayloadStore.shred(ref)`,
 * which lives in the ingest layer (the engine has no PayloadStore dependency). The caller performs both:
 * `payloadStore.shred(target.payloadRef)` then `store.writeAct(buildErasedAct(target, …))`. Ordering is the
 * caller's honesty concern (shred first, then record) — see I-4-RESOLUTION.decision.md.
 *
 * @throws if the target has no by-ref witness — there is nothing verifiable to erase (inline payload is the
 *   non-canonical path; use the deprecated inline shred for that dev-only case).
 */
export function buildErasedAct(target: Act, opts: { actor: string; id: string }): Act {
  if (!isErasureVerifiable(target)) {
    throw new Error(
      'buildErasedAct: target has no by-ref payload witness (payloadRef+payloadHash) — nothing verifiable to erase',
    );
  }
  const srcRef =
    target.provenance !== null && typeof target.provenance === 'object'
      ? (target.provenance as { source_ref?: string }).source_ref
      : undefined;
  return {
    id: opts.id,
    actor: opts.actor,
    provenance: { source_ref: srcRef ?? target.id, erases_act: target.id },
    recordedAt: '', // engine-assigned on write
    actKind: 'erased',
    edges: [{ predicate: ERASES_PREDICATE, target: target.id }],
    payloadRef: target.payloadRef,
    payloadHash: target.payloadHash,
    ...(target.hashScheme ? { hashScheme: target.hashScheme } : {}),
  };
}
