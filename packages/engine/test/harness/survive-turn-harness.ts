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
import { writeSync } from 'node:fs';
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
