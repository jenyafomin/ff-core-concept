---
node_type: critique
title: "Adversarial re-check of Q-I4 disposition analysis (B-now/A-later)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-10
kind: knowledge
related:
  - ./i4-disposition.analysis.md
---

# Verdict: CLEAN

All four load-bearing claims independently verified against the current working tree (dirty, uncommitted on top of `95973a9`, branch `refactor-tree`).

1. **Tests actually run** (not trusted from the doc): `npx vitest run` on `packages/rental-balance/test/erasure-byref-shred.test.ts` + `erasure-plane-falsify.test.ts` → **12/12 passing** (6+6), including the cross-process real-disk shred test. Matches claim exactly.

2. **`buildErasedAct` output shape** (`packages/engine/src/core/erasure.ts:117-137`) confirmed by direct read: `{ id, actor, provenance: {source_ref, erases_act}, recordedAt, actKind, edges, payloadRef, payloadHash, hashScheme? }`. No requester name, no free-text reason field. Test (`erasure-byref-shred.test.ts:168`) calls it with `actor: 'agent:erasure'` — a system identity, not a human requester. `hash.ts:9-17` comment matches the "salted, not bare digest" claim.

3. **ADR-0009 ③ two-component claim** confirmed verbatim at `ADR-0009-erasure-witness-and-recursive-seam.md:107-109`: "Опознающее содержимое ВНУТРИ монумента — атрибуция требователя... **и** опознающая типовая мета" — two named categories, not one. Option C (requester-field-only) structurally covers only the first.

4. **ADR-0007 carve-out still unratified** confirmed at `invariants.md:81-87` ("PENDING carve-out... НЕ ратифицирован... I-4 остаётся ЖЁСТКИМ как есть") and `ADR-0007-erasure-and-admission.md:330` (exit criterion #2: "I-15 + carve-out I-4 приняты" — listed as precondition, present tense "нужен carve-out" at line 14). No ratified I-4 carve-out exists anywhere in canon today.

## Sharpest confirmations
- Test run output observed directly: `Test Files 2 passed (2) / Tests 12 passed (12)`, zero carve-out in effect at time of run.
- `buildErasedAct`'s literal returned object has no slot for a requester name — the I-4 concern (identifying content inside the monument) has no current attack surface to violate.

## Minor note (not a defect in the analysis)
`opts.actor` is typed as a free string on `buildErasedAct`'s call signature — nothing in the type system prevents a future caller from passing a human name as `actor` instead of `'agent:erasure'`. This is not "requester attribution" per ADR-0009's own definition (who invoked the GDPR right vs. who executed the erasure), so it does not contradict the analysis's claim about the code's output *today*. Worth a one-line note in the eventual seam-③ field design so `actor` isn't accidentally overloaded as the attribution field later.

No claim in the analysis was found false. B-now/A-later recommendation stands.
