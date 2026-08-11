---
node_type: analysis
title: "Q-I4 — disposition of the pending I-4 (act-immutability) monument-content carve-out"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
kind: knowledge
plan: ../../../plan/PLAN-A-forks-and-readiness.md
related:
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D4-decision-lens-briefs.analysis.md
  - ../../../../../../02-project/core/00-kernel/invariants.md
  - ../../../../../../architecture/ADR/ADR-0009-erasure-witness-and-recursive-seam.md
  - ../../../../../../architecture/ADR/ADR-0007-erasure-and-admission.md
  - ../../../../../../_log/2026-08-07-whole-picture-and-cycle/I-4-RESOLUTION.decision.md
---

# Q-I4 — should `invariants.md` I-4 be amended to carve out identifying content inside a monument record?

> Recommend, do NOT ratify. This document is decision-ready input; the owner decides.

## 1. What the fork actually gates — corrected

The task framing (and the D4 brief itself, `D4-decision-lens-briefs.analysis.md:30-31`) states this carve-out
"blocks: the `erased`-act / `shred`-port build (`T-D1b-shred-by-ref-pii`, `T-D1b-erasure-debt-ADR`)."

**This premise is stale.** That code already exists, uncommitted, on disk, and passes tests:

- `packages/engine/src/core/erasure.ts:117-137` — `buildErasedAct()`, the terminal `erased`-act builder.
- `packages/ingest-rentacar/src/adapters/file-payload-store.ts` — `shred()` port (salt-in-blob).
- `packages/ingest-rentacar/src/core/hash.ts:9-17` — the corrected "hashing PII is safe" comment.
- `packages/engine/src/core/erasure.ts:26-33,90-98` — the corrected verifiability claim +
  `isWitnessNonReversible()`.
- Verified by running the suite directly: `packages/rental-balance/test/erasure-byref-shred.test.ts` (6
  tests) + `erasure-plane-falsify.test.ts` (6 tests) — **12/12 passing**, confirmed this session.
- `git diff HEAD -- packages/engine/src/core/erasure.ts` shows these are uncommitted changes on top of
  commit `95973a9` ("D1.b Stage 1") — i.e. this is genuinely Step-1 code, already written, already green,
  with **no I-4 carve-out in effect**.

**Why it doesn't need one.** `docs/_log/2026-08-07-whole-picture-and-cycle/I-4-RESOLUTION.decision.md:24-33`
records the load-bearing discovery: I-4's fork was originally framed as "let `erased` edit the journal in
place" — but that's only true for the deprecated *inline* payload model. The canonical *by-ref* path never
touches the acts journal at all: `buildErasedAct` (`erasure.ts:117-137`) appends a **new** act (never edits
`target`), and the shredded content lives in `FilePayloadStore`, a store outside the append-only acts log.
I-4's literal text — "Принятый act больше не редактируется и не удаляется" (`invariants.md:72-73`) — is not
violated by any of this. Confirmed by inspecting `buildErasedAct`'s own output shape (`erasure.ts:127-137`):
`provenance: { source_ref, erases_act }`, `actor: opts.actor` (e.g. `'agent:erasure'` in the test,
`erasure-byref-shred.test.ts:168`) — **no requester name, no human-identifying field, anywhere in the
monument record it produces today.**

So the I-4 carve-out this fork is about gates something narrower and further out than the task framing
suggests: **ADR-0009 seam ③ only** — a *future* field (an as-yet-undesigned "erased by request of R"
attribution on the `erased` act) that does not exist in `types.ts`'s `Act` shape today. Nothing currently
in the repo writes it.

## 2. Decomposing what seam ③ actually needs

`ADR-0009-erasure-witness-and-recursive-seam.md:107-109` states the scope explicitly:

> "Опознающее содержимое ВНУТРИ монумента — атрибуция требователя («стёрто по требованию R»...) **и
> опознающая типовая мета** — это erasable-content... Забвение достаёт **всё идентифицирующее** внутри
> монумента, включая имя заявителя."

Two components, not one:
1. Requester attribution (name of whoever invoked the right).
2. "Опознающая типовая мета" — identifying type-level metadata, unspecified in the ADR (could be, e.g.,
   any future field that names a natural person other than the requester, or a free-text reason field that
   incidentally carries PII).

**Option C (carve out only the requester-attribution field) structurally does not cover component 2.** The
D4 brief already flags this (`D4-decision-lens-briefs.analysis.md:43-44`: "doesn't deliver ③'s full promise
... likely reopens"), and decomposing ③'s own text confirms it rather than merely asserting it — the ADR's
own scope sentence names two categories, and C's proposed clause name ("only the requester-attribution
field") maps to exactly one of them. If a second identifying field is ever added to the monument shape (the
ADR doesn't rule this out — "опознающая типовая мета" is deliberately open-ended), C's clause would not
reach it, forcing a second owner-ratification round to widen it. C is not a smaller version of A; it is a
different, narrower promise that ③ has already stated it needs to exceed.

## 3. Is "symmetric to the payload carve-out ADR-0007 already has" accurate?

**No — this framing (present in the fork question itself and in ADR-0009's own related-links section,
`ADR-0009...md:12`: "carve-out I-4 для монумент-содержимого — pending, ниже") overstates precedent.** The
payload-separability carve-out is **also still unratified**:

- `invariants.md:81-87` — the block is explicitly headed "PENDING carve-out... НЕ ратифицирован — ждёт
  закрытия KQ-8" and closes with "I-4 остаётся ЖЁСТКИМ как есть."
- `ADR-0007-erasure-and-admission.md:14` — "I-4 акт иммутабелен — **нужен carve-out**" (present tense, still
  needed).
- `ADR-0007...md:326-330` — exit-criterion #2 for `proposed → approved`: "**I-15 + carve-out I-4** приняты в
  `invariants.md` (KQ-8-Q4) — этот ADR опирается на carve-out." Listed as a precondition, not a completed
  fact.

So there is no ratified I-4 carve-out anywhere in the canon right now. A monument-content carve-out (this
fork) would be the **first** carve-out actually ratified into `invariants.md`'s body — not a second,
symmetric one alongside an existing settled pattern. This matters for the "second exception-clause burden"
Option A's brief names (`D4-decision-lens-briefs.analysis.md:38`): the audit burden of A is not "one more
clause next to an established one," it is "the first-ever carve-out to a hard invariant, opened for content
that has no schema yet."

There is a further, adjacent finding worth flagging to the owner (not this fork's job to resolve): the
payload-separability carve-out block in `invariants.md:81-87` may itself be **moot for the by-ref path** —
per §1 above, by-ref erasure never touches the acts journal, so the carve-out it was written to justify may
not be structurally necessary either. `invariants.md` and `ADR-0007` have not been updated to reflect the
`I-4-RESOLUTION.decision.md` finding. This is doc-drift, separate from Q-I4, surfaced here because it
directly undercuts the "symmetric to an existing carve-out" framing.

## 4. Option assessment

- **A (full carve-out now):** Buildable ③ later without a second ratification round. Cost: ratifies an
  exception clause for a field that doesn't exist yet in `types.ts` — no concrete shape to scope the clause
  against. Matches the over-proof pattern ADR-0009 itself warns against elsewhere (`ADR-0009...md:175-176`,
  Alternative 6: "строить машинерию... over-proof — строгость до нужды," said of key-store timing but the
  same logic applies to ratifying an invariant exception before the thing it excepts is designed).
- **B (leave hard, defer ③):** Costs nothing today — confirmed in §1, the by-ref `erased`-act/shred-port
  code (which the D4 brief said this blocks) is already built, tested, and green without it. The real cost
  is deferred, not avoided: whenever seam ③ gets a concrete field design, the carve-out ratification still
  has to happen before that code can be written honestly (append-only means it can't be done retroactively
  once real requester-attribution data lands — same retrofit-impossibility logic as R4).
- **C (narrow, requester-field only):** Per §2, structurally under-covers ③'s own stated scope
  ("опознающая типовая мета" is a second, unaddressed category) — not a smaller-but-sufficient version of A,
  a different promise likely to reopen.

## Recommendation

**B — leave I-4 hard, do not ratify a monument-content carve-out this pass.**

Reasoning: nothing currently blocks on it (§1, verified by running the test suite: 12/12 passing without any
carve-out in effect). ADR-0009 seam ③ has no concrete field design yet — there is nothing to scope a carve-
out clause against, so ratifying now would be writing an exception for an unknown shape (the over-proof
pattern ADR-0009 itself rejects elsewhere). When seam ③ does get a concrete field design, ratify the FULL
carve-out (A-shaped), not C — §2 shows C's narrower scope would reopen against ③'s own stated "all
identifying content" requirement.

What this unblocks: nothing new — the `erased`-act/shred-port/hash.ts/erasure.ts code the task named as
gated by this fork is already unblocked, already built, already green (§1). Deferring changes nothing about
Step-1 readiness.

What still needs the owner:
- Confirm the B-now-A-later sequencing this analysis recommends (not ratify).
- Separately: the stale `invariants.md:81-87` PENDING payload-separability block and `ADR-0007`'s
  `proposed`-status exit-criterion #2 (`ADR-0007...md:330`) should be reconciled against the
  `I-4-RESOLUTION.decision.md` by-ref finding — flagged here, not resolved here.
- R3, R4, R5 (the other three ADR-0009 Pending-owner items) are untouched by this analysis.
