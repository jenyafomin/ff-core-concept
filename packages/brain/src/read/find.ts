// @ff/brain/read/find — the `find` verb (SPEC R-6): filters + presets over the records the reader may see.
//
// Never returns bodies (FindItem only); retracted records are always hidden; cold records are found by
// find but hidden from presets unless `include_cold`. No engine view compiler (AC-14): a linear pass over
// the projection, both read gates applied per record (access.ts).
import {
  FIND_PRESETS,
  LIMITS,
  type BrainError,
  type BrainResult,
  type FindItem,
  type FindRequest,
  type FindResponse,
  type Reader,
} from '../contract.js';
import { samePredicate, typeKey } from '../domain/names.js';
import { brainError, edgeStatus } from '../domain/to-act.js';

import { createReadGate, visibleRecords, type ReadDeps, type VisibleRecord } from './access.js';
import { byUpdatedDesc, dueOf, runPreset, statusFieldOf, updatedAtOf } from './presets.js';

const FIND_KEYS = new Set([
  'scope', 'type', 'status', 'text', 'due_before', 'edge', 'preset', 'include_cold', 'limit', 'cursor',
]);

const CURSOR = /^o(\d+)$/;

export const encodeCursor = (offset: number): string => `o${offset}`;

/** Body-less wire item (the only shape find ever returns). */
export function toFindItem(v: VisibleRecord): FindItem {
  const item: FindItem = {
    id: v.rec.id,
    type: v.rec.type,
    label: v.rec.label,
    scopes: [...v.rec.scopes],
    updated_at: updatedAtOf(v),
  };
  const status = statusFieldOf(v) ?? (v.rec.status !== 'active' ? v.rec.status : undefined);
  if (status) item.status = status;
  const due = dueOf(v);
  if (due) item.due = due;
  return item;
}

function textMatches(v: VisibleRecord, needle: string): boolean {
  if (v.rec.label.toLowerCase().includes(needle)) return true;
  for (const val of Object.values(v.rec.fields)) {
    if (typeof val === 'string' && val.toLowerCase().includes(needle)) return true;
    if (Array.isArray(val) && val.some((x) => typeof x === 'string' && x.toLowerCase().includes(needle))) return true;
  }
  return false;
}

/** Validate the request shape; returns the normalized limit/offset or a wire error. */
function checkRequest(req: FindRequest): { limit: number; offset: number } | BrainError {
  if (!req || typeof req !== 'object' || Array.isArray(req)) return brainError('BAD_REQUEST', 'find body must be an object');
  for (const k of Object.keys(req)) if (!FIND_KEYS.has(k)) return brainError('BAD_REQUEST', `unknown key '${k}'`);
  for (const k of ['scope', 'type', 'status', 'text', 'due_before', 'cursor'] as const) {
    if (req[k] !== undefined && typeof req[k] !== 'string') return brainError('BAD_REQUEST', `'${k}' must be a string`);
  }
  if (req.preset !== undefined && !(FIND_PRESETS as readonly string[]).includes(req.preset)) {
    return brainError('BAD_REQUEST', `preset must be one of ${FIND_PRESETS.join('|')}`);
  }
  if (req.edge !== undefined && (!req.edge || typeof req.edge.pred !== 'string' || (req.edge.to !== undefined && typeof req.edge.to !== 'string'))) {
    return brainError('BAD_REQUEST', 'edge must be {pred, to?}');
  }
  let limit: number = LIMITS.findLimitDefault;
  if (req.limit !== undefined) {
    if (typeof req.limit !== 'number' || !Number.isInteger(req.limit) || req.limit < 1) {
      return brainError('BAD_REQUEST', `limit must be an integer 1..${LIMITS.findLimitMax}`);
    }
    limit = Math.min(req.limit, LIMITS.findLimitMax);
  }
  let offset = 0;
  if (req.cursor !== undefined) {
    const m = CURSOR.exec(req.cursor);
    if (!m) return brainError('BAD_REQUEST', 'cursor is not one this server issued');
    offset = Number(m[1]);
  }
  return { limit, offset };
}

/** The `find` verb for an already-resolved reader. */
export function find(reader: Reader, req: FindRequest, deps: ReadDeps): BrainResult<FindResponse> {
  const checked = checkRequest(req);
  if ('ok' in checked) return checked;
  const gate = createReadGate(reader, deps);

  let scopeFilter: string | undefined;
  if (req.scope !== undefined) {
    scopeFilter = gate.scopeIdOf(req.scope);
    // allowed: a reader scope, a sub-scope of one (its closure meets the reader), or a parent of one
    // (results are still gated per record, so a parent filter only narrows what the reader already sees)
    const below = [...gate.closure([scopeFilter])].some((s) => gate.scopes.has(s));
    const above = gate.closure([...gate.scopes]).has(scopeFilter);
    if (!below && !above) {
      return brainError('SCOPE_DENIED', `scope '${req.scope}' is outside the reader's scopes`);
    }
  }

  const needle = req.text?.trim().toLowerCase();
  const edgeTo = req.edge?.to;
  // R-1.8: names in either spelling (`core:task` ≡ `task`, `meeting` ≡ `u:meeting`); records read canonical
  const wantType = req.type ? typeKey(req.type) : undefined;
  let pool = visibleRecords(gate, deps).filter((v) => {
    if (scopeFilter && !gate.closure(v.rec.scopes).has(scopeFilter)) return false;
    if (wantType && v.rec.type !== wantType) return false;
    if (req.status && statusFieldOf(v) !== req.status && v.rec.status !== req.status) return false;
    if (needle && !textMatches(v, needle)) return false;
    if (req.due_before) {
      const due = dueOf(v);
      if (!due || due >= req.due_before) return false;
    }
    if (req.edge) {
      const hit = v.rec.edges.some(
        (e) => samePredicate(e.predicate, req.edge!.pred) && edgeStatus(e) === 'active' && (edgeTo === undefined || e.target === edgeTo),
      );
      if (!hit) return false;
    }
    return true;
  });

  let digest: string | undefined;
  let overdue: number | undefined;
  if (req.preset) {
    const scopeLabel = scopeFilter ? labelOfScope(scopeFilter, deps) : undefined;
    const r = runPreset({
      preset: req.preset,
      records: pool,
      now: deps.clock?.now() ?? new Date(),
      includeCold: req.include_cold === true,
      ...(scopeLabel ? { scopeLabel } : {}),
    });
    pool = r.items;
    digest = r.digest;
    overdue = r.overdue;
  } else {
    pool.sort(byUpdatedDesc);
  }

  const { limit, offset } = checked;
  const page = pool.slice(offset, offset + limit);
  const res: FindResponse = { ok: true, items: page.map(toFindItem), total: pool.length };
  if (offset + limit < pool.length) res.next_cursor = encodeCursor(offset + limit);
  if (digest !== undefined) res.digest = digest;
  if (overdue !== undefined) res.overdue = overdue;
  return res;
}

function labelOfScope(id: string, deps: ReadDeps): string {
  const b = (deps.store.readNode(id)?.body ?? {}) as Record<string, unknown>;
  return typeof b.slug === 'string' ? b.slug : id;
}
