#!/usr/bin/env node
/**
 * CLI — the owner-facing surface (BUILD-P1 §5). By plate it prints, for a human to verify by eye:
 * the order (total), its payments, the computed remaining, the agent's observation, and any EXPLICITLY
 * raised discrepancy. This is the ONLY module here that may `process.exit` (surface boundary).
 *
 * The whole vertical runs off the RowSource port (reused fixture adapter): the real one-car export
 * drops into the same `--fixtures` dir (orders.json + transactions.json) with no code change.
 */
import { Engine, FIXED_POLICY, MemoryStore, DurableFsStore, load, buildIndex, type Graph, type StorePort } from '@ff/engine';
import { FixtureRowSource, RENTACAR_PREDICATES } from '@ff/ingest-rentacar';
import { MIN_CONSTITUTION } from '../core/constitution.js';
import { runPaymentIngest, type IngestSummary } from '../ingest.js';
import { BalanceObserver, type BalanceObservation } from '../agent/balance-observer.js';
import { computeOrderBalance, orderIdForPlate, orphanPayments } from '../balance.js';

export interface VerticalRun {
  engine: Engine;
  store: StorePort;
  summary: IngestSummary;
  observations: BalanceObservation[];
}

/**
 * Build a fresh engine, ingest the fixtures, run the agent-cycle once. Reused by the CLI and tests.
 *
 * `opts.store` selects the persistence backend behind the SAME `StorePort` seam (mirrors
 * `@ff/engine`'s CLI store-swap): `memory` (DEFAULT — backward-compatible, keeps `balance.test.ts` and
 * the in-process journal untouched) vs `durable` = `DurableFsStore`, so the real ga-rentacar act is
 * fsync'd to `<storeDir>/journal.jsonl` and survives the process (S10 keystone — durable proven on the
 * PRODUCT path, not only in engine lab tests). `storeDir` is parameterized (never hardcoded) so prod
 * points at a real dir and tests/CI use a unique tmp dir (single-writer lock, parallel-run safety).
 */
export function runVertical(
  fixturesDir: string,
  opts: { store?: 'memory' | 'durable'; storeDir?: string } = {},
): VerticalRun {
  const store: StorePort =
    opts.store === 'durable'
      ? new DurableFsStore(opts.storeDir ?? '.store', [MIN_CONSTITUTION], RENTACAR_PREDICATES)
      : new MemoryStore([MIN_CONSTITUTION], RENTACAR_PREDICATES);
  const engine = new Engine(store, FIXED_POLICY);
  const summary = runPaymentIngest(engine, new FixtureRowSource(fixturesDir));
  const observer = new BalanceObserver(engine, store);
  const observations = observer.observe();
  return { engine, store, summary, observations };
}

/** The current projected graph (read-model) of a run. */
export function graphOf(run: VerticalRun): Graph {
  return load(run.store.load());
}

/** Pure command runner (no exit). Returns an exit code; the wrapper is the only thing that exits. */
export function runCli(argv: string[]): number {
  const [verb, ...rest] = argv;
  const flag = (name: string): string | undefined => {
    const i = rest.indexOf('--' + name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const out = (s: string) => process.stdout.write(s + '\n');

  if (verb !== 'balance') {
    out('usage: rental-balance balance --fixtures <dir> [--plate <plate>] [--store <memory|durable>] [--store-dir <path>]');
    return verb ? 1 : 1;
  }
  const fixturesDir = flag('fixtures');
  if (!fixturesDir) {
    out('error: --fixtures <dir> is required (expects orders.json + transactions.json)');
    return 1;
  }

  // Store backend is a flag (default `memory` — unchanged behavior). `--store durable --store-dir <path>`
  // persists the real act to a JSONL journal on disk (S10). `--store-dir` is parameterized with a default,
  // not hardcoded, so prod can point at a real dir and CI at a unique tmp dir (single-writer-lock safety).
  const storeMode = (flag('store') ?? 'memory') as 'memory' | 'durable';
  const storeDir = flag('store-dir') ?? '.store';

  const run = runVertical(fixturesDir, { store: storeMode, storeDir });
  const graph = graphOf(run);
  const plate = flag('plate');

  out(`ingest: emitted=${run.summary.emitted} deduped=${run.summary.deduped} quarantined=${run.summary.quarantined} refused=${run.summary.refused}`);
  for (const q of run.summary.quarantineLog) out(`  quarantine: ${q}`);

  const orderIds = plate
    ? [orderIdForPlate(graph, plate)].filter((x): x is string => x !== null)
    : graph.nodes.filter((n) => n.type === 'order').map((n) => n.id);

  if (plate && orderIds.length === 0) {
    out(`\nno order found for plate ${plate}`);
  }

  for (const orderId of orderIds) {
    const bal = computeOrderBalance(graph, orderId);
    if (!bal) continue;
    out(`\n── order ${bal.orderRef} ${bal.plate ? `(car ${bal.plate})` : ''} ──`);
    out(`   total to pay : ${bal.total}`);
    out(`   payments     :`);
    for (const p of bal.payments) out(`     - ${p.ref}  ${p.amount}`);
    out(`   Σ paid       : ${bal.paidSum}`);
    out(`   REMAINING    : ${bal.remaining}`);
    const obs = run.observations.find((o) => o.subject === 'order' && o.ref === bal.orderRef);
    out(`   agent says   : remaining=${obs?.remaining ?? '?'} (observation persisted, survives session)`);
    for (const d of bal.discrepancies) out(`   ⚠ DISCREPANCY : ${d}`);
  }

  // Global discrepancies the agent raised (orphan payments — a payment against an order we do not have).
  const orphans = orphanPayments(graph);
  if (orphans.length > 0) {
    out(`\n⚠ RAISED DISCREPANCIES (${orphans.length}):`);
    for (const o of orphans) out(`   ORPHAN payment ${o.ref}: ${o.amount} paid-against ${o.orderTarget} — no such order`);
  }
  return 0;
}

// Exit ONLY here (surface boundary). Guarded so importing this module never exits.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(runCli(process.argv.slice(2)));
}
