---
node_type: decision
advisor: fable
date: 2026-08-05
title: "Depth pass — the deepest problem the plan does not see"
status: review
topic: assemble-and-direct
related:
  - ../01-execution-plan.synthesis.md
  - ../00-fact-base.synthesis.md
  - ../../census/01-brain-kernel.census.md
---

# Fable depth pass — the recall plane does not exist, and the plan's own fix breaks it

> Called after the full council (5 lenses → reconciliation → red-team → verdict). Task: name the ONE
> deep problem that survives all the council's fixes. This is it, with code evidence.

## 1. The finding, stated plainly

**The entire base — and the entire plan — designs the WRITE plane of memory. The RECALL plane
(how an agent obtains what it needs at decision time) has zero design, and the council's own
PROCEED-BY-REF fix for D1.b actively breaks the only recall path that exists.**

Code evidence, read directly this session (not from censuses):

1. **Recall today = full scan of an in-memory store.**
   `packages/rental-balance/src/agent/balance-observer.ts:42`:
   ```ts
   const readable = this.store.load().filter((n) => this.engine.resolve('read', this.viewer, n) === 'allow');
   ```
   The one real agent's "memory recall" is: load *everything*, policy-filter, then
   `graph.nodes.filter((n) => n.type === 'order')`. There is no query surface, no index-backed
   retrieval, no "what do I know about X". This works at 10 nodes; it is the thing "grows without
   migrations" silently assumes away. The anchor promise fails at RECALL time, not at storage time.

2. **The agent's operands are CONTENT, not meta.** `observe()` computes `total / paidSum / remaining /
   orphan amounts` — values that live in node/act payloads, not in `IMMUTABLE_ACT_META`.

3. **D1.b exports exactly those operands out of the readable substrate.** `erasure.ts` is explicit:
   *"The erasable zone is exactly `payload` (everything else here)"* — meta keeps only
   `payloadRef + payloadHash`. D1.b's machine-checked gate ("no `payload` key in any tenant journal
   line") guarantees the durable journal contains **witnesses of content, not content**.

4. **The place the content goes has no reader and no door.** `PayloadStore` is already flagged in
   FORK-2 as an "unread blind zone" — the council read that as an *erasure* risk. It is actually the
   *recall* risk: D1.b routes the agent's decision inputs into a store that nothing reads, and —
   critically — **`resolve()` gates NODES, not blob dereferences.** The first `payloadStore.get(ref)`
   anyone writes is a PEP bypass on the payload plane: precisely the class of sin (`graph.byId`
   around `resolve()`) that D1.a exists to kill, re-created by D1.b one letter over, with no lint,
   no gate, no mention anywhere in the plan.

So the sequence the plan mandates is internally contradictory:
D1.a seals the node door → D1.b removes the agent's operands from behind that door → D1.c requires the
agent to compute from those operands. Something has to give in D1.c, and none of the gates say what.

## 2. Why this survives every council fix

- **KILL-SHOT 1/2/3, the riders, DERIVED-not-DECLARED** — all govern *status* and *write-plane* honesty.
  All four D1.b preconditions test the write side (no payload key; same-as fired; dist/src parity;
  D1.a green). **Zero preconditions test that any reader can reconstitute what it needs, gated.**
- **The value-lens acceptance ("agent decides differently because of memory")** can be satisfied by a
  hard-wired read: balance-observer already knows what to load (everything) and what to look for
  (type === 'order'). A single ad-hoc rehydration hack in the projector makes the numbers flow again
  and the hand-triggered script stamps green. The acceptance tests that memory *was read*, not that it
  was *recalled through a designed, gated path*.
- **ADR-0008 (CQRS)** is the правильная foundation for recall (projections are rebuildable = the
  "migration" you avoided at the store reappears, legally, as reprojection) — but no recall
  projection is designed. The foundation exists; the floor does not.

## 3. Does the slice expose or hide it?

**Worse than hiding: it forces a silent patch.** D1.c *will* collide with this operationally — someone
must make balance-observer's numbers reappear from a meta-only journal. But the collision arrives as a
plumbing obstacle mid-implementation, and the path of least resistance is a quiet
`payloadStore.get()` inside the projector: undesigned, ungated, invisible to every generator-level
check in the plan. The slice goes green; the recall plane is now *built by accident*, with an open
second door. The problem doesn't surface — it fossilizes. (Alternative silent failure: amounts get
classified "willing to remember forever" and kept inline meta — the by-ref invariant erodes on day
one instead. Either escape hatch is green; both are the problem.)

## 4. Drill this hour

**THE QUESTION:** *"Under meta-only-by-ref, trace balance-observer's `total` for one real order: which
call fetches the payload, which door gates that call, and what does this lookup cost at 100k acts?"*

**WHO:** the **engineering lens running a real usage test** — not another deliberation round. One
session: replay the real ga-rentacar journal split meta-only (splitAct exists, tested), run
balance-observer against it, and log (a) every place it starves for payload, (b) every fetch that
crosses no door. That failing run IS the recall-plane spec. Do it **before** D1.b lands, so D1.b's
design answers it instead of D1.c's implementation hiding it.

## 5. Reframe / invariant

> **RECALL-THROUGH-THE-SAME-DOOR: a memory is not written until it can be read back through the door.
> Every `payloadRef` dereference is a `resolve('read')`-gated act, from day one; and no write-plane
> feature ships without naming the recall query it serves.**

Concrete riders for the plan (surgical, not a rewrite):
- **D1.b gains a 5th precondition (machine-checked, symmetric to the "no payload key" test):**
  a round-trip test — one real act written meta-only is *read back to full content by a viewer through
  a gated dereference* (and refused for a viewer without capability). This is ~1 session of work and
  converts the silent patch into a designed seam.
- **D1.c's script asserts provenance of the numbers:** the emitted status must carry the trace
  "operand ← payloadRef ← gated fetch", not just "agent ran".
- **DV inherits the scale half:** full-scan `store.load()` is logged now as the known recall-scaling
  debt ("grows without migrations" is currently true of the log and false of recall); the fix lane is
  ADR-0008 reprojection, not store surgery.

## 6. What the council missed (5 lenses + reconciler + red-team walked past it)

Every lens audited the write path — door, dedup, durability, erasure, process. Nobody traced the READ
path of the very agent the slice's green depends on. The evidence was on the table twice: FORK-2 named
`PayloadStore` an "unread blind zone" (filed under *privacy*), and census-03 quoted balance-observer's
`store.load()` line (filed under *"first write-back cycle"* — a write-plane trophy). The council's own
meta-rule (§8: carry primary anchors verbatim) is what catches it: put `balance-observer.ts:42` and
`erasure.ts` ("the erasable zone is exactly `payload`") side by side and the contradiction is
one line of reading apart. Five lenses summarized past it because recall had no lens — the substrate's
purpose ("a working substrate FOR AGENTS") was represented in the council by nobody whose job was to
*be* the agent at decision time.
