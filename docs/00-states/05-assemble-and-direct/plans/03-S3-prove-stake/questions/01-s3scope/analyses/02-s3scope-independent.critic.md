---
node_type: critique
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
target: ./01-s3scope.analysis.md
related:
  - ../../../../../../../packages/engine/src/core/projection.ts
  - ../../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../../packages/engine/src/core/types.ts
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md
---

# Critic — independent re-check on `01-s3scope.analysis.md`

## Verdict: CLEAN

All four load-bearing claims re-verified independently by opening the actual files (not trusting the
analyst's quotes). None are stretched; the "two forms, not one" conclusion holds and is not overclaimed.

## Per-claim re-check

1. **`projection.ts:42` gates on `actKind === 'domain_event'`, `access_event` never enters `foldEdges`
   — CONFIRMED.** `projection.ts:42-43` reads `isProjectable = act.actKind === 'domain_event' &&
   sourceRefOf(act) !== null`; `foldInto` (`:81`) returns early (`if (!isProjectable(act)) return;`)
   before the `foldEdges` call at `:115`. `types.ts:170-182` lists `access_event` as a distinct
   `ActKind` in `ACT_KINDS`, separate from `domain_event`. An `access_event` act structurally cannot
   reach `foldEdges` — confirmed by control flow, not by comment/docstring alone.

2. **`time-on-edge` concerns stateful edges inside `foldEdges` — CONFIRMED.** `types.ts:38-41`:
   `validFrom`/`validTo` are fields on `Edge`, explicitly commented "RESERVED (P2 time-on-edge); NOT
   folded/consumed by projection at P1." `predicates.ts:98-119` (`foldEdges`) is the only reducer that
   touches `Edge[]`; its `many` branch dedups by `(predicate, target)` at line 113 — exactly the
   mechanism D3 targets.

3. **"Two forms" not a naming stretch — CONFIRMED, not overclaimed.** This is the sharpest claim to
   stress-test, and it survives: `access_event` and `time-on-edge` diverge at the level of *which code
   path executes at all* (early-return vs. inside `foldEdges`), not merely at the level of different
   test fixtures for the same mechanism. `linked-to` (Этап-2, Seam-B) does reach `foldEdges` but only
   exercises the cardinality knob (`one`/`many`) on stateless edges — it never touches
   `validFrom`/`validTo`. So the analysis's axis distinction (act-kind/envelope vs. interval-identity-
   inside-fold) maps onto a real code fork, not an interpretive gloss. The one place the analysis could
   be accused of stretching — §4's claim that DIRECTION's *narrow* G2 reading (promotion-predicate
   specifically, not generic form-agnosticism) is the "actively governing" one — is honestly flagged as
   an interpretive choice between two textual readings, not asserted as the only possible reading. That
   is appropriate hedging, not overreach.

4. **D3 already falsified the "widen dedup-key" fix — CONFIRMED, and the counter-example is logically
   sound on the actual code, independently traced.** `predicates.ts:111-116`: with today's key
   `(predicate, target)`, a correction (same edge, `validTo` Jan10→Jan15) hits `idx >= 0` and REPLACES
   in place. Widen the key to include `validFrom/validTo` and the corrected edge no longer matches the
   old tuple → `findIndex` returns `-1` → `result.push` ACCUMULATES a stale duplicate instead of
   replacing. This is exactly `D3-f6-time-on-edge-falsification.analysis.md:114-124`'s claim, and it
   reproduces correctly by manually walking the `foldEdges` branch logic, not just by trusting D3's
   prose.

## What I looked for but didn't find problems with

- **Whether `access_event` gets any partial credit for G2 under the broad reading.** The analysis
  concedes this explicitly (§4, broad vs. narrow table) rather than hiding it — appropriate, not a gap.
- **Whether the DIRECTION quotes are accurately dated/attributed.** Re-read `DIRECTION-to-ready.md:19-28`
  directly: G2 defined at line 23, status line 28 ("доказан на 1 форме, 2-я нашла трещину") matches the
  analysis's transcription verbatim.
- **Whether the recommendation (S3 can be compressed, not eliminated) follows from the four claims.** It
  does — claim 1 rules out reuse, claims 2+4 establish that S3's diagnostic starting point is D3's
  falsified fix, not a blank slate. No inflation from "S3 still needed" to "S3 fully solved."

## Confidence

High. All four anchors opened directly (not paraphrased from the analysis) and cross-checked against
control flow / line numbers; no discrepancy found between the analysis's claims and the code/doc as it
currently reads.
