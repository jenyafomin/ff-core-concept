---
node_type: analysis
title: "D1.b width-census · CARD 2 — paired/inverse faces & negative space (what the 9 criteria forget)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
related:
  - ../../../../../00-states/05-assemble-and-direct/_shared/RECOMMENDATION-2026-08-06-next-stage.decision.md
  - ../../01-execution-plan.synthesis.md
  - ../../02-coverage-gate.synthesis.md
source:
  - packages/engine/src/adapters/store-durable-fs.ts
---

# CARD 2 — Paired / inverse faces of the plane «D1.b»

> Method = movement-selfcheck. Plans lose WHOLE faces (they design WRITE, forget READ). This card does not
> restate the 9 criteria (§9 of RECOMMENDATION) — it walks the METHOD'S PAIRED AXES against the entity
> «plane D1.b» and reports faces that are absent from the 9 but obligatory for «break the plane» to be
> genuine. Anchors verbatim `file:line` where they touch code.

## Verified code fact this card rests on
`writeAct` (`store-durable-fs.ts:168-180`) opens the journal `'a'`, `writeSync(line)`, **`fsyncSync(fd)`**,
`closeSync` — it durably persists **ONLY the META journal line**. The PII payload blob
(`splitAct`/`PayloadStore`, `01-execution-plan.synthesis.md:75-77`) is written by a **different seam,
outside this adapter** — there is **zero durability coordination** between the journal fsync and the blob.
`load()` (`store-durable-fs.ts:159-161`) returns `[...base, ...projection.values()]` — a **direct** read
that bypasses `resolve()`/the PEP door. Both facts drive the faces below.

## Faces (paired-axis walk)

| # | Face | Why obligatory | Covered by the 9? | Proposed home |
|---|------|----------------|-------------------|---------------|
| **F1** | **Spine RECALL through the agent door after round-trip** (write ↔ read). Crit 2's round-trip reads `S2.load()` — a direct store read (`:159-161`), NOT recall via `resolve()`/`PayloadReadPort`. | The bet is "an AGENT recalls a fact after reboot", not "load() returns an array". Store-level survival ≠ door-level recall. | **Partially.** Spine survival = crit 1/2 (via `load()`). Recall THROUGH the door (Q1 payload-plane) = designed, code 0 (`02-coverage-gate:64`). | **Defer-with-home = D1.c / Q1.** Home exists; flag that Q1 recall is code=0, must not be assumed-green. |
| **F2** | **Reading a SHREDDED payload — dangling ref** (create ↔ erase ↔ **restore/read**). After shred, the spine line still carries `payloadRef`+`payloadHash` pointing at a gone blob. | ledger+attachments is only meaningful if reading a torn-off attachment yields a **defined "erased" marker**, not a crash / silent-empty. A spine pointing at nothing = corruption, not consent (Ц7). | **NO — hole.** Crit 3 asserts spine+edges INTACT after shred, but never asserts the **read behavior** of the dangling ref. | **D1.b** — add the erased-read contract (tombstone/redacted marker). Neighbour of `erasure.ts`/`redactAct`. |
| **F3** | **Two-write crash window / durability ORDER META ↔ payload** (happy ↔ fault ↔ **partial**). Journal (META) is fsync'd at `:173`; the blob is an **uncoordinated separate write**. Crash between them → spine references a payload that never became durable = dangling-ref-at-birth. | This is the core "durable" claim of by-ref. The by-ref split CREATES a two-store consistency problem inline never had. Which fsync lands first is a WAL decision nobody made. | **NO — hole.** Crit 4 fault-injection truncates the **single journal file** only (`:148-153` torn-line class). It never touches the cross-file (journal ↔ blob) window. | **D1.b** — durability-order + recovery contract is part of "break the plane", not a later detail. |
| **F4** | **Orphan payload** (inverse of F3). Blob written, META lost on crash → PII blob referenced by **nothing**. Erasure walks the spine (`erasure.ts`), never visits the orphan → **un-erasable PII**. | Exact inversion of the model's purpose: the by-ref split, built FOR erasability, can under crash produce PII that can never be erased (Ц7 + FORK-2 real-customer risk). | **NO — hole.** No criterion considers a payload with no spine referent. | **D1.b** or **FORK-2** — bind explicitly (orphan-sweep / write-order that forbids orphan). |
| **F5** | **Cascade-erasure — the DEFERRED face's home** (single ↔ cascade). Crit 3 caps Q2 at one payload and says cascade-completeness → DEFER. | Method law: **DEFER without a named home = the face evaporates** (the very failure this census guards). "DEFER" is a verb, not a home. | **Partially.** Deferred by crit 3, but the home is under-named (CG-07 says "D1.b OR FORK-2" — unresolved). | **Defer-with-TASK** — bind cascade to FORK-2 as a sized backlog line, not a bare "DEFER". |
| **F6** ⭐ | **New form needs a new EDGE in the spine** (form-stable ↔ form-variable). Crit 7 proves NO form-specific KEY leaks INTO the spine — but never proves the spine's **fixed edge/relation vocabulary is SUFFICIENT** for an unforeseen form. Tested against ga-rentacar ALONE = **tautologically form-agnostic** (same defect class as CG-14: `same-as` locked in `many` → guard trivially clean). | This IS the bet — «grows WITHOUT migrations по произвольным формам» (RECOMMENDATION §1). If one plausible future form needs a new relation type in `IMMUTABLE_ACT_META.edges`, the spine must MIGRATE → the bet is false. Never tested = silently assumed = R5 well-documented fiction at the keystone level. | **NO — hole.** Crit 7 guards leak-IN (negative). The positive-universal ("every form expressible with the EXISTING edge set") is untested; proving it with ONE form proves nothing. | **D1.b** — acceptance MUST use a **second, genuinely different form** OR honestly scope the bet as "bounded to current edge vocabulary" (no over-claim). |
| F7 | (checked-covered) Edge referencing a torn-DROPPED act (cross). | Torn line drops act N; an edge from N-1 into N's node → dangling edge. | **YES.** `01-execution-plan.synthesis.md:87-88` FAILs if a same-as edge between two live nodes present in S1 is absent in S2. | — (already a rib of crit 2; recorded so the negative space is exhaustively walked.) |

## The single face that, if forgotten, collapses the bet

**F6 — form-agnosticism of the spine's edge vocabulary is never FALSIFIED.** The 9 criteria prove the
NEGATIVE (no form-specific key leaks into the spine) and test it against a SINGLE form (ga-rentacar), which
makes "form-agnostic" **tautologically true and evidentially empty** — the exact CG-14 error one layer up.
The keystone was reframed away from "show recall" precisely to stop always-green rituals; a one-form
form-agnosticism assert is a NEW always-green ritual wearing the keystone's clothes. Break-the-plane is only
genuine if a **second, structurally different form rides the SAME edge set with zero new relations** — that,
not one-form durability, is the falsification of «growth without migrations».

## Mechanical runner-up (name it, don't bury it)
**F3+F4 (the two-write crash window)** is the deepest MECHANICAL hole: by-ref manufactures a journal↔blob
consistency problem inline never had, and the fault-injection criterion (crit 4) is scoped to one file, so
it **cannot** observe it. F3 breaks "durable"; F4 can even turn the erasability engine into an un-erasable
PII generator. These are homeless and belong in D1.b, not a later ticket.
