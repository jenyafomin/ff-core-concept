---
node_type: analysis
lens: red-team
date: 2026-08-05
title: "Drill critique — red-team of RECALL-THROUGH-THE-SAME-DOOR, usage-test-first, and the §2 working model"
status: review
topic: assemble-and-direct
related:
  - ./depth-fable-deepest.md
  - ../01-execution-plan.synthesis.md
  - ../../../../_log/2026-08-05-depth-and-path/HANDOFF.md
---

# Drill critique (time-boxed ~6min)

## 1. RECALL-THROUGH-THE-SAME-DOOR — overgated, and the wrong layer is being fixed

The reframe ("every `payloadRef` dereference is a `resolve('read')`-gated act, from day one") is stated
as a blanket invariant before its cost is known. `balance-observer.ts:42` already gates at the NODE level
(`this.engine.resolve('read', this.viewer, n)`) for every act in the store. If payload access shares the
same capability as node access (the common case), a second per-dereference `resolve('read')` call inside
an aggregate loop (`total`/`paidSum`/`remaining` summed across N acts) is a **second policy-engine call per
act**, not one — the exact cost question the depth doc itself defers to the usage-test ("what does this
lookup cost at 100k acts?") is pre-answered in the invariant's favor before anyone measured it. Gating
belongs at the query/projection boundary (one check per batch/view), not literally at every deref, unless
payload ACL is provably finer-grained than node ACL — which nobody has established.

**Cheaper correct answer that was skipped:** the plan never ran a field-classification pass before deciding
FORK-3. `erasure.ts`'s own header (already flagged CRITICAL by a prior critic) says the payload-location
decision is "the genuinely irreversible owner call" — yet PROCEED-BY-REF routes *everything* erasable-by-right
by reference uniformly, without asking which fields `balance-observer` actually needs (`total`, `paidSum`,
`remaining`) are truly PII-erasable-by-right versus operational/financial data that typically carries a
statutory retention basis (rental/accounting totals are usually retained for tax/audit, exempt from
erasure). If those specific numeric fields can be classified as retained-with-basis and kept inline in meta
(v1), the entire recall-gap collapses for the one real agent — no new door, no per-deref gate, no
round-trip test needed this slice. That classification pass costs less than 1 session and was never done;
PROCEED-BY-REF asserted a uniform policy instead of auditing the actual fields at risk.

## 2. Usage-test-first — real signal exists, but the "failing run" premise is unverified

Running `balance-observer` against a meta-only-split real journal is legitimately cheap and reversible
(read + log), and it doesn't need D1.a to be meaningful — it's testing recall mechanics, not the
`customer-lens.ts` admission bypass D1.a fixes. So the test is not theater on that axis.

But the depth doc's claim "that failing run IS the recall-plane spec" assumes the failure is **loud**
(throw / explicit undefined). Nobody checked whether it's **silent**: JS numeric coercion on missing
payload fields (`undefined + n → NaN`, or a defensive `?? 0`) could make `balance-observer` run to
completion and print a plausible-looking wrong number instead of crashing. If that's the actual failure
mode, the "diagnostic run" produces a green-looking artifact that is silently wrong — worse than no test,
because it will read as "recall basically works, minor gaps" when it's actually producing garbage numbers.
The test plan has no assertion step distinguishing "starved and loud" from "starved and silent" — add one
(compare computed totals against a known-good baseline from the pre-split journal) or the diagnostic value
claimed in `depth-fable-deepest.md` §4 is not earned.

## 3. Working-model (HANDOFF §2) failure modes the owner is not seeing

- **Self-contradiction already live:** this very HANDOFF carries `prev: ../2026-08-05-council-executed/HANDOFF.md`
  in its frontmatter — a hand-linked chain, i.e. exactly the "linear pult" the model's own step 1 ("стейт
  сам наполняется задачами", generated index) exists to replace. The model is being practiced through the
  mechanism it's supposed to obsolete, because D0/S-D (the generated index) is deferred to "possibly Нить A,
  first"). Every session added to the chain before S-D materializes makes cold-start reading cost grow
  linearly, undermining the model's own stated goal ("маленький контекст на сессию").
- **Task-pool growth rate:** one session produced 6 pool entries (T-recall, T-usage-test, T-concurrency,
  T-honest-canon, T-human-view, T-forks) plus a carry-forward bucket. Nothing in §2 bounds pool growth or
  forces closure faster than accrual. This is the identical shape to the risk the plan itself names in R4
  ("card-rot, 4/5 00-states tracks frozen-but-active") and Q2 ("07-19 graveyard") — the model has no harvest
  mechanic of its own yet (it depends on D0's generator, which is not built).
- **Shallow-by-design vs hard design questions:** "неглубоко, до правильной точки" is fine for execution
  branches but the recall-plane gap is exactly a hard, systemic design question (query surface, ACL
  granularity, cost model) that a shallow single-branch pass is structurally unsuited to resolve — it risks
  producing a patch-shaped precondition (5th D1.b test) that closes the session's "правильная точка" without
  ever answering the harder question of what the READ-side contract for agents should be (D3's deferred
  scope, ironically).

## 4. Нить A vs Нить B split — currently unguarded, and this is the sharpest finding

The split itself (method session vs execution session) is reasonable *in principle*, but as instantiated it
creates a live, ungated window: **`01-execution-plan.synthesis.md` — the actual plan-of-record that Wave 2
execution would be run against — has NOT been patched with the recall precondition.** §5's own entry-point
list still shows "внеси recall в план" as an unstarted option, not a completed edge. Nothing stops a
"строй" on the existing plan text: D1.b's gate in the synthesis doc is still the original 4 preconditions;
the 5th (round-trip-through-the-door) exists only in `depth-fable-deepest.md`, a council artifact, not in
the enforced gate. If the owner (or any agent reading only the synthesis doc, which is the one marked
`status: review` and cross-linked as *the* plan) picks Нить A for a session or two, D1.b remains
executable-as-written by anyone who doesn't also read the newer HANDOFF chain.

This directly violates the plan's own anti-rot corollary (§0, "no gate ships as prose-only" / KILL-SHOT 2:
"every gate is paired with a generator-level check"). The recall precondition is currently 100% prose,
sitting one layer removed from the document that gates execution, with no machine check preventing D1.b
from landing without it. The Нить A/B split doesn't cause this by itself, but it removes the only thing
that would have caught it fast (immediately writing the fix into the plan) by making "which branch to run"
a per-session owner choice rather than a forced next step.

## 5. Biggest single way this goes wrong

**The plan's central discipline — "no gate ships as prose-only, every gate has a generator-level check" —
is currently being violated by its own most important newly-found gate.** The recall round-trip
precondition exists only as prose in a council doc; the authoritative, execution-facing plan
(`01-execution-plan.synthesis.md`) still lists the old 4-precondition gate for D1.b. If "строй" is invoked
on the strength of the synthesis doc (which is what it's for) before someone does the mechanical edit
("внеси recall в план"), D1.b ships exactly the silent-PEP-bypass-on-payload-plane the whole detour was
raised to prevent — and it ships with the process apparatus (D0, generated status, anti-rot gates)
fully in place but pointed at the wrong, stale text. The fix is cheap (edit one file) and unscheduled;
that gap between "cheap" and "unscheduled" is the actual risk, not the design of the door itself.

## Nitpicks (non-blocking)

- `depth-fable-deepest.md` §4 names the drill owner as "the engineering lens running a real usage test" but
  the HANDOFF's task pool assigns T-usage-test no owner/session slot yet — matches the §3 pool-growth
  concern, not a new issue.
- FORK-2 (PII/erasure) and the recall gap are now explicitly entangled per HANDOFF §3 ("⚠️ payload = privacy
  AND operands") but FORK-2 is still listed "standing, not blocking D1.b" in the plan — worth a one-line
  cross-reference edit when recall lands in the plan, so a future reader doesn't re-litigate FORK-2 alone.
</content>
