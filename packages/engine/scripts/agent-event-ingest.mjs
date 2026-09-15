/**
 * agent-event-ingest runner — the D1 «минимальный шов» dogfood: read a file-drop of agent-system runtime
 * events, write each as a non-projectable `agent_trace` act into a DURABLE store, reboot a fresh store over
 * the same dir, then render the process-view read straight off disk. Proves the seam end-to-end without
 * touching the owner's day-graph store.
 *
 * Run (from packages/engine):
 *   node --import tsx scripts/agent-event-ingest.mjs
 *   node --import tsx scripts/agent-event-ingest.mjs --drop /abs/drop.jsonl --store-dir /abs/store
 *
 * Default drop: test/fixtures/agent-events-drop.jsonl · default store dir: .data/agent-events (gitignored,
 * SEPARATE from .data/day-graph — the two tenants never share a store-dir).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DurableFsStore, Engine, FIXED_POLICY } from '../src/index.js';
import { parseEventDrop, ingestAgentEvents } from '../src/surface/agent-event-ingest.js';
import { renderProcessView } from '../src/surface/process-view.js';
// Reuse the seeds' minimal Constitution ceiling so the Engine starts identically to the other grains.
import { CONSTITUTION_BASE } from './day-seed.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const DROP = arg('--drop', fileURLToPath(new URL('../test/fixtures/agent-events-drop.jsonl', import.meta.url)));
const STORE_DIR = arg('--store-dir', fileURLToPath(new URL('../.data/agent-events', import.meta.url)));

const events = parseEventDrop(readFileSync(DROP, 'utf8'));

// ── Write the runtime events as agent_trace acts, durably (idempotent over the existing log). ──
const writer = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE);
const engine = new Engine(writer, FIXED_POLICY);
const { written, skipped } = ingestAgentEvents(engine, events, writer.acts());
writer.close();

// ── Reboot a FRESH store — it can only know the events by reading disk. Render the process-view. ──
const reboot = new DurableFsStore(STORE_DIR, CONSTITUTION_BASE);
const acts = reboot.acts();
reboot.close();

console.log(renderProcessView(acts));
console.log('');
console.log(`— events in drop: ${events.length} · written new: ${written.length} · deduped: ${skipped}`);
console.log(`— durable store: ${STORE_DIR}/journal.jsonl (agent_trace — never projects into day-graph)`);
