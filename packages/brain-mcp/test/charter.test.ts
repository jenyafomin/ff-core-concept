// The memory charter rides in `initialize` as server `instructions` (one home: src/charter.ts), within budget,
// and the record tool description agrees with it (no «only by the owner's word» for project scopes; third parties — never).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { BrainClient } from '../src/client.js';
import { BRAIN_CHARTER, CHARTER_MAX_CHARS } from '../src/charter.js';
import { createBrainMcpServer } from '../src/server.js';
import { ENV, makeHome } from './support/fake-brain.js';

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

async function connect() {
  const h = makeHome();
  cleanups.push(h.cleanup);
  const server = createBrainMcpServer(new BrainClient({ env: ENV(h.home) }));
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(st), mcp.connect(ct)]);
  cleanups.push(() => mcp.close());
  return mcp;
}

describe('memory charter as MCP instructions', () => {
  it('initialize carries the charter verbatim', async () => {
    const mcp = await connect();
    expect(mcp.getInstructions()).toBe(BRAIN_CHARTER);
  });

  it('fits the budget', () => {
    expect(BRAIN_CHARTER.length).toBeLessThanOrEqual(CHARTER_MAX_CHARS);
  });

  it('holds the owner-approved policy points', () => {
    for (const must of [
      'find preset:overview',
      'пиши САМ',
      'personal — только по слову владельца',
      'Не больше 3 record за ход',
      'один note за сессию',
      '«со слов владельца» или «вывод агента»',
      'Имена и факты о третьих лицах — никогда',
      'Перед record — find',
      'source.ref+hash',
      'Без секретов и ПДн',
      'ok:true + receipt',
    ]) {
      expect(BRAIN_CHARTER).toContain(must);
    }
  });

  it('record tool description follows the charter', async () => {
    const mcp = await connect();
    const { tools } = await mcp.listTools();
    const d = tools.find((t) => t.name === 'record')!.description!;
    expect(d).toContain('personal — только по слову владельца, третьи лица — никогда');
    expect(d).toContain('НЕ говори «записал»');
  });
});
