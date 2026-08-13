---
type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
lens: system-architect (root-of-trust option A — engine-side owner-writable host registry)
title: "DESIGN — Root of trust (decision 4, option A): engine-side registry of legitimate seam hosts, owner-writable"
scope: Project (FF-Personal-Management) · packages/engine (write-PEP consult point) + engine deploy boundary (registry file). Branch refactor-tree. DESIGN — no code, no commits.
decides: "owner-decision 4 (M5-synthesis §2/§6): who certifies `seamAuthority` OUT-OF-BAND — variant (a) engine-side static registry of legitimate hosts, owner-writable only"
related:
  - ../04-SYNTHESIS-m5-decision-ready.md          # §2 (root of trust ≠ topology), §6 decision 4, variant (a) recommended
  - ../05-seamAuthority-reservation.spec.md        # P-3 — the field this registry certifies; §7 honest-limit (reservation ≠ trustworthiness)
  - ../05b-seamAuthority-reality-anchors.analysis.md  # ground truth: PEP gates on finalized.actor; principal.* has 0 call-sites; same-process reality
  - ../../census/03-threat-and-values.critic.md    # T5 (config self-edit), V5 Суверенность, "certifier outside certified"
  - ../../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md   # invariant ① authority≠attribution; G1/G3; honest-limit para
  - ../../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md                # G4 (:123-145), OQ-1 seam-owner governance, OQ-3/4 isolation reliability, P-2/P-3
anchors:  # real file:line this design binds to (verified by direct read 2026-08-12)
  - packages/engine/src/engine.ts:60            # assertConstitution — fail-stop-on-start precedent this registry mirrors
  - packages/engine/src/engine.ts:84-126        # write-side PEP — where the registry is consulted (future enforcement, decision ③)
  - packages/engine/src/ports/principal-resolver.ts:30-39   # AuthenticatedPrincipal.seamAuthority (the value the registry certifies)
  - packages/engine/src/core/types.ts:231-247   # PrincipalAssurance — carries seamAuthority onto the journaled Act
phase: DESIGN — design doc only. Specifies WHERE the certification lands when enforcement (decision ③) flips. NO behavior wired today.
---

# DESIGN — Root of trust (decision 4 · option A): engine-side, owner-writable registry of legitimate seam hosts

> This is the RECOMMENDED variant (a) from `04-SYNTHESIS §2/§6`. It answers one question and only one:
> **what, OUT-OF-BAND, certifies that a `seamAuthority` value is legitimate** — so the stamping host cannot
> self-certify its own right to stamp (the `actor≠principal` hole ADR-0010 closed, recurring one level up at
> the seam — critic Form β, `03-threat-and-values §1`). It is NOT topology (decision 5) and NOT the P-3 field
> reservation (decision 3, already specified in `05-…spec.md`). This design says where the ANCHOR lives, how
> the engine reads it, and — honestly — where it still leaks under today's isolation reality.

---

## 1. The principle this must satisfy, stated sharply

**The certifier must be outside the certified.** ADR-0010 ① made the engine refuse to take *authority* from a
self-declared body field; `seamAuthority` (G4, ADR-0011:123-145) is the same rule one level up: the host that
STAMPS a principal must not also be the thing that DECLARES its own right to stamp. A `seamAuthority` string is
inert until something the stamping host **cannot write** vouches for it. Option A makes that something a
**file the owner writes and the agent/host cannot** — the engine consults it, the host merely presents an id.

This mirrors exactly how ADR-0010's trusted analogies work: the OS kernel stamps `uid` because the process
cannot write the passwd/credential store the kernel checks; the gateway stamps `thread_id` because the child
cannot forge the router. The registry is FF's equivalent of that out-of-band credential store — **but only if
the file sits behind a boundary the certified process cannot cross** (§7 is where that "if" bites).

---

## 2. Where the registry lives — placement is the whole design

The threat is concrete (`03-threat-and-values` T5, project `CLAUDE.md`): a spawned `claude -p` child can write
its own gateway binding files (`.gateway/conversations/<chatId>/PROMPT.md`, `config.json`), the project working
tree (`cwd`), and — under its own OS user — its `~/.claude/**` HOME. **Any of those as the registry home is
disqualified by construction**: the resolved unit would have write access to the input of its own resolution
(the self-elevation loop T5 names). So the registry must live where NONE of those reach.

**Chosen home (form):**

```
$FF_ENGINE_HOME/trust/seam-authority-registry.json
```

- `FF_ENGINE_HOME` = the ENGINE daemon's own config root, a fixed absolute path resolved by the engine at boot
  (§3), NOT the project `cwd`, NOT under any `.gateway/conversations/**`, NOT under the agent child's HOME.
- **Owner** of the file = the engine's own OS principal (a dedicated service account, e.g. `ff-engine`), NOT
  the uid the spawned `claude -p` agent runs as. Mode `0644` — **owner read/write, everyone else read-only.**
- The engine reads it; the owner edits it (as the `ff-engine` principal, or via an owner-only admin path);
  the agent's uid can `open()` it for read and is denied `write()` by the OS.

**Why the agent can't write it — and the exact condition under which that is TRUE:** the guarantee is an OS
filesystem-permission boundary — the file is owned by the engine principal and mode-denies write to the agent's
uid. This is a *below-the-agent* enforcement (like `uid` itself), not a matter of the agent's good behavior —
**PROVIDED the engine runs under a different OS principal than the spawned agent.** Today it does not (engine
and `claude -p` child share one uid, in-process — `05b` / `02-caller-reality`). So this placement is CORRECT in
form and retrofit-cheap to reserve now, but its teeth arrive only when the engine is a separate privileged
process/daemon under its own uid (the real ISO-2/ISO-3 execution of ADR-0011). That gap is the residual leak,
made explicit in §7 — it is a property of the isolation boundary, not something the registry can grant itself.

**Not chosen (and why):** in-repo `packages/engine/config/…` (agent has `cwd` write) · `~/.claude/registry/`
like `project-registry.md` (agent's HOME, agent-writable) · anything adjacent to the gateway conversation dir
(T5 self-edit surface). All three put the certifier inside the certified.

---

## 3. Schema and how the engine loads it

**Schema (form — an opaque-keyed allowlist with a trust ceiling per host):**

```json
{
  "version": 1,
  "updated": "2026-08-12",
  "hosts": {
    "gateway:agents-manager": {
      "status": "active",
      "maxTrust": "channel",
      "subjects": "*",
      "added": "2026-08-12",
      "note": "Telegram gateway, M3 IPC boundary",
      "revokedAt": null
    }
  }
}
```

- **Key** = the EXACT string a resolver puts in `AuthenticatedPrincipal.seamAuthority`
  (`principal-resolver.ts:30-39`). The registry certifies *that literal id*.
- **`status`** = `active | revoked` — revocation without deletion (audit, LOSE-NOTHING, doc-tree law 9/10).
- **`maxTrust`** = ceiling on the `PrincipalTrust` axis (`unverified|channel|attested`) this host may assert —
  **defense in depth**: even a listed host cannot stamp `attested` if granted only `channel`. A host may only
  ever LOWER, never raise, past its ceiling.
- **`subjects`** = `"*"` or a list of subject prefixes this host may vouch for (a gateway that owns only
  `user:jenya` should not be able to vouch `agent:core`). Least-privilege on the seam.

**Load discipline (mirrors `assertConstitution`, engine.ts:60 — fail-STOP precedent):**

- Loaded ONCE at engine construction into `this.hostRegistry`; **never re-read on the hot write path** (no
  per-write disk read → no TOCTOU, no disk-trust in the loop).
- Absolute path only; **no env-var / symlink / cwd-relative resolution** the agent could redirect (a redirect
  would let the agent point the engine at an agent-owned registry — closing that is part of the fail-stop).
- **Boot policy — asymmetric on purpose:** MISSING or empty registry = valid → everything clamps to
  `unverified` (fail-CLOSED on trust, fail-OPEN on boot; a fresh install still starts, just trusts nothing).
  File EXISTS but wrong owner/mode (not owned by the engine principal, or group/other-writable) = **refuse to
  start** (fail-stop) — a wrong-permission registry is a tamper signal, treated like a missing Constitution.

---

## 4. How the engine consults it in the PEP (write path, engine.ts:84-126)

Ground truth (`05b`): the write-PEP today gates on `finalized.actor`; `principal.*` has zero call-sites; the
P-3 field is paper-freeze. So this section specifies the **future** consult point that lands when enforcement
(Decision ③) flips — it is DESIGN, wired today by nothing.

- The check is a **CLAMP, not a gate.** A new clause folded into the PEP block reads
  `finalized.principal?.seamAuthority` against `this.hostRegistry`:
  - **present + `status:'active'` + subject within `subjects` + trust within `maxTrust`** → the stamped trust
    axis stands as vouched; record `seamAuthorityVerified: true`.
  - **absent / unknown key / revoked / over ceiling / wrong subject** → the engine **downgrades the recorded
    trust to `unverified`** and marks `seamAuthorityVerified: false`. The act still journals (attribution is
    preserved), it just carries honest `unverified` trust.
- **Why clamp, not refuse:** refusing the write would break availability (Витальность/Реляционность) and is
  not the job — the job is to stop *undeserved trust* from entering the append-only journal (ADR-0010's
  retrofit-honesty concern, G3). Clamp-to-`unverified` is exactly the honest default `05-spec §7` and ADR-0010's
  honest-limit paragraph require: "seam authority not vouched." No trust is journaled that the registry did not
  vouch. This keeps the certifier (registry, read by the engine) strictly ABOVE the write — the host proposes a
  trust level, the engine downgrades it to what the owner's registry actually sanctions.
- Placement is symmetric with the existing force-bind guards (engine.ts:104-125): same block, same
  `isProjectable` scope for anything touching canonical/control-plane state; the clamp itself is cheap and has
  no disk access (registry already in memory).

---

## 5. Bootstrap (the first entry) — owner-seeds-manually, NOT trust-on-first-use

**Decision: owner seeds every entry by hand. TOFU is rejected.**

Trust-on-first-use on the *seam authority* is the self-certification hole verbatim, one level up: TOFU would let
the FIRST host to call `stamp()` enroll ITSELF as legitimate — the certified certifying itself, which is the
exact thing decision 4 exists to prevent (critic Form β). So:

- The registry **ships EMPTY.** Until the owner adds an entry, every host stamps `unverified` (fail-closed) —
  which is the correct, honest state the DEFER-build verdict already demands while the source is unbuilt.
- The **first entry** (`gateway:agents-manager`) is added by the OWNER as a deliberate out-of-band act — editing
  the file as the engine principal — **only when the M3 IPC boundary is real AND P-2 (gateway-dup) is
  verified-fixed** (ADR-0011 P-2). Adding it earlier would certify a host known to double-stamp, i.e. journal
  "vouched" trust from a broken channel — the theatre `04-SYNTHESIS §4` forbids. Bootstrap is therefore gated on
  P-2, not just on the owner's willingness.
- The owner's act of adding a host IS the consent artifact (§6, Согласие): "I sanction this host to stamp on my
  behalf, up to `maxTrust`, for these `subjects`." Explicit, dated, revocable, auditable.

---

## 6. Revocation

- Owner sets `status:'revoked'` + `revokedAt` (row KEPT for audit — LOSE-NOTHING). At the next controlled engine
  reload (boot or explicit owner-issued reload/SIGHUP), the in-memory registry drops that host's certification →
  every subsequent stamp from it clamps to `unverified`.
- **Not retroactive, by design.** Acts already journaled under that host stay exactly as recorded — the log is
  append-only (ADR-0008); you cannot and must not rewrite history. Revocation stops FUTURE trust; the audit
  trail honestly shows the host was sanctioned up to `revokedAt`. (Тождество: the record never claims a
  legitimacy it did not have, and never erases one it did.)
- **Reload is a controlled owner action, not hot-per-write** — this preserves the no-TOCTOU property (§3). A host
  compromised mid-session is contained by restart/reload, an owner act, not by the engine re-reading disk each
  write.

---

## 7. Stress: does the registry satisfy "certifier outside the certified"? Where it still leaks

**In FORM, yes.** The registry is DATA the engine consults; the certified = the stamping host; the certifier =
the owner, expressed as a file the engine reads and the host cannot write. As long as the file is owned by the
engine principal and the host runs as a different uid, the certifier is genuinely outside the certified — and
the owner, not the platform, is the sole author of who may stamp (Суверенность in its strongest form).

**Residual leaks I could NOT close in this design:**

1. **The load-bearing leak — same-uid isolation (unclosable here).** Today the engine and the spawned
   `claude -p` agent run under ONE OS user, in-process (`05b`, `02-caller-reality`). No filesystem permission
   stops a same-uid agent from writing the registry file — or worse, from editing the engine's own code /
   `NODE_OPTIONS` to subvert the reader entirely. So "the agent can't write it" is, at today's ISO-2
   (process-per-turn, same uid, no OS sandbox), an **honest convention, not enforcement.** The teeth exist only
   when the engine runs as a separate privileged principal (own uid / container / service account) so the child
   PHYSICALLY lacks write permission. That is an ADR-0011 *execution* prerequisite (OQ-3 granularity, OQ-4
   reliability, + a real uid split), NOT something the registry can grant itself. **The registry closes the
   "certify by owner-policy, not by self-declaration" half; it does NOT close the "the certified process cannot
   forge the certifier's input" half — that half is the isolation boundary.** The registry is correct and cheap
   to reserve now; its integrity is exactly as strong as the uid boundary beneath it, and no stronger.
2. **Who HOSTS the engine.** If the gateway process is the one that loads and runs the engine (in-process, as
   today), the certified host and the certifier's process are the same address space — the in-memory registry is
   tamperable by the process that also stamps. Only a real out-of-process engine (the host calls IN over IPC;
   the registry lives with the engine elsewhere) makes the boundary real. Same root cause as #1.
3. **Path/provenance redirection.** The engine trusts whatever file is at the resolved path at boot. If the agent
   can influence WHICH path (env, symlink, cwd-relative), it redirects the anchor. Mitigated by absolute-path +
   no-env/symlink + owner/mode fail-stop (§3) — but that mitigation ITSELF only bites once #1 holds (a same-uid
   agent can just edit the engine binary that does the checking).
4. **P-2 orthogonal.** The registry certifies that a host is a *legitimate* stamper; it says nothing about
   *once-only delivery*. A sanctioned host that double-fires (gateway-dup) produces TWO legitimately-vouched
   stamps — both pass the registry, both poison the append-only log. Root of trust and idempotency are
   independent; this design does not touch P-2 (correctly out of scope, `04-SYNTHESIS §4`).

**Honest bottom line:** option A is the right FORM of the anchor and the cheapest to reserve — it names the
owner as the out-of-band certifier and gives the engine a place to consult that is not the act body. It becomes
REAL enforcement only atop a real uid/isolation split (ADR-0011 execution) and behind a verified P-2 fix. Until
then, per §4 the correct behavior is that every stamp reads honestly as `unverified` — the registry lets the
owner START vouching the moment those two prerequisites are true, without a retrofit.

---

## 8. Seven-values ledger

| Value | How option A serves it | Caveat |
|---|---|---|
| **Суверенность (V5)** | Owner is the SOLE writer of who may stamp; platform/agent has zero write authority over the registry. Add/revoke = deliberate owner acts. | Centralization (ADR-0011 OQ-1): a single owner-held anchor; lost/corrupt → whole seam falls to `unverified` — the safe (fail-closed) direction, but a single point. |
| **Доверие (V3)** | Trust never rises without a registry match (G3); empty registry = all `unverified` = no false confidence journaled. | Real only once §7#1 holds; before that, "cannot write it" is convention. |
| **Согласие (V7)** | Adding a host to the registry IS the explicit, dated, revocable consent artifact — not a consent proxy smuggled through `underWhoseAuthority`. | Consent is at host granularity, not per-act; finer consent is later work. |
| **Тождество (V2)** | Registry certifies WHO MAY STAMP; it never rewrites `actor` (G1 intact). Revocation is non-retroactive — the record never claims or erases legitimacy it didn't have. | — |
| **Читаемость (V1)** | Small human-readable JSON the owner reads/edits directly; `seamAuthorityVerified:false` surfaces unverified state to a human auditor in the journal. | Surfacing in a UI is downstream (V1 gap noted in critic pass). |
| **Витальность/Реляционность (V4/V6)** | Clamp-not-refuse: an unlisted host's writes still land (as `unverified`); work is never blocked, only the trust label stays honest. | — |
