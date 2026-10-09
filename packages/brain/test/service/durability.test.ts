// Journal durability + the write queue (AC-15…17, AC-19, AC-21) — real service on a tmp socket.
import { appendFileSync, copyFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { listBackups, verifyBackup } from '../../src/service/backup.js';
import { BrainService } from '../../src/service/runtime.js';
import type { RunningBrain } from '../../src/service/server.js';
import { CLI_CWD, GROUP, type BrainFixture } from '../support/brain-fixture.js';

import { client, makeHome, ownerClient, recordsOfType, start, userRecords } from './_helpers.js';

let fx: BrainFixture | undefined;
let fx2: BrainFixture | undefined;
let b: RunningBrain | undefined;
afterEach(async () => {
  await b?.stop();
  b = undefined;
  fx?.cleanup();
  fx2?.cleanup();
  fx = fx2 = undefined;
});

describe('write queue (AC-19)', () => {
  it('2 clients × 100 record → 200 acts, 0 errors (no lock errors); restart → projection deep-equal', async () => {
    fx = makeHome();
    b = await start(fx, { rateLimitPerMinute: 1000 });
    const before = b.service.brain.store.acts().length;
    const c1 = ownerClient(fx, '5001');
    const c2 = ownerClient(fx, '5002', GROUP);
    // two clients interleave concurrently; each one is sequential like an MCP process (one tool call at a time)
    const run = async (n: number, call: (i: number) => ReturnType<typeof c1.record>) => {
      const out = [];
      for (let i = 0; i < n; i++) out.push(await call(i));
      return out;
    };
    const [r1, r2] = await Promise.all([
      run(100, (i) => c1.record({ type: 'task', label: `c1-${i}` })),
      run(100, (i) => c2.record({ type: 'note', label: `c2-${i}`, scopes: ['agents'] })),
    ]);
    const all = [...r1, ...r2];
    expect(all.filter((r) => !r.ok)).toEqual([]);
    expect(new Set(all.map((r) => (r.ok ? r.id : ''))).size).toBe(200);
    const fs = b.service.brain.store;
    expect(fs.acts().length - before).toBe(200);
    expect(userRecords(b)).toHaveLength(200);
    const projection = structuredClone(fs.load());

    await b.stop();
    b = await start(fx);
    expect(b.service.brain.store.load()).toEqual(projection);
    expect(b.service.brain.genesisWritten).toBe(0);
  });
});

describe('journal hygiene (AC-15, AC-16, AC-17)', () => {
  it('AC-17: ok:true only after writeAct — the act is on disk when the answer arrives', async () => {
    fx = makeHome();
    b = await start(fx);
    const r = await ownerClient(fx).record({ type: 'task', label: 'Долговечно' });
    expect(r.ok).toBe(true);
    // read the FILE (not the in-memory journal) synchronously right after the answer
    const onDisk = readFileSync(fx.journalPath, 'utf8');
    expect(onDisk).toContain(`"source_ref":"${r.ok ? r.id : ''}"`);
    expect(onDisk.endsWith('\n')).toBe(true);
  });

  it('AC-16: torn tail → copy in backups/, truncated to the last \\n; a new write after restart lands cleanly', async () => {
    fx = makeHome();
    b = await start(fx);
    const a = await ownerClient(fx).record({ type: 'task', label: 'До обрыва' });
    await b.stop();
    b = undefined;
    const intact = readFileSync(fx.journalPath, 'utf8');
    appendFileSync(fx.journalPath, '{"id":"a_torn","actor":"user:ow');

    b = await start(fx);
    expect(b.service.tornTail).not.toBeNull();
    const torn = readdirSync(fx.path('backups')).filter((f) => f.startsWith('journal-torn-'));
    expect(torn).toHaveLength(1);
    expect(readFileSync(join(fx.path('backups'), torn[0]!), 'utf8')).toBe(`${intact}{"id":"a_torn","actor":"user:ow`);
    expect(readFileSync(fx.journalPath, 'utf8').startsWith(intact)).toBe(true);
    expect(b.service.brain.store.badLineCount).toBe(0);

    const c = await ownerClient(fx, '2').record({ type: 'task', label: 'После обрыва' });
    expect(c.ok).toBe(true);
    await b.stop();
    b = await start(fx);
    const labels = userRecords(b).map((x) => x.label).sort();
    expect(labels).toEqual(['До обрыва', 'После обрыва']);
    expect(a.ok).toBe(true);
    expect(readFileSync(fx.journalPath, 'utf8')).not.toContain('a_torn');
    expect((await b.service.health()).bad_lines).toBe(0);
  });

  it('AC-15: a bad line mid-journal → start ok, acts before/after alive, bad_lines=1, exactly 1 friction over 2 restarts', async () => {
    fx = makeHome();
    b = await start(fx);
    await ownerClient(fx).record({ type: 'task', label: 'До' });
    await b.stop();
    appendFileSync(fx.journalPath, 'this is {not json\n');
    b = await start(fx);
    expect((await b.service.health()).bad_lines).toBe(1);
    await ownerClient(fx, '2').record({ type: 'task', label: 'После' });
    await b.stop();

    b = await start(fx); // restart #2 over the same bad line
    const h = await b.service.health();
    expect(h.bad_lines).toBe(1);
    expect(userRecords(b).map((x) => x.label).sort()).toEqual(['До', 'После']);
    const bad = recordsOfType(b, 'friction').filter((f) => f.fields.code === 'BAD_LINE');
    expect(bad).toHaveLength(1);
    expect(bad[0]!.fields.count).toBe(1);
    expect(JSON.stringify(b.service.brain.store.acts())).not.toContain('not json'); // hash only, no body
    expect(bad[0]!.visibility).toBe('owner');
  });
});

describe('backups (AC-21)', () => {
  it('backup is queued, has a valid .sha256, ends on a valid line; restoring it gives an identical projection', async () => {
    fx = makeHome();
    b = await start(fx);
    const c = ownerClient(fx);
    for (let i = 0; i < 5; i++) await c.record({ type: 'task', label: `b${i}` });
    // a write and a backup queued together: the backup still ends on a complete line
    const [, first] = await Promise.all([c.record({ type: 'note', label: 'в очереди' }), b.service.backupNow()]);
    expect(first && verifyBackup(first.path)).toBe(true);
    const bk = await b.service.backupNow();
    expect(bk).not.toBeNull();
    expect(verifyBackup(bk!.path)).toBe(true);
    const text = readFileSync(bk!.path, 'utf8');
    expect(text.endsWith('\n')).toBe(true);
    const lines = text.trimEnd().split('\n');
    expect(() => JSON.parse(lines[lines.length - 1]!)).not.toThrow();
    const projection = structuredClone(b.service.brain.store.load());
    await b.stop();
    b = undefined;

    fx2 = makeHome();
    copyFileSync(bk!.path, fx2.journalPath);
    const restored = BrainService.open({ home: fx2.home, nightlyBackup: false, backupEveryMs: 0 });
    try {
      await restored.ready;
      expect(restored.brain.genesisWritten).toBe(0);
      expect(restored.brain.store.load()).toEqual(projection);
    } finally {
      await restored.close();
    }
  });

  it('a backup at start, then every N acts; only the newest 14 are kept', async () => {
    fx = makeHome();
    b = await start(fx, { backupEveryActs: 2, rateLimitPerMinute: 1000 });
    expect(listBackups(fx.path('backups'))).toHaveLength(1); // start
    const c = client(fx, { cwd: CLI_CWD });
    for (let i = 0; i < 4; i++) await c.record({ type: 'note', label: `n${i}`, scopes: ['brain'] });
    expect(listBackups(fx.path('backups'))).toHaveLength(3);
    for (let i = 0; i < 30; i++) await c.record({ type: 'note', label: `m${i}`, scopes: ['brain'] });
    const kept = listBackups(fx.path('backups'));
    expect(kept).toHaveLength(14);
    for (const k of kept) expect(existsSync(`${k}.sha256`)).toBe(true);
    expect(readdirSync(fx.path('backups')).filter((f) => f.endsWith('.sha256'))).toHaveLength(14);
  });
});
