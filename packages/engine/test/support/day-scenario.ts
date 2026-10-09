/**
 * day-scenario — reusable MECHANICS for the "data-as-capability" corpus.
 *
 * Owner's reframe (2026-09-17): **тест = декларация возможности**; movement is «одни единицы →
 * совокупность разных единиц → гоняем данные как в сложной системе». This module makes a DAY cheap to
 * declare (a bag of acts over the FROZEN engine) and cheap to interrogate (capability asserts), so
 * adding a new day / aggregate costs a few lines — that is the "механика тестов" the owner asked for.
 *
 * ⚠️ NOTHING here changes engine behaviour. It only DRIVES packages/engine/src as-is. Capabilities the
 * engine does NOT yet hold (consent-revoke enforcement, identity merge, cold/salience) are expressed as
 * HONEST `test.fails` / `test.todo` at the call site — the asserts below never fake a green.
 *
 * Companion form-tests: value-collisions.test.ts (T1–T7), consent-not-enforced.test.ts,
 * edge-identity-not-enforced.test.ts. This module is the DATA/aggregate side of the same honest coin.
 */
import { expect } from 'vitest';
import {
  Engine,
  MemoryStore,
  FIXED_POLICY,
  sourceRefOf,
  type Ack,
  type Act,
  type Edge,
  type EnvelopeNode,
  type PredicateRegistry,
} from '../../src/index.js';

// The engine refuses to START without a policy:constitution ceiling (engine.ts fail-stop). A minimal,
// permissive one — empty clamp lists ⇒ no protected namespaces / no no-read floor — so a day's ordinary
// writes are untouched and reads are not the thing under test here.
export const MIN_CONSTITUTION: EnvelopeNode = {
  id: 'policy:constitution',
  type: 'policy',
  state: { status: 'active' },
  edges: [],
  view: [],
  visibility: { readable_by: ['agent:*'] },
  access: { can_read: ['agent:*'], can_write: [] },
  acts: [],
  policy_ref: [],
  body: { synthetic: true, no_read_ids: [], protected_namespaces: [], default: 'deny' },
};

export interface DayEngine {
  engine: Engine;
  store: MemoryStore;
}

/** A fresh engine over MIN_CONSTITUTION (+ optional base nodes), with the tenant predicate registry. */
export function newDayEngine(registry: PredicateRegistry = {}, base: EnvelopeNode[] = []): DayEngine {
  const store = new MemoryStore([MIN_CONSTITUTION, ...base], registry);
  return { engine: new Engine(store, FIXED_POLICY), store };
}

export const nodeOf = (store: MemoryStore, id: string): EnvelopeNode | undefined =>
  store.load().find((n) => n.id === id);

// ── Act builder ──────────────────────────────────────────────────────────────────────────────────
let seq = 0;

export interface DomainEventSpec {
  /** source_ref — the natural key the domain_event folds into (one node per ref). */
  ref: string;
  /** node type (payload.type). */
  type: string;
  /** non-reserved body fields (become node.body, freshest-wins). */
  body?: Record<string, unknown>;
  edges?: Edge[];
  actor?: string;
  /** changed snapshotHash ⇒ a SUPERSEDING event (content still discriminates dedup vs supersede). */
  snapshotHash?: string;
  /** visibility-as-data (reserved payload key). */
  readable_by?: string[];
  /** by-ref payload rail (PII lives behind the ref, ADR-0007). */
  payloadRef?: string;
  payloadHash?: string;
}

/** Build a projectable `domain_event`. recordedAt is engine-assigned, so left ''. */
export function domainEvent(spec: DomainEventSpec): Act {
  const payload: Record<string, unknown> = { type: spec.type, ...(spec.body ?? {}) };
  if (spec.readable_by) payload.readable_by = spec.readable_by;
  const act: Act = {
    id: `act:${spec.ref}:${++seq}`,
    actor: spec.actor ?? 'sync:test',
    provenance: { source_ref: spec.ref, snapshotHash: spec.snapshotHash ?? 'h1' },
    recordedAt: '',
    actKind: 'domain_event',
    edges: spec.edges ?? [],
    payload,
  };
  if (spec.payloadRef) {
    act.payloadRef = spec.payloadRef;
    act.payloadHash = spec.payloadHash ?? 'sha256:deadbeef';
  }
  return act;
}

// ── Day = a bag of acts over one registry ──────────────────────────────────────────────────────────
export interface DayScenario {
  id: string;
  title: string;
  registry?: PredicateRegistry;
  base?: EnvelopeNode[];
  /** the acts that SHOULD succeed (the day's real graph). Adversarial probes live outside `acts`. */
  acts: Act[];
}

export interface RunResult extends DayEngine {
  acks: Ack[];
}

/** Write every act of a day through a fresh engine; return the engine + store + acks. */
export function runDay(day: DayScenario): RunResult {
  const de = newDayEngine(day.registry ?? {}, day.base ?? []);
  const acks = day.acts.map((a) => de.engine.write(a));
  return { ...de, acks };
}

/** Merge several days into ONE aggregate day (registries merged, acts concatenated). */
export function aggregate(id: string, title: string, ...days: DayScenario[]): DayScenario {
  return {
    id,
    title,
    registry: Object.assign({}, ...days.map((d) => d.registry ?? {})),
    base: days.flatMap((d) => d.base ?? []),
    acts: days.flatMap((d) => d.acts),
  };
}

// ── Capability asserts (the vocabulary of "what the machine HOLDS") ─────────────────────────────────

/** V1 Читаемость — the passport yields its grain cheaply and stays THIN (a few fields, not the unit). */
export function assertThinPassport(
  node: EnvelopeNode | undefined,
  opts: { grain: string; maxFields?: number },
): void {
  expect(node, 'passport node should exist').toBeDefined();
  const body = node!.body ?? {};
  expect(String(body[opts.grain] ?? ''), `grain '${opts.grain}' readable off the passport`).not.toBe('');
  expect(Object.keys(body).length, 'passport stays thin').toBeLessThanOrEqual(opts.maxFields ?? 4);
}

/** V3×V2 — a conflict converged to the FRESHEST fact, auditably (superseded acts retained in the log). */
export function assertFreshestWins(
  store: MemoryStore,
  ref: string,
  want: { body: Record<string, unknown>; version: number; retainedActs: number },
): void {
  const node = nodeOf(store, ref);
  expect(node?.body, 'freshest body wins (not a merge/last-writer blob)').toEqual(want.body);
  expect(node?.state?.version, 'version = depth of the act chain').toBe(want.version);
  const forRef = store.acts().filter((a) => sourceRefOf(a) === ref);
  expect(forRef.length, 'append-only: superseded acts are NOT erased').toBe(want.retainedActs);
}

/** V2 Тождество — a byte-identical re-write is a NO-OP (kernel content-hash dedup, log does not grow). */
export function assertDedup(ack: Ack): void {
  expect(ack.ok, 'a dedup re-write still acks ok').toBe(true);
  if (ack.ok) expect(ack.dedup, 'byte-identical re-write dedups (log did not grow)').toBe(true);
}

/** V7×V3 — inline PII is refused BEFORE any journal write (admission-gate, ADR-0007). */
export function assertPiiRefused(engine: Engine, act: Act): void {
  const ack = engine.write(act);
  expect(ack.ok, 'inline-PII act must be refused fail-closed').toBe(false);
  if (!ack.ok) expect(ack.reason).toMatch(/inline PII/i);
}

/** The by-ref form of a record passes the gate (PII behind payloadRef+payloadHash). */
export function assertAdmitted(engine: Engine, act: Act): Ack {
  const ack = engine.write(act);
  expect(ack.ok, 'a clean / by-ref act should be admitted').toBe(true);
  return ack;
}

/** All the edges in `nodes` whose target is not itself a node (a dangling / orphan edge). */
export function orphanEdges(nodes: EnvelopeNode[]): { source: string; predicate: string; target: string }[] {
  const ids = new Set(nodes.map((n) => n.id));
  const orphans: { source: string; predicate: string; target: string }[] = [];
  for (const n of nodes)
    for (const e of n.edges ?? [])
      if (!ids.has(e.target)) orphans.push({ source: n.id, predicate: e.predicate, target: e.target });
  return orphans;
}

/**
 * V6 Реляционность — the aggregate keeps referential integrity: every edge lands on a real node, no
 * orphans. HONEST CAVEAT: this is a property of well-formed fixtures (a DATA discipline the writer
 * upholds), NOT an engine guarantee — the engine does NOT refuse a dangling edge (orphan-protection is
 * unbuilt, draft §D). Use it to catch fixture drift AND to name the property we WANT the engine to hold.
 */
export function assertNoOrphanEdges(nodes: EnvelopeNode[]): void {
  expect(orphanEdges(nodes), 'aggregate keeps referential integrity (no orphan edges)').toEqual([]);
}

/**
 * V7×V3 — CAPABILITY (UNMET today): `Engine.write()` REFUSES an act that asserts a `revoked`-consent
 * edge. Today `consent.status` is schema-only (types.ts) and write() never branches on it, so `ack.ok`
 * is `true` and the `expect(false)` below FAILS — which is why the CALL SITE wraps this in `test.fails`
 * (green while the promise is unmet). It FLIPS RED the day consent enforcement lands (a promote-me
 * signal). Mirrors value-collisions T1 + consent-not-enforced.test.ts, exercised on real Day-3 data.
 */
export function assertRevokedEdgeRefused(engine: Engine, act: Act): void {
  const ack = engine.write(act);
  expect(ack.ok, 'DESIRED: a revoked-consent edge is refused (today it is NOT)').toBe(false);
}
