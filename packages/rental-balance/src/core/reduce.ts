/**
 * reduce — the P1 payment-vertical write-model reducer: one upstream Row → zero-or-more `domain_event`
 * acts, DETERMINISTICALLY (pure over the row). The runner (`ingest.ts`) is what calls `engine.write`.
 *
 * Two row kinds (two sheets), reusing the M1 machinery (RowSource port, hashOf, admission, projection):
 *  - Orders       → an `order` act (+ its per-occurrence `car` and `customer` acts). Carries the
 *                   for-car / for-customer edges (D1 `one` predicates) and `body.total` (amount to pay).
 *  - Transactions → a `payment` act with a `paid-against` edge (D1 `one`) → the order it settles.
 *
 * Keys are namespaced (D2, keys.ts). Edges carry `provenance` (D3). Broken rows → quarantine (§7 M1).
 * Kept deliberately NON-PII (customer is a code, not a name) — the PII payload-store path is already
 * proven in @ff/ingest-rentacar and is out of P1 scope; the balance arithmetic needs no PII.
 */
import type { Act, Edge } from '@ff/engine';
import { hashOf } from '@ff/ingest-rentacar';
import type { Row } from '@ff/ingest-rentacar';
import { INGEST_ACTOR, OBSERVER_ACTOR, carRef, customerRef, orderRef, paymentRef, SOURCE_NS } from './keys.js';

/**
 * D-extra (readability as DATA, scoped): this domain declares its projected nodes readable by the ONE
 * agent that needs them — `agent:balance-observer` — NOT a wildcard. The projection reads the reserved
 * `readable_by` payload key; anything not declared stays at the engine's default-deny floor (ADR-0004).
 */
const READABLE_BY = [OBSERVER_ACTOR];

/** Reducing a row either yields acts, or quarantines it with a visible reason (§7). */
export type RowResult = { ok: true; acts: Act[] } | { ok: false; quarantine: string };

// ── tolerant cell accessors (upstream columns are dirty; the reducer owns interpretation) ────────
function str(row: Row, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}
function num(row: Row, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}
function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

/**
 * Orders row → order act (+ car + customer). Quarantines a row with no usable Order key.
 */
export function reduceOrderRow(row: Row): RowResult {
  const orderKey = str(row, 'Order', 'Order Ref', 'Order Number');
  if (orderKey === undefined) {
    return { ok: false, quarantine: `Orders row: missing Order key (${JSON.stringify(row)})` };
  }
  const plate = str(row, 'Plate', 'Plate No', 'Plate Number');
  const custCode = str(row, 'Customer Code', 'Customer Ref', 'Customer');
  const total = num(row, 'Total', 'Amount', 'Order Total');
  const status = str(row, 'Status');

  const oRef = orderRef(orderKey);
  const cRef = customerRef(orderKey);
  const vRef = plate ? carRef(plate) : undefined;

  // Edges (D1 one-predicates) carry provenance (D3). Targets are unscanned by admission.
  const orderEdges: Edge[] = [{ predicate: 'for-customer', target: cRef, provenance: INGEST_ACTOR }];
  if (vRef) orderEdges.push({ predicate: 'for-car', target: vRef, provenance: INGEST_ACTOR });

  const orderSnap = hashOf(compact({ orderKey, plate, custCode, total, status }));
  const orderAct: Act = {
    id: `act:order:${orderKey}:${orderSnap.slice(0, 8)}`,
    actor: INGEST_ACTOR,
    provenance: { source_ref: oRef, snapshotHash: orderSnap },
    recordedAt: '',
    actKind: 'domain_event',
    edges: orderEdges,
    payload: compact({ type: 'order', total, status, readable_by: READABLE_BY }),
  };

  const custSnap = hashOf(compact({ orderKey, custCode }));
  const customerAct: Act = {
    id: `act:customer:${orderKey}:${custSnap.slice(0, 8)}`,
    actor: INGEST_ACTOR,
    provenance: { source_ref: cRef, snapshotHash: custSnap },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload: compact({ type: 'customer', customer_code: custCode, readable_by: READABLE_BY }),
  };

  const acts: Act[] = [orderAct, customerAct];
  if (vRef && plate) {
    const carSnap = hashOf(compact({ plate }));
    acts.push({
      id: `act:car:${plate}:${carSnap.slice(0, 8)}`,
      actor: INGEST_ACTOR,
      provenance: { source_ref: vRef, snapshotHash: carSnap },
      recordedAt: '',
      actKind: 'domain_event',
      edges: [],
      payload: { type: 'car', readable_by: READABLE_BY }, // plate lives in the key/id, not inline
    });
  }
  return { ok: true, acts };
}

/**
 * Transactions row → payment act with `paid-against` → order. Quarantines a STRUCTURALLY broken row
 * (missing txn id / order ref / unparseable amount). A payment against a NON-EXISTENT order is NOT a
 * quarantine — it is a valid row whose SEMANTIC discrepancy (orphan) the agent-cycle raises later.
 */
export function reducePaymentRow(row: Row): RowResult {
  const txnId = str(row, 'Txn', 'Transaction', 'Txn Id', 'Payment');
  if (txnId === undefined) return { ok: false, quarantine: `Transactions row: missing Txn id (${JSON.stringify(row)})` };
  const orderKey = str(row, 'Order Ref', 'Order', 'Ref');
  if (orderKey === undefined) return { ok: false, quarantine: `Transactions row ${txnId}: missing Order Ref` };
  const amount = num(row, 'Amount', 'Paid', 'Value');
  if (amount === undefined) return { ok: false, quarantine: `Transactions row ${txnId}: unparseable Amount=${JSON.stringify(row['Amount'])}` };
  const date = str(row, 'Date', 'Paid On');

  const pRef = paymentRef(txnId);
  const snap = hashOf(compact({ txnId, orderKey, amount, date }));
  const paymentAct: Act = {
    id: `act:payment:${txnId}:${snap.slice(0, 8)}`,
    actor: INGEST_ACTOR,
    provenance: { source_ref: pRef, snapshotHash: snap },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [{ predicate: 'paid-against', target: orderRef(orderKey), provenance: INGEST_ACTOR }],
    payload: compact({ type: 'payment', amount, date, order_ref: orderKey, readable_by: READABLE_BY }),
  };
  return { ok: true, acts: [paymentAct] };
}

/** Re-exported for callers that key on the namespace (CLI/agent). */
export { SOURCE_NS };
