---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-03
node_type: analysis
title: "GAP 2 — predicates-as-data (root/tenant boundary leak in DEFAULT_PREDICATES)"
tags:
  gap: GAP-2
  gate: G2-second-tenant-zero-engine-edits
  seam: S6-registries-policy-as-data
  class: root-tenant-boundary
  severity: P0-blocking-for-G2
related:
  - ../../decisions/ADR-DRAFT-root-seal-durable-store.md   # W2 correction #3; gates G1/G2; §6 discriminator table (row: predicate rented/for-customer = TENANT)
  - ../../../01-brain/decisions/ADR-DRAFT-fork-discipline-read-write-planes.md   # fork #4 (predicate rented vs for-customer) — "нужен ответ владельца"; write=один-дом
  - ../../../../../01-organization/process/2026-07-31-canon-vs-code-reconcile.analysis.md
  - ../../../../../council/raw/2026-07-31-preroot-W2-verify-reframe.md   # correction #3 — where this gap was first named against real code
  - ../../../../../council/raw/2026-07-31-preroot-R3-root-scope-db.md   # 8 seams / S6 registries-policy-as-data
  - ../../../../../council/raw/2026-07-31-wider-D3-both-and-forks.md   # fork #4 classification (predicate = tenant vocabulary)
  - packages/engine/src/core/predicates.ts   # ground truth: DEFAULT_PREDICATES, cardinalityOf, foldEdges
  - packages/engine/src/core/projection.ts   # ground truth: foldInto(proj, act, registry = DEFAULT_PREDICATES)
  - packages/engine/src/core/types.ts        # ground truth: PredicateRegistry = Record<string, Cardinality>
  - packages/engine/src/adapters/store-memory.ts   # ground truth: the ONE runtime call site — foldInto(this.projection, act) — no registry passed
  - packages/engine/test/cardinality.test.ts       # ground truth: the ONE test call site importing DEFAULT_PREDICATES directly
---

# GAP 2 — predicates-as-data: root/tenant boundary leak in `DEFAULT_PREDICATES`

> This is the dedicated home for GAP 2. It did not have one before this file — the gap surfaced only in
> council raws (W2 correction #3, R3 seam S6, wider-D3 fork #4) and the reconcile analysis. Per doc-tree
> law 3 (consolidate-first), this folder is now the ONE home for predicates-as-data; do not re-litigate
> the classification in a second file — extend this one.

## 1. Where the leak is

**File/symbol:** `packages/engine/src/core/predicates.ts:31-37`

```ts
export const DEFAULT_PREDICATES: PredicateRegistry = {
  rented: 'one',
  drives: 'one',
  'paid-against': 'one',
  'for-car': 'one',
  'for-customer': 'one',
};
```

`PredicateRegistry` itself (`types.ts:53`, `Record<string, Cardinality>`) is a correct root abstraction —
cardinality-as-data was the D1 fix for the `mergeEdges` hard-replace bug (see the file's own header
comment). The registry SHAPE is root. The problem is the DEFAULT CONTENTS: five keys are ga-rentacar
domain nouns — `rented` (order→customer), `drives` (order→car), `paid-against` (payment→order), `for-car`
/ `for-customer` (the P1 payment vertical join). None of these mean anything outside a car-rental tenant.

**Why this violates G2:** the root/tenant discriminator ratified in the kernel ADR (root-seal-durable-store
§6) states plainly — *"A requirement is TENANT ⟺ it is expressed as a TYPE / PREDICATE / POLICY (registry
data) and dies when 'car rental' is swapped for 'health'/'calendar'."* The same ADR's fork table (§6) already
classifies `predicate 'rented' vs 'for-customer' · namespace 'Payment#' · Sheets-upstream · Emirates-ID/PII
· phone∧name` as **TENANT**, not root. `DEFAULT_PREDICATES` puts exactly this tenant vocabulary as a literal,
named export inside `packages/engine/src/core/` — the kernel package, not `ingest-rentacar` or
`rental-balance`. G2 ("second-tenant-zero-engine-edits") is failed **today, provably**: a health/calendar
tenant that needs its own `one`-cardinality predicate (say `attends` doctor→patient) has exactly two options,
both wrong — (a) edit `predicates.ts` in the engine package to add its noun next to `rented`/`drives`, which
is a direct engine edit by a tenant, or (b) leave its predicate unregistered and silently fall through to the
`many` default (`cardinalityOf`'s fallback, `predicates.ts:41`), which is semantically wrong for a `one`-only
relation and produces exactly the stale-duplicate-vs-replace confusion D1 was built to fix. Both branches
break the gate.

**Where the seam already exists (this matters for §2 below):** `foldInto` (`projection.ts:76-79`) and
`project` (`projection.ts:132`) already accept `registry: PredicateRegistry = DEFAULT_PREDICATES` as their
LAST parameter — the injection point is not missing, it exists and is exercised (`cardinality.test.ts:41,59`
constructs and passes a domain-neutral `REGISTRY` for 3 of its 5 describe-blocks). What breaks G2 is not the
signature — it is (1) the DEFAULT value baked into the kernel export, and (2) the one production call site
that does not pass a registry at all and therefore silently inherits the tenant-polluted default.

**The two real consumers (why "cheap, 2 consumers" in §5 is a factual claim, not an estimate):**
1. `packages/engine/src/adapters/store-memory.ts:43` — `foldInto(this.projection, act)`. Production,
   runtime, incremental fold. Zero registry argument → falls through to `DEFAULT_PREDICATES`.
2. `packages/engine/test/cardinality.test.ts:21,52,93` — imports `DEFAULT_PREDICATES` directly and asserts
   `cardinalityOf('for-car')`, `DEFAULT_PREDICATES['for-customer']`, `project(acts, DEFAULT_PREDICATES)`.
   Test-only, and notably the SAME file already proves the neutral path works (`REGISTRY` at line 41 covers
   `for-car`/`tagged-with` without touching the kernel default) — so the fix pattern is already half-proven
   in-repo, just not applied to the default itself.

No other file in `packages/` imports `DEFAULT_PREDICATES` or calls `foldInto`/`project` without a registry
argument (verified by grep across `packages/` excluding `core/` and `.spec.ts`). This is a narrow, well-fenced
leak — not a sprawling one.

## 2. Design (doc-level, no code) — predicate registry injected into `foldInto`

**Shape of the fix:** the engine kernel ships with **zero domain predicates**. `DEFAULT_PREDICATES` as a
kernel export is retired (or reduced to `{}` / removed entirely — a naming decision, not covered here).
Each tenant supplies its OWN `PredicateRegistry` value and INJECTS it at the seam that already exists:

- **Injection seam:** the `registry` parameter already on `foldInto(proj, act, registry)` and
  `project(acts, registry)` (`projection.ts:76-79,132`). This parameter is the correct, already-built
  injection point — it does not need to be invented, only USED with a non-default value at every call site,
  and its fallback needs to stop being tenant-shaped.
- **Where the registry lives:** as registry-data (S6, "registries policy-as-data" — the same class as
  node-type / edge-type / view-def named in the kernel ADR's seam table). Concretely, each tenant package
  (`ingest-rentacar`, `rental-balance`) owns a `predicates.ts` (or equivalent) that exports its own
  `PredicateRegistry` value — `{ rented: 'one', drives: 'one', 'paid-against': 'one', 'for-car': 'one',
  'for-customer': 'one' }` for ga-rentacar today — and passes it explicitly wherever it constructs an
  `Engine`/`MemoryStore` or calls `foldInto`/`project` directly. The kernel stops being the place that
  KNOWS any tenant noun; it only holds the SHAPE (`PredicateRegistry = Record<string, Cardinality>`) and
  the neutral fallback behaviour (unregistered ⇒ `many`, already correct and tenant-agnostic).
- **The one production call site that must change:** `store-memory.ts:43` currently calls
  `foldInto(this.projection, act)` with no registry, which is exactly what lets the tenant-shaped default
  leak into runtime. `MemoryStore` needs a way to receive a `PredicateRegistry` at construction (constructor
  param or similar) and thread it through to `foldInto`. This is the one non-trivial wiring change; everything
  else is "pass the argument that is already there."
- **What does NOT change:** `cardinalityOf`'s non-destructive fallback (unregistered predicate ⇒ `many`,
  `predicates.ts:41`) stays as-is — it is already root-safe (an unknown predicate never silently drops a
  prior edge, regardless of which tenant registered what). Only the DEFAULT VALUE of the registry, and
  whether callers are forced to supply one, is in scope.

This mirrors the pattern the kernel ADR already uses for admission/constitution (S6): "growth = INSERT" —
adding a tenant predicate becomes a registry-data insert in the tenant's own package, never an edit inside
`packages/engine/src/core/`.

## 3. RED→GREEN test plan (spec only — no code written here)

**Test A — kernel folds correctly with ZERO domain predicates (proves G1, domain-noun-free).**
Construct acts and edges using only synthetic, non-domain predicate names (e.g. `p1`/`p2`, or the kind of
neutral fixture `cardinality.test.ts` already uses for its `REGISTRY` block — `for-car`/`tagged-with` in
that file are STILL domain-shaped and would need swapping for a truly neutral pair in the new spec). Call
`foldInto`/`project` with an explicit, hand-built registry containing NO ga-rentacar noun and assert:
`one` replaces correctly, `many` accumulates correctly, foreign predicates survive untouched — the same
three behaviours `cardinality.test.ts:56-83` already locks, but with the kernel's OWN default registry
never touched or imported. **Why RED today:** this test cannot currently be written without importing
`DEFAULT_PREDICATES` transitively, because `foldInto`'s parameter DEFAULTS to it — a test that asserts
"the kernel never sees `rented`/`for-car` unless a caller supplies them" has nothing to assert against
while the default itself contains those nouns. The test is really an assertion on the DEFAULT VALUE
(`DEFAULT_PREDICATES` should be `{}` or removed), which is false today by inspection of `predicates.ts:31-37`.

**Test B — a tenant registers a predicate WITHOUT editing engine source.**
Simulate a second, dissimilar tenant (e.g. calendar/health, per the kernel ADR's G2 definition) that needs a
`one`-cardinality predicate the engine has never heard of (e.g. `attends`). Build a registry value entirely
OUTSIDE `packages/engine/src/core/` (in a test fixture standing in for a tenant package), pass it as the
explicit `registry` argument to `foldInto`/`project`, and assert the fold behaves correctly (`one` replaces)
— proving registration is a DATA insert at the call site, not a source edit. **Why RED today:** it is
actually already possible to pass a custom registry (the parameter exists and `cardinality.test.ts:41` does
exactly this) — so this half of Test B could pass today for `project()`/`foldInto()` called directly. It goes
RED specifically for the PRODUCTION path: `MemoryStore` (`store-memory.ts:43`) has no constructor/parameter
to receive a tenant registry at all, so "a tenant registers a predicate without editing engine source" is
false for the actual runtime write path, only true for the bare reducer functions. The test needs to exercise
`MemoryStore`/`Engine`, not just `foldInto` directly, to catch this.

**Test C (regression lock, currently GREEN but fragile) — `DEFAULT_PREDICATES` stays out of `packages/engine/src/core/` imports outside its own module.**
A lint-shaped assertion (could be a grep-based test or an import-boundary rule, mirroring G1's "no
ga-rentacar noun in an engine spec/test" gate from the kernel ADR §6): after the extraction, nothing in
`packages/engine/src/**` (excluding the tenant-facing registry itself, if it stays outside `core/`) should
contain the literal strings `rented`, `drives`, `paid-against`, `for-car`, `for-customer` as anything other
than a comment/example. This is the concrete, automatable form of G1 applied specifically to this gap.

## 4. Values lens

- **Суверенность (tenant sovereignty).** A tenant's vocabulary — its predicates, its nouns — belongs to
  that tenant's own registry-data, not to a shared kernel file every tenant must edit; forcing an edit to
  `packages/engine/src/core/predicates.ts` to add a health-domain predicate is literally one tenant's
  vocabulary choice imposing itself on the shared, supposedly-neutral substrate.
- **Реляционность.** A predicate IS a relation-as-data (D1's own framing: "cardinality as DATA, not a
  hardcoded branch"); hardcoding five domain relations into the kernel default half-defeats the point of
  making cardinality data-driven in the first place — the relation NAME is just as tenant-specific as its
  cardinality VALUE.
- **Читаемость.** Anyone reading `packages/engine/src/core/predicates.ts` today reads `rented`/`for-car` and
  reasonably concludes the engine "knows about" car rentals — a false read of what the kernel actually is;
  a zero-domain default keeps the kernel's surface honestly empty of any tenant story.

## 5. Owner P0 reference — present both paths, do not decide

Per the task framing, the owner gate is: **extract now (cheap, 2 consumers) vs record as explicit debt.**
This section names both paths and their tradeoff; it does not choose.

**Path A — extract now.**
- What: move `DEFAULT_PREDICATES`'s five ga-rentacar keys out of `packages/engine/src/core/predicates.ts`
  into a tenant-owned registry (`ingest-rentacar` and/or `rental-balance`), reduce the kernel default to
  empty/removed, and wire `MemoryStore` to accept and thread a registry parameter so `store-memory.ts:43`
  stops silently inheriting a tenant default.
- Why "cheap" is a defensible claim here (not just asserted): exactly 2 call sites touch
  `DEFAULT_PREDICATES` today (§1) — one production (`store-memory.ts`), one test (`cardinality.test.ts`) —
  and the injection seam (`registry` parameter on `foldInto`/`project`) already exists and is already
  exercised correctly by 3 of 5 describe-blocks in the existing test file with a neutral custom registry.
  This is not a design-from-scratch; it is closing a default and adding one constructor parameter.
- Cost: `MemoryStore`'s public surface changes (a registry becomes a required-or-defaulted construction
  input); `cardinality.test.ts` needs its 2 direct `DEFAULT_PREDICATES` references rewritten against a
  tenant-fixture registry instead; any other spot that constructs `MemoryStore` (CLI, ingest, etc. — not
  grepped as part of this analysis, worth a follow-up check before executing) needs to pass a registry too.
- Benefit: G2 becomes true today, closes the leak the W2 verification pass flagged as already-breached
  ("second jilets НЕ обязан" is currently false), removes one of the two hidden breaking-contracts W2 named
  in the same class as the sync/async StorePort door.

**Path B — record as explicit debt.**
- What: leave `DEFAULT_PREDICATES` as-is for now; this analysis file + its `tags` (gap: GAP-2, gate: G2) IS
  the explicit debt record, cited from the kernel ADR's open-questions / debt ledger at ratification time.
- Why this could be legitimate: the kernel ADR itself (root-seal-durable-store) already has FOUR engine
  debts queued as root acceptance-tests (§3: one-home barrier, read-path meta+tombstone, append-only-forward
  fold, constitution-unwritable) plus a live one-way-door decision (sync/async StorePort, §4) awaiting owner
  ratification — this gap could queue behind those rather than jump the line, especially if the owner wants
  to batch all "make G1/G2 literally true" work into one pass instead of doing it piecemeal.
- Cost of waiting: every day `DEFAULT_PREDICATES` ships with tenant nouns, G2 is falsifiable by inspection
  (not a future risk — a present, demonstrable fact per §1); if a second tenant (calendar/health, per the
  ADR's own G2 test case) shows up before this is fixed, it WILL be forced into an engine edit, which is the
  exact failure this gate exists to prevent.
- Tradeoff in one line: Path A trades a small, well-scoped, already-partially-proven change now for closing
  a currently-true gate violation; Path B trades a known, growing violation for sequencing this fix alongside
  the other four queued engine debts instead of as a one-off.

## ✅ Реализация — 2026-08-03 (Path A «вынести сейчас», ветка `refactor-tree`)

Владелец выбрал **Path A**. Ядро стало domain-free, вокабуляр уехал к жильцу, все тесты зелёные.
- **Ядро пустое:** `packages/engine/src/core/predicates.ts` → `DEFAULT_PREDICATES = {}` (+ комментарии без арендных
  слов). `packages/engine/src/core/admission.ts` — убрано `rented` из примера-комментария. Итог: в `packages/engine/src`
  **ноль** из пяти существительных (проверено grep + Test C).
- **Шов инъекции протянут в стор:** `MemoryStore` и `DurableFsStore` получили параметр конструктора
  `registry: PredicateRegistry = {}` и прокидывают его в `foldInto`/`project` (writeAct · rebuild · hydrate).
- **Реестр-жилец:** новый `packages/ingest-rentacar/src/predicates.ts` → `RENTACAR_PREDICATES` (те самые 5),
  экспортирован из индекса. `rental-balance` (зависит от `@ff/ingest-rentacar`) импортирует его.
- **Точки конструирования жильца** передают реестр: `rental-balance/src/surface/cli.ts` (прод),
  `ingest-rentacar/test/ingest.test.ts`, `rental-balance/test/balance.test.ts`. Generic-CLI ядра остаётся на `{}`.
- **Тесты:** новый `packages/engine/test/predicates-as-data.test.ts` — Test A (ядро пустое + нейтральный фолд),
  Test B (жилец регистрирует незнакомый `attends` через `MemoryStore`/`Engine` без правки ядра),
  Test C (G1-замок: grep `engine/src` = 0 арендных слов). `cardinality.test.ts` переведён на явный реестр.

**Результат:** 81/81 тест зелёный (core 14 · engine 51 · ingest 7 · balance 9), typecheck по 4 пакетам чист.
**G2 теперь ИСТИННА:** второй жилец регистрирует предикаты как данные, ядро не трогает (доказано Test B).

## Unresolved / left to the owner

- Path A vs Path B (this section, above) — explicit non-decision, per task instructions.
- Naming: does `DEFAULT_PREDICATES` get removed entirely, renamed (e.g. `EMPTY_PREDICATES`/no export at
  all), or kept as `{}`? Not decided here — a naming detail downstream of the Path A/B choice.
- Whether `MemoryStore`'s registry parameter is required or optionally-defaulted-to-empty is an API design
  choice for whoever implements Path A (builder/architect), not resolved in this analysis.
