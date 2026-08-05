---
node_type: analysis
lens: value-product
date: 2026-08-04
topic: assemble-and-direct
input:
  - ../../00-fact-base.synthesis.md
  - ../../../census/01-brain-kernel.census.md
  - ../../../census/02-ga-rentacar.census.md
  - ../../../../00-states/05-assemble-and-direct/council-brief.md
  - ../../../../00-states/05-assemble-and-direct/state.md
---

# Value/Product lens — council wave 1

> Council seat: VALUE / PRODUCT (outside-in). Question asked: does each candidate direction move the
> substrate toward "living memory agents actually use"? Anchor: OVERVIEW.md's own definition — a working
> substrate for AI agents that grows from tiny to huge **without migrations**, and the 7 values it must
> keep whole while doing so.

## Framing: what "value" means here

There is no external paying user yet. The only value signal that exists is **internal**: does an agent,
reading/writing this substrate, get a truthful, durable, single-door memory? Two things currently falsify
that promise even where code is green:

1. **Durable exists but nothing lives on it.** `durable-storeport.design.md` + `store-durable-fs.ts` are
   the one certified green-product node in the whole kernel census (brain-kernel census, row
   `durable-storeport.design.md`; fact-base line 35). Yet every production module of the only real tenant
   (`ingest-rentacar`, `rental-balance`) still runs on `MemoryStore` (ga-rentacar census, row
   `durable-runner.ts`: "ни один M2/M3-модуль пока НЕ гоняется на нём"). Product value built on
   `MemoryStore` today is value that will need a **migration** later — which directly contradicts the
   product's own founding promise ("без миграций"). That is not a neutral engineering gap; it is a
   violation of the value proposition itself.
2. **PEP is bypassable, and the bypass is exactly where the first real tenant lives.** `customer-lens.ts:94`
   reads `graph.byId` directly, skipping `resolve()` (the ratified single PEP, ADR-0004) and skipping
   `same-as` traversal (ga-rentacar census, risk R2/R3; also fact-base line 41-42: "построили зелёный
   модуль В ОБХОД `resolve()`"). This means the *only* place where an agent currently reads real business
   data (rental orders/customers) does not go through Sovereignty's flagship mechanism. `analyses/13`
   already refuses to count M2 as closed for exactly this reason ("M2 slices" commit banner vs. AC5/T3
   red). I treat this as **the single most important fact for the value lens**: the substrate's headline
   differentiators (durable, single-door PEP) are proven in isolation but not proven where value is
   actually consumed.

## Q1 — Is S-A..S-D the right split, and what order?

The split is roughly right as a *set*, but the fact-base's S-A and S-B descriptions already overlap on the
one thing that matters most for value: "connect durable to life" (S-A) and "M2/M3 via mandatory PEP"
(S-B) are the SAME piece of work seen from two sides. From a value lens I do not want a strict "finish all
of S-A, then start S-B" ordering (too slow — no value shows until a very broad program of N-G conditions
closes) nor a "ship S-B on top of MemoryStore + bypass now, backfill S-A later" ordering (fake win, buys a
migration debt against the project's own thesis). The right cut is a **thin joint slice**: close R2/R3
(route `customer-lens` through `resolve()` + `same-as`) and get M3's runner onto `durable-runner.ts` before
M3 is allowed to "count." That slice is small (it touches `admission.ts`, `resolve.ts`, `customer-lens.ts`,
and swapping the store binding) relative to the full N-G program, and it is exactly what `specs/06-m2-build-steps.spec.md`
already gates on ("M2 засчитан, если T2+T3 зелёные").

Everything else in S-A (the broader N-G "conditions of green," closing Vitality=0-code, closing the
`access_event`/explain-chain canon-lies) is real but is **not on the critical path to the first proof of
product value** — it is foundation-hardening that a second tenant or an audit will need, not what the first
tenant needs today. I would NOT block the tenant on all of S-A; I would block it on the resolve/durable
slice only.

Ranking (full reasoning, digest has the compressed version):
1. **S-B** (specifically: close R2/R3, i.e., finish M2 honestly) — this is the only place the core promise
   gets tested against a real workload (4102 orders, ~2000-2700 customers, 15-25% dup rate — ga-rentacar
   census, `04-real-data-grounding.analysis.md`). Everything else is unfalsified theory until this closes.
2. **S-A** (narrowed to: durable-adoption + PEP-mandatory, NOT the whole N-G program) — necessary to make
   #1's win real and non-fake; the broader canon-lies cleanup (Vitality, access_event, explain-chain) can
   trail behind because it doesn't block tenant value, it blocks *trust in reporting about* the substrate.
3. **S-C** (agent layer/contract) — the contract is empty while `balance-observer`'s actual implementation
   has already outrun it (fact-base line 38: "реализация balance-observer его обогнала"). Writing an
   abstract contract now, before a second real agent exists to validate it against, is speculative design
   with no user to falsify it — classic premature abstraction. Its real value only materializes once ≥2
   concrete agents disagree about what the contract should say. Low urgency for VALUE specifically (it's
   an engineering/reuse concern more than a product-value one), though the 2 live gateway bugs (dup/restart,
   OQ-4 outbox) are a different matter — those are operational reliability, not architecture, and could be
   fixed cheaply in parallel without waiting for "contract" work.
4. **S-D** (process/pult reorg) — real and necessary, but its value is entirely internal (session
   efficiency, LOSE-NOTHING of `_log/`). It produces zero user-facing or agent-facing value. It should run
   as its own parallel track/session, never gating S-A/S-B, per the project's own
   `orchestration-sync-under-gateway.md` rule about waves not mega-fan-out.

## Q2 — Standalone states vs sub-items

- **S-B**: standalone (already is — `03-projects/ga-rentacar/`). Correct as a state; it is the only place
  product value gets tested.
- **The "resolve/durable" slice**: I recommend it NOT be buried as a generic sub-item of the broad S-A
  program, nor purely inside S-B. From the value lens it deserves visibility as a **named joint checkpoint**
  (e.g. a short-lived gate state or a clearly labeled sub-item cross-referenced from both S-A and S-B) so it
  doesn't get diluted into either team's backlog and quietly slip — this is exactly the kind of thing that
  produced the "M2 slices" commit banner overclaim once already.
- **S-A (broad N-G program)**: standalone state, lower cadence, trailing.
- **S-C**: sub-item / deferred-until-triggered (trigger = a second real agent needs the contract, or the
  2 gateway bugs need fixing for reliability — those two can be a tiny separate ticket, not "S-C" proper).
- **S-D**: standalone but explicitly parallel-track, different session/team, non-blocking.
- **Owner value-arbitration fork (7 values)**: this is cheap (a single owner decision) and unblocks the
  `VALUES-canon-v3` conflict (#3 timeliness, #5 asymmetry, #7 escalation — ga-rentacar census
  `values-v2/VALUES-critique.analysis.md`) which is currently stalling `timeliness-engine-bridge.design.md`
  (T5, Maturity 58%, "зависит от 4 неотвеченных развилок"). I'd surface it as a short, immediate, low-effort
  side-quest — not gating S-A/S-B, but worth doing THIS week because it's the cheapest unblock available
  and it removes a value-integrity gap that BA/critic already flagged as unresolved.

## Q3 (touched only where value-relevant) — pult → graph, LOSE-NOTHING

Only comment: whatever graph model S-D lands on, each branch-card MUST carry a **value-checkpoint field**
(what user/agent-facing value this branch proves or unblocks, if any) — right now `STATE.md`'s strawman
S-A..S-D descriptions already do this informally ("Точка: …"), and that pattern is good; formalize it as a
required field so future branches can't be added without declaring what value they're chasing. This
directly prevents another "M2 slices" overclaim-by-commit-banner.

## Q4 (touched only where value-relevant) — cleanup inside S-D

Not my lens in depth. One value-relevant note: `_inbox/values-v2/` (VALUES-canon-v3, critique,
goals-company-first, value-ladder) is itself an uncommitted-decision pile that is arguably as much "S-D
mess" as it is "cross-cutting owner fork" content — it should be swept into whatever S-D does with
`_inbox/`, not left floating, since it's the one pile with direct product-value content (company-first
value ladder) sitting inside a process-debt folder.

## Q5 — Blind spot

The picture has **zero acceptance evidence that memory changes agent behavior.** Every "green" so far —
32/32 ingest tests, 92/92 engine tests, SIGKILL crash-survival — verifies substrate *mechanics* (data
survives, tests pass, admission fires). None of it verifies the actual value proposition: an agent asks a
question, gets an answer shaped by something written earlier, and does something different because of it.
`balance-observer` is the closest candidate (it's a real consumer) but its `PayloadStore` interface is
explicitly flagged as "не прочитан этой парой вообще" (ga-rentacar census, "Дыры карты") — meaning even the
closest thing to an end-to-end value proof has an unverified core dependency.

Second blind spot: there is no named human beneficiary for ga-rentacar. All ga-rentacar decisions
(D1-D10, F-3/F-4/F-5, values-v2) are synthesized by owner + BA + critic agents reasoning about a rental-car
domain in the abstract — I found no evidence of an actual ops person's workflow, complaint, or acceptance
test in the census. "First tenant" risks becoming a very well-documented fiction if nobody who actually runs
a rental-car business ever looks at the output.

Third: **Vitality = 0 code** (fact-base line 40, kernel census "8/42 граней на green-unit, 0/42 на
green-product") is not just a coverage gap — Vitality is definitionally the value that measures "does this
substrate stay alive / get used." Its total absence means the project literally has no instrument for
detecting whether any of this is being adopted versus merely built. From a product lens, shipping more
S-A/S-B work without at least a minimal Vitality signal (any usage/liveness metric) means we can't tell a
real win from a fake one going forward — this compounds the top-value-risk below.

## Top value risk

Declaring S-B (M2 or M3) "done" while it still runs on `MemoryStore` and bypasses PEP produces a **fake
win**: value that appears delivered today but silently owes a migration later, breaking the one promise
("no migrations, single door") the entire project exists to keep. This already happened once — the
`analyses/13` review found the "M2 slices" commit banner overclaimed a M2 that specs/06 itself says isn't
closed (T3 red). Repeating this pattern at M3, with real money-flow (`rental-balance` payment reduce) on
the line, is the highest-consequence failure mode for the value lens: it would mean the first real product
proof point is built on sand, and nobody would know until a second tenant or an audit surfaces it.
