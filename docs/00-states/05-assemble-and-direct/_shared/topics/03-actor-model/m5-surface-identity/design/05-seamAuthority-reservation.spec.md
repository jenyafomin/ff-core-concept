---
type: spec
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: system-architect (additive form reservation — P-3, seamAuthority)
title: "SPEC — P-3: additive reservation of `seamAuthority` (G4) on the principal seam"
scope: Project (FF-Personal-Management) · packages/engine (ports/principal-resolver.ts, ports/principal-stamper.ts, core/types.ts) — branch refactor-tree
phase: DESIGN — SPEC only, NO code on disk, NO commits; buildable verbatim the moment owner says «строй»
related:
  - ./02-propagation-and-g4-patch.analysis.md      # Q2 — the G4-patch design this spec formalizes
  - ./04-SYNTHESIS-m5-decision-ready.md            # §3 + §6 decision 3 (the «нужен строй» pointer) + §2 (root-of-trust fork = decision 4)
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # invariant ①, form ② (Act.principal), honest-limit para
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md               # G4 (:123-145), P-3 (:251), retrofit-impossibility (:134-135)
anchors:  # real file:line this spec binds to (verified by direct read 2026-08-12)
  - packages/engine/src/ports/principal-resolver.ts:30-37   # AuthenticatedPrincipal { subject, trust, issuer }
  - packages/engine/src/ports/principal-resolver.ts:48      # resolveWritePrincipal(boundaryIdentity): AuthenticatedPrincipal
  - packages/engine/src/ports/principal-stamper.ts:41-48    # PrincipalStamper.stamp(incoming, principal): PrincipalStampResult
  - packages/engine/src/core/types.ts:231-247               # PrincipalAssurance { whoActed?, underWhoseAuthority?, issuer?, delegation? }
  - packages/engine/src/core/types.ts:257-282               # Act (envelope), Act.principal? at :279
  - packages/engine/src/engine.ts:73-155                    # write(act): Ack — frozen signature, PEP :84-126
---

# SPEC — P-3: additive reservation of `seamAuthority` (G4) on the principal seam

> DESIGN-phase spec. It specifies the EXACT patch so that, on owner «строй», a builder lands it with
> zero interpretation. It touches three files (`principal-resolver.ts`, `types.ts`, `principal-stamper.ts`),
> all still paper-freeze. No behavior. No enforcement. No migration.

---

## 1. Problem

The two frozen ports of the principal seam encode WHO vouched for a principal (`issuer`), but neither
records WHO authorized THIS host to be a stamper at all — the **issuer-of-the-issuer** (G4, ADR-0011:123-145).

- `AuthenticatedPrincipal` (`principal-resolver.ts:30-37`) is exactly `{ subject, trust, issuer }` — no
  seam-authority field.
- `PrincipalAssurance` (`types.ts:231-247`) is `{ whoActed?, underWhoseAuthority?, issuer?, delegation? }`
  — no seam-authority field, so nothing can carry G4 onto a journaled `Act` even in principle.

`issuer` answers *"who vouched for THIS principal"* (attribution of one stamp). `seamAuthority` answers a
different question — *"under what registration/policy is this host process itself a legitimate seam
owner"* (authority to stamp). Conflating them reproduces, one level up, the exact `actor ≠ principal`
authority-blindness that ADR-0010 ① closed at the act level (ADR-0011:137-141; critic Form β).

The journal is append-only (ADR-0008). Per ADR-0011:134-135 a field can be reserved cheaply now but is
**retrofit-impossible** to add after acts are journaled: a later auditor could never separate pre-G4
stamps (no seam authority recorded) from post-G4 ones. Reserving the shape is the one move with a hard
deadline — every day of accumulated history makes it more expensive. P-3 (ADR-0011:251) requires exactly
this reservation, and only this, as its enforcement precondition. It is decision 3 of the M5 synthesis
(`04-SYNTHESIS §3, §6.3`), owner-flagged 🟨 «нужен строй».

## 2. Goals / Non-goals

**Goals**
- G-1. Reserve a `seamAuthority` field on the principal seam **additively**: 0 migrations, `write(act): Ack`
  signature untouched, the `Act.principal?` envelope idiom preserved.
- G-2. Make a future resolver STRUCTURALLY unable to forget G4 (required on the zero-implementation
  interface where a required field costs nothing today).
- G-3. Keep the form A/B-neutral: an ISO-2 (trusted-channel) resolver and a future ISO-3 (attested-token)
  resolver populate the SAME opaque string field, no verification mechanism presupposed.
- G-4. Record the honest limit in-code (doc-comment) so the field is never later mistaken for a trust
  guarantee.

**Non-goals**
- N-1. NOT enforcement. No PEP reads `seamAuthority`; the write path (`engine.ts:84-126`) is untouched.
- N-2. NOT the root of trust. This spec does not name the out-of-band anchor that certifies `seamAuthority`
  — that is decision 4 / mechanism D (`04-SYNTHESIS §2`), a separate owner decision.
- N-3. NOT P-2. The gateway-dup idempotency gap is orthogonal and stays open.
- N-4. NOT the propagation mechanism (host-stamped IPC envelope, B) and NOT the capability gate (D). Those
  are M5-implementation behavior, deferred.

## 3. The EXACT additive shape

Deliberate asymmetry — **required on the interface that has no implementations, optional on the type that
sits on already-shipped acts.** Both are additive; the asymmetry is what makes G4 un-forgettable without
forcing a migration.

### 3.1 `packages/engine/src/ports/principal-resolver.ts` — `AuthenticatedPrincipal` (currently :30-37): ADD a **REQUIRED** field

```ts
export interface AuthenticatedPrincipal {
  subject: SubjectRef;
  trust: PrincipalTrust;
  issuer: string;
  /**
   * G4 (ADR-0011:123-145) — issuer-OF-THE-issuer: WHO authorized THIS host to be a stamper at all.
   * Distinct from `issuer` (who vouched for THIS principal = attribution of the stamp act);
   * `seamAuthority` = "under what registration/policy this host process is itself a legitimate seam
   * owner" (authority to stamp, not attribution of a stamp). Conflating the two reproduces the
   * actor≠principal hole ADR-0010 closed, one level up (ADR-0011:137-141).
   * REQUIRED (not optional): this interface has ZERO implementations today (paper-freeze) — the one
   * moment a required field costs nothing (no implementer to break) and forecloses G4 being silently
   * forgotten by whichever PR first implements the resolver (retrofit-impossible after acts journal,
   * ADR-0011:134-135). A real resolver MUST derive this from an external anchor it does NOT itself
   * write (capability grant / engine-side host registry) — never self-declare it. That anchor is
   * BEHAVIOR, deferred to M5-impl / ADR-0010 Decision ③ / M5-synthesis decision 4.
   */
  seamAuthority: string;
}
```

### 3.2 `packages/engine/src/core/types.ts` — `PrincipalAssurance` (currently :231-247): ADD an **OPTIONAL** field

Placed alongside `issuer?` (:236-240), same additive idiom.

```ts
export interface PrincipalAssurance {
  whoActed?: PrincipalTrust;
  underWhoseAuthority?: PrincipalTrust;
  issuer?: string;
  /**
   * G4 (ADR-0011:123-145) — issuer-of-the-issuer, carried onto the journaled act by
   * PrincipalStamper.stamp() from AuthenticatedPrincipal.seamAuthority. OPTIONAL/additive like
   * `issuer` (Decision ②): an existing Act with no `principal`, or a `principal` with no
   * `seamAuthority`, still typechecks — 0 migrations, `write(act): Ack` untouched. Absence MUST be
   * read as "no seam authority vouched for this stamp" and NEVER treated as equivalent to a populated
   * value by any future PEP/gate — mirrors G3's no-default-rise rule one axis up (trust →
   * seam-legitimacy). P-3 (ADR-0011:251) is satisfied by this field's PRESENCE in the reserved form;
   * it does NOT by itself satisfy G4's trustworthiness intent (see resolver's seamAuthority doc).
   */
  seamAuthority?: string;
  delegation?: unknown[];
}
```

### 3.3 `packages/engine/src/ports/principal-stamper.ts` — `stamp()` doc-comment (currently :42-47): ADD one clause, NO signature change

Append to the `stamp()` doc-comment (the `PrincipalStamper` interface and `PrincipalStampResult` union at
:37-48 stay byte-identical):

> *On success, the re-stamped `principal.*` MUST carry `seamAuthority` copied verbatim from the
> `AuthenticatedPrincipal` argument (G4) — the stamper does not invent, default, or omit it. A resolver
> that cannot supply `seamAuthority` cannot legitimately call `stamp()` at all, by construction of
> `AuthenticatedPrincipal.seamAuthority` being required.*

**Nothing else changes.** No new import, no new type, no change to `resolveWritePrincipal`'s signature
(`principal-resolver.ts:48`), no change to `PrincipalStamper.stamp`'s signature (`principal-stamper.ts:47`),
no change to `write(act): Ack` (`engine.ts:73`), no touch to the PEP (`engine.ts:84-126`).

## 4. Proof-sketch — invariant intact, ports intact, 0 migrations, additive-only

1. **`write(act): Ack` invariant intact.** `seamAuthority` lives INSIDE the already-reserved
   `Act.principal?: PrincipalAssurance` envelope (`types.ts:279`), not as a new `write()` parameter. The
   frozen signature (`engine.ts:73`, `ports/engine-client.ts`) is not opened. The write-PEP
   (`engine.ts:84-126`) reads `finalized.actor` and grants only — it never references `principal.*`, so
   adding a sibling optional field to `PrincipalAssurance` cannot alter any admission verdict. Behavior is
   provably unchanged (N-1).

2. **0 migrations.** `PrincipalAssurance.seamAuthority` is optional (`?`), identical idiom to the existing
   `issuer?` (:240). Every already-typechecking value stays valid: an `Act` with no `principal` (the common
   case — `Act.principal?` is optional at :279), and a `principal` object with no `seamAuthority`, both
   still compile. Ground truth: there are **zero journaled acts carrying a populated `principal`** (form ②
   is paper-freeze, nothing populates it — `types.ts:220-221`; caller-reality Finding 3), so there is no
   row to backfill. 0 migrations is not a hope; it is entailed by optionality + an empty population set.

3. **Frozen port signatures intact.** `resolveWritePrincipal(boundaryIdentity: string):
   AuthenticatedPrincipal` (:48) and `stamp(incoming, principal): PrincipalStampResult` (:47) keep their
   exact parameter and return types. `AuthenticatedPrincipal` gains a required member — this is a
   structural change to the interface, but it breaks **no production code** because the interface has zero
   *production* implementations and zero *production* call sites (paper-freeze header, :1-8; caller-reality:
   0 call sites into `packages/engine` from `agents-manager`). It breaks exactly **one** existing construction
   site: the type-fixture literal at `packages/engine/test/principal-seam.test.ts:23-30` (confirmed by
   reality-anchor `05b-seamAuthority-reality-anchors.analysis.md:146`), which constructs an
   `AuthenticatedPrincipal` for a compile-only shape assertion and will need one line
   (`seamAuthority: '…'`) added. That is the correct, priced-in cost of making the field required on an
   interface with zero implementations — it is the one moment a required field is nearly free (one fixture
   line), which is exactly why "required now" is the cheapest option and the last moment it is this cheap
   (G-2).

4. **Additive-only / A-B neutral.** `seamAuthority` is an opaque `string`. An ISO-2 resolver may populate
   it from a static engine-side host-registry id; a future ISO-3 resolver may populate it from a cert
   `kid`. Same field, no verification mechanism baked into the type (G-3). Adding it does not preselect
   topology (decision 5) or root-of-trust (decision 4).

## 5. Acceptance criteria

- **AC-1 (the key criterion — additive, 0 migration, compile-clean).** After the patch, `tsc` is clean and
  the full suite is green at **187/187** (the frozen M5 baseline, ADR-0010 Ratification 2026-08-12) with
  **exactly +1 fixture line updated and zero other test files edited** — the `AuthenticatedPrincipal`
  literal at `packages/engine/test/principal-seam.test.ts:23-30` gains a `seamAuthority` value (the sole
  construction site of this type, per reality-anchor `05b-seamAuthority-reality-anchors.analysis.md:146`),
  and no other test file changes. *(Corrected 2026-08-12: the original "zero test files edited" wording
  was written before reality-anchor 05b checked the one existing fixture that constructs this type; keeping
  `seamAuthority` REQUIRED — not making it optional — is the deliberate choice, since G-2's whole point is a
  required field on a zero-implementation interface, so the AC is corrected to match reality rather than the
  design weakened to match the AC.)* This still proves the addition broke no *production* type or behavior
  and required no migration on `Act`/`PrincipalAssurance`/the write path (AC-4).
- **AC-2 (required-field enforcement compiles).** A type-level fixture that constructs an
  `AuthenticatedPrincipal` WITHOUT `seamAuthority` fails to compile; WITH it, compiles. (Confirms G-2: a
  future resolver cannot silently omit G4.)
- **AC-3 (optional-on-the-act additivity).** A type-level fixture: an `Act` with `principal: { whoActed:
  'unverified' }` (no `seamAuthority`) still typechecks, AND an `Act` with no `principal` at all still
  typechecks. (Confirms 0 migrations.)
- **AC-4 (frozen surfaces untouched — diff assertion).** The patch diff touches ONLY the three named
  production files plus the one fixture line in `principal-seam.test.ts:23-30` (AC-1); `engine.ts`,
  `engine-client.ts`, and the `write`/PEP/idempotency logic show **no diff**. Signatures of
  `resolveWritePrincipal` and `stamp` unchanged.
- **AC-5 (honest-limit recorded).** Both doc-comments (resolver required-field, assurance optional-field)
  state that reservation ≠ trustworthiness and point to the deferred anchor (decision 4). Reviewer confirms
  presence.
- **AC-6 (independent reviewer PASS).** Same bar as form ② landed under (ADR-0010: "independent reviewer
  PASS").

## 6. Verification plan

Add ONE test file (type-level, no runtime behavior to exercise — the fields are inert):
`packages/engine/test/principal-seam-reservation.spec.ts` (or the repo's existing test-dir convention).

It asserts, via `tsc`/`expectTypeOf`-style compile checks and trivial runtime construction:

| # | Test | Asserts | Maps to |
|---|------|---------|---------|
| V-1 | `AuthenticatedPrincipal` requires `seamAuthority` | object literal missing the field is a type error; present compiles | AC-2, G-2 |
| V-2 | `PrincipalAssurance.seamAuthority` optional | `{ whoActed: 'unverified' }` (no seamAuthority) typechecks | AC-3, G-1 |
| V-3 | `Act` with no `principal` still valid | bare `Act` (no principal) typechecks | AC-3 (0-migration) |
| V-4 | round-trip carry | a value shaped `{ subject, trust, issuer, seamAuthority: 'host:registry/xyz' }` assigns to `AuthenticatedPrincipal`; its `seamAuthority` string assigns to `PrincipalAssurance.seamAuthority` | AC-1, doc-contract in §3.3 |

Plus the existing suite run: **187/187 green, `tsc` clean, exactly +1 fixture line changed in
`principal-seam.test.ts` (the `seamAuthority` value on the existing literal, :23-30) and no other test file
edited** (AC-1), and a diff-scope check that only the three named production files plus that one fixture
line changed (AC-4). No behavioral/enforcement test is added — there is no behavior to verify; adding an
enforcement test now would presuppose an authenticated source that does not exist (would be the theatre
G3/DEFER-build forbids).

Note: the ADR-0010 enforcement-gate tests (`forge-actor`/`forge-grant`/`forge-policy`, ADR-0010 §Validation
:177-187) stay RED-by-design and are NOT touched by this spec — this is form reservation, not enforcement.

## 7. Honest limit (7-values: Доверие / Тождество)

**Reserving `seamAuthority` does NOT make it trustworthy.** The field is **inert metadata** until decision
4 names an out-of-band root that certifies it. The type system can guarantee the field EXISTS and is
CARRIED; it cannot guarantee the value came from outside the process asserting it. Without an external
anchor (a capability grant or an engine-side host registry the stamping process cannot itself write —
mechanism D, `04-SYNTHESIS §2`, `02-propagation Q1-D`), a real resolver could still self-declare
`seamAuthority` as any string — the identical `actor≠principal` self-attestation bug ADR-0010 closed,
recurring one level up (Доверие: a self-signed seam is not a trusted seam). Also unresolved: T5 (a
gateway-writable `config.json` must NEVER be a `seamAuthority` source) and P-2 (dup) — both stay open,
untouched by this patch. This spec closes the **RESERVATION half** (retrofit-impossible, hence do it now);
it explicitly does NOT close the **ANCHOR half** (behavior, correctly deferred). Until the root is named,
every stamp must honestly read as **"seam authority not vouched"** (Тождество: the record must not claim a
legitimacy it has not earned) — mirroring ADR-0010's own honest-limit paragraph (Ratification 2026-08-12).

## Verified caveat 2026-08-12 — build-graph contingency

A hostile verifier re-ran the 0-migration claim adversarially and it **SURVIVES** — but flagged one
residual that must be folded into the verification plan before «строй». The finding does NOT weaken the
design; it hardens the AC so the guarantee stops being contingent and becomes structurally checked.

**(1) 0-migration VERIFIED SURVIVES.** The adversarial pass confirms §4's proof holds against a live
tree: `PrincipalAssurance.seamAuthority` is optional, `Act.principal?` is optional, the populated-`principal`
set is empty (nothing journals it — paper-freeze), so there is no row to backfill and the frozen
`write(act): Ack` / PEP path shows no diff. The frozen M5 baseline is confirmed **live at 187/187** (with
the one priced-in fixture line at `principal-seam.test.ts:23-30`, per AC-1). `seamAuthority` stays
**REQUIRED** on `AuthenticatedPrincipal` — the earlier coherence resolution (§5 AC-1 correction note, G-2)
is unchanged; this caveat does not reopen the required-vs-optional decision.

**(2) The dist/ contingency (residual, not a defect in the shape).** `packages/engine/package.json`
publishes `"types": "./dist/index.d.ts"`, and downstream workspace packages resolve `@ff/engine` types
through `node_modules/@ff/engine` → the **gitignored `dist/` build**, not `src/` directly. Consequence: a
full-repo typecheck reflects the `seamAuthority` change only **after `npm run build -w @ff/engine`**; a
stale `dist/` masks it. Therefore the "breaks nothing downstream / 0-migration" guarantee is currently TRUE
only because **zero downstream packages construct `AuthenticatedPrincipal` / `PrincipalAssurance`** — it is
a *contingent fact* about today's call-graph, **NOT structurally enforced by the build graph**. If a future
package ever constructs `AuthenticatedPrincipal`, making `seamAuthority` REQUIRED could break that package,
and a stale `dist/` could hide the break from CI until a rebuild happens.

**(3) Guard added to the verification plan.** Two enforcements are added to §6 / the AC to convert the
contingency into a checked invariant:

- **G-R1 — rebuild-before-typecheck (AC amendment).** The downstream/full-repo typecheck in AC-1/AC-4 MUST
  be preceded by `npm run build -w @ff/engine` (regenerate `dist/index.d.ts`) so the typecheck observes the
  real `seamAuthority` change and no stale `dist/` masks a downstream break. Add this as an explicit ordered
  step to the AC-1 command sequence: **build `@ff/engine` → then `tsc` across workspaces → then suite.** A
  typecheck run against an un-rebuilt `dist/` is not a valid AC-1 pass.
- **G-R2 — construction-site tripwire (new verification row, maps to G-2/AC-2).** Add a grep-guard /
  tripwire test that **fails if a new construction site of `AuthenticatedPrincipal` appears without
  `seamAuthority`** — i.e. enumerate object-literal / cast construction sites of `AuthenticatedPrincipal`
  across the repo (currently exactly one: `principal-seam.test.ts:23-30`) and assert each carries a
  `seamAuthority` key. This makes G-2 ("a future resolver cannot silently forget G4") enforced by the build
  rather than trusted, and turns the *contingent* 0-break fact into a *checked* one: the moment a second
  construction site appears, the guard forces it to supply `seamAuthority` (or fail CI), closing the
  stale-`dist/`-masking window. Suggested home: extend `principal-seam-reservation.spec.ts` (§6) with a
  V-5 row, or a lightweight `tools/lint/`-style grep-guard if the repo prefers static checks over test-time.

Net: the shape and the REQUIRED decision are unchanged; the verification plan gains a rebuild step (G-R1)
and a construction-site tripwire (G-R2) so "0-migration / breaks nothing downstream" is enforced by the
build graph instead of resting on a contingent call-graph fact.
