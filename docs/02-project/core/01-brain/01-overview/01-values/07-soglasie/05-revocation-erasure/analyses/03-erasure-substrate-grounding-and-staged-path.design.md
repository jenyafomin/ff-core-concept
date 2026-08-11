---
node_type: design
title: Erasure — substrate grounding & simplest staged path (who owns the cross-package duty)
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
related:
  - ../README.md                                   # V7·05 два примитива, FQ7, Г20
  - ../../../../../../../architecture/ADR/ADR-0007-erasure-and-admission.md  # policy/HOW — do NOT re-decide
  - ../../decisions/SPEC-DRAFT-forgetting-hard-erase.md  # R1-R6/A1-A5/T1-T5 engineering mechanism
  - ../../../../../../../../packages/engine/src/core/erasure.ts               # split/redact/isErasureVerifiable seam
  - ../../../../../../../../packages/engine/src/adapters/store-durable-fs.ts  # shredPayload (journal inline zone only)
  - ../../../../../../../../packages/ingest-rentacar/src/ports/payload-store.ts  # PayloadStore port (put/get only), WRONG package
---

# Erasure — substrate grounding & the simplest staged path

**Angle:** map the value-meaning ("unreachable now, non-existent as the aim") onto exactly what the
substrate can *honestly* enforce today, staged, and name WHO owns each stage. This does NOT re-decide
ADR-0007 policy — it grounds it and closes the one structural gap the width-census found.

## 1. Reconciliation — what is already decided vs what is genuinely NEW

**Already committed by ADR-0007 + SPEC-DRAFT (do NOT duplicate):**
- *Payload-separability* (ADR-0007 §a / carve-out I-4): act carries `payloadRef + payloadHash`; content is
  separable and erasable; hash is the retained **witness**. Realized in `erasure.ts` (`splitAct`,
  `redactAct`, `isErasureVerifiable`).
- *Three modes* (§b): `hide|prune|shred`; **`shred` = the only true consent-erase**, limited to DB/mutable
  payload (git-file-first is out — OQ-7).
- *Day-1 rule* (approved): R-G3.1 ref-not-inline · R-G3.2 deletable payload-store · **R-G3.3 tombstone +
  physical blob delete** · R-G3.4 admission-gate.
- *Erasure-as-act* (§d) + tombstone-witness + `erased` provenance (SPEC R4/R5).
- *Propagation-as-engine-duty* over DataResidency (SPEC R2/R3).

**Genuinely NEW here (not a re-decision):**
1. **The MEANING, staged.** The values demand at minimum *unreachable-now, non-existence-as-aim*. ADR-0007
   already prefers honest-fail ("hidden, not erased"). What is new is an explicit **ladder** that says which
   rung the substrate stands on today and where it may honestly STOP — so the promise is never oversold.
2. **The missing PORT / duty-owner.** ADR-0007 R-G3.3 says "physically delete the blob" but never says **in
   which module that duty lives**. Reality (flagged `erasure.ts:12-15`, `T-D1b-shred-by-ref-pii`): the by-ref
   blob — where the real PII lives — is owned by `PayloadStore`, which sits **UP** in `ingest-rentacar`
   (which `depends-on @ff/engine`). Engine's `shredPayload` therefore reaches **only the inline journal zone**,
   never the blob. Engine cannot import the store (that would cycle). **So the erasure duty is split across a
   package boundary with no coordinating port.** That is a module-boundary gap, not a policy question — new.

## 2. The missing module boundary — a shred-capable PayloadStore PORT in engine

**Decision shape:** *lift the PayloadStore port DOWN into `@ff/engine`* (the package everyone depends on),
extended with a shred capability. Then erasure is a **duty with a single home**: the engine's erase
orchestrator coordinates journal-shred (owned) + blob-shred (via the port) in one `erased` act.
Adapters (`FilePayloadStore`, a future DB store) implement the port from above; `ingest-rentacar` keeps only
the *adapter*, not the *contract*.

Why engine, not a new `erasure` package or leaving it in ingest: engine already owns the journal, the
`erased` act, and `redactAct`; blob-shred is the second half of the *same* duty. Co-locating the contract
removes the cycle and gives the wave's "no coordinating port" its home with the least new surface.

**Conceptual contract (NO code):**

| Capability | Meaning | Owner / notes |
|---|---|---|
| `put(content) → {ref, hash}` | content-addressed, **idempotent** (write-if-absent) | exists; unchanged |
| `get(hash) → content \| null` | resolve for verification/tooling; null if absent/shredded | exists |
| `shred(hash) → ShredReceipt` | **physically destroy the blob**; idempotent (already-gone = success); returns proof (hash retained as witness, content gone) | **NEW — the missing capability** |
| `isShredded(hash) → bool` (shred-tombstone) | port remembers a shredded hash so a later `put` of the same content **does not resurrect it** | **NEW — closes the idempotent-put resurrection hole (§3)** |

`tombstone` proper is **NOT** a payload-store concern — it is the journal's `erased` act (engine-owned).
The port owns only the *blob lifecycle*; engine ties blob-shred + journal-redact + `erased` into one atomic
erase duty. Keep that split clean.

## 3. The staged ladder (kept simple) — and where each open tension lives

| Stage | Honest claim | What the substrate does | Owner |
|---|---|---|---|
| **Stage-1 — unreachable / tombstone** *(exists today)* | "no read path resolves it; a witness-hash + `erased` monument remain" | strip inline journal zone (`shredPayload`) **+** delete blob via `port.shred(hash)`; write `erased` act | engine erase-orchestrator + PayloadStore port |
| **Stage-2 — ref/hash severing (crypto-shred)** | "mathematically unrecoverable, incl. backups/replicas" | encrypt payload per-referent, erase = destroy key (ADR-0007 mode B, e.2); salted/keyed hash so the witness is not an oracle; propagate over DataResidency (SPEC R3) | engine duty + key-store (new surface) |
| **Stage-N — provable non-existence** *(reserved)* | "gone everywhere, provably" | git-history purge for file-first; off-graph taint closure; embedding un-learning | mostly **unsolved / partial** |

**Where each open tension belongs:**
- **idempotent-put resurrection → Stage-1 (port contract).** `put` writes-if-absent, so a re-sync after a
  shred re-creates the blob. Cheap fix, must ship with Stage-1: the **shred-tombstone** (`isShredded`) — the
  port refuses/no-ops a `put` of a shredded hash. Without it, erasure is silently undone. **Do not defer.**
- **hash-oracle → Stage-2.** The retained `payloadHash` witness is a brute-force oracle for low-entropy PII
  (a phone number). Honest fix = keyed/salted digest whose key is itself shreddable — i.e. crypto-shred.
- **dedup / same-as collateral (OQ-1) → Stage-2.** Content-addressed `put` means two referents with identical
  PII share one blob; `shred(hash)` is then collateral. Resolved by key granularity, not by Stage-1.
- **backups → Stage-2.** Blob-delete never reaches backups; crypto-shred (kill the key) is the only honest
  answer. ADR-0007 already frames mode B as exactly this enhancement.
- **Г20 (memory of a third party) + off-graph (OQ-2/SLOMAN) + git-file-first (OQ-7) → Stage-N.** Reserved.

**Where it is acceptable to STOP now:** at **Stage-1 (+ shred-tombstone)** on DB/file-first-*mutable*
payload. That delivers exactly the value floor — *unreachable now, non-existence as the declared aim* — with
a witnessed monument. Stage-2/N stay `proposed`/reserved with the promise never oversold ("hidden/unreachable,
not yet provably-gone"). This matches ADR-0007's honest-fail posture.

## 4. ADR recommendation

This is a **module-boundary decision** (where the shred-capable port lives; who owns the cross-package erase
duty) — which per the constitution requires an ADR — but it is **not** a re-decision of erasure semantics
(ADR-0007 owns those). Two clean options:

- **Preferred: a thin sub-record `ADR-0008 — Erasure duty boundary (shred-capable PayloadStore port in
  engine)`**, back-linking ADR-0007 exactly as ADR-0007 sub-recorded from ADR-0006. Scope it to **Stage-1
  only**: port home = engine, `shred` + shred-tombstone capabilities, engine as duty-coordinator. Leaves
  Stage-2/N in ADR-0007's OQ-1/2/7. This honours doc-tree law #2 (one home per theme: the boundary is a
  *distinct* decision from the *policy*) and records the real alternatives (engine vs ingest vs new package).
- **Acceptable if kept small: amend ADR-0007 with a new §(f) "Erasure duty boundary"** + a new OQ-8, rather
  than a separate record. Choose this only if the owner wants one erasure home; risk = ADR-0007 already
  carries a large proposed body.

**Recommendation:** ADR-0008 sub-record (Stage-1 boundary), because the port introduces a new cross-package
contract and duty-owner — a structural change with genuine alternatives — while ADR-0007 stays the semantics
home. Do not build until ratified (design phase).

## Open questions
- **OQ-A (Stage-1, blocks honesty):** must the shred-tombstone (`isShredded`) live in the port, or as an
  `erased`-act lookup engine consults before `put`? Either works; pick the one that keeps ingest ignorant of
  erasure. Leaning port-local (ingest stays a dumb adapter).
- **OQ-B (boundary shape):** lift the *whole* PayloadStore port to engine, or define a **narrow
  `ShredablePayloadSink`** in engine and let the fuller `PayloadStore` (put/get) stay in ingest? Narrow sink
  = smallest engine surface, no cycle, ingest keeps its richer contract. Likely the cleaner cut.
- **OQ-C (Stage-2 trigger):** does crypto-shred wait for a real backup/replica existing, or is the key-store
  laid at M1 as "retrofit-impossible" seam (mirroring why the split was laid early in `erasure.ts`)?
