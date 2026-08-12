---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
related:
  - packages/ingest-rentacar/
  - packages/rental-balance/
---

# Ingest "duplicate pipeline" smell — verdict: complementary, not duplicate

Triggered by a prior trace flagging two actor names/runners that look parallel:
`ingest-rentacar` (`ACTOR='sync:ga-rentacar'`, `DEDUP_ACTOR='agent:ga-rentacar-dedup'`, `ingest.ts:52`)
vs `rental-balance` (`INGEST_ACTOR='sync:rentacar-onecar'`, `OBSERVER_ACTOR='agent:balance-observer'`,
`ingest.ts:46`). Read both packages end to end (`ingest.ts`, `core/keys.ts`, `core/reduce.ts`,
`index.ts`, `package.json`, CLI, tests) plus `git log` recency and cross-package imports.

## Comparison table

| | `@ff/ingest-rentacar` | `@ff/rental-balance` |
|---|---|---|
| **Purpose** | M1: full rentacar data ingest (Cars + Orders) from the real Google-Sheets-shaped export, with PII-out payload store, cross-order same-as dedup (M2), customer lens | P1: one-car **payment** vertical — order/payment ingest → balance arithmetic → the first agent write-back cycle (`balance-observer`) → owner CLI |
| **Source shape** | `Cars` + `Orders` sheets, columns `#`, `Plate No`, `Customer`, `Mobile`, `Recent Note`, etc. (real ga-rentacar export shape) — `docs/03-projects/ga-rentacar/specs/02-ingest-acts.spec.md` | `Orders` + `Transactions` sheets, columns `Order`/`Order Ref`, `Plate`, `Customer Code`, `Total`, `Txn`, `Amount` — a **different, simplified one-car fixture**, namespaced `rentacar.onecar` — `docs/_log/2026-07-28-realization-concept-review/BUILD-P1.spec.md` |
| **Key namespace** | `sheets:Orders#<numCore>`, `sheets:Cars#<plate>` (`core/keys.ts:25,62`) | `rentacar.onecar:<Entity>#<key>` (`core/keys.ts:19,28`) — explicitly namespaced so it "never collides" with the M1 `sheets:...` namespace (comment `core/keys.ts:11`) |
| **PII handling** | Name/phone/Recent Note → `PayloadStore` (by-ref, hashed) — `core/reduce.ts:88-89` | None — deliberately non-PII; docstring: "the PII payload-store path is already proven in `@ff/ingest-rentacar` and is out of P1 scope" (`core/reduce.ts:12`) |
| **Pipeline shape** | reduce → `engine.write` (`ingest.ts:33-66`) + separate M2 dedup (`dedup/same-as-writer.ts`) + customer lens | reduce → `engine.write` (`ingest.ts:27-59`, near-identical CQRS tally shape, doc says so explicitly `ingest.ts:3`) + `agent/balance-observer.ts` (reads projection, computes remaining, writes an `observation` act back) |
| **Actor names** | `sync:ga-rentacar` (`core/reduce.ts:29`), `agent:ga-rentacar-dedup` (`dedup/same-as-writer.ts:25`) | `sync:rentacar-onecar`, `agent:balance-observer` (`core/keys.ts:22,25`) |
| **Dependency direction** | Depends only on `@ff/engine` | Depends on `@ff/engine` **and** `@ff/ingest-rentacar` (`package.json:22`) |
| **Reuse across packages** | Exports `hashOf`, `Row`/`RowSource` types, `FixtureRowSource`, `RENTACAR_PREDICATES`, `FilePayloadStore`, `reduceOrderRow`, `orderSourceRef` — all imported by `rental-balance` | Imports `Row`/`RowSource` type (`ingest.ts:8`), `hashOf` (`core/reduce.ts:15`), `FixtureRowSource`+`RENTACAR_PREDICATES` (`surface/cli.ts:11`), and directly reuses `reduceOrderRow`/`FilePayloadStore`/`orderSourceRef` in its erasure test (`test/erasure-byref-shred.test.ts:19,33-39`) and harness (`test/harness/erasure-plane-harness.ts:9-25`) |
| **Active / wired?** | `runIngest` called only from its own `test/ingest.test.ts` (DoD gates T1/G3/RB/QN) — **not** called by `rental-balance` or any CLI. `SheetsRowSource` (the real production source) is a deliberate unimplemented skeleton, explicitly gated on owner decision F-D (`adapters/sheets-row-source.ts:1-9`) | `runPaymentIngest` is called from the real CLI (`surface/cli.ts:43`, `bin: rental-balance balance --fixtures <dir>`) and from `balance.test.ts`, `erasure-plane-falsify.test.ts` |
| **Last touched** | `git log`: same commit `ccbbb96` "huge work S1-S3" (2026-08-11) as rental-balance; prior own commits `a02f759` (M2 dedup+lens), `23a569a` (M1 adapter) | Same commit `ccbbb96`; prior own commits `95973a9` (durable+erasure wiring), `ee70446` (P1 vertical) |

## Verdict

**Complementary, not duplicate.** `rental-balance` is a genuine downstream consumer of
`ingest-rentacar` — a one-directional dependency (`package.json:22`, confirmed by every import site
above), not a parallel reimplementation of the same pipeline. It reuses the shared M1 machinery
(hash, row types, fixture adapter, predicates, PII payload store, and even the M1 `reduceOrderRow`
itself in its erasure test) rather than re-deriving it. The two `reduceOrderRow` functions that share a
name are **not** the same logic: they parse different column sets from different source shapes
(`#`+`Plate No` vs `Order`+`Plate`) into different key namespaces (`sheets:...` vs
`rentacar.onecar:...`) by design — the namespace comment (`core/keys.ts:11`) states this explicitly:
"two sources coexist without clobbering." `rental-balance/test/erasure-byref-shred.test.ts:14-16`
states outright that `rental-balance` is "the only package depending on BOTH `@ff/engine` ... and
`@ff/ingest-rentacar` ... — engine cannot import ingest (dependency cycle)," which is the intended
layering, not an accident.

**Is `ingest-rentacar` dead?** No — it is not orphaned, but it is **not yet wired to a real production
data source**. Its own `runIngest`/M1 pipeline runs only inside its own test suite (fixture data), and
its intended production adapter (`SheetsRowSource`) is a deliberate, documented skeleton blocked on an
open owner decision (F-D — real Sheets/Postgres read access). `rental-balance` does NOT call
`runIngest`/M1 at all; it has its own `runPaymentIngest` for a different, simplified one-car fixture
source. So: `ingest-rentacar` is an actively-maintained, actively-imported **library** with a
not-yet-connected production entrypoint — not dead code, but its "real" ingest path is currently
untested against real data and its readiness is gated on an owner call already flagged in the code
(F-D) — this is a **pre-existing gap**, not one this analysis introduces.

**Which is canonical?** Neither supersedes the other — they are different layers: `ingest-rentacar` =
shared M1 rentacar-domain library (source-agnostic-ready: fixture now, sheets later); `rental-balance`
= a P1 product vertical built on top of it, with its own smaller reducer for a distinct data shape.

## Recommendation (doc-discipline framing — no move performed)

1. **Keep both, as-is.** This is not a duplication that should be merged or archived — collapsing
   `rental-balance`'s reducer into `ingest-rentacar`, or vice versa, would break the intentional
   namespace separation (`sheets:...` vs `rentacar.onecar:...`) and the documented PII-scope split.
2. **Add a note, not a move.** The relationship (`rental-balance` depends on `ingest-rentacar`; two
   independent `reduceOrderRow`s for two independent source shapes; M1 sheets path still unwired) is
   currently only discoverable by reading source comments across both packages. Recommend a short
   cross-link note — e.g. in each package's `index.ts` header comment or a shared
   `docs/03-projects/ga-rentacar/` doc — stating explicitly "these are layered, not parallel; see
   `core/keys.ts` namespace comment for why two `reduceOrderRow`s coexist." Owner call: where this note
   lives (candidate home: `docs/03-projects/ga-rentacar/` topic, since that's where the M1 spec already
   lives per `packages/ingest-rentacar/src/index.ts:3`).
3. **Separately worth flagging to the owner (not a doc-discipline action):** `ingest-rentacar`'s
   production data path (`SheetsRowSource`) is still an unimplemented skeleton gated on F-D. That's a
   product-readiness gap, orthogonal to this duplication question — surfacing it here so it isn't lost,
   but the fix is an owner decision + build task, not a doc move.

## Unknowns flagged

- Whether `docs/03-projects/ga-rentacar/specs/02-ingest-acts.spec.md` and
  `docs/_log/2026-07-28-realization-concept-review/BUILD-P1.spec.md` (the two specs referenced in each
  package's `index.ts` header) already document this layering relationship — **not read in this pass**;
  if they do, the "add a note" recommendation above may already be satisfied there and only needs a
  cross-link, not new prose.
- Whether "F-D" (the open owner decision gating `SheetsRowSource`) has a canonical doc home already —
  not located in this pass; if it does, recommendation 3 should point there instead of restating it.
