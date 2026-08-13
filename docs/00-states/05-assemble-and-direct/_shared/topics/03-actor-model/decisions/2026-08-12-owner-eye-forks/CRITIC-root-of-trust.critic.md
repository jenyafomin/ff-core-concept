---
type: critic
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: critic (adversarial red-team over BOTH sides of owner-decision 4 — root of trust for `seamAuthority`, A vs C)
title: "CRITIC — root of trust (D4/G4): where both steelmen are theater, and what neither will volunteer"
scope: M5 surface-identity, decision 4 (A engine-registry vs C name+defer+P-5) — DESIGN phase, no code
targets:
  - ../../FORK-decision4-root-of-trust.decision.md
  - ../../../m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md
  - ../../../m5-surface-identity/design/root-of-trust/01-engine-registry.design.md
  - ../../../m5-surface-identity/design/root-of-trust/03-defer-or-reuse-capability.design.md
  - ../../../m5-surface-identity/design/root-of-trust/04-threat-model.critic.md
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
  - ../../FORK-decision5-topology.decision.md
  - ../../OWNER-FORKS-2026-08-12.decision.md
  - ../../../tracks/01-root-of-trust/01-how-to-implement.design.md
  - ../../../../../../../_shared/topics/05-strategy-path-and-next/synthesis/01-STRATEGY-HANDOFF.synthesis.md
verified-against: direct read of all files above, 2026-08-12
---

# CRITIC — root of trust (D4): stress-test of A vs C, and the meta-failure both sides share

> Not re-deriving A or C's case — both are already argued at length in their own design docs. This file
> attacks the arguments, and names what a partisan of either side has an incentive not to say.

---

## 1. Theater test — does EITHER option change what an attacker-agent can do today?

**No. Neither does, and every artifact in this decision chain already concedes it.**

- `04-threat-model.critic.md` (own summary table, lines 190-197): of the 3 attacks D4 could plausibly
  narrow (1, 4, 5), A scores **PASS(conditional)/PARTIAL/CONCERN(auditable)**, C scores
  **PARTIAL/PARTIAL/UNRESOLVED(inherited, not designed)**. On the table's own numbers, **A ties-or-beats C
  on 2 of 3 attacks D4 touches** (Attack 1: A "PASS conditional" vs C "PARTIAL — removes the claim, not
  the bootstrap question"; Attack 5: A "CONCERN, most auditable" vs C "UNRESOLVED... simply un-inspected").
  Yet `FORK-decision4-root-of-trust.decision.md:58-62` asserts C "beats adopt-A-now" and buys "everything A
  buys" — a claim the project's own threat table does not fully support. This is not a reason to flip to A;
  it is a **contradiction inside the C steelman's own evidence base** that a partisan of C has every reason
  to not highlight.
- The reason neither matters *today* is stated three separate times, most sharply in
  `01-engine-registry.design.md:75-79,199-209` (§7, residual leak #1): engine and the spawned `claude -p`
  child share **one OS uid, in-process**. A filesystem-owner boundary between two things sharing a uid is
  **convention, not enforcement** — "its teeth arrive only when the engine is a separate privileged
  principal... an ADR-0011 *execution* prerequisite, NOT something the registry can grant itself." C's own
  design (`03-defer-or-reuse-capability.design.md:63-72`, C1.2) reaches the identical conclusion from the
  opposite direction: "defer changes nothing today... every act reads `unverified` already."
- **So the honest reading is sharper than "neither, until ISO-2":** the isolation model (ISO-2 direction)
  is already *ratified as text* (`ADR-0011:4`, Status `approved`) — what's missing is not the label but the
  **uid/process split itself**, i.e. *execution*, not decision. And that execution has **no track yet**:
  `tracks/01-root-of-trust/01-how-to-implement.design.md:112` states plainly "No track for that split exists
  yet under `tracks/`... not yet created." D4 is therefore not blocked on a *decision* called ISO-2 — it is
  blocked on a *build* that hasn't even been scoped. Calling this "blocked on ISO-2" (a decision already
  made) undersells how far away the real precondition is.

**Classification: CRITICAL (framing distortion in the C steelman's supporting evidence).**

---

## 2. False-closure danger — which option risks the more dangerous lie in the append-only log?

Both design docs correctly flag the obvious false-closure risk of A: populating the registry before the
uid-split "certif[ies] a host known to double-stamp behind a boundary that doesn't structurally exist yet"
(`01-how-to-implement.design.md:108-112`), and A's own §5 (`01-engine-registry.design.md:155-171`) already
refuses TOFU and gates the first entry on P-2 + a real IPC boundary. So the *documented* A-side false-closure
risk is already self-mitigated in A's own spec — a partisan attacking A on this point is attacking a straw
version of it, not the version on the table.

**The subtler, un-volunteered risk runs the other way — C's naming choice manufactures a second, quieter
false-closure, this one in the mental model rather than the log:**

- C's mechanism is named `policy:seam-authority`, explicitly pitched as reuse of "the ADR-0004 §D3
  **Constitution clamp** pattern" (`03-defer-or-reuse-capability.design.md:112,120-124`;
  `01-how-to-implement.design.md:64-71`).
- The *actual* Constitution clamp is not hypothetical — it is **live, enforced code today**:
  `engine.ts:60` `assertConstitution` (fail-stop-on-start), cited as the load-bearing precedent in
  `01-engine-registry.design.md:19,117`. `protected_namespaces`/`can_write:[]` genuinely gate writes to
  canonical/control-plane state *right now*.
- `policy:seam-authority` is **not** that. It is an unbuilt, unpopulated, not-yet-wired node that merely
  *borrows the same vocabulary and class name* as something that already has teeth elsewhere in the same
  codebase. A future engineer (or a future agent doing a quick `grep 'Constitution clamp'`) has no textual
  signal distinguishing "the clamp that's live" from "the clamp that's a reserved name with nothing behind
  it" — both are described in identical language, in adjacent files, under the same ADR family.
- This is exactly the class of error `04-threat-model.critic.md` and `RT5` warn about for A's registry and
  for the sidecar (`issuer:'sidecar:…'` "read[ing] to a future auditor as independently vouched when it
  isn't," `01-engine-registry.design.md:31`, `FORK-decision5-topology.decision.md:50-52`) — except here the
  audience being misled isn't a log auditor, it's the **next engineer or agent session** that inherits this
  document tree and assumes `policy:seam-authority` already inherits the enforced Constitution's guarantees
  because the name says so.

**Classification: CONCERN.** Not fatal — it's a documentation/naming hazard, not a runtime one, and it is
cheap to fix (a one-line disambiguation: "reserved, unpopulated, zero enforcement" stamped wherever
`policy:seam-authority` is named). But as currently written, neither steelman's prose forces that
disambiguation, and C is the side more exposed to it because C's whole rhetorical case rests on "we're not
inventing anything new, we're reusing an already-solved pattern" (`03-defer-or-reuse-capability.design.md:41-43`)
— a framing that actively encourages conflating the two clamps.

---

## 3. Retrofit asymmetry — reversible-now vs locked-in-once-journaled?

`FORK-decision4-root-of-trust.decision.md:116-118` already concedes the headline claim here: "A's
'sooner/stronger floor' claim was refuted... no earlier teeth" — because A's own bootstrap section
(`01-engine-registry.design.md §5`) gates population on the identical P-2 + boundary condition C's P-5
does. So **A and C converge to the same schema, the same placement, the same bootstrap gate** — the delta
between choosing "A now" vs "C now" is not technical, it is which of two near-identical prose framings
becomes canonical. Both design docs independently converge on "ships EMPTY, TOFU rejected" as move #1
(`01-engine-registry.design.md:157-165`; `03-defer-or-reuse-capability.design.md:154-156`), which closes off
the one retrofit trap that would actually matter (an owner reading "adopt A" as license to seed the registry
today, at which point `seamAuthorityVerified:true` entries would be genuinely unretractable per ADR-0008
append-only).

**What is NOT symmetric, and is un-volunteered by the C side: P-5's own wording creates a new,
possibly-overbroad retrofit lock.** `ADR-0011:334` (P-5, added 2026-08-12): "**Флип ③ не вправе зеленеть,
пока P-5 красный**" — the enforcement flip ③ as a *whole* is blocked while P-5 is red, not just the
seamAuthority trust axis. But ADR-0011's own validation plan (`ADR-0011:229-241`, items 1-3: cross-IPC
forge-actor refusal, host-stamp-only PEP consult, distinguishing in-process from IPC acts) describes
properties that are about **G1 (refuse-not-rewrite `actor`)**, not about G4/`seamAuthority` trust elevation
at all — an engine can legitimately refuse a forged `actor:'user:admin'` while `seamAuthority` stays
`unverified` forever; refusal doesn't require a vouched root. By wording P-5 to gate "флип ③" wholesale
rather than "no stamp's trust axis may exceed `unverified`," **C's own gate, as ratified into ADR-0011,
risks blocking forge-actor enforcement (G1) behind a precondition (G4's root) that has nothing to do with
it** — a genuine scope-creep in what "enforcement flip" is defined to mean, introduced by this decision,
not present before it. Whether ③ is truly monolithic or should be split into independently-flippable
sub-gates is not answered anywhere in the read set.

**Classification: CONCERN** (retrofit-cheap on the *value*, as claimed; but the *gate wording* just
ratified may have silently coupled two independent enforcement properties — worth a follow-up before the
next session treats P-5 as settled).

---

## 4. Owner's real constraint — does C move a gate, or add one?

The owner's stated blocker, verbatim from the project's own strategy synthesis: **"10 итераций анализа
сдвинули 0 ворот готовности (G1-G5 = 🟥)"** (`_shared/topics/05-strategy-path-and-next/synthesis/01-STRATEGY-HANDOFF.synthesis.md:35`,
echoed at `analyses/03-reframe-keygoal.analysis.md:34`). This is the sharpest test either steelman has to
pass, and it cuts against the celebratory framing of "ratify C" more than either side admits:

- **Before this fork existed, ADR-0011 had four enforcement preconditions: P-1…P-4** (`ADR-0011:244-256`).
  P-1 (ratify ADR-0011) is closed by a *separate* act (FORK-2, ratifying the ADR text itself — not this
  fork). P-2 (gateway-dup fix) is untouched by D4 under every document read here — "no root choice touches
  it" (`FORK-decision4:72`), confirmed independently by the threat table's Attack 2 row
  (`04-threat-model.critic.md:69-89`, "FAIL — orthogonal" for A, B, *and* C alike). P-3 (field reserve) is a
  wholly separate owner-pending decision (`OWNER-FORKS-2026-08-12.decision.md` doesn't even list it as
  resolved). **P-4 is an explicit owner nod not yet given.**
- **Choosing C's recommended package does not turn any of P-1…P-4 green. It manufactures P-5** — a *new*
  fifth precondition (`FORK-decision4-root-of-trust.decision.md:51-53`; `ADR-0011:326-335`) whose own
  prerequisite (the uid/process split) has, as established in §1 above, **no track, no scope, and no
  session assigned to it yet.**
- Read against the owner's own metric, ratifying D4=C today is not "a gate moved" — it is **the finish line
  moving one gate further away**, dressed in the language of progress ("converts defer from omission into
  gate," `FORK-decision4:53`; "machine-checked... beats prose," `FORK-decision4:137-153`). The *process*
  hygiene win (an ambient assumption becomes a checkable gate) is real and worth having, but it is not the
  kind of "gate moved" the owner asked to see after 10 iterations of exactly this pattern — abstract
  progress that doesn't reduce distance to the one gate (P-2) that is both (a) universally agreed to be the
  true critical path and (b) fully within this project's power to fix today, unlike uid-split.
- **Symmetrically, "(a) adopt A now" does not move a gate either** — A's own design explicitly defers
  population to the same P-2+boundary condition (§3 above), so A produces the *same* zero-motion-on-P-1…P-4
  outcome C does; it just doesn't additionally invent P-5. On the owner's "gates moved" metric, **A is
  net-neutral and C is net-negative** (one new red gate, zero existing gates advanced) — a distinction
  neither side's prose foregrounds, because both are arguing the merits of the mechanism, not the arithmetic
  of the gate count.

**Classification: CRITICAL.** This is the finding most likely to matter to the owner directly: if the goal
is "move a gate," neither A nor C does that today, and C is the option that literally increases the gate
count while P-2 — the one gate every document agrees is the real blocker, unfixed since 2026-07-06 — sits
untouched by this entire session.

---

## 5. What both steelmen will structurally avoid volunteering

1. **D4 does not stand alone — it is the shallow layer of a 3-deep coupling neither side's argument
   depends on surfacing.** `FORK-decision5-topology.decision.md:9,102-115` states D5 (topology) is
   downstream of D4 and *also* explicitly "coupled to the gateway-extraction decision, external to M5"
   (ADR-0006 `coupling=0`) — and that outer decision has **no resolution doc anywhere in this read set**. A
   partisan arguing "A vs C" gets to treat D4 as a self-contained, closable question; in fact answering D4
   alone produces a *conditionally* final answer whose topology consequence (D5) can't be finalized until a
   decision this document doesn't even name is made elsewhere. Neither steelman benefits from surfacing that
   their "win" is provisional on an undecided outer fork.
2. **The uid/process-split track literally does not exist yet** (§1, §4 above) — the one fact that would
   most directly answer "how far away is this from mattering," and the one fact most damaging to *either*
   side's sense of urgency, so neither has an incentive to lead with it.
3. **P-2 is the actual critical path, and it has been named as such in at least four separate documents
   across this session** (`04-SYNTHESIS-m5-decision-ready.md §4`, `FORK-decision4 §2` step 3,
   `04-threat-model.critic.md` Attack 2 summary, `01-how-to-implement.design.md §4`) — yet none of those
   documents, nor this fork, record any action taken on it. `docs/01-organization/process/bugs/gateway-dup/INDEX.md`
   is `git diff`-modified in the current working tree (per `git status` at session start) but the fix status
   was not verified as part of assembling this critique. If it is still unfixed, then the entire D4
   exercise — regardless of A/B/C — is analysis spent on a question that cannot pay off until a different,
   already-identified, cross-repo bug is fixed. Both A and C partisans have reason to keep the conversation
   on their own mechanism rather than point at the actually-blocking, already-known, still-open bug.

---

## What I looked for but didn't find problems with

- **The `unverified`-floor safety argument (C1.2, `03-defer-or-reuse-capability.design.md:60-76`).** "Trust
  defaults down" and "degradation is toward refusal, not escalation" is well-grounded in G3 and consistent
  with everything else read — genuinely safe-by-construction, not spin.
- **TOFU rejection.** Both A and C explicitly refuse trust-on-first-use and require owner-manual seeding
  gated on P-2 + boundary reality. No daylight between them here, and it's the correct call either way.
- **Attack 6 (compromised-but-legitimate host) scoping.** All three artifacts are honest that no
  root-of-trust choice can ever answer this, and say so explicitly rather than letting it be implied solved.
  That's real intellectual honesty in the source material, not theater.

---

## Verdict

**Is D4 decidable NOW, or blocked-by X?**

D4 is decidable now only as a **paper/naming/sequencing** choice — and has in fact already been decided
that way three times over across this document tree (Fable's recommendation, the FORK file's own text, and
`tracks/01-how-to-implement.design.md:40`'s flat "Chosen") while its own frontmatter still reads `status:
draft (owner-choice pending)`. It is **not decidable as a security decision**, because at today's same-uid
ISO-2 reality neither A nor C changes what an attacker-agent can do — both float on a uid/process-split
track that does not yet exist. **D4 is blocked-by (1) the uid-split execution work, which has no track or
scope yet, and (2) P-2 (gateway-dup), the one gate every artifact agrees is the true critical path and which
this entire fork does not touch.** Ratifying C today is cheap and directionally correct — but on the owner's
own stated metric ("10 iterations, 0 gates moved"), it should be logged as **a new red gate created, not a
gate moved**, and the highest-leverage next action is ordering the P-2 fix, not re-litigating A vs C further.
