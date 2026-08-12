---
type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-11
title: Premise-check — 3 trust-bugs verified against code (not against prior agents' words)
scope: packages/engine (branch refactor-tree)
related:
  - ./CRITIC-redteam.analysis.md
  - ./FABLE-strategist.advisory.md
  - packages/engine/src/engine.ts
  - packages/engine/src/core/resolve.ts
  - packages/engine/src/core/admission.ts
---

# Premise: «агент не может сломать доверие/тождество/правду/согласие»

Independent re-verification by reading the code itself. Anchors from prior agents had shifted; actual
line numbers below. **All three bugs confirmed REAL.** Root cause is shared: the WRITE plane has no
Policy Enforcement Point wired in — so the read plane's carefully-built gates are dead on write.

---

## T-write-pep-unwired (F3) — REAL (this is the root)

**REAL? YES.** `engine.ts:73-111` `write()` runs exactly three checks before persisting:
`admit()` (PII-only, `admission.ts:130`), `admitHome()` (one-home barrier, `admission.ts:110`),
content-hash idempotency (`engine.ts:98-104`) → then `store.writeAct(finalized)` (`engine.ts:106`).
**`resolve('write',…)` / `resolveWrite` is NEVER called in the write path.** Proof by grep: the only
callers of `.resolve(` are the READ lens (`view-compiler.ts:58,102,142,223`, all `'read'`) and the CLI
query (`cli.ts:73`). `resolveWrite` has ZERO production callers outside `resolve.ts` itself. `admit()`
does no authorization — only `scan()` for inline PII and a payloadHash presence check.

So the whole control plane built in `resolve.ts` (allowlists, admin/constitution clamps, namespace
ceiling, meta-cap gates) is **declared but not inserted** on writes. The comment at `resolve.ts:2`
calls `resolve()` "THE PEP" and `engine.ts:5-7` claims write is "FAIL-CLOSED BY BEHAVIOUR" — true only
for PII, false for access/authority. `write-plane.test.ts` confirms behaviourally: every write is
admitted on PII+home alone, never on capability.

**EXPLOIT-PATH:** any actor calls `engine.write(act)` with an act that writes any node it is NOT in
`access.can_write` for → admitted (no PII) → journaled. No permission is ever consulted.

**FIX-SKETCH:** in `write()`, after admit/home, derive the target node(s) the act mutates and call
`this.policy.resolve('write', finalized.actor, targetNode, this.graph)`; refuse before `writeAct` on
DENY. The subject is already on the envelope (`Act.actor`, `types.ts:215`), so **the `write(act)` port
signature does NOT change.** The work is mapping act→target-node(s) for the check. **Cost: M** (a few
hours: engine wiring + tests; deriving target from edge/projection semantics is the fiddly part).

**BLAST-RADIUS: YES (behaviour), NO (contract).** Port signature `write(act): Ack` unchanged →
`ports/` untouched. BUT behaviour changes: writes that pass today will start DENYing. Exactly the
critic's warning — fixture demos that write ungated (e.g. `write-plane.test.ts`, any ingest fixture
without grants) WILL break on merge. Must ship fixtures with the grants that authorize their writes.

---

## T-grant-forgery (F1) — REAL

**REAL? YES.** `resolve.ts:136-141` `grantValid()`: in FIXED it reads `minter = g.body?.minted_by`
and returns `true` unconditionally when `minter === 'system' || minter === 'engine'` (`:139`). There is
**no signature, no provenance binding** between the `minted_by` string and who actually authored the
grant node — it is plain body data (`types.ts:164 minted_by: string`). The `canMintGrant` gate that
would require `core:manage-grants` exists (`resolve.ts:80-85`) but is **never invoked** on the write
path (same unwired-PEP root; grep shows no production caller).

**EXPLOIT-PATH:** (1) actor writes a `grant` node with `subject: <self>`, `allow: ['core:*']`,
`minted_by: 'system'`; (2) `grantValid` trusts the string → `holdsCapability` now returns true for any
cap → actor is root. Breaks *доверие* + *согласие* (can self-grant the irreversible-action bypass).

**FIX-SKETCH:** stop trusting `minted_by` as a bearer token. Either (a) bind provenance —
`minted_by` must equal the authenticated `act.actor` that wrote the grant, and a non-system minter must
independently hold `core:manage-grants` (drop the blanket `'system'` shortcut, or only honour it when
the writer IS the system substrate, not a projected act); and/or (b) invoke `canMintGrant` on the write
path. **Cost: S-M** (grantValid logic is small; the honest fix depends on F3 giving a trustworthy
author).

**BLAST-RADIUS: NO port change** (`resolve.ts` internal). Behaviour: previously-accepted `minted_by:'system'`
fixture grants may become invalid → resolve/ceiling tests using self-minted grants could flip. Contained
to engine tests, not `ports/`.

---

## T-policy-node-provenance (F2) — REAL (subsumed by F3)

**REAL? YES.** The protection exists: `resolveWrite` applies a namespace ceiling via
`canWriteNamespace` (`resolve.ts:230`, gate at `:86-94`) that requires `core:manage-core` to write a
node whose id starts with a `protected_namespaces` prefix from `policy:constitution`. **But it lives
INSIDE `resolveWrite`, which the write path never calls (F3).** Therefore an ordinary
`engine.write()` can emit an act that overwrites `policy:constitution`, `meta:cap/core:*`, or any grant
node — the ceiling never runs. Secondary gap: every shipped constitution fixture has
`protected_namespaces: []` (`write-plane.test.ts:45`, `invariants.test.ts:55`, etc.), so even once
wired the policy/meta namespaces aren't listed as protected — the ceiling would still pass them.

**EXPLOIT-PATH:** (1) actor writes act asserting `policy:constitution` with `no_read_ids: []`,
`protected_namespaces: []`, `default: 'allow'`; (2) projection folds it → the agent has rewritten the
very rules that bound it. Breaks *правда* + *тождество* (mutable constitution = no fixed identity).

**FIX-SKETCH:** F3 (wire the write PEP) is the enabler; PLUS set `protected_namespaces` to include
`policy:`, `meta:cap/core:`, and the grant namespace in the real constitution seed. Little/no new code
beyond F3 — mostly a config/fixture assertion + a test that a non-`manage-core` write to `policy:*` is
refused. **Cost: S on top of F3** (do not double-count the M of F3).

**BLAST-RADIUS: NO port change.** Behaviour: once protected, writes to policy/meta namespaces from
unprivileged actors DENY → any fixture/demo that seeds or edits policy nodes via `write()` (rather than
as substrate) breaks. Substrate seeding (constructor `store.load()`) is unaffected — it does not pass
through `write()`.

---

## Dependencies & parallelism (one write-lock rule)

- **F1 and F2 both edit `resolve.ts`** (grantValid `:136-141` for F1; namespace-ceiling wiring/config
  around `:86-94,230` for F2) → **cannot be parallelised on separate write-locks; same file.**
- **F3 edits `engine.ts`** (`write()` `:73-111`) → different file, but **F2 has a logical DEPENDENCY on
  F3**: the namespace ceiling only bites once the write PEP is invoked. **Do F3 first, then F2.**
- **F1 is logically independent of F3's file** but its *honest* fix (trusting an authenticated author)
  is stronger once F3 gives a real subject; sequence F3 → F1/F2, all touching engine.ts then resolve.ts.
- Practical order: **F3 (engine.ts wiring) → F2 (resolve.ts config+ceiling) + F1 (resolve.ts grantValid)
  in one resolve.ts pass.** Two write-locks total, not three.

---

## ВЕРДИКТ

**Премиса ЧАСТИЧНО ОПРОВЕРГНУТА кодом (в текущем состоянии) — все 3 бага РЕАЛЬНЫ.** Сегодня агент
МОЖЕТ сломать доверие/тождество/правду/согласие: он самоподписывает capability (`minted_by:'system'`),
перезаписывает конституцию/мета-капы, и вообще пишет что угодно — потому что **write-PEP объявлен, но
не вклинён** в путь записи. Read-плоскость защищена (view-compiler маршрутизирует через `resolve('read')`);
write-плоскость — нет. Это не «дыра в дизайне» resolve.ts (гейты написаны корректно) — это **разрыв
проводки** в engine.ts: механизм есть, к горячему пути записи не подключён.

**Суммарный timebox на 3 фикса: M (~половина дня — 3-5 часов).** F3 = M (ядро работы). F1 = S. F2 = S
поверх F3. Один engine.ts-проход + один resolve.ts-проход. Blast-radius по контракту/`ports/` — **НЕТ**
(сигнатуры не меняются); по ПОВЕДЕНИЮ — **ДА** (фикстуры-демо, пишущие без грантов, упадут на merge →
чинить вместе с фиксом: досыпать авторизующие гранты в фикстуры).
