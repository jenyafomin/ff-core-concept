---
type: design
node_type: design-note
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: how to implement ingress-dedup for the voice-transcription window (P-2, gateway-dup) — before code lands in agents-manager
related:
  - ../../decisions/WORKORDER-gateway-dup-P2.decision.md
  - ../../analyses/03-ingest-dedup-smell.analysis.md
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager (cross-repo target — READ ONLY from FF)
phase: DESIGN — how-to only. NO code, NO commits. This repo cannot fix it; agents-manager owns the fix.
---

# HOW-TO — close the voice ingress-dedup gap (P-2, gateway-dup)

## 1. Symptom → root, with file:line

Owner sends voice → dedup is real (F11) but wired **after** transcription, not before it:

1. `telegram-channel.ts:413-419` — `mediaHandler` fires on `message:voice`/`audio`/`video_note`: it
   `await`s `ackSeen(ctx)` (a 👀 **emoji reaction only** — `telegram-channel.ts:558-563`, `ctx.react()`,
   not a Telegram `getUpdates` offset commit) then calls `handleVoice(ctx)`.
2. `handleVoice` (`telegram-channel.ts:449`) → `transcriber.transcribeFromUrl()`
   (`telegram-channel.ts:464`) with `TRANSCRIBE_TIMEOUT_MS = 300_000` (`voice-transcriber.ts:15`) —
   **up to 5 minutes**, awaited.
3. Only *after* the transcript returns does `normalizeInboundWithText` build the `IInboundMessage` and
   call `messageHandler(inbound)` → `Orchestrator.handle()` (`orchestrator.ts:78-88`), which is where the
   dedup key `${channel}:${conversationId}:${messageId}` is finally checked via
   `this.dedup.markIfNew(key)` (`orchestrator.ts:85`, `dedup-store.ts:41-56`).
4. `DedupStore.markIfNew` marks an in-memory `Set` synchronously and persists to SQLite
   (`SeenUpdate(key, seenAt)`, PK = `key`) **fire-and-forget** (`void this.persist(key)`,
   `dedup-store.ts:9-10,54`).
5. grammY's long-polling offset (`lastTriedUpdateId`) is **in-memory only**
   (`node_modules/grammy/out/bot.js:81,192,421`) — no `@grammyjs/runner`, no persisted offset. Telegram
   redelivers an update until a *higher* offset is confirmed by the next `getUpdates` call, which cannot
   happen until step 2's multi-minute `await` chain returns.

**Chain:** voice sent → 👀 reaction (not an offset ack) → up to 5 min inside `transcribeFromUrl` →
dedup key written only at the *end* → crash/restart anywhere in the 5-min window means the offset was
never advanced *and* the dedup key was never written → Telegram redelivers the same update →
`mediaHandler` fires again, transcribes again, produces a second turn. Not theoretical: `pm2 describe
agent` shows **7 restarts in 35h uptime** with `ECONNRESET` / `Connection closed mid-response` in the
logs (WORKORDER §2 Finding C). `message.entity.ts:18` (`channelMessageId: { type: String, nullable:
true }`) has **no unique index** — nothing rejects the duplicate downstream either.

## 2. Fork (brief)

`update_id` (`ctx.update.update_id`) is global per bot, needs no scoping, and is available at
`mediaHandler` entry before any parsing. `message_id` (today's key) is unique **only within a chat**
(`orchestrator.ts:79-82` comment) — hence the compound `channel:conversationId:messageId` key — and only
exists after `normalizeInboundWithText` runs, i.e. after transcription.

**Resolution: don't replace, layer.** Add `update_id` as a second, earlier dedup checkpoint in the voice
branch only; leave `orchestrator.ts:79-88`'s `message_id`-keyed check untouched (still protects text and
any post-transcription race). Storage: reuse `SeenUpdateEntity` (`seen-update.entity.ts`, PK = `key`,
upsert via `SeenUpdateRepo.record()`) rather than a new table — it already survives restarts (F11).

For the unique-constraint backstop (§3 step 4): `channelMessageId` alone is **not** globally unique
(same chat-scoping issue) — the constraint must be composite, e.g. `(sessionKey, channelMessageId)`,
mirroring `message.repo.ts:20-21`'s `append()`.

## 3. How to implement — work order for agents-manager (no code here)

1. **Pre-transcription latch, awaited, before `ackSeen`/`handleVoice`.** In `mediaHandler`
   (`telegram-channel.ts:413-419`), before the existing two lines: read `ctx.update.update_id`, build a
   key (e.g. `voice:${botId}:${update_id}`), and call `SeenUpdateRepo.record()` **awaited** — not
   `DedupStore.markIfNew`'s fire-and-forget pattern. Check-then-record: if the key already exists (add a
   `has()`/`exists()` read, or reuse `listRecent`), return immediately — skip `ackSeen`/`handleVoice`
   entirely, no second transcription starts. The `await` is the point: the bug is that today's mark isn't
   durable before the long operation begins, so the new latch must be durable *first*.
2. **Don't reuse `DedupStore`'s in-memory `Set`** — hydrated once at process start (`load()`), so it
   would still race on the *next* message after a crash-restart. Hit `SeenUpdateRepo` directly.
3. **Leave `Orchestrator.handle()` (`orchestrator.ts:78-88`) and `DedupStore` unchanged.** Two
   independent layers: raw-`update_id` latch at ingress (voice/audio/video_note only, pre-transcribe) +
   `message_id`-compound dedup at Orchestrator (all channels, post-normalize). Neither supersedes the
   other.
4. **Add a composite unique index to `MessageEntity`** (`message.entity.ts`) on `(sessionKey,
   channelMessageId)` (verify the always-populated field against `message.repo.ts:20-21`'s `append()`).
   Backstop from WORKORDER §3(b)/C-3: even if step 1 is bypassed or buggy, a second insert for the same
   Telegram message is rejected before a second `Job` reaches the queue.
5. **Test per WORKORDER §4.2 pattern**: extend `dedup-store.spec.ts` or add a `telegram-channel` test —
   mark the pre-transcription key, then before `transcribeFromUrl` resolves, simulate a fresh process
   (new `SeenUpdateRepo` over the same DB), re-check the key — assert it blocks the redelivery (must fail
   pre-fix, pass post-fix).

## 4. Verification

- **Direct repro (dev bot only):** send a voice message; the instant `mediaHandler` logs ingestion
  (before transcript returns), `kill -9` the pm2-managed process; restart; confirm via Telegram that the
  same voice does **not** trigger a second turn — no second 👀 reaction, no second `▶️ job …`
  (`orchestrator.ts:103`) line for the same conversation, no second `messages` row with the same
  `channelMessageId`.
- **Deterministic unit repro:** per §3 step 5 — cheap, no process kill needed.
- **Regression gate:** `pnpm verify` stays green in `agents-manager`; the new test must fail pre-fix,
  pass post-fix (WORKORDER §4.4).
- **Production monitor (no code):** after a live pm2 restart, grep logs for two `▶️ job …` lines with the
  same `messageId` in one conversation (WORKORDER §4.3) — should no longer occur once shipped.

## 5. Boundaries

FF is **read-only** on `agents-manager` — the fix (§3) lands there, by the owner or a separate session
scoped to that repo, on explicit go-ahead. This document changes nothing on disk in either repo. Full
context: `../../decisions/WORKORDER-gateway-dup-P2.decision.md` (§"Verified correction 2026-08-12" is
the section this note operationalizes). Note: `../../analyses/03-ingest-dedup-smell.analysis.md` was
named as background in the source task but its content (ga-rentacar `ingest-rentacar` vs
`rental-balance` package layering) is **unrelated** to gateway Telegram dedup — listed for traceability
only, not used above.
