---
type: design
node_type: design-note
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: how to implement the root of trust for `seamAuthority` (Decision-4) — sequence, not a fork
related:
  - ../../../../../../../_log/2026-08-12-direction-review-and-both-as-settings/raw/01-fork4-root-of-trust.analysis.md
  - ../../decisions/FORK-decision4-root-of-trust.decision.md
  - ../../m5-surface-identity/design/root-of-trust/01-engine-registry.design.md
  - ../../m5-surface-identity/design/root-of-trust/02-signed-artifact.design.md
  - ../../m5-surface-identity/design/root-of-trust/03-defer-or-reuse-capability.design.md
  - ../../m5-surface-identity/design/root-of-trust/04-threat-model.critic.md
  - ../../m5-surface-identity/design/05-seamAuthority-reservation.spec.md
  - ../../m5-surface-identity/design/05b-seamAuthority-reality-anchors.analysis.md
  - ../../../../../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
phase: DESIGN — how-to only. Repackages already-ratified material. NO code, NO commits. Buildable on «строй».
---

# HOW-TO — implement the root of trust for `seamAuthority` (Decision-4)

## 1. What this is

`seamAuthority` answers *"who authorized this host process to be a stamper at all"* (G4,
issuer-of-the-issuer) — distinct from `issuer` (who vouched for one principal). Reserving the field
(P-3, already spec'd) only reserves the SHAPE; it says nothing about where the answer comes from. Without
an out-of-band anchor, a stamping process could self-declare `seamAuthority` as any string — the same
`actor≠principal` self-attestation hole ADR-0010 closed at the act level, recurring one layer up. The
root of trust is that anchor: the thing outside the stamping process that certifies which hosts are
legitimate seam owners.

## 2. The fork and its resolution

| Option | What | Status |
|---|---|---|
| **A — engine-registry** | Flat, owner-writable allowlist of legitimate hosts, engine-side, consulted as a clamp. Zero crypto. | Absorbed as the mechanism's physical **form** (placement + schema), content deferred. |
| **B — owner-signed artifact** | Ed25519-signed host certificate, private key never touches a running process, verified at resolver bootstrap. | **Parked** — named, interface-compatible upgrade. Not built. |
| **C — name + defer + gate** | Not a rival mechanism: a sequencing decision. Name `policy:seam-authority` now, defer populating it, gate the enforcement flip behind a new precondition. | **Chosen.** This is what gets executed (§3). |

Applying the meta-principle: the **invariant** is that the root must be **named** — exactly one
Constitution-class node (`policy:seam-authority`), never two competing registries. That gets built now,
as form. The **axis-setting** is *trust-domain topology* — `single-owner, shared-filesystem-write`
(today, ISO-2) vs `multi-host / untrusted-transport` (future, only if a marketplace/plugin Charter
exists, ISO-3). The switch is a **checkable condition** (does a second, less-trusted trust domain exist
yet? — currently no, per ADR-0011:100-103, "vision-level intention only"), not operator taste.

**Why A→B is a sequence, not a fork:** `seamAuthority` is typed as an opaque string by construction
(P-3 spec §3.1, G-3) — both mechanisms write into the *same* field. A's own threat-table analysis shows
its "agent can't write it" guarantee is **empty today**: engine and the `claude -p` child share one
OS uid, in-process, so a filesystem boundary between them is convention, not enforcement (`01-engine-registry.design.md
§7`). Adopting A's guarantee as if it were real, or building B to defend a flank (compromised
engine-side storage / second trust domain) that has no occupant yet, are both the same mistake from
opposite directions — booking a guarantee same-uid reality can't cash. C is the only move that buys
A's reservation without the false claim: it names the mechanism, keeps the floor honestly `unverified`,
and converts B into a resolver-implementation swap for later, not a redesign.

## 3. How to implement — what to do now

0 code lands from this document. It describes what to reserve on paper and, on owner «строй», what a
builder lands verbatim.

1. **Name the mechanism: `policy:seam-authority`.** A Constitution-class protected node
   (`protected_namespaces`, `can_write: []`), read by the engine as a **clamp** on the trust axis —
   reusing the ADR-0004 §D3 pattern (deny/Constitution zeroes-after-fold, the project's one load-bearing
   safety invariant) plus ADR-0006 arbitration. Explicitly **not** a capability grant — a grant
   presupposes the principal the seam is supposed to produce, which would be circular. Physical home
   when populated = option A's placement (`$FF_ENGINE_HOME/trust/`, engine-principal-owned); A is
   absorbed as the mechanism's *form* (schema: maxTrust ceiling, subjects, revoke-not-delete), not
   adopted as a live guarantee.
2. **Register precondition P-5 in ADR-0011**, alongside P-1…P-4 (already done, ADR-0011 "P-5 (added
   2026-08-12)" section): *out-of-band `seamAuthority` root named + populated + write-channel verified
   disjoint from every agent-writable path.* Enforcement flip ③ cannot go green while P-5 is red. This
   is what turns "defer the root" from a silent omission into an explicit, checked gate.
3. **Make P-5 machine-checked, not prose-only.** Concretely (still on owner «строй», not now):
   - An **inert** `seam-authority-registry.json` (schema-shaped, `subjects: []`) + a loader stub with
     **zero call-sites, zero enforcement path** — same paper-freeze pattern already reviewer-PASSed for
     `ports/principal-{resolver,stamper}.ts` (187/187). Its purpose is double: a concrete artifact the
     schema/loader can be unit-frozen against, and a **canary** — "can the agent-uid write this path?"
     — expected RED today (same-uid), which empirically dates the moment isolation actually starts
     biting instead of leaving that fact as prose.
   - A **tripwire test/lint** that fails if any enforcement-flip code path exists while the registry is
     empty or absent. Reason to insist on this over prose: this project already has a documented
     prose-precondition rot precedent (a "Stage-1 uncommitted" claim that silently drifted from reality
     for a session, commit `3474cd1`). A markdown gate among many files is a *proven* rot vector here;
     a machine-checked gate cannot silently drift.
4. **Park B as the named, interface-compatible upgrade.** No custody surface, no signing ceremony, no
   expiry/rotation handling is built. `02-signed-artifact.design.md §5-6` records the switch condition
   explicitly: reopen only when a second, less-trusted trust domain appears; the change is then a
   **resolver-implementation swap** on the same field, not a type or journal migration.
5. **State the honest floor everywhere this touches.** Until P-5 is green, every stamp reads
   `unverified` ("seam authority not vouched") — this is already true today; naming the mechanism does
   not change behavior, it makes the gap checkable instead of merely known.

**What is reserved by form vs what is deferred:**
- Reserved now (form): the node's identity/namespace (`policy:seam-authority`), its class (Constitution
  clamp, not a grant), P-5's existence as a registered ADR-0011 precondition, the opaque-string shape
  `seamAuthority` already carries (P-3, independent spec, unaffected by this decision).
- Deferred (content/behavior): populating the registry, any PEP read of `seamAuthority`, B's signing
  mechanism, the inert-artifact + tripwire files themselves (code-on-disk — blocked on «строй» per the
  doc-tree rule, not on this decision).

## 4. Open gates / what blocks this

- **P-5's write-channel-disjoint clause is untestable before the uid/process split.** At today's
  same-uid ISO-2 reality (engine and `claude -p` child = one OS uid, in-process), "agent can't write the
  root" is convention, not enforcement — populating the registry green before the split would certify a
  host that can still double-stamp behind a boundary that doesn't structurally exist yet. This is the
  dependency on **isolation execution (uid/process split)** — the sequence step that gives A's guarantee
  actual teeth. No track for that split exists yet under `tracks/` (would be the next-numbered track,
  e.g. `tracks/03-uid-split/`, not yet created); until it lands, P-5 stays red by construction.
- **P-2 (gateway-dup) is orthogonal and unclosed by this decision.** A sanctioned host that double-fires
  produces two legitimately vouched stamps under ANY root (A, B, or C) — both pass, both poison the
  append-only log. Fix lives in `agents-manager` ingress dedup, tracked separately
  (`decisions/WORKORDER-gateway-dup-P2.decision.md`); this document does not touch it.
- **T-seed / T-scope remain owner-pending inside C**, flagged for a critic pass before P-5 may ever be
  marked green: is the owner's eventual write channel to the node genuinely disjoint from the deploy
  tree the gateway runs from; is the registry project-scoped or platform-scoped.
- Decision-4=C (this document) unblocks **Decision-5 (topology, broker-seed)** — a standalone broker is
  legitimate only after the root is named (`tracks/02-topology/`, decision doc §2 sequence step 1→2).

## 5. Pointers

- Analysis: `docs/_log/2026-08-12-direction-review-and-both-as-settings/raw/01-fork4-root-of-trust.analysis.md`
- Decision: `docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/decisions/FORK-decision4-root-of-trust.decision.md`
- Option designs: `.../m5-surface-identity/design/root-of-trust/{01-engine-registry,02-signed-artifact,03-defer-or-reuse-capability,04-threat-model.critic}.md`
- Field spec: `.../m5-surface-identity/design/05-seamAuthority-reservation.spec.md` + `05b-seamAuthority-reality-anchors.analysis.md`
- ADR-0004 §D3 (Constitution clamp pattern), ADR-0011 "P-5 (added 2026-08-12)" section
