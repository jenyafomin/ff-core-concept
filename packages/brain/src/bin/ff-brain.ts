#!/usr/bin/env node
// ff-brain — owner CLI over the running service's HTTP (SPEC R-1): health · stats · export [scope…].
// Identity = this cwd (x-ff-brain-cwd) → readers.json `cli` allowlist; health needs only the token.
// Exit: 0 ok · 1 refused · 2 service unreachable.
import { readFileSync } from 'node:fs';
import { request } from 'node:http';
import { join } from 'node:path';

import { BRAIN_ENV, BRAIN_HEADERS, BRAIN_HOME_LAYOUT, BRAIN_ROUTES, CONTRACT_VERSION } from '../contract.js';
import { resolveHome } from '../service/paths.js';

const USAGE = 'usage: ff-brain <health|stats|export [scope…]>';

function call(socketPath: string, token: string, route: { method: string; path: string }, body?: unknown): Promise<unknown> {
  const payload = body === undefined ? '' : JSON.stringify(body);
  const headers: Record<string, string> = {
    [BRAIN_HEADERS.authorization]: `Bearer ${token}`,
    [BRAIN_HEADERS.contractVersion]: String(CONTRACT_VERSION),
    [BRAIN_HEADERS.cwd]: /^[\x20-\x7e]*$/.test(process.cwd()) ? process.cwd() : encodeURIComponent(process.cwd()),
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(payload)),
  };
  return new Promise((resolve, reject) => {
    const req = request({ socketPath, path: route.path, method: route.method, headers, timeout: 5000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(payload);
  });
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const home = resolveHome(process.env);
  const socketPath = process.env[BRAIN_ENV.socket] || join(home, BRAIN_HOME_LAYOUT.socket);
  let route: { method: string; path: string };
  let body: unknown;
  if (cmd === 'health') route = BRAIN_ROUTES.health;
  else if (cmd === 'stats') route = BRAIN_ROUTES.stats;
  else if (cmd === 'export') {
    route = BRAIN_ROUTES.export;
    body = rest.length ? { scopes: rest } : {};
  } else {
    process.stderr.write(`${USAGE}\n`);
    process.exit(64);
  }
  let token: string;
  try {
    token = readFileSync(join(home, BRAIN_HOME_LAYOUT.token), 'utf8').trim();
  } catch {
    process.stderr.write(`ff-brain: no token at ${join(home, BRAIN_HOME_LAYOUT.token)} — is the service started?\n`);
    process.exit(2);
  }
  try {
    const res = (await call(socketPath, token, route, body)) as { ok?: boolean };
    process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
    process.exit(res.ok ? 0 : 1);
  } catch (e) {
    process.stderr.write(`ff-brain: service unreachable at ${socketPath} (${(e as Error).message})\n`);
    process.exit(2);
  }
}

void main();
