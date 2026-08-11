---
node_type: synthesis
title: "U3 — critic verdict (adversarial gate BEFORE done)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
lens: critic (adversarial)
run: autonomous-question-closure (iter.8)
question: ../actor-model.question.md
analyses:
  - ../analyses/01-actor-roles.analysis.md
  - ../analyses/02-actor-dataflow.analysis.md
anchors_verified: 2026-08-09 (independently re-grepped, not trusting analyses' line numbers)
---

# U3 critic verdict — **DIRTY** (targeted fixes, not full redo)

> Method: every accepted/rejected claim below was re-verified against the actual file, not the
> analyses' quoted line numbers. Two independent, real problems found — both are small, surgical
> fixes to `01-actor-roles.analysis.md`. The analyst's analysis (`02-actor-dataflow`) holds up
> entirely under adversarial re-check; no fix needed there.

## Claim-by-claim

### 1. Write-path I-7 bypass — **ACCEPT, and sharpen**

Independently verified, not trusting the analyst's numbers:
- `resolveWrite` is a real, fully-built method: `packages/engine/src/core/resolve.ts:191-231`
  (signature at `:191`, not merely a stub — carries namespace-ceiling, admin-clamp, control-field
  gating logic with inline comments about "Hole A").
- `PermissionPolicy.resolve(key, viewer, node, graph)` (`resolve.ts:118-123`) DOES dispatch
  `op === 'write'` to `this.resolveWrite(...)` (`resolve.ts:120`) — so the write half of the PEP is
  wired into the *generic* `resolve()` entry point.
- `Engine.write(act: Act)` (`packages/engine/src/engine.ts:73-108`, read in full) calls `admit()`
  (`:76`), `admitHome()` (`:81`), an idempotency check (`:95-101`), and `this.store.writeAct(...)`
  (`:105`) — **it never calls `this.policy.resolve(...)` or `resolveWrite(...)` anywhere in the
  method.** Grep of `engine.ts` for `policy.resolve` / `resolveWrite`: zero hits outside the
  `resolve()` passthrough method (`engine.ts:69-70`), which is a *different* public method nothing
  in `write()` calls.
- **This is a confirmed, direct violation of `invariants.md:134-140` (I-7)**, which states in its
  own words (`:135-136`): *"Её проходят ОБА пути — view-filter (видимость) и write-path (запись)"*
  and `:140` *"write-path — как гейт"*. The code does not do this. Not a hedge, not "maybe
  elsewhere" — read the whole method, confirmed absent.
- **Sharper than the analyst stated:** `invariants.md:36-37` (I-2) claims `envelope-validator.ts`
  rejects an act without `actor`/`provenance`. Verified `envelope-validator.ts:26-80` in full: it
  validates `graph.nodes: EnvelopeNode[]` against `ENVELOPE_FIELDS` (`types.ts:81-92` =
  `id/type/state/edges/view/visibility/access/acts/policy_ref/body`) — **`actor` and `provenance`
  are not even in that list; they are `Act` fields (`types.ts:216-217`), a structurally different
  type from `EnvelopeNode` never seen by this validator.** This isn't "not yet wired" — the cited
  file cannot enforce this claim even in principle, it validates the wrong object. This is a
  stronger finding than "documentation/code divergence": it's a **category-mismatch canon-lie**.

**Verdict: real defect, not expected M0 paper-freeze.** `resolveWrite` is production-grade code
with real logic (Hole A closure, namespace ceiling) — this was clearly meant to be called and the
wiring was dropped, not deliberately deferred (contrast with `ViewerResolver`, which is explicitly
`TODO(M5)` paper-freeze by its own header). **→ needs a NEW task-pool entry**, distinct from
`T-actor-identity` (resolving `actor`'s identity does nothing for this gap — even a cryptographically
proven `actor` would still sail through `write()` unchecked). No existing task-pool entry covers
this (grepped `write()`, `resolveWrite`, `PEP`, `I-7` across `task-pool.md` — only `T-actor-identity`
references I-7, and only for the identity-resolution angle, not the wiring gap).

### 2. "Two contracts, not three" (principal/referent split) — **ACCEPT split, REJECT one sub-claim**

- The read/write PRINCIPAL split (`viewer`=`types.ts:151`, `actor`=`types.ts:217`, same concern on
  two entry points) is well-founded and matches the analyst's independent dataflow trace. Accept.
- **Reject as unverified:** the architect's role table (`01-actor-roles.analysis.md:41-44`) states
  `subject` "**anchors consent/erasure and capability grants**." Verified `GrantBody.subject`
  (`types.ts:159-160`) and its only two consumers (`resolve.ts:130`, `resolve.ts:148`, both
  `subjMatch` against a grant's subject) — **it is exclusively a capability-grant target.** The
  analyst's own dataflow analysis (§3, `02-actor-dataflow.analysis.md:173-199`) independently
  confirms **no code field anywhere ties `subject` to consent/erasure** — that role is carried by
  `provenance.source_ref` (`types.ts:187-193`), an opaque source-system string, not a `SubjectRef`
  at all. The architect inherited the question spec's own imprecise framing
  (`actor-model.question.md:42`: "чьё согласие") without checking it against code — exactly the
  smuggling this critic pass exists to catch. **Fix:** strike "anchors consent/erasure" from the
  `subject` row, or replace with "the question's own framing conflates this with consent-anchor;
  code shows no such field exists (see analyst §3)" — one sentence, not a redo.

### 3. FORK-U3 — **REAL fork, but mislabeled urgency + self-contradiction found**

- The underlying lever ("does an agent ever author an act as another principal — delegation?") is a
  genuine product/value question an agent should not decide. Accept as real, owner-facing.
- **But: found a direct internal contradiction in `01-actor-roles.analysis.md`.** Q3 item 2
  (`:78-82`) proposes reserving a doc-comment on `Act.actor` stating verbatim: *"on a surface path
  `actor` is the **resolved principal** (= the `submit` viewer), **never free-set by the caller**."*
  That sentence **is Option A (force-bind)**, stated as the reserved form. Yet the FORK-U3 section
  two paragraphs later (`:122-124`) claims *"Both options leave the seam (Q3) identical — only
  enforcement differs, so reserving the seam now does not pre-decide the fork."* These two claims
  cannot both be true: a note that says `actor` is "never free-set by the caller" **is** a decision
  against Option B (attestation-stamp, which by definition keeps `actor` caller-supplied). This is
  exactly the "smuggled enforcement into form-only" failure mode Закон-1 is designed to catch — an
  agent pre-committed a value-fork's answer inside a "just reserving form" paragraph, then
  separately declared the fork open. **Fix (targeted, not full redo):** reword Q3 item 2 to be
  fork-neutral, e.g.: *"Reserve a doc-comment on `Act.actor` noting that on a surface path, `actor`
  MUST be reconciled with the resolved write-principal via a mechanism TBD (force-bind XOR
  attestation-stamp — see FORK-U3); binding rule deferred to owner."* One sentence swap.
- **Urgency check:** `SurfacePort` (the only caller of a would-be resolved write-principal) has
  **zero implementations** (grepped `implements SurfacePort`: none) and is itself paper-frozen
  (`surface-port.ts:2`, `TODO(M5)` at `:9`). Nothing exercises this fork today. Recommend entering
  OWNER-QUEUE at **🟡 low/deferred**, not 🔴 — don't let it compete with genuinely blocking forks
  (Q-Law1/Q-Law2/Q-I4/Q-R4, all already 🔴 in `OWNER-QUEUE.md:24-77`). This matches the architect's
  own (correct) observation that the seam reservation is fork-independent — once fix #3's wording
  is neutralized, that observation becomes true instead of contradicted.

### 4. Enforcement-vs-form smuggling / T-actor-identity duplication — **one instance found (=#3), no duplication**

- The one enforcement-smuggling instance is claim #3 above; no other instances found across either
  analysis (both re-read in full).
- No duplication of `T-actor-identity` (`task-pool.md:103-111`): both analyses reuse its existing
  anchors (`types.ts:14`, `viewer-resolver.ts:12`/`:8`) as a base and add net-new findings (write-path
  gap, subject overload, FORK-U3) rather than re-litigating the resolved task. Consistent with the
  question spec's explicit instruction (`actor-model.question.md:35-36`). Accept.

## What held up under attack (no fix needed)

- Analyst's dataflow trace (`02-actor-dataflow.analysis.md`) — every anchor re-verified
  independently (CLI `cli.ts:67,78`, `engine.ts:65-108` full read, `admission.ts` grep, `erasure.ts:117-137`,
  `resolve.ts` grep for `subjMatch`/`resolveWrite`/`canWriteAccessFields`). All claims confirmed. No
  changes needed to this file.
- Architect's Q2/Q4 (half-built choke-point; folds into S2, not a third seam) — confirmed against
  `viewer-resolver.ts`, `surface-port.ts`, `engine.ts`. Sound.

## Required fixes before CLEAN (both surgical, in `01-actor-roles.analysis.md`)

1. Q1 table, `subject` row: remove/caveat "anchors consent/erasure" (unverified, contradicted by
   the analyst's own §3).
2. Q3 item 2: reword the doc-comment text to be FORK-U3-neutral (see fix text above) so it stops
   pre-deciding Option A while FORK-U3 is presented as open.

## Task-pool / owner-queue actions (new, from this critic pass)

- **NEW task-pool entry** (not `T-actor-identity`): `Engine.write()` never calls `resolve()`/
  `resolveWrite()` — confirmed I-7 violation, confirmed category-mismatch in the I-2 enforcement
  citation. Primary anchors: `engine.ts:73-108` (absence), `resolve.ts:118-123,191-231` (built,
  unwired), `invariants.md:134-140` (the claim it breaks), `envelope-validator.ts:26-80` +
  `types.ts:81-92` (the category mismatch in the I-2 citation).
- **OWNER-QUEUE, low/deferred urgency**: FORK-U3 (force-bind vs attestation-stamp for write
  principal), only after fix #2 above removes the self-contradiction.

## Residual risk (flagged, not resolved here)

`GrantBody.subject` vs "data subject" (consent/erasure) is a genuinely overloaded concept with **no
code representation at all** for the latter (analyst §3, confirmed) — this is bigger than U3's scope
(U3 is about principal identity, this is about referent/consent modeling) but it means
`T-referent-consent` (`task-pool.md:107-108`, FORK-2) and any future erasure-authorization work has
**no typed hook to attach to yet**. Not blocking U3's closure; watch when `T-referent-consent` opens.
