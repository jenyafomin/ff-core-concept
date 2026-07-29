/**
 * balance — the P1 arithmetic ORACLE. Pure over the projected Graph (the read-model), NOT the upstream
 * Transactions rows. Reality carries the right answer: remaining = order.total − Σ(payments paid-against
 * it). Discrepancies are things the arithmetic/physics say cannot be, that the system must RAISE:
 *   - orphan payment  : `paid-against` a target that is not an existing order node.
 *   - overpaid order   : Σ payments > order.total.
 *
 * Uses the engine's computed inverse-edge index (DEC-12) — payments store `paid-against`; "an order's
 * payments" is the inverse, computed, never stored.
 */
import { buildIndex, type Graph } from '@ff/engine';
import { SOURCE_NS } from './core/keys.js';

export interface PaymentView {
  ref: string;
  amount: number;
  orderTarget: string;
}

export interface OrderBalance {
  orderRef: string;
  plate: string | undefined;
  total: number;
  paidSum: number;
  remaining: number;
  payments: PaymentView[];
  discrepancies: string[];
}

const CAR_PREFIX = `${SOURCE_NS}:Car#`;

function numField(v: unknown): number {
  return typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0;
}

/** The order node id joined to a plate (via its `for-car` edge). null if no such order in the graph. */
export function orderIdForPlate(graph: Graph, plate: string): string | null {
  const car = `${CAR_PREFIX}${plate}`;
  const orders = buildIndex(graph).inverseSources(car, 'for-car');
  return orders[0] ?? null;
}

/** Every payment node's view (ref, amount, the order it points at). */
export function payments(graph: Graph): PaymentView[] {
  const out: PaymentView[] = [];
  for (const n of graph.nodes) {
    if (n.type !== 'payment') continue;
    const edge = (n.edges ?? []).find((e) => e.predicate === 'paid-against');
    out.push({ ref: n.id, amount: numField(n.body?.amount), orderTarget: edge?.target ?? '(none)' });
  }
  return out;
}

/** Payments whose `paid-against` target is not an existing order node — a discrepancy to raise. */
export function orphanPayments(graph: Graph): PaymentView[] {
  return payments(graph).filter((p) => {
    const target = graph.byId.get(p.orderTarget);
    return !target || target.type !== 'order';
  });
}

/** Balance for one order node. null if the id is absent / not an order. */
export function computeOrderBalance(graph: Graph, orderNodeId: string): OrderBalance | null {
  const order = graph.byId.get(orderNodeId);
  if (!order || order.type !== 'order') return null;

  const total = numField(order.body?.total);
  const paidPayments = payments(graph).filter((p) => p.orderTarget === orderNodeId);
  const paidSum = paidPayments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - paidSum;

  const forCar = (order.edges ?? []).find((e) => e.predicate === 'for-car')?.target;
  const plate = forCar?.startsWith(CAR_PREFIX) ? forCar.slice(CAR_PREFIX.length) : undefined;

  const discrepancies: string[] = [];
  if (paidSum > total) {
    discrepancies.push(`OVERPAID: Σ payments ${paidSum} exceeds order total ${total} (by ${paidSum - total})`);
  }
  return { orderRef: orderNodeId, plate, total, paidSum, remaining, payments: paidPayments, discrepancies };
}
