---
node_type: analysis
lens: right-drill
date: 2026-08-05
owner: jenya.stasik@gmail.com
topic: assemble-and-direct
related:
  - ../01-execution-plan.synthesis.md
  - depth-fable-deepest.md
  - depth-agent-lens.md
  - ../../../../../packages/rental-balance/src/agent/balance-observer.ts
  - ../../../../../packages/ingest-rentacar/src/ports/payload-store.ts
  - ../../../../../packages/engine/src/core/erasure.ts
---

# Drill: what is the RIGHT thinnest first slice, given the recall gap

## 1. Read-door step now, or write-only + log recall as next?

**Include a read-door step now — but scoped to Fable's narrow ask, not the full recall/query
layer.** Two different problems are on the table and conflating them blows the budget:

- **Narrow (in-scope now):** a single gated round-trip — can a payload be dereferenced only
  through `resolve('read', viewer, …)`, never through a raw `PayloadStore.get()`? Verified: today
  `PayloadStore.get(payloadHash)` (`packages/ingest-rentacar/src/ports/payload-store.ts:23`) takes
  **no viewer argument and calls no PEP** — Fable's "doorless fetch" claim is confirmed by reading
  the interface, not inferred. This is ~1 session: add a gated wrapper, one test.
- **Broad (out of scope, correctly deferred):** query/relevance layer, `access_event` logging,
  vector search — the RECALL gap `depth-agent-lens.md:23-36` names ("an agent can only fetch a
  node if it already holds the id"). That's DV's (Vitality/drift-detector) territory, not a 1-session
  fix. Folding it into D1 would re-break CRUX #1's scoping discipline (`01-execution-plan.synthesis.md:58-59`).

So: yes to a read-door, no to a recall layer. Write-only-then-log-later is rejected because Fable's
§3 argument holds — the collision is not hypothetical, it is structurally forced (`payload` stripped
from meta in D1.b, `balance-observer.ts`'s operands live only in payload), and the path of least
resistance mid-D1.c is exactly the ungated `payloadStore.get()` this drill is trying to prevent.

## 2. Corrected thinnest slice (ordered, testable done-per-step)

| Step | Action | Done-test |
|---|---|---|
| **S0 (new, first)** | Usage-test recall: replay real ga-rentacar acts split meta-only via existing `splitAct` (`packages/engine/src/core/erasure.ts:48`) into a **scratch/disposable store copy**; run `BalanceObserver.observe()` against it; log every payload-starvation point and every place a fetch would bypass `resolve()`. | A log file naming exact call sites (e.g. `computeOrderBalance` needs `order.total` from `payload`) — evidence, not estimate, of what D1.b's precondition #5 must cover. |
| **D1.a** (unchanged) | PEP-door + same-as retrofit, `customer-lens.ts`. | 0 `graph.byId` bypass; same-as traversed; T3/AC5 green (`01-execution-plan.synthesis.md:136-141`). |
| **D1.b** (core unchanged + **new 5th precondition**) | Durable-by-ref adoption. Add a `resolvePayload(engine, viewer, act)` wrapper that calls `engine.resolve('read', viewer, node)` before any `PayloadStore.get()` — informed by S0's findings. | Existing 4 preconditions (`01-execution-plan.synthesis.md:80-85`) **plus**: round-trip test — one real act written meta-only is read back to full content by an allowed viewer through the gated wrapper, and refused for a viewer without capability. |
| **D1.c** (mechanics unchanged, acceptance tightened) | Agent-read + hand-triggered status. | Emitted status carries provenance `"operand ← payloadRef ← gated fetch"`, not just "agent ran" (Fable's rider, `depth-fable-deepest.md:104-105`). |

**Recall enters INSIDE D1.b, as its 5th precondition** — not a separate D1.b2, not an external gate
on D1.c. This matches Fable's own proposal (`depth-fable-deepest.md:99-103`) and preserves the
plan's hard edge `D1.a → D1.b → D1.c` (`01-execution-plan.synthesis.md:203-206`) unchanged. S0 runs
*before* D1.b starts so its evidence sizes the wrapper instead of D1.c improvising it.

## 3. Is the usage-test recall the right FIRST action? Is it safe?

**Yes, with one caveat.** It is the cheapest possible action (~15-30 min, no production code
change) that converts Fable's hypothesis into measured fact — replacing "~1 session, estimated" with
an actual call-site list, which is what makes S5's estimate trustworthy before anyone commits to it
in the plan.

**Safety — mostly, not purely, read-only.** `BalanceObserver.observe()` is a read→compute→**write**
cycle: it calls `this.engine.write(act)` at `balance-observer.ts:105`, appending `observation` acts
to whichever store instance it runs against. Reading `store.load()`/`resolve()` is side-effect-free;
running `.observe()` is not. **Verdict: safe IF run against a disposable copy of the replayed
journal** (a scratch `StorePort`, not the real durable ga-rentacar store) — never touch the tenant's
production journal. This is a correction to treating it as flatly "read-only"; it is read-only *of
the source*, not read-only *of its own scratch target*.

## 4. Single most valuable next action (10-min budget)

**Run S0 now, on a scratch store copy.** Everything else — D1.a implementation work, FORK
acknowledgements, sizing D1.b's 5th precondition — is better-informed after S0's evidence exists and
is small/bounded enough to fit the box. D1.a itself can start in parallel (it has no dependency on
S0), but the *decision* of how big D1.b's precondition #5 really is should wait on S0's log.

## 5. Impact on OWNER FORKS — FORK-2 sharpens, does not newly block

FORK-2 (`01-execution-plan.synthesis.md:219-221`) currently frames `PayloadStore` as an "unread
blind zone" filed under privacy/erasure, with PROCEED-BY-REF judged safe *because nothing reads the
payload yet* — a dormant risk. The recall finding removes that dormancy: **D1.c requires a payload
reader to exist within the same wave**, and the reader being built (S0's evidence → D1.b's gated
wrapper) *is* the first concrete PII-payload access path FORK-2 is standing guard over. This does
not re-block D1.b/D1.c (PROCEED-BY-REF's core logic — by-ref-from-day-one, erasure-compatible later
— still holds), but it means FORK-2's owner brief should be updated: the gated wrapper is no longer
hypothetical future work, it is the concrete seam being built now, and it should carry
who-read-what-when logging even though full erasure isn't shipping. Recommend flagging this as a
one-line addendum to FORK-2, not a new fork.

---

## DIGEST (for return)

**CORRECTED-SLICE:** S0 (new, first) — replay real acts meta-only via `splitAct`, run
`balance-observer.observe()` against a **scratch** store, log every payload-starvation point +
would-be doorless fetch. Done: a call-site log. → **D1.a** unchanged (PEP-door+same-as,
`customer-lens.ts`; done: 0 `graph.byId` bypass, same-as traversed). → **D1.b** unchanged core +
**new 5th precondition**: gated wrapper `resolvePayload(engine, viewer, act)` wraps
`PayloadStore.get()` behind `resolve('read', …)` (`payload-store.ts:23` today has no viewer arg, no
PEP — confirmed); done: round-trip test, allowed viewer reads full content back, disallowed viewer
refused. → **D1.c** unchanged mechanics, tightened acceptance: status carries "operand ← payloadRef
← gated fetch" provenance, not just "agent ran."

**RECALL-ENTERS-WHERE:** Inside D1.b as precondition #5 (not D1.b2, not an external D1.c gate).
Sequence `D1.a → D1.b → D1.c` is preserved.

**USAGE-TEST-FIRST?:** Yes. Cheapest action that turns Fable's estimate into evidence and sizes the
D1.b addition honestly. Safety: mostly read-only, but `observe()` itself **writes** observation acts
(`balance-observer.ts:105`) — must run against a **disposable scratch store**, never the real
durable ga-rentacar journal.

**SINGLE-NEXT-ACTION:** Run S0 now on a scratch copy. D1.a can start in parallel; sizing D1.b's new
precondition waits on S0's log.

**FORK-IMPACT:** FORK-2 (PII/erasure, `01-execution-plan.synthesis.md:219-221`) is not newly
blocking, but sharpens: the gated wrapper D1.b now must build IS the first real payload-read path
FORK-2 was filed against as dormant. Recommend a one-line addendum to FORK-2's brief noting this,
not a new fork.
