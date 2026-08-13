---
type: decision
status: decided
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: fable-advisor (synthesis of the 3 root-of-trust designs + threat model → one owner fork)
title: "FORK — owner-decision 4: out-of-band root of trust for seamAuthority (A/B/C)"
decides: "M5-synthesis §2/§6 decision 4 — who certifies seamAuthority OUT-OF-BAND"
resolution: >
  DECIDED 2026-08-12 (converged package = (a)-object wearing (c)-gate). The "(a) vs (c)" binary is dissolved:
  (a) names the OBJECT (engine-owned `trust/` home + schema), (c) names the GATE (Constitution-clamp
  `policy:seam-authority` + honest `unverified` floor + P-5). Both steelmen landed on ONE artifact —
  engine `trust/` + schema + inert canary + machine-checked P-5 tripwire + `unverified` floor. Fork CLOSED
  ONCE to stop re-litigation rot (it had been decided ~3× while status stayed `draft`). HONEST CAVEAT: this
  is convergence-closure, NOT a moved readiness gate — it mints P-5, it does not make M5 buildable. The real
  forward motion = land P-2 + scope ISO-2 uid-split. Execution plan = the `tracks/` sequence (01 root-of-trust).
  Provenance: ratified via owner delegation 2026-08-12 "answer as I would" — reversible if owner disagrees.
  Canonical verdict: ./2026-08-12-owner-eye-forks/SYNTHESIS-owner-eye-verdicts.md (D4)."
related:
  - ../m5-surface-identity/design/root-of-trust/01-engine-registry.design.md   # option A — engine-side owner-writable registry
  - ../m5-surface-identity/design/root-of-trust/02-signed-artifact.design.md   # option B — owner-signed cert (parked upgrade)
  - ../m5-surface-identity/design/root-of-trust/03-defer-or-reuse-capability.design.md  # option C — name mechanism, defer content, P-5
  - ../m5-surface-identity/design/root-of-trust/04-threat-model.critic.md      # 6 attacks × 3 options; residual floor
  - ../m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md            # §2/§6 the fork as originally posed
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md       # P-1…P-4; ISO-2 same-uid reality; G4
  - ../../../../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md  # D3 Constitution clamp — the reused pattern
phase: DESIGN — paper decision only. NO code, NO commits.
---

# FORK — decision 4: root of trust for `seamAuthority`

> Choose in under 2 minutes. One recommendation, one sequence, three consequences, one warning.

## 0. Reframe first (the fork as posed is subtly wrong)

A/B/C are **not rivals — they are one path at three moments in time.** And A's headline guarantee
("the agent can't write the registry") is **empty today**: engine and `claude -p` child run as ONE
OS uid, in-process (A's own §7#1). A filesystem-permission boundary between two things sharing a uid
is convention, not enforcement — its teeth arrive only with the uid/process split that ADR-0011
itself defers. So "adopt A now" would mean adopting a mechanism whose sole security property is
false at the moment of adoption, and journaling nothing better than C journals anyway (`unverified`
everywhere). Meanwhile A's registry file and C's `policy:seam-authority` Constitution-class node are
**the same object seen from two sides** — A contributes the physical placement + schema + clamp
semantics; C contributes the pattern class (ADR-0004 D3 clamp, below the principal layer, NOT a
capability grant) and the gate (P-5). The real decision is not "which mechanism" but **"what blocks
trust until the mechanism has teeth."**

## 1. Recommendation: **C — name the mechanism, defer the content, pin P-5**

Ratify as text, all four moves, zero code:

1. **DEFER recorded as a first-class decision** — until the root is populated, every stamp reads
   honestly `unverified` ("seam authority not vouched"). This changes nothing operationally (that IS
   today's state) — it names it, which is a Читаемость win, not a gap.
2. **Mechanism named now:** a Constitution-class protected node `policy:seam-authority`
   (`protected_namespaces`, `can_write: []`), read by the engine **as a clamp** on the trust axis —
   reusing ADR-0004 D3 + ADR-0006 arbitration. NOT a capability grant (circular — grants presuppose
   the principal the seam produces). Physical home when populated = option A's §2 placement
   (`$FF_ENGINE_HOME/trust/`, engine-principal-owned) — A is absorbed as the mechanism's form, with
   its schema (maxTrust ceiling, subjects, revoke-not-delete) and its clamp-not-refuse PEP semantics.
3. **New precondition P-5** registered in ADR-0011 alongside P-1…P-4: *"out-of-band seam-authority
   root named + populated + write-channel verified disjoint from every agent-writable path."*
   Enforcement flip ③ cannot go green while P-5 is red. This converts defer from omission into gate.
4. **B parked as the named upgrade path** — reopened only when a second trust domain appears
   (marketplace/plugin host, untrusted transport). `seamAuthority` is A/B-neutral by construction,
   so the switch is a resolver change, not a journal migration.

**Why C beats "adopt A now":** it buys everything A buys (the mechanism is reserved, retrofit-cheap,
same honest `unverified` floor) while refusing to book a guarantee that same-uid reality cannot cash.
A adopted today is exactly the false-closure the critic flagged for the sidecar (RT5), recurring at
the root layer: a registry that LOOKS like enforcement, enforced by nothing. Vitality: zero build
against a threat that cannot yet fire (no stamp wants trust > `unverified` before enforcement).

## 2. The entanglement — correct sequence (4 / 5 / isolation / P-2)

Decision 4 is not free-standing. The order that doesn't lie:

| Step | What | Why this position |
|---|---|---|
| 1 | **Decide 4 = C now** (paper: mechanism + P-5) | Unblocks 5 — synthesis §1: a standalone broker is legitimate ONLY after the root is named. |
| 2 | **Decide 5 (topology) = broker-seed** after 4 | Topology inherits the named root; sub-fork module-vs-standalone stays open (coupled to gateway extraction, external to M5). |
| 3 | **Order P-2 fix now, in parallel** (agents-manager) | Longest pole; no root choice touches it (Attack 2 = FAIL for all of A/B/C); any wiring before it = theatre. |
| 4 | **Isolation execution** (uid/process split, real M3 out-of-process engine) | THIS is what turns A's "agent can't write it" from convention into enforcement. ADR-0011 execution prerequisite, not something the registry grants itself. |
| 5 | **Populate the root (P-5 → green)** only after 3 AND 4 | Seeding earlier certifies a host known to double-stamp behind a boundary that doesn't exist. Owner seeds manually — TOFU rejected (self-certification verbatim). |
| 6 | **Enforcement flip ③** — P-1…P-5 all green + owner nod (P-4) | Unchanged from ADR-0010/0011 discipline. |

Dependency stated once, sharply: **4(content) depends on isolation; 5 depends on 4(name); ③ depends
on P-2 + P-5; nothing depends on B.**

## 3. The owner fork (pick one)

- **A — adopt engine-registry now.** Consequence: you own a mechanism whose guarantee is empty at
  same-uid ISO-2 — convention dressed as enforcement, the RT5 false-closure pattern one layer up;
  everything still journals `unverified` until isolation lands anyway.
- **B — owner-signed artifact now.** Consequence: key custody + signing ceremony + expiry surface +
  Читаемость cost, defending a flank (compromised engine-side storage / second trust domain) that no
  named threat occupies; "turnstile before the wall" by ADR-0011's own words.
- **C — name + defer + P-5 (RECOMMENDED).** Consequence: zero build, honest floor stays honest,
  enforcement is hard-gated on the root actually existing; cost is purely sequencing — the
  write-plane stays authority-blind longer, which is ~0 today and mandatory-anyway later.

Choosing C = ratifying §1's four moves as text. Follow-up owner-pending inside C: **T-seed** (is the
owner's write channel to the node genuinely disjoint from the deploy tree the gateway runs from?) and
**T-scope** (project- vs platform-scoped registry if agents-manager serves multiple projects) — both
go to a critic pass before P-5 may ever be marked green.

## 4. Residual — what survives EVERY choice (do not misread "root picked" as "threat closed")

- **P-2 / gateway-dup (Attack 2):** a sanctioned host that double-fires produces two legitimately
  vouched stamps — both pass any root, both poison the append-only log. Fix lives in agents-manager
  ingress dedup. Under B this reads WORSE (two valid signatures look more trustworthy).
- **T5 / input forgery (Attack 3):** every root validates WHO stamps, never WHAT the legitimate
  stamper was fed; agent-writable `.gateway/**` config upstream of the resolver forges
  `boundaryIdentity` through an honest stamp. Needs the non-goal invariant + the
  `forge-boundary-identity` adversarial test (sequence item 7 of the synthesis — free, text, approve
  regardless of this fork).
- **Compromised-but-legitimate host (Attack 6):** structurally outside what any provenance mechanism
  can answer; needs a different control class (attestation, rotation, hardening). Out of decision 4
  by construction — named here so it is never claimed later.

Decision 4 narrows attacks 1/4/5 only. Attacks 2/3/6 are exactly as open after this decision as
before it — that sentence belongs in the same breath as the ratification.

## Refinement 2026-08-12 — paper-freeze hybrid (verified)

> This does NOT change the recommendation. C stays the choice; A's "sooner/stronger floor" claim was
> refuted (A's own bootstrap section gates population on the same M3 + P-2 condition as C's P-5 — no
> earlier teeth). This refines **HOW to execute C** by borrowing the project's own already-PASSed
> pattern.

**The hybrid in one line:** ratify C's four moves as-is, AND additionally commit an INERT empty
`seam-authority-registry.json` + a loader stub NOW — zero call-sites, zero enforcement — exactly the
paper-freeze pattern already reviewer-PASSed for `ports/principal-{resolver,stamper}.ts` (187/187),
plus make P-5 machine-checked instead of prose-only.

### The two additions on top of §1's four moves

1. **Inert artifact now (paper-freeze).** An empty `seam-authority-registry.json` (schema-shaped but
   `subjects: []`) + loader stub with **no call-sites and no enforcement path**. Value over pure prose:
   - a **concrete, testable artifact** the schema/loader can be unit-frozen against before any teeth
     exist (same as the frozen ports);
   - a **canary** — "can the `agent-uid` write this path?" — that **empirically dates** when the
     isolation boundary (ADR-0011 ISO-2→ISO-3, sequence step 4) actually starts biting, instead of
     that fact living only as prose in §2. Today at same-uid the canary is expected RED (agent CAN
     write it) — which is precisely the honest signal that P-5's write-channel-disjoint clause is not
     yet satisfiable, made observable rather than asserted.
2. **P-5 machine-checked, not prose-only.** A test/lint tripwire that **fails if any
   enforcement-flip code path exists while the registry is empty/absent**. Rationale: this project has
   a **documented prose-precondition rot precedent** — the pult/HANDOFF asserted "Stage-1 uncommitted"
   for a session *after* it had actually been merged (commit `3474cd1`), the **FORK-1 drift**. A
   markdown gate sitting among dozens of files is a *proven* rot vector here; a machine-checked gate
   cannot silently drift out of sync with reality the way that prose precondition did. This converts
   P-5 from "a sentence someone must remember to honor" into "a build that goes red if violated."

### Why machine-checked P-5 beats prose

- **Prose gates rot; this one demonstrably did** (FORK-1 drift, `3474cd1`) — the precondition text and
  the on-disk truth diverged silently for a whole session. A tripwire fails loudly at exactly the
  moment enforcement code appears ahead of a populated root, so the gate cannot be forgotten, skimmed,
  or contradicted by an out-of-date HANDOFF.
- It is **strictly additive** to C — it does not book any guarantee same-uid reality can't cash; the
  registry stays empty and the resolver stays authority-blind until sequence steps 3+4 land. It only
  makes "we haven't flipped yet" a *checked fact* rather than a *claimed one*.

### «строй»-gated — this stays paper until the owner says «строй»

Committing even an **inert** artifact = **code-on-disk**, and the doc-tree rule «на диск — только по
явному "строй" владельца» applies without exception here. So this refinement, like §1, is a **paper
decision only**: it *describes* the hybrid (files to add, tripwire to write) and does **not** create
`seam-authority-registry.json`, the loader stub, or the P-5 tripwire until the owner explicitly says
«строй». Additive, DESIGN-phase, no code, no commit. The P-2 block (sequence step 3 / P-2 fix before
any wiring) is unchanged — the inert artifact wires nothing, so it does not touch that block.
