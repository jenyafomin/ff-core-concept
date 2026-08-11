---
node_type: analysis
title: "Stage 2 D1.b runtime-verify — independent re-execution of §9-3/3b + shredPayload + F6"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
stage: 2
agent: runtime-verify
related:
  - ./00-builder.report.md
  - ../stage2-falsify-plane.assignment.md
---

# CONFIRMED

Builder's Stage-2 build is **CONFIRMED** by independent re-execution (second observation vector, no trust in the
builder report — every claim re-run from a clean tree). All 5 assignment points hold. One **material boundary
finding** (by-ref PII survives shred) is flagged for the lead — it does NOT refute any builder claim, but it
narrows what "payload physically gone" means.

| # | Claim | Verdict |
|---|---|---|
| 1 | engine 92/92, rental-balance 13/13 | ✅ reproduced exactly |
| 2 | honest §9-3 assert goes RED under mutant | ✅ reproduced red verbatim |
| 3 | physical shred on disk (bytes) | ✅ proven before/after |
| 4 | cross-process (distinct PIDs, disk-only) | ✅ observed PIDs 15567 vs 15569 |
| 5 | rehydration after shred+reboot | ✅ fresh boot, edges intact, payload empty |
| — | boundary: by-ref PII payload files survive shred | ⚠️ flag (not a refutation) |

Final `git status --porcelain`: only builder's own files present; all my probes removed (see §Discipline).

---

## 1. Test suites — reproduced from clean state (verbatim)

**engine** (`npx vitest run`, packages/engine):
```
 Test Files  15 passed (15)
      Tests  92 passed (92)
```
(incl. `crash-mid-turn`, `durable-reboot-matrix`, `cli-durable`, `survive-turn`, `erasure-seam` — full durable regress green.)

**rental-balance** (`npx vitest run`, packages/rental-balance):
```
 ✓ test/balance.test.ts (9 tests) 9ms
 ✓ test/erasure-plane-falsify.test.ts (4 tests) 1019ms
 Test Files  2 passed (2)
      Tests  13 passed (13)
```

**Typechecks (independent, not trusting builder):** `@ff/engine` `tsc --noEmit` exit=0; `@ff/rental-balance`
`tsc --noEmit` exit=0. Both clean.

→ Builder's 92/92 and 13/13 **confirmed exactly.**

## 2. Mutant RED — reproduced independently (verbatim)

Method: I did NOT trust the committed test's `.not.toEqual` framing. I wrote a throwaway probe test
(`test/_tmp_verify_mutant_red.test.ts`, since deleted) running the **HONEST** §9-3 property
`expect(r.edgesAfter).toEqual(w.edgesBefore)` against a `--mutant` write. It went RED:

```
 ❯ test/_tmp_verify_mutant_red.test.ts (1 test | 1 failed) 337ms
   × PROBE — honest §9-3 assert under mutant must FAIL > edgesAfter deep-equals edgesBefore … 336ms
     → expected [] to deeply equal [ { predicate: 'rented', …(2) }, …(1) ]

AssertionError: expected [] to deeply equal [ { predicate: 'rented', …(2) }, …(1) ]
- Expected
+ Received
- Array [
-   Object { "meta": { "role": "renter" }, "predicate": "rented",
-            "target": "sheets:Orders#45832-2865:customer" },
-   Object { "predicate": "drives", "target": "sheets:Cars#AB-12345" },
- ]
+ Array []
 ❯ test/_tmp_verify_mutant_red.test.ts:27:26
```

Cross-check via raw harness (no vitest): under the mutant, P2 read returns `"edgesAfter":[]`; under honest,
`"edgesAfter":[rented,drives]` == `edgesBefore`. So the honest assert genuinely passes-honest / fails-mutant.
→ **Assert has teeth. Builder's red output confirmed.** Probe deleted; tree clean.

## 3. Physical shred on disk — proven by bytes (before/after)

Method: temp driver (since deleted) wrote the real ga-rentacar order+customer acts via `DurableFsStore`, read
the RAW `journal.jsonl` off disk, called `shredPayload(orderAct.id)`, re-read the RAW file.

**BEFORE shred — order line (trimmed):**
```
{"id":"act:order:45832-2865:061aca22",...,"actKind":"domain_event",
 "edges":[{"predicate":"rented",...,"meta":{"role":"renter"}},{"predicate":"drives","target":"sheets:Cars#AB-12345"}],
 "payloadRef":"payload://788ee9...","payloadHash":"788ee9...",
 "erasable":{"type":"order","orderType":"Daily400.00","rentType":"Daily","remaining":400,"numberOfDays":3,"status":"open"}}
```

**AFTER shred — SAME order line (trimmed):**
```
{"id":"act:order:45832-2865:061aca22",...,"actKind":"domain_event",
 "edges":[{"predicate":"rented",...,"meta":{"role":"renter"}},{"predicate":"drives","target":"sheets:Cars#AB-12345"}],
 "payloadRef":"payload://788ee9...","payloadHash":"788ee9..."}
```

Observations:
- The `erasable` key is **entirely removed** (not blanked) from the journal line on disk — payload content
  physically gone.
- `edges`, `provenance`, `recordedAt`, `actKind`, `payloadRef`, `payloadHash` — **byte-for-byte identical.**
- The **customer** act line (a different `id`) is **untouched**, still carrying its own `erasable:{type:customer,hasPhone:true}`
  → confirms FORK-2 single-target behaviour (only the shredded act's zone removed).

→ **Physical disk shred proven. Core of §9-3 holds.**

## 4. Cross-process — genuinely distinct OS processes

- Test source (`erasure-plane-falsify.test.ts:29`) uses `spawnSync(process.execPath, ['--import','tsx',HARNESS,...])`
  — a forked child per phase, not same-process simulation. Confirmed by reading.
- Empirical: launched P1 (write+shred) and P2 (fresh read) via `exec node …` so shell PID == node PID, sharing
  only the tmp store-dir. Observed **P1_PID=15567, P2_PID=15569** — two independent processes, nothing shared
  but the disk journal. Harness comment/`spawnSync` discipline matches `crash-mid-turn`/`durable-reboot-matrix`.

→ **Cross-process confirmed (distinct PIDs, disk-only channel).**

## 5. Rehydration after shred+reboot

In the same P2 fresh-boot read (PID 15569, over the shredded store-dir):
```
{"mode":"read","scenario":"order","found":true,
 "edgesAfter":[{"predicate":"rented",...},{"predicate":"drives",...}],"bodyKeysAfter":[]}
```
`found:true` (projection rebuilt from disk journal via `hydrateFromDisk`/`project`), `edgesAfter` intact
(rented+drives), `bodyKeysAfter:[]` (payload/body empty post-shred). §9-3b (same-as) and F6 (access_event) both
green in the suite run (§1). → **Rehydration confirmed.**

## Разошёлся с отчётом builder'а — boundary finding (NOT a refutation)

**By-ref PII payload files survive `shredPayload`.** The ga-rentacar order stores its raw PII **by reference**
(`payloadRef://…` → `FilePayloadStore` files under `<storeDir>/payload/`). `shredPayload` strips only the
inline `erasable` compact record from the journal line. Independent probe (deleted) dumped the payload dir
before/after shred:

```
--- payload dir BEFORE shred ---
FILE 32e40f5d….json => {"name":"Test Renter","phone":"0501234567"}
FILE 788ee99e….json => {"recentNote":"call the renter back"}
--- payload dir AFTER shred ---
FILE 32e40f5d….json => {"name":"Test Renter","phone":"0501234567"}
FILE 788ee99e….json => {"recentNote":"call the renter back"}
```

The actual raw PII — renter **name, phone `0501234567`, note "call the renter back"** — remains physically on
disk after shred. This is **consistent** with the code's own stated contract (`store-durable-fs.ts:146` — "shred
`erasable`") and with the builder's asserts (`bodyKeysAfter==[]` is the projected node's body from the inline
erasable zone, which IS emptied; edges intact). The builder did NOT claim by-ref erasure. But for the lead:
"payload physically gone" is true for the **inline compact record only** — hard-erase of the by-ref PII store
is an unaddressed erasure grain (adjacent to F3/DEFER), and is where the real GDPR-style PII lives. Recommend
the lead register it explicitly (candidate fork: "by-ref payload hard-erase") rather than let the §9-3 green
imply full PII erasure.

No other discrepancies. Builder's 7-point acceptance self-assessment (6✅ + 1🟡 cap-slightly-over) matches what
I observed; the cap overage (+289 test-side lines / ~15%) is real and was flagged honestly.

## Discipline — working tree clean

Three temp probes created and **all removed**: `test/_tmp_verify_mutant_red.test.ts`, `_tmp_shred_probe.mts`,
`_tmp_byref_probe.mts`. All scratch store-dirs live under `/tmp` (`mktemp -d`), not in the repo. Final
`git status --porcelain`:
```
 M packages/engine/src/adapters/store-durable-fs.ts
?? docs/_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/
?? packages/rental-balance/test/erasure-plane-falsify.test.ts
?? packages/rental-balance/test/harness/
```
Only builder's own artifacts (modified adapter + new test/harness + this reports dir). No probe residue.
