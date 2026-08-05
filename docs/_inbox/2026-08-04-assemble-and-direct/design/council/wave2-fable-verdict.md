---
node_type: decision
advisor: fable
date: 2026-08-04
status: draft
topic: assemble-and-direct
fork: FORK-3 (durable-adoption timing under real PII)
inputs:
  - ./wave2-reconciled-plan.draft.md
  - ../00-fact-base.synthesis.md
  - ./wave1/risk-lens.md
code_anchors:
  - packages/engine/src/adapters/store-durable-fs.ts:169  # journals JSON.stringify(act) — payload INLINE
  - packages/engine/src/core/erasure.ts:1-60              # splitAct/redactAct + IMMUTABLE_ACT_META seam, tested
  - packages/engine/src/core/predicates.ts:78             # assertForwardMonotone (same-as many→one guard)
---

# Fable verdict — FORK-3: durable-adoption timing under real PII

## VERDICT: PROCEED-BY-REF (a third path — neither branch as offered)

D1.b runs on **real** ga-rentacar data the moment D1.a is green — **provided the first durable write of
tenant data journals META-ONLY**: `IMMUTABLE_ACT_META` + `payloadRef` + `payloadHash` into the
never-compacting journal; the PII payload itself goes **by reference** into a shreddable blob home
(the existing `PayloadStore` seam). No FORK-2 wait. No synthetic-data detour.

## Why both offered branches are wrong

**PROCEED (inline)** is refuted by the repo itself. `store-durable-fs.ts:169` writes the FULL act —
payload inline — into a log that never compacts, for ~2000-2700 real people, with erasure "NOT the
feature," a fail-open PEP history, and an identity guard (`predicates.ts:78`) that has never fired
outside tests. The plan's own risk lens says it: durable doesn't just risk a bug, it *permanently
journals* one. Inline PII in an eternal log is the one move on the board you cannot take back.

**GATE (wait for FORK-2)** overpays. You don't need the erasure FEATURE to write safely — you need the
payload PLACEMENT. FORK-2 bundles one genuinely irreversible sub-decision (where erasable payload
physically lives) with a pile of deferrable feature work (erase workflows, policy, approval UX).
Gating the slice on the whole bundle stalls the project's only path to a true green, and "prove it on
synthetic data first" proves the wrong thing — the slice's entire value is durable-on-REAL-data, and
synthetic replay would not exercise the real dedup/same-as terrain (15-25% real dupe rate).

**The decisive fact the council walked past:** `erasure.ts`'s header — written at seal time — states
the indirection layer "had to be laid BEFORE the first durable write," V7's card says «заложить
СЕЙЧАС — ретрофит невозможен», and the module already ships the pure, tested split (`splitAct`,
`redactAct`, `payloadRef`/`payloadHash` as the retained cryptographic witness). The "deferred owner
fork" named in that header — inline vs out-of-journal — **is exactly what FORK-3 is asking**. So
answer it: **out-of-journal.** The seam was built precisely so this moment would be cheap. Use it.

By-ref converts the irreversible into the reversible: a future hard-erase becomes "shred the blob,
keep the hash-witness" — the audit trail survives byte-for-byte, the log's append-only contract is
never broken, and everything else in FORK-2 becomes safely retrofittable. FORK-2 stays open as a
feature fork, but it **stops gating D1.b**.

## PRINCIPLE (the generalizable rule — decide once, never per-slice)

> **Into a store that never forgets, write inline only what you are willing to remember forever;
> everything erasable-by-right enters by reference from day one.**

Operationally: every datum crossing into the durable journal is classified once —
*forever-safe* (audit meta: who/when/what-kind/hash) → inline; *erasable-by-right* (PII, content
payloads, anything a human may lawfully demand back) → `payloadRef` + blob. The classification
boundary already exists in code as `IMMUTABLE_ACT_META`. Future slices don't re-litigate timing;
they ask one question — "which side of the meta/payload line?" — and proceed. Durable-adoption
timing collapses from a recurring owner-fork into a mechanical check.

## FLIP-CONDITIONS

**Pure PROCEED (inline PII) becomes correct iff** the data is reclassified forever-safe: owner signs
an ADR stating this journal is a lawful system-of-record for these customers with a retention basis
that overrides erasure (e.g., statutory bookkeeping duty) — i.e., the datum genuinely may be
remembered forever. Absent that ADR, inline PII is never correct.

**Pure GATE becomes correct iff** either: (a) the by-ref wiring at `store-durable-fs.ts:169`
(journal `splitAct(act).meta`, blob-write the payload) proves NOT landable in ~1 focused session —
meaning the seam was theatre and FORK-2's physical decision is heavier than the code claims; or
(b) the `predicates.ts:78` guard's first real replay FIRES with unresolved problems, or D1.a's
same-as traversal shows live mis-attribution — you do not durably journal identity claims while the
identity mechanism is actively wrong. Then: anonymized replay only, until fixed.

**Preconditions for my PROCEED-BY-REF (all four, none waivable):**
1. D1.a green: zero `graph.byId` bypass in `customer-lens`, PEP door enforced, F-3 stamps `domain`.
2. Journal write is meta-only: a test asserts no `payload` key ever appears in a journal line
   carrying tenant data (grep-the-log-level assertion, not code review).
3. `predicates.ts:78` fired on real replay with zero problems (already the plan's D1.b gate — keep it).
4. `dist/src` parity check (already the plan's gate — keep it).

## REFRAME-CHECK: is DERIVED-not-DECLARED / "PEP is a door" sound as a universal invariant?

Sound — promote it — with two carve-outs that must ride along or the invariant rots into new theatre.
(1) **Bootstrap asymmetry:** the very first brick of anything has no run to derive from; declarations
remain legitimate as *intent* nodes (goals, specs, forks) — the invariant governs *status* claims
only. Conflating the two would outlaw planning. (2) **The meter must itself be verified:** dist/src
drift already produced a run that measured a stale reality — a DERIVED green from an unverified meter
is *worse* than a DECLARED draft, because it carries unearned authority. So the invariant's full form
is "status is derived, never declared, **and the deriving instrument is itself gated**" (the plan's
parity check is exactly this — make it part of the invariant, not a one-off). On "door, not opt-in":
correct universally, but a door with no break-glass blocks incident response; the mature form is
fail-closed door + audited break-glass whose every use is itself journaled — bypass exists, bypass
is never silent.

## LAST-WORD: what the whole council is still not seeing

Five lenses plus a reconciler debated *when* to write to durable; none of them quoted `erasure.ts`'s
header — the primary source, written by a past self at seal time, that answers *what* may be written
and says the decision point is precisely "before the first durable write." The fork was pre-solved
in the repo and the council missed it because it deliberated over **censuses of censuses** — a
compaction layer — and the compaction dropped the load-bearing line. Sit with that: this project's
thesis is a memory substrate that never loses what matters, and its own council process just
demonstrated summary-compaction losing the single most decision-relevant memory in the codebase.
The censuses are the council's MemoryStore. The fix is the same fix as the slice's: before any
future owner-fork goes to deliberation, the brief must carry the **primary code anchors verbatim**
(file headers, sealed comments — the "письма из прошлого"), not paraphrases. Otherwise every future
council re-litigates decisions the substrate already remembers.
