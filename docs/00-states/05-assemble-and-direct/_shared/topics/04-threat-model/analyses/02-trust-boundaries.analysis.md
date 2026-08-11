---
node_type: analysis
title: "U6 threat-model — trust-boundary map of the substrate (architect lens)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
iteration: 9
kind: knowledge
lens: system-architect (trust-boundaries + Закон-1 form/policy classifier)
inputs:
  - ../threat-model.question.md
  - ../../03-actor-model/synthesis/02-resolution.synthesis.md
related:
  - ../../../../../02-project/core/00-kernel/invariants.md
verified: "every structural claim below carries a grep-verified verbatim file:line (2026-08-09)"
---

# U6 — Trust-boundary map (architect)

> DESIGN draft, NOT build. Job: draw the perimeter, mark each untrusted→trusted crossing as
> choke-point PRESENT / ABSENT / HALF, then apply Закон-1 (missing FORM = retrofit-impossible = urgent
> vs missing POLICY = retrofit-cheap). Forms are RESERVED here; policies are NAMED as owner/later. No
> enforcement is smuggled into a form (iter-8 critic's rule §3).

## 0. The one refinement that reframes iter-8
Iter-8 said "`Engine.write()` does not gate." Verified more precisely: `write()` DOES run a
choke-point — `admit()` (`packages/engine/src/engine.ts:76`) + `admitHome()` (`:81`) — BEFORE any
journal write. What it does NOT run is the **capability PEP** `resolveWrite`
(`packages/engine/src/core/resolve.ts:191`). So the write boundary has **TWO different gates with
opposite Закон-1 status**:
- an **admission FORM** (no-inline-PII, structural, `packages/engine/src/core/admission.ts:130`) —
  PRESENT on the live path;
- a **capability POLICY** (who may write / control-plane ceiling, `resolve.ts:191-230`) — ABSENT from
  the live path but the choke-point it needs (the single write funnel) EXISTS.

This split is the whole 80/20: the urgent gaps are the **identity forms** that no funnel can retrofit,
NOT the unwired policy (which the existing funnel makes cheap to add later).

## 1. The perimeter — inside vs outside

**INSIDE the trusted perimeter (engine core, resolved truth):**
- `resolve()` PEP + fold — the LSR policy kernel (`resolve.ts:116`, I-7 `invariants.md:134-140`).
- the append-only journal + its projection (`store-durable-fs.ts:200` `writeAct`), immutable after
  accept (I-4 `invariants.md:71-79`).
- the Constitution ceiling the engine refuses to start without (`engine.ts:54-60`).

**OUTSIDE (untrusted, client/surface/upstream supplied):**
- `SubjectRef = string` — `viewer`, `actor`, `subject`: all three are bare strings the caller sets
  (`packages/engine/src/core/types.ts:14`).
- surface identities (Telegram uid, HTTP principal, mini-app session) — `SurfacePort` = paper-freeze,
  0 impls (`ports/viewer-resolver.ts:14`).
- upstream ingest rows → acts (`packages/ingest-rentacar/src/core/reduce.ts:102,113,147`).
- PII payload content going out-of-band (`packages/ingest-rentacar/src/ports/payload-store.ts` — put/get/shred).

**Where untrusted crosses into trusted:** every canonical write funnels through ONE call,
`engine.write(act)` — verified: the only production `store.writeAct` caller is `engine.ts:106`, and all
producers reach it through `write()` (`ingest.ts:52`, `rental-balance/src/ingest.ts:46`,
`balance-observer.ts:105`, `durable-runner.ts:60`). The read path funnels through `resolve()` as a
filter (`view-compiler` call sites, iter-8 §2). So the substrate has exactly **two doors**, and that is
good news — a single funnel is itself the retrofit-impossible FORM, and it is present for both.

## 2. Per-crossing choke-point census

| # | Crossing (untrusted → trusted) | Choke-point today | Anchor |
|---|---|---|---|
| C1 | surface identity → `viewer` (READ) | **PRESENT (form)**, impl deferred | seam `ports/viewer-resolver.ts:14`; read gated by `resolve()` I-7 `invariants.md:134-140` |
| C2 | surface identity → `actor` (WRITE) | **ABSENT** — actor taken verbatim | `engine.ts:75` spreads `act` (actor unresolved); ingest hardcodes `ACTOR='sync:ga-rentacar'` `reduce.ts:29` |
| C3 | act → journal, **admission** (PII/home) | **PRESENT (form)** | `admit()` `engine.ts:76` / `admission.ts:130`; `admitHome()` `engine.ts:81` |
| C4 | act → journal, **capability PEP** | **ABSENT from live path** (exists off-path) | `resolveWrite` `resolve.ts:191` built but 0 prod calls; funnel exists (`engine.ts:106`) |
| C5 | act → **policy/control nodes** (self-ref I-8) | **HALF** — ceiling coded, not on live path | control-field gate `resolve.ts:200-201`; namespace ceiling `resolve.ts:230`; both inside the unwired `resolveWrite` |
| C6 | PII payload out-of-band (`get`) | **ABSENT** (no PEP on get); addressing salted | `payload-store.ts` `get(payloadHash)`; put stores SALTED (hash-guess blocked) |
| C7 | erasure/shred → retained witness | **PRESENT (form)** | `isWitnessNonReversible` `erasure.ts:96`; `buildErasedAct` `erasure.ts:117`; by-ref `shred` `payload-store.ts` |
| C8 | upstream ingest row → acts | **PRESENT** (routes through C3 funnel) | `ingest.ts:52` → `engine.write` → `admit` |

## 3. THE classification — missing FORM (urgent) vs missing POLICY (cheap)

### 3a. Missing FORM — retrofit-IMPOSSIBLE — reserve BEFORE first untrusted prod payload
- **F1 · write-principal-seam (C2).** There is no seam that resolves/stamps *who actually wrote* an
  act; `engine.write()` accepts `act.actor` verbatim (`engine.ts:75`). Because acts are immutable after
  accept (I-4 `invariants.md:71-79`), any act written before the seam exists can **never** be
  re-attributed — its actor authenticity is lost forever. This is the write mirror of the read seam that
  already exists (`viewer-resolver.ts:14`). **Reserve:** presence of a write-side principal resolution
  point on the funnel. **NAME as policy/later (do NOT decide):** force-bind vs attestation-stamp
  (= FORK-U3, `../../03-actor-model/synthesis/02-resolution.synthesis.md:66-70`) — reserving the seam is
  identical under both; the behaviour is owner's.
- **F2 · data-subject / consent-identity binding (C7).** No code links an act or payload to the *person*
  whose consent governs it; erasure targets an opaque `provenance.source_ref`, never a subject
  (iter-8 §4). Cannot be retrofitted: you cannot later find "everything about person X" if the linkage
  was never captured at write time. **Reserve:** presence of a subject-binding form on the
  act/payload (an edge or field to a data-subject identity). **NAME as policy/later:** consent
  semantics, revocation, valve — the `valveGate`/`consent_event` wiring
  (iter-8 §4, `resolve.ts` valveGate unwired) is enforcement, NOT this form.

That is the whole urgent shortlist. Two identity forms. Everything else is cheap.

### 3b. Missing POLICY — retrofit-CHEAP — funnel/form already present, enforcement any time
- **P1 · wire `resolveWrite` into `write()` (C4).** The capability write-half PEP. Cheap because the
  single funnel (`engine.ts:106`) and `resolveWrite` (`resolve.ts:191`) both already exist — this is a
  connection, not a new structure. (= `T-write-pep-unwired` 🔴, already in pool.) It is an integrity
  DEFECT today, but a Закон-1-cheap one.
- **P2 · PEP in front of `PayloadStore.get` (C6).** `get(hash)` returns PII with no viewer check. Cheap
  to wrap; risk further lowered because `put` stores salted so a guessed hash is not an oracle. The
  *reference* already rides a `resolve()`-gated act.
- **P3 · real `ViewerResolver` impl (C1).** Seam present, M5 implementation deferred by design.

## 4. Self-reference / I-8 — can policy be mutated through the substrate it governs?
**Today: yes, partially.** A plain act write passes only `admit()` (PII/structural,
`admission.ts:130`) + `admitHome()`; it does **not** pass the control-plane ceiling, because that
ceiling lives inside the unwired `resolveWrite` — the control-field gate (`resolve.ts:200-201`) and the
protected-namespace ceiling with its `core:manage-core` meta-cap (`resolve.ts:230`). So a write to a
`policy:*` / `meta:cap/*` node is not capability-checked on the live path.

**But this is a HALF crossing, not a missing form (C5).** The *form* that stops it — the namespace
ceiling + the `core:manage-core` identity — is already coded (`resolve.ts:230`). Closing it is the same
retrofit-cheap wiring as P1 (route control writes through `resolveWrite`). The kernel itself marks the
self-reference boundary as an **OPEN owner question** with only a provisional answer (meta-cap gate
`core:manage-*`), `invariants.md:261-264` — so I do NOT reformulate it as decided. The form is reserved;
the policy (does policy-edit go through the same `resolve()` or a separate meta-plane) is owner's.

## 5. Owner-fork (neutral — options + lever, not decided)
- **FORK-U6-A · where the data-subject binding lives** (F2 form only): option (i) an edge on the act to
  a `subject:` node · option (ii) a field on the payload/PayloadRef · option (iii) a separate
  consent-ledger node the act points at. **Lever:** whether erasure must be resolvable from the act
  alone (auditable without the payload store) or may require the payload store. All three reserve the
  *presence* of a binding; the choice does not change urgency, only shape. (Inherits FORK-U3 for F1's
  behaviour — not re-opened here.)

## 6. Confidence & residual
- **High** on every crossing anchor (grep-verified `file:line`, 2026-08-09).
- **Medium** on completeness of the crossing list — plausible missed classes for the critic to probe:
  projection/fold integrity (C-fold: does `foldInto` `store-durable-fs.ts` trust act content post-admit?),
  embeddings-as-truth (I-14 `invariants.md:224`), plugin-registry removal (I-12), and the deprecated
  inline journal-rewrite shred still on disk (`store-durable-fs.ts:215`, dev-only fence — is the fence
  real?). These are attack-surface (analyst's file 01), flagged here only so the map isn't claimed total.

## 7. One open question
Is the `salted-sha256-v1` witness scheme (`isWitnessNonReversible` `erasure.ts:96`) the ONLY hash scheme
any production act may carry before first PII payload? If a bare-sha256 witness can enter the journal,
C7's "form present" downgrades to "form present but bypassable" — and because I-4 makes the witness
immutable, that too becomes a retrofit-impossible gap (a permanent brute-force oracle over erased PII).
This is a scheme-admission question (does `admit()` reject non-salted witnesses?) — owner/analyst to confirm.
