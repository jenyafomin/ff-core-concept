---
node_type: critic
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-10
plan: ../../README.md
title: "Adversarial re-check of law1-ratify.analysis.md recommendation (ACCEPT ЗАКОН-1 + Form-4 rider) — verdict CLEAN"
related:
  - ./law1-ratify.analysis.md                      # the analysis under test
  - ../../work/two-laws.invariant-candidate.md     # U-L1 text-under-signature
---

# VERDICT: CLEAN

## 1. Smuggled verdict — not found
The recommendation stays a lens. "ACCEPT" is scoped explicitly to FORM only; every policy fork is
named and left open: R4 fail-open/closed default (`law1-ratify.analysis.md:156-158`), F6 direction for
Form 2 (`:159`), Form 4 freshness policy (`:160-161`), plus Q-L1dom/Q-I4/Q-Law2 (`:162-165`). The one
"rider" (Form 4 disposition named at signing) offers two symmetric options — "in-scope-now OR a
conscious cut" (`:142-145`) — without picking one. This is a scope-declaration requirement, not a
disguised policy pick.

## 2. Sharpest factual claims — verified to file:line, all correct
- (a) `payload-store.ts:33` — `get(payloadHash: string): unknown | null` — confirmed NO `viewer` param.
  Form 1 "weakest retrofit claim" holds: it's a read choke-point, code-retrofittable (add param,
  reroute callers) — genuinely different in kind from append-only write forms.
- (b) `admission.ts:9-11` (docstring: "admit() runs BEFORE any journal write") is not aspirational —
  confirmed wired at `packages/engine/src/engine.ts:76` (`const verdict = admit(finalized, ...)`
  inside `write()`, called before `store.writeAct` per `engine.ts:5`). Fail-closed branch at
  `admission.ts:132-133` (payloadRef-without-payloadHash → `refuse(...)`) is real code, not doc-only.
- (c) `types.ts:208` — "FROZEN act-envelope shape" comment, confirmed. `types.ts:215-232` — `interface
  Act` body (`id, actor, provenance, recordedAt, actKind, edges, payloadRef, payloadHash, hashScheme,
  payload`) — confirmed NO as-of/valid-time field. `types.ts:217` — `actor: SubjectRef` — confirmed
  present, matching the claim that actor is already reserved and NOT part of Law-1's net-new ask.

Spot-checked one supporting citation too: `01-truth-decomposition.analysis.md:150-153` quote ("Может
быть retrofit-НЕВОЗМОЖЕН... срочность до G1") matches source verbatim — the analysis's own hedge on
Form 4's urgency is not overstated.

## 3. Honesty about scope
Confirmed. The analysis repeats "reserves FORM only" at three separate points (per-form section,
Option A steelman, final recommendation) and lists 6 residual owner items explicitly, none of which it
answers on the owner's behalf. It also self-critiques Form 1's label as overstated ("weakest,
design-debt not append-only permanence") rather than hiding the weak spot.

## What passed
Two sharpest checks: (1) `get()` genuinely lacks a viewer param and Form 1's "weakest" framing is
factually earned, not rhetorical; (2) the FROZEN `Act` envelope at `types.ts:215-232` genuinely has no
as-of field while `actor` is genuinely already present — the load-bearing asymmetry the whole
recommendation rests on is real, not asserted.

No smuggle, no factual error, no minimal fix required.
