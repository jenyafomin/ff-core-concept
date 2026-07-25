---
id: act-kinds
node_type: design
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
related:
  - ./README.md                                                                                       # envelope/acts[] model this doc is a companion to
  - ../../../../00-kernel/terminology.md                                                              # act/event/trace/knowledge definitions — align, don't duplicate
  - ../../../../00-kernel/invariants.md                                                                # I-3/I-4/I-5 (acts, immutability, state=projection) + I-14 (embeddings rebuildable)
  - ../../../../00-kernel/axes-and-time.design.md                                                      # recordedAt/validFrom/validTo — which streams need valid-time
  - ../../../../../../00-states/00-global-build/realization-plan/phase-1-engine/vertical-scenario.spec.md  # step 3 (research vs agent_trace), step 8 (trace-leak, open Q5)
  - ../../../../../../_inbox/1-gpt-review/1-overview-rag-vs-system.md                                  # source of the ActKind union + "не считать read каноническим актом"
  - ../../../../../../_inbox/1-gpt-review/2-overview-direction.md                                      # source of the domain log / access audit / agent trace / telemetry split
---

# Act Kinds — шесть потоков одного конверта (retention · authority · replay)

> **PLACEMENT:** autonomous night session 2026-07-25, staged as a companion to `./README.md` (the envelope/
> `acts[]` doc) in the same `03-schema/` home — this is the same topic (what an act IS), not a new home.
> Reversible: owner may fold this into `README.md` or relocate to `00-kernel/` at the next placement pass.
> No production code, no ADR ratified — this is a design proposal grounded in the GPT review + our own
> `invariants.md`/`terminology.md`, which already name the problem but don't yet spell out the six-way split.

## Зачем этот файл

`README.md` (companion) says every node carries `acts[]` — append-only history. It does not yet say
**what kinds of act exist and why they must not share one journal**. GPT review (file 1, §"Оценка четырёх
кубиков") named the failure mode directly: if every `read` is logged as canonically as a state change, the
journal becomes a soup of business facts + access audit + agent traces + telemetry + model calls. The fix
proposed there — **one shared envelope, six separate streams** — is already referenced in `invariants.md`
(I-3 "violated when") and `terminology.md` (`act` vs `event` vs `trace`), but neither file commits to the
concrete retention/authority/replay table. This file does that, and nothing else — it does not re-derive the
envelope shape (`README.md` owns that) and does not re-derive kernel-strict primitives (`terminology.md` owns
that).

---

## §1. The six streams

```ts
type ActKind =
  | "domain_event"
  | "observation"
  | "command"
  | "access_event"
  | "agent_trace"
  | "system_telemetry";
```

All six ride the **same envelope shape** (an element of some node's `acts[]`, or of a side-journal keyed the
same way) — same `id`/`actorId`/`scopeId`/`recordedAt` skeleton (`axes-and-time.design.md` §3.3). What
differs is governance, not shape:

| `ActKind` | What it records | Changes canonical state? | Retention | Authority (who may write it) | Replay semantics | Example in our seed |
|---|---|---|---|---|---|---|
| **`domain_event`** | A business fact: creation, an assertion-change, a relation forming. The thing the graph is *about*. | **YES** — folded by the reducer into `state` (I-3/I-5) | Permanent / indefinite — it IS the truth; deleting it deletes history (tension with I-4) | Actor holding `core:write-knowledge` grant **in scope**, gated by `resolve()` write-path (I-7) | **Replayed** — `rebuild --from journal` reconstructs `state` from these, and only these | Step 1 goal create · step 2 task create · step 4 `priority:"high"` assertion |
| **`observation`** | A non-authoritative perception *about* an existing canonical thing — an agent noticing/recalling, not asserting. | **NO** — never folded into the source thing's `state` | Long but policy-prunable (memory decay is a product concern, not a kernel one — see V4-vitalnost) | Actor holding a lower-bar `core:observe`-class grant (no write-to-canon right needed) | **Not replayed into canonical state.** *May* be replayed into its own memory-projection scope if that projection type exists — but never merges upward into the observed thing's `state` | Step 6 memory-agent perceiving `task` as a memory (stub in Phase-1 per vertical-scenario) |
| **`command`** | A request/intent to change state — not yet accepted. | **NO** (until accepted; acceptance itself *emits* a `domain_event`, it does not retroactively promote the command) | Short–medium — audit window for "what was asked," including rejected requests, then archivable | Actor holding a "propose" grant (lower bar than write — validation is what upgrades a command to an act) | **Not replayed.** Read for `explain-chain` (`source → actor → command → policy decision → act → projection`, GPT test 7 / I-2), never for state rebuild | Not modeled as a discrete step in `vertical-scenario.spec.md` today — implicit in every write path's propose→validate→write pipeline; **candidate gap**, see §5 |
| **`access_event`** | Someone read/viewed something, and the resolve() verdict (allow/deny). | **NO** | Short — security/audit window (days–weeks), then rotate/aggregate | **Written by `resolve()`/the PEP itself**, not by the actor — the viewer is recorded, but cannot forge the record (engine-authority, not actor-authority) | **Not replayed** into state; consulted for audit/investigation only | Step 5 cockpit view · step 7 RAG read · **step 8 deny** · step 9 past-state view · step 10 cost view |
| **`agent_trace`** | Agent reasoning, tool calls, delegation — the "why" behind an agent's actions. | **NO** | Short / session-scoped — ephemeral, `docs/_log/`, gitignored | **Written by the agent's own runtime**, self-authority — no capability gate today (this is exactly the gap in §4) | **Not replayed** — pure observability/debug artifact | Step 3 researcher's reasoning trace · step 8's problematic reasoning dump (flagged open question) |
| **`system_telemetry`** | Latency, tokens, errors, infra cost. | **NO** | Short, rotated/aggregated into cost rollups, raw discarded after compaction | Written by runtime/infra instrumentation — **system**-actor, not a domain actor at all | **Not replayed into domain state.** Read (not replayed) by derived lenses like `cost-tree` (step 10) — reading raw records and summing is not the same operation as folding into `state` | Step 10 `cost-tree` sums per-act `cost_ref` (today riding on `domain_event.cost_ref → snapshot`, per `README.md`'s envelope example) |

**Reading the table as one sentence per column:** only `domain_event` changes what the graph *is*; everything
else changes what we *know about* what happened, without touching the graph's current truth.

---

## §2. Shared envelope, split streams

All six kinds are elements of the same underlying record shape — this is the point of a shared envelope
(GPT review file 2: "у них может быть общий envelope, но разные политики хранения и replay"). Concretely,
every act — of any kind — carries the act-level temporal block already specified in `axes-and-time.design.md`
§3.3:

```jsonc
{
  "id": "...",
  "kind": "domain_event",        // ← ActKind, this file's addition
  "actorId": "agent:ff-personal",
  "scopeId": "project-alpha",
  "recordedAt": "2026-07-03T12:00:00Z",  // system-time — required on ALL six kinds
  "validFrom": "2026-07-01",             // valid-time — see below, NOT all kinds need this
  "validTo":   "2026-07-10"
}
```

**`kind` is the field that routes everything else in §1** — which store it lands in, whether `resolve()`
gates its write, whether the reducer ever looks at it. One envelope, one field, six governance profiles. This
is the same "form decides everything, not a special table per case" discipline the vertical scenario proves
for domain data (`README.md` Уровень 6, R-6) — it applies equally to acts themselves.

**Which kinds need valid-time (`validFrom`/`validTo`), not just system-time (`recordedAt`)?**

`axes-and-time.design.md` §5 Q1 already asks this at the type level ("`meta:type` объявляет `temporal: uni |
bi`") — this section answers it specifically for `ActKind`:

| `ActKind` | Valid-time relevant? | Why |
|---|---|---|
| `domain_event` | **Yes, bi-temporal-capable** | A business fact can be asserted now about a period ("assigned 1–10 July," recorded July 3) — exactly the GPT example in `axes-and-time.design.md` §3.1 |
| `command` | **Maybe, opt-in** | A request can target a future effective date; but this is closer to a `domain_event` concern once accepted, not a hard requirement on the command itself |
| `observation` | **Usually uni-temporal** | Most observations are "I noticed X now" — recordedAt suffices. A memory *could* need a separate "originally happened at" vs "recalled at," but that's exactly vertical-scenario open question #1 (projection-vs-node for step 6), not decided here |
| `access_event` | **No — uni-temporal only** | A read either happened or didn't; recordedAt IS the validity, there is no separate "valid period" for a permission check |
| `agent_trace` | **No — uni-temporal only** | Reasoning is a point-in-session event; no real-world validity period to distinguish from record time |
| `system_telemetry` | **No — uni-temporal only** | Same as above — a latency/cost sample's meaning ends at the instant it's recorded |

**Rule of thumb:** bi-temporality is a `domain_event` (and cautiously `command`) concern. The three
non-canonical write streams (`access_event`, `agent_trace`, `system_telemetry`) are inherently uni-temporal —
they describe *the moment the record was made*, full stop. This narrows the open question in
`axes-and-time.design.md` §5 Q1 rather than reopening it.

---

## §3. Which streams rebuild state — CRITICAL

**Only `domain_event` participates in the I-3/I-5 reducer.** `command` is the *precursor* to a `domain_event`
(propose → validate → accept, at which point a `domain_event` is emitted — the command itself is never
retroactively promoted or folded). The other four kinds are append-only side-journals that are **never**
replayed into current state:

```
rebuild(state) = reduce( acts[].filter(kind == "domain_event"), initial_state )
```

`observation`, `access_event`, `agent_trace`, `system_telemetry` can all disappear tomorrow (subject to their
own retention policy) and **no canonical fact is lost** — because they never were the canon.

### Bridge to doc-tree's two-substance law

`doc-tree.md` law #1 (project `CLAUDE.md`-level, always-in-context) already draws this exact line at the
documentation layer: *trace* (append-only след, `docs/_log/`, gitignored, pointers only) vs *knowledge*
(тождество/дерево, переживающее сессии). `terminology.md` (`trace` / `knowledge` entries) already applies
this to acts informally. This section makes the mapping explicit and load-bearing:

| Substance (doc-tree law #1) | `ActKind`s | Where it lives | Survives a session? |
|---|---|---|---|
| **KNOWLEDGE** (истина, дерево) | `domain_event` · `observation` | Tree / DB (canon store + durable projections) | Yes — durable, addressable by `id`, referenced by other nodes |
| **TRACE** (след, pointers-only) | `access_event` · `agent_trace` · `system_telemetry` | `docs/_log/` (gitignored) or equivalent side-store | No — ephemeral by design, rotated/compacted |

**This is a genuinely different axis than "rebuilds state."** `observation` sits on the KNOWLEDGE side of
this table (durable, in the tree, addressable — e.g. a memory-agent's perception node persists and other
nodes can point at it) while sitting on the **NO** side of the rebuild-state table in §1 (it never folds into
the *observed thing's* canonical `state`). Conflating "is knowledge" with "rebuilds state" is exactly the
mistake GPT review warns against generalizing from ("не считать любой read таким же каноническим событием, как
изменение состояния") — the fix isn't a single knowledge/not-knowledge switch, it's two independent
questions: *(a) does this survive the session as addressable truth?* and *(b) does this change what the graph
currently says?* `domain_event` answers yes/yes. `observation` answers yes/no. The other four answer no/no.

---

## §4. Impact on the vertical scenario

`vertical-scenario.spec.md` already assigns an `ActKind` to every one of its 10 steps (see its own per-step
tables) — this section cross-references the two places where the split isn't cosmetic but load-bearing:

- **Step 3 (researcher adds research).** The spec already separates `domain_event` (the `research` node
  itself — canon, replayed, permanent) from `agent_trace` (the researcher's reasoning/tool calls — not
  canon, ephemeral, `docs/_log/`). Without this file's table, "one shared envelope" could be misread as "one
  shared journal" — it is explicitly not. The research note and the reasoning that produced it have different
  retention, different authority, different replay semantics, even though both are emitted by the same actor
  in the same step.

- **Step 8 (hidden field, flagship deny-field-everywhere test) — this is where the split becomes
  necessary, not just tidy.** `vertical-scenario.spec.md` §Open questions Q5 states plainly: `agent_trace` is
  a **write** stream with its own `ActKind`/retention, **not a read-path gated by `resolve()`**. The single
  PEP (I-7) closes query/graph-traversal/vector-search/prompt paths (§1's table: those are reads, always
  routed through `resolve()`) — but a dump of an agent's own reasoning is a *write*, and nothing in I-7/I-8
  forces that write to consult `resolve()`/redaction before serializing whatever the agent saw. **Splitting
  the streams by `ActKind` is precisely what makes this question askable and answerable at all.** Before the
  split, "acts" was one undifferentiated thing and this gap would have been invisible — a forbidden field
  could leak through a reasoning-trace write with no name for *why* that write bypasses the read-side
  guarantee. After the split, the gap has a name (`agent_trace` = write stream, self-authority, no PEP gate)
  and two named remediation options already recorded in the vertical-scenario doc: (1) the trace writer calls
  `resolve()`/redaction before serializing, or (2) trace becomes a projection re-gated by the same PEP on
  read. **That decision is out of scope here** (it belongs to vertical-scenario's own open-question process)
  — this file's contribution is confirming *why* the gap exists structurally: `agent_trace`'s authority row in
  §1 is "written by the agent's own runtime," full stop, with no capability check comparable to
  `core:write-knowledge`.

- **Steps 5, 7, 9, 10 (reads).** All four are `access_event` in the vertical-scenario spec — cockpit view,
  RAG read, past-state view, cost view. §1's authority row for `access_event` ("written by `resolve()` itself,
  not by the actor") is what makes these audit-safe by construction: the viewer cannot fabricate their own
  "I was allowed" record, because the engine — not the viewer — is the one writing it (when it's written at
  all; see §5, Phase-1 defers persisting this stream while still enforcing the underlying deny behavior).

---

## §5. Phase-1 scope + open questions

### What's in MVP

**`domain_event` (full) + `agent_trace` (formalized `ActKind` tag only).**

- `domain_event` is not optional — it IS the canon; without it there is no `state` to rebuild, no I-3/I-5 to
  satisfy, no vertical scenario.
- `agent_trace` needs to exist as a *named* stream in Phase-1 — not because Phase-1 builds new
  infrastructure for it (session logging into gitignored `_log/` already exists per `doc-tree.md` and the
  `session-logging` skill), but because it is the exact site of the open trace-leak question (§4, vertical-
  scenario Q5). You cannot evaluate "does the trace writer bypass `resolve()`" without `agent_trace` existing
  as a distinguishable kind in the first place.

### What defers, and why (not just "later," but the specific reasoning per stream)

- **`access_event` — behavior is NOT deferred, persistence is.** Step 8's acceptance criterion (per
  `vertical-scenario.spec.md` §Acceptance) is a synchronous CLI call: `ff-engine resolve <field> --viewer
  agent:crm --node <task-id>` → expects `deny` in the command's own output. The gate (I-7/I-8/I-9) has to
  work regardless. What Phase-1 does *not* need is a durable, queryable audit log of every read — that's an
  operational nice-to-have (§1's "short retention, security audit window"), not a Phase-1 correctness
  requirement. Deferring the stream ≠ deferring the guarantee.
- **`observation` — deferred, matches the existing stub.** Step 6 (memory-agent) is already marked
  `STUB` in `vertical-scenario.spec.md` §What is stubbed, and its own open question #1 ("projection or
  node?") is unresolved. Building a governed `observation` stream ahead of that decision would bake in an
  answer prematurely.
- **`command` — deferred, and arguably a gap in the vertical scenario itself.** None of the 10 steps
  models a *rejected* proposal or a pending-not-yet-accepted request as its own persisted artifact — every
  step's write is modeled as directly emitting (or being denied) a `domain_event`. If "propose → validate →
  write" (GPT's own pipeline language) is meant to leave a trace of what was *proposed but not accepted*,
  that's currently invisible in the spec. Flagged here, not resolved here — see open questions below.
- **`system_telemetry` — deferred as its own stream.** Cost accounting today rides on `domain_event.cost_ref`
  pointing at a `snapshot` node (`README.md`'s own envelope example already shows this), which is sufficient
  for step 10's `cost-tree` lens. A dedicated `system_telemetry` stream (latency/errors/infra-level metrics
  beyond cost) is real but not required to pass the vertical scenario.

### Open questions for the owner

1. **Does `command` need to exist as a distinct persisted `ActKind` in Phase-1, or is "propose → validate →
   write" fully satisfied by resolve() gating the write path inline (reject = nothing persisted, accept =
   `domain_event` persisted)?** If rejected proposals should leave an audit trail (e.g. "agent X tried to
   raise priority and was denied by policy Y"), that's a `command`-stream requirement this file currently
   defers without a spec step to anchor it to — worth adding as an 11th vertical-scenario step, or explicitly
   declaring out of scope for Phase-1 the way plugin-upgrade (kernel test 6) already is.

2. **Trace-leak remediation (vertical-scenario Q5): pick option (1) writer-calls-resolve()-before-serialize,
   or option (2) trace-as-projection-gated-on-read — and does that decision belong in this act-kinds doc, a
   future ADR, or stays as a vertical-scenario open question until Phase-1 code forces the choice?** This
   file only confirms *why* the gap exists (agent_trace = write stream, self-authority, no PEP gate); it does
   not resolve which remediation to build. Leaving both this file and vertical-scenario.spec.md pointing at
   an unresolved Q5 risks the two docs drifting on who owns the decision.
