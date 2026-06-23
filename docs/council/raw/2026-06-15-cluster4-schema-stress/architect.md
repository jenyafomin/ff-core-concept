# Cluster 4 stress-test — ADR-0001 node schema (raw architect output)

- **Date:** 2026-06-15
- **Lens:** system-architect
- **Under test:** `docs/architecture/ADR/ADR-0001-node-schema.md` (v2, status proposed)
- **Scope:** CLUSTER 4 — Agents / Memory / Chats / Teams / Models (0 clean ✅ last round)
- **Method:** represent each scenario as node(s) with ADR-0001 fields; verdict + the exact field/rule that strains or breaks. No app code.

Field set under test: `id · type · schema · title · description · created/updated/occurred · valid_from/valid_until/supersedes · home(exactly one) · epistemic(proposal|fact|hypothesis|archived) · state · stage · links[{to,rel,href}] · importance · actor · source · <typeBlock> · tags`.

Two facts taken from the ADR body that decide most verdicts:
- **`home` is exactly ONE node-id AND is the sole source of cascade** — §Принципы 5 ("Один логический дом"), §schema comment on `home` ("источник каскада контекста+важности"), and Альтернативы reject "Мульти-родитель с каскадом" as "недетерминированная важность/контекст". So context cascades from `home` only; `links` carry no cascade.
- **No instance axis, no reply axis, no membership-edge home, no archived-exclusion rule.** The schema has `supersedes` (one prior id) and `epistemic:archived` but no rule that `archived` is excluded from hot queries, and no `inReplyTo`/`thread` field.

---

## Scenario 1 — Agent MEMORY item vs plain note

**Nodes**
- memory item: `type: memory.fact`, `schema: memory.fact@1`, `description:"user prefers council deliberation"`, `actor: agent:<id>`, `epistemic: fact`, `valid_from`, `home: <agent-id | chat-id>`, `typeBlock memory:{subject, predicate, confidence}`.
- plain note: `type: note`, `actor: user`, `epistemic: fact`, `home: <topic>`.

**What distinguishes them in ADR-0001:** only `type` string + `actor`. That is the whole answer — there is no first-class "memory" axis. A memory item *is* a note with `actor:agent`.

**Verdict ⚠️.** Holds structurally but the distinction is purely conventional (`type` + `actor`). The schema cannot answer "give me agent X's memory" as a typed query — it is a string match on `type` prefix + `actor`. No `confidence`, no `subject/predicate` unless smuggled into `<typeBlock>`. **Strains:** `type` (open string, no memory contract) and **absence of a retrieval contract** — "memory" is not a queryable axis, only a naming convention.

---

## Scenario 2 — Changing fact ("user now prefers X") — temporal supersession

**Nodes**
- old: `id:A`, `valid_from:2026-01`, `valid_until:2026-06-15`, `epistemic:fact`.
- new: `id:B`, `valid_from:2026-06-15`, `valid_until:null`, `supersedes:A`, `epistemic:fact`.

**Verdict ✅ (the one near-clean cell).** `valid_from/valid_until/supersedes` are exactly the bitemporal trio needed; the schema comment even says "битемпоральность: интервал истинности". "Give me only current" = `valid_until==null`.

**Residual ⚠️ — the strain:** (a) `supersedes` is a **scalar field, not in `links`** — so a fact superseded by two merged facts, or a fact that supersedes two, has nowhere to go (one-to-one only). (b) Closing `A.valid_until` is a **write to an existing node** — but the ADR flow says "файлы=истина" and node B's creation does not mechanically touch A. Nothing in the engine boundary closes the predecessor's interval; `supersedes:A` on B does not set `A.valid_until`. So "current only" works *only if* the writer remembers to close A. **Breaks rule:** no engine-enforced interval-closing on supersede; `supersedes` cardinality = 1.

---

## Scenario 3 — Multi-agent chat (5 agents, one topic)

**Nodes**
- chat: `type: chat`, `home: <direction-id>`, `title:"Архитектурный совет"`.
- 5 agents: each an agent node. Membership of agent→chat must be expressed as an EDGE.

**The membership problem (a killer).** Where does "agent M is in chat C" live?
- If `agent.home = chat` → an agent has exactly one home, but an agent sits in **many** chats (scenario 12). So home cannot be the membership edge.
- Therefore membership must be `links: [{to: chat, rel: member-of}]` on the agent (or `roster` on the chat).
- But ADR-0001 says **cascade comes from `home` only**, and `links` carry no context. So an agent whose membership lives in `links` **gets no context cascade from the chat**. The whole point of a pre-configured chat (AGENT-WORKSPACES §2) is that the chat's configured context flows to its agents. With home-only cascade, it does not.

**Verdict ❌.** **Breaks:** `home` (cardinality 1, but agent needs N chat memberships) **⟂** "cascade from home only" (Альтернативы: multi-parent cascade rejected). Membership edge has no home to live in AND no cascade if placed in `links`. This is the C1 finding from cluster 5 re-hitting cluster 4: *polymorphic membership and home-only cascade are mutually exclusive.*

---

## Scenario 4 — Topic = agent + context bundle

**Nodes**
- topic: `type: topic`, `home: <chat | direction>`, body = configured context (the static "CLAUDE.md" context of CHAT-HIERARCHY §4A).
- agent links into topic.

**Verdict ⚠️→❌.** A topic as a *node carrying configured context that cascades down* is exactly what CHAT-HIERARCHY §4A wants ("направление → чат → агент, склейка вверх по parent_id"). ADR-0001 renamed `parent_id`→`home` and kept single-home cascade, so a **linear** topic→chat→direction spine cascades fine ✅. But "topic = agent + context bundle" means the topic must **gather** the agent's role-context AND the direction-context AND skill set into one effective envelope. The agent's role lives in the agent node (its home is elsewhere), the topic's context is in the topic node, the direction context is up the home chain. The effective context is **home-chain ∪ linked-agent-context** — a union of home cascade *and* a link. ADR-0001 gives you only the home half. **Breaks:** effective-context = home-chain only; the "+agent" half arrives via a `link`, which does not cascade.

---

## Scenario 5 — Message that AGGREGATES (multi-level report + links to files/commits)

**Nodes**
- report: `type: message.report`, `home: <chat>`, body = the rolled-up text, `links: [{to: fileA, rel: cites}, {to: gitsha, rel: cites, href:true}, {to: subreportX, rel: rolls-up}]`.

**Verdict ⚠️ (this one mostly holds — best of the hard ones).** `links[{to,rel,href}]` with `href:true` for the commit/file URL is exactly what cluster 1/3 asked for and it is present. Multi-level = `rel:rolls-up` to sub-nodes. **Strains:** (a) "multi-level report" implies traversing rolls-up edges with a depth bound — **no `maxDepth` guard exists in code** (cluster 5 C2), so rendering an aggregator that cites an aggregator can loop. (b) Referential integrity on `links.to` is **not enforced** (cluster 3) — a cited commit/file id can dangle. (c) No `level`/ordering field on links, so "multi-level" ordering is lost. **Breaks:** none structurally; the gaps are infra (`maxDepth`, dangling-edge guard) not schema shape.

---

## Scenario 6 — Team of agents with roster + protocol

**Nodes**
- team: `type: team`, `title`, `description`, body = protocol (rounds, who-speaks-when), `roster` — where?

**Verdict ❌.** Two breaks: (1) **No roster container.** Roster = N agents. Either `team.links:[{to:agent, rel:roster}]` (links, no cascade — team context won't reach members) or each `agent.home=team` (but agent has one home and lives in many teams/chats). Same membership⟂cascade break as scenario 3. (2) **Protocol** (the round structure, "круглый стол не оркестр" from CHAT-HIERARCHY §3) is **free-text body** — not a typed contract, not queryable, not validated. ADR-0001 has no `type:team` contract; `<typeBlock>` could hold `team:{protocol, roster_rel}` but roster-as-ids still can't cascade. **Breaks:** membership edge home (cardinality + cascade) and protocol-as-data (lives in body, no schema).

---

## Scenario 7 — Model config (which model, cost, tokens)

**Nodes**
- model ref: `type: model.config`, `title:"opus-4.8-1m"`, `<typeBlock> model:{provider, id, input_price, output_price, ctx_window, cached_price}`, `home: <models-registry>`.

**Verdict ⚠️.** A reference/lookup record *fits* the open-type + `<typeBlock>` mechanism — this is what open types were for. **Strains:** (1) There is **no notion of a "reference/lookup" node class** — stress-test calls it "справочная запись"; ADR-0001 has no `epistemic` or `type` family for canonical reference data (it's neither proposal nor a temporal fact nor a task). It defaults to `epistemic:fact` which is semantically wrong (a price table is a config, not a knowledge-claim). (2) **Token accounting** (tokens ↔ tariff) is a *measurement over time per usage* — that is the cluster-1 time-series hole (`value/unit/occurredAt` not first-class) re-appearing: each call's token count is a measurement node with no aggregation contract. **Breaks:** no reference-node class; usage = time-series, which the schema doesn't aggregate.

---

## Scenario 8 — Agent↔agent dialogue turn (inReplyTo / thread)

**Nodes**
- turn: `type: message`, `home: <chat>`, `actor: agent:<id>`, body = the turn. Reply-to = ???

**Verdict ❌ (named killer).** ADR-0001 has **no `inReplyTo` and no `thread` field**. The only structural pointer is `home`, which is the *container* (the chat), not the *antecedent turn*. You could encode reply as `links:[{to: priorTurn, rel: in-reply-to}]` — but then (a) thread reconstruction is a `links` traversal with **no maxDepth/cycle guard** (cluster 5 C2: cycle-guard only existed for parent, now removed entirely), and (b) `links` don't cascade, so a reply does not inherit the antecedent's context. A dialogue is fundamentally a **reply-DAG**; the schema models only container membership. **Breaks:** absence of `inReplyTo`/`thread`; `home` = container ≠ antecedent. Threading is unsupported at schema level.

---

## Scenario 9 — Proposal node for owner approval (epistemic = proposal)

**Nodes**
- proposal: `epistemic: proposal`, `actor: agent:<id>`, `state: ?`, `type: <whatever it proposes>`.

**Verdict ⚠️.** `epistemic:proposal` exists and is exactly designed for this (extract always emits `proposal`; ADR §Поток). The "valve" is external-action approval, not visibility — correct for this case. **Strains:** there is **no `proposed→approved` transition on a dedicated axis.** `epistemic` enum is `proposal|fact|hypothesis|archived` — approval = flipping `proposal`→`fact`. But "approved" and "true" are different ideas: an owner can *approve a hypothesis* (sanction it) without asserting it's a fact. The ADR collapses **sanction (approved/rejected)** into **truth-confidence (fact/hypothesis)**. The stress-test names this: "нет proposed/approved". Also: who approved / when / approval trace — only an external trace-node (ADR mentions trace-node logging), not a field. **Breaks:** approval and epistemic-confidence share one enum; no rejected state; no approver/decided-at on the node.

---

## Scenario 10 — Context-cascade for an agent in a topic (getContext envelope)

**The envelope an agent actually needs:** its own role (agent node) + topic configured-context + chat context + direction context + relevant memory nodes + high-importance graph nodes. That is **home-chain ∪ many links ∪ a memory query**.

**Verdict ❌ (the structural crux of the whole cluster).** ADR-0001's `getContext` = walk `home` upward = a **single linear chain**. But an agent's real context is `home-chain + N links` (its role, its memories, the topic's linked references). The ADR **explicitly rejected** multi-parent cascade ("недетерминированная важность/контекст"). So the schema's answer to "what does this agent know here" is *structurally narrower than reality*. "Cascade from home only" is **not enough** when context = home + many links. Either links must carry a `cascade:true` flag (reintroducing the rejected multi-parent problem with a determinism rule), or context assembly must be a query layer above the cascade (which the ADR doesn't define). **Breaks:** "один дом = источник каскада" vs real envelope = home ∪ links. This is C1 from cluster 5, and it is the load-bearing failure for the agent-first reframe.

---

## Scenario 11 — Compact/summary node rolling up old messages (marks them archived)

**Nodes**
- summary: `type: message.summary`, `home: <chat>`, `links:[{to: msg1, rel: rolls-up}, …]`, `importance: high`.
- old messages: flip `epistemic: archived`.

**Verdict ⚠️→❌.** Two halves:
- **Summary node:** fits (`rolls-up` links + body + importance). The CHAT-HIERARCHY §5 design ("свернуть в узел-резюме, ссылка на полный след, высоковажные переживают чистку") maps onto `links[rolls-up]` + `importance`. ✅ for the summary itself.
- **"marks them archived":** `epistemic:archived` *exists* — but there is **no rule that `archived` is excluded from hot/default queries** (stress-test: "старые message не помечаются 'архив' → попадают в горячие запросы"). `epistemic` is declared **informational, NOT a wall** (ADR Принцип 3: "НЕ стена видимости"). So by the ADR's own rule, `archived` cannot filter visibility — which is exactly what compact needs. The schema's anti-staging stance ("всё видно ИИ") **directly contradicts** compact's need to demote archived messages out of the hot window. Also: compacting must **write `archived` to N old nodes** — same "supersede doesn't touch predecessor" problem as scenario 2; the summary's creation doesn't mechanically archive its sources. **Breaks:** `epistemic:archived` is explicitly NOT a visibility filter (Принцип 3) — so it can't keep old messages out of hot queries; and no engine action archives the rolled-up sources.

---

## Scenario 12 — ONE agent instance in TWO chats with different memory (template vs instance)

**What's needed**
- template: `type: agent.role`, the reusable role/skills/instructions (one node).
- instance A: agent-in-chat-1 with memory-set-A.
- instance B: agent-in-chat-2 with memory-set-B.
- instance derives-from template; memory nodes `home` to the *instance*, not the template.

**Verdict ❌ (the headline killer).** ADR-0001 has **no instance concept**. There is one `agent` node. To get two memories you must either:
- (a) clone the agent node per chat (instance = node with `links:[{to:template, rel:instance-of}]`, memory `home:instance`) — workable *shape*, but ADR never names `instance-of`, never says memory homes to an instance, and the cloned instance still can't receive the chat's cascade if membership is a link (scenario 3). Worse, "different memory" requires memory nodes to `home` to the **instance**, but the agent also needs to `home` somewhere for ITS cascade — an agent-instance needs **two homes** (its template for role-context, its chat for chat-context). Cardinality-1 `home` forbids this.
- (b) put memory in `<typeBlock>` on a single agent node keyed by chat — collapses to one node holding a map, defeating "node = unit agents work with" and unqueryable per-chat.

**Breaks:** no `instance` / `instance-of` in the type registry; memory cannot home to an instance because an instance would need ≥2 homes (template + chat); single-`home` makes template-vs-instance inexpressible. This is the exact gap the stress-test flagged: "Template vs Instance не различены; один агент в 2 чатах."

---

# (A) Verdict on ADR-0001 for this PRIORITY cluster

**Does NOT survive as written. Needs 3 structural changes (and 2 infra fixes already known).**

The schema is *content-and-time competent* but **structurally under-models the agent substrate** on three axes that are all the SAME root: **`home` is simultaneously (1) cardinality-1 and (2) the sole cascade source.** That single design choice — taken to kill multi-parent non-determinism — makes membership (ch.3,6), instances (ch.12), and the real context envelope (ch.10) inexpressible, because every one of those needs *more than one cascading belonging*. The reframe ("KB = working substrate for AI agents") puts maximum weight on exactly the cells the single-home cascade cannot carry. 2 of 12 are clean-ish (2, partially 5); the agent-defining cells (3, 6, 8, 10, 12) break.

The good news: the breaks are **concentrated**, not scattered. Fix the home/cascade duality and the instance axis, and 8 of the 12 flip to ✅/⚠️.

# (B) Top 3 concrete schema fixes (this cluster matters most)

1. **Split `home` into two concepts: `home` (ownership, cardinality 1, for re-home/lifecycle) and a cascading-link flag.** Add to `links` an optional `cascade: true` (and `cascade_order: int`) so that *selected* edges contribute to the effective-context/importance envelope under a **deterministic merge rule** (e.g. nearest-wins + explicit `cascade_order` tiebreak + `maxDepth`). This directly answers the ADR's rejection reason ("недетерминированная важность/контекст") by making cascade *opt-in and ordered* instead of all-parents. Fixes scenarios 3, 4, 6, 10, 12. **Without this, the agent reframe fails.**

2. **Add an `instance-of` relation + allow memory/state nodes to `home` to an instance.** Register `type: agent.role` (template) and `agent.instance` (instance-of template). An instance's `home` = its chat/team; its `instance-of` link = its template (a *cascading* link per fix 1). Memory nodes `home` to the instance → two chats, two memories, one role. Fixes scenario 12 (and unblocks 1, 11).

3. **Separate the approval/sanction axis from epistemic-confidence, and make `archived` a real hot-query filter.** (a) Add `decision: none|proposed|approved|rejected` (with `decided_by`/`decided_at`) distinct from `epistemic: fact|hypothesis`. (b) Carve a narrow exception to Принцип 3: `epistemic:archived` (and/or `valid_until<now`) is excluded from **default/hot** queries while remaining fully readable on explicit request — "не стена для чтения, но не в горячем окне". Fixes scenarios 9 and 11; also makes scenario 2's "current only" enforceable.

Plus two **infra carry-overs** that this cluster re-confirms (already on the ADR validation plan, not new): add the missing `maxDepth`/cycle guard for **`links`** traversal (threading ch.8, aggregator ch.5, summary ch.11 all traverse links and will loop), and add a `thread`/`inReplyTo` rel + referential-integrity check on `links.to`.

# (C) Verdict matrix

| # | Scenario | Verdict | Field/rule that strains or breaks |
|---|----------|---------|-----------------------------------|
| 1 | Memory item vs note | ⚠️ | distinction = `type` string + `actor` only; "memory" is not a queryable axis, no `confidence` |
| 2 | Changing fact / supersession | ✅→⚠️ | `valid_from/until/supersedes` present; but `supersedes` cardinality=1 and engine doesn't close predecessor's `valid_until` |
| 3 | Multi-agent chat (5) | ❌ | membership edge has no home; `links` membership gets no cascade — `home`=1 ⟂ "cascade from home only" |
| 4 | Topic = agent + context | ❌ | effective context = home-chain only; the "+agent" half is a `link`, which doesn't cascade |
| 5 | Aggregator message | ⚠️ | `links{href}` holds; but no `maxDepth`, no link integrity, no level/order on links |
| 6 | Team + roster + protocol | ❌ | no `type:team` contract; roster = membership⟂cascade break; protocol = free-text body, not data |
| 7 | Model config / cost / tokens | ⚠️ | open-type `<typeBlock>` fits; but no "reference-record" class; `epistemic:fact` wrong; tokens = unaggregated time-series |
| 8 | Agent↔agent reply / thread | ❌ | no `inReplyTo`/`thread`; `home`=container ≠ antecedent; reply-DAG unsupported |
| 9 | Proposal for approval | ⚠️ | `epistemic:proposal` exists; but approval (sanction) collapsed into truth-confidence enum; no `rejected`, no approver/decided-at |
| 10 | Context-cascade envelope | ❌ | `getContext` = single home-chain; real envelope = home ∪ N links; multi-parent cascade explicitly rejected |
| 11 | Compact / summary / archive | ⚠️→❌ | summary node fits; but Принцип 3 says `archived` is NOT a visibility filter → can't leave hot queries; sources not auto-archived |
| 12 | One agent, two memories | ❌ | no `instance`/`instance-of`; memory can't home to instance; instance needs ≥2 homes vs `home` cardinality 1 |

**Tally: 1 ✅(→⚠️) · 5 ⚠️ · 6 ❌.** Matches the prior round's "0 clean" — the only thing that improved is scenario 2 (the bitemporal trio landed). Every ❌ traces to the same root: **single cascading `home`** + **no instance axis** + **epistemic-as-only-status**.
