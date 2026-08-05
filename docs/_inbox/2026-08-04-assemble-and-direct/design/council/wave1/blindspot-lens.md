---
node_type: insight
lens: abstraction-blindspot
title: "Blind-spot lens — what the S-A..S-D framing systematically cannot see"
status: draft
topic: assemble-and-direct
owner: jenya.stasik@gmail.com
date: 2026-08-04
answers: council-brief.md#5
---

# Blind-spot lens: go UP on "собрать и направить"

> My job is not to argue order. It is to name the pattern the detailed lenses miss and the reframe
> that makes execution cheaper. One level up.

## 1. Reframe — what is this council REALLY solving?

The stated question — "is S-A..S-D the right split and order?" — is a **proxy**. Ordering four
horizontal plans presumes the blocker is *sequencing*. It is not.

**The real problem:** the project has **no shared, reality-grounded definition of "green / done / true."**
Every layer records *intent as if it were fact*, and nothing forces intent to become real or be retracted.
So the project literally **cannot tell how close it is to "can build"** — because "built" and "true" are
self-declared, not earned. Ordering four plans just schedules four more sources of the same drift.

One sentence: *This council is trying to install a single reality-binding — a definition of "true" the
whole substrate must pass through — before it splits work; the S-A..S-D order is a stand-in for that
missing invariant.*

## 2. The generating pattern behind all 5 truths

Test the handed hypothesis ("built artifacts drift from the reality they claim") — true, but *drift is the
symptom*. What GENERATES drift?

| Truth | Claim | Reality | Why they diverged |
|---|---|---|---|
| 1 durable unused | "память навсегда построена" | prod runs on MemoryStore | durable is **opt-in** |
| 2 contract empty | contract = brain↔agents truth | `balance-observer` overtook it | contract is **opt-in** |
| 3 canon lies | status green/present | 0 lines, Vitality=0 code | status is **self-declared** |
| 4 M2 fake-green | "M2 green" | bypassed PEP + same-as | green is **self-declared / gate opt-in** |
| 5 linear pult | STATE.md = the map | real branches unrepresented | map is **hand-authored** |

The single generator: **every truth-claim in the system is DECLARED (push, opt-in, hand-written) rather
than DERIVED (pull, gate-enforced, observed from a real run).** There is no *door* reality must pass
through, so declarations float free.

The killer detail: **the project already discovered the fix and filed it as one local lesson** — truth #4:
*"PEP обязан быть дверью, не opt-in."* That is not a ga-rentacar lesson. **It is the universal law all five
truths obey.** The antidote is in the project's own values (PEP-as-door, Readability=passport, epistemic
status = label from reality, "код = реальность" SoT-Level-D) — it just hasn't been applied to *itself*.

## 3. Blind spots — systematically invisible in this framing

**B1 — No drift-detector; the census IS the missing organ, run by hand.** Nobody would have known durable
is unused / contract empty / canon lying without an expensive manual census. The system has **no cheap,
continuous self-observation** — which is precisely **Vitality = 0 code**. Vitality is mis-ranked in the
frame as "one of 7 values not yet built." It is not one-of-seven; it is the **meta-organ whose absence let
the other four truths stay hidden.** The substrate cannot see itself.

**B2 — There is no first real agent-USER; success is measured supply-side.** The substrate is "for agents,"
but there is *1 agent, on a branch, not in main, against an empty contract.* "Green" is defined by
**builders shipping**, never by **an agent living on the graph in anger.** No consumer pulls the design →
everything built is a guess about what a user would need. Build% is the wrong meter; **usage% is invisible.**

**B3 — The council's method mirrors the disease it's diagnosing.** It proposes **four sequential horizontal
plans** — the exact *linear, declarative* shape it condemns in the pult (S-D). And "can finally start
building" assumes the blocker is *planning*; but a plan is itself a declaration. **No amount of planning
produces the missing reality-binding — only one real run does.** The frame cannot see that its own output
(a better plan) is the same category as the problem (unearned declarations).

## 4. The reframe (one mental model + one invariant)

**Mental model:** stop keeping a *ledger of intentions*; install a **door + a meter.** A claim is not a
note you write; it is a **reading taken after reality passed through the mandatory door.** Push-declared
status → **pull-derived status.**

**One invariant (promote truth #4 to universal law):**

> **Nothing is "green" unless a real run through the mandatory door (PEP) — on the durable store, read by a
> real agent — PRODUCED that status. Status is generated from the run, never hand-written.**

Consequence: this **collapses S-A/S-B/S-C/S-D into ONE thin vertical slice.** Take one real ga-rentacar
fact (S-B) → force it through PEP, the door (S-A gate) → onto durable storage, MemoryStore off (S-A
durable-adoption) → read by the one agent via a minimal *real* contract (S-C) → and let the status card be
**auto-derived from that run** (S-D graph-pult as generated view, not hand-authored map). **One slice pierces
all four layers and, for the first time, makes "green" mean something.** After that, horizontal deepening is
cheap: you have a template and a working definition of done.

## 5. Order implication

**Do NOT sequence S-A..S-D as four horizontal plans.** First build a **"hello-world vertical":** one fact,
one door, durable store, one agent-read, auto-derived status. That single slice is the literal 20% that
de-risks the 80% — and it converts the unanswerable "can we build?" into the answered "we already built the
thinnest *true* thing." Only then fan out horizontally, each layer gated by **"used, not merely built."**
And build S-D's graph-pult by **generating it from reality** (auto-view), never by hand-authoring a new map —
a hand-authored graph is just a prettier declaration that will drift again (prefer auto-views: doc-tree law 8).

## 6. Stress-test of the council's own shape

Four sequential horizontal plans = four supply-side builds with **no consumer pulling them** → guaranteed
re-drift, and the same linear shape it criticizes. Simpler structure: **1 vertical proof-slice** (fixes the
*definition* of green + installs the reality-binding) → **then** thin per-layer deepening, each gated by
usage. Councils and plans are declarations too; the cheapest de-risk on the board is a *running slice*, not a
better plan.

## What this model does NOT cover
- It does not choose the value-arbitration (7 values → ADR): that is a genuine owner fork, orthogonal to the
  door/meter reframe. Flag, don't fold.
- The vertical slice may be genuinely messy because the contract is empty and the gateway has 2 live bugs —
  the messiness is the *point* (it exposes which layers are load-bearing), but it is a real cost, not free.
- "Auto-derived status" needs a minimal observer to exist — i.e. it bootstraps Vitality; that is small but
  non-zero work and must be named as the slice's true first brick.

## Recommended next step
Council should reframe brief-Q1: not "order of S-A..S-D" but "define the ONE vertical proof-slice + the
green-invariant." Hand the slice's engineering shape to system-architect; hand "durable-adoption + value
arbitration" острые-развилки to Fable; let Opus structure the *post-slice* horizontal deepening.
