# Conception → Model Mapping (DOGFOOD: the FF project itself as the first real graph)

- **Title:** Stage-1 inventory — representing the FF project in our own node model (the first dogfood graph)
- **Role:** system-architect (structural pattern thinking — boundaries, contracts, data flow)
- **Date:** 2026-06-23
- **Topic:** map the owner's conception (msg 252) of "a system FOR agents that obeys settings stored in our own DB" into the locked thin-passport model — concrete subgraphs + the multidimensionality proof + where the hard pieces live + open questions with provenance.
- **Status:** raw (design sketch + questions; NOT a final schema — that is a later autonomous stage). Phase = DESIGN, no build, no code.
- **Grounds on:** `ADR-0002-thin-passport.md` (locked), `SYNTHESIS-2026-06-23-stress-test.md` (seq/binding edges, engine, version/lineage module, stream-class, invariants), THREAD N-068…N-083, repo reality (`packages/core`, `docs/`, `tools/`, `.claude/`).

---

## 0. The discipline I am holding to (so the sketch does not drift)

Three invariants from the locked model gate every choice below. I state them up front because the owner's conception (especially "flexible types", "groups as categories", "containers share type down") repeatedly tempts violations:

- **I-1 Bearing invariant (ADR-0002 §Контекст).** A field is bearing ⟺ the engine/agent decides how to handle the cell from it *without opening payload and without knowing the type*. Everything else is payload or lives on an edge / in control-plane. The passport stays thin (9 required + 2 optional).
- **I-2 Belonging ⟂ Reference (stress §1, the load-bearing proof).** Exactly one `home` edge = cascade spine (a forest, always acyclic). All other connection (calls, uses, version-of, facet-of, depends-on) is ordinary edges that may cycle freely. **This is what lets the dogfood graph hold a real codebase without the cascade exploding.**
- **I-3 Schema must be decidable from the passport (stress §3).** The `schema` (`type@version`) field alone selects the validator. Branching the validator on a payload value is forbidden — that would force opening payload. So "one flexible type with a payload discriminator" is illegal; **variant = its own type + a lens that re-assembles "one logical thing".**

If a mapping below strains one of these, I flag it in §5 rather than bend the model silently.

---

## 1. Node-type catalog for the dogfood

Each row: passport shape (only the *non-default* / notable fields — every node carries the full 9 required passport fields), and the edges it characteristically carries. `type` is open-registry; the rules for each type live in a **TYPE control-plane node**, not in the cell.

### 1a. The control-plane (the "settings the system obeys") — these ARE nodes (Принцип 0)

| type | passport notes | characteristic edges | maps to repo reality |
|---|---|---|---|
| `model-def` (TYPE) | `epistemic: fact`, `source: human`, `sensitivity: internal` | `validates →` (which types) ; `variant-of →` (deal-sale variant-of deal) | the registry that says what a `task`/`agent`/`commit` cell must look like |
| `lens` (LENS) | carries predicate + disclosure class in payload; passport `type: lens` | `applies-to →` types/scopes ; `enforce-at →` (promotion\|valve\|disclosure) | "L1/L2/L3 zoom", "what's stuck", ABAC-disclosure — incl. **code-level lens** (L1=file responsibility, L2=signatures, L3=bodies) |
| `pattern` (PATTERN) | `recursion_terminator: prune\|mark-cycle`, `maxDepth` in payload | `composes →` subgraphs | flat-aggregation / level-grouping / decomposition — the "2 container modes" = 2 pattern nodes |
| `connector` (CONNECTOR) | `key_schema`, `capabilities: read\|edit\|send`, `resolver` in payload; **first na. outward-facing node** | `binds-to-types →` ; referenced by `external_ref` | git · telegram · gmail · gcal · filesystem (each a separate connector node, same passport) |
| `promotion-policy` / `valve-policy` (LENS class hard-ABAC) | `enforce_point: promotion\|valve` ; **first-party-only registration (R4)** | `applies-to →` type/scope | who may raise epistemic→fact; what needs approval before an outward write |
| `skill-manifest` | what lenses/types/scope this skill may touch + its procedure | `grants →` lenses/types ; `scoped-to →` container | one node per skill in `.claude/skills/` + global skills (ask-council, find-skills, pos-*) |
| `scope` | `global \| project:<id> \| container:<id>` | `contains →` | where a variable/type/lens is visible |

### 1b. The agent-runtime entities (the owner's msg 252 list)

| type | passport notes | characteristic edges | repo reality |
|---|---|---|---|
| `agent` | `source: system\|human`; `principal` = the agent's tenant/identity | `uses-prompt →` (which prompts) ; `assigned-to →` chat ; `has-skill →` skill-manifest ; `overlaps-with →` agent (the "agents intersect in some places") | the 11 POS agents (analyst, architect, builder, critic…) |
| `prompt` | `epistemic: fact`, `level: how` | `version-of →` (+`seq`) ; referenced by many `agent.uses-prompt` (shared/overlapping prompts — many-to-many) | agent definition bodies, system prompts; **one prompt reused by several agents = many inbound edges, not duplication** |
| `chat` / `session` | `chat` = workspace; `session` = one run | `home →` project/container ; `assigned-agent →` agent ; `contains →` message | a council run; a dialogue thread is the *content*, a session is the *run* |
| `message` | **stream-class** (see §4) — almost-bare; inherits passport defaults from its stream by home | `home →` chat/stream ; `in-reply-to →` ; `seq` on the home edge | THREAD nodes N-001…N-083; telegram voice messages; council exchanges |
| `instruction` | `epistemic: fact`, `level: how`, `source: human` | `governs →` (what it constrains) ; `home →` project | CLAUDE.md, `.claude/rules/*`, "things Claude always reads"; **represented so tasks/plans can attach to them** |
| `trace` / `action` | engine-written; `derived`-ish, `source: agent\|system` | `by →` agent ; `from/to →` (epistemic transition) ; `cites →` nodes | agent action records (what read → what wrote); promotion log; valve decisions |
| `agent-memory` | `sensitivity` per scope | `home →` agent ; `about →` subject | persistent agent notes |

### 1c. The "work" entities (today stored as DOCS — owner: "currently stored as docs")

| type | passport notes | characteristic edges | repo reality |
|---|---|---|---|
| `goal` | `level: why` | `home →` project ; raised-by `←` dialogue | VISION goals, charter goals |
| `plan` | `level: what` (per-type default) | `home →` project ; `realizes →` goal ; `connects-to →` code-structure ; `part-of →` plan (decomposition) | `docs/plan/STRATEGY-*.md`; **"plans connect to code structure"** (owner) |
| `task` | `state` in module (open/doing/done); `epistemic`-orthogonal | `home →` plan/container ; `attaches-to →` (file\|folder\|instruction\|spec) ; `seq` for ordered steps | the work items; **"relate to different entities, divisible differently"** |
| `spec` | `level: what` | `home →` ; `specifies →` code-structure ; `verified-by →` validation | `docs/spec/SPEC-core-kernel.md` |
| `analysis` | `epistemic: hypothesis\|fact` | `home →` ; `about →` ; `cites →` | `docs/product/ANALYSIS-*`, council raw, synthesis |
| `adr` | `epistemic: fact` once approved | `supersedes →` (real replacement) ; `decides →` | ADR-0001 (superseded), ADR-0002 (approved) |
| `dialogue-node` | typed (goal/insight/problem/decision…), `epistemic` per type | `refines/answers/raises/tension-with/grounds →` | THREAD N-0xx — already a graph; this is the proof diaolg=data |

### 1d. The code / version entities (the hard half — §4)

| type | passport notes | characteristic edges | repo reality |
|---|---|---|---|
| `file` | `external_ref: {connector: git, key}` ; `level: what` (file responsibility) | `home →` folder (ONE) ; `facet-of →` categories (MANY) ; `version-of →` (history) | `packages/core/src/node.ts`, `tools/whisper/transcribe.sh` |
| `folder` | container; **home ≠ category** invariant | `home →` parent folder ; `contains ←` | `packages/core/src/`, `tools/telegram/` |
| `category` | a node used as a classification target (NOT a home) | `facet-of ←` (members tagged into it) | "service" · "about deals" · "auth" — cross-cutting labels |
| `function` | **derived, read-only** (file = truth); lazy / on-query | `defined-in →` file ; `calls →` (may cycle) | functions inside node.ts — not eagerly materialized |
| `commit` | `external_ref: {connector: git, key: <sha>}`; `epistemic: fact`; immutable | `version-of →` lineage (+`seq`) ; `touches →` (file\|folder) ; `home →` lineage-anchor | git history (1 commit today: a820f30) |
| `version` / `lineage` | **version/lineage module** (§4); ordered coexisting history | `version-of →` anchor (+`seq`) ; `home →` the logical object | commit chain, doc revisions, prompt versions |
| `setting` | `epistemic: fact`, `source: human\|system` | `home →` scope ; `binds →` (live\|frozen) consumers | app settings, config, shared/replicated values |

**Catalog discipline note:** this is ~28 types. They are *open-registry data*, not a closed enum — adding "a new language" or "a new connector" = adding `model-def`/`connector` nodes, not editing core (stress §1 proof 6). The current `@ff/core/node.ts` hardcodes 9 `NODE_KINDS` — that is the v1 prototype and is **superseded** by this open-registry direction (see Q9).

---

## 2. The edges / links (with a concrete subgraph)

### 2a. Edge vocabulary actually in play for the dogfood

| edge `rel` | bearing fields | meaning | example |
|---|---|---|---|
| `child-of` / container | `home:bool` (exactly one true), `priority`, `cascade?`, `cascade_order?` | belonging + cascade spine | file → its folder |
| `facet-of` / `tagged-as` | (no home) | multidimensional classification | file → category "service" |
| `version-of` | `seq` (NEW, stress §2A) | ordered coexisting history | commit_N → lineage |
| `uses-prompt` / `assigned-to` / `has-skill` | — | runtime wiring (agent↔prompt, chat↔agent, agent↔skill) | architect → prompt-architect |
| `depends-on` / `calls` / `imports` | — (may cycle freely — I-2) | reference, NOT belonging | node.ts → id.ts |
| `binds` | `binding: live\|frozen` (NEW, stress §2A) | live binding to a shared value (frozen = snapshot) | task → setting |
| `external_ref` (passport field, not edge) | `{connector, key}` | pointer outward, resolved by connector | commit → git sha |
| `supersedes` | — | TRUE replacement (narrowed by version module) | ADR-0002 supersedes ADR-0001 |
| `derived:true` | `rule_ref` | engine-inferred edge, read-only | function → file |

`priority` (importance, per-parent, N-041) and `seq` (order, not importance, stress §2A) are **different fields** — step-3 of a plan is not "more important" than step-2; commit N is *after* commit N-1, not *above* it.

### 2b. A concrete subgraph — a real PR/commit touching files, with a plan + spec attached

Taking the actual repo: a hypothetical PR "rewrite core node schema to passport v2" that would touch `packages/core/src/node.ts` and `schema.ts`, driven by `SPEC-core-kernel.md` and a plan node.

```
                         goal:"second brain that acts" (level=why)
                                   ▲ realizes
                         plan:"passport-v2 rewrite" (level=what)
                          │ home                 │ specifies
                          ▼                       ▼
            project:"FF-Personal-Mgmt" ◄─home─ spec:"SPEC-core-kernel"
                 │ contains (home spine)              │ verified-by
                 ▼                                     ▼
         folder:"packages/core/src" ──home──► file:"node.ts" ──facet-of──► category:"core-schema"
                 │ home                          │  ▲                    └─facet-of──► category:"service(tech)"
                 ▼                               │  │ touches
            file:"schema.ts" ◄──────────calls───┘  │
                 ▲                                  │
                 │ touches                          │
            commit:"a820f30" ──external_ref{git,sha}──► connector:"git"
                 │ version-of (+seq:1)
                 ▼
            lineage:"node.ts history" ──home──► file:"node.ts"
                 ▲ attaches-to
            task:"migrate kinds→open registry" ──home──► plan:"passport-v2 rewrite"
```

Reading the data flow as contracts:
`task —attaches-to→ file —home→ folder —home→ project` is the **cascade spine** (sensitivity/scope/default-lens flow down this, deterministically).
`file —facet-of→ category` and `commit —touches→ file` are **reference edges** — they may fan in 500-wide, cycle, cross projects, and *never* perturb the cascade (I-2). The commit's `external_ref` keeps git as the book of truth; the commit node is a *card* pointing at it (ADR-0001 retained principle: "git = book, node = card"), it does not mirror the diff.

---

## 3. MULTIDIMENSIONALITY — the load-bearing point (N-081, owner msg 252)

This is the first real proof the model delivers something the filesystem cannot. One concrete file: `packages/core/src/node.ts`.

### BEFORE — filesystem (single-home, forced)

```
packages/
└── core/
    └── src/
        └── node.ts        ← lives in EXACTLY ONE place. Full stop.
```

The path **is** the identity. To also express "this is a *service* technically", "it is *about the data-model domain*", "it is *owned by the core-kernel area*", "it is part of *plan passport-v2*" — the filesystem offers only blunt instruments: duplicate the file (drift), invent naming conventions (`node.service.model.ts` — collapses dimensions into a string), or keep a separate index that rots. **One file, one place, one meaning.** Every other dimension is either lost or smuggled into the filename.

### AFTER — our model (one home edge + many facet edges)

```
file:node.ts (passport: id, type=file, schema=file@1, epistemic=fact, sensitivity=internal,
              source=human, principal=owner, external_ref={git, "packages/core/src/node.ts"},
              level=what)

  ──home──────────────► folder:"packages/core/src"     (the ONE cascade parent; where scope/sensitivity inherit)
  ──facet-of──────────► category:"service"             (technical slice)
  ──facet-of──────────► category:"data-model"          (domain)
  ──facet-of──────────► category:"core-kernel-area"    (ownership / office X)
  ──part-of───────────► plan:"passport-v2 rewrite"     (project membership)
  ──version-of────────► lineage:"node.ts history"      (its own history axis)
  ──implements────────► spec:"SPEC-core-kernel"
```

**What changed structurally:**
- **Identity decoupled from location.** `id` (ULID) is the stable key; the git path is now just *one* `external_ref`, not the identity. Move/rename the file → re-home self-heals (stress proof 4: `git mv` ⇒ re-home), and every facet/version/spec edge survives because they point at `id`, not path.
- **A cell lives in several places at once** — but only **one** of them is `home` (cascade). The four `facet-of` edges are classification, carrying **no** home, so they can be arbitrarily many without any merge ambiguity (I-2 + ADR-0002 BELONGING invariant). This is exactly N-081's "not flat, not merely nested — multidimensional": technical slice × domain × bindings, simultaneously.
- **A query "all *service* cells about *data-model* in *plan passport-v2*"** is a lens intersecting three facet axes — impossible on a filesystem without a parallel database, native here.

**The strain I must name (honest):** the line between a `home` folder and a `facet-of` category is a *semantic* discipline the engine enforces (invariant "container home ≠ category", stress §2C), but **the owner's N-074/N-081 explicitly wants "groups that are also categories".** The model forbids one node being both `home` and `facet` *for the same members* — because moving a file out of `auth/` would silently strip its "auth" label. So the owner's intuition is *partly* served (a category is a node; membership is an edge) but *partly* refused (no dual home+facet node). This is Q3 below — and it is the sharpest conceptual tension in the whole dogfood.

---

## 4. The hard concepts — where each piece lives (DB vs server vs bot vs AI-via-MCP vs frontend)

The owner named (msg 252) that things live in different planes. This is a **conceptual placement**, not an implementation, and it ties directly to the stress-test's version/lineage module, stream-class, and connector/external_ref.

| concept | where it lives (conceptual) | why / which mechanism |
|---|---|---|
| **The graph itself (nodes = passports + payload)** | **DB / files = truth.** `@ff/core` is the substrate; md+frontmatter is the on-disk truth, the index is an ephemeral derivative (deferred to ~300 nodes per STATE). | files=truth principle (retained from ADR-0001). |
| **Commits & versions with real commit-support** | **Split: git (server infra) = book of truth; DB = cards.** The `commit` node + `lineage` node + `version-of(+seq)` edges live in the DB; the *content* of the diff stays in git, reached via `external_ref{connector:git, key:sha}`. | **version/lineage module** (stress §2B) — git already gives "coexisting ordered history"; we do NOT mirror it, we point at it. `supersedes` is narrowed to true replacement; `version-of` carries the ordered history. |
| **Files & folders structure** | **DB = the node graph (passports, facets, home spine); filesystem/git (server infra) = the byte truth.** Folders are container nodes; files are nodes with `external_ref` to git. | "node = card, file = byte truth"; functions are **derived read-only** projections (invariant, stress §2C) — written to the file, never to the node. |
| **Streams (millions of messages / commits / log lines)** | **DB holds a `stream` node (full passport); the records are almost-bare and inherit passport defaults by home.** Lines of code, call-sites, transitive deps are **NOT nodes at all** (optimization rule §4 stress: a thing is a node ⟺ stable id + own home + value as a query unit). | **stream-class** (stress §2B) — keeps "everything is a node" affordable at scale; abstract-by-name for huge sections (N-043). |
| **Agents, prompts, skills, chats** | **DB = nodes (definitions/wiring); the AI runtime executes them.** The *definition* is data; the *execution* (an agent actually running) is a session/trace written back into the DB. | self-hosting control-plane (Принцип 0) — "everything visible to AI" applies to the control plane too. |
| **Connectors (telegram/gmail/gcal/git/files)** | **DB = connector node (key_schema, capabilities, resolver); the actual I/O is performed by: the bot (telegram), server infra (filesystem/git), or AI-via-MCP (gmail/gcal/notion).** | **connector + external_ref** (N-065/N-070). The connector node is the FIRST outward-facing control-plane node → its *kind* (and whether it may `send`) is a **security decision deferred to ADR-0003 / topic-4**, NOT "fewer kinds". |
| **Settings the system obeys / promotion + valve policies** | **DB = policy nodes; the ENGINE enforces them (not the AI, not the bot).** | invariant: **valve = engine-enforced, an agent never approves itself** (stress §2C, D1). |
| **Frontend** | **Reads projections (lenses) from the DB; writes go through the same verbs + valve.** | the frontend is a consumer of lenses, not a separate truth. |

**The clean separation that falls out:** *truth of bytes* (git, filesystem, external services) is managed by server/bot/MCP; *truth of meaning* (passports, edges, scope, history-as-graph) is the DB; *enforcement* (valve, promotion, one-home) is the engine; *projection* (what a given observer sees) is lenses. The DB never duplicates byte-truth — it points at it via `external_ref`/connector. This is the same shape as the multidimensionality proof: identity (DB) decoupled from location (git path).

---

## 5. Skepticism — where the mapping STRAINS, and OPEN QUESTIONS (with provenance)

These are the future dialogue nodes. Each: **question · source (entity/tension) · why it matters · audience.**

1. **Q1 — Open-registry types vs the hardcoded 9 `NODE_KINDS` in `@ff/core/node.ts`.**
   *Source:* repo reality (`node.ts` line 14) vs ADR-0002 "open registry → TYPE node". *Why:* the running prototype contradicts the locked direction; the dogfood needs ~28 types, the code allows 9. *Audience:* later agent round (it is a code/spec gap, not a concept the owner must rule on) — but it should be **recorded as a known divergence** so no one treats `node.ts` as the contract.

2. **Q2 — Is a `prompt` shared across overlapping agents ONE node with many inbound `uses-prompt` edges, or a node per (agent,prompt) pair?** *Source:* owner msg 252 "agents overlap/intersect in certain places; we know which agents use which prompts." *Why:* one-node-many-edges is the I-2-clean answer (reference, not belonging), but then "which agent uses which prompt at which *place*" needs the edge to carry context (a `at-stage` qualifier?) — that is edge-attribute creep. *Audience:* later agent round.

3. **Q3 — Can a group be BOTH a home-container AND a category for the same members?** *Source:* owner N-074/N-081 ("groups can act as types/categories", "multidimensional") vs invariant "container home ≠ category" (stress §2C). *Why:* this is the **sharpest tension** — the owner's mental model wants dual-role groups; the model forbids it to prevent silent label loss on re-home. The multidimensionality proof (§3) *works* precisely by keeping home and facet separate. **Audience: OWNER** — he must see the concrete cost ("move file out of auth/ → loses auth label") and decide whether the discipline is acceptable or whether we need a third construct.

4. **Q4 — Type-name shadow under multi-parent (DAG, not tree).** *Source:* stress §6 / verbs-synthesis §6 (CRITICAL): a file in two containers, each defining `budget` differently — which wins? *Why:* "nearest-first" answers trees, not DAGs; this is *correctness* of deterministic typing, and the dogfood (a file faceted into many categories that each could carry defaults) hits it immediately. *Audience:* later agent round (has a candidate: home-spine + diamond tie-break by `cascade_order`→`id`), but **owner should confirm** the rule "categories never inject type defaults; only the home spine does."

5. **Q5 — Where does `instruction` (CLAUDE.md, rules, "what's in project root") sit on the cascade?** *Source:* owner msg 252 "info about what's in the project root… represented so tasks can attach to them." *Why:* instructions are *read-always* context. If they `home` into the project they cascade scope to everything (maybe right); if they only `govern →` via reference edges, tasks can attach but they don't cascade. Mixing the two re-opens the home-vs-reference question for a whole class. *Audience:* later agent round.

6. **Q6 — Do `commit`/`version` nodes get a passport each at GitHub scale, or are they a stream?** *Source:* stress §4 optimization (commits = stream + rollup, materialized lazily) vs the version/lineage module needing addressable version nodes. *Why:* 120k commits as full-passport nodes = the exact "9 fields × millions = tax" the stream-class was invented to avoid; but a `lineage` needs *some* addressable points. The boundary (which commits become nodes) is unspecified. *Audience:* later agent round (module design).

7. **Q7 — `external_ref` placement: passport field vs inline-in-cell-schema?** *Source:* owner N-073 ("can live in the model, or right in the cell's data — its own schema shows the id is an external_ref"). *Why:* owner explicitly allowed *both*; but if some cells carry it in passport and some in payload, a generic resolver must check two places — or we lose the "engine resolves without opening payload" guarantee for the payload-placement case. *Audience:* later agent round; **flag to owner** that payload-placement weakens I-1 for those cells.

8. **Q8 — "Flexible types" (deal → deal-sale/deal-rent): the owner leans to ONE type with variants (N-075/N-081); the model requires variant = separate type + lens (I-3).** *Source:* owner N-075/N-081 vs stress §3 invariant. *Why:* this is a *resolved* tension on the model side (variant=type, "one logical deal" = a lens), but the owner has **not accepted** it — he reframed toward "type + categories with their own validation." The dogfood meets this the moment we model, e.g., `task` vs `agent-task` vs `dialogue-task`. **Audience: OWNER** — confirm "variant = type + lens" (Q2 of the stress synthesis is still open to him).

9. **Q9 — `principal` for the dogfood: who is the tenant when everything is first-party (one owner, his own project)?** *Source:* passport requires `principal` (multi-tenant/marketplace blocked without it) vs the dogfood being single-owner. *Why:* the field is mandatory but the dogfood has a trivial answer (`principal = owner`) — which risks the field looking like dead weight until a marketplace exists, OR risks under-modeling when the first external agent/connector appears. *Audience:* later agent round (likely "principal = owner for all dogfood nodes; revisit at ADR-0003").

10. **Q10 — Reactivity is unrepresentable, and the dogfood already wants it.** *Source:* stress §D / verbs-synthesis §3 (CRITICAL, ~½ the value) — and concretely, "every morning collect what's stuck and send it" is a dogfood workflow the owner runs by hand today. *Why:* the model holds *state* well but not *subscriptions*; mapping the FF project faithfully exposes that a real recurring agent task has no home in the model. This is **out of scope by the owner's own framing** (waits on topic-4/D1 + ADR-0003) but the dogfood makes its absence concrete and undeniable. *Audience:* **OWNER** (topic-4/D1 is his open gate).

11. **Q11 — The dialogue graph is ALREADY a dogfood graph — do we promote THREAD-*.md nodes (N-0xx) to real cells now, or keep them as the human-readable rehearsal?** *Source:* CONCEPT-2026-06-21-dialogue-as-data (N-055/N-059) + this mapping showing dialogue-node is a first-class type. *Why:* the THREAD file is hand-maintained markdown that *is* a node graph (id · type · status · links). Promoting it is the cheapest possible first real graph (no code, md+frontmatter, validated). The question is whether to do it before or after the engine exists. *Audience:* **OWNER** (it is a "what do we build first" call, and STATE marks dialogue/project as the first populator candidates).

**Marking:** OWNER decisions = Q3, Q8, Q10, Q11 (and the confirmation halves of Q4, Q7). Later-agent-round = Q1, Q2, Q5, Q6, Q9 (and the mechanism halves of Q4, Q7).

---

## 6. One-paragraph honest verdict

The FF project maps cleanly into the locked model with **zero new required passport fields** — the same result the GitHub stress-test found, now confirmed on the project's *own* reality (agents, prompts, chats, skills, instructions, files, folders, commits, plans, tasks, specs, dialogue). The two real growth points are exactly the two the stress-test predicted: the **version/lineage module** (commits as ordered coexisting history) and the **stream-class** (messages/commits at scale). The multidimensionality proof is solid and concrete: `node.ts` lives in one `home` folder and many `facet-of` categories simultaneously, with identity decoupled from git path — something the filesystem structurally cannot do. The mapping **strains** in four owner-facing places (dual-role groups Q3, flexible-types Q8, reactivity Q10, promote-dialogue-now Q11) and is **clean-but-unspecified** in five engine/module places (open-registry vs prototype Q1, prompt-sharing Q2, instruction cascade Q5, commit-as-stream boundary Q6, principal triviality Q9). None of these touch the passport. Phase remains DESIGN — this is a sketch and a question set, not a schema.
