// E2E: the REAL brain-mcp client → the REAL service on a tmp unix socket (AC-01…06, AC-23, AC-28).
import { statSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { BRAIN_HEADERS, formatReceipt, type ReadersFile } from '../../src/contract.js';
import type { RunningBrain } from '../../src/service/server.js';
import { CLI_CWD, defaultReaders, GROUP, STRANGER_ID, UNKNOWN_CHAT, type BrainFixture } from '../support/brain-fixture.js';

import {
  BRAIN_ROUTES,
  client,
  makeHome,
  OWNER_ID,
  ownerClient,
  ownerHeaders,
  raw,
  recordsOfType,
  start,
  THREAD_BRAIN,
  userRecords,
} from './_helpers.js';

let fx: BrainFixture;
let b: RunningBrain;
afterEach(async () => {
  await b?.stop();
  fx?.cleanup();
});

const frictions = (br: RunningBrain) => recordsOfType(br, 'friction');

describe('isolation e2e (AC-01…06)', () => {
  it('AC-02/AC-04/AC-28: owner in an allowlisted topic writes to default_scope and gets a server receipt', async () => {
    fx = makeHome();
    b = await start(fx);
    const c = ownerClient(fx);
    const r = await c.record({ type: 'task', label: 'Подключить devops 443' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.status).toBe('active');
    // F-7: the record is active, but the owner reads the TASK's status
    expect(r.receipt).toMatch(/^Записано: Подключить devops 443 → brain · task\/open · #[a-z0-9]{6}$/);

    const f = await c.find({ text: 'devops' });
    expect(f.ok && f.items.map((i) => i.id)).toEqual([r.id]);
    expect(f.ok && f.items[0]!.scopes).toEqual(['scope:brain']);

    const rd = await c.read({ id: r.id });
    expect(rd.ok && rd.node.label).toBe('Подключить devops 443');

    const other = await c.record({ type: 'note', label: 'Другая', fields: { text: 'x' } });
    expect(other.ok).toBe(true);
    const l = await c.link({ from: r.id, pred: 'about', to: other.ok ? other.id : '' });
    expect(l.ok).toBe(true);
    if (l.ok) {
      expect(l.receipt).toBe(formatReceipt({ label: 'Подключить devops 443', scope: 'brain', type: 'task', status: 'active', id: l.edge_id }));
    }
  });

  it('AC-45/AC-28: initiative agent → proposed, and the receipt says so', async () => {
    fx = makeHome();
    b = await start(fx);
    const r = await ownerClient(fx).record({ type: 'task', label: 'Предложение агента', initiative: 'agent' });
    expect(r.ok && r.status).toBe('proposed');
    expect(r.ok && r.receipt).toContain('task/proposed');
  });

  it('AC-01: chat not in readers.json → 403 DEFAULT_DENY + one body-less friction', async () => {
    fx = makeHome();
    b = await start(fx);
    const c = client(fx, { conversation: UNKNOWN_CHAT, message: '7', sender: OWNER_ID });
    const r = await c.record({ type: 'note', label: 'СЕКРЕТНЫЙ-ЯРЛЫК' });
    expect(r).toMatchObject({ ok: false, code: 'DEFAULT_DENY' });
    expect(!r.ok && r.hint).toBeTruthy();
    const f = await c.find({});
    expect(f).toMatchObject({ ok: false, code: 'DEFAULT_DENY' });

    const http = await raw(fx, BRAIN_ROUTES.find, {}, { headers: { [BRAIN_HEADERS.conversationId]: UNKNOWN_CHAT, [BRAIN_HEADERS.senderId]: OWNER_ID } });
    expect(http.status).toBe(403);

    expect(userRecords(b)).toHaveLength(0);
    const fr = frictions(b).filter((x) => x.fields.code === 'DEFAULT_DENY');
    expect(fr.length).toBeGreaterThanOrEqual(1);
    const journal = JSON.stringify(b.service.brain.store.acts());
    expect(journal).not.toContain('СЕКРЕТНЫЙ-ЯРЛЫК'); // code + hash only, never the body
    const allowed = new Set(['code', 'count', 'hash', 'verb', 'status', 'type', 'readable_by']);
    expect(Object.keys(fr[0]!.fields).filter((k) => !allowed.has(k))).toEqual([]);
    expect(fr[0]!.fields).toMatchObject({ code: 'DEFAULT_DENY', verb: 'record' });
    expect(fr[0]!.fields.hash).toMatch(/^[a-p]{20}$/);
  });

  it('AC-03: allowed chat + foreign or empty sender → SENDER_DENIED for all four verbs', async () => {
    fx = makeHome();
    b = await start(fx);
    for (const sender of [STRANGER_ID, undefined]) {
      const c = client(fx, { conversation: THREAD_BRAIN, message: '9', ...(sender ? { sender } : {}) });
      for (const res of [
        await c.record({ type: 'note', label: 'x' }),
        await c.find({}),
        await c.read({ id: 'u_abc' }),
        await c.link({ from: 'u_abc', pred: 'about', to: 'u_def' }),
      ]) {
        expect(res).toMatchObject({ ok: false, code: 'SENDER_DENIED' });
      }
    }
    expect(userRecords(b)).toHaveLength(0);
  });

  it('AC-04: no `chat:thread` key → the `chat` key applies (its default_scope)', async () => {
    const readers: ReadersFile = defaultReaders();
    readers.chats[GROUP]!.default_scope = 'scope:agents';
    fx = makeHome(readers);
    b = await start(fx);
    const r = await ownerClient(fx, '1', `${GROUP}:777`).record({ type: 'note', label: 'Из неизвестного топика' });
    expect(r.ok).toBe(true);
    const rec = userRecords(b)[0]!;
    expect(rec.scopes).toEqual(['scope:agents']);
  });

  it('AC-05: no conversation id → cwd in readers.cli gets its scopes; any other cwd → DEFAULT_DENY', async () => {
    fx = makeHome();
    b = await start(fx);
    const cli = client(fx, { cwd: CLI_CWD });
    const r = await cli.record({ type: 'note', label: 'Из CLI', scopes: ['brain'] });
    expect(r.ok).toBe(true);
    const f = await cli.find({});
    expect(f.ok && f.items).toHaveLength(1);
    const other = client(fx, { cwd: '/tmp/somewhere-else' });
    expect(await other.find({})).toMatchObject({ ok: false, code: 'DEFAULT_DENY' });
    expect(await other.record({ type: 'note', label: 'нет' })).toMatchObject({ ok: false, code: 'DEFAULT_DENY' });
  });

  it('AC-06: identity fields in the body → 400 IDENTITY_FIELD (every verb), nothing written', async () => {
    fx = makeHome();
    b = await start(fx);
    for (const [route, body] of [
      [BRAIN_ROUTES.record, { type: 'note', label: 'x', author: 'user:evil' }],
      [BRAIN_ROUTES.record, { type: 'note', label: 'x', conversationId: '-1' }],
      [BRAIN_ROUTES.find, { principal: 'user:owner' }],
      [BRAIN_ROUTES.read, { id: 'u_x', sender: OWNER_ID }],
      [BRAIN_ROUTES.link, { from: 'u_a', pred: 'about', to: 'u_b', sender_id: OWNER_ID }],
    ] as const) {
      const r = await raw(fx, route, body, { headers: ownerHeaders() });
      expect(r.status).toBe(400);
      expect(r.json).toMatchObject({ ok: false, code: 'IDENTITY_FIELD' });
      expect(r.json.message && r.json.hint).toBeTruthy();
    }
    // also through the real client (the agent cannot smuggle identity via args)
    const viaClient = await ownerClient(fx).record({ type: 'note', label: 'x', sender: 'me' } as never);
    expect(viaClient).toMatchObject({ ok: false, code: 'IDENTITY_FIELD' });
    expect(userRecords(b)).toHaveLength(0);
  });
});

describe('transport (AC-23)', () => {
  it('bad/missing token → 401; socket and token are 0600', async () => {
    fx = makeHome();
    b = await start(fx);
    const bad = await raw(fx, BRAIN_ROUTES.health, {}, { token: 'nope' });
    expect(bad.status).toBe(401);
    expect(bad.json).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
    const none = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'x' }, { token: null, headers: ownerHeaders() });
    expect(none.status).toBe(401);
    expect(userRecords(b)).toHaveLength(0);

    const good = await raw(fx, BRAIN_ROUTES.health, {});
    expect(good.status).toBe(200);
    expect(good.json).toMatchObject({ ok: true, contract: 1, bad_lines: 0, queue_depth: 0 });

    expect(statSync(fx.path('socket')).mode & 0o777).toBe(0o600);
    expect(statSync(fx.path('token')).mode & 0o777).toBe(0o600);
    expect(statSync(fx.journalPath).mode & 0o777).toBe(0o600);
    expect(b.http.server.address()).toBe(fx.path('socket')); // a path, never a TCP port
  });

  it('unknown route → 404; malformed JSON → 400; wrong contract → 400', async () => {
    fx = makeHome();
    b = await start(fx);
    expect((await raw(fx, { method: 'POST', path: '/v1/nope' }, {})).status).toBe(404);
    expect((await raw(fx, BRAIN_ROUTES.find, [], { headers: ownerHeaders() })).json).toMatchObject({ code: 'BAD_REQUEST' });
    const wrong = await raw(fx, BRAIN_ROUTES.find, {}, { headers: { ...ownerHeaders(), [BRAIN_HEADERS.contractVersion]: '99' } });
    expect(wrong.status).toBe(400);
  });

  it('rate limit: the 61st write in a minute from one dialog → 429 RATE_LIMITED', async () => {
    fx = makeHome();
    b = await start(fx);
    const c = client(fx, { cwd: CLI_CWD });
    const results = [];
    for (let i = 0; i < 61; i++) results.push(await c.record({ type: 'note', label: `n${i}`, scopes: ['brain'] }));
    expect(results.filter((r) => r.ok)).toHaveLength(60);
    expect(results.filter((r) => !r.ok)).toEqual([expect.objectContaining({ code: 'RATE_LIMITED' })]);
  });

  it('health reports write p95, acts, records; stats/export are reader-gated', async () => {
    fx = makeHome();
    b = await start(fx);
    const c = ownerClient(fx);
    for (let i = 0; i < 3; i++) await c.record({ type: 'task', label: `t${i}` });
    const h = (await raw(fx, BRAIN_ROUTES.health, {})).json;
    expect(h.records).toBe(3);
    expect(typeof h.write_p95_ms).toBe('number');
    expect(h.last_backup_at).not.toBeNull();

    const st = await raw(fx, BRAIN_ROUTES.stats, {}, { headers: ownerHeaders() });
    expect(st.json).toMatchObject({ ok: true, total: 3, by_scope: { brain: 3 }, by_type: { task: 3 } });
    const ex = await raw(fx, BRAIN_ROUTES.export, {}, { headers: ownerHeaders() });
    expect(ex.json).toMatchObject({ ok: true, count: 3 });
    expect(statSync(ex.json.path).mode & 0o777).toBe(0o600);
    const denied = await raw(fx, BRAIN_ROUTES.stats, {}, { headers: { [BRAIN_HEADERS.cwd]: '/tmp/nobody' } });
    expect(denied.status).toBe(403);
  });
});
