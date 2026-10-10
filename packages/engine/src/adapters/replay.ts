/**
 * replay — journal migration BELOW the Engine (ADR-0017 D3, SPEC-brain-data-doors R-4.3/R-4.4).
 *
 *   readJournalFile(path)          → the source parsed by the ONE codec (read-only, no lock taken)
 *   replayJournal(source, target)  → every readable act copied into an EMPTY target via `writeAct`,
 *                                    in source order, `recordedAt` and unknown fields untouched
 *
 * Why below the Engine: `Engine.write` re-stamps `recordedAt` and dedups by content — a migration through it
 * would rewrite history. The StorePort contract (store-port.ts) guarantees the adapter keeps the act verbatim.
 *
 * RULE (R-4.4): the SOURCE IS NEVER MODIFIED OR DELETED by a replay. Bad lines are reported (line number,
 * byte offset, reason, sha256 — never the raw text, V7) and NOT copied; their bytes live only in the source.
 * After a migration the source journal is ARCHIVED (kept), so a bad line can still be inspected/recovered.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Act } from '../core/types.js';
import type { StorePort } from '../ports/store-port.js';
import { parseJournal, type JournalBadLine, type JournalTornTail } from './journal-codec.js';

export class ReplayError extends Error {
  constructor(
    readonly code: 'TARGET_NOT_EMPTY',
    message: string,
  ) {
    super(message);
    this.name = 'ReplayError';
  }
}

/** A parsed source journal (read-only snapshot). */
export interface JournalSource {
  path: string;
  /** sha256 hex of the whole source file at read time. */
  sha256: string;
  acts: Act[];
  bad: JournalBadLine[];
  torn: JournalTornTail | null;
}

export interface ReplayReport {
  /** Acts written into the target. */
  copied: number;
  /** Unreadable lines (not copied; their bytes stay in the archived source). No raw text. */
  bad: JournalBadLine[];
  /** The unterminated tail of the source, if any (not copied). */
  torn: JournalTornTail | null;
  sourcePath: string;
  sourceSha256: string;
}

/** Read a journal file without taking the writer lock and without writing anything. */
export function readJournalFile(path: string): JournalSource {
  const buf = readFileSync(path);
  const parsed = parseJournal(buf);
  return {
    path,
    sha256: createHash('sha256').update(buf).digest('hex'),
    acts: parsed.acts,
    bad: parsed.bad,
    torn: parsed.torn,
  };
}

/**
 * Copy a source journal into an EMPTY target store, below the Engine. A non-empty target → ReplayError
 * `TARGET_NOT_EMPTY` before anything is written (a merge of two histories is not a migration).
 */
export function replayJournal(source: string | JournalSource, target: Pick<StorePort, 'acts' | 'writeAct'>): ReplayReport {
  const src = typeof source === 'string' ? readJournalFile(source) : source;
  if (target.acts().length > 0) {
    throw new ReplayError('TARGET_NOT_EMPTY', `replay target already holds ${target.acts().length} act(s)`);
  }
  let copied = 0;
  for (const act of src.acts) {
    target.writeAct(act);
    copied += 1;
  }
  return {
    copied,
    bad: src.bad.map((b) => ({ ...b })),
    torn: src.torn ? { ...src.torn } : null,
    sourcePath: src.path,
    sourceSha256: src.sha256,
  };
}
