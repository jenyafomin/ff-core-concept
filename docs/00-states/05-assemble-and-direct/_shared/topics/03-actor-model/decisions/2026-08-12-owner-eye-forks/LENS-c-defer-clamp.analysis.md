---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: steelman-(c)
title: "LENS — steelman option (c): name the Constitution-clamp, defer the content, gate on P-5"
decision: owner-decision 4 (M5-synthesis §6.4 / FORK-decision4-root-of-trust — root of trust for seamAuthority, G4)
adversarial-round: this file argues (c) as strongly as possible; a sibling agent argues (a); a critic red-teams both
related:
  - ../FORK-decision4-root-of-trust.decision.md                                   # already-recommends (c); this file sharpens/defends it
  - ../../m5-surface-identity/design/root-of-trust/03-defer-or-reuse-capability.design.md  # C's full argument (C1 defer-safety, C2 layering test)
  - ../../m5-surface-identity/design/root-of-trust/01-engine-registry.design.md    # option A, read for its own §7 same-uid concession
  - ../../m5-surface-identity/design/root-of-trust/04-threat-model.critic.md       # 6 attacks × A/B/C — the honest floor under every choice
  - ../../m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md             # §2 the fork as originally posed
  - ../../m5-surface-identity/design/06-enforcement-precondition-map.design.md     # P-1…P-5 exit criteria, dependency graph, critical path
  - ../../tracks/01-root-of-trust/01-how-to-implement.design.md                    # C already executed into a 6-track build sequence, same day
  - ../../tracks/04-seam-authority-defect/01-how-to-implement.design.md            # evidence C generates real, live, fixable next steps — not stalling
  - ../../../../../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md  # §D3 Constitution clamp — the reused pattern; §D4 grant layer — why NOT this
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md        # G4, P-1…P-5, "P-5 (added 2026-08-12)" section
phase: DESIGN — argument only. NO code, NO commits, NO git mutation.
---

# LENS — steelman (c): name the Constitution-clamp, defer the content, gate on P-5

> Adversarial-round framing: I argue the strongest case FOR (c). A sibling agent argues (a). A critic
> red-teams both. My obligation here is not "defer is fine" — the owner explicitly rejected stalling
> (10 iterations, 0 gates moved). So (c) has to be shown as a **concrete, gated, self-triggering
> mechanism that moves work today**, not a synonym for "let's not decide."

---

## 1. What "Constitution-clamp" concretely IS

Not a metaphor — a specific, already-precedented engine mechanism, one layer reused verbatim:

**The node.** `policy:seam-authority` — a **Constitution-class protected node**, same class as
`policy:constitution` itself (ADR-0004 `:325-326`): listed in `protected_namespaces`, with
`access.can_write: []`. No principal-driven write path — no `core:write-knowledge`, no grant, no
agent, no gateway — can ever mutate it through the ordinary data plane. It is engine-fixed, not
data-derived.

**The read semantics.** ADR-0004 §D3 defines the project's *one load-bearing security invariant*:

```
effective = clamp( fold(stack), floor=deny, ceiling=Constitution )
```

(`ADR-0004:160-173`) — applied *after* every data-driven fold, order-independent, never overridable by
a later layer. Decision-4=C's contribution is not a new invariant but a **reapplication of this exact
math one level up, at the seam instead of at a data node**:

```
seamAuthority-trust = clamp( hostClaim, floor=unverified, ceiling=policy:seam-authority-lookup )
```

A stamping host's claimed identity is trusted **up to** what this node lists it as, and defaults to
`unverified` (the honest floor) if the node is empty, absent, or the host is unlisted. This is why it
is called a *clamp*, not a registry lookup with a boolean answer — it composes with G3 ("trust never
rises above `unverified` by default", ADR-0010 `:140-143`) instead of competing with it.

**Why NOT a capability grant (D4).** ADR-0004 §D4 gates authorization-plane writes
(`core:manage-access`, `core:manage-grants`, `core:manage-core`) — but every one of those checks
presupposes an **already-resolved principal** to check the grant against. `seamAuthority` answers *who
may produce a principal in the first place* — checking that via a grant would mean the seam
authenticates itself using the authority the seam is supposed to create. `03-defer-or-reuse-capability.design.md:34-45`
names this precisely: the seam sits *below* the capability layer, not inside it. The Constitution clamp
is the one place in ADR-0004 the engine already trusts something **without first resolving a
principal** — which is exactly the shape decision-4 needs. This is not analogy; it is the *same*
D3 code path, one abstraction level higher.

**Physical form (borrowed, not invented).** When populated, home = `$FF_ENGINE_HOME/trust/`,
engine-principal-owned — this is option (a)'s own placement and schema (maxTrust ceiling, subject
list, revoke-not-delete). (c) does not reject (a)'s *shape*; it absorbs (a) as the mechanism's **form**
while declining to claim (a)'s **enforcement guarantee**, which is false today (see §4).

**Made testable now, not just named (paper-freeze canary).** The refinement already on the books
(`FORK-decision4-root-of-trust.decision.md:114-163`) specifies, for when the owner says «строй»: an
**inert** `seam-authority-registry.json` (schema-shaped, `subjects: []`) + a loader stub with zero
call-sites and zero enforcement path — the identical paper-freeze pattern already reviewer-PASSed for
`ports/principal-{resolver,stamper}.ts` (187/187, 0 call-sites). Its purpose is double: (1) a concrete,
diffable artifact the schema can be unit-frozen against before any teeth exist; (2) a **canary** —
"can the agent-uid write this path?" — expected **RED today** (same-uid), which *empirically dates*
the moment the isolation boundary starts biting instead of leaving that as an assertion in prose.

**Made a build-gate, not a sentence (P-5 tripwire).** A test/lint tripwire that **fails the build if
any enforcement-flip code path exists while the registry is empty or absent**. This is deliberately
engineered against a *proven* local failure mode, not a hypothetical one: this project's own pult/
HANDOFF asserted "Stage-1 uncommitted" for a session *after* it had actually been merged
(commit `3474cd1`) — a markdown gate silently drifted from reality for a whole session. A tripwire
cannot drift the way that prose precondition did.

---

## 2. What (c) does NOW — is it free, is it honest, is it retrofit-safe

**Free.** Zero code, zero build, zero new attack surface today. The only thing with a genuine
retrofit deadline — reserving the `seamAuthority` *field shape* (P-3: `AuthenticatedPrincipal.seamAuthority`
required, `PrincipalAssurance.seamAuthority?` optional) — is **orthogonal to this fork**: both (a) and
(c) need P-3 regardless of which root anchor wins, and P-3 already has its own independently-tracked
defect and fix (`tracks/04-seam-authority-defect/01-how-to-implement.design.md:23-56`, a live TS2741 in
`principal-seam.test.ts:24-28`, fix ready, waiting «строй»). Choosing (c) costs nothing beyond what P-3
already costs.

**Honest.** Every stamp today already reads `unverified` — 100% in-process, no authenticated identity
source exists anywhere (`ADR-0011:49-54`, ground truth confirmed twice). Naming the mechanism does not
change behavior; it makes an already-true gap **checked** instead of merely known — a legibility win,
not a new limitation. Compare to the failure mode this guards against: G3 explicitly forbids a
default-`channel`/`system` handle that would journal undeserved trust (`ADR-0010:142` "доверие НИКОГДА
не растёт по умолчанию"). (c) is the textual enforcement of G3 applied to the root itself.

**Retrofit-safe — the sharpest form of the argument.** The journal is append-only
(`ADR-0008`; premise repeated in `ADR-0010:96-97`). Once an act is journaled with a trust-above-`unverified`
stamp, it is permanently ambiguous whether that trust was ever earned. Under (c), **nothing is stamped
above `unverified` yet**, so there is nothing to repair later — zero retrofit debt accrues by waiting.
Contrast this with adopting (a) *today*: (a)'s own design document concedes its core guarantee is
**empty at the moment of adoption** — "engine and `claude -p` child run as ONE OS uid, in-process... a
filesystem-permission boundary between two things sharing a uid is convention, not enforcement"
(`FORK-decision4-root-of-trust.decision.md:26-31`, sourced to `01-engine-registry.design.md §7`). If the
owner adopts (a) now and the resolver ever journals a stamp above `unverified` on the strength of "the
registry says so," that stamp is **permanently indistinguishable** from a genuinely-vouched one to a
future auditor — exactly the false-closure the project's own critic pass flagged for the sidecar
topology (RT5), recurring here one layer up at the root-of-trust itself. (c) is retrofit-safe *because*
it refuses to book a claim same-uid reality cannot yet cash; (a)-now is retrofit-**unsafe** for the
identical reason its guarantee is theatre today.

---

## 3. P-5 exit criterion — precise, three parts, already registered

Already written into ADR-0011 (`"## P-5 (added 2026-08-12)"`, `:318-349`) and
`06-enforcement-precondition-map.design.md §1`, not a promise to write it later:

1. **NAME** (paper, closeable *today*): mechanism = `policy:seam-authority` Constitution-clamp node,
   closed the moment the owner picks decision-4=C. This is the only part decidable right now.
2. **POPULATE**: the owner manually seeds the node — TOFU explicitly rejected (self-certification is a
   forbidden pattern, matching D3's "not writable by the thing it governs"). **Hard-blocked** until the
   isolation uid/process split lands: populating earlier would certify a host that can still
   double-stamp behind a boundary that does not yet structurally exist (`ADR-0011:342-346`).
3. **DISJOINT** (the teeth): the owner's write-channel to the node verified genuinely disjoint from
   every path the agent/gateway process can write (**T-seed**), and registry scope resolved
   project- vs platform-scoped (**T-scope**, relevant if `agents-manager` ever serves >1 project) —
   both required to pass a critic pass before P-5 may ever be marked green.

**The gate is hard, not aspirational.** "Enforcement flip ③ cannot go green while P-5 is red" is
already written as a precondition alongside P-1…P-4, not a future intention
(`ADR-0011:333-335`, `06-enforcement-precondition-map.design.md:108-129`).

---

## 4. How (c) avoids being the paralysis the owner rejected

This is the load-bearing question, so it gets the most scrutiny.

**(c) is not "wait." It is "decide the sequencing, decline to fake the content" — and it produced a
same-day build plan, not another round of talk.** Evidence, not assertion:

1. **It converts one open philosophical question into five checkable gates with a stated dependency
   graph and critical path** (`06-enforcement-precondition-map.design.md §2-3`): P-2 (agents-manager
   dedup fix, cross-repo, zero dependency, start now) run in parallel with P-3 (additive field reserve,
   also zero dependency) → isolation uid-split (currently the identified longest pole) → P-5 populate →
   P-4 owner nod → flip. That is a build order with named owners per step, not a deferral.

2. **A later same-day artifact shows (c) was already chosen and executed into a concrete 6-track
   implementation sequence** (`tracks/01-root-of-trust/01-how-to-implement.design.md`, dated
   2026-08-12, `tracks/INDEX.md:29-39`): root-of-trust (this fork, "rec C-hybrid, waiting «строй»") →
   topology (auto-consequence of 01) → isolation uid-split (design-frame, "the narrow point") →
   **seam-authority-defect** (a *live, confirmed-in-code* TS2741 bug, fix ready, independent of this
   fork) → gateway-dup (work-order ready) → file-unit (separate track). This is on-disk proof that
   choosing (c) does not stop work — the very next thing that happened after naming (c) was a concrete,
   numbered sequence of buildable increments, one of which (track 04) is *already a live code defect
   with a one-line fix waiting on «строй», found by grepping the actual test file*, not a hypothetical.

3. **The exit trigger is intrinsic and self-firing, not owner-mood-dependent.** Defer is legitimate
   *exactly* as long as no journaled stamp carries authority-trust above `unverified`
   (`03-defer-or-reuse-capability.design.md:78-89`, §C1.3). The trigger — "the first time the design
   wants a stamp's authority axis to read above `unverified`" — fires automatically when reality
   demands it (first real out-of-process caller at gateway M3, or a second stamping host appearing),
   **not** when someone remembers to revisit a parked decision. This is structurally different from
   "let's talk about it later": there is no scenario where the fork silently reopens because the owner
   forgot — it reopens because the system is about to do something that requires the answer.

4. **The sharpened version is explicitly engineered against this project's own documented rot vector,
   not a generic promise.** The paralysis risk is real *only if* "name + defer" stays prose. The P-5
   tripwire (a build/lint check that fails if enforcement-flip code exists while the registry is empty)
   converts the gate from "a sentence someone must remember to honor" into "a build that goes red if
   violated" — chosen *because* this project has a proven precedent of exactly this kind of drift
   (the Stage-1-uncommitted claim that silently diverged from reality for a session, `commit 3474cd1`).
   (c), sharpened, is not "trust us to remember" — it is "the build enforces the sequencing whether or
   not anyone remembers."

5. **The cost of choosing wrong is asymmetric, and (c) is on the safe side of it.** If the owner picks
   (a) "to feel done," the system starts journaling `channel`/`system`-trust marks the mechanism cannot
   currently back — and because the journal is append-only, that debt is **permanent**, discovered only
   later by a future auditor with no way to repair it. (c) carries no equivalent trap: ratifying it
   *today* is a real decision that moves a real gate (P-5 gets registered in ADR-0011, the mechanism
   gets a name and a home, decision-5/topology unblocks — `FORK-decision4-root-of-trust.decision.md
   §2` step 1→2) — it is not "no decision," it is "decide the order, refuse to fake the content."

---

## 5. Where (c) is genuinely weaker than (a) — honest accounting

Steelmanning (c) does not mean pretending it is free of real costs. Four honest concessions:

- **(a) forces the enumeration exercise sooner.** Writing an actual host list, even one with empty
  enforcement teeth today, is a forcing function: the owner has to think through and name which hosts
  should ever be trusted *while the design context is loaded*. (c) defers that thinking exercise to a
  later moment (after uid-split lands), and there is a real — if soft — risk that returning to it cold
  produces a less careful enumeration than doing it now.

- **(a) is cheaper to explain to a future maintainer.** "There's a file, it lists allowed hosts" is a
  one-sentence mental model. (c)'s shape — clamp-not-grant, D3-pattern-reuse, gated behind a five-part
  precondition map, populate-strictly-after-uid-split — is a more sophisticated design, and every future
  reader of ADR-0011 pays an onboarding cost (c) that (a) does not impose. Complexity has a real,
  ongoing price, not a one-time one.

- **(c)'s safety argument is a discipline dependency, not a technical backstop.** The entire "safe by
  degradation" claim (§C1.2 of `03-defer-or-reuse-capability.design.md`) rests on G3 holding perfectly
  in every future code path forever — if a future PR ever defaults a stamp to `channel` instead of
  `unverified` by coding mistake (not a design flaw, an implementation slip), (c) provides **zero**
  technical backstop against that; nothing in (c) *itself* prevents it, only vigilance elsewhere does.
  (a), by having an actual — even currently toothless — registry file present, at least gives a future
  engineer a concrete artifact to consult and populate correctly at the moment it starts mattering,
  arguably lowering cognitive load exactly when the stakes rise (the next step becomes "add a host to
  the list" rather than "first go read three ADRs to learn you need to create the node at all").

- **The "cost ~0" framing understates a real sequencing cost.** (c) does not save total work relative
  to (a) — the populate step still has to happen later either way, and the write-plane under (c) stays
  authority-blind strictly *longer* than it structurally needs to, for as long as isolation uid-split
  takes (currently the identified longest pole, `06-enforcement-precondition-map.design.md:186-189`).
  (c) also pays a bookkeeping tax (a) does not: P-5 as a registered precondition, the tripwire, the
  T-seed/T-scope critic pass — real, if small, process overhead that exists purely to keep the deferral
  honest. If the owner is confident no privileged-write scenario arises before uid-split lands, that tax
  buys safety against a threat that (a)'s own threat-model already shows cannot fire yet either — a
  genuine, if narrow, case that (c)'s extra ceremony is over-engineering relative to (a)'s "just write
  the file and move on."

---

## Verdict in one line

(c), sharpened with the P-5 tripwire and the paper-freeze canary, buys everything (a)'s reservation
buys — same mechanism, same eventual home, same schema — with zero false claims and a self-firing exit
trigger instead of a prose promise, at the honest price of a strictly longer authority-blind window and
a more sophisticated design that (a) would only pretend to avoid paying for today.
