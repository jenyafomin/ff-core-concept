---
node_type: analysis
title: "U6 threat-model — critic adjudication (adversarial gate)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
iteration: 9
kind: knowledge
lens: critic (adversarial-gate + adjudicator over analyst/architect divergence)
verified: "every claim below re-derived from source, not taken from either lens's citations — grep + Read, 2026-08-09"
related:
  - ../threat-model.question.md
  - ../analyses/01-attack-surface.analysis.md
  - ../analyses/02-trust-boundaries.analysis.md
  - ../../../../../02-project/core/00-kernel/invariants.md
---

# U6 — Critic adjudication

> Verdict target: CLEAN/DIRTY on the two analyses, with the load-bearing divergence resolved AGAINST
> the code, independently re-traced (not trusting either lens's line numbers).

## 1. Policy self-reference takeover — REAL, not a paper tiger

Chain re-verified end to end, independently:

1. `Engine.write()` (`packages/engine/src/engine.ts:73-111`) calls `admit()` (:76) and `admitHome()`
   (:81), then `store.writeAct()` (:106). It calls **neither** `this.policy.resolveWrite` nor
   `this.resolve(...)` anywhere in the method. Grep for `resolve(` in the write path = 0 hits inside
   `write()`. Confirmed independently — matches both lenses.
2. `admit()` (`packages/engine/src/core/admission.ts:130-148`) only checks (a) `payloadRef` requires
   `payloadHash`, (b) no inline-PII in `payload`/`edges[].meta`. It has **no knowledge of
   `source_ref`, protected namespaces, or `act.id`** — nothing here stops a `source_ref` of
   `'policy:constitution'`.
3. `admitHome()` (`admission.ts:110-124`) fail-**opens** on any `fact_kind` not registered in the
   injected `HomeRegistry` (:115, `return ok()`) — trivially bypassed by omitting `fact_kind` or using
   an unregistered one.
4. `isProjectable`/`foldInto` (`packages/engine/src/core/projection.ts:42-44,76-123`) accept **any**
   string `source_ref` as the projection key (`ref = sourceRefOf(act)`, :82) with no allow/deny-list —
   confirmed by reading the full function, no namespace check exists.
5. `DurableFsStore.load()` (`packages/engine/src/adapters/store-durable-fs.ts:191-192`) returns
   `[...this.base, ...this.projection.values()]` — base (real seed, incl. real `policy:constitution`)
   THEN projection (attacker-reachable). `loader.load()` (`packages/engine/src/core/loader.ts:8-11`)
   does `for (const n of nodes) byId.set(n.id, n)` — **last write wins**. A `domain_event` act with
   `provenance.source_ref = 'policy:constitution'` folds into the projection map under that exact key,
   appears AFTER base in the flat array, and **replaces the real Constitution node in `byId`** — every
   `graph.byId.get('policy:constitution')` call (used by `canWriteNamespace` `resolve.ts:88`,
   `resolveRead`'s clamp `resolve.ts:238`, and `Engine`'s boot-time ceiling check `engine.ts:58`)
   returns the forged node from that point on. **Confirmed exploitable, not hypothetical** — every
   link was read, not assumed.
6. Independently, and *more directly exploitable*: `grantValid()` (`resolve.ts:136-141`) —
   `if (minter === 'system' || minter === 'engine') return true` — trusts a **self-declared**
   `body.minted_by` field with zero structural/cryptographic binding to who actually authored the act.
   `canMintGrant`/`canMintCapability` (the meta-gates that were meant to check minting authority,
   `resolve.ts:255-262`) have **zero call sites anywhere in `packages/*/src`** outside their own
   definitions — grep confirms they are wired into `MetaGates` but never invoked from `resolveWrite`
   or anywhere else. So a plain `domain_event` act with `payload.type:'grant'`,
   `payload.minted_by:'system'`, `payload.allow:['core:manage-core', ...]` passes `admit()`/`admitHome()`
   unconditionally, folds into a `type:'grant'` node, and `holdsCapability()` (`resolve.ts:144-169`)
   — invoked TODAY on the **read path** via `resolveRead`'s tenant clamp (`resolve.ts:247`) — grants the
   attacker any capability they name, for any scope. **This is live right now, on the read path,
   independent of whether `T-write-pep-unwired` ever gets fixed**, because `grantValid`'s
   self-declared-`minted_by` trust is a *second*, independent hole from the unwired `resolveWrite`.

**Ruling: REAL, confirmed, and more severe than a "consequence of B1"** — it is two compounding holes
(namespace-ceiling absent from write AND grant-authenticity never checked anywhere), one of which
(`grantValid`) is exploitable via the read path today even without fixing the write-PEP.

## 2. Does `admit()` gate writes? — both lenses partly right, reconciled

- Architect is factually correct: `admit()` (PII/structural) and `admitHome()` (one-home barrier) DO
  run before every journal write and CAN refuse (`engine.ts:76-82`). This is a real, live gate.
- Analyst is correct for the threat class actually in question: neither gate checks actor authenticity,
  `source_ref` namespace, or grant provenance — for **capability/policy-integrity purposes**, write is
  fully ungated. Calling write "ungated" without that qualifier is imprecise (something IS checked),
  but not wrong about the exploit.
- No real contradiction — the two lenses are describing different gate categories. Analyst's B6 write-up
  already threads this correctly in its "Итог" (§B6 conclusion); the "ungated" framing earlier in the
  same doc is the only place it reads as overclaiming.

## 3. Form-vs-policy shortlist — item-by-item ruling

Закон-1 test applied strictly: FORM = a choke-point/identity/field that must be **captured at write
time**, because absence cannot be recovered once acts are immutable (I-4) and real payload starts
flowing. A missing **function call** to an already-built, already-existing gate is POLICY (cheap),
regardless of how many call-sites need the wiring or how severe the consequence is if left unwired.
Severity and Закон-1 form-status are different axes — conflating them is the exact smuggling this gate
watches for.

| Item | Analyst says | Ruling | Why |
|---|---|---|---|
| B2 — `PayloadStore.get` no `viewer` param | FORM | **POLICY (cheap)** — agrees with architect P2 | Verified `ports/payload-store.ts:24-41` + `file-payload-store.ts:53-58`: `get(hash)` takes no viewer, checks only file-existence. But nothing about *already-written* blobs is lost by delaying — the act journal already links `payloadHash` → `provenance.source_ref` → a graph node with `visibility`/`access`. A future gate can wrap `get()` and resolve against that node at call time, using data that already exists. Retrofit-cheap, just multi-caller (engineering cost ≠ Закон-1 form). |
| B4 — `customer-lens` bypasses `resolve()` | FORM | **POLICY (cheap-ish, wider blast radius)** — disagrees with analyst | Verified `packages/ingest-rentacar/src/lens/customer-lens.ts`: grep `resolve(` = 0, confirmed. But this is the *same shape* of gap as B1/T-write-pep-unwired — an existing PEP not called from a code path — not a missing identity/field baked into stored data. Adding `viewer` param + `ctx.policy.resolve('read',…)` calls at each `graph.byId.get` site is more call-sites than B1, not a different Закон-1 class. |
| B6 — `grantValid` trusts self-declared `minted_by` | FORM (separate from B1) | **NOT a new/third form — subsumed by architect's F1 (write-principal-seam)**, plus the namespace-ceiling half is subsumed by P1/T-write-pep-unwired | The constitution-overwrite half of B6 = missing `canWriteNamespace` call = P1 (already tracked). The grant-forgery half = `grantValid` trusting a body field instead of a *resolved, authentic actor* = exactly what F1 reserves ("a write-side principal resolution point on the funnel", `02-trust-boundaries.analysis.md:79-86`). Once F1 exists, wiring `grantValid` to check the resolved actor instead of the self-declared field is POLICY-cheap. **But**: F1's description should be updated to name this concrete consequence — architect's F1 write-up talks about generic actor-reattribution loss, not the specific "anyone can mint `core:manage-core` for themselves via a `grant` node" exploit. Analyst's trace is the valuable addition here; the FORM/POLICY classification is where analyst overclaimed. |
| B7 — `DurableRunner.read()`/`acts()` raw, ungated | FORM | **POLICY (cheap)** — disagrees with analyst | Verified `packages/engine/src/runner/durable-runner.ts:64-66,74-76`: calls `store.readNode`/`store.acts()` directly, bypassing `resolve()` — while `view()` on the SAME class (:69-71) is correctly gated. This is a design/discipline inconsistency (`StorePort` documented "internal, not cross-module" `store-port.ts:1-2`, but `DurableRunner` is documented as the future HTTP-caller's composition layer), not data lost by delay. Deprecating/removing the raw methods, or gating them the same way `view()` is, requires no retroactive data capture. |
| F1 — write-principal-seam (C2) | — | **CONFIRMED FORM, urgent** | Verified `engine.ts:75` spreads `act` verbatim (`actor` unresolved), acts immutable after accept (I-4, `invariants.md:71-79`). Correctly reserved by architect; correctly NOT decided (force-bind vs attestation is FORK-U3, left open). |
| F2 — data-subject/consent binding (C7) | — | **CONFIRMED FORM, urgent** | No code anywhere links an act/payload to a `subject:` identity (matches iter-8 finding, independently re-checked: `erasure.ts` carries only `source_ref`/`erases_act`, no subject field). Correctly reserved, correctly left as owner's shape choice (FORK-U6-A). |

**Net: architect's narrow 2-item urgent shortlist (F1, F2) is correct as the retrofit-impossible set.**
Analyst's 4 additional "FORM" items are real, verified defects with real exploitability — but by the
project's own Закон-1 definition (frozen-data-driven, not severity-driven) they are POLICY-cheap wiring,
same class as the already-tracked B1/T-write-pep-unwired. This is the adjudication the run asked for.

## 4. Hash-oracle question — NOT new, already tracked; and a live gap besides

- `isWitnessNonReversible()` (`packages/engine/src/core/erasure.ts:96-97`) checks
  `act.hashScheme?.startsWith('salted-')` — but grep across `packages/engine/src` and
  `packages/engine/test` shows **zero call sites** for this function outside its own doc comment and a
  `types.ts` comment reference. It is defined but never invoked — `admit()` does not call it, nothing on
  the write path rejects a bare (unsalted) `hashScheme`.
- `hash.ts:9-17` (`packages/ingest-rentacar/src/core/hash.ts`) already documents this exact danger
  in its own header comment ("a bare sha256 of PII is... a confirmation ORACLE").
- Cross-checked against `task-pool.md:56` — `T-D1b-erasure-debt-ADR` explicitly lists as tension (4):
  `"hash.ts:9 «hashing PII safe» ложно для телефона (несолёный sha256 = оракул)"`. **This is the same
  question the architect raised as open §7 — already tracked, not new.**
- One addition worth folding into that task: `isWitnessNonReversible` being defined-but-unwired means
  even if a caller WANTED to enforce salted-only witnesses today, there is no enforcement point calling
  it — this should be named explicitly in `T-D1b-erasure-debt-ADR`'s scope (currently the task describes
  the *scheme* danger, not that the *guard function already exists and is dead code*).

## 5. Enforcement smuggled into "form"? Overclaims? Missed classes?

- **Analyst**: no enforcement/solutions proposed (correctly descriptive), but overclaimed FORM status on
  B2/B4/B7 by conflating "severe + many call-sites to fix" with "data-loss-driven, retrofit-impossible"
  (see §3). B6 is real and its exploit chain is the single most valuable finding in either document, but
  it double-counts as a form separate from F1/P1 rather than being explicitly tied to them.
- **Architect**: correctly disciplined on NOT deciding force-bind-vs-attestation (F1) or consent
  mechanics (F2) — good "form reserved, policy named as owner's" hygiene. Weakness: the FORM/POLICY
  table (§2, C1-C8) does not surface the `grantValid`/`minted_by` self-trust or the `customer-lens`
  bypass at all — both are real crossings missing from the census. Architect's own §6 flags this as
  "medium confidence on completeness" and explicitly invites the critic to probe — which is exactly what
  happened here. Not a defect in the architect's discipline, just genuine incompleteness, self-flagged.
- **Missed class check**: re-read `same-as-writer.ts`, `store-md.ts`, `envelope-validator.ts` for a
  fifth crossing neither lens named. Nothing new and severe surfaced beyond what's in the table above
  within this session's budget — B3's dismissal (same-as does not participate in capability resolution,
  `holdsCapability` at `resolve.ts:144-169` never walks edges) is independently confirmed correct.
- **Paper tigers**: none found. Every threat in the analyst's table that I re-traced (B1, B2, B4, B5, B6,
  B7) is real and independently reproducible from the code as described, modulo the form/policy
  reclassification above. B3 was already self-corrected by the analyst (marked "risk not here").

## Verdict

**CLEAN** — both analyses pass the adversarial gate. No fabricated threats, no enforcement smuggled into
a form-claim by either lens (aside from the form/policy misclassification in §3, which is a
classification error, not a fabrication — corrected above). One correction is load-bearing enough to
carry into synthesis: **B6's grant-forgery is not a third form** — it is evidence that makes F1 more
urgent and gives P1/T-write-pep-unwired a concrete, severe exploit scenario. Recommend synthesis
(`02-resolution.synthesis.md`) fold B6's exploit chain into the existing F1 (write-principal-seam) and
P1/T-write-pep-unwired entries rather than minting a new form-task, and open one new cheap-policy task
for B4 (customer-lens PEP bypass) and B7 (DurableRunner raw read/acts) since neither is currently
tracked under any existing task id.
