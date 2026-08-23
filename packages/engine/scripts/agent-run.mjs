/**
 * agent-run runner — the "агент-прогон → память" runnable artifact. Writes a REAL slice of THIS session's
 * own orchestration (agents · tasks · findings · verdicts + typed edges) into a DURABLE on-disk store, then
 * REBOOTS a fresh store over the same dir (nothing shared but the disk) and renders the run as a GRAPH read
 * straight off disk — proving the memory now REMEMBERS ITS OWN WORK as real graph nodes/edges that survive
 * the process.
 *
 * Run (from packages/engine):
 *   node --import tsx scripts/agent-run.mjs
 *   node --import tsx scripts/agent-run.mjs --store-dir /abs/path   # custom durable dir
 *
 * Default store dir: packages/engine/.data/agent-run (gitignored; the owner's own store).
 */
import { fileURLToPath } from 'node:url';
import { DurableFsStore, Engine, FIXED_POLICY } from '../src/index.js';
import { renderRunGraph } from '../src/surface/agent-run.js';
import {
  CONSTITUTION_BASE,
  RUN_PREDICATES,
  writeAllRunGraph,
  RUN_GRAPH_NODE_COUNT,
  RUN_GRAPH_EDGE_COUNT,
} from './agent-run-seed.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const STORE_DIR = arg('--store-dir', fileURLToPath(new URL('../.data/agent-run', import.meta.url)));

// ── P1: write the run as a graph, durably. The tenant predicate registry is injected at the store seam. ──
const writer = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE, RUN_PREDICATES);
const engine = new Engine(writer, FIXED_POLICY);
const existingIds = new Set(writer.acts().map((a) => a.id));
const acks = writeAllRunGraph(engine, existingIds);
writer.close(); // journal.jsonl fsync'd; free the lock for the reboot below

// ── P2: reboot a FRESH store over the same dir — it can only know the graph by reading disk. ────────────
const reboot = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE, RUN_PREDICATES);
const nodes = reboot.load();
const projected = nodes.filter((n) => n.id.startsWith('agent:') || n.id.startsWith('run:'));
const mirror = renderRunGraph(nodes);
reboot.close();

console.log(mirror);
console.log('');
console.log(
  `— written new: ${acks.length} · projected graph nodes on disk: ${projected.length}/${RUN_GRAPH_NODE_COUNT} · expected edges: ${RUN_GRAPH_EDGE_COUNT}`,
);
console.log(`— durable store: ${STORE_DIR}/journal.jsonl`);
