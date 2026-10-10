// @ff/brain/read/lens — the lens interpreter (SPEC-brain-r1-prompt-layers R-05). A lens is DATA (a `sys:lens`
// record); this module interprets its `shape`. R1 knows one shape — `compose`:
//
//   layers  = visible records of `spec.from` with status `spec.filter.status`
//   applies = ALL `spec.via` targets of the layer are in the context (AND): a {bot,chat,topic} layer never enters a
//             context without that topic; bot A's layer never reaches bot B in the same chat
//   order   = rank (MAX index of the layer's target kinds in `spec.order`) ↑, then `priority` ↑, then created_at
//             (recordedAt of the record's first act) ↑, then id ↑
//   text    = bodies with `trim() !== ''`, folded by `merge` (append | prepend | replace), joined by `spec.separator`
//
// Bodies, revs and source hashes are read from ONE synchronous pass over the store (manifest atomic with text).
// Read-only: never touches the write queue. Invisible records are simply absent (same gates as find/read).
import { createHash } from 'node:crypto';

import type {
  BrainResult,
  BrainWarning,
  LensContext,
  LensManifestEntry,
  LensRequest,
  LensResponse,
  Reader,
} from '../contract.js';
import { samePredicate, sameType } from '../domain/names.js';
import { SYS, TARGET_KEY_PATTERN, lensNodeId, type ComposeSpec } from '../domain/sys-types.js';
import { brainError, decodeNode, edgeStatus, type DomainRecord } from '../domain/to-act.js';

import { createReadGate, isRecordNode, type ReadDeps } from './access.js';

const LENS_RE = /^([a-z][a-z0-9-]{0,47})@([1-9]\d{0,5})$/;
const CONTEXT_KEYS: ReadonlyArray<keyof LensContext> = ['bot', 'chat', 'topic', 'user', 'project', 'agent'];
const KEY_RE = new RegExp(TARGET_KEY_PATTERN);
const SEP = '\u0000';

/** The `(kind, key)` pairs of a context; `topic` becomes `<chat>:<topic>` (unique only inside its chat). */
export function contextTargets(ctx: LensContext): Set<string> | string {
  const out = new Set<string>();
  for (const k of Object.keys(ctx)) if (!(CONTEXT_KEYS as readonly string[]).includes(k)) return `unknown context key '${k}'`;
  for (const kind of CONTEXT_KEYS) {
    const v = ctx[kind];
    if (v === undefined) continue;
    if (typeof v !== 'string' || v === '') return `context.${kind} must be a non-empty string`;
    let key = v;
    if (kind === 'topic') {
      if (ctx.chat === undefined) return 'context.topic needs context.chat';
      key = `${ctx.chat}:${v}`;
    }
    if (!KEY_RE.test(key)) return `context.${kind} must match ${TARGET_KEY_PATTERN}`;
    out.add(`${kind}${SEP}${key}`);
  }
  return out;
}

function parseComposeSpec(raw: unknown): ComposeSpec | null {
  if (typeof raw !== 'string') return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const s = o as Record<string, unknown>;
  const order = s.order;
  const filter = s.filter as Record<string, unknown> | undefined;
  if (typeof s.from !== 'string' || typeof s.via !== 'string' || typeof s.separator !== 'string') return null;
  if (!Array.isArray(order) || !order.every((k) => typeof k === 'string')) return null;
  if (!filter || typeof filter !== 'object' || filter.status !== 'active') return null;
  return { from: s.from, via: s.via, order: order as string[], filter: { status: 'active' }, separator: s.separator };
}

interface Layer {
  rec: DomainRecord;
  body: string;
  kinds: string[];
  rank: number;
  priority: number;
  createdAt: string;
  merge: 'append' | 'prepend' | 'replace';
  sourceHash?: string;
}

export const sha256Text = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** Interpret a lens for this reader. Caller authorization (gateway mandate only in R1) is the service's job. */
export function lens(reader: Reader, req: LensRequest, deps: ReadDeps): BrainResult<LensResponse> {
  if (!req || typeof req !== 'object' || Array.isArray(req)) return brainError('BAD_REQUEST', 'lens body must be an object');
  for (const k of Object.keys(req)) if (k !== 'lens' && k !== 'context') return brainError('BAD_REQUEST', `unknown key '${k}'`);
  const m = typeof req.lens === 'string' ? LENS_RE.exec(req.lens) : null;
  if (!m) return brainError('BAD_REQUEST', 'lens must be <lens_id>@<version>, e.g. prompt-compose@1');
  if (!req.context || typeof req.context !== 'object' || Array.isArray(req.context)) {
    return brainError('BAD_REQUEST', 'context must be an object');
  }
  const ctxSet = contextTargets(req.context);
  if (typeof ctxSet === 'string') return brainError('BAD_REQUEST', ctxSet);
  const [, lensId, versionStr] = m;
  const version = Number(versionStr);

  // ONE snapshot: nodes + acts read synchronously (manifest atomic with text)
  const gate = createReadGate(reader, deps);
  const firstAt = new Map<string, string>();
  const lastSource = new Map<string, string | undefined>();
  for (const a of deps.store.acts()) {
    const p = a.provenance as { source_ref?: unknown; source?: { hash?: unknown } } | undefined;
    const ref = p?.source_ref;
    if (typeof ref !== 'string') continue;
    if (!firstAt.has(ref) && typeof a.recordedAt === 'string') firstAt.set(ref, a.recordedAt);
    if (a.payload !== undefined) lastSource.set(ref, typeof p?.source?.hash === 'string' ? p.source.hash : undefined);
  }
  const targets = new Map<string, { kind: string; key: string }>();
  const candidates: DomainRecord[] = [];
  for (const node of deps.store.load()) {
    if (!isRecordNode(node)) continue;
    const rec = decodeNode(node);
    if (rec.status === 'retracted') continue;
    if (!gate.canSee(node, rec)) continue;
    if (sameType(rec.type, SYS.types.target)) {
      if (rec.status === 'active' && typeof rec.fields.kind === 'string' && typeof rec.fields.key === 'string') {
        targets.set(rec.id, { kind: rec.fields.kind, key: rec.fields.key });
      }
    } else candidates.push(rec);
  }
  const byCreated = (a: { createdAt: string; id: string }, b: { createdAt: string; id: string }) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  // the lens is a system node `lens:<id>@<v>` (sys-types.ts), readable when it sits in one of the reader's scopes
  const lensNode = deps.store.readNode(lensNodeId(lensId!, version));
  const lensRec = lensNode ? decodeNode(lensNode) : undefined;
  const mine = gate.scopes;
  if (
    !lensRec ||
    !sameType(lensRec.type, SYS.types.lens) ||
    lensRec.status !== 'active' ||
    lensRec.fields.lens_id !== lensId ||
    lensRec.fields.version !== version ||
    !lensRec.scopes.some((s) => mine.has(s))
  ) {
    return brainError('NOT_FOUND', `no active lens ${req.lens}`);
  }
  if (lensRec.fields.shape !== 'compose') return brainError('BAD_REQUEST', `lens shape '${String(lensRec.fields.shape)}' is not supported`);
  const spec = parseComposeSpec(lensRec.fields.spec);
  if (!spec) return brainError('INTERNAL', `lens ${req.lens} has a malformed spec`);

  const warnings: BrainWarning[] = [];
  const layers: Layer[] = [];
  for (const rec of candidates) {
    if (!sameType(rec.type, spec.from) || rec.status !== spec.filter.status) continue;
    const edges = rec.edges.filter((e) => edgeStatus(e) === 'active' && samePredicate(e.predicate, spec.via));
    if (edges.length === 0) continue;
    const ts = edges.map((e) => targets.get(e.target));
    if (ts.some((t) => t === undefined)) continue; // a missing / retracted / invisible target can never be satisfied
    const resolved = ts as Array<{ kind: string; key: string }>;
    if (!resolved.every((t) => ctxSet.has(`${t.kind}${SEP}${t.key}`))) continue; // AND
    const kinds = [...new Set(resolved.map((t) => t.kind))].sort();
    const outside = kinds.filter((k) => !spec.order.includes(k));
    if (outside.length) {
      warnings.push({ code: 'LENS_KIND_OUTSIDE_ORDER', message: `layer ${rec.id}: kind(s) ${outside.join(', ')} not in the lens order — skipped` });
      continue;
    }
    const merge = rec.fields.merge === 'prepend' || rec.fields.merge === 'replace' ? rec.fields.merge : 'append';
    const layer: Layer = {
      rec,
      body: typeof rec.fields.body === 'string' ? rec.fields.body : '',
      kinds,
      rank: Math.max(...kinds.map((k) => spec.order.indexOf(k))),
      priority: typeof rec.fields.priority === 'number' ? rec.fields.priority : 0,
      createdAt: firstAt.get(rec.id) ?? rec.meta.created_at,
      merge,
    };
    const sh = lastSource.get(rec.id);
    if (sh !== undefined) layer.sourceHash = sh;
    layers.push(layer);
  }
  layers.sort((a, b) => a.rank - b.rank || a.priority - b.priority || byCreated({ createdAt: a.createdAt, id: a.rec.id }, { createdAt: b.createdAt, id: b.rec.id }));

  let parts: Array<{ body: string; entry: LensManifestEntry }> = [];
  for (const l of layers) {
    if (l.body.trim() === '') continue; // like conversation-config.ts:116 (empty level = not configured)
    const entry: LensManifestEntry = { id: l.rec.id, rev: l.rec.meta.rev, kinds: l.kinds };
    if (l.sourceHash !== undefined) entry.source_hash = l.sourceHash;
    const part = { body: l.body, entry };
    if (l.merge === 'replace') parts = [part];
    else if (l.merge === 'prepend') parts.unshift(part);
    else parts.push(part);
  }
  const text = parts.map((p) => p.body).join(spec.separator);
  return {
    ok: true,
    text,
    manifest: parts.map((p) => p.entry),
    lens: { id: lensRec.id, rev: lensRec.meta.rev },
    hash: sha256Text(text),
    warnings,
  };
}
