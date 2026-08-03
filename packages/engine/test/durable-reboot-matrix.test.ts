/**
 * durable-reboot-matrix.test — S7 / GAP 1 durable matrix, Tests 2 & 3 (sealing-plan §2, C4 + C3).
 *
 * Companions to survive-turn.test (Test 1). Same discipline: a REAL OS-process boundary — P1 writes and
 * exits, P2 boots fresh on the same store-dir with nothing shared but the disk journal. These prove the
 * two properties Test 1 alone does not:
 *
 *   Test 2 (C4, AC-3) idempotent-reboot-reingest — a byte-identical domain_event re-written AFTER a reboot
 *          dedups against the DISK journal (not just an in-process array), and an observation appends clean.
 *   Test 3 (C3, AC-4) forward-monotone-rebuild-after-reboot — rebuild('journal') on P2 reproduces P1's
 *          incrementally-built projection bit-for-bit (ADR-0008: graph = deterministic projection of log).
 *
 * RED before store-durable-fs: MemoryStore's journal does not survive exit, so P2's `acts()`/rebuild see
 * an empty log — dedup cannot fire across the boundary and there is nothing to rebuild. GREEN once the
 * durable adapter mirrors the append-only journal to disk and re-folds it on boot.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HARNESS = fileURLToPath(new URL('./harness/survive-turn-harness.ts', import.meta.url));
const ENGINE_DIR = fileURLToPath(new URL('..', import.meta.url)); // packages/engine — cwd so tsx resolves

function runProcess(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['--import', 'tsx', HARNESS, ...args], { cwd: ENGINE_DIR, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

describe('Test 2 — idempotent re-ingest survives a reboot (C4 / AC-3)', () => {
  it('a byte-identical domain_event re-written in P2 dedups against the DISK journal; observation appends', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-reboot-dedup-'));
    try {
      // P1: one durable domain_event, then exit.
      const p1 = runProcess(['--store-dir', dir, '--write']);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      expect(JSON.parse(p1.stdout).ack.ok).toBe(true);

      // P2: fresh process, boots from disk, re-writes the SAME act + an observation.
      const p2 = runProcess(['--store-dir', dir, '--reingest']);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);

      expect(r.dedup).toBe(true);              // the identical re-write was recognized ACROSS the reboot
      expect(r.subjectDomainEvents).toBe(1);   // NOT 2 — the journal did not grow a duplicate
      expect(r.observations).toBe(1);          // the observation appended untouched
      expect(r.totalActs).toBe(2);             // exactly [domain_event, observation]
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Test 3 — rebuild-from-journal on P2 reproduces P1 bit-for-bit (C3 / AC-4)', () => {
  it('P2 rebuild(journal) deep-equals P1 final projection (via a disk control snapshot, not shared memory)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-reboot-monotone-'));
    const snap = join(dir, 'p1-projection.snapshot.json');
    try {
      // P1: write a series with a late supersede, snapshot its final projection to a control file, exit.
      const p1 = runProcess(['--store-dir', dir, '--write-series', '--snapshot', snap]);
      expect(p1.status, `P1 failed. stderr:\n${p1.stderr}`).toBe(0);
      const w = JSON.parse(p1.stdout);
      expect(w.acts).toBe(4);                  // all four acts durably journaled
      expect(w.snapshotLen).toBeGreaterThan(0);

      // P2: fresh process, boot from disk, rebuild('journal'), compare to P1's control snapshot.
      const p2 = runProcess(['--store-dir', dir, '--rebuild-verify', '--snapshot', snap]);
      expect(p2.status, `P2 failed. stderr:\n${p2.stderr}`).toBe(0);
      const r = JSON.parse(p2.stdout);
      expect(r.match).toBe(true);              // bit-for-bit identical projection after reboot+rebuild
      expect(r.p2Len).toBe(r.p1Len);           // (sanity: same serialized length)
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
