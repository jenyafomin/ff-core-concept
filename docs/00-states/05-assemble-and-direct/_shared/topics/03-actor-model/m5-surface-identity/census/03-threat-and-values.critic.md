---
type: critic
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: critic (adversarial red-team — threats + 7-values audit of candidate M5 forms)
title: "CRITIC — M5 surface-identity resolution под границей ISO-2: угрозы + 7 ценностей"
scope: M5 (surface-identity resolution, ADR-0011 §prerequisite for ADR-0010 Decision ③) — packages/engine seam ports, branch refactor-tree
targets:
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
verified-against:
  - packages/engine/src/core/types.ts:207-282   # PrincipalAssurance — NO seamAuthority field
  - packages/engine/src/ports/principal-resolver.ts   # paper-freeze, cites G3, does NOT cite/reserve G4
  - packages/engine/src/ports/principal-stamper.ts    # paper-freeze, cites G1/G3, does NOT cite/reserve G4
  - docs/01-organization/process/bugs/gateway-dup/INDEX.md  # Status: active, no fix evidence, stale since 2026-07-06
  - docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/design/03-values-and-threat.critic.md  # prior pass, TAKEN AS GIVEN, not re-litigated
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/CLAUDE.md  # gateway cascade: agent may self-edit PROMPT.md/config.json
not-repeating: F1-F9 from 03-values-and-threat.critic.md (isolation blind spot, false-confidence, sovereignty
  centralization, identity re-clobber, consent-bleed, legibility gap, cascade risk, B side-channel) are TAKEN
  AS GIVEN — most are now partially addressed by ADR-0011 (F1) and the frozen ports (F2/identity-clobber via
  G1-refuse). This file attacks what is NEW or STILL OPEN once M5 is framed concretely under ISO-2.
---

# Critic — M5 surface-identity resolution against threats + the 7 values

> Not proposing M5's shape. Attacking candidate forms as they would concretely land under the now-decided
> ISO-2 boundary (ADR-0011), and checking whether "the boundary is decided" quietly gets read as "the
> boundary is trustworthy" — those are different claims and only the first is currently true.

## 0. What changed since the last critic pass, and what didn't

ADR-0011 answered F1 (isolation blind spot) at the *model* level: ISO-2 is a real process/IPC boundary, not
theatre-by-definition. That closes one hole. It does **not** close three others that matter more once M5 is
concrete: (a) the *specific* first ISO-2 instance (agents-manager gateway) is documented, in-repo, as
**unreliable** (dup/restart) and **agent-writable** (the agent can edit its own gateway config); (b) the
governance guardrail ADR-0011 itself invented for exactly this problem (G4/`seamAuthority`) is **not yet in
the frozen ports it was supposed to gate**; (c) the adversarial gate suite still only tests forgery *inside*
the act body, never forgery of the *identity source* the resolver reads from. All three are below.

---

## 1. Per-candidate-form surviving exploit

### Form α — Resolver reads gateway-supplied `chat_id`/`thread_id` directly (the obvious M5 shape)
**Surviving exploit: the channel that would be trusted is the one channel already known, in this repo, to
double-stamp and drop.** `docs/01-organization/process/bugs/gateway-dup/INDEX.md` — Status **active**, dated
2026-07-06, no fix landed, no verification artifact anywhere I could find as of 2026-08-12. ADR-0011 P-2 says
this in writing: *"Двойной/потерянный штамп на append-only журнал = ровно то перманентное отравление, о
котором предупреждает ADR"* (`ADR-0011:246-250`). A resolver wired to this channel today, even *only*
implemented (not enforcement-flipped), would stamp `trust:'channel'` + `issuer:'gateway:agents-manager'` on
acts produced by a process that is documented to sometimes run the same logical turn twice. That is not a
hypothetical concurrency edge case — it is the repo's own open bug ticket, unfixed, un-linked from any of the
M5/ADR-0011 artifacts I found. **Theatre, not a boundary, until this specific bug has a verified fix.**

### Form β — `seamAuthority`/`policy_source` stamp (G4's own proposed fix)
**Surviving exploit: G4 is not in the code it was written to gate.** `packages/engine/src/core/types.ts:231-247`
(`PrincipalAssurance`) has `whoActed`, `underWhoseAuthority`, `issuer`, `delegation` — **no `seamAuthority`
field.** `packages/engine/src/ports/principal-resolver.ts` and `principal-stamper.ts` — both paper-frozen,
both cite G1/G3 in their doc-comments — **neither mentions `seamAuthority` or G4.** ADR-0011 is explicit that
this is not optional-later: *"Форма Resolver/Stamper на M5 ОБЯЗАНА зарезервировать поле-аналог `seamAuthority`
… ДО того, как приземлится любой код"* (`ADR-0011:132-135`). Per project memory, the ports freeze happened
**after** ADR-0011/G4 was written (`ADR-0010 → ADR-0011(+G4) → порты шва зашморожены`). So the guardrail was
violated by the very commit that was supposed to honor it — not a future risk, a **present gap**, cheap to fix
(add the field, still 0 migrations) and getting more expensive the longer M5 design proceeds without it.
Even setting the sequencing violation aside: `seamAuthority` as *designed* answers "who authorized this host to
stamp" with... another self-declared string, written by the same host it describes. Nothing external
(owner-signed policy doc, `policy_source`-style ratified list) currently validates it. **This is the identical
class of bug ADR-0010 closed at the act level (self-declared field trusted as authority) recurring one level
up, at the seam level** — G4 names the shape correctly but the shape alone doesn't stop a rogue/compromised
gateway from self-certifying. Reserving the field is necessary; it is not sufficient, and nothing in the
current text says what makes a `seamAuthority` value *itself* trustworthy.

### Form γ — vouched derivation from Telegram `from.id` (the only real identity source in the repo today)
**Surviving exploit: two disconnected trust systems, and one agent-writable path into the second.**
1. Telegram's `from.id` is genuinely server-authenticated (not client-supplied text) — a legitimate root for
   *channel*-level trust, better than nothing. But `/telegram:access` (pairing allowlist, `access.json`) is a
   **separate system** from anything M5 would build. Nothing read today ties `resolveWritePrincipal` to live
   allowlist state. A message that reaches the bot process (misconfig, race, revoked-but-not-yet-propagated
   pairing) has no guarantee `M5` would consult the same source of truth `/telegram:access` uses before
   vouching `channel` trust. Two authorities that can silently disagree is exactly the "one home per concern"
   violation this project's own `doc-tree.md` law would flag in documentation — here it is the *access-control*
   analogue, and it is worse, because it feeds an append-only, retrofit-impossible journal.
2. **Concrete, not hypothetical, project-specific hole:** this project's own `CLAUDE.md` documents that the
   Claude agent running *inside* a gateway topic **may edit its own binding files** — `.gateway/conversations/
   <chatId>/PROMPT.md`, `<threadId>/PROMPT.md`, and `config.json` (`{"cwd": …}`) — "владелец просит «настрой
   этот топик под проект X» → создай/поправь эти файлы сам". If any future M5 identity/trust derivation reads
   from, or is influenced by, files in that same conversation directory (project binding, cached
   topic-identity, anything adjacent), **the unit whose identity is being resolved has write access to the
   input of its own resolution** — a direct self-elevation loop, not a supply-chain-style leak. This is not a
   flaw in the current (nonexistent) M5 code; it is a landmine for whoever builds it, and it is not named
   anywhere in ADR-0010/ADR-0011/the design-wave. Worth pre-registering as an explicit non-goal *now*, while
   free: **M5's `resolveWritePrincipal` source must never overlap with any path the resolved unit can write.**

---

## 2. Where building M5 right now is театр again (append-only, undeserved trust)

The prior DEFER-build verdict (`ADR-0010 §③-bis`) was precisely: *a default handle would journal undeserved
trust into an append-only log, making the theatre permanent.* ADR-0011 was supposed to dissolve that by making
the boundary real. It dissolves it **only in principle** — "ISO-2 is a legitimate model" does not mean "the
one ISO-2 instance that exists in this repo is reliable enough to vouch for." Concretely, M5 is theatre again,
today, in two independent ways that don't require enforcement to be flipped — **implementing the Resolver
alone is enough to reintroduce the trap**:

- **Stamping `trust:'channel'` from `agents-manager` before P-2 (gateway-dup verified-fixed) is exactly the
  undeserved-trust-in-an-append-only-log failure mode, one layer down.** It doesn't matter that enforcement
  (Decision ③, the PEP gate) stays off — the *act of journaling* `principal.issuer:'agents-manager'` +
  `whoActed:'channel'` on a real write, sourced from a channel known to double-fire, is the retrofit-honesty
  violation ADR-0010 §Decision ② exists to prevent. A future auditor reading that act has no way to know the
  channel that vouched for it was, at the time, an open unfixed bug.
- **G4's own field is missing from the code that already landed** (§1, Form β) — meaning if M5 gets built on
  top of the *current* frozen ports without first closing that gap, the retrofit-impossible window ADR-0011
  itself warned about (`ADR-0011:134`: "добавить его ПОСЛЕ того, как акты зажурналированы — невозможно")
  starts counting down the moment the first act carries a populated `principal.*` without `seamAuthority`
  reserved alongside it.

**Verdict on question 2: yes, M5 constructed against the current gateway (P-2 red) or against the current
ports (seamAuthority absent) is theatre under the project's own stated definition of theatre** — not a new
definition invented by this file, the same one ADR-0010/ADR-0011 already ratified and are not yet honoring.

---

## 3. Do candidate M5 forms hold all 7 values?

Building on the prior pass's ledger (not repeated where unchanged):

| # | Value | M5-specific status | What's new here |
|---|---|---|---|
| V3 Доверие | **Worse than the generic case already flagged** | Stamping `channel` trust from a *named, unfixed* bug (gateway-dup) is a sharper, evidenced instance of "false confidence worse than honest `unverified`" — not abstract anymore. |
| V5 Суверенность | **G4 names the fix, code doesn't have it yet** | Sovereignty-centralization risk (F4, prior pass) is *structurally* addressed by G4's intent but *not yet* by the artifact — `seamAuthority` absent means today any code that can call `stamp()` is a de facto unaudited seam owner. If the same `agents-manager` process is the seam for **multiple** projects (per `project-registry.md`'s multi-project topic bindings), one gateway bug has cross-project blast radius, not just FF's — flagged as PROVOCATION since I have no direct evidence other projects already call `packages/engine`. |
| V2 Тождество | **Held, conditionally** | G1 (REFUSE mismatch, never rewrite `actor`) *is* correctly encoded in `principal-stamper.ts`'s frozen interface comment — this is the one place the frozen ports are ahead of, not behind, the guardrails. Holds as long as whoever implements `stamp()` doesn't "helpfully" fall back to overwrite-on-mismatch for UX reasons (the earlier design sketch `01-seam-and-lifecycle.design.md:94-99` still shows an unconditional-overwrite reference implementation that **contradicts** the now-frozen G1-refuse interface — a stale doc that could mislead an implementer back into Stage-1's exact bug if read as the spec instead of the frozen port). |
| V7 Согласие | **Unchanged, latent** | Not re-litigated; still no explicit non-goal line forbidding `underWhoseAuthority` as a consent proxy. |
| V1 Читаемость | **Unchanged, gap persists** | Same finding as before — no M5 form yet says whether `unverified`/`channel` state surfaces anywhere a human reads. |
| V4/V6 Vitalnost/Relyatsionnost | **Unchanged** | Cascade risk noted, not urgent until enforcement is real. |

---

## 4. Does M5 CLOSE `forge-actor`, or relocate it (like Stage-1 did)?

**Relocates it — the adversarial gate suite does not yet cover the new attack surface M5 creates.**

- The **in-body** forgery (`mallory` sets `actor:'user:admin'`) genuinely closes under G1: the frozen
  `PrincipalStamper.stamp()` contract refuses on mismatch rather than rewriting. This is real progress, not
  theatre — it is the one guardrail whose code is currently *stronger* than Stage-1's force-bind.
- But `forge-actor` and ADR-0011's cross-IPC extension (`ADR-0011:229-233`) both test forgery **inside the
  act** or **inside the IPC payload**. Neither tests forgery of **what feeds `resolveWritePrincipal`'s
  `boundaryIdentity` argument** — the gateway's own delivery of `chat_id`/`thread_id`, or (per Form γ above) a
  config file the resolved unit can itself edit. If `boundaryIdentity` can be influenced by the thing being
  identified, `resolvePrincipal` can be made to return a forged `AuthenticatedPrincipal` **honestly** — G1's
  refuse-on-mismatch never triggers, because there's no mismatch: the "authenticated" principal itself is
  wrong. This is structurally the same pattern as `minted_by`→`actor` (Stage-1): the forge doesn't disappear,
  it moves one hop upstream of the field the existing tests inspect.
- **Missing test, cheap to name now:** a `forge-boundary-identity` gate — construct a case where the
  *resolver's input* (not the act body) is attacker-influenced, and assert `resolvePrincipal` either refuses
  or the resulting trust stays `unverified`. Not present in ADR-0010's 5-test suite or ADR-0011's 4-point
  validation plan.

---

## 5. What must be TRUE before any enforcement (and, per §2, before much of M5 itself)

Restating ADR-0011's own P-1..P-4 against found evidence, plus one addition:

- **P-1 (ADR-0011 ratified + M5 built).** ADR-0011's own Status line reads `proposed`, "ждёт ратификации
  ПИСЬМЕННОЙ ФОРМЫ владельцем" — **not yet ratified** as of this file. M5 doesn't exist. **RED.**
- **P-2 (gateway-dup verified-fixed).** `gateway-dup/INDEX.md` Status: active, dated 2026-07-06, no fix
  evidence found anywhere in this repo or referenced cross-repo. **RED**, and per §2 above this blocks not
  just enforcement but *honestly implementing the Resolver itself* against the current gateway.
- **P-3 (`seamAuthority` reserved).** Not present in `types.ts` or either frozen port, despite G4 requiring it
  before any code lands and the ports having already landed. **RED — and the only one of the four that is
  actively regressing the longer it stays unfixed**, per ADR-0011's own retrofit-impossibility argument.
- **P-4 (explicit owner nod).** Not sought by this file (design-phase, no build) — but note it is gated behind
  the other three per ADR-0011's own sequence.
- **New, not in ADR-0011's list — add before M5 design finalizes:** a written non-goal that `resolveWritePrincipal`'s
  identity source may never overlap with any path the resolved unit can write (§1 Form γ.2), and a named
  `forge-boundary-identity` adversarial test (§4) alongside the existing 5+4-point gates.

---

## Ranked findings

### CRITICAL
- **T1 — G4's own guardrail (`seamAuthority`) is absent from the ports it was written to gate.** `types.ts`
  `PrincipalAssurance` has no such field; `principal-resolver.ts`/`principal-stamper.ts` (frozen after
  ADR-0011 per project memory) don't reference it. Lens: contradiction-detection. Retrofit-impossible per
  ADR-0011's own argument — the gap gets more expensive, not cheaper, with every day M5 design proceeds on top
  of the current frozen ports without it.
- **T2 — Building/implementing the Resolver against the current gateway is theatre under the project's own
  ratified definition, independent of whether enforcement is flipped.** `gateway-dup` bug is open, unfixed,
  unverified (P-2 red); stamping `channel` trust from it journals undeserved confidence into an append-only
  log — the exact failure the prior DEFER-build verdict named, recurring at the M5 layer instead of the
  Decision-③ layer. Lens: failure-mode analysis, assumption-audit.
- **T3 — `forge-actor` relocates rather than closes: the adversarial gate suite never tests forgery of the
  resolver's own identity source.** A boundary identity attacker-influenced upstream of `resolvePrincipal`
  produces an "honestly" forged `AuthenticatedPrincipal` that G1's refuse-on-mismatch cannot catch, because
  there is no mismatch to detect. Lens: adversarial, contradiction-detection (repeats Stage-1's exact pattern
  one hop upstream).

### CONCERN
- **T4 — Two disconnected trust systems: `/telegram:access` allowlist vs. whatever M5 builds.** Nothing today
  ties `resolveWritePrincipal` to live pairing-allowlist state; a message that reaches the bot process by
  misconfig/race/stale-revocation has no structural guarantee of being checked against the same source of
  truth the access-control skill uses. Risk if ignored: the two systems silently disagree, and the
  append-only journal inherits whichever one vouched first.
- **T5 — CLAUDE.md documents the gateway agent can self-edit its own topic/project binding files
  (`PROMPT.md`, `config.json`).** If any future M5 identity source touches that directory, the resolved unit
  can influence its own resolution. Not a current bug (M5 doesn't exist yet) — a landmine for the builder,
  cheap to forbid in writing now, expensive to notice after the fact.
- **T6 — Stale design doc contradicts the frozen port it supposedly specifies.**
  `01-seam-and-lifecycle.design.md:94-99`'s reference `stamp()` implementation unconditionally overwrites
  `actor`, while the now-frozen `principal-stamper.ts` interface correctly encodes G1 (refuse-on-mismatch). An
  implementer who reads the older design doc as the spec (rather than the newer frozen port) could rebuild
  Stage-1's exact bug. Cheap fix: an erratum note in the design doc pointing at the frozen port as authoritative.

### PROVOCATION
- **T7 — If `agents-manager` is the seam owner for multiple projects (per `project-registry.md`'s multi-project
  topic bindings), a single gateway compromise or bug has cross-project blast radius, not just FF's.** I found
  no direct evidence other projects currently call `packages/engine`, so this is speculative — but worth a
  one-line check before M5 assumes "the gateway" is a project-scoped trust boundary rather than a
  platform-scoped one.

### NOTED
- G1 (refuse-not-rewrite) is genuinely held in the current frozen `principal-stamper.ts` interface — this is
  the one place the code is currently *ahead* of the risk, not behind it. Watch that an implementation doesn't
  regress it under UX pressure ("just fix it silently for the user").
- The isolation-model gap (prior F1) is legitimately closed at the *decision* level by ADR-0011. Not
  re-flagged here except where a specific instance (gateway-dup, agent-writable config) shows the decision
  being real in principle doesn't make the first concrete instance of it trustworthy yet.

### What I looked for but didn't find problems with
- The `PrincipalAssurance` type shape itself (`whoActed`/`underWhoseAuthority`/`issuer`/`delegation`) — still
  additive, still doesn't smuggle a behavior choice, confirmed unchanged since the prior pass.
- No evidence the frozen ports (`principal-resolver.ts`, `principal-stamper.ts`) themselves implement anything
  — genuinely paper-freeze, zero behavior, as claimed. The gaps found here are about what's *missing* from the
  freeze (T1) and what happens when someone builds on top of it (T2/T3), not about undisclosed behavior in
  what's already there.
