---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: system-architect (enforcement precondition map — concrete exit criteria + critical path for P-1…P-5)
title: "DESIGN — enforcement precondition map: P-1…P-5 exit criteria + critical path for Decision-③ flip"
scope: Project (FF-Personal-Management) · trust-line / actor-model · branch refactor-tree
phase: DESIGN — map only, NO product code, NO commits. The one code-adjacent act taken = additive doc append to ADR-0011.
related:
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md          # P-1…P-4 as written (:244-255); §"P-5 (added 2026-08-12)" appended by this design
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md  # invariant ①, form ②, Decision ③ (the flip this map gates), adversarial gate :175-187
  - ../../decisions/FORK-decision4-root-of-trust.decision.md                       # introduces P-5; Fable's correct sequence (§2)
  - ./04-SYNTHESIS-m5-decision-ready.md                                            # §4 P-2 longest pole · §6 owner-decision sequence
  - ./05-seamAuthority-reservation.spec.md                                         # P-3 exact patch + acceptance criteria AC-1…AC-6
  - ./05b-seamAuthority-reality-anchors.analysis.md
  - ../../decisions/RATIFY-2026-08-12-adr-0010-0011.decision.md                    # P-1 ratification half closed here
  - ../../../../../../01-organization/process/bugs/gateway-dup/INDEX.md            # P-2 home (cross-repo fix in agents-manager)
---

# Enforcement precondition map — P-1…P-5 → Decision-③ flip

> The concrete exit criteria that gate the enforcement flip (ADR-0010 Decision ③: PEP consults a
> host-stamped `principal.authority`, REFUSES on mismatch, trust rises above `unverified` only from a
> real authenticated source). Each precondition below states what it asserts, its **testable/observable
> exit criterion** (not a vibe), who closes it, current status, and its dependencies. DESIGN only.

---

## 1. The five preconditions

### P-1 — ADR-0011 ratified → M5 built (surface-identity under the ISO-2 boundary)
- **(a) Asserts:** the isolation model (where the trust boundary sits) is ratified AND M5 surface-identity
  resolution (`PrincipalResolver` + `PrincipalStamper`) is actually built against that ISO-2 boundary — a
  real authenticated source of write-principal exists, not paper-freeze.
- **(b) Exit criterion (two halves):**
  - *Ratify half (CLOSED):* `ADR-0011.Status == approved` — done 2026-08-12 (`## Ratification 2026-08-12`).
  - *Build half (OPEN):* `PrincipalResolver` has a real implementation deriving identity from the ISO-2
    boundary (not a CLI-literal / fixture), wired to ≥1 real caller, AND ADR-0011 Validation test #3
    ("граница отличима от in-process", `ADR-0011:238`) goes GREEN: acts crossing the stamping IPC boundary
    carry axis-trust + issuer, verifiable through audit-readability; in-process acts still read `unverified`.
- **(c) Closed by:** ratify half = `RATIFY-2026-08-12-adr-0010-0011.decision.md`; build half = the M5-impl
  build wave (owner «строй», after P-5-name + isolation uid-split + P-2 — see §2).
- **(d) Status:** **PARTIAL** — ratify half closed; build half open (resolver = 100% paper-freeze, 0 call-sites).
- **(e) Depends on:** build half depends on **P-5(name)** + **isolation uid-split** + **P-2** (Fable §2: any
  resolver wiring before those = theatre). Ratify half depended on nothing (closed).

### P-2 — verified gateway-dup / restart fix (agents-manager, cross-repo)
- **(a) Asserts:** the enforcement flip requires a *linked, verified* fix of the dup/restart bug — a
  duplicate or restarted turn must not produce a double / lost principal stamp on the append-only journal.
- **(b) Exit criterion:** a landed, verified fix in `agents-manager` ingress (incoming dedup: hash + time
  window; no kill of background agents on a new turn) — observable by the bug INDEX `Status` flipping
  `active → fixed` with evidence; AND ADR-0011 Validation test #4 (restart idempotency, `ADR-0011:239`)
  GREEN: dup/restart of one logical turn yields exactly one, non-contradictory principal stamp; AND the
  RT6 open question (engine-side dedup behaviour under dup-redelivery with a *fresh* `ts`) resolved by an
  explicit test, not assumed either way.
- **(c) Closed by:** a work order against `agents-manager` (cross-repo; no FF file fixes it — its home is
  `gateway-dup/INDEX.md`). ~~No standalone `WORKORDER-*` doc exists yet — the INDEX is P-2's home; a work
  order should be raised there.~~ **Superseded 2026-08-12:** the work order now exists —
  `../../decisions/WORKORDER-gateway-dup-P2.decision.md`.
- **(d) Status:** **OPEN, but narrowed** (bug `Status: active` since 2026-07-06, re-verified 2026-08-12).
  **Update 2026-08-12 (additive, does not overwrite the line above):** `WORKORDER-gateway-dup-P2.decision.md`
  Finding A found the historically-diagnosed root cause (no ingress dedup) is **already fixed** in
  `agents-manager` (commit `3e3327d`, `orchestrator.ts:79-88` + `dedup-store.ts`). What remains open per
  Finding B is a narrower **crash-window race** (fire-and-forget persist between in-memory mark and durable
  write, `dedup-store.ts:41-56`) that can still reproduce the exact P-2 symptom. The exit criterion in (b)
  is therefore still unmet (no test yet distinguishes the fixed case from the residual race — RT6 stays
  open), so Status correctly stays OPEN — but the *remaining* work is smaller than this section originally
  implied.
- **(e) Depends on:** **nothing** — independent of every root-of-trust choice (threat-model Attack 2 = FAIL
  for all of A/B/C). Can start immediately, in parallel. ~~**This is the longest pole** (§3).~~ **Correction
  2026-08-12 (see §3/§4 below):** with the residual gap narrowed to Finding B's crash-window race, P-2 is
  **no longer the longest pole — isolation uid-split is** (`state.md`'s 2026-08-12-b correction, same
  evidence). This line is left struck-through rather than deleted per doc-tree LOSE-NOTHING; §3/§4 carry the
  corrected ranking.
- **➕ VERIFIED CORRECTION 2026-08-12 (additive, does not delete the struck-through line above):** the
  "no longer the longest pole" downgrade is itself **corrected** by an adversarial re-verification of the
  **VOICE path** — see `../../decisions/WORKORDER-gateway-dup-P2.decision.md` §"Verified correction
  2026-08-12". For voice, dedup runs only *after* a ≤5-minute transcription (`telegram-channel.ts:449-470`,
  `TRANSCRIBE_TIMEOUT_MS=300_000`) and grammY's polling offset is in-memory (`bot.js:81,192,421`), so a
  crash anywhere in that window redelivers an **un-deduped** duplicate turn (no unique constraint on
  `message.entity.ts:channelMessageId` either). This IS the owner's live symptom — **P-2 re-elevated**,
  root cause identified. Fix leads with **ingress-dedup-before-transcription** (mark the raw
  `update_id`/`message_id` at `telegram-channel.ts:413-419` before the transcribe await). The struck line
  and §4 ranking are left as-is per LOSE-NOTHING; this pointer is the current status.

### P-3 — `seamAuthority` (G4) reserved on the principal seam
- **(a) Asserts:** the issuer-of-the-issuer field (`seamAuthority`) is reserved *additively* on the seam
  before any act carries a populated `principal` — the one move with a hard retrofit deadline.
- **(b) Exit criterion:** spec 05 built verbatim — `AuthenticatedPrincipal.seamAuthority` REQUIRED,
  `PrincipalAssurance.seamAuthority?` OPTIONAL, stamper doc-clause added; AC-1 (`tsc` clean + suite green at
  **187/187**, only the one new type-test file added), AC-2…AC-5 (type-fixtures + honest-limit doc-comments),
  AC-6 (independent reviewer PASS). Diff touches ONLY the three named files; `engine.ts`/PEP show no diff.
- **(c) Closed by:** builder wave landing `05-seamAuthority-reservation.spec.md` on owner «строй».
- **(d) Status:** **PARTIAL / reserved-on-paper** — exact patch specified & frozen (spec 05); build pending
  owner «строй» (not yet given). Reservation ≠ G4 intent (populating the anchor = P-5, not P-3).
- **(e) Depends on:** **nothing** (purely additive, standalone). Has a retrofit *deadline* (do before any
  act journals a populated principal), not a dependency. Independent of P-2 / P-5.

### P-4 — explicit owner nod (the flip itself)
- **(a) Asserts:** turning enforcement ON is a separate, explicit owner decision (same discipline as ADR-0010).
- **(b) Exit criterion:** a ratified owner-decision doc that says "flip Decision ③ enforcement ON", recorded
  after P-1, P-2, P-3, P-5 are all green. Observable (a decision artifact), not machine-testable — human gate.
- **(c) Closed by:** the owner, in a `RATIFY`/`DECISION` doc.
- **(d) Status:** **RESERVED** (cannot occur until the other four are green).
- **(e) Depends on:** **P-1 ∧ P-2 ∧ P-3 ∧ P-5 all green.** Final gate.

### P-5 — out-of-band root of trust named + populated (added 2026-08-12, Fable fork)
- **(a) Asserts:** the out-of-band anchor that certifies `seamAuthority` is named as a mechanism AND
  populated, with its write-channel verified disjoint from every agent-writable path. Without it,
  `seamAuthority` is a self-signed seam (the `actor≠principal` hole one level up) — the field says "where
  to put the answer", never "where the answer comes from".
- **(b) Exit criterion (three parts):**
  - *Name (paper):* mechanism named = a Constitution-class protected node `policy:seam-authority`
    (`protected_namespaces`, `can_write: []`), read by the engine as a *clamp* on the trust axis (ADR-0004
    D3 + ADR-0006 arbitration), physical home = engine-principal-owned `$FF_ENGINE_HOME/trust/`. Closed by
    owner picking **decision 4 = C**.
  - *Populate:* the root actually seeded by the owner **manually** (TOFU rejected — self-certification is
    the forbidden pattern); every stamp reading `trust > unverified` traces to a populated `seamAuthority`.
  - *Disjoint (the teeth):* the owner's write-channel to the node is verified genuinely disjoint from the
    deploy tree the gateway/agent runs from (T-seed), and registry scope decided project- vs platform-wide
    (T-scope) — both through a critic pass before P-5 may be marked green.
- **(c) Closed by:** name = owner decision-4=C (paper, now); populate+disjoint = owner manual seed AFTER
  isolation uid-split lands, then critic pass on T-seed/T-scope.
- **(d) Status:** **RESERVED** — name is decidable on paper now; populate is BLOCKED until the isolation
  uid-split exists (seeding earlier certifies a host that double-stamps behind a boundary that isn't there).
- **(e) Depends on:** name depends on decision-4 choice (owner-pending). Populate depends on **isolation
  uid-split ∧ P-2**. The ③ flip depends on P-5(populate).

---

## 2. Dependency graph (stated once, sharply)

From Fable's fork §2: **P-3 is free-standing; 4(name)→5(topology); P-5(name) unblocks nothing but is cheap;
P-1(build) depends on isolation; P-5(populate) depends on isolation ∧ P-2; ③ depends on P-1 ∧ P-2 ∧ P-3 ∧
P-5 ∧ P-4; nothing depends on B (ISO-3 crypto).**

```
P-3 (reserve seamAuthority) ──────────────── additive, retrofit-deadline ─────────────┐
                                                                                      │
decision-4 = C (name root) ──▶ P-5(name) ──▶ decision-5 (topology = broker-seed) ──┐  │
                                                                                   │  │
P-2 (gateway-dup fix, agents-manager) ── longest pole, independent ──┐             │  │
                                                                     ▼             ▼  ▼
                              isolation uid-split (real M3 out-of-process) ──▶ P-1(build M5)
                                                                     │             │
                                                    P-5(populate + disjoint, owner seed) ◀┘
                                                                     │
                                    ③ enforcement flip ◀── P-1 ∧ P-2 ∧ P-3 ∧ P-5 ∧ P-4(owner nod)
```

---

## 3. Critical path / ordering (the order that doesn't lie)

Ordered list, each step with the gate that unblocks it (Fable's 4→5→P-2‖→uid-split→populate→③):

1. **Decide 4 = C — name the root** (paper: `policy:seam-authority` mechanism + register P-5).
   *Gate:* owner picks C. Unblocks step 2 (a standalone broker is legitimate only after the root is named).
2. **Decide 5 = broker-seed topology** (module-vs-standalone sub-fork stays open, coupled to gateway
   extraction, external to M5). *Gate:* root named (step 1).
3. **Order P-2 fix now, in parallel** (agents-manager ingress dedup). *Gate:* none — start immediately.
   [Run P-3 build in parallel here too on owner «строй» — additive, independent, retrofit-deadline.]
4. **Isolation execution — uid/process split** (real M3 out-of-process engine). *Gate:* ADR-0011 execution /
   M3 integration. THIS is what turns "agent can't write the root" from convention into enforcement and is
   the prerequisite for P-1(build).
5. **Populate the root — P-5 → green** (owner seeds manually; T-seed + T-scope critic pass). *Gate:* step 3
   (P-2 verified) **AND** step 4 (uid-split landed). Seeding earlier certifies a double-stamping host behind
   a non-existent boundary.
6. **Enforcement flip ③** — P-4 owner nod. *Gate:* P-1 ∧ P-2 ∧ P-3 ∧ P-5 all green + explicit owner nod.

---

## 4. Longest pole & untestable / underspecified exit criteria (owner-facing risk)

**Longest pole (as originally assessed, before the P-2 work order landed):** ~~**P-2 (gateway-dup fix)**~~ —
cross-repo (`agents-manager`), independent of every design choice, and everything downstream is theatre until
it's verified (both M5 waves converged: even implementing the resolver against the current gateway journals
undeserved trust). It gates P-5(populate) and P-1(build) and does not start itself unless ordered now — hence
"order it in parallel first" (step 3).

**Correction 2026-08-12 (additive, per `WORKORDER-gateway-dup-P2.decision.md` and `state.md`'s 2026-08-12-b
button, same evidence):** the P-2 investigation found the historically-diagnosed root cause (no ingress
dedup) is already fixed (commit `3e3327d`); what remains is a narrower crash-window race (§1 P-2(d) above),
which is smaller-scoped work than originally assumed here. **The longest pole is now isolation uid-split**
(step 4) — large engineering (process model + IPC) that gives P-5 its teeth and P-1 its build; it is the
*only* thing that makes P-5's disjointness enforceable rather than conventional, and its scope did not shrink
the way P-2's did. P-2 remains a real, ordered-in-parallel blocker (§3 step 3) — it is just no longer the
*longest* one.

**➕ VERIFIED CORRECTION 2026-08-12 (additive — supersedes the "Correction 2026-08-12" paragraph directly
above, both left in place per LOSE-NOTHING):** the paragraph above assumed the *only* residual P-2 gap was
Finding B's microtask crash-window. An adversarial re-verification of the **VOICE path** found a far wider
gap: dedup runs only *after* a ≤5-min transcription, and grammY's polling offset is in-memory, so a crash
in that window redelivers an un-deduped duplicate turn — the owner's actual symptom
(`WORKORDER-gateway-dup-P2.decision.md` §"Verified correction 2026-08-12", with `telegram-channel.ts:449-470`
/ `bot.js:81,192,421` / `message.entity.ts` file:line). **P-2 is therefore re-elevated to a first-order
blocker on the live symptom, not a narrowed one.** Whether it out-ranks isolation uid-split as *the*
single longest pole is for the owner to re-weigh; the corrected fact is that P-2's remaining scope did
**not** shrink the way this section claimed.

**Untestable / underspecified exit criteria (flagged):**
- **P-5 "write-channel disjoint" is UNTESTABLE today by construction.** Under same-uid ISO-2 reality
  (engine + `claude -p` child share one OS uid, in-process), a filesystem-permission boundary is *convention,
  not enforcement* (Fable §0). The T-seed criterion ("owner's write channel genuinely disjoint from the
  gateway's deploy tree") cannot be satisfied — or even meaningfully tested — until the isolation uid-split
  (step 4) lands. **Owner risk:** do not mark P-5 green on a paper claim of disjointness; it needs the
  uid-split first, then a critic pass. This is why populate is sequenced AFTER isolation, not with the name.
- **P-2 "verified" is underspecified re: RT6.** The exit says "verified fix", but what "verified" means for
  the *engine-side* dedup under dup-redelivery with a **fresh `ts`** is not specified or tested by any wave
  (RT6, synthesis §7). **Owner risk:** the P-2 exit criterion needs an explicit engine-dedup-under-fresh-ts
  test added to its definition, else "verified" can be claimed while the fresh-ts path stays open.
- **P-4 is a human gate, not machine-testable** (by design — observable via a decision doc). Not a defect,
  named so no one later expects an automated check.
- **Honest limit on P-3:** its exit criterion is fully testable (AC-1…AC-6), but "P-3 green" ≠ "G4 satisfied".
  Reservation guarantees the field exists and is carried; trustworthiness of the value is P-5's job. Do not
  read a green P-3 as closing G4.
