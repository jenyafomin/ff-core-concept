/**
 * keys — the D2 namespaced natural keys for the P1 payment vertical.
 *
 * D2: `node.id` stays a natural key (occurrence model, Вариант А — no UUID at P1), BUT the ref is
 * NAMESPACED so different sources never collide:
 *
 *     source_ref = `<sourceId>.<instance>:<Entity>#<key>`
 *
 * Here sourceId=`rentacar`, instance=`onecar` (this one-car slice). Entity ∈ {Payment, Order, Car,
 * Customer}. `key` = the domain natural key (txn id, order ref, plate). The M0/M1 Sheets ingest uses a
 * different namespace (`sheets:...`), so the two sources coexist without clobbering.
 *
 * ⚠️ Admission interaction (same rule as M1 keys): a ref may live ONLY in `provenance` and edge
 * `target` (both UNSCANNED) — never inline in `payload`/edge `meta` (scanned). Numeric-dash ids can trip
 * the phone heuristic; the reducer honours this. keys.ts only produces the strings.
 */

/** The namespace prefix for this source instance: `rentacar.onecar`. */
export const SOURCE_NS = 'rentacar.onecar';

/** Ingest actor (D4): `sync:<sourceId>`. */
export const INGEST_ACTOR = 'sync:rentacar-onecar';

/** Agent-cycle actor (D4). */
export const OBSERVER_ACTOR = 'agent:balance-observer';

function ref(entity: string, key: string): string {
  return `${SOURCE_NS}:${entity}#${key}`;
}

/** `rentacar.onecar:Order#<orderRef>` — the order's stable natural key. */
export function orderRef(orderKey: string): string {
  return ref('Order', orderKey);
}

/** `rentacar.onecar:Payment#<txnId>`. */
export function paymentRef(txnId: string): string {
  return ref('Payment', txnId);
}

/** `rentacar.onecar:Car#<plate>` — the physical car (join point of the payment + rental processes). */
export function carRef(plate: string): string {
  return ref('Car', plate);
}

/**
 * `rentacar.onecar:Customer#<orderKey>` — the customer AS SEEN IN THIS ORDER (occurrence, Вариант А).
 * No cross-order same-as at P1 (that is P4). One customer node per order.
 */
export function customerRef(orderKey: string): string {
  return ref('Customer', orderKey);
}
