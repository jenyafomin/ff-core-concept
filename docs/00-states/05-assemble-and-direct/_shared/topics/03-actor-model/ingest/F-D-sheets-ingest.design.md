---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
related:
  - packages/ingest-rentacar/src/adapters/sheets-row-source.ts   # the skeleton this design fills in
  - packages/ingest-rentacar/src/ports/row-source.ts             # the frozen inbound seam
  - packages/ingest-rentacar/src/core/reduce.ts                  # rows → domain_event acts (owns interpretation)
  - packages/engine/src/core/idempotency.ts                      # kernel dedup (idempotencyHash)
  - packages/engine/src/core/types.ts                            # Act / Provenance / PrincipalAssurance
  - packages/engine/src/ports/principal-resolver.ts              # write-principal seam (paper-freeze)
  - packages/engine/src/ports/principal-stamper.ts               # drop-and-re-stamp (paper-freeze)
  - docs/architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - docs/_log/2026-07-27-m1-build-prep/HANDOFF.md                # F-D gate definition (T2 on 4102 rows)
  - docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/analyses/03-ingest-dedup-smell.analysis.md
scope: Project (FF-Personal-Management)
phase: DESIGN — paper only, NO code, gated on owner F-D sanction
---

# F-D — Google Sheets ingest adapter (design, paper only)

> **Not a from-scratch design.** The seam already exists in code: `RowSource`
> (`packages/ingest-rentacar/src/ports/row-source.ts`) is the frozen inbound port, `FixtureRowSource`
> proves it against fixtures, and `SheetsRowSource` is a **deliberate unimplemented skeleton** waiting on
> F-D (`adapters/sheets-row-source.ts:1-9`). This doc designs what fills that skeleton — **an adapter
> behind a fixed seam, not a rewrite.** The reducer, keys, PII payload-store, and kernel dedup are already
> built and tested on fixtures; F-D only swaps the source.

## 0. What F-D actually is (from the docs)

F-D is an **owner decision/gate**, not a feature: *"give a non-secret full Orders export (4102 rows) OR
sanction a safe read path to the live DB (`rentacar_analytics_pg`)"* so the real Sheets/PG source can
replace the fixture and the T2 acceptance (0 key-collisions on 4102 real rows) + bit-exact `rebuild` can
finally run on real data (`docs/_log/2026-07-27-m1-build-prep/HANDOFF.md:50`, `SYNTHESIS.md:74`).

Two consequences the strategy notes flag (`docs/council/raw/2026-08-11-next-step-strategy/`):
- The F-D sanction is **expensive attention**: it also lights up D-1 (the 7-referent-class policy +
  classifier-gap, where a naive fail-closed admission stalls ~100% of real rows). Do **not** ask for F-D
  as a first move — show the fixture path working first, then ask on the wave of motivation (Fable).
- The **PII barrier letter is hard**: not one real sensitive row lands without an explicit F-D sanction.
  This design keeps that barrier — it produces *paper*, admits *nothing*, and reads *no* credentials.

(Disambiguation: the `F-D1..F-D4` tokens in `docs/.doc-types.json` are an unrelated doc-discipline
finding about merge/staging. This doc is the **data-access F-D**.)

## 1. What it ingests + source-of-truth stance

**Ingests:** named sheets → **rows verbatim**. The adapter's entire contract is the existing one method
`readRows(sheet: SheetName): Row[]` where `Row = Record<string, unknown>` (dirty cells, no typing). For
ga-rentacar that is `Cars` then `Orders` (`ingest.ts:28-31`; Cars first so `drives` edge targets exist).

**Rows → units/acts is NOT the adapter's job.** The frozen reducer (`core/reduce.ts`) owns interpretation
and already emits `domain_event` acts:
- Orders row → an **order** act (+ a per-occurrence **customer** act), key `sheets:Orders#<numCore>`.
- Cars row → a **car** act, key `sheets:Cars#<plate>` (SOLD-\* re-keyed, `placeholder_plate` flagged).
- Non-PII passport fields → inline `payload` (become node body); name/phone/Recent Note → **out** to the
  content-addressed `PayloadStore` (by-ref `{payloadRef, payloadHash, hashScheme}`), never inline.

**Source-of-truth stance — read-only mirror, one direction only.** The Sheet/PG is the **external source
of truth**; FF ingests a **projection** of it into acts. **No write-back to the Sheet, ever.** The data
flow is strictly:

```
Google Sheet / PG mirror  →  SheetsRowSource.readRows  →  reducer (pure)  →  engine.write(act)  →  journal → projection
        (external truth)          (this design)            (built)            (PEP/admission)       (FF's mirror)
```

The FF graph node for an order/car is a **downstream read-model of the upstream row**, not a co-authority.
If the two disagree, upstream wins on the next ingest (a changed row supersedes — see §3). FF never mutates
the sheet; any FF-side truth about these entities that must persist independently lives on **separate acts
from a different actor** (e.g. the `balance-observer` write-back in `@ff/rental-balance`), not by editing the
ingested node in place.

## 2. Provenance / principal (ties to ADR-0010: authority ≠ attribution)

A Sheets-sourced act is a **machine sync**, not the owner typing. ADR-0010's ratified invariant ① keeps two
axes independent, and this adapter is a textbook case of why:

| Axis | Value for a Sheets-sourced act | Rationale |
|---|---|---|
| **Attribution** (`whoActed`) | `actor: 'sync:ga-rentacar'` (existing, `reduce.ts:29`) — a **machine sync agent**, NOT `user:jenya` | The rows were mirrored by a program; recording the owner as author would be a lie the monument (Закон ②) must not carry. |
| **Authority** (`underWhoseAuthority`) | the **owner**, delegated to the sync runner | The owner sanctioned the sync (F-D) and supplied credentials; the ingest runs *under owner authority* but is *not* the owner acting. Authority ≠ attribution, exactly. |
| **Issuer** (who vouched) | the **trusted ingest runner** (e.g. `cli:trusted-operator` / a batch-job issuer id) | Retrofit-impossible audit fact: a later auditor must be able to tell F-D-sanctioned sync acts from hand-authored ones. |
| `provenance.source_ref` | `sheets:Orders#<numCore>` / `sheets:Cars#<plate>` | Structured `Provenance` (`types.ts:201`) — the projection natural key. |
| `provenance.snapshotHash` | fold of ALL upstream fields (incl. PII as one-way digest) | the supersede/dedup discriminant (§3). |

**How the principal gets there — NOT self-declared.** Today the reducer literally sets `actor` on the act
body (self-claim). Under the frozen principal seam (`ports/principal-resolver.ts`,
`ports/principal-stamper.ts`, ADR-0010 §③-bis) the correct end-state is:
- The ingest runner is a **trusted seam owner**. It authenticates the sync context (owner-supplied creds,
  out-of-band) and produces an `AuthenticatedPrincipal { subject: 'agent:sync-sheets'|'sync:ga-rentacar',
  trust: 'channel', issuer: '<runner id>' }`.
- `PrincipalStamper.stamp` **drops** any body-declared `act.principal`, re-stamps `principal.*` from that
  authenticated object (G1/G3), and **refuses** if the body's `actor` mismatches the authenticated subject.
- Trust never rises above `unverified` from the body itself — a Sheets row can *claim* nothing; its trust
  comes solely from the runner that authenticated the sync.

**Design stance for F-D now (behavior deferred):** enforcement of `principal.*` is deferred to M5/ADR-0011
(the seam is paper-frozen). So the F-D adapter, when built, keeps setting `actor: 'sync:ga-rentacar'` as
attribution (as it does today) and does **not** populate/enforce `principal.*`. The **design commitment**
this doc locks is: *when the seam turns on, a Sheets-sourced act is stamped as `channel`-trust attribution
`agent:sync-*` under owner authority via a runner issuer — never `attested`, never `user:jenya`.* That is
the retrofit-impossible fact to get right before real history accumulates.

## 3. Idempotency / dedup — reuse the existing two-layer pattern (no new mechanism)

Re-ingesting the same sheet must **not** duplicate acts. Two layers already exist; the adapter adds only a
cheap pre-filter.

1. **Row identity = `source_ref` (natural key).** `sheets:Orders#<numCore>`, `sheets:Cars#<plate>`. One
   graph node per `source_ref`; a re-read of the same row targets the same node.
2. **Per-row snapshot = `snapshotHash`** (`reduce.ts:92-95`): folds every upstream field of the row
   (incl. PII, as a one-way digest). Same row content ⇒ same snapshot.
3. **Kernel dedup = `idempotencyHash`** (`engine/core/idempotency.ts`): the engine computes a SHA-256 over
   `{source_ref, actKind, payload, edges}` and treats a byte-identical re-write as a **no-op**
   (`ack.dedup=true`, tallied as `deduped`), independent of `act.id` / `recordedAt` / `actor` /
   caller-supplied `snapshotHash`. This is the real guarantee — it holds even if a caller mislabels.

**Result of a 2nd identical ingest run:** every act dedups, `emitted=0` (this is exactly test T1). A
**changed** upstream row ⇒ new snapshot ⇒ new content hash ⇒ a **superseding** `domain_event` appends and
the projection takes the freshest (the append-only log grows; nothing is rewritten).

**What the ADAPTER adds (cheap, correctness rests on the kernel):**
- **Revision short-circuit (optional optimization, not correctness):** Google Sheets exposes a revision /
  `modifiedTime`; the PG mirror exposes a snapshot marker. The adapter MAY record the last-seen revision
  per sheet and skip re-reading an unchanged sheet entirely — but MUST NOT rely on it for correctness (a
  spoofed/absent revision must still dedup at the kernel). Revision = a skip hint, hash = the truth.
- **Batch / paging:** for 4102 Orders the adapter yields rows in stable order; the reducer + kernel are
  order-independent for dedup (each row keys itself), so paging never changes the act set.

**The gap the adapter CANNOT close alone — deleted / vanished rows.** An append-only mirror only sees rows
that are *present*. A row deleted upstream produces **no act** on the next run, so the FF node silently
**drifts stale** (last snapshot wins forever). Options (owner call, see §6): (a) accept drift + a periodic
reconciliation pass that diffs the current row-set against live `source_ref`s and emits a tombstone/`erased`
act for missing ones; (b) treat the sheet as append-mostly and ignore deletions. This is the sharpest open
question because it is a **semantic** choice, not an implementation detail.

## 4. Auth to Google (note only — no secret handling designed)

OAuth or a service-account is required to read a private spreadsheet, and a DSN/read-user for the PG mirror.
**Per security.md this design touches none of it.** The adapter takes an opaque `ref` (spreadsheetId or DSN)
via `SheetsSourceConfig` (`sheets-row-source.ts:12`) supplied by the **owner out-of-band**; it does **not**
read `.env`, service-account JSON, `~/.config/gcloud`, or open a live connection at design time. Credential
plumbing (where the token lives, how it is injected into the runner process) is **owner-provided secret
handling, explicitly out of scope for this paper** — flagged only so it isn't forgotten at build time.

## 5. Acceptance criteria + verification plan

**Acceptance (when built, post-F-D):**
- **A1 — seam is a swap:** `SheetsRowSource` implements `RowSource` unchanged; `runIngest` works against it
  with zero reducer/engine edits (proves the port held).
- **A2 — T2, 0 collisions on real data:** all real Orders (~4102) produce **unique** `source_ref`s (no two
  distinct orders collapse to one node); quarantined rows are counted + logged, never silent.
- **A3 — T1 idempotency on real data:** a 2nd identical ingest run yields `emitted=0`, all `deduped`.
- **A4 — bit-exact rebuild:** `rebuild` over the real journal reproduces the projection byte-for-byte
  (ADR-0008 Validation §2), on live 4102, not just fixtures.
- **A5 — PII barrier held:** `refused=0` for a clean ingest; name/phone/Recent Note appear **only** by-ref
  in the PayloadStore, never inline in any act payload (admission-gate proves it).
- **A6 — provenance/principal honesty:** every Sheets-sourced act carries `actor: 'sync:*'` (never
  `user:jenya`) and structured `provenance{source_ref, snapshotHash}`; when the principal seam turns on,
  `principal.*` is `channel`-trust under owner authority via the runner issuer (never `attested`).

**Verification plan:**
- **V1** run the existing `ingest-rentacar` test suite (T1/G3/RB/QN) unchanged against `SheetsRowSource`
  fed by the **owner-supplied non-secret export** (fixture-shaped file, no live creds) — proves A1/A3/A5.
- **V2** a collision check over all real `source_ref`s (assert `size(unique) == count(non-quarantined)`) —
  proves A2; log the quarantine reasons for owner review (dirty `#`, unkeyable plates).
- **V3** `rebuild` diff on the real journal — proves A4.
- **V4** a static scan asserting no act's inline `payload` contains phone/name shapes — proves A5.
- **V5 (deferred to M5)** a stamper test: a Sheets act with a spoofed body `principal`/mismatched `actor`
  is dropped-and-re-stamped / refused — proves A6's enforcement half.

## 6. Open questions for the owner

1. **★ TOP — read path + deletion semantics (one linked decision).** Which source do you sanction:
   (a) a **non-secret full Orders export** (safest, unblocks T2 immediately, no live creds), (b) the
   **live Sheets API** (needs OAuth/service-account), or (c) the **`rentacar_analytics_pg` mirror**
   (needs a read DSN)? — AND, for whichever you pick: **how should upstream-deleted rows behave** —
   reconcile with a tombstone/`erased` act, or accept stale drift? (§3.) This is top because it decides
   correctness *and* it is the F-D sanction itself, which also lights up D-1 (class policy) — so please
   only pull it when you want to spend that attention (Fable: after a fixture demo, not before).
2. **Actor identity of the sync.** Keep `sync:ga-rentacar`, or a generic `agent:sync-sheets`? (Affects the
   attribution recorded on ~4102 acts — retrofit-impossible.)
3. **Runner issuer id.** What is the trusted-runner issuer string for the principal seam
   (`cli:trusted-operator`? a named batch job?) — needed when M5 enforcement turns on (A6/V5).
4. **Scope of F-D data.** Orders only, or Cars too? Any sheets beyond the two the reducer knows?

---

**Better home note.** This doc lives in the actor-model topic staging (`.../03-actor-model/ingest/`)
because its load-bearing content is the **trust-line** aspect (ADR-0010 principal/provenance, §2). The
**concrete ga-rentacar adapter** aspects (§1 keys, §3 dedup, §5 T2) belong more properly next to the
existing M1 ingest spec at **`docs/03-projects/ga-rentacar/specs/`** (that is where
`02-ingest-acts.spec.md` and the reducer's key-namespace already live, per
`packages/ingest-rentacar/src/index.ts:3`). Recommended permanent split once F-D is sanctioned:
concrete adapter spec → `docs/03-projects/ga-rentacar/specs/03-sheets-source.design.md`; the
principal/authority stance (§2) stays here / folds into ADR-0010's enforcement follow-up. Move is
reversible; described, not performed (doc-discipline: on-disk only on owner "строй").
