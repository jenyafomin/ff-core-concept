// Fake brain service: HTTP on a tmp unix socket, records every request. Never touches ~/.ff-brain.
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Seen {
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

export function makeHome(): { home: string; socket: string; cleanup: () => void } {
  const home = mkdtempSync(join(tmpdir(), 'fbm-'));
  writeFileSync(join(home, 'token'), 'test-token-123\n', { mode: 0o600 });
  return { home, socket: join(home, 'brain.sock'), cleanup: () => rmSync(home, { recursive: true, force: true }) };
}

export async function startFakeBrain(
  socket: string,
  reply: (s: Seen) => unknown = (s) => ({ ok: true, echo: s.path }),
): Promise<{ seen: Seen[]; close: () => Promise<void>; server: Server }> {
  const seen: Seen[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      const s: Seen = {
        method: req.method ?? '',
        path: req.url ?? '',
        headers: req.headers,
        body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
      };
      seen.push(s);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(reply(s)));
    });
  });
  await new Promise<void>((r) => server.listen(socket, r));
  return {
    seen,
    server,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

export const ENV = (home: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  FF_BRAIN_HOME: home,
  FF_BRAIN_CONVERSATION_ID: '-1004351636302:56',
  FF_BRAIN_MESSAGE_ID: '777',
  FF_BRAIN_SENDER_ID: '1112667160',
  FF_BRAIN_CHANNEL: 'telegram',
  FF_BRAIN_AGENT_ID: 'ff-personal',
  ...extra,
});
