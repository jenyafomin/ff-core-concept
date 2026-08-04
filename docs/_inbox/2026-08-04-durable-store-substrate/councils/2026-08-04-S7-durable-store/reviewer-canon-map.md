---
status: draft
owner: reviewer-agent (on behalf of jenya.stasik@gmail.com)
date: 2026-08-04
node_type: analysis
title: "Reviewer canon-map — S7 durable StorePort: ratified vs designed vs coded vs gaps"
related:
  - ../../../architecture/ADR/ADR-0006-persistence-as-policy.md
  - ../../../architecture/ADR/ADR-0008-log-and-graph-cqrs.md
  - ../../../02-project/core/00-kernel/invariants.md
  - ../../../02-project/core/00-kernel/durable-storeport.design.md
  - ../../../02-project/core/00-kernel/decisions/ADR-DRAFT-root-seal-durable-store.md
  - ../../../02-project/core/00-kernel/analyses/durable-store-survive-turn/01-sealing-plan.analysis.md
  - ../../../03-projects/ga-rentacar/specs/07-durable-storeport.spec.md
  - ../../../00-states/STATE.md
  - ../../2026-08-01-handoff-prep/TEAM-DIGESTS.md
  - packages/engine/src/adapters/store-durable-fs.ts
  - packages/engine/src/ports/store-port.ts
  - packages/engine/test/survive-turn.test.ts
  - packages/engine/test/durable-reboot-matrix.test.ts
---

# Reviewer canon-map — S7 durable StorePort

## 0. Headline finding (read this first)

**S7 (durable StorePort / GAP 1 / survive-turn) is not a gap to design — it is already built, sealed, and
green in code, on this exact branch (`refactor-tree`), and the canonical entry-point doc (`STATE.md`) has
not caught up to that fact.**

- Commit `b881212` ("feat(engine): seal GAP 1 — durable StorePort (survive-turn) + seal-pass design
  analyses", Mon Aug 3 03:40:39 2026) added `packages/engine/src/adapters/store-durable-fs.ts`
  (`DurableFsStore implements StorePort`) + `packages/engine/test/survive-turn.test.ts` — real
  `spawnSync` process-boundary test (P1 writes+exits, P2 boots fresh, reads back). 47/47 green at that
  commit.
- Same-day follow-up (same commit) added `packages/engine/test/durable-reboot-matrix.test.ts` — Test 2
  (idempotent-reboot-reingest, C4/AC-3) and Test 3 (forward-monotone-rebuild-after-reboot, C3/AC-4), both
  through real `spawn`+`exit`. `docs/02-project/core/00-kernel/analyses/durable-store-survive-turn/
  01-sealing-plan.analysis.md` §"✅ Реализация — 2026-08-03" records **87/87 green, typecheck clean**.
- `git log --oneline HEAD` confirms `b881212` is an ANCESTOR of the current HEAD (`9dccc87`, the very
  latest commit on this branch, "docs(handoff): team round…", Tue Aug 4 00:11:33 2026) — this is not a
  parallel/unmerged branch, it is already in this branch's history, two commits before HEAD (`3088857`
  GAP 2 close, `30a83dc`/`fe4ba3d` GAP 3 partial, then `9dccc87`).
- OQ-1 (sync vs async StorePort — the one-way-door fork both `durable-storeport.design.md` §3 and the
  ADR-DRAFT flagged as owner-P0-before-code) is **resolved as (A) sync** per the sealing-plan's own
  record: "Выбор OQ-1 = (A) sync (владелец, принятый пакет)."

**Yet the freshest handoff material — committed in the SAME latest commit `9dccc87` — explicitly declares
S7 as still-undone, highest-value-next work:**
- `docs/00-states/STATE.md` line 19 (added by `9dccc87` itself): "🎯 Наивысшая ценность след. хода = S7
  (durable StorePort) — граф сейчас RAM-only, до него acts-as-git/sync/кэш ложно-зелёные."
- `docs/council/raw/2026-08-01-handoff-prep/TEAM-DIGESTS.md` (also added by `9dccc87`): "Модуль: durable
  StorePort (S7) — сегодня граф RAM-only → «граф=истина» пока бумажный." / "Наивысшая ценность следующим
  ходом: закрыть S7 (durable StorePort)."

This is a genuine doc↔code (and doc↔doc, within the SAME commit) conflict, not a stale-old-doc issue: the
"team round" digest material is dated conceptually 2026-08-01 (raw files under `council/raw/2026-08-01-*`)
and was folded into canon on Aug 4 without being reconciled against the Aug 3 GAP-1 seal that had already
landed on this same branch. The digest agents that wrote TEAM-DIGESTS.md evidently worked from stale
context (pre-Aug-3) and their conclusion was committed as if current. **Whoever asked for "design S7"
now is almost certainly acting on this same stale STATE.md pointer.**

---

## 1. Ratified — durability-relevant, do not re-litigate

### ADR-0006 — Persistence-as-policy (`docs/architecture/ADR/ADR-0006-persistence-as-policy.md`)
Status: **approved** (owner voice 2026-07-26, gate G2).
- §(a) "one addressable model over MANY storages" — MVP has exactly two: `md+journal` + PG, everything
  else "за `StorePort`... ядро о них не знает."
- §(e) write-lock: "в PG/канон пишет ТОЛЬКО движок" via `resolve()`/`engine.write()`; `rebuild --from
  journal` restores current-state from zero.
- §(f)/(f-bis): CQRS-lite composition with ADR-0008 — durable `acts` log = system-of-record (PG-default
  for DB-first types), graph = rebuildable projection.
- §(h): bitemporal envelope fields — commits exactly 2 things (additive-only, opt-in-per-type via
  `meta:type temporal: uni|bi`); explicitly DEFERS the *form* (KQ-5/6/7 still open, not S7's problem).
- KQ-9 (file-first type list) — still 🟡 STILL OPEN but gates *code inclusion of file-first*, not the
  durable-log mechanism S7 builds (S7's acts are DB-first-shaped regardless).

### ADR-0008 — Log and graph CQRS (`docs/architecture/ADR/ADR-0008-log-and-graph-cqrs.md`)
Status: **approved** (owner voice 2026-07-26). Resolves FQ25.
- Log (`acts[]`) = write-model / system-of-record, append-only (I-3), immutable (I-4).
- Graph = read-model, deterministic projection (`fold(acts[]) → current meaning`), rebuildable
  (`rebuild --from journal`), carries staleness marker.
- This is exactly the mechanism `store-durable-fs.ts` implements: `hydrateFromDisk()` re-folds via the
  SAME pure reducer (`core/projection.js`) the in-memory `MemoryStore` uses — "механизм ребилда уже
  доказан (ADR-0008 §2)" per the sealing-plan.

### `invariants.md` (`docs/02-project/core/00-kernel/invariants.md`) — I-5, I-11 (relevant text quoted)
- **I-5** "Текущее состояние — производная ПРОЕКЦИЯ, не второй источник истины (единственный путь записи
  — движок)." Carries a PROVISIONAL note that was explicitly resolved by ADR-0006: "D-1 допускает и
  PG-as-primary для DB-first типов." — i.e. I-5's hedge is already lifted by the approved ADR; the file
  itself hasn't been edited to remove the hedge text (doc-hygiene debt, not a live blocker).
- **I-11** "Логическая истина = граф; физическое размещение = политика-на-тип." `enforced at:`
  names `store-md` (file-first) / `store-pg` (DB-first) "оба за `StorePort`" — this is the exact seam
  `store-durable-fs.ts` fills for the file/journal side. ADR-0008 Consequences flags that I-11 "требует
  ГЛОССЫ (not a change)" to distinguish the logical/physical axis from the log/graph axis — still an
  open doc-hygiene action item, not blocking.

**Conclusion: nothing in the ratified layer conflicts with what's now built. The durable-fs adapter is a
straight, literal instantiation of ADR-0006 §(a)/(e)/(f) + ADR-0008, chosen on the (A)=sync branch of the
one open fork (OQ-1) that ADR-0006/I-5 deliberately left to a later persistence ADR.**

---

## 2. Designed — draft status, now (partially) stale relative to code

### `docs/02-project/core/00-kernel/durable-storeport.design.md`
- Frontmatter: `Status: draft`, `Date: 2026-07-31`. Opens with: **"Фаза = дизайн на бумаге... Код
  (`packages/engine`) НЕ тронут."** This sentence is now FALSE — code exists, is tested, is merged into
  this branch's history (commit `b881212`, two commits before current HEAD). The file has not been
  touched since 2026-07-31 (confirmed: `git log -1 --format=%cd` on this file = Aug 1, i.e. no edit
  reflecting the Aug 3 seal).
- §2 (C1–C5 contract) — this is what got implemented, essentially verbatim (see `store-durable-fs.ts`
  header comment which explicitly cites "Contract (durable-storeport.design.md §2, C1–C5)").
- §3 (sync vs async fork, OQ-1) — resolved (A) per the sealing-plan; this design file itself still frames
  it as open ("⏳ Решает владелец. До ответа durable-адаптер НЕ пишется в код").
- §4 (AC-1..AC-5) — AC-1..AC-4 are GREEN (survive-turn.test.ts + durable-reboot-matrix.test.ts). AC-5
  (single-writer under real concurrent writers) is explicitly deferred (OQ-4) — a lock exists
  (`store-durable-fs.ts` §"C5") but the *concurrent-writer* test is NOT written yet (sealing-plan §2 Test
  4: "формализуется, когда появится реальный второй параллельный писатель... НЕ блокирует GAP 1
  sealing").
- §6 open questions: OQ-1 resolved(A); OQ-2 (journal home/location — doc-discipline decision) — status
  unclear, not verified in this pass, worth checking before any new S7 work; OQ-3 (persistent-node model,
  EnvelopeNode↔FFNode) — explicitly out of scope for the durable layer, gated on a separate node-model
  ADR (P3); OQ-4 (single-writer formalization) — deferred, real gap only when a second writer appears.

### `docs/03-projects/ga-rentacar/specs/07-durable-storeport.spec.md` (A4 stub)
- Frontmatter: `Status: draft`, dated 2026-07-30. Explicitly self-describes as **"СТАБ (draft)"**, written
  only to stop a dangling reference from a critic (A6). Its AC-1..AC-3 are the same as the kernel design's
  AC-1/2/3 (now closed). §5 open questions duplicate OQ-2 (journal home) verbatim.
- The kernel design doc (§7) already proposes superseding this stub in favor of the kernel file as the
  permanent home, with `specs/07` reduced to project-specific M3-topic-agent acceptance wiring — but that
  merge/supersede was never executed (both files still `Status: draft`, no redirect stub written). This is
  a live doc-tree action item (one-home-per-topic, doc-tree law #2), not a design gap.

### `ADR-DRAFT-root-seal-durable-store.md` (candidate ADR-0009, `Status: draft`)
- Frames S7 as one of 8 "root seams", names 4 "engine debts" (durable-store absent, `DEFAULT_PREDICATES`
  hardcoding domain names in-core, 3 unenforced invariants) as of its 2026-07-31 W2 verification pass.
- Per the same-directory sealing-plan, GAP 1 (durable-store) is now closed; GAP 2 (predicates-as-data) is
  also closed per commit `3088857` "close GAP 2 — predicates-as-data (kernel domain-free, G2 true)"; GAP 3
  (append-only-forward / write-plane invariants) is partially closed per `30a83dc`/`fe4ba3d` ("mark (a)+(c)
  realized green"). **This ADR-DRAFT itself has not been updated to reflect any of the three GAP closures**
  — still reads as if all 4 debts are open. Needs a pass to mark closed items before it can be ratified as
  ADR-0009 (or split/archived).

---

## 3. Coded reality (ground truth, grep-verified)

- `packages/engine/src/ports/store-port.ts` — sync interface `{ load, readNode, writeAct, acts, rebuild }`.
  Unchanged signature (confirms OQ-1=(A) — zero signature break).
- `packages/engine/src/adapters/store-memory.ts` — `MemoryStore`, RAM-only, still exists (used at M0/tests
  where durability isn't required).
- `packages/engine/src/adapters/store-md.ts` — async bridge, load-only, still NOT wired into `Engine.write`
  (this is unchanged and correctly out of scope — the durable-fs adapter solves the same problem via a
  different, sync-compatible path).
- `packages/engine/src/adapters/store-durable-fs.ts` — **the actual S7 implementation.** `DurableFsStore
  implements StorePort`. JSONL journal on disk, `appendFileSync`-class write + `fsyncSync` before return
  (C1), constructor-time `hydrateFromDisk()` re-fold via `project()` (C2), torn-last-line drop on parse
  (C3), `acts()` reads the disk-rebuilt journal so `Engine.write`'s existing dedup logic gets cross-reboot
  idempotency for free (C4), advisory PID-lock file with stale-owner reclaim (C5, partial — no concurrent
  writer test yet).
- Tests: `packages/engine/test/survive-turn.test.ts` (3 tests, real `spawn`), `durable-reboot-matrix.test.ts`
  (2 tests, real `spawn`+`exit`) — both drive an actual OS-process boundary via a harness
  (`test/harness/survive-turn-harness.ts`), not same-process state reuse. This satisfies the sealing-plan's
  own anti-false-green bar (§1: "4 обязательных компонента" — real process boundary, no shared memory,
  read via the actual `StorePort`/`Engine` methods, no manual injection before first read).
- `packages/ingest-rentacar/*` — uses `MemoryStore` in its own tests (in-process), i.e. the ga-rentacar
  ingest slice (M1/M2) has NOT yet been wired to `DurableFsStore` — durability exists at the engine/adapter
  level but is not yet the adapter actually injected into the rentacar CLI/topic-agent run path. That
  wiring (specs/05 §4 M3↔A4 contract, specs/07 AC-1/2) is the real remaining "S7 for ga-rentacar" work, as
  opposed to "S7 the kernel contract" (done).

---

## 4. Concept dir `graph-tree-git-projection` — tangential, not durability-blocking

Q0–Q5 in `docs/02-project/core/00-kernel/concepts/graph-tree-git-projection/` are about git-branches as an
additional *projection* over the graph (tree↔graph↔git), not about the acts-journal's own durability. All
six were resolved 2026-07-26 (`resolved-q0-q5-2026-07-26.decisions.md`) with a follow-up amend pass
(`amend-q2-q4-q5-2026-07-26.decisions.md`) fixing Q2/Q4/Q5. Both files remain `Status: draft` (never
promoted to ADR) but explicitly state "I-3 append-only · I-4 immutable... канон-журнал у графа; git
читается, не источник истины" — i.e. they're consistent with, and downstream of, ADR-0008's log-primacy,
not a competing durability design. Two remaining owner forks noted (killer-subtree choice: `docs/` vs
`agents-manager` repo; polygon home) are unrelated to S7 and can be ignored for this review.

---

## 5. Real gaps for S7 right now (vs. already closed — do not re-open)

**Already closed — do not redesign:**
- Durable append-on-write (C1/AC-1) — done, tested.
- Rebuild-from-journal on boot (C2/AC-2, the ★ incident-defining "survive-turn" property) — done, tested
  via real process spawn.
- Append-only-forward / torn-write safety (C3/AC-4) — done, tested.
- Cross-reboot idempotent dedup (C4/AC-3) — done, tested.
- OQ-1 sync-vs-async fork — resolved (A) sync, zero signature break, confirmed in code.

**Genuinely open / real work remaining:**
1. **Single-writer under real concurrency (C5/AC-5, OQ-4).** Lock primitive exists (PID file + stale
   reclaim) but no test exercises two actual concurrent writers; sealing-plan explicitly defers this until
   a second real writer shows up (e.g. an agent write-back path alongside ingest). If S7 work continues,
   this is the one still-red edge of the matrix.
2. **Wiring `DurableFsStore` into an actual runtime path** (ga-rentacar CLI / M3 topic-agent, or wherever
   the next real caller sits) — the adapter exists and is proven at the engine level but nothing in
   `packages/ingest-rentacar` or elsewhere constructs `Engine` with it yet. This is "adopt the seam", not
   "design the seam".
3. **Journal location / doc-discipline placement (OQ-2).** Both the kernel design doc and the ga-rentacar
   stub flag "дом журнала... точное место = doc-discipline решение, зафиксировать ДО wiring" as open.
   Needs a decision before wiring #2 above, not before the adapter itself (adapter takes `storeDir` as a
   constructor arg, agnostic to where that resolves).
4. **Doc reconciliation debt (process, not design):**
   - `durable-storeport.design.md` — flip `Status: draft` → reflect sealed status, update the "Код НЕ
     тронут" framing, resolve §3/§6 OQ-1 as closed.
   - `ADR-DRAFT-root-seal-durable-store.md` — update GAP 1/2/3 status table against the three closing
     commits (`b881212`, `3088857`, `30a83dc`/`fe4ba3d`) before any ratification decision.
   - `ga-rentacar/specs/07` — execute (or explicitly decline) the proposed supersede/relocation to the
     kernel file (§7 of the design doc); currently two parallel draft docs describing the same closed
     contract (doc-tree law #2 violation: one home per topic).
   - `STATE.md` + `TEAM-DIGESTS.md` — both, in the SAME latest commit, assert S7 as next/undone. This is
     the highest-priority doc fix: whoever reads STATE.md next (as instructed by CLAUDE.md — "read
     STATE.md first") will be misdirected into redesigning a closed seam.
5. **I-5 hedge text / I-11 gloss** — cosmetic doc-hygiene items already logged as owed by ADR-0006/ADR-0008
   Consequences sections; not blockers, just not yet applied to `invariants.md`'s body text.

---

## 6. Conflicts flagged (doc↔doc, doc↔code)

| # | Conflict | Where | Resolution per source-of-truth hierarchy |
|---|----------|-------|-------------------------------------------|
| 1 | STATE.md + TEAM-DIGESTS.md (both committed in `9dccc87`, the current HEAD) claim S7 is undone/next-highest-value | `docs/00-states/STATE.md:19`, `docs/council/raw/2026-08-01-handoff-prep/TEAM-DIGESTS.md:23,29` | **Code + tests (Level D, executable reality) win.** `store-durable-fs.ts` + 5 real-process-boundary tests, committed 2 commits earlier in the SAME branch history, are ground truth. STATE.md is stale/wrong on this point and should be corrected before anyone acts on it. |
| 2 | `durable-storeport.design.md` header says "Код НЕ тронут" | kernel design doc, unedited since 2026-07-31 | Same — code reality overrides; doc needs an update pass, not a redesign. |
| 3 | Two parallel draft docs (`durable-storeport.design.md` kernel file vs `ga-rentacar/specs/07`) describe the same now-closed contract, proposed-but-unexecuted supersede | doc-tree law #2 (one home per topic) | Owner decision needed on which supersedes which (design doc §7 already proposes an answer); not urgent, no content loss risk either way. |
| 4 | `invariants.md` I-5 still carries a "PROVISIONAL — до persistence-as-policy ADR" hedge that ADR-0006 (approved) already resolved | `invariants.md` I-5 vs ADR-0006 §(f) | ADR-0006 (approved, Level B) wins; I-5 text is stale, cosmetic fix owed, not a live blocker. |

---

## 7. Bottom line for whoever designs "S7" next

Do not design a durable StorePort. It exists (`packages/engine/src/adapters/store-durable-fs.ts`), it
honors ADR-0006/ADR-0008/I-5/I-11 as written, and it passes 5 tests that specifically defeat the
same-process false-green class this project has been burned by before (M2 SYNTHESIS 2026-07-30, W2
verification 2026-07-31). The only legitimate remaining "S7" work is: (a) wire the adapter into a real
caller (ga-rentacar or whatever's next), (b) decide the journal's on-disk location (OQ-2), (c) eventually
test real concurrent writers (OQ-4/C5), and (d) reconcile the four stale docs listed in §5.4/§6 so the next
session doesn't repeat this exact confusion.
