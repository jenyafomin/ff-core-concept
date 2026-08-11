---
node_type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
agent: analyst
question: ../03-s3fixclass.question.md
inputs:
  - ../../01-s3scope/analyses/01-s3scope.analysis.md
  - ../../02-f6confirm/synthesis/01-f6confirm.synthesis.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md
  - ../../../../01-S1-ratify-two-laws/work/two-laws.invariant-candidate.md
related:
  - ../../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../../packages/engine/src/core/types.ts
  - ../../../../../../../packages/engine/src/adapters/store-durable-fs.ts
---

# Q-S3fixclass — deep analysis: stable `edgeId` vs `supersedes` marker

## 0. Ground truth the two candidates must both survive

`predicates.ts:1-11` states `foldEdges`' entire reason to exist: tell a **correction** (same relation,
refreshed data → REPLACE) from a **new, coexisting fact** (→ ACCUMULATE). Today's `many`-branch dedup key
is `(edge.predicate, edge.target)` (`predicates.ts:113`, verified by reading the branch: `findIndex((e) =>
e.predicate === edge.predicate && e.target === edge.target)`). `Edge` (`types.ts:26-41`) carries no field
that is (a) stable across a correction and (b) distinguishes two coexisting stints on the same
`(predicate, target)` pair. `validFrom`/`validTo` are RESERVED, not folded at P1 (`types.ts:38-41`).

D3's counter-example (`D3-f6-time-on-edge-falsification.analysis.md:114-131`, independently re-derived by
the critic pass on `01-s3scope`, `02-s3scope-independent.critic.md:49-56`): agent drives car Jan1–Jan10;
later act corrects the end date to Jan15 (same stint, typo fix). Today's key finds the existing edge and
REPLACES correctly. If the key is widened to include `validFrom/validTo`, the corrected edge no longer
matches its own prior key (`Jan10 ≠ Jan15`) → `findIndex` returns `-1` → the fold ACCUMULATES a stale
duplicate. **Any fix must put identity on a field that is STABLE under correction — not the interval
itself.** Both candidates below are attempts to supply that stable field, by two different mechanisms
(shape vs. act-metadata).

**On "write-race" framing (task title).** `store-durable-fs.ts:22-24` (C5) already closes the literal
OS-level race — an advisory single-writer PID lock rejects a second concurrent writer. What the task title
actually points at is a **logical** race: `foldEdges` is order-sensitive by contract (C2, `store-durable-
fs.ts:170` rebuild-from-journal must re-derive the SAME read-model from the SAME journal regardless of when
each act was appended) but has NO way, today, to tell "this act corrects that earlier edge" from "this act
describes an unrelated coexisting edge" once two edges share `(predicate, target)` and diverge only in
`validFrom/validTo`. The two acts aren't racing physically; they're racing SEMANTICALLY for one dedup slot.
Both fix-classes below are, precisely, ways to give the fold a tie-breaker that doesn't require reading the
interval's value.

## 1. Fix-class 1 — stable `edgeId`

**Mechanism.** Add an optional field to the frozen `Edge` shape (`types.ts:26-41`): `edgeId?: string`.
Change the `many`-branch dedup key from `(predicate, target)` to `(predicate, edgeId)` when `edgeId` is
present (fallback to today's `(predicate, target)` behavior when absent — non-breaking for every edge that
doesn't carry temporal state). Correction = a new act asserting the **same** `edgeId` with a fixed
interval → `findIndex` matches on id equality → REPLACE. A new, disjoint stint = an act with a **fresh**
`edgeId` → no match → ACCUMULATE. The comparison is opaque-equality on a string, the same op-class the
fold already runs on `target` today (`predicates.ts:113`) — zero `<`/`>`/`Date` comparison enters the
reducer.

**What it fixes.** Directly defeats the D3 counter-example: the field that changes under correction
(`validTo`) is no longer the field the key is keyed on, so a correction keeps matching its own edge.
Simultaneously closes the SECONDARY finding in D3 (`D3` §5 "§4 registry" paragraph) and in
`F6-edge-identity-design.design.md` (Option B "salvageable core") — that the dedup key is hardcoded at all,
not registry-data — IF `edgeId`-vs-`target` selection is itself made a per-predicate registry declaration
(mirrors how `cardinalityOf` already reads the registry, `predicates.ts:57-59`).

**What it complicates / costs.**
1. **Retrofit-impossible timing.** Per U-L1 Instance 1 (`two-laws.invariant-candidate.md`, "форма
   retrofit-невозможна"), `Edge` is an append-only frozen shape — the same argument that put
   `validFrom`/`validTo` in the shape now, unconsumed, applies to `edgeId`: it must be laid in the shape
   BEFORE the first prod payload that needs it, or existing journal entries can never gain it
   retroactively. This is exactly the class of cost U-L1 Instance 2 already names and prices in.
2. **Who mints the id (two sub-cases, not free either way).**
   - **Natural key exists** (e.g. a rental contract-line id) — `edgeId` is provenance DATA, ingest maps
     source→id deterministically, mirroring `Provenance.source_ref` idempotency already in the envelope.
     Cheap, fully form-agnostic at the kernel.
   - **No natural key** — the tenant ingest package must DECIDE "same stint or new?" to synthesize an id.
     **The interval judgment does not disappear — it relocates to `@ff/ingest-*`, off the kernel.** This
     is a real cost, just not a kernel-value-awareness violation (kernel claim survives; "no code anywhere
     ever compares intervals" was never the actual bet — only "not in the value-blind fold").
3. **Registry surface grows** — `PredicateRegistry` needs an identity-key declaration alongside
   cardinality, and a lint/guard that the declared key is an OPAQUE field (rejects `validFrom`/`validTo`
   as a registered key) to prevent the trap re-appearing later (`F6-edge-identity-design.design.md` Option
   B fork, "B-interval does NOT survive").

**Compatibility with opaque edge-identity freeze (U-L1 Instance 2).** Direct match, not a new direction.
U-L1 Instance 2 literally names the form this fix lays: "opaque edge-identity — форма `Edge` заморожена
append-only, ключ идентичности = только opaque-поля (не интервальные значения)." `edgeId` IS that opaque
field. Adopting fix-class 1 is not a competing proposal against U-L1 — it is U-L1 Instance 2 made concrete.

## 2. Fix-class 2 — `supersedes` marker

**Mechanism (as scoped by the task and by prior art).** An act-level field — e.g. `supersedes: <edgeId>`
on the incoming act — declaring "this act corrects/replaces the edge previously identified by X." Distinct
from fix-class 1 in WHERE it lives: not a field on the persisted `Edge` shape, but a field on the write
`Act` envelope (act metadata, not graph state).

**Load-bearing question: does `supersedes` work WITHOUT `edgeId` already existing?** No — and this is the
sharpest finding of this analysis, not present verbatim in prior nodes. A `supersedes` pointer has to name
*something*. Candidates for what it names, absent a stable `edgeId`:
- Name the prior edge by `(predicate, target)` — but that pair is exactly what's ambiguous once two
  disjoint stints coexist on the same `(predicate, target)` (D3's own scenario: agent drives car:y twice,
  non-overlapping intervals). `supersedes: (predicate,target)` cannot disambiguate WHICH of several
  coexisting edges is being corrected — it degenerates back to the D3 failure mode, just relocated from the
  fold's key to the act's pointer.
- Name the prior edge by an act id / provenance chain — heuristic ("most recent act touching this
  relation from the same source"), not a stable identity comparison; breaks under out-of-order replay
  (`store-durable-fs.ts:170` C2 rebuild-from-journal must be order-independent in outcome — a heuristic
  "most recent" pointer is order-DEPENDENT by construction, which directly conflicts with C2's contract).

**Conclusion: `supersedes` is not a standalone fix-class for this defect.** It presupposes a stable
identity to point AT. This matches `F6-edge-identity-design.design.md:44,47-48` verbatim, which already
frames `supersedes` as "the audit form of 'same id, corrected' (optional — the id collision alone already
drives REPLACE)" — i.e. `supersedes` is a LAYER on top of fix-class 1, not an alternative to it. This
analysis independently re-derives the same conclusion by trying to construct a `supersedes`-only fix and
showing it collapses to either fix-class 1 (if it names an `edgeId`) or a re-run of the D3 failure (if it
names anything weaker).

**What `supersedes` adds, once `edgeId` exists.** Pure provenance/audit value: explicit correction history
("this act is a correction of edge E, not a coincidental same-id write") queryable without inferring intent
from "same `edgeId`, different `validTo`." Does not change fold semantics — dedup is still driven by
`edgeId` equality; `supersedes` is metadata riding alongside, same unscanned class as `provenance`
(`types.ts:29-31` — admission-gate scans `meta`, not `provenance`/`validFrom`/`validTo`; a `supersedes`
field would sit in that same non-PII, non-admission-scanned class).

**Cost, if adopted as an audit layer.** Cheaper than fix-class 1's shape addition — `supersedes` lives on
the `Act` envelope, and act-kind-specific fields are already routinely extensible (the `access_event`
precedent, `types.ts` `ACT_KINDS`, shows new act-level fields don't require the same retrofit-impossible
argument as `Edge`-shape fields, because acts aren't the frozen append-only identity substrate — `Edge` is).
So `supersedes` can likely be added LATER, cheaply, once `edgeId` already exists; it is not itself subject
to U-L1's "lay now" urgency.

## 3. Are they rivals or layers?

**Layers, not rivals — confirmed by construction, not just by citing prior art.** §2 shows `supersedes`
cannot function as an independent fix; it is parasitic on a stable identity field. Fix-class 1 supplies
that field. The only way to read them as competitors is to smuggle in an implicit third mechanism
("`supersedes` naming `(predicate,target)` + heuristic recency") — which this analysis shows fails the
same disjoint-interval test D3 used to kill the naive widen-key fix, AND breaks C2's replay-order-
independence contract. There is no honest reading under which `supersedes` alone closes the S3 defect.

## 4. Interaction with F6-grâne B(b) (reify-first default)

`01-f6confirm.synthesis.md:73-83` already establishes: if the default route for a stateful relationship
("its own lifecycle: corrections, coexisting siblings, own provenance") is **§5 reification to a UNIT**
(dissolving the special case into the already-proven payload-facet freshest-wins fold,
`projection.ts::foldInto`), then `edgeId`/`supersedes` become **fallback-only** machinery — needed solely
for the residual class of "bare correctable interval, no own lifecycle."

**This analysis's addition to that finding: the residual class may be nearly EMPTY in practice, and that
is itself a risk worth flagging to S3, not just a comfort.** Look at what "has its own lifecycle" means
operationally: D3's own falsifying example — a stint that gets CORRECTED (Jan10→Jan15) and can COEXIST
with a disjoint sibling stint — is *definitionally* "corrections + coexisting siblings." By F6-B(b)'s own
criterion, that example should reify. If most real time-on-edge cases that are hard enough to need a fix
at all are, by the nature of needing correction/coexistence semantics, also hard enough to qualify for
reification, then:
- Fix-class 1/2 exist to serve a genuinely rare case (relationship needs correctable time-on-edge but
  provably will never need its own sub-facets/provenance-history/identity beyond the interval) — S3 should
  not assume this class is well-populated without checking a real example.
- Conversely, over-eager reification is its OWN named risk under U-L2 (promotion-predicate exists
  precisely to prevent turning every grain into a unit — "фрактальный взрыв", `two-laws.invariant-
  candidate.md` U-L2 "violated when" clause). If S3's dry-run silently routes its only test case to
  reification, it proves §5 survives but tells us NOTHING about whether fix-class 1 (the harder, `foldEdges`
  -touching path) actually works — which is the thing D3 explicitly left unverified in code.

**Practical consequence for S3's design, not just diagnosis:** S3's second-form fixture must be constructed
so it does NOT qualify for reification under F6-B(b)'s own test (no own sub-facets, no independent
provenance history beyond "which act touched it last", genuinely a bare corrected interval) — otherwise the
S3 dry-run silently substitutes the easy path (reification) for the hard path (fix-class 1 inside
`foldEdges`) and the REPLACE/ACCUMULATE contract stays unverified in code, exactly repeating the
`access_event` mistake `01-s3scope.analysis.md §1` already found in Этап-2 (test that never reaches the
mechanism it claims to test).

## 5. Hypothesis — recommendation (NOT final, "S3 подтверждает")

- **Primary:** fix-class 1 (stable `edgeId`, opaque dedup key, registry-declared) is the correct
  mechanism-of-record for the fallback/residual class. It directly defeats the D3 counter-example, matches
  U-L1 Instance 2's already-frozen intent, and is the ONLY of the two candidates that functions
  standalone.
- **Secondary, optional, deferred:** `supersedes` marker as an audit-layer field ON TOP of `edgeId`, added
  later (not subject to the same retrofit-now urgency), pure provenance value — not required for S3's
  correctness gate, only for downstream traceability.
- **Scoping flag for S3, not resolved here:** whether the S3 fixture genuinely lands in the fallback class
  (bare interval) or silently qualifies for §5 reification is itself an open engineering judgment call the
  S3 wave must make explicitly, not default into.

## 6. What S3's dry-run/falsification must actually prove

Directly reusable, largely already specified by `F6-edge-identity-design.design.md` (Option A falsifiable
test) — restated here as the concrete S3 checklist:
1. **Fixture choice check (new, from §4 above):** confirm the chosen second-form fixture does NOT trip
   F6-B(b)'s reification criterion (no own sub-facets / provenance-history beyond the correcting act) —
   document why, explicitly, before writing the fold code.
2. **Code-level tautology test:** `grep` `foldEdges`/`foldInto` for any `<`/`>`/`Date`/`validFrom`-value
   comparison — must be **zero** after the fix (value-blindness preserved).
3. **Property test — REPLACE branch:** same `(predicate, target)` + **same** `edgeId` + two acts with
   disjoint/updated intervals → exactly **ONE** surviving edge (freshest interval), driven by id equality.
4. **Property test — ACCUMULATE branch:** same `(predicate, target)` + **different** `edgeId` + disjoint
   intervals → exactly **TWO** surviving edges.
5. **Regression against the ORIGINAL bug class** `foldEdges` was built to prevent (`predicates.ts:1-11`,
   "vintage `mergeEdges` bug"): a correction under fix-class 1 must not reintroduce a stale duplicate — run
   the exact D3 counter-example (Jan1–Jan10 → corrected Jan1–Jan15) as a named regression case, asserting
   ONE edge survives.
6. **Replay-order independence (C2):** rebuild-from-journal (`store-durable-fs.ts:170`) on the same act
   sequence, permuted, must yield a bit-for-bit identical read-model — the "write-race" framing closes here,
   on disk, not just in the in-memory fold.

## 7. Anchors (file:line, verbatim)

- `packages/engine/src/core/predicates.ts:1-11` — `foldEdges` correction-vs-new contract (why it exists).
- `packages/engine/src/core/predicates.ts:49-59` — `LOCKED_MANY_PREDICATES`/`cardinalityOf`, registry
  pattern fix-class 1's identity-key declaration would mirror.
- `packages/engine/src/core/predicates.ts:98-118` — `foldEdges`, `many`-branch dedup key at `:113`.
- `packages/engine/src/core/types.ts:26-41` — `Edge` frozen shape; `:29-31` admission-gate unscanned class
  (`meta` scanned, `provenance`/`validFrom`/`validTo` not); `:38-41` `validFrom`/`validTo` RESERVED.
- `packages/engine/src/adapters/store-durable-fs.ts:22-24` (C5 single-writer lock, closes literal race);
  `:170` (C2 rebuild-from-journal, replay-order-independence contract).
- `docs/_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md:114-131`
  (counter-example), `:151-156` (fix-class explicitly left unevaluated).
- `docs/_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md` — Option A
  (mechanism/cost/falsifiable-test), Option B ("salvageable core" vs "B-interval trap"), reification
  cross-check §5, Recommendation table.
- `docs/00-states/05-assemble-and-direct/plans/01-S1-ratify-two-laws/work/two-laws.invariant-candidate.md`
  — U-L1 Instance 2 (opaque edge-identity, provisional-until-S3), U-L2 "violated when" (fractal-explosion
  guard against over-reification).
- `docs/00-states/05-assemble-and-direct/plans/03-S3-prove-stake/questions/02-f6confirm/synthesis/01-f6confirm.synthesis.md:73-83`
  (Грань B(b) reify-first, fix-class = fallback-only, one-directional dependency).
- `docs/00-states/05-assemble-and-direct/plans/03-S3-prove-stake/questions/01-s3scope/analyses/01-s3scope.analysis.md`
  §1 (the `access_event` precedent of a test that never reaches the mechanism it claims to test — same
  risk flagged for S3's fixture choice in §4 above).
