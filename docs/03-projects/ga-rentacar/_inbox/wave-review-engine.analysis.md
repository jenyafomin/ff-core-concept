---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-08-04
Scope: project
node_type: analysis
title: "Wave review — engine (R5 idempotency-hash, P2 durable-runner, F-5(c) resolve-ceiling)"
Related:
  - ../../../../packages/engine/src/core/idempotency.ts
  - ../../../../packages/engine/src/engine.ts
  - ../../../../packages/engine/src/runner/durable-runner.ts
  - ../../../../packages/engine/src/core/resolve.ts
  - ../../../../packages/engine/test/idempotency.test.ts
  - ../../../../packages/engine/test/durable-runner.test.ts
  - ../../../../packages/engine/test/resolve-ceiling.test.ts
  - ../../../../packages/ingest-rentacar/test/dedup.test.ts
  - ./ADR-DRAFT-resolve-ceiling-symmetry.decision.md
  - ./HANDOFF-2026-08-04-wave-synthesis.md
Maturity: gate run once — 1 CRITICAL found (cross-package regression), not yet fixed by owner decision
---

# Wave review — engine (R5 idempotency, P2 durable-runner, F-5(c) resolve-ceiling)

Quality gate over the uncommitted engine wave. Full engine suite + typecheck run; cross-package impact
verified by rebuilding `packages/engine/dist` (gitignored, not committed) and re-running consumer package
tests — this is what surfaced the CRITICAL finding below, which the engine package's own green suite
cannot see.

## Review Result: FAIL

## Critical (must fix)

**1. R5 content-hash breaks `packages/ingest-rentacar`'s R-LIGHT-1 reversible same-as toggle — confirmed by test.**

`packages/ingest-rentacar/src/dedup/same-as-writer.ts` (M2, existing/unmodified this wave) was built against
the OLD dedup contract: `Engine.write` deduped on `source_ref + provenance.snapshotHash`, so the writer baked
a caller-supplied `seq` into the snapshotHash to force merge → un-merge → re-merge to be three distinct acts
(comment: "R-LIGHT-1 idempotency escape hatch"). The new `idempotencyHash` (source_ref + actKind + payload +
edges, canonical) does **not** include `seq` anywhere — `seq` only ever reached the old snapshotHash and the
act id, never the edge `meta` or `payload`. Confirm(seq=A) and re-merge/confirm(seq=C) therefore project
**byte-identical edges** and now hash identically.

Verified live: `packages/engine`'s own suite (91/91) doesn't catch this because `ingest-rentacar` imports
`@ff/engine` via `dist/`, which was stale relative to the uncommitted `src/` edits. Rebuilt `dist` (`npx tsc
-p packages/engine/tsconfig.json`, gitignored, not committed) and re-ran:

```
packages/ingest-rentacar/test/dedup.test.ts
 × T2 … confirm → un-merge → re-merge … all three toggles apply (none dedup to no-op)
   AssertionError: expected true to be falsy (remergeAck.dedup)
```

1 failed / 31 passed in that package. Impact: once `@ff/engine` is actually built/shipped, the ga-rentacar
owner-facing re-merge action silently becomes a no-op — the UI reports success but the customer stays
un-merged in the projection. This is precisely the caller-regression risk flagged for this review, and the
wave's own handoff (`HANDOFF-2026-08-04-wave-synthesis.md:41-43`) reports only the engine-local 91/91, not
this cross-package effect — the regression was not seen by the wave.

Not fixed here (scope: findings only, no large edits). Fix belongs to whoever owns the R5/idempotency
decision — options: (a) fold a caller-supplied discriminator into the hash surface when present (e.g. treat
`edges[].meta` fully, which it already does — the real gap is `same-as-writer` puts `seq` nowhere in the
hashed surface, only in the id/old-hash) — i.e. fix the WRITER to carry `seq` in `edge.meta` or `payload`; or
(b) document that R5 content-hash is a breaking contract change for any caller keying distinctness off
`snapshotHash` alone, and audit all such callers before build. `docs/03-projects/ga-rentacar/_inbox/
HANDOFF-2026-08-04-forks-and-values.md:15` already earmarks "P4 R7 seq из state.version" as later work —
this finding means that work is not optional follow-up, it's a live break today.

## Warnings (should fix)

**2. F-5(c) write-ceiling gate change ships as code before ADR ratification.**
`ADR-DRAFT-resolve-ceiling-symmetry.decision.md` frontmatter still reads `Status: proposed`. The change
itself (write-ceiling flat-deny → gated-by-`core:manage-core`) is a genuine *loosening* of a security clamp
(a subject who previously got `DENY` under any protected-namespace write now gets `ALLOW` if they hold
`core:manage-core`). The doc's own reasoning is sound and grounded in the seed-corpus's own note ("reject
writes from anyone LACKING core:manage-core" — implying a holder should pass), and `resolve-ceiling.test.ts`
is a real RED→GREEN regression-anchored suite (7/7, including an explicit "does not touch out-of-namespace
node" case and a "write=PREFIX/read=EXACT must stay asymmetric" regression anchor). No bypass or
capability-check gap found — `holdsCapability` is deny-wins/default-deny in FIXED mode, so the new gate can
only narrow who is denied, not who is allowed beyond an explicit `core:manage-core` grant. But per this
project's own constitution ("Architecture, storage, auth, infrastructure changes require an ADR" before
implementation), an auth-model change should not sit in `_inbox/` as `proposed` after being built. Owner
action: ratify `proposed → approved` and move to `docs/architecture/ADR/`, or explicitly accept the process
gap.

**3. `MetaGates.canWriteNamespace` is now dead/duplicate logic.** `resolve.ts:86-93` (`DEFAULT_META_GATES.
canWriteNamespace`) implements the identical protected-namespace-gated-by-core:manage-core check that F-5(c)
just inlined directly into `resolveWrite` (`resolve.ts:223-231`). Nothing in `src/` calls
`policy.canWriteNamespace(...)` — grep confirms only the interface, the default impl, and the wrapper method
exist; the actual enforcement path never calls it. Two independent copies of the same security-relevant
predicate is a drift risk: a future edit to one (e.g. adding a scope check) can silently leave the other
stale. Recommend either wiring `resolveWrite`'s clamp through `this.metaGates.canWriteNamespace(...)` (single
source of truth) or removing the now-redundant `canWriteNamespace` gate/wrapper.

## Suggestions (nice to have)

**4. `DurableRunner.restart()` accumulates `process.once('exit', …)` listeners across repeated restarts.**
`DurableFsStore`'s constructor registers a fresh exit-listener per instance (`store-durable-fs.ts:93`), and
`boot()` constructs a brand-new `DurableFsStore` on every `restart()`. `close()` is idempotent
(`lockHeld` guard) so this is not a correctness bug, but a process that calls `restart()` many times (e.g. a
long-running gateway simulating many turns in one OS process) will grow Node's exit-listener list
unboundedly and eventually trip `MaxListenersExceededWarning`. Not exercised by any test. Low priority —
worth a one-line note or a `removeListener` on `close()` if `DurableRunner` is ever used in a long loop
rather than one-shot-per-process.

**5. Test-coverage gap: no test protects a caller from the R5 hash-surface footgun.** `idempotency.test.ts`
and `durable-runner.test.ts` both correctly prove "same content, different snapshotHash label ⇒ dedup" and
"different payload ⇒ supersede", but neither covers the inverse failure mode that actually broke
`ingest-rentacar`: **same edges/payload content, different intent** (a deliberate re-assertion after an
intervening toggle) colliding into an unwanted dedup. That is exactly finding 1. Recommend adding a
regression test in `idempotency.test.ts` itself (not just downstream) for "two acts with identical
edges/payload but a caller-intended-distinct discriminator dedup unless the discriminator is folded into
edges/payload" — this would have caught finding 1 without needing a cross-package dist rebuild.

**6. Comment staleness (not touched — flagging only).** `projection.ts:14` ("Freshest wins: a superseding
domain_event (same source_ref, new snapshotHash) replaces...") still describes the OLD snapshotHash-keyed
mental model; `foldInto` actually folds strictly by log order regardless of any hash — harmless (not a
functional bug, `foldInto` never reads snapshotHash), but worth a follow-up wording pass so a future reader
doesn't infer projection ordering depends on snapshotHash.

## Evidence

- **Tests (engine package):** `npx vitest run` → 15 files, **91/91 passed** (includes
  `idempotency.test.ts` 4/4, `durable-runner.test.ts` 3/3, `resolve-ceiling.test.ts` 7/7,
  `capability.test.ts` 7/7 regression-unaffected).
- **Typecheck (engine package):** `npx tsc -p tsconfig.json --noEmit` → clean, no errors.
- **Cross-package (after rebuilding `packages/engine/dist`, gitignored/uncommitted):**
  - `packages/rental-balance` → 9/9 passed, unaffected.
  - `packages/ingest-rentacar` → **31/32 passed, 1 FAILED** (`dedup.test.ts` T2 re-merge, R-LIGHT-1) — see
    Critical finding 1.
- **Security:** F-5(c) write-ceiling change reviewed line-by-line against `holdsCapability`'s deny-wins/
  default-deny fold; no forge-access / bypass path found; concern is procedural (ADR still `proposed`), not
  a logic hole. See Warning 2.
- **Spec compliance:** F-5(c) matches its own ADR-DRAFT decision and is fully covered by
  `resolve-ceiling.test.ts` (RED→GREEN documented in the ADR draft itself, reproduced here as GREEN). R5/P2
  match their in-code rationale and are covered by engine-local tests, but the wave's stated validation
  scope ("полный пакет 91/91") did not include the downstream consumer package where the actual regression
  lives — spec compliance is partial once cross-package effects are counted.

## Applied (tiny/safe only)

None. No typo/export/comment fixes were needed to reach a gate verdict; all findings above require an
owner/builder decision (fix the writer's hash surface, ratify the ADR, or accept the dead-code duplication)
and are therefore left as findings only, per review scope.
