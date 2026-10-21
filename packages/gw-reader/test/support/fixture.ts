// Tmp fixture SQLite with the gateway `messages` schema (copied from agents-manager live DB .schema).
// Tests NEVER touch the live gateway DB.

import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

export const OWNER = '1112667160';
export const CHAT_A = '-1004351636302';
export const CHAT_B = '-1004426951507';
export const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);
export const DAY = 86_400_000;

const SCHEMA = `CREATE TABLE IF NOT EXISTS "messages" ("id" varchar PRIMARY KEY NOT NULL, "sessionKey" varchar NOT NULL, "botId" varchar NOT NULL, "direction" varchar NOT NULL, "userId" varchar NOT NULL, "username" varchar, "text" text NOT NULL, "ts" integer NOT NULL, "refs" text, "costUsd" float, "channelMessageId" varchar, "kind" varchar);
CREATE INDEX "idx_messages_ts" ON "messages" ("ts");
CREATE INDEX "idx_messages_session_key" ON "messages" ("sessionKey");`;

export interface FixtureRow {
  chat?: string;
  thread?: number | null;
  direction?: 'in' | 'out';
  userId?: string;
  text: string;
  ageMs?: number;
  mid?: string | null;
  id?: string;
}

export function sessionKey(chat: string, thread: number | null): string {
  return thread === null ? `telegram:${chat}:ff-orchestrator` : `telegram:${chat}:${thread}:ff-orchestrator`;
}

export interface Fixture {
  dir: string;
  dbPath: string;
  labelsPath: string;
  hash(): string;
  cleanup(): void;
}

let midSeq = 1000;

export function makeFixture(rows: FixtureRow[]): Fixture {
  const dir = mkdtempSync(join(tmpdir(), 'gw-reader-'));
  const dbPath = join(dir, 'gateway.db');
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  const ins = db.prepare(
    'INSERT INTO messages (id, sessionKey, botId, direction, userId, username, text, ts, refs, costUsd, channelMessageId, kind) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  );
  for (const r of rows) {
    const direction = r.direction ?? 'in';
    const mid = r.mid === undefined ? String(midSeq++) : r.mid;
    ins.run(
      r.id ?? randomUUID(),
      sessionKey(r.chat ?? CHAT_A, r.thread === undefined ? 56 : r.thread),
      'ff',
      direction,
      r.userId ?? (direction === 'in' ? OWNER : ''),
      'owner',
      r.text,
      NOW - (r.ageMs ?? DAY),
      null,
      null,
      mid,
      direction === 'out' ? 'final' : null,
    );
  }
  db.close();
  return {
    dir,
    dbPath,
    labelsPath: join(dir, 'labels', 'labels.jsonl'),
    hash: () => createHash('sha256').update(readFileSync(dbPath)).digest('hex'),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

export function cfg(f: Fixture) {
  return { dbPath: f.dbPath, ownerId: OWNER, now: () => NOW };
}
