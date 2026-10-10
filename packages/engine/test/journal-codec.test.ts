/**
 * journal-codec.test — SPEC-brain-data-doors R-4.1/R-4.2 (AC-D15, AC-D16): one codec, line version `_v`.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DurableFsStore,
  UNSUPPORTED_LINE_VERSION,
  decodeLine,
  encodeLine,
  parseJournal,
  type Act,
} from '../src/index.js';

process.setMaxListeners(0);

const act = (n: number, extra: Partial<Act> = {}): Act => ({
  id: `a_codec${n}`,
  actor: 'user:owner',
  actKind: 'domain_event',
  recordedAt: `2026-10-09T10:00:0${n}.000Z`,
  provenance: { source_ref: `u_codec${n}`, schema_v: 1 },
  payload: { type: 'note', label: `n${n}`, meta: { status: 'active' } },
  edges: [],
  ...extra,
});

function tmp(): { dir: string; cleanup(): void } {
  const dir = mkdtempSync(join(tmpdir(), 'ff-codec-'));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe('AC-D15: encode/decode, `_v` first, v0 back-compat', () => {
  it('a new line starts with {"_v":1 and round-trips deep-equal', () => {
    const a = act(1, { edges: [{ predicate: 'about', target: 'u_x', meta: { status: 'active' } }] });
    const line = encodeLine(a);
    expect(line.startsWith('{"_v":1')).toBe(true);
    expect(line).not.toMatch(/"payload":/); // erasable zone stays split
    expect(decodeLine(line)).toEqual(a);
    const noPayload = act(2);
    delete (noPayload as { payload?: unknown }).payload;
    expect(decodeLine(encodeLine(noPayload))).toEqual(noPayload);
  });

  it('legacy inline and legacy split-without-payload lines read as before', () => {
    const inline = act(3);
    expect(decodeLine(JSON.stringify(inline))).toEqual(inline);
    const { payload: _p, ...meta } = act(4);
    expect(decodeLine(JSON.stringify(meta))).toEqual(meta);
    const split = act(5);
    const { payload, ...m5 } = split;
    expect(decodeLine(JSON.stringify({ ...m5, erasable: payload }))).toEqual(split);
  });

  it('an act with its own top-level `_v` is refused on write (codec and DurableFsStore)', () => {
    const bad = { ...act(6), _v: 1 } as unknown as Act;
    expect(() => encodeLine(bad)).toThrow(/reserved top-level key '_v'/);
    const t = tmp();
    try {
      const store = new DurableFsStore(t.dir);
      expect(() => store.writeAct(bad)).toThrow(/_v/);
      expect(store.acts()).toHaveLength(0);
      store.close();
    } finally {
      t.cleanup();
    }
  });

  it('a non-leading `_v` in a legacy line is NOT stripped (it is the act\'s own field)', () => {
    const line = JSON.stringify({ id: 'a_x', _v: 7, actKind: 'domain_event' });
    expect(decodeLine(line)).toEqual({ id: 'a_x', _v: 7, actKind: 'domain_event' });
  });

  it('DurableFsStore writes v1 lines and reads them back across a reopen', () => {
    const t = tmp();
    try {
      const s1 = new DurableFsStore(t.dir);
      s1.writeAct(act(7));
      s1.close();
      const text = readFileSync(join(t.dir, 'journal.jsonl'), 'utf8');
      expect(text.startsWith('{"_v":1,')).toBe(true);
      const s2 = new DurableFsStore(t.dir);
      expect(s2.acts()).toEqual([act(7)]);
      s2.close();
    } finally {
      t.cleanup();
    }
  });
});

describe('AC-D16: an unsupported leading `_v` is a bad line; neighbours survive', () => {
  for (const v of [2, '1', 0, 1.5]) {
    it(`_v = ${JSON.stringify(v)} → bad (${UNSUPPORTED_LINE_VERSION})`, () => {
      const lines = [
        encodeLine(act(1)),
        JSON.stringify({ _v: v, ...act(2) }),
        encodeLine(act(3)),
      ];
      const parsed = parseJournal(Buffer.from(`${lines.join('\n')}\n`));
      expect(parsed.acts.map((a) => a.id)).toEqual(['a_codec1', 'a_codec3']);
      expect(parsed.bad).toHaveLength(1);
      expect(parsed.bad[0]!.lineNo).toBe(2);
      expect(parsed.bad[0]!.reason.startsWith(UNSUPPORTED_LINE_VERSION)).toBe(true);
      expect(parsed.bad[0]!.sha256).toMatch(/^[0-9a-f]{64}$/);

      // the store reports it through onBadLine, acts around it stay alive
      const t = tmp();
      try {
        writeFileSync(join(t.dir, 'journal.jsonl'), `${lines.join('\n')}\n`);
        const seen: string[] = [];
        const store = new DurableFsStore(t.dir, [], {}, { onBadLine: (b) => seen.push(b.reason) });
        expect(store.acts().map((a) => a.id)).toEqual(['a_codec1', 'a_codec3']);
        expect(store.badLineCount).toBe(1);
        expect(seen[0]!.startsWith(UNSUPPORTED_LINE_VERSION)).toBe(true);
        store.close();
      } finally {
        t.cleanup();
      }
    });
  }
});

describe('data-doors review: a line without a string id is a bad line', () => {
  it.each([
    ['no id', { actKind: 'domain_event', actor: 'x' }],
    ['numeric id', { id: 7, actKind: 'domain_event' }],
    ['empty id', { id: '', actKind: 'domain_event' }],
    ['v1 line, no id', { _v: 1, actKind: 'domain_event' }],
  ])('%s → bad, neighbours survive', (_name, obj) => {
    expect(() => decodeLine(JSON.stringify(obj))).toThrow(/no string id/);
    const parsed = parseJournal(Buffer.from(`${encodeLine(act(1))}\n${JSON.stringify(obj)}\n${encodeLine(act(3))}\n`));
    expect(parsed.acts.map((a) => a.id)).toEqual(['a_codec1', 'a_codec3']);
    expect(parsed.bad.map((b) => b.reason)).toEqual(['journal line has no string id']);
  });
});
