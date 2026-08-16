/**
 * erasure-plane-harness — a REAL out-of-process actor for the "genuinely falsifiable plane" tests
 * (D1.b Stage 2, §9-3 / §9-3b / F6). Same OS-process discipline as `@ff/engine`'s survive-turn /
 * crash-mid-turn harnesses: process P1 writes REAL acts through `DurableFsStore.writeAct`, physically
 * shreds one payload on disk via `store.shredPayload(actId)`, then exits; a FRESH process P2 boots over
 * the same store-dir (nothing shared but the disk journal) and reads back the projected node / journal.
 *
 * WHY THIS LIVES IN rental-balance (not engine): the tests must run the REAL ga-rentacar path —
 * `@ff/ingest-rentacar` `reduceOrderRow` / `confirmSameAs` — which `@ff/engine` cannot import (engine ⇒
 * ingest-rentacar would be a dependency CYCLE; ingest-rentacar already depends on engine). rental-balance
 * is the only package that depends on BOTH, so it is the correct home. This also closes the census gap
 * "no test runs the real ga-rentacar path through --store durable" (S10-on-product), for free.
 *
 * Run via `node --import tsx <this-file>`. Emits ONE JSON object to fd 1 (sync write, never truncated).
 */
import { writeSync } from 'node:fs';
import { join } from 'node:path';
import { DurableFsStore, LOCKED_PREDICATES, type Act, type Edge, type EnvelopeNode } from '@ff/engine';
import {
  FilePayloadStore,
  RENTACAR_PREDICATES,
  reduceOrderRow,
  confirmSameAs,
  orderSourceRef,
} from '@ff/ingest-rentacar';
import { MIN_CONSTITUTION } from '../../src/core/constitution.js';

// ── deterministic fixtures both P1 (write) and P2 (read) agree on, without shared memory ────────────
const NUM_CORE = '45832-2865';
const ORDER_REF = orderSourceRef(NUM_CORE); // sheets:Orders#45832-2865
/** A REAL ga-rentacar Orders row: real plate ⇒ a `drives` edge; a Recent Note ⇒ a by-ref PII payload. */
const ORDER_ROW = {
  '#': NUM_CORE,
  Customer: 'Test Renter',
  Mobile: '0501234567',
  'Plate No': 'AB-12345',
  'Order Type': 'Daily400.00',
  'Recent Note': 'call the renter back',
  Status: 'open',
  Remaining: 400,
  'Number of Days': 3,
};
/** ≥3-member same-as group targets (subject ORDER_REF + these two) — kernel-locked `many` cardinality. */
const SAME_AS_TARGETS = ['identity:renter-B', 'identity:renter-C'];

/** F6 Кандидат 1: a structurally DIFFERENT act — new act-kind, nested/arrayed payload, non-rentacar
 * predicate (`granted-to`) + a same-as edge. Proves the on-disk erasure split is form-agnostic, not
 * accidentally ga-rentacar-shaped (compact-flat payload / rentacar predicates). */
const ACCESS_ACT: Act = {
  id: 'act:access:R-1',
  actor: 'iam:gatekeeper',
  provenance: { source_ref: 'iam:Resource#R-1', snapshotHash: 'h-access-1' },
  recordedAt: '',
  actKind: 'access_event',
  edges: [
    { predicate: 'granted-to', target: 'subject:alice', meta: { role: 'admin' } },
    { predicate: 'same-as', target: 'iam:Resource#R-dup' },
  ],
  payload: { resource: { id: 'R-1', kind: 'vault' }, grants: [{ action: 'read', scope: 'all' }, { action: 'write', scope: 'own' }] },
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function has(flag: string): boolean {
  return process.argv.includes(flag);
}
function emit(obj: unknown): void {
  writeSync(1, JSON.stringify(obj));
}

const storeDir = arg('--store-dir');
if (!storeDir) {
  process.stderr.write('missing --store-dir\n');
  process.exit(2);
}
const scenario = arg('--scenario');

/**
 * §9-3b LOCK-FALSIFICATION (critic довесок). `--hostile` folds under a registry that DECLARES
 * `same-as: 'one'` — so the group survives ONLY because `LOCKED_PREDICATES` (predicates.ts:56-60) pins
 * `same-as → 'many'` over the caller's data. `--unlock` is the MUTANT: strip the kernel lock at runtime
 * (delete the `same-as` key from the exported Record — same module singleton the store's `foldEdges`/
 * `project` consult via `cardinalityOf`; NOT an edit to the boxed `predicates.ts`). With the key gone,
 * `cardinalityOf('same-as', hostileRegistry)` falls through to the registry's `'one'` → REPLACE-fold → the
 * group collapses to the last target, and the honest §9-3b assert MUST go red.
 */
if (has('--unlock')) delete (LOCKED_PREDICATES as unknown as Record<string, unknown>)['same-as'];
const registry = has('--hostile') ? { ...RENTACAR_PREDICATES, 'same-as': 'one' as const } : RENTACAR_PREDICATES;
const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION], registry);

/**
 * MUTANT (§9-3, obligatory): monkeypatch THIS process's store so serialization DROPS `edges`
 * (`{ payload, edges: undefined, ...rest }` — the broken split the census flagged as untested). NOT an
 * edit to the boxed `store-durable-fs.ts`: an own-property shadow of the prototype method, local to this
 * process only. Under it, the honest §9-3 assert MUST go red (edges do not survive the round-trip).
 */
if (has('--mutant')) {
  (store as unknown as { actToLine(a: Act): string }).actToLine = (act: Act): string => {
    const { payload, edges: _edges, ...rest } = act; // DROP edges on the way to disk
    return `${JSON.stringify({ ...rest, erasable: payload })}\n`;
  };
}

function buildOrderActs(): { orderAct: Act; custAct: Act } {
  const payloadStore = new FilePayloadStore(join(storeDir as string, 'payload'));
  const r = reduceOrderRow(ORDER_ROW, payloadStore);
  if (!r.ok) {
    process.stderr.write(`reduceOrderRow quarantined: ${r.quarantine}\n`);
    process.exit(3);
  }
  return { orderAct: r.acts[0]!, custAct: r.acts[1]! };
}

function sameAsTargetsOf(node: EnvelopeNode | null): string[] {
  return (node?.edges ?? [])
    .filter((e: Edge) => e.predicate === 'same-as')
    .map((e: Edge) => e.target)
    .sort();
}

try {
  if (has('--write')) {
    if (scenario === 'order') {
      const { orderAct, custAct } = buildOrderActs();
      // INDEPENDENT before-snapshot: deep-clone edges from the ORIGINAL built act — NOT via splitAct/project.
      const edgesBefore = structuredClone(orderAct.edges);
      store.writeAct(orderAct);
      store.writeAct(custAct);
      store.shredPayload(orderAct.id); // physically strip the order's payload zone on disk
      emit({ mode: 'write', scenario, ref: ORDER_REF, shredId: orderAct.id, edgesBefore });
    } else if (scenario === 'sameas') {
      const { orderAct, custAct } = buildOrderActs();
      // subject node = the order (it HAS a payload); the same-as group rides the SAME source_ref.
      const sameAsActs = SAME_AS_TARGETS.map((target, i) =>
        confirmSameAs({ sourceRef: ORDER_REF, target, confidence: 'high', seq: `s${i}` }),
      );
      // INDEPENDENT before-snapshot: the target set from the acts WE build, not from any projection.
      const sameAsTargetsBefore = [...SAME_AS_TARGETS].sort();
      store.writeAct(orderAct);
      store.writeAct(custAct);
      for (const a of sameAsActs) store.writeAct(a);
      store.shredPayload(orderAct.id); // shred the payload-bearing member; same-as edges must be untouched
      emit({ mode: 'write', scenario, ref: ORDER_REF, sameAsTargetsBefore });
    } else if (scenario === 'access') {
      const edgesBefore = structuredClone(ACCESS_ACT.edges);
      store.writeAct(ACCESS_ACT);
      store.shredPayload(ACCESS_ACT.id);
      emit({ mode: 'write', scenario, id: ACCESS_ACT.id, edgesBefore });
    } else {
      process.stderr.write(`unknown --scenario ${scenario}\n`);
      store.close();
      process.exit(2);
    }
  } else if (has('--read')) {
    if (scenario === 'order') {
      const node = store.readNode(ORDER_REF);
      emit({ mode: 'read', scenario, found: node !== null, edgesAfter: node?.edges ?? null, bodyKeysAfter: Object.keys(node?.body ?? {}) });
    } else if (scenario === 'sameas') {
      const node = store.readNode(ORDER_REF);
      emit({ mode: 'read', scenario, found: node !== null, sameAsTargetsAfter: sameAsTargetsOf(node), bodyKeysAfter: Object.keys(node?.body ?? {}) });
    } else if (scenario === 'access') {
      const act = store.acts().find((a) => a.id === ACCESS_ACT.id) ?? null;
      emit({ mode: 'read', scenario, found: act !== null, edgesAfter: act?.edges ?? null, payloadPresent: act?.payload !== undefined });
    } else {
      process.stderr.write(`unknown --scenario ${scenario}\n`);
      store.close();
      process.exit(2);
    }
  } else {
    process.stderr.write('need --write or --read\n');
    store.close();
    process.exit(2);
  }
  store.close();
  process.exit(0);
} catch (e) {
  store.close();
  process.stderr.write(`${String(e)}\n`);
  process.exit(1);
}
