// R-6 / AC-06: exactly 4 tools; their JSON input schemas carry no identity fields; identity passed by
// the agent as an arg is stripped before the wire; refusals surface as isError with the envelope.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { BrainClient } from '../src/client.js';
import { IDENTITY_KEYS } from '../src/contract.js';
import { createBrainMcpServer } from '../src/server.js';
import { ENV, makeHome, startFakeBrain } from './support/fake-brain.js';

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function connect(brain: BrainClient) {
  const server = createBrainMcpServer(brain);
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(st), mcp.connect(ct)]);
  cleanups.push(() => mcp.close());
  return mcp;
}

const FORBIDDEN = [...IDENTITY_KEYS, 'conversationId', 'author', 'principal', 'sender', 'message_id', 'messageId'];

describe('MCP tools', () => {
  it('exposes exactly record/find/read/link with identity-free input schemas', async () => {
    const h = makeHome();
    cleanups.push(h.cleanup);
    const mcp = await connect(new BrainClient({ env: ENV(h.home) }));
    const { tools } = await mcp.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['find', 'link', 'read', 'record']);
    for (const t of tools) {
      expect(t.inputSchema.type).toBe('object');
      const props = Object.keys(t.inputSchema.properties ?? {});
      expect(props.length).toBeGreaterThan(0);
      for (const k of FORBIDDEN) expect(props).not.toContain(k);
      expect(JSON.stringify(t.inputSchema)).not.toMatch(/conversation|sender|principal|author/i);
    }
    const record = tools.find((t) => t.name === 'record')!;
    expect(record.inputSchema.required).toEqual(expect.arrayContaining(['type', 'label']));
  });

  it('identity smuggled in args never reaches the body; it travels as headers from env', async () => {
    const h = makeHome();
    cleanups.push(h.cleanup);
    const fake = await startFakeBrain(h.socket, () => ({ ok: true, id: 'u_1', receipt: 'Записано: x' }));
    cleanups.push(fake.close);
    const mcp = await connect(new BrainClient({ env: ENV(h.home) }));
    const res = await mcp.callTool({
      name: 'record',
      arguments: { type: 'task', label: 'x', conversationId: 'evil', sender: 'evil', author: 'evil' },
    });
    expect(res.isError).toBeFalsy();
    const s = fake.seen[0]!;
    expect(s.body).toEqual({ type: 'task', label: 'x' });
    expect(s.headers['x-ff-brain-sender-id']).toBe('1112667160');
    const text = (res.content as Array<{ type: string; text: string }>)[0]!.text;
    expect(JSON.parse(text)).toMatchObject({ ok: true, id: 'u_1' });
  });

  it('service down: find → isError SERVICE_DOWN; record → isError queued (no ok:true)', async () => {
    const h = makeHome();
    cleanups.push(h.cleanup);
    const mcp = await connect(new BrainClient({ env: ENV(h.home), timeoutMs: 500 }));
    const f = await mcp.callTool({ name: 'find', arguments: { preset: 'morning' } });
    expect(f.isError).toBe(true);
    expect(JSON.parse((f.content as Array<{ text: string }>)[0]!.text)).toMatchObject({ ok: false, code: 'SERVICE_DOWN' });
    const r = await mcp.callTool({ name: 'record', arguments: { type: 'task', label: 'y' } });
    expect(r.isError).toBe(true);
    expect(JSON.parse((r.content as Array<{ text: string }>)[0]!.text)).toMatchObject({
      ok: false,
      code: 'SERVICE_DOWN',
      queued: true,
    });
  });
});
