---
type: synthesis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: abstract-thinker owner-proxy
title: "SYNTHESIS — owner-eye verdicts on the M5 open forks (D2 · D4 · D5-main · D8 · D9), answered as the owner would"
scope: Project (FF-Personal-Management) · trust-line / actor-model · branch refactor-tree · DESIGN phase
provenance: >
  Landed via owner delegation 2026-08-12 "answer as I would; where it's clear, move; where there's nuance,
  deeper review through my eyes." All moves reversible if the owner disagrees. This file is CANONICAL for the
  fork verdicts; the four round inputs are its evidence base.
related:
  - ./LENS-a-registry.analysis.md            # steelman (a) — engine-side registry as object
  - ./LENS-c-defer-clamp.analysis.md         # steelman (c) — name-the-clamp, defer, P-5 gate
  - ./CRITIC-root-of-trust.critic.md         # red-team of BOTH; the "gate created vs gate moved" cut
  - ./OWNER-PROXY-clear-bucket.decision.md   # D2/D5-main/D8/D9 answered through owner's eyes
  - ../FORK-decision4-root-of-trust.decision.md   # D4 fork (now → decided, converged package)
  - ../FORK-decision5-topology.decision.md        # D5 topology (broker-seed, bundled with D4)
  - ../RATIFY-2026-08-12-adr-0010-0011.decision.md # D2 target
  - ../../tracks/INDEX.md                          # the 6-track execution sequence (D4=C already treated as decided)
  - ../../ingest/F-D-sheets-ingest.design.md       # D8 target
  - ../F2-seed-fixtures.spec.md                     # D9 target
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
---

# SYNTHESIS — owner-eye verdicts on the M5 forks

> Method: I read the four adversarial round outputs and their sources verbatim, verified the convergence
> claim in the files (not on anyone's word), then answered each fork as the owner would given his stance —
> "don't rush to build; 80/20 on the critical fifth; concepts stay revisable; but recent-and-explicit: moved
> a gate or it doesn't count." Where a verdict is genuinely clear I move it; where the honest answer is
> uncomfortable (D4 does NOT unblock M5) I say so plainly rather than dress a closure as progress.

---

## D4 — root of trust for `seamAuthority`: the false binary, dissolved

### Verdict (as the owner would state it)

**"(a) vs (c)" was never a real choice — (a) names the OBJECT, (c) names the GATE; they are two halves of
one artifact. I adopt the converged package and I close this fork ONCE. But be honest with me: closing it
moves NO readiness gate — it stops the bleeding of re-litigation, nothing more."**

### The converged package (verified in both steelmen independently)

Both lenses, arguing opposite sides, landed on the identical physical thing. Confirmed in the files:
`LENS-a §3` ("the winning synthesis already adopted (a)'s artifact; it labeled the package (c)") and
`LENS-c §1` / `Verdict` ("(c) buys everything (a)'s reservation buys — same mechanism, same eventual home,
same schema"). The one artifact, stated once:

1. **Object (a's contribution):** engine-owned `trust/` home (`$FF_ENGINE_HOME/trust/`, engine-principal-owned)
   + a pinnable schema (subjects, `maxTrust` ceiling, revoke-not-delete).
2. **Class + read-semantics (c's contribution):** a Constitution-class protected node `policy:seam-authority`
   (`protected_namespaces`, `can_write: []`), read by the engine **as a clamp** on the trust axis, NOT a
   capability grant. `seamAuthority-trust = clamp(hostClaim, floor=unverified, ceiling=lookup)`.
3. **Inert canary:** an empty `seam-authority-registry.json` (`subjects: []`) + loader stub, zero call-sites,
   zero enforcement — the paper-freeze pattern already reviewer-PASSed for `ports/principal-{resolver,stamper}.ts`
   (187/187). Its second job: a write-canary ("can `agent-uid` write this path?") that **empirically dates**
   when the isolation boundary starts biting instead of leaving it as prose.
4. **Machine-checked P-5 tripwire:** a build/lint check that goes RED if any enforcement-flip code path exists
   while the registry is empty/absent — chosen because this project has a **proven** prose-rot precedent
   (the "Stage-1 uncommitted" claim that drifted from on-disk reality for a whole session after commit
   `3474cd1`, the FORK-1 drift).
5. **Honest `unverified` floor:** every stamp reads "seam authority not vouched" until the root is populated —
   which is gated (P-5) on uid-split ∧ P-2, TOFU rejected, owner-manual seed.

**One line:** *(a)-object wearing (c)-gate.* Nobody has to relabel it again.

### Disposition: fork CLOSED / decided — ONCE

The critic's decisive point (`CRITIC §Verdict`): D4 has effectively been decided **three times already**
(Fable's rec, the FORK file's own body, `tracks/01-how-to-implement.design.md:40`'s flat "Chosen") while its
frontmatter still read `status: draft (owner-choice pending)`. That is the same prose-rot class as the FORK-1
drift. The real, non-fake value of ratifying now is **convergence-closure**: it stops the fork from silently
re-opening and being re-argued a fourth time. Marked decided; execution plan = the `tracks/` sequence.

### The honest caveat — DO NOT read "D4 ratified" as "M5 buildable"

This is the sentence the owner would want in the same breath as the closure (`CRITIC §4`, classification
CRITICAL): **ratifying D4 does not turn any existing readiness gate green. It MINTS a new one (P-5).** On the
owner's own metric ("10 iterations, 0 gates moved"), D4-closure is *net gate-count neutral-to-negative* — a
process-hygiene win (an ambient assumption becomes a checkable gate), not distance-to-buildable-M5 reduced.
Both steelmen agree neither (a) nor (c) changes what an attacker-agent can do at today's same-uid ISO-2. So
the closure is real and worth having — but it is a **housekeeping close, not forward motion.** I refuse to let
it be read as the latter.

---

## The TWO true remaining gates (what actually unblocks M5 code)

Every artifact in this session converges on this, and it is where the owner's attention should go:

1. **LAND P-2 (owner action, ready now).** The gateway-dup / voice-dedup fix is already implemented this
   session on branch `fix/p2-voice-dedup-ingress` in the `agents-manager` repo (ingress-dedup BEFORE
   transcription). It is the one gate every document names as the true critical path and the only one fully
   within reach today. **Forward motion = owner merges the branch + `pm2` restart.** Nothing in D4 touches it.

2. **SCOPE the ISO-2 uid/process split (next real design track).** The critic's sharpest under-volunteered
   fact (`CRITIC §1, §4`): P-5's own prerequisite — the uid/process split that turns the registry from
   convention into kernel-enforced — **has no track, no scope, no session assigned**
   (`tracks/03-isolation-uid-split` is the only track with design=0; `tracks/INDEX §Секвенс`: "узкое место").
   Calling D4 "blocked on ISO-2" undersells the distance: ISO-2 is a ratified *direction* but an un-scoped
   *build*. **The next genuine design work is scoping that split** — not re-arguing A vs C.

**Forward path in one line:** land P-2 (branch ready) → scope ISO-2 uid-split (the longest pole) → populate
P-5 → P-4 owner nod → enforcement flip. D4/D5 are now *named text* riding that sequence, not the blocker.

---

## Clear bucket (D2 · D5-main · D8 · D9)

### D2 — ratify ADR-0010 §③-bis + ADR-0011 → **RATIFY (clean), landed via delegation**

Owner-proxy checked §③-bis + ADR-0011 end-to-end for an overclaim and found none: the honest-limit clause
("`seamAuthority` is NOT unforgeable without a *named* out-of-band root; every stamp reads `unverified` until
then") is present in four separate places, and enforcement is explicitly excluded everywhere. This is exactly
the shape of move the "moved-a-gate" rule was written for: zero code, zero behavior, ratifies *direction*.

**Reconciliation note (a drift I resolved).** The two ADRs were in a **three-way status drift** — top Status
clauses read `approved` (written aspirationally by paper-move-2, evidence commit `3474cd1`), an inline §③-bis
heading and validation note still read `proposed`, and the direction-review (`tracks/INDEX §Открыто владельцу`)
recommended demoting the "false `approved`" to `review` pending an actual owner nod. Same prose-rot class as
FORK-1. Landing D2 **collapses all three into one honest state:** genuinely `approved`, now *backed* by a
delegated owner ratification (provenance line added), superseding the "demote to review" recommendation.

### D5-main — seam topology → **broker-seed, decided-BUNDLED-with-D4**

Owner-proxy flagged (correctly, medium confidence) that D5 is not free-standing: `FORK-decision5` frontmatter
states `depends-on: decision 4 = C`, and D5 is the twin of D4 on the *placement* axis — same move (name the
shape, defer the process, honest `unverified` floor) one layer out. Since I close D4 as the converged package,
its antecedent exists, so D5-main resolves in the same breath: **broker-seed = a distinct stamp MODULE at the
host tier, co-located for now, unreachable by the T-agent unit, extractable later**, with both exits
(→ standalone / → signed-token) reserved without touching the frozen `write(act): Ack` contract. The
module-in-gateway-vs-standalone **sub-fork stays OPEN** — it is coupled to the gateway-extraction decision
(`coupling=0`, ADR-0006), external to M5. Marked decided (form named as text); sub-fork explicitly deferred.

### D8 — Sheets ingest (F-D) → **DEFER, don't-block-M5 — but name the classifier-gap it opens**

Don't-block-M5 is clear and the design doc says so itself (§0: "do not ask for F-D as a first move… ask on the
wave of motivation"). The nuance owner-proxy caught, which I keep alive rather than undersell: **"just an
adapter" is optimistic framing.** Sanctioning F-D is "expensive attention" — it lights up **D-1 (the
7-referent-class policy + classifier-gap, where naive fail-closed admission stalls ~100% of real rows)** and
four bundled sub-forks (read path · deletion/tombstone semantics · sync actor identity · runner issuer id),
one of which is a semantic choice, not an implementation detail. So: defer freely, but when the owner does pull
this thread it must arrive as *"F-D is a 4-part bundle that also opens D-1"*, not a one-line adapter task.

### D9 — canonical `protected_namespaces` seed in test fixtures → **DO alongside next builder wave**

Cleanest item in the batch: `F2-seed-fixtures.spec.md` is fully specced, test-only, additive (new
`test/fixtures/constitution.ts` + `test/f2-namespace-ceiling.test.ts`), closes a real coverage hole (H-0: 7 of
9 engine suites run F2 as a structural no-op), touches zero production code, and carries its own
mutation-probe falsifiability check. Free insurance — do it on the next engine pass. Keep alive the one caveat:
§2.C (de-inerting the 7 no-op suites) is optional and must "STOP and flag, don't paper over" if it surfaces a
latent assumption.

---

## Where I'm still not certain (honesty note)

**The P-5 gate-wording scope-creep (`CRITIC §3`).** As ratified into ADR-0011, P-5 blocks *enforcement flip ③
as a whole* while it is red — but the ADR's own validation plan describes properties about **G1 (refuse-forged
`actor`)** that do not depend on a vouched `seamAuthority` root at all. An engine can legitimately refuse a
forged `actor:'user:admin'` while `seamAuthority` stays `unverified` forever. So P-5's wording may have
silently coupled two independent enforcement properties (G1 forge-refusal vs G4 root-vouching), and whether ③
is truly monolithic or should split into independently-flippable sub-gates is answered nowhere in the read set.
I did **not** touch this — it is a technical-content question for the next design pass, and I flag it rather
than resolve it by proxy. If ③ should be splittable, the "P-5 blocks the whole flip" clause will need a
follow-up edit before the next session treats P-5 as settled.

---

## Recommended next step

1. **Owner:** land P-2 (merge `fix/p2-voice-dedup-ingress` in `agents-manager` + `pm2` restart). This is the
   only move that reduces distance to buildable M5 today.
2. **Next design track:** scope the ISO-2 uid/process split (`tracks/03-isolation-uid-split`) — the un-scoped
   longest pole. Hand to `system-architect` for a boundary-scoping pass.
3. **Deferred/parked:** D8 (F-D) until the owner's motivation wave, arriving as a 4-part bundle. D9 folded into
   the next builder wave. P-5 gate-wording scope-creep queued for the next design pass.
