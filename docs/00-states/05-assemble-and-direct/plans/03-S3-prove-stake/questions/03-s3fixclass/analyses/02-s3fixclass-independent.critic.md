---
node_type: critic
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
agent: critic
verdict: CLEAN
target: ../analyses/01-s3fixclass.analysis.md
question: ../03-s3fixclass.question.md
related:
  - ../../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../../packages/engine/src/core/types.ts
  - ../../../../../../../packages/engine/src/adapters/store-durable-fs.ts
  - ../../02-f6confirm/synthesis/01-f6confirm.synthesis.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md
---

# Critic pass — Q-S3fixclass analysis

**Verdict: CLEAN.** All code anchors verified against real files line-by-line; no misquote found.
`predicates.ts:98-118` (foldEdges, dedup at `:113` `findIndex((e)=>e.predicate===edge.predicate &&
e.target===edge.target)`), `:49-59` (LOCKED_MANY_PREDICATES/cardinalityOf), `types.ts:26-41` (Edge shape,
`validFrom/validTo` RESERVED per comment), `store-durable-fs.ts` C5 lock (`:22-24`) and C2 hydrate
(constructor call `:92`, `hydrateFromDisk` `:171`, off-by-one on the ":170" citation, immaterial) — all
confirmed present as described.

## 1. `(predicate,edgeId)` vs D3 — confirmed, debt disclosed not hidden
Defeats the counter-example: correction keeps the same `edgeId` while `validTo` changes, so `findIndex`
still matches → REPLACE (not the widened-tuple bug D3 killed). The analysis does NOT claim zero cost — it
names three real debts (retrofit-impossible timing per U-L1 Inst.1, who-mints-id relocating judgment to
tenant ingest when no natural key exists, registry-surface growth). No new problem found beyond what's
already listed. Minted-id concern is real but correctly scoped as "relocated, not eliminated" rather than
swept away.

## 2. `supersedes` standalone — conclusion holds, one wording imprecision
§2's two candidates for what `supersedes` names (bare `(predicate,target)`, or an act-id) are exhaustive
in substance, but the act-id branch is mislabeled "heuristic" — an EXPLICIT pointer to the exact
introducing act's id isn't inherently a heuristic ("most recent…") the way it's phrased. That said the
paragraph's own closing line ("collapses to fix-class 1 if it names an edgeId") already covers this case
correctly — an act-id used as a stable pointer IS an opaque id, i.e. fix-class 1 wearing a different name.
Net: conclusion survives; only the intermediate framing is loose. CONCERN-level, not blocking.

## 3. Residual-near-empty risk — REAL, independently confirmed at the source
Checked `F6-edge-identity-design.design.md:147-154,174`: the design doc's own reification trigger is
"corrections, supersessions, coexisting siblings, own provenance history" — and D3's falsifying example
(Jan1-10 corrected to Jan1-15, disjoint sibling stint) is *exactly* that shape. So the risk isn't
speculative rhetoric grafted on — it's derived from the same source F6-B(b) cites for its own criterion.
If S3 picks a fixture shaped like D3's own example, it reifies by the design doc's own test, `foldEdges`
never gets touched, and the REPLACE/ACCUMULATE contract stays unverified in code — a live repeat of the
`access_event` miss already found in `01-s3scope.analysis.md §1`. **Serious, not a provocation** — it is
scoped correctly as an open engineering question for S3 to resolve by fixture construction (§4/§6 give a
concrete checklist item), not resolved or hand-waved away.

## 4. Hypothesis framing — not smuggled
§5 is explicitly headed "NOT final, 'S3 подтверждает'" and its own bullet 3 states the reify-vs-fallback
split is "not resolved here." §3's "confirmed by construction" is a fair claim (both supersedes-alone
branches were actually constructed and shown to fail/collapse, not just cited). No silent verdict-carry
detected.

## What I looked for but found no problem with
- Anchors/line numbers — all verified against live code, off by one line at most (cosmetic).
- Whether fix-class 1's registry-declared-identity-key idea contradicts `LOCKED_MANY_PREDICATES` — no,
  orthogonal (cardinality lock vs identity-key declaration are different registry axes).
- Whether C2 replay-order-independence claim is fabricated — no, `store-durable-fs.ts:170` comment and
  `:92` call both exist and say what's cited.

**Confidence:** high on code-anchor accuracy (read every cited line); medium-high on the residual-near-empty
severity call (logically sound and source-grounded, but "how populated the residual class is in practice"
is genuinely an empirical question S3 hasn't run yet — that's the analysis's own honest boundary, correctly
left open rather than guessed at).
