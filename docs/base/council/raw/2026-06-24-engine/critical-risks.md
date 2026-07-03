---
title: Adversarial Critique — Engine CRITICAL Risks (for ADR-0004 candidate)
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Related: ADR-0002-thin-passport.md, SYNTHESIS-2026-06-23-engine-spec.md, SYNTHESIS-2026-06-23-valve-rules.md, SYNTHESIS-2026-06-23-version-edges-stream.md
---

# Adversarial Critique — Engine CRITICAL Risks

Lens: Critic (adversarial stress-test). Phase = DESIGN, no code.
This document stress-tests the three named CRITICALs from the 2026-06-23 design series
and attacks five additional risk vectors. Each finding is ranked, assigned severity,
and classified as Invariant-candidate or ADR decision.

---

## Ranking Summary (highest to lowest severity)

| Rank | Risk | Severity | Resolution path |
|------|------|----------|-----------------|
| 1 | Files-vs-SQLite: multi-file write half-failure | CRITICAL | ADR-0004 decision |
| 2 | Valve boundary: agent-provided vs engine-computed scope | CRITICAL | ADR-0004 + Invariant |
| 3 | Cold-start safety window | CRITICAL | Invariant + engine-spec |
| 4 | frozen-binding launders stale epistemic through valve | CRITICAL | ADR-0003 + Invariant |
| 5 | Vector/FTS index staleness causes valve/epistemic checks to read stale data | CONCERN | ADR-0004 |
| 6 | seq collision from parallel sources | CONCERN | engine-spec Invariant |
| 7 | Rollup correctness under concurrent writes | CONCERN | ADR-0004 |
| 8 | Sensitive-node embedding to cloud vector store | CONCERN | ADR-0003 + engine-spec |

---

## CRITICAL 1 — Transactionality: md files are not atomic (files-vs-SQLite verdict)

### Failure scenario

A single logical write in the graph (e.g., re-home a node) touches AT MINIMUM:
- the node's `.md` frontmatter (`home` edge reference)
- the old parent's section-index rollup
- the new parent's section-index rollup
- backlink-index entries (two deltas)
- a trace-node file (audit log for valve)

That is five file writes. A crash, OS kill, or disk-full between write 2 and write 5 leaves
the graph in a state where: the node claims a new home, but the old parent's section-index
still counts it, the new parent's section-index does not, and the trace is missing.
The engine rebuilds an index from CORRUPT SOURCE FILES, not from a separate log.
No retry logic can reconstruct what the intent was, because the intent was never recorded atomically.

### Severity: CRITICAL — data corruption, undetectable without full graph scan

The corruption is silent. The engine's rebuild produces a consistent-looking index from
inconsistent files. The valve may read a stale backlink-index and miss a sensitivity edge,
permitting a disclosure it should have blocked. This is not a performance issue — it is a
correctness issue with a security dimension.

### Both sides of the argument (required — this is the deepest tension)

**Case A: Keep files = source of truth, add WAL/journal/lockfile**

Mechanism: before any multi-file write, the engine serializes the INTENT to a journal file
(`/.ff/journal/tx-<ulid>.json`). Each file write is idempotent and content-addressed.
On startup, the engine checks for incomplete journal entries and either completes or rolls back.

Strengths:
- Preserves "clone the repo, it works" property. Git works on the files directly. Humans can read the graph.
- No new runtime dependency. No SQLite binary needed in CI or edge environments.
- Journal itself is a file — can be committed. Audit trail is in the repo.

Weaknesses:
- Journal protocol is COMPLEX to implement correctly. The engine must: write journal first (durable),
  then apply, then mark complete — three phases. Getting this wrong is exactly as bad as the
  original bug. "Simple WAL" is not simple.
- Concurrent writers (two agent processes, human + agent) need a lockfile or flock(2) to
  serialize the journal. On NFS/cloud-synced drives (iCloud, Dropbox) — flock is unreliable.
  Owner uses a Mac — iCloud Documents sync is a real risk vector.
- Journal adds latency proportional to fsync. At 10 writes/second, this may be acceptable.
  At stream-class ingestion (1000 commits in a batch) — not acceptable without batching.
- The journal itself can be corrupted or left stale by a bad implementation.

**Case B: SQLite for thin/relational data; md for body (recommended)**

Mechanism: the thin passport + edges + index + rollup live in SQLite (single file,
WAL mode, ACID). The node body (`payload`, markdown prose) lives in `.md` files as
a human-readable archive. SQLite IS the source of truth for structure; `.md` body files
are a read cache and authoring surface. On startup, the engine syncs `.md` frontmatter
changes INTO SQLite (for manual edits made outside the engine).

Strengths:
- ACID transactions. Multi-file-write is a single SQLite transaction. Half-failure = rollback.
- Backlink-index, section-index, rollups = SQL queries. Correct by construction.
- Concurrent writes = SQLite WAL mode handles readers+one-writer without application-level locks.
- Cold-start: SQLite persists across restarts. Rebuild is not O(E) of file scans — it is a
  startup check (sync `.md` changes → SQLite). Dramatically reduces cold-start window (CRITICAL 3).
- Git can still track the SQLite file (binary, but diffable via sqlite3 CLI). Or: export
  to `.md` on commit via a git hook — preserving the "repo is readable" property.

Weaknesses:
- OVERRIDES "files = source of truth" (ADR-0001, partially superseded, and ADR-0002 §4.1).
  This is an architectural U-turn. Not a technicality — a principle change. Requires explicit
  owner decision.
- SQLite adds a runtime dependency. Agents that write files directly bypass the engine — now
  they bypass correctness guarantees, not just policy.
- If SQLite is the truth, the human editing `.md` files directly creates a sync conflict.
  The engine must define what wins: SQLite (engine-truth) or `.md` (file-truth). You cannot
  have both without a sync protocol.
- "Files = source of truth" was chosen to make the graph inspectable, git-diffable, and
  dependency-free. SQLite partially undermines all three.

### Recommendation

**Variant B (SQLite) for structural data, with a strict "md body = read cache" policy.**

Rationale: the WAL-over-files approach requires implementing a correct distributed-log protocol
on top of a filesystem that was not designed for it, on a platform (Mac + possible cloud sync)
where file locking is unreliable. The cost of getting WAL wrong is identical to the original bug.
SQLite in WAL mode is a proven, embedded, zero-server transaction engine that solves exactly this
problem. The principle "files = source of truth" can be preserved for BODIES (prose, payload) while
SQLite owns the STRUCTURE (passport fields, edges, index, rollup). This is not a betrayal of the
principle — it is a precision refinement: "files = source of truth for CONTENT; engine = source of
truth for STRUCTURE."

### What this requires from the owner

Decision: accept that the thin passport + edges live in SQLite, not in `.md` frontmatter.
Define what "source of truth" means after this: SQLite-wins-on-conflict or md-wins-on-conflict
(cannot be both; recommended: SQLite wins, md is a derived view for human reading and git history).

### Classification

CRITICAL — must address before any "строй."
This is an ADR-0004 decision, not an invariant. The choice (A or B) changes the nature of
every other engine guarantee.

---

## CRITICAL 2 — Valve boundary: does the engine compute the action scope, or trust the agent?

### Failure scenario

The ADR-0002 valve definition (v1): "only directly involved nodes." Who computes "directly
involved"? Two models:

**Model X (agent-provided list):** the agent sends `{action: requestExternalAction, nodes: [id1, id2]}`.
The engine checks policy only against id1, id2. An adversarial or buggy agent omits the
sensitive node that MOTIVATES the action (e.g., a health metric that informed a calendar event).
The valve checks the calendar node (sensitivity=internal, allowed) but never sees the health node
(sensitivity=private, would have triggered ask). Disclosure happens. The valve was "working"
the whole time.

This is not a theoretical attack. Any agent that builds a "summary" and sends it externally
will naturally not include all the source nodes in its action context — it summarized them away.
The valve has no way to know what the agent READ before acting, only what it DECLARED.

**Model Y (engine-computed scope):** the engine computes which nodes the agent read/accessed
in this session turn before issuing the action. The engine maintains a READ TRACE per turn.
The valve checks the union of (declared nodes ∪ read-trace nodes).

### Severity: CRITICAL — the entire valve concept is meaningless if the scope is agent-provided

If the valve trusts the agent's declared scope, then the security guarantee is:
"the agent correctly tells us what it touched, and we check those things."
This is not a security guarantee. It is a disclosure-only-if-honest policy.

The SYNTHESIS-engine-spec OQ-2 correctly flags this as "protection against ERRORS vs protection
against ADVERSARIAL AGENT." But the current framing (ADR-0002 v1 = "prямо задействованные") does
not resolve WHICH model is used. It names the concept but not the mechanism.

### Failure during index REBUILD / cold-start

During rebuild, the engine is ingesting files to reconstruct the backlink-index and rollup.
At the same time, an agent may start and issue a `requestExternalAction`. The engine has a
PARTIAL index. The valve executes against an incomplete view:
- Backlink from health-node to calendar-node is not yet loaded.
- The engine checks the calendar-node: sensitivity=internal, allowed.
- The health metric edge is missing from the index. Valve passes.
- Sensitive data leaks through an action that was, from the valve's perspective, clean.

This is the cold-start/rebuild window described in CRITICAL 3, but from the valve's specific angle:
EVEN IF the agent declares all nodes, the engine cannot check what it does not yet know.

### Recommended resolution

**For the scope boundary (Model X vs Y):**
- v1 (current): engine accepts declared scope from agent. Call this "error-protection mode."
  It must be LABELLED as such, not presented as security. Document the threat model explicitly.
- v1.5 (recommended for before M1): engine maintains a per-turn READ TRACE via instrumented
  graph API calls. Any node read through the engine API is added to the trace automatically.
  Valve checks declared ∪ trace. This works if and only if the agent accesses the graph
  exclusively through the engine API (not by reading `.md` files directly).
- v2 (ADR-0003): full ABAC with trust-horizon.

**Invariant to record NOW (regardless of v1/v1.5/v2 path):**
> The engine NEVER trusts the agent's declared scope as the complete set of involved nodes
> for enforcement purposes. At minimum, the engine adds all nodes read via the graph API
> in the current turn to the enforcement scope. Direct file reads (bypassing the engine API)
> are outside the enforcement boundary — this boundary must be documented explicitly.

### Classification

CRITICAL — invariant + ADR-0004 decision (which model: X or Y, and when to upgrade from X to Y).
The invariant can be written now. The model choice (and the "library vs service" question from
SYNTHESIS-valve-rules F11) belongs in ADR-0004.

---

## CRITICAL 3 — Cold-start safety: what can agents do before the index is built?

### Failure scenario

Fresh clone, post-crash, or after a large bulk-ingest: the engine starts. Before it has rebuilt:
- Backlink-index: empty (no "who points to X" queries possible)
- Section-index / rollups: empty or stale
- canonical_id / lineage resolution: not loaded

An agent starts in the same process and immediately:
- Queries for "nodes related to health" — gets empty results (false negative, silent)
- Issues `requestExternalAction` — valve checks against partial/empty index — allows an
  action it would have blocked with a full view
- Writes a new node — the section-index is not updated (engine has not loaded the parent yet)
  — the write "succeeds" but the rollup is wrong

The cold-start window is O(E) file reads, which on a GitHub-scale graph (STATE: ~300 nodes is
the trigger, but a project with 10k commit-nodes, 500 file-nodes, 2000 message-nodes = ~13k E)
could be 10-30 seconds on commodity hardware. During those 30 seconds the system is operating
without its primary safety mechanism.

### Severity: CRITICAL — safety guarantee disappears at the exact moment of most risk (startup/crash-recovery)

A post-crash restart is precisely when the system is most likely to be in a dirty state, and
precisely when an agent (auto-restarted by a process supervisor) is most likely to immediately
act. The safety gap and the highest-risk moment coincide.

### Recommended resolution: SAFE-DEGRADED MODE (Invariant)

Define a formal "safe-degraded" state that the engine enters on startup and exits only when
the index is complete. In safe-degraded mode:

1. **All write operations are BLOCKED** (including trace writes — they queue).
   Rationale: a write against a partial index may create referential inconsistency.
2. **All read operations return with a `{degraded: true, index_completeness: 0.0..1.0}` flag.**
   Agents MUST surface this flag. A query result with `degraded: true` MUST NOT be used as
   the basis for an external action.
3. **All `requestExternalAction` and `requestPromotion` calls are REJECTED with an explicit error.**
   The agent may queue them; they are re-evaluated after the index is ready.
4. **Bootstrap-seed policies are loaded FIRST**, before any other node, so the valve has its
   constitutional minimum even at t=0.

The safe-degraded mode can be bypassed ONLY by explicit owner configuration
(`engine.startup_mode: permissive`) — never by agent request. The bypass must be logged.

**If SQLite is chosen (CRITICAL 1 recommendation):** cold-start window shrinks dramatically.
SQLite WAL is durable; the index survives restarts. Safe-degraded mode becomes a brief
consistency-check pass, not a full rebuild. This is a major argument FOR the SQLite path.

### Classification

CRITICAL — Invariant (safe-degraded mode definition) + ADR-0004 (how the startup sequence
is ordered: bootstrap-seed → index-sync → ready).
The invariant text can be drafted now. The startup sequence belongs in ADR-0004.

---

## CRITICAL 4 — frozen-binding bypasses the valve via stale epistemic

*(This was named in SYNTHESIS-version-edges-stream CRITICAL-3. Included here because it
belongs in the same engine-level threat model as the other CRITICALs.)*

### Failure scenario

Node A (`sensitivity=private, epistemic=fact`) is the source of a `binds:frozen` edge to node B.
Agent X froze the binding when A was fact. Later: A is discovered to be incorrect and demoted to
`epistemic=hypothesis`. Or A is deleted and marked `archived`. Or A's `sensitivity` is upgraded
to `sensitive` after a reclassification.

Node B still carries the frozen value. The valve checks node B for the action: B's own passport
says `sensitivity=internal`, `epistemic=fact` (inherited or overridden). The valve does not re-check
A's CURRENT state — it checks the snapshot at freeze-time. The valve PASSES. An action proceeds
based on stale, potentially misleading data presented as fact.

### Severity: CRITICAL — silent corruption of epistemic state; valve passes on false premises

The valve's core guarantee is "agent does not act on untrustworthy data externally without ask."
frozen-binding defeats this guarantee for data that was once trustworthy and later became not.

### Recommended resolution (from SYNTHESIS-version-edges-stream: options a+c)

(a) The valve, upon encountering a `frozen`-binding edge, ALWAYS dereferences to the source
    and checks the source's CURRENT `epistemic` + `sensitivity`. If source has changed since
    freeze, the valve applies the STRICTER of (source-current, consumer-declared).

(c) `binds:frozen` is PROHIBITED for nodes with `sensitivity > internal` without
    a `revalidation_required` flag and a revalidation timestamp. The engine rejects the frozen-
    binding write if this constraint is violated.

**Recommended: (a) + (c) together.** (c) prevents the situation from arising for sensitive nodes;
(a) is a defense-in-depth fallback for cases that pass (c) initially and degrade later.

### Classification

CRITICAL — Invariant (engine enforcement rule) + ADR-0003 (the full model of binding semantics).
The invariant text can be drafted now. Full binding protocol belongs in ADR-0003.

---

## Additional Attack: Vector/FTS index staleness

### Failure scenario

The engine maintains a vector or FTS index for semantic search and epistemic queries.
An agent writes a new node with `sensitivity=private, epistemic=hypothesis`. The index
has not yet ingested this node (async ingest lag, typically 0.1–2s depending on implementation).

Another agent issues a semantic query: "find nodes about the user's health." The query
hits the FTS/vector index. The new node is not there — false negative. The query returns
zero health-related results. The agent concludes "no health data exists" and proceeds with
an external action that it would NOT have taken if it had seen the node.

Alternatively: an old node (now `archived`, `epistemic=rejected`) is still in the vector index.
The agent retrieves it, treats it as current, acts on it.

### Severity: CONCERN — correctness failure with security implications for valve checks

This is not a primary security failure (the valve still runs on the nodes the agent declares).
But it undermines the COMPLETENESS of the agent's declared scope: the agent cannot declare
a node it never found because the index was stale.

### Recommended resolution

1. The engine MUST NOT use vector/FTS results as the SOLE basis for valve enforcement.
   Valve scope must include the primary-key graph query results, which are always current.
2. Vector/FTS results MUST carry a `{stale: bool, indexed_at: timestamp}` annotation.
   Agents MUST NOT use stale results as the basis for `requestExternalAction`.
3. On node write: the engine MUST synchronously update the passport-field index (sensitivity,
   epistemic, type, principal). The vector/FTS embedding may be async, but the structural
   passport fields must be synchronously queryable by the valve.
   This is a strong argument for SQLite: structural passport fields in SQLite = always current,
   no async lag. Vector/embedding = async worker, flagged stale until complete.

### Classification

CONCERN — should address. Partially resolved by SQLite choice (CRITICAL 1). Remaining
async-embedding staleness = ADR-0004 (engine startup order and sync guarantees).

---

## Additional Attack: rollup correctness under concurrent writes

### Failure scenario

Two agents run in parallel (legal in the multi-agent council model). Both write child nodes
under the same parent container simultaneously:
- Agent A: creates node X, increments parent's section-index `count` from 10 to 11.
- Agent B: creates node Y, reads parent's section-index `count` as 10, increments to 11.
- Result: section-index reports 11. Actual children: 12.

With md files, there is no atomic read-modify-write on a file without an application-level
lock. The section-index rollup is therefore incorrect after concurrent writes.
The error is silent and may not surface until a query produces wrong pagination (showing 11
children when 12 exist) or a cascade computation reads a stale rollup as authoritative.

### Severity: CONCERN — correctness failure under expected multi-agent operation

Multi-agent parallelism is not a corner case — it is the design (council model, parallel
background agents). The concurrent-write scenario is the norm, not the exception.

### Recommended resolution

- **If files = truth (WAL model):** the journal must serialize all writes to a given parent's
  rollup. This effectively means a per-parent write lock, which eliminates parallelism benefits
  for write-heavy containers (like a stream with 1000 ingested commits).
- **If SQLite (recommended):** concurrent writes to the section-index are serialized by SQLite's
  WAL mode automatically. This is a solved problem. One more argument for SQLite.
- In either case: rollups MUST be marked as derived (read-only, engine-computed).
  No agent or human directly writes a rollup value. This is already implied by the
  "derived-nodes read-only" invariant but should be explicit for rollup fields specifically.

### Classification

CONCERN — should address or accept. Mostly resolved by SQLite (CRITICAL 1). If files-truth
is chosen: a specific lock protocol for rollup writes is required in ADR-0004.

---

## Additional Attack: seq collision from parallel sources

### Failure scenario

`seq` is used for ordering edges (e.g., commits in a stream, steps in a plan). Two parallel
agents ingest commits simultaneously. Both read the current `max(seq)` for the stream: 47.
Both assign seq=48 to different commits. The engine now has two edges with `seq=48` on the
same stream. Which commit is "48"? The order is ambiguous. Queries for "commits after seq 48"
are nondeterministic.

This is exactly the sequence-number assignment problem from distributed systems, and it cannot
be solved by careful coding if two writers can read-then-write without atomicity.

### Severity: CONCERN — ordering corruption in stream-class nodes, silent

Stream ordering is a core semantic guarantee for stream-class nodes (commit history, message
sequences). Silent ambiguity in ordering is worse than an explicit error.

### Recommended resolution (from SYNTHESIS-version-edges-stream CRITICAL-2)

As already identified: seq MUST be assigned by the ENGINE, not by the author/agent.
Specifically:
- The engine is the single writer of `seq` values.
- `seq` uses a lexorank-style fractional order (not integer) to allow cheap insertion
  without rewriting all subsequent seq values.
- Uniqueness is per-anchor (not global).
- The engine rejects any write that attempts to set `seq` directly; it is a computed field.

**Invariant to record:** `seq` is engine-assigned, not author-assigned.
Any write containing a `seq` value set by the caller is rejected.

This is only safe with a single engine instance writing to a serialized store (SQLite) or with
a distributed lock for the journal-over-files approach. Another argument for SQLite.

### Classification

CONCERN — should address. Resolution requires ADR-0004 (seq assignment protocol) + Invariant.

---

## Additional Attack: sensitive-node embedding to cloud vector store

### Failure scenario

The engine implements semantic search via embeddings. It sends node content to a cloud
embedding API (e.g., OpenAI Embeddings, Voyage AI, Anthropic). A node with
`sensitivity=private` (health data, financial data, relationship notes) is sent as-is.

The embedding API receives sensitive content. Even if the API is privacy-preserving, the
content has left the device. It may be logged, cached, included in training data, or subject
to a breach at the API provider. The valve's "private → at least ask" rule was never triggered
because the embedding call is not a user-visible action — it is an internal engine operation.

### Severity: CONCERN — privacy breach via a path the valve does not monitor

The current valve model monitors agent `requestExternalAction`. Embedding calls are
engine-internal. They are invisible to the current valve specification. This is a gap.

### Recommended resolution

1. The engine MUST check `sensitivity` before any embedding API call.
   - `sensitivity ∈ {private, sensitive}`: NEVER embed to cloud. Use local embedding model only.
   - `sensitivity = internal`: embed to cloud only if the connector's capability includes
     `embed` and the owner has explicitly allowed the connector.
   - `sensitivity = public/shared`: embed freely.

2. This check is an extension of the valve to ENGINE-INTERNAL operations, not just agent actions.
   It should be formalized as a 5th enforce-point (PEP-5: `embed`) in the valve specification.

3. Corollary: the engine MUST have a local fallback embedding strategy for private nodes.
   A graph without semantic search on private data is not useful. The system design must account
   for this (local Ollama, on-device model, or keyword-only FTS for private nodes).

### Classification

CONCERN — should address before any cloud embedding integration. Invariant (sensitivity check
before embed) + ADR-0003 (connector capability model for embed operations).

---

## Verdict: Files vs SQLite

**Recommendation: SQLite for structural data (passport + edges + index + rollup).**

The three CRITICALs (transactionality, valve-during-rebuild, cold-start) are NOT independent:
they are the SAME underlying problem viewed from three angles.
That problem is: the engine needs ACID-like guarantees for structural graph operations,
and md files do not provide them.

SQLite solves all three simultaneously:
- Transactionality: ACID transactions, WAL mode, proven durability.
- Valve-during-rebuild: no rebuild needed (SQLite persists). Startup = consistency check, not reconstruct.
- Cold-start: the index is live from the first query. Safe-degraded mode reduces to a
  brief "are we synced with any manual .md edits" check.

The "files = source of truth" principle is PRESERVED for BODIES (prose, payload, human-readable
content). SQLite is the source of truth for STRUCTURE (who owns whom, what sensitivity, what edges,
what order). This is a PRECISION REFINEMENT, not a reversal.

The WAL-over-files alternative is implementable but requires building a correct distributed-log
protocol on an unreliable substrate (Mac + possible iCloud sync). The implementation risk is
comparable to the original correctness risk it aims to solve.

**The owner must decide** — this is an architectural principle change, not a technical detail.

---

## Which are Invariants vs ADR Decisions

### Record as Invariants NOW (zero-code, zero-ADR, just write them)

1. **Safe-degraded mode:** engine blocks all writes and rejects all `requestExternalAction` /
   `requestPromotion` calls until index is complete. Bootstrap-seed policies load first.
   Can be overridden by owner configuration only.

2. **Valve scope = engine-computed read-trace ∪ agent-declared:** the engine tracks all
   nodes accessed via the graph API in the current turn. The valve checks the union.
   Direct file reads bypass enforcement — this boundary is documented, not silently assumed safe.

3. **seq is engine-assigned:** any write containing a `seq` value set by the caller is rejected.
   seq uses fractional ordering (lexorank or equivalent), uniqueness is per-anchor.

4. **frozen-binding check:** the valve ALWAYS dereferences `frozen`-binding edges to the source
   and applies the STRICTER of (source-current, consumer-declared) epistemic+sensitivity.
   `binds:frozen` on nodes with `sensitivity > internal` requires `revalidation_policy` node.

5. **Sensitivity check before embed:** the engine NEVER sends a node with `sensitivity ∈
   {private, sensitive}` to a cloud embedding API. Local model required for private nodes.

6. **Rollup fields are engine-computed only:** no agent or human directly writes a rollup field
   (section-index count, backlink count, etc.). Writes to rollup fields are rejected.

### Require ADR-0004 decisions (architectural choices with lasting consequences)

1. **Files-vs-SQLite verdict** — which is source of truth for structural data. Cascades into
   startup sequence, sync protocol, git integration, and the "library vs service" question.

2. **Valve scope model** — v1 (declared only, error-protection) vs v1.5 (declared + read-trace)
   and when the upgrade from v1 to v1.5 happens (before or after M1).

3. **Engine startup sequence** — formal ordering: bootstrap-seed → index-sync/rebuild → ready-signal →
   agent-permission-to-act. The safe-degraded exit condition.

4. **seq assignment protocol** — who writes seq, what type (lexorank vs integer), per-anchor
   uniqueness enforcement, hotfix-insert semantics.

5. **Rollup concurrency model** — for whichever truth-store is chosen, how concurrent writes
   to rollup fields are serialized.

6. **Engine as library vs service** — if it is a library in the agent's process, any agent can
   bypass PEP by writing files directly. If it is a service, the enforcement boundary is real.
   This is the single most important architectural question for whether "engine enforces" means
   anything at all.
