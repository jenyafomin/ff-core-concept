// Idempotency inside the write queue + outbox replay (AC-24…27) — real brain-mcp client ↔ real service.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { BRAIN_HEADERS } from '../../src/contract.js';
import { idemKey } from '../../src/service/idem.js';
import { argsHash } from '../../src/service/runtime.js';
import type { RunningBrain } from '../../src/service/server.js';
import { CLI_CWD, THREAD_AGENTS, THREAD_BRAIN, UNKNOWN_CHAT, type BrainFixture } from '../support/brain-fixture.js';

import { BRAIN_ROUTES, client, makeHome, OWNER_ID, ownerClient, ownerHeaders, raw, recordsOfType, start, userRecords } from './_helpers.js';

let fx: BrainFixture;
let b: RunningBrain | undefined;
afterEach(async () => {
  await b?.stop();
  b = undefined;
  fx?.cleanup();
});

const actCount = (br: RunningBrain) => br.service.brain.store.acts().length;

describe('idem (AC-24…26)', () => {
  it('AC-24 + F-5: same (conversation, message, verb, ordinal) with OTHER args → 1 act; the original + dedup:true + IDEM_BODY_MISMATCH', async () => {
    fx = makeHome();
    b = await start(fx);
    // the gateway dup-bug: the same turn replayed by a fresh MCP process → same ordinals → same idem
    const first = await ownerClient(fx, '4242').record({ type: 'task', label: 'Оригинал' });
    expect(first.ok).toBe(true);
    const n = actCount(b);
    const replay = await ownerClient(fx, '4242').record({ type: 'note', label: 'Перефразировано' });
    expect(actCount(b)).toBe(n);
    expect(replay).toEqual({ ...first, dedup: true, warnings: [expect.objectContaining({ code: 'IDEM_BODY_MISMATCH' })] });
    expect(userRecords(b).map((r) => r.label)).toEqual(['Оригинал']);

    // the index is rebuilt from the journal: still deduped after a restart
    await b.stop();
    b = await start(fx);
    const afterRestart = await ownerClient(fx, '4242').record({ type: 'task', label: 'Третий раз' });
    expect(actCount(b)).toBe(n);
    expect(afterRestart).toMatchObject({ ok: true, id: first.ok ? first.id : '', dedup: true, type: 'task', status: 'active' });
    // the body tag lives in the journal → the mismatch is still reported after a restart
    expect(afterRestart.ok && afterRestart.warnings.map((w) => w.code)).toEqual(['IDEM_BODY_MISMATCH']);
    expect(afterRestart.ok && afterRestart.receipt).toBe(first.ok && first.receipt);
  });

  it('link idem: a replayed link → the original answer, no new act (other body → + IDEM_BODY_MISMATCH)', async () => {
    fx = makeHome();
    b = await start(fx);
    const setup = ownerClient(fx, '1');
    const a = await setup.record({ type: 'task', label: 'A' });
    const c = await setup.record({ type: 'task', label: 'C' });
    const l1 = await ownerClient(fx, '77').link({ from: a.ok ? a.id : '', pred: 'blocks', to: c.ok ? c.id : '' });
    const n = actCount(b);
    const l2 = await ownerClient(fx, '77').link({ from: a.ok ? a.id : '', pred: 'about', to: c.ok ? c.id : '' });
    expect(actCount(b)).toBe(n);
    expect(l2).toEqual({ ...l1, warnings: [expect.objectContaining({ code: 'IDEM_BODY_MISMATCH' })] });
    const l3 = await ownerClient(fx, '77').link({ from: a.ok ? a.id : '', pred: 'blocks', to: c.ok ? c.id : '' });
    expect(actCount(b)).toBe(n);
    expect(l3).toEqual(l1); // identical body → no warning
  });

  it('F-2: a replayed link to a FOREIGN record answers dangling:true exactly like a missing target (also after restart)', async () => {
    fx = makeHome();
    b = await start(fx);
    const foreign = await ownerClient(fx, '1', THREAD_AGENTS).record({ type: 'note', label: 'Только agents' });
    const mine = await ownerClient(fx, '2').record({ type: 'task', label: 'Моё в brain' });
    const from = mine.ok ? mine.id : '';
    const to = foreign.ok ? foreign.id : '';
    const lForeign = await ownerClient(fx, '88').link({ from, pred: 'about', to });
    const lMissing = await ownerClient(fx, '89').link({ from, pred: 'about', to: 'u_doesnotexist1' });
    expect(lForeign).toMatchObject({ ok: true, dangling: true });
    expect(lMissing).toMatchObject({ ok: true, dangling: true });
    expect(await ownerClient(fx, '88').link({ from, pred: 'about', to })).toEqual(lForeign);

    // after a restart the answer is rebuilt from the journal — still no existence oracle
    await b.stop();
    b = await start(fx);
    const rForeign = await ownerClient(fx, '88').link({ from, pred: 'about', to });
    const rMissing = await ownerClient(fx, '89').link({ from, pred: 'about', to: 'u_doesnotexist1' });
    expect(rForeign).toMatchObject({ ok: true, dangling: true });
    expect(rMissing).toMatchObject({ ok: true, dangling: true });
    expect(rForeign).toEqual(lForeign);
  });

  it('AC-25: two parallel records with one idem → 1 act', async () => {
    fx = makeHome();
    b = await start(fx);
    const n = actCount(b);
    const [x, y] = await Promise.all([
      ownerClient(fx, '9001').record({ type: 'task', label: 'Параллельно-1' }),
      ownerClient(fx, '9001').record({ type: 'task', label: 'Параллельно-2' }),
    ]);
    expect(actCount(b)).toBe(n + 1);
    expect(x.ok && y.ok && x.id === y.id).toBe(true);
    expect([x.ok && x.dedup, y.ok && y.dedup].sort()).toEqual([false, true]);
  });

  it('idem header on a CLI caller (no message id) is ignored; a different ordinal is a new act', async () => {
    fx = makeHome();
    b = await start(fx);
    const c = ownerClient(fx, '3');
    const r1 = await c.record({ type: 'task', label: 'Первый' });
    const r2 = await c.record({ type: 'task', label: 'Первый' }); // ordinal 2 → own idem → a second record
    expect(r1.ok && r2.ok && r1.id !== r2.id).toBe(true);

    const hdr = { [BRAIN_HEADERS.cwd]: CLI_CWD, [BRAIN_HEADERS.idem]: 'f'.repeat(64) };
    const a = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'cli-1', scopes: ['brain'] }, { headers: hdr });
    const bb = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'cli-1', scopes: ['brain'] }, { headers: hdr });
    expect(a.json.ok && bb.json.ok).toBe(true);
    expect(a.json.id).not.toBe(bb.json.id);
  });

  it('AC-26: CLI (no message_id) → no idem: identical calls are two records, provenance carries no idem', async () => {
    fx = makeHome();
    b = await start(fx);
    const cli = client(fx, { cwd: CLI_CWD });
    const r1 = await cli.record({ type: 'note', label: 'Одинаково', scopes: ['brain'] });
    const r2 = await client(fx, { cwd: CLI_CWD }).record({ type: 'note', label: 'Одинаково', scopes: ['brain'] });
    expect(r1.ok && r2.ok && r1.id !== r2.id).toBe(true);
    const acts = b.service.brain.store.acts().filter((x) => [r1, r2].some((r) => r.ok && (x.provenance as any)?.source_ref === r.id));
    expect(acts).toHaveLength(2);
    for (const a of acts) expect((a.provenance as any).idem).toBeUndefined();
  });

  it('idem is stamped into provenance for gateway callers (index source)', async () => {
    fx = makeHome();
    b = await start(fx);
    const r = await raw(fx, BRAIN_ROUTES.record, { type: 'note', label: 'с idem' }, { headers: { ...ownerHeaders('55'), [BRAIN_HEADERS.idem]: 'abc123' } });
    expect(r.json.ok).toBe(true);
    const act = b.service.brain.store.acts().find((x) => (x.provenance as any)?.source_ref === r.json.id)!;
    // W2/F-5: the stamp is the server key (bound to the dialog) + a keyed body tag — never the raw client idem
    expect((act.provenance as any).idem).toBe(`${idemKey(THREAD_BRAIN, 'abc123')}.${argsHash({ type: 'note', label: 'с idem' }, readFileSync(join(fx.home, 'secret'), 'utf8').trim())}`);
  });
});

describe('outbox (AC-27)', () => {
  it('service down: find/read → SERVICE_DOWN; record → outbox 0600 + queued; after start the first call delivers exactly 1 act', async () => {
    fx = makeHome();
    // first start creates the token, then the service goes down
    b = await start(fx);
    await b.stop();
    b = undefined;

    const turn = ownerClient(fx, '8080');
    expect(await turn.find({})).toMatchObject({ ok: false, code: 'SERVICE_DOWN' });
    expect(await turn.read({ id: 'u_x' })).toMatchObject({ ok: false, code: 'SERVICE_DOWN' });
    const parked = await turn.record({ type: 'task', label: 'Из очереди' });
    expect(parked).toMatchObject({ ok: false, code: 'SERVICE_DOWN', queued: true });
    const files = readdirSync(fx.path('outbox'));
    expect(files).toHaveLength(1);
    expect(statSync(join(fx.path('outbox'), files[0]!)).mode & 0o777).toBe(0o600);

    b = await start(fx);
    const next = ownerClient(fx, '8081'); // the next turn's MCP process
    const f = await next.find({});
    expect(f.ok).toBe(true);
    await next.drain();
    expect(userRecords(b).map((r) => r.label)).toEqual(['Из очереди']);
    expect(readdirSync(fx.path('outbox'))).toHaveLength(0);

    // a second drain / a replay of the same parked call never makes a second act
    const again = await ownerClient(fx, '8080').record({ type: 'task', label: 'Из очереди' });
    expect(again).toMatchObject({ ok: true, dedup: true });
    expect(userRecords(b)).toHaveLength(1);
  });

  it('outbox entry whose identity is not in the allowlist → refused on replay, with friction, no record', async () => {
    fx = makeHome();
    b = await start(fx);
    await b.stop();
    b = undefined;
    const intruder = client(fx, { conversation: UNKNOWN_CHAT, message: '1', sender: OWNER_ID });
    expect(await intruder.record({ type: 'note', label: 'чужое' })).toMatchObject({ queued: true });

    b = await start(fx);
    await ownerClient(fx, '2').find({}); // a legit call drains the outbox
    await ownerClient(fx, '2').drain();
    expect(userRecords(b)).toHaveLength(0);
    expect(recordsOfType(b, 'friction').some((f) => f.fields.code === 'DEFAULT_DENY' && f.fields.verb === 'record')).toBe(true);
    expect(existsSync(fx.path('outbox'))).toBe(true);
  });
});
