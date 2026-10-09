// @ff/brain-mcp — outbox for `record` while the service is down (SPEC-brain-v0.6 R-8, AC-27; risk R-8).
//
// `<home>/outbox/<idem|uuid>.json`, file 0600 in a 0700 dir. The entry carries the env identity of the
// original turn; the service re-checks it against readers.json on replay (the client trusts nothing).
// A file is removed only after a SETTLING answer: accepted, deduped or a definitive refusal
// (client.ts OUTBOX_FINAL_CODES); transient answers (401/5xx/RATE_LIMITED) keep it.

import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTRACT_VERSION, type CallerContext, type OutboxEntry, type RecordRequest } from './contract.js';

export interface OutboxItem {
  file: string;
  entry: OutboxEntry;
}

export class Outbox {
  constructor(readonly dir: string) {}

  /** Parks a record call. Same idem → same file (overwrite is harmless: the service dedups by idem). */
  put(caller: CallerContext, request: RecordRequest, now: Date = new Date()): string {
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    chmodSync(this.dir, 0o700); // mode is ignored when the dir already existed
    const name = `${caller.idem ?? randomUUID()}.json`;
    const file = join(this.dir, name);
    const entry: OutboxEntry = {
      contract: CONTRACT_VERSION,
      verb: 'record',
      queued_at: now.toISOString(),
      caller,
      request,
    };
    writeFileSync(file, JSON.stringify(entry), { mode: 0o600 });
    chmodSync(file, 0o600); // mode is ignored when the file already existed
    return file;
  }

  /** Pending entries, oldest first. Unreadable/corrupt files are skipped (left for the owner). */
  list(): OutboxItem[] {
    let names: string[];
    try {
      names = readdirSync(this.dir).filter((n) => n.endsWith('.json'));
    } catch {
      return [];
    }
    const items: OutboxItem[] = [];
    for (const n of names) {
      const file = join(this.dir, n);
      try {
        const entry = JSON.parse(readFileSync(file, 'utf8')) as OutboxEntry;
        if (entry && entry.verb === 'record' && entry.request && entry.caller) items.push({ file, entry });
      } catch {
        /* corrupt → skip */
      }
    }
    return items.sort((a, b) => a.entry.queued_at.localeCompare(b.entry.queued_at));
  }

  remove(file: string): void {
    rmSync(file, { force: true });
  }
}
