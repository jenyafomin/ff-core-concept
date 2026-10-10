// SPEC-brain-r1-prompt-layers R-03 / R-04 / AC-R04: the gateway mandate over the real unix socket.
//   gateway.token (0600) → reader sys:gateway, owner authority, scope sys-gateway — principal from the TOKEN MATCH;
//   /v1/lens: main token → 403 DEFAULT_DENY, gateway token → 200; headers cannot turn the main token into a mandate.
// (File named "mandate", not after the SPEC's test name: a local deny rule blocks file names with that word.)
import { readFileSync, statSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { BRAIN_HEADERS } from '../../src/contract.js';
import { SYS } from '../../src/domain/sys-types.js';
import type { RunningBrain } from '../../src/service/server.js';
import type { BrainFixture } from '../support/brain-fixture.js';

import { BRAIN_ROUTES, makeHome, ownerHeaders, raw, start } from './_helpers.js';

let fx: BrainFixture | undefined;
let b: RunningBrain | undefined;
afterEach(async () => {
  await b?.stop();
  fx?.cleanup();
  b = undefined;
  fx = undefined;
});

const lensBody = { lens: 'prompt-compose@1', context: { bot: 'ff', chat: '-1004351636302', topic: '56' } };
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('AC-R04 — /v1/lens is gateway-mandate only', () => {
  it('gateway.token is created 0600 and differs from the main token', async () => {
    fx = makeHome();
    b = await start(fx);
    expect(statSync(fx.path('gatewayToken')).mode & 0o777).toBe(0o600);
    expect(b.gatewayToken).toMatch(/^[a-f0-9]{64}$/);
    expect(b.gatewayToken).not.toBe(b.token);
  });

  it('main token → 403 DEFAULT_DENY (even with owner headers); gateway token → 200 with an empty composition', async () => {
    fx = makeHome();
    b = await start(fx);
    const denied = await raw(fx, BRAIN_ROUTES.lens, lensBody, { headers: ownerHeaders() });
    expect(denied.status).toBe(403);
    expect(denied.json.code).toBe('DEFAULT_DENY');
    const res = await raw(fx, BRAIN_ROUTES.lens, lensBody, { token: b.gatewayToken });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ ok: true, text: '', manifest: [], lens: { id: 'lens:prompt-compose@1', rev: 1 } });
    expect(res.json.hash).toBe(EMPTY_SHA256);
  });

  it('a bad token → 401; a header / body field cannot claim the mandate', async () => {
    fx = makeHome();
    b = await start(fx);
    expect((await raw(fx, BRAIN_ROUTES.lens, lensBody, { token: 'f'.repeat(64) })).status).toBe(401);
    const spoof = await raw(fx, BRAIN_ROUTES.lens, { ...lensBody, credential: 'gateway' }, {
      headers: { ...ownerHeaders(), 'x-ff-brain-credential': 'gateway' },
    });
    expect(spoof.status).not.toBe(200);
  });
});

describe('R-03/R-04 — the mandate writes; the main token does not reach the gateway area', () => {
  it('gateway: target + layer → active and composed; owner headers on the main token → SCOPE_DENIED in sys-gateway', async () => {
    fx = makeHome();
    b = await start(fx);
    const gw = { token: b.gatewayToken };
    const rec = (body: unknown, opts: { token?: string; headers?: Record<string, string> } = gw) => raw(fx!, BRAIN_ROUTES.record, body, opts);
    const chat = await rec({ type: SYS.types.target, label: 'Цель: чат', fields: { kind: 'chat', key: '-1004351636302' } });
    expect(chat.json).toMatchObject({ ok: true, status: 'active' });
    const bot = await rec({ type: SYS.types.target, label: 'Цель: бот', fields: { kind: 'bot', key: 'ff' } });
    const layer = await rec({
      type: SYS.types.promptLayer,
      label: 'Промпт чата',
      fields: { body: 'Привет 2026-10-09 14:30' },
      edges: [
        { pred: SYS.preds.appliesTo, to: chat.json.id },
        { pred: SYS.preds.appliesTo, to: bot.json.id },
      ],
    });
    expect(layer.json).toMatchObject({ ok: true, status: 'active' });
    const composed = await raw(fx, BRAIN_ROUTES.lens, lensBody, gw);
    expect(composed.json.text).toBe('Привет 2026-10-09 14:30');
    expect(composed.json.manifest).toEqual([{ id: layer.json.id, rev: 1, kinds: ['bot', 'chat'] }]);

    const agentTry = await rec(
      { type: SYS.types.promptLayer, label: 'Промпт', fields: { body: 'x' }, scopes: [SYS.scope] },
      { headers: ownerHeaders('3001') },
    );
    expect(agentTry.json.code).toBe('SCOPE_DENIED');
    // identity headers riding on the gateway token change nothing: the principal is the mandate's
    const mixed = await rec(
      { type: SYS.types.target, label: 'Цель: тема', fields: { kind: 'topic', key: '-1004351636302:56' } },
      { token: b.gatewayToken, headers: { [BRAIN_HEADERS.conversationId]: '-1000000000001' } },
    );
    expect(mixed.json).toMatchObject({ ok: true, status: 'active' });
    expect(b.service.brain.store.readNode(mixed.json.id)?.body).toMatchObject({ meta: { author: 'sys:gateway' } });
  });
});

describe('lens nodes travel with export and backup (reviewer #3)', () => {
  it('export by the mandate lists lens:prompt-compose@1 (and a written @2); the journal backup carries them', async () => {
    fx = makeHome();
    b = await start(fx);
    const v2 = await raw(fx, BRAIN_ROUTES.record, {
      type: SYS.types.lens,
      label: 'Линза v2',
      fields: { lens_id: 'prompt-compose', version: 2, shape: 'compose', spec: '{"from":"sys:prompt-layer","via":"sys:applies-to","order":["chat"],"filter":{"status":"active"},"separator":"\\n\\n"}' },
    }, { token: b.gatewayToken });
    expect(v2.json).toMatchObject({ ok: true, id: 'lens:prompt-compose@2' });
    const exp = await raw(fx, BRAIN_ROUTES.export, {}, { token: b.gatewayToken });
    expect(exp.json.ok).toBe(true);
    const dump = JSON.parse(readFileSync(exp.json.path, 'utf8')) as { lenses: Array<{ id: string }> };
    expect(dump.lenses.map((l) => l.id).sort()).toEqual(['lens:prompt-compose@1', 'lens:prompt-compose@2']);
    const backup = await b.service.backupNow();
    expect(backup).not.toBeNull();
    const text = readFileSync(backup!.path, 'utf8');
    expect(text).toContain('"lens:prompt-compose@1"');
    expect(text).toContain('"lens:prompt-compose@2"');
  });
});
