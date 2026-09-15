#!/usr/bin/env node
/**
 * THROWAWAY foreign reader — packages/engine/test/_throwaway/foreign-reader.mjs
 *
 * The "Чужой Читатель" (Foreign Reader Test), F3 (V5-portability falsifier), per the design in
 * docs/02-project/core/01-brain/04-observer-mvp/adversarial-checkpoint-2026-09-04.analysis.md §3.
 *
 * This process lives OUTSIDE @ff/engine: it imports NOTHING from `packages/engine/src` (only Node's
 * built-in `node:fs`), runs under plain `node` (no `tsx`, no TypeScript, no `@ff/engine` dependency),
 * and knows exactly TWO wire facts about the unit's own access law — nothing else about the schema:
 *
 *   1. the reserved payload key name `readable_by` (an array of subject strings) gates who may read
 *      the node a `domain_event` line projects into (mirrors `core/projection.ts:54,105-108`, but this
 *      script does not read or import that file — it is told the key name, not the mechanism);
 *   2. "freshest wins": among journal lines sharing the same `provenance.source_ref`, the LATEST one is
 *      authoritative — recordedAt string-compares (ISO-8601 sorts lexically), ties broken by physical
 *      append order (append-only log convention, not a projection import).
 *
 * If the unit's freshest record carries no (or a malformed) `readable_by`, the reader is FAIL-CLOSED:
 * it refuses regardless of viewer. This is the falsifier's teeth — if the wire law can only be enforced
 * by importing engine code (resolve.ts / projection.ts), a naive outside reader given only the two facts
 * above would get it wrong. PASS means it does not.
 *
 * Wire-shape note: the durable adapter (`adapters/store-durable-fs.ts::actToLine`) writes each line as
 * `{...meta, erasable}` — the payload zone lives under the key `erasable`, not `payload`. A legacy
 * inline line (no split) carries it flat under `payload`. This reader checks BOTH spellings — that is
 * still just "the key name", never the split/merge code that produces them.
 *
 * Usage:   node foreign-reader.mjs <journalPath> <sourceRef> <viewer>
 * Prints one JSON line to stdout:
 *   {"allowed":true,"body":{...}}   — viewer is in the freshest record's readable_by
 *   {"allowed":false}               — viewer is not listed, or readable_by is absent/malformed
 *   {"allowed":false,"reason":"no record for source_ref"} — source_ref has no journal line at all
 * Exit code is 0 for any successful allow/deny decision; non-zero only on a hard failure (bad args,
 * unreadable file).
 */
import { readFileSync } from 'node:fs';

const [, , journalPath, sourceRef, viewer] = process.argv;
if (!journalPath || !sourceRef || !viewer) {
  console.error('usage: foreign-reader.mjs <journalPath> <sourceRef> <viewer>');
  process.exit(2);
}

const raw = readFileSync(journalPath, 'utf8');
const lines = raw.split('\n').filter((l) => l.trim() !== '');

/** @type {{ recordedAt: string, index: number, zone: unknown } | null} */
let freshest = null;

lines.forEach((line, index) => {
  let rec;
  try {
    rec = JSON.parse(line); // plain JSON.parse — no engine helper, no schema knowledge
  } catch {
    return; // skip an unparseable/torn line (e.g. a crash mid-append)
  }
  const ref = rec && rec.provenance && rec.provenance.source_ref;
  if (ref !== sourceRef) return;

  const zone = rec.erasable !== undefined ? rec.erasable : rec.payload; // fact #1: the two known key spellings
  const recordedAt = typeof rec.recordedAt === 'string' ? rec.recordedAt : '';

  const isFresher =
    freshest === null ||
    recordedAt > freshest.recordedAt || // fact #2: freshest-wins by recordedAt
    (recordedAt === freshest.recordedAt && index > freshest.index); // tie-break: later line wins
  if (isFresher) freshest = { recordedAt, index, zone };
});

if (freshest === null) {
  console.log(JSON.stringify({ allowed: false, reason: 'no record for source_ref' }));
  process.exit(0);
}

const zone = freshest.zone && typeof freshest.zone === 'object' && !Array.isArray(freshest.zone) ? freshest.zone : {};
const readableBy = Array.isArray(zone.readable_by) ? zone.readable_by : null;

// FAIL-CLOSED: absent/malformed readable_by ⇒ deny, regardless of viewer. Mirrors the engine's own
// default-deny floor — but this reader never imported projection.ts to learn that; it is simply the
// only safe default for a naive reader that was told nothing else.
if (!readableBy || !readableBy.includes(viewer)) {
  console.log(JSON.stringify({ allowed: false }));
  process.exit(0);
}

const { readable_by: _readable_by, ...body } = zone;
console.log(JSON.stringify({ allowed: true, body }));
