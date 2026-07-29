/**
 * Shared types for @ff/engine.
 *
 * Ported from the narrative seeds
 *   docs/02-project/core/02-agents/examples/01-agent-manager/_generated-examples/{run-view,run-view-depth2,run-capability}.mjs
 * into real, importable TypeScript. See docs/00-states/00-global-build/realization-plan/phase-1-engine/M0-spec.md.
 *
 * The node model here is the SYSTEM ENVELOPE model of the seed corpus
 * (id·type·state·edges·view·visibility·access·acts·policy_ref·body) — this is a DIFFERENT
 * substrate from @ff/core's FFNode (id·kind·title·body·tags·links). The two models are
 * reconciled at M3 (see adapters/store-md.ts TODO); for M0 the engine operates on EnvelopeNode.
 */

export type SubjectRef = string; // "agent:ff-personal", "user:jenya", or a glob "agent:*"

export type Decision = 'allow' | 'deny';
export const ALLOW: Decision = 'allow';
export const DENY: Decision = 'deny';

/** Policy mode. FROZEN as an enum; the *combinator* it selects comes from data (policy:access-priority). */
export type PolicyMode = 'NAIVE' | 'FIXED';

/**
 * A typed, directed edge. One side stored; the inverse is COMPUTED (DEC-12, see edge-index.ts).
 *
 * D3 (edge-passport, cheap-now / plastic): the edge carries an OPTIONAL `provenance` slot (which
 * source/act asserted it) alongside `meta`. `validFrom`/`validTo` are RESERVED for P2 (time-on-edge —
 * "who held the car on the fine's date") and are NOT consumed by the projection at P1. The no-inline-PII
 * admission-gate scans `meta` (a payload) but NOT `provenance`/`validFrom`/`validTo` — those carry
 * source ids / timestamps, the same unscanned class as `predicate`/`target`.
 */
export interface Edge {
  predicate: string;
  target: string;
  meta?: Record<string, unknown>;
  /** D3: which source/act asserted this edge (a source label, e.g. `sync:rentacar-onecar`). Non-PII. */
  provenance?: string;
  /** RESERVED (P2 time-on-edge). Present in the shape now; NOT folded/consumed by projection at P1. */
  validFrom?: string;
  /** RESERVED (P2 time-on-edge). Present in the shape now; NOT folded/consumed by projection at P1. */
  validTo?: string;
}

/**
 * D1 · Edge cardinality per predicate — DATA, not a hardcoded branch. `one` = at most one edge per
 * (subject, predicate): a new target for the same subject+predicate REPLACES the prior edge. `many` =
 * additive: distinct targets accumulate. This is the registry the projection folds edges by (the
 * correct fix for the `foldInto` hard-replace bug — see core/predicates.ts, core/projection.ts).
 */
export type Cardinality = 'one' | 'many';

/** predicate → cardinality. Grows as new predicates are proven by real processes (grow-by-demand). */
export type PredicateRegistry = Record<string, Cardinality>;

export interface Visibility {
  level?: string;
  valve?: string;
  readable_by?: string[];
}

export interface Access {
  can_read?: string[];
  can_write?: string[];
}

/** The system envelope. Domain fields live ONLY in `body` (fixes B1). */
export interface EnvelopeNode {
  id: string;
  type: string;
  state?: Record<string, unknown>;
  edges?: Edge[];
  view?: unknown[];
  visibility?: Visibility;
  access?: Access;
  acts?: unknown[];
  policy_ref?: string[];
  body?: Record<string, any>;
}

/** The 10 system-envelope fields (used by the fail-closed validator). */
export const ENVELOPE_FIELDS = [
  'id',
  'type',
  'state',
  'edges',
  'view',
  'visibility',
  'access',
  'acts',
  'policy_ref',
  'body',
] as const;

/** In-memory graph: the flat node list plus an id index. Built by loader.load(). */
export interface Graph {
  nodes: EnvelopeNode[];
  byId: Map<string, EnvelopeNode>;
}

/** A validation problem. Empty list = valid. */
export interface Problem {
  message: string;
}

/**
 * S3 · resolve() PEP — FROZEN wire-contract.
 * `key` is the operation, optionally with a field: "read" | "write" | "write:access.can_read".
 * The combinator/order come from data (policy:access-priority); deny + Constitution are clamps
 * applied AFTER the fold, never stack layers (I-8, ADR-0004).
 */
export interface IPermissionPolicy {
  readonly mode: PolicyMode;
  resolve(key: string, viewer: SubjectRef, node: EnvelopeNode, graph: Graph): Decision;
}

// ── View grammar (compile) ────────────────────────────────────────────────────────────────
// FROZEN: the four-stage pipeline `from · traverse · filter · shape`.
// NOT frozen at M0 (deliberately): the aggregation set (sum/avg/count) — the R1-vs-R3 boundary
// is left open (M0-spec §6). Do not lock a fold enum here.

export interface FilterCond {
  type?: string;
  field?: string;
  contains?: unknown;
  /** `{ visible_to: "$viewer" }` — the clause that routes through resolve() (the PEP). */
  visible_to?: string;
}

export interface TraverseStep {
  pred: string;
  depth?: number | '*';
  direction?: 'inverse' | 'forward';
}

export interface ViewDef {
  id?: string;
  kind: 'cost-tree' | 'visible-to' | 'actions-by-agent';
  body: {
    from: string | { type: string };
    params?: Record<string, unknown>;
    filter?: FilterCond[];
    traverse?: TraverseStep[];
    cost_via?: { field: string; pred?: string; direction?: 'inverse' | 'forward' };
    /** cost-tree only: whether a node's total rolls up the whole subtree or only direct children. */
    scope?: 'subtree' | 'direct';
  };
}

/** Execution context handed to a compiled view. A viewer + policy are REQUIRED for any read lens. */
export interface GraphContext {
  viewer: SubjectRef;
  policy: IPermissionPolicy;
  params?: Record<string, unknown>;
  /** Static tree-walk depth bound (delegates-to). Separate mechanism from the loop-run guard. */
  maxDelegationDepth?: number;
}

// ── Capability-node schema (S4) — FROZEN fields; the namespace grows by data ─────────────────
export interface GrantBody {
  subject: SubjectRef;
  in_scope: string;
  allow?: string[];
  deny?: string[];
  minted_by: string;
  [k: string]: unknown;
}

// ── Act envelope (frozen shape) + admission ──────────────────────────────────────────────────
/** ActKind is an EXTENSIBLE enum (not frozen). New domain data goes in payload, never top-level. */
export const ACT_KINDS = [
  'domain_event',
  'observation',
  'command',
  'access_event',
  'agent_trace',
  'system_telemetry',
] as const;
export type ActKind = (typeof ACT_KINDS)[number];

/**
 * Structured provenance (CQRS projection key, ADR-0008 §3 / ingest-spec §3). ADDITIVE widening of
 * the frozen `provenance` field: a plain string stays valid (audit label), OR an object carrying the
 * idempotency key. `source_ref` = the stable natural key a `domain_event` projects into (one graph
 * node per source_ref); `snapshotHash` = the folded upstream fields — same ref+hash ⇒ dedup no-op,
 * changed hash ⇒ a superseding domain_event (the log grows, the projection takes the freshest).
 */
export interface Provenance {
  source_ref: string;
  snapshotHash?: string;
  [k: string]: unknown;
}

/**
 * FROZEN act-envelope shape (G1/CQRS + ADR-0007 a): PII travels ONLY via payloadRef+payloadHash;
 * `recordedAt` is engine-assigned and immutable. `payload` (inline) is the thing the admission-gate
 * refuses when it carries PII.
 *
 * `provenance` is widened ADDITIVELY to `string | Provenance` (form unchanged: same field, richer
 * accepted shape) so a `domain_event` can carry its projection key without a new top-level field.
 */
export interface Act {
  id: string;
  actor: SubjectRef;
  provenance: string | Provenance;
  /** Engine-assigned, immutable. Callers do not supply this on write(). */
  recordedAt: string;
  actKind: ActKind;
  edges: Edge[];
  payloadRef?: string;
  payloadHash?: string;
  /** Inline payload. If present with PII content, the admission-gate REFUSES the act (fail-closed). */
  payload?: unknown;
}

export type Admission = { ok: true } | { ok: false; reason: string };
