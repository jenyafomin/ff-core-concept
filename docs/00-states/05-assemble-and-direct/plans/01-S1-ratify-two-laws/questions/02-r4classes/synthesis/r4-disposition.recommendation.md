---
node_type: analysis
title: "Q-R4 disposition recommendation — is fail-closed (C) actually implementable today, and what is the proportionate path"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
kind: knowledge
lens: business-analyst (decision-readiness, not a decision)
plan: ../../README.md
serves_owner_fork: ../../../../_shared/OWNER-QUEUE.md   # card Q-R4
sources:
  - ../../../../../_log/2026-08-08-orchestrated-design-push/work/D4-decision-lens-briefs.analysis.md   # R4 brief :86-121
  - ../r4classes.question.md
  - ../analyses/01-r4classes-menu.analysis.md            # 7-class menu, per-class A/B/C projection + price-of-A
  - ../critique/01-r4classes.critic.md                    # CLEAN verdict
  - ../../../../_shared/OWNER-QUEUE.md                    # card Q-R4, Q-classifier-gap, Q-vip-mechanism spawns
  - ../../../../../../packages/engine/src/core/admission.ts
  - ../../../../../../packages/ingest-rentacar/src/core/reduce.ts
---

# Q-R4 disposition recommendation

## 1. Correction to the framing I was given

The task brief said "the brief cites admission.ts:111,115 fail-open today." Reading the file: lines 111/115
are inside `admitHome()` (the GAP-3(c) *one-home barrier* — which `domain` may write a given `fact_kind`),
fail-open when no `homeRegistry` is injected or `fact_kind` is unregistered. That is a **different**
admission mechanism from R4's question. R4 is about `admit()` (lines 130-149), the no-inline-PII gate,
which is **structurally fail-closed** on inline PII (`admission.ts:9-12,130-149` — refuses before any
journal write). So today's admission is not "fail-open on PII" — it correctly blocks inline PII by
reference-discipline. What it has **zero** of is a **referent-class** dimension: nothing in `admit()`,
`ActSchema`, or `DEFAULT_PII_KEYS` (`admission.ts:26-43`) inspects *who* the referent is (age, health,
legal status, VIP, biometric, deceased) — only *which field names* carry PII. `reduce.ts:75-95` confirms
the rentacar reducer carries only `name`/`phone`/`recentNote` (free text); no age, no health flag, no
biometric channel, no legal-hold field. This matters directly for whether C is implementable (§2).

## 2. Is "C fail-closed" implementable today? No — as literally stated, it is a trap.

C is defined as: unclassified referent types are treated as regime-B (blocked) until explicitly cleared.
For that to be a *surgical* block, there must be a signal to classify on. Per the per-class menu
(`01-r4classes-menu.analysis.md`):

- **Minors** — no age/DOB field exists anywhere in the ingest path. Every record is "unclassified." C
  degenerates to "block all rentacar ingest," not a targeted refusal (§1, menu :36-39).
- **Health** — only signal is free-text `recentNote`. No reliable classifier exists; C here means
  "block any note that fails an unreliable filter," i.e. mass over-block in one direction or silent
  miss in the other (§2, menu :66-70).
- **No-trace** — B/C both require edge-obfuscation, which ADR-0009 says cannot be built without breaking
  Ц-6 Реляционность; entangled with the still-open R3 fork (menu §4, :110-119).
- **Biometric/KYC, court-orders, deceased** — zero observed fields/cases in current ingest at all; C has
  nothing to trigger on (moot, not protective) (menu §3,6,7).
- **VIP** — doesn't fit the admission-time A/B/C frame at all; it's access-restriction after admission,
  not a refuse-at-entry decision (menu §5; critic confirms this is a real axis mismatch, not stretched).

Net: this repo's ingest pipeline carries **no referent-classification signal whatsoever** — not "a bad
classifier," but **no classifier surface**. A naive "unknown → block" therefore blocks 100% of records
by definition, not a subset. This is exactly caveat (a) in the task brief, confirmed against code, not
assumed. **C as worded is not a real option today** — adopting it would stall ga-rentacar M1 ingest
entirely, which is a materially different (and almost certainly unintended) action than "close the one
retrofit-impossible gap."

## 3. The honest trade

- **A (ship as-is)** is not really a value choice right now — it is the **only structurally available
  state**, because no referent-class signal exists to gate on. Its cost is real and named per-class in
  the menu ("price of A" column) — every class's first real record admits an unrecoverable append-only
  fact if that referent turns out to matter later. The cost is not zero, it's just currently unavoidable.
- **B (name classes now)** cannot do useful work yet either — you can enumerate classes in a document
  (the menu already does this), but the admission gate has nothing to check them against until fields/
  classifiers exist. Naming classes now is real prep work (cheap, reversible, worth doing), but it does
  not change what the gate DOES today.
- **C (fail-closed on unclassified)** is the one option that actively backfires if adopted literally: it
  would stop nearly all M1 ingest, not just the risky slice, because "unclassified" == "everything."

So the real fork is not "A vs B vs C" as three equally available buttons — it's "accept that today only
A is executable, and decide how deliberately vs. by default that happens."

## 4. Proportionate path (recommended disposition)

Recommend **DEFER, with a named reason and a seeded remediation task** — not a silent A, not a
performative C:

1. **Admission-point FORM stays as Law-1 already lays it** (a reserved regime-B exclusion slot in the
   admission schema) — no code change needed to keep this open for later.
2. **Owner explicitly ratifies that A is the operative default for M1 *because* C is not implementable
   and B has nothing to bind to yet** — this is different from silently defaulting to A without anyone
   deciding anything. Named reason, not oversight.
3. **Seed `Q-classifier-gap` as a tracked, prioritized task-pool item now** (it is currently only
   mentioned inline in OWNER-QUEUE, not a task-pool row) — the actual unblock for B/C is building at
   least a minors (age field) and health (note-flag) signal, since those are the two classes with
   plausible near-term hits in rentacar data. Court-orders/biometric/deceased can stay unaddressed
   (zero observed cases) without a task.
4. **VIP is pulled out of R4 entirely** and routed to `Q-vip-mechanism` (already spawned) as an
   access-restriction design question, not an admission-refuse one — do not let the owner pick VIP as if
   it were a normal regime-B class inside this fork.
5. **No-trace stays explicitly coupled to R3** (topology-identifying judgment) — do not resolve it inside
   R4; note the dependency and leave both open together, or answer R3 first if the owner wants that
   class active.
6. **Revisit trigger, not open-ended defer:** re-open R4 before ga-rentacar ingest volume/scope grows
   materially beyond the current pilot, or before any other project's ingest carries a plausible minors/
   health signal — whichever comes first. Defer-without-a-trigger is how retrofit-impossible gaps get
   forgotten; this fork is explicitly the one where that's dangerous.

## 5. Exact sentence the owner needs to say for S1 to close

> "For R4 I defer naming regime-B classes: C is not implementable today (no referent-classifier exists,
> so 'unclassified→block' would stop nearly all ingest, not a targeted subset) and B has nothing to bind
> to yet. I accept A as the forced-default for M1 ga-rentacar ingest, not as a considered risk choice —
> I ratify the classifier-gap task (minors age-field, health note-flag) to be tracked with [priority],
> and I want R4 re-opened before ingest scope grows past the current pilot. VIP is out of R4's scope
> (routes to the separate access-restriction question). No-trace stays coupled to R3 and is not resolved
> here."

## Digest

**Recommended disposition: DEFER with a named reason** (not silent A, not performative C). **C is NOT
implementable today** — confirmed against `admission.ts`/`reduce.ts`: no referent-class signal exists
anywhere in the ingest path, so "unknown→block" blocks ~100% of records, not a surgical subset (caveat
(a) confirmed). B has nothing to bind to yet (enumerate-now is cheap prep, not functional). A is the only
structurally executable state today — the fork is whether the owner ratifies that deliberately (named
reason + seeded classifier task + revisit trigger) or lets it happen by default. **Proportionate path:**
keep the admission-form reserved (already done by Law-1), ratify A-as-forced-default for M1 explicitly,
seed `Q-classifier-gap` as a real task-pool item (minors age-field, health note-flag — the two plausible
near-term hits), pull VIP out to `Q-vip-mechanism` (access-restriction, not admission-refuse — different
axis), keep no-trace coupled to R3 (don't resolve inside R4), and set a revisit trigger (scope growth
past pilot) rather than open-ended defer. Full sentence for owner to state is in §5 above. This
recommendation does not pick fail-open/fail-closed — that value call remains the owner's.
