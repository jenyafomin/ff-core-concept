// @ff/brain/read/read — the `read` verb (SPEC R-6, AC-18, AC-39…43): one record + its edges + a bounded
// neighbourhood. An invisible record answers NOT_FOUND exactly like a missing one (no existence leak).
// Edges carry their derived id (edgeIdOf), status and merged meta; a missing target is `dangling: true`;
// edges to records the reader may not see are dropped.
import { edgeIdOf } from '@ff/engine';

import {
  LIMITS,
  RESERVED_BODY_KEYS,
  type BrainError,
  type BrainResult,
  type EdgeView,
  type Fields,
  type NodeView,
  type ReadRequest,
  type ReadResponse,
  type Reader,
} from '../contract.js';
import {
  brainError,
  decodeNode,
  edgeStatus,
  lastRecordActOf,
  recordExtrasOf,
  type DomainRecord,
} from '../domain/to-act.js';

import { createReadGate, isRecordNode, type ReadDeps, type ReadGate } from './access.js';
import { traverse } from './traverse.js';

const READ_KEYS = new Set(['id', 'depth', 'max_nodes', 'preds']);
const HIDDEN_FIELDS = new Set<string>(RESERVED_BODY_KEYS);

function checkRequest(req: ReadRequest): { depth: number; maxNodes: number; preds?: string[] } | BrainError {
  if (!req || typeof req !== 'object' || Array.isArray(req)) return brainError('BAD_REQUEST', 'read body must be an object');
  for (const k of Object.keys(req)) if (!READ_KEYS.has(k)) return brainError('BAD_REQUEST', `unknown key '${k}'`);
  if (typeof req.id !== 'string' || req.id === '') return brainError('BAD_REQUEST', 'id is required');
  let depth: number = LIMITS.readDepthDefault;
  if (req.depth !== undefined) {
    if (typeof req.depth !== 'number' || !Number.isInteger(req.depth) || req.depth < 0) {
      return brainError('BAD_REQUEST', `depth must be an integer 0..${LIMITS.readDepthMax}`);
    }
    depth = Math.min(req.depth, LIMITS.readDepthMax);
  }
  let maxNodes: number = LIMITS.readMaxNodesDefault;
  if (req.max_nodes !== undefined) {
    if (typeof req.max_nodes !== 'number' || !Number.isInteger(req.max_nodes) || req.max_nodes < 1) {
      return brainError('BAD_REQUEST', `max_nodes must be an integer 1..${LIMITS.readMaxNodesMax}`);
    }
    maxNodes = Math.min(req.max_nodes, LIMITS.readMaxNodesMax);
  }
  if (req.preds !== undefined && (!Array.isArray(req.preds) || !req.preds.every((p) => typeof p === 'string'))) {
    return brainError('BAD_REQUEST', 'preds must be a list of predicate names');
  }
  const out: { depth: number; maxNodes: number; preds?: string[] } = { depth, maxNodes };
  if (req.preds) out.preds = [...req.preds];
  return out;
}

/** Wire NodeView of a decoded record (+ D7 provenance extras from its latest full-body act). */
export function toNodeView(rec: DomainRecord, deps: Pick<ReadDeps, 'store'>): NodeView {
  const fields: Fields = {};
  for (const [k, v] of Object.entries(rec.fields)) {
    if (k === 'type' || HIDDEN_FIELDS.has(k)) continue;
    fields[k] = v as Fields[string];
  }
  const view: NodeView = {
    id: rec.id,
    type: rec.type,
    declared_type: rec.declared_type,
    type_v: rec.type_v,
    label: rec.label,
    status: rec.status,
    visibility: rec.visibility,
    fields,
    scopes: [...rec.scopes],
    meta: { ...rec.meta },
  };
  if (rec.initiative) view.initiative = rec.initiative;
  const extras = recordExtrasOf(lastRecordActOf(deps.store.acts(), rec.id));
  if (extras.derived_from) view.derived_from = extras.derived_from;
  if (extras.source) view.source = extras.source;
  if (extras.layer !== undefined) view.layer = extras.layer;
  return view;
}

/** Edges of a record as the reader may see them (preds filter; invisible record targets read as dangling). */
export function edgeViewsOf(rec: DomainRecord, gate: ReadGate, deps: ReadDeps, preds?: readonly string[]): EdgeView[] {
  const out: EdgeView[] = [];
  for (const e of rec.edges) {
    if (preds && !preds.includes(e.predicate)) continue;
    const target = deps.store.readNode(e.target);
    // F-2: a record target the reader cannot see reads EXACTLY like a missing one (dangling) — dropping it
    // instead would let a reader tell «foreign» from «non-existent» by linking an id and reading back.
    const hidden = !!target && isRecordNode(target) && !gate.canSee(target);
    const meta = (e.meta ?? {}) as Record<string, unknown>;
    const v: EdgeView = {
      id: e.id ?? edgeIdOf(rec.id, e),
      pred: e.predicate,
      to: e.target,
      status: edgeStatus(e),
    };
    if (!target || hidden) v.dangling = true;
    if (typeof meta.author === 'string') v.author = meta.author;
    if (typeof meta.confidence === 'number') v.confidence = meta.confidence;
    if (typeof meta.created_at === 'string') v.created_at = meta.created_at;
    out.push(v);
  }
  return out;
}

/** The `read` verb for an already-resolved reader. */
export function read(reader: Reader, req: ReadRequest, deps: ReadDeps): BrainResult<ReadResponse> {
  const checked = checkRequest(req);
  if ('ok' in checked) return checked;
  const gate = createReadGate(reader, deps);
  const node = deps.store.readNode(req.id);
  const rec = node ? decodeNode(node) : null;
  if (!node || !rec || !gate.canSee(node, rec)) return brainError('NOT_FOUND', `no record ${req.id}`);

  const walk = traverse(rec.id, gate, deps, {
    depth: checked.depth,
    maxNodes: checked.maxNodes,
    ...(checked.preds ? { preds: checked.preds } : {}),
  });
  return {
    ok: true,
    node: toNodeView(rec, deps),
    edges: edgeViewsOf(rec, gate, deps, checked.preds),
    neighbors: walk.neighbors,
    truncated: walk.truncated,
  };
}
