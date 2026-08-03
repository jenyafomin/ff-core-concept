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
  writeSync,
  fsyncSync,
} from 'node:fs';
import { join } from 'node:path';
import { foldInto, project } from '../core/projection.js';
import type { Act, EnvelopeNode, PredicateRegistry } from '../core/types.js';
import type { StorePort } from '../ports/store-port.js';

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

  constructor(storeDir: string, base: EnvelopeNode[] = [], registry: PredicateRegistry = {}) {
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

  /** C2/C3 — read the whole append-only journal off disk and re-fold it into the read-model. */
  private hydrateFromDisk(): void {
    this.journal = [];
    if (!existsSync(this.journalPath)) {
      this.projection = new Map();
      return;
    }
    const raw = readFileSync(this.journalPath, 'utf8');
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      try {
        this.journal.push(JSON.parse(line) as Act);
      } catch {
        // C3: a torn final line (process killed mid-append) — stop here; earlier lines are intact.
        break;
      }
    }
    this.projection = project(this.journal, this.registry);
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
    const line = `${JSON.stringify(act)}\n`;
    const fd = openSync(this.journalPath, 'a');
    try {
      writeSync(fd, line);
      fsyncSync(fd); // force out of the OS page cache — durable even on an immediate hard kill
    } finally {
      closeSync(fd);
    }
    this.journal.push(act);
    foldInto(this.projection, act, this.registry);
    return act;
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
