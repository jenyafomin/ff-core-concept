/**
 * journal-replay.test — SPEC-brain-data-doors R-4.3/R-4.4 (AC-D17, AC-D18): replay BELOW the Engine.
 */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DurableFsStore,
  MemoryStore,
  ReplayError,
  encodeLine,
  readJournalFile,
  replayJournal,
  type Act,
  type EnvelopeNode,
  type PredicateRegistry,
} from '../src/index.js';

process.setMaxListeners(0);

const BASE: EnvelopeNode[] = [{ id: 'policy:constitution', type: 'policy', body: { protected_namespaces: [] } }];
const REG: PredicateRegistry = { 'lives-in': 'one' };
const SECRET_TEXT = 'секретный-текст-битой-строки';

/** The mixed fixture: v1 lines, v0 inline, v0 provenance-string, no schema_v, unknown fields, bad line, torn tail. */
function fixtureLines(): string[] {
  const v1: Act = {
    id: 'a_r1',
    actor: 'user:owner',
    actKind: 'domain_event',
    recordedAt: '2026-01-01T00:00:01.000Z',
    provenance: { source_ref: 'u_r1', schema_v: 1 },
    payload: { type: 'note', label: 'one' },
    edges: [{ predicate: 'lives-in', target: 'scope:a', meta: { status: 'active' } }],
  };
  const v0NoSchema = {
    id: 'a_r2',
    actor: 'agent:old',
    actKind: 'domain_event',
    recordedAt: '2025-12-31T23:00:00.000Z', // older than its predecessor: order, not time, decides
    provenance: { source_ref: 'u_r2' },
    payload: { type: 'task', title: 'legacy inline' },
    edges: [],
    future_field: { kept: true },
  };
  const v0ProvString = {
    id: 'a_r3',
    actor: 'agent:old',
    actKind: 'observation',
    recordedAt: '2026-01-01T00:00:03.000Z',
    provenance: 'legacy-provenance-string',
    edges: [],
  };
  const v1Update: Act = {
    ...v1,
    id: 'a_r4',
    recordedAt: '2026-01-01T00:00:04.000Z',
    payload: { type: 'note', label: 'one v2' },
    edges: [{ predicate: 'lives-in', target: 'scope:b', meta: { status: 'active' } }],
  };
  return [
    encodeLine(v1),
    JSON.stringify(v0NoSchema),
    `{"broken": "${SECRET_TEXT}"`, // bad line (not JSON)
    JSON.stringify(v0ProvString),
    encodeLine(v1Update),
  ];
}

function tmp(): { dir: string; cleanup(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'ff-replay-'));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

describe('AC-D17: replay into MemoryStore and DurableFsStore is lossless and ordered', () => {
  it('acts()[i] deep-equal (incl. recordedAt), load() equal, 1 bad + torn reported, no raw text, source untouched', () => {
    const src = tmp();
    const dst = tmp();
    try {
      const sourcePath = join(src.dir, 'journal.jsonl');
      writeFileSync(sourcePath, `${fixtureLines().join('\n')}\n{"id":"a_torn","actor":"x"`); // torn tail
      const before = sha(sourcePath);
      const source = readJournalFile(sourcePath);
      expect(source.acts).toHaveLength(4);

      const mem = new MemoryStore(BASE, REG);
      const rMem = replayJournal(sourcePath, mem);
      const dur = new DurableFsStore(dst.dir, BASE, REG);
      const rDur = replayJournal(sourcePath, dur);

      for (const r of [rMem, rDur]) {
        expect(r.copied).toBe(4);
        expect(r.bad).toHaveLength(1);
        expect(r.bad[0]).toMatchObject({ lineNo: 3, byteOffset: expect.any(Number), sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
        expect(r.torn).toMatchObject({ lineNo: 6, reason: 'torn-tail' });
        expect(r.sourcePath).toBe(sourcePath);
        expect(r.sourceSha256).toBe(before);
        expect(JSON.stringify(r)).not.toContain(SECRET_TEXT); // V7: no raw text in the report
      }

      for (let i = 0; i < source.acts.length; i++) {
        expect(mem.acts()[i]).toEqual(source.acts[i]);
        expect(dur.acts()[i]).toEqual(source.acts[i]);
      }
      expect(dur.acts()[1]!.recordedAt).toBe('2025-12-31T23:00:00.000Z');
      expect((dur.acts()[1] as unknown as Record<string, unknown>).future_field).toEqual({ kept: true });
      expect(dur.acts()[2]!.provenance).toBe('legacy-provenance-string');

      // the durable target survives a reopen with the same acts
      dur.close();
      const reopened = new DurableFsStore(dst.dir, BASE, REG);
      expect(reopened.acts()).toEqual(source.acts);
      expect(reopened.badLineCount).toBe(0);

      // projections agree: memory target = durable target = the source opened as a store
      const srcStore = new DurableFsStore(src.dir, BASE, REG);
      expect(mem.load()).toEqual(srcStore.load());
      expect(reopened.load()).toEqual(srcStore.load());
      expect(reopened.readNode('u_r1')!.edges!.map((e) => e.target)).toEqual(['scope:b']);
      srcStore.close();
      reopened.close();

      expect(sha(sourcePath)).toBe(before); // R-4.4: the source is never modified
    } finally {
      src.cleanup();
      dst.cleanup();
    }
  });
});

describe('AC-D18: a non-empty target is refused untouched', () => {
  it('TARGET_NOT_EMPTY, the target keeps exactly its acts and bytes', () => {
    const src = tmp();
    const dst = tmp();
    try {
      const sourcePath = join(src.dir, 'journal.jsonl');
      writeFileSync(sourcePath, `${fixtureLines().join('\n')}\n`);
      const target = new DurableFsStore(dst.dir, BASE, REG);
      const own: Act = { id: 'a_own', actor: 'user:owner', actKind: 'observation', recordedAt: '2026-02-02T00:00:00.000Z', edges: [] };
      target.writeAct(own);
      const targetPath = join(dst.dir, 'journal.jsonl');
      const tBefore = sha(targetPath);

      let caught: unknown;
      try {
        replayJournal(sourcePath, target);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ReplayError);
      expect((caught as ReplayError).code).toBe('TARGET_NOT_EMPTY');
      expect(target.acts()).toEqual([own]);
      expect(sha(targetPath)).toBe(tBefore);

      const mem = new MemoryStore(BASE, REG);
      mem.writeAct(own);
      expect(() => replayJournal(sourcePath, mem)).toThrow(ReplayError);
      expect(mem.acts()).toHaveLength(1);
      target.close();
      expect(existsSync(sourcePath)).toBe(true);
    } finally {
      src.cleanup();
      dst.cleanup();
    }
  });
});
