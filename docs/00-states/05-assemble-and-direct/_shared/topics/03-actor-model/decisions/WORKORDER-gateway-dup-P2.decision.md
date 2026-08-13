---
type: decision
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
related:
  - ../../../../../../_log/2026-08-12-m5-census-and-operating-model/HANDOFF.md
  - ../../../../../../01-organization/process/bugs/gateway-dup/INDEX.md
  - ../../../../../../topics/20-analysis/2026-07-05-DIAG-background-agents-died.md
  - /Users/mac16/.claude/projects/-Users-mac16-Documents-IT-Apps-FF-Personal-Managment/memory/gateway-dup-kill-bug.md
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager (cross-repo target — READ ONLY from FF)
---

# WORK-ORDER — gateway-dup (P-2), trust-line critical-path item

> **Cross-repo hand-off.** The bug and its fix live in `agents-manager`
> (`/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager`), NOT in this repo. FF cannot fix it — this
> document is the brief for the owner or the agents-manager maintainer to act on. This session only
> investigated (read-only) and wrote this work-order.

## 1. Symptom (as experienced in FF sessions)

Telegram gateway (`agents-manager`, bot "FF Personal") occasionally **delivers one incoming message
(seen up to ~6-7×) as multiple separate turns**. Two visible failure modes, both logged historically:
1. Each redelivery = a fresh `claude -p --resume` process → **kills already-running background
   sub-agents** of the prior turn (SIGKILL on the process tree).
2. The redelivered turn is often a no-op ("No response requested") → **owner perceives silence**
   (assistant appears to ignore the message).

Prior write-ups (all pre-fix, see §2): `docs/01-organization/process/bugs/gateway-dup/INDEX.md`,
`docs/topics/20-analysis/2026-07-05-DIAG-background-agents-died.md`, auto-memory
`gateway-dup-kill-bug.md` (all dated 2026-07-05/06).

## 2. Suspected root cause — with agents-manager file:line evidence

**Finding A — a fix already exists in the target repo (commit `3e3327d`, 2026-07-07), labeled "F11".**
This is *newer* than every FF write-up of the symptom (all dated 2026-07-05/06), so the historical
diagnosis ("no dedup by `message_id`/`update_id`") is **stale as a root-cause statement**. Present on
both `main` and `feat/sdk-runner` (currently checked-out branch; `main...feat/sdk-runner` = `0/3`,
i.e. `feat/sdk-runner` is 3 commits ahead of `main`, dedup code identical on both):
- `src/server/orchestration/orchestrator.ts:79-88` — `Orchestrator.handle()` builds key
  `${message.channel}:${message.conversationId}:${message.messageId}` and calls
  `this.dedup.markIfNew(key)`; if `false` (already seen) the message is dropped before routing/queueing.
- `src/server/orchestration/dedup-store.ts:12-56` — `DedupStore`: in-memory `Set` + FIFO cap (2000),
  optionally mirrored to a durable `ISeenUpdateRepo` (SQLite via TypeORM).
- `src/server/persistence/seen-update.repo.ts` + `src/server/persistence/entities/seen-update.entity.ts`
  — durable `SeenUpdate(key, seenAt)` table, upsert-by-PK.
- `src/app/build-app.ts:207,390,474` — wired at composition root; `dedup.load()` hydrates recent keys
  from SQLite **before** the bot starts accepting updates (survives process restart).
- `src/channel-telegram/ingress/normalize-inbound.util.ts:56` — `messageId: String(msg.message_id)` is
  set from the **native Telegram `message_id`** for both text and voice-transcribed messages (voice
  goes through `normalizeInboundWithText` using the same underlying `ctx.message`), so the dedup key is
  populated correctly for voice, not just text.
- Transport is **long-polling only** (`src/main.ts:6-11`, `bot.start()` in
  `src/channel-telegram/telegram-channel.ts:129`) — grep for `webhookCallback`/`allowed_updates` found
  nothing. This **rules out the "webhook + polling both on" hypothesis** from the task brief; there is
  exactly one ingestion path.

**Finding B — a real, un-tested residual gap in the fix: fire-and-forget persistence across a crash.**
`dedup-store.ts:41-56` (`markIfNew`) marks the key **in-memory synchronously**, then calls
`void this.persist(key)` — fire-and-forget, not awaited. The file's own docstring
(`dedup-store.ts:9-10`) names the risk: *"узкое окно «увидел → крэш до flush» остаётся"* (narrow
window: seen → crash before flush remains). If the process crashes/is killed in that window:
- the in-memory `Set` is lost (new process, empty `Set` until `load()` hydrates from SQLite);
- the SQLite row for that key may not have been written yet (`persist()` hadn't resolved) →
  `load()` will NOT find it as seen →
- Telegram's long-polling redelivers the un-acked update on the next `getUpdates` call after restart →
  `markIfNew()` returns `true` (looks brand-new) → **the same Telegram message is processed as a second,
  distinct turn.**
- `dedup-store.spec.ts` (read in full) tests markIfNew/FIFO/hydration/SQLite round-trip, but has **no
  test for this exact crash-window race** (kill between `markIfNew`'s in-memory mark and `persist()`
  resolving).
- No secondary/redundant guard exists downstream: `src/server/queue/queue.ts:35,142,169-205` only caps
  **concurrent running turns per bot** (`maxConcurrencyPerBot`), it does not dedupe by message identity —
  two sequential jobs for the same Telegram message would both run to completion. Ingress-level dedup in
  `Orchestrator.handle()` is the **only** line of defense.

**Finding C — this gap is not theoretical for this deployment.** The gateway runs live under pm2
(`process "agent"`, cwd = agents-manager repo, `node --import tsx src/main.ts`, i.e. it runs directly off
this checked-out `feat/sdk-runner` source — the F11 fix IS in the running code). `pm2 describe agent`:
**7 restarts in 35h uptime**, `unstable restarts: 0` (so pm2 isn't flapping, but the process has
genuinely died/restarted 7 times). `pm2 logs` show live crash-adjacent errors during that window: repeated
`API Error: Connection closed mid-response` (turn failures) and `ECONNRESET` on Telegram `sendMessage`.
These are exactly the kind of mid-flight failures that could coincide with the persist-window race in
Finding B, though **no direct evidence was captured that a restart actually reproduced a duplicate
turn** — that is the open item for the repro plan (§4).

**Net assessment:** the historically-diagnosed root cause (no dedup at all) is **fixed**. What remains
open and untested is a narrower race (crash between in-memory mark and durable persist, with no
downstream backstop) that could still produce the exact P-2 symptom (two turns from one send). Given the
process demonstrably restarts multiple times per day in production, this residual window is not
negligible.

## 3. Proposed fix approach (one line)

**Close the fire-and-forget persistence gap** — either (a) await `persist()` before returning from
`markIfNew`'s caller path for durability-critical keys (accept added latency on ingress), or (b) add a
downstream idempotency backstop (e.g. unique constraint / upsert-guard on `Message(channel, conversationId,
messageId)` at `message.repo.ts` append time, so even if ingress dedup is bypassed, a duplicate insert is
rejected/detected before a second `Job` is enqueued) — (b) is likely cheaper and doesn't slow every turn.

## 4. Verification / repro plan

1. **Direct repro (destructive, run against a throwaway/dev bot token, not production):** send a voice
   message to the bot; the instant the gateway logs ingestion (message accepted, before turn completes),
   `kill -9` the pm2-managed process to land inside the persist window; restart; confirm via Telegram
   whether the same message triggers a second turn, and check `SeenUpdate` table + `message.repo`
   `Message` rows for a duplicate `(channel, conversationId, messageId)`.
2. **Deterministic unit repro (cheap, safe):** extend `dedup-store.spec.ts` with a test that calls
   `markIfNew(key)`, then **before** awaiting the fire-and-forget persist microtask, constructs a *new*
   `DedupStore` over the *same* (still-empty) `FakeSeenUpdateRepo` and calls `load()` + `markIfNew(key)`
   again — assert it wrongly returns `true` (reproduces the gap without needing a real process kill).
3. **Production monitoring backstop (no code change):** grep pm2 logs after each observed restart for
   two `▶️ job … → …` lines (`orchestrator.ts:103`) referencing the same `messageId`/near-identical
   timestamp within the same conversation — confirms/denies live recurrence independent of the repro
   above.
4. **Regression gate:** once fixed, `pnpm verify` (typecheck + test) in agents-manager must stay green,
   and the new crash-window test from step 2 must fail on the current code and pass after the fix.

## 5. Trust-line linkage — why P-2 gates the enforcement flip / decision-③

Per `docs/_log/2026-08-12-m5-census-and-operating-model/HANDOFF.md` §"НЕСУЩЕЕ": the M5 critical path
has two owner-gates, both topology-invariant, one of which is **P-2 (this bug)**. The mechanism: the
gateway is the **T-ingress** trust tier — it authenticates `from.id` via `OwnerAllowlist` and that
authentication is what lets a downstream FF turn legitimately stamp `Act.principal = owner`
(ADR-0010's invariant ① "authority ≠ attribution", the honest-stamp contract). If ONE real Telegram send
produces TWO turns (Finding B), FF's engine sees **two independently-legitimate-looking owner acts** for
a single real-world event — the append-only Act log is poisoned with a phantom duplicate, and no
downstream invariant (①/②/seam ports) can distinguish it from two genuine owner actions, because the
duplication happens *before* the seam, at the transport layer FF doesn't control. This is why P-2 must be
closed (or at minimum, proven-absent via §4) **before** enforcement is flipped on `Act.principal`
(decision-③ in the 9-decisions sequence: `1-2-7 → 3 → 4 → 5 → 6(parallel) → 8-9`) — flipping enforcement
on top of an unverified transport-level duplication risk would make the trust invariant provably false
in production, not just theoretically incomplete.

## Verified correction 2026-08-12 — voice transcription pre-dedup window (P-2 re-elevated)

> **This section CORRECTS §2 Finding B's "narrow crash-window" framing and §4/§3-of-the-map's "no
> longer the longest pole" downgrade.** An adversarial verifier re-checked the F11 dedup against real
> `agents-manager` code (READ-ONLY) *for the VOICE path specifically* — the owner's actual documented
> symptom — and found the earlier assessment materially under-scoped. Additive per doc-tree LOSE-NOTHING:
> the §2/§3 text above is left intact; this section supersedes its "narrow / not longest pole" conclusion.

### C-1. What the earlier assessment got wrong (voice path)
Findings A/B above reasoned about the dedup as if it always runs at ingress. **For voice it does not.**
Dedup (`orchestrator.ts:79-88` `markIfNew`) runs only *after* transcription completes, so the whole
multi-minute transcription window is **un-deduped and un-acked**:
- `telegram-channel.ts:413-419` — the voice branch acks/routes, then `handleVoice`
  (`telegram-channel.ts:449-470`) calls `transcriber.transcribeFromUrl()` with
  `TRANSCRIBE_TIMEOUT_MS = 300_000` (**up to 5 MINUTES**) **BEFORE** `normalize → Orchestrator.handle →
  markIfNew`. The dedup key is written only at the *end* of that chain.
- **grammY processes updates sequentially and its polling offset `lastTriedUpdateId` is IN-MEMORY only**
  (grammy `bot.js:81,192,421`) — no persisted offset, no `@grammyjs/runner`. Telegram keeps
  **redelivering** an update until a *higher* offset is confirmed, which cannot happen until the voice
  handler's multi-minute `await` chain finishes.
- Therefore a crash/restart **anywhere in the ~5-minute voice window** → Telegram redelivers the same
  voice update → a **duplicate turn**, and the dedup key for it was **never written** (transcription
  never reached `markIfNew`). This is the exact voice dup-kill symptom the owner reports.
- **No table-level backstop:** `message.entity.ts` has **no unique constraint on `channelMessageId`** —
  nothing rejects the duplicate insert downstream either.

### C-2. Why this is orders of magnitude wider than Finding B's window
Finding B's residual gap is a **persist-microtask race**: the sliver between an in-memory mark and the
fire-and-forget `persist()` resolving — microseconds, and only *after* dedup has already run. The voice
gap is the **entire transcription window before dedup runs at all** — up to 5 minutes per voice message,
during which the process is provably crash-prone (§2 Finding C: **7 restarts in 35h**,
`ECONNRESET` / `Connection closed mid-response`). The observed live incidents fall inside *this* window,
not the microtask race. So the earlier "narrow window, largely fixed, not the longest pole" framing is
**wrong for the owner's real (voice) symptom**.

### C-3. Revised fix approach (one line, supersedes §3)
**Mark dedup AT INGRESS on the raw `update_id` / `message_id` BEFORE transcription starts** — i.e. call
`markIfNew` (durably) in the voice branch at `telegram-channel.ts:413-419`, *before* `handleVoice`'s
`transcribeFromUrl()` await, not only after normalize. Secondary backstop: **add a unique constraint on
`message.entity.ts:channelMessageId`** so a duplicate insert is rejected even if ingress dedup is
bypassed. (Finding B's await-the-persist fix from §3 is still worth doing, but it is the *smaller* of the
two gaps and does not by itself close the voice window.)

### C-4. Corrected P-2 status
**P-2 RE-ELEVATED.** This is NOT a narrow residual crash-window and P-2 is NOT merely "almost closed" —
**this IS the owner's live voice-dup symptom, and its root cause is now identified** (dedup runs
post-transcription; polling offset is in-memory; redelivery across the ~5-min window is un-deduped;
no unique constraint). Status stays **OPEN** with the exit criterion in the map's §1 P-2(b) unmet.
The earlier "no longer the longest pole" downgrade (map §3/§4, `state.md` 2026-08-12-b, PROGRESS.md) is
**corrected**: P-2 is a first-order blocker on the owner's actual symptom again. (Whether it out-ranks
isolation uid-split as *the* longest pole is left to the owner to re-weigh with this evidence; the point
here is that P-2 is materially larger than the downgrade claimed.)
