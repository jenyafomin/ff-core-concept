// R-5 / R-7: env → headers over a unix socket + Bearer; identity never in the body; idem per call.
import { afterEach, describe, expect, it } from 'vitest';
import { BrainClient } from '../src/client.js';
import { BRAIN_HEADERS, IDENTITY_KEYS } from '../src/contract.js';
import { computeIdem } from '../src/ordinal.js';
import { ENV, makeHome, startFakeBrain } from './support/fake-brain.js';

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function setup(extraEnv: Record<string, string> = {}) {
  const h = makeHome();
  cleanups.push(h.cleanup);
  const fake = await startFakeBrain(h.socket);
  cleanups.push(fake.close);
  const client = new BrainClient({ env: ENV(h.home, extraEnv), cwd: '/work/proj' });
  return { h, fake, client };
}

describe('client: env → headers', () => {
  it('sends Bearer + all identity headers from env, body untouched', async () => {
    const { fake, client } = await setup();
    const r = await client.find({ text: 'devops' });
    expect(r.ok).toBe(true);
    const s = fake.seen[0]!;
    expect(s.method).toBe('POST');
    expect(s.path).toBe('/v1/find');
    expect(s.headers[BRAIN_HEADERS.authorization]).toBe('Bearer test-token-123');
    expect(s.headers[BRAIN_HEADERS.conversationId]).toBe('-1004351636302:56');
    expect(s.headers[BRAIN_HEADERS.messageId]).toBe('777');
    expect(s.headers[BRAIN_HEADERS.senderId]).toBe('1112667160');
    expect(s.headers[BRAIN_HEADERS.channel]).toBe('telegram');
    expect(s.headers[BRAIN_HEADERS.agentId]).toBe('ff-personal');
    expect(s.headers[BRAIN_HEADERS.cwd]).toBe('/work/proj');
    expect(s.headers[BRAIN_HEADERS.contractVersion]).toBe('1');
    expect(s.body).toEqual({ text: 'devops' });
    for (const k of IDENTITY_KEYS) expect(s.body).not.toHaveProperty(k);
  });

  it('idem header = sha256(conv, msg, verb, ordinal) and grows within the turn', async () => {
    const { fake, client } = await setup();
    await client.record({ type: 'task', label: 'A' });
    await client.record({ type: 'task', label: 'B' });
    await client.link({ from: 'u_a', pred: 'p', to: 'u_b' });
    const idems = fake.seen.map((s) => s.headers[BRAIN_HEADERS.idem]);
    expect(idems[0]).toBe(computeIdem('-1004351636302:56', '777', 'record', 1));
    expect(idems[1]).toBe(computeIdem('-1004351636302:56', '777', 'record', 2));
    expect(idems[2]).toBe(computeIdem('-1004351636302:56', '777', 'link', 1));
  });

  it('no message_id → no idem header (CLI-like)', async () => {
    const { fake, client } = await setup({ FF_BRAIN_MESSAGE_ID: '' });
    await client.record({ type: 'note', label: 'x' });
    expect(fake.seen[0]!.headers[BRAIN_HEADERS.idem]).toBeUndefined();
    expect(fake.seen[0]!.headers[BRAIN_HEADERS.messageId]).toBeUndefined();
  });

  it('passes the service refusal through verbatim', async () => {
    const h = makeHome();
    cleanups.push(h.cleanup);
    const err = { ok: false, code: 'SCOPE_DENIED', message: 'm', hint: 'h' };
    const fake = await startFakeBrain(h.socket, () => err);
    cleanups.push(fake.close);
    const client = new BrainClient({ env: ENV(h.home) });
    expect(await client.record({ type: 'task', label: 'x', scopes: ['other'] })).toEqual(err);
  });
});
