// @ff/brain/domain/registry — the type/predicate registry, read ONLY from the journal (ADR-0016 D3, R-3).
//
// Two-pass start: (1) `scanJournalRegistry(journalPath)` parses journal.jsonl with the engine's ONE codec
// (`parseJournal`, bad lines skipped), folding every type-def / predicate-def act → registry + cardinalities;
// (2) the store is opened with those cardinalities (see schemas.ts `bootBrain`); the runtime registry is then
// rebuilt from `store.acts()` through the SAME `foldAct` (SPEC-brain-data-doors R-1.5).
//
// Names (ADR-0017 D1): defs are keyed by their CANONICAL name (names.ts); a legacy bare non-core name is an
// alias of `u:<name>`. Every lookup accepts either spelling. Every def act is re-checked on fold
// (`checkDefinition` against the act's `actor`): a def from the wrong writer (a bypass of `planDefinition`)
// never enters the registry and is listed in `rejected` — the service turns it into one DEF_REJECTED friction.
// The registry keeps EVERY version of a type-def, so a record written under `type_v=1` stays interpretable
// after v2 appears (AC-37).
import { existsSync, readFileSync } from 'node:fs';

import { parseJournal, type Act, type FieldPolicy, type PredicateRegistry } from '@ff/engine';

import { LIMITS } from '../contract.js';

import {
  GENESIS_PREDICATES,
  GENESIS_TYPES,
  ID_PREFIX,
  K,
  PII_PERSON,
  SCHEMA_AUTHOR_FIELD_FLAGS,
  VERSIONED_NODE_PREFIXES,
  type FieldSpec,
  type PredicateDef,
  type TypeDef,
} from './genesis.js';
import { canonicalName, checkDefinition, defNodeIdFor, typeKey, type DefKind } from './names.js';

/** The act fields the registry fold reads (the codec returns whole acts — R-1.5). */
export type RegistryAct = Pick<Act, 'id' | 'actor' | 'actKind' | 'payload'> & { provenance?: Act['provenance'] };

/** A def act the fold refused (never in the registry). No body — name + reason only. */
export interface RejectedDef {
  actId: string;
  kind: DefKind;
  name: string;
  actor: string;
  reason: string;
}

export class Registry {
  /** canonical name → version → def (all versions ever journaled). */
  private readonly typeVersions = new Map<string, Map<number, TypeDef>>();
  /** canonical name → latest def (the freshest accepted act wins, like the projection). */
  private readonly latestTypes = new Map<string, TypeDef>();
  private readonly preds = new Map<string, PredicateDef>();
  /** canonical predicate → every spelling journaled (legacy bare + canonical) — for the store's cardinalities. */
  private readonly predSpellings = new Map<string, Set<string>>();
  /** `kind|canonical` → node id of the FIRST accepted def (R-1.6: identity survives the alias). */
  private readonly defNodes = new Map<string, string>();
  /** node id → `kind|canonical` (reverse of defNodes). */
  private readonly nodeDefs = new Map<string, string>();
  private readonly rejectedDefs: RejectedDef[] = [];

  private rememberNode(kind: DefKind, canonical: string, nodeId: string): void {
    const key = `${kind}|${canonical}`;
    if (this.defNodes.has(key)) return;
    this.defNodes.set(key, nodeId);
    this.nodeDefs.set(nodeId, key);
  }

  /** Fold one TRUSTED def (genesis overlay / an already-checked act). Stored under its canonical name. */
  addType(def: TypeDef, nodeId?: string): void {
    const name = canonicalName('type', def.name);
    if (name === null) return;
    const d: TypeDef = def.name === name ? def : { ...def, name };
    let versions = this.typeVersions.get(name);
    if (!versions) this.typeVersions.set(name, (versions = new Map()));
    versions.set(d.version, d);
    this.latestTypes.set(name, d);
    this.rememberNode('type', name, nodeId ?? defNodeIdFor('type', name));
  }

  addPredicate(def: PredicateDef, nodeId?: string): void {
    const name = canonicalName('predicate', def.name);
    if (name === null) return;
    this.preds.set(name, def.name === name ? def : { ...def, name });
    let sp = this.predSpellings.get(name);
    if (!sp) this.predSpellings.set(name, (sp = new Set()));
    sp.add(name);
    sp.add(def.name);
    this.rememberNode('predicate', name, nodeId ?? defNodeIdFor('predicate', name));
  }

  /** Latest type-def (any status), or a specific version. Either spelling (`idea` ≡ `u:idea`, `core:task` ≡ `task`). */
  type(name: string, version?: number): TypeDef | undefined {
    const c = canonicalName('type', name);
    if (c === null) return undefined;
    if (version === undefined) return this.latestTypes.get(c);
    return this.typeVersions.get(c)?.get(version);
  }

  /** A type a record may be written under: latest def is `active` (candidate/cold = form only, D5). */
  activeType(name: string): TypeDef | undefined {
    const def = this.type(name);
    return def && def.status === 'active' ? def : undefined;
  }

  hasType(name: string): boolean {
    return this.type(name) !== undefined;
  }

  typeNames(): string[] {
    return [...this.latestTypes.keys()];
  }

  predicate(name: string): PredicateDef | undefined {
    const c = canonicalName('predicate', name);
    return c === null ? undefined : this.preds.get(c);
  }

  /** Predicates usable in record.edges / link (v0.5: `active` only; candidate-predicates = 1c). */
  activePredicate(name: string): PredicateDef | undefined {
    const def = this.predicate(name);
    return def && def.status === 'active' ? def : undefined;
  }

  predicateNames(): string[] {
    return [...this.preds.values()].filter((d) => d.status === 'active').map((d) => d.name).sort();
  }

  /**
   * The engine's PredicateRegistry (kernel-locked predicates still win inside the engine). Keyed by the
   * canonical name AND every journaled spelling: a legacy `lives-in` edge keeps its `one` fold (R-1.6).
   */
  cardinalities(): PredicateRegistry {
    const out: PredicateRegistry = {};
    for (const [name, d] of this.preds) {
      out[name] = d.cardinality;
      for (const sp of this.predSpellings.get(name) ?? []) out[sp] = d.cardinality;
    }
    return out;
  }

  /** Node id of the def of this name (first accepted def), or undefined if never defined. */
  defNodeId(kind: DefKind, name: string): string | undefined {
    const c = canonicalName(kind, name);
    return c === null ? undefined : this.defNodes.get(`${kind}|${c}`);
  }

  /**
   * The def a registry NODE stands for, from the registry — never from the projection (R-1.5, V3): a def act
   * smuggled into the journal may overwrite the projected node body, but not the registry's truth.
   */
  definitionAt(nodeId: string): { kind: 'type'; def: TypeDef } | { kind: 'predicate'; def: PredicateDef } | undefined {
    const key = this.nodeDefs.get(nodeId);
    if (!key) return undefined;
    const bar = key.indexOf('|');
    const kind = key.slice(0, bar) as DefKind;
    const name = key.slice(bar + 1);
    if (kind === 'type') {
      const def = this.latestTypes.get(name);
      return def ? { kind, def } : undefined;
    }
    const def = this.preds.get(name);
    return def ? { kind, def } : undefined;
  }

  /** Def acts the fold refused, in journal order. */
  get rejected(): readonly RejectedDef[] {
    return this.rejectedDefs;
  }

  /**
   * Field names flagged `opaque` WITHOUT a `pattern` across all type versions → engine `opaqueValueKeys` (R-9,
   * global by key name, uppercase-id form). `opaque + pattern` goes to `fieldPolicies` instead (bound to the type).
   */
  opaqueFieldNames(): string[] {
    const out = new Set<string>();
    for (const versions of this.typeVersions.values()) {
      for (const def of versions.values()) {
        for (const [f, spec] of Object.entries(def.fields)) if (spec.opaque && spec.pattern === undefined) out.add(f);
      }
    }
    return [...out].sort();
  }

  /**
   * SPEC-R1 R-01: per-type engine admission policies — `opaque + pattern` → `opaquePattern`, `verbatim` →
   * datetime-normalized scan view. Union over all versions of a type, keyed by its canonical name (the payload
   * `type` every brain write stamps).
   */
  fieldPolicies(): FieldPolicy[] {
    const out = new Map<string, FieldPolicy>();
    for (const [name, versions] of this.typeVersions) {
      for (const def of versions.values()) {
        for (const [f, spec] of Object.entries(def.fields)) {
          const opaquePattern = spec.opaque && spec.pattern !== undefined ? spec.pattern : undefined;
          if (opaquePattern === undefined && spec.verbatim !== true) continue;
          const k = `${name}|${f}`;
          const p: FieldPolicy = out.get(k) ?? { payloadType: name, key: f };
          if (opaquePattern !== undefined) p.opaquePattern = opaquePattern;
          if (spec.verbatim === true) p.verbatim = true;
          out.set(k, p);
        }
      }
    }
    return [...out.values()];
  }

  /** True when every genesis type and predicate is present (by name). */
  hasGenesis(): boolean {
    return (
      GENESIS_TYPES.every((d) => this.latestTypes.has(d.name)) &&
      GENESIS_PREDICATES.every((d) => this.preds.has(d.name))
    );
  }

  /** Overlay genesis defs for names the journal does not have yet (first boot, before genesis is written). */
  withGenesisDefaults(): this {
    for (const d of GENESIS_TYPES) if (!this.latestTypes.has(d.name)) this.addType(d);
    for (const d of GENESIS_PREDICATES) if (!this.preds.has(d.name)) this.addPredicate(d);
    return this;
  }

  /**
   * Fold one act if it is a registry act; ignores everything else. The def is accepted only if its WRITER may
   * define that name (`checkDefinition`) and it lands in the def's node (`typedef:<name>` / the first node of
   * an alias); otherwise it goes to `rejected` and the registry is unchanged (R-1.5).
   */
  foldAct(act: RegistryAct): void {
    if (act.actKind !== 'domain_event') return;
    const payload = act.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    const body = payload as Record<string, unknown>;
    if (typeof body.type !== 'string') return;
    const declared = typeKey(body.type);
    let kind: DefKind;
    let def: TypeDef | PredicateDef | null;
    if (declared === K.types.typeDef) {
      kind = 'type';
      def = parseTypeDef(body);
    } else if (declared === K.types.predicateDef) {
      kind = 'predicate';
      def = parsePredicateDef(body);
    } else return;
    if (!def) return; // malformed def: skipped, never throws — replay never refuses (D3)

    const reject = (reason: string) =>
      this.rejectedDefs.push({ actId: String(act.id), kind, name: def!.name, actor: String(act.actor), reason });
    const check = checkDefinition(kind, def.name, act.actor);
    if (!check.ok) return void reject(check.reason);

    const prov = act.provenance;
    const ref = prov && typeof prov === 'object' ? (prov as { source_ref?: unknown }).source_ref : undefined;
    const prefix = kind === 'type' ? ID_PREFIX.typeDef : ID_PREFIX.predicateDef;
    const known = this.defNodes.get(`${kind}|${check.canonical}`);
    const nodeOk = known !== undefined ? ref === known : ref === `${prefix}${def.name}` || ref === `${prefix}${check.canonical}`;
    if (!nodeOk) return void reject('node-mismatch');

    // SPEC-R1 R-01: only a schema author (genesis / sys: / pack:) may grant max_bytes / verbatim / pattern
    if (kind === 'type' && check.canonical.startsWith('u:')) {
      def = withoutAuthorFlags(def as TypeDef);
      delete (def as TypeDef).versioned_node; // system nodes are not a `u:` def's to mint
    }
    if (kind === 'type') this.addType(def as TypeDef, ref as string);
    else this.addPredicate(def as PredicateDef, ref as string);
  }

  static fromActs(acts: Iterable<RegistryAct>): Registry {
    const r = new Registry();
    for (const a of acts) r.foldAct(a);
    return r;
  }

  /** Genesis-only registry (tests, and the overlay used before genesis is journaled). */
  static genesis(): Registry {
    return new Registry().withGenesisDefaults();
  }
}

// ─── Parsing (tolerant: a malformed def is skipped, never throws — replay never refuses, D3) ─────────

const FIELD_KINDS = new Set(['text', 'enum', 'date', 'number', 'bool', 'ref']);

function parseFieldSpec(v: unknown): FieldSpec | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.kind !== 'string' || !FIELD_KINDS.has(o.kind)) return null;
  const spec: FieldSpec = { kind: o.kind as FieldSpec['kind'] };
  if (typeof o.required === 'boolean') spec.required = o.required;
  if (Array.isArray(o.values) && o.values.every((x) => typeof x === 'string')) spec.values = o.values as string[];
  if (['string', 'number', 'boolean'].includes(typeof o.default)) spec.default = o.default as FieldSpec['default'];
  if (typeof o.opaque === 'boolean') spec.opaque = o.opaque;
  // SPEC-R1 R-01 flags — kept only when well-formed (a bad flag is dropped, never widens anything)
  if (typeof o.max_bytes === 'number' && Number.isInteger(o.max_bytes) && o.max_bytes > 0 && o.max_bytes <= LIMITS.actFieldsMaxBytes) {
    spec.max_bytes = o.max_bytes;
  }
  if (typeof o.verbatim === 'boolean') spec.verbatim = o.verbatim;
  if (isAnchoredPattern(o.pattern)) spec.pattern = o.pattern;
  return spec;
}

/** An anchored (`^…$`), compilable regex source — the only form a `pattern` flag may take. */
export function isAnchoredPattern(p: unknown): p is string {
  if (typeof p !== 'string' || p.length > 256 || !p.startsWith('^') || !p.endsWith('$')) return false;
  try {
    new RegExp(p);
    return true;
  } catch {
    return false;
  }
}

/** A def with the schema-author-only flags removed (a `u:` def may not grant them — SPEC-R1 R-01). */
export function withoutAuthorFlags(def: TypeDef): TypeDef {
  let changed = false;
  const fields: Record<string, FieldSpec> = {};
  for (const [f, spec] of Object.entries(def.fields)) {
    const copy: FieldSpec = { ...spec };
    for (const flag of SCHEMA_AUTHOR_FIELD_FLAGS) {
      if (copy[flag] !== undefined) {
        delete copy[flag];
        changed = true;
      }
    }
    fields[f] = copy;
  }
  return changed ? { ...def, fields } : def;
}

/** Does any field carry a schema-author-only flag? */
export const hasAuthorFlags = (def: Pick<TypeDef, 'fields'>): boolean =>
  Object.values(def.fields ?? {}).some((spec) => SCHEMA_AUTHOR_FIELD_FLAGS.some((f) => (spec as unknown as Record<string, unknown>)[f] !== undefined));

/** Parse a type-def body (payload or projected body). Returns null if it is not a usable def. */
export function parseTypeDef(body: Record<string, unknown>): TypeDef | null {
  const { name, version, status } = body;
  if (typeof name !== 'string' || name === '') return null;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null;
  const st = status === 'candidate' || status === 'cold' ? status : 'active';
  const fields: Record<string, FieldSpec> = {};
  const rawFields = body.fields;
  if (rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)) {
    for (const [f, v] of Object.entries(rawFields as Record<string, unknown>)) {
      const spec = parseFieldSpec(v);
      if (spec) fields[f] = spec;
    }
  }
  const def: TypeDef = { name, version, status: st, fields };
  if (typeof body.label_hint === 'string') def.label_hint = body.label_hint;
  if (typeof body.confidence === 'number') def.confidence = body.confidence;
  if (typeof body.extends === 'string') def.extends = body.extends;
  if (body.pii === PII_PERSON || body.pii === 'none') def.pii = body.pii;
  if (body.approval === 'owner' || body.approval === 'none') def.approval = body.approval;
  if (body.write === 'owner' || body.write === 'any') def.write = body.write;
  const vn = body.versioned_node as Record<string, unknown> | undefined;
  if (
    vn && typeof vn === 'object' && typeof vn.prefix === 'string' && VERSIONED_NODE_PREFIXES.includes(vn.prefix) &&
    typeof vn.id_field === 'string' && typeof vn.version_field === 'string'
  ) {
    def.versioned_node = { prefix: vn.prefix, id_field: vn.id_field, version_field: vn.version_field };
  }
  return def;
}

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function parsePredicateDef(body: Record<string, unknown>): PredicateDef | null {
  const { name, cardinality } = body;
  if (typeof name !== 'string' || name === '') return null;
  if (cardinality !== 'one' && cardinality !== 'many') return null;
  const def: PredicateDef = {
    name,
    cardinality,
    from_hint: strList(body.from_hint),
    to_hint: strList(body.to_hint),
    meaning: typeof body.meaning === 'string' ? body.meaning : '',
    status: body.status === 'candidate' ? 'candidate' : 'active',
  };
  if (typeof body.locked === 'boolean') def.locked = body.locked;
  return def;
}

// ─── Pass 1: raw line scan of journal.jsonl (before the store is opened) ────────────────────────────

export interface RegistryScan {
  registry: Registry;
  /** Complete lines that failed to parse (pass 2 — the store — reports them again via onBadLine). */
  badLines: number;
  /** Total parsed acts. */
  acts: number;
}

/**
 * Pass 1 of the two-pass start (R-3). Reads the journal file directly (the store is not open yet, so its
 * cardinalities can come from here) through the engine's ONE line codec — the same parser the store uses, so
 * the two passes can never disagree on a line (R-4.1). The unterminated tail chunk is ignored.
 */
export function scanJournalRegistry(journalPath: string): RegistryScan {
  const registry = new Registry();
  if (!existsSync(journalPath)) return { registry, badLines: 0, acts: 0 };
  const parsed = parseJournal(readFileSync(journalPath));
  for (const act of parsed.acts) registry.foldAct(act);
  return { registry, badLines: parsed.bad.length, acts: parsed.acts.length };
}
