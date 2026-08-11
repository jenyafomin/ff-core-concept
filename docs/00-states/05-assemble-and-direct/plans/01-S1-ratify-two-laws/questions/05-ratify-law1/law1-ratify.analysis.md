---
node_type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
plan: ../../README.md
title: "Q-Law1 decision-gate — should the owner ratify ЗАКОН-1? (steelman 3 options, judge 4 forms, ONE recommendation — recommend, NOT ratify)"
related:
  - ../../work/two-laws.invariant-candidate.md            # U-L1 — text-under-signature (critic CLEAN x2)
  - ../../work/critic-smuggle-check.critic.md             # the CLEAN bar
  - ../../../../_shared/OWNER-QUEUE.md                    # Q-Law1, Q-G1-scope-gaps, Q-R4, Q-L1dom
  - ../../../../../02-project/core/01-brain/03-unit/UNIT-SPEC-v1.design.md  # deltas land S2, not here
  - ../../../../../02-project/core/00-kernel/invariants.md # I-1..I-14 + pending I-15
---

# Q-Law1 — decision-READY analysis (recommend, do NOT ratify)

> HARD RULE observed: nothing below is phrased as decided. The final "да" is the owner's. This is a
> steelman + honest per-form judgment + ONE recommended option, anchored to code/spec file:line.

## What is actually under signature
U-L1 obliges laying the **PRESENCE** of four structural forms in the substrate *before the first prod
payload*, while leaving every fail-open/closed and enforcement policy to the owner later. It is a
**candidate-invariant**, not a policy. Ratifying it commits FORM, not behaviour.

Code reality (anchored) that frames the whole call — three of the four forms are NOT green-field:
- **admission-point already exists and already runs** before every journal write
  (`packages/engine/src/core/admission.ts:9-11`, `:132-133`). Form 3's "presence" is largely already
  true in code; the net-new ask is the *classifier slot*, not the gate.
- **actor already on the envelope** (`packages/engine/src/core/types.ts:217`) — the write-principal
  form is already reserved; force-bind vs attestation is a separate low-urgency owner fork (Q-FORK-U3),
  NOT part of Law-1. No missing form there.
- **as-of is genuinely absent** from the FROZEN `Act` envelope (`types.ts:208`, `:215-232`);
  `recordedAt` is transaction-time, not valid-time. Form 4 is the only truly net-new envelope field.

---

## Per-form honesty test: retrofit-impossible AND needed-NOW, or could it wait? Any smuggled policy?

### Form 1 — deref-seam funnel (viewer over full CRIT-1 perimeter)
- **Anchor:** `packages/ingest-rentacar/src/ports/payload-store.ts` — `get(payloadHash): unknown | null`
  takes **no `viewer`** today. Only live deref is the interactive `get()` + verification tooling.
  `hydrateFromDisk` (`store-durable-fs.ts:171`) re-folds acts carrying only by-ref
  `{payloadRef,payloadHash}` — safe today *by carriage, not by guarantee* (as the doc says at `:54`).
  ADR-0010 compaction / snapshot FOLD paths **do not exist in code yet** (ADR dir holds only 0004-0009).
- **Retrofit-impossible?** WEAKEST of the four. Deref is a READ; a code choke-point is always
  code-retrofittable (add a `viewer` param, re-route callers). The genuine argument is
  *cheap-now / expensive-later*: while deref call-sites are few (essentially one), one funnel is cheap;
  once ADR-0010 fold/snapshot paths proliferate, corralling them is costly and a leak "just relocates"
  (`F1-read-pep-design.design.md:71`). That is design-debt asymmetry, **not** append-only permanence.
- **Needed NOW?** Yes as consolidation-before-proliferation, since ADR-0010 is imminent. But the
  "retrofit-НЕВОЗМОЖНА" label over-states it — honestly it is "retrofit-cheap-now, expensive-soon."
- **Smuggled policy?** Minor: "full perimeter / all deref paths" is a *coverage mandate* that pre-shapes
  future ADR-0010 architecture. It is still form (one funnel), but the owner should see it constrains a
  design that isn't written yet.

### Form 2 — opaque edge-identity (frozen append-only, key = opaque fields, not interval values)
- **Anchor:** `Edge` (`types.ts:32`); `validFrom/validTo` are RESERVED and **NOT consumed at P1**
  (`types.ts:26-27`). So edges carry no interval identity today.
- **Retrofit-impossible?** REAL — *once edges persist with a chosen identity*, re-keying means rewriting
  an append-only log. The impossibility bites at the moment edges are first persisted with identity.
- **Needed NOW?** Only if edges start persisting identity before S3. Today they don't consume the
  interval → the impossibility is not yet triggered.
- **Smuggled policy?** THINNEST form/policy cut. "identity = only opaque fields (**not** interval
  values)" is a *negative* choice — and the doc itself flags direction (F6: opaque-key vs reify vs
  concede) is the owner's, provisional to S3 (`two-laws…:64-68`, `:116-118`). The critic accepted this
  after the patch. Verdict: presence-of-identity-carrier is safe form; the "opaque-only" wording is
  owner-gated and correctly caveated — but it is the one form where "form" and "policy" nearly touch.

### Form 3 — admission-point presence + classifier slot
- **Anchor:** `admission.ts:9-11` — `admit()` runs BEFORE any journal write; `:132-133` fail-closed on
  ambiguity. The point **already exists**.
- **Retrofit-impossible?** REAL and STRONGEST for the write-path: once a PII fact is admitted append-only
  with no decision point ever having existed, you cannot insert the decision retroactively for that fact.
- **Needed NOW?** Yes — ga-rentacar PII writes are imminent (Q-R4: "first real write freezes behaviour").
  The gate exists; what's laid now is keeping it + a *classifier slot*.
- **Smuggled policy?** CLEANEST cut. Presence vs fail-open/closed default (R4) is explicitly separated
  (`:106-114`). Critic confirmed CLEAN. No fail-closed pre-decided.

### Form 4 — valid-time/as-of field on the act envelope
- **Anchor:** confirmed ABSENT (`types.ts:215-232`); envelope FROZEN (`types.ts:208`). This is the only
  net-new field.
- **Retrofit-impossible?** REAL: a field added to a frozen append-only envelope after prod-payloads exist
  leaves every prior fact permanently without valid-time. Same shape as the `hashScheme`/salt argument
  already accepted in ADR-0009 ②.
- **Needed NOW?** MOST CONTESTABLE need. The doc's own source hedges "**may be** retrofit-impossible,
  срочность до G1" (`01-truth-decomposition.analysis.md:150-153`). Counter-argument the owner may raise:
  the first domain question ("who held the car on the fine's date") looks coverable by edge
  `validFrom/validTo` (P2, reserved `types.ts:26`). The doc's distinction is legitimate — as-of stamps
  the OBSERVATION, validFrom/validTo the RELATION — but whether the observation-axis is needed *before*
  first payload is genuinely the owner's call, not the architect's.
- **Smuggled policy?** CLEAN. Presence-of-field vs freshness policy (ranking/staleness/refuse-stale) is
  explicitly separated to a lens (`:120-126`). One optional field; asymmetric-cost justified.

### Missing form? / Drop a form?
- **Missing:** none found. `actor` (Form-candidate) is already on the envelope (`types.ts:217`) — its
  presence is laid; force-bind vs attest is a separate non-ticking fork (Q-FORK-U3). Truth-conflict
  visibility (Q-truth-fork) is isomorphic to R4 but is a *policy* over Form 3/4, not a new form.
- **Drop:** none should be dropped. Form 1 has the weakest impossibility label but the highest
  proliferation risk (ADR-0010) → keep, relabel honestly. Form 2 is the most "provisional" → the doc
  already marks it so.

---

## The three owner options — steelmanned

### Option A — ACCEPT as candidate-invariant (write the "да")
- **Steelman:** Three of four forms are cheap-or-already-present (admission exists, actor exists, as-of =
  one optional field, seam = one funnel over ~1 live call-site). The costs of laying them now are near-
  zero; the cost of *not* having them after the first ga-rentacar prod payload is append-only-permanent
  for Forms 3 & 4. Accepting reserves FORM only — every policy (R4 default, F6 direction, freshness
  ranking) stays explicitly the owner's. Unblocks S2 (admission-gate form falls out mechanically) and
  dissolves fork F1 (pay-policy-now vs seam-later → "seam now, policy free later").
- **GAINS:** 4 seams reserved before the irreversible first payload; F1 fork collapsed; S1 closes; S2/S3
  unblocked; G1 gains its meaning ("readiness = seams laid," not "all enforcement built").
- **GIVES UP:** commits S2 build effort to lay the forms; ratifies the "retrofit-impossible" *thesis*
  even where the architect and sources hedge it (Forms 1 & 4). Accepting the law is NOT accepting any
  policy — that residue stays open (below).

### Option B — RETURN-for-edit
- **Steelman:** valid only if the owner disagrees with a *specific* phrasing. The two real red-team gaps
  (Instance-1 full perimeter, Instance-4 as-of) were **already patched** under Q-G1 variant Б, and the
  critic is CLEAN twice (`critic-smuggle-check.critic.md:106-138`). So a blanket RETURN now is low-value
  churn. The honest triggers for RETURN: (a) owner judges Form 1's "full perimeter" over-constrains
  ADR-0010; or (b) owner wants Form 4 relabelled as a conscious CUT rather than an in-scope form.
- **GAINS:** surgical precision on one clause.
- **GIVES UP:** a cycle of delay for a text already twice-cleaned; risks re-opening a settled document.

### Option C — REJECT-wholesale
- **Steelman:** legitimate if the owner rejects the *premise* (e.g. rejects admission as a concept, or
  rejects reserving structure he doesn't believe in) and wants maximum optionality / minimal substrate.
- **GAINS:** no structure reserved on paper recommendation; maximum near-term flexibility.
- **GIVES UP:** the asymmetric-regret trap. After the first prod payload, Forms 3 & 4 become
  **permanently unavailable** for all prior facts (append-only). Wholesale rejection also implies
  removing / not-keeping a *working* admission gate that already runs (`admission.ts:9-11`) — implausible
  unless the owner genuinely disowns admission. Highest-regret option.

---

## RECOMMENDED option (recommendation, not a decision)

**Option A — ACCEPT U-L1 as a candidate-invariant** — with ONE rider: at signing, record Form 4
(valid-time/as-of) disposition explicitly as either *in-scope-now* OR a *conscious cut* (Q-G1 variant В).
That is the single form whose "needed-now" is honestly the owner's judgment, not the architect's; naming
it prevents a silent commitment.

- **What the owner GAINS:** four retrofit-sensitive seams reserved before the irreversible first
  ga-rentacar payload, at near-zero cost (3 of 4 already present or one-field/one-funnel); F1 fork
  dissolved; S1 closes and S2/S3 unblock; and — critically — he commits **no policy** by doing so.
- **What the owner GIVES UP:** S2 build effort to lay the forms; and he ratifies the "retrofit-
  impossible" framing as a *thesis* even on Forms 1 & 4 where it is "expensive-soon" / "may be," not
  strict permanence. He should sign knowing Form 1's label is the weakest (design-debt, not append-only)
  and Form 4's need-now is his call.

## What STILL needs the owner beyond this "yes"
A "да" to Law-1 reserves form and closes nothing on policy. Still open and his:
1. **Q-R4 (🔴 highest, ticking):** admission fail-open/closed default + regime-B referent classes. Law-1
   lays only the point; the first PII write freezes behaviour. Menu of 7 classes is ready.
2. **Form 2 direction (F6):** opaque-key vs reify vs concede — provisional to S3.
3. **Form 4 freshness policy:** how as-of is used (ranking/staleness/refuse-stale) — deferrable; plus the
   rider above (in-scope vs conscious cut).
4. **Q-L1dom:** where the two laws physically live — core `invariants.md` (I-16/I-17) vs UNIT-SPEC-local —
   4 options ready; an S2 concern, not a blocker to signing.
5. **Q-I4:** monument-content carve-out — gates the Step-1 code (`erased` act + `shred` port).
6. **Q-Law2** is a separate signature (this fork covers Law-1 only).
