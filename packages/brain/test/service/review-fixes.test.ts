// Fixes from review-acceptance (W1–W3, S1/S3/S4) and critic-live-run (F-5, F-7, F-8) — real service on a
// tmp home/socket (never ~/.ff-brain).
import { appendFileSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { BRAIN_HEADERS, CONTRACT_VERSION } from '../../src/contract.js';
import { BackupManager, listBackups, verifyBackup } from '../../src/service/backup.js';
import { keyedLetterHash, letterHash } from '../../src/service/friction.js';
import { RateLimiter } from '../../src/service/health.js';
import { MAX_BODY_BYTES } from '../../src/service/http.js';
import { nodeIo, repairTornTail, type DurableIo } from '../../src/service/journal.js';
import { argsHash } from '../../src/service/runtime.js';
import type { RunningBrain } from '../../src/service/server.js';
import { GROUP, THREAD_AGENTS, THREAD_BRAIN, UNKNOWN_CHAT, defaultReaders, makeBrainFixture, type BrainFixture } from '../support/brain-fixture.js';

import { BRAIN_ROUTES, client, makeHome, OWNER_ID, ownerClient, raw, recordsOfType, start, userRecords } from './_helpers.js';

let fx: BrainFixture | undefined;
let b: RunningBrain | undefined;
afterEach(async () => {
  await b?.stop();
  b = undefined;
  fx?.cleanup();
  fx = undefined;
});

const clock = { now: () => new Date('2026-10-09T09:00:00.000Z') };

/** Real fs, but every step is logged (name + basename) so the ORDER can be asserted. */
function spyIo(log: string[]): DurableIo {
  const n = (p: string) => p.split('/').pop()!;
  return {
    copy: (s, d) => (log.push(`copy ${n(s)}→${n(d)}`), nodeIo.copy(s, d)),
    rename: (f, t) => (log.push(`rename ${n(f)}→${n(t)}`), nodeIo.rename(f, t)),
    fsyncFile: (p) => (log.push(`fsync ${n(p)}`), nodeIo.fsyncFile(p)),
    fsyncDir: (p) => (log.push(`fsyncdir ${n(p)}`), nodeIo.fsyncDir(p)),
    cut: (p, len) => (log.push(`cut ${n(p)}`), nodeIo.cut(p, len)),
  };
}

describe('W1: evidence/backup copies are durable before the destructive step', () => {
  it('torn tail: copy → fsync copy → fsync dir → only then cut the journal', () => {
    fx = makeBrainFixture();
    writeFileSync(fx.journalPath, '{"a":1}\n{"torn');
    const log: string[] = [];
    const r = repairTornTail(fx.journalPath, fx.path('backups'), clock, spyIo(log));
    expect(r).not.toBeNull();
    const copy = r!.backupPath.split('/').pop()!;
    expect(log).toEqual([`copy journal.jsonl→${copy}`, `fsync ${copy}`, 'fsyncdir backups', 'cut journal.jsonl']);
    expect(readFileSync(r!.backupPath, 'utf8')).toBe('{"a":1}\n{"torn');
    expect(readFileSync(fx.journalPath, 'utf8')).toBe('{"a":1}\n');
    expect(statSync(r!.backupPath).mode & 0o777).toBe(0o600);
  });

  it('backup: tmp copy fsync’d → renamed → sidecar fsync’d → renamed → dir fsync’d; pruning only after', () => {
    fx = makeBrainFixture();
    writeFileSync(fx.journalPath, '{"a":1}\n');
    const log: string[] = [];
    const m = new BackupManager({ journalPath: fx.journalPath, dir: fx.path('backups'), clock, keep: 1, io: spyIo(log) });
    const first = m.run()!;
    const name = first.path.split('/').pop()!;
    expect(log).toEqual([
      `copy journal.jsonl→${name}.tmp`,
      `fsync ${name}.tmp`,
      'fsyncdir backups',
      `rename ${name}.tmp→${name}`,
      `fsync ${name}.sha256.tmp`,
      `rename ${name}.sha256.tmp→${name}.sha256`,
      'fsyncdir backups',
    ]);
    expect(verifyBackup(first.path)).toBe(true);
    const second = m.run()!; // keep:1 → the first is pruned, but only after the second is complete
    expect(listBackups(fx.path('backups'))).toEqual([second.path]);
    expect(verifyBackup(second.path)).toBe(true);
  });
});

describe('W2: idem is bound to the dialog server-side', () => {
  it('another dialog replaying the same client idem gets its OWN write, never the other dialog’s receipt', async () => {
    fx = makeHome();
    b = await start(fx);
    const idem = 'e'.repeat(64);
    const hdr = (conversation: string) => ({
      [BRAIN_HEADERS.conversationId]: conversation,
      [BRAIN_HEADERS.messageId]: '5',
      [BRAIN_HEADERS.senderId]: OWNER_ID,
      [BRAIN_HEADERS.idem]: idem,
    });
    const a = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'Секрет диалога А' }, { headers: hdr(`${GROUP}:56`) });
    const c = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'Заметка Б' }, { headers: hdr(THREAD_AGENTS) });
    expect(a.json.ok && c.json.ok).toBe(true);
    expect(c.json.id).not.toBe(a.json.id);
    expect(c.json.dedup).toBe(false);
    expect(c.json.receipt).not.toContain('Секрет');
    // the same dialog still dedups
    const a2 = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'Секрет диалога А' }, { headers: hdr(`${GROUP}:56`) });
    expect(a2.json).toMatchObject({ ok: true, id: a.json.id, dedup: true, warnings: [] });
  });

  it('the same idem for another verb → BAD_REQUEST, the index entry is not overwritten', async () => {
    fx = makeHome();
    b = await start(fx);
    const headers = {
      [BRAIN_HEADERS.conversationId]: `${GROUP}:56`,
      [BRAIN_HEADERS.messageId]: '6',
      [BRAIN_HEADERS.senderId]: OWNER_ID,
      [BRAIN_HEADERS.idem]: 'd'.repeat(64),
    };
    const r = await raw(fx, BRAIN_ROUTES.record, { type: 'task', label: 'X' }, { headers });
    const l = await raw(fx, BRAIN_ROUTES.link, { from: r.json.id, pred: 'about', to: r.json.id }, { headers });
    expect(l.json).toMatchObject({ ok: false, code: 'BAD_REQUEST' });
    const again = await raw(fx, BRAIN_ROUTES.record, { type: 'task', label: 'X' }, { headers });
    expect(again.json).toMatchObject({ ok: true, id: r.json.id, dedup: true });
  });
});

describe('W3: friction hashes are HMAC’d with the service secret', () => {
  it('secret is created 0600 next to the token and survives restarts; refusal friction = HMAC(args), letters only', async () => {
    fx = makeHome();
    b = await start(fx);
    const secretPath = join(fx.home, 'secret');
    const secret = readFileSync(secretPath, 'utf8').trim();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(statSync(secretPath).mode & 0o777).toBe(0o600);
    expect(secret).not.toBe(readFileSync(fx.path('token'), 'utf8').trim());

    const body = { type: 'note', label: '+79161234567' }; // a low-entropy body a dictionary could reverse
    const r = await client(fx, { conversation: UNKNOWN_CHAT, message: '1', sender: OWNER_ID }).record(body);
    expect(r).toMatchObject({ ok: false, code: 'DEFAULT_DENY' });
    const f = recordsOfType(b, 'friction').find((x) => x.fields.code === 'DEFAULT_DENY')!;
    expect(f.fields.hash).toBe(argsHash(body, secret));
    expect(f.fields.hash).toBe(keyedLetterHash(secret, JSON.stringify(body)));
    expect(f.fields.hash).not.toBe(letterHash(JSON.stringify(body))); // the unkeyed (reversible) form is gone
    expect(f.fields.hash).toMatch(/^[a-p]{20}$/);

    await b.stop();
    b = await start(fx);
    expect(readFileSync(secretPath, 'utf8').trim()).toBe(secret);
  });

  it('BAD_LINE friction stays deterministic (1 record over 2 restarts) with the keyed hash', async () => {
    fx = makeHome();
    b = await start(fx);
    await b.stop();
    appendFileSync(fx.journalPath, 'garbage {\n');
    b = await start(fx);
    await b.stop();
    b = await start(fx);
    expect(recordsOfType(b, 'friction').filter((x) => x.fields.code === 'BAD_LINE')).toHaveLength(1);
  });
});

describe('F-7 / F-8: the receipt the owner reads', () => {
  it('task → task’s own status; several scopes → all listed; same text on a post-restart replay', async () => {
    fx = makeHome();
    b = await start(fx);
    const c = client(fx, { conversation: GROUP, message: '10', sender: OWNER_ID });
    const r = await c.record({ type: 'task', label: 'Общая задача', scopes: ['brain', 'agents'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe('active'); // the record status on the wire is unchanged
    expect(r.receipt).toMatch(/^Записано: Общая задача → brain, agents · task\/open · #[a-z0-9]{6}$/);

    await b.stop();
    b = await start(fx);
    const replay = await client(fx, { conversation: GROUP, message: '10', sender: OWNER_ID }).record({
      type: 'task',
      label: 'Общая задача',
      scopes: ['brain', 'agents'],
    });
    expect(replay).toMatchObject({ ok: true, id: r.id, dedup: true, warnings: [], receipt: r.receipt });

    // a reader that sees only `agents` never gets the other scope's name in a receipt
    const ag = client(fx, { conversation: THREAD_AGENTS, message: '12', sender: OWNER_ID });
    const note = await ag.record({ type: 'note', label: 'Агентская', fields: { text: 'x' } });
    const l = await ag.link({ from: r.id, pred: 'about', to: note.ok ? note.id : '' });
    expect(l.ok && l.receipt).toMatch(/^Записано: Общая задача → agents · task\/active · #/);
  });

  it('readers.json lists scopes as SLUGS (real Stage-1 config) → the live receipt still names the scope', async () => {
    const readers = defaultReaders();
    readers.chats[THREAD_BRAIN] = { default_scope: 'brain', scopes: ['brain'] };
    fx = makeHome(readers);
    b = await start(fx);
    const r = await ownerClient(fx, '20').record({ type: 'note', label: 'Слаг-область', fields: { text: 'x' } });
    expect(r.ok && r.receipt).toMatch(/^Записано: Слаг-область → brain · note\/active · #[a-z0-9]{6}$/);
  });

  it('SLUG scopes → the link receipt names EVERY scope of the source record', async () => {
    const readers = defaultReaders();
    readers.chats[THREAD_BRAIN] = { default_scope: 'brain', scopes: ['brain', 'agents'] };
    fx = makeHome(readers);
    b = await start(fx);
    const r = await ownerClient(fx, '21').record({ type: 'note', label: 'Слаг-источник', scopes: ['brain', 'agents'], fields: { text: 'x' } });
    const n = await ownerClient(fx, '22').record({ type: 'note', label: 'Слаг-цель', fields: { text: 'y' } });
    expect(r.ok && n.ok).toBe(true);
    if (!r.ok || !n.ok) return;
    const l = await ownerClient(fx, '23').link({ from: r.id, pred: 'about', to: n.id });
    expect(l.ok && l.receipt).toMatch(/^Записано: Слаг-источник → brain, agents · note\/active · #/);
  });

  it('SLUG scopes → the idem replay after a restart repeats the same receipt (scope named)', async () => {
    const readers = defaultReaders();
    readers.chats[THREAD_BRAIN] = { default_scope: 'brain', scopes: ['brain'] };
    fx = makeHome(readers);
    b = await start(fx);
    const r = await ownerClient(fx, '24').record({ type: 'note', label: 'Слаг-повтор', fields: { text: 'x' } });
    expect(r.ok && r.receipt).toMatch(/^Записано: Слаг-повтор → brain · note\/active · #[a-z0-9]{6}$/);
    if (!r.ok) return;
    await b.stop();
    b = await start(fx);
    const replay = await ownerClient(fx, '24').record({ type: 'note', label: 'Слаг-повтор', fields: { text: 'x' } });
    expect(replay).toMatchObject({ ok: true, id: r.id, dedup: true, receipt: r.receipt });
  });
});

describe('S4: idem dedup after a restart keeps the original rev', () => {
  it('record (idem) → link from it → update → restart → replay → same rev as the first answer', async () => {
    fx = makeHome();
    b = await start(fx);
    const first = await ownerClient(fx, '300').record({ type: 'task', label: 'Ревизия' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const other = await ownerClient(fx, '301').record({ type: 'note', label: 'Другое', fields: { text: 'x' } });
    await ownerClient(fx, '302').link({ from: first.id, pred: 'about', to: other.ok ? other.id : '' });
    const upd = await ownerClient(fx, '303').record({ id: first.id, type: 'task', label: 'Ревизия 2' });
    expect(upd.ok && upd.rev).toBeGreaterThan(first.rev);

    await b.stop();
    b = await start(fx);
    const replay = await ownerClient(fx, '300').record({ type: 'task', label: 'Ревизия' });
    expect(replay).toMatchObject({ ok: true, id: first.id, rev: first.rev, dedup: true, receipt: first.receipt });
    expect(userRecords(b).find((x) => x.id === first.id)!.label).toBe('Ревизия 2');
  });
});

describe('S3: RateLimiter forgets idle dialogs', () => {
  it('a key with no hit in the last minute is dropped on the next sweep', () => {
    const rl = new RateLimiter(2);
    const t0 = 1_000_000;
    for (let i = 0; i < 50; i++) expect(rl.take(`chat:${i}`, t0)).toBe(true);
    expect(rl.size).toBe(50);
    expect(rl.take('chat:new', t0 + 61_000)).toBe(true);
    expect(rl.size).toBe(1);
    // limiting itself is unchanged
    expect(rl.take('chat:new', t0 + 61_001)).toBe(true);
    expect(rl.take('chat:new', t0 + 61_002)).toBe(false);
  });
});

describe('S1: an oversized body is refused without reading it', () => {
  interface PartialResult {
    status?: number;
    err?: string;
  }
  /**
   * POST that writes `times` chunks and NEVER ends the body. Resolves when the server drops the connection.
   * A server that kept consuming the body (the old behaviour) would keep this connection open → test timeout.
   */
  function partialPost(fxx: BrainFixture, headers: Record<string, string>, chunk: Buffer, times: number): Promise<PartialResult> {
    const token = readFileSync(fxx.path('token'), 'utf8').trim();
    return new Promise((resolve) => {
      const out: PartialResult = {};
      const req = request(
        {
          socketPath: fxx.path('socket'),
          path: BRAIN_ROUTES.record.path,
          method: 'POST',
          agent: false,
          headers: {
            [BRAIN_HEADERS.contractVersion]: String(CONTRACT_VERSION),
            [BRAIN_HEADERS.authorization]: `Bearer ${token}`,
            'content-type': 'application/json',
            ...headers,
          },
        },
        (res) => {
          out.status = res.statusCode ?? 0;
          res.resume();
        },
      );
      req.on('error', (e) => (out.err = (e as NodeJS.ErrnoException).code ?? e.message));
      req.on('close', () => resolve(out));
      for (let i = 0; i < times; i++) req.write(chunk);
    });
  }

  it('declared Content-Length over the limit → 413 before the body arrives, connection dropped', async () => {
    fx = makeHome();
    b = await start(fx);
    const r = await partialPost(fx, { 'content-length': String(10 * 1024 * 1024) }, Buffer.from('{"type":'), 1);
    expect(r.status).toBe(413);
  });

  it('a streamed (chunked) body crossing the limit → reading stops at the limit and the connection is dropped', async () => {
    fx = makeHome();
    b = await start(fx);
    const chunk = Buffer.alloc(64 * 1024, 0x20);
    const r = await partialPost(fx, { 'transfer-encoding': 'chunked' }, chunk, Math.ceil(MAX_BODY_BYTES / chunk.length) + 2);
    // node's client cannot always read an early answer while it is still writing: 413 or a reset, never a hang
    expect(r.status === 413 || r.err === 'EPIPE' || r.err === 'ECONNRESET').toBe(true);
    // the service is still healthy for the next caller
    const ok = await ownerClient(fx, '900').record({ type: 'note', label: 'после 413', fields: { text: 'x' } });
    expect(ok.ok).toBe(true);
  });
});
