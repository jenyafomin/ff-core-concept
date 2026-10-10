# Critic: F6 "gateway dedup/lease never in memory"

- **Status:** draft
- **Owner:** jenya.stasik@gmail.com
- **Date:** 2026-10-09
- **Потребитель:** F6 synthesis
- **Поглощает:** —
- **Related:** ADR-0017 F6; `~/.claude/rules/compound-engineering.md`; gateway `src/core/repositories/{seen-update,process-lease}-repo.interface.ts`

Fact check: the FF doc `docs/01-organization/process/gateway-dup-message-bug.md` does not exist at that path (not found under Apps). In the gateway, "lease" is NOT a Telegram poller lock: `IProcessLeaseRepo` is a registry of child `claude` PIDs for orphan-kill on start. `ISeenUpdateRepo` already is "durable record + in-memory DedupStore hydrated at start (listRecent)". The gateway already implements the frame "record durable, check local".

## 1. Steelman the owner
- "Never" was a one-way door set by fear, not evidence. Compound test: a permanent carve-out means a second store, backup, schema and lens-less island forever; every later feature (cross-topic view, audit, "what did I answer yesterday") pays that tax.
- One-memory vision: a gateway whose truth sits in its own SQLite is the "files beside the project" pattern the owner already rejected on 2026-10-08.
- F6's reason ("outage = Telegram silent") argues for a cache and fallback, not for a different owner of truth. It conflates truth location with the hot path.

## 2. Attack the owner's path
- Dedup: Telegram re-delivers on restart/offset loss. If the check needs a brain round-trip and brain is down or slow: fail-open = duplicate agent runs, double billing, double replies (the known dup bug kills background agents); fail-closed = silence. Both are what F6 feared. Plus a TOCTOU race: two near-simultaneous checks both read "unseen" unless the write is brain-side CAS.
- Lease (PID registry): exists to kill orphans after a crash. If stored only in brain, after a brain+gateway reboot you cannot read what to kill; orphans survive and double-run. Must be written before spawn, readable with no network.
- Poller exclusivity (not a "lease" in code today): two pollers give 409 Conflict from getUpdates or split-brain replies. A brain-arbitrated lock is unavailable exactly when brain dies; a TTL lease without fencing token lets a stalled-but-alive old process and a new one both believe they own it.
- 3am outage: "switch branch / rebuild" is a human action with minutes-to-hours latency, needs a shell, and swaps code under a live process (violates git-working-tree-safety). A fallback that requires the person it protects is not a fallback. Bootstrap circularity: brain endpoint, token, and prompts live in what is being moved.
- Prompt layers via lens:
  - Needed before agent start: lens failure means an agent with no system prompt; must never run silently with an empty or partial cascade.
  - Self-escalation: the agent can write memory, so it can edit its own chat/topic/project layer, persistently and cross-session. Needs write-ACL per layer (agent read-only on system/project layers; changes via proposal + owner approval).
  - Lens nondeterminism: composition may change between turns; pin a versioned snapshot id and log its hash per turn.
  - V7: per-user layers are data about a referent; reading in another user's chat leaks; use_consent vs read_consent must be checked at lens time, and engine enforcement is not wired yet (form only).

## 3. Minimal mechanisms that make the owner right
1. Local write-ahead log in the gateway: dedup keys and leases written locally first (fsync), replicated to brain asynchronously. Local is the check; brain is the record.
2. Automatic last-known-good snapshot of the resolved prompt cascade (with version id); gateway starts from it if brain is unreachable.
3. Brain-side CAS (insert-if-absent with fencing token) for poller ownership; local pid-file as fast path.
4. Kill-switch: one flag (e.g. BRAIN_TRUTH=off) reverting to local-only store, flippable by script or Telegram command, exercised on a schedule.
5. Circuit breaker policy: never block reply on brain; fail-open for dedup only after local WAL says unseen.
6. Idempotent reconcile: replay WAL into brain on recovery, keyed.
7. Layer write-ACL plus per-turn logged prompt hash.

## 4. Keep as local cache of memory-owned truth
Local hot copy: seen_updates key set (FIFO, as today), process leases/PIDs (local by physics), poller ownership token, resolved prompt snapshot, bot token + brain endpoint (bootstrap). Memory-owned truth: prompt layers, conversation bindings, per-topic config, dedup history for audit.

## Classification
- CRITICAL: replace "never" with "truth in memory, check local; WAL + snapshot + kill-switch required before cutover".
- CONCERN: layer write-ACL and V7 gate before per-user layers.
- PROVOCATION: "dedup in memory" is mostly meaningless; "record in memory, check local" is already how the gateway works.
- NOTED: stale doc path for the dup-bug note.

Итог: решение — "never" снять; заменить на "memory = truth, gateway = hot copy" с условиями 1-7; начинать с промпт-слоёв (read-only, snapshot), дедуп/лиз последними.
