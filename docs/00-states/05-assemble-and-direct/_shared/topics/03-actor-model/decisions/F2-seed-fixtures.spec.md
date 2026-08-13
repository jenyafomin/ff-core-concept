---
type: spec
id: F2-seed-fixtures
title: "F2-seed fixtures — namespace-ceiling test coverage (owner-decision 9 / FORK-4)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
phase: DESIGN (spec only — NO code on disk until owner says «строй»)
related:
  - packages/engine/src/engine.ts (F2 guard, lines 110-115)
  - packages/engine/src/core/resolve.ts (canWriteNamespace, lines 86-93)
  - packages/engine/test/trust-plane.test.ts (F2 suite, lines 87-118)
  - packages/engine/test/resolve-ceiling.test.ts (F-5(c) WRITE ceiling, lines 53-97)
  - OWNER-FORKS-2026-08-12.decision.md §FORK-4 (lines 207-249)
  - ACCEPT-2026-08-12-stage1.decision.md (trust-plane 9/9, 187 tests)
---

# F2-seed fixtures — SPEC

> **Purpose.** Prep artifact so that the moment owner says «строй», a builder implements the
> F2 namespace-ceiling fixtures with **zero ambiguity**. This is owner-decision 9
> ("F2-seed фикстур, заодно со след. builder-волной") = OWNER-FORKS §FORK-4, recommendation
> **Variant-1 (canonical fixture helper) + Variant-3 (regression anchor)**.

---

## 1. Problem — what F2 enforces, and where the coverage hole is

### 1.1 What F2 (namespace-ceiling) enforces — EXACTLY

**The guard** (`packages/engine/src/engine.ts:110-115`), on the write-side PEP hot path:

```ts
// F2/F3 namespace ceiling: a write into a protected family (policy:* , meta:cap/core:* , …) is refused
// unless the writer holds core:manage-core. ... no-op when the Constitution lists no protected_namespaces.
if (this.policy.canWriteNamespace(finalized.actor, targetId, this.graph) === 'deny') {
  return { ok: false, reason: `write refused: '${targetId}' is a protected namespace (requires core:manage-core)` };
}
```

**The rule it delegates to** (`packages/engine/src/core/resolve.ts:86-93`, `DEFAULT_META_GATES.canWriteNamespace`):

```ts
canWriteNamespace(policy, viewer, targetId, graph) {
  if (policy.mode === NAIVE) return ALLOW;                                   // (unreachable via Engine: FIXED-only)
  const constitution = graph.byId.get('policy:constitution');
  const protectedNs = ((constitution?.body?.protected_namespaces as string[] | undefined) ?? []).some((ns) =>
    targetId.startsWith(ns),                                                 // PREFIX match
  );
  if (!protectedNs) return ALLOW;                                            // not in a protected family → pass
  return policy.holdsCapability(viewer, 'core:manage-core', 'project:ff', graph) ? ALLOW : DENY;
}
```

**F2 in one line:** *a projectable write whose `source_ref` targetId is **prefix-matched** by any entry in
`policy:constitution.body.protected_namespaces` is REFUSED before the journal unless the writer principal
(`act.actor`) holds `core:manage-core` in `project:ff`.*

Load-bearing properties of the guard:
- **PREFIX, not exact** (`startsWith`) — a brand-new node under a protected family is auto-protected without a policy edit.
- **Data-driven** — the protected set is READ from the Constitution; empty list = total no-op (ordinary writes untouched).
- **Fires only for projectable acts** — non-projectable observation/agent_trace never reach this branch (engine.ts:99).
- **Scope is hardcoded `'project:ff'`** for the `holdsCapability` check (resolve.ts:93) — a known simplification, not tested.
- **Orthogonal to `default`** — F2 reads `protected_namespaces` only; the Constitution's `default: allow|deny` does NOT weaken it.

### 1.2 Currently-tested cases (baseline — do NOT regress)

| where | case | verdict |
|---|---|---|
| trust-plane.test.ts:89 | `mallory → policy:constitution` (overwrite) | DENY (engine.write) |
| trust-plane.test.ts:103 | `mallory → meta:cap/core:brand-new` (prefix) | DENY (engine.write) |
| trust-plane.test.ts:112 | `admin → policy:house-rule` (holder into `policy:`) | ALLOW (engine.write) |
| trust-plane.test.ts:179 | `mallory → customer:42` (ordinary) | ALLOW (engine.write) |
| resolve-ceiling.test.ts:86 | `resolveWrite(writer → meta:cap/core:brand-new)` | DENY (unit) |
| resolve-ceiling.test.ts:90 | `resolveWrite(admin → meta:cap/core:brand-new)` | ALLOW (unit) |
| resolve-ceiling.test.ts:94 | `resolveWrite(writer → node:ordinary-doc)` | ALLOW (unit) |

### 1.3 The coverage hole — UNTESTED cases (the reason this spec exists)

**H-0 (FORK-4 core / owner-decision 9).** 7 of 9 engine suites carry a **local** `protected_namespaces: []`
constitution copy (`cardinality.test.ts:38`, `idempotency.test.ts:23`, `invariants.test.ts:55`,
`durable-runner.test.ts:31`, `write-plane.test.ts:45`, `projection.test.ts:29`, `predicates-as-data.test.ts:36`).
For those suites F2 is a **structural no-op**, so a regression that breaks `canWriteNamespace` would pass
7/9 suites unnoticed. F2's proof-power today lives ONLY in `trust-plane` + `resolve-ceiling`.

The following **behavioural** cases are exercised NOWHERE:

| id | untested case | why it matters |
|---|---|---|
| **U-1** | `admin → meta:cap/core:*` **via `engine.write()`** (holder ALLOW into the *cap* family at the integration boundary — only the `policy:` family has an engine-level ALLOW today) | allow-under-ceiling proven at write() PEP for BOTH families, not just resolveWrite |
| **U-2** | prefix **specificity / near-miss**: `mallory → meta:cap/vendor:x` and `mallory → policyholder:record` must **ALLOW** (they are NOT under `meta:cap/core:` / `policy:`) | proves the ceiling clamps the *right* family and doesn't over-reach (core vs vendor cap; `policy:` vs `policyholder`) |
| **U-3** | **multi-namespace / data-added family**: a Constitution with a 3rd family (e.g. `ledger:`) must DENY non-holder and ALLOW holder — with NO code change | proves the set is genuinely data-driven and prefix-general, not hardcoded to the two known families |
| **U-4** | **default-independence**: seed Constitution with `default: 'allow'` — F2 must STILL DENY a non-holder into a protected family | integrity ceiling is orthogonal to the permissive read/write default |
| **U-5** | **holder-less** actor (no grant at all) into a protected family → DENY | today's DENY actor (mallory) holds `core:write-knowledge`; the zero-grant path is untested |
| **U-6** | **empty-list negative control**: `protected_namespaces: []` ⇒ `mallory → policy:foo` ALLOW | asserts the 7 inert suites' state is an *intentional* no-op, not accidental protection — and pins the data-driven contract |
| **U-7** | **regression anchor**: F2 alive INDEPENDENT of any suite's local fixture (a dedicated adversarial test on the canonical seed) | closes H-0 — future regression is caught by ≥1 suite by construction |

---

## 2. The fixture SET to add (concrete, named — NOT code)

Two deliverables: **(A)** a canonical fixture helper (single source of truth), **(B)** a fixture table
that exercises F2 fully through `engine.write()` (integration PEP) with two unit-level `resolveWrite` anchors.

### 2.A Canonical fixture helper — `packages/engine/test/fixtures/constitution.ts` (NEW)

Exports (structure mirrors the existing inline helpers in trust-plane.test.ts:23-70, promoted to shared):

| export | shape / value |
|---|---|
| `PROTECTED` | `['policy:', 'meta:cap/core:']` (the canonical non-empty protected set) |
| `constitution(extra?)` | `EnvelopeNode` id `policy:constitution`, `body.protected_namespaces = PROTECTED`, `body.default = 'deny'`, `body.no_read_ids = []`, override via `extra` |
| `constitutionPermissive()` | `constitution({ default: 'allow' })` — for U-4 |
| `constitutionEmpty()` | `constitution({ protected_namespaces: [] })` — for U-6 |
| `constitutionMulti()` | `constitution({ protected_namespaces: ['policy:', 'meta:cap/core:', 'ledger:'] })` — for U-3 |
| `grant(id, subject, allow[])` | `EnvelopeNode` type `grant`, `body {subject, in_scope:'project:ff', allow, deny:[], minted_by:'system'}` |
| `domainEvent(id, actor, source_ref, payload)` | projectable `Act`, `actKind:'domain_event'`, `provenance.source_ref` |
| `ADMIN` / `MALLORY` / `NOBODY` | `'user:admin'` (holds `core:manage-core`+`core:manage-grants`) / `'user:mallory'` (holds `core:write-knowledge`) / `'user:nobody'` (no grant) |
| `seed()` | `[constitution(), grant('grant:admin', ADMIN, ['core:manage-core','core:manage-grants']), grant('grant:mallory', MALLORY, ['core:write-knowledge'])]` |

### 2.B Fixture table — `packages/engine/test/f2-namespace-ceiling.test.ts` (NEW)

Each row = one `it(...)`. Verdict via `engine.write(domainEvent(...))` unless marked *(unit)* =
`FIXED_POLICY.resolveWrite(...)`. `store.acts()` length asserted to prove **refuse-before-journal** on every DENY.

| id | actor | targetId (source_ref) | Constitution | expected | kind | note |
|---|---|---|---|---|---|---|
| F2-01 | mallory | `policy:constitution` | C-std | **DENY** (0 acts) | deny-over-ceiling | anchor (mirrors trust-plane) |
| F2-02 | mallory | `policy:house-rule` (new) | C-std | **DENY** (0 acts) | deny-over-ceiling | new node, prefix |
| F2-03 | mallory | `meta:cap/core:brand-new` | C-std | **DENY** (0 acts) | deny-over-ceiling | anchor (prefix, cap family) |
| F2-04 | **nobody** | `policy:x` | C-std | **DENY** (0 acts) | deny (holder-less) | **U-5** |
| F2-05 | admin | `policy:house-rule` | C-std | **ALLOW** (1 act) | allow-under-ceiling | anchor |
| F2-06 | admin | `meta:cap/core:brand-new` | C-std | **ALLOW** (1 act) | allow-under-ceiling | **U-1** (cap family via write) |
| F2-07 | mallory | `meta:cap/vendor:plugin-x` | C-std | **ALLOW** (1 act) | boundary/specificity | **U-2** (vendor ≠ core) |
| F2-08 | mallory | `policyholder:record` | C-std | **ALLOW** (1 act) | boundary/near-miss | **U-2** (`policy:` vs `policyholder`) |
| F2-09 | mallory | `ledger:balance` | C-multi | **DENY** (0 acts) | multi-namespace | **U-3** (data-added family) |
| F2-10 | admin | `ledger:balance` | C-multi | **ALLOW** (1 act) | multi-namespace | **U-3** (holder passes added family) |
| F2-11 | mallory | `customer:42` | C-std | **ALLOW** (1 act) | non-protected passthrough | anchor (regression) |
| F2-12 | mallory | `policy:foo` | C-empty | **ALLOW** (1 act) | empty-list no-op | **U-6** (data-driven proof) |
| F2-13 | mallory | `policy:x` | C-permissive | **DENY** (0 acts) | default-independence | **U-4** (`default:'allow'` doesn't weaken F2) |
| F2-14 | mallory / admin | protected family | C-std (canonical `seed()`) | mallory **DENY**, admin **ALLOW** | regression anchor | **U-7** — one test proving the guard is on the hot path independent of local fixtures |
| F2-15 | writer | `meta:cap/core:unlisted` | C-std | **DENY** *(unit)* | resolveWrite anchor | keeps unit-level DENY |
| F2-16 | admin | `meta:cap/core:unlisted` | C-std | **ALLOW** *(unit)* | resolveWrite anchor | keeps unit-level ALLOW |

**Count:** 16 fixtures across **7 kinds** — deny-over-ceiling (incl. holder-less), allow-under-ceiling
(both families), boundary/prefix-specificity, multi-namespace (data-added), non-protected & empty-list
passthrough, default-independence, regression anchor.

**Avoid F1 entanglement:** the multi-namespace family MUST be a **non-grant** prefix (`ledger:`), because a
`grant:`-targeted write also trips the F1 mint gate (engine.ts:120-125) and would confound the F2 verdict.

### 2.C (Optional, part of the same wave) — de-inert the 7 no-op suites

Per FORK-4 Variant-1: replace the 7 local `protected_namespaces: []` copies with the canonical helper's
non-empty `constitution()`. **Safe by construction** — F2 only clamps protected families; ordinary writes
to non-protected namespaces still pass. **Builder caveat (flag, don't paper over):** if any of the 7 suites
writes into `policy:*` / `meta:cap/core:*` as an ordinary (non-holder) write expecting success, swapping in
the non-empty list will (correctly) DENY it — that surfaces a real latent assumption; STOP and flag to owner,
do not weaken the seed to hide it. This sub-item MAY be deferred; §2.A + §2.B alone close the behavioural hole.

---

## 3. Placement & vitest wiring

- **Helper:** `packages/engine/test/fixtures/constitution.ts` — a `.ts` module beside the existing JSON
  corpus (`test/fixtures/nodes*.json`). Pure builders, no test runner import.
- **Test file:** `packages/engine/test/f2-namespace-ceiling.test.ts` — sits alongside `trust-plane.test.ts`;
  auto-discovered by vitest (glob `test/**/*.test.ts`).
- **Imports:** `import { describe, it, expect } from 'vitest'` and
  `import { Engine, MemoryStore, FIXED_POLICY, type Act, type EnvelopeNode } from '../src/index.js'`
  (all F2 surfaces are already re-exported from `src/index.ts:8,23,27`). Helper imported from `./fixtures/constitution.js`.
- **Engine construction:** `new Engine(new MemoryStore(seed()), FIXED_POLICY)` — identical to
  trust-plane.test.ts:81-85. Engine is FIXED-only (engine.ts:48), so the NAIVE branch of `canWriteNamespace`
  is unreachable and needs no fixture.
- **Runner:** `pnpm --filter engine test` (script `vitest run`, package.json:18). No config file changes; no new deps.

---

## 4. Acceptance criteria & verification plan

### 4.1 "F2 fully covered" means (acceptance criteria)

- **AC-1** All 16 fixtures (§2.B) exist as named `it(...)` cases and PASS.
- **AC-2** Every DENY row asserts `ack.ok === false` **and** `store.acts()` length is 0 (refuse-before-journal).
- **AC-3** Every ALLOW row asserts `ack.ok === true` **and** the act landed (`store.acts()` length 1 / node present).
- **AC-4** Both protected families (`policy:`, `meta:cap/core:`) have BOTH a non-holder DENY and a holder ALLOW at the `engine.write()` boundary (U-1 closed).
- **AC-5** Prefix specificity proven: at least one near-miss (`policyholder:`) and one sibling-family (`meta:cap/vendor:`) ALLOW (U-2 closed).
- **AC-6** Data-driven proven: adding `ledger:` to `protected_namespaces` flips the verdict with NO engine code change (U-3), and an empty list is a proven no-op (U-6).
- **AC-7** F2 fires under `default:'allow'` (U-4) and for a zero-grant actor (U-5).
- **AC-8** Regression anchor (F2-14) fails if `engine.ts:113` guard or `resolve.ts:86-93` is removed/short-circuited (mutation check below).
- **AC-9** The canonical helper is the single source of the seed for the new file (no re-inlined constitution copy).
- **AC-10** Full engine suite stays green and the total count is **≥ 187 + net-new** (baseline 187; ACCEPT-2026-08-12 trust-plane 9/9 unchanged). No baseline test modified in behaviour (only §2.C swaps, if included).

### 4.2 Verification plan

1. **Run:** `pnpm --filter engine test` → all suites green, new file's 16 cases pass (AC-1..7,10).
2. **Mutation probe (AC-8, manual, revert after):** comment out the F2 guard block (engine.ts:110-115) →
   F2-01..04, F2-09, F2-13, F2-14 MUST go red; restore. Then flip `resolve.ts:92` `if (!protectedNs) return ALLOW;`
   to always-ALLOW → same rows red. Confirms the fixtures actually bind the guard, not just its neighbours.
3. **Negative control (AC-6):** temporarily point the new file at `constitutionEmpty()` for F2-01 → it must
   turn ALLOW, proving the DENY was data-driven not incidental; revert.
4. **No-regression:** diff test count before/after; if §2.C included, confirm none of the 7 swapped suites
   flipped an expectation (any flip = flag per §2.C caveat, not a silent fix).
5. **Reviewer gate:** `/pos-review` or reviewer agent PASS on the new file + helper (evidence: line refs to
   engine.ts:113 and resolve.ts:86-93).

### 4.3 Out of scope (flag, do not build here)

- The hardcoded `'project:ff'` scope in `canWriteNamespace` (resolve.ts:93) — a multi-tenant scope bug is a
  SEPARATE fork, not an F2-seed fixture. Note it; don't fix under this spec.
- The `T-actor-delegation` open fork (self-declared privileged `actor`) — needs an authenticated principal
  source (M5 surface-identity), out of Stage-1 scope (engine.ts:96-98). F2 fixtures gate the *capability*, not actor authenticity.
