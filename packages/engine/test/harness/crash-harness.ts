/**
 * crash-harness — a REAL out-of-process actor for the crash-mid-turn adversarial test (S7 / GAP 1).
 *
 * WHY THIS EXISTS (separate from survive-turn-harness): the existing durable tests only prove a GRACEFUL
 * exit — process P1 finishes its turn, calls store.close() (releases the PID-lock), exits 0; then P2 boots.
 * But the project itself documented the bug `gateway-agents-die-on-restart`: the gateway sends SIGKILL to
 * the agent process MID-TURN, often BETWEEN acts of one batch. SIGKILL cannot be caught — the `process.once
 * ('exit', close)` hook NEVER runs, so the lock is left behind with a now-dead PID and the journal may hold
 * a half-written (torn) trailing line. This harness reproduces exactly that: it writes durably and then
 * HANGS (never closing), so the parent can hard-kill it between acts.
 *
 * Run via `node --import tsx <this-file> --store-dir <dir> <mode>`. Emits one line of JSON to fd 1.
 */
import { writeSync } from 'node:fs';
import { DurableFsStore, DurableStoreError, Engine, FIXED_POLICY, type Act, type EnvelopeNode } from '../../src/index.js';

const SUBJECT_A = 'sheets:Orders#CRASH-A';
const SUBJECT_B = 'sheets:Orders#CRASH-B';

/** Minimal constitution node — the Engine refuses to start without a policy:constitution ceiling. */
const MIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  body: { synthetic: true, no_read: [], protected_namespaces: [], default: 'deny' },
};

function domainEvent(id: string, source_ref: string, snapshotHash: string, payload: Record<string, unknown>): Act {
  return {
    id,
    actor: 'sync:ga-rentacar',
    provenance: { source_ref, snapshotHash },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload,
  };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function emit(obj: unknown): void {
  writeSync(1, `${JSON.stringify(obj)}\n`);
}

const storeDir = arg('--store-dir');
if (!storeDir) {
  process.stderr.write('missing --store-dir\n');
  process.exit(2);
}

if (process.argv.includes('--write-then-hang')) {
  // Realistic crash target: durably commit ONE act (fsync'd), announce it, then HANG forever holding the
  // lock. The parent waits for the COMMITTED marker (guaranteeing the act is on disk) then SIGKILLs us —
  // simulating the gateway killing the agent MID-BATCH, before act B and before any store.close().
  const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
  const engine = new Engine(store, FIXED_POLICY);
  const ack = engine.write(domainEvent('act:crash-A', SUBJECT_A, 'h-A', { type: 'order', total: 111 }));
  // NB: deliberately NOT calling store.close(). Announce durability, then hang.
  writeSync(1, `COMMITTED ${JSON.stringify({ ok: ack.ok })}\n`);
  // Keep the event loop alive indefinitely so the OS lock + journal reflect a live-then-killed writer.
  setInterval(() => {}, 1 << 30);
} else if (process.argv.includes('--write-clean')) {
  // Cleanly commit TWO acts and exit 0 (releases the lock). Used to lay down valid, fsync'd journal lines
  // that the test then corrupts with a torn tail to simulate a crash mid-append of a THIRD act.
  const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
  const engine = new Engine(store, FIXED_POLICY);
  engine.write(domainEvent('act:clean-A', SUBJECT_A, 'h-A', { type: 'order', total: 111 }));
  engine.write(domainEvent('act:clean-B', SUBJECT_B, 'h-B', { type: 'order', total: 222 }));
  emit({ mode: 'write-clean', acts: store.acts().length });
  store.close();
  process.exit(0);
} else if (process.argv.includes('--verify')) {
  // Fresh boot on a store-dir that a crash left behind (torn tail and/or stale lock). Report what the
  // durable adapter recovered. If the boot itself throws (e.g. lock not reclaimable), report that too —
  // the test must be able to see a HOLE, not just a pass.
  try {
    const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
    const nodeA = store.readNode(SUBJECT_A);
    const nodeB = store.readNode(SUBJECT_B);
    const acts = store.acts();
    emit({
      mode: 'verify',
      booted: true,
      foundA: nodeA !== null,
      totalA: (nodeA?.body?.total as number | undefined) ?? null,
      foundB: nodeB !== null,
      totalB: (nodeB?.body?.total as number | undefined) ?? null,
      actsLen: acts.length,
      actIds: acts.map((a) => a.id),
    });
    store.close();
    process.exit(0);
  } catch (e) {
    emit({
      mode: 'verify',
      booted: false,
      error: String(e),
      isLockError: e instanceof DurableStoreError,
    });
    // exit 0 so the parent can inspect the structured error (a hole is data, not a harness failure).
    process.exit(0);
  }
} else {
  process.stderr.write('need --write-then-hang | --write-clean | --verify\n');
  process.exit(2);
}
