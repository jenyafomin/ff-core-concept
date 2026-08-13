/**
 * predicates — the D1 predicate registry (cardinality as DATA) + the edge-fold it powers.
 *
 * The synthesis (§2) caught the vintage `mergeEdges` bug: dedup by predicate+target does NOT know a
 * predicate's cardinality, so a LEGITIMATE target change copies a stale duplicate instead of replacing.
 * The fix is to declare cardinality FIRST, as data, then fold edges by it:
 *
 *   - `one`  → at most one edge per (subject, predicate). A new target REPLACES the prior edge for that
 *              predicate (a reassigned `one`-relation drops the old edge, keeps the new — no stale dup).
 *   - `many` → additive. Distinct targets accumulate; a repeated (predicate, target) refreshes its
 *              meta/provenance rather than duplicating.
 *
 * In BOTH cases, predicates the incoming act does NOT mention are left untouched — so an act from one
 * actor never wipes another actor's edges on the same node (the T-cardinality "foreign edges" lock).
 *
 * UNREGISTERED predicates default to `many` (non-destructive: an unknown predicate never silently drops
 * a prior edge).
 *
 * ── GAP 2 / G1 (predicates-as-data) ────────────────────────────────────────────────────────────────
 * The kernel ships ZERO domain predicates: `DEFAULT_PREDICATES` is EMPTY. Cardinality is a root ABSTRACTION
 * (the shape `PredicateRegistry = Record<string, Cardinality>` and the fold below), but the CONTENTS —
 * which noun means what — are TENANT vocabulary and live in the tenant's own package (e.g. a rentacar
 * tenant exports its `{ … : 'one' }` registry from `@ff/ingest-rentacar`). Tenants INJECT their registry at
 * the store/reducer seam (`new MemoryStore(nodes, registry)`, `foldInto(proj, act, registry)`). This keeps
 * G2 true: a second, unrelated tenant registers its predicates as DATA, never by editing this file.
 */
import type { Cardinality, Edge, PredicateRegistry, Problem } from './types.js';

/**
 * The kernel default registry: EMPTY. The engine knows no domain noun (G1). A caller that folds edges of
 * a given cardinality supplies its own registry; anything unregistered folds as `many` (non-destructive).
 */
export const DEFAULT_PREDICATES: PredicateRegistry = {};

/**
 * GAP 3 (b) + F2-closure (C3) — KERNEL-LOCKED predicates whose cardinality is pinned in the kernel,
 * un-overridable by ANY registry (default or caller-supplied). This is NOT tenant vocabulary (does not
 * break G1): each locked predicate is a ROOT concern the engine holds for any content, so it is named in
 * the kernel. Generalized from a `'many'`-only set to a DIRECTED map (predicate → pinned cardinality) so a
 * predicate can be locked to `'one'` (replace) as well as `'many'` (accumulate).
 *
 *   - `same-as` → `'many'`: the identity-merge predicate. `'many'` means "these candidate identities
 *     coexist". A registry declaring it `'one'` would make `foldEdges` REPLACE every prior merge —
 *     un-merging identity history on the next `rebuild-from-journal` (mine A-C2). The lock makes `'many'`
 *     an asserted CEILING, closing the (a·same-as) replay-collapse by construction.
 *   - `owner` → `'one'` (F2-closure C3): a subject has EXACTLY ONE owner. Re-assigning `owner` REPLACES
 *     the prior owner-edge (transfer of ownership), it does not accumulate. Without the lock a registry
 *     silently defaulting `'many'` would turn a hand-over into a silent two-owner state (critic C3).
 *   - `referent` → `'many'` (F2-closure C3): referents accumulate; locked AGAINST a registry narrowing it
 *     to `'one'`, which would silently drop earlier referents on replay (the same A-C2 hazard).
 *
 * The lock is a CEILING/FLOOR applied at the cardinality lookup (like I-8's clamp-after-fold), never a
 * stack layer: it wins over caller data rather than being one merged input among many. Kernel-lock is a
 * draft policy until owner-ratified as an ADR/invariants entry (F2-closure Non-goals).
 */
export const LOCKED_PREDICATES: Readonly<Record<string, Cardinality>> = {
  'same-as': 'many', // existing identity lock — semantics unchanged
  owner: 'one', // single owner — reassignment REPLACES, never accumulates (C3)
  referent: 'many', // referents accumulate; locked against narrow→'one' (C3)
};

/**
 * Cardinality of a predicate; unregistered ⇒ `many` (non-destructive default). A kernel-locked predicate
 * (`LOCKED_PREDICATES`) ALWAYS folds at its pinned cardinality, ignoring whatever the registry declares —
 * the lock is a kernel ceiling/floor, not policy-as-data. Consulted at the choke-point BEFORE the registry.
 */
export function cardinalityOf(predicate: string, registry: PredicateRegistry = DEFAULT_PREDICATES): Cardinality {
  const locked = LOCKED_PREDICATES[predicate];
  if (locked !== undefined) return locked; // lock wins over any registry (kernel ceiling/floor)
  return registry[predicate] ?? 'many';
}

/**
 * GAP 3 (a) — GENERAL append-only-forward guard. The registry may GROW (grow-by-demand, I-13) but must
 * evolve FORWARD-MONOTONE: a predicate's effective cardinality may WIDEN (`one → many`) or be added anew,
 * but must NEVER NARROW (`many → one`). A late `many → one` narrowing, applied on `rebuild-from-journal`,
 * silently REPLACE-folds history that was accumulated under `many` — dropping earlier edges with zero
 * error (mine A-C2, the general case of the (b) `same-as` instance already locked).
 *
 * Pure and store-agnostic: compares the registry a journal was folded under (`prev`) to the registry a
 * fresh fold is about to use (`next`), by EFFECTIVE cardinality (via `cardinalityOf`, so kernel-locked
 * identity predicates resolve `many` on both sides and never trip the guard). Returns one `Problem` per
 * narrowed predicate; an empty list means the evolution is forward-safe. The engine/store calls this
 * BEFORE re-folding under `next` and REFUSES (fail-closed) on any problem — integrity-as-engine-duty,
 * not author discipline. Guard-only: rewrites no data, drops no edges, perturbs no Act envelope.
 *
 * A deliberate, owner-sanctioned re-baseline (narrow WITH intent) is a separate migration op, not this
 * guard's concern — the kernel default here is REFUSE.
 */
export function assertForwardMonotone(prev: PredicateRegistry, next: PredicateRegistry): Problem[] {
  const problems: Problem[] = [];
  const predicates = new Set<string>([...Object.keys(prev), ...Object.keys(next)]);
  for (const predicate of predicates) {
    const before = cardinalityOf(predicate, prev);
    const after = cardinalityOf(predicate, next);
    if (before === 'many' && after === 'one') {
      problems.push({
        message: `forward-monotone: predicate '${predicate}' narrows many→one; a registry may widen or add, never narrow (append-only-forward, mine A-C2)`,
      });
    }
  }
  return problems;
}

/**
 * Fold `incoming` edges into `prev` by the registry's cardinality — the CORRECT `foldInto` edge merge
 * (D1). Pure: returns a fresh array, mutates nothing. Deterministic order (prev order preserved, new
 * targets appended) so an incrementally-built projection is bit-for-bit equal to a rebuild-from-journal.
 */
export function foldEdges(
  prev: readonly Edge[],
  incoming: readonly Edge[],
  registry: PredicateRegistry = DEFAULT_PREDICATES,
): Edge[] {
  const result: Edge[] = prev.map((e) => ({ ...e }));
  for (const edge of incoming) {
    if (cardinalityOf(edge.predicate, registry) === 'one') {
      // REPLACE: drop any existing edge for this predicate, then add the freshest target.
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i]!.predicate === edge.predicate) result.splice(i, 1);
      }
      result.push({ ...edge });
    } else {
      // ACCUMULATE (many): dedupe by (predicate, target); a repeat refreshes meta/provenance in place.
      const idx = result.findIndex((e) => e.predicate === edge.predicate && e.target === edge.target);
      if (idx >= 0) result[idx] = { ...edge };
      else result.push({ ...edge });
    }
  }
  return result;
}
