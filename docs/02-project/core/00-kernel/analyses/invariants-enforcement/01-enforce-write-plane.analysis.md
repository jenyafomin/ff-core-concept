---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-03
node_type: analysis
title: "GAP 3 — three 'already-root' write/identity invariants NOT enforced by tests (RED→GREEN spec)"
tags:
  - kernel: write-plane
  - seam: S5-admission
  - seam: S8-append-only-forward
  - concern: integrity-as-engine-duty
  - status: unenforced-today
  - test-scope: spec-only-no-code
related:
  - ../../decisions/ADR-DRAFT-root-seal-durable-store.md   # source of the 4-engine-debts framing (§3) + S5/S8 seam table (§1)
  - ../../invariants.md                                    # I-1..I-14 numbering used below
  - ../../kernel-acceptance-tests.md                        # T-1..T-7 GPT tests — adjacent, does NOT cover these 3 gaps (see §Relation)
  - ../../../01-brain/decisions/ADR-DRAFT-fork-discipline-read-write-planes.md   # write=one-home / read=many-lens; append-only-forward law (D2)
  - ../../../01-brain/questions/FQ13-append-only/INDEX.md   # sibling append-only question — DIFFERENT concern, cross-linked not merged (see §Relation)
  - packages/engine/src/core/admission.ts                   # ground truth: admit() — PII-only today
  - packages/engine/src/core/predicates.ts                  # ground truth: DEFAULT_PREDICATES, cardinalityOf()
  - packages/engine/src/core/projection.ts                  # ground truth: foldInto()/project() — the fold/rebuild seam
  - packages/engine/src/engine.ts                            # ground truth: Engine.write()/rebuild()
  - packages/engine/test/invariants.test.ts                  # ground truth: current admission-gate test coverage (PII only)
  - packages/engine/test/cardinality.test.ts                 # ground truth: current cardinality/fold test coverage (no same-as, no registry-drift)
---

# GAP 3 — three "already-root" write/identity invariants NOT enforced by tests

> Paper phase (DESIGN ON PAPER). No code/git touched. This file is the spec for RED tests that do not
> exist yet — GREEN is future `builder` work, gated by owner "строй".

## ✅ Реализация (2026-08-03, ветка `refactor-tree`)

- **(b) same-as='many' locked — DONE (GREEN).** Kernel constant `LOCKED_MANY_PREDICATES = new Set(['same-as'])`
  in `packages/engine/src/core/predicates.ts`; `cardinalityOf()` returns `'many'` for any locked predicate,
  ignoring the caller registry (lock = identity ceiling, wins over data). Auto-exported via `index.ts`.
- **(a·same-as instance) — DONE (GREEN), by construction via (b).** The concrete replay-collapse
  (`same-as` narrowed `many→one` → `identity:A` silently dropped on `project`/`rebuild`) can no longer
  happen: `same-as` never folds `one`. Tests: `packages/engine/test/write-plane.test.ts` (4 tests) —
  proved RED first (identity:A vanished), then GREEN. Full suite 85 green, typecheck clean.
- **STILL OPEN (deferred to `02-design-forks-a-general-and-c-home.design.md`, architect):**
  - **(a) GENERAL guard** for a NON-`same-as` predicate narrowed `many→one` (refuse-on-narrow vs
    versioned-registry-per-act) — genuine design fork, not guessed.
  - **(c) one-home barrier** — needs the undesigned home-registry data shape + fact-key derivation.

## 0. Framing

`ADR-DRAFT-root-seal-durable-store.md` §"Verification pass (W2)" point 4 names three invariants the
owner's direction already treats as settled ("already-root") but that are, in the REAL code
(`packages/engine`, commit `2c8d177`, 44/44 green — verified again here 2026-08-03, still true), either
silently defaulted or entirely absent:

| # | Invariant | Seam (ADR §1) | Code location today | Status confirmed here |
|---|-----------|----------------|----------------------|------------------------|
| a | append-only-forward fold | S8 `[N]` | `core/projection.ts` (`project`/`foldInto`), called from `adapters/store-memory.ts:rebuild()` → `engine.ts:97` | registry passed to `project()` is a single snapshot at call time; NO guard against a later cardinality narrowing changing the result of replaying OLD acts |
| b | `same-as` cardinality = `'many'`, locked | S8/S6 | `core/predicates.ts` (`DEFAULT_PREDICATES`, `cardinalityOf`) | `same-as` is **absent** from `DEFAULT_PREDICATES` — its `'many'` behaviour is the unregistered-fallback default (`?? 'many'`), not an asserted, locked fact; grep confirms zero test in the suite references `same-as` cardinality (only PII-admission tests use the string as an example edge) |
| c | one-home barrier (payment / fact home) | S5 `[P]` | `core/admission.ts` (`admit()`) | `admit()` has exactly two checks (payloadRef↔payloadHash pairing, inline-PII scan). Zero code or comment anywhere in `packages/engine/src` mentions "home", "domain-barrier", "second writer", or "sole writer" (grepped repo-wide, zero hits) |

All three sit on the **write/identity plane** that `ADR-DRAFT-fork-discipline-read-write-planes.md`
names "one-home, engine-held, never author-discipline" (Форма 3 + the `append-only-forward` law under
"Закон безопасности само-дополнения"). Below: each invariant stated as a testable rule, a RED→GREEN
spec (no code), and a values read.

---

## (a) append-only-forward

### Testable rule
**A later, narrower registration of a predicate's cardinality (e.g. `same-as` going `many → one`) MUST
NOT change the projected edge-set that `rebuild-from-journal` produces for acts that were folded under
the OLDER, wider cardinality.** Equivalently: `project(acts, registry)` is only safe to call with a
SINGLE registry for the lifetime of a journal, OR the fold must be registry-version-aware per act.
Today it is neither — it is call-time-global.

**Where it must be held:** `packages/engine/src/core/projection.ts` — `project()` (the whole-journal
reducer) and `foldInto()` (its per-act step), both currently pure functions of `(acts, registry)` with
no notion of "the registry that was in effect when this act was originally folded." This is the S8 seam
(`engine.ts:rebuild()` → `adapters/store-memory.ts:rebuild()` → `project()`), NOT `admission.ts` — the
ADR's S8 row places it at fold/rebuild, matching the code: `admit()` never sees the registry at all.

### RED→GREEN test plan (spec only)
**Test: "a late many→one cardinality narrowing must not silently collapse historical edges on
rebuild-from-journal."**

- **Arrange.** Two `domain_event` acts on the same `source_ref` (e.g. `customer:42`), each asserting a
  DIFFERENT `same-as` target (`same-as → identity:A`, then `same-as → identity:B`), written under a
  registry where `same-as` is unregistered (falls back to `'many'`). Call `project(acts, registryV1)` —
  expect **2** `same-as` edges (both survive, per `foldEdges`'s `many` branch, already proven generically
  by `cardinality.test.ts`'s `tagged-with` case).
- **Act.** Build `registryV2 = { ...registryV1, 'same-as': 'one' }` — simulating the exact "late
  registration" the ADR warns about (D1 registry growth = a data INSERT, per I-13/I-6). Call
  `project(acts, registryV2)` over the SAME, unchanged act sequence (no new acts — this is a REPLAY of
  history the engine already accepted under `many`).
- **Assert (desired, GREEN).** The replay under `registryV2` must NOT silently produce a 1-edge result
  that discards `identity:A` (today's `foldEdges` `one`-branch REPLACE semantics do exactly that — last
  write wins). GREEN behaviour is one of: (i) `project()`/`rebuild('journal')` REFUSES the narrowing
  replay for acts pre-dating the cardinality change (an explicit `Problem`/refusal, fail-closed by
  behaviour per I-9's pattern), or (ii) cardinality is versioned per-act-timestamp so old acts always
  fold under the registry in effect when they were WRITTEN, never the registry in effect when
  `rebuild` is CALLED. Either design is acceptable; "silently collapse to 1 edge with no signal" is not.
- **Why RED today.** `foldEdges`'s `one` branch (`predicates.ts:56-61`) unconditionally drops every prior
  edge for the predicate and keeps only the latest — this is proven correct behaviour for genuinely
  `one`-cardinality predicates (`cardinality.test.ts` "car reassigned, no stale dup"), but `project()`
  applies it retroactively to acts that were never written expecting `one` semantics. Running the Act
  step above against the REAL code today returns exactly 1 edge (`identity:B`) — the historical
  `identity:A` merge vanishes from the projection with zero error, zero log line, zero test failure
  anywhere in the suite. This is mine A-C2, reproducible today by hand-editing `DEFAULT_PREDICATES`.
- **Secondary confirmation (already true, cite as supporting evidence, not a new test).**
  `predicates.ts`'s own doc-comment (lines 1-19) describes exactly this class of bug for `mergeEdges`
  (stale-dup on cardinality confusion) but only for the FORWARD direction (new acts); it does not address
  REPLAY under a changed registry — confirming the gap is a known-adjacent, not-yet-covered case.

### Cross-link, not duplicate
`kernel-acceptance-tests.md` T-3 `rebuild-index` proves `rebuild('journal')` is deterministic and
bit-for-bit reproducible **for a STABLE registry** (I-3/I-5/I-11) — it does not touch what happens when
the registry itself changes between two rebuilds. This analysis's RED test is the missing companion to
T-3, not a duplicate of it; T-3 should gain a note pointing here once this test exists.

---

## (b) `same-as` cardinality = `'many'` (locked)

### Testable rule
**`same-as` MUST always fold with cardinality `'many'`, and no registry — default or caller-supplied —
may declare it `'one'` without going through the append-only-forward guard in (a).** Today's `'many'`
is an accident of the unregistered-fallback default (`cardinalityOf`: `registry[predicate] ?? 'many'`),
not an asserted, protected fact. Nothing stops a future one-line edit to `DEFAULT_PREDICATES` (adding
`'same-as': 'one'`, exactly the shape of every other entry already there — `rented`, `drives`,
`paid-against`, `for-car`, `for-customer`) from silently flipping identity-merge semantics.

**Where it must be held:** `packages/engine/src/core/predicates.ts` — either (i) a registry-validation
step (e.g. `assertRegistryLocked(registry)` or inline in `cardinalityOf`/`foldEdges`) that refuses a
registry declaring `same-as` (and any other identity-bearing predicate named as locked) as `'one'`, or
(ii) a dedicated frozen constant (`LOCKED_MANY_PREDICATES = ['same-as']`) consulted at every
`cardinalityOf()` call, independent of what `DEFAULT_PREDICATES` or a caller-supplied registry says.

### RED→GREEN test plan (spec only)
**Test: "a registry that declares `same-as: 'one'` is refused/ignored, not silently honoured."**

- **Arrange.** `const badRegistry: PredicateRegistry = { ...DEFAULT_PREDICATES, 'same-as': 'one' }`.
- **Act.** Call `cardinalityOf('same-as', badRegistry)` (or, once (i)/(ii) exists, the guard function
  directly).
- **Assert (desired, GREEN).** Either `cardinalityOf('same-as', badRegistry)` still returns `'many'`
  (the lock wins over caller data — analogous to I-8's "clamp after fold, never a stack layer" pattern:
  same-as-many is a CEILING, not a policy-as-data value like `for-car`), or registry construction/loading
  itself throws with a reason mentioning `same-as`/`locked`/`identity`.
- **Why RED today.** `cardinalityOf()` (`predicates.ts:40-42`) is a bare `registry[predicate] ?? 'many'`
  lookup with zero validation of ANY kind — `badRegistry` above is accepted without complaint, and
  `foldEdges` will REPLACE-semantics every `same-as` edge from that point on. Confirmed by reading the
  full file: no lock list, no assertion, no special-case for `same-as` exists anywhere in
  `predicates.ts`.
- **Secondary test (documents today's blind spot precisely).** `grep -rn "same-as" packages/engine/test`
  today returns exactly two hits, both in `invariants.test.ts`'s PII-admission tests (`same-as` used
  only as an example edge predicate to prove edge-meta PII scanning) — **zero** test anywhere asserts
  `cardinalityOf('same-as')` at all, locked or otherwise. This is the "unregistered/unlocked" framing
  from the ADR made concrete: there isn't even a green test to accidentally break; the coverage is
  simply absent.

### Relation to (a)
(b) is the specific, concrete instance (a) warns about in the abstract: `same-as` is the ONE predicate
in the whole system where a `many→one` narrowing is not a theoretical edge case but the literal mine
(A-C2, identity un-merge history). A GREEN (b) test that locks `same-as` to `'many'` is a cheaper,
narrower defense than the general (a) guard, and should ship FIRST (small, local, no fold-seam redesign
needed) — (a)'s general guard remains necessary for any FUTURE identity-bearing predicate that isn't
`same-as` by name.

---

## (c) one-home barrier

### Testable rule
**Admission REFUSES an act that would establish a second writer-home for a fact that already has a
home in a different domain, even when the act's `source_ref` differs from the existing home's
`source_ref`** (a *different* source_ref is exactly the case a domain-barrier must catch — SAME
source_ref is already caught by `Engine.write()`'s existing idempotency dedup, which is a different,
narrower mechanism). Concretely (C-S5.2 in the root-seal ADR): a customer payment has exactly one home
(`rental-balance`); an act from `sheets:*`/`rentacar.onecar:Payment#*` ingest claiming to also be the
home of that same payment fact must be refused, not silently admitted as a second, competing truth.

**Where it must be held:** `packages/engine/src/core/admission.ts` — `admit()` is the S5 seam per the
ADR's own seam table (row S5), and is the function `Engine.write()` calls BEFORE any journal write
(`engine.ts:73-76`) — the correct fail-closed-by-behaviour location (matches the file's own I-9-style
framing: "REFUSE before any journal write", already true for PII).

### RED→GREEN test plan (spec only)
**Test: "a second act, different source_ref, claiming home of an already-homed fact is refused."**

- **Arrange.** A home-registry fixture (policy-as-data, S6-shaped) declaring `payment:{ref}` facts are
  owned by domain `rental-balance` (e.g. `{ factKind: 'payment', homeDomain: 'rental-balance' }`). Write
  one `domain_event` act, `source_ref: 'rental-balance:pay-42'`, `actor: 'agent:rental-balance'`,
  establishing the home for the underlying fact-key (customer 42's payment). `engine.write()` succeeds
  (baseline, GREEN today for this step alone).
- **Act.** Write a SECOND `domain_event` act for the SAME underlying fact-key but a DIFFERENT
  `source_ref` and a DIFFERENT domain actor — e.g. `source_ref: 'sheets:payment-123'`,
  `actor: 'sync:sheets-ingest'`, representing an ingest pipeline that (incorrectly) tries to also assert
  itself as a writer-home for the same payment. Call `engine.write()` (or `admit()` directly, whichever
  the eventual seam contract picks).
- **Assert (desired, GREEN).** `ack.ok === false`, with a reason matching something like
  `/second home|one-home|domain-barrier/i`, AND `store.acts()` length is unchanged (the act never
  reaches the journal — refuse-before-compute, mirroring the existing PII test's assertion style at
  `invariants.test.ts:256-262`).
- **Why RED today.** Two independent confirmations from reading the real code:
  1. `admit()` (`admission.ts:89-108`) performs exactly two checks — `payloadRef`↔`payloadHash` pairing
     and an inline-PII scan (`scan()` over `payload` and `edges[].meta`). It reads nothing about
     `source_ref`, domain, or fact-identity. Running the Act step above against the real `admit()`
     returns `{ ok: true }` unconditionally (no PII present).
  2. `Engine.write()`'s only pre-write guard beyond `admit()` is the idempotency dedup
     (`engine.ts:79-88`): it matches on EXACT `sourceRefOf(a) === ref && snapshotHashOf(a) === hash`. A
     different `source_ref` (as in the Act step, `sheets:payment-123` vs `rental-balance:pay-42`) never
     matches this check and sails straight through to `store.writeAct()` and the projection refresh.
  3. Repo-wide grep for `one-home`, `domain-barrier`, `second home`, `home-node`, `sole writer` across
     `packages/**/*.ts` returns zero hits — the barrier does not exist as code, and (contrary to the
     loose "only a comment" framing in the root-seal ADR) it does not exist as an in-code comment either;
     the only place the intent is written down at all is the ADR prose itself.

### Design note flagged, not resolved here
Building GREEN requires a home-registry data shape (fact-key → owning domain) that does not exist yet —
this is itself a new registry (S6, policy-as-data, "growth = INSERT" per I-13) and is `system-architect`
work, not something this analysis should design. Flagging it as the concrete prerequisite for (c)'s
GREEN so it isn't lost.

---

## Values lens

| Invariant | Доверие (Trust) | Тождество (Identity) | Читаемость (Legibility) |
|---|---|---|---|
| (a) append-only-forward | A registry edit silently rewriting past projections is a *hidden* authority — trust requires that "what we recorded as true then" cannot be re-narrated by a later, unrelated data change. | Directly load-bearing: this IS the mechanism that protects identity history (merges/un-merges) from retroactive erasure — its absence is an identity bug waiting to happen, not a peripheral concern. | A projection that changes shape on replay with no signal is unreadable — nobody auditing `rebuild --from journal` output can trust it reflects "what was written," only "what the CURRENT registry says." |
| (b) same-as='many' locked | The specific predicate that decides "are these the same entity" is exactly where an unlocked default is most dangerous — trust in identity resolution rests on this one line staying `many` on purpose, not by accident of fallback. | The most direct hit of the three: `same-as` cardinality IS the identity-merge mechanism; `'one'` vs `'many'` is the difference between "many candidate identities coexist" and "the latest overwrites all prior ones." | A lock with no test is invisible — a future author reading `predicates.ts` sees a plain data table with no signal that `same-as` is special; legibility requires the constraint to be visible IN the code, not only in an ADR. |
| (c) one-home barrier | The barrier's entire purpose is preventing two domains from silently disagreeing about who owns a fact — its absence means trust in "the payment is what `rental-balance` says it is" is unenforced, resting on no ingest pipeline ever making a mistake. | A second home for one fact is a Тождество violation by definition — two writers means the fact no longer has one stable identity/owner, only two competing claims. | `admit()`'s docstring today reads as complete ("the no-inline-PII gate") — a reader has no legibility signal that a whole other class of admission (domain/home) is planned and missing; the seam table in the ADR is the only place this is currently visible. |

---

## Unknowns / open before GREEN

- **(a)/(b):** whether the fix is "refuse the narrowing replay" or "version the registry per-act" is a
  design decision (not decided here) — both satisfy the RED test's assertion; `system-architect` should
  pick one before `builder` implements.
- **(c):** the home-registry data shape (fact-key derivation, how `rental-balance` vs `sheets:*`
  register as domains) is undesigned — flagged above, not resolved.
- Whether these three RED tests belong in `packages/engine/test/invariants.test.ts` (co-located with the
  existing admission-gate describe blocks) or a new `write-plane.test.ts` is an implementation-time call,
  not a design one — noted here so `builder` doesn't have to re-derive it.

## Recommendations

- **`system-architect`** — decide the (a) design (refuse-on-narrow vs versioned-registry-per-act) and
  the (c) home-registry shape before implementation starts; both are architecture decisions, not test
  plumbing.
- **`builder`** — once (a)/(c) design calls are made, implement the three RED tests exactly as specced
  above, confirm RED against current `main`/`refactor-tree`, then implement the GREEN behaviour named in
  each "Assert (desired, GREEN)" block.
- **Owner** — these three gaps are exactly AC-debt-1 (one-home), AC-debt-3 (forward-monotone) in
  `ADR-DRAFT-root-seal-durable-store.md` §"Validation plan"; ratifying that ADR's open questions 3/6
  turns this analysis from "spec" into "accepted acceptance-test contract."
