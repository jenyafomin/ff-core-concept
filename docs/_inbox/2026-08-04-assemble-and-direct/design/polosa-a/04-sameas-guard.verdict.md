---
node_type: analysis
title: "T-sameas-guard (CG-14) verdict — adversarial check of I4's finding"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-05
scope: project
related:
  - ./04-sameas-guard.finding.md
  - ../01-execution-plan.synthesis.md
  - ./00-coorch-framing.md
  - ../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../packages/engine/src/core/projection.ts
  - ../../../../../../packages/engine/src/core/erasure.ts
source:
  - packages/engine/src/core/predicates.ts
  - packages/engine/src/core/projection.ts
  - packages/engine/src/core/erasure.ts
  - packages/engine/src/adapters/store-durable-fs.ts
  - docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md
---

# T-sameas-guard (CG-14) verdict

## 1. Код-механика первой тавтологии — re-verified, holds
Read `predicates.ts` in full (119 lines) independently. Confirmed verbatim: `:49` `LOCKED_MANY_PREDICATES
= new Set(['same-as'])`; `:57` `if (LOCKED_MANY_PREDICATES.has(predicate)) return 'many'` — short-circuits
**before** `registry[predicate]` (`:58`) is ever read; `:84` `before === 'many' && after === 'one'` inside
`assertForwardMonotone`. Since `cardinalityOf('same-as', *)` is unconditionally `'many'` for every possible
`prev`/`next`, `after` can never be `'one'` for this predicate — the branch is dead code for `same-as` by
control flow alone, independent of any journal content. I4's mechanic is correct; no counter-path found.

## 2. Дословный precond плана — re-verified, holds
Grepped `01-execution-plan.synthesis.md` directly at `:83, :148, :235`. All three match I4's quotes
character-for-character (`:83` precond 3, `:148` D1.b enforcement bullet, `:235` R1 mitigation column).
Confirmed as a genuine 3-site echo, not invented.

## 3. ГЛАВНОЕ — the replacement assert is a SECOND-ORDER tautology as specified. REVISE is mandatory.

I4's own §E claims the new assert can't reach `cardinalityOf`/`assertForwardMonotone` — true, verified: its
inputs are two `Edge[]` snapshots, no `PredicateRegistry` parameter exists to route through. But "doesn't
call the old function" is not the same as "can fail on real data." I traced whether **anything** in the
engine can ever remove a `same-as` edge from a projected node's `edges` array, on any replay, through any
path — because that is the only way I4's before/after comparison could ever go red.

- `foldEdges` (`predicates.ts:98-119`) has exactly one edge-removal statement in the whole file:
  `result.splice(i, 1)` at `:108`, and it only runs inside the `cardinalityOf(...) === 'one'` branch
  (`:105`). That branch is **structurally unreachable for `same-as`** — the exact same lock from finding
  §A. So `foldEdges` itself can never drop a `same-as` edge.
- `foldInto` (`projection.ts:76-123`) confirms nodes are never deleted from the projection map — an
  `archived` act only flips `state.tombstone = 'archived'` (`:98`); `edges` still goes through the same
  `foldEdges` call (`:115`) regardless of tombstone status. Tombstoning a node (or its same-as counterpart)
  does **not** clear its edges array.
- `erasure.ts` explicitly puts `edges` in `IMMUTABLE_ACT_META` (`:29`, list includes `'edges'`) — the
  erasure seam is designed to **never touch edges**, only `payload`.
- `grep -rn "delete\|remove\|splice" packages/engine/src` (excluding tests) returns exactly one hit total:
  the same `predicates.ts:108` line above. No other edge-removal code exists anywhere in the engine.

Conclusion: given the current code, a `same-as` edge, once folded into any node's `edges` array, **cannot
be removed by any replay of any journal content** — not via cardinality (locked), not via tombstoning
(edges untouched), not via any other mechanism (none exists). This means: if the new assert is implemented
exactly as §C specifies — snapshot before/after a `project(acts, registry)`-style in-memory replay — it
will **always pass**, for the same structural reason as the old guard, one level removed. It is not a
"real-data replacement" for the tautology; it is a second tautology that merely swapped which function
supplies the unfalsifiable green.

**This is falsifiable, but only if anchored to the disk round-trip, not the pure in-memory reducer.** D1.b
is specifically about moving to `store-durable-fs.ts`'s meta-only + `payloadRef`/`payloadHash` journal
shape (`splitAct`/`redactAct`, `erasure.ts`) — a real risk surface exists there: a by-ref migration bug
that mis-scopes what counts as "erasable" could corrupt or drop the `edges` field **before** it ever
reaches `foldInto`/`foldEdges` (i.e., in journal serialization/deserialization, not in the pure reducer).
That corruption is invisible to any check that calls `project()` on an in-memory `Act[]` array directly —
it only shows up if the check goes through an actual write→disk→reboot→re-read cycle of
`StoreDurableFs` (its constructor re-folds the whole journal file, per `store-durable-fs.ts:15`). §C.2's
wording — "`rebuild-from-journal` (или эквивалент — реальный акт-поток, не синтетика)" — is ambiguous
enough that a compliant implementer could satisfy it with an in-memory `project()` call and stay green
100% of the time, defeating the entire point of precond 3.

**§F's two self-flagged risks are real but secondary, and one is factually stale:**
- Group definition (direct vs. transitive) — real ambiguity, but moot until the disk-round-trip gap above
  is closed: since edges can never be removed via the pure reducer either way, neither grouping choice can
  currently observe a collapse. Fix the round-trip gap first; the grouping choice only matters once the
  check is capable of going red at all.
- "Live node" undefined — **factually outdated**, not actually unknown. `projection.ts:49,98` shows a
  formal tombstone field already exists: `state.tombstone === 'archived'`. "Still live in snapshot B" can
  be defined precisely today as "node present in the projection map with `state.tombstone !== 'archived'`"
  — no new infrastructure needed for this part. The patch should use it instead of leaving it open.

## 4. Специфичность патча
§D's text ("must NOT call `cardinalityOf`/`assertForwardMonotone`") is specific enough to stop an
implementer from silently reverting to the registry check. It is **not** specific enough to stop an
implementer from satisfying the letter of precond 3 with an in-memory `project()` call that is, per §3
above, guaranteed green regardless of any real D1.b bug. The patch must name the disk round-trip
explicitly, or it ships a second unfalsifiable gate under a "real-data" label.

## Verdict: REVISE (mandatory, blocks harvest as currently drafted)

§A/§B (the diagnosis of the *original* tautology) are CONFIRMED — re-verified independently, holds exactly
as claimed. §C/§D (the *replacement*) is not yet a real-data check; it is a same-shape tautology unless
patched further.

**Обязательные правки before this lands in the plan (all three, on top of I4's existing patch text):**
1. **Anchor precond 3 to the disk round-trip, not the pure reducer.** Patch text must state explicitly that
   the before/after replay is a real `StoreDurableFs` boot cycle (write journal → construct new
   `StoreDurableFs` instance from that file → read its resulting projection) — not a direct in-memory
   `project(acts, registry)` call on an `Act[]` held in test memory. Cite `store-durable-fs.ts:15` (its
   constructor is the actual "rebuild-from-journal" surface) as the required call site.
2. **Define "live" now, not as an open question.** Use the existing tombstone field: a node counts as live
   in a snapshot iff it is present in the projection map with `state.tombstone !== 'archived'`
   (`projection.ts:49,98`). Remove §F.2's "unknown, not searched" framing — it is searchable and answered.
3. **Defer the group-definition choice (direct vs. transitive) explicitly until after fix #1 lands**, with
   a one-line note in the patch that the choice is moot (can't be observed either way) until the check
   exercises the disk round-trip — so a future reader doesn't mistake "chosen: direct edges" for "problem
   solved" while the deeper gap remains.

Неверных якорей не найдено — все цитаты и номера строк (`predicates.ts:49/57/78/84/98/105/108`,
`projection.ts:49/76-123/98/115`, `erasure.ts:29`, plan `:83/:148/:235`) сверены дословно и подтверждены
независимым чтением файлов.
