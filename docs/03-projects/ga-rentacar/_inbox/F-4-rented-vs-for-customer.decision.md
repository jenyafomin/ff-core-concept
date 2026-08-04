---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-03
Scope: project
node_type: decision
title: "F-4 — 'rented' vs 'for-customer': unify write-side or ratify as two permanent facts"
Related:
  - ../analyses/13-post-m2-review-and-m3-gap.analysis.md
---

# F-4 — rented vs for-customer

> Note: this fork was originally drafted as "F-1" and collided with the canonical F-1 (V7, erasable
> payload) in `docs/_inbox/2026-08-03-owner-forks-root-seal.md`. It is a **different, new fork** →
> renumbered to **F-4** (2026-08-04). Don't conflate with the canonical F-1 (V7).

## Развилка

`customer-lens.ts:9-20` unions two predicate keyspaces on read because two **live, separate writers**
emit structurally-identical order→customer/car edges under different names:
- `ingest-rentacar/core/reduce.ts:99-100` — `rented`/`drives`, on `sheets:Orders#<numCore>` nodes.
- `rental-balance/core/reduce.ts:70-71` — `for-customer`/`for-car`, on `rentacar.onecar:Order#<key>` nodes.

**New grounding fact (corrects the lens comment):** `for-customer` is not a stale TODO — `rental-balance`
is a real, separate package that writes it today. Node namespaces are disjoint (no node holds both edges
yet), but the predicate registry is already shared: both pairs live in ONE file,
`ingest-rentacar/predicates.ts:19-25`, both `'one'`-cardinality. Neither writer sets
`provenance.fact_kind`/`domain` (admission.ts:110-124), so the one-home barrier (GAP 3c) is a no-op here —
it can't distinguish these as "same fact, two homes" today.

## Variant A — unify write-side (one predicate)

Touches **two packages**, not one file: both reducers must converge on one predicate pair, plus a
migration story for acts already journaled under the other name (append-only — old acts can't be
rewritten, GAP 3a forward-monotone guard blocks narrowing). Loses the implicit provenance signal the
predicate name currently carries ("this edge came from Sheets ingest" vs "payment vertical") unless
`provenance.domain` is populated instead. Bigger blast radius than the fork brief assumed.

## Variant B — ratify as two permanent facts

No migration, no cross-package touch — codifies current reality. Cost lands on every future reader: each
new lens/join must remember BOTH predicate names or silently under-return (exactly the P0 the lens header
warns about). Weakens agent-first legibility (an agent asking "what predicate is order→customer" has no
single answer). The one-home barrier stays structurally toothless for this shape unless explicitly given a
multi-domain allow-list mode — which doesn't exist in `HomeRegistry` today (it's factKind→ONE domain).

## Адверсариальная самопроверка

- Against A: if the two "orders" are permanently disjoint tenants (sheets-real vs payment-vertical
  fixture), forcing one predicate name conflates two different provenances for no data-integrity gain.
- Against B: "read-side union" is a tax that compounds — every new lens (fines-join, M3 topic agent,
  future balance merge) must carry the same two-name list or reproduce the exact bug the comment warns
  about. Formalizing B needs new engine capability (multi-home allow-list) that isn't built.
- Neither variant is free; the deciding fact is **whether sheets-orders and payment-vertical-orders will
  ever be the same real-world order** (future merge) — that answer isn't in the code.

## Рекомендация

Lean **B for now, with a mandatory registry declaration** (not silent tolerance): both writers set
`provenance.fact_kind='order-customer-edge'` + their own `domain`; extend `HomeRegistry` to accept an
explicit allow-list of homes per factKind (new, small capability) so a THIRD accidental writer is still
caught. Defer A unless the owner confirms the two order sources are meant to converge.

## Открытые вопросы владельцу

1. Will `sheets:Orders#...` and `rentacar.onecar:Order#...` ever represent the same real-world order
   (eventual merge), or are they permanently separate tenants/fixtures?
2. Is `HomeRegistry` multi-domain allow-list worth building now, or defer until a real third-writer risk appears?
3. If A is eventually chosen, which predicate name wins — `rented`/`drives` (sheets, PII-bearing, real data) or `for-customer`/`for-car` (payment vertical, code-only)?
