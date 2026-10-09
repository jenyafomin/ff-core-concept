// @ff/brain/domain/validate-act — per-act validation (ADR-0016 D1: no global validator, no `view()`).
//
// `planRecord` turns a RecordRequest + the derived Reader into a ready-to-write act (or a wire refusal):
//   identity/reserved keys → label → scopes ⊆ reader → type (unknown → raw + warning + friction) →
//   fields vs type-def → provenance format (source/derived_from/layer) → merge with the old body (update) →
//   expected_rev → status/visibility/readable_by → act.
// `planLink` does the same for one edge. PII itself is refused by the engine's admission on write
// (commitRecord maps it to PII_REFUSED); this module only normalizes datetimes before that scan.
import { capMatch, type Act, type Edge, type EnvelopeNode, type SubjectRef } from '@ff/engine';

import {
  IDENTITY_KEYS,
  LIMITS,
  RESERVED_BODY_KEYS,
  type BrainError,
  type BrainWarning,
  type ClockPort,
  type EdgeStatus,
  type FieldValue,
  type LinkRequest,
  type RandomPort,
  type Reader,
  type RecordRequest,
  type RecordStatus,
  type Visibility,
} from '../contract.js';

import { brainBase } from './constitution.js';
import { ID_PREFIX, K, PII_PERSON, scopeId, typeDefId, type FieldSpec, type TypeDef } from './genesis.js';
import { isUnitId, newActId, newUnitId, sha256Hex } from './ids.js';
import {
  OWNER_PRINCIPAL,
  READABLE_OWNER,
  normalizeDateTimes,
  readableByFor,
  validateDerivedFrom,
  validateLayer,
  validateSource,
  type PiiScopeIssue,
} from './pii-scope.js';
import type { Registry } from './registry.js';
import {
  BRAIN_BODY_KEYS,
  brainError,
  buildEdgeAct,
  buildRecordAct,
  decodeNode,
  edgeStatus,
  makeEdge,
  type DomainRecord,
  type EdgeMeta,
  type FrictionSignal,
  type RecordPlan,
  type StoredMeta,
} from './to-act.js';

/** Everything validation needs from the outside world (injected → deterministic tests). */
export interface DomainContext {
  registry: Registry;
  /** Projected node by id (`store.readNode`). */
  lookup(id: string): EnvelopeNode | null;
  /**
   * Optional full read gate (engine PEP ∧ scope gate, read/access `ReadGate.canSee`) for edge/derived_from
   * targets (F-2). Absent → `recordVisibleTo` (the same two gates evaluated over the projected node).
   */
  canSee?(node: EnvelopeNode): boolean;
  clock: ClockPort;
  random: RandomPort;
}

const fromIssue = (i: PiiScopeIssue): BrainError => brainError(i.code, i.message);

const RECORD_KEYS = new Set([
  'type', 'label', 'fields', 'scopes', 'edges', 'visibility', 'initiative', 'id', 'expected_rev',
  'retract', 'reason', 'derived_from', 'source', 'layer',
]);

const RESERVED_FIELD_NAMES = new Set<string>([...RESERVED_BODY_KEYS, ...BRAIN_BODY_KEYS]);
const IDENTITY = new Set<string>(IDENTITY_KEYS);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const byteLen = (s: string): number => Buffer.byteLength(s, 'utf8');

// ─── Scopes ─────────────────────────────────────────────────────────────────────────────────────────

/** Canonical scope id for a slug or id: an existing node id wins, else `scope:<slug>`. */
export function resolveScopeRef(ref: string, lookup: DomainContext['lookup']): string {
  if (lookup(ref)) return ref;
  if (ref.startsWith(ID_PREFIX.scope) || ref.includes(':')) return ref;
  return scopeId(ref);
}

/** Is any of these scopes personal (kind or pii) — read from the scope nodes in the journal. */
function anyPersonalScope(scopes: string[], lookup: DomainContext['lookup']): boolean {
  return scopes.some((s) => {
    const node = lookup(s);
    if (!node || node.type !== K.types.scope) return false;
    const b = (node.body ?? {}) as Record<string, unknown>;
    return b.kind === 'personal' || b.pii === 'personal';
  });
}

/** The reader's scopes as canonical ids. */
export function readerScopeIds(reader: Reader, lookup: DomainContext['lookup']): Set<string> {
  return new Set(reader.scopes.map((s) => resolveScopeRef(s, lookup)));
}

// ─── Target visibility (F-2: no references into scopes the reader cannot see) ───────────────────────

const BASE_IDS = new Set(brainBase().map((n) => n.id));
const NON_RECORD_TYPES = new Set<string>([K.types.typeDef, K.types.predicateDef, K.types.scope]);

/** A user-facing record (not the substrate, not a registry entry, not a scope node). */
export function isRecordNode(node: EnvelopeNode): boolean {
  if (BASE_IDS.has(node.id)) return false;
  if (NON_RECORD_TYPES.has(node.type)) return false;
  return !(node.id.startsWith(ID_PREFIX.typeDef) || node.id.startsWith(ID_PREFIX.predicateDef) || node.id.startsWith(ID_PREFIX.scope));
}

/**
 * The subject the engine PEP evaluates `readable_by` against (R-7). A `personal` binding reads as the
 * owner (sees owner-only records: person / personal scope / visibility owner); any other binding reads
 * as an agent (`agent:*` — scoped records only).
 */
export function viewerOf(reader: Reader): SubjectRef {
  return reader.personal ? OWNER_PRINCIPAL : `agent:${reader.principal}`;
}

/** Hops of `member-of` followed upward from a record's scopes (R-7: замыкание ≤2). */
export const MEMBER_OF_HOPS = 2;

/** Scope ids reachable from `scopeIds`: themselves + active `member-of` parents, ≤ MEMBER_OF_HOPS. */
export function scopeClosureOf(scopeIds: readonly string[], lookup: DomainContext['lookup']): Set<string> {
  const out = new Set(scopeIds);
  let frontier = [...scopeIds];
  for (let hop = 0; hop < MEMBER_OF_HOPS && frontier.length; hop++) {
    const next: string[] = [];
    for (const s of frontier) {
      for (const e of lookup(s)?.edges ?? []) {
        if (e.predicate !== K.preds.memberOf || edgeStatus(e) !== 'active' || out.has(e.target)) continue;
        out.add(e.target);
        next.push(e.target);
      }
    }
    frontier = next;
  }
  return out;
}

/**
 * Pure mirror of the read gate over a projected record node: PEP (constitution `no_read_ids`, tenant clamp
 * on brain-shaped records, `readable_by` / `can_read` with legacy → owner-only) ∧ scope gate (record scopes'
 * member-of closure meets the reader's scopes). Fail-closed: anything it cannot prove readable is hidden.
 */
export function recordVisibleTo(reader: Reader, node: EnvelopeNode, lookup: DomainContext['lookup']): boolean {
  if (!isRecordNode(node)) return false;
  const rec = decodeNode(node);
  const cbody = (lookup('policy:constitution')?.body ?? {}) as Record<string, unknown>;
  const noRead = Array.isArray(cbody.no_read_ids) ? (cbody.no_read_ids as unknown[]) : [];
  if (noRead.includes(node.id)) return false;
  const body = (node.body ?? {}) as Record<string, unknown>;
  if (!rec.legacy && typeof body.tenant === 'string' && body.tenant !== '') return false; // engine tenant clamp
  const viewer = viewerOf(reader);
  const rb = node.visibility?.readable_by;
  const readable = rec.legacy && !(rb && rb.length) ? [...READABLE_OWNER] : [...(rb ?? [])];
  const canRead = [...readable, ...(node.access?.can_read ?? [])];
  if (!canRead.some((p) => capMatch(p, viewer))) return false;
  const mine = readerScopeIds(reader, lookup);
  for (const s of scopeClosureOf(rec.scopes, lookup)) if (mine.has(s)) return true;
  return false;
}

/**
 * F-2: a reference target the reader may not see is answered EXACTLY like a non-existent one (no existence
 * oracle). `true` = treat as missing: no node, or a record node hidden from this reader. Non-record nodes
 * (scopes, registry) keep their current meaning.
 */
export function targetMissingFor(reader: Reader, id: string, ctx: Pick<DomainContext, 'lookup' | 'canSee'>): boolean {
  const node = ctx.lookup(id);
  if (!node) return true;
  if (!isRecordNode(node)) return false;
  return ctx.canSee ? !ctx.canSee(node) : !recordVisibleTo(reader, node, ctx.lookup);
}

function scopeLabelOf(id: string, lookup: DomainContext['lookup']): string {
  const node = lookup(id);
  const b = (node?.body ?? {}) as Record<string, unknown>;
  if (typeof b.slug === 'string') return b.slug;
  return id.startsWith(ID_PREFIX.scope) ? id.slice(ID_PREFIX.scope.length) : id;
}

// ─── Fields ─────────────────────────────────────────────────────────────────────────────────────────

function checkFieldValue(name: string, v: unknown, spec: FieldSpec | undefined): BrainError | null {
  if (v === null) return null; // null = clear the field on update
  if (typeof v === 'string' && byteLen(v) > LIMITS.textMaxBytes) {
    return brainError('PAYLOAD_TOO_LARGE', `field '${name}' exceeds ${LIMITS.textMaxBytes} bytes`);
  }
  const isStr = typeof v === 'string';
  const isStrList = Array.isArray(v) && v.every((x) => typeof x === 'string');
  if (!isStr && !isStrList && typeof v !== 'number' && typeof v !== 'boolean') {
    return brainError('BAD_REQUEST', `field '${name}' must be string | number | boolean | null | string[]`);
  }
  if (!spec) return null; // fields not in the type-def are kept as-is (AC-18 tolerance)
  switch (spec.kind) {
    case 'text':
    case 'ref':
      return isStr ? null : brainError('BAD_REQUEST', `field '${name}' must be a string`);
    case 'enum':
      return isStr && (spec.values ?? []).includes(v as string)
        ? null
        : brainError('BAD_REQUEST', `field '${name}' must be one of ${(spec.values ?? []).join('|')}`);
    case 'date':
      return isStr && ISO_DATE.test(v as string)
        ? null
        : brainError('BAD_REQUEST', `field '${name}' must be an ISO date (YYYY-MM-DD[THH:MM])`, {
            hint: `Поле ${name}: дата в формате YYYY-MM-DD или YYYY-MM-DDTHH:MM (напр. 2026-10-10T14:30). «Завтра»/«в пятницу» переведи в дату сам.`,
          });
    case 'number':
      return typeof v === 'number' && Number.isFinite(v) ? null : brainError('BAD_REQUEST', `field '${name}' must be a number`);
    case 'bool':
      return typeof v === 'boolean' ? null : brainError('BAD_REQUEST', `field '${name}' must be a boolean`);
  }
}

// ─── record ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Plan a `record` (create / update / retract). Pure apart from `ctx` (lookup/clock/random).
 * `opts.idem` is stamped into provenance (R-8); `opts.actor` defaults to the reader's principal.
 */
export function planRecord(
  reqIn: RecordRequest,
  reader: Reader,
  ctx: DomainContext,
  opts: { idem?: string } = {},
): RecordPlan | BrainError {
  if (!reqIn || typeof reqIn !== 'object' || Array.isArray(reqIn)) return brainError('BAD_REQUEST', 'record body must be an object');
  if (!reader.write) return brainError('WRITE_DENIED', `reader '${reader.key}' has no write right`);

  // 1. identity / reserved / unknown top-level keys
  for (const k of Object.keys(reqIn)) {
    if (IDENTITY.has(k)) return brainError('IDENTITY_FIELD', `identity field '${k}' is not accepted in the body`);
    if ((RESERVED_BODY_KEYS as readonly string[]).includes(k)) return brainError('RESERVED_FIELD', `'${k}' is server-owned`);
    if (!RECORD_KEYS.has(k)) return brainError('BAD_REQUEST', `unknown key '${k}'`);
  }
  const rawFields = reqIn.fields ?? {};
  if (typeof rawFields !== 'object' || Array.isArray(rawFields) || rawFields === null) {
    return brainError('BAD_REQUEST', 'fields must be an object');
  }
  for (const k of Object.keys(rawFields)) {
    if (IDENTITY.has(k)) return brainError('IDENTITY_FIELD', `identity field '${k}' is not accepted in fields`);
    if (RESERVED_FIELD_NAMES.has(k)) return brainError('RESERVED_FIELD', `field '${k}' is reserved (server-owned)`);
  }
  if (byteLen(JSON.stringify(rawFields)) > LIMITS.fieldsMaxBytes) {
    return brainError('PAYLOAD_TOO_LARGE', `fields exceed ${LIMITS.fieldsMaxBytes} bytes`);
  }

  // 2. datetime normalization in EVERY string before anything is checked or scanned (R-9, AC-29)
  const req = normalizeDateTimes(reqIn);
  const fieldsIn = normalizeDateTimes(rawFields) as Record<string, FieldValue>;

  // 3. provenance form (D7, AC-33/43)
  for (const issue of [validateSource(req.source), validateDerivedFrom(req.derived_from), validateLayer(req.layer)]) {
    if (issue) return fromIssue(issue);
  }
  if (req.initiative !== undefined && req.initiative !== 'owner' && req.initiative !== 'agent') {
    return brainError('BAD_REQUEST', "initiative must be 'owner' | 'agent'");
  }
  if (req.visibility !== undefined && req.visibility !== 'scoped' && req.visibility !== 'owner') {
    return brainError('BAD_REQUEST', "visibility must be 'scoped' | 'owner'");
  }

  // 4. existing record (update / retract)
  let existing: DomainRecord | null = null;
  if (req.id !== undefined) {
    if (!isUnitId(req.id)) return brainError('BAD_REQUEST', `id must match u_<base36>`);
    const node = ctx.lookup(req.id);
    if (!node) return brainError('NOT_FOUND', `no record ${req.id}`);
    existing = decodeNode(node);
    if (existing.legacy) return brainError('WRITE_DENIED', `${req.id} is a legacy record (read-only)`);
    const mine = readerScopeIds(reader, ctx.lookup);
    if (!existing.scopes.some((s) => mine.has(s))) {
      return brainError('SCOPE_DENIED', `${req.id} is outside the reader's scopes`);
    }
    if (req.expected_rev !== undefined && req.expected_rev !== existing.meta.rev) {
      return brainError('CONFLICT', `expected_rev ${req.expected_rev} ≠ current rev ${existing.meta.rev}`);
    }
  } else if (req.retract) {
    return brainError('BAD_REQUEST', 'retract requires id');
  } else if (req.expected_rev !== undefined) {
    return brainError('BAD_REQUEST', 'expected_rev requires id');
  }

  const now = ctx.clock.now();
  const iso = now.toISOString();
  const id = existing ? existing.id : newUnitId(ctx.clock, ctx.random);

  // 5. label (AC: LABEL_REQUIRED)
  let label: string;
  if (typeof req.label === 'string' && req.label.trim() !== '') label = req.label.trim();
  else if (existing && (req.label === undefined || req.retract)) label = existing.label;
  else return brainError('LABEL_REQUIRED', 'label is required (non-empty string)');
  if ([...label].length > LIMITS.labelMaxChars) {
    return brainError('LABEL_REQUIRED', `label exceeds ${LIMITS.labelMaxChars} characters`);
  }

  // 6. type: create → declared (unknown/inactive → raw); update keeps declared, a different known type
  //    becomes an `instance-of` reclassification edge (D5, id unchanged).
  const warnings: BrainWarning[] = [];
  const friction: FrictionSignal[] = [];
  let declared: string;
  let def: TypeDef;
  let reclassTo: string | null = null;
  const extraFields: Record<string, FieldValue> = {};
  if (existing) {
    declared = existing.declared_type;
    def = ctx.registry.activeType(declared) ?? ctx.registry.type(declared) ?? { name: declared, version: existing.type_v, status: 'active', fields: {} };
    if (typeof req.type === 'string' && req.type !== '' && req.type !== existing.type && req.type !== declared) {
      if (!ctx.registry.activeType(req.type)) {
        warnings.push({ code: 'UNKNOWN_TYPE_AS_RAW', message: `type '${req.type}' is not active; reclassification ignored` });
        friction.push({ code: 'UNKNOWN_TYPE', hash: sha256Hex(req.type) });
      } else reclassTo = req.type;
    }
  } else {
    if (typeof req.type !== 'string' || req.type === '') return brainError('BAD_REQUEST', 'type is required');
    const active = ctx.registry.activeType(req.type);
    if (active && active.name !== K.types.typeDef && active.name !== K.types.predicateDef && active.name !== K.types.scope) {
      declared = active.name;
      def = active;
    } else {
      const raw = ctx.registry.activeType(K.types.raw);
      if (!raw) return brainError('INTERNAL', 'registry has no raw type (genesis missing)');
      declared = raw.name;
      def = raw;
      extraFields.declared_type = req.type;
      warnings.push({
        code: 'UNKNOWN_TYPE_AS_RAW',
        message: `type '${req.type}' is not an active type for record; stored as ${raw.name} (declared_type kept)`,
      });
      friction.push({ code: 'UNKNOWN_TYPE', hash: sha256Hex(req.type) });
    }
  }

  // 6b. `name` is lifted from the engine's PII-key list (BRAIN_ALLOW_KEYS) ONLY for person-typed records
  //     (owner-only, R-7). type-def / predicate-def / scope never reach planRecord (they become raw), so on
  //     any other type a `name` field is a person's name leaking to `agent:*` → refused (review MAJOR 2).
  if (def.pii !== PII_PERSON) {
    const nameKey = Object.keys(fieldsIn).find((k) => k.toLowerCase() === 'name');
    if (nameKey !== undefined) {
      return brainError(
        'PII_REFUSED',
        `inline PII field '${nameKey}' — a 'name' field is allowed only on a person-typed record (type ${def.name} is not)`,
      );
    }
  }

  // 7. fields: merge (update) → defaults (create) → check against the type-def
  const merged: Record<string, unknown> = existing ? { ...existing.fields } : {};
  for (const [k, v] of Object.entries({ ...fieldsIn, ...extraFields })) {
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  if (!existing) {
    for (const [f, spec] of Object.entries(def.fields)) {
      if (merged[f] === undefined && spec.default !== undefined) merged[f] = spec.default;
    }
  }
  if (!req.retract) {
    for (const [k, v] of Object.entries({ ...fieldsIn, ...extraFields })) {
      const err = checkFieldValue(k, v, def.fields[k]);
      if (err) return err;
    }
    for (const [f, spec] of Object.entries(def.fields)) {
      if (spec.required && (merged[f] === undefined || merged[f] === '')) {
        return brainError('BAD_REQUEST', `field '${f}' is required for type ${def.name}`);
      }
    }
  }

  // 8. scopes ⊆ reader scopes (AC-04, AC-10)
  const edgesIn = req.edges ?? [];
  if (!Array.isArray(edgesIn)) return brainError('BAD_REQUEST', 'edges must be a list');
  if (edgesIn.length > LIMITS.recordEdgesMax) return brainError('BAD_REQUEST', `≤${LIMITS.recordEdgesMax} edges`);
  const reqScopes = req.scopes;
  if (reqScopes !== undefined && (!Array.isArray(reqScopes) || !reqScopes.every((s) => typeof s === 'string' && s !== ''))) {
    return brainError('BAD_REQUEST', 'scopes must be a list of slugs/ids');
  }
  const scopeEdgeTargets = edgesIn.filter((e) => e?.pred === K.preds.inScope).map((e) => e.to);
  let scopes: string[];
  if (reqScopes !== undefined || scopeEdgeTargets.length) {
    scopes = [...(reqScopes ?? []), ...scopeEdgeTargets].map((s) => resolveScopeRef(s, ctx.lookup));
  } else if (existing) {
    scopes = [...existing.scopes];
  } else if (reader.default_scope) {
    scopes = [resolveScopeRef(reader.default_scope, ctx.lookup)];
  } else {
    return brainError('BAD_REQUEST', 'no scopes given and the binding has no default_scope');
  }
  scopes = [...new Set(scopes)];
  if (scopes.length === 0) return brainError('BAD_REQUEST', 'a record needs at least one scope');
  if (scopes.length > LIMITS.recordScopesMax) return brainError('BAD_REQUEST', `≤${LIMITS.recordScopesMax} scopes`);
  const readerScopes = readerScopeIds(reader, ctx.lookup);
  const denied = scopes.filter((s) => !readerScopes.has(s));
  if (denied.length) return brainError('SCOPE_DENIED', `scope(s) outside the reader: ${denied.join(', ')}`);

  // 9. edges: known predicates only (AC-38); server-owned `owner`
  const actor = reader.principal;
  const edgeMeta = (): EdgeMeta => ({ author: actor, status: 'active', created_at: iso });
  const newEdges: Edge[] = [];
  for (const e of edgesIn) {
    if (!e || typeof e.pred !== 'string' || typeof e.to !== 'string' || e.to === '') {
      return brainError('BAD_REQUEST', 'edge must be {pred, to}');
    }
    if (e.pred === K.preds.inScope) continue; // handled as scopes above
    if (e.pred === K.preds.owner) return brainError('RESERVED_FIELD', `'${e.pred}' edge is set by the server`);
    if (!ctx.registry.activePredicate(e.pred)) {
      return brainError('UNKNOWN_PREDICATE', `unknown predicate '${e.pred}'`, { known: ctx.registry.predicateNames() });
    }
    newEdges.push(makeEdge(id, e.pred, e.to, edgeMeta()));
  }
  // scope edges: add new, retract dropped (merge keeps author/created_at of surviving ones)
  const prevScopeEdges = existing ? existing.edges.filter((e) => e.predicate === K.preds.inScope) : [];
  for (const s of scopes) {
    const prev = prevScopeEdges.find((e) => e.target === s);
    if (!prev || edgeStatus(prev) === 'retracted') newEdges.push(makeEdge(id, K.preds.inScope, s, edgeMeta()));
  }
  for (const prev of prevScopeEdges) {
    if (edgeStatus(prev) === 'active' && !scopes.includes(prev.target)) {
      newEdges.push(makeEdge(id, K.preds.inScope, prev.target, { ...(prev.meta as unknown as EdgeMeta), status: 'retracted' }));
    }
  }
  if (!existing) newEdges.push(makeEdge(id, K.preds.owner, reader.principal, edgeMeta()));
  if (reclassTo) newEdges.push(makeEdge(id, K.preds.instanceOf, typeDefId(reclassTo), edgeMeta()));

  // 10. status (AC-45: agent initiative → proposed) and visibility (AC-10, AC-31)
  let status: RecordStatus;
  if (req.retract) status = 'retracted';
  else if (!existing) status = req.initiative === 'agent' ? 'proposed' : 'active';
  else if (existing.status === 'proposed' && req.initiative === 'owner') status = 'active';
  else status = existing.status;

  const ownerTarget = existing?.meta.owner ?? reader.principal;
  const allEdges = [...(existing?.edges ?? []), ...newEdges];
  const referentNotOwner = allEdges.some(
    (e) => e.predicate === K.preds.referent && edgeStatus(e) === 'active' && e.target !== ownerTarget,
  );
  const personType = def.pii === PII_PERSON;
  let visibility: Visibility = req.visibility ?? existing?.visibility ?? 'scoped';
  if (referentNotOwner || personType) visibility = 'owner';
  const readable_by = readableByFor({ visibility, personType, personalScope: anyPersonalScope(scopes, ctx.lookup) });

  const initiative = existing?.initiative ?? req.initiative;
  const meta: StoredMeta = {
    status,
    visibility,
    author: existing?.meta.author ?? actor,
    created_at: existing?.meta.created_at || iso,
    updated_at: iso,
    type_v: def.version,
    pinned: existing?.meta.pinned ?? false,
    temperature: existing?.meta.temperature ?? 'hot',
  };
  if (initiative) meta.initiative = initiative;
  if (req.retract && typeof req.reason === 'string' && req.reason !== '') meta.retract_reason = req.reason;
  else if (existing?.retract_reason && status === 'retracted') meta.retract_reason = existing.retract_reason;

  const act: Act = buildRecordAct({
    id,
    actId: newActId(ctx.clock, ctx.random),
    actor,
    type: declared,
    type_v: def.version,
    label,
    fields: merged,
    meta,
    readable_by,
    edges: newEdges,
    now,
    extras: {
      ...(opts.idem ? { idem: opts.idem } : {}),
      ...(req.initiative ? { initiative: req.initiative } : {}),
      ...(req.derived_from ? { derived_from: req.derived_from } : {}),
      ...(req.source ? { source: req.source } : {}),
      ...(req.layer !== undefined ? { layer: req.layer } : {}),
    },
  });

  return {
    kind: req.retract ? 'retract' : existing ? 'update' : 'create',
    id,
    act,
    type: reclassTo ?? existing?.type ?? declared,
    type_v: def.version,
    status,
    scopes,
    scopeLabel: scopeLabelOf(scopes[0]!, ctx.lookup),
    label,
    warnings,
    friction,
  };
}

// ─── link ───────────────────────────────────────────────────────────────────────────────────────────

export interface LinkPlan {
  act: Act;
  edge_id: string;
  dangling: boolean;
  from: string;
  status: EdgeStatus;
  scopeLabel: string;
  label: string;
  type: string;
}

/**
 * Plan a `link` (one edge). Unknown predicate → UNKNOWN_PREDICATE + known list (AC-38). Retraction merges
 * the edge meta (keeps author/confidence/created_at — AC-41). Missing target → dangling, not a refusal;
 * a target the reader cannot see is answered the same way (F-2: invisible ≡ non-existent).
 */
export function planLink(req: LinkRequest, reader: Reader, ctx: DomainContext, opts: { idem?: string } = {}): LinkPlan | BrainError {
  if (!req || typeof req !== 'object') return brainError('BAD_REQUEST', 'link body must be an object');
  if (!reader.write) return brainError('WRITE_DENIED', `reader '${reader.key}' has no write right`);
  for (const k of Object.keys(req)) {
    if (IDENTITY.has(k)) return brainError('IDENTITY_FIELD', `identity field '${k}' is not accepted in the body`);
  }
  if (typeof req.from !== 'string' || typeof req.to !== 'string' || req.to === '' || typeof req.pred !== 'string') {
    return brainError('BAD_REQUEST', 'link needs {from, pred, to}');
  }
  if (req.pred === K.preds.owner || req.pred === K.preds.inScope) {
    return brainError('RESERVED_FIELD', `'${req.pred}' is changed via record (scopes) / by the server`);
  }
  if (!ctx.registry.activePredicate(req.pred)) {
    return brainError('UNKNOWN_PREDICATE', `unknown predicate '${req.pred}'`, { known: ctx.registry.predicateNames() });
  }
  if (req.confidence !== undefined && (typeof req.confidence !== 'number' || req.confidence < 0 || req.confidence > 1)) {
    return brainError('BAD_REQUEST', 'confidence must be a number in [0,1]');
  }
  if (req.status !== undefined && req.status !== 'active' && req.status !== 'retracted') {
    return brainError('BAD_REQUEST', "status must be 'active' | 'retracted'");
  }
  const node = ctx.lookup(req.from);
  if (!node) return brainError('NOT_FOUND', `no record ${req.from}`);
  const from = decodeNode(node);
  const mine = readerScopeIds(reader, ctx.lookup);
  if (!from.scopes.some((s) => mine.has(s))) {
    return brainError('SCOPE_DENIED', `${req.from} is outside the reader's scopes`);
  }

  const now = ctx.clock.now();
  const status = req.status ?? 'active';
  const prev = from.edges.find((e) => e.predicate === req.pred && e.target === req.to);
  const prevMeta = (prev?.meta ?? {}) as Partial<EdgeMeta>;
  const meta: EdgeMeta = {
    author: prevMeta.author ?? reader.principal,
    status,
    created_at: prevMeta.created_at ?? now.toISOString(),
  };
  const confidence = req.confidence ?? prevMeta.confidence;
  if (confidence !== undefined) meta.confidence = confidence;
  const note = req.note !== undefined ? normalizeDateTimes(req.note) : prevMeta.note;
  if (note !== undefined) meta.note = note;

  const edge = makeEdge(from.id, req.pred, req.to, meta);
  const act = buildEdgeAct({
    from: from.id,
    actId: newActId(ctx.clock, ctx.random),
    actor: reader.principal,
    type: from.declared_type,
    type_v: from.type_v,
    edges: [edge],
    now,
    ...(opts.idem ? { idem: opts.idem } : {}),
  });
  return {
    act,
    edge_id: edge.id!,
    // F-2: a target hidden from this reader answers exactly like a missing one (dangling) — no oracle
    dangling: targetMissingFor(reader, req.to, ctx),
    from: from.id,
    status,
    // the receipt names a scope the reader holds, never a foreign one the record also sits in
    scopeLabel: scopeLabelOf(from.scopes.find((s) => mine.has(s)) ?? from.scopes[0] ?? '', ctx.lookup),
    label: from.label,
    type: from.type,
  };
}
