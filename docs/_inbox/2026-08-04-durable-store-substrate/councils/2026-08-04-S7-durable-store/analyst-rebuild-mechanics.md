---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-04
node_type: analysis
title: "S7 durable StorePort — rebuild mechanics, cache, idempotency, RAM/disk consistency, act format (analyst deep-dive)"
related:
  - ../../architecture/ADR/ADR-0008-log-and-graph-cqrs.md
  - ../../architecture/ADR/ADR-0006-persistence-as-policy.md
  - ../../02-project/core/00-kernel/durable-storeport.design.md
  - ../../02-project/core/00-kernel/invariants.md
  - ../../02-project/core/00-kernel/analyses/invariants-enforcement/02-design-forks-a-general-and-c-home.design.md
  - ../../_log/2026-07-26-ff-one-system-vision/post-M0-directions/T2-agents-manager-reconciliation.md
  - ../../_log/2026-08-01-docs-as-memory-and-tidy/HANDOFF.md
  - ../2026-08-01-sync-adr0006/ANALYSIS.md
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/adapters/store-durable-fs.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/engine.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/core/types.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/src/core/predicates.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/test/survive-turn.test.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/test/durable-reboot-matrix.test.ts
---

# S7 durable StorePort — rebuild mechanics (analyst deep-dive)

## 0. Headline fact-check (the task premise is stale)

The task frames S7 as an unsolved gap ("граф-субстрат сейчас RAM-only"). **This is no longer true in code.**
`packages/engine/src/adapters/store-durable-fs.ts` (`DurableFsStore`) implements a real, tested,
cross-process-durable sync `StorePort`: JSONL journal on disk, `fsyncSync` before `writeAct` returns,
`hydrateFromDisk()` on construction, advisory PID-lock single-writer guard. Three real (spawn-a-child-OS-
process) tests prove it: `survive-turn.test.ts` (AC-2: act written by P1 read by P2) and
`durable-reboot-matrix.test.ts` (Test 2 = idempotent re-ingest across reboot / C4; Test 3 = bit-for-bit
rebuild-from-journal across reboot / C3). Commit history: `b881212 feat(engine): seal GAP 1 — durable
StorePort (survive-turn)`, followed by `GAP 2` (predicates-as-data) and `GAP 3` (write-plane invariants,
`fe4ba3d`/`30a83dc`, both already "marked realized green" per the repo's own recent commit log).

**Conflict to name explicitly (per instruction "конфликты называй явно"):** `docs/00-states/STATE.md:19`
still reads "🎯 Наивысшая ценность след. хода = S7 (durable StorePort) — граф сейчас RAM-only" — this line
is **stale relative to code reality** and should be corrected in the next STATE.md pass (not something I'm
authorized to silently rewrite here — doc-tree discipline: describe, don't move without "строй"). Also
`durable-storeport.design.md` (status: draft, dated 2026-07-31) frames OQ-1 (sync vs async) as "⏳ Решает
владелец. До ответа durable-адаптер НЕ пишется в код" — but the adapter **was** written, implementing
branch (A) sync+durable-fs. Either the owner decided (A) off-the-record between 2026-07-31 and the GAP1 seal
commit, or the code shipped ahead of the formal gate. Either way the design doc's `Status: draft` and open
OQ-1 no longer match the shipped reality and should be reconciled (mark OQ-1 resolved→(A), flip Status).

Given this, my job below is **not** "design rebuild from scratch" but **stress-test what's actually built**
against the 5 questions the task poses, and name the real remaining gaps precisely — which are narrower and
more useful than the task's framing suggested.

---

## 1. Rebuild model: full replay vs snapshot+incremental

**What's built (M0 floor):** pure full replay, always. `DurableFsStore.hydrateFromDisk()` reads the entire
`journal.jsonl`, `JSON.parse`s every line, and calls `project(this.journal, this.registry)` — a full
re-fold over ALL acts — on **every single process construction**. There is no snapshotting, no incremental
checkpoint, no "resume from N acts already folded." `writeAct()` does an *incremental* fold
(`foldInto(this.projection, act, registry)`) for the in-process read-model, but that incremental state is
never persisted — the next process boot discards it and re-derives from scratch via full replay.

**Cost at real volume — the actual cost driver is not "eventual size", it's replay-per-turn.** Because this
project's operating model is "every gateway turn = a fresh `claude -p --resume` process" (project CLAUDE.md,
confirmed by the T2 doc's `SdkRunner` analysis), a durable engine boots from disk **on every turn**, not
once a day. At ga-rentacar M2 scale (~4102 Order rows → low thousands of acts after dedup/latest-wins), full
JSON-parse-and-fold of a few-thousand-line file is sub-50ms — invisible. The real risk is **unbounded
act-kind growth**: `ActKind` includes `observation | access_event | agent_trace | system_telemetry` in
addition to `domain_event`, and none of these are pruned — `invariants.md` I-4's own pending carve-out
(`retention-prunability` for non-canonical act kinds) is explicitly **NOT ratified yet** ("ждёт закрытия
KQ-8"). So today, every trace/telemetry/observation act accumulates forever in the same journal that gets
fully replayed on every turn. At 10³–10⁴ acts this is noise; the failure mode is silent linear cost growth
that only becomes visible once trace/telemetry volume crosses ~10⁴–10⁵ lines — exactly the `Q-7 killer-run`
threshold ADR-0006's own validation plan names for a *different* storage path (PG), but nothing analogous is
sized for the file-journal replay path.

**When to snapshot / how to invalidate (design, not yet built):** ADR-0006 Consequences already commits to
the honest framing — "снапшоты не бесплатны... периодические snapshots как производная оптимизация ПОВЕРХ
лога, не замена ему" — and I-6 requires any projection to carry `projectionId/projectionVersion` +
`sourceId/sourceVersion`. Composing these: a snapshot is a materialized `{projectionVersion, upToActSeq,
projection}` triple written **strictly behind** the journal head (never ahead — a crash between the last
`writeAct` fsync and a snapshot write must leave the snapshot pointing at an older-but-valid state, never a
newer one) plus a **registry-marker** (see §5) so a snapshot taken under registry V1 is invalidated, not
silently reused, when booted under V2. Invalidation trigger = any change to `project()`'s code path or the
registry (bump `projectionVersion`); on mismatch, fall back to full replay from act 0. This isn't built and
doesn't need to be yet at current volume — but it is the correct next lever once boot-time replay cost is
actually measured and found to matter, not before (anti-ossification, ADR-0006 §Consequences).

---

## 2. Cache of "last changes" (owner's seed) — TTL / invalidation / per-process opt-in

This idea is **explicitly unproven, owner-seeded, not designed** — sourced verbatim from
`docs/_log/2026-08-01-docs-as-memory-and-tidy/HANDOFF.md:43`: *"Кэш: возможно полностью кэшировать
последние изменения; опционально/настраиваемо по процессам."* `T-SYNC ANALYSIS.md §2` gives it the only
formalization attempt so far: *"Само-обновляющийся кэш = уже паттерн current-state/grant-cache проекции
(пересобираема, помечается staleness). Формализовать «кэш» просто как ещё один opt-in read-model, НИКОГДА
не авторитетный."*

**What already exists that could be mistaken for this cache, and why it isn't the same thing.**
`DurableFsStore.projection` (an in-RAM `Map<string, EnvelopeNode>`) is *already* a cache of "current state
after folding" — but it is (a) per-process, rebuilt from zero on every boot, (b) never persisted
independently of the full journal, and (c) has no TTL concept — its lifetime is exactly the process
lifetime. Under "every turn = fresh process" this degenerates to "no cache across turns" — which is
precisely the durability gap S7 closed for *acts*, but the owner's cache idea is about *avoiding full
replay*, a different, not-yet-solved problem (see §1).

**Two distinct cache shapes hide inside the single word "кэш" — disambiguate before designing:**
1. **Cross-process replay-avoidance cache** = the snapshot from §1. Persisted, disk-resident, keyed by
   `projectionVersion`, read on boot instead of full replay when valid. This is a *correctness-preserving*
   optimization (falls back to full replay on any doubt).
2. **In-turn "recent writes" hot-cache** (closer to the owner's literal words "последние изменения") — e.g.
   last-N acts per `source_ref`/`actor`/topic, kept warm so a topic-agent doesn't have to touch the full
   projection to answer "what did I just write." This is a *convenience* index, not a durability mechanism,
   and per ADR-0006 (e) it must carry a **staleness-marker** and never be read as authoritative — any
   consumer must be able to fall through to `resolve()`/the real projection.

**TTL/invalidation, composed from what's already ratified (not invented here):** neither cache shape gets a
wall-clock TTL in this codebase's existing vocabulary — invalidation is **event-driven, not time-driven**:
a cache is valid exactly as long as the journal it was derived from hasn't grown past the point it was
built from (compare act-count / last-seq, same mechanism a snapshot would use), or — for the hot-cache
shape — exactly as long as the same process's in-memory `foldInto` calls are the only writer (true today
under C5 single-writer-lock; false the instant a second concurrent writer or a long-lived background reader
exists).

**"Опционально/настраиваемо по процессам" — how this actually composes with what's ratified.** ADR-0006
(b) already establishes the exact mechanism this should ride: placement/behavior-as-policy-per-type, not a
global flag or hardcoded constant. A `sync-mode`-like policy field (T-SYNC's own proposed extension of
ADR-0006 §(b)) is the natural home for "does this process/topic keep a hot-cache or always cold-boot" — a
`policy`-node-declared setting, DB-first-only per ADR-0006 (g) (it borders access/behavior control), not a
per-call runtime heuristic (T-SYNC's fork #3 names exactly this risk: runtime/per-call source-of-truth
choice breaks the fork-discipline "wall held by the engine, not the author").

**Where staleness actually bites — the concrete risk, not a generality.** `hydrateFromDisk()` runs exactly
**once**, in the constructor. If a process ever lives across multiple turns (contradicts the stated
"every turn = fresh process" model, but the repo has a *documented, live* bug —
`docs/01-organization/process/bugs/gateway-agents-die-on-restart/` — precisely about processes not dying
cleanly on restart) that process's in-RAM projection silently diverges from disk the moment ANY other
process (which, per C5, can only be a *sequential* other writer, never concurrent) appends further acts.
There is no re-hydrate-on-read path today — `readNode`/`load` always serve the in-RAM `projection` from
whenever the constructor ran, never re-check disk. A durable *store* solves cross-turn durability; it does
not, by itself, solve *within-a-long-lived-process* staleness — that needs either "no long-lived processes"
(current de-facto invariant, fragile given the known gateway bug) or an explicit re-hydrate/watch step,
which does not exist and is not designed.

---

## 3. Idempotency and write integrity

**What's proven, in code, today:** `Engine.write()` dedups on `(source_ref, snapshotHash)` for
`domain_event` acts carrying a `Provenance` object (`isProjectable()` gate) — a byte-identical re-write is a
true no-op (`{ok:true, act: existing, dedup:true}`, log does not grow). `durable-reboot-matrix.test.ts` Test
2 proves this dedup check works **against the disk-rebuilt journal after a real process reboot**, not just
an in-memory array — the exact "false-green in one process" failure mode the repo's own W2 pass explicitly
warned about elsewhere is closed here by construction (real `spawnSync` child processes, nothing shared but
the store-dir).

**Atomicity of a single append:** `writeAct()` is `open('a') → writeSync(line) → fsyncSync(fd) → close`,
synchronous, no window where the in-RAM `Engine.write()` caller could observe success before the byte
disk-fsync completed. `C3` (append-only, torn-line-tolerant) is handled on the *read* side:
`hydrateFromDisk()` breaks its parse loop on the first `JSON.parse` failure, so a partial last line from a
mid-append kill is silently dropped, earlier lines intact. **Residual, named-not-solved risk:** this
correctness depends on the OS/filesystem actually treating a small `writeSync` as atomic-enough that a kill
mid-syscall produces either "nothing" or "a cleanly truncatable tail," never a corrupted-but-parseable *later*
line — true for ordinary local POSIX filesystems at the sizes involved here, not something the code
verifies or the docs claim to have proven against exotic/networked filesystems. Worth a one-line explicit
non-goal in the design doc rather than an implicit assumption.

**The real, unclosed gap: turn-level (multi-act) idempotency vs act-level idempotency.** `ADR-draft-0009`
(T2-agents-manager-reconciliation.md) is titled "turn-atomic, idempotent, crash-convergent write-back" and
its invariant test explicitly demands "exactly ONE act-batch exists in the engine for S" after a
crash-replay. But `Engine.write()`'s dedup guard operates **per act**, keyed on that single act's
`(source_ref, snapshotHash)` — there is no batch-level dedup. A turn that emits N acts (say, one
`domain_event` plus two `observation` acts) and crashes after committing all N, then gets replayed by the
gateway's `requeueRunning` (per T2 §1.2, confirmed as the actual, real, currently-unfixed bug in
agents-manager), will have its `domain_event` correctly no-op via the act-guard — but its `observation` acts
are **not projectable** (`isProjectable()` only recognizes `domain_event`), so they **never dedup** and will
be re-appended, duplicated, on every replay. **This is the single most concrete, verifiable idempotency gap
today**: the T2 design's "Act guard… lives entirely in the StorePort adapter" claim is true only for the
one projectable act per turn, not for the turn's full act-batch. Either (a) extend the dedup key to cover
non-`domain_event` acts too (e.g. `source_ref#slot` exactly as §2.4 of T2 already specifies but which is not
implemented anywhere in `engine.ts` today — only the single-act path exists), or (b) accept and document
that `observation`/`trace` duplication on crash-replay is a known, lower-severity residual (they're
already flagged retention-prunable in the pending I-4 carve-out, so a duplicate low-value observation is
cheaper to tolerate than a duplicate `domain_event` or duplicate Telegram egress) — but this is an owner
call, not something to silently assume either way.

**Egress-side outbox (the other half of T2's protocol): entirely unbuilt, out of this repo's scope, and the
actual near-term risk.** ADR-draft-0009 is still `status: draft`, never promoted to
`docs/architecture/ADR/ADR-0009-*`. Its egress-outbox guard lives in `agents-manager` (a different repo),
not `@ff/engine`. So today: the *engine's* half of "write survives a crash without duplication" is real and
tested; the *gateway's* half (derive-reply-from-committed-acts, send-at-most-once, `EGRESS_DELIVERED` flag)
does not exist yet. Per T2 §1.2's own documented finding, this is precisely the mechanism behind the
observed "dup-egress + dup-LLM" bug. Durable StorePort was a **necessary precondition** for closing that bug
(you cannot derive a replay-safe egress from acts that don't survive the crash) but is **not sufficient** —
closing the actual user-visible bug still requires work in agents-manager that has not started.

---

## 4. RAM↔disk consistency within and between turns

**Within one turn (one process, synchronous):** `Engine.write()` executes strictly: `admit()` →
`admitHome()` → in-RAM dedup check against `store.acts()` → `store.writeAct(act)` (disk fsync, plus an
*incremental* `foldInto` on the store's own `this.projection`) → `this.graph = load(this.store.load())`
(Engine's read-model rebuilt from the store's now-updated in-RAM projection, **not** a fresh disk read).
Because JS execution here is single-threaded and every step is synchronous, there is no window where the
Engine's `this.graph` reflects an act that isn't yet durable, nor a window where disk has an act the
in-process graph hasn't caught up to. This is correct by construction, not by careful sequencing that could
drift — worth stating positively since it's easy to under-trust.

**Between turns (process boundary), assuming the previous process actually exited:** `C2` boot-time
`hydrateFromDisk()` is the sync point, proven bit-for-bit by `durable-reboot-matrix.test.ts` Test 3. This
holds strictly *because* C5's single-writer lock is released on the old process's `exit` hook before the new
one's constructor runs (sequential, not concurrent, per the project's stated turn model).

**The two failure classes that actually threaten this, both real and named, neither solved by S7 alone:**
- **Multi-act turn crashes mid-batch** (see §3): each *act* is atomic, the *turn* is not. A crash between
  act 1 and act 2 of a 3-act turn leaves a durably-persisted **partial** batch; `rebuild-from-journal` on
  the next boot faithfully replays exactly that partial state (which is the *correct* behavior for
  act-level atomicity — I-3/I-4 hold) but it is **not** the turn's intended final state, and nothing in the
  current design names or closes this gap at the turn level. T2's state machine (`RECEIVED → RUNNING →
  ACTS_COMMITTED → EGRESS_DELIVERED → DONE`) implicitly treats `ACTS_COMMITTED` as one atomic transition;
  the engine gives you N independent atomic transitions instead. Whether that distinction matters depends on
  whether any turn is expected to emit >1 act that must succeed-or-fail together — worth confirming with the
  owner before it's assumed away.
- **Orphaned lock from a not-really-dead process.** `acquireLock()`'s stale-lock reclaim
  (`pidAlive(ownerPid)`) only fires when the PID is **provably dead** (`ESRCH`). A process that is *alive but
  hung* — exactly the failure mode the repo's own `gateway-agents-die-on-restart` bug describes elsewhere —
  will hold the lock indefinitely; every subsequent turn's `DurableFsStore` constructor throws
  `DurableStoreError` and **the whole engine refuses to start** until the stuck process is killed manually.
  `durable-storeport.design.md §5` explicitly disclaims responsibility for this class ("НЕ зависит от
  шлюза… Зависела бы от шлюза… это отдельный трек agents-manager, не свойство корня") — that's a reasonable
  scoping call, but it means **S7's own fail-closed lock is a new, concrete way the known gateway bug can
  now brick every subsequent turn**, where before (RAM-only, no lock) a hung process couldn't block a fresh
  one from starting cleanly. This is a genuine new coupling introduced by closing S7, worth flagging back to
  whoever owns the gateway-bug fix track, not just a "not our problem" boundary.

---

## 5. Act format for deterministic rebuild + future versions/branches (acts-as-git)

**Current frozen envelope** (`core/types.ts`): `id · actor · provenance(string | {source_ref, snapshotHash,
[k:string]:unknown}) · recordedAt(engine-assigned) · actKind(extensible enum) · edges · payloadRef? ·
payloadHash? · payload?`. This is proven sufficient for **same-registry** determinism (Test 3, bit-for-bit).

**The one concrete, verifiable determinism gap: registry evolution across a reboot is designed but not
wired.** `predicates.ts` ships `assertForwardMonotone(prev, next): Problem[]` — a pure guard against
`many→one` predicate-cardinality narrowing — and it's unit-tested in isolation
(`write-plane.test.ts`). But `DurableFsStore` never calls it: `hydrateFromDisk()`/`rebuild()` fold
unconditionally under whatever `registry` was passed to the constructor, with **no persisted record of what
registry the on-disk journal was last folded under**. The GAP-3(a) design doc itself names the intended fix
— *"The store owns persistence of the prior registry (preferred: an append-only `registry-marker` record in
the JSONL journal head)"* — but this is a **designed-not-shipped** piece: today, if process P2 boots the
same store-dir with a narrower registry than whatever P1 used, rebuild will silently reinterpret history
under the new registry with **zero refusal**, exactly the "silent collapse" class GAP-3(a) exists to catch
in-process. Cross-process, the guard is currently a no-op. This is the sharpest, most fixable concrete gap
in this whole analysis — small, additive (append one marker line, compare on boot), and already designed.

**Versions/branches on top (acts-as-git), without further envelope surgery:** the precedent already exists
and is proven cheap — GAP-3(c)'s `provenance.fact_kind`/`provenance.domain` fields were added **inside** the
already-open `Provenance` index signature (`[k:string]:unknown`) with **zero** top-level `Act` field
changes, following the same additive-only discipline as ADR-0006 (h)'s `validFrom/validTo` and ADR-0004
D1. A `provenance.branch?: string` label would very plausibly follow the identical lever. **But the honest
cost is not in the envelope — it's in the fold.** `project(acts, registry)` today folds **all** acts,
unconditionally, into **one** projection. Branch-awareness requires `project()` to become branch-**filtered**
(a new parameter/dimension), which is a `core/projection.ts` signature change, not a free envelope
addition — and it recursively reopens the registry-marker question **per branch** (does each branch carry
its own registry-evolution history, or one shared registry across all branches?). This is real, unscoped
system-architect-level cost that "the envelope is additive so branches are free" would wrongly hide. Flag
to system-architect before acts-as-git is treated as a thin layer on top of what exists.

---

## Risks discovered (severity)

- **H — turn/batch-level idempotency gap.** Only the single `domain_event` per turn dedups on crash-replay;
  co-emitted `observation`/other acts duplicate silently. Directly undercuts ADR-draft-0009's "exactly ONE
  act-batch" invariant claim. — file: `packages/engine/src/engine.ts:82-95`.
- **H — gateway-side egress-outbox (T2 guard 2) does not exist.** The user-visible dup-LLM/dup-egress bug
  T2 was written to close is only half-closed by S7; the other half is unstarted work in a different repo.
- **M — registry-marker not wired into the durable adapter.** Designed (GAP-3(a)) but not implemented;
  cross-process registry narrowing rebuilds silently instead of refusing. — file:
  `packages/engine/src/adapters/store-durable-fs.ts` (no `registry-marker` read/write anywhere).
- **M — S7's fail-closed single-writer lock is a new brick-the-engine surface** when composed with the
  already-known `gateway-agents-die-on-restart` bug (hung-not-dead process holds the lock forever).
- **L (today) / M (future) — unbounded journal growth with no retention policy** (KQ-8 still open;
  I-4's retention-prunability carve-out unratified) means full-replay-per-turn cost is currently invisible
  but has no ceiling mechanism in place yet.
- **L — canon/code staleness**: `STATE.md:19` and `durable-storeport.design.md`'s `Status: draft`/open OQ-1
  both describe S7 as unresolved/undecided; code shows it sealed. Low severity (doesn't block anything) but
  actively misleading for the next session's orientation.

## Recommendations

- → **builder** (small, additive, already designed): wire `assertForwardMonotone` + a journal-head
  `registry-marker` into `DurableFsStore.hydrateFromDisk()`/`rebuild()`, per GAP-3(a)'s own chosen option.
- → **system-architect**: decide turn/batch-level idempotency scope (extend dedup to non-projectable acts,
  or explicitly accept+document observation/trace duplication as low-severity residual) — this is an
  ADR-0009-promotion-blocking decision, not a coding detail.
- → **system-architect**: size the `project()` branch-filter cost explicitly before any acts-as-git work
  starts; don't inherit the "envelope is additive → branches are free" framing uncritically.
- → **doc-discipline / next session**: reconcile `STATE.md:19` and `durable-storeport.design.md` Status/OQ-1
  against the shipped GAP1/2/3 commits (description only here, not moved — owner "строй" required).
- → **owner**: confirm whether the "cache of last changes" seed means (1) a replay-avoidance snapshot, (2) a
  hot recent-writes index, or both — they have different designs and different urgency; T-SYNC's framing
  ("opt-in read-model, never authoritative") is a safe default for either, but scope must be picked before
  design starts.

## Unknowns remaining

- Whether any real M2/M3 turn actually emits >1 act per turn today (if not, the turn/batch-atomicity gap in
  §3/§4 is currently latent, not active — worth confirming against ga-rentacar's actual ingest code before
  prioritizing).
- Real act-volume growth rate for `observation`/`agent_trace`/`system_telemetry` kinds in practice — no
  measurement exists yet to know how soon full-replay-per-turn cost becomes felt.
- Whether the owner intends any process to ever live across multiple turns (contradicts "every turn = fresh
  process" but is exactly the shape the known gateway bug produces by accident) — this determines whether
  §2's within-process-staleness risk is theoretical or live.
