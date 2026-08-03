/**
 * predicates — the D1 predicate registry (cardinality as DATA) + the edge-fold it powers.
 *
 * The synthesis (§2) caught the vintage `mergeEdges` bug: dedup by predicate+target does NOT know a
 * predicate's cardinality, so a LEGITIMATE target change copies a stale duplicate instead of replacing.
 * The fix is to declare cardinality FIRST, as data, then fold edges by it:
 *
 *   - `one`  → at most one edge per (subject, predicate). A new target REPLACES the prior edge for that
 *              predicate (a reassigned `one`-relation drops the old edge, keeps the new — no stale dup).
 *   - `many` → additive. Distinct targets accumulate; a repeated (predicate, target) refreshes its
 *              meta/provenance rather than duplicating.
 *
 * In BOTH cases, predicates the incoming act does NOT mention are left untouched — so an act from one
 * actor never wipes another actor's edges on the same node (the T-cardinality "foreign edges" lock).
 *
 * UNREGISTERED predicates default to `many` (non-destructive: an unknown predicate never silently drops
 * a prior edge).
 *
 * ── GAP 2 / G1 (predicates-as-data) ────────────────────────────────────────────────────────────────
 * The kernel ships ZERO domain predicates: `DEFAULT_PREDICATES` is EMPTY. Cardinality is a root ABSTRACTION
 * (the shape `PredicateRegistry = Record<string, Cardinality>` and the fold below), but the CONTENTS —
 * which noun means what — are TENANT vocabulary and live in the tenant's own package (e.g. a rentacar
 * tenant exports its `{ … : 'one' }` registry from `@ff/ingest-rentacar`). Tenants INJECT their registry at
 * the store/reducer seam (`new MemoryStore(nodes, registry)`, `foldInto(proj, act, registry)`). This keeps
 * G2 true: a second, unrelated tenant registers its predicates as DATA, never by editing this file.
 */
import type { Cardinality, Edge, PredicateRegistry } from './types.js';

/**
 * The kernel default registry: EMPTY. The engine knows no domain noun (G1). A caller that folds edges of
 * a given cardinality supplies its own registry; anything unregistered folds as `many` (non-destructive).
 */
export const DEFAULT_PREDICATES: PredicateRegistry = {};

/**
 * GAP 3 (b) — KERNEL-LOCKED structural-identity predicates, cardinality pinned to `'many'`, un-overridable
 * by ANY registry (default or caller-supplied). This is NOT tenant vocabulary (does not break G1): identity
 * resolution is a ROOT concern the engine holds for any content, so these predicates are named in the kernel.
 *
 * `same-as` is the identity-merge predicate: `'many'` means "these candidate identities coexist". A registry
 * silently declaring it `'one'` would make `foldEdges` REPLACE-semantics every prior merge — un-merging
 * identity history on the next `rebuild-from-journal` (mine A-C2, the concrete instance of the general
 * append-only-forward hazard). The lock makes `'many'` an asserted CEILING, not an accident of the
 * unregistered-fallback default — and closes the (a·same-as) replay-collapse by construction.
 *
 * The lock is a CEILING applied at the cardinality lookup (like I-8's clamp-after-fold), never a stack
 * layer: it wins over caller data rather than being one merged input among many.
 */
export const LOCKED_MANY_PREDICATES: ReadonlySet<string> = new Set(['same-as']);

/**
 * Cardinality of a predicate; unregistered ⇒ `many` (non-destructive default). A kernel-locked identity
 * predicate (`LOCKED_MANY_PREDICATES`) ALWAYS folds `many`, ignoring whatever the registry declares — the
 * lock is an identity ceiling, not policy-as-data.
 */
export function cardinalityOf(predicate: string, registry: PredicateRegistry = DEFAULT_PREDICATES): Cardinality {
  if (LOCKED_MANY_PREDICATES.has(predicate)) return 'many'; // lock wins over any registry (identity ceiling)
  return registry[predicate] ?? 'many';
}

/**
 * Fold `incoming` edges into `prev` by the registry's cardinality — the CORRECT `foldInto` edge merge
 * (D1). Pure: returns a fresh array, mutates nothing. Deterministic order (prev order preserved, new
 * targets appended) so an incrementally-built projection is bit-for-bit equal to a rebuild-from-journal.
 */
export function foldEdges(
  prev: readonly Edge[],
  incoming: readonly Edge[],
  registry: PredicateRegistry = DEFAULT_PREDICATES,
): Edge[] {
  const result: Edge[] = prev.map((e) => ({ ...e }));
  for (const edge of incoming) {
    if (cardinalityOf(edge.predicate, registry) === 'one') {
      // REPLACE: drop any existing edge for this predicate, then add the freshest target.
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i]!.predicate === edge.predicate) result.splice(i, 1);
      }
      result.push({ ...edge });
    } else {
      // ACCUMULATE (many): dedupe by (predicate, target); a repeat refreshes meta/provenance in place.
      const idx = result.findIndex((e) => e.predicate === edge.predicate && e.target === edge.target);
      if (idx >= 0) result[idx] = { ...edge };
      else result.push({ ...edge });
    }
  }
  return result;
}
