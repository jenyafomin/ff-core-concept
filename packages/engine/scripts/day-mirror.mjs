/**
 * day-mirror runner — the runnable artifact. Writes the owner's real day-nodes as `observation` acts into a
 * DURABLE on-disk store, then REBOOTS a fresh store over the same dir (nothing shared but the disk) and
 * renders the mirror from what it read off disk — proving "write a real node → read it back with a lens"
 * survives the process.
 *
 * Run (from packages/engine):
 *   node --import tsx scripts/day-mirror.mjs
 *   node --import tsx scripts/day-mirror.mjs --store-dir /abs/path   # custom durable dir
 *
 * Default store dir: packages/engine/.data/day-mirror (gitignored; the owner's own store).
 */
import { fileURLToPath } from 'node:url';
import { DurableFsStore, Engine, FIXED_POLICY } from '../src/index.js';
import { renderDayMirror } from '../src/surface/day-mirror.js';
import { CONSTITUTION_BASE, writeAllDayNodes, OWNER_DAY_NODES } from './day-seed.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const STORE_DIR = arg('--store-dir', fileURLToPath(new URL('../.data/day-mirror', import.meta.url)));

// ── P1: write the owner's day-nodes durably, then release the single-writer lock. ──────────────────────
// Idempotent: skip any day-node already on disk (deterministic id), so re-running never duplicates.
const writer = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE);
const engine = new Engine(writer, FIXED_POLICY);
const existingIds = new Set(writer.acts().map((a) => a.id));
const acks = writeAllDayNodes(engine, existingIds);
const alreadyPresent = OWNER_DAY_NODES.length - acks.length;
writer.close(); // journal.jsonl is fsync'd; free the lock for the reboot below

// ── P2: reboot a FRESH store over the same dir — it can only know the nodes by reading disk. ───────────
const reboot = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE);
const persisted = reboot.acts().filter((a) => a.actKind === 'observation');
const mirror = renderDayMirror(reboot.acts());
reboot.close();

console.log(mirror);
console.log('');
console.log(
  `— written new: ${acks.length} · already-present (idempotent skip): ${alreadyPresent} · total day-nodes: ${OWNER_DAY_NODES.length} · persisted on disk: ${persisted.length}`,
);
console.log(`— durable store: ${STORE_DIR}/journal.jsonl`);
