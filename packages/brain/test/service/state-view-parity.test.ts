// Gateway `/state` (owner's Telegram view of a topic's memory) over the real unix socket: the gateway reads with
// the MAIN token + the topic's identity headers (conversation `chat:thread` + sender), exactly like the topic
// agent's MCP client. These checks pin that this path yields the SAME reader as the agent — never wider — and
// that the gateway mandate is not involved.
import { afterEach, describe, expect, it } from 'vitest';

import { BRAIN_HEADERS } from '../../src/contract.js';
import type { RunningBrain } from '../../src/service/server.js';
import { STRANGER_ID, THREAD_AGENTS, UNKNOWN_CHAT, type BrainFixture } from '../support/brain-fixture.js';

import { BRAIN_ROUTES, OWNER_ID, THREAD_BRAIN, makeHome, ownerClient, raw, start } from './_helpers.js';

let fx: BrainFixture | undefined;
let b: RunningBrain | undefined;
afterEach(async () => {
  await b?.stop();
  fx?.cleanup();
  b = undefined;
  fx = undefined;
});

/** Exactly the headers the gateway's TopicBrainReader sends (no message id: read-only). */
const stateHeaders = (conversation: string, sender = OWNER_ID): Record<string, string> => ({
  [BRAIN_HEADERS.conversationId]: conversation,
  [BRAIN_HEADERS.senderId]: sender,
  [BRAIN_HEADERS.channel]: 'telegram',
});

describe('/state parity — the gateway sees what the topic agent sees', () => {
  it('overview / open / recent / read are identical to the agent MCP client of the same topic', async () => {
    fx = makeHome();
    b = await start(fx);
    const agent = ownerClient(fx);
    const mine = await agent.record({ type: 'task', label: 'Задача мозга', fields: { status: 'open' }, scopes: ['brain'] } as never);
    expect(mine.ok).toBe(true);
    const foreign = await ownerClient(fx, '1002', THREAD_AGENTS).record({ type: 'note', label: 'Заметка агентов', scopes: ['agents'] } as never);
    expect(foreign.ok).toBe(true);

    const gw = (route: { method: string; path: string }, body: unknown) => raw(fx!, route, body, { headers: stateHeaders(THREAD_BRAIN) });
    for (const body of [{ preset: 'overview' }, { scope: 'scope:brain', preset: 'open', limit: 10 }, { scope: 'scope:brain', limit: 10 }]) {
      const viaGateway = await gw(BRAIN_ROUTES.find, body);
      const viaAgent = await agent.find(body as never);
      expect(viaGateway.status).toBe(200);
      expect(viaGateway.json).toEqual(viaAgent);
    }
    const overview = (await gw(BRAIN_ROUTES.find, { preset: 'overview' })).json;
    expect(overview.scopes.map((s: { slug: string }) => s.slug)).toEqual(['brain']);
    expect(overview.digest).not.toContain('agents');

    const id = (mine as { id: string }).id;
    expect((await gw(BRAIN_ROUTES.read, { id, depth: 1, max_nodes: 12 })).json).toEqual(await agent.read({ id, depth: 1, max_nodes: 12 }));
    // a record of another topic's scope reads like a missing one (no existence leak)
    const other = await gw(BRAIN_ROUTES.read, { id: (foreign as { id: string }).id });
    expect(other.json.code).toBe('NOT_FOUND');
    expect((await gw(BRAIN_ROUTES.find, { scope: 'scope:agents' })).json.code).toBe('SCOPE_DENIED');
  });

  it('never wider: stranger → SENDER_DENIED, unknown chat → DEFAULT_DENY, no identity → DEFAULT_DENY', async () => {
    fx = makeHome();
    b = await start(fx);
    const body = { preset: 'overview' };
    expect((await raw(fx, BRAIN_ROUTES.find, body, { headers: stateHeaders(THREAD_BRAIN, STRANGER_ID) })).json.code).toBe('SENDER_DENIED');
    expect((await raw(fx, BRAIN_ROUTES.find, body, { headers: stateHeaders(UNKNOWN_CHAT) })).json.code).toBe('DEFAULT_DENY');
    expect((await raw(fx, BRAIN_ROUTES.find, body)).json.code).toBe('DEFAULT_DENY');
  });
});
