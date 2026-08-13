---
type: critic
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: critic (adversarial threat-model — the attack surface any root-of-trust for decision 4 must survive)
title: "CRITIC — Threat model for M5 root-of-trust (decision 4): 6 attacks × 3 option families"
scope: M5 surface-identity, root-of-trust anchor for `seamAuthority` (synthesis §2/§6 decision 4) — DESIGN phase, no code
targets:
  - ../../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
verified-against:
  - ../census/03-threat-and-values.critic.md   # T1 seamAuthority-absent, T2 P-2-theatre, T3 forge relocates to boundaryIdentity, T5 config-cascade self-edit
  - ../design/03-topology-redteam.critic.md    # RT1 seamAuthority topology-invariant regress, RT2 T5 closed by none, RT3 all-theatre-under-P-2, RT5 sidecar false-closure
  - ../design/04-SYNTHESIS-m5-decision-ready.md   # §2 root-of-trust options (a)/(b)/(c), §6 decision-4, §7 DEFER-build verdict
  - ../design/02-propagation-and-g4-patch.analysis.md   # mechanism C (engine-side host registry) vs B (signed token, deferred ISO-3) vs D (capability-restricted call path)
  - docs/01-organization/process/bugs/gateway-dup/INDEX.md   # Status active, 2026-07-06, no fix evidence — P-2
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/CLAUDE.md:53-59   # gateway config-cascade, agent self-edits PROMPT.md/config.json (T5 vector)
not-repeating: T1-T7/RT1-RT8 from the two prior critic passes are TAKEN AS GIVEN. This file does not re-argue
  that seamAuthority is currently a reserved field, not a mechanism (RT1) — it treats that as settled and asks
  the next question the owner's decision-4 fork actually needs answered — a concrete attack table.
option-families:
  A: "engine-registry — static owner-maintained allowlist of legitimate hosts, held on the engine side, not
     writable by the stamping process/gateway/agent. seamAuthority populated by lookup against this registry."
  B: "signed-artifact — owner-signed policy/credential, verified by public-key crypto; signing key never
     resides on any process capable of stamping. seamAuthority populated by signature verification."
  C: "defer/capability-reuse — no new vouching primitive built. Reuses the existing object-capability pattern
     (only a process holding the Engine write-handle can call write() at all — '01-seam-and-lifecycle.design.md:198,
     the handle IS the authority'). seamAuthority is honestly stamped as not-independently-vouched /
     access-controlled-only, rather than inventing an unearned attestation string."
---

# Threat model — what any M5 root-of-trust (decision 4) must survive

> DESIGN phase, no code, no commits. Not choosing among A/B/C — enumerating the attacks a chooser needs on the
> table before choosing, per prior critic passes' warning (RT1) that "we picked a root" quietly gets read as
> "we closed the threat," which is false for several of the six below regardless of which option wins.

## Method

Six concrete attack scenarios, each stated as attacker capability → attempted outcome. For each: pass/fail
tendency of A (engine-registry), B (signed-artifact), C (defer/capability-reuse) at a high level — not an
implementation review (none of the three has code yet), a structural read of what the *mechanism class* can
and cannot defeat by construction.

---

## Attack 1 — Self-certification loop: the stamper vouches for itself

**Scenario:** the process that stamps `principal.*` on a write also supplies the value that says it is
authorized to stamp (`seamAuthority` populated by self-declaration, or by reading a value it itself controls).

- **A (engine-registry) — PASS, conditionally.** Closes it *if and only if* the registry's write-path is
  genuinely disjoint from the stamping process's own write access (owner-only, e.g. a file the gateway/agent
  process has no OS-level write permission to, or a separate engine-side store the stamping host only reads).
  If registry and stamper end up colocated on the same box with the same effective write privileges "for
  convenience," this degrades to self-cert with extra steps — the FAIL mode is an implementation slip, not a
  property of the mechanism class itself.
- **B (signed-artifact) — PASS, strongest.** Cryptographic verification means the stamping process cannot
  forge the artifact even with full local compromise, *provided* the signing key was generated and remains
  genuinely outside the stamping process's reach (see Attack 5 — this precondition is a bootstrap question,
  not automatic).
- **C (defer/capability-reuse) — PARTIAL.** There is no self-declared *string* to attack (nothing asserts
  "I am authorized," the handle's mere existence is the authority — object-capability pattern), which removes
  the specific forge-a-claim attack surface. But this only relocates the question to "how was the capability
  handle originally distributed and to whom" — identical bootstrap exposure to A, just without a registry
  record to audit against later.

## Attack 2 — gateway-dup (P-2): a duplicated turn produces two "honest" stamps

**Scenario:** `agents-manager` (documented `active`, unfixed since 2026-07-06) redelivers the same logical
Telegram turn twice. Both deliveries genuinely originate from the same authenticated, registry-listed /
correctly-signed / capability-holding process. Nothing is forged.

- **Precise scope statement (per synthesis §4, RT3): root-of-trust answers "who may stamp," never "was this
  specific delivery a duplicate of an earlier one."** These are orthogonal questions. A dedup/idempotency
  check keyed on message-id or act-content-hash at ingestion is a *different* control, unaffected by which of
  A/B/C is chosen.
- **A — FAIL (orthogonal, not closed).** The registry says the host may stamp; it says nothing about whether
  this particular act is a re-delivery of one already journaled.
- **B — FAIL (orthogonal, not closed) — and can look worse.** A valid signature on each of the two duplicate
  acts reads to a future auditor as *stronger* proof than a bare registry hit, which risks the duplicate being
  trusted *more*, not less, precisely because it "looks cryptographically clean." Two independently-valid
  signatures on the same logical turn is not a signature-verification bug — it's advertising the append-only
  poisoning is honest, not a hint that something is wrong.
- **C — FAIL (orthogonal, not closed).** Same reasoning; capability-possession says nothing about delivery
  count.
- **Verdict: no root-of-trust choice moves this attack. It is the honest residual named in the prior synthesis
  (§4/§7) — the fix lives in `agents-manager` ingress dedup, a different repo, not in this decision.**

## Attack 3 — Agent edits its own binding files (T5), then presents a "legitimate" seam identity

**Scenario:** the resolved unit (the agent process itself) has documented write access to
`.gateway/conversations/<chatId>/PROMPT.md` and `<threadId>/config.json` (`CLAUDE.md:53-59`). If any future
resolver reads project/namespace/identity-adjacent binding from that same directory, the unit can influence the
*input* to its own identity resolution — not forge the stamp, corrupt what the (legitimately authorized)
stamper is told to stamp.

- **A — FAIL, does not close this.** The registry correctly answers "is this host allowed to stamp" — but the
  attack doesn't impersonate the host, it feeds the *legitimately-authorized* host a false `boundaryIdentity`
  value upstream of the stamp. A registry check has nothing to say about the truthfulness of the value being
  stamped, only about the authority of the process stamping it.
  Whether the value being stamped is itself trustworthy is a
  question. A registry-anchored root cannot see this — it validates the stamper, not the stamper's inputs.
- **B — FAIL, identically.** A cryptographic signature over "host X asserts `chat_id=Y`" proves host X really
  asserted it, not that `Y` is true. If host X's own upstream config was tampered, the signature faithfully
  certifies a lie.
- **C — FAIL, identically, for the same structural reason.** Capability-possession proves the caller holds a
  legitimate write-handle; it says nothing about the correctness of the identity value that handle is being
  asked to stamp.
- **Verdict: this is a category boundary, not an implementation gap in any one option — root-of-trust and
  input-integrity are different questions by construction. Closing T5 needs (i) a non-goal invariant that the
  resolver's identity source never overlaps any agent-writable path, and (ii) a `forge-boundary-identity`
  adversarial test — both already named in the census/topology passes as free, textual, pre-code moves,
  independent of which root A/B/C is later chosen.**

## Attack 4 — Replay / stolen token / stale registry entry

**Scenario:** an attacker captures a previously-valid credential (token, signature, or an inherited capability
reference) and reuses it to author an unrelated write, or exploits a registry/revocation-list entry that is
correct-when-written but stale by the time it's checked.

- **A (engine-registry) — PARTIAL.** No wire-transmitted token exists to steal in the pure "is this host on
  the list" form — that specific replay surface is absent by construction. But the registry is only as fresh
  as the owner's last edit: a host that is compromised or should be revoked stays legitimately-listed until
  someone updates the file. Staleness, not replay, is the live exposure here.
- **B (signed-artifact) — FAIL by default, PASS only if explicitly designed against it.** A signed artifact is
  exactly the class of credential that's meaningless to protect against replay unless it carries a single-use
  nonce or expiry bound to a specific act/message. Absent that (the natural first-draft shape — "sign a policy
  document" doesn't obviously need a nonce), a captured signed credential (logged, cached in a conversation
  directory, retried by a naive client) authorizes an unrelated future write. Revocation has the same staleness
  problem as A's registry, plus the new replay surface A doesn't have.
- **C (defer/capability-reuse) — PARTIAL, same shape as A.** No new bearer credential is minted, so no new
  replay surface is added by *this* decision — but the underlying capability-handle distribution (who was
  handed a reference to the Engine object) inherits whatever revocation story the handle-issuing mechanism
  already has (today: none verified — out of scope of this decision, flagged not assumed).
- **Verdict: A and C are structurally narrower here (nothing new to steal) but both carry an unaddressed
  staleness/revocation gap; B adds a genuinely new attack surface (replay) that has to be designed away
  explicitly, not assumed solved by "it's signed."**

## Attack 5 — Bootstrap attack (first-use / trust-on-first-use window)

**Scenario:** every root-of-trust needs an initial act that seeds it — the first registry entry, the first
signing key's generation and distribution, the first capability handle's issuance. If that seeding act is
itself unaudited or the key/handle briefly touches an untrusted environment, a compromise present only during
that narrow window persists forever after, indistinguishable from a legitimate root.

- **A — CONCERN, but the most auditable of the three.** Bootstrap = owner manually adds a host id to a
  registry file. Exposure is concentrated in one deliberate, versionable, diffable action (naturally lands as
  a reviewable commit/decision under this project's own doc discipline) — the TOFU window is real but narrow
  and visible after the fact.
- **B — CONCERN, easy to silently defeat.** Bootstrap = generate a keypair and get the signing key genuinely
  *outside* the stamping host's reach. The common naive failure is generating the key ON the host that will
  later use it — at which point the "external" property the whole mechanism depends on never actually held,
  and nothing about *choosing* option B guarantees this was avoided. This is a subtler, easier-to-get-wrong
  bootstrap than A's, precisely because B's stronger claim (crypto) invites more confidence than the bootstrap
  discipline backing it may deserve.
- **C — N/A in one sense, unresolved in another.** No new bootstrap ceremony is introduced by *this* decision
  (nothing new is vouched) — but capability-handle issuance already has its own, currently unexamined,
  distribution history; C doesn't eliminate a TOFU window, it declines to add a second one on top of an
  unexamined first one.
- **Verdict: none of the three eliminates the bootstrap window; A's is the most visible/auditable by
  construction, B's is the easiest to accidentally defeat while looking solved, C's is simply un-inspected
  (inherited, not designed).**

## Attack 6 — Compromised host that IS legitimately in the registry / holds a valid key

**Scenario:** the attacker doesn't need to forge anything — they fully own a host that has already,
legitimately, passed whichever root-of-trust check is chosen (registry-listed, key-holding, capability-handle
possessing). Every subsequent stamp from that host is, by every mechanism's own definition, "authorized."

- **A — FAIL, structurally, not as an implementation gap.** The registry answers "may this host stamp,"
  evaluated at check-time against a list that has no live signal about the host's current integrity.
- **B — FAIL, identically.** A valid signature from a compromised host is a perfectly valid signature. Crypto
  proves *origin*, not *the current trustworthiness of the thing at that origin*.
- **C — FAIL, identically.** A compromised process holding a legitimate capability handle can use it exactly
  as legitimately as before compromise; capability-possession is, again, an origin/authorization proof, not an
  integrity proof.
- **Verdict: all three fail this identically, and this is not a gap to fix by picking harder among A/B/C — it
  is the inherent scope boundary of what "root-of-trust" (provenance/authorization) can mean at all. Defeating
  this attack needs a different control class entirely (runtime attestation, behavioral anomaly detection,
  short-lived credentials + rotation, host hardening) — orthogonal to and outside decision 4 as posed. Naming
  this now prevents decision 4 from being oversold later as "solves compromised hosts," which it structurally
  cannot.**

---

## Summary table — pass/fail tendency

| # | Attack | A engine-registry | B signed-artifact | C defer/capability-reuse |
|---|---|---|---|---|
| 1 | Self-certification loop | PASS (conditional on disjoint write-path) | PASS (strongest, if key truly external) | PARTIAL (removes the claim, not the bootstrap question) |
| 2 | gateway-dup (P-2) | FAIL — orthogonal | FAIL — orthogonal, can look *more* trusted (worse) | FAIL — orthogonal |
| 3 | T5 config-cascade → forged boundary identity | FAIL — validates stamper, not stamper's input | FAIL — same | FAIL — same |
| 4 | Replay / stolen token / stale entry | PARTIAL (no token, but stale-entry gap) | FAIL by default (needs explicit nonce/expiry design) | PARTIAL (no new surface, inherits unexamined handle-issuance story) |
| 5 | Bootstrap / TOFU window | CONCERN (narrow, auditable) | CONCERN (easy to silently defeat) | UNRESOLVED (inherited, not designed) |
| 6 | Compromised-but-legitimate host | FAIL — out of scope by construction | FAIL — same | FAIL — same |

## Honest residual — attacks NO root-of-trust option closes

- **Attack 2 (gateway-dup / P-2)** — orthogonal to identity/authorization entirely; append-only poisoning from
  honest duplicate delivery. Fix lives in `agents-manager` ingress dedup, a different repository. Confirms
  synthesis §4/§7: this is the true critical-path blocker, unaffected by decision 4's outcome.
- **Attack 3 (T5 — agent-writable config feeding the resolver's input)** — a category boundary: root-of-trust
  validates *who* stamps, never *what value* a legitimately-authorized stamper is fed. Needs a separate
  non-goal invariant + `forge-boundary-identity` adversarial test, independent of A/B/C.
- **Attack 6 (compromised-but-legitimate host)** — structurally outside what any provenance/authorization
  mechanism can answer; needs a different control class (attestation, rotation, hardening), not a better root.

Together these three form the honest floor under *any* choice on decision 4 — picking among A/B/C narrows
attacks 1, 4, 5 (with real differences in strength and failure mode between the three) but leaves 2/3/6 exactly
as open after the decision as before it. A decision-4 write-up that doesn't say this in the same breath as the
recommendation risks the exact false-closure failure RT5 already flagged for the sidecar topology, recurring
here at the root-of-trust layer instead.
