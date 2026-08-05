---
node_type: analysis
lens: risk
date: 2026-08-04
status: draft
owner: jenya.stasik@gmail.com
topic: assemble-and-direct
role: council-advisor-red-team
related:
  - ../../00-fact-base.synthesis.md
  - ../../../census/02-ga-rentacar.census.md
  - ../../../census/03-agent-system.census.md
  - ../../../census/04-process-layer.census.md
  - ../../../census/05-code-reality.census.md
  - ../../../../../00-states/05-assemble-and-direct/council-brief.md
  - ../../../../../00-states/05-assemble-and-direct/state.md
---

# Council wave 1 — RISK / ADVERSARIAL lens

> Advisor role: red team. I do not propose the plan; I stress-test the strawman (S-A/S-B/S-C/S-D) and answer
> the 5 brief questions from a pure risk-reduction angle. Every claim below is anchored to a file/line from
> the census docs — I did not re-derive facts, I re-read them adversarially.

## Frame: what counts as "bleeding" here

Not all risk is equal. I distinguish three classes, because the strawman mixes them without saying so:

1. **Active data-corruption risk** — wrong state can already be written today, on a system treated as having
   a real tenant (ga-rentacar). Gets *worse* the longer it runs and the more writers/load stack on top.
2. **Operational-loss risk** — work/messages lost due to infra bugs (gateway dup/restart). Annoying, has a
   documented workaround, bounded blast radius per incident.
3. **Irreversible-deletion risk** — a cleanup/reorg action that destroys something that cannot be recreated
   (untracked files, config bindings). Zero urgency until someone acts; then instantly catastrophic.

The strawman's S-A/S-B/S-C/S-D split does not separate these, and that's the first crack: S-A bundles a
class-1 action ("connect durable to life") with a class-0 cosmetic action ("close canon lies: Vitality=0")
as if they carried the same risk. They don't.

## Q1 — Is the split right? What order minimizes risk? Which "green" is fake and dangerous to build on?

**FAKE-GREEN #1 — durable-store S7.** `census/05-code-reality.census.md:40,63` and
`census/02-ga-rentacar.census.md:55` agree: S7 (`adapters/store-durable-fs.ts`) is real, tested across an
actual OS-process boundary (spawn→SIGKILL→reboot), fsync-before-`ok`, PID-lock reclaim — genuinely solid
engineering. But **zero production modules run on it**. Every M1/M2/P1 slice (`ingest-rentacar`,
`rental-balance`) lives on `MemoryStore`. "S7-ядро запечатано" (STATE.md RESUME block, per
`census/04-process-layer.census.md:47`) reads as "done," but what's actually proven is "durability works in
isolation," not "durability works under this app's real write patterns." Treating S7 as a finished
foundation to build the rest of S-A on is exactly the failure mode process theatre produces: a green badge
that measures the wrong thing.

**FAKE-GREEN #2 — engine 92/92 / M2 "slices" commit banner.** Two separate near-misses in the SAME wave:
(a) a content-hash dedup regression (P1) silently turned an owner re-merge into a no-op, undetected by the
"92/92" suite because `ingest-rentacar` was pinned to a stale `dist/` build of `engine`
(`census/02-ga-rentacar.census.md:78` — "урок про drift между src/dist"); (b) commit `a02f759` banners "M2
slices" while `census/02-ga-rentacar.census.md:47,70` shows the module's own spec gate (T3/AC5) is red — the
lens bypasses PEP and doesn't read `same-as`. Both are the same underlying disease: **the team has already,
twice in one wave, called something green when it wasn't**, and caught it only by manual adversarial review,
not by the test suite. That is a process signal, not a code signal: any "green" claim in this council's
inputs should be read as "green until independently re-checked," not as ground truth. This directly
undermines the fact-base itself (see BLIND-SPOT below).

**Order that minimizes risk, not the strawman's order:** the four S-B "live risks" (R2/R3 PEP-bypass +
same-as, F-3 fail-open no-op, GAP-3(a) guard never called) are not a sub-bullet of a separate track — they
are **blocking prerequisites for S-A's "connect durable to life" sub-step**. Durable storage's entire value
proposition is that nothing is lost — but per `census/05:63`, it also **never compacts** ("append-only
forever, no retention/rotation — `oq-7-journal-retention.question.md` open"). That cuts both ways: routing
real ga-rentacar traffic onto durable-runner *before* R2/R3/F-3/GAP-3(a) are closed doesn't just risk a bug —
it risks **permanently, unrecoverably journaling the bug**, with no rollback path, because there is no
compaction and no attempt-at-erasure mechanism (see erasure.ts, Q5 below) to unwind it. In-memory corruption
today is bounded by "restart the process." Durable corruption tomorrow is bounded by nothing.

So: **S-B's risk-closure must run before S-A's durable-adoption sub-step**, even though the strawman puts
them in separate, parallelizable tracks. That's a real dependency the split hides.

**Ranked, risk-reduction order (not value order):**
1. **S-B risk-closure** (R2/R3, F-3 wiring, GAP-3(a) guard) — this is where data already resembling
   production is at stake today (`census/02:24-27`: ~2000-2700 real customers, 15-25% dupe rate).
2. **S-A, split in two:** "close canon lies" (cosmetic, do any time) is safe now; "connect durable to life"
   must wait on (1).
3. **S-C** — fix the two gateway bugs (bounded, mitigated by existing sync-only workaround), but **do not
   grow agent count** until (1) is done — see E3 below.
4. **S-D** — no runtime bleeding, but see Q4: irreversible-loss risk means "clean" ≠ "safe to do now."

## Q2 — Standalone vs sub-item, from "what gets dropped/forgotten"

The process census gives a direct, damning precedent: 4 of 5 existing `00-states/0N-*/state.md` tracks
carry `status: active` in frontmatter while being frozen since 07-19…07-25
(`census/04-process-layer.census.md:53`) — the pattern in this exact project is that **anything folded in as
a sub-item of a bigger track rots silently and nobody notices because the parent still claims "active."**
`ga-rentacar`, `durable-store-substrate`, and `picture-coverage` aren't even registered as `05-*/06-*` states
at all (`census/04:48`) — they exist only as prose references inside the linear STATE.md stack.

Given that precedent, anything I'd call standalone-or-die:
- **The 5 owner-decision forks** (F-3 fail-open/closed, F-4 join-key, F-5 approval, D2 timeliness trigger,
  values arbitration) currently live in `_inbox/` — a WORSE location than a sub-bullet, since `_inbox/` is
  explicitly staging, not a home. These are single points of correctness/trust failure (F-3: whether a
  *future* writer corrupts homes; F-4: whether money gets attached to the wrong order). They must become
  first-class, gated, standalone items with their own `state.md`, or they will join the 07-19 graveyard.
- **The GAP-3(a) guard-wiring** and **R2/R3 PEP/same-as fix** — these read like "implementation detail of
  S-B" but are exactly the kind of item that gets silently deprioritized once M2 is *perceived* as done
  (it already was, once, per the commit banner). Make them explicit, named, checked-off items — not prose
  inside a risks table that a future session skims past.
- Conversely, **S-D's reorg mechanics** (STATE.md→graph-of-branches) can legitimately be a sub-item of
  process work generally — it's not itself risk-bearing to leave half-done, unlike the items above.

## Q3 — `_log/` → graph conversion: what's actually at risk of being lost

`census/04-process-layer.census.md:32,62-64`: **334 files, 4.1M, 42 dated session folders, and it is
gitignored (`**/_log/` in `.gitignore`).** This is stated almost in passing in the fact-base ("то есть весь
этот массив НЕ в git, живёт только на диске") but its consequence is not spelled out anywhere in the brief,
and it should be: **the global safety net this project relies on for destructive operations —
`~/.claude/rules/git-working-tree-safety.md` ("git stash -u или временный коммит/ветку — чтобы откат был
возможен")— does not apply to `_log/` at all.** Stash, branch checkpoints, `git log` archaeology, `git
reflog` — none of it recovers a deleted or overwritten file here, because it was never tracked. A single
`rm -rf`, a careless `mv` during "graph-of-branches" migration, a disk-cleanup script, or even a laptop
migration silently drops this corpus with zero recoverability. No backup mechanism is mentioned anywhere in
the five census docs.

The fact-base's own justification for treating this as low-risk ("истина — то, что синтезировано и вынесено
в постоянный дом... эфемерка — сырьё советов, уже одноразовое," `census/04:64`) is an **assessment, not a
verified audit**. Nobody has actually cross-checked all 334 files against their claimed downstream
promotion targets — the census itself hedges this as a judgment call, sampled by folder name/date, not
read file-by-file (`census/04:18,43`: "не читан целиком... оценка по датам/структуре"). Converting/pruning
`_log/` on the strength of an unverified assessment is how you lose the one thing LOSE-NOTHING (a named
project principle, `state.md:56`) exists to prevent.

**Minimum bar before any `_log/` compaction:** (a) a real per-file promotion audit (not folder-level
sampling) confirming each file's content exists in a permanent home or is genuinely disposable raw agent
scratch; (b) a one-time git-tracked snapshot/archive of the corpus (even a single tarball committed once)
before any deletion, specifically because untracked-and-gitignored means no safety net exists today.

## Q4 — Cleaning S-D's mess without breaking live things: the danger

Two concrete hazards nobody in the fact-base names:

1. **External path bindings.** Per project `CLAUDE.md`, Telegram gateway topics bind to project folders via
   `.gateway/conversations/<chatId>/<threadId>/config.json` → `{"cwd": "/absolute/path"}`. None of the five
   censuses enumerate these config files. If S-D's "graph of branches" reorg renames or moves
   `docs/03-projects/ga-rentacar/` or any `00-states/0N-*/` path (which is the explicit target — see
   `state.md:59-66`, "раскидать бардак... незаведённые ветки"), any live topic still pointing at the old
   path silently starts working against a stale/missing folder — no error, no test catches this, because
   these bindings live entirely outside `docs/` and outside git-diff review.
2. **The working tree is already dirty, mid-reorg, on this exact branch.** The git status at the top of this
   session shows a large uncommitted diff already sitting in `docs/03-projects/ga-rentacar/` and
   `docs/_inbox/` (multiple `M`/`A`/`AM` entries) on branch `refactor-tree`. Per the global
   `git-working-tree-safety.md` rule, this is precisely the "grey area" that rule exists to stop: no
   destructive move/rename/merge should touch this tree without a checkpoint commit first, and diagnostic
   (`git status`) must NOT be chained with the destructive step. S-D executing a "clean the mess" pass on an
   already-dirty, already-mid-migration tree is the exact scenario the incident that produced that rule
   (`2026-07-26-...-overwrote-uncommitted-src.md`) came from.

## Q5 — Blind spot: the risk nobody in this picture is naming

**Real PII, no working erasure, and a fail-open trust barrier — treated as a "design phase" non-issue.**
`census/02-ga-rentacar.census.md:50` grounds real numbers: ~2000-2700 real customers, 15-25% duplicate rate,
sourced from live Sheets data — this is not synthetic test data, it is (or is adjacent to) real people's
information already flowing through ingest. Meanwhile `census/05-code-reality.census.md:38,75`:
`erasure.ts` is explicitly commented **"NOT the feature"** — it proves immutable-meta and erasable-payload
*can* be separated in principle, but hard-erase (the actual right-to-be-forgotten mechanism) does not exist.
`PayloadStore`, which is where PII payloads actually live, is flagged in `census/02:94` as "заведомая слепая
зона" — not even read by the reviewing pair this session. Layer this on top of F-3's fail-open barrier
(any future writer that omits `domain` gets a free pass, `F-3-one-home-and-homeregistry.decision.md:21-24`)
and R2 (customer-lens doesn't resolve `same-as`, so a duplicate-customer cluster can leak orders across what
should be a single identity boundary) — and you have a system already handling real customer PII with (a)
no verified consent-scoped deletion, (b) a trust barrier that's structurally off by default, (c) an identity
layer that can misattribute records across people. None of the five census docs, the fact-base synthesis, or
the council brief's 5 questions elevate this as a cross-cutting item — it surfaces only as scattered
one-line asides ("шапке риск 1 критика", "заведомая слепая зона"). If this project is still "design phase"
in its own self-description while real customer data already moves through it, that self-description is
itself a risk: it grants permission to defer exactly the safeguards (erasure, PEP-as-mandatory-door,
identity resolution) that matter most once data is real. This deserves the same standalone-fork treatment as
F-3/F-4/F-5, not a background assumption.

**Secondary blind spot:** the fact-base that this council is about to act on is **known to already be
stale relative to HEAD within the same day it was written** (`census/05-code-reality.census.md:56`: STATE.md
says engine 77/77, actual HEAD is 92/92, both written 2026-08-04). No verification/freshness gate is
proposed before Phase 2 materializes a plan from these documents. A plan built on a snapshot that's
demonstrably out of date within hours risks sequencing work against facts that already changed by the time
execution starts.

## Edges (risk-driven ordering constraints)

- **E1:** S-B risk-closure (R2/R3, F-3 wiring, GAP-3(a)) → precedes → S-A's "connect durable to life"
  sub-step. Rationale: durable = permanent + non-compacting; don't durably commit an unfixed bug.
- **E2:** S-C "grow agent count" → blocked-by → F-3 real wiring. Rationale: F-3's own adversarial self-check
  says the fail-open default is safe *only* because there is exactly one writer today that happens to stamp
  `domain` correctly (`F-3-one-home-and-homeregistry.decision.md:44-51`). A new agent is precisely the
  "future writer that omits domain" scenario the doc flags as the real risk case.
- **E3:** Values arbitration ADR → should precede or run parallel with → D2 timeliness (T5) design, not
  block F-3/F-4 wiring (those are independently safe to proceed per F-3's own self-check).
- **E4:** S-D "clean the mess" (moves/renames of project doc paths) → blocked-by → an audit of
  `.gateway/conversations/*/config.json` `cwd` bindings, which none of the five censuses enumerate.
- **E5:** Any `_log/` compaction/archival → blocked-by → a per-file promotion audit + one git-tracked
  snapshot (see Q3). Folder-level sampling is not sufficient given LOSE-NOTHING is a stated project
  principle.
- **E6:** Erasure/PII/PEP-mandatory-door work (Q5) → should be elevated to a standalone fork, ranked
  alongside F-3/F-4/F-5, not left implicit inside S-A's "close canon lies."

## What I looked for but didn't find problems with

- The durable-store engineering itself (fsync-before-ok, crash-mid-turn, PID-lock reclaim) — genuinely
  tested across a real process boundary, not just unit-mocked. The code is solid; the *adoption sequencing*
  is the risk, not the store.
- The F-3 decision doc's own adversarial self-check (`F-3-one-home-and-homeregistry.decision.md:44-51`) —
  it already asks "does this need the owner's call first?" and gives a grounded, code-verified "no" for the
  wiring sub-step specifically. That's good defensive documentation practice; I have no quarrel with its
  reasoning, only with making sure S-C doesn't outrun it.
