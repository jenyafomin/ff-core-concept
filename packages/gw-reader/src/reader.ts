// @ff/gw-reader — read core (ADR-0018 D1/D3/D4). Pure functions over a read-only connection.
//
// Pipeline per row: owner + direction=in + addressable (channelMessageId, known sessionKey shape)
// → forward exclusion (fail-closed) → line-level secret redaction → excerpt ≤ EXCERPT_MAX.
// Query substring matches the REDACTED text only, so search cannot be used as an oracle for secrets.
// Carry window (B7): a message with a strong credential word hides the NEXT owner message of the same
// topic sent within CARRY_MS entirely — "пароль от сервера" → next message "Xk9mP2" is the classic leak.
// The DB is opened per call and closed right after — no long-lived handle on the live gateway file.

import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncT } from 'node:sqlite';
import { chatAlias, formatAddress, parseAddress, parseSessionKey, parseTopicFilter, topicKey } from './address.js';
import { redactText, type RedactResult } from './redact.js';

export const DEFAULT_DB = '/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/data/gateway-ff-personal.db';
export const DEFAULT_OWNER_ID = '1112667160';
export const EXCERPT_MAX = 300;
export const LIMITS = { daysMax: 30, daysDefault: 14, limitMax: 200, limitDefault: 50 } as const;
/** Hard SQL cap on rows loaded per call (newest first) — bounds memory regardless of the window. */
export const ROW_CAP = 5000;
/**
 * Cross-message carry window: after a message with a strong credential word, the next owner message of
 * the same topic within this window is hidden whole. Fail-closed (no "short message" heuristic): a value
 * can sit in a long message too, and the price is one hidden message flagged `redacted`.
 */
export const CARRY_MS = 10 * 60_000;
/** Exact prefix the gateway prepends to forwarded messages (agents-manager normalize-inbound.util.ts:130). */
export const FORWARD_MARKER = '[Пересланное сообщение';

// node:sqlite via require: vite (vitest) strips the `node:` scheme and cannot resolve bare `sqlite`.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type DatabaseSync = DatabaseSyncT;

const DAY_MS = 86_400_000;

export interface ReaderConfig {
  dbPath: string;
  ownerId: string;
  /** Injectable clock for tests. */
  now?: () => number;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ReaderConfig {
  return {
    dbPath: env.GW_READER_DB?.trim() || DEFAULT_DB,
    ownerId: env.GW_READER_OWNER_ID?.trim() || DEFAULT_OWNER_ID,
  };
}

export interface MessageView {
  address: string;
  ts: string;
  topic: string;
  text_excerpt: string;
  redacted: boolean;
}

interface Row {
  sessionKey: string;
  userId: string;
  text: string;
  ts: number;
  channelMessageId: string;
}

/** Opens the gateway DB strictly read-only; any write through this handle throws. */
export function openReadOnly(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  db.exec('PRAGMA query_only = ON');
  return db;
}

function withDb<T>(cfg: ReaderConfig, fn: (db: DatabaseSync) => T): T {
  const db = openReadOnly(cfg.dbPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

/** Fail-closed: the marker anywhere (not only at the start) excludes the message. */
export function isForwarded(text: string): boolean {
  return text.includes(FORWARD_MARKER) || /пересланн\p{L}* сообщени/iu.test(text.slice(0, 80));
}

function clampDays(days: number | undefined): number {
  const d = days ?? LIMITS.daysDefault;
  return Math.min(Math.max(1, Math.floor(d)), LIMITS.daysMax);
}

interface SelectOpts {
  sinceMs?: number;
  untilMs?: number;
  mid?: string;
}

function selectOwnerInbound(db: DatabaseSync, cfg: ReaderConfig, o: SelectOpts = {}): Row[] {
  const where = [
    "direction = 'in'",
    'userId = ?',
    "channelMessageId IS NOT NULL AND channelMessageId <> ''",
  ];
  const params: (string | number)[] = [cfg.ownerId];
  if (o.sinceMs !== undefined) {
    where.push('ts >= ?');
    params.push(o.sinceMs);
  }
  if (o.untilMs !== undefined) {
    where.push('ts <= ?');
    params.push(o.untilMs);
  }
  if (o.mid !== undefined) {
    where.push('channelMessageId = ?');
    params.push(o.mid);
  }
  params.push(ROW_CAP);
  const sql = `SELECT sessionKey, userId, text, ts, channelMessageId FROM messages WHERE ${where.join(' AND ')} ORDER BY ts DESC, id ASC LIMIT ?`;
  return db.prepare(sql).all(...params) as unknown as Row[];
}

interface Located {
  row: Row;
  chatId: string;
  thread: number;
  address: string;
}

function locate(rows: Row[]): Located[] {
  const out: Located[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const c = parseSessionKey(row.sessionKey);
    if (!c) continue;
    if (!/^\d+$/u.test(String(row.channelMessageId))) continue;
    if (typeof row.text !== 'string' || isForwarded(row.text)) continue;
    const address = formatAddress(c.chatId, c.thread, String(row.channelMessageId));
    // Gateway dup-bug can store the same inbound twice; same address = same message.
    const dedupKey = `${row.sessionKey}|${row.channelMessageId}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out.push({ row, chatId: c.chatId, thread: c.thread, address });
  }
  return out;
}

/** Chronological order inside a topic: ts, then Telegram message id (monotonic per chat). */
function before(a: Located, b: Located): boolean {
  return a.row.ts !== b.row.ts ? a.row.ts < b.row.ts : Number(a.row.channelMessageId) < Number(b.row.channelMessageId);
}

const topicOf = (l: Located): string => `${l.chatId}|${l.thread}`;

/**
 * Redacts every located row, applying the carry window: a row is fully hidden when the previous owner
 * message of the same topic (within CARRY_MS) contained a strong credential word.
 */
function redactAll(located: Located[]): Map<Located, RedactResult> {
  const byTopic = new Map<string, Located[]>();
  for (const l of located) {
    const k = topicOf(l);
    const arr = byTopic.get(k);
    if (arr) arr.push(l);
    else byTopic.set(k, [l]);
  }
  const out = new Map<Located, RedactResult>();
  for (const arr of byTopic.values()) {
    arr.sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0));
    let prev: { l: Located; r: RedactResult } | undefined;
    for (const l of arr) {
      const carry = prev !== undefined && prev.r.strong && l.row.ts - prev.l.row.ts <= CARRY_MS;
      const r = redactText(l.row.text, { carry });
      out.set(l, r);
      prev = { l, r };
    }
  }
  return out;
}

function toView(l: Located, r: RedactResult): MessageView {
  const flat = r.text.replace(/\s*\n\s*/gu, ' ⏎ ').trim();
  const excerpt = flat.length > EXCERPT_MAX ? `${flat.slice(0, EXCERPT_MAX - 1)}…` : flat;
  return {
    address: l.address,
    ts: new Date(l.row.ts).toISOString(),
    topic: topicKey(l.chatId, l.thread),
    text_excerpt: excerpt,
    redacted: r.redacted,
  };
}

export interface RecentArgs {
  days?: number;
  topic?: string;
  limit?: number;
  query?: string;
}

export function recent(cfg: ReaderConfig, args: RecentArgs = {}): MessageView[] {
  const now = (cfg.now ?? Date.now)();
  const since = now - clampDays(args.days) * DAY_MS;
  const limit = Math.min(Math.max(1, Math.floor(args.limit ?? LIMITS.limitDefault)), LIMITS.limitMax);
  let tf: ReturnType<typeof parseTopicFilter> | undefined;
  if (args.topic !== undefined && args.topic !== '') {
    tf = parseTopicFilter(args.topic);
    if (!tf) throw new Error('topic: ожидается gw:<alias>/t<N> или t<N>');
  }
  const q = args.query?.trim().toLowerCase();

  return withDb(cfg, (db) => {
    // Load CARRY_MS before the window so the first in-window message still sees its predecessor.
    const located = locate(selectOwnerInbound(db, cfg, { sinceMs: since - CARRY_MS }));
    const red = redactAll(located);
    const out: MessageView[] = [];
    for (const l of located) {
      if (l.row.ts < since) continue;
      if (tf) {
        if (l.thread !== tf.thread) continue;
        if (tf.chatAlias !== undefined && chatAlias(l.chatId) !== tf.chatAlias) continue;
      }
      const r = red.get(l) as RedactResult;
      // Match on the full redacted text (not only the excerpt), never on the raw text.
      if (q && !r.text.toLowerCase().includes(q)) continue;
      out.push(toView(l, r));
      if (out.length >= limit) break;
    }
    return out;
  });
}

export type ResolveResult = { ok: true; message: MessageView } | { ok: false; error: string };

export function resolve(cfg: ReaderConfig, address: string): ResolveResult {
  const a = parseAddress(address);
  if (!a) return { ok: false, error: 'bad_address' };
  return withDb(cfg, (db) => {
    const hits = locate(selectOwnerInbound(db, cfg, { mid: a.mid })).filter(
      (l) => l.thread === a.thread && chatAlias(l.chatId) === a.chatAlias,
    );
    if (hits.length === 0) return { ok: false, error: 'not_found' };
    const chats = new Set(hits.map((h) => h.chatId));
    if (chats.size > 1) return { ok: false, error: 'ambiguous' };
    const hit = hits[0] as Located;
    // Same carry window as recent(): look at the topic's messages up to CARRY_MS before this one.
    const near = locate(selectOwnerInbound(db, cfg, { sinceMs: hit.row.ts - CARRY_MS, untilMs: hit.row.ts })).filter(
      (l) => topicOf(l) === topicOf(hit),
    );
    if (!near.some((l) => l.address === hit.address)) near.push(hit);
    const red = redactAll(near);
    const self = near.find((l) => l.address === hit.address) as Located;
    return { ok: true, message: toView(hit, red.get(self) as RedactResult) };
  });
}

export interface TopicView {
  topic: string;
  chat_alias: string;
  thread: number;
  count: number;
  last_ts: string;
}

export function topics(cfg: ReaderConfig, args: { days?: number } = {}): TopicView[] {
  const now = (cfg.now ?? Date.now)();
  const since = now - clampDays(args.days) * DAY_MS;
  return withDb(cfg, (db) => {
    const acc = new Map<string, TopicView>();
    for (const l of locate(selectOwnerInbound(db, cfg, { sinceMs: since }))) {
      const key = topicKey(l.chatId, l.thread);
      const cur = acc.get(key);
      if (cur) {
        cur.count++;
        if (new Date(l.row.ts).toISOString() > cur.last_ts) cur.last_ts = new Date(l.row.ts).toISOString();
      } else {
        acc.set(key, {
          topic: key,
          chat_alias: chatAlias(l.chatId),
          thread: l.thread,
          count: 1,
          last_ts: new Date(l.row.ts).toISOString(),
        });
      }
    }
    return [...acc.values()].sort((x, y) => y.count - x.count);
  });
}
