---
type: critic
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: critic (adversarial red-team — stress-test 3 candidate M5 topologies BEFORE owner picks)
title: "CRITIC — M5 topology red-team: engine-in-gateway vs engine-service+IPC-token vs sidecar issuer-of-issuer"
scope: M5 (surface-identity resolution, ADR-0011 prerequisite for ADR-0010 Decision ③) — packages/engine seam, branch refactor-tree
targets:
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
verified-against:
  - ../census/01-boundary-map.design.md   # grains #1/#2/#4/#8/#10/#11/#13/#14 — all 🟥 or ⬜, none closed by topology alone
  - ../census/02-caller-reality.analysis.md   # 100% in-process today; zero call sites into engine from gateway
  - ../census/03-threat-and-values.critic.md  # wave-1: T1 seamAuthority absent from frozen ports, T2 P-2 red = theatre,
    T3 forge relocates to boundaryIdentity source, T5 gateway config-cascade is agent-writable, V5 sovereignty
  - docs/01-organization/process/bugs/gateway-dup/INDEX.md   # Status: active, dated 2026-07-06, no fix evidence — re-verified this pass
  - docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/decisions/OWNER-FORKS-2026-08-12.decision.md  # FORK-2: ADR-0011 ratification is text-only, does not touch P-2
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/CLAUDE.md:53-59  # gateway config-cascade, agent self-edits PROMPT.md/config.json
not-repeating: T1-T7 from 03-threat-and-values.critic.md are TAKEN AS GIVEN — this file asks whether picking a
  concrete topology (as opposed to leaving M5 abstract) closes any of them, worsens any of them, or just moves
  the same hole to a different address.
---

# Critic — M5 topology red-team: 3 candidate forms against the wave-1 threats

> Not choosing a topology. For each of the three candidate shapes the owner is about to be asked to pick
> between, this file asks the same five questions the orchestrator posed, and refuses to let "we picked a
> topology" be quietly read as "we closed a threat." Per boundary-map (`01`), grains #1 (seam-owner process),
> #2 (engine-host location) and #8 (identity propagation carrier) are the three still-🟥 grains a topology
> choice would fix — but #10 (`seamAuthority` field/validator), #13 (idempotent stamp / P-2) and #11
> (cross-host seam authority) are **not** topology questions, and no candidate below closes them by
> construction.

---

## The three candidate forms, named concretely (so the exploits below have a real target)

- **Form T1 — engine in-process WITH the gateway.** `packages/engine` runs loaded inside the `agents-manager`
  process itself (not inside the isolated `claude -p --resume` agent turn). The gateway process is both
  ingress-authenticator (`OwnerAllowlist.isOwner(from.id)`) AND `engine.write()` caller. The isolated agent
  turn (already a separate OS process per ADR-0011's model) reaches the engine only by whatever IPC channel
  already exists between agent-turn and gateway (today: none call `engine.write` — grain #8, boundary-map
  `:88-89`).
- **Form T2 — engine as a separate service, gateway calls it over IPC carrying a token.** `packages/engine`
  runs as its own process/daemon; the gateway mints or forwards a token per write and calls the engine-service
  across a socket/pipe/HTTP. This is the literal "process/IPC protocol" ADR-0011 names as unbuilt engineering
  (`ADR-0011:188`, "(−) процессная модель + IPC-протокол... которой сегодня нет").
- **Form T3 — sidecar issuer-of-issuer.** A third process, separate from both gateway and engine-service,
  whose sole job is to validate/issue `seamAuthority` (G4) credentials — i.e. a dedicated answer to OQ-1
  ("кто вправе БЫТЬ хост-процессом, штампующим принципала", `ADR-0011:207-211`). Gateway asks the sidecar for
  a seamAuthority credential before it may stamp; engine (or engine-service) checks the credential came from
  the sidecar, not from gateway self-declaration.

---

## Per-topology answers to (1)-(3)

### T1 — engine in-process with gateway

**(1) Concrete exploit.** The exploit is not identity forgery inside the act body (G1 already refuses that) —
it is **honest-but-wrong `boundaryIdentity`, sourced twice from the same unreliable channel.** Gateway-dup
(P-2, still `active`, re-verified this pass — see §0 below) delivers the *same* Telegram turn twice; both
deliveries are, individually, "really" from the authenticated `chat_id`/`from.id` — there is no mismatch for
G1's refuse-on-mismatch to catch, because nothing is forged. Both stamps are honestly issued and both land in
the append-only journal. In T1 specifically, the failure domain is at its widest: authenticator, stamper, and
engine writer are the *same process*, so there is no natural process boundary anywhere in the pipeline that
could reject a duplicate before journaling it — dedup has to be invented as explicit application logic, it
does not fall out of "being in-process" for free.

**(2) Theatre, given P-2 red?** Yes, unconditionally. T1 changes nothing about P-2: gateway-dup is an ingress
reliability bug in `agents-manager`, orthogonal to where `packages/engine` is linked. Implementing the
Resolver under T1 today would stamp `trust:'channel'` from the same documented-unreliable channel — exactly
wave-1 T2, unchanged by topology choice.

**(3) Does T1 close T5 (agent self-edits its own identity source)?** **No — and this is the sharpest finding
of this pass.** T5's vector is `.gateway/conversations/<chatId>/PROMPT.md` and `<chatId>/<threadId>/config.json`
(`CLAUDE.md:53-59`), which the resolved agent is explicitly documented to edit itself ("владелец просит
«настрой этот топик под проект X» → создай/поправь эти файлы сам"). That cascade lives entirely inside the
**gateway's own conversation-binding mechanism** — it exists regardless of whether `packages/engine` is linked
into the gateway process (T1), lives in a separate service (T2), or is fronted by a sidecar (T3). **None of
the three topologies touch this vector, because none of them redesigns the config cascade.** T1 does not make
it worse (the engine's own location is irrelevant to whether the agent can rewrite `config.json`), but it also
buys zero protection against it. If any future resolver reads project/namespace binding from that same
directory (a design choice, not yet made), T1 is exactly as exposed as T2/T3.

### T2 — engine as separate service + IPC token

**(1) Concrete exploit.** Two, and they compound: (a) **who mints the token, and against what?** If the
gateway mints the token per-write (the natural default — it is the only process that has authenticated
anything), the token is self-issued by the same process the exploit in T1 already distrusts — a token is not
a new authority, it is a costume on the same self-declaration, unless something OUTSIDE the gateway/engine
pair validates it (that is T3's proposition, not T2's). (b) **replay/reuse.** Introducing a network/IPC hop
introduces a NEW attack surface T1 doesn't have: if the token is a bearer credential without a single-use
nonce bound to a specific act/message, whoever captures it (logged token, cached in the conversation
directory, retried by a naive client on timeout) can replay it to author an unrelated write. T1's in-process
call has no token to steal because there is no wire between authenticator and stamper.

**(2) Theatre, given P-2 red?** Also yes, and possibly *worse-looking* theatre: a "token" reads as
cryptographic proof to a future auditor, which is a stronger-sounding claim than T1's plain in-process call —
but if the token is minted by the same unreliable, self-certifying gateway, P-2 (dup delivery) now produces
**two independently-issued, individually-valid-looking tokens** for the same logical Telegram turn, each of
which the engine-service will honor because nothing about "having a well-formed token" proves the turn wasn't
a duplicate. A token with a shinier name is not evidence against the boring bug that already exists.

**(3) Does T2 close T5?** No, same reasoning as T1 — T5 lives in the gateway's config cascade, which T2
doesn't touch. Worth adding: T2 *could* make T5 marginally harder to exploit if the token-minting logic
explicitly excludes reading from `.gateway/conversations/**` — but that is a design choice someone has to make
and name, not a property T2 grants by existing as "a separate service."

### T3 — sidecar issuer-of-issuer

**(1) Concrete exploit. Infinite regress, not closure.** T3 is a direct attempt to answer G4/OQ-1 ("who
authorized THIS host to stamp") by adding a fourth actor. The exploit: **who authorizes the sidecar to be the
issuer-of-issuer?** If the sidecar is started by the same supervisor/deploy pipeline as the gateway (same
`pm2`/systemd config, same repo, same operator), reads its own policy from a file the gateway process (or the
resolved agent, transitively) can influence, or is itself configured at gateway-spawn-time, then "separation
of duties" is theatre: one compromised commit or one gateway bug changes both processes' behavior together,
and an auditor reading `issuer:'sidecar'` in the journal has no way to know the sidecar's own root of trust
was, in fact, the gateway's deploy artifact. This reproduces T1/T3-from-wave-1 (critic-1's finding: "the
identical class of bug ADR-0010 closed at the act level... recurring one level up, at the seam level") one
level up *again* — `seamAuthority` now needs its own `sidecarAuthority`, and nothing in the concept as posed
grounds that terminus. A sidecar only closes the regress if its bootstrap trust root is genuinely **out of
band**: a signed policy artifact whose signing key the gateway process never holds, checked at sidecar startup
by a mechanism the resolved agent cannot influence even transitively. Nothing in ADR-0011/G4 or the design-wave
names this; it is not implied by "add a sidecar," it has to be a separate, explicit design decision.

**(2) Theatre, given P-2 red?** Partially different shape, same verdict. T3 doesn't touch ingress reliability
at all — the sidecar validates *authority to stamp*, not *whether this delivery is a duplicate*. P-2 remains
fully red under T3. Worse: T3 adds a plausible-sounding "we now have an independent validator" narrative that
could get mistaken for "the channel-trust problem is solved" by a future reader who doesn't check that the
sidecar's own bootstrap is gateway-adjacent — this is a new theatre risk T1/T2 don't have (a *false sense of
closure*, not just an unclosed gap).

**(3) Does T3 close T5?** No, and for the same structural reason as T1/T2: T5's vector is the gateway's
conversation-binding files, which sit **below** the seam-authority question entirely. A sidecar answers "who
may stamp," never "which files feed the resolver's inputs." Only a redesign of the config cascade itself (out
of scope for a topology choice, and not proposed anywhere in the current artifact set) closes T5.

---

## (4) Which topology minimizes retrofit-asymmetry on the append-only journal without reproducing channel-theatre?

**None of the three, as currently specified, minimizes it — the honest answer is "none, until P-2 is fixed and
G4 has a real validator," and among the three, ranking by how much *additional*, undesigned attack surface
each one bolts on before that happens:**

- **T1 is the least additionally dangerous of the three** — it adds zero new attack surface beyond what
  already exists (no token to steal, no third process to compromise), and it is the one place a message-id-keyed
  dedup check could be added *cheaply and locally*, because the same process sees the Telegram delivery and
  the write call — no cross-process race to keep consistent. This is a structural opportunity, not a built
  fix: nothing in the design-wave or ADR-0011 currently proposes it, so it is a **provocation**, not a claim
  T1 already does this.
- **T2 is worse than T1 today**, not better: it adds a real, new exploitable surface (token replay/reuse) on
  top of an unfixed P-2, while offering no automatic gain (dedup still has to be built explicitly, and now has
  to be coordinated *across* the IPC hop instead of within one process — classic check-then-act race unless
  the engine-service itself enforces uniqueness on an idempotency key, which is a real design requirement, not
  a byproduct of "separate service").
- **T3 is the riskiest of the three for retrofit-asymmetry specifically**, because it is the one most likely
  to get *misread as closing G4* by a future reader — "we have a sidecar issuer" sounds like governance solved,
  when in fact (per §1 above) it only relocates the unresolved regress. A prematurely-populated
  `principal.issuer:'sidecar:...'` on a journaled act, read months later, would misleadingly signal
  "cross-validated" when it wasn't — this is a **worse instance of the exact failure ADR-0010 §Decision② exists
  to prevent** (retrofit-impossible false confidence), because it dresses the self-certification in the
  clothing of the fix G4 was written to require.

---

## (5) Is the additive `seamAuthority` patch (G4) sufficient — or does it just relocate "who certifies seamAuthority"?

**It relocates, and this holds identically across all three topologies — this is the pass's one CRITICAL
finding, and it generalizes wave-1's T1 rather than resolving it.**

`seamAuthority` as written in ADR-0011 (`:131-135`) reserves a **field** ("issuer-of-the-issuer: кто
авторизовал ИМЕННО ЭТОТ хост штамповать"), not a **verification mechanism**. A reserved field answers "where
would the answer go if we had one" — it does not supply the answer. Concretely, per topology:

- **T1** — the only candidate that could populate `seamAuthority` is the gateway process itself (it is both
  authenticator and stamper). Self-declared field, exactly the pattern G4's own text warns against
  (`ADR-0011:137-141`, "категорийная страховка 4b": `issuer` ≠ authority-to-stamp) — except now `seamAuthority`
  *is* that authority field, and there is still nothing OUTSIDE the gateway process asserting it.
- **T2** — the token-issuing party is still the gateway (or, if the engine-service itself decides, then the
  engine-service is now the unaudited self-certifier instead). Moving the self-declaration across a wire
  doesn't change who authored it.
- **T3** — genuinely *attempts* an external validator, but (per §1 above) only succeeds if the sidecar's own
  bootstrap trust is rooted outside the gateway's control — a requirement not named anywhere in ADR-0011, G4,
  or the design-wave. As posed, T3's sidecar is configured/deployed by the same actor as the thing it's meant
  to check, so it inherits the gap rather than closing it.

**Conclusion: reserving the field (P-3) is necessary and cheap (already flagged CRITICAL in wave-1 as T1 —
absent from `types.ts`/frozen ports today) but by itself answers none of questions (1)-(4) above. A
`seamAuthority` value is only non-theatrical if something outside the process that populates it can verify it
— today, under every one of the three candidate topologies, nothing does.** The real missing design element,
not present in any candidate as posed, is an **out-of-band, owner-controlled trust root** (e.g., a
signed/checksummed policy artifact whose provenance the owner controls directly, checked by whichever process
stamps, independent of gateway-writable state) — without naming that root explicitly, "pick a topology" and
"solve G4" are two different unsolved problems being conflated into one decision.

---

## §0 — re-verification note (why T2/P-2 citations above are load-bearing, not inherited unchecked)

Re-checked this pass, not merely cited from wave-1: `docs/01-organization/process/bugs/gateway-dup/INDEX.md`
— `Status: active`, dated 2026-07-06, still no fix-evidence anywhere in this repo as of 2026-08-12
(cross-checked against `OWNER-FORKS-2026-08-12.decision.md` FORK-2, which explicitly notes ADR-0011
ratification is a **text-only** step that "не обходит P-2 — enforcement всё равно заблокирован независимо").
Confirms wave-1's T2 still stands unchanged going into the topology decision — none of T1/T2/T3 above touch
this bug's actual fix surface (`agents-manager` dedup logic), because it is a different repo's ingress code,
not an engine-topology question at all.

---

## Ranked findings

### CRITICAL
- **RT1 — `seamAuthority` (G4) is a reserved field, not a verification mechanism, and this gap is
  topology-invariant.** All three candidates (T1/T2/T3) let the same actor that stamps also certify its own
  authority to stamp, unless an out-of-band trust root is named — which none of them name. Lens:
  assumption-audit, contradiction-detection. This is wave-1 T1's finding shown to survive topology selection,
  not a new independent bug — flagging it here because "choose a topology" could otherwise get read as "and
  thereby G4 is satisfied," which is false for any of the three as posed.
- **RT2 — T5 (agent self-edits its own identity-adjacent config) is closed by NONE of the three topologies.**
  The vector (`.gateway/conversations/<chatId>/PROMPT.md`, `config.json`, `CLAUDE.md:53-59`) sits in the
  gateway's conversation-binding mechanism, one layer below where engine placement or IPC shape can reach.
  Choosing among T1/T2/T3 without also naming a config-cascade redesign leaves this landmine live regardless
  of which topology wins. Lens: missing-perspective, failure-mode analysis.
- **RT3 — Building/implementing ANY of the three topologies today is theatre under the project's own ratified
  definition, unchanged from wave-1 T2.** P-2 (gateway-dup) is still `active` (re-verified §0), and no
  topology choice fixes an ingress dedup bug in a different repo. Journaling `trust:'channel'` from any of
  T1/T2/T3 before P-2 has a *verified* fix is the same undeserved-trust-in-an-append-only-log failure
  ADR-0010/ADR-0011 already named. Lens: failure-mode analysis.

### CONCERN
- **RT4 — T2 introduces a genuinely new attack surface (token replay/reuse) without a compensating gain.**
  Unless the token carries a single-use nonce bound to a specific Telegram `message_id` AND the engine-service
  enforces uniqueness, T2 is strictly worse than T1 on attack surface while offering no automatic dedup
  benefit. Risk if ignored: the topology decision gets made on "sounds more secure" (token = crypto-flavored)
  rather than actual exploit surface.
- **RT5 — T3 carries a distinct false-closure risk beyond the other two.** A sidecar whose own bootstrap is
  gateway-adjacent, once its `issuer:'sidecar:...'` starts appearing in the journal, reads to a future auditor
  as "independently validated" when it isn't — worse than T1/T2's more honestly-still-open theatre, because it
  actively misleads rather than merely remaining unclosed. Risk if ignored: the retrofit-impossible window
  (ADR-0011:134) closes on a *false-positive* record, which is harder to notice and correct than an honestly
  `unverified` one.
- **RT6 — Dedup-as-topology-side-effect is unproven, not designed.** §4's claim that T1 is "structurally
  well-positioned" for a message-id-keyed dedup check is a possibility, not a built or even sketched mechanism
  anywhere in the current artifact set (`engine.ts`'s existing idempotency-dedup step, per
  `02-caller-reality.analysis.md` Finding 1, was read only in passing this pass — whether it dedupes by
  act-content-hash in a way that would or wouldn't catch a gateway-dup-produced re-delivery was NOT verified
  here and should not be assumed either way).

### PROVOCATION
- **RT7 — If T2/T3 is chosen, the token/sidecar-credential format itself becomes a new append-only-adjacent
  decision** (is the credential itself journaled? does its absence-of-record become an audit gap symmetric to
  T1's absence-of-token?). Not explored in any artifact so far — worth a dedicated grain before either T2 or
  T3 is picked, not after.
- **RT8 — All three topologies implicitly assume "the gateway" is a single trust boundary.** Per wave-1 T7
  (provocation, unconfirmed): if `agents-manager` seams multiple projects, T1 (engine linked directly into
  gateway) has the widest blast radius of the three if the gateway process is ever compromised — engine state
  and gateway state share one process/crash domain. T2/T3 at least get a process boundary between "Telegram
  ingress bug" and "engine corruption," even though neither currently uses it for anything. Speculative,
  flagged for completeness only.

### NOTED
- G1 (refuse-not-rewrite) is unaffected by topology choice — it lives in `principal-stamper.ts`'s frozen
  interface regardless of where the stamping process runs. None of the three topologies regress it; none
  improve on it either. Watch, per wave-1, that an implementation doesn't quietly add a "helpful" overwrite
  path under any of them.
- T1's "narrowest attack surface" finding (§4) is a **relative** ranking among three imperfect options, not an
  endorsement — it is still theatre under RT3 until P-2 is fixed, exactly as much as T2/T3 are.

### What I looked for but didn't find problems with
- None of the three topologies reintroduce the in-body `forge-actor` exploit that G1 already closes (`mallory`
  setting `actor:'user:admin'` in the act body) — that specific class stays closed regardless of topology,
  because it's a property of the frozen `PrincipalStamper.stamp()` contract, not of where the stamping process
  physically runs.
- No topology-specific evidence of a NEW class of `Act.principal` envelope mutation risk — the additive,
  A/B/C-neutral form (`types.ts:231-282`) is unaffected by which of T1/T2/T3 is chosen; the envelope shape
  question and the topology question are genuinely orthogonal, confirming ADR-0011's own framing
  (`ADR-0011:280-281`, "не переоткрывает форму ②").
