/**
 * day-graph-seed — F3: promote the owner's real day-1 from a SIDE-JOURNAL of `observation` acts (which
 * never touch the graph — see projection.ts::isProjectable) into a REAL GRAPH: the same 9 day-threads
 * written as `domain_event` acts that FOLD into graph nodes (one node per `provenance.source_ref`), wired by
 * typed `Edge`s. This is the load-bearing test of the project's thesis «граф = субстрат»: the day now
 * exercises projection · Edge · predicates · the read lens, not a flat list.
 *
 * LOSE-NOTHING: this does NOT replace `day-seed.mjs`. The observation journal stays (append-only, cannot be
 * removed) as the day's raw record; this adds the graph form ALONGSIDE it. The verbatim day content
 * (label/status/summary/referent) is IMPORTED from `day-seed.mjs` so there is ONE source of truth for the
 * owner's words — this file only adds the graph wiring (source_refs, node types, typed edges, person nodes).
 *
 * Pure data + helpers, ZERO engine imports, so the runnable script (`scripts/day-graph.mjs`) and the test
 * (`test/day-graph.test.ts`) share one source of truth — same discipline as day-seed.mjs.
 */
import { DAY, OWNER_DAY_NODES, CONSTITUTION_BASE } from './day-seed.mjs';

export { DAY, OWNER_DAY_NODES, CONSTITUTION_BASE };

/** Natural key (source_ref) a day-thread projects into — one graph node per key. */
export const dayRef = (node) => `day:${DAY}:${node}`;
/** Natural key of a person node. Ц6: a referent becomes a REAL node with its own id, not a flat string. */
export const personRef = (name) => `person:${name}`;

/**
 * D1 predicate registry for the day (predicates-as-data / G1 — the kernel ships ZERO domain nouns, see
 * core/predicates.ts). The edge-type registry is an OPEN registry (insert-not-migrate, handoff 2026-08-21
 * §4), so adding these is the STANDARD path, not a hack. All three are `many` (a subject affects / organizes
 * / involves several targets); this is also the non-destructive default, but we declare it explicitly to
 * document intent and to inject it at the store/reducer seam exactly as a real tenant would.
 */
export const DAY_PREDICATES = {
  affects: 'many',
  organizes: 'many',
  involves: 'many',
};

/**
 * The typed edges of the day — the REAL meaning of day-1 as a graph (returned so the owner can amend it).
 *   - `эмоц-ресурс --affects--> движ · rentacar · спорт · документы` (in the day: "условие для всего").
 *   - `график-приоритеты --organizes--> документы · спорт`.
 *   - `проект-сайт-женя --involves--> Женя` ; `близкие --involves--> дочь · брат · друг` (persons → real nodes).
 * `toKind` picks the target namespace: 'node' ⇒ dayRef, 'person' ⇒ personRef.
 */
export const DAY_EDGES = [
  { from: 'эмоц-ресурс', predicate: 'affects', to: ['движ', 'rentacar', 'спорт', 'документы'] },
  { from: 'график-приоритеты', predicate: 'organizes', to: ['документы', 'спорт'] },
  { from: 'проект-сайт-женя', predicate: 'involves', to: ['Женя'], toKind: 'person' },
  { from: 'близкие', predicate: 'involves', to: ['дочь', 'брат', 'друг'], toKind: 'person' },
];

/** The people named in the day (Ц6): the union of every day-thread's `referent`, verbatim, order-preserving. */
export const PEOPLE = [...new Set(OWNER_DAY_NODES.flatMap((n) => n.referent ?? []))];

/** Deterministic non-crypto label for `provenance.snapshotHash` (the kernel dedups on CONTENT, not this). */
function hashPayload(payload) {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16)}`;
}

/** The outgoing typed edges for one day-thread (empty for a thread that wires nothing). */
function edgesForNode(node) {
  const out = [];
  for (const spec of DAY_EDGES) {
    if (spec.from !== node) continue;
    const kind = spec.toKind ?? 'node';
    for (const t of spec.to) {
      out.push({
        predicate: spec.predicate,
        target: kind === 'person' ? personRef(t) : dayRef(t),
        provenance: `day-graph:${DAY}`, // D3 edge-passport: which source asserted the edge (non-PII label).
      });
    }
  }
  return out;
}

/**
 * F-B — the reserved author + salience slots, laid EMPTY now (append-only journals cannot be retrofitted).
 *  - `principal` (ADR-0010 ② reserved form): the author-attribution slot. Populated at the HONEST level
 *    `whoActed:'unverified'` — an owner self-claim, NOT an authenticated authority; nothing reads/enforces it.
 *  - `payload.salience` = null: an EMPTY reserved weight/salience slot on the node body. NO ranking / decay
 *    engine exists (day-mirror ranks by recency only). Reserved so a future weight model needs no migration.
 */
const RESERVED_PRINCIPAL = { whoActed: 'unverified', issuer: 'day-graph-seed' };

/** Build the projectable `domain_event` for one day-thread: folds into the node `dayRef(n.node)`. */
export function toDayGraphAct(n) {
  const payload = {
    type: 'life-node', // reserved projection key → the node's type (does NOT become a body field).
    label: n.label,
    status: n.status,
    summary: n.summary,
    salience: null, // F-B: reserved empty slot (folds to body.salience=null). No weight engine yet.
  };
  return {
    id: `act:day-graph:${DAY}:${n.node}`,
    actor: 'owner',
    provenance: { source_ref: dayRef(n.node), snapshotHash: hashPayload(payload) },
    recordedAt: '', // engine-assigned, immutable.
    actKind: 'domain_event',
    edges: edgesForNode(n.node),
    principal: RESERVED_PRINCIPAL, // F-B author reserve (no enforcement).
    payload,
  };
}

/**
 * Build the projectable `domain_event` for one person node (Ц6). The display name rides `label`, NOT the
 * reserved PII key `name`: it passes admission because `label` is not a recognized PII key — the SAME
 * not-enforced form as the `referent` field in day-seed (honest, per handoff 2026-08-21 §4), NOT a validated
 * consent. Ц7 consent enforcement is deferred за швом.
 */
export function toPersonAct(name) {
  const payload = { type: 'person', label: name, salience: null };
  return {
    id: `act:day-graph:${DAY}:person:${name}`,
    actor: 'owner',
    provenance: { source_ref: personRef(name), snapshotHash: hashPayload(payload) },
    recordedAt: '',
    actKind: 'domain_event',
    edges: [],
    principal: RESERVED_PRINCIPAL,
    payload,
  };
}

/**
 * Write the day AS A GRAPH through the Engine (fail-closed admission runs on each). People are written FIRST
 * so the `involves` edges point at nodes that already exist (Ц6 referential cleanliness). Returns the acks.
 *
 * IDEMPOTENT two ways: (1) domain_events dedup by kernel CONTENT hash inside `Engine.write` (a byte-identical
 * re-write is a no-op, the log does not grow — projection.ts/idempotency.ts); (2) we also skip any act whose
 * deterministic id is already in `existingIds` (pass `store.acts().map(a=>a.id)`), symmetric with day-seed so
 * re-running on a persistent store is a clean no-op even before the content check.
 */
export function writeAllDayGraph(engine, existingIds = new Set()) {
  const acks = [];
  const write = (act) => {
    if (existingIds.has(act.id)) return; // already seeded — idempotent skip
    const ack = engine.write(act);
    if (!ack.ok) throw new Error(`write refused for '${act.id}': ${ack.reason}`);
    acks.push(ack);
  };
  PEOPLE.forEach((name) => write(toPersonAct(name)));
  OWNER_DAY_NODES.forEach((n) => write(toDayGraphAct(n)));
  return acks;
}

/** Total nodes the day projects into: 9 day-threads + the named people. */
export const DAY_GRAPH_NODE_COUNT = OWNER_DAY_NODES.length + PEOPLE.length;
/** Total typed edges the day wires. */
export const DAY_GRAPH_EDGE_COUNT = DAY_EDGES.reduce((s, e) => s + e.to.length, 0);
