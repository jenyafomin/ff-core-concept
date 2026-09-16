/**
 * edge-identity — ADR-0015 (Reserved-Form): the PURE derivation of an edge's identity. It does NOT
 * materialize, does NOT enforce, and does NOT stamp `id` into the journal or the projection — it only
 * computes. Same content-addressed technique as idempotency.ts (createHash + canonical JSON).
 *
 * `id`  = ADDRESS fingerprint: sha256 over the canonical identity-triple { source, predicate, target }.
 *         DELIBERATELY EXCLUDES meta/provenance/subjectRole AND validFrom/validTo — `foldEdges` refreshes
 *         meta in place and matches its `many` slot by (predicate, target) with NO time component
 *         (predicates.ts:110-131). The fingerprint MUST both survive a refresh AND coincide with
 *         `foldEdges`'s dedup key; otherwise a refresh-in-place would drop an edge whose id "looked" valid
 *         (critic patch, 2026-09-15, proven by second-form-spine.test.ts:54-56). Future `stale`/`confidence`
 *         on an edge are likewise OUTSIDE this hash (provenance/annotations), so a refresh never moves `id`.
 * canonical = through-line identity: `canonical_id ?? id` (convention when absent, ADR-0015 D1).
 */
import { createHash } from 'node:crypto';
import type { Edge } from './types.js';

const EDGE_ID_SCHEME = 'edge:sha256:v1'; // FROZEN prefix; changing the scheme = a new prefix (ADR-0015 D1)

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
 * The derived ADDRESS key of an edge. PURE. `sourceNodeId` = the id of the owning node (the act's
 * `source_ref` the edge folds into / `node.id` in the graph) — the edge does not inline its source, so it is
 * passed explicitly. The key is { source, predicate, target } with NO time: it MUST coincide with
 * `foldEdges`'s dedup key (predicates.ts) or a refresh-in-place would lose the edge (critic patch).
 */
export function edgeIdOf(sourceNodeId: string, edge: Edge): string {
  const identity = {
    source: sourceNodeId,
    predicate: edge.predicate,
    target: edge.target,
  };
  return `${EDGE_ID_SCHEME}:${createHash('sha256').update(canonical(identity)).digest('hex')}`;
}

/**
 * The edge's through-line identity: an explicit `canonical_id`, else the derived fingerprint (convention
 * ADR-0015 D1). A historical edge with no `canonical_id` → its `edgeIdOf` is returned (honest: its
 * through-change history was never journaled). NO assignment/transfer behavior lives here — this is pure
 * read of the convention, not the deferred merge/split/inheritance mechanism (ADR-0015 §Reserved-Form).
 */
export function edgeCanonicalIdOf(sourceNodeId: string, edge: Edge): string {
  return edge.canonical_id ?? edgeIdOf(sourceNodeId, edge);
}
