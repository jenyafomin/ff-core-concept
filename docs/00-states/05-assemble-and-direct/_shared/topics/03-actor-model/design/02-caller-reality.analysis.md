---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
related:
  - docs/architecture/ADR/ADR-0010-principal-authority-vs-attribution.md (Decision ③ — open, this analysis feeds it)
  - packages/engine/src/engine.ts (write-PEP, force-bind)
  - packages/engine/src/ports/viewer-resolver.ts (read-side paper-freeze, TODO M5)
  - packages/engine/src/ports/engine-client.ts (FROZEN write(act) seam)
---

# Caller reality — who calls `engine.write()` today, and what identity they actually hold

## Method
Grepped every `.write(` / `EngineClient` / `makeEngine` reference under `packages/*/src` (and test
harnesses for completeness), read each call site's actor-construction code, and read the read-side
precedent (`ViewerResolver`). No runtime/fixture state was executed — this is static, file-grounded.

## Caller table

| Caller | `actor` passed | How constructed | Authenticated identity available? | In/out-of-process | Evidence |
|---|---|---|---|---|---|
| `ingest-rentacar` runner (`runIngest`) | `'sync:ga-rentacar'` | Module-level `const ACTOR` in `reduce.ts:29`, stamped onto every emitted act (`reduce.ts:104,115,149`) | No — compile-time literal, not derived from any session/caller | In-process (same Node process constructs `Engine` and calls `.write()` directly; no transport) | `packages/ingest-rentacar/src/ingest.ts:52`, `packages/ingest-rentacar/src/core/reduce.ts:29` |
| `ingest-rentacar` dedup writer (`same-as-writer`) | `'agent:ga-rentacar-dedup'` | Module-level `const DEDUP_ACTOR` | No — literal | In-process (caller of `same-as-writer.ts` calls `engine.write(act)` itself — comment at `same-as-writer.ts:57` says "the caller is responsible") | `packages/ingest-rentacar/src/dedup/same-as-writer.ts:24-25,74` |
| `rental-balance` payment ingest (`runPaymentIngest`) | Whatever `reduceOrderRow`/`reducePaymentRow` stamp — same pattern as above (namespaced `INGEST_ACTOR`) | `packages/rental-balance/src/core/keys.ts:22` `INGEST_ACTOR = 'sync:rentacar-onecar'` | No — literal | In-process | `packages/rental-balance/src/ingest.ts:46`, `packages/rental-balance/src/core/keys.ts:22` |
| `BalanceObserver` (agent-cycle) | `OBSERVER_ACTOR = 'agent:balance-observer'` (default ctor param, overridable) | `packages/rental-balance/src/core/keys.ts:25`, threaded through ctor `viewer` param | No — literal default; ctor *accepts* an override string but nothing upstream supplies an authenticated one | In-process | `packages/rental-balance/src/agent/balance-observer.ts:37,98,105` |
| `DurableRunner.record()` | Whatever the caller's `Act.actor` already is — pure passthrough, no stamping | `record(act: Act): Ack { return this.engine.write(act); }` | No — this is the "spine" seam comment explicitly names as the future gateway-turn conveyor, but today it does zero identity work; it forwards the caller-supplied `Act` verbatim | In-process (same comment: "under the gateway's 'each turn = a fresh process'" — describes a *process restart* model, not a network/RPC boundary; no transport code exists here) | `packages/engine/src/runner/durable-runner.ts:39-61` (esp. header comment lines 4-15, `record()` at line 59-61) |
| `engine` CLI `write` verb | N/A | **Not wired**: `case 'write': ... 'write requires an act payload on stdin (not wired at M0 CLI)'` — dead stub, returns exit 1 | N/A — no implementation | N/A | `packages/engine/src/surface/cli.ts:101-104` |
| `engine` CLI `resolve`/`view` verbs (read-side, for comparison) | `viewer` = raw `--viewer` CLI flag string, unvalidated | `flag('viewer') ?? ''` | No — operator-supplied string, zero auth | In-process (local CLI invocation) | `packages/engine/src/surface/cli.ts:67,78` |
| Test harnesses (`survive-turn-harness.ts`, `crash-harness.ts`, `erasure-plane-harness.ts`) | Literal test subjects (`'order:1'`, `SUBJECT_A`, etc.) | Hard-coded in harness | No — test fixtures | In-process | `packages/engine/test/harness/*.ts` (multiple) |
| `agents-manager` / Telegram gateway | **Does not call `engine.write()` at all today** | — | — | — | No occurrence found: `grep -rn "gateway\|agents-manager\|telegram" packages/*/src` returns only **comments** referencing a *future* caller (`engine-client.ts:2` "agents-manager at M3"; `durable-runner.ts:4-15` "the gateway turn"; `types.ts:210` analogy only) — zero executable integration code |

**No caller passes anything derived from a session, credential, OS uid, cert, or external identity
provider.** Every `actor`/`viewer` value in the codebase today is either (a) a compile-time literal
constant, or (b) an unvalidated free-text string threaded through from a local CLI flag or a test
fixture. This matches the ADR's own framing verbatim (`engine.ts:96-98`): *"`actor` is still
self-declared under the frozen `write(act)` port... needs an authenticated principal source
(ViewerResolver seam / port change). Out of Stage-1 scope."*

## Read-side precedent — `ViewerResolver`

`packages/engine/src/ports/viewer-resolver.ts` is explicitly labelled **"PAPER-FREEZE ONLY at M0"**:
an interface (`resolveViewer(surfaceIdentity: string): SubjectRef`) with **zero implementation** and a
`TODO(M5): implement per-surface identity resolution (Telegram uid → user:… / agent:…)`. There is no
call site for this interface anywhere in `packages/*/src` (grep confirms it appears only in its own
file, `dist/` build artifacts, and the ADR-0010 references). **Surface-identity plumbing — Telegram uid
→ subject, or any other surface → subject mapping — is 100% unbuilt**, on both the read side (frozen
interface, no impl) and the write side (no interface even reserved beyond the `PrincipalAssurance`
form fields in `types.ts:231-279`).

Confirmed further by `packages/engine/test/principal-form.test.ts` (66 lines): it asserts the
`principal?: PrincipalAssurance` fields **typecheck** and are **additive** (an `Act` without them still
compiles) — its own header states *"Nothing here writes through the engine or asserts enforcement —
enforcement is Decision ③ (deferred)."* This is a compile-time paper-freeze test, not a behavioral one.

## In-process vs out-of-process — resolved

The handoff's open question (`ADR-0010` "Открытые хвосты": *"In-process vs out-of-process агенты —
влияет на силу channel-trust (A)"*) resolves cleanly from the evidence above: **every caller found is
in-process today.** `ingest-rentacar`, `rental-balance` ingest, `BalanceObserver`, and `DurableRunner`
all construct (or receive) the same `Engine` instance and call `.write()` as a plain method call in the
same Node process/address space — no HTTP, no IPC, no message queue, no RPC boundary exists in this
codebase. The CLI is a separate process per invocation but is entirely local (operator's own shell,
`--viewer` flag self-supplied) — not a remote/hostile caller.

The comment in `durable-runner.ts:4-15` that mentions "the gateway turn" and "under the gateway's 'each
turn = a fresh process'" is describing the **agents-manager gateway's OS-process restart model** (each
Telegram turn = fresh `claude -p --resume`, per the project's own `CLAUDE.md`) — it is a *design note
for a future integration*, not evidence that the gateway calls this engine today. Grep across
`packages/*/src` for `gateway`/`agents-manager`/`telegram` turns up zero call sites, only forward-looking
comments (`engine-client.ts:2`: *"agents-manager at M3"* — M3 not yet reached per this ADR's own
Stage-1 framing).

**Verdict: no out-of-process, cross-trust-domain caller exists in code today.** The marketplace /
hostile-plugin scenario the ADR names as the "North Star" (`ADR-0010` line 49-50) is entirely
prospective — there is nothing in the current call graph to defend against yet, only the CLI operator
and the project's own ingest/agent code, all trusted-by-construction (same repo, same deploy unit).

## Per-variant buildable-now verdict

- **A — trusted channel (force-bind from a channel parameter):** **Not buildable as genuine
  channel-trust today** — there is no channel to trust. The only "channel" in evidence is the CLI
  operator's own shell and in-process ingest code, which are already fully trusted by being in-process
  (same privilege as the code that constructs the `Engine` itself). Building "A" now would mean force-binding
  `actor` to a hard-coded process-identity string (e.g. "this Node process = trusted") — which is
  **exactly what already exists** (the literal `ACTOR`/`OBSERVER_ACTOR` constants). It would add no
  security value over Stage-1's current force-bind; it would be **channel theatre**, precisely the
  failure mode ADR-0010 §③ warns against ("channel-trust as enforce today gives ~zero over force-bind").
  The moment A would earn its keep is when a real untrusted transport (HTTP, gateway RPC) exists — none
  does yet.
- **B — crypto-attestation (signed issuer token):** **Purely future, confirmed.** No issuer, no key
  material, no token-verification code, no `issuer` population anywhere — `PrincipalAssurance.issuer`
  (`types.ts:237-239`) is a reserved-but-empty field; `principal-form.test.ts` only proves it typechecks.
  Zero infra exists to attest against. Confirmed not buildable now without a separate, non-trivial
  key/issuer project.
- **C — principal-handle (ocap, force-bind from a session handle):** **No different in trust from A
  today**, for the same reason: there is no session/handle-issuing boundary in the code — every caller
  already holds a bare reference to the `Engine` object itself (strongest possible capability, no
  attenuation). Introducing a "handle" type today would be a refactor of the in-process call convention,
  not a trust upgrade, since the thing being handed a handle (ingest code, `BalanceObserver`) is already
  running with full `Engine` access. C only starts to differ from A when a handle crosses a real
  trust boundary (e.g. handed to a plugin process) — that boundary doesn't exist yet either.

**Net:** none of A/B/C is meaningfully buildable *as a trust upgrade* right now, because **the actual
gap is not "which mechanism" but "there is no authenticated identity source of ANY kind at any call
boundary yet"** — surface-identity resolution (`ViewerResolver` M5) is the true prerequisite all three
variants share, and it is unbuilt on both read and write sides. This is consistent with, and now
evidenced beyond, ADR-0010's own conclusion ("НЕ строить channel-theatre сейчас"). Building any of A/B/C
today would formalize a seam around callers that are, in fact, just this codebase's own trusted
in-process code — real differentiation only appears once a genuine cross-trust-domain caller (gateway
HTTP/RPC, plugin marketplace) is wired in.

## Unknowns / could not resolve from static code

- **Runtime/fixture graph state** (e.g. whether any `.store`/journal on disk already contains acts with
  privileged `actor` values, or whether `protected_namespaces` is populated in any live deployment) —
  not inspected; static analysis only, per task scope.
- **agents-manager repo internals** (`/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager`) were not
  read — out of this repo's boundary per doc-tree scope; if that project already has an authenticated
  Telegram-uid → session mapping for OTHER purposes (e.g. topic/PROMPT.md routing per this project's
  own `CLAUDE.md`), it is not wired to `engine.write()` in any form found here, but its internal
  identity model was not independently audited.
- **Intent behind `DurableRunner.record()`'s passthrough** — whether a caller-identity stamp was
  planned for this seam specifically (vs. `Engine.write()` itself) is not stated in code comments beyond
  the general M5/ViewerResolver deferral; flagged as an open design question for whoever builds ③, not
  resolved here.
