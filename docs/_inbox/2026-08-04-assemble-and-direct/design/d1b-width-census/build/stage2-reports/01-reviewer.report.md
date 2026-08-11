---
node_type: analysis
title: "Stage 2 D1.b reviewer gate — §9-3/3b mutant-falsify plane + shredPayload + F6"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
stage: 2
agent: reviewer
related:
  - ../stage2-falsify-plane.assignment.md
  - 00-builder.report.md
---

# Review Result: PASS (with 1 escalation carried forward, not blocking)

All independently-run checks confirm the builder's report is accurate: tests pass, typecheck is clean,
the mutant genuinely fails when I re-ran the harness by hand, and the numeric-cap overage is real but
minor. One acceptance item (F6's "same class of assert as §9-3/3b") is only partially met — the builder
disclosed this honestly and escalated it as an architectural fork rather than deciding silently, which is
the correct behavior per protocol. I am not blocking the gate on it; I am carrying it forward as a WARNING
for the lead to rule on.

## 1. `shredPayload` — minimality and correctness

**File:** `packages/engine/src/adapters/store-durable-fs.ts:226-251`

- Reads the whole journal, replaces the FIRST line whose `id === actId` with `actToLine(redactAct(act))`,
  rewrites the file whole, calls `hydrateFromDisk()`. Matches assignment §1 п.1 exactly (full-rewrite
  permitted for this grain; WAL/atomicity explicitly deferred to F3 in a code comment, lines 221-224).
- `redactAct` (`erasure.ts:59-62`) strips only `payload`, keeps `payloadRef`/`payloadHash`/`edges` —
  correct symmetric use of the existing pure function; no new serialization logic invented (builder's
  claim in "Новые грани #3" checks out by reading the code, not just trusting the report).
- Single-occurrence limitation is explicitly commented at both the docstring (`:223-224`) and the loop
  (`:229`, `let done = false; // FORK-2: shred the FIRST matching occurrence only`) — satisfies assignment
  risk §6.2а ("не решай архитектурно сам, ограничь тест ОДНИМ вхождением id и явно закомментируй").
- **Edge cases verified independently** (not in the committed suite — see §3 below for the gap this
  implies): I ran `shredPayload` against (a) an empty/non-existent journal file, and (b) a non-existent
  `actId` on a non-empty journal. Neither throws; case (b) leaves the journal byte-identical (verbatim
  output below). Torn/unparseable lines are pushed through unchanged rather than dropped (differs slightly
  from `hydrateFromDisk`'s "drop from first parse error" semantics), but since the journal's own C3
  invariant guarantees torn lines only ever occur at the tail, this is not exploitable — `hydrateFromDisk()`
  (called at the end of `shredPayload`) re-applies the authoritative drop-at-tear rule anyway. Minor,
  not a defect.

```
$ node --import tsx test/_scratch-shred-edge.mjs   (ad hoc, run from packages/rental-balance, removed after)
empty-journal shred: OK, no throw
post-write nonexistent-id shred: OK, no throw
journal after no-op shred: {"id":"act:1","actor":"x","provenance":"s","recordedAt":"","actKind":"domain_event","edges":[],"erasable":{"a":1}}
```

No over-scope found: the diff to `store-durable-fs.ts` is exactly `+41/-1` (verified via `git diff --stat`),
one new method plus two new imports (`writeFileSync`, `redactAct`). Nothing else in the file touched.

## 2. Regression

Ran both suites myself (not trusting the builder's pasted output):

```
$ npm run --workspace @ff/engine test
 Test Files  15 passed (15)
      Tests  92 passed (92)

$ npm run --workspace @ff/rental-balance test
 Test Files  2 passed (2)
      Tests  13 passed (13)

$ npm run --workspace @ff/engine typecheck   → clean (tsc -p tsconfig.json --noEmit, no output)
$ npm run --workspace @ff/rental-balance typecheck → clean
```

Numbers match the builder's report exactly (92/92, 13/13). No regression in existing `store-durable-fs.ts`
contract — `writeAct`/`hydrateFromDisk`/`readNode`/`load`/`rebuild` are untouched by the diff (confirmed by
reading the full diff, not just the stat).

## 3. Test quality

- **Not tautological.** `edgesBefore` is `structuredClone`d from the act object the harness itself builds
  (`erasure-plane-harness.ts:117,129,136`), before any `writeAct`/`splitAct`/`project` call — genuinely
  independent of the code path under test, closing the exact tautology the census/assignment named.
- **Cross-process discipline is real, not simulated.** `spawnSync(process.execPath, ['--import','tsx',HARNESS,...])`
  in `erasure-plane-falsify.test.ts:29`, same pattern as `crash-mid-turn.test.ts`/`durable-reboot-matrix.test.ts`.
  P1 and P2 share nothing but the temp `store-dir`. Verified by reading the harness: it re-imports
  `DurableFsStore` fresh and re-derives fixtures deterministically (`NUM_CORE`, `ORDER_ROW`,
  `SAME_AS_TARGETS`, `ACCESS_ACT` are module-level constants both P1 and P2 evaluate independently) — no
  shared memory.
- **Mutant is a real part of the suite, not a manual one-off.** `erasure-plane-falsify.test.ts:54-73`,
  `it('MUTANT (edges dropped in serialization) BREAKS the §9-3 assert…')` runs on every `npm test`, not
  behind a flag. I independently re-ran the harness by hand with `--mutant` to verify the claim rather than
  trust the pasted transcript:

```
$ node --import tsx test/harness/erasure-plane-harness.ts --store-dir <tmp> --write --scenario order --mutant
{"mode":"write",...,"edgesBefore":[{"predicate":"rented",...},{"predicate":"drives","target":"sheets:Cars#AB-12345"}]}
$ node --import tsx test/harness/erasure-plane-harness.ts --store-dir <tmp> --read --scenario order
{"mode":"read","scenario":"order","found":true,"edgesAfter":[],"bodyKeysAfter":[]}
```

  Confirmed: under the mutant, `edgesAfter` is genuinely `[]` against a 2-edge `edgesBefore` — the same
  numbers the builder pasted. The mutant injection point (`actToLine` own-property shadow on the harness's
  own `store` instance, `erasure-plane-harness.ts:88-93`) never touches the boxed `store-durable-fs.ts`,
  satisfying assignment §1 п.5 exactly.
- **Deviation from the assignment's suggested home is justified, verified independently.** Assignment §1
  suggested `packages/engine/test/erasure-plane-falsify.test.ts`; builder placed it in
  `packages/rental-balance/test/`. I checked the dependency graph directly (`package.json` of all three
  packages): `ingest-rentacar` depends on `@ff/engine`; `engine`'s own `package.json` depends only on
  `@ff/core`; `rental-balance` depends on both. So `engine` importing `@ff/ingest-rentacar` (needed for the
  real `reduceOrderRow`/`confirmSameAs` path) would indeed be a cycle. `rental-balance` is the only correct
  home. This is a legitimate, disclosed deviation, not scope creep — and it incidentally closes the census
  gap "no test exercises rental-balance's own `cli.ts --store durable`" for free, as the builder claims.

## 4. Security / cleanliness

- No secrets, no logged PII beyond what the fixtures already carry (a fake phone/plate, consistent with
  other tests in the suite).
- `spawnSync` uses an argv array (`[process.execPath, '--import', 'tsx', HARNESS, ...args]`), not a shell
  string — no command injection surface even though `actId`/`storeDir` flow through argv.
  `mkdtempSync`/`join` build all paths; no raw string concatenation into a shell command.
  `actId` is only ever used for a strict `===` comparison inside `shredPayload`, never interpolated into a
  path or command.
- No stray files left in the tree from my verification (scratch script removed after use); `git status`
  clean except the four files under review.

## 5. Numeric cap (§6 assignment risk)

Verified builder's numbers directly:
```
$ git diff --stat packages/engine/src/adapters/store-durable-fs.ts
 1 file changed, 41 insertions(+), 1 deletion(-)
$ wc -l harness/erasure-plane-harness.ts erasure-plane-falsify.test.ts
 171 + 118 = 289
```
Prod: `+41/-1`, inside the "30-50" norm. Test-side: 289 lines vs. the "~150-250" norm — **~15% over**,
matches the builder's own flag exactly. Looking at the actual content, the overage is real but explainable:
the harness carries one non-trivial fixture (`ORDER_ROW`), three scenario branches (`order`/`sameas`/
`access`), and a mutant injection block, each with a WHY-comment (per this project's documentation
convention) rather than terse code. It is not padding or unrelated scope. I agree with the builder's
self-classification: minor, flag-not-block.

## 6. Project-rule compliance

Minimal diff to prod, no unrelated refactors, follows the existing `actToLine`/`lineToAct` symmetry
convention already established in the file (WHY-comment style, `readonly`/private method conventions,
JSDoc block per public method — matches surrounding code exactly). No CLAUDE.md/doc-tree violation: this is
implementation work under an approved assignment, not a new artifact requiring its own Spec/ADR.

## Findings

### Critical (must fix)
None.

### Warnings (should fix / lead should rule on)
- **F6 acceptance item is only partially met.** Assignment §4 acceptance says F6 candidate 1 "проходит тот
  же класс assert'ов, что §9-3/3b" (i.e., a projected-node-level assert). In fact `access_event` acts are
  not projectable at all — `isProjectable` (`packages/engine/src/core/projection.ts:42-43`) requires
  `actKind === 'domain_event'`, so the F6 test (`erasure-plane-falsify.test.ts:98-118`) asserts on
  `store.acts()` (journal/write-model), not `readNode()` (read-model), unlike §9-3/§9-3b which assert on
  the projected node. This means F6 proves the erasure-split is form-agnostic **on the journal**, but does
  **not** exercise edge-fold/same-as-lock **on a second act-kind's projection**, which was part of the
  original motivation for F6 in the width-census. The builder disclosed this clearly and unprompted
  ("Новые грани для лида", item 2) and offered two forward options without deciding architecturally — this
  is the correct behavior, not a violation, but the gap itself is real and should be a lead decision before
  this is considered fully closed, not just noted in a report.
- **`granted-to: 'one'` cardinality claim is not actually backed by the registry used in the test.** The
  harness's `ACCESS_ACT` comment (`erasure-plane-harness.ts:46-48`) and the assignment text both frame
  `granted-to` as carrying "its own cardinality" (`'one'`), distinct from `same-as`'s kernel-locked `many`.
  But the store in the harness is constructed with `RENTACAR_PREDICATES` only
  (`erasure-plane-harness.ts:80`), which does not register `granted-to` at all — so if this predicate were
  ever folded through `cardinalityOf`, it would silently default to `'many'` (the documented unregistered
  fallback, `predicates.ts:31`), not `'one'`. In practice this is moot today because `access_event` acts
  are never projected/folded (see above), so no cardinality logic ever touches this edge — but the code
  comment overstates what is actually being proven. Low-risk, but worth a one-line comment fix so a future
  reader doesn't believe cardinality-on-a-second-kind was tested when it wasn't.

### Suggestions (nice to have)
- `shredPayload`'s torn-line handling (pass-through-unchanged) differs from `hydrateFromDisk`'s
  drop-from-first-error semantics; harmless today given the C3 invariant (torn lines only at the tail) and
  the fact that `shredPayload` calls `hydrateFromDisk()` immediately after, but a one-line comment noting
  the two functions intentionally differ here would save a future reader from re-deriving it.
- No committed test exercises `shredPayload` on a missing/absent `actId` or an empty journal (I verified
  this by hand, ad hoc, outside the suite — see §1). Given this is exactly the "edge cases without falling
  over" requirement named in this review's own checklist, a one-line unit assertion (not necessarily
  cross-process) would make the guarantee durable rather than reviewer-verified-once.

## Evidence

- Tests: pass — engine 92/92, rental-balance 13/13 (re-run independently, verbatim above).
- Typecheck: clean for `@ff/engine` and `@ff/rental-balance` (re-run independently).
- Mutant: confirmed red independently by manual harness invocation with `--mutant` (verbatim above),
  matching the builder's pasted transcript exactly.
- Security: checked — no secrets, no shell-injection surface, no PII beyond existing test fixtures.
- Spec compliance: yes, with one partially-met acceptance item (F6 read-model class of assert) carried
  forward as a WARNING/escalation rather than a blocking finding, since the builder disclosed it correctly
  and it does not undermine the parts of §9-3/§9-3b/F6 that were the primary target of this stage (removing
  the tautology in the erasure-on-disk assert).
