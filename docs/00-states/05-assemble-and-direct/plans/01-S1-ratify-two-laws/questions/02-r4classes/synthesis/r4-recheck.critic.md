---
node_type: analysis
title: "Q-R4 disposition — adversarial re-check"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-10
kind: knowledge
lens: critic
plan: ../../README.md
sources:
  - ./r4-disposition.recommendation.md
  - ../../../../../../packages/engine/src/core/admission.ts
  - ../../../../../../packages/ingest-rentacar/src/core/reduce.ts
---

VERDICT: CLEAN

## Verification

1. `admission.ts:26-43` DEFAULT_PII_KEYS is field-name matching only (name/phone/email/passport/card/etc.).
   No age/health/biometric/legal-status key anywhere in the file. `scan()` (52-83) walks payload/edge-meta
   by key-name and regex (email/phone), never by referent semantics. Confirmed: zero referent-class signal.
2. `admit()` (130-149) is structurally fail-closed: refuses inline PII before journal write, no
   `homeRegistry`/injection escape hatch. `admitHome()` (110-124) is the distinct GAP-3(c) one-home barrier;
   line 111 (`if (!homeRegistry) return ok()`) and line 115 (unregistered fact_kind → `ok()`) are its
   fail-open defaults, explicitly documented at 108 ("Fail-OPEN on a missing `domain`... owner may
   tighten"). The brief's "admission.ts:111,115 fail-open" and R4's `admit()` are indeed two different
   mechanisms — correction holds.
3. `reduce.ts:75-77,88-89` confirms only `name`/`phone`/`recentNote` are PII-routed to the ref store; no
   age/DOB/health/biometric/legal field is read, computed, or carried anywhere in the reducer. Caveat (a)
   (no classifier input exists) is grounded, not asserted.

## Smuggle check

The recommendation does NOT quietly bless A. §4 step 2 and the §5 "exact sentence" both require the owner
to say, in words, that C is not implementable and that A is accepted *as a forced default, not a considered
risk choice* — with a named reason, a seeded task (`Q-classifier-gap`), and an explicit revisit trigger
(scope growth past pilot). That is materially different from silent-A: it forces the choice into an
artifact the owner must ratify, not a default that just happens. No file:line shows A being adopted without
this gate.

## Assessment

Not evasion. "Defer" here is the only honest disposition: C's literal form (unclassified→block) is
verified to degenerate to "block ~100% of ingest" because no referent-class signal exists in the schema,
PII-key list, or reducer — this is a real absence, not a modeling choice dressed up as one. B has nothing
to bind against today (menu enumeration is prep, not a functional gate). Framing it as "A is forced, not
chosen" and requiring an explicit owner sentence is the correct move against silent-default risk.

## Minimal fix

None required — recommendation is grounded and the smuggle is closed. One tightening (optional, not
blocking): §4 step 6's revisit trigger ("scope growth past pilot") has no numeric/objective threshold: add
one (e.g., record count or specific new project) so the trigger isn't itself indefinitely deferrable.
