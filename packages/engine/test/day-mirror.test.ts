/**
 * day-mirror.test — the first real code-grain of the arc, sealed green: the owner's REAL day-nodes are
 * written as `observation` acts into a DURABLE store, survive a store REBOOT (read back off disk), and the
 * «зеркало дня» lens renders them. Mirrors cli-durable.test's real-persistence discipline (write → close →
 * fresh store over the same dir → read off disk), the difference being the read-back is a lens over the
 * durable LOG (observations are a side-journal, they never project into graph nodes).
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain-JS seed module (shared with scripts/day-mirror.mjs), no types.
import { CONSTITUTION_BASE, OWNER_DAY_NODES, writeAllDayNodes } from '../scripts/day-seed.mjs';
import { DurableFsStore, Engine, FIXED_POLICY, type Act } from '../src/index.js';
import { renderDayMirror, dayMirrorRows } from '../src/surface/day-mirror.js';

describe('day-mirror — write real day-nodes to durable memory, read them back with a lens', () => {
  it('all owner day-nodes are admitted, persist across a reboot, and render as the mirror', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-day-mirror-'));
    try {
      // ── P1: write the owner's day as observation acts, durably. Each must pass the admission gate.
      const writer = new DurableFsStore(dir, CONSTITUTION_BASE as any);
      const engine = new Engine(writer, FIXED_POLICY);
      const acks = writeAllDayNodes(engine);
      expect(acks.every((a: { ok: boolean }) => a.ok)).toBe(true);
      expect(acks.length).toBe(OWNER_DAY_NODES.length); // all 9
      writer.close(); // fsync'd; release the single-writer lock

      // On-disk proof: journal.jsonl exists and holds one line per written act.
      const journalPath = join(dir, 'journal.jsonl');
      expect(existsSync(journalPath)).toBe(true);
      const lines = readFileSync(journalPath, 'utf8').trim().split('\n').filter(Boolean);
      expect(lines.length).toBe(OWNER_DAY_NODES.length);

      // ── P2: a FRESH store over the same dir — nothing shared but the disk. It reads the acts off disk.
      const reboot = new DurableFsStore(dir, CONSTITUTION_BASE as any);
      const acts = reboot.acts();
      reboot.close();

      const observations = acts.filter((a: Act) => a.actKind === 'observation');
      expect(observations.length).toBe(OWNER_DAY_NODES.length); // survived the process/store boundary

      // actor=owner on every act; referent carried where a person is named (Ц7 form, not enforced).
      expect(observations.every((a: Act) => a.actor === 'owner')).toBe(true);
      const byNode = new Map(observations.map((a: Act) => [(a.payload as any).node, a.payload as any]));
      expect(byNode.get('проект-сайт-женя').referent).toEqual(['Женя']);
      expect(byNode.get('близкие').referent).toEqual(['дочь', 'брат', 'друг']);

      // ── The lens: rows ranked by recency (recordedAt non-increasing), statuses preserved.
      const rows = dayMirrorRows(acts);
      expect(rows.length).toBe(OWNER_DAY_NODES.length);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i - 1].lastTouched >= rows[i].lastTouched).toBe(true); // freshest-first (proxy)
      }
      // blocked → cold (○); active/draft → not cold (●).
      expect(rows.find((r) => r.node === 'движ')!.cold).toBe(true);
      expect(rows.find((r) => r.node === 'память-ff')!.cold).toBe(true);
      expect(rows.find((r) => r.node === 'rentacar')!.cold).toBe(false);
      expect(rows.find((r) => r.node === 'документы')!.cold).toBe(false);

      // ── Render + print the real mirror.
      const mirror = renderDayMirror(acts);
      expect(mirror).toContain('Зеркало дня');
      expect(mirror).toContain('○ Движ — blocked'); // shown, but marked
      expect(mirror).toContain('● Rentacar — active');
      expect(mirror).toContain('↳ referent: Женя');
      expect(mirror).toContain('⚑ Условие (эмоц-ресурс):'); // the condition-line, shown not gated
      // эмоц-ресурс is NOT in the ranked list (it is the standalone condition-line).
      expect(mirror).not.toMatch(/● Эмоциональный ресурс —/);

      // eslint-disable-next-line no-console
      console.log('\n' + mirror + '\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
