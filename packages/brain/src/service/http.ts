// @ff/brain/service/http — HTTP/JSON over a unix socket (SPEC R-5, AC-23). Never listens on TCP.
//
//   Bearer token (401 UNAUTHORIZED) → route (404) → contract header (400) → JSON body ≤ MAX_BODY (413/400)
//   → identity keys in the body → 400 IDENTITY_FIELD (AC-06) → caller identity ONLY from x-ff-brain-*
//   headers (R-7) → BrainService verb. Every answer is `{ok:true,…}` or `{ok:false, code, message, hint}`
//   with the HTTP status from ERROR_HTTP_STATUS.
import { chmodSync, existsSync, lstatSync, unlinkSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import {
  BRAIN_HEADERS,
  BRAIN_ROUTES,
  CONTRACT_VERSION,
  ERROR_HTTP_STATUS,
  IDENTITY_KEYS,
  LIMITS,
  type BrainError,
  type CallerContext,
} from '../contract.js';
import { brainError } from '../domain/to-act.js';

import { checkBearer } from './auth.js';
import type { BrainService } from './runtime.js';

/** Request bodies above this are refused (fields ≤8 KB + text ≤4 KB fit with lots of room). */
export const MAX_BODY_BYTES = LIMITS.requestBodyMaxBytes;

const IDENTITY = new Set<string>(IDENTITY_KEYS);

function header(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== 'string' || s === '') return undefined;
  // brain-mcp URI-encodes non-latin1 values (client.ts callerHeaders)
  if (/%[0-9A-Fa-f]{2}/.test(s)) {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  }
  return s;
}

/** Caller identity from headers — the ONLY source of identity (R-7). */
export function callerFromHeaders(req: IncomingMessage): CallerContext {
  const c: CallerContext = {};
  const map: Array<[keyof CallerContext, string]> = [
    ['conversation_id', BRAIN_HEADERS.conversationId],
    ['message_id', BRAIN_HEADERS.messageId],
    ['sender_id', BRAIN_HEADERS.senderId],
    ['channel', BRAIN_HEADERS.channel],
    ['agent_id', BRAIN_HEADERS.agentId],
    ['cwd', BRAIN_HEADERS.cwd],
    ['idem', BRAIN_HEADERS.idem],
  ];
  for (const [k, h] of map) {
    const v = header(req, h);
    if (v !== undefined) c[k] = v;
  }
  return c;
}

class HttpRefusal extends Error {
  constructor(readonly error: BrainError) {
    super(error.message);
  }
}

const tooLarge = (max: number) => new HttpRefusal(brainError('PAYLOAD_TOO_LARGE', `request body exceeds ${max} bytes`));

/**
 * Read a JSON body of at most `max` bytes. Oversized → 413 WITHOUT reading the rest: a declared
 * Content-Length over the limit is refused before the first byte; a streamed body stops at the limit
 * (the connection is then closed by the caller — see sendAndClose).
 */
function readBody(req: IncomingMessage, max: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > max) return reject(tooLarge(max));
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    const onData = (c: Buffer) => {
      if (failed) return;
      size += c.length;
      if (size > max) {
        failed = true;
        chunks.length = 0;
        req.off('data', onData);
        req.pause();
        reject(tooLarge(max));
        return;
      }
      chunks.push(c);
    };
    req.on('data', onData);
    req.on('error', (e) => {
      if (!failed) reject(e);
    });
    req.on('end', () => {
      if (failed) return;
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (text === '') return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new HttpRefusal(brainError('BAD_REQUEST', 'body is not valid JSON')));
      }
    });
  });
}

function send(res: ServerResponse, body: { ok: boolean } & object): void {
  const status = body.ok ? 200 : ERROR_HTTP_STATUS[(body as BrainError).code] ?? 500;
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(text) });
  res.end(text);
}

/** Answer, then drop the connection: the unread request body is never consumed (413). */
function sendAndClose(req: IncomingMessage, res: ServerResponse, body: { ok: boolean } & object): void {
  res.shouldKeepAlive = false;
  res.setHeader('connection', 'close');
  res.once('finish', () => req.socket.destroy());
  send(res, body);
}

type Handler = (caller: CallerContext, body: Record<string, unknown>) => Promise<{ ok: boolean } & object>;

function routes(service: BrainService): Map<string, Handler> {
  const m = new Map<string, Handler>();
  const key = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
  m.set(key(BRAIN_ROUTES.record), (c, b) => service.record(c, b as never));
  m.set(key(BRAIN_ROUTES.find), (c, b) => service.find(c, b as never));
  m.set(key(BRAIN_ROUTES.read), (c, b) => service.read(c, b as never));
  m.set(key(BRAIN_ROUTES.link), (c, b) => service.link(c, b as never));
  m.set(key(BRAIN_ROUTES.health), () => service.health());
  m.set(key(BRAIN_ROUTES.stats), (c) => service.stats(c));
  m.set(key(BRAIN_ROUTES.export), (c, b) => service.export(c, b as never));
  return m;
}

export interface BrainHttpOptions {
  socketPath: string;
  token: string;
  maxBodyBytes?: number;
  log?: (line: string) => void;
}

export interface BrainHttpServer {
  server: Server;
  socketPath: string;
  close(): Promise<void>;
}

export function createBrainHttpServer(service: BrainService, opts: BrainHttpOptions): Server {
  const table = routes(service);
  const max = opts.maxBodyBytes ?? MAX_BODY_BYTES;
  return createServer((req, res) => {
    void (async () => {
      try {
        if (!checkBearer(header(req, BRAIN_HEADERS.authorization), opts.token)) {
          req.resume();
          return send(res, brainError('UNAUTHORIZED', 'bad or missing bearer token'));
        }
        const path = (req.url ?? '/').split('?')[0];
        const handler = table.get(`${req.method} ${path}`);
        if (!handler) {
          req.resume();
          return send(res, brainError('NOT_FOUND', `no route ${req.method} ${path}`));
        }
        const contract = header(req, BRAIN_HEADERS.contractVersion);
        if (contract !== undefined && contract !== String(CONTRACT_VERSION)) {
          req.resume();
          return send(res, brainError('BAD_REQUEST', `contract ${contract} ≠ service contract ${CONTRACT_VERSION} — update brain-mcp`));
        }
        const body = req.method === 'GET' ? (req.resume(), {}) : await readBody(req, max);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return send(res, brainError('BAD_REQUEST', 'body must be a JSON object'));
        }
        const verb = path!.split('/').pop() as never;
        for (const k of Object.keys(body)) {
          if (IDENTITY.has(k)) {
            const e = brainError('IDENTITY_FIELD', `identity field '${k}' is not accepted in the body`);
            await service.reportRefusal(e.code, verb, body).catch(() => undefined);
            return send(res, e);
          }
        }
        send(res, await handler(callerFromHeaders(req), body as Record<string, unknown>));
      } catch (e) {
        if (e instanceof HttpRefusal) return e.error.code === 'PAYLOAD_TOO_LARGE' ? sendAndClose(req, res, e.error) : send(res, e.error);
        opts.log?.(`http: ${(e as Error).message}`);
        if (!res.headersSent) send(res, brainError('INTERNAL', 'internal error'));
      }
    })();
  });
}

/** Listen on the unix socket with mode 0600 (umask during bind + chmod after). Removes a stale socket. */
export async function listenBrain(service: BrainService, opts: BrainHttpOptions): Promise<BrainHttpServer> {
  const { socketPath } = opts;
  // The caller holds the journal lock (BrainService.open) → any existing socket file is stale.
  if (existsSync(socketPath) && lstatSync(socketPath).isSocket()) unlinkSync(socketPath);
  const server = createBrainHttpServer(service, opts);
  let prevMask: number | null = null;
  try {
    prevMask = process.umask(0o177); // not available in worker threads — chmod below still applies
  } catch {
    prevMask = null;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, () => {
        server.off('error', reject);
        resolve();
      });
    });
  } finally {
    if (prevMask !== null) process.umask(prevMask);
  }
  chmodSync(socketPath, 0o600);
  return {
    server,
    socketPath,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections?.();
        try {
          if (existsSync(socketPath)) unlinkSync(socketPath);
        } catch {
          /* already gone */
        }
      }),
  };
}
