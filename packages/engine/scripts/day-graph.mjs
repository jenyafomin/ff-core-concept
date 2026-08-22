/**
 * day-graph runner — F3 runnable artifact. Writes the owner's real day-1 AS A GRAPH (9 threads as
 * `domain_event` nodes + typed edges + person nodes) into a DURABLE on-disk store, then REBOOTS a fresh store
 * over the same dir (nothing shared but the disk) and renders the day as a GRAPH read straight off disk —
 * proving the day now folds into real graph nodes/edges and survives the process.
 *
 * Run (from packages/engine):
 *   node --import tsx scripts/day-graph.mjs
 *   node --import tsx scripts/day-graph.mjs --store-dir /abs/path   # custom durable dir
 *
 * Default store dir: packages/engine/.data/day-graph (gitignored; the owner's own store).
 */
import { fileURLToPath } from 'node:url';
import { DurableFsStore, Engine, FIXED_POLICY } from '../src/index.js';
import { renderDayGraph } from '../src/surface/day-graph.js';
import {
  CONSTITUTION_BASE,
  DAY_PREDICATES,
  writeAllDayGraph,
  DAY_GRAPH_NODE_COUNT,
  DAY_GRAPH_EDGE_COUNT,
} from './day-graph-seed.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const STORE_DIR = arg('--store-dir', fileURLToPath(new URL('../.data/day-graph', import.meta.url)));

// ── P1: write the day as a graph, durably. The tenant predicate registry is injected at the store seam. ──
const writer = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE, DAY_PREDICATES);
const engine = new Engine(writer, FIXED_POLICY);
const existingIds = new Set(writer.acts().map((a) => a.id));
const acks = writeAllDayGraph(engine, existingIds);
writer.close(); // journal.jsonl fsync'd; free the lock for the reboot below

// ── P2: reboot a FRESH store over the same dir — it can only know the graph by reading disk. ────────────
const reboot = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE, DAY_PREDICATES);
const nodes = reboot.load();
const projected = nodes.filter((n) => n.id.startsWith('day:') || n.id.startsWith('person:'));
const mirror = renderDayGraph(nodes);
reboot.close();

console.log(mirror);
console.log('');
console.log(
  `— written new: ${acks.length} · projected graph nodes on disk: ${projected.length}/${DAY_GRAPH_NODE_COUNT} · expected edges: ${DAY_GRAPH_EDGE_COUNT}`,
);
console.log(`— durable store: ${STORE_DIR}/journal.jsonl`);
