/**
 * customer-lens.test — red→green over a small hand-built graph (no engine write path involved; this
 * lens is a pure read over an already-projected `Graph`). Proves: (1) it finds a customer's orders+car
 * when reached via M1's real predicate (`rented`), (2) it ALSO finds orders reached via the sibling
 * `for-customer` predicate — the P0 both-ways accommodation documented at the top of customer-lens.ts —
 * (3) it returns cleanly (found:false, empty arrays) for an unknown customer id.
 */
import { describe, it, expect } from 'vitest';
import type { EnvelopeNode, Graph } from '@ff/engine';
import { customerLens } from '../src/lens/customer-lens.js';

function graphOf(nodes: EnvelopeNode[]): Graph {
  return { nodes, byId: new Map(nodes.map((n) => [n.id, n])) };
}

const CUSTOMER_ID = 'sheets:Orders#111-1:customer';
const CAR_ID = 'sheets:Cars#FF-111';

describe('customerLens — orders reached under BOTH predicates (P0 keyspace mismatch)', () => {
  it('finds an order linked via the real M1 predicate `rented`, plus its car', () => {
    const orderNode: EnvelopeNode = {
      id: 'sheets:Orders#111-1',
      type: 'order',
      body: { type: 'order', status: 'Active' },
      edges: [
        { predicate: 'rented', target: CUSTOMER_ID },
        { predicate: 'drives', target: CAR_ID },
      ],
    };
    const customerNode: EnvelopeNode = {
      id: CUSTOMER_ID,
      type: 'customer',
      body: { type: 'customer', hasPhone: true },
      edges: [],
    };
    const carNode: EnvelopeNode = {
      id: CAR_ID,
      type: 'car',
      body: { type: 'car', make: 'Toyota', model: 'Camry' },
      edges: [],
    };

    const result = customerLens(CUSTOMER_ID, graphOf([customerNode, orderNode, carNode]));

    expect(result.found).toBe(true);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.orderId).toBe('sheets:Orders#111-1');
    expect(result.orders[0]?.viaPredicate).toBe('rented');
    expect(result.orders[0]?.car?.carId).toBe(CAR_ID);
    expect(result.orders[0]?.car?.body?.make).toBe('Toyota');
  });

  it('ALSO finds an order linked via the sibling predicate `for-customer` (the P0 fix under test)', () => {
    const orderNode: EnvelopeNode = {
      id: 'sheets:Orders#222-2',
      type: 'order',
      body: { type: 'order', status: 'Completed' },
      edges: [{ predicate: 'for-customer', target: CUSTOMER_ID }],
    };
    const customerNode: EnvelopeNode = {
      id: CUSTOMER_ID,
      type: 'customer',
      body: { type: 'customer', hasPhone: false },
      edges: [],
    };

    const result = customerLens(CUSTOMER_ID, graphOf([customerNode, orderNode]));

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.viaPredicate).toBe('for-customer');
    expect(result.orders[0]?.car).toBeNull(); // no car edge on this order — resolved cleanly, not a crash
  });

  it('unions BOTH predicates when a customer has orders under each (proves the naive-lens P0 is closed)', () => {
    const rentedOrder: EnvelopeNode = {
      id: 'sheets:Orders#111-1',
      type: 'order',
      body: { status: 'Active' },
      edges: [{ predicate: 'rented', target: CUSTOMER_ID }],
    };
    const forCustomerOrder: EnvelopeNode = {
      id: 'sheets:Orders#333-3',
      type: 'order',
      body: { status: 'Completed' },
      edges: [{ predicate: 'for-customer', target: CUSTOMER_ID }],
    };
    const customerNode: EnvelopeNode = { id: CUSTOMER_ID, type: 'customer', body: {}, edges: [] };

    const result = customerLens(CUSTOMER_ID, graphOf([customerNode, rentedOrder, forCustomerOrder]));

    const orderIds = result.orders.map((o) => o.orderId).sort();
    expect(orderIds).toEqual(['sheets:Orders#111-1', 'sheets:Orders#333-3']);
  });
});

describe('customerLens — best-effort fines join', () => {
  it('picks up a fine fact best-effort-joined by car (fined → car edge)', () => {
    const orderNode: EnvelopeNode = {
      id: 'sheets:Orders#111-1',
      type: 'order',
      body: { status: 'Active' },
      edges: [
        { predicate: 'rented', target: CUSTOMER_ID },
        { predicate: 'drives', target: CAR_ID },
      ],
    };
    const customerNode: EnvelopeNode = { id: CUSTOMER_ID, type: 'customer', body: {}, edges: [] };
    const carNode: EnvelopeNode = { id: CAR_ID, type: 'car', body: { make: 'Toyota' }, edges: [] };
    const fineNode: EnvelopeNode = {
      id: 'sheets:Fines#999',
      type: 'fine',
      body: { amount: 250, reason: 'speeding' },
      edges: [{ predicate: 'fined', target: CAR_ID }],
    };

    const result = customerLens(CUSTOMER_ID, graphOf([customerNode, orderNode, carNode, fineNode]));

    expect(result.fines).toHaveLength(1);
    expect(result.fines[0]?.factId).toBe('sheets:Fines#999');
    expect(result.fines[0]?.body?.amount).toBe(250);
  });

  it('returns an empty fines list cleanly when there is nothing to join (no silent crash)', () => {
    const orderNode: EnvelopeNode = {
      id: 'sheets:Orders#111-1',
      type: 'order',
      body: {},
      edges: [{ predicate: 'rented', target: CUSTOMER_ID }],
    };
    const customerNode: EnvelopeNode = { id: CUSTOMER_ID, type: 'customer', body: {}, edges: [] };

    const result = customerLens(CUSTOMER_ID, graphOf([customerNode, orderNode]));

    expect(result.fines).toEqual([]);
  });
});

describe('customerLens — unknown customer', () => {
  it('returns found:false and empty arrays cleanly, not a throw or a silent wrong shape', () => {
    const result = customerLens('sheets:Orders#does-not-exist:customer', graphOf([]));

    expect(result.found).toBe(false);
    expect(result.orders).toEqual([]);
    expect(result.fines).toEqual([]);
  });
});
