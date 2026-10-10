/**
 * store-durable-fs — durable StorePort adapter (S7 / GAP 1: survive-turn).
 *
 * WHY THIS EXISTS: `MemoryStore` keeps the write-model journal in a private in-process array, so an act
 * written in turn N evaporates when the process exits — the brain's memory does NOT survive "each turn =
 * a fresh process". `MdEnvelopeStore` can read from disk but is ASYNC and never implements the sync
 * `StorePort`, so `Engine.write` has no act→disk path today. This adapter closes that gap under OQ-1
 * branch (A) = SYNC: it implements the SAME sync `StorePort` interface `MemoryStore` does (zero signature
 * change to `store-port.ts`, `Engine`, or any caller), persisting the append-only journal as JSONL on
 * disk and rebuilding the read-model from that file on boot.
 *
 * Contract (durable-storeport.design.md §2, C1–C5):
 *   C1 durable append-on-write : `writeAct` appends one JSONL line and fsync's it BEFORE returning — the
 *                                act is on disk by the time `write()` returns `ok`, no background flush.
 *   C2 rebuild-from-journal    : the constructor reads the whole journal file and re-folds it through the
 *                                ONE pure reducer (`core/projection.project`) — same code path as
 *                                MemoryStore, only the SOURCE differs (disk vs in-RAM array).
 *   C3 append-only-forward     : the file is only ever appended. A torn last line (crash mid-append) is
 *                                dropped on parse; earlier lines are never rewritten.
 *   C4 idempotent re-ingest    : `acts()` returns the disk-rebuilt journal, so `Engine.write`'s dedup
 *                                (source_ref+snapshotHash) works ACROSS a reboot with no engine edit.
 *   C5 single-writer           : an advisory PID lock next to the journal fails a second concurrent
 *                                writer closed (or reclaims a stale lock from a dead PID) — closes the
 *                                V3 "two agents race one journal" risk the gateway dup-bug can trigger.
 *
 * The seed/base corpus (e.g. policy:constitution) is NOT persisted here — it is substrate supplied by the
 * loader on every boot, exactly as with MemoryStore. Only ACTS are durable (system-of-record).
 */
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  writeSync,
  fsyncSync,
} from 'node:fs';
import { join } from 'node:path';
import { foldInto, project } from '../core/projection.js';
import { redactAct } from '../core/erasure.js';
import type { Act, EnvelopeNode, PredicateRegistry } from '../core/types.js';
import type { StorePort } from '../ports/store-port.js';
import { decodeLine, encodeLine, parseJournal } from './journal-codec.js';

/** Thrown when the durable store cannot take the single-writer lock (a live writer already holds it). */
export class DurableStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DurableStoreError';
  }
}

/** True if a process with this pid is currently alive (signal 0 probes without killing). */
function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true; // signal delivered → alive
  } catch (e) {
    // EPERM = alive but not ours (still a live writer); ESRCH = no such process (stale).
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** R-4 / AC-15: one unreadable journal line, reported (never silently swallowed) during hydrate. */
export interface BadLineInfo {
  /** 1-based line number within journal.jsonl. */
  lineNo: number;
  /** Parse error message (or 'torn-tail' for an unterminated final chunk). */
  reason: string;
  /** Byte offset of the line's first byte within journal.jsonl. */
  byteOffset: number;
}

/** Optional knobs (4th ctor arg) — all optional, so existing call sites are unchanged. */
export interface DurableFsStoreOptions {
  /** Called once per skipped corrupt (complete, `\n`-terminated) line during hydrate. */
  onBadLine?: (info: BadLineInfo) => void;
  /** Called when the journal ends with an unterminated chunk (crash mid-append); the chunk is skipped. */
  onTornTail?: (info: BadLineInfo) => void;
}

export class DurableFsStore implements StorePort {
  /** The non-projected substrate (seed nodes) — supplied each boot, never persisted here. */
  private readonly base: EnvelopeNode[];
  private readonly baseById: Map<string, EnvelopeNode>;
  /** append-only write-model, mirrored from disk (system-of-record). */
  private journal: Act[] = [];
  /** read-model: source_ref → projected node, folded from the journal's domain_events. */
  private projection = new Map<string, EnvelopeNode>();

  private readonly journalPath: string;
  private readonly lockPath: string;
  private lockHeld = false;
  /** GAP 2 / G1: the TENANT predicate registry (see MemoryStore). Defaults to `{}` — kernel-neutral. */
  private readonly registry: PredicateRegistry;
  private readonly opts: DurableFsStoreOptions;
  /** R-4: number of complete-but-unparseable lines skipped by the last hydrate (torn tail NOT counted). */
  private badLines = 0;
  /** R-4: the last hydrate found an unterminated tail chunk (skipped; file NOT truncated by the engine). */
  private torn: BadLineInfo | null = null;

  constructor(
    storeDir: string,
    base: EnvelopeNode[] = [],
    registry: PredicateRegistry = {},
    opts: DurableFsStoreOptions = {},
  ) {
    this.opts = opts;
    mkdirSync(storeDir, { recursive: true });
    this.journalPath = join(storeDir, 'journal.jsonl');
    this.lockPath = `${this.journalPath}.lock`;
    this.registry = registry;

    this.acquireLock(); // C5: fail-closed against a second concurrent writer

    this.base = [...base];
    this.baseById = new Map(this.base.map((n) => [n.id, n]));

    this.hydrateFromDisk(); // C2: rebuild the read-model from the durable journal

    // Release the lock on normal process exit so the next turn's process can take it.
    process.once('exit', () => this.close());
  }

  /** C5 — take the advisory single-writer lock; reclaim it only if the recorded PID is dead. */
  private acquireLock(): void {
    try {
      const fd = openSync(this.lockPath, 'wx'); // wx = create, fail if it already exists
      writeSync(fd, String(process.pid));
      closeSync(fd);
      this.lockHeld = true;
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    }
    // Lock file exists — is its owner still alive?
    const raw = existsSync(this.lockPath) ? readFileSync(this.lockPath, 'utf8').trim() : '';
    const ownerPid = Number(raw);
    if (ownerPid && ownerPid !== process.pid && pidAlive(ownerPid)) {
      throw new DurableStoreError(
        `another writer (pid ${ownerPid}) holds the single-writer lock on ${this.journalPath}`,
      );
    }
    // Stale (dead owner) or ours — reclaim.
    try {
      unlinkSync(this.lockPath);
    } catch {
      /* raced away by another reclaimer — the open below will re-check */
    }
    const fd = openSync(this.lockPath, 'wx');
    writeSync(fd, String(process.pid));
    closeSync(fd);
    this.lockHeld = true;
  }

  /** Release the single-writer lock (idempotent). Also called from the process 'exit' hook. */
  close(): void {
    if (!this.lockHeld) return;
    try {
      unlinkSync(this.lockPath);
    } catch {
      /* already gone */
    }
    this.lockHeld = false;
  }

  /**
   * V7 erasure seam ON DISK (S10 / §9-2) — serialize an act into a journal line whose IMMUTABLE audit meta
   * and its ERASABLE payload zone are physically DE-INTERLEAVED via `splitAct` (the erasable content lives
   * under a SEPARATE `erasable` key, never a flat top-level `payload`). The line format itself (leading
   * `"_v":1`, v0 back-compat) is owned by the ONE codec `journal-codec.ts` (SPEC-brain-data-doors R-4.1).
   */
  private actToLine(act: Act): string {
    return `${encodeLine(act)}\n`;
  }

  /** Inverse of `actToLine` — the codec re-merges the erasable zone (v1 and legacy v0 lines alike). */
  private lineToAct(line: string): Act {
    return decodeLine(line);
  }

  /**
   * C2/C3 — read the whole append-only journal off disk and re-fold it into the read-model.
   *
   * R-4 / AC-15: a corrupt line is SKIPPED (continue), never a `break` — acts after it stay alive. Each skip
   * is reported via `onBadLine` and counted in `badLineCount`. An unterminated final chunk (no trailing
   * `\n` = crash mid-append) is skipped too and surfaced as `tornTail`/`onTornTail`. The engine NEVER
   * truncates the file here — repair (after backup) is the hosting service's job.
   */
  private hydrateFromDisk(): void {
    this.journal = [];
    this.badLines = 0;
    this.torn = null;
    if (!existsSync(this.journalPath)) {
      this.projection = new Map();
      return;
    }
    const parsed = parseJournal(readFileSync(this.journalPath));
    // R-4 / AC-15: bad lines and the torn tail are reported in file order, exactly as before the codec
    for (const b of parsed.bad) {
      this.badLines += 1;
      this.opts.onBadLine?.({ lineNo: b.lineNo, reason: b.reason, byteOffset: b.byteOffset });
    }
    if (parsed.torn) {
      this.torn = { lineNo: parsed.torn.lineNo, reason: 'torn-tail', byteOffset: parsed.torn.byteOffset };
      this.opts.onTornTail?.(this.torn);
    }
    this.journal = parsed.acts;
    this.projection = project(this.journal, this.registry);
  }

  /** R-4: complete-but-unparseable lines skipped by the last hydrate. */
  get badLineCount(): number {
    return this.badLines;
  }

  /** R-4: the unterminated tail chunk found by the last hydrate, or null. */
  get tornTail(): BadLineInfo | null {
    return this.torn;
  }

  /** The current graph (read-model): substrate nodes plus the log-projected nodes. */
  load(): EnvelopeNode[] {
    return [...this.base, ...this.projection.values()];
  }

  readNode(id: string): EnvelopeNode | null {
    return this.projection.get(id) ?? this.baseById.get(id) ?? null;
  }

  /** C1 — durably append the act (fsync before return), then fold it into the read-model incrementally. */
  writeAct(act: Act): Act {
    let line = this.actToLine(act); // S10/§9-2: split immutable meta ⟂ erasable payload zone on disk
    // R-4: if hydrate found an unterminated tail, start on a fresh line so this act is not glued onto the
    // torn chunk (append-only — the torn bytes stay for the service to back up/repair).
    if (this.torn) line = `\n${line}`;
    const fd = openSync(this.journalPath, 'a');
    try {
      writeSync(fd, line);
      fsyncSync(fd); // force out of the OS page cache — durable even on an immediate hard kill
    } finally {
      closeSync(fd);
    }
    this.torn = null; // the torn chunk is now a terminated (bad) line, the file ends on `\n` again
    this.journal.push(act);
    foldInto(this.projection, act, this.registry);
    return act;
  }

  /**
   * ⚠ DEPRECATED / DEV-ONLY (I-4 resolved 2026-08-07, by-ref separation): this INLINE hard-erase REWRITES
   * the append-only journal line in place — a path that exists ONLY for the legacy inline-payload model. The
   * CANON is by-ref: real PII lives in a `PayloadStore` blob (ingest-rentacar `FilePayloadStore`), erasure =
   * `PayloadStore.shred(ref)` + a terminal `erased` act (engine erasure.ts::buildErasedAct), and the journal
   * is NEVER rewritten. Do NOT route production erasure through here; kept for the inline dev/test fence only.
   * See docs/_log/2026-08-07-whole-picture-and-cycle/I-4-RESOLUTION.decision.md. FORK-2 (supersede chain:
   * only the first occurrence shredded) remains OPEN but is scoped to this deprecated inline path.
   *
   * V7 hard-erase ON DISK (§9-3 / S10) — physically strip the ERASABLE payload zone of the journal line
   * carrying `actId`, leaving its IMMUTABLE audit meta (`id · actor · provenance · recordedAt · actKind ·
   * edges · payloadRef · payloadHash`) byte-for-byte, then re-hydrate the read-model. This is `redactAct`
   * applied to the WRITTEN LINE (not an in-memory act): a line serialized by `actToLine` is re-emitted with
   * its `erasable` zone removed, so `lineToAct` reads it back as pure meta (payload gone, edges intact).
   *
   * DELIBERATELY MINIMAL: the whole file is read and rewritten in one pass. Atomic/WAL-ordered shred
   * (fsync order, crash-safe rewrite) is a SEPARATE durability grain (F3) — NOT laid here.
   *
   * @deprecated Use the by-ref path (PayloadStore.shred + buildErasedAct); this rewrites the append-only log.
   */
  shredPayload(actId: string): void {
    if (!existsSync(this.journalPath)) return;
    const raw = readFileSync(this.journalPath, 'utf8');
    let done = false; // FORK-2: shred the FIRST matching occurrence only
    const out: string[] = [];
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      if (!done) {
        let act: Act;
        try {
          act = this.lineToAct(line);
        } catch {
          out.push(line); // torn/unparseable line — leave untouched
          continue;
        }
        if (act.id === actId) {
          out.push(this.actToLine(redactAct(act)).replace(/\n$/, '')); // erasable zone removed, meta kept
          done = true;
          continue;
        }
      }
      out.push(line);
    }
    writeFileSync(this.journalPath, out.length ? `${out.join('\n')}\n` : '');
    this.hydrateFromDisk(); // re-fold the erased journal into the read-model
  }

  /** Read-only view of the append-only journal (write-model reader for CQRS/rebuild + PII greps). */
  acts(): readonly Act[] {
    return this.journal;
  }

  rebuild(from: 'journal' | 'files'): EnvelopeNode[] {
    // Same semantics as MemoryStore: the graph is a deterministic projection of the log. `journal`
    // re-folds the (disk-mirrored) log through the one pure reducer; `files` is the M0 no-op (base is
    // the source). No incremental state is consulted, so this is a true rebuild-from-journal.
    if (from === 'journal') this.projection = project(this.journal, this.registry);
    return this.load();
  }
}
