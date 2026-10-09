// The serve binary as a real OS process (AC-17 kill -9, AC-20 lock + SIGTERM). Runs src via tsx, so it
// needs no build; the dist variant is the manual AC-22 check (SPEC §5).
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { BrainService } from '../../src/service/runtime.js';
import type { BrainFixture } from '../support/brain-fixture.js';

import { makeHome, ownerClient } from './_helpers.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVE = join(PKG, 'src', 'bin', 'ff-brain-serve.ts');

let fx: BrainFixture | undefined;
const children: ChildProcess[] = [];
afterEach(() => {
  for (const c of children.splice(0)) if (c.exitCode === null && c.signalCode === null) c.kill('SIGKILL');
  fx?.cleanup();
  fx = undefined;
});

interface Served {
  child: ChildProcess;
  stdout: () => string;
  stderr: () => string;
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
}

function serve(home: string): Served {
  const child = spawn(process.execPath, ['--import', 'tsx', SERVE], {
    cwd: PKG,
    env: { ...process.env, FF_BRAIN_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let out = '';
  let err = '';
  child.stdout!.on('data', (d: Buffer) => (out += d.toString()));
  child.stderr!.on('data', (d: Buffer) => (err += d.toString()));
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) =>
    child.on('exit', (code, signal) => resolve({ code, signal })),
  );
  return { child, stdout: () => out, stderr: () => err, exited };
}

async function ready(s: Served, timeoutMs = 15_000): Promise<void> {
  const t0 = Date.now();
  while (!s.stdout().includes('ff-brain ready')) {
    if (s.child.exitCode !== null) throw new Error(`serve exited early: ${s.stderr()}`);
    if (Date.now() - t0 > timeoutMs) throw new Error(`serve not ready: ${s.stderr()}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe('serve process', () => {
  it('AC-20: a second instance fails on the lock with a readable error; SIGTERM releases the lock and the socket', async () => {
    fx = makeHome();
    const first = serve(fx.home);
    await ready(first);
    const lock = `${fx.journalPath}.lock`;
    expect(readFileSync(lock, 'utf8').trim()).toBe(String(first.child.pid));

    const second = serve(fx.home);
    const r2 = await second.exited;
    expect(r2.code).toBe(1);
    expect(second.stderr()).toMatch(/already running \(pid \d+ holds the lock/);
    expect(existsSync(lock)).toBe(true); // the loser did not touch the winner's lock

    first.child.kill('SIGTERM');
    const r1 = await first.exited;
    expect(r1.code).toBe(0);
    expect(existsSync(lock)).toBe(false);
    expect(existsSync(fx.path('socket'))).toBe(false);

    const third = serve(fx.home); // the lock is free again
    await ready(third);
    third.child.kill('SIGTERM');
    expect((await third.exited).code).toBe(0);
  });

  it('AC-17: kill -9 right after ok:true → the act is in the journal and survives the restart', async () => {
    fx = makeHome();
    const s = serve(fx.home);
    await ready(s);
    const r = await ownerClient(fx).record({ type: 'task', label: 'Переживёт kill -9' });
    s.child.kill('SIGKILL');
    await s.exited;
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(readFileSync(fx.journalPath, 'utf8')).toContain(`"source_ref":"${r.id}"`);

    // the dead pid's lock is stale → reclaimed; the record is in the projection
    const svc = BrainService.open({ home: fx.home, nightlyBackup: false, backupEveryMs: 0 });
    try {
      await svc.ready;
      expect(svc.brain.store.readNode(r.id)).not.toBeNull();
    } finally {
      await svc.close();
    }
  });
});
