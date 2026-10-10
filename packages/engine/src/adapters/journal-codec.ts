/**
 * journal-codec — the ONE serializer/parser of a JSONL journal line (ADR-0017 D3, SPEC-brain-data-doors R-4).
 *
 * Every reader of `journal.jsonl` goes through here: `DurableFsStore` (hydrate + append), the brain's pass-1
 * registry scan and `replay.ts`. Before this module there were two hand-written parsers that could drift.
 *
 * Line format:
 *   v1 (written now): `{"_v":1, ...meta, "erasable": payload}` — `_v` is the FIRST key. It is the version of
 *       THIS ADAPTER'S serialization, NOT `provenance.schema_v` (the act envelope's own version).
 *   v0 (legacy, read forever): no leading `_v`. Either the split form (`erasable` key) or the whole act inline
 *       (`payload` at top level). The journal is never rewritten (ADR-0017 §0) — v0 lines stay v0.
 *
 * `_v` is stripped ONLY when it is the first key. A leading `_v` that is not exactly the integer 1 → the line
 * is bad (`unsupported-line-version`), never guessed at. An act that carries its own top-level `_v` is refused
 * on encode (it would be indistinguishable from the line version on read).
 */
import { createHash } from 'node:crypto';
import type { Act } from '../core/types.js';
import { splitAct } from '../core/erasure.js';

/** Current line version written by `encodeLine`. */
export const JOURNAL_LINE_VERSION = 1 as const;

/** Reserved top-level key of a journal line (the line version). */
export const LINE_VERSION_KEY = '_v' as const;

/** Reason of a bad line whose leading `_v` is not a version this codec reads. */
export const UNSUPPORTED_LINE_VERSION = 'unsupported-line-version' as const;

export class JournalCodecError extends Error {
  constructor(
    message: string,
    readonly reason: string = message,
  ) {
    super(message);
    this.name = 'JournalCodecError';
  }
}

/** Serialize one act into a journal line (no trailing `\n`). Throws on an act with its own `_v`. */
export function encodeLine(act: Act): string {
  if (Object.prototype.hasOwnProperty.call(act, LINE_VERSION_KEY)) {
    throw new JournalCodecError(`act ${act.id} carries reserved top-level key '${LINE_VERSION_KEY}'`, 'reserved-line-key');
  }
  const { meta, erasable } = splitAct(act);
  // `_v` first (decodeLine strips it only in that position); `erasable: undefined` is dropped by JSON.stringify
  return JSON.stringify({ [LINE_VERSION_KEY]: JOURNAL_LINE_VERSION, ...meta, erasable });
}

/** Parse one journal line back into the ORIGINAL act. Throws (JournalCodecError / SyntaxError) on a bad line. */
export function decodeLine(line: string): Act {
  const parsed: unknown = JSON.parse(line);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new JournalCodecError('journal line is not a JSON object', 'not-an-object');
  }
  let obj = parsed as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys[0] === LINE_VERSION_KEY) {
    const v = obj[LINE_VERSION_KEY];
    if (v !== JOURNAL_LINE_VERSION) {
      throw new JournalCodecError(`${UNSUPPORTED_LINE_VERSION}: ${JSON.stringify(v)}`, UNSUPPORTED_LINE_VERSION);
    }
    const { [LINE_VERSION_KEY]: _v, ...rest } = obj;
    obj = rest;
  }
  // data-doors review: every act has a string `id` — a JSON object without one is a BAD line, never a ghost act
  if (typeof obj.id !== 'string' || obj.id === '') {
    throw new JournalCodecError('journal line has no string id', 'missing-id');
  }
  // v0 heuristic (unchanged): split line → re-merge the erasable zone; legacy inline line → as-is
  if ('erasable' in obj) {
    const { erasable, ...meta } = obj;
    return (erasable === undefined ? meta : { ...meta, payload: erasable }) as unknown as Act;
  }
  return obj as unknown as Act;
}

/** One unreadable, complete (`\n`-terminated) line. Carries no raw text (V7) — only where and a digest. */
export interface JournalBadLine {
  /** 1-based line number. */
  lineNo: number;
  /** Byte offset of the line's first byte. */
  byteOffset: number;
  /** Parse error message (`unsupported-line-version: …` for a foreign line version). */
  reason: string;
  /** sha256 hex of the line bytes (lets an operator find the line in the archived source). */
  sha256: string;
}

export interface JournalTornTail {
  lineNo: number;
  byteOffset: number;
  reason: 'torn-tail';
}

export interface ParsedJournal {
  /** Acts in file order. */
  acts: Act[];
  /** Line number of each act in `acts` (same index). */
  lineNos: number[];
  bad: JournalBadLine[];
  /** The unterminated final chunk (crash mid-append), or null. Parsing stops there. */
  torn: JournalTornTail | null;
}

/** Parse a whole journal buffer. Bad lines are skipped and reported; acts after them stay alive. */
export function parseJournal(buf: Buffer): ParsedJournal {
  const out: ParsedJournal = { acts: [], lineNos: [], bad: [], torn: null };
  let start = 0;
  let lineNo = 0;
  while (start < buf.length) {
    lineNo += 1;
    const nl = buf.indexOf(0x0a, start);
    const terminated = nl !== -1;
    const end = terminated ? nl : buf.length;
    const line = buf.toString('utf8', start, end);
    const byteOffset = start;
    start = end + 1;
    if (line.trim() === '') continue;
    if (!terminated) {
      // writers always emit `...\n` → an unterminated tail is an incomplete append
      out.torn = { lineNo, byteOffset, reason: 'torn-tail' };
      break;
    }
    try {
      out.acts.push(decodeLine(line));
      out.lineNos.push(lineNo);
    } catch (e) {
      out.bad.push({
        lineNo,
        byteOffset,
        reason: (e as Error).message,
        sha256: createHash('sha256').update(buf.subarray(byteOffset, end)).digest('hex'),
      });
    }
  }
  return out;
}
