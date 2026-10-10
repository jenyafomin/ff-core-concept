# Critic: SPEC-brain-r1-prompt-layers (2026-10-09)

Verdict: GO-AFTER-PATCH

## BLOCKER
1. **Self-escalation hole is real and pre-existing.** `initiative` is client-asserted (`validate-act.ts:440-441`, `req.initiative`); any main-credential holder, including the agent, gets `active` and `proposed->active`. It affects ALL types, not only `sys:`. R-04 checks principal AND initiative, but the main credential resolves to the owner principal (`access.ts:52`), so the agent passes. Patch R-04: "For `sys:*` types the server ignores `req.initiative` and derives status from the credential. Only the gateway mandate or `sys:brain` may produce `active` or approve `proposed`. Main/chat reader + `sys:*` => always `proposed`; promote => FORBIDDEN." Also file the generic hole (initiative must come from credential) as a door in SPEC-brain-data-doors; fix regardless of R1.
2. **AC-R05 byte equality is false as designed.** `validate-act.ts:261` runs `normalizeDateTimes` on every string in fields (`pii-scope.ts:25`), so a body with dates/times is mutated; PII scan also runs on body. Shadow diff is non-zero on day 1. Patch: "`body` is exempt from datetime normalization (field flag `verbatim: true`); the importer verifies round-trip hash and leaves non-round-tripping files file-only with a report." Add a fixture with ISO dates and a 13-digit id.
3. **Rank rule ambiguous; ties fall to random id.** "Старший вид" undefined. Chat {bot,chat} vs topic {bot,chat,topic} must give chat then topic (`conversation-config.ts:116-118`). Patch: "rank = MAX index in `order` among targets; ties: `priority` asc, then `created_at`, then id. Importer: chat priority 0, topic priority 1." Add AC for chat+topic order equals today's join.
4. **Topic key collides across chats.** Patch R-10/R-08: `topic.key = "<chatId>:<threadId>"`. Add AC: a topic layer of chat A never matches chat B.

## MAJOR
- Fallback precedence is inconsistent: R-07 brain->LKG->files, but R-11 brain-mode `/prompt` writes both while brain is down => LKG is silently stale. Add: "LKG used only if its hash equals the last file-hash seen; otherwise files win", and log timeouts separately from diffs. 150 ms includes a cold socket; expect first-call misses after brain restart.
- `max_bytes` generic: a door only if paired with a per-act aggregate cap (e.g. 64 KB). Exempting such fields from the 8 KB budget while the request cap is 256 KB allows ~8 x 32 KB per act. Without the aggregate it is a trap. Keep generic, schema-author-only.
- Slice over-built for a fast first result. Minimal: 3 types + seed + `/v1/lens` + `IPromptSource` + importer + shadow. Move R-11, R-12, R-13 to R1.1; shadow already proves value and the gate.
- Confirm `opaque: true` actually bypasses the digit-run (>=9) scan for Telegram ids (`-1004351636302`, `1112667160`); add AC. Real prompts contain no such ids today (grep: 0), but future ones may.
- Topic layer must never match chat-only context; no AC covers it.

## MINOR
- Shadow log: add first-diff byte offset, not only hashes.
- `prompt-turn` log must not carry body text.
- Manifest `rev` read must be atomic with body read.
- Footer (`buildFooter`) stays outside the lens; say so.
- Same-uid mandate token: accepted ISO-2 risk, fine.

## Checked, looks solid
AND-semantics for bot/chat/topic; flag default `local`; empty-body skip equals `:116`; importer idempotency via source hash; sequencing behind doors 1+2.
