---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Type: architecture
Subject: ENGINE layer (ДВИЖОК) — responsibilities, retrieval API, vector plug-in, ADR-0004 skeleton
Author: system-architect
Phase: DESIGN (no build)
Related:
  - docs/architecture/ADR/ADR-0002-thin-passport.md (§5 §ДВИЖОК §РЕБРО — basis)
  - docs/product/SYNTHESIS-2026-06-23-engine-spec.md (T3 — 6 decided, 3 CRITICAL, 9 EQ)
  - docs/product/SYNTHESIS-2026-06-24-competitors.md (FTS-first, sqlite-vec, RRF, bi-temporal)
  - docs/product/SYNTHESIS-2026-06-23-stress-test.md (engine = risk #1)
---

# ENGINE (ДВИЖОК) — architecture contour + ADR-0004 skeleton

> **Phase = DESIGN.** This is the contour (boundaries, contracts, data flow), NOT code.
> **One-line thesis:** the engine is the **derived, disposable, rebuildable index OVER the files**.
> Files (.md + frontmatter) stay the SOURCE OF TRUTH; the engine holds nothing that cannot be
> reconstructed from them. Russian terms kept alongside English for owner continuity.

---

## 0. Architectural frame — what the engine IS and IS NOT

**Pattern selected: CQRS over a file-of-record + Materialized-View index (Event-Sourcing-lite).**

Why this fits THIS context:
- **Files = the write model / log** (источник истины). Human- and git-friendly, portable, no vendor lock.
- **Engine = the read model** (производная проекция): all queries, traversals, rollups, FTS, vectors
  are served from a materialized index that is *derived* from the files and can be *thrown away and
  rebuilt*. This is exactly the property the competitor research called our advantage: "index fully
  disposable, reproducibly rebuilt from .md → removes the usual reindex/vendor-lock fear."
- The split resolves the #1 standing risk named across all councils: files are great for truth but
  slow/non-transactional to query. CQRS lets truth stay in files and speed live in the read model.

**The engine NEVER:**
- holds truth (every byte is derivable from files);
- is the place agents author content (they author files via the write path);
- self-approves valve-gated actions (invariant I-A);
- writes `derived` data that masquerades as file-truth (`provenance: manual` vs `auto`).

**Structural spine of the WHOLE engine (from T3 synthesis §0, retained as law):**
> **Split traversal of the SPINE (`home`, acyclic forest, cascade correctness) from traversal of
> LINKS (any graph, data correctness).** This is invariant И-2 "belonging ⟂ reference" applied to
> depth, terminator, and lens computation. Anyone who merges the two traversals into one knob ships a bug.

---

## 1. ENGINE RESPONSIBILITIES — what it computes/holds (all DERIVED, read-only, rebuildable)

Each item below is a **materialized view** keyed to node `id`. For each: what it is, its
invalidation trigger, and its cost-class. The universal invalidation primitive is:

> **file change → content-hash diff → mark dependent views dirty → PULL recompute on next query.**
> (Pull, not push. This is NOT reactivity/reactor — see §7. Reactivity is a separate, deferred class.)

| # | View (русск.) | Holds | Invalidation trigger | Rebuild cost | Status |
|---|---|---|---|---|---|
| V1 | **id→node index** (индекс паспортов) | passport fields only (no payload) per id; the fast "decide-without-opening-payload" table | any file create/delete/frontmatter change | O(1) per file; O(N) full | core — must |
| V2 | **edge + backlink index** (рёбра/бэклинки) | forward `{id→[edge]}` and reverse `{target→[(source,rel)]}` | edge add/remove/change in any file | O(E) full; O(deg) incremental | core — **must (blocks valve v1)** |
| V3 | **home-spine tree + cascade rollups** (спина+каскад) | the `home` forest; per-node merged cascade envelope (sensitivity/scope/level defaults) | home edge change OR cascade-flagged edge change on an ancestor | O(spine path) per node | core — must |
| V4 | **section-index** (индекс секций) | for wide containers: `{count, tail_seq, range, member_ids(paged)}` — lazy load of huge sections (chat = millions of msgs, N-043) | member add/remove on that container | O(width) of one container | must — triggers by WIDTH (~2000), not global |
| V5 | **FTS / BM25 index** (полнотекст) | tokenized frontmatter + payload, keyed to id | content-hash change of that file | O(text) per file | must — **retrieval primary** |
| V6 | **vector index** (вектор — OPTIONAL) | embeddings keyed to id; secondary semantic index | content-hash change AND not `sensitivity`-excluded AND embed-model unchanged | O(1) embed per file | **OPTIONAL, deferred** — see §4 |
| V7 | **heat / recency** (теплота/свежесть) | `stale` flag (from `updated`), heat-score (touch frequency over backlinks) | `updated` change; access events | O(1) | derived helper; heat = competitor borrow (MemoryOS) |
| V8 | **type/lens projections** (проекции типов/линз) | per-LENS cached views (level-zoom, centrality, persona view); per-TYPE `level?` default | TYPE node change; LENS node change; underlying edge/spine change | O(view) | derived; cache, not truth |
| V9 | **derived-edge cache** (авто-рёбра) | engine-inferred edges (`derived:true` + `rule_ref`) | rule input change | per-rule | derived; never file-truth |

**Two engine-computed metrics that must NEVER be conflated (T3 §1.3, law):**
- `level` (zoom/abstraction) = computed over the **SPINE** (`home`/`refines`/`grounds`, acyclic).
- `centrality` (load/importance) = computed over **LINK fan-in** (`called-by`/`depends-on`, cyclic).
- Plus the manual third carrier `priority` on the edge (N-041). **Three orthogonal notions of
  importance; none derivable from another.** A node can be "deep but central" — two correct answers.

---

## 2. RETRIEVAL API — what agents / viewer call

One canonical query verb (`query`) was already chosen as the single observation verb (STATE N-054).
The engine exposes it as a small set of **operators that compose**, with a hard rule:

> **TRUTH queries never touch vectors.** Lookup, filter, traversal, cascade, valve = exact paths.
> Vectors only serve *semantic recall*, fused at the end (RRF). (Competitor research §3.)

| Operator | Signature (contour) | Backed by | Truth or recall |
|---|---|---|---|
| `lookup(id)` | id → passport (+optional payload) | V1 | TRUTH |
| `filter(pred)` | over `epistemic / sensitivity / source / principal / type / level` | V1 | TRUTH |
| `neighbors(id, {spine\|links}, rel?, depth?)` | id → edges; **SPINE vs LINK obligatory split** | V2/V3 | TRUTH |
| `backlinks(id, rel?)` | id → who references id | V2 | TRUTH (**valve depends on this**) |
| `cascade(id)` | id → merged context envelope (sensitivity/scope/level) | V3 | TRUTH |
| `section(id, page)` | container id → paged member window | V4 | TRUTH |
| `fts(text, filter?)` | BM25 ranked ids | V5 | recall |
| `semantic(text, filter?)` | KNN ranked ids (if V6 enabled) | V6 | recall |
| `search(text, filter?)` | **hybrid** = `fts` ⊕ `semantic` via **Reciprocal Rank Fusion** | V5(+V6) | recall |
| `getContext(id, budget)` | canonical context-envelope (STATE): spine cascade + top backlinks + filtered neighbors within a token budget | V1+V2+V3 | TRUTH-shaped |

**Sequencing law (de-risks the model):** `search` degrades gracefully. With V6 disabled,
`search == fts`. Vectors are a *plug-in that improves recall*, never a dependency for correctness.
`filter` always runs as a SQL predicate over the index — `sensitivity`-exclusion is enforced here
*before* any recall result is returned (so a disabled/missing valve cannot leak via search).

**Engine verbs vs agent verbs:** the ~8 agent verbs (createNode·link·query·editNode·setLifecycle·
trace + requestPromotion·requestExternalAction, STATE N-054) map onto the engine as: writes go
through the **transactional write path** (§5/§6), reads go through the operators above. `query` is
the agent-facing name for `lookup/filter/neighbors/backlinks/cascade/section/search/getContext`.

---

## 3. CASCADE / ROLLUP ENGINE — how rollups stay correct as files change

This is the heart of the spine/link split. Two terminators, never shared (T3 §1.1, §1.2):

**Traversal-by-LINK terminator = `cycle_guard`** (internal invariant, NOT data-tunable):
- `visit_set`, "first visit wins" — a cyclic graph stops by *fact of repeat*, not hop count.

**Cascade-projection terminator = `cascade_depth`** (default **unbounded**):
- budget of projection along the home-spine (a forest — cannot run away). Deep code is 6-8 home
  hops; the old single `maxDepth=3` silently truncated the sensitivity/scope cascade — a
  **correctness** bug, not a speed one. This is a *display* knob, not a *safety* knob.

**PATTERN terminator = enum `prune | mark-cycle`** (fills existing ADR-0002 §4 slot, 0 new fields):
- `prune` (cascade default): repeat dropped silently — we need ONE inherited value.
- `mark-cycle` (data/render): repeat emitted as a back-edge marker — "show call graph / circular
  imports" MUST display the cycle; first-visit-wins would hide it.
- **Invariant I (registration, T3 §1.2):** enforce-class patterns (hard-ABAC, cascade, valve,
  promotion) are **forced to `prune`**. The engine *rejects registration* of a hard-ABAC pattern
  with `mark-cycle` (else non-deterministic cascade on an enforce path).

**`cycle_guard` on the SPINE = integrity ERROR, not silent stop (EQ-G, recommend ratifying):**
a repeat visit on the home-spine violates "home = forest" — raise an error (like 2+ home), don't
silently prune, or the data bug stays invisible.

**`level ≠ centrality` computation (law, §1):** level rolls up over the spine; centrality is
link-fan-in. `centrality` is computed **lazily/on-query** as cheap `called-by count` from the
backlink rollup (V2); true betweenness (global graph analytics) is explicitly out of scope until
proven needed (EQ-F).

**How rollups stay correct (invalidation graph):**
- Each rollup view declares its **inputs** (which files/edges feed it). On a content-hash change,
  the engine marks every dependent rollup dirty and recomputes on next read (pull).
- **Open: completeness of the dependency graph (EQ-E).** The current table misses: `sensitivity`
  change (invalidate valve-decision cache?), `promotion-policy` change (retroactive? do old `fact`s
  stay?), LENS change (cascade-flush of projection caches?). These must be enumerated before build.

**Cost rule "what deserves to be a node" (T3 §1.5):** a thing is a node ⟺ (a) stable id under
edits + (b) its own meaningful home + (c) value as a unit of query. Therefore: code lines /
call-sites / transitive deps = **NOT nodes**; functions = **lazy derivations**; messages/commits =
**stream records**. (Boundary case: function with a system-assigned ULID — EQ-I, see §8.)

---

## 4. VECTOR PLUG-IN POINT — where it attaches and how

**Recommendation (firm): vectors are a deferred, secondary, disposable index inside the engine,
keyed to `id`, gated behind proven keyword-miss pain. FTS first.**

| Decision | Recommendation | Why |
|---|---|---|
| **Where it attaches** | V6, a derived secondary index in the engine layer, alongside V5(FTS)/V7(rollup). Source = files; key = `id`; passport NOT replaced. | Vector = "secondary semantic index OVER the graph, embeddings keyed to id" (competitor §3). Never truth. |
| **FTS vs vector sequencing** | **FTS/BM25 first** (sqlite-fts / ripgrep over frontmatter+payload). Add vectors ONLY at a measured >~10-15% keyword-miss rate. | Cross-language ru↔en is the one *real* proven case for us; everything else FTS covers. Don't pay embed cost speculatively. |
| **Embed thin-passport vs payload** (OPEN FORK — my recommendation) | **Embed `title + description + (level-appropriate payload summary)`, NOT the raw full payload, NOT the bare passport.** | Bare passport (id/type/dates/enums) is semantically empty — embedding it is near-useless. Raw payload is rich but expensive and hits sensitivity. The agent-first `title/description` (de-facto always present) is the cheapest semantically-meaningful unit; optionally extend with a payload summary per TYPE. This keeps the embed unit small, stable (changes only when summary changes), and sensitivity-controllable. |
| **Sensitivity exclusion** | Do NOT embed `sensitivity`-restricted nodes to any cloud embedder. Either local embedder OR exclude-by-`sensitivity`-mark. Passport already carries the mark — enforce at the embed-write step. | "All visible to AI" ≠ "all shipped to cloud." Privacy gate lives at embed time, not query time. |
| **Staleness / rebuild** | Re-embed on content-hash change of the embedded unit; full re-embed on embed-model change (model id stored with the index). | Files = truth → index fully disposable; model swap = drop + rebuild, no migration drama. |
| **Hybrid fusion** | **Reciprocal Rank Fusion (RRF)** of FTS rank ⊕ vector rank, both filtered by passport predicates first. | Mainstream 2025 (Zep/Graphiti); sqlite-vec ships an RRF recipe. `search` operator (§2) implements it. |
| **Tooling (if/when enabled)** | **sqlite-vec + sqlite-fts5** in ONE local file (zero-server, local-first, hybrid in one DB). pgvector / LanceDB / dedicated = overkill now. | In the spirit of files-first; one-file index matches "disposable derived store." |

**Bi-temporal edge invalidation (competitor borrow, candidate for this ADR):** "validity window +
extinguish an edge instead of deleting it" (Zep/Graphiti) fits "all visible to AI, nothing erased."
This is an *edge/temporal* concern that the engine would enforce; flagged as an open decision (§8).

---

## 5. REBUILD & COLD-START

**Full rebuild (cold start):** walk all files → parse frontmatter → populate V1..V5 (V6 optional) →
compute spine forest (V3) → compute backlink rollups (V2). Cost ≈ O(N + E) — minutes at GitHub
scale.

**Incremental (watch):** file-watcher → content-hash diff → recompute only dirty views (the
invalidation graph of §3). This is the steady-state path.

**What is valid DURING rebuild (CRITICAL, OQ-3):** the backlink index (V2) is required by the
valve; while it is warming, the valve is either unavailable or unguaranteed. Since an agent can
start with the system and act outward immediately, **the system is unsafe during cold start.** The
design must choose: **block external (valve-gated) actions until warm-up completes** (recommended),
or accept a documented unsafe window. Read-only queries can serve partial/eventually-consistent
results during warm-up; *writes that need transactional invariants must wait for the relevant view.*
This is an owner-level safety decision, not an implementation detail.

---

## 6. WHERE THE ENGINE SITS — topology and storage

```
        author (human / agent)
                │  write verbs: createNode · link · editNode · setLifecycle · trace
                ▼
        ┌──────────────────────────────────────────────┐
        │  WRITE PATH (transactional enforcer)          │
        │  - validates against TYPE/schema              │
        │  - enforces invariants (one home, valve,      │
        │    promotion, derived read-only)              │
        │  - writes FILE (truth) + updates INDEX        │
        └───────────────┬──────────────────────────────┘
                        │ (atomic across file + index — see OQ-1)
            ┌───────────┴───────────┐
            ▼                       ▼
   .md + frontmatter         ENGINE INDEX (derived)
   = SOURCE OF TRUTH         V1..V9 (id→node, edges,
   (git, portable)          spine, FTS, [vector], rollups, cache)
            ▲                       │
            │ rebuild               │ read operators (§2)
            │ (disposable)          ▼
            └──────────────  agents / viewer / valve
                             read via query operators
```

**Storage shape — recommendation (resolves OQ-1):**
- **Hybrid: thin data in SQLite (transactional), body in .md (readable archive).**
  - SQLite holds passports + edges + the index (V1..V9). It gives us the missing **transactionality**
    and **atomic multi-file operations** (re-home = delete home-A + add home-B + update spine index,
    all in one transaction). It is also the natural home for sqlite-fts5 + sqlite-vec.
  - .md files remain the **human/git source of truth for body/payload**; the SQLite layer is
    rebuildable from them.
  - **This nuances ADR-0001/0002 "files = truth":** truth of *content* stays in files; *transactional
    consistency of structure* (passport+edges+index) is owned by SQLite. **This is an owner-level
    redefinition (OQ-1), not a technical call** — it must be ratified, because it shifts "where the
    authoritative structural record lives" even though files remain the durable, portable archive.
  - *Alternative if owner rejects the shift:* WAL-over-md (write-ahead log of intended multi-file
    ops, replay on crash). Keeps files as sole truth but reimplements a transaction manager — more
    code, same guarantees, slower. Recommended only if "files = sole truth" is non-negotiable.

- **In-process vs sidecar:** start **in-process** (single-file SQLite, embedded in `@ff/core`,
  local-first, zero-server) — matches current scale and "one file" spirit. Promote to a **sidecar
  service** only when multiple agents/processes need concurrent transactional access (multi-tenant
  / marketplace era). The CQRS boundary makes this migration non-breaking: the read/write contract
  stays the same; only the transport changes.

**Engine decomposition (EQ-A) — 4 subsystems with DIFFERENT change frequencies:**
1. **hot read/query path** (V1/V2/V5/V6 operators) — changes often, perf-sensitive.
2. **transactional enforcer** (write + invariants) — changes rarely, correctness-critical.
3. **index layer** (rollup/cache/FTS/vector materialization) — changes with new view types.
4. **cold type registry** (TYPE/schema/migration) — changes slowest.
Keeping these as separate modules with explicit contracts prevents the "engine = one bucket-word" trap.

---

## 7. INVARIANTS THE ENGINE ENFORCES (write explicitly — silence = bug)

- **I-A — valve self-approval forbidden:** the engine builds the affected-node list and gates the
  action; an agent never approves its own valve-gated action. (Granularity `principal` vs `agent-id`
  is open — EQ-H.)
- **I-B — derived is read-only:** anything `provenance:auto` / `derived:true` cannot be authored as
  truth; only the engine writes it, with `rule_ref`.
- **I-C — `schema` is the sole validator key:** validation dispatches on `schema` (`type@version`),
  never on a payload discriminator (the flexible-types fix: variant = TYPE + LENS, never a
  payload-discriminator — that breaks the invariant).
- **I-D — container home ≠ category:** a container's `home` membership is not type inheritance;
  "shares down" = cascade of a default lens/scope, not type inheritance.
- **I-E (EQ-G) — spine cycle = integrity error**, not silent prune.
- **Pull, not push:** cache invalidation is recompute-on-read. Reactivity ("every morning…") is a
  **separate, deferred class** (reactor + autonomous-principal + valve), NOT the cache mechanism.
  Do not conflate. (~½ of system value, but out of scope — waits on D1/topic-4 + ADR-0003.)

---

## 8. ADR-0004 SKELETON — "ENGINE (ДВИЖОК)"

```
# ADR-0004 — Engine (Движок): derived index, retrieval, cascade, transactional write path
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Supersedes: refines ADR-0002 §ДВИЖОК (turns the responsibility list into contracts);
            nuances ADR-0001/0002 "files = truth" per OQ-1 (pending owner ratification)
Related: ADR-0002 (passport), ADR-0003 (ABAC/valve transitive — future)

## Context
- Across all councils the model's elegance is CONDITIONAL on an unspecified engine layer
  (index/rollup/cache) — risk #1. Files-as-truth is great for git/portability but slow and
  non-transactional to query. This ADR specifies the engine as the derived, disposable,
  rebuildable read model over the files, and the transactional write path.

## Decision
1. Pattern = CQRS over file-of-record + materialized-view index; spine⟂link traversal split.
2. Engine holds V1..V9 (id-index, edge/backlink, spine+cascade rollup, section-index, FTS,
   optional vector, heat/recency, type/lens projections, derived-edge cache) — all derived,
   id-keyed, rebuildable. Invalidation = content-hash → dirty → pull-recompute.
3. Retrieval API = lookup/filter/neighbors(spine|link)/backlinks/cascade/section/fts/semantic/
   search(RRF)/getContext. Truth queries never touch vectors.
4. Cascade engine = cycle_guard (link, internal) + cascade_depth (spine, default unbounded) +
   pattern terminator prune|mark-cycle (enforce-classes forced prune); spine cycle = error.
5. Vectors = optional secondary index, FTS-first, embed title+description+per-type summary
   (not raw payload, not bare passport), sensitivity-excluded, RRF fusion, sqlite-vec+fts5.
6. Storage = thin data (passport+edges+index) in SQLite (transactional), body in .md (archive);
   in-process first, sidecar later. [PENDING OWNER — OQ-1]
7. Engine invariants I-A..I-E enforced; pull-not-push; reactivity out of scope.
8. Cold start unsafe → block external actions until warm-up. [PENDING OWNER — OQ-3]

## Alternatives considered
- A. No engine, query files directly (ripgrep). Rejected: O(N) backlink scan blocks valve; no
  transactionality; no rollup.
- B. WAL-over-md (files sole truth + replay log). Viable fallback if owner rejects SQLite-for-
  structure; more code, same guarantees, slower.
- C. Full external DB (Postgres+pgvector) as truth. Rejected: vendor lock, kills files-as-truth,
  overkill at current scale.
- D. Vector-first memory (mem0-style). Rejected: vector is never truth; FTS covers our cases;
  cross-lang is the only proven vector need.

## Consequences
+ Fast retrieval/cascade/valve without losing files-as-truth or git portability.
+ Index disposable & reproducibly rebuildable → no reindex/vendor-lock fear.
+ Thin passport held: Δ passport = 0; only honest growth = `seq` on edge (+1 optional edge field).
− Cold-start window is unsafe (mitigated by blocking external actions during warm-up).
− SQLite-for-structure nuances "files = truth" (must be ratified, OQ-1).
− Invalidation-graph completeness is a real maintenance burden (EQ-E).

## Validation plan
- Rebuild test: drop index, rebuild from files, assert identical query results.
- Backlink/valve test: "who references X" O(deg) not O(N); valve sees indirectly-referenced nodes.
- Cascade test: dogfood project→packages→core→src→node.ts (6-8 home hops) — sensitivity/scope
  cascade not truncated; spine cycle raises error.
- Crash test (OQ-1): kill mid re-home; assert no orphan/phantom edge after recovery.
- Hybrid search: ru-query ↔ en-term recall improves measurably before enabling vectors.
```

---

## 9. OPEN DECISIONS FOR THE OWNER (not delegable to agents)

**Carried from T3 (still owner-blocking):**
- **OQ-1 (CRITICAL) — transactionality.** Accept "thin structure (passport+edges+index) in SQLite,
  transactional; body in .md, archive"? This nuances "files = truth." *Recommendation: yes (hybrid);
  WAL-over-md only if files must be sole truth.*
- **OQ-2 (CRITICAL) — valve v1 scope.** Does the engine build the affected-node list ITSELF
  (defends against a malicious agent) or accept it from the agent (defends only against mistakes)?
  If v1 only defends against mistakes, **say so explicitly** to avoid false security before ADR-0003.
- **OQ-3 (CRITICAL) — cold start.** Block external actions until warm-up, or accept a documented
  unsafe window? *Recommendation: block.*
- **OQ-4 — adopt ADR-0004 "Engine"?** *Recommendation: yes — this skeleton is the artifact.*
- **OQ-5 — pattern default terminator + dual-role home+category (Q3/N-086).** Tied to the Q3 council.

**New decisions raised by this design:**
- **NOD-1 — embed unit (vector fork resolved here, confirm):** embed `title+description+per-type
  summary`, NOT raw payload, NOT bare passport. Confirm.
- **NOD-2 — bi-temporal edge invalidation** (Zep borrow): add "validity window + extinguish edge
  instead of delete" to this ADR, or defer? *Recommendation: include as engine-enforced temporal
  rule — fits "nothing erased."*
- **NOD-3 — in-process now, sidecar later:** confirm the staged topology (CQRS boundary makes it
  non-breaking).
- **NOD-4 — `weight(0..1)` on edge** (competitor borrow, "link strength"): adopt as optional edge
  field, or skip? (Affects centrality/RRF signals.)

**Delegable to agents (design-round, EQ-A..EQ-I from T3):** engine decomposition contracts (EQ-A),
engine verb sync/async/transaction map (EQ-B), per-mechanism rollup thresholds (EQ-C), lazy `level?`
recompute marker placement (EQ-D), invalidation-graph completeness (EQ-E), centrality eager-vs-lazy
(EQ-F), spine-cycle error (EQ-G — recommend ratify now), valve granularity principal-vs-agent-id
(EQ-H), node-vs-derivation boundary for ULID'd functions (EQ-I).
