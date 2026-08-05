---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-03
node_type: decision
Related:
  - ../analyses/13-post-m2-review-and-m3-gap.analysis.md
  - ../../../_inbox/2026-08-03-owner-forks-root-seal.md
  - ../../../02-project/core/00-kernel/analyses/invariants-enforcement/02-design-forks-a-general-and-c-home.design.md
Maturity: 70% (крепкое направление) — code-grounding проверен построчно и точен (admission.ts, оба cli.ts, reduce.ts совпадают); адверсариальный self-check есть; owner-ратификация fail-open/closed и canonical-home ещё открыта, зато НЕ блокирует рекомендованную часть работы.
---

# F-3 — one-home policy + real HomeRegistry wiring

**ID note:** dispatch originally called this "F-2"; the canonical fork registry
(`_inbox/2026-08-03-owner-forks-root-seal.md`) labels the one-home fork **F-3** (canonical F-2 is the
unrelated append-only-forward re-baseline question). Relabeled to **F-3** and file renamed to match
(2026-08-04). This document is F-3's subject.

## Grounding (code, not prose)
- `admission.ts:110-124` `admitHome()`: no `homeRegistry` → `ok()` (110-111). No `provenance.fact_kind` →
  `ok()` (115). Missing `provenance.domain` → falls through to `ok()` (117-123, fail-**open**, comment at 107-108
  admits it). Barrier only bites when ALL THREE are present: injected registry + declared `fact_kind` + declared
  `domain` that mismatches.
- **Zero production callers wire it.** `packages/engine/src/surface/cli.ts:39` and
  `packages/rental-balance/src/surface/cli.ts:27` both call `new Engine(store, FIXED_POLICY)` — 2-arg, no
  `schemas`, no 4th-arg `homeRegistry`. Only `write-plane.test.ts:149-153` constructs one.
- **No writer stamps provenance.** `packages/rental-balance/src/core/reduce.ts:127-134` builds the payment act
  with `provenance: { source_ref, snapshotHash }` only — no `fact_kind`, no `domain`.
- **No live competing writer today.** `packages/ingest-rentacar/src/core/reduce.ts` (sheets) emits `order` /
  `customer` / `car` facts only — never `payment`. `rental-balance` is de facto sole writer, just not canonized.

## 3-layer fix, why layers 1-2 are cosmetic
1. **Opt-in strictness flag** (e.g. `admitHome(act, reg, {strict:true})`) — dead code: nothing constructs a
   `homeRegistry` in prod, so the flag never executes on a real path.
2. **Flip default to fail-closed on missing domain** — still cosmetic for the same reason: `homeRegistry` is
   always `undefined` in both `cli.ts` files, so `admitHome` returns at line 111 before the default matters.
3. **Real injection (prerequisite for 1 and 2 to mean anything):** (a) `rental-balance/cli.ts:27` →
   `new Engine(store, FIXED_POLICY, [], { homes: { payment: 'rental-balance' } })`, AND (b)
   `reduce.ts:127-134` → add `fact_kind: 'payment', domain: 'rental-balance'` to the payment act's `provenance`.
   **Both required** — (a) alone leaves `fk` undefined so `admitHome` still exits at line 115; (b) alone is
   inert with no registry injected. Neither sub-step is optional.

## Adversarial self-check
- Does layer 3 need the owner's fail-open/closed call first? **No.** The one real writer today always declares
  `domain:'rental-balance'` once stamped — the missing-domain branch is never hit on the current path, so wiring
  is safe and correct under either default. Fail-open/closed only matters for a *future* writer that omits
  `domain` — not a blocker now.
- Does layer 3 need the granularity call (factKind vs per-instance)? Architect already chose factKind-level as
  default (design doc `02-design-forks-*`, §Fork c); it's the only implementation that exists. Proceeding is
  low-risk/reversible (drop the 4th arg to roll back) — ratification can trail the wiring, not gate it.
- Residual risk: stamping `domain:'rental-balance'` today is a **claim**, not yet an owner ratification of
  "rental-balance/Payment# is canonically the sole home" (per-review §4 table, "открыт"). Wiring without that
  ratification is reversible, so risk is low, but flag it as provisional in the commit/PR, not silent.

## Recommendation
- **Build now, no owner gate:** the layer-3 wiring above (ctor injection + provenance stamp), using the
  existing fail-open default unchanged. It turns the barrier from no-op to live-enforcing for the one real
  writer that exists, and costs nothing to roll back.
- **Waits for owner (F-3 in the registry):** (b) fail-open vs fail-closed default for *future* missing-domain
  writers; (a) formal ratification of factKind granularity and of `rental-balance/Payment#` as canonical home
  (currently "открыт" per post-M2 review §4).

## Open questions
- Should the provisional-claim status (writer ratified de facto, not yet by owner) be recorded as a marker on
  the registry entry itself, or is a doc note (this file) enough until F-3 is answered?
