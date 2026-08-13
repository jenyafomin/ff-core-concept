---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: analyst (deep decomposition — PROPAGATION mechanism + G4 form-gap closure)
scope: M5 surface-identity, Stage 2 (builds on Stage-1 census; does not reopen its grains)
inputs:
  - ../census/01-boundary-map.design.md            # 21-grain census; grain #8 (propagation, 🟥), grain #10 (seamAuthority, 🟥)
  - ../census/02-caller-reality.analysis.md         # ground truth: 100% in-process, zero authenticated source anywhere
  - ../census/03-threat-and-values.critic.md        # T1 CRITICAL (G4 absent from frozen ports), T2 (theatre if wired to buggy gateway), T3 (forge-boundary-identity untested), T5 (self-elevation landmine)
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md   # G4 (:123-145), P-1..P-4 (:244-252), A/C-now-B-later split (:79-114)
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # invariant ①, form ②, G1/G3
  - ../../../../../../../../packages/engine/src/core/types.ts        # PrincipalAssurance (:231-247), Act.principal (:274-279)
  - ../../../../../../../../packages/engine/src/ports/principal-resolver.ts  # AuthenticatedPrincipal (:30-37), frozen resolver
  - ../../../../../../../../packages/engine/src/ports/principal-stamper.ts   # frozen stamper, G1 drop-and-re-stamp
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/src/channel-telegram/auth/owner-allowlist.ts   # real ingress auth today
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/src/channel-telegram/conversation-id.util.ts   # chat:thread addressing
phase: DESIGN — mechanism + form-patch specification, NO code landed, NO engine files touched
---

# Propagation mechanism + G4 form-gap patch — M5 surface-identity, Stage 2

> Builds directly on Stage 1's census (21 grains) and critic pass (T1-T7). Does not re-litigate what those
> already closed (green cluster = form-only; F1-F9 from the prior values/threat pass taken as given). Two
> questions only: (1) what should CARRY authenticated identity across the ingress→stamp gap (grain #8), and
> (2) can the missing `seamAuthority` field (grain #10 / T1 CRITICAL / P-3) be closed by an additive type
> patch alone.

---

## Q1 — Propagation mechanism across the ingress→stamp gap

### Ground truth that constrains the answer
- **Grain #8 (spine hole, boundary-map:89,143-151):** identity is proven at gateway ingress
  (`OwnerAllowlist.isOwner(from.id)` — real, running, deny-all-default, verified at
  `agents-manager/src/channel-telegram/auth/owner-allowlist.ts:7-39`) but must be stamped at engine-write
  (`resolveWritePrincipal(boundaryIdentity)`, `principal-resolver.ts:48`). Nothing today connects the two —
  confirmed by grep (caller-reality:53-56, boundary-map:52-56): zero call sites from `agents-manager` into
  `packages/engine`.
- **ADR-0011 already named the mechanism CLASS, not the wire format:** "хост-процесс = ВЛАДЕЛЕЦ ШВА: он
  аутентифицирует сессию/канал и ШТАМПУЕТ принципала на пересечении IPC (drop-and-re-stamp тела акта)"
  (ADR-0011:86-89). The alternatives table is explicit that under ISO-2 only **A** (host-stamp-is-real) and
  **C** (capability handle) are in scope now; **B** (cryptographic attestation) is a deferred THRESHOLD for
  privileged/cross-host namespaces, not required for the local gateway↔engine seam (ADR-0011:79,114:
  "B остаётся отложенным как ПОРОГ. B нужен не для локальной IPC-границы...").
- **`AuthenticatedPrincipal{subject, trust, issuer}`** (`principal-resolver.ts:30-37`) is the target shape
  any mechanism must fill. `trust: PrincipalTrust = 'unverified' | 'channel' | 'attested'` (`types.ts:215`)
  already encodes the A-vs-B split in its own vocabulary: `'channel'` = what a trusted host-stamp produces,
  `'attested'` = what a cryptographic token would produce.

### Evaluated per the four named options

**A — Signed token (bearer token/JWT signed by a gateway key, verified by the engine host).**
- Forgeability: strong against outsiders (requires the private key) — but this is exactly the `'attested'`
  tier ADR-0011 defers to ISO-3/"B" (`:114`). It is a mismatch of effort to the boundary actually being
  built now.
- Retrofit-asymmetry: low if deferred (no journaled acts reference tokens yet), but real infra cost
  (signing key, rotation, verifier component — none of which exist, ADR-0011:81 "ключи/ротация/issuer-инфра"
  is priced as the ISO-3 cost line, not ISO-2's).
- P-2 dependency: **orthogonal, does not help.** A duplicated Telegram turn (the live gateway-dup bug) would
  produce two independently, validly *signed* tokens for what should be one logical act — signing proves
  the token wasn't forged by an outsider, it says nothing about whether the *host itself* fired twice.
  Signing cannot substitute for idempotency.
- Verdict: **premature for M5/ISO-2.** Matches ADR-0011's own sequencing (A/C now, B later) — building this
  now would be scope creep past the boundary decision already made, not a form-gap fix.

**B — IPC-envelope field (host stamps `{subject, trust:'channel', issuer}` onto the message as it crosses
the boundary, i.e. exactly what ADR-0011 already specifies as "штампует принципала на пересечении IPC").**
- Forgeability: the isolated/untrusted side (agent process, worker) never gets to set this field — it is
  attached by the trusted host AFTER real ingress authentication, on the trusted side of the crossing. The
  untrusted side can only supply `act.actor` in the body, which `PrincipalStamper.stamp()` drops-and-re-
  stamps (G1, `principal-stamper.ts:13-19`). This is the mechanism that makes A≡C "REAL, not theatre" per
  ADR-0011:110.
- Retrofit-asymmetry: **this is the load-bearing risk.** If the field is populated and journaled NOW, before
  P-2 (gateway-dup) is verified-fixed, a duplicated turn produces two independently "legitimate" stamps for
  one logical act — permanent, unrecoverable poisoning of an append-only journal (critic T2, verbatim: "the
  act of journaling `principal.issuer:'agents-manager'`... sourced from a channel known to double-fire, IS
  the retrofit-honesty violation ADR-0010 exists to prevent"). This is why the mechanism being *correct in
  shape* does not mean it is *safe to wire today* — the risk is in the ENFORCEMENT timing, not the mechanism
  itself.
- Compatibility: exact fit — this IS what `AuthenticatedPrincipal`/`PrincipalAssurance` were shaped for.
  `trust:'channel'`, `issuer:'gateway:agents-manager'` (or a more specific host-instance id).
- Verdict: **the correct data carrier**, but its SAFE ACTIVATION is gated behind P-2 exactly as ADR-0011
  already states (P-2, `:246-250`). Reserving the shape now (this file's Q2) is safe; wiring `stamp()` to
  actually populate it from the current gateway is not, until P-2 is green.

**C — Issuer-of-issuer chain (a recorded "who authorized this host to be a stamper" fact).**
- This is **not a competing transport** — it does not answer "how does subject-identity data cross the
  wire" (that's B's job). It answers a different question: "is the process doing the stamping itself
  legitimate." Framing it as an alternative to B is a category error; it is a field that must ride ALONGSIDE
  whichever carrier is chosen (B today), corresponding exactly to the missing `seamAuthority` (G4, grain
  #10, T1 CRITICAL) — see Q2 below.
- Forgeability: **on its own, none** — a self-declared `seamAuthority` string, written by the same host it
  describes, is exactly as trustworthy as the identity it's meant to protect (critic Form β, `03:66-72`:
  "the identical class of bug ADR-0010 closed at the act level... recurring one level up, at the seam
  level"). To be non-theatrical it needs an external ANCHOR outside the stamping host's own write access —
  e.g., a static registry of legitimate seam-owner ids maintained on the ENGINE side, not the gateway side
  (this also directly forecloses critic T5's self-elevation landmine: `.gateway/conversations/*/config.json`
  is gateway-writable, so `seamAuthority` must never be sourced from anything the resolved unit can itself
  edit).
- Retrofit-asymmetry: **the decisive factor for Q2** — ADR-0011 states it explicitly: "резерв поля
  ретрофит-дёшев, добавить его ПОСЛЕ того, как акты зажурналированы — невозможно" (`:134-135`). This is why
  the field must be reserved in the TYPE now even though the anchor mechanism (what makes it trustworthy) is
  correctly deferred to enforcement/M5-implementation.

**D — Capability (an unforgeable handle; possession of the handle IS the authorization to call
`resolveWritePrincipal`/`stamp` at all).**
- This is ADR-0011's own "C" leg (`:79`, "C = handle-через-IPC = настоящий ocap"), already named as real
  and in-scope for ISO-2 (unlike B). It answers "which PROCESSES may reach the stamp seam at all" — a
  coarse, process-level gate, not a per-turn subject signal.
- Retrofit-asymmetry: **none** — capabilities are a runtime access-control primitive, never journaled per
  act, so they can be introduced, revoked, or restructured at any time without touching the append-only
  log. This is a genuinely low-risk, defer-friendly piece (can be built at M5-implementation time, not now).
- Compatibility: doesn't populate `AuthenticatedPrincipal`'s fields directly — it sits underneath, gating
  *whether* a host may call the seam at all. It is the natural enforcement-time ANCHOR for `seamAuthority`
  (C): the engine issues the write-capability only to configured host identities, and `seamAuthority` records
  which grant produced this particular stamp — capability-possession is what makes the `seamAuthority` string
  non-self-declared, closing the gap Form β/T1 names.

### Answer — best mechanism, and its dependency chain
**No single option wins alone; B (host-stamped IPC-envelope field) is the correct DATA carrier, gated by D
(capability-restricted call path) as the ACCESS primitive, carrying C (`seamAuthority`) as its own audit
field, anchored by D's grant rather than self-declared.** A (signed/attested token) is explicitly
out-of-scope for ISO-2 — deferred to ISO-3 per ADR-0011's own A/C-now-B-later split, and does not address
P-2 idempotency regardless.

- **B is correct in shape, unsafe to activate before P-2 is verified-fixed** (unchanged from critic T2 —
  this analysis confirms rather than revises that finding).
- **D is low-risk, retrofit-neutral, and correctly deferrable to M5-implementation** (does not need to be
  decided in this design pass).
- **C (`seamAuthority`) is the one piece with retrofit-asymmetry sharp enough to require action NOW, at the
  form layer** — which is exactly Q2.

---

## Q2 — Can the G4 form-gap (`seamAuthority` absent) be closed additively?

### The gap, precisely (confirmed by direct read, not just census)
- `AuthenticatedPrincipal` (`packages/engine/src/ports/principal-resolver.ts:30-37`) has exactly
  `{ subject: SubjectRef; trust: PrincipalTrust; issuer: string }` — no seam-authority field.
- `PrincipalAssurance` (`packages/engine/src/core/types.ts:231-247`) has
  `{ whoActed?, underWhoseAuthority?, issuer?, delegation? }` — no seam-authority field.
- Neither `principal-resolver.ts` nor `principal-stamper.ts` doc-comments cite G4 anywhere (both cite G1/G3
  only) — confirmed by direct read of both files in full above; matches critic T1 verbatim.
- ADR-0011 G4 (`:131-135`) is unambiguous about what's required at THIS layer: "Форма Resolver/Stamper на
  M5 ОБЯЗАНА зарезервировать поле-аналог `seamAuthority`/`policy_source`... ДО того, как приземлится любой
  код. Enforcement НИКОГДА не вправе считать «хост вызвал stamp()» достаточной авторизацией. Ноль поведения
  сейчас; резерв поля ретрофит-дёшев." P-3 (`:251`) requires exactly this reservation, nothing more, as its
  enforcement precondition.

### Answer: YES for the reservation obligation (P-3) — additive, 0-migration. NOT sufficient for G4's full intent — that remains correctly deferred.

Two separate claims, and it matters not to conflate them (this is the same distinction critic Form β draws):
1. **"Is the field reserved so a later auditor can tell pre-G4 acts from post-G4 acts?"** — YES, closable
   additively, right now, at zero cost. This is all P-3 asks for.
2. **"Does reserving the field make `seamAuthority` itself unforgeable/trustworthy?"** — NO, and no type
   patch can make it so. That requires an external anchor (capability grant, D above) which is BEHAVIOR,
   correctly deferred to M5-implementation/Decision ③. Saying otherwise would be exactly the theatre this
   project's own definition rejects (critic §2).

### The patch (design only — signatures below, not applied to any file)

**1. `packages/engine/src/ports/principal-resolver.ts` — `AuthenticatedPrincipal`, new field REQUIRED:**

```ts
export interface AuthenticatedPrincipal {
  /** Resolved "who" — e.g. `user:jenya` / `agent:ff-personal`. */
  subject: SubjectRef;
  /** How strongly the seam owner vouched — never defaulted upward (G3). */
  trust: PrincipalTrust;
  /** WHO vouched — the trusting channel/issuer id. Retrofit-impossible audit fact. */
  issuer: string;
  /**
   * G4 (ADR-0011:123-145) — issuer-of-the-issuer: WHO authorized THIS host to be a stamper at
   * all. Distinct from `issuer` (who vouched for THIS principal — attribution of the stamp act);
   * `seamAuthority` answers "under what registration/policy is this host process itself a
   * legitimate seam owner" (authority to stamp, not attribution of a stamp). Conflating the two
   * reproduces the actor≠principal hole ADR-0010 closed, one level up (ADR-0011:137-141).
   * REQUIRED (not optional): `AuthenticatedPrincipal` has zero implementations today (paper-
   * freeze, `principal-resolver.ts` header) — this is the one moment a required field costs
   * nothing (no implementer to break) and forecloses G4 being silently forgotten later, per
   * ADR-0011's own retrofit-impossibility argument (:134-135). A real resolver MUST derive this
   * from an external anchor it does not itself write (e.g. a capability grant / engine-side host
   * registry) — never self-declare it — but that anchor mechanism is BEHAVIOR, deferred to
   * M5-implementation, not fixed by this form.
   */
  seamAuthority: string;
}
```

**2. `packages/engine/src/core/types.ts` — `PrincipalAssurance`, new field OPTIONAL (matches existing
additive idiom for `issuer?`/`delegation?`):**

```ts
export interface PrincipalAssurance {
  whoActed?: PrincipalTrust;
  underWhoseAuthority?: PrincipalTrust;
  issuer?: string;
  /**
   * G4 (ADR-0011:123-145) — issuer-of-the-issuer, carried onto the journaled act by
   * `PrincipalStamper.stamp()` from `AuthenticatedPrincipal.seamAuthority`. Optional/additive
   * like `issuer` (Decision ②): an existing `Act` with no `principal`, or a `principal` with no
   * `seamAuthority`, still typechecks — 0 migrations, `write(act): Ack` signature untouched.
   * Absence MUST be read as "no seam authority vouched for this stamp" and must NEVER be treated
   * as equivalent to a populated value by any future PEP/gate — mirrors G3's no-default-rise rule
   * one layer up (trust axis → seam-legitimacy axis). P-3 (ADR-0011:251) is satisfied by this
   * field's presence in the reserved form; it does NOT by itself satisfy G4's trustworthiness
   * intent (see `principal-resolver.ts`'s `seamAuthority` doc-comment).
   */
  seamAuthority?: string;
  delegation?: unknown[];
}
```

**3. `packages/engine/src/ports/principal-stamper.ts` — doc-comment addition only (still paper-freeze, no
behavior change to the signature or `PrincipalStampResult`):**

Add to the `stamp()` doc-comment: *"On success, re-stamped `principal.*` MUST carry `seamAuthority` copied
verbatim from the `AuthenticatedPrincipal` argument (G4) — the stamper does not invent, default, or omit
it; a resolver that cannot supply `seamAuthority` cannot legitimately call `stamp()` at all, by construction
of (1)'s required field."*

### Additivity checklist (against the task's own bar)
- **0 migrations:** yes — `PrincipalAssurance.seamAuthority` is optional, same idiom as `issuer?`; no
  existing journaled `Act` (there are zero, per caller-reality Finding 3) needs backfilling.
- **`write(act): Ack` signature intact:** yes — untouched; the field lives inside the already-reserved
  `Act.principal?: PrincipalAssurance` envelope (`types.ts:274-279`), not a new parameter.
- **A/B-neutral:** yes — `seamAuthority` is an opaque string identifier; an ISO-2 (A) implementation can
  populate it from a static host-registry id, a future ISO-3 (B) implementation can populate it from a
  cert/kid — same field, no verification mechanism presupposed.
- **`AuthenticatedPrincipal.seamAuthority` required, not optional — deliberate asymmetry, not an
  inconsistency:** justified because this interface has zero implementations to break today; requiring it
  now is strictly cheaper than the alternative (leave it optional, risk it being forgotten by whichever
  future PR first implements the resolver, discovered only after acts are already journaled — exactly the
  retrofit-impossible failure ADR-0011:134-135 warns about).

### What this patch does NOT close (name honestly, per task instruction)
- **Does not make `seamAuthority` unforgeable.** Without an external anchor (a capability grant or
  engine-side host registry the stamping process cannot itself write — see Q1, mechanism D), a real
  resolver could still self-declare `seamAuthority` as any string it likes. The type system cannot enforce
  "this value came from outside the process that's asserting it" — that's an enforcement/architecture
  concern for M5-implementation, not a form patch. Flagging this now (as this file does) is itself the
  mitigation available at design time — the risk was already correctly identified by critic T1/Form β; this
  patch closes the RESERVATION half, not the ANCHOR half.
- **Does not touch P-2.** `seamAuthority` answers "is this host a legitimate stamper," not "did this host
  fire once." The gateway-dup idempotency gap (grain #13, P-2) is untouched by this patch and remains its
  own, separate, currently-open blocker.
- **Does not resolve T3/T5** (forge-boundary-identity untested; gateway-writable config as a potential
  self-elevation input) — both remain open items for whoever designs the enforcement/anchor mechanism next.

---

## Summary for handoff
- **P-3 (ADR-0011:251) can be satisfied by this patch alone, additively, today, at zero migration cost** —
  it is purely a type-form addition to two files (`types.ts`, `principal-resolver.ts`) plus one doc-comment
  update (`principal-stamper.ts`). Nothing else needs to change for P-3 specifically to go green.
- **G4's full intent (an actually-legitimate, non-self-declared seam authority) is NOT closed by this or any
  type-only patch** — it requires an enforcement-time anchor (mechanism D, capability-gated stamping),
  correctly left to M5-implementation/Decision ③, not invented here.
- **The propagation mechanism for M5 should be a host-stamped IPC-envelope field (B), gated by a
  capability-restricted call path (D)** — not a signed/attested token (A, premature — ADR-0011 defers this
  to ISO-3), and not an unanchored `seamAuthority` self-declaration alone (C without D is theatre, per
  critic Form β).
