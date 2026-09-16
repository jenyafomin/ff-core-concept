/**
 * agent-run.test — the "агент-прогон → память" grain, sealed green: a REAL slice of THIS session's own
 * recursive orchestration (agent waves that built F3 + the recheck wave) is now a GRAPH, not a transcript.
 * Agents · tasks · findings · verdicts are written as `domain_event` acts that FOLD into graph nodes (one
 * per source_ref), wired by typed edges (performs · produced · verified · gated · refuted · supersedes),
 * with agent-referents promoted to real `agent` nodes (Ц6). The graph is read back OFF DISK after a store
 * reboot and rendered by the «граф прогона» lens — memory REMEMBERING ITSELF. Mirrors day-graph.test's
 * real-persistence discipline; the payload is the system's OWN work.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain-JS seed module (shared with scripts/agent-run.mjs), no types.
import {
  CONSTITUTION_BASE,
  RUN_PREDICATES,
  writeAllRunGraph,
  runRef,
  agentRef,
  AGENTS,
  RUN_GRAPH_NODE_COUNT,
  RUN_GRAPH_EDGE_COUNT,
} from '../scripts/agent-run-seed.mjs';
import { DurableFsStore, Engine, FIXED_POLICY, type Act, type EnvelopeNode } from '../src/index.js';
import { renderRunGraph, runGraphView } from '../src/surface/agent-run.js';

describe('agent-run — the session orchestration is a real graph (nodes + typed edges), survives reboot', () => {
  it('projects into graph nodes + edges, persists across a reboot, and renders as the run-graph', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-agent-run-'));
    try {
      // ── P1: write the run as a graph, durably. Tenant predicate registry injected at the store seam.
      const writer = new DurableFsStore(dir, CONSTITUTION_BASE as any, RUN_PREDICATES);
      const engine = new Engine(writer, FIXED_POLICY);
      const acks = writeAllRunGraph(engine);
      expect(acks.every((a: { ok: boolean }) => a.ok)).toBe(true);
      expect(acks.length).toBe(RUN_GRAPH_NODE_COUNT); // 8 agents + 10 run-threads = 18
      writer.close();

      // On-disk proof: one journal line per written domain_event.
      const journalPath = join(dir, 'journal.jsonl');
      expect(existsSync(journalPath)).toBe(true);
      const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
      expect(lines.length).toBe(RUN_GRAPH_NODE_COUNT);

      // ── P2: a FRESH store over the same dir — nothing shared but the disk. It re-folds the log into graph.
      const reboot = new DurableFsStore(dir, CONSTITUTION_BASE as any, RUN_PREDICATES);
      const acts = reboot.acts();
      const nodes = reboot.load();
      reboot.close();

      // Every written act is a projectable domain_event authored by the owner's memory, with the reserved principal.
      const events = acts.filter((a: Act) => a.actKind === 'domain_event');
      expect(events.length).toBe(RUN_GRAPH_NODE_COUNT); // survived the process/store boundary
      expect(events.every((a: Act) => a.actor === 'owner')).toBe(true);
      // F-B: the reserved author slot is populated (honest 'unverified' — not an authenticated authority).
      expect(events.every((a: Act) => a.principal?.whoActed === 'unverified')).toBe(true);

      // ── The GRAPH: run-threads folded into nodes keyed by source_ref, agent-referents into real agent nodes.
      const byId = new Map(nodes.map((n: EnvelopeNode) => [n.id, n]));
      const agentNodes = nodes.filter((n: EnvelopeNode) => n.id.startsWith('agent:'));
      const runNodes = nodes.filter((n: EnvelopeNode) => n.id.startsWith('run:'));
      expect(agentNodes.length).toBe(AGENTS.length); // Ц6: agents are real nodes now (8)
      expect(runNodes.length).toBe(10); // 2 tasks + 6 findings + 2 verdicts

      // Node types are what the payload declared.
      expect((byId.get(agentRef('builder')) as EnvelopeNode).type).toBe('agent');
      expect((byId.get(runRef('task:f3-day-graph')) as EnvelopeNode).type).toBe('task');
      expect((byId.get(runRef('finding:day-graph')) as EnvelopeNode).type).toBe('finding');
      expect((byId.get(runRef('verdict:f3-pass')) as EnvelopeNode).type).toBe('verdict');

      // A run-thread node carries its verbatim body + the F-B reserved (empty) salience slot.
      const pass = byId.get(runRef('verdict:f3-pass')) as EnvelopeNode;
      expect(pass.body?.status).toBe('pass');
      expect(pass.body?.commit).toBe('9cdd800'); // the resulting commit as body data
      expect('salience' in (pass.body ?? {})).toBe(true); // F-B slot present…
      expect(pass.body?.salience).toBeNull(); // …and empty (no weight engine yet)

      // ── Typed edges are REAL: total 16, exercising all six predicates.
      const view = runGraphView(nodes);
      expect(view.edgeCount).toBe(RUN_GRAPH_EDGE_COUNT);
      expect(view.edgeCount).toBe(16);
      const allPredicates = new Set(
        nodes.flatMap((n: EnvelopeNode) => (n.edges ?? []).map((e) => e.predicate)),
      );
      expect([...allPredicates].sort()).toEqual(
        ['gated', 'performs', 'produced', 'refuted', 'supersedes', 'verified'].sort(),
      );

      // F3 spine: builder --performs--> task, builder --produced--> finding, reviewer --verified--> verdict.
      const builder = byId.get(agentRef('builder')) as EnvelopeNode;
      expect((builder.edges ?? []).map((e) => `${e.predicate}:${e.target}`).sort()).toEqual(
        [`performs:${runRef('task:f3-day-graph')}`, `produced:${runRef('finding:day-graph')}`].sort(),
      );
      const reviewer = byId.get(agentRef('reviewer')) as EnvelopeNode;
      expect((reviewer.edges ?? []).map((e) => `${e.predicate}:${e.target}`)).toEqual([
        `verified:${runRef('verdict:f3-pass')}`,
      ]);

      // Recheck wave: all four D-agents --performs--> the recheck task (referential integrity holds).
      for (const d of ['D1', 'D2', 'D3', 'D4']) {
        const agent = byId.get(agentRef(d)) as EnvelopeNode;
        const performs = (agent.edges ?? []).filter((e) => e.predicate === 'performs').map((e) => e.target);
        expect(performs).toEqual([runRef('task:recheck-wave')]);
        for (const t of performs) expect(byId.has(t)).toBe(true); // Ц6: no dangling edge
      }

      // co-orchestrator --gated--> the PATCH verdict.
      const coorch = byId.get(agentRef('co-orchestrator')) as EnvelopeNode;
      expect((coorch.edges ?? []).map((e) => `${e.predicate}:${e.target}`)).toEqual([
        `gated:${runRef('verdict:recheck-patch')}`,
      ]);

      // critic --refuted--> D1 & D4 (the false consensus), and --produced--> the false-consensus finding.
      const critic = byId.get(agentRef('critic')) as EnvelopeNode;
      const refuted = (critic.edges ?? []).filter((e) => e.predicate === 'refuted').map((e) => e.target);
      expect(refuted.sort()).toEqual([runRef('finding:d1'), runRef('finding:d4')].sort());
      for (const t of refuted) expect(byId.has(t)).toBe(true); // Ц6 referential integrity
      expect((critic.edges ?? []).some((e) => e.predicate === 'produced' && e.target === runRef('finding:false-consensus'))).toBe(true);

      // false-consensus --supersedes--> D1's finding; D1 is marked superseded (Ц4 — dimmed, not deleted).
      const falseConsensus = byId.get(runRef('finding:false-consensus')) as EnvelopeNode;
      expect((falseConsensus.edges ?? []).map((e) => `${e.predicate}:${e.target}`)).toEqual([
        `supersedes:${runRef('finding:d1')}`,
      ]);
      const d1 = view.findings.find((f) => f.id === runRef('finding:d1'))!;
      expect(d1.status).toBe('superseded');
      expect(d1.cold).toBe(true); // shown, but dimmed

      // ── Render + print the real run-graph.
      const rendered = renderRunGraph(nodes);
      expect(rendered).toContain('Граф прогона');
      expect(rendered).toContain('18 узлов · 16 рёбер');
      expect(rendered).toContain('● PASS, 145 тестов — pass'); // verdict rendered
      expect(rendered).toContain('commit 9cdd800'); // resulting commit surfaced
      expect(rendered).toContain('○ D1: анализ policy-as-data — superseded'); // superseded thread, dimmed
      expect(rendered).toContain('→ verified: PASS, 145 тестов'); // typed edge rendered by target label
      expect(rendered).toContain('→ refuted: D1: анализ policy-as-data');
      expect(rendered).toContain('Агенты:');
      // NB: do NOT print `rendered` — keep real-graph content out of stdout/CI logs (V7/PII).
      // Assertions above cover what mattered.
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rebuild-from-journal is idempotent: a second write of the same run is a no-op (log does not grow)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-agent-run-idem-'));
    try {
      const writer = new DurableFsStore(dir, CONSTITUTION_BASE as any, RUN_PREDICATES);
      const engine = new Engine(writer, FIXED_POLICY);
      writeAllRunGraph(engine);
      const afterFirst = writer.acts().length;
      // Re-run with NO id-skip: the kernel content-hash dedup must swallow every re-write.
      const acks2 = writeAllRunGraph(engine);
      expect(acks2.every((a: { ok: boolean; dedup?: boolean }) => a.ok && a.dedup === true)).toBe(true);
      expect(writer.acts().length).toBe(afterFirst); // append-only log did NOT grow
      writer.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
