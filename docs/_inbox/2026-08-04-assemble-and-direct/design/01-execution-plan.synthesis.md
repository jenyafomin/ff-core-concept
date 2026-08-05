---
node_type: synthesis
title: "Execution plan — assemble-and-direct (council output)"
status: review
topic: assemble-and-direct
owner: jenya.stasik@gmail.com
date: 2026-08-05
source:
  - ./council/wave1/value-lens.md
  - ./council/wave1/engineering-lens.md
  - ./council/wave1/risk-lens.md
  - ./council/wave1/process-lens.md
  - ./council/wave1/blindspot-lens.md
  - ./council/wave2-reconciled-plan.draft.md
  - ./council/wave2-critique.md
  - ./council/wave2-fable-verdict.md
---

# Execution plan — "собрать и направить" (council output)

> Final council output. Integrates 5 wave-1 lenses → wave-2 reconciliation → red-team critique → Fable
> verdict. This is a PLAN (spawns plans 1..N), not itself a state. Status `review` — awaiting owner ack of
> the FORKS (§6), especially FORK-3's owner-acknowledgement.

---

## 0. The governing invariant (DECLARED → DERIVED), with Fable's riders

> **STATUS IS DERIVED, NEVER DECLARED.** Nothing is "green / done / true" unless a **real run** — through
> the **mandatory PEP door**, on the **durable store**, read by a **real agent** — *produced* that status.
> A status claim is a reading taken after reality passed the door, not a note written ahead of it.

**Riders (Fable — the invariant is NOT naïvely absolute):**
- **R1 — scope.** DERIVED-not-DECLARED governs **status claims only**. Intent/goal/design declarations stay
  legitimate (otherwise planning itself is outlawed). A plan is a declaration and that is fine; a *green
  badge* may not be.
- **R2 — gate the meter.** A derived-green from a **bad meter** (e.g. `dist/src` drift measuring stale
  reality) is **WORSE than a declared-draft** — it carries unearned authority. Therefore the **drift/parity
  gate is a precondition of trusting ANY derived status.**
- **R3 — the door is fail-CLOSED.** PEP is fail-closed with an **audited break-glass**: a bypass may exist
  but is **never silent** (logged, attributable).

**Anti-rot corollary (red-team KILL-SHOT 2 — no gate ships as prose-only):** every gate in this plan is
paired with a **generator-level check**, never a prose convention. Prose gates are exactly what rotted 4/5
`00-states` tracks as `active`. See the enforcement column in §4.

Each branch-card also carries a **value-checkpoint field** (what agent/user-facing value it proves) so no
branch is added without declaring the value it chases.

---

## 1. What this plan settled (crux decisions, condensed)

- **CRUX #1 — vertical-slice vs horizontal-fix: same first move, different names.** The vertical slice is
  the *framing*; the horizontal fixes are its *vertebrae* with a mandatory internal order (forced by
  engineering + risk converging): **PEP-door+same-as (D1.a) → durable-by-ref (D1.b) → agent-read +
  hand-triggered status (D1.c)**. Feasible only if **scoped**: reuse the one existing agent
  (`balance-observer`, already reads via `resolve()`); do NOT design the contract from scratch; do NOT fold
  in the 2 gateway bugs (zero file coupling → parallel track).
- **CRUX #2 — the process harness (S-D) runs PARALLEL, joins at the end.** S-D0 (generated STATE.md index +
  register branches + harvest gate) is cheap, parallel to D1.a, and gates **only D1.c** (a card must exist
  to write status into) — **NOT D1.b**. S-D1 (heavy `_log` index + sweep) is parallel-background,
  safety-gated, runs in its own commit/branch.

---

## 2. FORK-3 resolved by Fable → the durable-adoption RULE for D1.b

**VERDICT: PROCEED-BY-REF.** D1.b routes REAL ga-rentacar data onto durable the moment D1.a is green — no
FORK-2 wait, no synthetic-data detour — under this invariant:

> **BY-REFERENCE-FROM-DAY-ONE:** Into a store that never forgets, write **inline** only what you are willing
> to remember forever; **everything erasable-by-right enters BY REFERENCE from day one.**

Concretely: the first durable write journals **META-ONLY** — `IMMUTABLE_ACT_META + payloadRef + payloadHash`.
The PII payload goes **by reference** into a shreddable blob via the existing `PayloadStore` / `erasure.ts`
seam (`splitAct` / `redactAct` already exist and are tested). This makes durable-adoption compatible with a
future right-to-erasure without waiting for the erasure feature to ship.

**Fable's non-waivable preconditions on D1.b (all four, no exceptions):**
1. D1.a green (PEP-door enforced, `same-as` traversed).
2. A **log-level test asserting NO `payload` key appears in any tenant journal line** (enforces by-ref).
3. The `same-as` guard (`predicates.ts:78`) **fired clean on real replay** (not mis-attributing, not unresolved).
4. **`dist/src` parity checked** (rider R2 — trust no derived-green from a drifted meter).

**FLIP conditions (change the rule only if):**
- **→ inline** only if the owner signs an ADR reclassifying the journal as a lawful system-of-record with a
  retention basis that overrides erasure.
- **→ synthetic-data gate** only if by-ref wiring at `store-durable-fs.ts:169` proves **not landable in ~1
  session**, OR the `same-as` real-replay fires **unresolved / mis-attributes**.

---

## 3. Directions overview (ordered)

| ID | Name | Standalone folder vs sub-item | Mode |
|---|---|---|---|
| **D0** | Harness skeleton (generated pult + harvest gate) | `00-states/05-assemble-and-direct/` (meta-state produces it) | Parallel W1; gates **only D1.c** |
| **D1** | **Vertical proof-slice** (keystone) | `00-states/06-substrate-slice/` | **Strict internal seq a→b→c** |
| **D2** | Substrate hardening (rest of S-A, narrowed) | `00-states/07-substrate-core/` | Parallel (docs-only cleanup) |
| **D3** | Agent-layer maturation (deferred contract) | `00-states/08-agent-layer/` | Deferred-until-triggered |
| **D4** | Gateway reliability (2 bugs) | sub-plan under D3 card, ext `TOOLS/agents-manager` | Parallel today; gated (E2) |
| **D5** | Process migration + sweep | sub-plan of `00-states/05-…` (meta) | Parallel-background, own branch |
| **DV** | **Vitality / drift-detector** (the real "Vitality=0" debt) | `00-states/09-vitality-meter/` | Later, first-class (NOT in the slice) |

**KILL-SHOT 1 applied:** the live Vitality/usage observer is **DV**, a separate first-class plan — it is NOT
smuggled into D1.c's gate. D1.c ships only a **hand-triggered verification script**.

---

## 4. Directions in detail (gate + enforcement + folder + team rules)

Every gate below is paired with a **generator-level enforcement** (KILL-SHOT 2). No prose-only gates.

### D0 — Harness skeleton
- **Right-point:** root `STATE.md` is a **generated** index (schema: id·theme·status·gate·home·handoff·
  value-checkpoint·fork?); the 4 unregistered branches (ga-rentacar, durable-store, picture-coverage,
  assemble-and-direct) registered as cards; the **HARVEST/CLOSE gate documented as a RULE**.
- **Enforcement (not prose):** (a) root `STATE.md` **generated via existing `tools/lint/doc-tree.mjs`** —
  teams edit **only their own card's frontmatter**, never the root table (kills the append-stack merge-rot);
  (b) a generator check that **flags any `status: active` card stale past a threshold** (the anti-rot
  mechanism, not a label).
- **Folder:** `00-states/05-assemble-and-direct/` (existing meta-state; not a new 06+ folder — process lens).
- **Team rules:** read-first [fact-base, `00-states/04-improvement-plans/state.md` as the proven pattern,
  `doc-tree.md`]; critic = process/doc-discipline agent; output = generated `STATE.md` + card set + `_log`
  handoff line; mode = parallel(team=process).

### D1 — Vertical proof-slice (keystone) — strict internal seq a → b → c
- **Folder:** `00-states/06-substrate-slice/`, `home:` → `packages/` + `03-projects/ga-rentacar/`.
- **Slice-level acceptance (value lens restored):** the slice is NOT done on mechanics alone. It must name
  **a real beneficiary and a real decision the agent makes differently because of memory** — e.g.
  balance-observer changes an observation/flag on a real order *because* of what an earlier fact wrote.
  Mechanics-green without this is logged as the **"well-documented fiction" risk** (§7 R5), not as done.

**D1.a — PEP-door + same-as retrofit** *(first)*
- Right-point: `customer-lens.ts` has **zero `graph.byId` bypass** (lines 77/86/98/111 routed through
  `resolve()`); `same-as` traversed; F-3 writer stamps `domain`; GAP-3(a) guard actually called; T3/AC5
  honestly green.
- Enforcement: **a lint/arch rule that blocks any future `graph.byId` PEP-bypass** in `ingest-rentacar/src/*`
  (fail-closed door, rider R3) + break-glass must be logged if ever used.
- Files: `packages/ingest-rentacar/src/lens/*`, `packages/engine/src/…resolve.ts/admission.ts`.
- Team: core+tenant is **ONE team** (shared `lens/*` files — do not split across two PRs). Critic = engineering.

**D1.b — Durable-adoption BY-REF** *(after D1.a)*
- Right-point: `MemoryStore` removed from the ga-rentacar path; durable writes are **meta-only + payloadRef +
  payloadHash**; PII payload by reference via `PayloadStore`/`erasure.ts` (`splitAct`/`redactAct`).
- Enforcement (Fable's 4 preconditions, all machine-checked): D1.a green; **log-level test: no `payload` key
  in any tenant journal line**; `same-as` guard `predicates.ts:78` fired clean on **real** replay;
  **`dist/src` parity check** green.
- Files: `packages/rental-balance/src/surface/cli.ts`, ingest entrypoint, `store-durable-fs.ts:169`.
- Critic = risk. Mode = seq after D1.a.

**D1.c — Agent-read + HAND-TRIGGERED status** *(after D1.b AND D0)*
- Right-point: `balance-observer` reads the fact via `resolve()`; a **hand-triggered verification script**
  (KILL-SHOT 1 — NOT a live observer) reads the run and **emits the status**, which lands in the D1 card;
  the slice's "agent decided differently because of memory" trace exists.
- Enforcement: the status field is written **by the verification script's output**, not hand-typed; card
  generator rejects a hand-edited status on this row.
- **Owner + size:** the verification script is its own sized sub-item with a named owner (not free work
  hidden in the gate). Critic = value (does it prove behavior-change, not just mechanics).

### D2 — Substrate hardening (rest of S-A, narrowed)
- Right-point: canon status honest — `access_event`/`system_telemetry`/explain-chain/`cost-tree`-relabel;
  Built%/Discharged% computed from code.
- Enforcement: canon-status generated from code presence (a check that fails if a doc claims a writer that
  has 0 call sites). Folder: `00-states/07-substrate-core/`. Docs-only → parallel. Critic = value.

### D3 — Agent-layer maturation (deferred)
- Right-point: contract fill = **document what `balance-observer` already enforces in code**, NOT
  design-from-scratch. Trigger = ≥2 real agents disagree about the contract.
- Folder: `00-states/08-agent-layer/` (deferred-until-triggered card). Critic = engineering.

### D4 — Gateway reliability
- Right-point: 2 gateway bugs fixed (dup/restart, OQ-4 outbox) in ext `TOOLS/agents-manager`.
- **Gate (risk E2):** do **NOT grow agent count until D1.a green** (F-3 fail-open is safe only with today's
  single correct writer). Folder: sub-plan under D3 card, own infra team. Critic = risk.

### D5 — Process migration + sweep
- Right-point: `_log/` **indexed, not migrated** (generate an INDEX view; the 334 gitignored files untouched);
  a **git-tracked snapshot committed FIRST**; 4/5 rotting tracks given **honest status**; **explicitly sweep
  `docs/_inbox/values-v2/`** (VALUES-canon-v3/critique/goals/value-ladder — a decision-pile in a process-debt
  folder) plus `_inbox/1-gpt-review/`, `_inbox/2026-07-26-kernel-ratification-unblock/`, dead `log.md`×4.
- **Isolation (process lens restored):** the heavy sweep runs in its **OWN commit/branch**, status-edits +
  new index files only; live homes touched only to *gain a card pointer*. No path rename without a
  `.gateway/…/config.json` `cwd` audit (risk E4). Folder: sub-plan of `00-states/05-…`. Critic = process.

### DV — Vitality / drift-detector (the real Vitality=0 debt, first-class)
- Right-point: a live, cheap self-observation organ (usage/liveness/drift) — the meta-organ whose absence hid
  the 5 truths. **Later, named, NOT in the slice.** Folder: `00-states/09-vitality-meter/`. Critic = value.

---

## 5. Final ORDER (seq / parallel edges)

- **Wave 1 (parallel teams, today):**
  `D1.a` (core+tenant, one team) ‖ `D0` (process) ‖ `D4` (infra, ext repo) ‖ `D2`-canon-cleanup (docs) ‖
  `D5`-prep (librarian: loss-audit + tracked snapshot + `cwd` audit). FORK-1 surfaced to owner in parallel.
- **Wave 2 (strict seq, after D1.a green + fact-base re-verified per FORK-4):**
  `D1.b` (durable-by-ref) → `D1.c` (agent-read + hand-triggered status = **first true green**).
- **Wave 3 (trailing / triggered):**
  `D2`-rest ‖ `D5`-heavy (own branch, after snapshot) ‖ `D3` (on 2nd-agent trigger) ‖ `DV` (Vitality plan).

**Hard edges (unambiguous — KILL-SHOT 3 fixed):**
- `D1.a → D1.b` (engineering + risk).
- **`D0 → D1.c` ONLY.** D0 does **NOT** gate D1.b. D1.b depends on D1.a alone.
- `D1.b → D1.c`.
- `D4`: no new agents until `D1.a` (E2).
- `D5`-heavy gated by loss-audit + tracked snapshot (E5) + `cwd` audit (E4); runs in its own branch.
- FORK-4 (fact-base freshness re-check) before Wave 2 materializes.
- FORK-2 does NOT gate D1.b (resolved by PROCEED-BY-REF); it remains a standing owner fork.

---

## 6. OWNER FORKS (owner decides — do not fold silently)

- **FORK-1 · Value-arbitration ADR** *(owner decides)* — resolve 7-value conflicts (#3 timeliness, #5
  asymmetry, #7 escalation) → `docs/architecture/ADR/ADR-DRAFT-value-arbitration.md`. Blocks only
  conflict-pair greens + `timeliness-engine-bridge.design.md` (T5). Cheap; do this week.
- **FORK-2 · PII / erasure elevation** *(owner decides — standing, NOT blocking D1.b)* — ~2000-2700 real
  customers flow; `erasure.ts` = "NOT the feature"; `PayloadStore` unread blind zone. PROCEED-BY-REF makes
  D1.b safe without it, but erasure must still be elevated to a first-class fork ranked with F-3/F-4/F-5.
- **FORK-3 · Durable-adoption timing** — **RESOLVED by Fable (PROCEED-BY-REF, §2); pending owner
  acknowledgement.** Owner may FLIP to inline via a retention-basis ADR (§2 FLIP).
- **FORK-4 · Fact-base freshness gate** *(owner decides)* — re-verify the snapshot (stale within hours: STATE
  said 77/77, HEAD 92/92) **before Wave 2 acts**.
- **Promote out of `_inbox/` into first-class gated cards:** F-3 (fail-open/closed), F-4 (join-key), F-5
  (approval), D2-timeliness (trigger). Left in `_inbox/` they join the `07-19` graveyard (risk Q2).

---

## 7. Non-droppable risk register

| # | Risk | Anchor | Mitigation in this plan |
|---|---|---|---|
| R1 | **same-as guard untested seam** | `predicates.ts:78` (0 non-test calls) | D1.b precondition: fired clean on **real** replay |
| R2 | **Real PII + fail-open erasure** | ~2000-2700 customers; `erasure.ts` "NOT the feature"; `PayloadStore` unread | PROCEED-BY-REF (§2) + FORK-2 standing |
| R3 | **dist/src drift masks regressions** | prior CRITICAL-masking incident | R2 rider: `dist/src` parity is a precondition of trusting any derived-green (D1.b gate) |
| R4 | **Card-rot** (`status:active` forever) | 4/5 `00-states` tracks frozen-but-active | D0: generated pult + stale-active generator check (mechanism, not label) |
| R5 | **"Well-documented fiction"** — no named beneficiary, zero evidence memory changes behavior | value lens Q5 | D1 slice acceptance requires a real behavior-change; standing risk until DV exists |
| R6 | **`_log/` gitignored (no git undo) + `.gateway cwd` bindings** | 334 files; external configs | E5 snapshot-first; E4 `cwd` audit before rename; D5 own branch |

---

## 8. Team rule for ALL downstream plans (Fable's meta-rule)

> **Owner-fork briefs and council inputs MUST carry PRIMARY CODE ANCHORS VERBATIM, not paraphrases.**

The council nearly re-litigated FORK-3 — which `erasure.ts`'s own header (`splitAct`/`redactAct` exist,
tested) had *already solved* — because it deliberated over censuses-of-censuses and the compaction dropped
the load-bearing line. Every downstream plan/brief quotes the deciding source line (file:line + verbatim
text), never a summary of it. This is a required field in each card's Team-contract block.

---

## 9. Team-contract block (each card's `state.md` carries this)
```
## Team contract
read-first:      [fact-base, this card, the ONE relevant census, home INDEX]
primary-anchors: [file:line + VERBATIM deciding lines — never paraphrase]
gate (DoD):      <right-point + its GENERATOR-LEVEL enforcement — never prose-only>
critic:          <cross-lens advisor — never self>
output:          <synthesis home + card status via generator + _log handoff line>
mode:            seq | parallel(team=<name>)
value-checkpoint:<what agent/user-facing value this branch proves/unblocks>
owner-forks:     [links to decisions only the owner signs]
```
