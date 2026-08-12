---
type: critic
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: critic (adversarial red-team + value-preservation audit — NOT a design proposal)
title: "CRITIC — Decision ③ (write-principal source A/B/C) против северной звезды + 7 ценностей"
scope: ADR-0010 Decision ③ (open) — packages/engine trust-plane, branch refactor-tree
targets:
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../council/raw/2026-08-11-next-step-strategy/CRITIC-invariant-and-form.critic.md
  - ../../../../../../council/raw/2026-08-11-next-step-strategy/CRITIC-redteam.analysis.md
verified-against:
  - packages/engine/src/core/types.ts:212-266   # PrincipalAssurance reserved form, per-axis, issuer, delegation slot
  - docs/02-project/core/01-brain/01-overview/01-values/V1..V7 (cards) + 03-doverie/01,06 · 05-suverennost/05 · 07-soglasie/01 (deep dirs)
  - docs/02-project/core/00-kernel/invariants.md (I-2, I-7, I-8)
  - docs/00-states/05-assemble-and-direct/_shared/OWNER-QUEUE.md:219-238 (Q-FORK-U3, resolved via invariant)
not-repeating: findings from CRITIC-invariant-and-form.critic.md (C1 authority≠attribution, C2 flat-enum, N1 channel-theatre,
  N2 signature-freeze) are TAKEN AS GIVEN and already fixed in ADR-0010 ①/②. This file builds ON them, does not re-litigate.
---

# Critic — Decision ③ against the north star and the 7 values

> Not picking A/B/C. Attacking each, and auditing whether the seam itself — however implemented — quietly
> trades away one of the 7 cultivated values while claiming to protect Доверие (V3).

## 0. Framing check (before the attack)

The ADR's own north star: **plugin/potentially-hostile agents over untrusted transport (marketplace)**.
Every variant below is graded against THAT threat model, not against "does it stop a lazy in-house bug."
ADR-0010 already names one open tail that this file elevates to CRITICAL (§1.0): **in-process vs
out-of-process plugin execution is undecided**, and it is the hidden variable that determines whether ANY
of A/B/C can be a real boundary at all.

---

## 1. Per-variant surviving-exploit list

### 1.0 The gating premise none of A/B/C can answer (applies to all three)
**No isolation-model decision exists.** Nothing in `docs/` commits to plugins running out-of-process
(separate OS process, VM/worker realm, network boundary) vs in-process (imported npm module sharing the
same V8 heap as the engine). ADR-0010 itself lists this as an "open tail" (`Открытые хвосты`: "In-process
vs out-of-process агенты — влияет на силу channel-trust (A) и на угрозу шлюза"), but Decision ③ is framed
as "pick A, B, or C," not "pick an isolation model, which then determines whether A/B/C mean anything." A
и C are **literally unenforceable without a real process/realm boundary** — see below. This is not a new
threat, it is the ADR's own acknowledged gap, promoted here to "this blocks a meaningful choice among
A/B/C," not just "worth a footnote."

### A — Trusted channel (force-bind by caller/channel)
**Surviving exploit:** *self-selecting principal via an alternate call path, at zero attacker cost.*
Already proven, not hypothetical: `packages/ingest-rentacar/src/core/reduce.ts:29` and
`same-as-writer.ts:25` show the "channel" today is **whichever function happens to run**, not an
authenticated boundary — `sync:ga-rentacar` vs `agent:ga-rentacar-dedup` is chosen by code path, not by
identity proof (this is the exact fact CRITIC-invariant-and-form.critic.md N1 already caught for
in-process ingest). The marketplace-specific escalation of that same finding: **a plugin loaded
in-process (e.g. `require('@marketplace/some-agent')`) automatically inherits "channel" trust for free,
indistinguishable from a first-party caller**, because there is no runtime boundary between "our code" and
"their code" once both run in the same process. Renaming the exploit `channel` instead of `unverified`
does not close it — it launders it under a more authoritative-sounding label.
Compounding factor: `ViewerResolver` write-side (M5) does not exist, so there is no legitimate uid to
force-bind FROM in the first place — enforcement today would have to force-bind a synthesized/static value
(e.g. `system`), which is theatre by construction, not a hardening. Gateway dup-message/restart bugs
(MEMORY: `gateway-dup-kill-bug`) mean even the ONE plausible real channel (the gateway process boundary)
can double-stamp or mis-stamp a single logical act across two sessions — the boundary that exists is not
reliable, on top of the boundary that matters (plugin-vs-host) not existing at all.

### C — Principal handle (ocap, force-bind from handle context)
**Surviving exploit:** *handle forgery via shared object graph, absent real realm isolation.* ocap
strength comes entirely from handles being genuinely unforgeable — which requires memory isolation
(separate OS process, `vm.Context`/worker-thread with no shared references) that nothing in the current
architecture provides. In a single Node process, a hostile plugin can reach shared module state, monkey-
patch exports, or simply receive the SAME reference object any legitimate caller receives (JS has no
built-in capability-safe object isolation across same-realm modules). Concrete exploit: `require()` a
sibling module that holds a live handle reference, or monkey-patch the handle-minting function before the
legitimate caller runs — same result as A, one label fancier. Attenuated sub-handles for delegation add a
SECOND exploit surface: a bug in attenuation logic (over-broad sub-handle) is a privilege-escalation path
narrower in blast radius than A's blanket forgery, but new, and untested by the existing adversarial gate
(the ADR's 5-test gate in §"План валидации" does not name a delegation-attenuation test).
**Verdict:** without an explicit commitment to process/realm isolation for plugins, C repeats A's theatre
under ocap vocabulary — the ADR does not currently scope that isolation work anywhere.

### B — Crypto-attestation (not attacked in depth, deferred/target variant)
Two structural risks worth flagging even though B isn't being built now: (1) issuer key custody/rotation
is real infra the ADR already prices in as a "(−)" — no new finding, just confirming it's not free later
either; (2) the classic failure mode for attestation systems: verification logic gets wired as a
**side-channel check that bypasses the single PEP choke point** (I-7, `resolve()`), e.g. "verify token,
then set a flag the write-path trusts" instead of routing the verified principal THROUGH `resolve()`. If ③
eventually chooses B, the adversarial gate needs a test asserting attestation verification cannot be
satisfied by a path that never touches `resolve()`/I-8's clamp — not present today because B isn't built,
but worth pre-registering now while it's cheap to name.

---

## 2. Value-preservation ledger

| # | Value | Help / Hurt / Neutral | Trap | Guardrail needed |
|---|---|---|---|---|
| V3 | Доверие (trust) | **Both** — per-axis+issuer marker helps (closes the "one word, two axes" ambiguity C2 already fixed); but *enforcing* a `channel`/`attested` label without a real boundary **hurts** worse than doing nothing | **False confidence is worse than honest `unverified`.** A `channel`-labeled act reads to a future auditor/calibration mechanism (03-doverie/02-calibration) as "vouched." This is structurally the same failure V3's own "тихая ложь единиц/локали/валюты" names for data — except now the silent lie is about TRUST ITSELF, one layer more consequential | Do not populate real trust levels (`channel`/`attested`) until (a) M5/ViewerResolver write-side exists AND (b) isolation model (§1.0) is decided. Until then every act stays `unverified` — that is the honest state, not a placeholder to rush past |
| V5 | Суверенность (sovereignty) | **Hurt-leaning** | **Who holds the stamp is a power question, not just a mechanism question.** If the gateway is "the seam owner" for variant A, it becomes an unbypassable, centralized identity authority for every plugin that runs through it — the opposite of V5's "живёт в любом движке" / portability goal (Г19). A plugin moved to a different host/engine loses its whole trust history (everything resets to `unverified` under the new host) with no portable stamping mechanism designed for that | Treat "who is allowed to BE a seam owner" as its own auditable policy decision (mirrors 05-ownership-keys' `policy_source` label: `system-default`/`user-defined`/`agent-proposed+approved`) — not implicit in whichever code happens to call the mint function. Record issuer-assignment as a governed act, not a code fact |
| V7 | Согласие (consent) | **Neutral today, latent trap** | ADR text explicitly separates principal ≠ consent/data-subject — correct, and no current design conflates them. But nothing in ADR-0010 or the reserved `PrincipalAssurance` shape explicitly FORBIDS a future implementer from using `underWhoseAuthority === subject` as a cheap proxy for "consented," which would silently merge two orthogonal axes (referent/existence-consent vs principal-authority) that 07-soglasie/01-referent deliberately keeps separate | Add an explicit non-goal line to the eventual Decision-③ spec/ADR: "principal-trust axis is never read as consent; consent lives exclusively on `referent`/existence-consent, checked separately." Cheap now, expensive to retrofit into policy code later |
| V2 | Тождество (identity) | **Neutral-to-hurt depending on implementation detail not yet fixed** | The invariant (①) already distinguishes authority≠attribution — good. But Decision ③ has **not yet said WHERE enforcement writes its stamp**: into the new `principal.*` envelope only (safe), or over `Act.actor` the way Stage-1's force-bind overwrote `minted_by` (`REVIEW §2`: "same forgery moved fields, same result"). If ③'s first enforcing commit clobbers `actor`, it reopens exactly the wound C1 fixed at the invariant level — one layer up, in code instead of in ratified text — and legitimate attribution (monument, Закон ②, history import) becomes inexpressible again | Commit NOW, in writing (zero code, cheap), that enforcement — whenever built — populates `principal.*` exclusively and never overwrites `Act.actor`. This is a documentation-only guardrail that prevents a real regression later; skipping it is the one action-item in this file that has a genuine now-vs-later asymmetry |
| V1 | Читаемость (legibility) | **Help, with a visibility gap** | Marker is inspectable (per-axis + issuer) — good, matches "видно, что делает ИИ." But no variant specifies whether `principal.whoActed=unverified` ever SURFACES in a passport/summary (V1's Г3, progressive disclosure) or stays buried in the envelope, technically queryable but practically invisible. Legibility that requires knowing to go look is not legibility | When enforcement lands, surface trust-axis state in whatever thin-passport/summary view humans actually read — not just in the raw act |
| V4 | Витальность (metabolism) | **Neutral, indirect cascade risk** | If a falsely-`channel`-labeled act later feeds consolidation/emergence (04-vitalnost), the derived/consolidated node inherits unearned confidence — same false-confidence trap as V3, one hop downstream, harder to trace back to source | Noted, not urgent — only matters once B/A enforcement is real; revisit when consolidation logic is designed |
| V6 | Реляционность (relationality) | **Neutral, indirect cascade risk** | Same mechanism as V4 but along `derived-from`/`caused` edges — a mislabeled-trust act propagates false confidence through the graph, not just into one derived node | Noted, not urgent — same trigger condition as V4's row |

---

## 3. Sequencing verdict — **DEFER, with two cheap non-premature actions now**

**Building Decision ③ (choosing/enforcing A/B/C) now is premature.** Reasons, ranked:

1. The variable that actually determines whether A or C means anything (in-process vs out-of-process
   plugin execution) is undecided and is not even in ③'s scope as framed — picking a source before
   picking an isolation model is answering a question whose premise hasn't been fixed yet (§1.0).
2. M5/ViewerResolver write-side doesn't exist — there is no legitimate authenticated uid to bind A or C
   to. Enforcing today would force-bind a synthesized value, which is the exact channel-theatre the ADR
   itself already declined to build ("НЕ строить channel-theatre сейчас").
3. The value-ledger trap (V3, V5) is not "this gives nothing extra" (ADR's own framing) — it is "this
   actively erodes trust and centralizes sovereignty if surfaced as if it were meaningful." That is a
   stronger reason to defer than the ADR currently states.

**Cheaper honest step that beats building ③ now:**
- Keep every act `unverified` — no code change needed, this is already true (the form is reserved,
  nothing populates it).
- **Do** two things that are genuinely cheap now and expensive to retrofit later (both documentation/ADR-
  text, zero behavior):
  1. Commit in writing that whenever enforcement lands, it writes into `principal.*` only, never over
     `Act.actor` (closes the V2/identity trap above before any code exists to get it wrong).
  2. Name the isolation-model decision (in-process vs out-of-process plugins) as an explicit prerequisite
     to Decision ③ in the ADR's "Открытые хвосты," not just a passive observation — so a future session
     doesn't pick A/B/C without realizing the choice is conditional on an architecture decision that
     hasn't happened.

---

## Ranked findings

### CRITICAL
- **F1 — Isolation-model blind spot gates all three variants.** A and C are unenforceable-as-theatre
  without a process/realm boundary that nothing has committed to building; B's cost profile also shifts
  depending on it. Lens: assumption-audit, adversarial. Building ③ without resolving this first produces a
  choice that cannot be evaluated against its own stated threat model (marketplace/hostile plugins).
- **F2 — V2/identity re-clobber risk if enforcement overwrites `Act.actor` instead of `principal.*`.**
  Repeats Stage-1's exact documented failure (`REVIEW §2`) one layer up, breaking Закон ②/monument again.
  Lens: contradiction-detection, failure-mode. Cheap to prevent now (write it down), expensive to unwind
  once an enforcing commit has already shipped and journaled acts exist under the wrong assumption.
- **F3 — V3 false-confidence trap: `channel`/`attested` labels are worse than `unverified` when the
  guarantee behind them is theatre.** Lens: assumption-audit. Directly extends the ADR's own N1 concern
  from "gives nothing extra" to "actively erodes the value it claims to protect" — a stronger reason to
  hold enforcement.

### CONCERN
- **F4 — V5 sovereignty centralization: the seam owner becomes an unbypassable identity authority,** with
  no `policy_source`-style audit trail for who gets to BE a seam owner, and no portability story for trust
  history across engines/hosts (contradicts V5's marketplace/portability goal). Risk if ignored: the
  platform quietly becomes the single point of identity truth the marketplace vision was supposed to avoid.
- **F5 — Variant C's ocap handles are forgeable without real realm isolation** (shared-process object graph,
  monkey-patchable exports). Risk if ignored: C gets chosen believing it's stronger than A when, absent
  isolation, it is the same exploit with different vocabulary.
- **F6 — V1 legibility gap: trust-axis state may be technically queryable but never surfaced** in any
  passport/summary a human actually reads. Risk if ignored: "видно, что делает ИИ" holds in principle, not
  in practice.
- **F7 — V7 consent-bleed is not a present violation but has no explicit guard.** Risk if ignored: a future
  implementer uses principal-authority as a cheap consent proxy, silently merging two axes 07-soglasie
  deliberately keeps separate.

### PROVOCATION
- **F8 — If B is eventually chosen, attestation verification could be wired as a side-channel that bypasses
  `resolve()`/I-7's single PEP choke point** (I-8's clamp never applies). Worth pre-registering as a future
  adversarial-gate test now, while it's cheap to name and before any code commits to a shape.
- **F9 — V4/V6 cascading false-confidence:** a mislabeled-trust act that later feeds consolidation
  (04-vitalnost) or is traversed via `derived-from`/`caused` edges (06-relyacionnost) propagates unearned
  confidence downstream, harder to trace back once it has. Only matters once enforcement is real.

### NOTED
- The retrofit-impossibility framing for the trust marker itself (per-axis + issuer, reserved now) is
  sound and already validated by the prior critic pass (CRITIC-invariant-and-form.critic.md) — not
  re-litigated here; nothing in this pass found a problem with the FORM, only with the sequencing/labeling
  of BEHAVIOR (③).

### What I looked for but didn't find problems with
- The reserved envelope shape (`packages/engine/src/core/types.ts:212-266`) — per-axis, issuer, empty
  delegation slot — is additive, doesn't smuggle a behavior choice, and doesn't itself violate any of the
  7 values; the risks in this file are all about what happens IF/WHEN Decision ③ enforces behavior on top
  of this form, not about the form as it stands today.
- No evidence the current reserved form conflates authority with attribution in the TYPE system (C1's fix
  held) — `whoActed` vs `underWhoseAuthority` are genuinely separate optional fields.
