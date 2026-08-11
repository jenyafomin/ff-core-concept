---
node_type: analysis
title: "Stage 2 D1.b critic report — adversarial stress-test of the falsify-plane build"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
stage: 2
agent: critic
related:
  - ../stage2-falsify-plane.assignment.md
  - ../stage2-reports/00-builder.report.md
---

# Stage 2 — adversarial verdict: mostly snyata, two real cracks (F6-projection, same-as-LOCK-on-disk), one narrative overreach (PII-blob)

Method: read the assignment, the builder report, and then the ACTUAL code independently
(`store-durable-fs.ts`, `erasure.ts`, `projection.ts`, `predicates.ts`, `erasure-plane-falsify.test.ts`,
`erasure-plane-harness.ts`, plus `reduce.ts` / `same-as-writer.ts` / `predicates.ts` in `ingest-rentacar`
via a read-only sub-agent) — not trusting the builder's self-report. Verdicts below are per-front, most
severe first is not applicable here (fronts map 1:1 to assignment structure); severity is called out inline.

## Front-by-front verdict

### 1. Независимость до-снимка — ТАВТОЛОГИЯ СНЯТА
`edgesBefore = structuredClone(orderAct.edges)` (harness `:117`) is taken from the object returned by
`reduceOrderRow` — built by `packages/ingest-rentacar/src/core/reduce.ts:99-100`
(`orderEdges: Edge[] = [{predicate:'rented',...}]; if (carRef) orderEdges.push({predicate:'drives',...})`)
— computed directly from row data, **zero calls** to `splitAct`/`project`/`erasure.ts`/`projection.ts`
anywhere in that function. The clone happens **before** `store.writeAct(orderAct)` is called, so no
in-place mutation by `foldInto`/`writeAct` can taint it. Same pattern for `sameas` (`sameAsTargetsBefore =
[...SAME_AS_TARGETS].sort()` — literally the input config, not derived from any act) and `access`
(`structuredClone(ACCESS_ACT.edges)` — a hand-authored fixture). All three snapshots are genuinely
independent of the code under test.

### 2. Честность мутанта — ТАВТОЛОГИЯ СНЯТА
The mutant (`harness :88-93`) monkey-patches `store.actToLine` as an **own-property shadow on the
instance**, local to the child process invoked with `--mutant` — it does not touch the boxed
`store-durable-fs.ts`. Because `actToLine` is the single choke point used by BOTH `writeAct` (`store-durable-
fs.ts:200-212`) and `shredPayload`'s re-emit (`:242`), the mutant honestly corrupts the on-disk format at
the same layer a real regression would. The read side (P2) runs with **no mutant flag** — an honest reader
observing a corrupted journal, which is the realistic bug shape. Verified the red output is real, not
fabricated: the assert path (`node?.edges` from the real `project()`/`foldEdges` pipeline) would concretely
return `[]` if `edges` never reaches the meta object, matching the builder's pasted stack trace. This
genuinely defeats the original CG-14-style tautology (in `erasure-seam.test.ts`, "edges survive" was true
for **any** `splitAct`, including a broken one, because JS object-rest-spread cannot accidentally drop an
untouched key). Here, going through `JSON.stringify`/`JSON.parse` + an actual on-disk round trip, a broken
implementation CAN and DOES lose the property, and the test catches it.

### 3. Реальный disk round-trip — ТАВТОЛОГИЯ СНЯТА
`runProcess` (`test file :28-31`) spawns `process.execPath` with `spawnSync` as a genuinely separate OS
process (`--import tsx <harness>`), P1 and P2 are sequential separate invocations against the same
`mkdtempSync` directory, `spawnSync` blocks until P1 fully exits (and releases its single-writer lock via
`process.once('exit', ...)` in `store-durable-fs.ts:95`) before P2 starts. Nothing is shared but the
journal file on disk. This matches the `crash-mid-turn.test.ts` / `durable-reboot-matrix.test.ts` discipline
the assignment demanded, verified by reading the actual `spawnSync` call, not by trusting the builder's
description.

### 4. F6 — ЧАСТИЧНО (real crack, builder self-flagged, but understated in the acceptance table)
Two separate claims are bundled under "F6" and only one is proven:
- **Erasure-seam serialization is form-agnostic** (actToLine/lineToAct/redactAct round-trips a
  structurally different act — new kind, nested/arrayed payload, non-rentacar predicate — without special-
  casing ga-rentacar shape). **This part IS proven**, verified by reading `store-durable-fs.ts:150-168` —
  `actToLine`/`lineToAct` operate on `Omit<Act,'payload'>` + `erasable`, with zero ga-rentacar-specific
  logic anywhere in the split/merge/redact path.
- **Edge-fold + same-as-lock hold for a second act-kind at the projection layer.** **This part is NOT
  proven, and cannot be, by this fixture.** `projection.ts:42` — `isProjectable = actKind === 'domain_event'
  && sourceRefOf(act) !== null`. `access_event` fails this gate unconditionally, so it never reaches
  `foldInto`'s `foldEdges(...)` call (`projection.ts:115`) at all. The F6 test's own assert
  (`test:104-113`) reads `store.acts()` — the raw write-model journal — never `store.readNode(...)`. The
  `same-as` edge planted on `ACCESS_ACT` (harness `:57`) is therefore inert for this test: it is never
  folded, never cardinality-checked, never merged with a prior same-as edge on the same node. F6 as built
  proves "the journal-line split/redact is shape-agnostic"; it does NOT prove "IMMUTABLE_ACT_META/erasure/
  same-as-lock" (the assignment's own phrase, §3) are form-agnostic **on the read-model**, because
  `access_event` is structurally excluded from the read-model by design. The builder flagged this
  correctly in "Новые грани" #2 but the acceptance table (`00-builder.report.md` item 5) still marks it
  a plain ✅ — I'd mark it 🟡 (partial), same bar the builder applied to the line-count overage.

**Verdict: ЧАСТИЧНО.** Not a bug in the test, but a scope gap between what F6 was asked to prove
("работает не потому что это ga-rentacar", covering erasure+same-as-lock jointly) and what a
non-projectable act-kind can structurally demonstrate.

### 5. §9-3b same-as — ЧАСТИЧНО (the accumulation claim is snyata; the LOCK-on-disk claim is not)
The ≥3-member group is real: subject = `ORDER_REF` (a real projected node, via `reduceOrderRow`) + 2
targets via `confirmSameAs` (`packages/ingest-rentacar/src/dedup/same-as-writer.ts:59-80`,
`actKind:'domain_event'`, real `edges:[{predicate:'same-as', target, ...}]`, genuinely no `payload` field —
confirmed by reading the function body, not inferred). The shred hits the subject's own payload-bearing
order act (per the assignment's own instruction — this is not a mislabeling, "another member's payload"
in the test docstring correctly refers to the identity edges toward the OTHER members surviving, not to
some third act being shredded). The independent before-snapshot (`sameAsTargetsBefore`) is the literal
input config array, about as independent as possible. **This part is genuinely snyata.**

**The crack:** the assignment's own diagnosis (§2 opening) named the target risk precisely:
*"Кардинальность same-as сейчас залочена на many ... сам лок доказан только in-memory."* The in-memory
proof already exists and is thorough — `packages/engine/test/write-plane.test.ts:78-103` explicitly builds
a **hostile** registry (`{'same-as':'one'}`), shows `cardinalityOf` ignores it, and even replays history
under that hostile registry to show no collapse. Stage 2's disk test does **not** port this adversarial
registry onto disk: the harness passes `RENTACAR_PREDICATES` (`packages/ingest-rentacar/src/predicates.ts:
19-25`), which does not mention `same-as` at all. Look at the actual guard:
```
// predicates.ts:56-58
export function cardinalityOf(predicate, registry = DEFAULT_PREDICATES): Cardinality {
  if (LOCKED_MANY_PREDICATES.has(predicate)) return 'many';   // ← the LOCK
  return registry[predicate] ?? 'many';                        // ← the DEFAULT
}
```
With `RENTACAR_PREDICATES` never declaring `same-as`, **deleting the LOCK line entirely would not change
the outcome of the disk test** — `registry['same-as'] ?? 'many'` alone already yields `'many'`. This is
the exact same species of tautology this whole Stage was commissioned to kill, now surviving one level
deeper: §9-3b proves "an unregistered predicate accumulates correctly across a disk reboot," which was
never in doubt; it does NOT prove "the LOCK (as opposed to happenstance) survives a disk reboot" — the
one property the census flagged as unproven on disk.

**Verdict: ЧАСТИЧНО.** Generic same-as accumulation-under-disk = snyata. The specific, named, at-risk
property (LOCK overriding a hostile/narrowing registry, surviving reboot) = NOT snyata.

## 🟥 Что реально не доказано

1. **Same-as LOCK on disk** (Front 5). Fix is cheap: rerun the `sameas` scenario (or a new variant) with a
   registry that declares `same-as:'one'` passed into `DurableFsStore`'s constructor for P2's read, and
   assert the group still accumulates (doesn't collapse to the last-written target) after reboot. This is
   a ~10-line addition reusing the existing harness, not a new file.
2. **Edge-fold / same-as-lock on a second, structurally different act-kind, at the projection/read-model
   layer** (Front 4). Not fixable within the current F6 fixture's own terms — `access_event` is
   non-projectable by design (`projection.ts:42`). If this specific claim matters to the owner, it needs a
   SECOND `domain_event`-kind act with a non-rentacar shape (the builder's own escape hatch (a) in "Новые
   грани" #2) — which the builder correctly declined to build unprompted, flagging it as a lead decision.
3. **The demonstrated "erasure" is narrower than "PII gone."** Read closely: `orderAct.payload` (the thing
   `shredPayload` deletes and `bodyKeysAfter` checks) is `compact({type,orderType,rentType,remaining,
   numberOfDays,status})` — **zero PII** (`reduce.ts:109`). The actual PII (`name`, `phone`, and this
   order's own `recentNote`) travels **by reference** (`payloadRef`/`payloadHash`, `reduce.ts:88-89,110-111`)
   into a separate `FilePayloadStore` blob under `storeDir/payload/` — and `payloadRef`/`payloadHash` are
   members of `IMMUTABLE_ACT_META` (`erasure.ts:25-34`), retained ON PURPOSE, with the blob shred explicitly
   declared "shredded separately" (`erasure.ts:56`, a DEFERRED owner fork). `shredPayload` never touches
   that directory. So: the test's own docstring claim *"the erasable payload zone is physically gone on
   disk"* is TRUE for the inline zone and vacuous for the actual PII in this specific fixture — the phone
   number and note that would matter to a GDPR-style eraser are on disk, untouched, before and after every
   assert in this suite. This is not a bug (the scope boundary is exactly what `erasure.ts` already
   declares as deferred) but the test's framing invites the reader to believe more was proven than was.

## ⚠️ Новые грани для вектора

- **F6-projection gap (Front 4)** is the sharpest new grain: the taxonomy split (`domain_event` vs the
  other 5 `ACT_KINDS`) means "second act-kind" and "second thing the read-model actually folds" are
  DIFFERENT axes. Any future F6-style falsification needs to pick which axis it's proving and say so
  explicitly — "form-agnostic journal split" and "form-agnostic projection" are not the same claim and
  this Stage's F6 only bought the first one. Actionable if the owner cares about the second: build a
  `domain_event` in a second tenant-shape (builder's escape hatch a) — small, reuses the `write-plane.test.
  ts` synthetic-tenant pattern already in the codebase.
- **Same-as LOCK-on-disk (Front 5)** — actionable, cheap (~10 lines), reuses existing harness/scenario.
  Worth doing before calling S10/§9-3b fully closed, since it's the exact property the census named.
- **PII-blob framing (finding 3 above)** — not actionable code-wise this stage (F3/blob-shred is
  legitimately deferred per `erasure.ts`'s own docstring), but worth a one-line addendum to the test's
  block comment so a future reader doesn't over-read what "payload zone gone" means. Flagging for the
  owner/lead to decide if that clarification is worth a follow-up doc note.

## Шум / придирки (explicitly NOT actionable)

- Numerical cap ~15% over (already self-flagged by builder) — noise, accept as-is.
- Mutant corrupts both `writeAct` and `shredPayload`'s serialization simultaneously rather than isolating
  `shredPayload` alone — this is literally what the assignment asked for (mutate `actToLine`), not a flaw.
- §9-3b test docstring phrase "shred of ANOTHER member's payload" reads slightly loosely (the shredded act
  IS the subject/anchor of the group, not a third-party act) but the assert's actual meaning (identity
  edges toward the other members survive) is correct and matches the assignment's intent — not worth
  reworking.
- No test for supersede/multi-line shred, no test for concurrent-writer-during-shred — both explicitly
  DEFERRED by the assignment itself (F5/FORK-2, F3) — correctly out of scope, not a gap in this stage.

## Что я проверил и не нашёл проблем

- Order-independence of the same-as membership comparison (`.sort()` on both sides) — correct, not a
  flakiness risk.
- Mutant's read-side (P2) runs unpatched — genuinely simulates "an honest reader hitting a corrupted
  journal," not a rigged comparison.
- `shredPayload`'s effect on `bodyKeysAfter` is independently falsifiable by inspection: if shred were a
  no-op, `orderAct.payload`'s 5 non-reserved keys would survive into `body`, so the assert would fail on
  its own even without a dedicated "shred no-op" mutant test.
- Lock acquisition/release across the P1→P2 boundary (`acquireLock`/`close`, `process.once('exit',...)`)
  correctly frees the single-writer lock before `spawnSync` returns, so P2 never races P1.
