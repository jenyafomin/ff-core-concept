---
node_type: critique
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
target: ./01-f6confirm.synthesis.md
related:
  - ../02-f6confirm.question.md
  - ../../01-s3scope/analyses/01-s3scope.analysis.md
  - ../../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/06-fork2-f6.report.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md
  - ../../../../../01-S1-ratify-two-laws/work/two-laws.invariant-candidate.md
  - ../../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../../packages/engine/src/core/types.ts
  - ../../../../../../../packages/engine/src/core/projection.ts
---

# Critic — independent re-check on `01-f6confirm.synthesis.md`

## Verdict: CLEAN (one CONCERN, non-blocking, wording-only)

## 1. Is A/B a real split, or artificial dicing? Does "accept A" quietly drag "accept B"?

Re-checked source docs directly, not the synthesis's paraphrase. `06-fork2-f6.report.md` (grain A's sole
source) never mentions reify/opaque-key/concede — its entire scope is "is per-layer proof of form-agnosticism
sufficient, or must a sequential second projectable tenant be built" (§1-4, TL;DR line 20). `F6-edge-identity-
design.design.md` (grain B's sole source) never revisits sufficiency-of-proof — its entire scope is "which
structural shape does a *stateful* edge take" (Options A/B/C). These are different questions about different
code paths (A: erasure-seam + generic `foldEdges` dispatch over arbitrary predicates; B: `foldEdges`'
dedup-key semantics specifically for a value that mutates under correction). **CONFIRMED real split** — not
dicing a single decision into two owner-facing lines.

Checked the smuggle direction explicitly: does confirming A ("no second projectable kit, per-layer proof is
enough") impose anything on B? No — A's "no second kit" refers to *not building a generic non-rentacar tenant
through disk+projection*; it says nothing about *how a stateful edge's identity is keyed*. `01-s3scope.
analysis.md` (already CLEAN-certified independently, `02-s3scope-independent.critic.md`) establishes the two
claims sit on different axes (act-kind/predicate-injection vs interval-identity) and neither test can stand in
for the other — this directly backs the "no smuggle" reading. **CONFIRMED.**

## 2. Is A independent of S3? (`01-s3scope.analysis.md §5(d)`)

Opened the source directly: lines 128-132 state `T-D1b-f6-accept-boundary` is "самостоятельный форк, НЕ
гейтит и НЕ гейтится S3/time-on-edge" and the dependency is explicitly one-way (Q-F6confirm references
s3scope's outcome, not vice versa) — matches `02-f6confirm.question.md:10` frontmatter (`depends_on` marked
one-way) and the synthesis's line 36-37 claim verbatim. **CONFIRMED**, not stretched.

## 3. Does B (provisional-until-S3) contradict or pre-empt `01-s3scope`'s open fix-class question (§6)?

`01-s3scope.analysis.md:136-139` leaves fix-class (`edgeId`-on-frozen-shape vs act-level `supersedes`) open,
assigned to "своей волны (architect+critic) внутри S3" — not decided by this node. The synthesis's §"Связь с
S3 fix-class" reproduces exactly this framing (line 67: "S3 выбирает fix-class внутри своей волны") and states
reify-first only *narrows* the field (stints-with-lifecycle exit the fix-class question entirely by dissolving
into a unit; edgeId/supersedes remains live only for the residual bare-interval class) rather than closing §6.
Cross-checked against `F6-edge-identity-design.design.md`'s own recommendation table (reify → "untouched" kernel
fold; Option A → "value-blind" fold) — the synthesis's absorption claim matches the source, doesn't overreach
it. **CONFIRMED, no contradiction, no closure of the open sub-question.**

## 4. Compression audit — is "second kit NOT built" a quiet cut of value-scope, or a real compression?

`06-fork2-f6.report.md:20` TL;DR (dated 2026-08-06, i.e. pre-existing, not authored by this synthesis):
"ПРИНЯТЬ сериализационный уровень + записать границу. Второго проецируемого кита НЕ строить." — this is the
architect's own prior verdict, word-for-word the position grain A compresses. `task-pool.md:57` already carries
this exact recommendation tagged `decided-pending-owner` (not `todo`, not `done`) — the synthesis did not
invent or firm up a status; it repeats the existing pending status. The "condition" attached ("ПРИ УСЛОВИИ
сузить формулировку F6 до «form-agnostic по-слойно»") is also lifted verbatim from the same report's own
"Цена ПРИНЯТИЯ" clause. **CONFIRMED — genuine compression, not a new decision smuggled in as "tightening."**

## Concern (non-blocking, wording only)

Grain B's single sentence bundles two claims of different epistemic weight under one "provisional until S3"
label: (i) "identity key must be opaque, never interval-valued" — this is a near-settled *technical* finding
(D3's counter-example + `F6-edge-identity-design.design.md` §Option B: equality on a field that mutates under
correction cannot express supersession — a property, not a preference); (ii) "default to §5-reification,
fallback to opaque `edgeId`" — this is a genuine *judgment-call default* the owner/architect is being asked to
bless, explicitly framed as a LENS in the source ("Recommendation — as a LENS (owner/architect decides)").
Folding both into one "never X / by default Y" line, uniformly tagged provisional, doesn't misstate anything
(if anything it under-claims certainty on (i) rather than over-claims on (ii) — safe direction) — but an owner
skimming one line may not distinguish "this part is close to a proven constraint" from "this part is a
preference you're being asked to set." **Suggest (not required):** split grain B's single line into "never
interval-as-key (near-settled, technical)" + "default reify / fallback opaque-edgeId (owner lens, provisional)"
when this goes into `OWNER-QUEUE.md`, so the owner's attention lands on the part that's actually theirs to
decide.

## What I looked for but didn't find problems with

- **Anchors verified by opening files, not trusting quotes:** `predicates.ts` (dedup-by-`(predicate,target)`
  in the `many`/ACCUMULATE branch, `LOCKED_MANY_PREDICATES` lock), `types.ts` (`Edge` shape — no `edgeId`
  field exists today; `validFrom`/`validTo` reserved-not-consumed, matching "provisional/not yet built"), and
  `projection.ts` (`isProjectable` gate) all match the synthesis's and its sources' descriptions exactly.
- **Two-laws consistency:** `two-laws.invariant-candidate.md` Instance 2 independently frames F6's *direction*
  (reify/opaque-key/concede) as owner-forked and provisional-until-S3, and frames "opaque-only identity key,
  never interval-valued" as the FORM being laid — same two-tier structure this critic flags above, arrived at
  independently by a different document. No contradiction between the two.
- **Status hygiene:** synthesis frontmatter (`status: review`) and question frontmatter correctly reflect
  "ready for critic, not yet resolved" — no premature `resolved`/`done` marking found anywhere in the chain.

## Recommendation

Both grains are ready for `OWNER-QUEUE.md` as separate cards. No smuggle found; one wording tightening
suggested for grain B (optional, does not block `resolved`).
