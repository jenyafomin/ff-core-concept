---
node_type: design
lens: process-structure
title: "Council wave-1 — PROCESS/STRUCTURE lens: states, order, pult→graph conversion"
status: draft
topic: assemble-and-direct
owner: jenya.stasik@gmail.com
date: 2026-08-04
inputs:
  - ../../00-fact-base.synthesis.md
  - ../../../census/04-process-layer.census.md
  - ../../../../../00-states/05-assemble-and-direct/state.md
  - ../../../../../00-states/04-improvement-plans/state.md
  - ../../../../../../.claude/rules/doc-tree.md
---

# Process/Structure lens — architecture of states & the pult→graph conversion

> My lens: I do not weigh the *content* value of S-A..S-D. I design the CONTAINER: how they
> are shaped as states, sequenced, tracked, and how the 517-line linear pult becomes a graph of
> branch-cards without loss. Structure over prose.

## Load-bearing observation (changes everything below)

**The branch-card graph already exists, proven, in one place: `00-states/04-improvement-plans/state.md`.**
It has exactly the artifact the strawman asks for: a control-surface **index table**
(`Sphere | Plan | Readiness | Points | Priority | Status`), an explicit order block, plans attached
by the `plan --targets--> state` edge, and the CGC growth cycle. It is the R2 pattern **already
ratified by the owner (2026-07-21)**.

Therefore S-D is **not an invention** — it is a **promotion**: lift the state-04 index pattern up to
the root `STATE.md`, and register the branches that were never registered (ga-rentacar, durable-store,
picture-coverage, assemble-and-direct). This de-risks S-D massively: we are copying a working shape,
not designing a new one. Honor doc-discipline law 8 (navigator = view, not a second home of truth).

---

## Q1 — Is the split right as STATES? Order? Does S-D go FIRST or parallel?

### Category correction: S-D is not a peer of S-A..S-C
- **S-A, S-B, S-C are CONTENT states** — they advance the substrate itself.
- **S-D is a META/PROCESS state** — it changes the *container* the other three live in.
Putting them in one flat vote hides this. S-D is the harness; the others are the load.

### The prerequisite question, resolved by splitting S-D in two
You cannot "spawn plans 1..N tracked in the new model" if the new model does not exist yet. You also
must NOT freeze all content work while rebuilding the pult (that is the churn trap the owner hates).
Resolution — **Ports-and-Adapters move: define the index CONTRACT first, migrate content behind it lazily.**

- **S-D0 — thin index skeleton (BLOCKING, ~1 session, cheap).** Rewrite root `STATE.md` into the
  index table + register S-A/S-B/S-C and the 4 live un-registered branches as rows/cards. This MUST
  precede spawning S-A..S-C so each is *born as a tracked row*, not bolted on later.
- **S-D1 — full migration + sweep (PARALLEL/background, non-blocking, own team).** The heavy
  LOSE-NOTHING `_log` indexing and doc-discipline debt sweep. Runs while content teams work.

**Answer:** S-D goes FIRST but only its **skeleton (D0)**; the **bulk of S-D runs in parallel**.
This is the 80/20 the owner asked for — a cheap harness bought once, then content is cheap to track.

### Order of the content states
- **S-A (substrate-core) is the keystone.** "Grows without migrations" is *the* anchor value, and it
  is a lie today (everything on `MemoryStore`; durable sealed but unused). S-B and S-C both physically
  sit on the store. Drive S-A to "durable adopted + Built%/Discharged% honest" first.
- **S-B (ga-rentacar) is the living proof** — validates S-A's **PEP-as-door** contract on real data.
  Its *design* can begin parallel to S-A, but its GREEN depends on S-A's store-adoption + PEP contract.
- **S-C (agents/contract/gateway) is downstream** — the brain↔agents contract can't be filled before
  brain's unit is stable (S-A). BUT the **gateway bug-fixes** (dup/restart, OQ-4 outbox) are pure
  infra, independent of everything → they split off as a parallel micro-plan.

---

## Q2 — Standalone state-folders vs sub-items; folder shape; seq/parallel; team rules

### Standalone state-folders (each = `00-states/NN-<slug>/`, R2 flat schema)
| Branch | Folder (home of the CARD) | Content lives in (card POINTS here, no duplication) |
|---|---|---|
| S-A Substrate-core | `00-states/06-substrate-core/` | `02-project/core/00-kernel/`, `01-brain/`, `packages/engine` |
| S-B Tenant ga-rentacar | `00-states/07-tenant-ga-rentacar/` | `03-projects/ga-rentacar/`, `packages/ingest-rentacar,rental-balance` |
| S-C Agent layer | `00-states/08-agent-layer/` | `02-project/core/02-agents/`, `03-contract/`, ext `TOOLS/agents-manager` |
| S-D Process org | **`00-states/05-assemble-and-direct/` (EXISTS)** | owns the `STATE.md`-as-index refactor + `_log` index + sweep |

S-D is **not a new `06+` folder** — it is *this* meta-state (05) producing the index + migration plan.
The card is a thin control surface (like state-04). Content is NOT moved into `00-states/` — the card
holds a `home:` pointer. This respects doc-discipline law 2 (one home per topic) and law 8 (view ≠ home).

### Sub-items (NOT their own state-folders)
- **Arbitration of 7 values → ADR** = a cross-cutting DECISION/owner-fork, not a state. Home:
  `docs/architecture/ADR/ADR-DRAFT-value-arbitration.md`, referenced from S-A and S-B cards. It BLOCKS
  only the conflict-pair "who wins" tests — not the harness, not most of S-A.
- **durable-adoption (drop MemoryStore)** = the keystone sub-item/plan under S-A.
- **"canon lies / Vitality=0"** = sub-item under S-A ("honest green").
- **Gateway bug-fixes (dup/restart, OQ-4 outbox)** = a parallel sub-plan under S-C card, own infra team.
- **picture-coverage, durable-store `_inbox` themes** = get cards under S-A pointing at their `_inbox/` homes.

### Folder shape (mirrors the proven state-04 pattern, honors doc-tree.md archetypes)
```
00-states/
  STATE.md                     ← GENERATED index table (view; see Q5 — do NOT hand-maintain)
  06-substrate-core/           ← NN- node (archetype 1)
    state.md                   ← card = control surface (frontmatter: id·theme·status·gate·home·handoff·plans[])
    log.md                     ← append-only trace pointer (R2)
    PLAN-01-durable-adoption.md
    PLAN-02-honest-green.md     ← plan --targets--> state
  07-tenant-ga-rentacar/
    state.md  (home: ../../03-projects/ga-rentacar/)
    PLAN-01-M2-pep-door.md
  08-agent-layer/
    state.md
    PLAN-01-contract-fill.md
    PLAN-02-gateway-bugs.md    ← parallel infra sub-plan
  _archive/                    ← _ service (archetype 3): STATE-linear snapshot, frozen tracks
```

### Sequence vs parallel (which teams run together)
- **STRICT SEQ:** S-D0 (index skeleton) → *then* spawn S-A/S-B/S-C rows. Inside S-A:
  value-arbitration ADR → *before* conflict-pair green tests.
- **PARALLEL teams (different agent teams, same wave):**
  `S-A core-team` ‖ `S-C gateway-bugs infra-team` ‖ `S-D1 librarian-team (migration+sweep)`.
  S-B design-team can run parallel to S-A; S-B green gated on S-A store+PEP.

### Team-rules block (each plan's `state.md` declares its own — quality gate at the input)
Template every card carries so a fresh session starts small and correct:
```
## Team contract
read-first:   [fact-base, this card, the ONE relevant census, home INDEX]
gate (DoD):   <the "right point" — measurable, e.g. "MemoryStore removed from ga-rentacar path; Built% computed from code">
critic:       <who red-teams — critic agent / cross-lens advisor; never self>
output:       <where synthesis lands + card status update + log.md line>
mode:         seq | parallel(team=<name>)
owner-forks:  [links to decisions only the owner signs]
```

---

## Q3 — Convert linear STATE.md + `_log` (334 files) → branch-card graph, LOSE-NOTHING

### INDEX schema (STATE.md-as-index)
Frontmatter shrinks to `Status/Owner/Date`. Body = **one table + a forks mini-table**. No RESUME stack.

| field | meaning |
|---|---|
| `branch` | short id (S-A / ga-rentacar / durable-store …) |
| `title` | one line |
| `kind` | content \| meta \| decision |
| `status` | active \| blocked \| **harvested** \| archived \| superseded |
| `gate` | the "right point" this branch is driven to (DoD, short) |
| `home` | where the WORK lives (pointer, not content) |
| `card` | `00-states/NN-slug/state.md` |
| `handoff` | latest trace pointer → `_log/<date>/HANDOFF.md` |
| `fork?` | owner-decision blocking it (or –) |
| `updated` | date |

Forks mini-table: `fork | blocks | status`. That is the entire root pult — an index, never content.

### Migration steps (each reversible)
1. **Snapshot = return point.** Copy current `STATE.md` → `00-states/_archive/STATE-linear-2026-08-05.snapshot.md`
   (`status: archived`). Original untouched until step 4. *Reversible:* it's a copy.
2. **Extract branch rows.** Each ⭐RESUME block's *still-live* content → a card's `gate`/`next`; each
   ⛔-marked block is already superseded → maps to that card's `log.md`/history. Nothing dropped — the
   snapshot (step 1) holds the full original text verbatim.
3. **Register un-registered branches as cards.** Create `06/07/08`; ga-rentacar/durable/picture cards
   just POINT at existing homes (`03-projects/…`, `_inbox/…`) — **no content moves** (law 2).
4. **Rewrite `STATE.md` → index table** (only after 1-3 verified). Old linear text = snapshot + per-card
   logs. *Reversible:* `git revert` or restore snapshot over STATE.md.
5. **`_log` gets an INDEX, not a migration.** Do NOT touch the 334 gitignored files. Generate
   `_log/INDEX.view.md` = table `session-date → theme → cards advanced → still-live?`. This is the
   missing "which of this trace is still alive" layer. *Reversible:* generated, deletable.
6. **Retention policy (design-only, zero deletion now).** In the `_log` index, mark a session
   `harvested` once its synthesis reached a durable home. Compression/archival is a *later* switch,
   never destructive. Trace stays ephemeral-by-design; truth already lives in the tree.

**LOSE-NOTHING proof:** original bytes preserved (step 1); superseded content demoted-not-deleted
(step 2); homes untouched (step 3); trace untouched + newly indexed (step 5). Every step git-revertable.

---

## Q4 — Sweep the mess (un-registered branches, doc debts) without breaking live things

Sweep = a **sub-plan of S-D1 (librarian team)**, doc-discipline **soft/warn-not-block** default.
1. **Inventory, don't act first.** Source: `_generated/doc-tree.view.md` (already fresher than INDEX.md)
   + census-04 findings: frozen `00-states/00-04/*` lying `status:active`; tails `_inbox/1-gpt-review/`,
   `2026-07-26-kernel-ratification-unblock/`; dead `log.md`×4; `INDEX.md` stale (07-23).
2. **Per item, non-destructive verdict (law 9/10):** *status-archive* OR *redirect-stub* OR *register
   as a live card* — never delete, never move live content in the same pass.
3. **Frozen 00-04 tracks:** set HONEST status (`archived`/`superseded_by:` successor card). History stays.
4. **Guardrail (git-working-tree-safety):** sweep runs in its **own commit/branch, status-edits + new
   index files only**; live homes (`03-projects/ga-rentacar`, active `_inbox`) touched only to *gain a
   card pointer*. "Consolidate first, don't pour a package on top of mess" (doc-tree law 3).

---

## Q5 — BLIND SPOT (what the picture is structurally NOT seeing)

**Primary: there is no defined CLOSE / HARVEST transition for a branch — only "open" and, implicitly,
"silently abandoned."** The entire pain being fixed *is* branches driven partway and frozen while still
saying `status: active` (00-04 states, dead `log.md`). Converting the pult to a graph of cards **does
not fix this by itself.** Without an explicit **archive/harvest gate** — *what does "driven to the right
point" MEAN, who signs it closed, where does the residue go* — the new index will rot exactly like
STATE.md did: in a month you get 20 cards all saying "active." R2 mentions archival-by-status but names
**no trigger and no gate**. The missing primitive is the **closing bracket of a state**: a `harvested`
status + its owner + its verification. I put it in the schema (Q3) deliberately; it must be a *rule*,
not a column nobody fills.

**Secondary (single-writer contract): STATE.md must be a GENERATED VIEW, not a hand-maintained file.**
The linear append-stack grew precisely because hand-editing one shared file under many parallel sessions
is a merge-conflict surface, so everyone *appended* instead of *replacing*. If parallel agent teams each
hand-edit the new root table at session end, they collide and re-grow the mess. **Fix:** each team edits
only its own `card/state.md` frontmatter; root `STATE.md` is **generated from card frontmatter** (reuse
the `tools/lint/doc-tree.mjs` generator that already emits `_generated/doc-tree.view.md`). The picture is
about to hand-build another index = same rot. Make the pult a view, not a file.

---

## LIKELY-DISAGREEMENT (where other lenses will fight me)
- **Engineering/value lenses** will rank S-A #1 and treat S-D as bureaucracy to defer. My rebuttal: I
  *agree* S-A is the keystone content, but S-D0 (skeleton) is one cheap session and MUST precede so
  S-A..C are born tracked — and S-D1 runs parallel/background, not blocking. It is not overhead; it is
  the harness that makes the other three cheap to drive and hard to abandon.
- **Risk lens** may push value-arbitration ADR to top-blocking-everything. I scope it narrowly: it
  blocks only conflict-pair greens, not the harness or most of S-A.
- **Product lens** may rank S-B #1 ("first real value"). I hold S-B behind S-A: green-without-store is
  the "canon lies" trap (M2 bypassed PEP) repeating — proof on a non-durable substrate is a false green.
