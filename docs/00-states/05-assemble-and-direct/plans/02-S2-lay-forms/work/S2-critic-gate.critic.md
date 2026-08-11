---
node_type: critique
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-10
target: ../../../../../02-project/core/01-brain/03-unit/UNIT-SPEC-v1.design.md (v1.1, §4/§6/§9)
related:
  - ../work/S2-entry-spec.md
  - ../../../_shared/DEFER-LEDGER.md
  - ../../03-S3-prove-stake/README.md
---

# S2 form-laying — critic gate

## VERDICT: CLEAN

## Checked, no defect found
1. **Закон-1 purity (all 5 form-deltas + §6):** grepped (d)/(e)/(f)/(g) and deref-seam text for
   decided-behavior smuggling — none found. (e) explicitly: "fail-closed / перечень классов НЕ записаны
   (это политика, не форма)"; R4 default=A traces verbatim to `DECISION-READY-PACKET.md:29` (S1 ratified),
   not invented here. §6 `read:payload` stays "пустая/за швом." No fail-closed, class-list, freshness-rank,
   or reify-default decided anywhere.
2. **Provisional discipline:** (d)/(e)/(f)/(g) and §6 deref-seam all carry explicit `provisional` tags
   with named falsification gates (S3). (d) is arguably *over*-marked — `03-S3-prove-stake/README.md:57-58`
   (Q-F6confirm night-run) later splits F6 into grain A (form-agnostic, settled) vs grain B (reify-default,
   provisional), while UNIT-SPEC marks the whole item provisional. Direction of error is conservative
   (more caution, not less) — NOTED, not DIRTY; worth a one-line refinement when S3 opens.
3. **Canon-lie/honesty:** §9 three-shelf (armed/promise/open) and read-side "ambient-authority, not
   substrate" wording verified against ADR-0009 Pending-owner section and I-4 (`invariants.md:82-87`,
   still hard/unpatched) — consistent, no overclaim. Changelog's "никакой enforcement-логики не внесено"
   holds under inspection. `store-durable-fs.ts:171` citation (eager-hydrate) verified accurate.
4. **Defer-ledger:** all 4 triggers (D-1..D-4) are observable conditions (journal content, first as-of
   read, facet ③ schema field, S3 gate closure) — none is the rejected "scope grew" pattern.
5. **LOSE-NOTHING:** §4/§6/§9 edits are additive (new subsections appended after existing content);
   changelog v1 entry preserved.

## Sharpest 3 checks that passed
- R4 default=A traced to exact ratification line, not fabricated under S2.
- All 5 form-items individually re-verified against DEFER-LEDGER's own "form incomplete without policy" bar.
- I-4 status cross-checked against `invariants.md` — no silent flip.
