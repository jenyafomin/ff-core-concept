---
type: decision
status: decided
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: system-architect (BOUNDARY TOPOLOGY — where the seam owner physically sits, made consistent with decision-4 = C)
title: "FORK — owner-decision 5: seam topology (co-located / signed-token / standalone-sidecar / broker-seed), gated on decision-4 = C"
decides: "M5-synthesis §1/§6 decision 5 — the physical form of the principal-stamp seam"
depends-on: "decision 4 = C (defer root + name Constitution clamp + P-5). 5(form) inherits the named root; 5 becomes REAL only after uid-split + P-5-green."
resolution: >
  DECIDED 2026-08-12 (D5-main = broker-seed) — decided-BUNDLED-with-D4, whose converged package supplies the
  named antecedent this fork depends on. Broker-seed = a distinct stamp MODULE at the host tier, co-located for
  now, unreachable by the T-agent unit, extractable later; both exits (→ standalone / → signed-token) reserved
  without touching the frozen `write(act): Ack` contract. Named as TEXT only — becomes REAL after uid-split +
  P-5. The module-in-gateway-vs-standalone SUB-FORK stays OPEN (coupled to gateway-extraction / `coupling=0`,
  ADR-0006, external to M5). Provenance: ratified via owner delegation 2026-08-12 "answer as I would" —
  reversible if owner disagrees. Canonical verdict: ./2026-08-12-owner-eye-forks/SYNTHESIS-owner-eye-verdicts.md (D5-main)."
related:
  - ../m5-surface-identity/design/01-topology-options.design.md    # A co-located · B token · C sidecar · D defer; 3 trust tiers; §3 broker-seed shape
  - ../m5-surface-identity/design/03-topology-redteam.critic.md     # RT3 all=theatre under P-2 · RT5 standalone-sidecar = false-closure
  - ./FORK-decision4-root-of-trust.decision.md                     # decision 4 = C; sequence: 5 depends on 4-name; standalone legit only AFTER named root
  - ../m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md # §1 topology rec, §6 owner sequence item 5
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md   # ISO-2→ISO-3; host=seam owner; ISO-3-first rejected as premature; P-1..P-5
  - ../../../../../../architecture/ADR/ADR-0006-strangler-gateway-extraction.md  # coupling=0 / extraction direction (external to M5)
phase: DESIGN — paper decision only. NO code, NO commits.
---

# FORK — decision 5: seam topology

> Choose in under 2 minutes. This is decision 5 of the M5 sequence; it is **downstream of decision 4 = C**
> and inherits its logic wholesale: **you can NAME the form now; it only becomes REAL after the uid/process
> split lands and P-5 goes green.** Like decision 4, the honest verdict is DEFER-until-the-boundary-is-real —
> what you pick today is a *shape reserved*, not a thing built.

## 0. Reframe (same shape as decision 4)

Decision 4 proved the four root-of-trust options were "one path at three moments in time," and that A's
guarantee is *empty at same-uid ISO-2*. Topology is the twin of that finding on the **placement** axis: the
four forms are not rivals, they are **one seam at increasing distances from the host** — and every distance's
security payoff is unarmed until the uid/process split (ADR-0011 execution) turns a filesystem/process
convention into a kernel-enforced boundary. So the real decision-5 question is not "which box" but
**"what is the minimal honest placement that reserves the growth path without booking a guarantee today's
same-uid reality cannot cash."** That is exactly what "broker-seed" is.

## 1. The four options, one line each

- **Co-located (A)** — engine linked INTO the seam-owning host (gateway); host authenticates *and* stamps in
  one process. Consequence: cheapest (reuses the existing spawn boundary), but the stamper IS the flaky
  process → **worst P-2 dup exposure**, and it **breaks `coupling=0`** (gateway imports engine, fighting the
  ratified extraction direction, ADR-0006).
- **Signed-token (B)** — engine as its own daemon; gateway mints a crypto-signed identity token carried over
  IPC; engine verifies + stamps. Consequence: correct ISO-3 end-state form, best structural dup answer
  (nonce at verifier) — but it is **the crypto "turnstile before the wall"** ADR-0011 explicitly defers;
  keys/rotation/issuer infra overshoot a same-machine boundary, and two dup deliveries still mint two
  *validly-signed* tokens (signature ≠ dedup).
- **Standalone-sidecar (C)** — a dedicated broker *process*, separate from gateway and engine, as sole seam
  owner over a peer-cred socket. Consequence: right long-term governance shape (issuer-of-the-issuer,
  `coupling=0` preserved), **BUT built now it is false-closure theatre** (RT5): a sidecar whose bootstrap
  lives in the same pm2/deploy as the gateway reads to a future auditor as "independently validated" when it
  isn't — **more dangerous than an honestly-open gap.**
- **Broker-seed (RECOMMENDED)** — the seam owner is a **distinct stamp MODULE at the host tier** (own
  uid→subject registry + `seamAuthority` logic), *co-located for now* but factored so it is unreachable by
  the T-agent unit and extractable later. Consequence: honest `unverified` floor today, zero new process /
  zero crypto, and the extraction (→ standalone) or crypto-upgrade (→ token) both stay open **without
  touching the frozen `write(act): Ack` contract.**

## 2. Legitimacy under decision-4 = C (deferred root, P-5 pending)

Decision 4 pinned the rule the topology red-team demands: **a standalone seam owner is legitimate ONLY after
an out-of-band root of trust is NAMED** (FORK-4 §2; synthesis §1). Applying that clamp now:

| Option | Legitimate to BUILD now? | Why |
|---|---|---|
| Co-located (A) | ❌ as an end-state | Worst P-2 exposure; breaks `coupling=0`; guarantee empty at same-uid — same false-closure as adopting root-A now. |
| Signed-token (B) | ❌ | ISO-3-first prematurity ADR-0011 rejects; root-C deferred B for the identical reason. |
| Standalone-sidecar (C) | ❌ **now** | **False-closure (RT5).** Its `issuer:'sidecar:…'` in an append-only journal *actively misleads* before the root is named + uid-split lands. Legitimate only AFTER decision-4's root exists and the boundary is real. |
| Broker-seed | ✅ **as a NAMED shape** | Books no guarantee it can't cash: co-located = same honest `unverified` floor as today, but the module *seam* is reserved and extractable. This is the only honest move under a deferred root. |

**What "seed" means, precisely.** A seed is the seam owner *as a bounded module*, not yet a *process*: it has
its own registry, its own stamp logic, its own `seamAuthority` slot, and a hard rule that the T-agent unit
cannot write its inputs — but it runs in-host until (a) decision-4's root is populated and (b) the uid/process
split makes the boundary kernel-real. It is the **minimal honest step** because it changes nothing operationally
today (Витальность: no premature process to build) while pre-shaping the exact interface a later `git`-extraction
or token-upgrade will need. The seed is to topology what root-C's "name the mechanism, defer the content" is to
trust: reserve the form, refuse the empty guarantee.

## 3. The owner fork (pick one)

- **A — co-located now.** Consequence: cheapest wiring, but you marry engine to the flaky gateway, break the
  extraction direction, and take the worst dup exposure — a sticky coupling for a guarantee that is empty
  until uid-split anyway.
- **B — signed-token now.** Consequence: you build the ISO-3 crypto turnstile over a same-machine wall that
  isn't there yet — key custody, rotation, replay surface — defending a second trust domain no named threat
  occupies today.
- **C — standalone-sidecar now.** Consequence: you stand up the *right* governance process at the *wrong*
  time — before decision-4's root exists it is RT5 false-closure, journaling `issuer:'sidecar'` that reads as
  "validated" when its own bootstrap is gateway-adjacent. Legitimate later, harmful now.
- **Broker-seed — name the module, defer the process, inherit root-C, keep both exits open (RECOMMENDED).**
  Consequence: zero build, honest floor stays honest, `coupling=0` preserved, and the standalone-vs-in-gateway
  sub-fork is *correctly left open* (it is coupled to the gateway-extraction decision, external to M5).

Choosing broker-seed = ratifying §1's shape as **text**: seam owner is a distinct governed module at the host
tier, engine trusts *only* its stamp, its inputs are disjoint from every agent-writable path, and the ISO-3
upgrade (→ token) / extraction (→ standalone) are reserved, not built.

## 4. Sequence dependency (stated once, sharply)

**5(form) can be NAMED now; 5 becomes REAL only after uid-split + P-5.** Concretely, inheriting FORK-4's table:

1. **Decide 4 = C** (root named, P-5 registered) — *prerequisite; already the recommendation.*
2. **Decide 5 = broker-seed** (this file) — form named as text; **sub-fork module-in-gateway vs standalone
   stays OPEN**, coupled to the gateway-extraction / `coupling=0` decision (ADR-0006), external to M5.
3. **P-2 fix ordered in parallel** (agents-manager ingress dedup) — no topology fixes it; any wiring before
   its verified fix = theatre (RT3, synthesis §4).
4. **Isolation execution** (uid/process split, real out-of-process engine at M3) — this is what turns the
   broker-seed's "agent can't reach it" from convention into enforcement, and what first makes a *standalone*
   sidecar legitimate rather than false-closure.
5. **P-5 → green** (root populated) — only after 3 AND 4. Then the seed may extract to a standalone process
   honestly.
6. **Enforcement flip ③** — P-1…P-5 all green + owner nod.

Dependency in one line: **5(name) depends on 4(name); 5(real, extraction to standalone) depends on uid-split
+ P-5; ③ depends on P-2 + P-5. Nothing depends on B until a second trust domain appears.**

## 5. Topology-invariant honesty (do not misread "form picked" as "threat closed")

Carried verbatim from the red-team so it is never quietly dropped:

- **Picking a topology closes NEITHER G4 NOR P-2** (RT1, RT3). "We chose the seam form" ≠ "we closed the
  threat." G4 is answered by decision 4's root, not by decision 5's placement.
- **T5 (agent self-edits its `.gateway/**` config-cascade) is closed by NO topology** (RT2) — separate track
  (synthesis §5: non-goal invariant + `forge-boundary-identity` test, free text).
- **The standalone extraction is the one move with a false-closure trapdoor** — it must not happen before the
  named root + real boundary, or the journal records misleading provenance in a retrofit-impossible window.

## 6. 7-values lens

- **Витальность (vitality).** The whole point of "seed, not sidecar": **do not build the standalone process
  prematurely.** A process stood up against a threat that cannot yet fire (no stamp wants trust > `unverified`
  before enforcement, and the boundary isn't kernel-real) is dead weight *and* an RT5 false-closure liability.
  The seed costs zero and stays alive as a reserved shape.
- **Доверие (trust).** Trust must be *earned by structure*, not *asserted by placement*. Broker-seed keeps the
  floor honestly `unverified` and hard-gates any upgrade on the boundary actually existing (P-5) — it refuses
  to let a box-diagram stand in for enforcement. A standalone sidecar built now would *counterfeit* trust in
  the append-only journal; the seed cannot.
- **Модуль / Реляционность (modularity / relationality — the marketplace future).** The seed is a **clean
  module boundary reserved on purpose**: engine trusts *only* "the broker's principal," never the gateway or
  agent directly. That is precisely the seam a future plugin/marketplace host will plug into — a second trust
  domain becomes "the broker adds token issuance (B)," a *resolver* change, not a journal migration. Naming
  the module now, without fusing it into the gateway, keeps the plug-in seam of the north-star architecture
  open at ~zero cost — the modularity the whole platform is built to preserve.

---

**Recommendation: broker-seed — name the seam module now, defer the process, inherit decision-4's root, keep
extraction (→ standalone) and crypto (→ token) both open.** Confidence: medium-high on the *shape*; the
module-in-gateway-vs-standalone sub-fork is genuinely owner-owned and coupled to the gateway-extraction
decision this file does not close. Like decision 4, most of this is DEFER-until-boundary-real — what you ratify
today is text.
