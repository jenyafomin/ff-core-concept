/**
 * agent-event-seam.test — D1 «минимальный шов»: PROOF BY FACT that a runtime event from the agent system
 * becomes a node in FF's graph and is read back, WITHOUT leaking into the owner's day-graph.
 *
 * Design + adversarial verification:
 *   docs/_log/2026-09-13-core-spine-direction/SYNTHESIS.md §6 + raw/W2-02-integration-seam.map.md §4.
 *
 * The store here is a REAL DurableFsStore in an mkdtemp'd dir (NOT packages/engine/.data/day-graph — the
 * owner's 17 real census episodes are never touched). It is deliberately MIXED: one real `domain_event`
 * day-node PLUS four `agent_trace` seam events from the fixture file-drop. The three proofs:
 *   (a) the four events are written as `agent_trace` acts, survive a store reboot, and are idempotent
 *       (re-reading the same file-drop is a no-op — content-addressed);
 *   (b) the thin process-view lens sees exactly those four (critical first);
 *   (c) NONE of them reach the day-graph projection — `isProjectable()` filters them structurally, so the
 *       day-node is the ONLY thing day-graph sees, and no `agent-event:` id is in the projected node list.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DurableFsStore, Engine, FIXED_POLICY, isProjectable, type Act, type EnvelopeNode } from '../src/index.js';
// @ts-expect-error — plain-JS shared seed module (constitution base), no types.
import { CONSTITUTION_BASE } from '../scripts/day-seed.mjs';
import {
  parseEventDrop,
  ingestAgentEvents,
  AGENT_EVENT_PREFIX,
} from '../src/surface/agent-event-ingest.js';
import { processView, renderProcessView } from '../src/surface/process-view.js';
import { dayGraphView } from '../src/surface/day-graph.js';

const DROP = fileURLToPath(new URL('./fixtures/agent-events-drop.jsonl', import.meta.url));

/** A real owner day-node (`domain_event`, projects into `day:…`) — the first tenant the trace must NOT touch. */
const DAY_REF = 'day:2026-09-14:agentic-system-mess';
function dayNodeAct(): Act {
  return {
    id: 'act:day:2026-09-14:agentic-system-mess',
    actor: 'owner',
    provenance: { source_ref: DAY_REF, snapshotHash: 'djb2:day-mess-v1' },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload: { type: 'life-node', label: 'Бардак в системе', status: 'active', summary: 'ветки не помержены' },
  };
}

describe('agent-event-seam — runtime event → agent_trace node, read back, NOT in day-graph', () => {
  it('fixture → ingest → (a) written+idempotent · (b) lens sees them · (c) never in day-graph', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-agent-event-'));
    try {
      const events = parseEventDrop(readFileSync(DROP, 'utf8'));
      expect(events.length).toBe(4);

      // ── Write: one real day-node (domain_event) + four seam events (agent_trace), durably. ──
      const writer = new DurableFsStore(dir, CONSTITUTION_BASE as any);
      const engine = new Engine(writer, FIXED_POLICY);
      const dayAck = engine.write(dayNodeAct());
      expect(dayAck.ok).toBe(true);
      const ingest = ingestAgentEvents(engine, events);
      expect(ingest.written.length).toBe(4);
      expect(ingest.skipped).toBe(0);
      writer.close();

      // On-disk proof: 1 day-node + 4 trace lines = 5 journal lines.
      const journalPath = join(dir, 'journal.jsonl');
      expect(existsSync(journalPath)).toBe(true);
      const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
      expect(lines.length).toBe(5);

      // ── Reboot a FRESH store over the same dir — nothing shared but the disk. ──
      const reboot = new DurableFsStore(dir, CONSTITUTION_BASE as any);
      const acts = reboot.acts();
      const nodes = reboot.load();
      reboot.close();

      // (a) The four events are agent_trace acts, authored by the seam, with the reserved principal — and
      //     each is NON-projectable (the structural barrier телеметрия≠жизнь).
      const traces = acts.filter((a: Act) => a.actKind === 'agent_trace');
      expect(traces.length).toBe(4);
      expect(traces.every((a: Act) => a.actor === 'agents-manager')).toBe(true);
      expect(traces.every((a: Act) => a.principal?.whoActed === 'unverified')).toBe(true);
      expect(traces.every((a: Act) => isProjectable(a))).toBe(false); // none fold into the graph
      expect(traces.some((a: Act) => isProjectable(a))).toBe(false);

      // (b) The thin process-view lens sees exactly the four, ranked critical-first.
      const view = processView(acts);
      expect(view.events.length).toBe(4);
      expect(view.events[0]!.severity).toBe('critical');
      expect(view.events[0]!.kind).toBe('loop_hang');
      expect(view.bySeverity).toEqual({ critical: 1, warn: 1, watch: 1, ok: 1 });
      // observed_at rode provenance (not payload → no PII false-trip) and is surfaced by the lens.
      expect(view.events[0]!.observedAt).toBe('2026-09-14T08:32:00Z');
      const rendered = renderProcessView(acts);
      expect(rendered).toContain('Процесс-вид — флот  (4 событий)');
      expect(rendered).toContain('🔴 [loop_hang] loop:ga-rentacar-main');
      // eslint-disable-next-line no-console
      console.log('\n' + rendered + '\n');

      // (c) NONE of the traces reach the day-graph projection. `isProjectable` filters them structurally:
      //     the projected node list contains the day-node and ZERO agent-event nodes.
      expect(nodes.some((n: EnvelopeNode) => n.id === DAY_REF)).toBe(true);
      expect(nodes.some((n: EnvelopeNode) => n.id.startsWith(AGENT_EVENT_PREFIX))).toBe(false);
      const day = dayGraphView(nodes);
      expect(day.nodes.map((n) => n.id)).toEqual([DAY_REF]); // day-graph sees ONLY the day-node
      // …and the day-node is NOT a process event (the two tenants do not cross over).
      expect(view.events.some((e) => e.id === DAY_REF)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('content-addressed idempotency: re-reading the same file-drop is a no-op (log does not grow)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-agent-event-idem-'));
    try {
      const events = parseEventDrop(readFileSync(DROP, 'utf8'));

      const writer = new DurableFsStore(dir, CONSTITUTION_BASE as any);
      const engine = new Engine(writer, FIXED_POLICY);

      const first = ingestAgentEvents(engine, events, writer.acts());
      expect(first.written.length).toBe(4);
      const afterFirst = writer.acts().length;

      // Re-ingest the SAME drop, passing the current log as existing: every event is content-deduped.
      const second = ingestAgentEvents(engine, events, writer.acts());
      expect(second.written.length).toBe(0);
      expect(second.skipped).toBe(4);
      expect(writer.acts().length).toBe(afterFirst); // append-only log did NOT grow
      writer.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
