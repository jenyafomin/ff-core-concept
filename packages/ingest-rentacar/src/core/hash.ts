/**
 * hash — deterministic content-addressing for the ingest (spec §4 snapshotHash, §5 payloadHash).
 *
 * Both idempotency (same row ⇒ same snapshotHash ⇒ engine dedups) and PII content-addressing (same
 * PII ⇒ same payloadHash ⇒ same file) hinge on ONE property: the hash is a pure, order-stable function
 * of the value. So we canonicalize first (sort object keys recursively) THEN sha256 — a differently
 * key-ordered but value-identical object hashes the same. Arrays keep order (order is meaning).
 *
 * ⚠ NOTE (corrected 2026-08-07 — the old "hashing PII is safe" claim was FALSE): a bare sha256 of PII is
 * one-way but NOT one-way-*enough* for low-entropy PII. A phone (~10⁹ candidates) or a name has so little
 * entropy that an attacker holding the digest simply hashes every candidate and matches — the digest is a
 * confirmation ORACLE, fully reversible by brute force. A raw digest is safe to retain as an erasure
 * WITNESS on the journal ONLY when it was SALTED with high-entropy bytes that are CO-SHREDDED with the
 * payload (so after erasure the salt is gone and the brute force can no longer be reproduced). That salting
 * happens at the PayloadStore boundary (see adapters/file-payload-store.ts: `salted-sha256-v1`), NOT here —
 * `hashOf` is the raw digest primitive, used both for the SALTED payload witness AND for the (deliberately
 * unsalted, deterministic) idempotency `snapshotHash`. Do not put an UNSALTED digest of raw PII on the log.
 */
import { createHash } from 'node:crypto';

/** Stable JSON: object keys sorted recursively; arrays preserved; primitives verbatim. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortDeep);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = sortDeep((value as Record<string, unknown>)[key]);
  }
  return out;
}

/** sha256 hex of the canonical form of `value`. Deterministic across runs and key orderings. */
export function hashOf(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}
