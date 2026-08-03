---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-03
node_type: question
title: "Owner P0 forks surfaced during the root-seal night loop (do not guess)"
tags:
  - needs-home
  - owner-decision
  - root-seal
related:
  - ../_log/2026-08-03-parallel-seal-and-rentacar/RESUME-BRIEF.md
  - ../02-project/core/00-kernel/analyses/invariants-enforcement/02-design-forks-a-general-and-c-home.design.md
  - ../02-project/core/01-brain/01-overview/01-values/analyses/2026-08-03-seal-vs-values-review.analysis.md
---

# Owner P0 forks — surfaced, NOT decided (root-seal loop, 2026-08-03)

Per the loop contract (§5.5): irreversible decisions not covered by the brief are recorded here, not
guessed. Each is unblocked design-wise (a reversible mechanism is built/ready around it) — only the
one-way-door value call is yours.

## F-1 (V7 · CRITICAL) — where does erasable payload physically live?
The V7 right-to-erasure SHAPE seam is now laid (pure `splitAct`/`redactAct`/`isErasureVerifiable`,
`core/erasure.ts`, 5 tests) — it proves immutable audit meta ⟂ erasable payload are separable, so a
future hard-erase never rewrites the append-only log. **Undecided (one-way door, critic Risk 1):** must
ALL erasable payload travel **by-ref** (out-of-journal blob, shred-to-erase, hash-verifiable) — vs inline
in the journal (erasure then means rewriting the append-only log OR a costly retrofit)? Today only PII is
forced by-ref by admission; non-PII inline payload is durable-forever and NOT verifiably erasable. Decide
BEFORE much more content is journaled under the current adapter.

## F-2 (a·general append-only-forward) — is there a deliberate re-baseline op, and does it preserve history?
Architect chose refuse-on-narrow via a journal-recorded registry snapshot (reversible, zero Act-envelope
change; design doc `02-design-forks-*`). **Undecided:** does a legitimate migration/re-baseline operation
exist that MAY narrow a predicate `many→one`, and if so must it preserve or may it collapse the wide-era
history? (The guard refuses ALL narrowing until you say otherwise.)

## F-3 (c·one-home) — home granularity + fail-open vs fail-closed on missing domain
Architect chose an opt-in `HomeRegistry { factKind → domain }` injected as a 4th Engine ctor arg, enforced
per-act via `admitHome`, with `fact_kind`/`domain` carried inside the already-open `provenance` object (no
new top-level Act field). **Undecided:** (a) home granularity — type-level (`payment` → one domain) vs
per-fact-instance identity across differing `source_ref`s (architect scoped the latter OUT as unneeded +
costly); (b) when a homed `factKind` arrives with NO declared `domain` — fail-open (admit) or fail-closed
(refuse)?

---
**Home when triaged:** F-1 → `core/01-brain/01-overview/01-values/` (V7) or kernel `decisions/`; F-2/F-3 →
`core/00-kernel/decisions/` (fold into ADR-DRAFT-root-seal or ratify the fork design doc). Move out of
`_inbox/` on decision.
