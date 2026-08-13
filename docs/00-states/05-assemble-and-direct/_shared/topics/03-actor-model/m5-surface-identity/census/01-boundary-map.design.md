---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: system-architect (BOUNDARY census — where surface-identity resolution sits under ISO-2)
title: "M5 boundary map — width census of surface-identity resolution under ISO-2 (gateway = first instance)"
phase: DESIGN — census of grains M5 must close; NO code, NO decision
inputs:
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md      # ISO-2 boundary, G4 seamAuthority, P-1..P-4
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # invariant ①, form ②, Decision ③ (deferred)
  - ../../../../../../../packages/engine/src/ports/principal-resolver.ts       # FROZEN: resolveWritePrincipal(boundaryIdentity)
  - ../../../../../../../packages/engine/src/ports/principal-stamper.ts        # FROZEN: stamp(incoming, principal) → refuse|stamp
  - ../../../../../../../packages/engine/src/core/types.ts                     # PrincipalAssurance, AuthenticatedPrincipal envelope
  - ../design/02-caller-reality.analysis.md                                    # ground truth: all in-process; no auth source anywhere
  - ../design/01-seam-and-lifecycle.design.md                                  # Resolver+Stamper mechanism, A≡C, encapsulation
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager (cross-repo)           # OwnerAllowlist.isOwner(from.id); conversationId=chat:thread; ZERO engine linkage
related:
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md#Открытые-вопросы  # OQ-1..OQ-4
---

# M5 boundary map — surface-identity resolution under ISO-2

> BOUNDARY lens, not a build, not a decision. The question: under ISO-2 (out-of-process + IPC; the
> gateway `agents-manager` = the first cross-boundary caller at M3), **where does surface-identity
> resolution sit, what crosses the boundary, which component authenticates the identity source, and how
> do the frozen ports `PrincipalResolver`/`PrincipalStamper` receive a LEGITIMATELY authenticated
> principal (not self-claimed)?** A grain (face) is closed only when its answer is fixed and grounded.
> Adversarial honesty: an empty face is marked 🟥, never invented.

---

## 0. The boundary topology as it actually stands (ground truth, file-grounded)

Three facts fix the shape of the problem before any grain:

1. **The engine seam is frozen and in-process for 100% of callers.** `write(act): Ack`
   (`engine-client.ts`) is FROZEN; every caller (`ingest-rentacar`, `rental-balance` ingest,
   `BalanceObserver`, `DurableRunner`) constructs/receives the *same* `Engine` and calls `.write()` as a
   plain method — no HTTP/IPC/queue/RPC exists (`02-caller-reality.analysis.md:57-65`). The CLI `write`
   verb is a dead stub (`cli.ts:101-104`).

2. **No authenticated identity source exists on the engine side, on EITHER plane.** Read side:
   `ViewerResolver` is paper-freeze, `TODO(M5): Telegram uid → user:… / agent:…`, zero impl, zero call
   sites (`viewer-resolver.ts`; `02:41-50`). Write side: only the reserved FORM fields
   (`PrincipalAssurance` in `types.ts:231-247`; `AuthenticatedPrincipal` in `principal-resolver.ts:30-37`)
   — no producer. Every `actor`/`viewer` today is a compile-time literal or an unvalidated CLI string
   (`02:34-39`).

3. **The gateway DOES authenticate a sender — but two boundaries away from the engine, with ZERO
   linkage.** `agents-manager` authenticates the Telegram sender at INGRESS:
   `OwnerAllowlist.isOwner(from.id)` (deny-all default, `owner-allowlist.ts`), and addresses the session
   as `conversationId = chat:thread` (`conversation-id.util.ts`). **But** a grep of `agents-manager/src`
   for `engine.write` / `@ff` / `packages/engine` returns **nothing** — the gateway never touches the FF
   engine. It authenticates a sender, then spawns a fresh `claude -p --resume` turn; the identity is
   proven at the chat boundary and **never travels** to any engine-write boundary (which does not exist).

> **Load-bearing consequence (the census's spine).** The frozen port takes
> `resolveWritePrincipal(boundaryIdentity: string)` — it *assumes* an authenticated `boundaryIdentity`
> has already arrived at the stamp point. Reality: identity is proven at the **gateway ingress**
> boundary; the stamp must occur at the **engine-write** boundary; **these are different boundaries and
> nothing connects them.** M5 is therefore NOT "write a resolver" — its true width is *establishing a
> boundary topology in which the place identity is PROVEN and the place it is STAMPED are the same
> boundary (or a trusted carrier binds them)*. Until that is fixed, the port's own input `boundaryIdentity`
> is unsourced — the emptiest grain is upstream of the frozen seam, not inside it.

---

## 1. Boundary census — the 21 grains M5 must close to be REAL (not theatre)

Legend: ✅ known/fixed · ⬜ partial (form or one side exists, other empty) · 🟥 empty/unknown.

### Face I — Boundary TOPOLOGY (WHERE the seam physically sits)

| # | Grain (face) | Mark | Grounding / why |
|---|---|---|---|
| 1 | **Which process is the seam owner (the stamper)?** ADR-0011 says "host-process = seam owner" (`ADR-0011:86-89`), but the gateway (which holds the authenticated sender) never calls the engine, and the agent turn (`claude -p`) is the *isolated* unit AND the would-be caller. Seam owner is unassigned. | 🟥 | `02:32` (gateway zero call sites); ADR-0011 names "host" abstractly, no concrete process bound |
| 2 | **Where does the engine live under ISO-2?** For an IPC boundary to exist, the engine must run as a host/service the agent process connects TO. No engine-host/daemon/socket exists; engine is a library linked in-process. | 🟥 | `02:57-65` (no transport, engine is an in-process object) |
| 3 | **Granularity of the boundary** — per plugin / per agent / per turn (current gateway model) / per session? Sets principal lifetime (per-write A vs per-session C, `01:173-184`) and IPC cost. | ⬜ | ADR-0011 OQ-3 (`:215`) names it, unresolved; gateway is per-turn (`durable-runner.ts:4-15`) |
| 4 | **IPC transport + act serialization** — the wire across the boundary (socket/pipe/child_process/worker), act (de)serialization, backpressure, worker lifecycle. ADR-0011 lists this as real engineering not yet begun; concrete transport class deferred to M5 (`ADR-0011:156-169`). | 🟥 | `ADR-0011:188` "(−) процессная модель + IPC-протокол… которой сегодня нет" |

### Face II — The AUTHENTICATED identity source (WHAT crosses, and who proves it)

| # | Grain (face) | Mark | Grounding / why |
|---|---|---|---|
| 5 | **What IS "surface identity" concretely** under ISO-2 — Telegram `from.id` via gateway IPC? OS process credential (peer uid/socket cred)? A spawn-time capability token? ADR-0011 explicitly leaves this to M5 (`ADR-0011:119-121`). | ⬜ | resolver comment (`principal-resolver.ts:15-18`) names it opaque-on-purpose; gateway holds `from.id` but it is not the engine's boundary identity |
| 6 | **Authenticating component (who proves the identity)** — on the gateway side this EXISTS today (`OwnerAllowlist.isOwner(from.id)`, deny-all default). On the engine-write side it is 100% absent. Partial because auth exists at the wrong boundary. | ⬜ | `owner-allowlist.ts` (real auth at ingress) vs `02:41-50` (nothing on engine side) |
| 7 | **Identity → subject mapping** (`Telegram uid → user:jenya` / `agent:ff-personal`). This is the literal `TODO(M5)` on BOTH planes; the mapping table/registry does not exist. | 🟥 | `viewer-resolver.ts` `TODO(M5)`; `02:47-50` "100% unbuilt" |
| 8 | **Identity PROPAGATION across the ingress→stamp gap** — the carrier that delivers the gateway-proven identity to the engine-write stamp point. This is the spine hole (§0): proven at ingress, needed at write, nothing wires it. | 🟥 | grep: gateway has no engine linkage; `resolveWritePrincipal(boundaryIdentity)` assumes it already arrived (`principal-resolver.ts:48`) |
| 9 | **Trust-axis assignment logic** — deriving `whoActed` vs `underWhoseAuthority` and `channel` vs `attested` from the actual authentication event (not a default). Form is reserved; the deriving logic is empty. | ⬜ | form: `types.ts:231-247`, `AuthenticatedPrincipal.trust` `principal-resolver.ts:33-34`; producer absent; G3 forbids default-up (`ADR-0010:140-142`) |

### Face III — Seam LEGITIMACY (G4 — who authorized the stamper to stamp)

| # | Grain (face) | Mark | Grounding / why |
|---|---|---|---|
| 10 | **`seamAuthority` / `policy_source` field reserved** (G4: "issuer-of-the-issuer" — who authorized THIS host to stamp `user:jenya`). ADR-0011 makes reserving it a CRITICAL guardrail and enforcement precondition P-3. **It is NOT in the frozen form** — `AuthenticatedPrincipal` and `PrincipalAssurance` carry `issuer` (who stamped) but NO seam-authority field. | 🟥 | `ADR-0011:123-145` (G4 CRITICAL, P-3 `:251`); absent from `principal-resolver.ts:30-37` and `types.ts:231-247` |
| 11 | **Cross-host consistency of seam authority** — three prospective hosts (gateway M3 / future HTTP / future CLI) could each unilaterally become seam owner without cross-host agreement or an audit trail of the stamp act itself (OQ-1). | 🟥 | `ADR-0011:126-129` (G4 rationale), OQ-1 `:207-211` |
| 12 | **`issuer` population (who vouched)** — the audit fact "stamped by whom" (e.g. `gateway:agents-manager`). Form EXISTS and is frozen; only a producer is missing (a producer grain, not a form grain). | ✅ | `AuthenticatedPrincipal.issuer` (`principal-resolver.ts:35-37`); `PrincipalAssurance.issuer` (`types.ts:236-240`) |

### Face IV — Boundary RELIABILITY (the seam's contract)

| # | Grain (face) | Mark | Grounding / why |
|---|---|---|---|
| 13 | **Exactly-once / idempotent stamp under dup/restart** — the gateway dup/restart bug (dup voice message) is LIVE. If host stamps principal onto an append-only journal, a dup/restart = a double/lost stamp = permanent journal poisoning. ADR-0011 P-2 BLOCKS the enforcement flip until a *verified* gateway-dup fix is linked. | 🟥 | `ADR-0011:190-194`, P-2 `:246-250`; OQ-4 `:216-218`; memory `gateway-dup-kill-bug` |
| 14 | **Restart-identity continuity** — under "each turn = fresh process", the authenticated identity must survive/re-attach across the restart without re-proving or forging. Not designed. | 🟥 | `durable-runner.ts:4-15` (restart model); no re-attach contract exists |

### Face V — Mechanism FORM (HOW the principal is stamped) — mostly frozen

| # | Grain (face) | Mark | Grounding / why |
|---|---|---|---|
| 15 | **Resolver port shape** — `resolveWritePrincipal(boundaryIdentity): AuthenticatedPrincipal`. | ✅ | `principal-resolver.ts:43-49` (paper-freeze) |
| 16 | **Stamper port shape** — drop-and-re-stamp; REFUSE on mismatch (G1), never silent rewrite. | ✅ | `principal-stamper.ts:37-48` (`PrincipalStampResult` refuse|stamp) |
| 17 | **Read+write symmetry** — one seam: `PrincipalResolver extends ViewerResolver`, `resolveViewer` byte-compatible. | ✅ | `principal-resolver.ts:43`; `01:55-79` |
| 18 | **`AuthenticatedPrincipal` envelope** — `{subject, trust, issuer}`; `PrincipalAssurance` two-axis + delegation slot, additive, 0-migration. | ✅ | `principal-resolver.ts:30-37`; `types.ts:231-282` |
| 19 | **Encapsulation of the raw `Engine`** (private capability; untrusted code gets only a bound handle/`submit`). In-process this is a SOFT boundary (`01:303-306`); under ISO-2 it becomes the REAL IPC boundary — but the enforcing boundary is unbuilt. | ⬜ | `01:186-204` (design named); `01` self-critique #1 (soft in one process) |

### Face VI — Enforcement wiring (correctly DEFERRED to Decision ③, tracked here)

| # | Grain (face) | Mark | Grounding / why |
|---|---|---|---|
| 20 | **Authority derivation in `Engine.write`** — `vouched ? actor : UNPRIVILEGED`; gates consult derived `authority`, never raw `actor`. Design sketched; deferred to ③ by owner nod (correct). | ⬜ | `01:230-254`; `ADR-0010` Decision ③ open (`:99-124`) |
| 21 | **Authority-subject gap** — reserved form carries per-axis *trust* + *issuer* + delegation *slot*, but NO distinct authority-subject; force-binding one `actor` collapses attribution≠authority under delegation. Named future form-question, not a today-defect. | ⬜ | `01:256-269` (§8 flag); `01` self-critique #3 |

---

## 2. Tally

- **Total grains: 21.**
- **🟥 empty/unknown: 9** — #1 seam-owner process, #2 engine-host location, #4 IPC transport, #7 uid→subject mapping, #8 identity propagation (spine), #10 `seamAuthority` field (G4/P-3), #11 cross-host seam authority (OQ-1), #13 idempotent stamp (P-2, blocking), #14 restart-identity continuity.
- **⬜ partial: 7** — #3 granularity, #5 what-is-surface-identity, #6 authenticator (exists at wrong boundary), #9 trust-axis derivation, #19 encapsulation-as-real-boundary, #20 authority derivation (deferred), #21 authority-subject gap.
- **✅ known/fixed: 5** — #12 issuer form, #15 resolver shape, #16 stamper shape, #17 read+write symmetry, #18 envelope. **All 5 greens are FORM (frozen ports/types); zero greens are a working identity source.**

The green cluster is exactly the paper-freeze already done. Every grain about *where the boundary sits* and *how a real authenticated identity reaches the stamp* is 🟥 or ⬜. M5's width is the topology + propagation, not the port signatures.

---

## 3. Carrying finding (the one grain that gates the rest)

**The frozen ports assume an input the system cannot yet supply.** `resolveWritePrincipal(boundaryIdentity)`
presumes an authenticated `boundaryIdentity` has arrived at the stamp point. The census shows identity is
**proven at the gateway ingress** (`OwnerAllowlist.isOwner(from.id)`, real today) but must be **stamped at
the engine-write boundary** — a boundary that (a) does not exist in code, (b) the gateway has zero linkage
to, and (c) has no carrier delivering the proven identity across the gap (grain #8, spine). So M5's real
first move is a **topology decision** — grains #1/#2/#8: *which process owns the engine, which process
stamps, and what trusted carrier binds "identity proven at ingress" to "identity stamped at write"* — after
which the frozen resolver finally has a legitimate `boundaryIdentity` to resolve. Two grains are also
hard prerequisites the frozen form does NOT yet satisfy: **#10 `seamAuthority` (G4/P-3 — the field is absent
from the reserved form; ADR-0011 forbids enforcement without it)** and **#13 idempotent stamp (P-2 — blocked
on a verified gateway-dup fix)**. Building a resolver before #1/#2/#8/#10 is closed reproduces exactly the
channel-theatre ADR-0010/ADR-0011 already reject: an authenticated-looking stamp with no real, legitimately
authorized authenticated source behind it.
