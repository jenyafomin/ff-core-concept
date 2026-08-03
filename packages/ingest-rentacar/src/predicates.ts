/**
 * predicates — the ga-rentacar TENANT predicate registry (GAP 2 / G1: predicates-as-data).
 *
 * The engine kernel ships ZERO domain predicates (`@ff/engine` DEFAULT_PREDICATES = {}). Cardinality is a
 * root abstraction; the CONTENTS — which noun is a `one`-relation — are this tenant's vocabulary and live
 * HERE, in the tenant package. A store folds a tenant's edges correctly only when the tenant injects this
 * at construction: `new MemoryStore(nodes, RENTACAR_PREDICATES)`.
 *
 * This is the exact set the ga-rentacar vertical asserts (ingest + rental-balance, which depends on this
 * package). Growth = a registry-data INSERT here, never an edit inside `@ff/engine`.
 *   - `rented`        order → customer  (an order has one renter)         · one
 *   - `drives`        order → car       (an order is for one car)         · one
 *   - `paid-against`  payment → order   (a payment settles one order)     · one
 *   - `for-car`       order → car       (payment vertical join)           · one
 *   - `for-customer`  order → customer  (payment vertical, occurrence)    · one
 */
import type { PredicateRegistry } from '@ff/engine';

export const RENTACAR_PREDICATES: PredicateRegistry = {
  rented: 'one',
  drives: 'one',
  'paid-against': 'one',
  'for-car': 'one',
  'for-customer': 'one',
};
