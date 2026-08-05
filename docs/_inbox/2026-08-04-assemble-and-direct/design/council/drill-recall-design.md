---
node_type: design
lens: recall-door
date: 2026-08-05
status: review
topic: assemble-and-direct
title: "RECALL-THROUGH-THE-SAME-DOOR — concrete design for the read plane D1.b opens"
related:
  - ./depth-fable-deepest.md
  - ../01-execution-plan.synthesis.md
  - ../../../../../packages/rental-balance/src/agent/balance-observer.ts
  - ../../../../../packages/engine/src/core/erasure.ts
  - ../../../../../packages/engine/src/core/predicates.ts
---

# RECALL-THROUGH-THE-SAME-DOOR — the read plane, designed

> Fable named the deepest problem (`depth-fable-deepest.md`): D1.b's `splitAct` routes the agent's
> decision operands (`total/paidSum/remaining`) out of the readable substrate into `PayloadStore`,
> which has **no reader and no door**. The first `payloadStore.get(ref)` anyone writes is a PEP bypass
> on the payload plane — the exact `graph.byId`-around-`resolve()` sin D1.a exists to kill, re-created
> one letter over. This file designs the fix as a **small rider on D1.b**, not a new track.

## Pattern selected: Policy Enforcement Point (PEP), extended to the blob plane

`resolve('read', viewer, node)` is the SINGLE node-plane PEP (balance-observer.ts:42, comment I-7).
The payload plane needs the **same** door, not a second one. We do NOT invent new policy — we apply the
existing capability check to blob dereference. This is the Ports & Adapters move: `PayloadStore` is an
adapter; the port in front of it carries the gate.

---

## 1. THE READ-DOOR — minimal gated dereference

A new port, `PayloadReadPort`, is the ONLY sanctioned way to turn a meta-only act back into content.
`payloadStore.get(ref)` becomes package-private behind it; a lint (symmetric to D1.a's `graph.byId`
guard) forbids raw `.get(` outside this port.

**Contract sketch:**

```
interface PayloadReadPort {
  /**
   * Rehydrate the erasable payload behind a meta-only act — THROUGH the read gate.
   * The dereference IS a resolve('read')-gated act, from day one.
   */
  deref(viewer: string, meta: Omit<Act,'payload'>): PayloadResult;
}

type PayloadResult =
  | { ok: true;  payload: unknown }     // capability granted AND hash verified
  | { ok: false; reason: 'refused' }    // resolve('read') !== 'allow'  → NO bytes returned
  | { ok: false; reason: 'shredded' }   // ref gone (hard-erase) but hash retained
  | { ok: false; reason: 'tampered' };  // blob hash !== meta.payloadHash
```

- **Input:** `viewer` id + the act's immutable meta (which carries `payloadRef` + `payloadHash`,
  erasure.ts:25-34). Never the blob itself.
- **Capability check:** reuse the node PEP — `engine.resolve('read', viewer, subjectOf(meta))` must be
  `'allow'`. The subject is the node the act is about (its provenance/edge target), so the payload
  inherits the same policy as the node it describes. No new policy language.
- **Returns:** on allow, the payload **verified against `payloadHash`** (integrity fused with access) —
  reconstructs `{ ...meta, payload }` byte-for-byte (the inverse of `splitAct`, erasure.ts:48).
- **Refuses:** without capability → `{ ok:false, reason:'refused' }`, zero payload bytes cross the
  boundary. Hash mismatch → `tampered` (fail-closed). Missing blob → `shredded` (erasure witness path
  from `isErasureVerifiable`, erasure.ts:70 — a legal, auditable absence, not an error).

The door is ~30 lines: one `resolve` call + one hash compare. It re-uses everything already built.

---

## 2. THE 5th PRECONDITION for D1.b — round-trip, testable

D1.b today has 4 write-plane preconditions (no `payload` key in journal; same-as fired; dist/src
parity; D1.a green). Add a **5th, machine-checked, symmetric to "no payload key":**

**RT (round-trip through the gate):** replay ONE real ga-rentacar act, `splitAct`-ed meta-only
(journal = meta, blob = PayloadStore). Then:

1. `viewerWithCap` → `deref` → `ok:true` AND `{ ...meta, payload } deepEquals originalAct`
   (lossless read-back, the mirror of `splitAct`'s existing lossless test).
2. `viewerWithoutCap` → `deref` → `ok:false, reason:'refused'` AND the returned object contains
   **no operand bytes** (assert `total/paidSum/...` are absent, not merely undefined).
3. `assert` that the ONLY code path reaching payload content is `PayloadReadPort.deref` — grep-gate:
   zero `payloadStore.get(` outside the port (lint, like D1.a).

Green RT = "the memory can be read back through the door, and refused without capability." This
converts Fable's *silent patch* into a *designed seam* and is ~1 session.

---

## 3. V1 RECALL for balance-observer — smallest honest thing

Today (balance-observer.ts:41-63): `store.load()` full-scan → `resolve` filter →
`.filter(n => n.type === 'order')`. Operands are read inline from node payloads. Under meta-only-by-ref
those operands are GONE from the loaded nodes — they now sit behind `payloadRef`.

**Split the recall problem into two debts — one deferrable, one NOT:**

| Concern | v1 slice | Debt lane |
|---|---|---|
| **SELECTION** (find the `order` nodes) | full-scan `store.load()` + `type==='order'` — **acceptable**, honest at ga-rentacar scale (~10²) | **LOGGED → DV**: index/by-type query is ADR-0008 reprojection, NOT store surgery. "grows without migrations" is true of the log, false of recall — say so. |
| **DEREF** (fetch the operand payload) | **NOT deferrable** — must go through `PayloadReadPort.deref` in D1.b | none: this IS the door |

So minimal v1 recall = **keep full-scan SELECTION** (debt logged) **but adopt gated DEREF now** for
every operand. `computeOrderBalance` receives operands from `deref(viewer, act)`, not from an inline
payload. Concretely `readGraph()` stays; a new `hydrate(order)` calls `deref` per operand-bearing act.
Full-scan is an honest v1 IF the scaling debt is written down as a DV item the same hour.

---

## 4. INVARIANT (one line future code must obey)

> **RECALL-THROUGH-THE-SAME-DOOR — No write-plane feature ships without naming the recall query it
> serves; every `payloadRef` dereference is a `resolve('read')`-gated act (`PayloadReadPort.deref`),
> the same door as node reads, from day one. Raw `payloadStore.get()` outside the port is a PEP
> bypass and is lint-forbidden.**

---

## 5. SLICE-IMPACT — small rider, honest verdict

**Small rider, not material growth.** The expensive half (a real recall projection / index) is
correctly *deferred to DV* as logged debt — v1 keeps full-scan. What D1.b actually gains:

- **New:** `PayloadReadPort.deref` (~30 lines, reuses `resolve` + `payloadHash`) + one lint.
- **New:** 5th precondition RT test (~1 session).
- **Changed:** balance-observer reads operands via `deref` instead of inline payload — a swap, not a
  redesign; `computeOrderBalance` signature unchanged.

It rides the seam that already exists (`splitAct`/`redactAct`, tested). It does NOT require designing
the recall projection. Net: **~1 session**, and it closes the second-door hole *by construction* rather
than letting D1.c fossilize it. Recommend: adopt as D1.b's 5th precondition; file the SELECTION-scaling
debt to DV in the same commit.
