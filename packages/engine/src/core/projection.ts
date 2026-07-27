/**
 * projection — the CQRS read-model reducer (ADR-0008: graph = deterministic projection of the log).
 *
 *   rebuild(state) = reduce( acts[].filter(kind == "domain_event"), initial )
 *
 * ONLY `domain_event` folds into canonical state (act-kinds.design.md §3): observation / access_event
 * / agent_trace / system_telemetry are side-journals that ride the same log but NEVER touch the graph's
 * current truth. A projectable act is a `domain_event` carrying `provenance.source_ref` — the stable
 * natural key of the graph node it projects into (one node per source_ref).
 *
 * The reducer is PURE and order-deterministic: folding the whole journal (`project`) and folding acts
 * one-by-one (`foldInto`) are the SAME function over the SAME sequence — so an incrementally-built
 * projection is bit-for-bit equal to one rebuilt from the log (ADR-0008 Validation §2, the central
 * CQRS gate). "Freshest wins": a superseding domain_event (same source_ref, new snapshotHash) replaces
 * the node's type/body; `state.version` counts the folded acts (version = depth of the act chain).
 */
import type { Act, EnvelopeNode, Provenance } from './types.js';

/** Structured provenance if the act carries it (vs a plain audit-label string). */
export function provenanceOf(act: Act): Provenance | null {
  const p = act.provenance;
  return p !== null && typeof p === 'object' ? (p as Provenance) : null;
}

/** The projection key (natural key) of an act, or null if it carries none. */
export function sourceRefOf(act: Act): string | null {
  const p = provenanceOf(act);
  return p && typeof p.source_ref === 'string' ? p.source_ref : null;
}

/** The folded-fields hash of an act (idempotency discriminant), or undefined. */
export function snapshotHashOf(act: Act): string | undefined {
  const p = provenanceOf(act);
  return p && typeof p.snapshotHash === 'string' ? p.snapshotHash : undefined;
}

/**
 * A projectable act folds into a graph node. ONLY `domain_event` replays (act-kinds §3); a
 * `domain_event` WITHOUT a source_ref is a valid log entry but not a keyed projection target.
 */
export function isProjectable(act: Act): boolean {
  return act.actKind === 'domain_event' && sourceRefOf(act) !== null;
}

/** Reserved payload keys that drive projection semantics rather than becoming node body fields. */
const RESERVED_PAYLOAD_KEYS = new Set(['type', 'archived']);

function payloadObject(act: Act): Record<string, unknown> {
  const p = act.payload;
  return p !== null && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
}

function prevVersion(prev: EnvelopeNode | undefined): number {
  const v = prev?.state?.version;
  return typeof v === 'number' ? v : 0;
}

/**
 * Fold ONE act into the projection map (in place). No-op for a non-projectable act (kind filter +
 * missing key) — that is exactly how a mixed log (observations, traces) leaves canonical state
 * untouched. Mutates `proj` so incremental write and batch rebuild share one code path.
 */
export function foldInto(proj: Map<string, EnvelopeNode>, act: Act): void {
  if (!isProjectable(act)) return;
  const ref = sourceRefOf(act) as string;
  const prev = proj.get(ref);
  const version = prevVersion(prev) + 1;

  const payload = payloadObject(act);
  const archived = payload.archived === true;

  // Body = the act's non-reserved payload fields (freshest wins). An archival act typically carries
  // no fields — then the last known snapshot is preserved and only the tombstone flips (node persists).
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) if (!RESERVED_PAYLOAD_KEYS.has(k)) fields[k] = v;
  const hasFields = Object.keys(fields).length > 0;

  const type = typeof payload.type === 'string' ? payload.type : prev?.type ?? 'record';

  const state: Record<string, unknown> = { version };
  if (archived) state.tombstone = 'archived'; // projection output, not a mutation of a stored node

  proj.set(ref, {
    id: ref,
    type,
    state,
    edges: act.edges ?? [],
    view: [],
    visibility: {},
    access: {},
    acts: [],
    policy_ref: [],
    body: hasFields ? fields : prev?.body ?? {},
  });
}

/**
 * Deterministically project a whole (append-only) log into the read-model. This is `rebuild --from
 * journal`: tear the projection down to empty and re-fold every act in log order. Non-domain_event and
 * keyless acts are skipped by `foldInto`, so the result is exactly the canonical graph.
 */
export function project(acts: readonly Act[]): Map<string, EnvelopeNode> {
  const proj = new Map<string, EnvelopeNode>();
  for (const act of acts) foldInto(proj, act);
  return proj;
}
