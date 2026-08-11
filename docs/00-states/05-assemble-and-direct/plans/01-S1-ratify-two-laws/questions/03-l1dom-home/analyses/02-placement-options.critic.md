---
node_type: critique
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
target: ./01-placement-options.analysis.md
related:
  - ../l1dom-home.question.md
  - ../../../work/two-laws.invariant-candidate.md
  - ../../../../../_shared/OWNER-QUEUE.md
  - ../../../../../../../02-project/core/00-kernel/invariants.md
  - ../../../../../../../02-project/core/01-brain/03-unit/UNIT-SPEC-v1.design.md
---

# Critic — neutrality + accuracy check on `01-placement-options.analysis.md`

## Verdict: DIRTY (repairable — no full redo; 2 concrete fixes)

## 1. Neutrality — MOSTLY CLEAN, one asymmetry worth a fix

No hard smuggle of the kind `critic-smuggle-check.critic.md` caught earlier (a disclaimer that doesn't
match what the ratifiable text already commits to). A/B/C get symmetric plus/minus paragraphs, each with
its own citations, and the "рычаг" section states three weightings side by side (area-fit→C, one-registry
→A, cheap-iteration→B) without picking a winner among them. The doc's own open question at the end
(`01-placement-options.analysis.md:111-115`, "действительно ли U-L1 субстрат-широк ЦЕЛИКОМ?") actively
*undercuts* C's premise — that's evidence of real even-handedness, not softened self-critique.

**Concern (not a smuggle):** after the three-way weighting bullets, C alone gets a second, longer
paragraph ("Есть ли естественный фаворит по doc-tree? Формально да...", `:104-109`) elaborating why it's
the doc-tree default. A and B get no equivalent second pass even though each already had a one-line
"вес на X → A/B" claim that could symmetrically be expanded. The content is heavily hedged ("НЕ
рекомендация", "оговорка", "безопаснее A" without the stub) so this reads as *space* asymmetry
(recency/primacy: C is the last thing the reader sees before the section ends), not a *truth-claim*
asymmetry. Low severity, but on a doc explicitly designed to defend against smuggle, it's worth trimming
or mirroring — e.g., add one clause after the A/B bullets noting doc-tree law 8 ("один навигатор") is
itself a lens toward A, symmetric to the C elaboration.
→ **CONCERN.**

## 2. Accuracy of the U-L2 minus (Option A) — one claim checks out, one is a false anchor

**"U-L2 = unit-специфичен → scope-инфляция ядра" — CONFIRMED accurate.** Cross-checked
`UNIT-SPEC-v1.design.md:73-77` (§5 «Правило рекурсии», facet↔unit promotion) — this rule is defined
entirely in terms of the unit/facet model; it presupposes the concept "unit" the way the analysis claims.
`invariants.md` groups 1-7 (I-1..I-14) are all substrate-wide (identity, acts, projections, policy,
storage, plugins, retrieval) with no existing unit/facet-specific member — so grafting §5's promotion rule
in would indeed be the first model-local invariant in an otherwise substrate-wide list. Claim holds.

**"провизорный оператор U-L2 в самом дорогом-к-правке слое" — claim is directionally plausible but the
cited support is a broken anchor, not evidence.** `01-placement-options.analysis.md:50-52` writes:
"**Стоимость правки:** ядро = Конституция, амендмент = R2/R3-уровень (`OWNER-QUEUE.md:45-52`, аналогия
Q-I4)". I read `OWNER-QUEUE.md:45-52` directly (the Q-I4 card, "Гейт кода Шага-1... монумент-контент
carve-out") — it says nothing about amendment cost, risk classes, or R2/R3 anywhere in that span. The
"R2/R3" token is also **already a different, heavily-used local ID space in this project** — in
`OWNER-QUEUE.md`, `D4-decision-lens-briefs.analysis.md`, and elsewhere, `R2/R3/R4/R5` name *owner-forks /
spec-requirements* (e.g. `Q-R3` = "юрисдикции считают топологический остаток identifying?", `Q-R4` =
admission default), not the global `~/.claude/rules/on-demand/evolution.md` "Change risk classes R0-R4"
governance framework (R2 = hook changes, R3 = new tool/permission access — a scheme built for
agent-instruction layers: Universal core / rules / skills / hooks, not project knowledge docs). The
analysis's parenthetical reads as if it cites project evidence for "core = expensive to amend," but the
cited lines don't contain that claim, and the term it reaches for is already overloaded threefold inside
this same project. **Fix:** drop the `OWNER-QUEUE.md:45-52`/`R2/R3` citation; if the intent is "amending
`invariants.md` is high-friction because it functions as this project's Конституция," say that directly —
support exists (`UNIT-SPEC-v1.design.md:54`, "КОНСТИТУЦИЯ (I-1..I-14) > policy-as-data >
integrity-as-engine-duty" — the project's own vocabulary already calls it that) — without borrowing an
unrelated numbering scheme that isn't in this doc's source list at all.

Secondary, lower-confidence note: `invariants.md` frontmatter is `status: draft` with an explicit
`PLACEMENT` note that its own location is "staged... owner may relocate — reversible"
(`invariants.md:4,16`). The analysis's "Конституция"/expensive-to-amend framing is *directionally*
supported by how UNIT-SPEC already treats it, but the file's own current status is not yet locked-down —
worth the analysis naming that the "expensive" framing describes intended/eventual rigor, not today's
formal amendment process (none is defined in the file).
→ **CONCERN** (citation is broken/misleading; underlying directional claim survives on a different anchor).

## 3. Missing 4th option — CONFIRMED gap, and the doc's own text supports it

The brief frames the choice as A / B / C only. A 4th option is available and not mentioned: **defer
placement — leave both laws provisional in `work/two-laws.invariant-candidate.md` (their current home)
until S3 falsifies the U-L2 operator (and, per the open question at `:111-115`, possibly the U-L1
Instance-2/3 scope too), THEN place.** This isn't a stretch — the node's own sources undercut the urgency
to decide now:

- `l1dom-home.question.md:60-61`: "Черновики S2 (`Q-formsdraft`, `Q-S2draft`) пишутся
  **placement-agnostic** — текст дельт не зависит от исхода этой развилки, вклейку делает S2 ПОСЛЕ ответа
  владельца." S2 already tolerates the home being undecided.
- `OWNER-QUEUE.md` marks `Q-Law1`/`Q-Law2` (ratify content) 🔴 but `Q-L1dom` (choose home) only 🟠 —
  the project's own priority queue already treats placement as lower-urgency than ratification, i.e.
  separable.
- `l1dom-home.question.md:35-37` names the only real cost of waiting: a "dead reserved number" if I-16/I-17
  are pre-claimed and later abandoned — but Option D avoids that cost entirely by *not* claiming I-16/I-17
  until S3 has actually falsified U-L2's operator, which is exactly when a provisional-in-Constitution
  placement stops being premature.

Option D's own honest minus: two provisional laws sitting in a `work/` staging doc for the S1→S3 gap is
itself a partial "second home" (mirrors Option C's minus), and it delays the "one canonical place" benefit
A/B/C all offer immediately. That's a real cost, not a free win — but it should be on the table next to
A/B/C so the owner is choosing among four priced options, not three.
→ **CONCERN** (real gap; not a blocker, since the node is explicitly a "бриф" that can be amended before
owner sees it).

## What I looked for but didn't find problems with

- **A/B/C plus/minus pairs themselves** — each anchored to real file:line, no fabricated claims found
  beyond the R2/R3 citation above.
- **U-L1 "субстрат-широк" claim for Option A/C** — matches `invariants.md` I-7/I-9 content directly
  (`:134-145`, `:158-167`); the doc's own hedge (open question, U-L1 might not be *fully* substrate-wide)
  is honest, not a cover for a hidden verdict.
- **"Owner decides, not architect" framing** — consistent throughout both files (`l1dom-home.question.md`
  §Ставка/§Границы, `01-placement-options.analysis.md` header note) — no silent pre-decision found for
  the core placement question itself.

## Confidence
High on the broken `OWNER-QUEUE.md:45-52`/R2-R3 citation (directly verified, quotable). Medium-high on the
missing 4th option (the node's own sources supply the argument for it). Low-medium on the space-asymmetry
neutrality concern (defensible either way; cheap to fix, not a hard blocker).

## Recommended next step
Return to architect for two small patches, not a redo: (a) replace the `OWNER-QUEUE.md:45-52`/"R2/R3"
citation in Option A's minus with a direct claim anchored to `UNIT-SPEC-v1.design.md:54` ("Конституция"
framing) or drop the specific-cost claim down to "high-friction by convention, no formal amendment gate
defined yet"; (b) add Option D (defer/provisional-until-S3) as a fourth priced option, or explicitly note
in §Рычаг why it was excluded. Neither patch changes the owner-facing conclusion (still no vendict); both
make the brief more defensible under audit.
