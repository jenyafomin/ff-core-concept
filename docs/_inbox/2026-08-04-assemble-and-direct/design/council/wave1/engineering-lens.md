---
node_type: analysis
lens: engineering
title: "Council wave 1 — Engineering lens (code reality, dependencies, migration cost)"
status: draft
date: 2026-08-04
owner: jenya.stasik@gmail.com
topic: assemble-and-direct
related:
  - ../../00-fact-base.synthesis.md
  - ../../../census/05-code-reality.census.md
  - ../../../census/01-brain-kernel.census.md
  - ../../../census/03-agent-system.census.md
  - ../../../../../00-states/05-assemble-and-direct/council-brief.md
  - ../../../../../00-states/05-assemble-and-direct/state.md
---

# Engineering lens — council wave 1

## Method
Read the 6 briefed docs. Ran 2 cheap verification greps against `packages/` to spot-check the two claims
that matter most for ordering (durable-adoption, PEP-bypass in S-B). Did not re-run the test suites, did
not read `dist/`. Results below.

## Verified-live (today, HEAD) facts, with anchors

1. **MemoryStore, not durable-fs, is what production modules import.**
   `grep -rl "MemoryStore" packages/ingest-rentacar/src packages/rental-balance/src` →
   `packages/ingest-rentacar/src/predicates.ts`, `packages/rental-balance/src/surface/cli.ts`.
   `grep -rl "durable-runner|DurableRunner"` on the same two trees → **zero hits**.
   Confirms fact-base truth #1 independently: S7 durable store is sealed but unconsumed.

2. **`customer-lens.ts` bypasses `resolve()` — PEP is opt-in, not a door, in the one place that matters
   most for S-B.**
   `grep -rn "resolve(" packages/ingest-rentacar/src/lens` → **zero hits**.
   `grep -rn "graph.byId" packages/ingest-rentacar/src/lens/customer-lens.ts` → 4 direct hits (lines 77,
   86, 98, 111): `graph.byId.get(...)` called straight, no capability check in between.
   This means the strawman's S-B description ("M2/M3 через PEP+same-as") describes an ASPIRATION, not
   the current M2. Current M2 is real code, is green (32/32 per census 05), and bypasses PEP entirely for
   its most-used read path. Fixing this is not "add M3 on top of M2," it is **retrofit into shipped code**.

3. **Contract `brain↔agents` is 17 lines total.**
   `find docs/02-project/core/03-contract -type f | xargs wc -l` → `17 docs/.../03-contract/INDEX.md`.
   Confirms census 03: header only, no rule has ever been written down, unchanged since 2026-07-06.

4. **The one working counter-example already exists in code and is not being harvested.**
   `packages/rental-balance/src/agent/balance-observer.ts` (census 03/05): reads through `resolve()`,
   computes, writes an `observation` act back. This is the ONLY agent in the codebase and the only place
   the brain↔agents contract is actually enforced — in code, not in the empty contract doc.

## Q1 — Is the split correct, and what order is right engineering-wise?

The 4-way split (S-A/B/C/D) is a reasonable **content** partition but it is **not a clean dependency
partition** — S-A's "close canon lies + connect durable to life" bucket actually contains two
engineering-orthogonal fixes that get conflated:

- **Fix-α: PEP-mandatory-door.** Access control. Store-agnostic — `resolve.ts` operates over the `Graph`
  model regardless of which `StorePort` backs it (`adapters/store-memory.ts` and
  `adapters/store-durable-fs.ts` both implement the same interface, proven bit-for-bit-equal by
  ADR-0008 §2 rebuild guarantee per census 05). Fixing `customer-lens.ts` to route through `resolve()`
  needs **zero durable-store work**. It DOES need touching `packages/ingest-rentacar/src/lens/*`, i.e.
  S-B's code.
- **Fix-β: durable-adoption.** Persistence. Swapping `MemoryStore` → `store-durable-fs` in
  `rental-balance/src/surface/cli.ts` and ingest-rentacar's entrypoints. Mechanical, but untested in
  combination with domain write-paths — durable-runner today is only exercised by the engine's own
  crash-tests (durable-runner.test.ts, crash-mid-turn.test.ts), never composed with `same-as-writer` or
  `balance-observer`.

**These two do not block each other technically.** But they should NOT run in the opposite order from
what the strawman implies. Concretely:

- **Fix-α (PEP-door) should land before Fix-β (durable-adoption).** Reason: if you wire durable storage
  onto a write path that still bypasses PEP, you have durability-tested the WRONG path — you'll get a
  green crash-test suite that proves nothing about the access-control invariant the whole kernel is
  built to guarantee (I-1..I-14, `00-kernel/invariants.md`). Testing order should match trust order:
  correctness of the gate first, durability of what passes through the gate second.
- **"Connect durable to life" is NOT a hard prerequisite for S-B's PEP fix** — it is a hard prerequisite
  for calling S-B "durable," which is a different, later claim.

So: my ranked answer to "is durable-adoption a prerequisite for S-B" is **no for the PEP fix, yes for the
durability claim** — and the strawman doesn't distinguish these, which will cause the council to either
over-sequence (block S-B entirely on S-A) or under-sequence (ship "M2 done" with PEP still bypassed).

## Q2 — Standalone states vs sub-items; strict sequence vs parallel

Recommend splitting differently from the strawman's 4 buckets, based on **actual file-level coupling**,
not topic:

| Item | Files touched | Coupling | Verdict |
|---|---|---|---|
| S-A canon-lies cleanup (access_event/system_telemetry/cost-tree/vitality doc corrections) | docs only, maybe `types.ts` comments | none | standalone, fully parallel, trivial |
| **Fix-α PEP-door** (customer-lens + any other direct `graph.byId` bypass) | `packages/ingest-rentacar/src/lens/*` | **shared with S-B** | joint S-A/S-B sub-item, same PR/team — NOT separable by topic label |
| **Fix-β durable-adoption** | `rental-balance/src/surface/cli.ts`, ingest-rentacar entrypoints | depends on Fix-α landing first (see Q1) | sequenced after Fix-α, otherwise standalone |
| S-B M2/M3 continuation (same-as-aware lens, AC5) | `packages/ingest-rentacar/src/lens/*` | same files as Fix-α | must be same team/sequence as Fix-α, not two competing PRs on one file |
| S-C1 contract-fill (in-repo) | `docs/02-project/core/03-contract/`, possibly extracting pattern from `balance-observer.ts` | none on S-A/S-B code | standalone, parallel-safe; cheapest win is "document what balance-observer already proves," not design-from-scratch |
| S-C2 gateway bugs (dup, restart, OQ-4 outbox) | external repo `TOOLS/agents-manager`, zero FF `packages/` files | **zero code coupling to anything else in this plan** | fully standalone, different codebase, different team, can start today |
| S-D pult→graph | `docs/00-states/`, `docs/_log/` | zero code coupling | fully standalone, parallel-safe |

**Parallel-safe set (no file overlap, can run concurrently without stepping on each other):**
S-A(canon-cleanup) ∥ S-C1 ∥ S-C2 ∥ S-D — four different teams, four different file trees, safe today.

**NOT parallel-safe:** Fix-α and S-B's M2/M3 continuation touch the same files
(`ingest-rentacar/src/lens/*`) — these must be ONE team/sequence, not split across S-A and S-B as the
strawman's labels suggest. Fix-β should wait on Fix-α (same reasoning as Q1).

## Q3 — LOSE-NOTHING conversion of `_log`/STATE.md → graph (engineering feasibility only)

Feasibility is **high and the tooling already exists** — this would be dogfooding, not new build:
`packages/core/src/store.ts` (`FileNodeStore`) already does CRUD over `<root>/nodes/<id>.md` with
gray-matter frontmatter + zod schema, loads the full directory into memory ("personal-scale, no
index/db" per census 05). `_log/` is 334 files / 4.1M (fact-base line 43) — trivially inside that budget.
Converting STATE.md's RESUME-stack entries into FFNode records is mechanically the same operation
`FileNodeStore` already supports; no new engine code required, just a migration script.

**One real engineering risk for LOSE-NOTHING specifically:** `_log/` is **gitignored** (fact-base line
45, confirmed by census 03 table). Git's safety net (the basis of `git-working-tree-safety.md`'s
guarantees) does not cover gitignored content. A buggy migration script touching `_log/` in place has no
git-level undo. Concrete mitigation: snapshot/copy `_log/` to a tracked or backed-up location BEFORE any
conversion script runs, since "LOSE-NOTHING" for this specific tree cannot rely on git alone the way it
can for `docs/00-states/` (which IS tracked).

## Q5 — Blind spot: engineering reality this picture is not seeing

**Top pick — untested identity-critical guard about to be inherited by durable-adoption.**
`packages/engine/src/core/predicates.ts:78` — `LOCKED_MANY_PREDICATES = {'same-as'}`, the guard against
`many→one` narrowing on replay, is the ONE mechanism protecting identity integrity across a
rebuild-from-journal. Census 05 states it plainly: "guard формально существует, но 0 не-тестовых
вызовов" — it has never been exercised by real write traffic, only by its own unit test. The moment
Fix-β (durable-adoption) puts `same-as-writer` (S-B, Тождество) through durable-fs's
rebuild-from-journal path for the first time, this exact guard is where a silent identity-corruption bug
would hide, and nothing in the strawman's S-A/S-B/S-C plans names this specific interaction as a test
gate. This is a hidden coupling between "S-A durable-adoption" and "S-B same-as" that the 4-bucket split
makes invisible, because each bucket owns a different half of the interaction and neither owner is
positioned to see the seam.

**Second — S-B's "green" is retrofit-green, not additive-green**, already covered in Q1: the plan reads
as "M2 is solid, add M3 on top" when code shows M2's flagship read path (`customer-lens`) never calls
`resolve()`. Budgeting S-B as forward-only work under-costs it; some of what looks like "next milestone"
is actually "undo and redo the last milestone correctly."

**Third — dist/src drift, flagged but not closed.** Census 05's own "Дыры карты" admits `dist/` was
"не читан построчно" and cites (via `02-ga-rentacar.census.md`, not in my read set) that ingest-rentacar
"в какой-то момент тянул устаревший `dist/engine`, что маскировало CRITICAL-регресс" — i.e. this exact
failure mode already happened once. None of S-A/B/C/D as scoped propose a `dist`↔`src` parity check as a
gate condition. All the green numbers this whole council is reasoning from (92/32/14/9 tests) are
src-level counts; if any prod entrypoint is still resolving a stale `dist/`, "green" is measuring the
wrong artifact.

## VOTE-ORDER

1. **S-A (split: canon-cleanup now, PEP-door fix joint-with-S-B before durable-adoption)** — unblocks
   trustworthy testing of everything downstream; PEP-door is cheap and store-agnostic, should not wait.
2. **S-B (PEP-door retrofit + M2/M3 continuation, same team as Fix-α)** — this is where the actual
   product value ("agent with memory on real data") lives, but it cannot be called done until Fix-α lands
   in the same files.
3. **S-C (split C1 in-repo ∥ C2 gateway, both fully parallel to 1&2)** — zero code coupling to S-A/S-B,
   so it doesn't need to wait, but it also isn't gating anything else; rank 3 reflects "do concurrently,
   not urgently sequenced," not "unimportant."
4. **S-D (pult→graph)** — zero code coupling to any of the above; purely a documentation/process
   restructure. Lowest engineering urgency because nothing downstream depends on it technically — that
   is a claim about blocking, not about value.

## SPLIT

Standalone states: S-A(canon-cleanup), S-C1(contract), S-C2(gateway bugs), S-D(pult→graph).
Sub-item / joint: Fix-α(PEP-door) is a sub-item that must be co-owned by S-A and S-B, filed under
whichever state owns `ingest-rentacar/src/lens/*` — recommend filing it under S-B with an S-A cross-link,
since it's S-B's shipped code being retrofitted. Fix-β(durable-adoption) is a sub-item of S-A, sequenced
after Fix-α.

## EDGES (hard technical dependencies)

- Fix-α (PEP-door) **must precede** Fix-β (durable-adoption) — testing durability of a bypassed path is
  wasted signal (Q1).
- Fix-α and S-B M2/M3-continuation **share files** (`ingest-rentacar/src/lens/*`) — must be same
  sequence/team, not split across two states running in parallel (would produce merge conflicts on the
  exact function that's the whole point).
- Fix-β (durable-adoption) **should not proceed** until `same-as`'s `LOCKED_MANY_PREDICATES` guard
  (`predicates.ts:78`) has at least one non-test exercise against real replay — otherwise durable-adoption
  ships an untested interaction as if it were covered by the engine's 92/92 green.
- S-C1 ∥ S-C2 ∥ S-D ∥ S-A(canon-cleanup) — all mutually safe, zero file overlap, confirmed by path
  inspection above.
- durable-adoption does **not** require S-C (agent/contract) or S-D (process) — no shared files.

## TOP-ENG-RISK

The `same-as` cardinality guard (`predicates.ts:78`) is identity-critical, has zero non-test call sites
today, and is directly in the blast radius of the first cross-cutting move this whole plan wants to make
(durable-adoption touching S-B's dedup writer). If the council sequences durable-adoption without naming
this specific interaction as a required test, the plan's biggest "green" claim (durable store works) and
its biggest identity claim (same-as dedup works) will have been validated separately but never together —
exactly the shape of bug that survives to production unnoticed.

## BLIND-SPOT

See Q5 above — condensed: (1) untested same-as/durable interaction, (2) S-B's forward-looking budget
doesn't price in that M2's flagship path needs retrofitting, not just extending, (3) dist/src drift
already caused one CRITICAL-regression-masking incident per census cross-reference and no gate closes it.

## LIKELY-DISAGREEMENT

- **Value/risk lens will likely rank S-C2 (gateway dup/restart bugs) higher than my #3**, because those
  bugs cause visible, recurring pain (documented as "regular," global workaround rule already exists:
  `orchestration-sync-under-gateway.md`) even though they're technically fully decoupled from S-A/S-B.
  My ranking is about **blocking**, not about **pain** — I'd expect to concede "do it early" while
  holding firm that "early" ≠ "gates S-A/S-B," since the file-level evidence for zero coupling is
  unambiguous (different repo entirely).
- **Process lens will likely argue S-D should run first** ("fix the pult so the rest of the work is
  trackable"). I'd push back only on the causality claim: S-D has zero technical dependency on or from
  S-A/B/C — it can start on day one in parallel, but "should exist before we start" is a discipline
  argument, not an engineering blocking argument, and I'd ask the process lens to be explicit about which
  claim they're making.
- **Someone may propose durable-adoption (Fix-β) before the PEP-door fix (Fix-α)**, reasoning "S7 is the
  one thing that's actually green, capitalize on it now." I'd contest this directly with the argument in
  Q1: durability-testing a path that bypasses the kernel's own access-control invariant produces a green
  suite that proves the wrong thing.
