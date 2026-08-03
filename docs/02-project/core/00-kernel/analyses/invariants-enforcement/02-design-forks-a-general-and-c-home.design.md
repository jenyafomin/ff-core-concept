---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-03
node_type: design
title: "GAP 3 design forks — (a) GENERAL append-only-forward guard + (c) one-home barrier data shape"
tags:
  - kernel: write-plane
  - seam: S5-admission
  - seam: S8-append-only-forward
  - concern: integrity-as-engine-duty
  - decision: architecture
  - scope: root-not-tenant
related:
  - ./01-enforce-write-plane.analysis.md                    # the spec these two forks resolve (§(a), §(c), §Unknowns)
  - ../../../../../_log/2026-08-03-parallel-seal-and-rentacar/RESUME-BRIEF.md  # §4 step 1, §2 root-vs-tenant law
  - packages/engine/src/core/projection.ts                  # (a) seam: project()/foldInto() — pure over (acts, registry)
  - packages/engine/src/core/predicates.ts                  # (a) seam: cardinalityOf/foldEdges + LOCKED_MANY_PREDICATES (b already shipped)
  - packages/engine/src/core/admission.ts                   # (c) seam: admit() — the S5 gate, PII-only today
  - packages/engine/src/engine.ts                            # (c) wiring: Engine ctor injection + write() pre-journal guard
  - packages/engine/src/core/types.ts                        # frozen Act envelope + OPEN Provenance index signature (the additive lever for c)
---

# GAP 3 design forks — (a) GENERAL guard + (c) one-home data shape

> Paper decision (DESIGN ON PAPER). No code/git touched. Sub-invariant (b) `same-as` lock is ALREADY
> SHIPPED (`LOCKED_MANY_PREDICATES = {'same-as'}`, `cardinalityOf` ignores caller registry for it), which
> also closed (a)'s concrete `same-as` replay-collapse. This file resolves the TWO remaining forks the
> analysis flagged as "system-architect work, do not guess." Both decisions are additive, reversible, and
> perturb the frozen Act envelope by ZERO new top-level fields.

---

## Fork (a) — GENERAL append-only-forward guard (non-`same-as` narrowing)

### Decision
**Refuse-on-narrow, implemented as a monotonic registry guard against a journal-recorded registry
snapshot — NOT per-act registry versioning.** A new pure kernel function
`assertForwardMonotone(prevRegistry, nextRegistry): Problem[]` compares the registry a journal has been
folding under against the registry supplied to a fresh `rebuild`/fold. If any predicate's **effective**
cardinality (via `cardinalityOf`, so locked predicates are already resolved) goes `many → one`
(including unregistered-default-`many` → `one`), the fold is **REFUSED** (fail-closed, `Problem` naming
the predicate). Widening (`one → many`) and additive growth (a brand-new predicate registered as `many`)
are ALLOWED and update the recorded snapshot. The store owns persistence of the prior registry
(preferred: an append-only `registry-marker` record in the JSONL journal head — stays in the durable
substrate and is itself append-only-forward); `project()` stays pure and unchanged.

### Rationale (why refuse-on-narrow via snapshot, not versioning)
- The fold is `pure(acts, registry)` with **no per-act registry memory**, and the store journals acts but
  **not** the registry-at-write. Per-act versioning (Option (ii)) would require either a new field on the
  frozen Act envelope or a parallel durable registry-version store keyed per act — the exact "bigger,
  less-reversible move" the analysis warned against. It buys nothing the RED test needs: the test only
  demands that a silent collapse become a loud refusal, not that wide-era semantics be perfectly replayable.
- The snapshot guard is the **cheapest option that satisfies the RED assert**: O(registry) comparison at
  rebuild, guard-only (rewrites no data, drops no edges), ZERO Act-envelope perturbation. It preserves the
  ratified grow-by-demand path (registry growth = a data INSERT, I-13) by allowing widen/additive while
  blocking only the one genuinely-destructive direction.
- Interaction with the shipped (b) lock: the guard compares **effective** cardinality, so a registry that
  declares `same-as: 'one'` reads as `'many'` on both sides (the lock neutralizes it) — no double-jeopardy,
  no false refusal. The guard's job is every OTHER (future, tenant) identity-bearing predicate that isn't
  `same-as` by name — exactly the gap (b) does not cover.

### Options ranked (reversibility × Act-envelope perturbation)
| Option | Reversibility | Act-envelope perturbation | Verdict |
|--------|---------------|---------------------------|---------|
| **Monotonic registry guard (journal-head snapshot)** | HIGH — guard-only, remove to roll back, rewrites/drops nothing | **ZERO** — snapshot is store metadata, not per-act | **CHOSEN** |
| Full immutable-once-set registry | HIGH (guard-only) but BREAKS ratified grow-by-demand (forbids safe widening + additive) | ZERO | Rejected — too strict |
| Versioned-registry-per-act (record registry-at-write) | LOW — durable per-act pointer/snapshot + migration to introduce | HIGH if stored in act (new field) / MED via sidecar version-store | Rejected as primary; future-only upgrade if a genuine re-narrow-WITH-history-preservation is ever needed (owner-flagged below) |

### Exact RED→GREEN test it enables
**Test: "a late `many → one` narrowing of a TENANT predicate must not silently collapse historical edges
on rebuild."** (uses a non-`same-as` predicate to prove the GENERAL guard beyond the shipped (b) case.)
- **Arrange.** `registryV1 = {}` (predicate `linked-to` unregistered ⇒ effective `many`). Two
  `domain_event` acts, same `source_ref`, edges `linked-to→A` then `linked-to→B`. Persist `registryV1` as
  the journal's recorded registry. `project(acts, registryV1)` ⇒ **2** `linked-to` edges (baseline GREEN).
- **Act.** `registryV2 = { 'linked-to': 'one' }` (a `many→one` narrowing vs the recorded V1). Drive it
  through `engine.rebuild('journal')` / `assertForwardMonotone(registryV1, registryV2)`.
- **Assert (GREEN).** Refusal: a `Problem` matching `/linked-to.*many.*one|forward-monotone|narrow/i`; the
  projection is NOT recomputed under V2 (the prior 2-edge read-model is retained); `store.acts()` unchanged.
- **RED today.** `project(acts, registryV2)` returns **1** edge (`B`); `A` vanishes with zero error/log/test
  failure (`foldEdges` `one`-branch REPLACE, applied retroactively) — mine A-C2 for the general case.

### Reversibility / rollback
Guard-only and opt-in-by-construction: if no recorded snapshot exists (fresh journal), the first fold
simply seeds it — behaviour byte-identical to today. Removing `assertForwardMonotone` + the marker record
restores current behaviour exactly. No data is ever rewritten or dropped by this change.

### Residual OWNER decision (genuinely irreversible — flagged, not invented)
When the owner LEGITIMATELY wants to narrow a predicate (a real modeling correction, not an accident), the
guard refuses. Whether the kernel offers a deliberate **re-baseline / migration** operation — and whether
that op **preserves or collapses** the wide-era history it re-folds — is the one genuinely irreversible
semantic call (once you re-fold under the narrowed registry, wide-era edges are gone). Kernel default =
refuse. The escape hatch's existence and semantics are an owner ratification, not an architect guess.

---

## Fork (c) — one-home barrier: home-registry DATA SHAPE

### Decision
**Home at `factKind → homeDomain` granularity, enforced STATELESSLY per-act — NOT per-fact-instance.**
The engine does **not** need to know that two acts with different `source_ref`s are the same underlying
fact. It enforces the coarser, kernel-holdable invariant: a `factKind` has exactly ONE writer-home domain;
any `domain_event` of that `factKind` from a different domain is refused. This needs NO durable admission
state, NO cross-tenant fact-key agreement, and NO new top-level Act field.

**Injected shape (mirrors predicate injection — `new Engine(store, policy, schemas, homeRegistry?)`):**
```
interface HomeRegistry {
  homes: Record<FactKind, Domain>;   // e.g. { payment: 'rental-balance' } — policy-as-data (S6), grows by INSERT
}
```
**NEW conventions an act must carry (both ADDITIVE, both inside the already-OPEN `Provenance` object —
`{ source_ref, snapshotHash?, [k]: unknown }` — so the frozen envelope is UNCHANGED):**
- `provenance.fact_kind?: string` — the tenant's noun for the fact ('payment', 'car'). Tenant vocabulary.
- `provenance.domain?: string` — the writer-home the act claims to be. Tenant vocabulary.

**Barrier (new `admitHome(act, homeRegistry)` in `admission.ts`, called by `Engine.write` AFTER `admit()`,
only when `homeRegistry` is present):**
```
fk = provenance.fact_kind
if (fk && homeRegistry.homes[fk]) {
  home = homeRegistry.homes[fk]
  dom  = provenance.domain
  if (dom !== undefined && dom !== home)
    refuse(`one-home: fact_kind '${fk}' is homed to '${home}'; act domain '${dom}' may not write it (second writer-home)`)
}
```
The kernel stays domain-free (G1): it holds no factKinds/domains itself — they are INJECTED (`homeRegistry`)
and DECLARED (`provenance.fact_kind`/`domain`). Enforcement is root duty (integrity-as-engine-duty);
vocabulary is tenant. `admit()` keeps its single PII responsibility; the home check is a separate,
composable step.

### Rationale (why factKind-home, not per-fact-key identity)
- The analysis fixture is already the STATIC form (`{ factKind: 'payment', homeDomain: 'rental-balance' }`
  declared upfront). Homing at factKind granularity IS "one home per fact" at the type level and is the
  strongest invariant the kernel can enforce **without** identity resolution across differing source_refs.
- Per-fact-instance homing would require (i) a `fact_key` convention that BOTH ingest pipelines compute
  identically — fragile, tenant-coordination-dependent — and (ii) durable **admission state** (a seen-facts
  index) so a second act can be checked against the first. Both are heavier and neither is needed for the
  "sole writer-home" invariant: sheets is simply forbidden to write `payment` facts at all, so it can never
  become a competing home — precisely the write=one-home law. (Sheets may still be a READ lens / observation
  source; observations don't project and aren't homed.)
- Domain-of-act is taken from an EXPLICIT `provenance.domain`, not parsed from `actor` — the kernel must not
  guess a domain from a SubjectRef string shape (that would leak domain knowledge into the root, breaking
  G1). Explicit declaration keeps the guess out of the kernel.

### Exact RED→GREEN test it enables
**Test: "a second act, DIFFERENT source_ref, wrong domain, for a homed factKind is refused."**
- **Arrange.** `homeRegistry = { homes: { payment: 'rental-balance' } }`; Engine constructed with it.
  `act1`: `domain_event`, `provenance { source_ref:'rental-balance:pay-42', fact_kind:'payment',
  domain:'rental-balance' }` → `write()` ⇒ `ok` (it IS the home; baseline GREEN).
- **Act.** `act2`: `domain_event`, `provenance { source_ref:'sheets:payment-123' (DIFFERENT ref),
  fact_kind:'payment', domain:'sheets' }` → `write()`.
- **Assert (GREEN).** `ack.ok === false`, reason matching `/one-home|second.writer|home/i`, AND
  `store.acts()` length UNCHANGED (refuse-before-journal, mirroring the PII test at
  `invariants.test.ts:256-262`).
- **Control (proves it's a domain barrier, not the existing ref-dedup).** `act2'` with a DIFFERENT
  `source_ref` but `domain:'rental-balance'` still writes `ok` — a legitimately new payment from the home
  domain is not blocked; only the foreign-domain claim is.
- **RED today.** `admit()` reads nothing about domain/home; `Engine.write`'s only extra guard is
  `source_ref+hash` dedup, which `sheets:payment-123` (different ref) never matches — `act2` sails through
  to the journal (`ok: true`, store grows).

### Reversibility / rollback
`homeRegistry` is an OPTIONAL 4th constructor arg (default `undefined` ⇒ barrier OFF ⇒ behaviour
byte-identical to today). The `provenance.fact_kind`/`domain` fields are additive and simply ignored when
the barrier is off or the factKind is unregistered. Rollback = drop the arg + `admitHome`. Fully reversible,
zero frozen-envelope change (provenance is already an open index-signature object — the same additive lever
that carried `source_ref`/`snapshotHash`).

### Residual OWNER decisions (flagged, not invented)
1. **Granularity (the load-bearing call).** factKind-home (stateless, CHOSEN minimal) vs per-fact-instance
   home (needs a `fact_key` convention + durable admission state + tenant agreement on fact-key derivation).
   Recommendation: factKind-home for M1; per-instance only if a real requirement to home the *same* fact
   under different domains-over-time appears. This changes the data model meaningfully — owner ratifies.
2. **Strictness on missing fields.** When a homed factKind arrives with NO `domain` declared: fail-OPEN
   (minimal-additive default, chosen) or fail-CLOSED (refuse an un-attributed write of a homed factKind)?
   Tightenable later, so lower-stakes, but it's a policy call the owner should confirm before GREEN.

---

## Summary of both decisions

- **(a)** GENERAL guard = **refuse-on-narrow via a journal-recorded registry snapshot** (pure
  `assertForwardMonotone(prev, next)`, effective-cardinality, store-owned append-only marker). Chosen over
  per-act versioning: zero Act-envelope perturbation, guard-only reversibility, preserves grow-by-demand
  (allows widen/additive, blocks only `many→one`). Owner call: whether a deliberate re-baseline/migration op
  exists and if it preserves history.
- **(c)** one-home barrier = **`factKind → homeDomain` registry, injected as optional 4th ctor arg,
  enforced statelessly per-act** via a separate `admitHome` step. Two additive `provenance` convention fields
  (`fact_kind`, `domain`) — no new top-level Act field, frozen envelope untouched. Fact-key cross-source_ref
  identity is DELIBERATELY out of scope (unneeded at factKind granularity). Owner call: granularity
  (type-level vs per-instance) and missing-field strictness.
