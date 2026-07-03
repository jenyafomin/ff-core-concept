# GitHub-scale decomposition — adversarial stress of the locked model

- **Role:** analyst (deep, convergent decomposition)
- **Date:** 2026-06-23
- **Topic:** Decompose a real, fine-grained, recursive software project (GitHub-style monorepo) into nodes/edges/control-plane under ADR-0002; stress the `home` spine, the `level` lens, cycles/fan-out, and scale; classify every strain as FLAW or PROOF.
- **Reads:** ADR-0002 (locked), SYNTHESIS-2026-06-23 (verbs/containers, type-shadowing bug, reactivity gap), THREAD N-060 (level=L1/L2/L3 for code), N-068/N-074 (containers), N-076 (this directive).
- **Method note:** I tested the model against concrete cells, not abstractions. Where it holds, I name the *mechanism* that saves it (not "it works"). Where it breaks, I name the *minimal* missing piece. I refused to manufacture either column.

---

## Part 1 — The concrete decomposition (a real repo as cells)

I model a real monorepo: `acme/platform` — a TypeScript monorepo, 3 packages (`core`, `api`, `web`), ~4,000 source files, ~40k functions, ~120k commits, ~9k PRs, 6 external deps. This is the GitHub-scale target N-076 named. Below: every entity → passport + edges + control-plane.

### 1A. The structural axis (repo → directory → file → function → code) — the `level` ladder

This is the axis the owner gave concrete semantics in N-060: **L1 = what a file is for (why/what) · L2 = its functions/signatures (how) · L3 = call-sites/cases/code body (data).**

| Entity | `type` | `level?` | home edge (`rel`) | other edges | control-plane |
|---|---|---|---|---|---|
| repo `platform` | `container` (project) | — | home→`org:acme` | — | TYPE `container`; default-LENS, default-`scope:project:platform` cascade down home-spine |
| pkg `core` | `container` | — | `part-of`/home→repo | `depends-on`→(none, leaf) | inherits scope via home-spine |
| dir `core/src/graph` | `container` | — | home→pkg `core` | — | — |
| file `store.ts` | `file` | `what` (L1) | home→dir `graph` | `imports`→`node.ts`; `imports`→pkg `ulid` (external) | TYPE `file`; LENS code-zoom |
| function `Store.put()` | `function` | `how` (L2) | home→file `store.ts` | `calls`→`validate()`; `called-by`→47 sites | TYPE `function` (signature in payload) |
| call-site `store.put(x)` @ `api/handler.ts:88` | `code` / `call-site` | `data` (L3) | home→function `handler()` (the *enclosing* fn, not the callee) | `invokes`→`Store.put`; `uses-arg`→node `x` | — |

**Key reading without opening payload:** an agent doing "explain this repo at L1" filters `level=what` + walks home-spine from `repo` → gets the file-level map (each file's one-line purpose) **without reading bodies**. "Zoom to L2 on `store.ts`" → its `function` children. This is exactly N-063's "powerful codebase analysis without opening files" — and it works *because* `level` is a lens axis projecting over the home-spine, not a field that must be read.

### 1B. The non-file graph (the part that makes it a *project*, not a folder)

| Entity | `type` | home edge | other edges | passport notes |
|---|---|---|---|---|
| commit `a1b2c3` | `commit` (card, `href:true` to git) | home→branch `main` | `touches`→file nodes; `authored-by`→person; `parent`→commit | git = book; node = thin card (N from STATE: "git=карточка-ссылка") |
| PR #4012 | `pull-request` | home→repo | `contains`→commits; `reviews`→review nodes; `closes`→issue; `branch`→`feat/x` | `epistemic: proposal` until merged |
| issue #3001 | `issue` | home→repo | `blocks`→issue; `references`→file; `assigned`→person | `epistemic` slides: draft→proposal |
| review (approve) | `review` | home→PR | `by`→person; `requests-change`→commit | `source: human` |
| branch `feat/x` | `branch` | home→repo | `head`→commit; `base`→`main` | — |
| release `v2.1.0` | `release` | home→repo | `tags`→commit; `includes`→PRs | — |
| CI run #88 | `ci-run` | home→commit | `produces`→artifact; `status`→pass/fail | `source: system` |
| external dep `ulid@2.3` | `package` (external) | home→`registry:npm` (or repo `dependencies` container) | `imported-by`→files | `external_ref: {connector: npm, key: "ulid@2.3.0"}`; `sensitivity: public` |
| person `@dev` | `person` | home→`org:acme` | `authored`→commits; `reviewed`→PRs | multi-tenant `principal` |
| discussion thread | `dialogue-thread` | home→PR or issue | `message`→messages | flat class (see §3) |

**Verdict on the decomposition itself:** the model represents every GitHub entity. Nothing in the catalog forced a *new passport field*. That is the first real PROOF (and it matches the V-validation finding that 9/10 cells fit). The strains are NOT "can't represent X" — they are about **home assignment, the level lens, cycles, and scale**. Those are below.

---

## Part 2 — FLAWS (model breaks or strains, needs a fix)

Confidence = how sure I am the strain is real (not how bad it is).

| # | Scenario | What happens to the model | Mechanism (or absent mechanism) | Confidence |
|---|---|---|---|---|
| **F1** | **Shared util `deepClone()` that 3 packages each consider "theirs".** Owner's exact worry: a function "belongs" to its file (fine), but 3 *packages* each treat it as part of their own surface. | `home` is **exactly one** edge. The function's home is its *file*, and the file's home is *one* dir/pkg. So "3 packages each consider it theirs" is **not expressible as belonging** — only as 3 ordinary `used-by` edges. That's actually correct for a util. **BUT** the real break: when a *shared package* `common/` is physically owned by no single feature team yet logically "homed" by the platform-team container for cascade (scope/sensitivity defaults), the home-spine forces ONE cascade parent. If `core` and `api` set *different* default `sensitivity`/scope and both want to cascade onto `common`, only the home parent wins. The other's intent is silently dropped unless it opts into `cascade:true` — and even then **§2(a) diamond rule resolves by `cascade_order`+id, which is arbitrary for "which team's policy is right"**, not semantically grounded. | The diamond resolver is *deterministic* but **not *meaningful*** for code ownership. It picks by id tiebreak, not by "who actually owns the security boundary." | **High** |
| **F2** | **Type-shadowing under multi-parent (the SYNTHESIS CRITICAL, re-confirmed on code).** A `model-def`/config node sits in two containers (`core` defines field `timeout=30s` internal, `api` defines `timeout=5s` internal — N-068 "container shares type down"). | When a node is genuinely in two containers via belonging-like edges and *both* cascade a same-named type/default, `cascade_order` resolves *edge* conflicts and the diamond rule resolves *path* conflicts — but **N-068's "container shares its hidden TYPE down" was explicitly carved out as NOT cascade** (SYNTHESIS §6: "shares down = default-lens/scope cascade, NOT payload-type inheritance"). So the model *says* containers don't inherit type down — yet N-068 owner intent *was* "container extends/shares its type to contents." **There is a genuine gap between what the owner asked for (type sharing) and what cascade delivers (lens/scope only).** For code config this bites: a monorepo *does* want `tsconfig`/eslint/`scope` to layer by directory (that part works via cascade) but does NOT have a clean answer for "this container imposes a *schema* on its children." | Cascade covers scope/lens defaults (works). **Schema/type imposition by container is unmodeled** — deferred to E2 (`model-def`, mode controlled/flexible). Until E2, N-068's headline ("container shares its type down") is **not delivered**, only its scope half is. | **High** |
| **F3** | **`level` lens breaks on code with no clean L1/L2/L3.** A 2000-line "god file" with mixed concerns; or a generated file (bundled `dist.js`); or a data-only `constants.ts`; or a config `.yaml`. | The L1=why/L2=how/L3=data ladder assumes file→functions→bodies. It **has no rung** for: (a) a flat data file (all "data", no "how") — projects to L3 only, L1/L2 empty → lens returns nothing useful at L1; (b) a god-file where one file mixes 5 unrelated responsibilities — L1 "what is this file for" has **no single honest answer**, exactly the ~20% observer-relative case ADR-0002 §1(б) admits; (c) generated/minified code — structurally flat, topology never "ripens" (the Consequences "structurally-flat classes" minus). | ADR-0002 already concedes this: `level?` is a **weak prior, not a contract**, and for flat classes the type-default (`data`) is "the only carrier." So the model *predicted* this strain. It's a FLAW only in that **the analysis tool N-063 promised ("understand the whole repo at L1 without opening files") silently degrades to noise on god-files and generated code** — and nothing flags *which* files are L1-trustworthy vs L1-degraded. | **Medium-High** |
| **F4** | **Reactivity on the code graph (re-confirms SYNTHESIS §3 CRITICAL on a concrete trigger).** "When CI fails on `main`, open an issue and ping the author." "When a dependency gets a CVE, flag every importing file." | These are **standing subscriptions on the graph** ("when condition C → do Y"). The 8-verb surface + passport are **structurally blind** to this. The CVE case is worse: it's a *reactive fan-out* — one external event must touch all `imported-by` edges (50+ files) and raise nodes. No reactor, no autonomous principal, no valve-for-uncalled-action. | **Absent mechanism.** Reactor + autonomous-principal + valve-without-synchronous-caller are all unmodeled (deferred past topic-4/N-071, ADR-0003). On a live repo this is ~half the value (CI, security alerts, stale-PR nags). | **High** |
| **F5** | **`called-by` fan-in of 47–500 as edges → backlink explosion + query cost.** A core util with 500 call-sites. | Modeled as 500 `calls`/`called-by` edges. Passport is fine, but: (a) the **engine's backlink index** must materialize 500 reverse edges per hot node; (b) a LENS "show callers" returns 500 nodes — needs the `section-index`/rollup convention (ADR-0002 engine line) which is **named but not specified**; (c) `maxDepth` cycle-guard on "transitive callers" over a 500-fan-in node is O(fan^depth) — explosive. | `section-index` + `maxDepth` + first-visit-wins exist as *named* invariants but the **rollup/index for massive fan-in is "mandatory and currently absent"** (this is the owner's optimization ask, §4 below). The cycle-guard *prevents infinite loops* (PROOF P5) but does **not** bound *breadth*. | **High** |
| **F6** | **Cyclic call graph A→B→A and circular import X⇄Y — does the home-spine hold?** | The home-spine **holds, by construction**, and this is a near-PROOF — BUT there's a subtle FLAW: the *cycle is real and load-bearing in the domain* (legit mutual recursion, legit circular import resolved by hoisting), yet the model can only represent it as ordinary `calls`/`imports` edges with first-visit-wins traversal. That means **any LENS that wants to *reason about* the cycle** (e.g., "find import cycles" — a real refactoring tool) must run its *own* cycle detection; the engine's first-visit-wins **hides** cycles rather than surfacing them. The model is *safe* against cycles but **lossy about them** — it cannot answer "is there a cycle here?" from passport+spine alone; it needs a PATTERN with explicit cycle-reporting. | Cycle-guard = safety (PROOF). But "cycles as first-class queryable structure" is **not in the model** — it's punted to a PATTERN node that must re-derive it. For a code-analysis platform that's a notable gap. | **Medium** |
| **F7** | **Deep nesting repo→pkg→module→file→class→method→block (6+ levels) vs `maxDepth`.** | A legit code path is 6–8 home-hops deep. ADR-0002's `maxDepth` (soft 3 from STATE, default in engine) **truncates** the home-spine traversal. So "cascade scope from repo down to a method" **stops at depth 3** unless raised. Config/scope that should reach a deeply-nested method **silently doesn't cascade all the way**. | `maxDepth` protects against runaway traversal (PROOF for cycles) but is **wrong as a cascade bound for legitimately-deep code**. The model conflates "stop runaway/cyclic walks" with "stop legitimate deep inheritance." These need **different limits** — and only one (`maxDepth`) exists. | **Medium-High** |
| **F8** | **`home` for a commit / PR / cross-cutting refactor.** A refactor commit touches 30 files across 3 packages. Its `home`? | A commit's home = its branch (fine). But a **cross-cutting change-set** has no single natural home in the *file* tree — it's inherently a hyperedge over 30 files. Modeled as 30 `touches` edges (fine for representation) but: "what does this commit *belong to*" has **no good answer** — branch is a workflow artifact, not a belonging parent. The home-spine assumes a *containment* hierarchy; commits/PRs/issues live in a *workflow* hierarchy that **crosscuts** containment. | The model has **one** home-spine but the repo has **two orthogonal hierarchies** (containment: dir/file/fn; workflow: branch/PR/commit). Forcing both through one `home` flag means one of them is always the "real" home and the other is edges. That's *workable* but the choice is arbitrary and the cascade (scope/sensitivity) only flows down ONE of the two trees. | **Medium** |

---

## Part 3 — PROOFS (model genuinely holds, with the saving mechanism)

| # | Scenario | What happens | Mechanism that saves it | Confidence |
|---|---|---|---|---|
| **P1** | **Every GitHub entity maps to a passport with NO new mandatory field.** 12+ entity types (commit/PR/issue/review/branch/release/ci-run/package/person/file/function/code). | All fit `id·type·schema·created·updated·epistemic·sensitivity·source·principal` + edges. `epistemic` carries the PR/issue lifecycle (draft→proposal→fact-on-merge); `source` carries human/agent/system/import; `href:true`/`external_ref` carry git/npm pointers. | The **thin passport is genuinely type-agnostic.** The richness lives in `type` + edges + control-plane, exactly as designed (N-070's 3-layer thesis holds here). | **High** |
| **P2** | **Cyclic call graph A→B→A does NOT break storage or traversal.** | Edges `calls A→B`, `calls B→A` stored flat. Traversal: first-visit-wins + cycle-guard → terminates. | **Cycle-guard + first-visit-wins (ADR-0002 §2(a).4) is exactly the right safety primitive.** The home-spine is acyclic *by construction* (one home each → home edges form a forest), so cascade NEVER cycles even when `calls` does. This is a clean separation: *belonging* (acyclic spine) ⟂ *reference* (arbitrary graph, may cycle). | **High** |
| **P3** | **Massive fan-out `imports`/`called-by` = edges, not belonging — no contradiction.** Util imported by 500 files. | 500 ordinary `imported-by` edges. None claim `home`. The one home (its own file) is untouched. | The owner's worry ("function belongs to file but used by many") is **dissolved cleanly**: belonging = home (one), usage = edges (many). The N-041 move (importance on edge, per-parent) means "how important is this util *to the api package*" is answerable per-edge without a global-importance contradiction. | **High** |
| **P4** | **`level` lens delivers real codebase analysis WITHOUT opening files — for well-structured code.** "Map this package at L1." | LENS filters `level=what` over home-spine → file purposes; "zoom L2" → signatures; "L3" → bodies. Reads passport + structural edges, never payload. | This is the **topological-level argument from ADR-0002 §1(а) made concrete and it genuinely works** for normal code (docstring→L1, signature→L2, body→L3). N-063's "powerful analysis without opening" is real *where structure exists*. (Degrades on god-files — see F3 — but that's the admitted 20%.) | **High** |
| **P5** | **Circular import X⇄Y + diamond inheritance (D reachable via two paths) resolves deterministically.** | Diamond rule §2(a): nearest-wins, least-sum `cascade_order`, id tiebreak; first-visit-wins. | **The determinism is real and total** — there is always a final resolver (`id`). No run-to-run nondeterminism. (Caveat: deterministic ≠ semantically right for ownership — see F1 — but for *scope/sensitivity defaults* on code, "nearest container wins" is actually a *correct* and intuitive rule: the closest enclosing dir's tsconfig/scope should win.) | **High** for determinism; **Medium** for semantic correctness |
| **P6** | **Re-home on file move / delete (refactor reality).** `git mv core/x.ts api/x.ts`. | Deleting the home edge to `core/` triggers §2(a) re-home: engine in same txn re-points home to next parent (least `cascade_order`→id) or inbox. Node never orphaned. | **Refactors move files constantly** — the re-home invariant means the graph self-heals on move without manual fixup, and scope/sensitivity re-cascade from the new home. This is a genuine strength for a code graph that mutates daily. | **High** |
| **P7** | **Multi-tenant / marketplace isolation via `principal` + `scope`.** Two orgs' repos in one graph; a 3rd-party lint plugin. | `principal` partitions tenants; `scope:project:X` isolates; first-party-only gate (R4) blocks 3rd-party `hard-ABAC/valve` lenses. The lint plugin can register `soft-perception` lenses (read code) but NOT promotion/valve policies. | **The plugin story for code tooling is sound**: read-only analyzers (linters, complexity metrics, the L1/L2/L3 zoom itself) are exactly `soft-perception` lenses — safe for 3rd-party. The dangerous half (auto-merge, auto-deploy) is correctly gated. | **Medium-High** |
| **P8** | **Control-plane self-hosts the code semantics.** "What does L2 mean for a `function` vs a `yaml`?" | `level` semantics are per-type (N-063/N-067), carried by TYPE+LENS nodes, themselves in the graph. A new file-type registers its own L1/L2/L3 projection as data. | **"Graph explains itself" holds for code tooling**: adding Python support = adding TYPE/LENS nodes (data), not engine code. The 3-layer thesis (verbs stable, control-plane grows) is *demonstrated* by code being just another domain. | **Medium-High** |

---

## Part 4 — Optimization notes (the owner's explicit ask: what must NOT be a node; where index/rollup is mandatory)

This is N-076's "how to optimize it in theory" + N-043 (huge sections, abstract-by-name).

### What MUST NOT be a node (the explosion boundary)

| Entity | Node? | Why / cost model |
|---|---|---|
| **Every line of code** | **NO** | 40k files × ~100 lines = 4M nodes of pure noise. Lines have no stable id (every edit renumbers), no independent belonging, no query value. **Lines stay inside file payload**; L3 projects them on demand. Node-per-line is the canonical over-decomposition. |
| **Every commit** (120k) | **Borderline → flat class, lazy** | A commit is a thin `href` card. 120k thin cards is tolerable *only* with a `section-index`/rollup ("commits of `main` this month") — never load all. Most commits are never queried individually → **abstract-by-name (N-043): "120k commits on main" is one rollup node, individuals materialized lazily.** Node-per-commit eagerly = explosion. |
| **Every function** (40k) | **YES, but lazily materialized** | Functions ARE the L2 rung — they have query value (callers, complexity, level). But 40k eager function-nodes is heavy. Materialize on zoom: the *file* node is eager; its function children are derived (`provenance:auto`) on first L2 projection and cached. **Primary = file payload (truth); function-nodes = derived projection.** This is the primary-vs-derived duplication risk (below). |
| **Every call-site** (L3) | **NO as stored node** | Call-sites are derived projections of the body. Storing 200 call-site nodes per hot function = the fan-in explosion (F5) made permanent. Keep as **ephemeral lens output**, not stored nodes. |
| **External dep transitively** (the full npm tree, 1000s) | **NO** | Store only *direct* deps as nodes (6, with `external_ref`). Transitive tree = on-demand resolution via the connector, not 1000s of mirrored nodes. Mirroring npm into the graph is the classic mistake. |
| **Discussion messages** (N-043 flat class) | **flat, abstract-by-name** | A 500-message PR thread = one `dialogue-thread` node + rollup; individual messages materialized lazily. Exactly N-043. |

**The cost rule (derivable):** a thing earns a stored node iff it has **(a) a stable id across edits, (b) independent belonging (its own home makes sense), and (c) query value as a unit.** Lines fail (a). Call-sites fail (b). Transitive deps fail (b)+(c). Functions pass all three but are *expensive eager* → materialize lazily. This is the missing explicit cost model the owner asked for.

### Where index / rollup / section-index is MANDATORY and currently ABSENT

ADR-0002 *names* `section-index` (engine line) and rollup (SYNTHESIS LENS class) but **specifies neither**. At GitHub scale they are not optional:

1. **Backlink rollup for fan-in (F5).** A node with 500 `called-by` MUST expose a *count + paged section*, not 500 inline edges. **Absent** — only "section-index convention" named.
2. **Home-spine section-index for wide containers.** A dir with 2000 files → loading the container loads 2000 home-edges. Needs lazy paged children. **Named, unspecified.**
3. **Commit/message rollup (N-043).** "120k commits" / "500 messages" as a single abstracted node with lazy drill-down. **Named (abstract-by-name), unspecified.**
4. **Derived-function materialization cache.** L2 projection over a file must cache derived function-nodes with a staleness link to the file (`stale` when file `updated` changes). The `stale`/`derived` machinery exists in passport — but the **cache-invalidation rule (when does a derived function-node get recomputed) is unspecified.** This is the primary-vs-derived risk: file = truth, function-node = derived; if the file changes and the cache doesn't invalidate, the L2 lens lies.

### Primary-vs-derived duplication risk at scale (concrete)

The model says "files = truth." But the L2/L3 *value* (function nodes, call-sites) is **derived from file payload**. At 40k files that's a large derived layer that must stay consistent with truth. **The risk:** an agent edits a function-node directly (it's a node, it's writable) instead of the file → now two truths. **Mitigation the model already has:** `provenance: auto`/`derived: true` + `rule_ref` mark these as engine-derived (not file-truth), and the valve/promotion rules can forbid direct writes to `derived` nodes. **But this enforcement is not stated for code** — it must be: *derived code-structure nodes are read-only projections; writes go to the file.* That's a one-line invariant currently missing.

---

## Part 5 — Ranked verdicts

### Top REAL breaks (ordered by how much they threaten the locked model)

1. **F4 — Reactivity on the code graph (CI/CVE/stale-PR triggers).** Confirms the SYNTHESIS CRITICAL on concrete code: ~half of GitHub's daily value is reactive, and the model is structurally blind. Not a code-specific bug — the whole reactive class is unmodeled. **This is the #1 break; it is not new but the GitHub scenario makes its size undeniable.**
2. **F2 — Container-shares-type-down is NOT delivered (only scope/lens half).** N-068's headline promise diverges from what cascade actually does. For a monorepo (tsconfig/eslint/schema layering) this is exactly where owners expect inheritance. Deferred to E2, but N-068 currently *over-claims*.
3. **F5 + index/rollup absence — fan-in explosion has no specified bound.** `section-index` and rollup are named but unspecified; at 500-fan-in / 2000-file-dir / 120k-commits they are mandatory. The model's elegance currently rests on machinery that doesn't exist yet.
4. **F1 — diamond resolver is deterministic but not *meaningful* for ownership.** id-tiebreak picks *a* winner, not the *right* security/ownership winner. For scope defaults it's fine (P5); for ownership/policy it's arbitrary.
5. **F7 — `maxDepth` wrongly bounds legitimate deep cascade.** Conflates "stop runaway walks" with "stop deep inheritance." Deep code (6–8 levels) silently loses cascade past depth 3.
6. **F3 — `level` lens degrades silently on god-files/generated/flat files** with no flag telling the agent "L1 here is untrustworthy."
7. **F8 — one home-spine, two orthogonal hierarchies (containment vs workflow).** Cascade flows down only one; the other is always "just edges."
8. **F6 — cycles are safe but lossy** (queryable cycle structure punted to a PATTERN that must re-derive).

### Top GENUINE proofs (ordered by how load-bearing they are)

1. **P2/P3 — belonging (acyclic home-spine) ⟂ reference (arbitrary, may cycle).** This is the model's strongest result under GitHub stress: cyclic call graphs and 500-fan-out utils do NOT threaten storage or cascade, because the one-home invariant keeps the cascade spine a forest regardless of how tangled `calls`/`imports` get. **The owner's own worst-case (recursion, complex patterns) is exactly where the separation pays off.**
2. **P1 — thin passport is genuinely type-agnostic across 12+ GitHub entity types** with zero new mandatory fields. The 50-cell/10-cell finding holds at code scale.
3. **P4 — `level` lens = real "analyze repo without opening files"** for well-structured code (the topological-level argument made concrete).
4. **P6 — re-home self-heals on file move** — a daily refactor reality handled automatically.
5. **P8/P7 — control-plane self-hosts code semantics + safe 3rd-party read-only tooling.** Adding a language = adding data; linters = soft-perception lenses; dangerous automation correctly gated.
6. **P5 — diamond determinism is total** (id always resolves), and "nearest container wins" is *correct* for scope/sensitivity defaults on code.

### Net read

The locked model **passes the representation and topology stress cleanly** (P1–P8 are genuine, especially the belonging⟂reference separation that makes recursion a non-event). It **strains exactly where the council already flagged** — reactivity (F4) and multi-parent type semantics (F2) — and the GitHub scenario adds **two sharper, somewhat new findings**: the **index/rollup machinery is named-but-absent and becomes mandatory at scale** (F5 + Part 4), and **`maxDepth` is the wrong tool for bounding deep cascade** (F7). None of these require widening the *passport*; they require (a) specifying the engine's index/rollup/derived-cache layer, (b) the reactor (deferred), (c) a separate cascade-depth bound from the cycle-guard, and (d) a "derived code nodes are read-only" invariant. The elegance is real but **conditional on the engine spec the model keeps deferring** — the GitHub scenario makes that deferral the central risk, not the passport.
