// @ff/brain/domain/genesis — THE ONLY place in packages/brain/src that names types and predicates
// (ADR-0016 D3, SPEC R-3, AC-14). Everything else reads names through `K` or through the registry
// (which is built from the JOURNAL, not from this file — genesis is only written once, as acts).
//
// Pure data: no runtime imports. Acts are built in to-act.ts (`genesisActs`), written in schemas.ts
// (`writeGenesis` / `bootBrain`).

import type { Cardinality } from '@ff/engine';

// ─── Shapes of registry entries (type-def / predicate-def bodies) ───────────────────────────────────

export type FieldKind = 'text' | 'enum' | 'date' | 'number' | 'bool' | 'ref';

export interface FieldSpec {
  kind: FieldKind;
  required?: boolean;
  values?: string[];
  default?: string | number | boolean;
  /** Opaque business id (e.g. `ORD-123456789012`) → engine `opaqueValueKeys` (R-9). With `pattern` → see below. */
  opaque?: boolean;
  // ── SPEC-R1 R-01: schema-author-only flags (genesis / `sys:` / `pack:` defs; stripped from `u:` defs) ──
  /** Own byte ceiling of a text field: outside the 8 KB fields budget and the 4 KB text limit, inside the 64 KB act cap. */
  max_bytes?: number;
  /** Stored byte-for-byte: no datetime normalization (the PII scan still runs, over a datetime-normalized view). */
  verbatim?: boolean;
  /**
   * Anchored regex (`^…$`) the value must match (else BAD_REQUEST). With `opaque: true` a matching value is an
   * opaque id for THIS type's field → the engine skips the phone heuristic for it (Telegram ids).
   */
  pattern?: string;
}

/** FieldSpec flags only a schema author (not a `u:` def) may set (SPEC-R1 R-01). */
export const SCHEMA_AUTHOR_FIELD_FLAGS = ['max_bytes', 'verbatim', 'pattern'] as const;

export type TypeDefStatus = 'active' | 'candidate' | 'cold';

/** type-def body (R-2). v0.5 = FORM only: candidate/extends/confidence are stored and returned, not acted on. */
export interface TypeDef {
  name: string;
  version: number;
  status: TypeDefStatus;
  label_hint?: string;
  confidence?: number;
  fields: Record<string, FieldSpec>;
  /** `name@v` — the single inheritance source (D5). Not resolved in v0.5. */
  extends?: string;
  pii?: 'none' | typeof PII_PERSON;
  /**
   * Status policy-as-data (SPEC-brain-data-doors R-5.5): `owner` → a record created by an agent-authority
   * reader starts `proposed` (an owner must activate it); absent ≡ `none` → created `active` (v0.6 behaviour).
   */
  approval?: 'owner' | 'none';
  /**
   * Write policy-as-data (SPEC-R1 R-04): `owner` → only an owner-authority reader (a service mandate `sys:gateway`
   * or `sys:brain`) may create/update records of this type (or reclassify into it); absent ≡ `any`.
   */
  write?: 'owner' | 'any';
  /**
   * SPEC-R1 (reviewer #3): records of this type are APPEND-ONLY versioned system nodes `<prefix><id_field>@<version_field>`
   * (e.g. `lens:prompt-compose@2`) — a new version is data, an existing one is immutable. `prefix` ∈ VERSIONED_NODE_PREFIXES.
   */
  versioned_node?: { prefix: string; id_field: string; version_field: string };
}

/** Node prefixes a `versioned_node` type may use (non-record system nodes only). */
export const VERSIONED_NODE_PREFIXES: readonly string[] = ['lens:'];

export type PredicateDefStatus = 'active' | 'candidate';

/** predicate-def body (R-2). */
export interface PredicateDef {
  name: string;
  cardinality: Cardinality;
  from_hint: string[];
  to_hint: string[];
  meaning: string;
  status: PredicateDefStatus;
  /** Cardinality pinned by the engine kernel (`LOCKED_PREDICATES`). */
  locked?: boolean;
}

/** A scope to seed at genesis (R-10: the owner's list of companies/projects; none by default). */
export interface ScopeSeed {
  slug: string;
  name: string;
  kind: 'personal' | 'company' | 'project';
  pii?: 'none' | 'personal';
  /** Parent scopes (`member-of`, M:N) as slugs or ids. */
  member_of?: string[];
}

// ─── Kernel names (the rest of src refers to types/predicates ONLY through these) ───────────────────

export const K = {
  types: {
    raw: 'raw',
    scope: 'scope',
    typeDef: 'type-def',
    predicateDef: 'predicate-def',
    friction: 'friction',
  },
  preds: {
    inScope: 'in-scope',
    memberOf: 'member-of',
    instanceOf: 'instance-of',
    owner: 'owner',
    referent: 'referent',
  },
  /** Legacy acts without `body.tenant` project as `in-scope → this` (R-2, AC-09). */
  legacyDefaultScope: 'project:ff',
} as const;

/** Node-id prefixes of registry entries and scopes (stable, deterministic source_refs). */
export const ID_PREFIX = {
  typeDef: 'typedef:',
  predicateDef: 'pred:',
  scope: 'scope:',
  /** SPEC-R1 R-02: a seeded lens node `lens:<lens_id>@<version>` — system data, not a user record. */
  lens: 'lens:',
} as const;

export const typeDefId = (name: string): string => `${ID_PREFIX.typeDef}${name}`;
export const predicateDefId = (name: string): string => `${ID_PREFIX.predicateDef}${name}`;
export const scopeId = (slug: string): string => `${ID_PREFIX.scope}${slug}`;

/** type-def `pii` value marking a person-typed record (visibility owner, R-7). */
export const PII_PERSON = 'person' as const;

/** Principal stamped on genesis acts. */
export const GENESIS_ACTOR = 'system:genesis';

// ─── Genesis types (R-3) ────────────────────────────────────────────────────────────────────────────

const text = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'text', ...extra });
const date = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'date', ...extra });
const enumOf = (values: string[], extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'enum', values, ...extra });

const t = (name: string, fields: Record<string, FieldSpec>, extra: Partial<TypeDef> = {}): TypeDef => ({
  name,
  version: 1,
  status: 'active',
  fields,
  pii: 'none',
  ...extra,
});

export const GENESIS_TYPES: readonly TypeDef[] = [
  t('task', {
    status: enumOf(['open', 'doing', 'blocked', 'done', 'dropped'], { default: 'open' }),
    due: date(),
    priority: enumOf(['p0', 'p1', 'p2', 'p3']),
    assignee: text(),
    why: text(),
    done_at: date(),
  }, { label_hint: 'глагол + предмет: «Подключить devops 443»' }),
  t('decision', {
    status: enumOf(['proposed', 'accepted', 'superseded']),
    decided_at: date(),
    rationale: text(),
  }, { label_hint: 'выбрано X' }),
  t('note', { text: text() }),
  t('person', { name: text(), role: text() }, { pii: 'person', label_hint: 'имя + роль, без контактов' }),
  t('day', { date: date({ required: true }), summary: text() }),
  t('friction', {
    code: text({ required: true }),
    hash: text(),
    verb: text(),
    count: { kind: 'number' },
    status: text(),
    note: text(),
  }),
  t('scope', {
    name: text(),
    slug: text({ required: true }),
    kind: enumOf(['personal', 'company', 'project'], { required: true }),
    pii: enumOf(['none', 'personal'], { default: 'none' }),
  }),
  t('raw', { declared_type: text() }),
  t('type-def', {
    name: text({ required: true }),
    version: { kind: 'number', required: true },
    status: enumOf(['active', 'candidate', 'cold']),
    label_hint: text(),
    confidence: { kind: 'number' },
    extends: text(),
    pii: enumOf(['none', 'person']),
  }),
  t('predicate-def', {
    name: text({ required: true }),
    cardinality: enumOf(['one', 'many'], { required: true }),
    meaning: text(),
    status: enumOf(['active', 'candidate']),
    locked: { kind: 'bool' },
  }),
];

// ─── Genesis predicates (R-3) ───────────────────────────────────────────────────────────────────────

const p = (name: string, cardinality: Cardinality, meaning: string, extra: Partial<PredicateDef> = {}): PredicateDef => ({
  name,
  cardinality,
  from_hint: [],
  to_hint: [],
  meaning,
  status: 'active',
  ...extra,
});

export const GENESIS_PREDICATES: readonly PredicateDef[] = [
  p('in-scope', 'many', 'запись принадлежит области', { to_hint: ['scope'] }),
  p('member-of', 'many', 'область входит в область (проект → компания)', { from_hint: ['scope'], to_hint: ['scope'] }),
  p('derived-from', 'many', 'выведено из'),
  p('motivated-by', 'many', 'мотивировано'),
  p('resolves', 'many', 'закрывает/решает', { to_hint: ['task'] }),
  p('about', 'many', 'о ком/о чём'),
  p('blocks', 'many', 'блокирует', { from_hint: ['task'], to_hint: ['task'] }),
  p('part-of', 'many', 'часть целого'),
  p('informed', 'many', 'повлияло на'),
  p('example', 'many', 'пример'),
  p('instance-of', 'one', 'действующий тип (переклассификация)', { to_hint: ['type-def'] }),
  p('assigned-to', 'one', 'исполнитель', { from_hint: ['task'], to_hint: ['person'] }),
  p('supersedes', 'one', 'заменяет устаревшее'),
  p('variant-of', 'one', 'вариант (резерв)'),
  p('owner', 'one', 'владелец записи (ставит сервер)', { locked: true }),
  p('referent', 'many', 'о ком запись (третье лицо)', { locked: true, to_hint: ['person'] }),
];

// ─── Core name sets (ADR-0017 D1, SPEC-brain-data-doors R-1.1) ──────────────────────────────────────
// DERIVED from the genesis lists above — never a second hand-kept list. A bare name is `core:` only if it is
// here; any other bare name reads as `u:<name>` (alias, the journal is never rewritten).

export const CORE_TYPE_NAMES: ReadonlySet<string> = new Set(GENESIS_TYPES.map((d) => d.name));
export const CORE_PREDICATE_NAMES: ReadonlySet<string> = new Set(GENESIS_PREDICATES.map((d) => d.name));
