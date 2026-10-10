// @ff/brain/domain/to-act — the brain's act/body layout and its inverse (R-2).
//
//   Act (one per record write, always `domain_event`, projected by source_ref = record id):
//     provenance { source_ref, schema_v, type, type_v, idem?, initiative?, derived_from?, source?, layer? }
//     payload    { type, label, ...fields, meta: {status, visibility, author, created_at, updated_at, type_v,
//                  initiative?, pinned, temperature, retract_reason?}, readable_by }
//     edges      [{ predicate, target, id: edgeIdOf(from, e), meta: {author, confidence?, status, created_at} }]
//
// The engine's `foldInto` REPLACES the body wholesale (projection.ts) — so every record act carries the
// FULL merged body (merge is done in validate-act.ts before the act is built). Record-level status lives
// in `meta.status`, so a type's own `status` field (task open/done…) never collides with it.
// `derived_from / source / layer` stay in provenance only (never in the scanned payload: a hex hash would
// trip the phone heuristic) — read them back with `recordExtrasOf(lastAct)`.
import {
  edgeIdOf,
  type Act,
  type Edge,
  type EnvelopeNode,
  type Engine,
  type Provenance,
  type StorePort,
} from '@ff/engine';

import {
  formatReceipt,
  type BrainError,
  type BrainErrorCode,
  type BrainResult,
  type Authority,
  type BrainWarning,
  type EdgeStatus,
  type Initiative,
  type RecordMeta,
  type RecordResponse,
  type RecordStatus,
  type SourceRef,
  type Temperature,
  type Visibility,
} from '../contract.js';

import {
  GENESIS_ACTOR,
  GENESIS_PREDICATES,
  GENESIS_TYPES,
  ID_PREFIX,
  K,
  predicateDefId,
  scopeId,
  typeDefId,
  type PredicateDef,
  type ScopeSeed,
  type TypeDef,
} from './genesis.js';
import { seededActId } from './ids.js';
import { typeKey } from './names.js';
import { READABLE_SCOPED } from './pii-scope.js';

/** Bumped when the act/body layout changes (AC-11: every act carries it). */
export const SCHEMA_V = 1 as const;

/** Body keys the brain itself owns: a user field with one of these names is refused (RESERVED_FIELD). */
export const BRAIN_BODY_KEYS = ['type', 'label', 'meta', 'archived'] as const;

// ─── Errors (wire shape, R-6) ───────────────────────────────────────────────────────────────────────

const HINTS: Partial<Record<BrainErrorCode, string>> = {
  RESERVED_FIELD: 'Убери служебные поля (tenant/space/capability/readable_by/type/label/meta) из fields — их ставит сервер.',
  IDENTITY_FIELD: 'Не передавай личность (conversationId/author/sender) — её ставит шлюз.',
  LABEL_REQUIRED: 'Нужен label ≤120 знаков: глагол + предмет.',
  PII_REFUSED: 'Убери телефон/email и запиши без контакта.',
  SOURCE_REF_INVALID: 'source.ref — путь/url/act: без @ и длинных цифровых серий; kind = file|act|url.',
  DERIVED_FROM_INVALID: 'derived_from — список вида u_xxx@rev.',
  UNKNOWN_PREDICATE: 'Возьми предикат из списка known, не выдумывай.',
  CONFLICT: 'Запись изменилась: перечитай (read) и повтори с актуальным expected_rev.',
  SCOPE_DENIED: 'Эта область недоступна из этого чата — скажи владельцу.',
  NOT_FOUND: 'Такой записи нет — проверь id через find.',
  BAD_REQUEST: 'Проверь форму запроса.',
  PAYLOAD_TOO_LARGE: 'Сократи: поля ≤8 КБ, текст ≤4 КБ.',
  WRITE_DENIED: 'Запись запрещена для этого читателя.',
  INTERNAL: 'Внутренняя ошибка мозга — не повторяй в цикле.',
};

export function brainError(code: BrainErrorCode, message: string, extra: Partial<BrainError> = {}): BrainError {
  return { ok: false, code, message, hint: HINTS[code] ?? '', ...extra };
}

/** Map an `Engine.write` refusal reason to a wire error (admission refuses BEFORE any journal write). */
export function engineRefusalToError(reason: string): BrainError {
  if (reason.startsWith('inline PII')) return brainError('PII_REFUSED', reason);
  if (/protected namespace|mint refused/.test(reason)) return brainError('WRITE_DENIED', reason);
  return brainError('INTERNAL', reason);
}

// ─── Body layout ────────────────────────────────────────────────────────────────────────────────────

/** `payload.meta` as stored. `rev` is NOT stored (it is the projection's `state.version`). */
export interface StoredMeta {
  status: RecordStatus;
  visibility: Visibility;
  author: string;
  created_at: string;
  updated_at: string;
  type_v: number;
  pinned: boolean;
  temperature: Temperature;
  initiative?: Initiative;
  retract_reason?: string;
}

export interface EdgeMeta {
  author: string;
  status: EdgeStatus;
  created_at: string;
  confidence?: number;
  note?: string;
}

/** Build one edge with its derived id (ADR-0015 / AC-39). */
export function makeEdge(from: string, predicate: string, target: string, meta: EdgeMeta): Edge {
  const e: Edge = { predicate, target, meta: { ...meta } };
  e.id = edgeIdOf(from, e);
  return e;
}

export interface ProvenanceExtras {
  idem?: string;
  initiative?: Initiative;
  /** Credential-derived authority of the writer (R-5.4): the audit trail of who could approve. */
  authority?: Authority;
  /** Pack the binding delegates for (R-2.3); `actor` stays the binding principal. */
  pack?: string;
  derived_from?: string[];
  source?: SourceRef;
  layer?: number;
}

export interface RecordActInput {
  id: string;
  actId: string;
  actor: string;
  type: string;
  type_v: number;
  label: string;
  fields: Record<string, unknown>;
  meta: StoredMeta;
  readable_by: readonly string[];
  edges: Edge[];
  extras?: ProvenanceExtras;
  /** Placeholder; Engine.write re-stamps it. */
  now: Date;
}

function provenanceFor(id: string, type: string, type_v: number, extras: ProvenanceExtras = {}): Provenance {
  const p: Provenance = { source_ref: id, schema_v: SCHEMA_V, type, type_v };
  for (const k of ['idem', 'initiative', 'authority', 'pack', 'derived_from', 'source', 'layer'] as const) {
    if (extras[k] !== undefined) (p as Record<string, unknown>)[k] = extras[k];
  }
  return p;
}

/** A full-body record act (create / update / retract). */
export function buildRecordAct(i: RecordActInput): Act {
  return {
    id: i.actId,
    actor: i.actor,
    actKind: 'domain_event',
    recordedAt: i.now.toISOString(),
    provenance: provenanceFor(i.id, i.type, i.type_v, i.extras),
    payload: { type: i.type, label: i.label, ...i.fields, meta: { ...i.meta }, readable_by: [...i.readable_by] },
    edges: i.edges,
  };
}

/** An edge-only act (link): no payload → the projection keeps the node's body/type/visibility. */
export function buildEdgeAct(i: {
  from: string;
  actId: string;
  actor: string;
  type: string;
  type_v: number;
  edges: Edge[];
  now: Date;
  idem?: string;
  extras?: Pick<ProvenanceExtras, 'authority' | 'pack'>;
}): Act {
  return {
    id: i.actId,
    actor: i.actor,
    actKind: 'domain_event',
    recordedAt: i.now.toISOString(),
    provenance: provenanceFor(i.from, i.type, i.type_v, { ...(i.idem ? { idem: i.idem } : {}), ...(i.extras ?? {}) }),
    edges: i.edges,
  };
}

// ─── Registry & genesis acts ────────────────────────────────────────────────────────────────────────

function seedMeta(now: Date, type_v: number): StoredMeta {
  const iso = now.toISOString();
  return {
    status: 'active',
    visibility: 'scoped',
    author: GENESIS_ACTOR,
    created_at: iso,
    updated_at: iso,
    type_v,
    pinned: false,
    temperature: 'hot',
  };
}

const defTypeVersion = (name: string): number => GENESIS_TYPES.find((d) => d.name === name)?.version ?? 1;

/**
 * A type-def act (genesis, fixtures, and — later — the type gardener). Body = the def, unchanged (AC-36).
 * `nodeId` (R-1.6): the def node of the FIRST accepted def of this name — a new version of an alias-spelled
 * type (`u:idea@2` over legacy `idea`) stays in `typedef:idea`. Regular writers go through `planDefinition`.
 */
export function buildTypeDefAct(def: TypeDef, opts: { now: Date; actor?: string; actId?: string; nodeId?: string }): Act {
  const id = opts.nodeId ?? typeDefId(def.name);
  const tv = defTypeVersion(K.types.typeDef);
  return buildRecordAct({
    id,
    actId: opts.actId ?? seededActId(`${id}@${def.version}`),
    actor: opts.actor ?? GENESIS_ACTOR,
    type: K.types.typeDef,
    type_v: tv,
    label: def.name,
    fields: structuredClone(def) as unknown as Record<string, unknown>,
    meta: { ...seedMeta(opts.now, tv), author: opts.actor ?? GENESIS_ACTOR },
    readable_by: READABLE_SCOPED,
    edges: [],
    now: opts.now,
  });
}

export function buildPredicateDefAct(def: PredicateDef, opts: { now: Date; actor?: string; actId?: string; nodeId?: string }): Act {
  const id = opts.nodeId ?? predicateDefId(def.name);
  const tv = defTypeVersion(K.types.predicateDef);
  return buildRecordAct({
    id,
    actId: opts.actId ?? seededActId(id),
    actor: opts.actor ?? GENESIS_ACTOR,
    type: K.types.predicateDef,
    type_v: tv,
    label: def.name,
    fields: structuredClone(def) as unknown as Record<string, unknown>,
    meta: { ...seedMeta(opts.now, tv), author: opts.actor ?? GENESIS_ACTOR },
    readable_by: READABLE_SCOPED,
    edges: [],
    now: opts.now,
  });
}

export function buildScopeAct(seed: ScopeSeed, opts: { now: Date; actor?: string; actId?: string }): Act {
  // R-1.9 / ADR-0017 D1: a scope slug never contains ':' (any string with ':' reads as a ready id/name)
  if (typeof seed.slug !== 'string' || seed.slug === '' || seed.slug.includes(':')) {
    throw new Error(`scope slug '${String(seed.slug)}' must be non-empty and contain no ':'`);
  }
  const id = scopeId(seed.slug);
  const tv = defTypeVersion(K.types.scope);
  const actor = opts.actor ?? GENESIS_ACTOR;
  const iso = opts.now.toISOString();
  const edges = (seed.member_of ?? []).map((parent) =>
    makeEdge(id, K.preds.memberOf, parent.startsWith(ID_PREFIX.scope) ? parent : scopeId(parent), {
      author: actor,
      status: 'active',
      created_at: iso,
    }),
  );
  return buildRecordAct({
    id,
    actId: opts.actId ?? seededActId(id),
    actor,
    type: K.types.scope,
    type_v: tv,
    label: seed.name,
    fields: { name: seed.name, slug: seed.slug, kind: seed.kind, pii: seed.pii ?? (seed.kind === 'personal' ? 'personal' : 'none') },
    meta: { ...seedMeta(opts.now, tv), author: actor },
    readable_by: READABLE_SCOPED,
    edges,
    now: opts.now,
  });
}

/** The genesis package as acts (deterministic source_refs and act ids). */
export function genesisActs(opts: { now: Date; scopes?: ScopeSeed[] }): Act[] {
  return [
    ...GENESIS_TYPES.map((d) => buildTypeDefAct(d, { now: opts.now })),
    ...GENESIS_PREDICATES.map((d) => buildPredicateDefAct(d, { now: opts.now })),
    ...(opts.scopes ?? []).map((s) => buildScopeAct(s, { now: opts.now })),
  ];
}

// ─── Decoding a projected node back into a record ───────────────────────────────────────────────────

/** A projected node as the brain sees it (B3 builds NodeView/FindItem from this). */
export interface DomainRecord {
  id: string;
  /** Type the record was written as (`payload.type`). */
  declared_type: string;
  /** Effective type: last non-retracted `instance-of`, else declared (D5). */
  type: string;
  type_v: number;
  label: string;
  status: RecordStatus;
  visibility: Visibility;
  /** Domain fields (body minus label/meta/type). Unknown/extra fields are kept as-is (AC-18). */
  fields: Record<string, unknown>;
  /** Active `in-scope` targets; for a legacy act: `body.tenant` or `project:ff` (AC-09). */
  scopes: string[];
  /** All edges, including retracted ones (callers filter by `edgeStatus`). */
  edges: Edge[];
  meta: RecordMeta;
  initiative?: Initiative;
  retract_reason?: string;
  readable_by: string[];
  /** Written before the brain (no `meta`): read-only compatibility projection. */
  legacy: boolean;
}

export const edgeStatus = (e: Edge): EdgeStatus => (e.meta?.status === 'retracted' ? 'retracted' : 'active');

const RECORD_STATUSES: readonly RecordStatus[] = ['active', 'proposed', 'retracted', 'superseded'];

export function decodeNode(node: EnvelopeNode): DomainRecord {
  const body = (node.body ?? {}) as Record<string, unknown>;
  const rawMeta = body.meta;
  const legacy = !rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta);
  const m = (legacy ? {} : rawMeta) as Partial<StoredMeta>;
  const edges = (node.edges ?? []).map((e) => ({ ...e }));
  const active = edges.filter((e) => edgeStatus(e) === 'active');

  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === 'label' || k === 'meta') continue;
    fields[k] = v;
  }

  let scopes = active.filter((e) => e.predicate === K.preds.inScope).map((e) => e.target);
  if (legacy) {
    // R-2 / D4: a legacy act's single `tenant` (or none → project:ff) reads as an implicit in-scope edge.
    const tenant = typeof body.tenant === 'string' && body.tenant !== '' ? body.tenant : K.legacyDefaultScope;
    if (!scopes.includes(tenant)) scopes = [tenant, ...scopes];
  }

  // types read back in their CANONICAL spelling (ADR-0017 D1): a legacy `idea` record reads as `u:idea`,
  // an `instance-of → typedef:idea` reclassification too (R-1.8); the journal keeps its bytes
  const reclass = [...active].reverse().find((e) => e.predicate === K.preds.instanceOf);
  const declared = typeKey(node.type);
  const effective = reclass
    ? typeKey(reclass.target.startsWith(ID_PREFIX.typeDef) ? reclass.target.slice(ID_PREFIX.typeDef.length) : reclass.target)
    : declared;

  const owner = active.find((e) => e.predicate === K.preds.owner)?.target;
  const version = typeof node.state?.version === 'number' ? node.state.version : 0;
  const label =
    typeof body.label === 'string' ? body.label : typeof body.title === 'string' ? body.title : node.id;
  const status = RECORD_STATUSES.includes(m.status as RecordStatus) ? (m.status as RecordStatus) : 'active';
  const visibility: Visibility = m.visibility === 'owner' ? 'owner' : 'scoped';

  const meta: RecordMeta = {
    author: typeof m.author === 'string' ? m.author : 'legacy',
    created_at: typeof m.created_at === 'string' ? m.created_at : '',
    updated_at: typeof m.updated_at === 'string' ? m.updated_at : typeof m.created_at === 'string' ? m.created_at : '',
    rev: version,
    temperature: m.temperature === 'cold' ? 'cold' : 'hot',
    pinned: m.pinned === true,
  };
  if (owner) meta.owner = owner;

  const rec: DomainRecord = {
    id: node.id,
    declared_type: declared,
    type: effective,
    type_v: typeof m.type_v === 'number' ? m.type_v : 1,
    label,
    status,
    visibility,
    fields,
    scopes,
    edges,
    meta,
    readable_by: [...(node.visibility?.readable_by ?? [])],
    legacy,
  };
  if (m.initiative === 'owner' || m.initiative === 'agent') rec.initiative = m.initiative;
  if (typeof m.retract_reason === 'string') rec.retract_reason = m.retract_reason;
  return rec;
}

/** Provenance-only record fields (D7 form) from the record's latest act. */
export function recordExtrasOf(act: Act | undefined): ProvenanceExtras & { schema_v?: number; type_v?: number } {
  const p = act?.provenance;
  if (!p || typeof p !== 'object') return {};
  const o = p as Record<string, unknown>;
  const out: ProvenanceExtras & { schema_v?: number; type_v?: number } = {};
  if (typeof o.idem === 'string') out.idem = o.idem;
  if (o.initiative === 'owner' || o.initiative === 'agent') out.initiative = o.initiative;
  if (Array.isArray(o.derived_from)) out.derived_from = o.derived_from.filter((x): x is string => typeof x === 'string');
  if (o.source && typeof o.source === 'object') out.source = o.source as SourceRef;
  if (typeof o.layer === 'number') out.layer = o.layer;
  if (typeof o.schema_v === 'number') out.schema_v = o.schema_v;
  if (typeof o.type_v === 'number') out.type_v = o.type_v;
  return out;
}

/** The latest act that carried a full body for `id` (skips edge-only acts). */
export function lastRecordActOf(acts: readonly Act[], id: string): Act | undefined {
  for (let i = acts.length - 1; i >= 0; i--) {
    const a = acts[i]!;
    const p = a.provenance;
    if (p && typeof p === 'object' && (p as Provenance).source_ref === id && a.payload !== undefined) return a;
  }
  return undefined;
}

// ─── Commit (C1 calls this inside its write queue) ──────────────────────────────────────────────────

/** A body-less friction signal for the FrictionPort (C1): code + hash only (V7). */
export interface FrictionSignal {
  code: 'UNKNOWN_TYPE';
  hash: string;
}

/** What validate-act hands to the writer. */
export interface RecordPlan {
  kind: 'create' | 'update' | 'retract';
  id: string;
  act: Act;
  type: string;
  type_v: number;
  status: RecordStatus;
  /** Scope ids the record ends up in (receipt uses the first). */
  scopes: string[];
  /** Human scope name for the receipt. */
  scopeLabel: string;
  label: string;
  warnings: BrainWarning[];
  /** Body-less friction signals for the FrictionPort (C1): code + hash only. */
  friction: FrictionSignal[];
}

/** Write a planned record through the engine; ok only after `writeAct` returned (fsync'd — R-4). */
export function commitRecord(
  deps: { engine: Pick<Engine, 'write'>; store: Pick<StorePort, 'readNode'> },
  plan: RecordPlan,
): BrainResult<RecordResponse> {
  const ack = deps.engine.write(plan.act);
  if (!ack.ok) return engineRefusalToError(ack.reason);
  const node = deps.store.readNode(plan.id);
  const rev = typeof node?.state?.version === 'number' ? node.state.version : 0;
  return {
    ok: true,
    id: plan.id,
    rev,
    type: plan.type,
    type_v: plan.type_v,
    status: plan.status,
    dedup: ack.dedup === true,
    warnings: plan.warnings,
    receipt: formatReceipt({ label: plan.label, scope: plan.scopeLabel, type: plan.type, status: plan.status, id: plan.id }),
  };
}
