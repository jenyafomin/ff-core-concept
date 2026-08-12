---
type: review
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-11
title: REVIEW — trust-plane Stage-1 (force-bind write-PEP) — independent adversarial verdict
scope: packages/engine, packages/rental-balance (branch refactor-tree)
related:
  - ./PREMISE-CHECK-trust-bugs.analysis.md
  - ./BUILD-trust-plane-stage1.impl.md
  - packages/engine/src/engine.ts
  - packages/engine/src/core/resolve.ts
  - packages/engine/test/trust-plane.test.ts
  - packages/rental-balance/src/core/constitution.ts
---

# Review Result: PASS-WITH-CAVEATS

Stage-1 delivers exactly the scope it declared (integrity ceiling wired into the hot write path,
naive body-forgery closed, force-bind, contract stable, 180 tests green). **BUT the headline goal
«агент не может сломать доверие/тождество/правду/согласие» is NOT achieved:** a one-string actor
spoof (`actor:'user:admin'`) reopens full privilege escalation AND constitution overwrite. The
builder disclosed this as STOP-flag #1 (owner-ratified out-of-scope), so it is a *known residual*,
not a hidden defect — but its criticality is HIGH because it is trivially exploitable.

I verified every claim against code + tests (not the build report). All numbers are true.

---

## Point-by-point evidence

### 1. F1 grant-forgery — PARTIALLY closed
- **Naive path CLOSED.** Real actor `mallory` writing `minted_by:'system' allow:['core:*']` is
  refused at `engine.ts:120-124` (`canMintGrant` DENY — mallory lacks `core:manage-grants`), and
  force-bind (`engine.ts:107`) overwrites `minted_by` with the writer anyway. Negative test
  `trust-plane.test.ts:122-136` asserts `ok:false` + `store.acts()` length 0 — real assertion.
- **The `grantValid` `system`/`engine` shortcut (`resolve.ts:146`) is acceptable IN ISOLATION.** To
  land a written grant carrying `minted_by:'system'` you'd need `actor:'system'`, which fails
  `canMintGrant` (`system` holds no grant). So the axiom is not directly reachable via `write()`.
  Builder's reasoning here is sound. It is NOT a standalone hole.
- **BUT F1 fully reopens via impersonation** — see Point 2.

### 2. ★ ACTOR-IMPERSONATION BYPASS — CONFIRMED, YES (CRITICAL)
The principal the PEP gates against is `finalized.actor` (`engine.ts:100,113,122`), a caller-supplied
string with no authentication. I ran a live adversarial probe: `mallory` sets `actor:'user:admin'`
(who genuinely holds `manage-core`+`manage-grants`) and:
- **Escalation succeeded:** minted `grant:mallory-pwn subject:user:mallory allow:['core:*']` →
  `ok:true`; `holdsCapability('user:mallory','core:manage-core')` → **true**. force-bind stamped
  `minted_by:'user:admin'`, which `grantValid`→`granterHasManageGrants` then trusts (admin has a
  system grant). Full self-grant of the irreversible-action bypass.
- **Constitution overwrite succeeded:** `actor:'user:admin'` writing `policy:constitution`
  `default:'allow' protected_namespaces:[]` → `ok:true`. Identity/truth broken.

The fix moves forgery from one string field (`minted_by`) to another (`actor`) — **same attacker
effort, same result.** Against a naive/accidental write it helps; against a deliberate agent it does
not. This is builder STOP-flag #1; closing it needs an authenticated principal source
(ViewerResolver seam / port change).

### 3. F2 policy-overwrite — CLOSED against ordinary actor (config-dependent)
- Ceiling IS enforced on the write path: `engine.ts:113` calls `canWriteNamespace` before
  `writeAct`. Gate at `resolve.ts:86-94`. Tests `trust-plane.test.ts:88-118` prove mallory refused
  (policy + `meta:cap/core:` prefix) and admin passes — real assertions, 0 journal entries.
- Real seed non-empty: `constitution.ts:17` now `protected_namespaces:['policy:','meta:cap/core:']`.
- **CAVEAT:** protection is per-deployment config. Engine's own fixtures still ship
  `protected_namespaces:[]`; there is no single canonical enforced seed inside the engine package. A
  deployment whose constitution omits the list silently fail-opens F2. `grant:` is deliberately NOT
  listed (relies on `canMintGrant`) — acceptable. Reopens under impersonation (Point 2).

### 4. F3 write-PEP placement — CORRECT
- PEP block is in the hot path, `engine.ts:99-126`, BEFORE idempotency and `store.writeAct`
  (`:150`). Not a dead branch.
- Gated only for `isProjectable` domain_events (`projection.ts:42-44`); observation/agent_trace
  skip it. Balance-observer path unbroken — regression test `trust-plane.test.ts:186-194` passes;
  rental-balance 21/21 green.

### 5. Contract / ports — UNCHANGED (verified)
`git diff HEAD -- packages/engine/src/ports/` is **empty**. `write(act):Ack` and `EngineClient`
identical. Only `engine.ts` (+46), `resolve.ts` (+7, comment-only in `grantValid`), `constitution.ts`
(+config) changed.

### 6. Tests — numbers TRUE, negatives genuine
Ran all four packages myself: engine 113(+1 todo), core 14, rental-balance 21, ingest-rentacar 32 =
**180 passed**. `tsc --noEmit` clean (engine exit 0). Negative tests assert both `ack.ok===false`
AND `store.acts()` length 0 — not vacuous.

---

## STOP-flag #2 assessment (no full `resolveWrite` allowlist-fold) — CORRECT, not concealment
Wiring the full default-deny fold would deny every ordinary create: projected nodes carry
`access:{}` (`projection.ts:118`) and `resolveWrite` has no capability path for a generic create
(`resolve.ts:198-240`), so the floor at `:239` would reject all normal brain↔agents writes. That is
a genuine unresolved design fork (the empty write-contract), not a Stage-1 fix. Scoping to the
integrity ceiling and flagging the fork is honest, sound engineering. **Consequence to note:**
ordinary (non-protected) writes remain entirely ungated — any actor may create/overwrite any
non-protected node. Acceptable for Stage-1 *only because* trust-critical state lives in protected
namespaces — a boundary that Point 2 defeats.

---

## What Stage-1 REALLY closed vs left open

**Closed (real):**
- Write plane is no longer authority-blind — integrity ceiling on the hot path (F3 wiring).
- Naive body-forgery: self-declared `minted_by:'system'` buys nothing (force-bind + `canMintGrant`).
- Constitution / core-cap overwrite by an *unprivileged, truthfully-named* actor (F2), given a
  seed that lists the namespaces.
- No contract/port regression; balance-observer intact; 180 green.

**Open (critical):**
- **Actor impersonation** (Point 2) — a self-declared privileged `actor` reopens F1 AND F2 fully.
  This defeats the stated goal. Needs an authenticated principal (out of force-bind Stage-1).
- Ordinary-write authorization deliberately unenforced (create-contract fork).
- F2 protection is config-dependent (engine fixtures ship empty lists; no canonical enforced seed).

**Bottom line:** PASS on the delivered force-bind scope; the trust goal itself remains **OPEN and
critical** until an authenticated actor source lands. Merge is safe (no regression), but do not
record «доверие защищено» — record «наивная подделка закрыта; спуфинг актора — следующий гейт».
