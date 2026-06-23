# Stress-test resolution — proofs, fixes, and the minimal design surface they force

- **Role:** system-architect (structural pattern thinking — boundaries, contracts, axes)
- **Date:** 2026-06-23
- **Topic:** Reconcile the analyst (GitHub-scale decomposition) and critic (doubt-pass) reports under N-076. For each real defect: PROVE the locked model (ADR-0002) holds and name the mechanism, OR propose the MINIMAL fix and say exactly where it lands. Keep the discipline: thin passport, thin core + engine + modules, control-plane-as-nodes, "add a kind only if forced." Count new surface honestly.
- **Reads reconciled:** `analyst-github-stress.md`, `critic-doubt.md`, ADR-0002 (locked), SYNTHESIS-2026-06-23, THREAD N-061…N-077.

---

## 0. How the two reports line up (so I resolve the UNION, not duplicates)

The analyst and critic are strikingly consistent. They split the work cleanly:

- **Critic owns the AXIS defects** (version, binding, multi-schema, sequence) and the **security pin** (valve enforcement point). These are *data-model* and *invariant* questions.
- **Analyst owns the ENGINE-SPEC defects** (index/rollup, derived-cache, cost model, maxDepth-as-wrong-bound, read-only-derived) and the **proofs at scale**. These are *engine contract* questions.
- They **agree** on: belonging⟂reference is the model's strongest result (analyst P2/P3 = critic's "what I did NOT find a problem with"); the passport needs no new mandatory field (analyst P1 = critic's net read); reactivity is the #1 missing class (analyst F4 = SYNTHESIS §3, out of N-076 scope but flagged); fan-in stresses level (analyst F5 = critic DS-1).

So the resolution has four buckets, and I sort every defect into exactly one:
**(i) PROVEN robust** — give the owner his proofs. **(ii) SMALL edge/engine fix** — bounded, lands on edge or engine-spec. **(iii) Real new MODULE/axis** — version, stream-class; the model must grow. **(iv) INVARIANT to pin in writing** — valve enforcement point, read-only-derived.

---

## 1. PROVEN ROBUST — the owner gets his proofs (no change)

These survived GitHub-scale stress *because of a named mechanism*, not by luck. ADR-0002 holds here, untouched.

| Proof | Mechanism that carries it | Both reports? |
|---|---|---|
| **Belonging ⟂ reference.** Cyclic call-graphs (A→B→A), circular imports (X⇄Y), 500-fan-in utils do NOT threaten storage or cascade. | **One-home invariant makes the cascade spine a forest** (§2(a).1: home-edges are acyclic by construction). `calls`/`imports` may cycle arbitrarily — they are ordinary edges, never `home`, so cascade never touches the cycle. The owner's worst case (recursion, complex patterns, N-076) is *exactly* where the split pays off. | analyst P2/P3 + critic "did NOT find a problem" — **strongest convergent proof.** |
| **Thin passport is type-agnostic across 12+ GitHub entity types** (commit/PR/issue/review/branch/release/ci-run/package/person/file/function/code) with **zero new mandatory fields.** | `type` + edges + control-plane carry the richness; `epistemic` carries PR/issue lifecycle, `source` carries human/agent/system/import, `href:true`/`external_ref` carry git/npm pointers. The 50-cell finding holds at code scale. | analyst P1 + critic net read. |
| **`level` lens = real "analyze the repo without opening files"** — for well-structured code. | `level=what` filter over the home-spine returns file purposes; zoom→L2 signatures; L3 bodies. Reads passport + structural edges, never payload. N-063's promise is real *where structure exists.* | analyst P4. |
| **Re-home self-heals on `git mv`.** Daily refactor reality. | §2(a) re-home invariant: deleting the home edge re-points home in the same txn (least `cascade_order`→id) or inbox; node never orphaned; scope re-cascades from the new home. | analyst P6. |
| **Diamond / circular-inheritance resolves deterministically and totally.** | §2(a) nearest-wins + least-sum `cascade_order` + id tiebreak + first-visit-wins. There is ALWAYS a final resolver (id). And "nearest container wins" is *semantically correct* for scope/sensitivity defaults on code (closest tsconfig wins). | analyst P5. |
| **Control-plane self-hosts code semantics + safe 3rd-party read-only tooling.** | Adding a language = adding TYPE/LENS nodes (data, not engine code). Linters/complexity-metrics/the L1-L3 zoom = `soft-perception` lenses (safe for 3rd-party); auto-merge/auto-deploy = `hard-ABAC/valve`, first-party-only gated (R4). | analyst P7/P8. |

**These six are not "passed by deferral" — each names the concrete mechanism in ADR-0002 §1–§3 that does the work.** The belonging⟂reference separation is the load-bearing proof: it is *why* recursion is a non-event.

---

## 2. SMALL FIXES — bounded, land on EDGE or ENGINE-SPEC (passport untouched)

These are real defects, but each resolves with one edge field or one engine-spec line. **None widens the passport. None adds a control-plane kind.**

### 2.1 Replicated values: citation vs binding, frozen vs live (critic #4 / N-072)
**Defect (real, high):** "canonical-node + projections" covers one-live-shared-value but NOT (a) citation-vs-binding coupling, (b) frozen-vs-live, (c) template-with-override.
**Fix — two edge fields, the model's existing idiom (belonging/importance already live on edges):**
- `rel: binds` (live dependency, propagates on update) vs `rel: references`/`mentions` (citation, does NOT propagate). One `rel` value distinction — *zero* new field, just a reserved relation name.
- `binding: live | frozen` edge flag. `frozen` snapshots the value at bind-time; `live` re-reads. Resolves coupling AND snapshot in one flag.
**Lands on:** EDGE (one new optional flag `binding`, plus reserved `rel` values). **New surface: +1 edge flag.**
**Park honestly:** template-with-override is NOT cascade (cascade merges context-defaults, not arbitrary payload fields — SYNTHESIS §6 already says so). It is a **type contract** (template-type defines the merge/override resolver), deferred to E2. SYNTHESIS §4 over-claimed "covered" — corrected here.

### 2.2 First-class sequence/ordinal (critic DS-3 / N-072)
**Defect (medium-high):** `priority` (importance-in-parent) is overloaded for order; commit chains / message threads / plan steps need clean ordinals; `sort: string` is fragile for long append-only chains.
**Fix — one edge field, distinct from `priority`:** `seq: int|lexorank` on the edge. Step-3 is not "more important" than step-2 — different axis. Lexorank avoids O(n) re-sort on insert.
**Lands on:** EDGE. **New surface: +1 edge field `seq`.** This is the right home — sequence is *relational* (sequence *within what chain*), exactly like `priority` is importance *within what parent*. Keeps the passport thin. **This `seq` is also the ordering primitive the version module (§3.1) needs** — design them together.

### 2.3 Topology-as-level conflates depth with centrality (critic DS-1 / analyst F5)
**Defect (high):** a core util is *deep* (low `level` by home-depth) yet *central* (high importance by fan-in). The §1 "level from topology" thesis was validated on hierarchical (refines/grounds/home) graphs, NOT on high-fan-in call-graphs.
**Resolution — this does NOT re-open §1; it QUALIFIES it. Two separate lens axes, never one:**
- **`level`** = position on the *belonging/refinement* spine (home/refines/grounds depth). Answers "how detailed / what zoom rung."
- **centrality/importance** = a *different* lens computed from *reference* fan-in (`called-by` count, betweenness). Answers "how load-bearing."
These are the **belonging⟂reference split applied to lens computation.** A deep-but-central util is not a contradiction — it is *correctly* deep on the level axis and *correctly* central on the importance axis. ADR-0002 §1 already says level is a *lens projection*, not a passport contract; the fix is to state that **a level-lens computes over the home/refines spine and MUST NOT be conflated with an importance-lens computing over reference fan-in.**
**Lands on:** ENGINE-SPEC / lens contract note (one sentence). **ADR-0002 §1 needs a one-line qualifier**, not a re-open. **New surface: 0 fields** — both are already lens output; the fix forbids merging two lenses.

### 2.4 Recursion guard: cascade-traversal vs data-traversal terminators (critic DS-2 / analyst F6)
**Defect (high):** "first-visit-wins" is correct for *cascade* (you want one inherited value) but WRONG for *data* traversal (rendering a call-graph — it silently drops back-edges, hiding the cycle a refactoring tool must *show*). PATTERN's `recursion_terminator` (§4) is unspecified.
**Fix — specify two terminator modes on the PATTERN contract (the род already has the slot):**
- `terminator: prune` (cascade/safety) — first-visit-wins, drop repeats. The cascade default.
- `terminator: mark-cycle` (data/render) — on revisit, **emit a back-edge marker and stop descending**, so the cycle is *reported*, not suppressed.
This makes "find import cycles" / "render the call-tree" first-class without a new род. The PATTERN contract `{ compose, recursion_terminator, maxDepth }` already names `recursion_terminator` — we are *specifying its enum*, not adding surface.
**Lands on:** ENGINE-SPEC (PATTERN `recursion_terminator` enum: `prune | mark-cycle`). **New surface: 0 new fields** — fills an unspecified one. Resolves analyst F6 ("cycles safe but lossy") fully: lossy was the unspecified terminator; `mark-cycle` makes cycles queryable.

### 2.5 maxDepth wrongly bounds legitimate deep cascade (analyst F7 + analyst Part-4)
**Defect (medium-high):** one knob (`maxDepth`, soft-3) does two jobs — (a) stop runaway/cyclic walks, (b) bound legitimate deep inheritance. A real repo→pkg→module→file→class→method path is 6–8 home-hops; cascade silently stops at depth 3.
**Fix — split the bound into two engine parameters:**
- `cycle_guard` / `visit_set` — terminates on *revisit* (correctness, unbounded depth OK on an acyclic home-spine).
- `cascade_depth` — a *separate, higher* bound for legitimate deep home-spine inheritance (or unbounded on the spine, since it is a forest and cannot run away).
The conflation was the bug; the home-spine is acyclic so deep cascade is *safe* and should not be truncated by the cycle protection.
**Lands on:** ENGINE-SPEC (split `maxDepth` → `cycle_guard` + `cascade_depth`). **New surface: +1 engine parameter.**

### 2.6 Index / rollup / derived-cache: NAMED but UNSPECIFIED (analyst F5 + Part 4)
**Defect (high — the analyst's central contribution):** ADR-0002 *names* `section-index` and rollup but specifies neither. At GitHub scale they are **mandatory**, not optional: 500-fan-in backlinks, 2000-file dirs, 120k-commit rollups, 40k derived function-nodes. The model's elegance currently rests on machinery that does not exist.
**Resolution — these are ENGINE-SPEC items, not model defects. The model is sound; the engine contract is under-written. Specify four:**
1. **Backlink rollup** — a hot node exposes `{count, paged-section}` for `called-by`, never 500 inline edges.
2. **Home-spine section-index** — wide containers (2000 files) load children lazily/paged, not all home-edges at once.
3. **Abstract-by-name rollup (N-043)** — "120k commits on main" / "500-message thread" = one rollup node, individuals materialized lazily.
4. **Derived-cache invalidation rule** — a derived function-node carries a `stale` link to its source file; when the file `updated` changes, the cache recomputes. **This is the missing rule** that keeps file=truth consistent with the L2/L3 derived layer.
**Lands on:** ENGINE-SPEC (`@ff/core`, §ДВИЖОК). **New surface: 0 model fields** — these are engine obligations the ADR already gestures at; they must be *written*. **This is the single biggest "named-but-absent" risk and it is correctly an engine-spec task, not a passport change.**

---

## 3. REAL NEW MODULES / AXES — the model must GROW here (honestly)

Two defects cannot be absorbed by an edge flag or engine line. They force designed modules. I say so plainly — the owner values honesty over false elegance.

### 3.1 Version / lineage axis (critic #2 CRITICAL / N-072) — FORCES a version-MODULE
**Why it forces growth:** the model has `supersedes` (replace — "the old one is dead"), `canonical_id` (dedup — "same identity, collapse"), and `epistemic` (trust/maturity). **None expresses "coexisting, ordered history, all real."** A commit chain is permanent history, not a chain of replacements; `supersedes` leaks "stale" semantics that are false. `canonical_id` would *collapse* the 500 versions into one node, destroying the history. ADR-0002 §5 *explicitly parked* versioning in a module — but for a life-platform where *everything is edited over time* (and for the GitHub spine of commits), the owner now needs it. **Deferring versioning defers the spine.**
**Minimal designed shape (NOT a passport field — it is relational, so it lives on edges, consistent with belonging/importance/seq):**
- A **`lineage`** anchor node groups version-nodes (the "logical thing across time").
- `rel: version-of → <lineage|prev>` + **`seq` (from §2.2)** carries order. The version edge reuses the `seq` ordinal — design §2.2 and §3.1 together.
- `home` of a version points at the lineage anchor (so the spine stays clean).
- **`supersedes` is RESERVED** for true replace-and-deprecate (PR v2 supersedes v1), NEVER for history points (commits do not supersede each other). This narrows an existing edge `rel`, removing the semantic leak.
- **"each variant is a type" (N-072) is REJECTED literally** — minting a type per version explodes the control-plane registry (500k policy-nodes differing only by timestamp). Types are *kinds*, not *instances-over-time*. The owner's phrase is honored at the *lens* level (a lens reconstructs "the deal across its versions"), not at the type level.
**Lands on:** new **VERSION/LINEAGE MODULE** + reuse of `seq` edge field + narrowed `supersedes` semantics. **New surface: +1 module, +1 reserved `rel` (`version-of`), reuses `seq`. No new passport field.** This is the one place the GitHub scenario *forces* the model to grow a real axis — and it confirms 2.1b's frozen-vs-live is the same problem wearing a hat (a frozen binding is a bind to a *specific version*). **Design version + frozen-binding + seq as ONE coherent module.**

### 3.2 Lightweight / stream node-class (critic DS-4 / analyst Part-4 "what must NOT be a node") — FORCES a stream-class
**Why it forces growth:** 9 mandatory passport fields × millions of CI-log-lines / commits / messages is a scaling tax that makes "everything is a node" non-viable at GitHub scale. Both reports converge: the analyst's **cost rule** ("a thing earns a stored node iff it has (a) stable id across edits, (b) independent belonging, (c) query value as a unit") is the decision procedure; the critic's **stream-node** is the structural answer.
**Minimal designed shape:**
- A **`stream` node** (full passport) owns a high-cardinality series. Its **entries are near-bare**: they inherit passport fields (`type`, `sensitivity`, `source`, `principal`, `level`) **from the stream via the home edge** — only `id` + payload + `seq` per entry. The passport lives on the *stream*; entries are projections of it.
- **Lines of code, call-sites, transitive deps are NOT nodes at all** (analyst Part-4): they fail the cost rule and stay inside payload / on-demand resolution. This is the explosion boundary.
- **Commits / messages are stream-entries** (near-bare, lazily materialized via the rollup of §2.6.3), not full-passport nodes.
**Lands on:** new **STREAM node-class** (a TYPE-род convention: "container types may declare their entries inherit passport from the stream") + the cost rule as a stated invariant. **New surface: +1 node-class convention (no new passport axis — it is *inheritance* of existing fields).** This is genuinely new but it is *subtraction* (fewer fields per entry), which is in the spirit of N-040, not against it.

---

## 4. INVARIANTS TO PIN IN WRITING — no new surface, but MUST be stated

These are not new mechanisms; they are *security/consistency properties* that an implementer will get WRONG if left unstated. The defect is the silence, and silence is cheap to fix and expensive to leave.

### 4.1 Valve enforcement point (critic #3 CRITICAL-security / N-071) — PIN Reading A
**The defect is ambiguity, and the dangerous reading is the intuitive one.** N-071 says approval granularity "lives in the agent-management module." Two readings:
- **Reading A (safe):** the *policy DATA* (which stages/cells need approval) lives as policy-nodes in the agent-management area; the **engine enforces.** The agent module *declares* "stage X requires approval"; the engine reads and gates. This is exactly ADR-0002 §3's "rule = data (policy-node), engine = enforcement," generalized to per-stage. The valve stays engine-enforced, default-closed, **author ≠ authorizer.**
- **Reading B (dangerous):** *enforcement* moves into the agent module — the agent checks "do I need approval?" and proceeds if it decides not. **This re-opens the laundering hole §3/Alt-5 closed:** author == authorizer; a buggy/adversarial skill marks its own outward step "no approval needed" and launders.
**Resolution — PIN this invariant verbatim (it is a MUST, lands in ADR-0003):**
> *The outward-action valve is ALWAYS engine-enforced, default-closed, author ≠ authorizer. The agent-management module may carry ONLY policy DATA (per-stage/per-cell granularity config) as policy-nodes the engine reads. The agent layer is NEVER the enforcer of its own approval.*
- A per-cell "needs approval" requirement lives **engine-visibly**: either a `promotion-policy`-shaped node (`applies_to: <cell|type|scope>, requires: approval`) the valve queries — *recommended*, consistent with §3 — or a passport/edge flag the engine checks. **NOT** agent-module-internal state.
**Lands on:** INVARIANT (ADR-0003). **New surface: 0** — it *constrains* where existing policy-nodes live. Granular per-stage approval is welcome — as *configuration of an engine-enforced gate*, not relocation of the gate. **This is the cheapest and most important fix in the whole stress-test: one written sentence prevents a security collapse.**

### 4.2 Read-only derived code-structure nodes (analyst Part-4) — PIN the consistency invariant
**Defect:** files = truth, but L2/L3 value (function-nodes, call-sites) is *derived* from file payload. A function-node is writable (it's a node) — an agent could edit it directly instead of the file → **two truths.**
**Resolution — PIN (lands in engine-spec / invariant):**
> *Derived code-structure nodes (`provenance: auto` / `derived: true` with `rule_ref`) are READ-ONLY projections. Writes go to the source file; the derived node recomputes via the §2.6.4 cache-invalidation rule. The valve/promotion machinery forbids direct writes to `derived` nodes.*
**Lands on:** INVARIANT + the `provenance`/`derived` edge fields that ALREADY exist (§РЕБРО). **New surface: 0** — uses existing fields, states the rule.

### 4.3 Container type-class contract: home ≠ facet for the same members (critic #7 / N-074)
**Defect:** the owner wants groups to "act as types/categories" (N-074), which **re-merges** what the model deliberately split — `home` (belonging) vs `facet-of` (classification). One node being both structural-home AND semantic-category for the same members couples structure to meaning: re-home a file out of `auth/` and it silently loses its "auth" classification.
**Resolution — a TYPE-род CONTRACT, not a new род or axis:** declare a reserved **`container` type-class** with two enforced contracts:
- (i) container types MAY restrict payload (enforces N-074's "groups only group" as a type-`validate()` rule — not free, but expressible).
- (ii) **the engine forbids a single node from being the target of both home-edges-as-belonging AND facet-edges-as-category for the same members.** Belonging is `home`; classification is `facet-of`; one node may not play both for the same set.
**Lands on:** TYPE-род contract + one engine invariant. **New surface: 0 new род, 0 new passport field** — a type-class convention the registry enforces. N-074's (3a-property) and (3c-edge-distinction) are NOT defects (distinct properties = distinct type; group↔group vs object↔object = pattern-by-endpoint-type, since `type` is in the passport) — confirmed as nitpicks by both the critic and me.

---

## 5. Multi-schema discriminant (critic #1 CRITICAL / N-075) — the crux: PROVE the invariant holds via lens, with a guarded fallback

This is the only CRITICAL that touches the model's *single foundational invariant* (engine picks the validator from the passport `schema`, without opening payload). It deserves the most careful resolution.

**The owner leans "one type with internal variants" (N-075 reading 1c).** The critic shows 1c *breaks the invariant*: if `deal-sale`/`deal-rent` are discriminated by `payload.kind`, the engine must open payload to pick the validator. That is the invariant's death.

**Resolution — PROVE the model holds via Fix-1a (variant IS the type + unifying lens). I select 1a over 1b, and here is the mechanism and why it is not a dodge:**

- **The variant IS the type.** `deal-sale`, `deal-rent`, `deal-barter` are types in the *open registry* (which already exists — types are open, N-039). Each has its own `schema`, so `schema: deal-sale@1` uniquely determines the validator. **The load-bearing invariant is untouched — the engine reads `type`, picks the validator, never opens payload.**
- **The owner's "one logical deal" is reconstructed at the LENS level, not storage.** A lens `all-deals` selects `type ∈ {deal-*}` via a `kind-of: deal` edge or a shared `category` node. The owner *sees* one logical type; the *engine* sees distinct safe types. This is the belonging⟂reference pattern again: storage stays type-safe, the unified view is a projection.
- **"one type, many schemas" and "schema in the passport" are reconcilable** — but ONLY by making the variant the type. They are *irreconcilable* in reading 1c (discriminant in payload). So the answer to the team-lead's question is precise: **yes reconcilable, via 1a; no via 1c.** The invariant survives because we move the discriminant *up into `type`*, where it is already a passport field.

**Why NOT Fix-1b (passport `variant?` field, `schema = type@version@variant`):** 1b adds a new passport axis — exactly the core-bloat N-040/ADR-0002 fought. It is only justified if 1a's "type explosion" is *proven* to hurt. It is not proven: the open registry handles `deal-*` types fine, and lens-level grouping gives the unified view at zero passport cost. **Reject 1b unless a concrete type-explosion pain appears.**

**The real defect to fix is the SILENT DEATH, not the representation.** The critic's sharpest point: unaddressed, the first multi-schema type silently pushes the discriminant into payload and the invariant quietly dies. **Fix — pin a registry invariant (ADR-0003 / type-registry contract):**
> *A type's `schema` MUST uniquely determine its validator from the passport alone. A type whose validator branches on a payload value is forbidden; the branch must be lifted into distinct types (`deal-sale`, `deal-rent`) under a shared `kind-of` parent, unified at the lens level.*

**Lands on:** INVARIANT (type-registry contract) + lens convention. **New surface: 0 new passport field** (reuses `type` + `kind-of` edge + a grouping lens). **The model HOLDS — proven — provided this one registry invariant is written before the first multi-schema type is stored.** `instance_of` (N-075's deferred route d) stays parked in E2; 1a needs neither.

---

## 6. Model status after stress — is the locked core (ADR-0002) still sound?

**Yes. No CRITICAL forces re-opening ADR-0002's core decisions.** Here is the honest accounting:

- **The passport is not widened by a single mandatory field.** Every fix lands on EDGE (`binding`, `seq`, reserved `rel`s), ENGINE-SPEC (index/rollup, cache-invalidation, split `maxDepth`, PATTERN terminator enum), a new MODULE (version/lineage, stream-class — both *outside* the passport), or a written INVARIANT (valve point, read-only-derived, multi-schema registry rule, container type-class). **Analyst P1 / critic net-read confirmed: the passport survives GitHub scale.**
- **The two CRITICALs that looked like they'd re-open the core do NOT:**
  - *Multi-schema (N-075):* PROVEN to hold via 1a + a registry invariant. The foundational "schema-from-passport" invariant is *preserved*, not breached.
  - *Valve (N-071):* the core security spine (engine-enforced, author≠authorizer) is *reaffirmed*; the fix forbids the dangerous reading. No re-open — a pin.
- **The model genuinely GROWS in exactly two places, and that growth was already parked by ADR-0002 §5** (versioning, instance_of → module): the **version/lineage module** and the **stream node-class.** These are the spine the GitHub scenario forced into view. They are additive modules, not core changes.
- **The one §1 qualifier:** ADR-0002 §1 (level-from-topology) needs a one-line note that **level (belonging-spine axis) and centrality/importance (reference-fan-in axis) are separate lenses, never merged.** This *strengthens* §1 by naming the boundary; it does not retract it.
- **The biggest standing risk is unchanged and confirmed by both reports:** the elegance is **conditional on the engine spec the model keeps deferring** (index/rollup/derived-cache + the reactor). The GitHub scenario makes the *engine-spec deferral* the central risk — not the passport. **Reactivity (analyst F4 / SYNTHESIS §3) remains the #1 missing CLASS, but it is correctly out of N-076's scope** (N-076 was stress, not widening; reactivity waits on topic-4/D1 and ADR-0003).

**Verdict: ADR-0002 stays APPROVED and sound. The stress-test consolidated it (per N-076's "consolidate through doubt"), surfacing fixes that are overwhelmingly edge/engine/invariant — and two honest module-growths that §5 had already anticipated.**

---

## 7. The minimal design work the stress surfaced — ordered (DESIGN only, no build)

Ordered by (a) blocks-others, (b) cheap-and-critical first, (c) forced-growth last. Each stays in DESIGN.

1. **Pin the valve enforcement-point invariant (§4.1).** One sentence, prevents a security collapse, blocks nothing but must exist before any agent-module approval design. *Lands: ADR-0003 stub. Cost: trivial. Priority: highest — it is a written guard.*
2. **Pin the multi-schema registry invariant (§5) + read-only-derived invariant (§4.2) + container type-class contract (§4.3).** Three written invariants, zero new surface, each prevents a silent failure. *Lands: type-registry contract + engine-spec. Cost: low.*
3. **Specify the engine index/rollup/derived-cache layer (§2.6) + split maxDepth (§2.5) + PATTERN terminator enum (§2.4) + level/centrality lens separation (§2.3).** This is the analyst's central finding — the named-but-absent machinery the elegance depends on. *Lands: ENGINE-SPEC (`@ff/core` contract). Cost: medium. This is the biggest single design task and the highest standing risk.*
4. **Design the EDGE additions together: `seq` ordinal (§2.2) + `binding: live|frozen` (§2.1).** Small, coherent, and prerequisites for the version module. *Lands: §РЕБРО spec. Cost: low.*
5. **Design the version/lineage MODULE (§3.1)** — `lineage` anchor + `version-of` edge reusing `seq` + narrowed `supersedes` + frozen-binding from step 4 as one coherent unit. Reject "variant = type" for versions. *Lands: new module spec. Cost: medium — the one real new axis. This is the spine the GitHub scenario forced.*
6. **Design the stream node-class (§3.2)** — stream owns the passport, entries near-bare + inherit via home; lines/call-sites/transitive-deps are NOT nodes (the cost rule as invariant). *Lands: TYPE-род convention + cost-rule invariant. Cost: medium.*
7. **(Out of N-076 scope — flag, do not start.) Reactivity / reactor / autonomous-principal / valve-without-synchronous-caller** (analyst F4 / SYNTHESIS §3 CRITICAL) waits on topic-4/D1 and belongs in ADR-0003. Named here so it is not lost; not part of this consolidation.

**Net:** 6 in-scope design tasks, of which 4 are invariants-or-engine-spec (no model growth) and 2 are the forced modules §5 already anticipated. The locked core carries the load; the work ahead is writing the engine contract the model has been deferring — exactly the risk both reports independently named.
