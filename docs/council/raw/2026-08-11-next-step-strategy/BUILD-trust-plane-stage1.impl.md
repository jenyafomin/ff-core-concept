---
type: impl
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-11
title: BUILD — trust-plane Stage-1 (force-bind write-side PEP) — F1/F2/F3 closed
scope: packages/engine, packages/rental-balance (branch refactor-tree)
related:
  - ./PREMISE-CHECK-trust-bugs.analysis.md
  - ./AGENT-LAYER-map.analysis.md
  - packages/engine/src/engine.ts
  - packages/engine/src/core/resolve.ts
  - packages/rental-balance/src/core/constitution.ts
  - packages/engine/test/trust-plane.test.ts
---

# Stage-1 trust-plane fix — what shipped

Wired a **write-side Policy Enforcement Point** into `Engine.write()` so the write plane can no longer
bypass the authority gates the read plane already routes through. Enforcement style = **force-bind**
(owner-ratified). Contract/`ports/` **UNCHANGED** — `write(act): Ack` signature is identical.

## Changes (file:line)

### F3 · `T-write-pep-unwired` — write PEP wired (engine.ts:73–130)
`packages/engine/src/engine.ts` `write()`:
- `const finalized` → `let finalized` (line 75) so the engine can force-bind fields.
- New PEP block after `admitHome`, before idempotency/`writeAct` (~lines 89–124). It runs **only for
  projectable `domain_event`s** (`isProjectable(finalized)`), because only those fold into a graph node
  (their `source_ref`) and thus are the only acts that can touch canonical / control-plane state. The
  target node the authority is resolved against = `sourceRefOf(finalized)`.
- Non-projectable acts (observation / agent_trace / …) are **not** control-plane gated — they never
  mutate canonical truth (balance-observer's observations pass unchanged).

**Force-bind:** the writer principal is `finalized.actor`, treated as **DATA** (who claims to write),
never as the **basis** of authority. Authority is resolved only from provenance-checked grants in the
graph. For grant writes the engine **stamps `minted_by = finalized.actor`** — the act body can no longer
self-declare `minted_by:'system'`.

### F2 · `T-policy-node-provenance` — namespace ceiling enforced on write
- engine.ts (~line 111): `if (this.policy.canWriteNamespace(finalized.actor, targetId, this.graph) === 'deny') return refuse`.
- `packages/rental-balance/src/core/constitution.ts:17` — `protected_namespaces: []` →
  `['policy:', 'meta:cap/core:']`. Now the Constitution and core-capability families are sealed; a
  writer lacking `core:manage-core` is refused. Empty-list constitutions (all engine fixtures) stay a
  no-op ⇒ zero behavioural change for existing writes.

### F1 · `T-grant-forgery` — minting is gated + provenance-bound
- engine.ts (~line 119): for a grant write (`payload.type==='grant'` or `targetId` startsWith `grant:`),
  `if (this.policy.canMintGrant(finalized.actor, grantView, this.graph) === 'deny') return refuse`
  (requires `core:manage-grants`). A holder-less self-mint is refused **before** it can reach the
  projection.
- resolve.ts `grantValid` (lines 136–149): logic unchanged, **comment rewritten** to record the new
  invariant. The `minted_by:'system'/'engine'` shortcut is the **substrate root-of-trust axiom** (a
  seeded grant), NOT a bearer token — because the ONLY path a non-substrate grant enters the graph is
  `Engine.write()`, now force-bound + `canMintGrant`-gated. See "Reasoned deviation" below.

## Force-bind realisation (concretely)
The frozen `write(act)` port exposes only `act.actor` as identity. Stage-1 force-bind = (1) the engine
**stamps** engine-controlled fields (`recordedAt` already; now `minted_by` on grant writes), so the body
cannot self-declare authority-bearing provenance; (2) all authority is resolved from graph grants against
`actor`-as-datum, never from the act body. There is no trusted *authenticated* principal source in the
port, so `actor` itself remains self-declared — see STOP-flag.

## Negative + positive tests added
`packages/engine/test/trust-plane.test.ts` (9 tests, all green):
- **F2 exploit REFUSED** — mallory rewriting `policy:constitution` (default:allow, empty protected list) →
  `ok:false`, 0 journal entries.
- **F2 exploit REFUSED** — mallory writing an un-enumerated `meta:cap/core:*` node (prefix ceiling) → refused.
- **F2 CONTROL** — admin (`core:manage-core`) writes a policy node → `ok:true`.
- **F1 exploit REFUSED** — mallory self-minting `grant:mallory-pwn` allow:`['core:*']`, `minted_by:'system'`
  → `ok:false`, 0 journal entries; and `holdsCapability('user:mallory','core:manage-core')` stays `false`.
- **F1 CONTROL + FORCE-BIND** — admin mints a grant; the projected node's `body.minted_by === 'user:admin'`
  (self-declared `'system'` overridden by the engine).
- **F3** — a self-declared actor buys no authority (mallory→`policy:constitution` refused regardless of body).
- **REGRESSION** — ordinary write to non-protected `customer:42` still passes; non-projectable observation
  still passes (balance-observer path).

## Test results (numbers)
- engine: **104 → 113 passed** (+9 trust-plane), 1 todo. `tsc --noEmit` clean.
- rental-balance: **21 passed** (unchanged), typecheck clean.
- ingest-rentacar: 32 passed; core: 14 passed — full workspace **180 passed, 0 failed**.

## Fixtures touched & why
- `rental-balance/src/core/constitution.ts` — added the two protected namespaces (F2 requires the seed to
  actually list them; the ceiling code was correct but its list was empty). rental-balance writes only
  `customer:`/`payment:`/`iam:Resource#` refs → none protected → no test broke.
- **No engine fixture changed.** Premise-check feared "fixtures writing without grants will break" — this
  did NOT materialise: existing writes target non-protected namespaces and every engine-fixture
  constitution has `protected_namespaces: []`, so the ceiling is a no-op for them. All grants are seeded as
  substrate (never written via `write()`), so the mint gate touches no existing test.

## Blast-radius (actual)
- **Contract / `ports/`: NONE.** `write(act): Ack` unchanged; `EngineClient` unchanged.
- **Behaviour:** writes into `policy:*` / `meta:cap/core:*` now require `core:manage-core`; grant writes
  require `core:manage-grants`; grant `minted_by` is engine-stamped. Ordinary writes (non-protected
  namespaces) and all non-projectable acts are unaffected.

## Reasoned deviation from the literal task
The task named `resolveWrite`/editing `grantValid:136–141`. I wired the **integrity ceiling**
(`canWriteNamespace` + `canMintGrant`) — the trust-relevant portion of the write PEP — rather than the
**full `resolveWrite` allowlist-fold**. Reason (verified against code): FIXED `resolveWrite` returns a
default-DENY floor unless the target node's `access.can_write` allowlist or a space policy authorises the
writer; projected nodes always carry `access:{}` and fresh creates have no node, and `resolveWrite` has no
capability path for a generic write. So enforcing the full fold would **deny every ordinary/create write**
and force a decision on "what authorises an ordinary write" — the empty `brain↔agents` write-contract
(AGENT-LAYER §4). That is an unresolved design fork, not a Stage-1 fix. The ceiling closes all three
exploit paths without opening it. `grantValid`'s body-parse is left as the substrate axiom because a
forged `minted_by:'system'` is indistinguishable from a legit seed by body alone — the distinction is
provenance, which only exists at the (now-gated) write boundary.

## STOP-flags / open tails (NOT hacked around)
1. **T-actor-delegation (residual, flagged not closed).** Under the frozen `write(act)` port, `actor` is
   self-declared. Force-bind stamps engine-controlled fields but cannot authenticate the actor. So an
   actor that **impersonates a privileged principal** (e.g. `actor:'user:admin'` who really holds
   `manage-core`) would pass. Closing this needs an **authenticated principal source** (implement the
   `ViewerResolver` seam into the write path, or change the port) — explicitly out of Stage-1 / force-bind
   per the brief. The premise-check's exploit paths (ordinary actor mallory self-minting / overwriting) ARE
   closed.
2. **Ordinary-write authorization (create-contract) is deliberately NOT enforced** (see deviation). Needs
   the `brain↔agents` write-contract spec + an owner decision before wiring the full `resolveWrite` fold.
3. **Grant namespace vs cap split:** grants are gated by `canMintGrant` (`core:manage-grants`); policy/meta
   by `canWriteNamespace` (`core:manage-core`). `grant:` was intentionally left OUT of
   `protected_namespaces` to keep the mint authority = manage-grants (not manage-core).
