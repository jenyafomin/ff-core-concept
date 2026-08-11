---
node_type: critique
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-08
target: ./two-laws.invariant-candidate.md
related:
  - ../../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md
  - ../../../../_log/2026-08-08-orchestrated-design-push/work/D4-decision-lens-briefs.analysis.md
  - ../../../../_log/2026-08-08-orchestrated-design-push/synthesis/SPEC-DELTA-DOCKET.md
---

# Critic — smuggle-check on `two-laws.invariant-candidate.md`

## Verdict: DIRTY

One CONFIRMED smuggle (internal inconsistency that fixes an operator the doc claims is open), plus two
lower-confidence concerns. Not clean enough to carry to the owner as-is; needs a targeted rewrite of
U-L2's Statement/enforced-at/violated-when (not a full redo).

## The author's 3 self-flagged suspicions

1. **U-L1 "presence of admission-point" reads as pre-decided fail-closed** — CLEAN.
   `two-laws.invariant-candidate.md:52-53` ("Присутствие ≠ выбор поведения") + the full R4 box
   (`:73-81`, explicit "S1 фиксирует лишь ЯВНУЮ диспозицию владельца... не пишет fail-closed за него")
   consistently keep fail-open/closed as R4/owner. Note (not a candidate defect): the *source* DIRECTION
   doc itself is inconsistent — `DIRECTION-to-ready.md:37` says "fail-ЗАКРЫТАЯ форма admission" as part
   of Закон-1's summary, while `DIRECTION-to-ready.md:112` (§7, the actual ratification text) says
   "fail-open/closed + классы = R4". The candidate correctly followed the more careful §7 wording, not
   the sloppier §1 summary — this is the candidate doing its job, not smuggling.

2. **U-L2 triad conjunction ("all three obligatory") pre-decided** — CONFIRMED SMUGGLE.
   The Statement (`:93-95`) reads: "...ТОГДА И ТОЛЬКО ТОГДА, когда оно растит СВОЮ идентичность + СВОЁ
   состояние-во-времени + является локусом согласия/стирания" — a "тогда и только тогда" (iff) over
   three "+"-joined clauses is, in plain reading, a strict conjunction: all three necessary AND
   sufficient. The owner-box (`:121-124`) then claims "точная логическая форма... НЕ зашита здесь...
   строгий оператор фальсифицируется на 2-й форме в S3" — but the Statement itself already commits to
   one specific operator (strict AND). Worse, the doc is internally inconsistent about which operator it
   actually uses:
   - Statement (`:93-95`): identity AND state AND consent, all required.
   - `enforced at` (`:103-104`): "grow-own-identity ⇒ reify to unit" — **identity alone** is the stated
     trigger; state/consent aren't mentioned as gating conditions here.
   - `violated when` (`:107-108`): "structure с собственной идентичностью+состоянием оставлена гранью" —
     **identity+state** (two of three) is treated as sufficient for a violation; consent drops out.
   Three subsections of the same candidate law use three different operators (AND-of-3, identity-only,
   AND-of-2). Ratifying the Statement as literally written fixes the conjunction — exactly the choice the
   owner-box says is deferred to S3. This is the classic smuggle pattern: the disclaimer is correct in
   intent, but the ratifiable text above it already answers the question. **Fix:** either (a) soften the
   Statement to explicit "identity is necessary; state/consent as indicators — exact combination
   falsified in S3," matching what `enforced at` actually implements, or (b) make `enforced at` and
   `violated when` use the same three-way conjunction the Statement uses. Pick one operator for all three
   subsections, or mark the mismatch explicitly as the open question.

3. **"Сворачивает N-020" turned into a per-case verdict** — mostly CLEAN, one borderline spot.
   The "что ЗАКРЫВАЕТ" bullet (`:115`) stays conditional/abstract ("если дети растят своё → повышаются в
   единицы") — doesn't assert N-020's actual folders do or don't qualify. The owner-box (`:125-127`)
   correctly keeps the topic open. But `violated when` (`:108`) names N-020 directly as an example of the
   violation pattern: "...грань хостит грани без повышения — **прямое чтение N-020 «папка=грань-юнит»,
   противоречащее §5**." Framing N-020's *current phrasing* as an example of what the law forbids is a
   half-step toward a verdict — it pre-judges that N-020's literal reading is wrong under the new law,
   which is itself a disambiguation call the doc says belongs to the owner's future topic-opening.
   **Fix:** drop the parenthetical N-020 citation from `violated when`; keep the violation example
   generic ("a facet hosting facets without promotion") and let N-020 be resolved only via the abstract
   criterion, not via a named illustration.

## Additional smuggle found (not in the author's list)

**U-L1 Instance 2 ("opaque edge-identity") is stated as unconditional law content, but its own source
material tags it as still owner/direction-gated and provisional.**
- `two-laws.invariant-candidate.md:51-52`: "Opaque edge-identity — форма `Edge` заморожена append-only,
  ключ идентичности = только opaque-поля (не интервальные значения)" is listed flatly as one of the
  "three instances the law obliges to lay down now" — no caveat, unlike Instance 3 (admission), which
  gets an explicit R4-owner box right below it.
- But `SPEC-DELTA-DOCKET.md:36` tags this exact delta "Owner: направление F6" (i.e., still an
  owner-facing direction choice, same status class as R4/F1).
- And `DIRECTION-to-ready.md:73-75` (S2 description) is explicit that this form is provisional: "Форма
  opaque-edge-id кладётся на силе БУМАЖНОЙ рекомендации F6 (условной per-facet); S3 — её первая реальная
  фальсификация... S2-шов держать помеченным provisional, финализировать после S3."
  The candidate drops "provisional / F6-owner-direction" entirely for Instance 2, while faithfully
  carrying the equivalent caveat for Instance 3 (admission/R4). Same law, same three-instance list,
  asymmetric treatment — Instance 2 reads more settled than the source justifies.
  **Fix:** add a short caveat to Instance 2 mirroring Instance 3's: "form direction (opaque-only key)
  provisional pending S3 falsification of the F6 restoration path; not finalized here."

## What looks solid
- U-L1's core form/policy split (choke-point-now, enforcement-later) is consistently applied and doesn't
  smuggle any enforcement decision.
- The "Что НЕ входит" boundary section (`:151-155`) correctly excludes R3/R5/I-4/OQ-D from this doc's
  scope — no attempt to fold those in.
- The doc's own "Честность" section (`:136-149`) shows real self-scrutiny; #2 above is exactly what it
  asked the critic to check, and the concern is real, not paranoia.

## Confidence
High on finding #2 (textual, directly quotable, three-way internal inconsistency). Medium on the F6/opaque
-edge-identity addition (depends on whether "Owner: направление F6" in the docket is meant as a real
gate or informational tag — recommend owner clarify at ratification time either way). Low-medium on the
N-020 wording concern (defensible either way; recommend the small edit as a cheap risk-reduction, not
a hard blocker).

## Recommended next step
Do not carry to owner as-is. Return to architect for a targeted patch: (a) reconcile U-L2's three
operator-statements into one, or explicitly mark the mismatch as the thing S3 falsifies; (b) drop the
N-020 parenthetical from `violated when`; (c) add a provisional/F6-direction caveat to U-L1 Instance 2.
U-L1's admission/R4 handling needs no change.

## Re-check (2026-08-08, after architect patch)

**Verdict: CLEAN.** All 3 flagged smuggles are resolved, no new smuggle introduced.

1. **U-L2 triad conjunction — SNAPPED.** Statement (`:101-105`) no longer uses "тогда и только тогда... +
   + +" (iff-conjunction); rewritten as "несёт признаки собственного роста — по трём осям" (axes listed
   with "·", not fused into a conjunction). New warn-block (`:107-112`) explicitly defers the operator
   ("ни iff-конъюнкция... ни «идентичность необходима»... сам оператор — предмет фальсификации S3").
   `enforced at` (`:118-122`) and `violated when` (`:123-126`) now both use the same hedged phrase
   ("несёт признаки собственного роста / оператор = линза S3") — the three-way inconsistency (AND-of-3
   vs identity-only vs AND-of-2) that constituted the smuggle is gone; all three subsections agree and
   none fixes a threshold.
2. **N-020 per-case verdict — SNAPPED.** `violated when` (`:123-126`) no longer names N-020; the example
   is generic ("грань, хостящая грани без повышения"). The "закрывает" bullet (`:132`) still carries the
   same conditional framing as before (acceptable, unchanged). Owner-box (`:142-144`) still explicitly
   defers the topic.
3. **U-L1 Instance 2 opaque edge-identity — SNAPPED.** Caveat added inline (`:50-55`): "НАПРАВЛЕНИЕ ЭТОЙ
   ФОРМЫ = линза владельца (F6), НЕ решённое... provisional... симметрично Instance 3 (admission/R4)."
   A matching standalone paragraph was added to U-L1's owner-box (`:87-89`). Symmetric with the R4
   treatment now.

**New smuggle check:** none found. `enforced at`/`violated when` for U-L1 (`:62-67`) still state
Instance 2/3 flatly without re-repeating the caveat inline — but that mirrors the pre-existing,
already-accepted style (caveats live in the instance list + dedicated owner-box, not duplicated into
`enforced at`/`violated when`), applied symmetrically to both instances now, so this is not a
regression. F6-instance/monument-instance resolutions inside U-L2's `enforced at` (`:120-122`) are
stated as flat corollaries of the law, same as the pre-patch version — not part of what was flagged,
and consistent with DIRECTION's framing that resolving F6 is the intended proof of the law, not a
separate owner fork.

**Confidence:** high on all three (direct textual comparison, patch matches recommended fix precisely).

**Recommendation:** CLEAN to carry to owner for ratification.
