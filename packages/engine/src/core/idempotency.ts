/**
 * idempotency — R5: the KERNEL-computed content hash that makes a re-write a no-op (idempotency as core).
 *
 * WHY THIS IS CORE, NOT CALLER-TRUST: `Engine.write`'s dedup previously keyed on `provenance.snapshotHash`,
 * a label the CALLER supplies. Two byte-identical records whose snapshotHash labels differ (or are absent)
 * would BOTH append — a duplicate the append-only log should have swallowed, and a superseding node-version
 * with no real change. R5 moves the idempotency discriminant INTO the kernel: a deterministic SHA-256 over
 * the projection-relevant CONTENT of the act — its natural key (source_ref), its act-kind, and the payload
 * + edges that fold into the graph node. Same content ⇒ same hash ⇒ NO-OP re-write, regardless of act.id,
 * recordedAt, or the caller's snapshotHash label. Genuinely changed content (a real supersede) ⇒ a different
 * hash ⇒ the act appends and the projection takes the freshest.
 *
 * EXCLUDED from the hash (deliberately): `id` (a fresh act id per attempt is not new content), `recordedAt`
 * (engine-assigned wall-clock, differs every write), `actor` (the same fact re-synced is the same fact),
 * and `provenance.snapshotHash` (the very label we are replacing — hashing it would re-admit caller-trust).
 */
import { createHash } from 'node:crypto';
import { sourceRefOf } from './projection.js';
import type { Act } from './types.js';

/** Canonical JSON: object keys sorted recursively so equal content hashes to one byte-string. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
}

/**
 * The kernel idempotency key of an act: a deterministic `sha256:` hash over its content-bearing fields
 * (natural key + act-kind + payload + edges). PURE and stable — two acts with identical content produce
 * the identical key even if their `id` / `recordedAt` / `snapshotHash` / `actor` differ.
 */
export function idempotencyHash(act: Act): string {
  const content = {
    source_ref: sourceRefOf(act),
    actKind: act.actKind,
    payload: act.payload ?? null,
    edges: act.edges ?? [],
  };
  return `sha256:${createHash('sha256').update(canonical(content)).digest('hex')}`;
}
