/**
 * survive-turn-harness — a REAL out-of-process actor for the survive-turn test (S7 / AC-2).
 *
 * The whole point of the test is a genuine OS-process boundary: process P1 writes an act and exits;
 * process P2 boots fresh (nothing shared but the store-dir on disk) and must SEE that act. This harness
 * is that single-shot process — run once with `--write`, once with `--read`, against the same
 * `--store-dir`. It constructs a real Engine over the durable adapter and prints a JSON result to fd 1.
 *
 * Run via `node --import tsx <this-file>` (tsx resolves the `.ts` + `.js`-specifier imports). It writes
 * with fs.writeSync(1, …) then process.exit — a synchronous write so stdout is never truncated on exit.
 */
import { writeSync, writeFileSync, readFileSync } from 'node:fs';
import { DurableFsStore, Engine, FIXED_POLICY, type Act, type EnvelopeNode } from '../../src/index.js';

/** The fixed subject both P1 (write) and P2 (read) agree on. */
const SUBJECT = 'sheets:Orders#SURVIVE-1';

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
    recordedAt: '', // engine-assigned, ignored
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
  writeSync(1, JSON.stringify(obj));
}

/** An `observation` side-journal act (no source_ref ⇒ not projectable, never dedup'd). */
function observation(id: string, note: string): Act {
  return { id, actor: 'sync:ga-rentacar', provenance: 'obs', recordedAt: '', actKind: 'observation', edges: [], payload: { note } };
}

/** Canonical JSON: object keys sorted recursively so two projections compare bit-for-bit as strings. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

/** The projection (store.load()) rendered as one deterministic, id-sorted canonical string. */
function projectionSnapshot(nodes: EnvelopeNode[]): string {
  const sorted = [...nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return canonical(sorted);
}

const storeDir = arg('--store-dir');
if (!storeDir) {
  process.stderr.write('missing --store-dir\n');
  process.exit(2);
}

const store = new DurableFsStore(storeDir, [MIN_CONSTITUTION]);
const engine = new Engine(store, FIXED_POLICY);

try {
  if (process.argv.includes('--write')) {
    const ack = engine.write(domainEvent('act:survive-1', SUBJECT, 'h-survive', { type: 'order', total: 777 }));
    emit({ mode: 'write', ack });
  } else if (process.argv.includes('--read')) {
    const node = store.readNode(SUBJECT);
    emit({
      mode: 'read',
      found: node !== null,
      total: (node?.body?.total as number | undefined) ?? null,
      version: (node?.state?.version as number | undefined) ?? null,
    });
  } else if (process.argv.includes('--reingest')) {
    // C4 (Test 2): after a reboot from disk, a BYTE-IDENTICAL domain_event must dedup (not duplicate),
    // and an observation (no source_ref) must append untouched. Proves dedup survives the process boundary.
    const ackDup = engine.write(domainEvent('act:survive-1', SUBJECT, 'h-survive', { type: 'order', total: 777 }));
    const ackObs = engine.write(observation('obs:1', 'reboot re-ingest note'));
    const journal = store.acts();
    emit({
      mode: 'reingest',
      dedup: ackDup.ok === true && ackDup.dedup === true,
      // how many projectable domain_events for OUR subject are in the durable journal after re-ingest
      subjectDomainEvents: journal.filter(
        (a) => a.actKind === 'domain_event' && typeof a.provenance === 'object' && (a.provenance as { source_ref?: string }).source_ref === SUBJECT,
      ).length,
      observations: journal.filter((a) => a.actKind === 'observation').length,
      totalActs: journal.length,
    });
  } else if (process.argv.includes('--write-series')) {
    // C3 (Test 3): write N acts incl. a late-arriving supersede that changes a node's projection, then
    // snapshot P1's FINAL (incrementally-built) projection to a control file for P2 to reproduce.
    const snap = arg('--snapshot');
    if (!snap) { process.stderr.write('--write-series needs --snapshot <path>\n'); store.close(); process.exit(2); }
    engine.write(domainEvent('s1', 'order:1', 'h1', { type: 'order', total: 100 }));
    engine.write(domainEvent('s2', 'order:2', 'h1', { type: 'order', total: 50 }));
    engine.write(domainEvent('s3', 'order:1', 'h2', { type: 'order', total: 999 })); // late supersede of order:1
    engine.write(domainEvent('s4', 'order:2', 'h2', { type: 'order', total: 75 }));  // supersede of order:2
    const p1Snapshot = projectionSnapshot(store.load());
    writeFileSync(snap as string, p1Snapshot);
    emit({ mode: 'write-series', acts: store.acts().length, snapshotLen: p1Snapshot.length });
  } else if (process.argv.includes('--rebuild-verify')) {
    const snap = arg('--snapshot');
    if (!snap) { process.stderr.write('--rebuild-verify needs --snapshot <path>\n'); store.close(); process.exit(2); }
    engine.rebuild('journal'); // tear down + re-fold the durable journal from disk
    const p2Snapshot = projectionSnapshot(store.load());
    const p1Snapshot = readFileSync(snap as string, 'utf8');
    emit({ mode: 'rebuild-verify', match: p2Snapshot === p1Snapshot, p2Len: p2Snapshot.length, p1Len: p1Snapshot.length });
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
