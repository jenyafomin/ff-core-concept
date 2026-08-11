---
node_type: analysis
title: "U3 · Actor role-model (BOUNDARIES lens) — three SubjectRef roles, one principal seam"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
lens: system-architect (boundaries)
run: autonomous-question-closure (iter.8)
question: ../actor-model.question.md
anchors_verified: 2026-08-09
related:
  - ../../../plans/02-S2-lay-forms/
  - ../../02-truth-keystone/
---

# Actor role-model — where the boundary really falls

> Scope (Закон-1): reserve **form/choke-point/identity-presence** only. NO enforcement body, NO
> ViewerResolver reimplementation, NO owner-fork decided. Design/boundary only. Every structural
> claim carries a grep-verified `file:line`.

## Q1 — One actor model, or three contracts? → **Two contracts, not three, not one.**

The three `SubjectRef` roles are NOT one flat "actor" and NOT three peers. They split along a
**principal / referent** seam:

| Role | Anchor | Meaning | Who supplies | Trust it carries | Class |
|------|--------|---------|--------------|------------------|-------|
| `viewer` | `packages/engine/src/core/types.ts:151` (also `:113` resolve arg, `:125` `$viewer` filter) | the party **asking to read** | the surface/caller | claims an identity — **unproven** (`viewer-resolver.ts:8` TODO M5) | **PRINCIPAL** |
| `actor` | `packages/engine/src/core/types.ts:217` | the party **who authored an act** | the caller, verbatim | `invariants.md:54` "actor подставляется клиентом **на доверии**" | **PRINCIPAL** |
| `subject` | `packages/engine/src/core/types.ts:160` (`GrantBody.subject`) | **who a record/grant is ABOUT** | data at mint-time | a *name written into data*, not a party acting now | **REFERENT** |

`SubjectRef = string` (`types.ts:14`) collapses all three into one lexical type, which HIDES this
boundary. The type is right (all three are addresses in one namespace `agent:… / user:…`); the
**contracts differ**:

- **PRINCIPAL** (`viewer`, `actor`) = an authenticated party making a live request. Both need
  **identity resolution / attestation** before `resolve()` (the PEP, `types.ts:113`, `I-7`
  `invariants.md:134`) can mean anything. They are the **same concern seen twice**: `viewer` on the
  read path, `actor` on the write path.
- **REFERENT** (`subject`) = a pointer to a unit. It is NOT authenticated *as itself*; it must merely
  **resolve to a real id** and it anchors consent/erasure and capability grants. At *use* time a
  grant's `subject` is matched **against the resolved principal** inside `resolve()` — that match is
  where referent meets principal.

**Verdict:** ONE principal contract (two entry points: read=`viewer`, write=`actor`) + ONE referent
contract (`subject`). Naming all three "actor" is the trap the question flags.

## Q2 — The choke-point. → **Half-built. Read path has a seam; write path does not.**

- `ViewerResolver.resolveViewer(surfaceIdentity): SubjectRef` (`ports/viewer-resolver.ts:14`) is the
  choke-point **for the read principal only** — it maps a surface identity → the `viewer` every
  `resolve()` takes. Paper-frozen (`viewer-resolver.ts:2`, `:8`), body empty — correct for Закон-1.
- **The write principal has NO analogous seam.** `EngineClient.write(act)` (`engine.ts:73`) takes
  `act.actor` **verbatim** — it finalizes `recordedAt` (`engine.ts:75`), runs `admit()` for PII
  (`engine.ts:76`) and `admitHome` (`engine.ts:81`), but **never resolves `actor`**. `admit()`
  scans *payload*, not identity (`types.ts:231`). So `actor` enters the append-only journal on pure
  caller-trust — the spoofing hole (`invariants.md:54`), the write-side twin of the `viewer` hole
  I-7 already names for HTTP (`invariants.md:143`).
- The seam is **half-present in the shape**: `SurfacePort.submit(viewer, act)`
  (`ports/surface-port.ts:24`) already carries the **resolved `viewer` alongside the `act`**. The
  binding "`act.actor` MUST be that resolved `viewer`" is simply **not stated or reserved** anywhere.

**So:** `resolveViewer` is the read choke-point but does NOT cover `actor`. `subject` should NOT
route through a principal resolver at all (it is a referent; it routes through id-validity + the
admission/consent side).

## Q3 — Minimal form to reserve NOW (structure only, no enforcement)

Retrofit-impossible part = **presence of a choke-point on the WRITE path** (an append-only journal
cannot be re-attested after the fact — I-3/I-4, `invariants.md:61,71`). Reserve exactly this, mirroring
the paper-freeze style of `resolveViewer`:

1. **Generalize the principal seam, don't add a second one.** Rename/re-document `ViewerResolver` as
   the **principal resolver** referenced by BOTH surface entry points: `getRenderSpec(viewer,…)`
   (read) and `submit(viewer, act)` (write). One seam, two call-sites. (Signature stays
   `(surfaceIdentity: string): SubjectRef` — `viewer-resolver.ts:14`.)
2. **Reserve the actor-binding note on the frozen Act envelope.** Add a doc-comment on `Act.actor`
   (`types.ts:217`) stating: *on a surface path `actor` is the **resolved principal** (= the
   `submit` viewer), never free-set by the caller; engine-internal/CLI = trusted operator per I-7*.
   This reserves the choke-point's *location* without a body — identical discipline to
   `HashScheme`/`validFrom` reserved-but-unconsumed (`types.ts:38`, `:192`).
3. **Keep `subject` on the referent side.** No principal resolver. Its home is id-validity +
   admission/consent, not attestation.

That is the whole Закон-1 reservation: **a named write-path principal choke-point + a binding note**,
so `actor` has *somewhere to be resolved* before the first prod payload. Enforcement (force-bind vs
attestation, fail-open/closed, spoof-refusal) = M5/owner, retrofit-cheap.

## Q4 — Belongs inside S2, or a separate seam? → **Inside S2. Not a third seam.**

The two S2 forms **already split on exactly the principal/referent boundary**:

- **deref-seam takes `viewer`** = the **principal** side. `actor` is the *same* principal concern on
  the write path → it folds into this seam, it is **NOT a new seam**. Actor-modeling = "the deref/
  principal seam also governs the write entry-point," not a separate mechanism.
- **admission-gate classifies `subject`** = the **referent** side (`admission.ts`, wired
  `engine.ts:76,81`). Consent/erasure "whose data" lives here.

So U3 does not open a third form. It says: **the S2 principal seam must cover write (`actor`), not
only read (`viewer`).** One reservation extends an existing S2 seam.

## Cross-cut finding (name, don't chase — → task-pool)

`subject` is **overloaded**: in code it is *only* `GrantBody.subject` = the capability-grant target
(`types.ts:160`), but the question's referent role also means *consent-holder / erasure subject*
(`invariants.md` I-2 provenance, erasure canon `types.ts:180`). Those are two different referents
(grant-target vs consent-holder) wearing one word. Not this node's job to split — flag for
`T-actor-identity` scope.

## OWNER-FORK (surfaced — neutral, not decided)

**FORK-U3 · How is the write principal bound?** Once the seam exists, HOW does `actor` get its
resolved value?
- **Option A — force-bind:** engine derives `actor` from the resolved `submit` viewer; a surface
  caller **cannot** set `act.actor`. Simplest, closes spoofing by construction. Cost: no
  delegation/on-behalf-of (an agent acting *as* a user needs a separate explicit mechanism).
- **Option B — attestation-stamp:** `actor` stays caller-supplied but the resolver stamps an
  attestation the PEP checks. Additive-widen the frozen Act (like `provenance` → `Provenance`,
  `types.ts:201`). Cost: a new field + a check; enables delegation but reopens a trust surface.
- **Lever:** *does an agent ever author an act as another principal (delegation/impersonation)?* If
  never → A. If yes → B. This touches the future agent-on-behalf-of-user model → **owner-facing**,
  not agent-solvable. Both options leave the *seam* (Q3) identical — only enforcement differs, so
  reserving the seam now does not pre-decide the fork.

## Confidence
- Role model (principal/referent split; actor≡viewer twin): **high** — anchored in code + I-2/I-7.
- "Write path has no seam": **high** (`engine.ts:73–82` read, no `actor` resolution present).
- Minimal-form recommendation: **medium-high** — the seam is right; exact reservation wording is a
  form detail (see FORK-U3), not a decision this node makes.
