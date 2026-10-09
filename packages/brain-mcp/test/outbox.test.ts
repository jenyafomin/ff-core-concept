// R-8 / AC-27 (client side): service down → find SERVICE_DOWN (no throw); record → outbox 0600 + queued;
// on the first successful call the outbox is drained with the SAME idem and the file is removed.
import { chmodSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { BrainClient } from '../src/client.js';
import { BRAIN_HEADERS, LIMITS, type OutboxEntry } from '../src/contract.js';
import { computeIdem } from '../src/ordinal.js';
import { ENV, makeHome, startFakeBrain } from './support/fake-brain.js';

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

function home() {
  const h = makeHome();
  cleanups.push(h.cleanup);
  return h;
}

describe('service down', () => {
  it('find/read/link → readable SERVICE_DOWN, no throw, no outbox', async () => {
    const h = home(); // no server listening on h.socket
    const client = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    for (const r of [
      await client.find({ preset: 'morning' }),
      await client.read({ id: 'u_x' }),
      await client.link({ from: 'u_a', pred: 'p', to: 'u_b' }),
    ]) {
      expect(r.ok).toBe(false);
      if (r.ok) continue;
      expect(r.code).toBe('SERVICE_DOWN');
      expect(r.message).toMatch(/недоступна/);
      expect(r.hint.length).toBeGreaterThan(0);
      expect(r.queued).toBeUndefined();
    }
    expect(client.outbox.list()).toHaveLength(0);
  });

  it('oversized record → final PAYLOAD_TOO_LARGE before sending: not parked, not SERVICE_DOWN (service down or up)', async () => {
    const h = home();
    const big = { type: 'note', label: 'Большая', fields: { text: 'x'.repeat(LIMITS.requestBodyMaxBytes) } };
    const down = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    const r = await down.record(big);
    expect(r).toMatchObject({ ok: false, code: 'PAYLOAD_TOO_LARGE' });
    expect(!r.ok && r.queued).toBeFalsy();
    expect(down.outbox.list()).toHaveLength(0);

    const fake = await startFakeBrain(h.socket);
    cleanups.push(fake.close);
    const up = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    expect(await up.record(big)).toMatchObject({ ok: false, code: 'PAYLOAD_TOO_LARGE' });
    expect(fake.seen).toHaveLength(0); // never reached the wire
    expect(up.outbox.list()).toHaveLength(0);
  });

  it('missing token is also SERVICE_DOWN', async () => {
    const h = home();
    const client = new BrainClient({ env: ENV(h.home), paths: { token: join(h.home, 'nope') } });
    const r = await client.find({});
    expect(r.ok === false && r.code).toBe('SERVICE_DOWN');
  });

  it('record → outbox file 0600 named by idem, answer queued (never ok:true)', async () => {
    const h = home();
    const client = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    const r = await client.record({ type: 'task', label: 'Подключить devops 443' });
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ ok: false, code: 'SERVICE_DOWN', queued: true });
    const idem = computeIdem('-1004351636302:56', '777', 'record', 1)!;
    const dir = join(h.home, 'outbox');
    expect(readdirSync(dir)).toEqual([`${idem}.json`]);
    const file = join(dir, `${idem}.json`);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const entry = JSON.parse(readFileSync(file, 'utf8')) as OutboxEntry;
    expect(entry.verb).toBe('record');
    expect(entry.caller.idem).toBe(idem);
    expect(entry.caller.sender_id).toBe('1112667160');
    expect(entry.request).toEqual({ type: 'task', label: 'Подключить devops 443' });
  });

  it('service comes up → first call drains the outbox with the same idem, then deletes the file', async () => {
    const h = home();
    const turn1 = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    await turn1.record({ type: 'task', label: 'queued one' });
    const idem = computeIdem('-1004351636302:56', '777', 'record', 1)!;

    const fake = await startFakeBrain(h.socket);
    cleanups.push(fake.close);
    // a later turn (other message) — its own call succeeds, then the outbox goes out
    const turn2 = new BrainClient({ env: ENV(h.home, { FF_BRAIN_MESSAGE_ID: '778' }) });
    const r = await turn2.find({ text: 'x' });
    expect(r.ok).toBe(true);

    const replays = fake.seen.filter((s) => s.path === '/v1/record');
    expect(replays).toHaveLength(1);
    expect(replays[0]!.headers[BRAIN_HEADERS.idem]).toBe(idem);
    expect(replays[0]!.headers[BRAIN_HEADERS.messageId]).toBe('777'); // original identity, re-checked by service
    expect(replays[0]!.body).toEqual({ type: 'task', label: 'queued one' });
    expect(turn2.outbox.list()).toHaveLength(0);

    await turn2.find({ text: 'y' }); // nothing left to resend
    expect(fake.seen.filter((s) => s.path === '/v1/record')).toHaveLength(1);
  });

  it('a refused replay is still removed (service answered); unreachable keeps it', async () => {
    const h = home();
    const c = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    await c.record({ type: 'task', label: 'q' });
    await c.drain(); // still down → kept
    expect(c.outbox.list()).toHaveLength(1);
    const fake = await startFakeBrain(h.socket, (s) =>
      s.path === '/v1/record' ? { ok: false, code: 'SENDER_DENIED', message: 'm', hint: 'h' } : { ok: true },
    );
    cleanups.push(fake.close);
    await c.find({});
    expect(c.outbox.list()).toHaveLength(0);
  });

  it.each(['INTERNAL', 'UNAUTHORIZED', 'RATE_LIMITED', 'SERVICE_DOWN'])(
    'a transient %s replay answer keeps the parked record (review MAJOR 3)',
    async (code) => {
      const h = home();
      const c = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
      await c.record({ type: 'task', label: 'q' });
      expect(c.outbox.list()).toHaveLength(1);
      const fake = await startFakeBrain(h.socket, (s) =>
        s.path === '/v1/record' ? { ok: false, code, message: 'm', hint: 'h' } : { ok: true },
      );
      cleanups.push(fake.close);
      await c.find({});
      expect(fake.seen.filter((s) => s.path === '/v1/record')).toHaveLength(1);
      expect(c.outbox.list()).toHaveLength(1);
    },
  );

  it('an accepted replay removes the parked record', async () => {
    const h = home();
    const c = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    await c.record({ type: 'task', label: 'q' });
    const fake = await startFakeBrain(h.socket, () => ({ ok: true }));
    cleanups.push(fake.close);
    await c.find({});
    expect(c.outbox.list()).toHaveLength(0);
  });

  it('outbox dir is 0700 even if it pre-existed with a looser mode (review MINOR 5)', async () => {
    const h = home();
    const c = new BrainClient({ env: ENV(h.home), timeoutMs: 500 });
    mkdirSync(c.outbox.dir, { recursive: true, mode: 0o755 });
    chmodSync(c.outbox.dir, 0o755);
    await c.record({ type: 'task', label: 'q' });
    expect(statSync(c.outbox.dir).mode & 0o777).toBe(0o700);
  });
});
