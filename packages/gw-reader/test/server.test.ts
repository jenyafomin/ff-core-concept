import { appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatAddress } from '../src/address.js';
import { createGwReaderServer } from '../src/server.js';
import { CHAT_A, cfg, makeFixture, type Fixture } from './support/fixture.js';

let fx: Fixture | undefined;
afterEach(() => {
  vi.restoreAllMocks();
  fx?.cleanup();
  fx = undefined;
});

const BODY = 'Секретная мысль владельца про маму';

async function connect(f: Fixture) {
  const counters: Array<[string, Record<string, number>]> = [];
  const server = createGwReaderServer({
    reader: cfg(f),
    labelsPath: f.labelsPath,
    count: (t, c) => counters.push([t, c]),
  });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  const mcp = new Client({ name: 't', version: '0' });
  await mcp.connect(ct);
  return { mcp, counters };
}

function json(res: unknown): any {
  const r = res as { content: Array<{ text: string }> };
  return JSON.parse(r.content[0]?.text ?? 'null');
}

describe('MCP surface', () => {
  it('lists exactly the five tools', async () => {
    fx = makeFixture([{ text: BODY }]);
    const { mcp } = await connect(fx);
    const names = (await mcp.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(['gw_label', 'gw_labels', 'gw_recent', 'gw_resolve', 'gw_topics']);
  });

  it('AC-5: no message bodies on stderr / console; counters carry numbers only', async () => {
    fx = makeFixture([{ text: BODY }, { text: 'пароль: Abc123' }]);
    const writes: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((c: any) => (writes.push(String(c)), true));
    const logs = ['log', 'error', 'warn', 'info', 'debug'].map((m) =>
      vi.spyOn(console, m as 'log').mockImplementation((...a: unknown[]) => void writes.push(a.join(' '))),
    );
    // Default counter sink (stderr) — server without injected `count`.
    const server = createGwReaderServer({ reader: cfg(fx), labelsPath: fx.labelsPath });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    const mcp = new Client({ name: 't', version: '0' });
    await mcp.connect(ct);
    const rec = json(await mcp.callTool({ name: 'gw_recent', arguments: { days: 30, query: 'маму' } }));
    expect(rec.items).toHaveLength(1);
    await mcp.callTool({ name: 'gw_topics', arguments: { days: 30 } });
    await mcp.callTool({ name: 'gw_resolve', arguments: { address: rec.items[0].address } });
    const all = writes.join('\n');
    expect(all).not.toContain('Секретная');
    expect(all).not.toContain('маму');
    expect(all).not.toContain('Abc123');
    expect(all).toMatch(/gw_recent n=1 redacted=0/u);
    expect(logs.length).toBe(5);
  });

  it('AC-7: labels go only to the reader journal; gateway DB untouched; last label wins', async () => {
    fx = makeFixture([{ mid: '42', text: BODY }]);
    const before = fx.hash();
    const filesBefore = readdirSync(fx.dir).sort();
    const { mcp } = await connect(fx);
    const addr = formatAddress(CHAT_A, 56, '42');

    const l1 = json(await mcp.callTool({ name: 'gw_label', arguments: { address: addr, label: 'open' } }));
    expect(l1.ok).toBe(true);
    const l2 = json(
      await mcp.callTool({ name: 'gw_label', arguments: { address: addr, label: 'closed', note: 'готово, token: zzz999' } }),
    );
    expect(l2.entry.note).not.toContain('zzz999');
    const bad = await mcp.callTool({ name: 'gw_label', arguments: { address: formatAddress(CHAT_A, 56, '43'), label: 'mute' } });
    expect(bad.isError).toBe(true);

    // Non-canonical spelling of the same address (spaces) → stored under the canonical key.
    const l3 = json(await mcp.callTool({ name: 'gw_label', arguments: { address: `  ${addr} `, label: 'mute' } }));
    expect(l3.entry.address).toBe(addr);
    // A hand-edited journal line with a malformed address is ignored on read.
    appendFileSync(fx.labelsPath, `${JSON.stringify({ ts: 'x', address: 'gw:../etc/t1/m1', label: 'open' })}\n`);

    const cur = json(await mcp.callTool({ name: 'gw_labels', arguments: {} }));
    expect(cur.items).toEqual([expect.objectContaining({ address: addr, label: 'mute' })]);

    const journal = readFileSync(fx.labelsPath, 'utf8').trim().split('\n');
    expect(journal).toHaveLength(4); // append-only (3 accepted + 1 hand-edited), rejected label not written
    expect(journal.join('\n')).not.toContain('zzz999');
    expect(fx.hash()).toBe(before);
    // Only the labels dir appeared next to the DB (fixture puts it there); no -wal/-journal files.
    expect(readdirSync(fx.dir).sort()).toEqual([...filesBefore, 'labels'].sort());
  });

  it('invalid args are rejected by schema (days > 30, limit > 200, bad label)', async () => {
    fx = makeFixture([{ text: BODY }]);
    const { mcp } = await connect(fx);
    for (const [name, args] of [
      ['gw_recent', { days: 31 }],
      ['gw_recent', { limit: 201 }],
      ['gw_label', { address: 'gw:abcdef/t1/m1', label: 'done' }],
    ] as const) {
      const r = await mcp.callTool({ name, arguments: args as Record<string, unknown> });
      expect(r.isError).toBe(true);
    }
  });
});

describe('AC-7: importing the entry module starts nothing', () => {
  it('import does not connect stdio or read stdin', async () => {
    const onSpy = vi.spyOn(process.stdin, 'on');
    const before = process.stdin.listenerCount('data');
    const mod = await import('../src/index.js');
    expect(typeof mod.main).toBe('function');
    expect(process.stdin.listenerCount('data')).toBe(before);
    expect(onSpy).not.toHaveBeenCalled();
  });
});
