/**
 * store-durable-fs-badlines.test — SPEC-brain-v0.6 §3 R-4 / AC-15 (B0-engine).
 *
 * Before: `hydrateFromDisk` did `break` on the first unparseable line → every act AFTER it was silently lost
 * on reboot. Now: a corrupt line is skipped (continue) + reported via `onBadLine` / `badLineCount`; an
 * unterminated tail (crash mid-append) is skipped + reported via `tornTail` / `onTornTail`; the engine never
 * truncates the journal file (repair-after-backup is the service's job).
 */
import { describe, it, expect } from 'vitest';
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DurableFsStore, type BadLineInfo } from '../src/adapters/store-durable-fs.js';
import type { Act } from '../src/core/types.js';

function domainEvent(id: string, source_ref: string, payload: Record<string, unknown>): Act {
  return {
    id,
    actor: 'sync:test',
    provenance: { source_ref, snapshotHash: `h-${id}` },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    payload,
  };
}

function withDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'ff-badlines-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('DurableFsStore — bad journal lines are skipped, not fatal (R-4 / AC-15)', () => {
  it('a corrupt line in the middle: acts before AND after survive; onBadLine called once', () => {
    withDir((dir) => {
      const w = new DurableFsStore(dir);
      w.writeAct(domainEvent('a1', 'r1', { n: 1 }));
      w.close();
      const journal = join(dir, 'journal.jsonl');
      const offsetOfBad = readFileSync(journal).length;
      appendFileSync(journal, '{"id":"broken", this is not json\n');
      const w2 = new DurableFsStore(dir);
      w2.writeAct(domainEvent('a2', 'r2', { n: 2 }));
      w2.close();

      const bad: BadLineInfo[] = [];
      const torn: BadLineInfo[] = [];
      const r = new DurableFsStore(dir, [], {}, { onBadLine: (i) => bad.push(i), onTornTail: (i) => torn.push(i) });
      try {
        expect(r.acts().map((a) => a.id)).toEqual(['a1', 'a2']);
        expect(r.readNode('r1')).not.toBeNull();
        expect(r.readNode('r2')).not.toBeNull();
        expect(bad).toHaveLength(1);
        expect(bad[0].lineNo).toBe(2);
        expect(bad[0].byteOffset).toBe(offsetOfBad);
        expect(typeof bad[0].reason).toBe('string');
        expect(r.badLineCount).toBe(1);
        expect(r.tornTail).toBeNull();
        expect(torn).toHaveLength(0);
      } finally {
        r.close();
      }
    });
  });

  it('a torn tail (no trailing \\n) is skipped and reflected; the file is NOT truncated', () => {
    withDir((dir) => {
      const w = new DurableFsStore(dir);
      w.writeAct(domainEvent('a1', 'r1', { n: 1 }));
      w.close();
      const journal = join(dir, 'journal.jsonl');
      const offsetOfTail = readFileSync(journal).length;
      appendFileSync(journal, '{"id":"a2","actor":"sync:te'); // crash mid-append
      const sizeBefore = readFileSync(journal).length;

      const bad: BadLineInfo[] = [];
      const torn: BadLineInfo[] = [];
      const r = new DurableFsStore(dir, [], {}, { onBadLine: (i) => bad.push(i), onTornTail: (i) => torn.push(i) });
      try {
        expect(r.acts().map((a) => a.id)).toEqual(['a1']);
        expect(r.badLineCount).toBe(0);
        expect(bad).toHaveLength(0);
        expect(torn).toHaveLength(1);
        expect(r.tornTail).toEqual({ lineNo: 2, reason: 'torn-tail', byteOffset: offsetOfTail });
        expect(readFileSync(journal).length).toBe(sizeBefore); // engine does not truncate

        // A write after a torn tail lands on its own line → survives the next reboot.
        r.writeAct(domainEvent('a3', 'r3', { n: 3 }));
        expect(r.tornTail).toBeNull();
      } finally {
        r.close();
      }

      const r2 = new DurableFsStore(dir);
      try {
        expect(r2.acts().map((a) => a.id)).toEqual(['a1', 'a3']);
        expect(r2.badLineCount).toBe(1); // the former torn chunk is now a terminated bad line
        expect(r2.tornTail).toBeNull();
      } finally {
        r2.close();
      }
    });
  });

  it('options are optional: the 3-arg constructor still works and a clean journal reports nothing', () => {
    withDir((dir) => {
      const w = new DurableFsStore(dir, [], {});
      w.writeAct(domainEvent('a1', 'r1', { n: 1 }));
      w.close();
      const r = new DurableFsStore(dir);
      try {
        expect(r.acts()).toHaveLength(1);
        expect(r.badLineCount).toBe(0);
        expect(r.tornTail).toBeNull();
      } finally {
        r.close();
      }
    });
  });
});
