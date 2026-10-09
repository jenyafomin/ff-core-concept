// @ff/brain/service/journal — journal hygiene BEFORE the store opens (SPEC R-4, AC-16, AC-20).
//
//   preflightLock: a live foreign writer holds `journal.jsonl.lock` → refuse to start (readable error) before
//                  touching the file (repairing a journal another process is appending to would corrupt it).
//   repairTornTail: the file does not end in `\n` (crash mid-append) → copy the WHOLE file to
//                  `backups/journal-torn-<ts>.jsonl` (0600) → fsync the copy AND its directory → only then
//                  cut to the last `\n` → fsync. Power loss between the steps can never leave a short copy
//                  next to an already-cut journal (review W1).
import { closeSync, copyFileSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, statSync, ftruncateSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { ClockPort } from '../contract.js';

export class BrainLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrainLockError';
  }
}

function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Throws BrainLockError if another live process holds the single-writer lock. */
export function preflightLock(lockPath: string, journalPath: string): void {
  if (!existsSync(lockPath)) return;
  const pid = Number(readFileSync(lockPath, 'utf8').trim());
  if (pid && pid !== process.pid && pidAlive(pid)) {
    throw new BrainLockError(
      `ff-brain is already running (pid ${pid} holds the lock on ${journalPath}). ` +
        `Stop it first (pm2 stop ff-brain). If no ff-brain is running, the pid was reused — delete ${lockPath}.`,
    );
  }
}

export interface TornTailRepair {
  /** Copy of the untruncated journal. */
  backupPath: string;
  /** Bytes removed from the end. */
  removedBytes: number;
  /** Size after truncation. */
  size: number;
}

/** The durability-relevant fs steps, injectable so tests can assert their ORDER (W1). */
export interface DurableIo {
  copy(src: string, dst: string): void;
  rename(from: string, to: string): void;
  fsyncFile(path: string): void;
  fsyncDir(dir: string): void;
  /** Cut the file to `len` bytes and fsync it. */
  cut(path: string, len: number): void;
}

export const nodeIo: DurableIo = {
  copy: (src, dst) => copyFileSync(src, dst),
  rename: (from, to) => renameSync(from, to),
  fsyncFile(path) {
    const fd = openSync(path, 'r');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  },
  fsyncDir(dir) {
    let fd: number;
    try {
      fd = openSync(dir, 'r');
    } catch {
      return; // the platform cannot open a directory for fsync — nothing more to do
    }
    try {
      fsyncSync(fd);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'EINVAL' && code !== 'EISDIR' && code !== 'EPERM' && code !== 'ENOTSUP') throw e;
    } finally {
      closeSync(fd);
    }
  },
  cut(path, len) {
    const fd = openSync(path, 'r+');
    try {
      ftruncateSync(fd, len);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  },
};

/** Copy `src` → `dst` (0600) and make the copy durable: fsync the file, then its directory. */
export function durableCopy(src: string, dst: string, io: DurableIo = nodeIo): void {
  io.copy(src, dst);
  chmodSync(dst, 0o600);
  io.fsyncFile(dst);
  io.fsyncDir(dirname(dst));
}

export const tsStamp = (d: Date): string => d.toISOString().replace(/[:.]/g, '-');

/** Repair a torn tail (no-op on a missing/empty/`\n`-terminated journal). */
export function repairTornTail(
  journalPath: string,
  backupsDir: string,
  clock: ClockPort,
  io: DurableIo = nodeIo,
): TornTailRepair | null {
  if (!existsSync(journalPath)) return null;
  const size = statSync(journalPath).size;
  if (size === 0) return null;
  const buf = readFileSync(journalPath);
  if (buf[buf.length - 1] === 0x0a) return null;

  const backupPath = join(backupsDir, `journal-torn-${tsStamp(clock.now())}.jsonl`);
  durableCopy(journalPath, backupPath, io); // the evidence is on disk BEFORE the cut
  const keep = buf.lastIndexOf(0x0a) + 1; // 0 when there is no complete line at all
  io.cut(journalPath, keep);
  return { backupPath, removedBytes: size - keep, size: keep };
}

/** The raw bytes of the line starting at `byteOffset` (without the `\n`). */
export function lineAt(buf: Buffer, byteOffset: number): Buffer {
  const nl = buf.indexOf(0x0a, byteOffset);
  return buf.subarray(byteOffset, nl === -1 ? buf.length : nl);
}
