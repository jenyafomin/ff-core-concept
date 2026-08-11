---
node_type: analysis
title: "U3 — depth/dataflow: who supplies viewer/subject/actor TODAY, spoofing path, erasure intersection"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
lens: analyst (depth/dataflow)
related:
  - ../actor-model.question.md
  - ../../02-truth-keystone/
run_index: ../../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
---

# U3 depth/dataflow — actor/subject/viewer: real callers, real gaps

Method: grep-verified, `file:line` only. No claim without a verbatim anchor. Absences are marked
`needs-anchor` and named explicitly (per task rules).

## 1. Who supplies each of the three roles TODAY, and from where

### `viewer: SubjectRef` (`packages/engine/src/core/types.ts:151`, on `GraphContext`)

Traced every call site that constructs a `viewer` value:

- **CLI surface** — `packages/engine/src/surface/cli.ts:67` (`resolve` verb) and `:78` (`view` verb):
  `const viewer = flag('viewer') ?? '';` — a raw `--viewer` string typed by whoever runs the CLI
  process. No parsing, no lookup, no auth. Default is the empty string `''` (not a refusal — an
  empty-string `SubjectRef` that flows straight into `resolve()`).
- **`Engine.view()`** (`packages/engine/src/engine.ts:65-66`) and **`Engine.resolve()`**
  (`packages/engine/src/engine.ts:69-70`) — both take `viewer: SubjectRef` as a caller-supplied
  parameter and forward it verbatim to `policy.resolve(...)`. The `Engine` class performs **no
  verification** of `viewer` anywhere in its constructor or methods (confirmed by reading the full
  class body, `packages/engine/src/engine.ts:33-111` — the only guards present are `policy.mode`
  and `CONSTITUTION_ID` presence, nothing about identity).
- **Tests** hardcode `viewer` as literal strings, e.g. `packages/engine/test/invariants.test.ts:60`
  (`viewer: 'agent:ff-personal'`), `packages/engine/test/cli-durable.test.ts:38`
  (`const VIEWER = 'agent:reader'`) — i.e. the entire test suite treats `viewer` as an
  ambient, self-declared constant, never as something a resolver produced.
- **`BalanceObserverAgent`** (`packages/rental-balance/src/agent/balance-observer.ts:37`):
  `private readonly viewer: string = OBSERVER_ACTOR` — a hardcoded default baked into the
  constructor, again not resolved from any external identity.

**`ViewerResolver.resolveViewer()`** (`packages/engine/src/ports/viewer-resolver.ts:14`) is the
declared seam that is *supposed* to produce a trustworthy `viewer` from a surface identity — but
grep across the whole repo (excluding `dist/`) shows **zero call sites**:
```
packages/engine/src/ports/viewer-resolver.ts:2   (declaration/comment)
packages/engine/src/ports/viewer-resolver.ts:12  (interface)
packages/engine/src/ports/viewer-resolver.ts:14  (method signature)
```
No `.ts` file anywhere imports or invokes `resolveViewer`. `needs-anchor`: there is no
implementation and no caller — confirmed absence, matching the file's own header
(`packages/engine/src/ports/viewer-resolver.ts:2` — "PAPER-FREEZE ONLY at M0"; `:8` — `TODO(M5)`).

**Verdict on `viewer`: 100% client-supplied on trust, today.** Every real code path that produces a
`viewer` value is either a CLI flag, a test literal, or a hardcoded constant. None of them touch an
authentication or identity-resolution mechanism.

### `subject: SubjectRef` (`packages/engine/src/core/types.ts:160`, on `GrantBody`)

This is **not** a "whose-record/whose-consent" field, contrary to how the question's anchor list
frames it (`actor-model.question.md:42`, `invariants.md:54` do not actually use this field for
consent — see §3 below for the conflation this causes). In code, `GrantBody.subject`
(`packages/engine/src/core/types.ts:159-160`) is the **grantee of a capability**: whom a
`capability` node's grant applies to. Confirmed by every consumer:
- `packages/engine/src/core/resolve.ts:130` — `subjMatch(g.body?.subject as string, minter)`
  (checking whether the *minter* matches an existing grant's subject, inside `canMintGrant`).
- `packages/engine/src/core/resolve.ts:148` — `subjMatch(g.body?.subject as string, viewer)`
  (inside `holdsCapability`: does this grant's `subject` match the `viewer` asking?).

So `GrantBody.subject` is supplied by **whoever authored the grant node** (a capability-minting act,
itself gated by `canMintGrant`/`canMintCapability`, `packages/engine/src/core/resolve.ts:69-99`) —
i.e. it inherits the same trust problem as `actor` (§ below), one level removed: a grant's `subject`
field is only as trustworthy as the `actor` who wrote the grant act, and that `actor` is unverified
(see §1.3). `needs-anchor`: there is no code field literally named `subject` that means "the person
whose data this act is about" — that role is carried by `provenance.source_ref`
(`packages/engine/src/core/types.ts:187-193`, the `Provenance` interface), a **plain string keyed to
the *source system*** (e.g. `packages/rental-balance/test/erasure-byref-shred.test.ts:43`:
`` `${orderSourceRef(NUM_CORE)}:customer` `` → `"sheets:Orders#45832-2865:customer"`), not a
`SubjectRef`. This is a real gap in the question's own framing — flagged, not silently fixed (see §3).

### `actor: SubjectRef` (`packages/engine/src/core/types.ts:217`, on `Act`)

`actor` is a **required field on the `Act` interface** (`packages/engine/src/core/types.ts:216-217`:
`id: string; actor: SubjectRef; ...` — no `?`, TypeScript requires *a* string at compile time). Who
actually supplies it at runtime:
- `Engine.write(act: Act)` (`packages/engine/src/engine.ts:73-108`) takes the whole `Act` — including
  `actor` — as a caller-supplied object. The only field it overrides is `recordedAt`
  (`packages/engine/src/engine.ts:75`: `const finalized: Act = { ...act, recordedAt: new
  Date().toISOString() }` — comment confirms "ignore any caller-supplied value" for `recordedAt`
  ONLY). `actor` passes through untouched into `admit()`, `admitHome()`, idempotency check, and
  `this.store.writeAct(finalized)` (`packages/engine/src/engine.ts:105`).
- **`admission.ts`** (`packages/engine/src/core/admission.ts`, full file read) — grep for `actor`
  inside it returns **no matches**. The admission gate scans `payload` for inline PII
  (`packages/engine/src/core/admission.ts:1-56`+) and never inspects `actor`.
- **`envelope-validator.ts`** (`packages/engine/src/core/envelope-validator.ts:26-77`, full function
  read) validates `graph.nodes` against `ENVELOPE_FIELDS` (presence of the 10 envelope fields on a
  **projected node**, not the raw `Act`) plus edge/type/predicate integrity — it never singles out
  `actor` for a presence or authenticity check. Grep for `actor` inside this file: **no matches**.
  This directly contradicts the enforcement claim in `invariants.md:36-37` ("*enforced at:*
  `core/envelope-validator.ts` — act без `actor`/`provenance` отклоняется") — the file that exists
  does not do this; TypeScript's static `actor: SubjectRef` (non-optional) is the only thing
  standing in for it, and TypeScript types are erased at runtime (any JS caller, or any `as Act`
  cast, can supply an empty or arbitrary string). **This is a documentation/code divergence**, not
  merely an unverified-identity gap — flag for the critic/owner.
- Every test file constructs `actor` as a free-typed literal (e.g.
  `packages/engine/test/idempotency.test.ts:38`: `actor: 'sync:other'`;
  `packages/rental-balance/test/erasure-byref-shred.test.ts:168`:
  `{ actor: 'agent:erasure', id: ... }` passed into `buildErasedAct`).

**Verdict on `actor`: also 100% client-supplied on trust.** `invariants.md:54`'s claim ("actor
подставляется клиентом на доверии, см. связку с I-7") is **confirmed by code** — but the *specific*
enforcement mechanism `invariants.md:36-37` cites (`envelope-validator.ts` rejecting an act without
`actor`) does **not exist** in the current file. Two different claims, two different verdicts:
presence-of-trust-gap = confirmed; cited-enforcement-mechanism = not found (`needs-anchor`).

## 2. Spoofing path — what breaks, and is there an I-7 bypass

**Read-path spoofing.** If a caller supplies a false `viewer` (e.g. claims `'agent:ff-personal'`
without being it), every gated read call —
`packages/engine/src/core/view-compiler.ts:58,102,142,223` and
`packages/engine/src/core/resolve.ts:235-248` (`resolveRead`) — evaluates allow/deny against that
false claim as if it were true. `resolveRead` checks `node.visibility.readable_by` /
`node.access.can_read` allowlists (`packages/engine/src/core/resolve.ts:236`) and tenant capability
via `holdsCapability` (`:247`) — **all keyed by string match** (`subjMatch`,
`packages/engine/src/core/resolve.ts:34`) against the unverified `viewer` string. A caller who knows
or guesses another subject's ID (`'user:jenya'`, `'agent:ff-personal'`) reads everything that
subject can read. This is the literal mechanism `invariants.md:134` describes as the residual hole:
*"HTTP-клиент сам называет `viewer`... без реальной аутентификации → дыра S1-класса"*
(`docs/02-project/core/00-kernel/invariants.md:143-144`) — confirmed, code matches doc here.

**Write-path spoofing.** If a caller supplies a false `actor` on `write()`, the act is admitted
(subject only to the PII-inline scan, `packages/engine/src/core/admission.ts`) and appended to the
journal under someone else's name — permanently, since `I-4` (`invariants.md:71-75`) makes acts
immutable after accept. There is no re-check of `actor` against `viewer`/session identity anywhere
in `Engine.write()` (`packages/engine/src/engine.ts:73-108`, read in full — confirmed no such check).
Concretely: `buildErasedAct(target, { actor: 'agent:erasure', id })`
(`packages/engine/src/core/erasure.ts:117-137`) accepts `opts.actor` as a **bare string parameter**,
no verification it is the caller's real identity — anyone who can call this function can attribute an
erasure to any actor string.

**Is there an I-7 bypass (a path to payload/erasure that skips `resolve()` entirely)?**
- All **read** lenses route through `ctx.policy.resolve('read', ...)` —
  `packages/engine/src/core/view-compiler.ts:58,102,142,223` — confirmed, no direct
  `store.load()`/`store.acts()` call in the read/view path that skips policy (grep of
  `view-compiler.ts` shows every node emission gated).
- **`BalanceObserverAgent.readGraph()`** (`packages/rental-balance/src/agent/balance-observer.ts:42`):
  `this.store.load().filter((n) => this.engine.resolve('read', this.viewer, n) === 'allow')` — also
  routes through `resolve()`, confirmed.
- **Write path**: `Engine.write()` does **not** call `resolve()`/`resolveWrite` at all — grep of
  `packages/engine/src/engine.ts:73-108` shows no call to `this.policy.resolve(...)` or
  `resolveWrite(...)` inside `write()`. The only gates on write are `admit()` (PII-inline scan) and
  `admitHome()` (one-home barrier) plus idempotency. **`resolveWrite`/`canWriteAccessFields` exist on
  `PermissionPolicy`** (`packages/engine/src/core/resolve.ts:190-231`) but grep shows **no call site**
  that invokes them from `Engine.write()` or anywhere else in `src/` (only test files call
  `resolveWrite`/`canWriteAccessFields` directly, e.g. inside `resolve.ts` itself as a private
  method chain). This means **today, `write()` is not gated by the write half of the PEP at all** —
  a structurally different, and louder, finding than the read-side spoofing hole. **Flag loudly:**
  this reads like a partial I-7 bypass on the *write* side — `resolve()`'s write half
  (`resolveWrite`, `packages/engine/src/core/resolve.ts:190-231`) is fully built but **never wired
  into `Engine.write()`**. `needs-anchor` for any call site wiring it in — none found. (Scope note:
  this may be intentional/out-of-scope for U3 — it is a `write`-gate wiring gap, not itself the
  actor-identity gap this question targets; recorded here because it changes the blast radius of "a
  spoofed actor" from "mislabeled provenance" to "mislabeled provenance AND no write ACL check
  today.")
- **Erasure path**: `buildErasedAct()` (`packages/engine/src/core/erasure.ts:117-137`) is a pure
  function with no side effects; the caller is responsible for sequencing
  `payloadStore.shred(target.payloadRef)` then `store.writeAct(buildErasedAct(...))`
  (comment at `packages/engine/src/core/erasure.ts:110-112`). Neither step calls `resolve()`. Since
  `write()` itself doesn't call `resolve()` either (finding above), the erasure path's exposure is
  the *same* write-gate gap, not a separate bypass specific to erasure.

## 3. Intersection with erasure/consent

The question brief (and `invariants.md:54`) treats `subject` as "чьё согласие/стирание". Code does
**not** carry that meaning on any `SubjectRef`-typed field:
- The record identity an erasure targets is `provenance.source_ref`
  (`packages/engine/src/core/types.ts:187-193`), a source-system key string (e.g.
  `"sheets:Orders#45832-2865:customer"`, `packages/rental-balance/test/erasure-byref-shred.test.ts:43`),
  **not** a `SubjectRef` and **not** validated against any real person/agent identity.
- `GrantBody.subject` (§1) means "grantee of a capability", unrelated to "whose data got erased".
- `buildErasedAct()` (`packages/engine/src/core/erasure.ts:117-137`) records **who performed the
  erasure** (`opts.actor`) and **which act it erases** (`edges: [{ predicate: 'erases', target:
  target.id }]`, `:133`) — it does **not** record or check *whose consent* authorized the erasure.
  There is no `consent_event`-style field on the erasure path analogous to
  `resolve.ts:271`'s `action.body?.consent_event` (that consent valve exists for a different
  mechanism — irreversible **capability actions**, gated in `valveGate`,
  `packages/engine/src/core/resolve.ts:265-272` — and is not wired to erasure at all; grep confirms
  `valveGate` and `erasure.ts` never reference each other).

**Consequence:** because (a) `actor` on the erasure act is unverified (§1.3), and (b) the record
being erased is identified by an opaque source-system string with no link back to a `SubjectRef`
that could be resolved/verified, and (c) there is no consent-check wired into the erasure path at
all — the erasure/consent story today has **no cryptographic or structural tie between "who asked
for the erasure" and "who is authorized to ask"**. This sharpens (does not just restate) the U3
framing: the gap is not only "actor is unverified" but "there is no `subject`-as-data-owner concept
in code to check the unverified actor against" — the two gaps compound. `needs-anchor`: no code
defines "data subject = person whose PII this act's payload concerns" as a typed, resolvable
identity anywhere in `packages/engine` or `packages/rental-balance`.

## 4. Dependencies before `ViewerResolver` can be implemented

Grep-derived, not aspirational:
1. **A surface identity source that doesn't exist yet.** `resolveViewer(surfaceIdentity: string)`
   (`packages/engine/src/ports/viewer-resolver.ts:14`) takes an opaque string in — but nothing in
   `packages/` produces one. `SurfacePort` (`packages/engine/src/ports/surface-port.ts:20-25`) is
   itself "PAPER-FREEZE ONLY at M0" (`:2`) with a `TODO(M5)` (`:9`) and has **zero implementations**
   (grep for `implements SurfacePort`: none). So `ViewerResolver` has no upstream caller today even
   in principle.
2. **Telegram uid → SubjectRef mapping is entirely unbuilt.** Grep for `telegram`/`Telegram` across
   all `packages/*.ts` (excluding `dist/`) returns exactly one hit: the comment in
   `viewer-resolver.ts:8` itself (`TODO(M5): implement per-surface identity resolution (Telegram uid
   → user:… / agent:…)`). No mapping table, store, or adapter exists — this is a **from-scratch**
   build, not a wiring task.
3. **The write-side PEP gap (§2) should be closed or explicitly deferred before or alongside
   `ViewerResolver`**, because a resolved-but-unchecked `viewer`/`actor` on the write path is still
   exploitable — resolving identity on read without gating write leaves half the spoofing surface
   open. This is a real dependency, not scope creep: `ViewerResolver` alone does not close the actor
   spoofing hole if `Engine.write()` still ignores `resolveWrite()`.
4. **An authentication boundary at the surface** — `invariants.md:143-144` already names this
   ("HTTP закрыт за гейтом auth-модели, CLI = доверенный оператор"). No such auth-model code exists
   in `packages/` (grep for `auth` inside `packages/engine/src`: no dedicated auth module). Whatever
   feeds `surfaceIdentity` into `resolveViewer` must itself be authenticated (e.g. Telegram's own
   bot-API sender identity, which the gateway process may already trust — but that trust boundary is
   OUTSIDE `packages/engine` and has no anchor inside this repo's engine code).

## Summary table (verbatim anchors only)

| Role | Type site | Real-world supplier today | Verified? |
|---|---|---|---|
| `viewer` | `types.ts:151` | CLI `--viewer` flag (`cli.ts:67,78`), test literals, hardcoded agent constants | No — `needs-anchor` for any resolver call site |
| `subject` (GrantBody) | `types.ts:160` | Grant-authoring `actor` (via `resolve.ts:130,148`) | No — inherits `actor`'s trust gap |
| `actor` | `types.ts:217` | Caller-supplied `Act.actor` field, passed through `engine.ts:75` untouched | No — `admission.ts`/`envelope-validator.ts` do not check it (contra `invariants.md:36-37`) |
| "data subject" (consent/erasure) | *(no field)* | `provenance.source_ref` (opaque string) | N/A — concept doesn't exist as a `SubjectRef` |

## Open question

`Engine.write()` never calls `resolveWrite`/`canWriteAccessFields` (`resolve.ts:190-231` is fully
implemented but has no production call site) — is this write-gate wiring gap already tracked as its
own task (distinct from U3/T-actor-identity), or does it need a fresh pool entry? It changes the
severity of "spoof the actor" from label-only to label-plus-no-ACL-check, so the owner-facing framing
of U3 may need this fact even though it is not itself an actor-*identity* gap.
