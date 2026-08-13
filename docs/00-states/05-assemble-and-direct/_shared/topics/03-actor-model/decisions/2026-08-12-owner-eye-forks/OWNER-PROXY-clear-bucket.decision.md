---
type: decision
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: owner-proxy
title: "OWNER-PROXY — the M5 'clear bucket' (D2 / D5-main / D8 / D9) answered as the owner would, with a nuance check on each"
scope: Project (FF-Personal-Management) · trust-line / actor-model · branch refactor-tree
phase: DESIGN — this is a proxy read, not a ratification. It does not commit the owner. The owner still has to say the words.
related:
  - ../../m5-surface-identity/design/04-SYNTHESIS-m5-decision-ready.md   # §6/§7 — the 9-item sequence this bucket is carved from
  - ../RATIFY-2026-08-12-adr-0010-0011.decision.md                       # D2 target
  - ../FORK-decision5-topology.decision.md                               # D5-main target
  - ../FORK-decision4-root-of-trust.decision.md                          # the un-ratified prerequisite D5-main quietly depends on
  - ../../ingest/F-D-sheets-ingest.design.md                             # D8 target
  - ../F2-seed-fixtures.spec.md                                          # D9 target
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
---

# OWNER-PROXY — clear bucket, answered through the owner's eyes

> Method: for each item I (a) read the actual target doc(s) verbatim, (b) answered as the owner would given
> his stance (don't rush to build; 80/20 on the critical fifth; concepts stay revisable; but — recent and
> explicit — "moved a gate or it doesn't count," bias toward decisive motion on what is genuinely clear), and
> (c) went looking specifically for a clause he'd balk at rather than assuming the synthesis's own framing is
> already the last word. Three of four survive as truly clear. One does not, and I say so below rather than
> rubber-stamping the batch.

---

## D2 — ratify ADR-0010 §③-bis + ADR-0011

**Owner-eye answer: RATIFY, now, as written.**

**Why he'd say this.** This is exactly the shape of move his "moved a gate or it doesn't count" rule was
written for: zero code, zero risk, and M5 is *formally* sitting waiting on this specific input (the synthesis
says so at §6 item 2, and ADR-0010's own status line names the ratification as the thing that was missing).
It also matches "don't rush to build" from the other side — this ratifies *direction*, not *behavior*; nothing
about enforcement moves. Touches **Доверие** (freezes the authority≠attribution invariant + G1/G2/G3 as text)
and **Тождество** (G1: never silently rewrite `Act.actor`) directly — the two values this whole trust-line
exists to serve.

**Confidence: high. Genuinely clear — I looked for a clause to balk at and didn't find one.**
I read §③-bis (ADR-0010:116-228) and ADR-0011's full Decision + Ratification sections end to end, specifically
hunting for an overclaim an owner would catch on a careful read:
- The doc repeats, in at least four separate places (this ratify file, ADR-0010's own Ratification section,
  ADR-0011's own Ratification section, and the T5-nongoal doc), the identical honest-limit sentence: reserving
  `seamAuthority` does **not** make identity unforgeable without a *named* out-of-band root — every stamp
  keeps reading `unverified` until that root exists. That's the sentence a sharp owner would look for first
  (does the text quietly claim more than it does?), and it's there, not buried.
- Enforcement (Decision ③) is explicitly and repeatedly *not* included — "ратификация текста НЕ разблокирует
  enforcement" appears verbatim, and the flip is independently gated on P-1…P-4.
- A prior adversarial critic pass already ran on this exact file (visible inline, dated 2026-08-12) and found
  no overclaim, confirmed the honest-limit clause isn't a single quietly-closed spot, and fixed two unrelated
  broken relative links elsewhere. I re-derived the same conclusion independently rather than trusting the
  critic's badge — it holds up.
- One thing worth naming but **not** worth demoting the decision over: the critic itself flagged that
  `ADR-0011`'s flat `Status: **approved**` (vs ADR-0010's granular `SPLIT`) could be misread by someone who
  greps only the bolded word and skips the qualifier on the same line. Low risk, single-ADR status is honest
  for a single-decision ADR — noted, not a reason to withhold ratification.

This is the one item in the batch that is exactly as clean as claimed.

---

## D5-main — topology = broker-seed

**Owner-eye answer: CHOOSE broker-seed — but as a NAME, and only in the same breath as nodding decision-4 = C.**

**Why he'd say this.** Broker-seed is the "flexibility on concepts" move made concrete: it books zero
guarantee the same-uid reality can't cash (co-located today, unreachable-to-agent by convention only), while
keeping both real exits — extract to standalone, or upgrade to signed tokens — open without touching the
frozen `write(act): Ack` contract. That's naming a shape, not pouring concrete, which is exactly what "don't
build before you understand why" asks for. It also protects **Витальность** on the doc's own reading — no
process stood up against a threat (dup-forged trust) that can't fire yet — and keeps the **Реляционность /
modularity** door open for the marketplace north star (engine trusts only "the broker's principal," a clean
future plug-point).

**Confidence: medium — and here is the nuance I'd flag loudly rather than wave through.**
This is the one item where the "clear bucket" framing undersells a real coupling. `FORK-decision5-topology.
decision.md`'s own frontmatter states `depends-on: "decision 4 = C"`, and its body (§4) is explicit: *"5(form)
can be NAMED now; 5 becomes REAL only after uid-split + P-5,"* inheriting decision-4's table wholesale. Decision
4 — the out-of-band root of trust for `seamAuthority` — is **not** in today's four-item batch, and its own
file's frontmatter reads `status: draft (owner-choice pending)`. So strictly, choosing broker-seed today names
a shape that is formally downstream of a fork the owner hasn't been asked to close in this sitting.

I don't think this should fully demote D5-main to "needs deeper review" — the two forks are the same move
(defer-build, name-the-mechanism) at two adjacent layers, self-consistent with each other, both zero-code and
reversible, and the doc's own confidence read ("medium-high on the shape") already telegraphs this isn't a
rubber-stamp. But an owner who signs off on D5-main alone, without also at least provisionally nodding
decision-4 = C, is ratifying a dependent clause without its antecedent. **Practical fix, not a blocker:** present
D2 + decision-4 = C + D5-main = broker-seed as one linked yes/no, not three independent stamps — which the
source docs themselves already argue is the honest sequence (`4 → 5`, stated "once, sharply," in both files).

---

## D8 — Sheets ingest (F-D)

**Owner-eye answer: DEFER-but-don't-block M5 — but "just an adapter" undersells what pulling this actually
opens up.**

**Why he'd say this.** The don't-block-M5 half is easy and matches his stance directly: the design doc itself
(§0) says *"do not ask for F-D as a first move… ask on the wave of motivation,"* i.e. the doc is *already*
telling him not to spend attention here yet. That's 80/20 discipline in the doc's own words, not something I'm
imposing.

**Confidence: medium — I found the nuance the prompt asked me to hunt for, and it's real, not cosmetic.**
The framing "scope = just an adapter" is not quite what the source doc says. `F-D-sheets-ingest.design.md §0`
states plainly: *"the F-D sanction is expensive attention: it also lights up D-1 (the 7-referent-class policy +
classifier-gap, where a naive fail-closed admission stalls ~100% of real rows)."* And §6's top open question
is explicitly **not** a single question — it's four bundled sub-forks (which read path; deletion/tombstone
semantics; sync actor identity; runner issuer id), one of which the doc itself calls "a semantic choice, not
an implementation detail." So "build real Sheets ingest?" isn't a yes/no the owner can wave through the moment
he decides to pull it — sanctioning F-D *is* opening D-1 and four sub-forks at once. The "CSV/non-secret export
cheaper than live connector" framing is accurate and is the doc's own top recommendation (option a in §6.1),
but it's a recommendation on *one* of four bundled questions, not the whole decision.

Net: the **don't-block-M5-now** half is clear and correctly proxied. The **"it's just an adapter, cheap when
you get to it"** half is optimistic framing that should be corrected before the owner is asked to act on it —
when he does pull this thread, it should arrive as "F-D is a 4-part bundle that also lights up D-1," not as a
one-line adapter task.

---

## D9 — canonical `protected_namespaces` seed in test fixtures

**Owner-eye answer: DO alongside next builder wave.**

**Why he'd say this.** This is the cleanest kind of "moved a gate" item: `F2-seed-fixtures.spec.md` is a fully
specified, test-only artifact — a canonical fixture helper + 16 named cases + a mutation-probe verification
plan — that closes a real, named coverage hole (H-0: 7 of 9 engine suites currently run F2 as a structural
no-op) without touching a single line of production code or the trust-line decisions above. It's exactly the
"free insurance, do it on the next pass" category his 80/20 stance reserves attention for elsewhere.

**Confidence: high. Genuinely clear, no demotion.**
I read the full spec: it's additive-only (new `test/fixtures/constitution.ts` + new
`test/f2-namespace-ceiling.test.ts`), explicitly scopes out a real adjacent bug (hardcoded `'project:ff'` scope
in `canWriteNamespace`) rather than quietly folding it in, and has a built-in adversarial check (§4.2 step 2:
comment out the guard, confirm the new tests go red, then restore) so the coverage claim is falsifiable, not
just asserted. The one thing worth a one-line flag for whoever executes it: §2.C (de-inerting the 7 currently
no-op suites) is explicitly marked optional and carries its own "STOP and flag, don't paper over" caveat if it
surfaces a latent assumption in an existing suite — that's the spec correctly refusing to hide a possible
regression inside a "small, prod-untouched" test change. Not a reason to wait; a reason to keep that caveat
alive when it's executed.

---

## Summary table

| Decision | Owner-eye answer | Confidence | Clear / demoted (reason) |
|---|---|---|---|
| D2 — ratify ADR-0010 §③-bis + ADR-0011 | RATIFY now, as written | high | **Clear.** Checked §③-bis + ADR-0011 text directly for an overclaim; found none — honest-limit clause present in 4 places, enforcement explicitly excluded everywhere. |
| D5-main — topology = broker-seed | CHOOSE broker-seed, as a name only | medium | **Nuance flagged, not fully demoted.** `FORK-decision5-topology.decision.md` frontmatter states `depends-on: decision 4 = C`; decision-4 is `status: draft (owner-choice pending)` and outside today's batch — recommend bundling "decision-4 = C + D5-main = broker-seed" as one linked ask, not two independent stamps. |
| D8 — Sheets ingest (F-D) | DEFER-but-don't-block M5 | medium | **Nuance flagged.** "Just an adapter" undersells it — the design doc itself calls the F-D sanction "expensive attention" that also opens D-1 (classifier-gap) plus 4 bundled sub-forks (source, deletion semantics, actor id, issuer id); the don't-block-M5 half is clear, the "cheap adapter" framing is not. |
| D9 — F2-seed fixtures | DO alongside next builder wave | high | **Clear.** Fully specced, test-only, additive, includes its own mutation-probe falsifiability check and an explicit "don't paper over" caveat on the one optional sub-item that touches existing suites. |
