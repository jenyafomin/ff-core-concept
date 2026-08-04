/**
 * crash-mid-turn.test — S7 / GAP 1 ADVERSARIAL: does the durable journal survive a HARD kill mid-turn?
 *
 * WHY THIS TEST EXISTS (the gap the other durable tests do NOT cover):
 *   survive-turn.test + durable-reboot-matrix.test only ever exercise a GRACEFUL boundary — P1 finishes,
 *   calls store.close() (releasing the PID-lock), exits 0, THEN P2 boots. That proves "turn N's write is
 *   visible in turn N+1" but says NOTHING about the failure the project itself filed as a live bug:
 *   `gateway-agents-die-on-restart` — the gateway SIGKILLs the agent process MID-TURN, frequently BETWEEN
 *   the acts of one batch. SIGKILL cannot be trapped, so:
 *     - the `process.once('exit', close)` hook never runs  → the advisory PID-lock is orphaned (dead PID),
 *     - a write interrupted mid-append can leave a torn (half-written) trailing line in journal.jsonl.
 *
 *   This suite reproduces BOTH shapes of that crash and asserts the three recovery properties from the task:
 *     (a) the journal is not corrupted — a torn trailing line is dropped on the next boot,
 *     (b) every FSYNC'd act is still present; an interrupted act is absent (no half-applied partial batch),
 *     (c) a stale PID-lock from the dead process does NOT block the next process forever.
 *
 * These are REAL OS processes (spawn), not same-process rebuilds — nothing is shared but the store-dir.
 */
import { describe, it, expect } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HARNESS = fileURLToPath(new URL('./harness/crash-harness.ts', import.meta.url));
const ENGINE_DIR = fileURLToPath(new URL('..', import.meta.url)); // packages/engine — cwd so tsx resolves

/** Run the crash harness to completion in a fresh OS process (used for --write-clean and --verify). */
function runProcess(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['--import', 'tsx', HARNESS, ...args], { cwd: ENGINE_DIR, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** The LAST JSON object printed by --verify (the harness emits one JSON line). */
function parseVerify(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n').filter((l) => l.trim() !== '');
  return JSON.parse(lines[lines.length - 1]);
}

/** A guaranteed-dead PID: spawn a trivial process synchronously; once spawnSync returns, it has exited. */
function deadPid(): number {
  const r = spawnSync(process.execPath, ['-e', '0']);
  return r.pid ?? 999_999; // fallback to an implausible PID if the platform withholds it
}

/**
 * Spawn --write-then-hang, wait until it announces the act is FSYNC'd (the COMMITTED marker), then SIGKILL
 * it — a hard kill mid-turn with the lock still held and NO chance for the exit hook to run. Resolves once
 * the child is fully dead. Returns the child's PID so the test can assert the orphaned lock is its PID.
 */
function killMidTurn(dir: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', HARNESS, '--store-dir', dir, '--write-then-hang'], {
      cwd: ENGINE_DIR,
    });
    let buf = '';
    let killed = false;
    const bail = setTimeout(() => reject(new Error(`child never reported COMMITTED; stderr so far:\n${errbuf}`)), 20_000);
    let errbuf = '';
    child.stderr.on('data', (d) => (errbuf += String(d)));
    child.stdout.on('data', (d) => {
      buf += String(d);
      if (!killed && buf.includes('COMMITTED')) {
        killed = true;
        child.kill('SIGKILL'); // hard, uncatchable — the exit hook (store.close) will NOT run
      }
    });
    child.on('exit', (_code, signal) => {
      clearTimeout(bail);
      if (signal !== 'SIGKILL') return reject(new Error(`expected SIGKILL death, got signal=${signal}`));
      resolve(child.pid as number);
    });
    child.on('error', reject);
  });
}

describe('crash-mid-turn — durable journal survives a HARD kill mid-turn (S7 / GAP 1, adversarial)', () => {
  it('SIGKILL mid-turn: fsync\'d act survives, and the orphaned dead-PID lock does not block the next boot', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-crash-sigkill-'));
    try {
      const lockPath = join(dir, 'journal.jsonl.lock');

      const deadChildPid = await killMidTurn(dir);

      // The killed writer left its advisory lock behind (its exit hook never ran) — this is the (c) hazard.
      expect(existsSync(lockPath), 'SIGKILL should have orphaned the PID-lock (no exit hook ran)').toBe(true);
      expect(Number(readFileSync(lockPath, 'utf8').trim())).toBe(deadChildPid);

      // A brand-new process boots on the crash-littered store-dir.
      const v = parseVerify(runProcess(['--store-dir', dir, '--verify']).stdout);

      // (c) stale-lock does not block forever — the next process reclaimed the dead PID's lock and booted.
      expect(v.booted, `next boot failed: ${JSON.stringify(v)}`).toBe(true);
      // (b) the fsync'd act is durably present after a hard kill (fsync beat the SIGKILL).
      expect(v.foundA).toBe(true);
      expect(v.totalA).toBe(111);
      expect(v.actsLen).toBe(1);
      expect(v.actIds).toEqual(['act:crash-A']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('torn write + stale lock: the half-written trailing line is dropped, every committed act survives, no partial batch', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ff-crash-torn-'));
    try {
      const journalPath = join(dir, 'journal.jsonl');
      const lockPath = `${journalPath}.lock`;

      // Lay down TWO cleanly fsync'd acts, then exit 0 (lock released).
      const clean = runProcess(['--store-dir', dir, '--write-clean']);
      expect(clean.status, `write-clean failed. stderr:\n${clean.stderr}`).toBe(0);
      expect(JSON.parse(clean.stdout.trim().split('\n')[0]).acts).toBe(2);

      // Simulate a crash MID-APPEND of a THIRD act: a truncated JSON line with NO trailing newline — exactly
      // the shape of writeAct() being SIGKILLed after part of the line hit the page cache but before fsync.
      appendFileSync(journalPath, '{"id":"act:torn-C","actor":"sync:ga-rentacar","provenance":{"source_ref":"sheets:Ord');

      // And orphan a stale PID-lock from that dead writer (its exit hook never ran).
      writeFileSync(lockPath, String(deadPid()));

      const v = parseVerify(runProcess(['--store-dir', dir, '--verify']).stdout);

      // (c) stale lock (dead PID) reclaimed → boot succeeds, not blocked.
      expect(v.booted, `boot on torn journal failed: ${JSON.stringify(v)}`).toBe(true);
      // (a) the torn trailing line was dropped on hydrate — journal is not corrupted.
      // (b) both fsync'd acts survive; the interrupted act is absent — no half-applied partial batch.
      expect(v.actsLen).toBe(2);
      expect(v.actIds).toEqual(['act:clean-A', 'act:clean-B']);
      expect((v.actIds as string[])).not.toContain('act:torn-C');
      expect(v.foundA).toBe(true);
      expect(v.totalA).toBe(111);
      expect(v.foundB).toBe(true);
      expect(v.totalB).toBe(222);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
