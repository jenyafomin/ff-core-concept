---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: system-architect (mechanism · lifecycle · trust-boundary placement)
title: "Write-principal seam — MECHANISM & LIFECYCLE of the authenticated source (A vs C, deep)"
scope: packages/engine (ports/, engine.ts, core/types.ts) — branch refactor-tree
phase: DESIGN (mechanism for a deferred enforcement; NO code)
related:
  - ../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md   # ①invariant ②form(in code) ③OPEN=subject
  - ../../../../../packages/engine/src/core/types.ts                              # Act.principal?: PrincipalAssurance (reserved form)
  - ../../../../../packages/engine/src/ports/viewer-resolver.ts                   # read-side principal seam (paper-freeze)
  - ../../../../../packages/engine/src/ports/engine-client.ts                     # FROZEN write(act): Ack
  - ../../../../../packages/engine/src/ports/surface-port.ts                      # submit(viewer, act) — principal already separate
  - ../../../../../packages/engine/src/engine.ts                                  # write-PEP ~73-130, gates finalized.actor
  - ../synthesis/02-resolution.synthesis.md                                       # "one principal-seam for read+write"
  - ../analyses/02-actor-dataflow.analysis.md                                     # actor/viewer 100% client-supplied today
  - ../../../../council/raw/2026-08-11-next-step-strategy/DESIGN-principal-auth-seam.design.md  # §1 A/B/C sketch (this goes DEEPER)
---

# Write-principal seam — mechanism & lifecycle

> DESIGN, not a decision, not a build. Builds ON ADR-0010 (①invariant ratified, ②form in code) and the
> actor-model resolution ("one principal-seam"). Angle: the EXACT mechanism and lifetime by which an
> **authenticated** write-principal enters the write path — and where the trust boundary actually sits.
> A/B/C are already named; this file does not re-argue them, it specifies A and C to the shape level.

## 0. The reframe the sketch missed: `write(act): Ack` is FROZEN, so the principal cannot be a parameter

The council sketch (§1-A) proposed `write(act)` → `write(act, principal)`. **ADR-0010 forbids that**
(critic edit #3, `ADR-0010:127-128`: unfreezing `write()` prematurely fixes A over B). So the whole design
must satisfy one hard constraint:

> The authenticated principal must reach the engine **without** changing `write(act): Ack`
> (`ports/engine-client.ts:22`).

That leaves exactly two carriers for the principal:
1. **The closure** around a `write` implementation (the principal is captured, not passed) → **Mechanism C**.
2. **A separate boundary call** that stamps the act, then invokes the frozen `write(act)` → **Mechanism A**,
   whose natural signature already exists: `SurfacePort.submit(viewer, act)` (`surface-port.ts:24`) — the one
   place principal is *already* separate from the act body.

Both keep `write(act): Ack` literally untouched. This is the key result: **A and C are not "param vs no-param";
they are two _lifetimes_ of the same stamping mechanism.** Everything below develops that.

---

## 1. The seam is TWO parts, not one: a Resolver (symmetric to `ViewerResolver`) + a Stamper (the force-bind)

The read side has one component, `ViewerResolver.resolveViewer(surfaceIdentity): SubjectRef`
(`viewer-resolver.ts:14`). The write side needs the same resolution **plus** an application step, because a
resolved principal is useless until something force-binds it onto the act ahead of the frozen `write()`.

### 1a. Resolution seam — generalize `ViewerResolver` into the ONE principal seam (read + write symmetry)

```ts
// ports/principal-resolver.ts  (design sketch — generalizes viewer-resolver.ts)
import type { SubjectRef, PrincipalTrust } from '../core/types.js';

/** What a trusted seam owner produces from an authenticated surface identity. */
export interface AuthenticatedPrincipal {
  subject: SubjectRef;      // resolved "who", e.g. 'user:jenya' / 'agent:ff-personal'
  trust: PrincipalTrust;    // 'channel' for a trusted channel/handle; 'attested' when B verifies a token
  issuer: string;           // WHO vouched — 'gateway:agents-manager' | 'cli:trusted-operator' | 'issuer:<kid>'
}

export interface PrincipalResolver extends ViewerResolver {
  /** READ principal (inherited, unchanged): surface identity → viewer subject. */
  // resolveViewer(surfaceIdentity: string): SubjectRef;
  /** WRITE principal: surface identity → the AUTHENTICATED actor + trust axis + issuer. */
  resolvePrincipal(surfaceIdentity: string): AuthenticatedPrincipal;
}
```

This is the "one principal-seam for read+write" the actor-model synthesis asked for (`02-resolution.synthesis.md`
§3): the same object resolves the read viewer and the write principal from the same authenticated surface
identity, so a session resolves **once** and holds both. `resolveViewer` stays byte-for-byte compatible → the
existing paper-freeze is not broken, only widened (same additive move as `provenance`).

### 1b. Binding seam — the **Stamper** (this is the actual force-bind, and the actual trust boundary)

```ts
// ports/principal-stamper.ts  (design sketch)
import type { Act } from '../core/types.js';
import type { AuthenticatedPrincipal } from './principal-resolver.js';

export interface PrincipalStamper {
  /** Discard any caller-supplied principal/authority, re-stamp from the AUTHENTICATED principal. */
  stamp(p: AuthenticatedPrincipal, act: Act): Act;
}

// Reference implementation (design sketch — lives at the trusted boundary, NOT in domain code):
function stamp(p: AuthenticatedPrincipal, act: Act): Act {
  return {
    ...act,
    // AUTHORITY force-bind: the body's self-declared actor is OVERWRITTEN with the authenticated subject.
    // (Attribution-vs-authority nuance: see §7 — today they coincide; divergence uses the reserved slot.)
    actor: p.subject,
    principal: {
      // NOTE: any inbound act.principal is DROPPED, never merged — a caller must not smuggle 'channel'.
      whoActed: p.trust,             // 'channel'
      underWhoseAuthority: p.trust,  // 'channel' (no delegation ⇒ equals whoActed)
      issuer: p.issuer,              // retrofit-impossible audit fact — WHO vouched
      // delegation: reserved, left empty (§8 B-compat)
    },
  };
}
```

Two invariants make the stamper a real trust boundary, not theatre:
- **Drop, don't merge** the inbound `act.principal` — otherwise a caller sets `underWhoseAuthority:'channel'`
  in the body and the force-bind migration repeats exactly like `minted_by`→`actor` (`ADR-0010:42`).
- **The stamped act is what gets journaled** → the audit record is honest about who vouched (issuer).

---

## 2. Mechanism A — per-write stamp at the surface boundary (`SurfacePort.submit`)

The principal is supplied **per call**, via the already-separate `submit(viewer, act)` seam.

```ts
// A boundary adapter (design sketch) — implements the paper-frozen SurfacePort.
class SurfaceWriteAdapter implements SurfacePort {
  constructor(
    private readonly engine: EngineClient,       // holds the PRIVATE ref to raw write(act):Ack
    private readonly resolver: PrincipalResolver,
    private readonly channelId: string,          // e.g. 'gateway:agents-manager'
  ) {}

  submit(surfaceIdentity: string, act: Act): void {   // 'viewer' arg = the authenticated surface identity
    const p = this.resolver.resolvePrincipal(surfaceIdentity); // { subject, trust:'channel', issuer:channelId }
    const stamped = stamp(p, act);                              // force-bind actor + principal; drop body claim
    this.engine.write(stamped);                                // FROZEN signature, principal already inside act
  }
}
```

- **Who owns the principal:** the `submit` call frame. **Bound:** at each write. **Lifetime:** one act.
- **Trusted stamper:** the immediate channel/surface that authenticated the session (`channel` trust).
- **Port delta:** ZERO to `write(act)`. Only `SurfacePort.submit` gets a real implementation (it is paper-freeze
  today, `surface-port.ts:2`) + the new `resolvePrincipal`. Additive.

## 3. Mechanism C — per-session handle (factory closes over the principal)

The principal is bound **once** when the handle is issued; every `write` on that handle stamps from the closure.

```ts
// factory (design sketch) — the composition root holds the PRIVATE raw engine; hands out only bound handles.
function makeEngineClient(p: AuthenticatedPrincipal, core: EngineClient): EngineClient {
  return {
    view:    core.view,       // read side unchanged (or wrap with the resolved viewer, symmetric)
    resolve: core.resolve,
    rebuild: core.rebuild,
    write(act: Act): Ack {
      return core.write(stamp(p, act)); // principal rides the CLOSURE, not the parameter list → write() frozen
    },
  };
}

// Default handle preserves today's behavior (staging, §9):
const system = makeEngineClient({ subject: 'system', trust: 'channel', issuer: 'in-process' }, core);
```

- **Who owns the principal:** the returned `EngineClient` handle (a thin decorator over ONE shared `Engine`;
  the store/graph stay shared — only the principal is per-session state). **Bound:** at handle issuance.
  **Lifetime:** the authenticated session.
- **Trusted stamper:** whoever issued the handle (authenticated the session before `makeEngineClient`).
- **Port delta:** ZERO to `write(act)`. The unfreeze is at the **factory/constructor level**, not the method —
  precisely the seam ADR-0010 leaves open. Additive: `makeEngineClient()` with no principal = `system` handle
  = current behavior.

## 4. The unification (deeper than the sketch): A and C are ONE mechanism at two lifetimes

`Resolver → Stamper → frozen write()` is the invariant. A binds the principal for **one act** (session = a call);
C binds it for **many acts** (session = a handle). They compose rather than compete:

```
SurfacePort.submit(id, act)  ==  makeEngineClient(resolve(id)).write(act)    // A ≡ C with session length 1
```

So the real design decision is **not "A or C"** but **"what is the principal's lifetime?"** — and both reuse the
same `Stamper` + `PrincipalResolver`. That collapses the sketch's two rows into one seam with a lifetime knob,
which is what keeps the surface (A) and the batch/agent caller (C) from drifting into two trust models.

## 5. The load-bearing point: the trust boundary is the CALL EDGE, not a body field (ocap encapsulation)

`act.principal` lives on the **Act body** (`types.ts:279`). If the engine trusts `act.principal.underWhoseAuthority`
as read from the body, a malicious direct caller of raw `write()` sets it to `'channel'` themselves — the
`minted_by`→`actor`→`principal` forge migration, one hop further. **The marker on the body is not self-protecting**
(only B's crypto is). Therefore the mechanism's security rests on encapsulation:

- The **raw `Engine`** (the one whose `write()` trusts `act.principal`) is a **private capability**. Its reference
  is held ONLY by the composition root / factory / surface adapter.
- **Untrusted code never gets the raw `Engine`.** It gets a **principal-bound decorator** (C) or reaches write
  only through **`submit`** (A). Both **drop-and-re-stamp** `act.principal`, so a forged body marker is overwritten
  before the raw `write()` sees it.
- This is why the sketch tagged C "object-capability" (`DESIGN §1-C`): the handle *is* the authority. A/C give
  **trusted-boundary** strength (as strong as the encapsulation); **B** gives **self-verifying** strength
  (marker valid regardless of call path). Consistent with ADR-0010's "channel weak vs attested strong".

**Consequence for enforcement:** the raw `Engine.write()` must, at minimum, treat an inbound `act.principal` from
an unstamped path as `unverified` — i.e. the engine may only ever *raise* trust via a stamp it can attribute to a
trusted seam, never accept a self-declared 'channel'. In A/C the stamper guarantees this by construction.

---

## 6. Lifecycle comparison

| Axis | A — per-write (`submit`) | C — per-session handle (`makeEngineClient`) |
|---|---|---|
| Principal owner | the `submit` call frame | the returned `EngineClient` decorator |
| Bound when | every write | once, at handle issuance |
| Lifetime | one act | the authenticated session |
| `write(act):Ack` change | none (rides in stamped act) | none (rides in closure) |
| Symmetry w/ `ViewerResolver` | resolve per submit | resolve once, hold viewer+principal together |
| Natural caller | surfaces (mini-app, Cardex) | agents/batch (agents-manager M3), CLI operator |
| Delegation path | needs explicit per-call arg | attenuated sub-handle (ocap) |
| Trust strength | as strong as the channel | as strong as issuance |

**Cleanest composition:** **C is primary.** It keeps `write(act):Ack` literally frozen, makes the principal a
first-class session object (mirroring how a resolved `viewer` is a session value), and gives delegation a natural
home (attenuated sub-handle) without a new envelope field. **A is C at session-length-1**, and is the right shape
for surfaces because `submit(viewer, act)` already separates the principal. Recommendation: **build the shared
`PrincipalResolver`+`Stamper` once; expose C (`makeEngineClient`) as the primary handle and A (`submit`) as the
surface facade over it.** One seam, two lifetimes.

---

## 7. Enforcement wiring (design only) — the minimal additive path, and the `unverified→channel` flip

Today the write-PEP gates `finalized.actor` **unconditionally** (`engine.ts:99-126`: `canWriteNamespace(finalized.actor,…)`,
`canMintGrant(finalized.actor,…)`). The additive change reads the reserved authority axis and decides whether
`actor` may be TRUSTED as an authority basis:

```ts
// inside Engine.write(), additive — no signature change, no new branch on the happy path
const vouched = (finalized.principal?.underWhoseAuthority ?? 'unverified') !== 'unverified';
// authority basis: the stamped actor IFF a trusted seam vouched; otherwise no authority (attribution only)
const authority: SubjectRef = vouched ? finalized.actor : UNPRIVILEGED; // e.g. an empty/never-holder subject
// existing gates now consult `authority` instead of raw finalized.actor:
if (this.policy.canWriteNamespace(authority, targetId, this.graph) === 'deny') return { ok:false, … };
if (isGrantWrite && this.policy.canMintGrant(authority, grantView, this.graph) === 'deny') return { ok:false, … };
```

- **What flips `unverified → channel`:** the **Stamper** (§1b), owned by the trusted seam (A's channel / C's
  issuance). The engine NEVER writes `channel` itself; it only READS the axis the seam owner stamped and decides
  trust — exactly the ADR-0010 ① invariant ("the seam owner stamps who-you-are", `ADR-0010:61-63`).
- **Minimal / additive:** one derived `authority` value; the two existing gates change their first argument. No
  new port, no new PEP path, no read-side change. Pre-enforcement (today) nothing stamps `principal` ⇒ `vouched=false`
  ⇒ authority is unprivileged ⇒ protected-namespace writes refuse. That is precisely the `forge-actor` test going
  from RED (honest gap, `ADR-0010:151-152`) to GREEN — the flip IS the enforcement, and it is one owner nod.
- **Erasure/ingest inertness preserved:** non-privileged targets (`sheets:*`, `rentacar.*`) hit `canWriteNamespace`
  ALLOW before `authority` is ever consulted (`ADR-0010:170-173`), so the flip doesn't disturb them.

## 8. Authority vs attribution — the one form-gap this mechanism surfaces (flag, not fixed)

The stamper (§1b) force-binds `act.actor = p.subject`. That is correct while **authority == attribution** (an
agent acts under its own authority — today's universal case). But ADR-0010 ① explicitly keeps them separable:
attribution (monument/import, Law ②) MAY differ from authority. The reserved form carries `whoActed` /
`underWhoseAuthority` **trust levels** + `issuer` + an empty `delegation` slot — but it does **not** carry a
distinct authority **subject**. So when "who is recorded as acting" ≠ "under whose authority it runs" (delegation,
imported monument), force-binding a single `actor` field collapses the two.

- **Today:** fine — coincident, force-bind `actor` is sound.
- **Later (delegation `T-actor-delegation`):** the `delegation` slot anticipates the *chain*, but a full model may
  also need an explicit **authority-subject** alongside the attribution `actor`. **Flag:** the reserved form
  reserves per-axis *trust* + *issuer* + *chain slot*, but not an authority-subject field. This is a candidate
  additive widening the delegation work must confirm — not a defect today, a named future form-question.

## 9. B-compatibility check — A/C do NOT foreclose B

- The `AuthenticatedPrincipal.trust` field ranges over the whole `PrincipalTrust` enum incl. `'attested'`
  (`types.ts:215`). A **B-stamper** is the same `Stamper`, with a verify step before it: verify the issuer's
  signed token, then `stamp({subject, trust:'attested', issuer:'issuer:<kid>'}, act)`. Same shape, stronger trust.
- The engine-side gate (§7) checks the axis **level**, agnostic to whether `'channel'` (A/C) or `'attested'` (B)
  put it there. B only adds: (a) a verify step in the B-stamper, (b) optionally the engine raising its threshold
  to require `'attested'` for specific namespaces. Neither touches the reserved form.
- The empty `delegation` slot stays empty under A/C; B fills it with the token's on-behalf-of chain. Reserved
  PRESENCE, not semantics (`ADR-0010:92-93`) — untouched.
- Net: A/C exercise the SAME envelope B will use, at a lower trust level. **B-neutral confirmed.**

## 10. Migration / coordination cost — stage-able to 0 forced migration

- `write(act): Ack` signature: **unchanged** → no caller re-signatures (CLI `surface/cli.ts`, tests,
  `BalanceObserverAgent`, agents-manager M3). This is the whole point of choosing closure/envelope over a param.
- **Staging:** ship `makeEngineClient()` defaulting to a `system`/`channel` handle = today's behavior. Callers
  adopt principal-bound handles **opportunistically**; until they do, they use the default handle (or the raw
  engine pre-enforcement) and nothing changes.
- **At the enforcement flip (owner nod, Decision ③):** only callers that write into **privileged** namespaces
  (`policy:*`, `grant:*`, `meta:cap/core:*`) must hold a vouched handle; everyone else (ingest, observations) is
  untouched because the namespace guard ALLOWs before consulting authority (§7). So the forced-migration set is
  "privileged writers only" — a small, known set, and each converts by wrapping its engine ref in
  `makeEngineClient(principal)`.
- **Coordination:** one seam owner per surface must implement `resolvePrincipal` (the authenticated identity
  source, M5) — the read `ViewerResolver` work and this share the same surface-auth dependency, so they land
  together, not twice.

---

## 11. Self-critique (where this design may be wrong)

1. **Encapsulation is a soft boundary in one TS process.** §5's ocap discipline (raw `Engine` ref stays private)
   is not runtime-enforced — a leaked reference re-opens the forge. In-process, A/C are "trusted-boundary" only;
   the north star (hostile marketplace plugins over untrusted transport) genuinely needs **B**. A/C are honest
   interim strength, not the endgame. If the team over-reads A/C as "solved", that is a design risk.
2. **`act.principal` on the body invites exactly the forge it defends against.** Putting the trust marker in the
   same envelope the attacker controls is only safe because the stamper drop-and-re-stamps. An alternative worth
   weighing: keep the *enforcement* trust signal OUT of the journaled body entirely (derive it at the boundary,
   journal only the issuer as audit). Counter: the ADR already committed the marker to the envelope for
   retrofit-honesty; this design lives with that and leans on encapsulation. Owner may want the alternative aired.
3. **Authority-subject gap (§8).** I assert the reserved form lacks a distinct authority-subject and that
   force-binding `actor` collapses attribution/authority under delegation. If a reviewer shows attribution can
   always live in `provenance`/payload while `actor` carries authority, the gap dissolves. I flagged it rather
   than resolving it — deliberate, but it may be over-cautious.
4. **A≡C unification may be too neat.** Treating `submit` as "C at length 1" assumes surfaces are willing to
   resolve-per-call; a high-throughput surface may want a cached session handle anyway (i.e. it becomes C). The
   unification holds conceptually but the per-call resolve cost is unmeasured — an analyst/perf check before
   committing the facade.
5. **`system` default handle is a standing authority.** Staging via a default `channel`-trust `system` handle
   (§9) means the *most* privileged principal is the zero-config default — a classic least-privilege smell. It
   preserves behavior but should be time-boxed and narrowed as callers adopt explicit handles, or an adversary
   who reaches the default handle inherits `system`.
