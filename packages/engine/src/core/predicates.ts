/**
 * predicates — the D1 predicate registry (cardinality as DATA) + the edge-fold it drives.
 *
 * The synthesis (§2) caught the vintage `mergeEdges` bug: dedup by predicate+target does NOT know a
 * predicate's cardinality, so a LEGITIMATE target change (a car re-registered under a new order) copies
 * a stale duplicate instead of replacing. The fix is to declare cardinality FIRST, as data, then fold
 * edges by it:
 *
 *   - `one`  → at most one edge per (subject, predicate). A new target REPLACES the prior edge for that
 *              predicate (car reassigned ⇒ old `for-car` dropped, new one kept — no stale dup).
 *   - `many` → additive. Distinct targets accumulate; a repeated (predicate, target) refreshes its
 *              meta/provenance rather than duplicating.
 *
 * In BOTH cases, predicates the incoming act does NOT mention are left untouched — so an act from one
 * actor never wipes another actor's edges on the same node (the T-cardinality "foreign edges" lock).
 *
 * UNREGISTERED predicates default to `many` (non-destructive: an unknown predicate never silently drops
 * a prior edge). Domain predicates are registered explicitly below so the happy path is exact.
 */
import type { Cardinality, Edge, PredicateRegistry } from './types.js';

/**
 * The default registry. Every predicate a real process has needed so far, with its proven cardinality.
 * Grows by demand (a new process that needs a new edge type registers it here with a real case).
 *  - `rented`        order → customer  (an order has one renter)              · one
 *  - `drives`        order → car       (an order is for one car)              · one
 *  - `paid-against`  payment → order   (a payment settles one order)          · one
 *  - `for-car`       order → car       (P1 payment vertical join)             · one
 *  - `for-customer`  order → customer  (P1 payment vertical, occurrence)      · one
 */
export const DEFAULT_PREDICATES: PredicateRegistry = {
  rented: 'one',
  drives: 'one',
  'paid-against': 'one',
  'for-car': 'one',
  'for-customer': 'one',
};

/** Cardinality of a predicate; unregistered ⇒ `many` (non-destructive default). */
export function cardinalityOf(predicate: string, registry: PredicateRegistry = DEFAULT_PREDICATES): Cardinality {
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
