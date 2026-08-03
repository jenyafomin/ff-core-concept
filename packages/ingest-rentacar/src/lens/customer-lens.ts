/**
 * customer-lens — M2 read module (spec: docs/03-projects/ga-rentacar/specs/06-m2-build-steps.spec.md
 * §S6, R3 in `04-m2-dedup-and-customer-lens.spec.md`). "What we know about customer X": a PURE read
 * over the already-projected graph. NO writes, NO edits to `packages/engine` or `packages/core` (G1/G2).
 * Traversal uses only the existing engine read primitives (`Graph`, `buildIndex`) — light read-path,
 * per build-steps §0 (traverse on `source_ref`, kernel untouched).
 *
 * ⚑ KNOWN P0 — predicate mismatch (documented per mission, NOT "fixed" on the write side):
 * M1 (`core/reduce.ts::reduceOrderRow`) emits the order→customer edge as `{ predicate: 'rented',
 * target: custRef }`. Separately, `RENTACAR_PREDICATES` (predicates.ts) ALSO registers `for-customer`
 * as an order→customer, one-cardinality predicate — reserved for a payment-vertical writer that has not
 * landed yet (or a future ingest path). These are two different keyspaces for "the same edge shape": a
 * naive lens that only traverses ONE of them silently returns 0 orders for a customer whose orders were
 * written under the other predicate. This lens applies "и-так-и-так" (both-ways) on READ: it unions the
 * inverse-sources of BOTH `rented` and `for-customer` when looking up a customer's orders. This is a
 * read-side accommodation only — it does NOT touch M1's reducer or the predicate registry (that is a
 * write-side owner decision, out of scope here).
 *
 * Same accommodation applies to the order→car edge: M1 emits `drives`; `for-car` is registered for the
 * same shape (payment vertical). The lens checks both when resolving the order's car.
 *
 * Fines/maintenance join (R3, best-effort): M1 does not ingest the FINES/UNPAID sheets yet, so there is
 * no real cross-sheet data to join against today. This lens defines the read shape a future fines
 * ingest can plug into: any node with an edge `{ predicate: 'fined', target: <carId> }` is picked up as
 * a best-effort fine fact for that car (and therefore for the customer who rented it). Until such a
 * writer exists this simply, correctly, returns an empty list — not a crash, not a silent lie.
 */
import type { Edge, EnvelopeNode, Graph } from '@ff/engine';
import { buildIndex } from '@ff/engine';

/** Both keyspaces the write side is known to use for order→customer (see file header, KNOWN P0). */
const CUSTOMER_PREDICATES = ['rented', 'for-customer'] as const;
/** Both keyspaces for order→car (same P0 shape). */
const CAR_PREDICATES = ['drives', 'for-car'] as const;
/** Best-effort fine/maintenance join predicate (forward-compatible; no writer emits this yet). */
const FINE_PREDICATES = ['fined', 'maintenance'] as const;

export interface CustomerLensCar {
  carId: string;
  body?: Record<string, unknown>;
}

export interface CustomerLensFine {
  factId: string;
  predicate: string;
  body?: Record<string, unknown>;
}

export interface CustomerLensOrder {
  orderId: string;
  /** Which predicate the order→customer edge was actually found under (P0 transparency). */
  viaPredicate: (typeof CUSTOMER_PREDICATES)[number];
  body?: Record<string, unknown>;
  car: CustomerLensCar | null;
}

export interface CustomerLensResult {
  customerId: string;
  /** false ⇒ no node with this id exists in the projected graph at all. */
  found: boolean;
  body?: Record<string, unknown>;
  orders: CustomerLensOrder[];
  /** Best-effort; may be empty even for a real customer (no fines ingest yet — see file header). */
  fines: CustomerLensFine[];
}

function edgeTo(node: EnvelopeNode, predicates: readonly string[]): { predicate: string; target: string } | null {
  for (const e of node.edges ?? []) {
    if (predicates.includes(e.predicate)) return { predicate: e.predicate, target: e.target };
  }
  return null;
}

function resolveCar(graph: Graph, orderNode: EnvelopeNode): CustomerLensCar | null {
  const found = edgeTo(orderNode, CAR_PREDICATES);
  if (!found) return null;
  const carNode = graph.byId.get(found.target);
  return { carId: found.target, body: carNode?.body };
}

/** Best-effort fines/maintenance for a car: any node pointing at it via a FINE_PREDICATES edge. */
function resolveFines(graph: Graph, carId: string, index: ReturnType<typeof buildIndex>): CustomerLensFine[] {
  const out: CustomerLensFine[] = [];
  for (const predicate of FINE_PREDICATES) {
    for (const factId of index.inverseSources(carId, predicate)) {
      out.push({ factId, predicate, body: graph.byId.get(factId)?.body });
    }
  }
  return out;
}

/**
 * Pure read: "what we know about customer X". `customerId` is the customer node's `source_ref`
 * (e.g. `sheets:Orders#45832-2865:customer`, per-occurrence — M2 same-as/cluster dedup is NOT in
 * scope here; this lens reads a single customer node's directly-reachable orders/car/fines).
 */
export function customerLens(customerId: string, graph: Graph): CustomerLensResult {
  const customerNode = graph.byId.get(customerId);
  if (!customerNode) {
    return { customerId, found: false, orders: [], fines: [] };
  }

  const index = buildIndex(graph);

  const orders: CustomerLensOrder[] = [];
  const seenOrderIds = new Set<string>();
  for (const predicate of CUSTOMER_PREDICATES) {
    for (const orderId of index.inverseSources(customerId, predicate)) {
      if (seenOrderIds.has(orderId)) continue;
      seenOrderIds.add(orderId);
      const orderNode = graph.byId.get(orderId);
      orders.push({
        orderId,
        viaPredicate: predicate,
        body: orderNode?.body,
        car: orderNode ? resolveCar(graph, orderNode) : null,
      });
    }
  }

  const fines: CustomerLensFine[] = [];
  for (const order of orders) {
    if (order.car) fines.push(...resolveFines(graph, order.car.carId, index));
  }

  return { customerId, found: true, body: customerNode.body, orders, fines };
}

// Re-exported for tests that want to hand-build edges without importing @ff/engine's Edge type twice.
export type { Edge };
