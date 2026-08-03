/**
 * balance.test — the P1 vertical DoD (BUILD-P1 §DoD), reusing the REAL engine core (@ff/engine:
 * MemoryStore journal+projection, FIXED_POLICY, admission, the D1-fixed projection reducer) and the
 * @ff/ingest-rentacar RowSource port. Gates covered here:
 *   T-ingest · T-agent-loop · T-rebuild · T-quarantine · [OWNER] A1 remaining · [OWNER] A2 discrepancy.
 * (T-cardinality lives in @ff/engine test/cardinality.test.ts — the fix is in the shared reducer.)
 */
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { Engine, MemoryStore, FIXED_POLICY, load, buildIndex, type EnvelopeNode } from '@ff/engine';
import { FixtureRowSource, RENTACAR_PREDICATES } from '@ff/ingest-rentacar';
import {
  MIN_CONSTITUTION,
  runPaymentIngest,
  BalanceObserver,
  computeOrderBalance,
  orderIdForPlate,
  orphanPayments,
  orderRef,
  carRef,
  paymentRef,
  customerRef,
  runCli,
  runVertical,
} from '../src/index.js';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const PLATE = 'DXB-55555';
const ORDER = orderRef('ORD-9001');

function newEngine(): { store: MemoryStore; engine: Engine } {
  const store = new MemoryStore([MIN_CONSTITUTION], RENTACAR_PREDICATES);
  return { store, engine: new Engine(store, FIXED_POLICY) };
}
const domainNodes = (store: MemoryStore) => store.load().filter((n) => n.id !== 'policy:constitution');
const nodeById = (store: MemoryStore, id: string) => store.load().find((n) => n.id === id);

describe('T-ingest — one-car fixture → acts → projection with correct edges', () => {
  it('projects order/customer/car + 3 payments with paid-against / for-car / for-customer edges', () => {
    const { store, engine } = newEngine();
    const summary = runPaymentIngest(engine, new FixtureRowSource(FIXTURES));

    expect(summary.refused).toBe(0);
    expect(summary.emitted).toBe(6); // order + customer + car + 3 payments
    expect(summary.deduped).toBe(0);

    // nodes
    expect(nodeById(store, ORDER)?.type).toBe('order');
    expect(nodeById(store, carRef(PLATE))?.type).toBe('car');
    expect(nodeById(store, customerRef('ORD-9001'))?.type).toBe('customer');
    expect(domainNodes(store)).toHaveLength(6);

    // edges: order → for-car → car, order → for-customer → customer (D1 `one`)
    const order = nodeById(store, ORDER)!;
    expect(order.edges?.find((e) => e.predicate === 'for-car')?.target).toBe(carRef(PLATE));
    expect(order.edges?.find((e) => e.predicate === 'for-customer')?.target).toBe(customerRef('ORD-9001'));
    // D3 provenance rides the edge
    expect(order.edges?.find((e) => e.predicate === 'for-car')?.provenance).toBe('sync:rentacar-onecar');

    // payment → paid-against → order
    const pay = nodeById(store, paymentRef('TXN-1001'))!;
    expect(pay.edges?.find((e) => e.predicate === 'paid-against')?.target).toBe(ORDER);
    expect(pay.body?.amount).toBe(1000);

    // idempotency: a second identical run appends nothing (all dedup) — reuses engine's T1.
    const again = runPaymentIngest(engine, new FixtureRowSource(FIXTURES));
    expect(again.emitted).toBe(0);
    expect(again.deduped).toBe(6);
  });
});

describe('T-quarantine — a structurally broken transaction is quarantined (counted + logged)', () => {
  it('TXN-1004 with a blank Amount produces no node, is counted and logged (not silent)', () => {
    const { store, engine } = newEngine();
    const summary = runPaymentIngest(engine, new FixtureRowSource(FIXTURES));

    expect(summary.quarantined).toBe(1);
    expect(summary.quarantineLog).toHaveLength(1);
    expect(summary.quarantineLog[0]).toMatch(/TXN-1004/);
    expect(summary.quarantineLog[0]).toMatch(/Amount/);
    expect(nodeById(store, paymentRef('TXN-1004'))).toBeUndefined(); // no node for the broken row
  });
});

describe('[OWNER] A1 — the computed remaining is arithmetically correct (verify by hand)', () => {
  it('ORD-9001: total 3000 − Σ(1000+800) = remaining 1200', () => {
    const { store, engine } = newEngine();
    runPaymentIngest(engine, new FixtureRowSource(FIXTURES));
    const graph = load(store.load());

    expect(orderIdForPlate(graph, PLATE)).toBe(ORDER); // plate → order join (via for-car inverse)
    const bal = computeOrderBalance(graph, ORDER)!;
    expect(bal.total).toBe(3000);
    expect(bal.paidSum).toBe(1800); // orphan TXN-1003 (→ ORD-9999) NOT counted toward ORD-9001
    expect(bal.remaining).toBe(1200);
    expect(bal.payments.map((p) => p.ref)).toEqual([paymentRef('TXN-1001'), paymentRef('TXN-1002')]);
  });
});

describe('[OWNER] A2 — the intentional discrepancy is EXPLICITLY raised', () => {
  it('orphan payment TXN-1003 (paid-against a non-existent order) is surfaced, not swallowed', () => {
    const { store, engine } = newEngine();
    runPaymentIngest(engine, new FixtureRowSource(FIXTURES));
    const graph = load(store.load());

    const orphans = orphanPayments(graph);
    expect(orphans).toHaveLength(1);
    expect(orphans[0]!.ref).toBe(paymentRef('TXN-1003'));
    expect(orphans[0]!.amount).toBe(500);
    expect(orphans[0]!.orderTarget).toBe(orderRef('ORD-9999')); // the order we do not have
  });
});

describe('read-scoping (D-extra as data) — domain nodes readable ONLY by agent:balance-observer', () => {
  it('projected order is readable by the observer and DENIED for any other subject (no wildcard)', () => {
    const { store, engine } = newEngine();
    runPaymentIngest(engine, new FixtureRowSource(FIXTURES));
    const graph = load(store.load());
    const order = graph.byId.get(ORDER)!;

    expect(order.visibility).toEqual({ readable_by: ['agent:balance-observer'] }); // scoped, from data
    expect(FIXED_POLICY.resolve('read', 'agent:balance-observer', order, graph)).toBe('allow');
    expect(FIXED_POLICY.resolve('read', 'agent:intruder', order, graph)).toBe('deny');
    expect(FIXED_POLICY.resolve('read', 'user:jenya', order, graph)).toBe('deny');
    // the payment node is scoped the same way
    const pay = graph.byId.get(paymentRef('TXN-1001'))!;
    expect(FIXED_POLICY.resolve('read', 'agent:intruder', pay, graph)).toBe('deny');
  });
});

describe('T-agent-loop — read graph → write observation → survives the session (re-read sees it)', () => {
  it('balance-observer writes a remaining observation; a fresh observer re-reads it from the journal', () => {
    const { store, engine } = newEngine();
    runPaymentIngest(engine, new FixtureRowSource(FIXTURES));

    const observer = new BalanceObserver(engine, store);
    const written = observer.observe();
    const orderObs = written.find((o) => o.subject === 'order' && o.ref === ORDER);
    expect(orderObs?.remaining).toBe(1200);
    expect(written.some((o) => o.subject === 'orphan-payment')).toBe(true);

    // it is on the append-only journal as a non-projectable observation act (canonical state untouched)
    const obsActs = store.acts().filter((a) => a.actKind === 'observation');
    expect(obsActs.length).toBeGreaterThanOrEqual(2); // order + orphan
    expect(domainNodes(store).some((n) => n.type === 'balance-observation')).toBe(false); // did NOT project

    // survives the session: a BRAND-NEW observer over the same store reads it back as context
    const later = new BalanceObserver(engine, store);
    const seen = later.readObservations();
    expect(seen.find((o) => o.subject === 'order' && o.ref === ORDER)?.remaining).toBe(1200);

    // idempotent: observing again with unchanged graph appends no new observation acts
    const before = store.acts().length;
    observer.observe();
    expect(store.acts().length).toBe(before);
  });
});

describe('T-rebuild — rebuild-from-journal is deep-equal to the incremental projection (ADR-0008)', () => {
  it('after ingest + agent observations, drop the projection and rebuild ⇒ identical read-model', () => {
    const { store, engine } = newEngine();
    runPaymentIngest(engine, new FixtureRowSource(FIXTURES));
    new BalanceObserver(engine, store).observe(); // observations ride the log but never project

    const incremental = structuredClone(store.load());
    store.dropProjection();
    expect(store.load()).toEqual([MIN_CONSTITUTION]); // projection torn down

    engine.rebuild('journal');
    expect(store.load()).toEqual(incremental); // 0 loss of knowledge, deterministic
  });
});

describe('CLI — owner-facing surface prints remaining + raised discrepancy (runCli returns 0)', () => {
  it('balance --fixtures <dir> --plate DXB-55555 prints 1200 and the ORPHAN discrepancy', () => {
    const lines: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s: unknown) => {
      lines.push(String(s));
      return true;
    });
    const code = runCli(['balance', '--fixtures', FIXTURES, '--plate', PLATE]);
    spy.mockRestore();

    const printed = lines.join('');
    expect(code).toBe(0);
    expect(printed).toMatch(/REMAINING\s*:\s*1200/);
    expect(printed).toMatch(/ORPHAN/);
    expect(printed).toMatch(/quarantined=1/);
  });

  it('runVertical exposes the same pieces the CLI formats', () => {
    const run = runVertical(FIXTURES);
    expect(run.summary.emitted).toBe(6);
    const graph = load(run.store.load());
    expect(buildIndex(graph).inverseSources(ORDER, 'paid-against')).toHaveLength(2);
  });
});
