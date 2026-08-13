---
type: design
node_type: design-note
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: seamAuthority — resolving the required/optional defect (P-3)
related:
  - ../../m5-surface-identity/design/05-seamAuthority-reservation.spec.md          # the SPEC this note resolves (§3.1 required, §5 AC-1 correction, §caveat)
  - ../../m5-surface-identity/design/05b-seamAuthority-reality-anchors.analysis.md  # ground truth: :146 the one fixture, :156 the single construction site
  - ../../../../../../../_log/2026-08-12-direction-review-and-both-as-settings/raw/04-direction-census.analysis.md  # :62, :106-109 the flagged "too smooth"
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # form ② (Act.principal), honest-limit
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md               # G4 (:123-145), P-3 (:251), retrofit-impossibility (:134-135)
anchors:  # verified by direct read 2026-08-12
  - packages/engine/test/principal-seam.test.ts:23-30      # test (a) literal — the compile break site (:24-28)
  - packages/engine/src/ports/principal-resolver.ts:30-37  # AuthenticatedPrincipal { subject, trust, issuer }
  - packages/engine/src/core/types.ts:231-247              # PrincipalAssurance { whoActed?, underWhoseAuthority?, issuer?, delegation? }
  - packages/engine/package.json                           # scripts: test=vitest run (no typecheck) · typecheck=tsc --noEmit (separate gate)
---

# How to implement — seamAuthority required/optional defect (P-3)

## 1. The defect, exactly

**Confirmed live.** The summary/HANDOFF pins P-3 as "0-migration ВЕРИФИЦИРОВАН ✅", but the
**designed** patch and the **live** test literal collide:

- The SPEC (`05-seamAuthority-reservation.spec.md:80-102`, §3.1) adds `seamAuthority: string` as a
  **REQUIRED** member of `AuthenticatedPrincipal` (`packages/engine/src/ports/principal-resolver.ts:30-37`,
  today exactly `{ subject, trust, issuer }`).
- The only construction site of that type in the repo is a fixture literal —
  **`packages/engine/test/principal-seam.test.ts:24-28`** (inside :23-30, test (a)):
  `{ subject: 'user:jenya', trust: 'channel', issuer: 'gateway:agents-manager' }`. It has **no**
  `seamAuthority`.
- Adding a required member → this literal is missing a required property → **TS2741** under
  `tsc --noEmit`. The file's whole job is *compile-first shape assertion* (header :4-11), so a typecheck
  break IS this test failing.

**Precision on "breaks the test".** `package.json` splits the gates: `test` = `vitest run` (esbuild
strips types → runtime **187/187 stays green even with the missing field**); `typecheck` = a separate
`tsc --noEmit`. The break is therefore in the **typecheck gate**, not the vitest count. Either way it
violates the AC as originally worded ("**zero test files edited**", spec §5 pre-correction).

**Why the summary said "0-migration ok".** Two different "0"s got conflated:
- **0 DATA migration — TRUE.** `Act.principal?` and `PrincipalAssurance.seamAuthority?` are optional, the
  populated-`principal` set is empty (paper-freeze journals nothing — `types.ts:220-221`), and both write
  paths are lenient (`store-memory.ts:48-52` raw push; `store-md.ts:218-227` JSON-stringifies into an
  opaque body — reality-anchor 05b §4). No row to backfill.
- **0 TEST edits — FALSE.** The `required` field forces **+1 fixture line** at
  `principal-seam.test.ts:24-28` (05b:146, :156 — the single construction site).

The checkmark rode the *data* claim onto the *test* claim. The spec itself already caught and corrected
this (§5 AC-1 note :184-189, §caveat :245-289) — but the summary table/state.md were never updated, so
the census flags a live contradiction (`04-direction-census.analysis.md:62, 106-109`). **The defect is a
tracking/AC-coherence gap, not a design flaw.**

## 2. Resolution fork — invariant vs setting

| Variant | What | Cost to "0 test edits" AC | 187 tests |
|---|---|---|---|
| **A. Keep REQUIRED, amend the AC** (recommended) | seamAuthority = an **invariant** of the seam: a resolver must never forget G4. Required on a zero-implementation interface is the one moment it costs nearly nothing (spec G-2). | AC changes "0 test files" → "**+1 fixture line, 0 other test files**". Honest, matches reality. | Runtime green; `tsc` clean **after** the one line. |
| **B. Make it OPTIONAL on `AuthenticatedPrincipal` too** | Turns the invariant into a **setting**. Existing literal compiles untouched. | Literal "0 test edits" preserved. | Green, no fixture edit. |
| **C. Gated / staged** | Optional now (mirrors `PrincipalAssurance` side), + a tripwire (spec G-R2) enforcing presence on any real construction site; flip to required when the first resolver lands at M5. | "0 test edits" now; edit deferred to M5. | Green now. |

**Consequences.** B trades a permanent, **retrofit-impossible** structural guarantee (ADR-0011:134-135)
for one avoided fixture line — a future resolver PR could silently omit G4, and it can never be added
cleanly once acts journal. C keeps the guarantee but opens a forget-window and adds process for a risk
that is **zero today** (0 downstream construction sites — 05b §3, caveat §2). A pays one fixture line to
keep G4 un-forgettable at its cheapest-ever moment.

## 3. How to do it right (recommended = A — do NOT apply here)

Minimal, additive, honest:

1. **Land the SPEC patch verbatim** — §3.1 (required on `AuthenticatedPrincipal`), §3.2 (optional
   `seamAuthority?` on `PrincipalAssurance`, alongside `issuer?`), §3.3 (stamper doc-clause only). No
   signature changes; `write(act): Ack` and the PEP untouched.
2. **Edit the ONE fixture** `principal-seam.test.ts:24-28`: add
   `seamAuthority: 'host:registry/ff-engine'` (opaque string). This is the +1 line — priced in, not a
   regression.
3. **Fix the tracking artifacts** (the actual defect): in state.md / PROGRESS / HANDOFF, replace
   "0-migration verified, 0 test edits ✅" with "**0 DATA migration (verified); +1 fixture line;
   `required` kept by design (G-2)**". Removes the census contradiction (:106-109).
4. **Add the reservation test** `principal-seam-reservation.spec.ts` (spec §6, V-1..V-4) + optional G-R2
   tripwire so G4-presence is build-enforced, not trusted.

Keep the honest-limit doc-comments (spec §7): reservation ≠ trustworthiness; the out-of-band anchor is
deferred (decision 4).

## 4. Verification

- **G-R1 order (spec §caveat):** `npm run build -w @ff/engine` (regen `dist/index.d.ts`) **first** — the
  stale gitignored `dist/` masks the change otherwise (spec :259-267).
- `npm run typecheck` (→ `tsc --noEmit`) across workspaces: **clean** with the fixture line; and a
  deliberately-missing-`seamAuthority` literal must raise **TS2741** (proves G-2/AC-2).
- `npm run test`: **187/187** (runtime is type-agnostic; unaffected either variant).
- Diff scope (AC-4): only the 3 production files + `principal-seam.test.ts:24-28` + the new reservation
  spec. No diff in `engine.ts` / `engine-client.ts` / PEP / idempotency.

## 5. Pointers (real file:line)

- Break site: `packages/engine/test/principal-seam.test.ts:24-28` (literal), 23-30 (test (a)).
- Target types: `packages/engine/src/ports/principal-resolver.ts:30-37` · `packages/engine/src/core/types.ts:231-247`.
- Gates split: `packages/engine/package.json` (`test`=vitest, `typecheck`=tsc).
- Design: spec §3.1 :80-102 · AC-1 correction :177-189 · caveat :245-289.
- Ground truth: `05b-seamAuthority-reality-anchors.analysis.md:146, :156` (single fixture) · §4 (lenient persistence).
- Flag: `04-direction-census.analysis.md:62, :106-109`.
