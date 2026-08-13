---
type: design
node_type: design-note
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: actor-model / M5 surface-identity / seam topology (Decision-5)
related:
  - ../../decisions/FORK-decision5-topology.decision.md
  - ../../m5-surface-identity/design/01-topology-options.design.md
  - ../../m5-surface-identity/design/03-topology-redteam.critic.md
  - ../../../../../../_log/2026-08-12-direction-review-and-both-as-settings/raw/02-fork5-topology.analysis.md
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
---

# How to implement: seam topology (Decision-5)

> How-to, not re-decision. Verdict is ratified in `FORK-decision5-topology.decision.md`; this file
> repackages it around the meta-principle: split the INVARIANT (one anchor) from the AXES-of-configuration,
> and make the switch a checkable condition, not an operator preference.

## 1. What this is

The seam is the module that stamps `AuthenticatedPrincipal` — the thing that turns a proven boundary
event (`OwnerAllowlist.isOwner(from.id)` at Telegram ingress) into the principal the engine's frozen
`stamp()` port (`packages/engine/src/ports/principal-stamper.ts`) will accept. Today nothing connects
ingress-proof to engine-write (census grain #8) — the three real tiers are `T-ingress → T-agent (spawned
`claude -p` child) → T-engine`, and the seam owner is whichever tier holds the stamp.

The one axis that actually varies across all four candidate shapes is **distance**: how far the stamping
module sits from the flaky gateway process, and what carries proven identity across that distance
(co-location → peer-cred socket → signed token). Cost, crypto-need, P-2 dup-exposure, and `coupling=0`
compliance all move monotonically along this single axis — this is not four rival designs, it is one seam
observed at four distances.

## 2. The fork and its resolution

| Distance | Form | Carrier | Legitimate to BUILD now? |
|---|---|---|---|
| 0 (fused) | Co-located (A) | none (same call stack) | ❌ — worst P-2 exposure; breaks `coupling=0` |
| 0, factored | **Broker-seed (chosen)** | in-host module boundary | ✅ — honest `unverified` floor, zero new process, zero crypto |
| 1 (local process) | Standalone-sidecar (C) | peer-cred socket | ❌ now — RT5 false-closure before root is named + uid-split lands |
| 2 (remote/crypto) | Signed-token (B) | signed token over IPC | ❌ — ISO-3-first prematurity; crypto turnstile before the wall |

**Invariant (build now, does not move):** exactly one shared seam module, `coupling=0` with the gateway
(engine is never imported into gateway transport; broker is a distinct governed unit with its own
uid→subject registry and `seamAuthority` slot, unreachable by the T-agent unit).

**Why the switch is a checkable CONDITION, not an operator preference.** The candidate that looks like
"the other setting" — standalone-sidecar — only stops being false-closure once two facts are true in the
world: the uid/process split has landed (ADR-0011 execution turns the boundary from filesystem convention
into kernel-enforced fact) and root-of-trust `P-5` is green (Decision-4 = C's deferred root is populated).
Both are **assertable system state**, not taste. If either isn't true, the sidecar's own bootstrap is
gateway-adjacent (same pm2/deploy, same operator) — so "independence" is theatre, and a journal entry
carrying `issuer:'sidecar:…'` reads to a future auditor as validated when it wasn't.

**Why a runtime toggle right now is a footgun (RT5).** A settings flag (`env: SEAM_TOPOLOGY=sidecar`)
implies discretion — someone can flip it before its precondition holds. That produces the exact failure
this whole trust-line exists to prevent: a misleadingly "validated-looking" append-only journal entry that
is retrofit-impossible to correct after the fact (ADR-0010 Decision ②). The correct gate is code that
asserts the precondition (uid-split landed? P-5 green?) and refuses to extract otherwise — not a flag a
person can set early. Reserve the exit; do not wire a switch to it.

There is a second, genuinely-simultaneous axis (local-trust for today's Telegram gateway vs. token-trust
for a future plugin/marketplace caller, branching by CALLER TYPE, not owner preference) — that is real
"both at once," but no plugin caller exists yet, so it is future/out-of-scope for M5 (§4).

## 3. How to implement now (broker-seed, co-located)

Steps (paper/form only under current DESIGN phase — no code without owner's explicit "строй"):

1. **Name the module.** A distinct principal-stamp unit at the host tier — own uid→subject registry, own
   `seamAuthority` slot, own stamp logic — physically co-located (in-host) today but never fused into the
   gateway's transport code and never writable by the T-agent unit.
2. **Fix the frozen contract as the interface.** `resolveWritePrincipal(boundaryIdentity: string)` stays
   opaque-string on purpose (`principal-resolver.ts:15-18`); `stamp(incoming, principal) → refuse|stamp`
   stays G1 (`principal-stamper.ts`). The broker module implements the caller side of these ports; nothing
   about the ports themselves changes when the broker later extracts.
3. **Reserve, don't build, the two exits — by FORM only:**
   - Extraction exit (→ standalone sidecar, Topology C): reserve a **peer-cred socket** shape as the
     future carrier (`SO_PEERCRED`, unix domain socket) — name it in the design, do not stand up the
     process or socket now.
   - Crypto exit (→ signed-token, Topology B): reserve the **token slot** in `AuthenticatedPrincipal`'s
     `issuer`/delegation field (ADR-0010 form ②, already additive/0-migration) — do not build key
     management, rotation, or issuer infra now.
4. **Add `seamAuthority` to the reserved form now (P-3).** This is topology-independent and owed
   regardless of the fork — retrofit-impossible after the first stamped act (ADR-0011:132-135). Land it
   as a form-only patch to `types.ts` and the two frozen ports before M5 proper, not gated on the topology
   choice.
5. **Confirm the Decision-4 dependency.** This whole ladder is legal only because Decision-4 = C (root
   deferred, named, gated on P-5). If Decision-4 had picked an immediate root, more of Decision-5's modes
   could plausibly go live sooner — but 4 rejected that path for the identical reason (empty guarantee at
   same-uid ISO-2). Decision-5 does not feed back into Decision-4; it only inherits.

## 4. Open gates (block the extraction exit, not the seed)

- **uid/process split** (tracked in track 03-actor-model, separate topic) — turns the T-agent isolation
  boundary from convention into kernel-enforced fact. Prerequisite for standalone-sidecar to stop being
  RT5 false-closure.
- **P-5 (root of trust green)** — Decision-4's deferred root must be populated before the extraction exit
  is legitimate. Owner-pending per current state pulse.
- **P-2 (gateway-dup, `docs/01-organization/process/bugs/gateway-dup/INDEX.md`, still `active`)** — blocks
  the enforcement flip under EVERY topology, independent of this fork. No topology choice fixes an
  ingress-reliability bug in a different repo.
- **Future/plugin axis** — a real "both, simultaneously, by caller type" case (local Telegram = channel
  trust; future plugin/marketplace caller = token trust) becomes live only when a second caller type
  actually exists. Not needed, not built, for M5.

## 5. Pointers

- Ratified decision text: `../../decisions/FORK-decision5-topology.decision.md`
- Full option comparison + trade-off table: `../../m5-surface-identity/design/01-topology-options.design.md`
- Red-team (RT1–RT8, why none of the three "closes" G4/P-2/T5 by construction): `../../m5-surface-identity/design/03-topology-redteam.critic.md`
- "Both as settings" lens applied to this fork specifically: `../../../../../../_log/2026-08-12-direction-review-and-both-as-settings/raw/02-fork5-topology.analysis.md`
- Frozen ports referenced: `packages/engine/src/ports/principal-resolver.ts`, `packages/engine/src/ports/principal-stamper.ts`
