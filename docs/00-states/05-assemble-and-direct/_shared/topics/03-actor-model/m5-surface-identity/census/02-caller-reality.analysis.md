---
type: analysis
status: draft
date: 2026-08-12
owner: jenya.stasik@gmail.com
scope: project (FF-Personal-Management) — M5 surface-identity census, CALLER-REALITY lens
related:
  - packages/engine/src/engine.ts
  - packages/engine/src/core/resolve.ts
  - packages/engine/src/ports/principal-resolver.ts
  - packages/engine/src/ports/principal-stamper.ts
  - packages/engine/src/core/types.ts
  - docs/architecture/ADR/ADR-0011-agent-isolation-model.md
  - docs/architecture/ADR/ADR-0010 (§③-bis, referenced by the ports)
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/architecture/ADR/ADR-0002-access-roles-and-approval-policy.md
---

# Caller-reality census — what actually authenticates identity at the boundary today

## Question
Как акт реально входит в движок сегодня, где личность самозаявлена, и какой АУТЕНТИФИЦИРОВАННЫЙ сигнал
фактически существует на границе — чтобы M5 не строил `AuthenticatedPrincipal` из воздуха (театр).

## Finding 1 — `write(act)` never authenticates `actor`; it is a plain caller-supplied field

`packages/engine/src/core/types.ts:257-282` — `Act.actor: SubjectRef` is a **required, plain string-typed
field on the envelope**, filled entirely by whoever constructs the `Act` object in-process. There is no
`principal` enforcement: `Act.principal?: PrincipalAssurance` (`types.ts:279`) exists as a RESERVED,
optional field — nothing reads or writes it anywhere in the engine (`grep principal packages/engine/src`
outside the two paper-freeze port files returns zero hits).

`packages/engine/src/engine.ts:73-155` (`Engine.write`) is the entire admission pipeline: `admit()` →
`admitHome()` → force-bind of `minted_by` for grant writes (`:99-108`) → namespace-ceiling gate
(`:110-115`) → grant-mint gate (`:117-125`) → idempotency dedup (`:128-148`) → `store.writeAct`. **At no
point does `write()` call anything named `resolve`, `PrincipalResolver`, or `PrincipalStamper`.** The
comment block at `:92-98` says this explicitly and is accurate as of this read: *"`actor` is still
self-declared under the frozen `write(act)` port — an actor that impersonates a privileged principal is
the T-actor-delegation fork, which needs an authenticated principal source (ViewerResolver seam / port
change). Out of Stage-1 scope; flagged."* This is the single most load-bearing sentence in the codebase
for this census — it is the engine's own admission that `actor` is unauthenticated.

## Finding 2 — the only "trust anchor" (`minted_by:'system'`) is a substrate axiom, not a live signal, and `write()` already forecloses forging it

`packages/engine/src/core/resolve.ts:136-147` (`grantValid`) treats `minted_by === 'system' || minter ===
'engine'` as the root of trust for capability grants. This reads like an authenticated-identity concept,
but it is NOT one at runtime: it only matters for grants that were **seeded directly into the substrate
at construction** (outside `write()`), never for anything that arrives through the write path — because
`engine.ts:104-108` force-binds `minted_by` to `finalized.actor` for any grant write, so a *written* grant
can never carry `minted_by:'system'`. Net effect: there is no code path today where an incoming `Act`
can claim `system`-level trust and have the engine believe it. That is a genuine (if narrow) integrity
property already shipped — but it is a forgery-block, not an authentication mechanism; it says nothing
about who `finalized.actor` actually is.

## Finding 3 — the two M5 ports are 100% unwired paper-freeze; nothing in the codebase calls them

`packages/engine/src/ports/principal-resolver.ts` and `principal-stamper.ts` are both explicitly headed
"PAPER-FREEZE ONLY (design-phase, no behavior)" and say so in-file (`principal-resolver.ts:1-21`,
`principal-stamper.ts:1-28`). Verified by search: `grep -rn "PrincipalResolver\|PrincipalStamper\|
resolveWritePrincipal\|\.stamp(" packages/engine/src` outside the two port files themselves returns
**zero matches**. `AuthenticatedPrincipal` (resolver.ts:30-37) is a TypeScript interface that is never
instantiated anywhere in `src/`. There is no adapter, no test harness, no CLI wiring — the shape exists,
the substance does not.

## Finding 4 — every REAL caller of `Engine.write()` today hardcodes `actor` as a source-code literal, not a resolved identity

Grep for actual production callers (`packages/*/src/**`, excluding tests):

- `packages/ingest-rentacar/src/core/reduce.ts:29` → `export const ACTOR = 'sync:ga-rentacar';` used at
  `:104,115,149`.
- `packages/ingest-rentacar/src/dedup/same-as-writer.ts:25` → `export const DEDUP_ACTOR =
  'agent:ga-rentacar-dedup';` used at `:74`.
- `packages/rental-balance/src/core/keys.ts:25` → `export const OBSERVER_ACTOR =
  'agent:balance-observer';`, consumed as the default `viewer` param in
  `packages/rental-balance/src/agent/balance-observer.ts:37`, and used as `actor: this.viewer` at
  `balance-observer.ts:98`.
- `packages/rental-balance/src/core/reduce.ts` uses an equivalent `INGEST_ACTOR` constant at
  `:76,87,100,129`.

All four are **compile-time string constants chosen by the code author**, not values produced by
resolving any external identity. These are single-tenant, in-process batch/cron scripts (Google
Sheets/rentacar ingest, a balance-observer agent) run locally — there is no IPC boundary, no gateway
call, no network hop between "whoever triggered this run" and `engine.write()`. Caller-reality today is:
*whoever can execute the ingest script IS the actor*, by convention, with no verification layer at all.

## Finding 5 — the one plausible authenticated-adjacent signal that DOES exist lives in a different repo, is DRAFT, and is not connected to FF's engine

`/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager` (the Telegram gateway, "Движ", ADR-0011's "шлюз
M3") has `docs/architecture/ADR/ADR-0002-access-roles-and-approval-policy.md` — **Status: draft**, not
approved, code not started ("Черновик. Код НЕ начат", line 24). It describes:

- `IInboundMessage.userId` (ADR-0002:46-47) — Telegram's numeric sender id, channel-attributed by
  Telegram's own Bot API infrastructure to a real Telegram account. This is the closest thing to a
  "channel"-level trust signal (`PrincipalTrust = 'channel'` in FF's own `types.ts:215` vocabulary) that
  exists ANYWHERE in this whole system today.
- `OwnerAllowlist` (referenced `ADR-0002:21,109-112`) — a binary "is this externalId on the list" check
  in `src/channel-telegram/auth/owner-allowlist.ts` (agents-manager repo, not read verbatim here but
  named directly in the ADR's code references) — this is real, running code (ADR-0001's base), but it
  answers only "known sender / unknown sender," not "who may write which capability."
- The role model (`IUser`, owner/operator/viewer, `:82-97`) that would turn `userId` into a governed
  principal is still **draft/unimplemented** — feature-flagged (`GATEWAY_ROLES`, line 162), fail-closed
  by design once built, but not built.

Critically: **nothing pipes this Telegram `userId` (or any gateway-side identity) into FF's
`AuthenticatedPrincipal` shape or into `Engine.write()` today.** The memory note "gateway=система
агентов, coupling=0" (topic `dwizh-gateway-extraction`) matches what the code shows: FF's engine has zero
import/call surface toward agents-manager, and agents-manager has zero import/call surface toward FF's
engine ports. They are two disconnected repos; the only connective tissue is prose (ADR-0011 naming
"шлюз M3" as the first out-of-process caller, and ADR-0002 draft describing what a future host-side
identity model would look like).

## Root-cause synthesis — the actual gap, named precisely

**Caller-reality today, in one sentence:** every act that reaches `Engine.write()` carries a self-declared
`actor` string with zero authentication anywhere on its path — either because the caller is a trusted
in-process batch script whose "identity" is a hardcoded constant (Findings 1, 4), or because no caller
exists at all outside tests (Finding 3). The one channel-level signal that exists in the world (Telegram
`userId`, Finding 5) is real but (a) lives in a different, uncoupled repo, (b) is not itself
cryptographically or structurally bound to any request that reaches FF's engine, and (c) the role/governance
model that would make it a *governed* principal is draft-status, unbuilt code.

**What would have to exist for `AuthenticatedPrincipal` to be non-theatrical**, concretely:

1. **An actual IPC/process boundary** between a caller (e.g. agents-manager) and FF's engine — today there
   is none; every real writer (`reduce.ts`, `same-as-writer.ts`, `balance-observer.ts`) runs in the SAME
   process as `Engine.write()`, so there is nothing for a "host stamp" to intermediate. ADR-0011 names this
   explicitly as the master fork (`ADR-0011:119-121`: "форма M5 зависит от выбора границы... этот ADR
   обязан предшествовать M5") and gates enforcement behind **P-1 (ADR-0011 ratified + M5 built)**,
   **P-2 (verified fix of the gateway dup/restart bug — unresolved, cross-repo)**, **P-3 (`seamAuthority`
   field reserved, G4)**, **P-4 (explicit owner nod)** — `ADR-0011:244-252`. None of P-1..P-4 are satisfied
   yet (P-2 in particular: `docs/01-organization/process/bugs/gateway-dup/INDEX.md` is an open, unfixed bug
   per the ADR's own text and the project's memory `gateway-dup-kill-bug`).
2. **A host process that owns the seam** — one of the "3 прогнозных хоста" ADR-0011 names (шлюз M3 /
   future HTTP / future CLI, `ADR-0011:126`) — that terminates a real trust boundary (e.g. verifies the
   Telegram webhook signature / owns a session) and calls `resolveWritePrincipal(boundaryIdentity)`
   (`principal-resolver.ts:48`) to produce an `AuthenticatedPrincipal{subject, trust, issuer}`. Today no
   such call site exists — `resolveWritePrincipal` has zero implementations and zero call sites.
3. **`seamAuthority`/`policy_source` reserved and populated (G4, `ADR-0011:131-135`)** — i.e., proof of
   WHO authorized this particular host process to be the one stamping principals, not just "the host
   called `stamp()`." This field doesn't exist yet in `PrincipalAssurance` (`types.ts:231-247` has
   `whoActed`/`underWhoseAuthority`/`issuer`/`delegation` — no `seamAuthority` slot found by grep).
4. **`PrincipalStamper.stamp()` actually wired into `engine.write()`** so that `finalized.actor` is
   checked against `principal.subject` and mismatches REFUSE (G1) rather than silently pass — today
   `write()` doesn't call `stamp()` at all (Finding 3), so a caller-declared `actor` sails straight
   through unchecked, exactly as the in-code comment at `engine.ts:96-98` already documents.

So: **the disconnect is not "the ports have a bug" — the ports are honest paper-freezes.** The disconnect
would be building an M5 *implementation* today, because doing so would either (a) fabricate an
`AuthenticatedPrincipal` from the same self-declared, boundary-less signals that already exist (making the
new port a decorative pass-through — literal theatre), or (b) require first building the IPC boundary +
fixing gateway dup/restart + landing `seamAuthority`, none of which exist yet. This matches and confirms
the prior DEFER-build verdict from primary evidence, not just from the ADR's own prose.

## Risks if M5 builds now anyway
- **H** — Wiring `PrincipalResolver`/`PrincipalStamper` against today's in-process callers would produce an
  `AuthenticatedPrincipal` whose `issuer` is still just a hardcoded string (e.g. `'sync:ga-rentacar'`
  relabeled as an "issuer") — laundering an unauthenticated constant into a field named `Authenticated`,
  which is worse than the current honest `actor` self-declaration because it looks verified and isn't.
- **H** — P-2 (gateway dup/restart, cross-repo, unresolved) means even IF a boundary existed today, a
  duplicated Telegram turn could double-stamp or mis-stamp a principal onto the append-only journal —
  ADR-0011 calls this "отравление журнала," explicitly irreversible.
- **M** — `agents-manager`'s own role/governance model (ADR-0002) is draft/unapproved; treating its
  `userId` as a ready `AuthenticatedPrincipal` source would borrow authority from a decision that hasn't
  been ratified in its own repo.

## Recommendations
- Hold M5 implementation until ADR-0011's P-1..P-4 gates are genuinely met (owner-tracked; P-2 is the
  long pole — cross-repo, needs a verified fix in `agents-manager`, not a re-ack of the ADR).
- If/when M5 starts: first task is naming the actual host process (gateway M3, most likely per ADR-0011)
  and specifying `boundaryIdentity` concretely (Telegram uid via the gateway's already-real
  `IInboundMessage.userId` / `OwnerAllowlist`) — not a generic `string` — and reserving `seamAuthority` in
  `PrincipalAssurance` (types.ts) as a companion patch to the existing paper-freeze, per G4.
- Flag to system-architect: the port signatures (`resolveWritePrincipal(boundaryIdentity: string)`) don't
  yet carry a slot for `seamAuthority` at all — G4 requires it be reserved BEFORE any code lands, so this
  is a form-only patch that should happen even before M5 proper starts, independent of the P-2 blocker.

## Unknowns remaining
- Whether `agents-manager`'s `OwnerAllowlist` / `IInboundMessage.userId` code (named in ADR-0002 but not
  read verbatim in this pass — only the ADR prose) actually behaves as described; a direct read of
  `src/channel-telegram/auth/owner-allowlist.ts` in that repo would confirm or correct Finding 5's second
  bullet.
- Current status of the gateway dup/restart bug (P-2) — this analysis relies on the ADR's own
  characterization ("сегодня: эскалирует... не регрессия") and project memory `gateway-dup-kill-bug`;
  a fresh check of `agents-manager/docs/01-organization/process/bugs/gateway-dup/INDEX.md` would confirm
  whether it is still open.
