/**
 * day-graph.test — F3, sealed green: the owner's REAL day-1 is now a GRAPH, not a side-journal. The 9
 * day-threads are written as `domain_event` acts that FOLD into graph nodes (one per source_ref), wired by
 * typed edges, with referents promoted to real person nodes (Ц6). The graph is read back OFF DISK after a
 * store reboot and rendered by the «граф дня» lens — proving the day exercises projection · Edge · predicates,
 * the load-bearing thesis «граф = субстрат». Mirrors day-mirror.test's real-persistence discipline; the
 * difference is the read-back is the PROJECTED GRAPH (domain_events), not a lens over observations.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain-JS seed module (shared with scripts/day-graph.mjs), no types.
import {
  CONSTITUTION_BASE,
  DAY_PREDICATES,
  writeAllDayGraph,
  dayRef,
  personRef,
  PEOPLE,
  DAY_GRAPH_NODE_COUNT,
  DAY_GRAPH_EDGE_COUNT,
} from '../scripts/day-graph-seed.mjs';
import { DurableFsStore, Engine, FIXED_POLICY, type Act, type EnvelopeNode } from '../src/index.js';
import { renderDayGraph, dayGraphView } from '../src/surface/day-graph.js';

describe('day-graph — the owner day-1 is a real graph (nodes + typed edges), survives reboot', () => {
  it('projects into graph nodes + edges, persists across a reboot, and renders as the day-graph', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-day-graph-'));
    try {
      // ── P1: write the day as a graph, durably. Tenant predicate registry injected at the store seam.
      const writer = new DurableFsStore(dir, CONSTITUTION_BASE as any, DAY_PREDICATES);
      const engine = new Engine(writer, FIXED_POLICY);
      const acks = writeAllDayGraph(engine);
      expect(acks.every((a: { ok: boolean }) => a.ok)).toBe(true);
      expect(acks.length).toBe(DAY_GRAPH_NODE_COUNT); // 9 day-threads + 4 people = 13
      writer.close();

      // On-disk proof: one journal line per written domain_event.
      const journalPath = join(dir, 'journal.jsonl');
      expect(existsSync(journalPath)).toBe(true);
      const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
      expect(lines.length).toBe(DAY_GRAPH_NODE_COUNT);

      // ── P2: a FRESH store over the same dir — nothing shared but the disk. It re-folds the log into graph.
      const reboot = new DurableFsStore(dir, CONSTITUTION_BASE as any, DAY_PREDICATES);
      const acts = reboot.acts();
      const nodes = reboot.load();
      reboot.close();

      // Every written act is a projectable domain_event authored by the owner, carrying the reserved principal.
      const events = acts.filter((a: Act) => a.actKind === 'domain_event');
      expect(events.length).toBe(DAY_GRAPH_NODE_COUNT); // survived the process/store boundary
      expect(events.every((a: Act) => a.actor === 'owner')).toBe(true);
      // F-B: the reserved author slot is populated (honest 'unverified' — not an authenticated authority).
      expect(events.every((a: Act) => a.principal?.whoActed === 'unverified')).toBe(true);

      // ── The GRAPH: day-threads folded into nodes keyed by source_ref, referents into real person nodes.
      const byId = new Map(nodes.map((n: EnvelopeNode) => [n.id, n]));
      const dayNodes = nodes.filter((n: EnvelopeNode) => n.id.startsWith('day:'));
      const personNodes = nodes.filter((n: EnvelopeNode) => n.id.startsWith('person:'));
      expect(dayNodes.length).toBe(9);
      expect(personNodes.length).toBe(PEOPLE.length); // Ц6: referents are real nodes now

      // A day-thread node carries its verbatim body + the F-B reserved (empty) salience slot.
      const dvizh = byId.get(dayRef('движ')) as EnvelopeNode;
      expect(dvizh.type).toBe('life-node');
      expect(dvizh.body?.status).toBe('blocked');
      expect(dvizh.body?.summary).toBe('заброшен, не работаю');
      expect('salience' in (dvizh.body ?? {})).toBe(true); // F-B slot present…
      expect(dvizh.body?.salience).toBeNull(); // …and empty (no weight engine yet)

      // ── Typed edges are REAL: total 10, and they wire the day's real meaning.
      const view = dayGraphView(nodes);
      expect(view.edgeCount).toBe(DAY_GRAPH_EDGE_COUNT);
      expect(view.edgeCount).toBe(10);

      // эмоц-ресурс --affects--> движ · rentacar · спорт · документы (the condition-for-everything).
      const emo = byId.get(dayRef('эмоц-ресурс')) as EnvelopeNode;
      const affects = (emo.edges ?? []).filter((e) => e.predicate === 'affects').map((e) => e.target).sort();
      expect(affects).toEqual(
        [dayRef('движ'), dayRef('rentacar'), dayRef('спорт'), dayRef('документы')].sort(),
      );

      // график-приоритеты --organizes--> документы · спорт.
      const graf = byId.get(dayRef('график-приоритеты')) as EnvelopeNode;
      expect((graf.edges ?? []).filter((e) => e.predicate === 'organizes').map((e) => e.target).sort()).toEqual(
        [dayRef('документы'), dayRef('спорт')].sort(),
      );

      // близкие --involves--> дочь · брат · друг (referents → real person nodes; targets exist).
      const blizkie = byId.get(dayRef('близкие')) as EnvelopeNode;
      const involves = (blizkie.edges ?? []).filter((e) => e.predicate === 'involves').map((e) => e.target);
      expect(involves.sort()).toEqual([personRef('дочь'), personRef('брат'), personRef('друг')].sort());
      for (const t of involves) expect(byId.has(t)).toBe(true); // Ц6 referential integrity: no dangling edge

      // проект-сайт-женя --involves--> Женя.
      const zhenya = byId.get(dayRef('проект-сайт-женя')) as EnvelopeNode;
      expect((zhenya.edges ?? []).map((e) => e.target)).toEqual([personRef('Женя')]);

      // ── Render + print the real day-graph.
      const rendered = renderDayGraph(nodes);
      expect(rendered).toContain('Граф дня');
      expect(rendered).toContain('13 узлов · 10 рёбер');
      expect(rendered).toContain('○ Движ — blocked'); // cold thread, shown but marked
      expect(rendered).toContain('● Rentacar — active');
      expect(rendered).toContain('→ affects: Движ'); // typed edge rendered by target label
      expect(rendered).toContain('⚑ Условие (Эмоциональный ресурс):');
      expect(rendered).toContain('Люди:');

      // eslint-disable-next-line no-console
      console.log('\n' + rendered + '\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rebuild-from-journal is idempotent: a second write of the same day is a no-op (log does not grow)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-day-graph-idem-'));
    try {
      const writer = new DurableFsStore(dir, CONSTITUTION_BASE as any, DAY_PREDICATES);
      const engine = new Engine(writer, FIXED_POLICY);
      writeAllDayGraph(engine);
      const afterFirst = writer.acts().length;
      // Re-run with NO id-skip: the kernel content-hash dedup must swallow every re-write.
      const acks2 = writeAllDayGraph(engine);
      expect(acks2.every((a: { ok: boolean; dedup?: boolean }) => a.ok && a.dedup === true)).toBe(true);
      expect(writer.acts().length).toBe(afterFirst); // append-only log did NOT grow
      writer.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
