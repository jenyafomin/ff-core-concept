/**
 * hash — deterministic content-addressing for the ingest (spec §4 snapshotHash, §5 payloadHash).
 *
 * Both idempotency (same row ⇒ same snapshotHash ⇒ engine dedups) and PII content-addressing (same
 * PII ⇒ same payloadHash ⇒ same file) hinge on ONE property: the hash is a pure, order-stable function
 * of the value. So we canonicalize first (sort object keys recursively) THEN sha256 — a differently
 * key-ordered but value-identical object hashes the same. Arrays keep order (order is meaning).
 *
 * NOTE: hashing PII is safe — a sha256 digest is not itself PII (one-way, not reversible to the phone).
 * The digest may sit on the journal; the raw PII may not (that is the whole point of §5).
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
