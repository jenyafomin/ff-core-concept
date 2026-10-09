// Shared helpers for service tests: a tmp brain home (never ~/.ff-brain), the real service on a tmp unix
// socket, the REAL brain-mcp client (so client headers/routes and the service are checked together), and a
// raw HTTP helper for transport-level cases.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { globalAgent, request } from 'node:http';

import { BrainClient } from '../../../brain-mcp/src/client.js';
import { BRAIN_HEADERS, BRAIN_ROUTES, CONTRACT_VERSION, type ReadersFile } from '../../src/contract.js';
import { decodeNode } from '../../src/domain/to-act.js';
import { startBrain, type RunningBrain } from '../../src/service/server.js';
import type { BrainServiceOptions } from '../../src/service/runtime.js';
import { SEED_SCOPES } from '../domain/harness.js';
import { makeBrainFixture, OWNER_ID, THREAD_BRAIN, type BrainFixture } from '../support/brain-fixture.js';

// every DurableFsStore registers a process 'exit' hook; many boots per file is expected
process.setMaxListeners(0);

export { OWNER_ID, THREAD_BRAIN };

export function makeHome(readers?: ReadersFile): BrainFixture {
  const fx = makeBrainFixture(readers);
  writeFileSync(fx.path('service'), JSON.stringify({ scopes: SEED_SCOPES }), { mode: 0o600 });
  return fx;
}

export function start(fx: BrainFixture, opts: Partial<BrainServiceOptions> = {}): Promise<RunningBrain> {
  // brain-mcp's client uses node's global agent (keep-alive on node ≥19): a socket pooled against the
  // PREVIOUS service instance would be reused after an in-process restart → EPIPE → SERVICE_DOWN.
  globalAgent.destroy();
  return startBrain({ home: fx.home, nightlyBackup: false, backupEveryMs: 0, ...opts });
}

export interface ClientIdentity {
  conversation?: string;
  message?: string;
  sender?: string;
  cwd?: string;
}

/** The real brain-mcp client, identity from env exactly as the gateway sets it. */
export function client(fx: BrainFixture, id: ClientIdentity = {}): BrainClient {
  const env: NodeJS.ProcessEnv = { FF_BRAIN_HOME: fx.home };
  if (id.conversation !== undefined) env.FF_BRAIN_CONVERSATION_ID = id.conversation;
  if (id.message !== undefined) env.FF_BRAIN_MESSAGE_ID = id.message;
  if (id.sender !== undefined) env.FF_BRAIN_SENDER_ID = id.sender;
  return new BrainClient({ env, cwd: id.cwd ?? '/nonexistent-cwd', timeoutMs: 10_000 });
}

/** Owner in the brain topic (AC-02). */
export const ownerClient = (fx: BrainFixture, message = '1001', conversation = THREAD_BRAIN): BrainClient =>
  client(fx, { conversation, message, sender: OWNER_ID });

export interface RawResponse {
  status: number;
  json: any;
}

/** Raw HTTP over the socket (bypasses brain-mcp). `token: null` → no Authorization header. */
export function raw(
  fx: BrainFixture,
  route: { method: string; path: string },
  body: unknown,
  opts: { token?: string | null; headers?: Record<string, string> } = {},
): Promise<RawResponse> {
  const token = opts.token === undefined ? readFileSync(fx.path('token'), 'utf8').trim() : opts.token;
  const payload = route.method === 'GET' ? '' : JSON.stringify(body ?? {});
  const headers: Record<string, string> = {
    [BRAIN_HEADERS.contractVersion]: String(CONTRACT_VERSION),
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(payload)),
    ...(token !== null ? { [BRAIN_HEADERS.authorization]: `Bearer ${token}` } : {}),
    ...opts.headers,
  };
  return new Promise((resolve, reject) => {
    const req = request({ socketPath: fx.path('socket'), path: route.path, method: route.method, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode ?? 0, json: text ? JSON.parse(text) : null });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });
}

export const ownerHeaders = (message = '2001'): Record<string, string> => ({
  [BRAIN_HEADERS.conversationId]: THREAD_BRAIN,
  [BRAIN_HEADERS.messageId]: message,
  [BRAIN_HEADERS.senderId]: OWNER_ID,
});

export { BRAIN_ROUTES };

/** Journal lines parsed (bad lines skipped). */
export function journalActs(fx: BrainFixture): any[] {
  if (!existsSync(fx.journalPath)) return [];
  const out: any[] = [];
  for (const line of readFileSync(fx.journalPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* bad line */
    }
  }
  return out;
}

/** Records of a given declared type in the live projection. */
export function recordsOfType(b: RunningBrain, type: string): ReturnType<typeof decodeNode>[] {
  return b.service.brain.store
    .load()
    .filter((n) => n.type === type && n.id.startsWith('u_'))
    .map(decodeNode);
}

/** User records (u_… ids, not friction). */
export function userRecords(b: RunningBrain): ReturnType<typeof decodeNode>[] {
  return b.service.brain.store
    .load()
    .filter((n) => n.id.startsWith('u_') && n.type !== 'friction')
    .map(decodeNode);
}
