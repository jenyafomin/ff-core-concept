// @ff/brain-mcp — HTTP/JSON client over the brain unix socket (SPEC-brain-v0.6 R-5, R-7, R-8).
//
// Identity: read ONCE from FF_BRAIN_* env (set by the gateway, G1) and sent as headers; tool args never
// carry it. Down service (ECONNREFUSED / ENOENT / timeout / no token): find/read/link → SERVICE_DOWN
// (readable, never thrown); record → parked in the outbox, answered `{ok:false, SERVICE_DOWN, queued:true}`
// — the agent never sees ok:true for a write that did not happen. The first successful call drains the
// outbox with the original idem. A body over LIMITS.requestBodyMaxBytes is refused locally with the final
// PAYLOAD_TOO_LARGE (never sent, never parked, never SERVICE_DOWN).

import { request as httpRequest } from 'node:http';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  BRAIN_ENV,
  BRAIN_HEADERS,
  BRAIN_HOME_LAYOUT,
  BRAIN_ROUTES,
  CONTRACT_VERSION,
  LIMITS,
  type BrainError,
  type BrainErrorCode,
  type BrainResult,
  type BrainVerb,
  type CallerContext,
  type FindRequest,
  type FindResponse,
  type LinkRequest,
  type LinkResponse,
  type ReadRequest,
  type ReadResponse,
  type RecordRequest,
  type RecordResponse,
} from './contract.js';
import { computeIdem, OrdinalCounter } from './ordinal.js';
import { Outbox } from './outbox.js';

export interface BrainPaths {
  home: string;
  socket: string;
  token: string;
  outbox: string;
}

/** `FF_BRAIN_HOME` overrides `~/.ff-brain`; `FF_BRAIN_SOCKET` overrides the socket path. */
export function resolvePaths(env: NodeJS.ProcessEnv = process.env): BrainPaths {
  const home = env[BRAIN_ENV.home] || join(homedir(), '.ff-brain');
  return {
    home,
    socket: env[BRAIN_ENV.socket] || join(home, BRAIN_HOME_LAYOUT.socket),
    token: join(home, BRAIN_HOME_LAYOUT.token),
    outbox: join(home, BRAIN_HOME_LAYOUT.outbox),
  };
}

/** Caller identity from env (no idem — that is per call). Empty strings count as absent. */
export function callerFromEnv(env: NodeJS.ProcessEnv = process.env, cwd: string = process.cwd()): CallerContext {
  const pick = (k: string): string | undefined => {
    const v = env[k];
    return v ? v : undefined;
  };
  const c: CallerContext = { cwd };
  const conversation_id = pick(BRAIN_ENV.conversationId);
  const message_id = pick(BRAIN_ENV.messageId);
  const sender_id = pick(BRAIN_ENV.senderId);
  const channel = pick(BRAIN_ENV.channel);
  const agent_id = pick(BRAIN_ENV.agentId);
  if (conversation_id) c.conversation_id = conversation_id;
  if (message_id) c.message_id = message_id;
  if (sender_id) c.sender_id = sender_id;
  if (channel) c.channel = channel;
  if (agent_id) c.agent_id = agent_id;
  return c;
}

/** CallerContext + token → HTTP headers (BRAIN_HEADERS). */
export function callerHeaders(caller: CallerContext, token: string): Record<string, string> {
  const h: Record<string, string> = {
    [BRAIN_HEADERS.authorization]: `Bearer ${token}`,
    [BRAIN_HEADERS.contractVersion]: String(CONTRACT_VERSION),
    'content-type': 'application/json',
  };
  const map: Array<[keyof CallerContext, string]> = [
    ['conversation_id', BRAIN_HEADERS.conversationId],
    ['message_id', BRAIN_HEADERS.messageId],
    ['sender_id', BRAIN_HEADERS.senderId],
    ['channel', BRAIN_HEADERS.channel],
    ['agent_id', BRAIN_HEADERS.agentId],
    ['cwd', BRAIN_HEADERS.cwd],
    ['idem', BRAIN_HEADERS.idem],
  ];
  for (const [k, header] of map) {
    const v = caller[k];
    // header values must be latin1-safe; ids/paths with other chars are URI-encoded
    if (v) h[header] = /^[\x20-\x7e]*$/.test(v) ? v : encodeURIComponent(v);
  }
  return h;
}

/** Thrown internally when the service cannot be reached; never escapes the public verbs. */
export class ServiceDownError extends Error {
  constructor(readonly reason: string) {
    super(`brain service unreachable: ${reason}`);
    this.name = 'ServiceDownError';
  }
}

const DOWN_CODES = new Set(['ECONNREFUSED', 'ENOENT', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'EACCES']);

export interface BrainClientOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  paths?: Partial<BrainPaths>;
  timeoutMs?: number;
}

export class BrainClient {
  readonly paths: BrainPaths;
  readonly caller: CallerContext;
  readonly ordinals = new OrdinalCounter();
  readonly outbox: Outbox;
  private readonly timeoutMs: number;
  private draining: Promise<void> | null = null;

  constructor(opts: BrainClientOptions = {}) {
    const env = opts.env ?? process.env;
    this.paths = { ...resolvePaths(env), ...opts.paths };
    this.caller = callerFromEnv(env, opts.cwd ?? process.cwd());
    this.outbox = new Outbox(this.paths.outbox);
    this.timeoutMs = opts.timeoutMs ?? 5000;
  }

  record(req: RecordRequest): Promise<BrainResult<RecordResponse>> {
    return this.call('record', req);
  }
  find(req: FindRequest): Promise<BrainResult<FindResponse>> {
    return this.call('find', req);
  }
  read(req: ReadRequest): Promise<BrainResult<ReadResponse>> {
    return this.call('read', req);
  }
  link(req: LinkRequest): Promise<BrainResult<LinkResponse>> {
    return this.call('link', req);
  }

  /** Caller context for the next call of `verb` (consumes one ordinal). Exposed for tests. */
  nextCaller(verb: BrainVerb): CallerContext {
    const ordinal = this.ordinals.next(verb);
    const idem = computeIdem(this.caller.conversation_id, this.caller.message_id, verb, ordinal);
    return idem ? { ...this.caller, idem } : { ...this.caller };
  }

  private async call<T extends { ok: true }>(verb: BrainVerb, body: object): Promise<BrainResult<T>> {
    const caller = this.nextCaller(verb);
    // over the service's body limit: refused HERE, definitively — never sent, never parked, never SERVICE_DOWN
    if (Buffer.byteLength(JSON.stringify(body ?? {})) > LIMITS.requestBodyMaxBytes) return payloadTooLarge(verb);
    let result: BrainResult<T>;
    try {
      result = (await this.post(BRAIN_ROUTES[verb].path, body, caller)) as BrainResult<T>;
    } catch (e) {
      if (!(e instanceof ServiceDownError)) throw e;
      return verb === 'record' ? this.park(caller, body as RecordRequest) : serviceDown(verb);
    }
    await this.drain();
    return result;
  }

  private park(caller: CallerContext, req: RecordRequest): BrainError {
    try {
      this.outbox.put(caller, req);
    } catch {
      return { ...serviceDown('record'), hint: 'Память недоступна, и очередь записать не удалось. Скажи владельцу один раз; не повторяй вызов.' };
    }
    return {
      ok: false,
      code: 'SERVICE_DOWN',
      queued: true,
      message: 'Память недоступна; запись поставлена в очередь и дойдёт сама, когда сервис поднимется.',
      hint: 'Скажи владельцу «запись в очереди, дойдёт сама». НЕ говори «записал» и не повторяй вызов.',
    };
  }

  /** Re-sends parked records with their original identity + idem. Stops at the first SERVICE_DOWN. */
  drain(): Promise<void> {
    if (!this.draining) {
      this.draining = (async () => {
        for (const item of this.outbox.list()) {
          let answer: unknown;
          try {
            answer = await this.post(BRAIN_ROUTES.record.path, item.entry.request, item.entry.caller);
          } catch (e) {
            if (e instanceof ServiceDownError) return;
            continue; // protocol garbage — keep the file for the owner to look at
          }
          // remove only when accepted/deduped or DEFINITIVELY refused; transient (401 after token rotation,
          // 5xx/INTERNAL, RATE_LIMITED, unknown) → keep for the next drain
          if (isFinalAnswer(answer)) this.outbox.remove(item.file);
        }
      })().finally(() => {
        this.draining = null;
      });
    }
    return this.draining;
  }

  private readToken(): string {
    try {
      const t = readFileSync(this.paths.token, 'utf8').trim();
      if (!t) throw new ServiceDownError('empty token');
      return t;
    } catch (e) {
      if (e instanceof ServiceDownError) throw e;
      throw new ServiceDownError('token unreadable');
    }
  }

  /** POST JSON over the unix socket. Returns the parsed envelope; throws ServiceDownError if unreachable. */
  private post(path: string, body: unknown, caller: CallerContext): Promise<unknown> {
    const token = this.readToken();
    const payload = JSON.stringify(body ?? {});
    const headers = { ...callerHeaders(caller, token), 'content-length': String(Buffer.byteLength(payload)) };
    return new Promise((resolve, reject) => {
      const req = httpRequest(
        { socketPath: this.paths.socket, path, method: 'POST', headers, timeout: this.timeoutMs, agent: false },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('error', (e) => reject(new ServiceDownError(e.message)));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            try {
              const json = JSON.parse(text) as unknown;
              if (json && typeof json === 'object' && 'ok' in json) return resolve(json);
            } catch {
              /* fall through */
            }
            resolve(internal(res.statusCode ?? 0));
          });
        },
      );
      req.on('timeout', () => req.destroy(new ServiceDownError('timeout')));
      req.on('error', (e: NodeJS.ErrnoException) => {
        if (e instanceof ServiceDownError) return reject(e);
        if (e.code && DOWN_CODES.has(e.code)) return reject(new ServiceDownError(e.code));
        reject(new ServiceDownError(e.message));
      });
      req.end(payload);
    });
  }
}

function serviceDown(verb: BrainVerb): BrainError {
  return {
    ok: false,
    code: 'SERVICE_DOWN',
    message: `Память недоступна (сервис ff-brain не отвечает) — ${verb} не выполнен.`,
    hint: 'Скажи владельцу один раз «память недоступна». Не повторяй вызов в цикле и не выдумывай содержимое памяти.',
  };
}

function payloadTooLarge(verb: BrainVerb): BrainError {
  return {
    ok: false,
    code: 'PAYLOAD_TOO_LARGE',
    message: `Запрос ${verb} больше ${LIMITS.requestBodyMaxBytes} байт — не отправлен и не поставлен в очередь.`,
    hint: 'Сократи: поля ≤8 КБ, текст ≤4 КБ. Повтор того же содержимого не пройдёт никогда.',
  };
}

function internal(status: number): BrainError {
  return {
    ok: false,
    code: 'INTERNAL',
    message: `Сервис памяти вернул неожиданный ответ (HTTP ${status}).`,
    hint: 'Скажи владельцу, что память ответила ошибкой; не повторяй вызов в цикле.',
  };
}

/**
 * Codes after which re-sending the same parked record can never succeed (validation / policy refusals).
 * Anything else (UNAUTHORIZED, INTERNAL, RATE_LIMITED, SERVICE_DOWN, unknown) is transient → keep.
 */
export const OUTBOX_FINAL_CODES: ReadonlySet<BrainErrorCode> = new Set<BrainErrorCode>([
  'LABEL_REQUIRED',
  'PII_REFUSED',
  'RESERVED_FIELD',
  'IDENTITY_FIELD',
  'UNKNOWN_PREDICATE',
  'SOURCE_REF_INVALID',
  'DERIVED_FROM_INVALID',
  'WRITE_DENIED',
  'DEFAULT_DENY',
  'SENDER_DENIED',
  'BAD_REQUEST',
  'PAYLOAD_TOO_LARGE',
  'CONFLICT',
]);

/** A replay answer that settles the outbox entry: `ok:true` or a definitive refusal. */
export function isFinalAnswer(answer: unknown): boolean {
  if (!answer || typeof answer !== 'object') return false;
  const a = answer as { ok?: unknown; code?: unknown };
  if (a.ok === true) return true;
  return a.ok === false && typeof a.code === 'string' && OUTBOX_FINAL_CODES.has(a.code as BrainErrorCode);
}
