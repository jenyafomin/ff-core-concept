// @ff/brain/service/backup — journal backups (SPEC R-4, AC-21). A backup is a task IN the write queue
// (no write can interleave → the copy always ends on a complete line), triggered at start, every
// LIMITS.backupEveryActs acts, every LIMITS.backupEveryMs when something changed, and nightly.
// Each backup = `backups/journal-<ts>-<seq>.jsonl` + `.sha256` (both 0600); the newest LIMITS.backupsKept are
// kept (torn-tail copies `journal-torn-*` are evidence and never pruned). Optional mirror dir (service.json).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { LIMITS, type ClockPort } from '../contract.js';

import { durableCopy, nodeIo, tsStamp, type DurableIo } from './journal.js';

const BACKUP_RE = /^journal-\d{4}-\d{2}-\d{2}T[\d-]+Z-\d{4}\.jsonl$/;

export interface BackupResult {
  path: string;
  sha256: string;
  bytes: number;
  at: string;
}

export interface BackupOptions {
  journalPath: string;
  dir: string;
  mirror?: string;
  keep?: number;
  clock: ClockPort;
  /** fs steps (tests assert their order). Default: real fs + fsync. */
  io?: DurableIo;
}

export function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Verify a backup against its `.sha256` sidecar. */
export function verifyBackup(path: string): boolean {
  const side = `${path}.sha256`;
  if (!existsSync(side)) return false;
  const want = readFileSync(side, 'utf8').trim().split(/\s+/)[0];
  return want === sha256File(path);
}

/** Regular backups in `dir`, oldest first. */
export function listBackups(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => BACKUP_RE.test(f))
    .sort()
    .map((f) => join(dir, f));
}

export class BackupManager {
  private seq = 0;
  lastAt: string | null = null;

  constructor(private readonly opts: BackupOptions) {}

  /** Copy the journal now. MUST run inside the write queue. Returns null if there is no journal yet. */
  run(): BackupResult | null {
    const { journalPath, dir, clock } = this.opts;
    if (!existsSync(journalPath)) return null;
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const now = clock.now();
    this.seq = (this.seq + 1) % 10000;
    const name = `journal-${tsStamp(now)}-${String(this.seq).padStart(4, '0')}.jsonl`;
    const path = join(dir, name);
    const io = this.opts.io ?? nodeIo;
    // W1: copy to a tmp name → fsync → rename → sidecar the same way → fsync the dir; only THEN prune older
    // backups. A crash at any point leaves either no new backup or a complete, fsync'd one.
    durableCopy(journalPath, `${path}.tmp`, io);
    io.rename(`${path}.tmp`, path);
    const sha256 = sha256File(path);
    writeFileSync(`${path}.sha256.tmp`, `${sha256}  ${name}\n`, { mode: 0o600 });
    io.fsyncFile(`${path}.sha256.tmp`);
    io.rename(`${path}.sha256.tmp`, `${path}.sha256`);
    io.fsyncDir(dir);
    if (this.opts.mirror) {
      try {
        mkdirSync(this.opts.mirror, { recursive: true, mode: 0o700 });
        durableCopy(path, join(this.opts.mirror, name), io);
        durableCopy(`${path}.sha256`, join(this.opts.mirror, `${name}.sha256`), io);
        prune(this.opts.mirror, this.opts.keep ?? LIMITS.backupsKept);
      } catch {
        /* the mirror is best-effort; local backup already exists */
      }
    }
    prune(dir, this.opts.keep ?? LIMITS.backupsKept);
    this.lastAt = now.toISOString();
    return { path, sha256, bytes: statSync(path).size, at: this.lastAt };
  }
}

function prune(dir: string, keep: number): void {
  const all = listBackups(dir);
  for (const old of all.slice(0, Math.max(0, all.length - keep))) {
    rmSync(old, { force: true });
    rmSync(`${old}.sha256`, { force: true });
  }
}

/** ms until the next local `hour:00`. */
export function msUntilHour(now: Date, hour: number): number {
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export const backupName = (p: string): string => basename(p);
