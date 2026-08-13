---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: abstract-thinker (reframe / minimal — "the simplest thing that is not wrong")
title: "Root-of-trust for seamAuthority — Option C: principled DEFER + reuse ADR-0004 arbitration (no new mechanism)"
decision: owner-decision 4 (M5-synthesis §6.4 — out-of-band root of trust for seamAuthority / G4)
builds-on:
  - ../design/04-SYNTHESIS-m5-decision-ready.md            # §2 root-of-trust variants (a/b/c); DEFER-build verdict
  - ../census/03-threat-and-values.critic.md               # T1 (G4 absent) · Form β (self-declared string) · T5/Form γ (source ≠ writable path)
  - ../../../../../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md  # LSR + capability access + Constitution-clamp
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # invariant ①, form ②, G1/G3, "seam authority not vouched"
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md  # G4, P-1..P-4, seamAuthority reserve
  - ../../../../../../../architecture/ADR/ADR-0006-persistence-as-policy.md  # arbitration order Конституция > policy-as-data > integrity-as-engine-duty
phase: DESIGN — one option for owner decision; NO code, NO commits, NO git mutation
sibling-options: 01-* / 02-* in this folder = other roots (engine-side registry / owner-signed artifact); this file = the reframe/minimal option
---

# Option C — the reframe: don't invent a root, DEFER it honestly and REUSE the arbitration we already ratified

> The other options ask *"which new mechanism becomes the root?"* This option asks the level-up question
> first: **is a new mechanism needed at all, right now?** Two sub-threads. C1 proves that an explicit,
> recorded DEFER is coherent and safe-by-degradation, and pins the exact event that ends the defer. C2
> tests whether "who is a legitimate seam authority" is just an instance of the access problem ADR-0004
> already solved — and finds a partial, load-bearing yes.

---

## 0. The one insight (level-up)

`seamAuthority` (G4) sits **below** the capability layer, not inside it. The capability layer (ADR-0004)
answers *"what may this **already-identified** principal do?"* — it **presupposes** an authenticated
principal. The seam is the thing that **produces** that principal. So "who may stamp" cannot be a normal
capability *grant* (that would be circular: grants are checked *after* principal resolution, by the very
principal the seam produces). **But** ADR-0004 already contains an anchor that lives below its own grant
layer — the **Constitution clamp** (`policy:constitution`, `access.can_write: []`, `protected_namespaces`,
applied by the engine *as a clamp after fold*, not as a data-write subject to a principal-check). That
clamp is exactly a thing the engine trusts **without** first resolving a principal.

**So the simplest-not-wrong move is: reuse the *clamp/Constitution pattern* (ADR-0004 D3 + ADR-0006
arbitration), NOT the *grant mechanism* (ADR-0004 D4). No new root machinery is invented; a root is
*reserved as a Constitution-class anchor* and its **population is deferred** until the exact moment a stamp
would mean more than `unverified`.**

---

## C1 — Principled defer: what stays unverified, why it's safe, and the trigger that ends it

### C1.1 What precisely stays UNVERIFIED under defer
- The claim **"host H is a legitimate seam authority"** is vouched by *nothing*. Nobody has certified,
  out-of-band, that the stamping host is entitled to stamp.
- Therefore, per G3/G4, the **authority-of-the-stamper axis** of every journaled stamp reads honestly as
  **`unverified` ("seam authority not vouched")** — regardless of topology (RT1: topology-invariant).
- What is **NOT** deferred: the *field* itself. Per P-3 (ADR-0011) the `seamAuthority`-analog slot is
  reserved now, additively, 0 migrations. **Defer the root, never the field** — the field is
  retrofit-impossible (append-only journal, ADR-0010 §②); the root's *value* is retrofit-cheap because
  until it exists every act already reads `unverified`, so there is no ambiguity to repair later.

### C1.2 Why the system stays coherent and SAFE-BY-DEGRADATION
The proof rests on a single property already ratified as G3: **trust defaults DOWN.**

- **Operationally, defer changes nothing today.** Ground truth (analyst, `02-caller-reality`): 100%
  in-process, no authenticated identity source anywhere, enforcement off. Every act reads `unverified`
  *already*. Explicit defer only *names* that state and *reserves the field* — it neither adds nor removes
  behavior.
- **Degradation is toward refusal, not escalation.** When enforcement eventually exists, an *unvouched*
  seam yields `unverified` stamps, and `unverified` authorizes **nothing above least-privilege**. A missing
  root therefore fails **closed** (deny / no privileged action), never **open** (silent grant). This is the
  whole coherence argument: "no named root" degrades to "no host is trusted to stamp authority" — which is
  the *safe* reading, identical in effect to the current authority-blind write-plane, just now *honest on
  every stamp* instead of silent.
- **Contrast with the trap the DEFER-build verdict named.** The danger was a *default handle journaling
  undeserved trust* (trust silently ABOVE `unverified`). Defer does the opposite: it *refuses to fake*
  trust. Honest `unverified` is the safe floor; a fabricated `channel`/`system` root would be the unsafe
  ceiling. Defer is safe precisely because it never crosses the floor.

### C1.3 The exact trigger that FORCES a root (defer's expiry condition)
Defer is legitimate **exactly as long as no journaled stamp ever carries authority-trust above
`unverified`.** So the forcing condition is intrinsic and self-announcing:

> **TRIGGER: the first time the design wants a stamp's authority axis to read *above* `unverified`
> (i.e., `channel` or `attested`) such that enforcement would GRANT a privileged action on the basis of
> *who stamped it*.**

At that instant — and not one day before — "who vouches that this host may stamp?" can no longer be
answered "nobody," because a real authority decision now rides on the stamp (this is exactly Form β / RT1:
the host self-certifying). Before that instant, the root is *moot* (the stamp authorizes nothing beyond
least-privilege), so building a root now is over-build against a threat that does not yet exist.

Concretely this trigger is **not a new free-floating decision** — it *co-fires with the enforcement flip*
already gated by ADR-0011 P-1..P-4. **Recommendation: register the named root as a new precondition
`P-5`** ("out-of-band seam-authority root named + populated") **alongside P-2 (gateway-dup fix) and
P-3 (field reserved)**. The enforcement flip cannot be green while P-5 is red. This turns "we deferred the
root" from an omission into a *pinned gate* — the strongest form of principled defer.

Secondary (earlier) forcing signals that should *also* end the defer, whichever comes first:
- **First real out-of-process caller** (gateway M3 actually calls `engine.write()` across the IPC boundary):
  now a *named* host exists whose legitimacy is a real question, not a hypothetical.
- **Any second stamping host appears** (future HTTP / CLI, or a second project sharing `agents-manager`
  per T7): the moment there is >1 candidate seam owner, "which hosts are legitimate" stops being trivially
  "the only one," and cross-host consistency (OQ-2) demands the registry exist.

---

## C2 — Can ADR-0004 capabilities absorb the root? (yes to the *pattern*, no to the *grant layer*)

### C2.1 The layering test (the decisive cut)
| Layer | Governs | Presupposes | Can it hold the seam root? |
|---|---|---|---|
| ADR-0004 **grant** layer (D4 `core:manage-*`, mint `grant`-node) | what an **identified** principal may do | an already-authenticated principal | **NO** — circular. To check a grant the engine must resolve a principal; the seam *is* what resolves it. A grant guarding "may stamp" would be verified *by the principal the stamp produced*. |
| ADR-0004 **Constitution clamp** (D3 `policy:constitution`, `can_write:[]`, `protected_namespaces`, clamp-after-fold; ADR-0006 arbitration) | engine-fixed floor/ceiling not derivable from data | **nothing** — engine trusts it pre-principal | **YES** — this anchor already lives *below* the principal layer. It is the one place ADR-0004 accepts a truth the engine holds *without* a principal check. |

**Verdict: the seam root is NOT a capability grant, but it IS the same *species* as the Constitution
clamp.** So decision 4 **partially collapses into an already-solved problem** — not the access-control
problem, but the *bootstrap-anchor* problem ADR-0004 solved once for the Constitution and can solve again
for the seam with the *same pattern and the same arbitration order (ADR-0006)*.

### C2.2 Concretely — what "reuse" means (no new mechanism)
- The root becomes a **Constitution-class protected node** (working name `policy:seam-authority`), listed in
  `protected_namespaces`, with `access.can_write: []` to every data-plane writer.
- The engine reads it **as a clamp** on the authority axis: a stamp's `seamAuthority` value is trusted only
  if the stamping host is listed in this node; otherwise the axis clamps to `unverified`. This is
  `clamp(fold(...), floor=deny, ceiling=Constitution)` (ADR-0004 D3) re-applied one level up, at the seam.
- This directly answers the critic's **Form β** ("`seamAuthority` is just another self-declared string,
  written by the same host it describes"): the *value is not self-declared* — it is **cross-checked against
  an owner-controlled Constitution-class node the host cannot write.** Trustworthiness of the value comes
  from the *same source as the Constitution*: engine-fixed, owner-only, protected — not from the stamper.
- It also satisfies the critic's **T5 / Form γ non-goal** (source must never overlap a path the resolved
  unit can write): a `protected_namespaces` node with `can_write:[]` is, by ADR-0004 D4's own control-plane
  gate, *not* writable by the agent/gateway — the source-vs-writable-path disjointness is structural, not a
  promise.

### C2.3 Where reuse STOPS (honest limit)
Reuse is of the **pattern**, not a free lunch:
- **Seeding the anchor is still out-of-band, and that is the real residual.** ADR-0004's Constitution is
  "engine-fixed" via `can_write:[]`, but *something* seeds it. For the seam root to be genuinely
  out-of-band, the *owner* must populate `policy:seam-authority` through a channel **disjoint from any path
  the stamping host / agent process can write** (owner-only file outside the agent cwd, or an
  engine-embedded owner-controlled constant). If it is seeded from the same deploy/git tree the gateway
  runs from, it is the **false out-of-band** the critic's RT5 sidecar warning describes — legible to a
  future auditor as "independently vouched" when it is not. **This is the same bootstrap ADR-0004 already
  lives with for the Constitution — not a new unsolved problem — but it is NOT eliminated by reuse; it is
  inherited.** (See Open tensions.)
- Reuse gives us the *mechanism and arbitration*; it does **not** decide *content* (which hosts are
  legitimate) — that content is exactly what C1 defers until the trigger.

---

## The simplest thing that is not wrong (recommendation)

**Do all four, all cheap, all today, all text:**

1. **Record DEFER as a first-class decision** (not silence): the out-of-band root is *not named now*, and
   every stamp until then reads honestly `seamAuthority: unverified` ("not vouched"). Legitimate because
   said out loud (synthesis §2 variant c) — and stronger than plain (c) because paired with 2–4 below.
2. **Reserve the field now (P-3)** — already the recommendation; retrofit-impossible later, so it is the
   *only* part that must not wait.
3. **Name the MECHANISM now, defer the CONTENT** (this file's contribution): when the root *is* chosen it
   will be a **Constitution-class protected node** (`policy:seam-authority`) read as a clamp — reusing
   ADR-0004 D3 + ADR-0006 arbitration, **NOT** a capability grant, **NOT** new crypto/PKI. This gives
   synthesis-variant (a) ("engine-side registry, owner-writable only") a *home and a pattern* instead of a
   bespoke invention, and it *is* the natural upgrade path to (b) (owner-signed) later.
4. **Pin the trigger as `P-5`**: "out-of-band seam-authority root named + populated" becomes a precondition
   of the Decision-③ enforcement flip, alongside P-2/P-3. Enforcement cannot go green — no stamp may read
   above `unverified` — while P-5 is red.

**Net: build nothing now; invent no new root; commit to the *pattern* and the *gate*.** This is
maximally consistent with the ratified DEFER-build verdict — it is the DEFER verdict applied to the root
itself, made principled rather than passive.

### 7 values check
- **Витальность (don't over-build) — strongest argument FOR this option.** No out-of-process caller exists,
  no marketplace exists, single owner, all in-process. Standing up a registry/PKI *now* builds a turnstile
  before the wall (ADR-0011's own rejection of ISO-3-first). Defer + reuse-pattern = zero build, zero new
  surface. Vitality maximized.
- **Суверенность.** Root is owner-writable-only, out-of-band, never gateway/agent (D4 control-plane gate +
  `can_write:[]`). Defer specifically *avoids premature centralization* of seam-authority in the wrong
  place — the exact V5 risk OQ-1/ADR-0011 flags. The owner stays the sole anchor; no auto-authority is
  minted under pressure.
- **Согласие.** Consent is an orthogonal axis (F7 non-goal); the root does not touch it. Keeping the root
  Constitution-class keeps the *owner* as the authority/consent anchor rather than delegating it to a
  self-certifying host.
- **Читаемость.** "seam authority not vouched" is printed on *every* stamp — the human/auditor *sees* the
  unverified state. Honest label beats false confidence (V3). Defer is a *readability win*, not a gap.
- **Доверие.** No trust is fabricated; the append-only journal is never poisoned with undeserved
  `channel`/`system` marks. Trust rises only when a real out-of-band root backs it.
- **Тождество.** Untouched — G1 (refuse-not-rewrite `actor`) still holds; this option adds only a clamp on
  the *authority* axis, never rewrites attribution.
- **Реляционность / portability (OQ-2).** A Constitution-class registry is a natural place to later express
  cross-host legitimacy when a unit moves between hosts — but that is deferred content, not built now.

---

## What this model simplifies
- **"Design a new root-of-trust mechanism"** → becomes **"reserve one more Constitution-class protected
  node and defer its population"** — no new machinery, one known pattern.
- **"A/B/C root choice feels equivalent and hard"** → becomes obvious: (c) defer is correct *now* because
  the root is *moot until a stamp reads above `unverified`*; (a) is the *mechanism* (c) reserves; (b) is
  (a)'s later upgrade. They are a *sequence*, not a fork.
- **"seamAuthority is just another self-declared string" (Form β)** → dissolved: the string is clamped
  against an owner-only node the host cannot write.

## What this model does NOT cover (honest)
- It does **not** eliminate the *seeding* bootstrap — the owner still needs a write channel to
  `policy:seam-authority` that is genuinely disjoint from the agent/gateway write paths. Reuse *inherits*
  this from ADR-0004's Constitution; it does not solve it. (Open tension #1.)
- It does **not** decide *which hosts* are legitimate (that is the deferred content).
- It does **not** address gateway-dup (P-2) — orthogonal; defer of the root neither helps nor blocks it.
- It does **not** provide any authority-authentication *today* — by design (that is the "cost in trust"
  below). If marketplace/out-of-process pressure arrives *before* M5, P-5 becomes critical-path faster than
  assumed (same honest caveat as ADR-0011 OQ-1/OQ-2).

## Open tensions
- **T-seed (real):** is a Constitution-class node *truly* out-of-band, or false-out-of-band (RT5) if seeded
  from the same tree the gateway runs from? Genuine only if the owner's write channel to it is disjoint
  from every agent-writable path. Same bootstrap ADR-0004 accepts for the Constitution — inherited, not
  closed. Must be answered before P-5 can go green.
- **T-scope (from T7):** if `agents-manager` is the seam owner for *multiple* projects, is the registry
  project-scoped or platform-scoped? Platform-scoped registry raises cross-project blast radius and pushes
  toward (b) owner-signed sooner. Flagged, not resolved.

## What it costs in trust
**Under defer, the seam provides ZERO authority-authentication:** no agent-caused write can be trusted as
"authorized by a legitimate host" — every stamp is `unverified`. But this *loses nothing that exists today*
(the write-plane is already authority-blind); it only *refuses to fabricate* what isn't real. The concrete
price is a **sequencing cost, not a security cost**: the Decision-③ enforcement flip stays blocked (via
P-5) until the owner names + populates the root — i.e., the write-plane remains least-privilege /
authority-blind *longer*. Given the phase (DESIGN, single owner, in-process, no marketplace), that cost is
**~0 today** and rises only when the trigger (first stamp wanting trust > `unverified`) actually arrives —
at which point paying it is *mandatory anyway*, and paying it late is no worse than paying it now, because
the field (P-3) preserves retrofit-honesty in between.

## Recommended next step
- Owner decides decision 4 among the sibling options in this folder. If this option is chosen: ratify as
  **text** (0 code) — (1) defer recorded, (2) mechanism = Constitution-class `policy:seam-authority` clamp
  reusing ADR-0004 D3 / ADR-0006, (3) add **P-5** to ADR-0011's precondition list.
- Then **system-architect** folds P-5 + the `policy:seam-authority` clamp pattern into ADR-0011
  (§Открытые вопросы OQ-1 already holds the seat) and cross-links ADR-0004 D3 as the reused pattern.
- **T-seed** and **T-scope** go to a **critic** pass before P-5 is ever marked green — they are the two
  ways this "reuse" could quietly become false-out-of-band.
