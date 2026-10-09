// @ff/brain/domain/registry — the type/predicate registry, read ONLY from the journal (ADR-0016 D3, R-3).
//
// Two-pass start: (1) `scanJournalRegistry(journalPath)` reads journal.jsonl line by line (bad lines are
// skipped), collecting every type-def / predicate-def act → registry + cardinalities; (2) the store is
// opened with those cardinalities (see schemas.ts `bootBrain`). The registry keeps EVERY version of a
// type-def, so a record written under `type_v=1` stays interpretable after v2 appears (AC-37).
import { existsSync, readFileSync } from 'node:fs';

import type { Act, PredicateRegistry } from '@ff/engine';

import {
  GENESIS_PREDICATES,
  GENESIS_TYPES,
  K,
  PII_PERSON,
  type FieldSpec,
  type PredicateDef,
  type TypeDef,
} from './genesis.js';

export class Registry {
  /** name → version → def (all versions ever journaled). */
  private readonly typeVersions = new Map<string, Map<number, TypeDef>>();
  /** name → latest def (the freshest act wins, like the projection). */
  private readonly latestTypes = new Map<string, TypeDef>();
  private readonly preds = new Map<string, PredicateDef>();

  /** Fold one def in journal order (later wins for "latest"; every version is kept). */
  addType(def: TypeDef): void {
    let versions = this.typeVersions.get(def.name);
    if (!versions) this.typeVersions.set(def.name, (versions = new Map()));
    versions.set(def.version, def);
    this.latestTypes.set(def.name, def);
  }

  addPredicate(def: PredicateDef): void {
    this.preds.set(def.name, def);
  }

  /** Latest type-def (any status), or a specific version. */
  type(name: string, version?: number): TypeDef | undefined {
    if (version === undefined) return this.latestTypes.get(name);
    return this.typeVersions.get(name)?.get(version);
  }

  /** A type a record may be written under: latest def is `active` (candidate/cold = form only, D5). */
  activeType(name: string): TypeDef | undefined {
    const def = this.latestTypes.get(name);
    return def && def.status === 'active' ? def : undefined;
  }

  hasType(name: string): boolean {
    return this.latestTypes.has(name);
  }

  typeNames(): string[] {
    return [...this.latestTypes.keys()];
  }

  predicate(name: string): PredicateDef | undefined {
    return this.preds.get(name);
  }

  /** Predicates usable in record.edges / link (v0.5: `active` only; candidate-predicates = 1c). */
  activePredicate(name: string): PredicateDef | undefined {
    const def = this.preds.get(name);
    return def && def.status === 'active' ? def : undefined;
  }

  predicateNames(): string[] {
    return [...this.preds.values()].filter((d) => d.status === 'active').map((d) => d.name).sort();
  }

  /** The engine's PredicateRegistry (kernel-locked predicates still win inside the engine). */
  cardinalities(): PredicateRegistry {
    const out: PredicateRegistry = {};
    for (const d of this.preds.values()) out[d.name] = d.cardinality;
    return out;
  }

  /** Field names flagged `opaque` across all type versions → engine `opaqueValueKeys` (R-9). */
  opaqueFieldNames(): string[] {
    const out = new Set<string>();
    for (const versions of this.typeVersions.values()) {
      for (const def of versions.values()) {
        for (const [f, spec] of Object.entries(def.fields)) if (spec.opaque) out.add(f);
      }
    }
    return [...out].sort();
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

  /** Fold one act if it is a registry act; ignores everything else. */
  foldAct(act: Pick<Act, 'actKind' | 'payload'>): void {
    if (act.actKind !== 'domain_event') return;
    const payload = act.payload;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    const body = payload as Record<string, unknown>;
    if (body.type === K.types.typeDef) {
      const def = parseTypeDef(body);
      if (def) this.addType(def);
    } else if (body.type === K.types.predicateDef) {
      const def = parsePredicateDef(body);
      if (def) this.addPredicate(def);
    }
  }

  static fromActs(acts: Iterable<Pick<Act, 'actKind' | 'payload'>>): Registry {
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
  return spec;
}

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
 * cardinalities can come from here). Mirrors the store's line format: the payload lives under `erasable`
 * (split line) or `payload` (legacy inline line). An unterminated tail chunk is ignored.
 */
export function scanJournalRegistry(journalPath: string): RegistryScan {
  const registry = new Registry();
  let badLines = 0;
  let acts = 0;
  if (!existsSync(journalPath)) return { registry, badLines, acts };
  const text = readFileSync(journalPath, 'utf8');
  const lines = text.split('\n');
  // the last element is '' for a `\n`-terminated file, or the torn tail chunk otherwise — skip it either way
  lines.pop();
  for (const line of lines) {
    if (line.trim() === '') continue;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      badLines += 1;
      continue;
    }
    if (!parsed || typeof parsed !== 'object') {
      badLines += 1;
      continue;
    }
    acts += 1;
    const payload = 'erasable' in parsed ? parsed.erasable : parsed.payload;
    registry.foldAct({ actKind: parsed.actKind as Act['actKind'], payload });
  }
  return { registry, badLines, acts };
}
