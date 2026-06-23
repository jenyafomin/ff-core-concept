# Critic — Doubt pass on the locked model + stress of new concepts (N-071…N-075)

- **Role:** critic (red-team / adversarial doubt)
- **Date:** 2026-06-23
- **Owner directive:** N-076 — "look for FLAWS and for PROOFS we locked it well; subject the model to DOUBT; find scenarios that DON'T fit; imagine it inside a real fine-grained project (GitHub) with recursion/complex patterns." This is the doubt pass, not a widening pass.
- **Substrate under test:** ADR-0002 (thin passport) + SYNTHESIS-2026-06-23-verbs-and-containers.
- **Method:** each new concept gets a verdict FITS / STRAINS / BREAKS + confidence + precise failure + minimal fix. Then a general doubt-sweep on a GitHub-scale graph. Then a ranked top-defects list. I separate real defects from nitpicks explicitly.

---

## Framing: the GitHub graph (the adversary's playground)

To stress the model the way the owner asked, hold one concrete graph in mind throughout:

```
repo ──home──▶ dir ──home──▶ file ──home──▶ function ──calls──▶ function (cross-file, cross-dir)
  │                                  ▲                                  ▲
  │                          (file referenced by many PRs)     (function referenced by many call-sites)
  ▼
PR ──involves──▶ commit ──touches──▶ file        issue ──fixed-by──▶ PR ──reviews──▶ review ──comments──▶ comment
PR ──supersedes──▶ PR(v1)            commit ──parent──▶ commit (chain)      CI-run ──for──▶ commit
```

Key adversarial properties of this graph that the model must survive:
- **Dense DAG, not a tree.** A function is reachable from its file (home), from 50 call-sites, from a PR diff, from an issue. One home, many ordinary edges — fine in theory; the question is whether cascade/typing/level survive the fan-in.
- **Massive fan-in to leaves.** A popular util function has 500 inbound `calls` edges. A core file is touched by 10k commits.
- **Recursion is intrinsic.** `calls` graph has cycles (mutual recursion). `commit→parent→commit` is a long chain. Decomposition L1/L2/L3 recurses.
- **Multi-schema is native.** A "PR" is open/merged/closed/draft — arguably different shapes. An "issue" is bug/feature/epic. A "file" is code/binary/config/doc.
- **Versions are native.** Every commit IS a version of the repo state; every file has a history; a PR is a proposed version of files.

This is exactly where N-072/N-074/N-075 land. Good — the owner picked the right adversary.

---

## 1. Flexible types / multi-schema per type (N-075) — **STRAINS** (confidence: high)

**The owner's question:** one type `deal` with sub-variants (each a different schema), conditional on something — separate CATEGORIES vs one type with variants (he leans one-type).

**Where it does NOT fit the locked model — the precise failure:**

The passport carries `schema: type@version`. The load-bearing invariant (RESEARCH §0, ADR §Контекст) is: *the engine decides how to handle a cell — including which validator to run — WITHOUT opening payload and WITHOUT knowing the type's internals.* `schema` is the field that names the validator.

"One type, many conditional schemas" attacks this directly. If `deal` has sub-schemas `deal-sale`, `deal-rent`, `deal-barter`, and which one applies is **conditional on a value inside the payload** (e.g. `deal.kind`), then:

- To pick the validator, the engine must read `deal.kind` — **which is inside payload**. That is exactly the invariant violation. `schema: deal@3` no longer uniquely determines the validator; the discriminator does, and the discriminator is content.
- This is not hypothetical hand-wringing: it's the definition of a discriminated union. A discriminated union is only safe if the **discriminant is in the passport**, not the payload. The model has no passport slot for "variant/discriminant."

**So the four framings the team-lead named resolve cleanly — and only one is safe:**

| Framing | What it is | Verdict |
|---|---|---|
| **(a) Variant = subtype** (`deal-sale` is its own `type` in the open registry) | discriminant lives in `type` (passport) | **SAFE.** `schema` already determines validator. No new mechanism. This is "separate categories." |
| **(b) Variant = `type@version`** (`deal@sale`, `deal@rent`) | abuse version axis as discriminant | **UNSAFE/wrong.** Version is a maturity/migration axis (ADR §5, §Supersedes #5). Overloading it as a variant discriminant collides head-on with N-072 (real versions) — you can't have `deal@sale` AND `deal@v2`. Two meanings on one axis. Reject. |
| **(c) Discriminated union in the schema** (`deal@3` validator branches on `payload.kind`) | discriminant in payload | **BREAKS the invariant.** Engine must open payload to choose the branch. This is the owner's "one type with variants" read — and it is the dangerous one. |
| **(d) `instance_of` relation** (deal → deal-template-sale) | discriminant via edge | **SAFE but deferred.** ADR §5 explicitly pushed `instance_of` to a module ("Этап 2"). So "one type with variants via instance_of" is *not in the locked model* — it's a promissory note. |

**Is "one type, many schemas" a contradiction of "schema is part of the passport"?** Yes, in framing (c) — and (c) is precisely the one the owner leans toward ("одним типом с вариантами — иногда полезнее", N-075). **This is the crux.** The owner's instinct (one type, internal variants) is ergonomically right and architecturally in tension with the locked invariant.

**Minimal fix (and it's a real model change, not a dodge):** Promote the discriminant to the passport. Either:
- **Fix-1a (cleanest):** the variant **IS** the type. `deal-sale`, `deal-rent` are types in the open registry, with a shared parent declared by a `kind-of: deal` edge or a `category` node. The engine reads `type` (passport), picks the validator, done. The owner's "one logical type" is reconstructed at the **lens** level (a lens `all-deals` selects `type ∈ {deal-*}`) — not at the storage level. This keeps the invariant AND gives the owner the unified view. **I recommend this.**
- **Fix-1b (if the owner insists on one literal type):** add an optional passport field `variant?: string` that is the discriminant, and `schema` becomes `type@version@variant`. Then the engine can pick the sub-validator without opening payload. Cost: a new passport axis — exactly the kind of core-bloat ADR-0002 fought against (N-040). Only acceptable if Fix-1a's "type explosion" is proven to actually hurt.

**Why I rank this STRAINS not BREAKS:** the model *can* express it (via Fix-1a, at zero new mechanism), but the owner's preferred reading (1c) genuinely breaks the invariant, and the registry must answer "is a variant a type?" before any `deal` is stored. Unanswered, the first multi-schema type silently pushes the discriminator into payload and the load-bearing invariant quietly dies. **That silent death is the defect.**

---

## 2. Versions / variants (N-072) — **STRAINS, leaning BREAKS** (confidence: high)

**The owner's claim:** "data attaches as a particular VERSION to something"; "a whole cell attaches to something as a version"; "each variant is a type."

**Where it does NOT fit:** the model has `supersedes` edges + `epistemic` (a *trust/maturity* axis) + `canonical_id` (a *dedup* pointer). It has **NO first-class version axis**, and ADR-0002 §5 *explicitly pushed versioning/branching out* ("`branches`/`reactivity`→движок/модуль"; `instance_of`→module). So versioning is, by the locked model's own admission, **not designed** — it's deferred.

The GitHub scenario makes this acute because **versioning is not a side feature there — it is the primary data model.** A repo is a chain of commits; each commit is a version; a file's history is a version sequence; a PR is a proposed version-set. If the substrate can't express versions natively, it can't model the single most common "whole life" artifact: anything edited over time (documents, plans, configs, deals-in-negotiation).

**The precise failures, separated:**

1. **"A cell that IS a version of another" vs "a cell that HAS versions" are two different shapes, and the model conflates both into `supersedes`.**
   - `supersedes` (a `rel` on an edge) says "B replaces A; A is now stale." That's a *linear, replace* semantics. It cannot express **branches** (two live versions: a draft fork + mainline), **variants that coexist** (a contract in EN and RU — both current), or **a version that is a snapshot, not a replacement** (commit `abc` doesn't supersede commit `def` — both are permanent points on a chain). The owner explicitly wants coexisting variants ("each variant is a type", N-072). `supersedes` is the wrong primitive for coexistence.
   - **Failure:** model `file@v1..v500` as 500 nodes chained by `supersedes` → the engine thinks v1..v499 are all "stale/replaced," but in a repo they are **permanent history**, not stale. `supersedes` carries a "the old one is dead" connotation that is false for version *history*. The semantics leak.

2. **Conflict with `canonical_id`.** `canonical_id` is "this node and that node are the same identity (dedup)." Versions are "these N nodes are the same *lineage* but distinct points in time." The model has *identity-collapse* (`canonical_id`) and *replacement* (`supersedes`) but **no lineage axis** ("these are the same thing across time, all real"). If you try to use `canonical_id` to say "all 500 file-versions share one canonical file," you've now declared them the *same node* — and queries dedup them, destroying the history you wanted to keep. Direct collision.

3. **"Each variant is a type" explodes the registry.** If every version/variant is minted as a type (one reading of N-072 + N-075), then a repo with 10k commits × 50 files generates an unbounded type registry. Types are control-plane (validators, level-defaults, policies). You do **not** want 500k control-plane nodes whose only difference is a timestamp. The open type registry is for *kinds*, not *instances-over-time*. **Reading "each variant is a type" literally breaks the type/instance boundary.** (This is the same defect as N-075 framing (b): version ≠ type.)

**Minimal fix (a real new axis — this is where the model must grow):**
- Introduce a **version/lineage construct as a module** (ADR-0002 already parked it there — good, but the owner now needs it, so it must be *designed*, not just parked). Minimal shape: a `lineage` (or `canonical_id` *repurposed correctly*) groups version-nodes; a `version` edge/field carries ordering (`seq` or `vN`); `home` points to the lineage anchor; `supersedes` is reserved ONLY for "this truly replaces and deprecates that" (PR v2 supersedes PR v1), NOT for history points (commits do not supersede each other).
- Decide explicitly: **version is an EDGE-relation (`version-of` + `seq`)**, not a passport field — because it is relational (version *of what*, like `priority` is importance *in what parent*). This keeps the passport thin and fits the "belonging/importance on edges" pattern. I'd push hard against a passport `version` field.
- "A whole cell attaches to something as a version" = an edge `version-of: <target> seq: N`. That fits the edge model. Good news: the *attachment* part fits cleanly. The *coexistence + non-staleness* part is what `supersedes` can't carry.

**Why STRAINS-leaning-BREAKS:** the *attachment* fits as an edge; but the model today has no way to say "these are versions of one thing, all real, ordered" without either misusing `supersedes` (wrong semantics) or `canonical_id` (collapses identity) or minting types (explodes registry). For a life-platform where *everything is edited over time*, "we deferred versioning to a module" is not a small omission — it's deferring the spine. **Confidence high that this forces a designed version-module before the model can claim to cover the GitHub-class scenario.**

---

## 3. Group-cell with distinct properties (N-074) — **STRAINS** (confidence: medium-high)

**The owner's pushback on "container = just a node":** a group-cell may have its OWN principled properties; "a group should only GROUP — real info lives deeper"; "groups can act as types/categories"; "object↔object links are one thing, group↔group links another."

The last council answered "container = just a node + home edges, almost everything already expressible." I think that answer is **partly glib** — three of the owner's four sub-claims are real and the model's "already covered" is a dodge on two of them.

**Claim-by-claim adversarial test:**

**(3a) "A group has its own principled properties distinguishing it from a normal cell."**
- The model's answer: a container is just a node with a `type` (e.g. `type: project`), and the type carries whatever properties. So "distinct properties" = "distinct type." **This actually holds.** A `project` type and a `task` type already differ. NOT a defect. *Looks solid.*
- BUT the owner's deeper point — "a group should ONLY group, the real info lives deeper" — is a **constraint/invariant**, not a property. The model has no way to *enforce* "this node is structural-only, must not carry payload." There's no "container-class" marker that the engine could use to enforce "groups are thin." **Minor gap:** if the owner wants the *invariant* "groups don't hold real data," that's a per-type validation rule (the TYPE-род `validate(node)` can enforce "payload must be empty/minimal"). So it's expressible as a type contract — but someone has to write that contract; it's not free. **STRAINS lightly.**

**(3b) "Groups can act as types/categories."** — **This is the real collision.**
- TYPE is control-plane (it carries the validator + level-default + policies). A "group acting as a category" means: membership in the group *implies a kind*. E.g. "everything in the `urgent` group is urgent" — the group confers a property on members. That is **exactly what a TYPE/facet does**, and the model already routed facet-tags to **edges-to-category-nodes** (`facet-of`/`tagged-as`, ADR §Теги-фасеты).
- So "group acts as category" = a category node + `facet-of` edges. **Expressible.** BUT: the owner is now overloading ONE node to be simultaneously (i) a home-container (structural belonging, `home` edges) AND (ii) a category/facet (cross-cutting classification, `facet-of` edges). The model deliberately *separated* these (home = belonging; facet = direction; ADR §Теги-фасеты, N-039/N-042b). The owner's "groups can act as types/categories" **re-merges what the model split.** A single node being both a structural home and a semantic category is a category error the model was designed to avoid.
- **Failure scenario (GitHub):** is the `auth/` directory a *container* (files live there, home) or a *category* (files are "about auth")? The owner wants it to be both. But a file's home is `auth/` while it's *also* "about security" and "about login-flow" — those are facets, not homes. If the directory-as-container also acts as the "auth" category, then moving a file out of `auth/` (re-home) silently strips its "auth" classification — coupling structure to semantics. That's a real bug surface. **STRAINS — the model can express both roles but must NOT let one node play both, and the owner explicitly wants one node to play both.**

**(3c) "object↔object links are one thing, group↔group links another" — a new edge distinction the model lacks?**
- The model's edge has `rel` (typed relation) + `home`/`priority`/`cascade`. There is **no first-class distinction between "containment edge" and "peer edge."** The owner is asserting that group↔group (e.g. project depends-on project, or folder contains folder) is a *different род of edge* than object↔object (function calls function).
- Is this real? Partially. `home` already marks containment-belonging. So group→member is `home`; member→member is ordinary. The owner's "group↔group" (project→sub-project) is *also* `home` (containment). So the model **does** distinguish containment (home) from peer (non-home) edges. The distinction the owner names mostly maps onto home/non-home. *Mostly covered.*
- BUT there's a residue: **group↔group PEER edges** (project A *relates-to* project B, not contains) vs object↔object peer edges (function calls function) — both are non-home ordinary edges with a `rel`. The model treats them identically. Is that wrong? The owner's intuition is that aggregating/analyzing at the group level needs to know "this is a group-to-group relation" to roll up correctly. **This is a lens/pattern concern, not an edge-axis defect** — a rollup-pattern can select edges where both endpoints are containers. So no new edge field is needed; a PATTERN can discriminate by endpoint-type. **NOT a defect — but only if endpoint-type is cheaply readable, which it is (`type` is in the passport).** *Looks solid on inspection; the owner's worry is handled by patterns, not by a new edge род.*

**Net on N-074:** the "glib" charge is **half-right.** (3a-invariant) and (3b) are genuine strains the last council under-addressed:
- (3b) groups-as-categories **re-merges home and facet** — the model must *refuse* this merge or define carefully how one node carries both roles without structure/semantics coupling.
- (3a-invariant) "groups only group" needs a type-contract to enforce thinness — not free.
- (3c) is mostly covered (home vs non-home + pattern-by-endpoint-type). Nitpick, not defect.

**Minimal fix:** Declare a reserved **type-class** `container` (not a new passport axis — a convention in the type registry) with two enforced contracts: (i) container types MAY restrict payload (enforces "only group"); (ii) container membership is `home`, classification is `facet-of` — and the engine **forbids a single node from being the target of both home-edges-as-belonging and facet-edges-as-category for the same members** (prevents the structure/semantics merge). This is a TYPE-род contract + one engine invariant. No new род, no new passport field. Confidence medium-high.

---

## 4. Replicated / shared values (N-072) — **STRAINS** (confidence: high)

**The owner's claim:** "replications of the same values" — templates, shared settings, links between data reused in many places; app-settings as nodes.

The SYNTHESIS §4 answer: canonical-node + projections. The team-lead is right to suspect this breaks. **It does, in three distinct places.**

**(4a) Consistency-on-update vs accidental coupling — the core dilemma.**
- "Shared value, change once → changes everywhere" = a single canonical node, referenced by edge from N places. Good for *intentional* sharing (one tax-rate node, 100 deals reference it; change it, all deals see the new rate).
- BUT the model has **no distinction between "reference for sharing" and "reference for citation."** A `references` edge to the tax-rate node means "I use this value." A `references` edge to a deal means "I mention this deal." If both are just edges, then **a refactor that updates the shared node silently mutates every citer** — including ones that only *mentioned* it, not *depend on* it. In GitHub terms: rename a function (canonical node) → every node that merely *discussed* that function in a comment now points at a renamed thing. **Accidental coupling.** The model lacks a "this reference is a live binding vs a frozen snapshot" distinction.
- **Failure:** "a template that is partly shared, partly overridden." The owner names this. A template node shared by 10 deals, but deal-7 overrides one field. The model's cascade (home-spine inheritance) gives *inheritance*, but the override semantics ("inherit all template fields EXCEPT this one, which I pin") is **not in the cascade rule.** Cascade merges *context defaults* (sensitivity, tags, lens) — NOT arbitrary payload fields. So "template with per-instance override" is NOT expressible by the cascade mechanism; it needs a payload-level inheritance/override resolver that doesn't exist. **This is a real gap.**

**(4b) Snapshot vs live (the version collision returns).**
- A shared value that some consumers want **frozen at the time they bound it** (deal signed at tax-rate 20%, must NOT change when the rate updates) vs **live** (dashboard shows current rate). Same canonical node, two binding semantics. The model has neither a "frozen binding" nor a "live binding" edge flag. Without it, sharing is all-or-nothing-live, which is **wrong for any signed/historical artifact.** This is N-072's version problem wearing a different hat — and it confirms versioning is load-bearing, not deferrable.

**(4c) Identity / staleness / inference of "sameness."**
- "Replications of the same values" implies the engine knows two values ARE the same. `canonical_id` (engine-set dedup) is the only mechanism. But dedup-by-value is *inference* (the engine guesses two nodes are the same). False merges (two different `0.20` values that happen to coincide get deduped) and false splits (the same logical setting written two ways) are both possible. For app-settings and shared templates, a **wrong** dedup silently rewires the graph. The model treats `canonical_id` as engine-derived (ADR §5) — but for *intentional* sharing (templates), sharing should be **author-declared (an explicit edge), not engine-inferred.** Conflating declared-sharing with inferred-dedup is the defect.

**Minimal fix:**
- Distinguish **declared binding** from **citation**: a `rel: binds`/`uses-value` edge (live dependency) vs `rel: references`/`mentions` (citation). Only `binds` propagates on update.
- Add an edge flag **`binding: live | frozen`** (frozen captures the value at bind-time → snapshot; live re-reads). This is small, lives on the edge (consistent with the model), and resolves both 4a-coupling and 4b-snapshot.
- **Template-with-override:** this needs a payload-level merge that the *type* (not the engine's context-cascade) defines — a template-type contract. Park honestly; do NOT claim cascade covers it.
- App-settings-as-nodes: fine as nodes; their *sharing* is declared edges, not dedup-inference. Keep `canonical_id` for true dedup only.

**Why STRAINS (high confidence):** "canonical-node + projections" covers the *easy* case (one live shared value, change-once). It does **not** cover the three cases the owner actually named or implied: partial override, frozen-vs-live, and citation-vs-binding. Each forces a small edge-level addition. The model is close, but SYNTHESIS §4 over-claimed "covered."

---

## 5. D1 reframe (N-071): outward-approval is per-stage/per-cell, lives in the AGENT module — **CONCERN, leaning STRAINS** (confidence: high on the risk, medium on severity)

**The owner's move:** outward-approval is not a master gate; it's granular (per-stage/per-cell) and lives in the AGENT-management module, not the passport. "Maybe some documents can't be edited without approval; in part of the cell this is useful."

**The adversarial question the team-lead poses is the right one:** does moving valve-granularity into the agent module **weaken** the engine-enforced valve (ADR-0002 §3), and does "the agent decides its own approval" re-open the laundering risk?

**My finding — this is a security-architecture smell, and I'll be precise about why:**

ADR-0002 §3 made the valve **engine-enforced** and **default-closed**, with one load-bearing property: **author ≠ authorizer.** The whole point (Alt-5, §3 "самоповышение запрещено") was that *an agent cannot authorize its own outward/promotion action.* The valve is a control the agent **cannot reach.**

N-071 says the approval granularity "lives in the agent-management module." There are two readings, and they are NOT equally safe:

- **Reading A (safe):** the *policy data* (which stages/cells need approval) lives as **policy-nodes in the agent-management area of the graph**, but the *enforcement* stays in the engine. The agent module *declares* "stage X of skill Y requires human approval"; the **engine reads that policy and enforces it.** This is exactly ADR-0002's "rule = data (policy-node), engine = enforcement" model. **This is fine** — it's the promotion-policy pattern (§3) generalized to per-stage. The valve is still engine-enforced; only its *granularity config* moved to a policy-node. ✅

- **Reading B (dangerous):** the *enforcement* moves into the agent module — i.e., the agent (or its managing logic) checks "do I need approval here?" and proceeds if it decides not. **This re-opens the laundering hole the ADR closed.** If the entity that decides "this action needs approval" is the same agent layer that performs the action, then author == authorizer again. An adversarial or buggy skill marks its own outward step as "no approval needed" and launders. **This is the exact failure mode ADR §3 / Alt-5 was built to prevent.**

The owner's phrasing ("ложится в управление агентов") is **ambiguous between A and B**, and the natural-language default reading leans B (people picture the agent module *doing* the gating). **That ambiguity is the defect.** A security control's enforcement point must be named unambiguously, and "it's in the agent module" is precisely the place you do NOT want a valve to live if "agent module" means "agent-controlled."

**Can a per-cell "needs approval" flag live coherently without being a passport/edge field?**
- A per-cell approval requirement is a *property of the cell* that the engine must check before an outward action touches it. If it's only in the agent module, the engine doesn't see it → can't enforce default-closed. So either:
  - it's a **policy-node** that the valve queries (`applies_to: <cell|type|scope>, requires: approval`) — consistent with §3's `promotion-policy` shape, engine-enforced. **Coherent.** Or
  - it's a passport/edge field (e.g. `sensitivity: needs-approval` or an edge flag) — also engine-visible. **Coherent.**
  - What is NOT coherent: a flag that lives *only* inside agent-module logic and is checked *only* by the agent. Then it's advisory, not enforced, and the valve degrades from "control" to "suggestion."

**Minimal fix (and this is a MUST, not a nicety):**
- **Pin the enforcement point: the valve stays engine-enforced, default-closed, author ≠ authorizer. The agent module may only carry POLICY DATA (granularity config), as policy-nodes the engine reads.** State this as the invariant. Forbid the agent layer from being the enforcer of its own approval.
- Per-cell "needs approval" → a `promotion-policy`-shaped node OR a passport/edge flag the **engine** checks, NOT agent-module-internal state.
- Granular per-stage approval is **good and welcome** — but as *configuration of an engine-enforced gate*, not as *relocation of the gate into the agent.*

**Why CONCERN-leaning-STRAINS, high confidence on risk:** under Reading A the model is fine and even improved (granular config is better than a master switch). Under Reading B the model's central security property collapses. The owner's words don't disambiguate, and the dangerous reading is the intuitive one. Left unstated, an implementer will likely build B. **The reframe is acceptable ONLY with the enforcement-point pinned in writing.**

---

## General doubt-sweep — scenarios I suspect DON'T fit, beyond the five concepts

I went looking for "whole life" + GitHub-scale scenarios that force a model change. Five, with confidence and defect/nitpick separation.

**(DS-1) Massive fan-in to a leaf breaks "importance/level lives in topology." [REAL DEFECT, confidence: high]**
The model decided level is computed from sub-graph position (ADR §1) and importance is per-parent-edge (§2a). In GitHub, a util function has 500 inbound `calls` edges + 1 home edge. Its *level* by topology (a deep leaf) says "data/L3 detail." But by *fan-in* it's the most important node in the repo — architecturally central. **Topology-as-position conflates depth with centrality.** A node can be deep (low level) AND central (high importance) simultaneously, and the model's "level from position" gives the wrong signal for exactly the nodes that matter most (hot utilities, core types). The "level from topology" thesis was validated against *hierarchical* graphs (refines/grounds/home spines); it was NOT validated against *high-fan-in call graphs.* **This is the strongest single proof that the §1 "topology gives level" decision is under-tested.** Fix: level/centrality are different axes; a lens computing level from home-depth must not be confused with one computing importance from fan-in. The model needs to keep these separate (it currently gestures at both being "lens output" but never confronts their conflict on a fan-in graph).

**(DS-2) Recursion / cycles in the data graph, not just in patterns. [REAL DEFECT, confidence: high]**
The model's recursion guard (`maxDepth` + cycle-gate + "first visit wins") is specified for **cascade/inheritance traversal** (§2a). But the GitHub `calls` graph has **genuine cycles in the DATA** (mutual recursion: A calls B calls A). The owner explicitly named "сложные паттерны и рекурсии … как это внутри реального проекта (GitHub)." When a PATTERN composes "show me the call-tree of function F," the data itself is cyclic. "First-visit-wins" is correct for *inheritance* (you want one value) but **wrong for a call-graph traversal** (you want to *show* the cycle, not silently drop the second visit). The same guard that protects cascade *corrupts* call-graph rendering by hiding back-edges. **The recursion_terminator in the PATTERN род (§4) is unspecified** — it just says "recursion_terminator, maxDepth." Cyclic-data patterns need to *report* cycles, not suppress them. Fix: PATTERN's terminator must distinguish "prune for safety" from "mark as cycle and continue rendering." Currently undefined → the first real recursive pattern produces wrong output.

**(DS-3) Ordering / sequence as a first-class need. [REAL DEFECT, confidence: medium-high]**
Commits have a strict order (parent chain). Conversation messages have order. A plan's steps have order. The model puts ordering on edges via `priority: number` + `sort: string` (§РЕБРО). But `priority` is *importance-in-parent*, semantically overloaded to also mean *sequence*? Those are different (step-3 is not "more important" than step-2). The owner's N-072 "data attaches as a version/sequence" needs **ordinal sequence** as a clean concept. `sort: string` is a weak hint, not an ordered lineage. For commit chains (intrinsically ordered, append-only, 10k long), "sort string on edges" is a fragile way to encode a total order, and re-sorting on insert is O(n). **The model has no first-class sequence/ordinal primitive.** Fix: a `seq` edge field (integer/lexorank) distinct from `priority`, OR a `next`/`prev` edge род for chains. Confidence medium-high because the owner only implied it (versions/sequence), but every GitHub primitive (commits, comments, CI logs) is ordered.

**(DS-4) Bulk / stream nodes vs the "every cell has a full passport" assumption. [REAL DEFECT, confidence: high]**
ADR-0002 already flags "structurally-flat classes" (chat messages, metric streams, imports — Consequences) and admits level-from-topology is *structurally* weak there. The GitHub scenario amplifies: CI logs (millions of lines), commit-diffs, file-blame, comment threads. Every one of these as a full-passport node (id/type/schema/created/updated/epistemic/sensitivity/source/principal × 9 mandatory fields) is **enormous overhead** at GitHub scale. 9 mandatory fields × 10M log-lines = a passport tax that makes the "everything is a node" thesis non-viable at scale. The model has no notion of a **lightweight/derived/streamed** node-class that skips the full passport. The "thin passport" is thin *per node* but there is no story for "a billion nodes." Fix: a node-class for high-cardinality streams where most passport fields are inherited/defaulted from a parent stream-node (the passport is on the *stream*, the *entries* are near-bare). This is a real scaling gap the optimization-part of N-076 points at directly.

**(DS-5) Cross-cutting query that ignores home — does the home-spine help or hurt? [CONCERN, confidence: medium]**
The model's cascade and default-anchor lean on the **home spine** (§2a: "дефолтный якорь = home-ребро"; cascade backbone = home chain). But the most valuable "whole life" queries are **cross-cutting and home-orthogonal**: "every unfinished thing across all projects," "all mentions of person X anywhere," "everything due this week regardless of container." These queries don't want a home anchor; they sweep facet/time/epistemic axes *across* homes. The model *can* do this (lens over passport axes, §2b), so it's not a defect of capability. The CONCERN: the model's *defaults, cascade, and level-computation* are all home-spine-centric, which **optimizes for the hierarchical view and leaves the cross-cutting view (arguably the core value of a life-aggregator) as the non-default, more-expensive path.** A life platform's killer query is "what across my whole life needs me now?" — and that's the query the home-centric machinery serves *least* naturally. Not a correctness bug; a center-of-gravity worry. Fix: ensure the lens/pattern layer treats home-orthogonal sweeps as first-class, not as the awkward case.

**(DS-6, lighter) Deletion / GDPR / "forget this" in an append-graph. [CONCERN, confidence: medium]**
`supersedes`, `archived`, traces-on-every-promotion, files-as-truth — the model is **append-heavy.** A life platform with health/finance (named in SYNTHESIS §4) WILL get "delete everything about person X / forget this conversation." Hard-delete in a densely-linked DAG with trace-nodes and provenance creates dangling edges and orphans (the re-home rule handles home, but not *citation* edges pointing at the deleted node). The model has no *tombstone / cascade-delete / right-to-be-forgotten* story. For a personal-life platform this is not optional. Confidence medium because it's arguably an ADR-0003 concern, but it's unowned right now.

---

## Ranked TOP defects (forced ranking, no ties)

| # | Defect | Concept | Severity | Confidence | Why it ranks here |
|---|---|---|---|---|---|
| **1** | **Multi-schema discriminant in payload breaks the load-bearing invariant** (N-075 framing 1c — the owner's preferred reading). Engine must open payload to pick validator. | N-075 | CRITICAL | high | Hits the model's single foundational invariant; silent if unaddressed; the owner leans toward the breaking reading. Fix exists (variant=type + unifying lens) but must be *decided* before any multi-schema type is stored. |
| **2** | **No first-class version/lineage axis**; `supersedes`/`canonical_id` carry wrong semantics (replace / dedup, not coexisting ordered history). | N-072 | CRITICAL | high | Versioning is the spine of the GitHub-class scenario and of any edited-over-time life artifact. "Deferred to a module" defers the spine. Forces a designed version-module. |
| **3** | **D1 valve enforcement-point ambiguity** — "approval lives in agent module" reads as agent-self-authorizes, re-opening the laundering hole ADR §3 closed. | N-071 | CRITICAL (security) | high (risk) | A security control whose enforcement point is ambiguous is a defect by default. Cheap fix (pin "engine enforces, agent module only configures") but MUST be written or B gets built. |
| **4** | **Topology-as-level conflates depth with centrality** on high-fan-in graphs (DS-1). Core util = deep (low level) yet central (high importance). | doubt-sweep | HIGH | high | Directly stresses the §1 decision the ADR is proudest of, on the exact graph shape (call-graph) it was never tested against. The strongest *proof* the locked §1 needs a fan-in test. |
| **5** | **Replicated values: citation-vs-binding + frozen-vs-live + template-override not covered** by "canonical-node + projections." | N-072 | HIGH | high | SYNTHESIS §4 over-claimed. Each gap forces a small edge-level addition (`binds` vs `references`, `binding: live\|frozen`). Frozen-vs-live is N-072's version problem again → reinforces #2. |
| **6** | **Recursion guard corrupts cyclic-data patterns** (DS-2) — "first-visit-wins" suppresses back-edges a call-graph must render. PATTERN `recursion_terminator` unspecified. | doubt-sweep | HIGH | high | The owner explicitly named recursion/GitHub. First real recursive pattern produces wrong output. |
| **7** | **Groups-as-categories re-merges home (belonging) and facet (classification)** — the split the model deliberately made. | N-074 | MEDIUM-HIGH | medium-high | One node playing both structural-home and semantic-category couples structure to meaning; re-home strips classification. Last council's "just a node" was glib here. |
| **8** | **No lightweight/stream node-class** — 9 mandatory passport fields × millions of log/commit/message nodes is a scaling tax (DS-4). | doubt-sweep | MEDIUM-HIGH | high | "Everything is a node" needs a near-bare stream-entry class or it's non-viable at GitHub scale. Optimization angle the owner asked for. |
| **9** | **No first-class sequence/ordinal** — `priority`(importance) overloaded for order; commit chains need clean ordinals (DS-3). | N-072 / doubt-sweep | MEDIUM | medium-high | Every GitHub primitive is ordered; `sort: string` is fragile for long append-only chains. |
| **10** | **Home-spine-centric defaults vs cross-cutting "what needs me now"** is the life-platform killer query served least naturally (DS-5); plus no delete/forget story (DS-6). | doubt-sweep | MEDIUM (CONCERN) | medium | Not correctness bugs; center-of-gravity + GDPR worries. Flag, don't block. |

**Nitpicks explicitly demoted (NOT in the table):** N-074 (3c) "group↔group ≠ object↔object" edge distinction — covered by pattern-by-endpoint-type, no new род needed. N-074 (3a-property) "groups have distinct properties" — covered by distinct types. N-073 (external_ref inline-or-model) — both placements fine, not a defect.

**What I looked for but did NOT find a problem with (the proofs the owner asked for):**
- **Containers = node + home edges** survives the GitHub directory tree cleanly (repo→dir→file→function all home-chained). The home-spine *backbone* of cascade is genuinely deterministic and acyclic by construction (§2a) — solid.
- **Importance-on-edge (per-parent)** correctly handles the same function being "critical" in PR-A's context and "incidental" in PR-B's. The N-041 decision holds up well under fan-in *for importance* (it's #4's *level* conflation that's the issue, not importance).
- **external_ref → {connector, key} + connector node** cleanly models GitHub-as-external-source if the repo is mirrored vs referenced. No strain found.
- **Author ≠ authorizer + default-closed valve** is the right security spine — the *only* risk is the N-071 enforcement-point ambiguity (#3), not the spine itself.
- **The 3-род control-plane (TYPE·LENS·PATTERN)** is expressive enough for the read side; my defects are about *data-model axes* (version, sequence, binding, stream-class) and one invariant (multi-schema), not about the control-plane род count.
