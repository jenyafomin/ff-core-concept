/**
 * agent-run-seed — the "агент-прогон → память" grain: memory REMEMBERING ITSELF. It promotes a REAL slice
 * of THIS session's own recursive orchestration (the agent waves that built F3 + the recheck wave) from
 * ephemeral chat into a REAL GRAPH in the engine: agent-referents · tasks · findings · verdicts written as
 * `domain_event` acts that FOLD into graph nodes (one node per `provenance.source_ref`), wired by typed
 * `Edge`s, read back off disk by the «граф прогона» lens. This is the load-bearing dogfood of the thesis
 * «граф = субстрат» applied to the system's OWN work — the orchestration is now a durable, projectable,
 * queryable graph, not a transcript.
 *
 * Modeled EXACTLY like F3's day-graph-seed.mjs (same discipline): predicates-as-DATA injected at the store
 * seam (the kernel ships zero domain nouns, core/predicates.ts G1), one node per source_ref, referents
 * promoted to real nodes (Ц6), an EMPTY reserved `salience` slot (F-B, no weight engine yet), and the
 * reserved `principal` author-slot laid at the honest `unverified` level (ADR-0010 ②, nothing enforces it).
 *
 * Pure data + helpers, ZERO engine imports, so the runnable script (`scripts/agent-run.mjs`) and the test
 * (`test/agent-run.test.ts`) share ONE source of truth — same seam as day-graph-seed.mjs.
 */

// Reuse F3's Constitution base so both grains start the Engine identically (one source of the genesis ceiling).
import { CONSTITUTION_BASE } from './day-seed.mjs';

export { CONSTITUTION_BASE };

/** ISO date of the orchestration session this run-graph captures (verbatim: this session). */
export const RUN = '2026-08-22';

/** Natural key (source_ref) a run-thread projects into — one graph node per key. */
export const runRef = (slug) => `run:${RUN}:${slug}`;
/** Natural key of an agent-referent node. Ц6: an agent is a REAL node with its own id, not a flat string. */
export const agentRef = (name) => `agent:${name}`;

/**
 * The predicate registry for the run-graph (predicates-as-data / G1 — the kernel ships ZERO domain nouns,
 * see core/predicates.ts). The edge-type registry is an OPEN registry (insert-not-migrate), so adding these
 * is the STANDARD path, not a hack — injected at the store/reducer seam exactly as a real tenant would.
 * All `many`: an agent performs/produces several things, a finding can refute several priors. `many` is
 * also the non-destructive default, but we declare intent explicitly (and it keeps the registry
 * forward-monotone across reboots — predicates.ts::assertForwardMonotone).
 */
export const RUN_PREDICATES = {
  performs: 'many', // agent → task it executed
  produced: 'many', // agent → finding it authored
  verified: 'many', // agent → verdict it certified (reviewer)
  gated: 'many', // agent → verdict it gated (co-orchestrator quality/stage gate)
  refuted: 'many', // agent → finding it refuted (critic red-team)
  supersedes: 'many', // finding → prior finding it overrides (freshest wins, Ц4)
};

/**
 * The agent-referents named in this session's orchestration (Ц6): each becomes a REAL `agent` node, the
 * same promotion day-graph gives `person`s. Order-preserving; the display name rides `label` (not a PII key).
 */
export const AGENTS = ['builder', 'reviewer', 'critic', 'co-orchestrator', 'D1', 'D2', 'D3', 'D4'];

/**
 * The run-threads (tasks · findings · verdicts) of THIS session, verbatim-by-meaning. Each folds into one
 * graph node keyed by `runRef(slug)`. `type` becomes the node type (task | finding | verdict); status/
 * summary ride the body; `commit` (verdict only) records the resulting commit as body data.
 */
export const RUN_NODES = [
  // ── F3 spine: task → builder's finding → reviewer's verdict → commit ──────────────────────────────
  {
    slug: 'task:f3-day-graph',
    type: 'task',
    status: 'done',
    label: 'F3: день-1 как граф',
    summary: 'построить день-1 как настоящий граф (domain_event + типизированные рёбра)',
  },
  {
    slug: 'finding:day-graph',
    type: 'finding',
    status: 'accepted',
    label: 'day-graph: 13 узлов / 10 рёбер',
    summary: 'день спроецирован в граф: 13 узлов, 10 типизированных рёбер, переживает reboot',
  },
  {
    slug: 'verdict:f3-pass',
    type: 'verdict',
    status: 'pass',
    label: 'PASS, 145 тестов',
    summary: 'reviewer: PASS — весь пакет зелёный (145 тестов)',
    commit: '9cdd800', // the resulting commit, as body DATA (result is not a separate node type)
  },
  // ── Recheck wave: 4 D-agents → 4 analyses; co-orchestrator gates PATCH; critic refutes a false consensus ─
  {
    slug: 'task:recheck-wave',
    type: 'task',
    status: 'done',
    label: 'Волна перепроверки',
    summary: 'перепроверка policy-as-data волной из 4 агентов (D1–D4)',
  },
  {
    slug: 'finding:d1',
    type: 'finding',
    status: 'superseded', // critic's refutation supersedes it (Ц4 — living, not deleted)
    label: 'D1: анализ policy-as-data',
    summary: 'D1: разбор policy-as-data на записи (позже признан переоценённым)',
  },
  {
    slug: 'finding:d2',
    type: 'finding',
    status: 'accepted',
    label: 'D2: анализ',
    summary: 'D2: анализ волны перепроверки',
  },
  {
    slug: 'finding:d3',
    type: 'finding',
    status: 'accepted',
    label: 'D3: анализ',
    summary: 'D3: анализ волны перепроверки',
  },
  {
    slug: 'finding:d4',
    type: 'finding',
    status: 'accepted',
    label: 'D4: анализ',
    summary: 'D4: анализ волны перепроверки (согласился с D1 — консенсус позже оспорен)',
  },
  {
    slug: 'finding:false-consensus',
    type: 'finding',
    status: 'accepted',
    label: 'ложный консенсус D1↔D4',
    summary: 'критик: D1 переоценил policy-as-data на записи; консенсус D1↔D4 оказался ложным',
  },
  {
    slug: 'verdict:recheck-patch',
    type: 'verdict',
    status: 'patch',
    label: 'PATCH',
    summary: 'co-orchestrator: PATCH — волна возвращена на доработку',
  },
];

/**
 * The typed edges of the run — the REAL meaning of this session's orchestration as a graph. `from` and each
 * `to` are already fully-qualified source_refs (agent:… or run:…) so the seam is uniform (no toKind switch).
 *   - builder --performs--> F3-task ; builder --produced--> day-graph finding.
 *   - reviewer --verified--> the PASS verdict.
 *   - D1..D4 --performs--> the recheck task ; each --produced--> its analysis finding.
 *   - co-orchestrator --gated--> the PATCH verdict.
 *   - critic --produced--> the false-consensus finding ; critic --refuted--> D1 & D4 (the false consensus).
 *   - false-consensus --supersedes--> D1's finding (freshest wins; D1 marked superseded, not deleted — Ц4).
 */
export const RUN_EDGES = [
  { from: agentRef('builder'), predicate: 'performs', to: [runRef('task:f3-day-graph')] },
  { from: agentRef('builder'), predicate: 'produced', to: [runRef('finding:day-graph')] },
  { from: agentRef('reviewer'), predicate: 'verified', to: [runRef('verdict:f3-pass')] },

  { from: agentRef('D1'), predicate: 'performs', to: [runRef('task:recheck-wave')] },
  { from: agentRef('D2'), predicate: 'performs', to: [runRef('task:recheck-wave')] },
  { from: agentRef('D3'), predicate: 'performs', to: [runRef('task:recheck-wave')] },
  { from: agentRef('D4'), predicate: 'performs', to: [runRef('task:recheck-wave')] },
  { from: agentRef('D1'), predicate: 'produced', to: [runRef('finding:d1')] },
  { from: agentRef('D2'), predicate: 'produced', to: [runRef('finding:d2')] },
  { from: agentRef('D3'), predicate: 'produced', to: [runRef('finding:d3')] },
  { from: agentRef('D4'), predicate: 'produced', to: [runRef('finding:d4')] },

  { from: agentRef('co-orchestrator'), predicate: 'gated', to: [runRef('verdict:recheck-patch')] },
  { from: agentRef('critic'), predicate: 'produced', to: [runRef('finding:false-consensus')] },
  { from: agentRef('critic'), predicate: 'refuted', to: [runRef('finding:d1'), runRef('finding:d4')] },
  { from: runRef('finding:false-consensus'), predicate: 'supersedes', to: [runRef('finding:d1')] },
];

/** Deterministic non-crypto label for `provenance.snapshotHash` (the kernel dedups on CONTENT, not this). */
function hashPayload(payload) {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16)}`;
}

/** The outgoing typed edges for one node id (empty for a node that wires nothing). */
function edgesForRef(ref) {
  const out = [];
  for (const spec of RUN_EDGES) {
    if (spec.from !== ref) continue;
    for (const t of spec.to) {
      out.push({
        predicate: spec.predicate,
        target: t,
        provenance: `agent-run:${RUN}`, // D3 edge-passport: which source asserted the edge (non-PII label).
      });
    }
  }
  return out;
}

/**
 * F-B — the reserved author slot, laid at the HONEST level `whoActed:'unverified'`: a self-claim recorded by
 * the owner's memory, NOT an authenticated authority; nothing reads/enforces it (ADR-0010 ②). Same reserve
 * as F3.
 */
const RESERVED_PRINCIPAL = { whoActed: 'unverified', issuer: 'agent-run-seed' };

/** Build the projectable `domain_event` for one agent-referent node (Ц6). Display name rides `label`. */
export function toAgentAct(name) {
  const payload = { type: 'agent', label: name, salience: null };
  return {
    id: `act:agent-run:${RUN}:agent:${name}`,
    actor: 'owner', // the owner's memory records the run; NOT a claim the agent authenticated itself.
    provenance: { source_ref: agentRef(name), snapshotHash: hashPayload(payload) },
    recordedAt: '', // engine-assigned, immutable.
    actKind: 'domain_event',
    edges: edgesForRef(agentRef(name)),
    principal: RESERVED_PRINCIPAL,
    payload,
  };
}

/** Build the projectable `domain_event` for one run-thread (task | finding | verdict): folds into runRef(slug). */
export function toRunGraphAct(n) {
  const payload = {
    type: n.type, // reserved projection key → the node's type (does NOT become a body field).
    label: n.label,
    status: n.status,
    summary: n.summary,
    salience: null, // F-B: reserved empty slot (folds to body.salience=null). No weight engine yet.
  };
  if (n.commit) payload.commit = n.commit; // verdict → resulting commit, as body DATA (not a node type).
  return {
    id: `act:agent-run:${RUN}:${n.slug}`,
    actor: 'owner',
    provenance: { source_ref: runRef(n.slug), snapshotHash: hashPayload(payload) },
    recordedAt: '',
    actKind: 'domain_event',
    edges: edgesForRef(runRef(n.slug)),
    principal: RESERVED_PRINCIPAL,
    payload,
  };
}

/**
 * Write the run AS A GRAPH through the Engine (fail-closed admission runs on each). Agents are written FIRST
 * so the edges point at nodes that already exist (Ц6 referential cleanliness). Returns the acks.
 *
 * IDEMPOTENT two ways (symmetric with day-graph-seed): (1) domain_events dedup by kernel CONTENT hash inside
 * `Engine.write` — a byte-identical re-write is a no-op, the log does not grow; (2) we also skip any act
 * whose deterministic id is already in `existingIds` (pass `store.acts().map(a=>a.id)`), so re-running on a
 * persistent store is a clean no-op even before the content check.
 */
export function writeAllRunGraph(engine, existingIds = new Set()) {
  const acks = [];
  const write = (act) => {
    if (existingIds.has(act.id)) return; // already seeded — idempotent skip
    const ack = engine.write(act);
    if (!ack.ok) throw new Error(`write refused for '${act.id}': ${ack.reason}`);
    acks.push(ack);
  };
  AGENTS.forEach((name) => write(toAgentAct(name)));
  RUN_NODES.forEach((n) => write(toRunGraphAct(n)));
  return acks;
}

/** Total nodes the run projects into: 8 agents + the run-threads. */
export const RUN_GRAPH_NODE_COUNT = AGENTS.length + RUN_NODES.length;
/** Total typed edges the run wires. */
export const RUN_GRAPH_EDGE_COUNT = RUN_EDGES.reduce((s, e) => s + e.to.length, 0);
