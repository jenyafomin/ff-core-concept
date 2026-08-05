---
node_type: plan
status: draft
topic: assemble-and-direct
date: 2026-08-04
owner: jenya.stasik@gmail.com
role: council-reconciler-wave2
inputs:
  - ./wave1/value-lens.md
  - ./wave1/engineering-lens.md
  - ./wave1/risk-lens.md
  - ./wave1/process-lens.md
  - ./wave1/blindspot-lens.md
  - ../00-fact-base.synthesis.md
  - ../../../../00-states/05-assemble-and-direct/state.md
  - ../../../../00-states/05-assemble-and-direct/council-brief.md
---

# Wave-2 reconciled execution plan — "собрать и направить"

> I am the RECONCILER, not a 6th opinion. This integrates the five wave-1 lenses: runs the
> cross-examination, settles the two cruxes (vertical-slice vs horizontal-fix; where S-D lives),
> and drafts ONE execution plan with real folder paths, gates, and team rules.

---

## 1. Cross-exam table

| Lens | Uniquely got right (others missed) | Where it overreached |
|---|---|---|
| **Value** | The **fake-win mechanism**: declaring M2/M3 "done" on MemoryStore + PEP-bypass silently owes a *migration*, which violates the founding "без миграций" promise itself — a value violation, not an eng gap. Deeper: **zero acceptance evidence that memory changes agent behavior** (usage% invisible; no named human beneficiary for ga-rentacar → "well-documented fiction" risk). | Ranked **S-B #1** while admitting S-B's win is fake without the durable/PEP work — its own "thin joint slice" dissolves that ranking. Under-weighted that PEP-door is store-agnostic *infra*, not tenant work. |
| **Engineering** | The **file-level decoupling** the topic-labels hide: **Fix-α (PEP-door, store-agnostic, touches `lens/*`)** vs **Fix-β (durable-adoption, touches `cli.ts` entrypoints)**, and the ordering law **Fix-α must precede Fix-β** (test the gate before the durability of what passes it). Also: Fix-α and S-B M2/M3 **share the same files → one team, not two PRs**. Named the `predicates.ts:78` same-as seam. | Mostly disciplined. Slightly downplays that "durable not a prereq for PEP fix" (true) can read as license to defer correctness — but risk's non-compaction point composes with it rather than contradicts. |
| **Risk** | **Durable NEVER compacts** → routing traffic onto it *permanently, unrecoverably journals an unfixed bug*, no rollback. This is THE reason ordering is a hard edge, not a preference. Plus: **`_log/` gitignored = git safety-net does not apply**; **`.gateway/…/config.json` `cwd` bindings** break silently on any path rename; **fact-base stale within hours** (77/77 vs HEAD 92/92). | Wants to elevate PII to a near-blocking fork — correct to *elevate*, but if read as "block everything until erasure exists" it would stall the slice. Kept as owner-fork + test gate, not a hard block. |
| **Process** | **The branch-card graph already exists, proven & owner-ratified** at `00-states/04-improvement-plans/state.md` → S-D is a **promotion, not an invention**. The **CLOSE/HARVEST gate** blind spot: cards rot as `active` (4/5 existing tracks prove it) and a prettier graph re-rots without a *closing bracket*. **STATE.md must be a GENERATED VIEW**, else the append-stack re-grows. | Ranks S-A #1 and holds S-B strictly behind it — this thinks *horizontally* and partially fights the vertical-slice reframe. Its container design is orthogonal, so the tension is reconcilable, not fatal. |
| **Blind-spot** | **The reframe**: every truth-claim is **DECLARED (opt-in/hand-written), not DERIVED (gate-enforced/observed)** — one generator behind all 5 truths. Promote truth #4 ("PEP must be a door") to **universal invariant**. **Vitality=0 is the meta-organ** whose absence hid the other 4 truths. This collapses S-A..S-D into one **thin vertical slice**. | "Collapses into ONE slice" is rhetorically strong: eng+risk correctly note you **cannot slice cleanly through an empty contract + 2 gateway bugs**. The slice is real but must be **scoped** (reuse the one existing agent; defer contract-design & gateway bugs). The lens half-concedes this in its own caveats. |

### Real remaining disagreements (forks between lenses — few, as expected)
- **F-α (order framing):** Process ranks **S-A content-first**; Blind-spot says **vertical-slice-first** (no horizontal S-A..S-D). → **Settled in §2**: same first move; the slice IS S-A's keystone work, executed vertically.
- **F-β (S-D timing):** Process wants **S-D0 first/blocking**; Value/Eng want S-D **parallel, never gating**. → **Settled in §3**: S-D0 parallel, *joins* the slice at its final vertebra.
- **F-γ (PII urgency):** Risk wants **PII/erasure elevated near-blocking**; others treat it as design-phase deferrable. → **Owner fork FORK-2**, with a test gate; the sharp version handed to Fable (§5).

---

## 2. CRUX #1 — vertical-slice-first vs horizontal-fix-first

**Verdict: same first move under two names. The vertical slice is the correct FRAMING; the horizontal
fixes are the correct DECOMPOSITION of the slice's first vertebrae — with a mandatory internal order.**

They are NOT identical (blind-spot's "one atomic slice" is too clean), but they **resolve to the same
concrete first action** and neither pure alternative survives:
- Pure horizontal ("finish all S-A, then S-B") — too slow, no value shows until a broad N-G program closes (value lens).
- Pure "ship S-B on MemoryStore + bypass now" — the fake win that owes a migration (value + risk).

The honest slice has a **hard internal sequence**, forced by two independent lenses converging:
- Engineering: **Fix-α (PEP-door) must precede Fix-β (durable)** — testing durability of a bypassed path proves the wrong thing.
- Risk: **S-B risk-closure must precede durable-adoption** — durable never compacts, so you must not durably journal an unfixed bug.

Therefore the slice is **PEP-door+same-as → durable → agent-read+derived-status**, not one move.

### Is the vertical slice feasible, or must it skip the immature agent/contract layer?
**Feasible, but MUST be scoped to skip greenfield agent/contract work for v1.** Eng+risk are right that you
cannot slice through an empty 17-line contract + 2 live gateway bugs. Resolution:
- **Do NOT** design the brain↔agents contract from scratch (premature abstraction — value + eng agree; only real once ≥2 agents disagree).
- **Do NOT** fold the 2 gateway bugs into the slice (eng proved **zero file coupling** — external repo; they run as a parallel track).
- **DO reuse the ONE agent that already exists** — `packages/rental-balance/src/agent/balance-observer.ts`, which already reads through `resolve()` — as the slice's consumer. That is the "real agent read" without new agent infra.
- **DO** build the slice's true first brick the blind-spot lens names: a **minimal Vitality/usage observer** that emits a liveness reading, so status can be *derived from the run*.

### The THINNEST feasible first slice (concrete)
**Files (in strict order):**
1. `packages/ingest-rentacar/src/lens/customer-lens.ts` — route the 4 `graph.byId` reads (lines 77/86/98/111) through `resolve()`; traverse `same-as`. Closes R2/R3. Wire F-3 one-home writer to stamp `domain`; ensure GAP-3(a) guard is actually *called*.
2. `packages/engine/src/…` `resolve.ts` / `admission.ts` — the PEP door itself (already exists; the fix is making the lens *use* it).
3. `packages/rental-balance/src/surface/cli.ts` + ingest entrypoint — swap `MemoryStore` → `store-durable-fs` **for this now-correct path only**.
4. `packages/engine/src/core/predicates.ts:78` — the `LOCKED_MANY_PREDICATES = {'same-as'}` guard must get **≥1 non-test exercise** via real replay in this slice.
5. `packages/rental-balance/src/agent/balance-observer.ts` — reads the fact through `resolve()` (already does).
6. New: minimal Vitality observer emitting an auto-derived status reading.

**"Done" means:** one real ga-rentacar fact flows `customer-lens → resolve() [PEP enforced, not bypassed] →
same-as traversal → durable store [MemoryStore removed from this path] → balance-observer reads it →
a status-card field is AUTO-DERIVED from that run (never hand-written)`; the `same-as` cardinality guard
fired on real (non-test) replay; and a `dist/`↔`src/` parity check confirmed the run measured `src`, not a
stale `dist/`. **Green = the run produced the status.** This is the first time "green" means something.

---

## 3. CRUX #2 — where does the process harness (S-D) live?

**Verdict: S-D splits (process lens is right about the mechanism) — S-D0 runs PARALLEL and *joins* the
slice at its final vertebra; S-D1 runs fully parallel-background, safety-gated. It neither blocks the
slice's start nor merely comes after.**

- **S-D0 (harness skeleton)** = *promote* the already-proven `00-states/04-improvement-plans/state.md`
  index pattern to root `STATE.md` as a **GENERATED view**; register the 4 unregistered branches as cards;
  and — the load-bearing addition — **define the HARVEST/CLOSE gate as a RULE** (not a column nobody fills).
  It is cheap (~1 session) and touches only `docs/00-states/`, so it runs **parallel to the slice's first
  vertebrae**. But the slice's *final* vertebra ("auto-derive status into a card") needs a card schema +
  generated-view mechanism to exist → **S-D0 must land before D1.c**. That is the join, not a block on the start.
- **S-D1 (heavy migration + sweep)** = `_log/` LOSE-NOTHING **indexing** (never touch the 334 gitignored
  files; generate an INDEX; snapshot to a tracked location first) + doc-discipline debt sweep. Fully
  parallel-background, own librarian team, **gated by** a per-file loss-audit + git-tracked snapshot (risk
  E5) and a `.gateway/…/config.json` `cwd` audit before ANY path rename (risk E4). Never blocks the slice.

---

## 4. EXECUTION PLAN

### 4.0 The governing invariant (blind-spot lens, sharpened)

> **STATUS IS DERIVED, NEVER DECLARED.** Nothing is "green / done / true" unless a **real run** — through
> the **mandatory PEP door**, on the **durable store**, read by a **real agent** — *produced* that status.
> A claim is a reading taken after reality passed the door, not a note written ahead of it.
>
> Sharpening (from process + engineering): the reading must be taken from **`src` reality** (`dist/src`
> parity verified), and every branch carries an explicit **CLOSE/HARVEST bracket** — you do not merely
> derive "open," you derive **`harvested`** with an owner sign-off + verification. Every branch-card also
> carries a **value-checkpoint field** (what agent/user-facing value it proves) so no branch is added
> without declaring what value it chases (prevents the next "M2 slices" overclaim).

This invariant governs all directions below.

### 4.1 Directions (ordered, with boundaries)

| ID | Name | Right-point (gate = done) | State-folder vs sub-item | Seq/parallel |
|---|---|---|---|---|
| **D0** | Harness skeleton | Root `STATE.md` is a **generated** index; 4 branches registered as cards (schema: id·theme·status·gate·home·handoff·value-checkpoint·fork?); **harvest/close gate documented as a rule** | Standalone — produced by existing **`00-states/05-assemble-and-direct/`** (meta-state, per process lens; not a new 06+ folder) | Parallel wave-1; **joins D1.c** |
| **D1** | **Vertical proof-slice** (keystone — collapses S-A core + S-B + real part of S-C) | One real fact end-to-end producing an **auto-derived** green (see §2 "Done") | Standalone — **`00-states/06-substrate-slice/`**, `home:` → `packages/` + `03-projects/ga-rentacar/` | **STRICT internal seq a→b→c** |
| D1.a | PEP-door + same-as retrofit | `customer-lens` has **zero `graph.byId` bypass**; `same-as` traversed; F-3 writer stamps `domain`; GAP-3(a) guard called; T3/AC5 honestly green | sub-item of D1, co-owned with tenant (shared files `ingest-rentacar/src/lens/*`) | first |
| D1.b | Durable-adoption of that path | `MemoryStore` removed from ga-rentacar path; `predicates.ts:78` guard fired on **real** replay; `dist/src` parity checked | sub-item of D1 | after D1.a |
| D1.c | Agent-read + auto-derived status | `balance-observer` reads via `resolve()`; **Vitality has >0 code**; status card auto-derived from run; one "agent acted on memory" trace exists | sub-item of D1 | after D1.b **and** D0 |
| **D2** | Substrate hardening (rest of S-A, narrowed) | Canon status honest (`access_event`/`system_telemetry`/explain-chain/`cost-tree` relabel); Built%/Discharged% computed from code; Vitality deepened | Standalone — **`00-states/07-substrate-core/`** | Parallel (canon-cleanup is docs-only) |
| **D3** | Agent-layer maturation (deferred S-C1) | Contract fill = **document what `balance-observer` already enforces**, NOT design-from-scratch. Trigger: ≥2 real agents disagree | Standalone card, **deferred-until-triggered** — `00-states/08-agent-layer/` | Deferred |
| **D4** | Gateway reliability (S-C2) | 2 gateway bugs fixed (dup/restart, OQ-4 outbox) in ext `TOOLS/agents-manager` | Standalone — sub-plan under D3 card, own infra team | Parallel today; **gated: no new agents until D1.a (E2)** |
| **D5** | Process migration + sweep (S-D1) | `_log/` **indexed** (not migrated); tracked snapshot committed first; 4/5 rotting tracks get **honest status**; no live path renamed without `cwd`-audit | Standalone — sub-plan of `00-states/05-…` (meta) | Parallel-background, safety-gated |

### 4.2 Team rules (each card's `state.md` carries this block)
```
## Team contract
read-first:   [fact-base, this card, the ONE relevant census, home INDEX]
gate (DoD):   <the right-point from the table above — measurable>
critic:       <cross-lens advisor / critic agent — never self>
output:       <synthesis home + card status update + _log handoff line>
mode:         seq | parallel(team=<name>)
value-checkpoint: <what agent/user-facing value this branch proves/unblocks>
owner-forks:  [links to decisions only the owner signs]
```
Per-direction critics: **D1** → risk + engineering (correctness/identity seam); **D0/D5** →
process + doc-discipline; **D2** → value (honest-green); **D4** → risk (E2 agent-count).

### 4.3 Sequence / parallel edges
- **Wave 1 (parallel teams, run today):** `D1.a` (core+tenant team, one team — shared `lens/*`) ‖ `D0`
  (process team, cheap) ‖ `D4` (infra team, external repo) ‖ `D2`-canon-cleanup (docs) ‖ `D5`-prep
  (librarian: loss-audit + snapshot + `cwd` audit). FORK-1 surfaced to owner in parallel (cheapest unblock).
- **Wave 2 (strict seq, after D1.a green + D0 landed + fact-base re-verified):** `D1.b` (durable-adoption)
  → `D1.c` (agent-read + auto-derived status = **first true green**).
- **Wave 3 (trailing/triggered):** `D2`-rest ‖ `D5`-heavy-migration (after snapshot) ‖ `D3` (on 2nd-agent trigger).

**Hard edges:** `D1.a → D1.b → D1.c` (eng+risk). `D0 → D1.c` (card must exist to derive into). `D4`:
no new agents until `D1.a` (risk E2). `D5`-heavy gated by loss-audit + snapshot (E5) + `cwd` audit (E4).
FORK-2 resolution should gate durable-adoption **of PII payloads** specifically. Fact-base freshness
re-check (FORK-4) before Wave 2 materializes.

### 4.4 Owner FORKS (owner decides — do not fold silently)
- **FORK-1 · Value-arbitration ADR** *(owner decides)* — resolve the 7-value conflicts (#3 timeliness, #5
  asymmetry, #7 escalation) → `docs/architecture/ADR/ADR-DRAFT-value-arbitration.md`. Blocks **only**
  conflict-pair greens + `timeliness-engine-bridge.design.md` (T5). Cheap; do this week.
- **FORK-2 · PII / erasure elevation** *(owner decides)* — ~2000-2700 real customers already flow; `erasure.ts`
  = "NOT the feature"; `PayloadStore` is an unread blind zone; F-3 fail-open + R2 mis-attribution. Does
  "design-phase" permission to defer erasure still hold now that real PII moves? Elevate to standalone fork
  ranked with F-3/F-4/F-5. **Gates durable-adoption of PII payloads.**
- **FORK-3 · Durable-adoption timing** *(owner decides → handed to Fable, §5)* — when may D1.b proceed.
- **FORK-4 · Fact-base freshness gate** *(owner decides)* — re-verify the snapshot (stale within hours:
  STATE said 77/77, HEAD 92/92) before Phase-2 materializes plans.
- **Pre-existing forks to promote to first-class gated cards (not `_inbox/` floaters):** F-3 (fail-open/closed),
  F-4 (join-key), F-5 (approval), D2 (timeliness trigger).

### 4.5 New risks that must NOT be dropped
1. **same-as guard untested seam** (`predicates.ts:78`) — 0 non-test calls; directly in durable-adoption's
   blast radius → **test gate in D1.b** (real replay must fire it).
2. **Real PII + fail-open erasure** — 2000-2700 customers, no hard-erase, PayloadStore unread → **FORK-2**.
3. **dist/src drift masking regressions** — already caused one CRITICAL-masking incident → **parity check
   gate in D1.b**; all "green" counts are `src`-level until proven.
4. **4/5 `00-states` tracks rot as `active`** — the exact disease D0 fixes → **harvest/close gate must be a
   RULE**, and `STATE.md` must be a **generated view**, else the graph re-rots.
5. **`_log/` gitignored (no git undo)** + **`.gateway` `cwd` bindings** — snapshot before touch (E5); audit
   before rename (E4).

---

## 5. Synthesis vote

**Recommended ORDER (with edges):**
1. **Wave 1 (parallel):** `D1.a` (PEP-door + same-as) ‖ `D0` (harness skeleton) ‖ `D4` (gateway) ‖
   `D2`-canon-cleanup ‖ `D5`-prep — plus FORK-1 to owner.
2. **Wave 2 (strict seq):** `D1.b` (durable-adoption) → `D1.c` (agent-read + auto-derived status = **first
   true green**).
3. **Wave 3 (trailing/triggered):** `D2`-rest ‖ `D5`-heavy ‖ `D3` (on 2nd-agent trigger).

**The convergence the orchestrator saw is VALIDATED, with one sharpening:** the "first move" is not a single
move — it is `D1.a → D1.b`, in that mandatory order (PEP-door before durable), because durable never
compacts. The vertical slice is real but must reuse the existing agent and defer contract + gateway work.

**The ONE decision I hand to Fable (least sure):** **FORK-3 — durable-adoption timing under real PII.**
May `D1.b` proceed the moment `D1.a` is green and the `same-as` guard has ONE non-test exercise, OR must
durable-adoption of a path carrying real customer PII wait for **FORK-2 (erasure)** to resolve first? This is
the collision of "durable never compacts → it *permanently, unrecoverably* journals any bug (incl.
mis-attributed PII with no erasure)" versus "the slice's entire value is proving durable-on-real-data *now*."
It couples three forks (durable timing, PII/erasure, same-as seam), and the cost of being wrong is
irreversible. Highest-consequence, least-certain call on the board → Fable.
