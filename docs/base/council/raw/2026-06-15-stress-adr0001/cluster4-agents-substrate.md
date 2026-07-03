# RAW — Stress ADR-0001 · Cluster 4 (Agents/Memory/Chats/Teams/Models) · system-architect · 2026-06-15
> ★ PRIORITY cluster (owner reframe: KB = agent substrate). Condensed-faithful. Synthesis: `docs/product/VERDICT-2026-06-15-adr0001-stress.md`.

Tally: **1✅(→⚠️) / 5⚠️ / 6❌ — does NOT survive as written.**

**Two ADR facts decide most verdicts:** (1) `home` is cardinality-1 AND the sole cascade source (Принцип 5 + rejection of multi-parent as non-deterministic); (2) no instance axis, no `inReplyTo`/`thread`, no membership-edge home, and `epistemic:archived` is explicitly NOT a visibility filter (Принцип 3).

### Verdict matrix
| # | Scenario | V | Field/rule that breaks |
|---|---|---|---|
| 1 | Memory vs note | ⚠️ | distinction = `type`+`actor` only; memory not a queryable axis; no confidence |
| 2 | Changing fact / supersession | ✅→⚠️ | bitemporal trio landed (real win); `supersedes` card=1; engine doesn't auto-close predecessor `valid_until` |
| 3 | Multi-agent chat | ❌ | membership edge has no home; in `links` it gets NO cascade |
| 4 | Topic = agent + context | ❌ | effective context = home-chain only; "+agent" arrives via link → no cascade |
| 5 | Aggregator message | ⚠️ | `links{href}` holds; no maxDepth/integrity/level-order on links |
| 6 | Team + roster + protocol | ❌ | no `type:team`; roster = membership⟂cascade; protocol = body not data |
| 7 | Model config/cost/tokens | ⚠️ | typeBlock fits; no "reference-record" class (`epistemic:fact` wrong for price table); tokens = unaggregated series |
| 8 | Agent↔agent reply/thread | ❌ | **no `inReplyTo`/`thread`**; `home`=container ≠ antecedent; reply-DAG unrepresentable |
| 9 | Proposal for approval | ⚠️ | approval(sanction) collapsed into truth-confidence enum; no `rejected`/approver/decided-at |
| 10 | Context-cascade envelope | ❌ | cascade = single home-chain; real envelope = home ∪ N links ∪ memory query |
| 11 | Compact / summary / archive | ⚠️→❌ | Принцип 3: `archived` NOT a visibility wall → can't keep old msgs out of hot queries |
| 12 | One agent, two memories | ❌ | **no `instance`/`instance-of`**; memory can't home to instance; instance needs ≥2 homes vs card-1 |

### (A) Verdict: does NOT survive. Every ❌ traces to ONE root: **`home` is simultaneously cardinality-1 AND the sole cascade source.** Right for *notes*, wrong primitive for an *agent substrate* — membership(3,6), instances(12), real context envelope(10) each need MORE than one *cascading* belonging. The reframe loads max weight on exactly the cells single-home cascade can't carry.

### (B) Top 3 fixes (this cluster matters most)
1. **Split ownership from cascade** (load-bearing): keep `home` (card-1, ownership/re-home), ADD `cascade:true`+`cascade_order:int` to `links` with deterministic merge (nearest-wins + order tiebreak + maxDepth). Cascade becomes opt-in & ordered (answers the original non-determinism rejection). Fixes 3,4,6,10,12.
2. **Add `instance-of`** + let memory/state home to an instance: `agent.role` (template) vs `agent.instance` (home=its chat, instance-of→template via cascading link); memory homes to instance → two chats, two memories, one role. Fixes 12; unblocks 1,11.
3. **Separate sanction from confidence + make archived a hot-query filter**: add `decision:none|proposed|approved|rejected` (+decided_by/at) distinct from `epistemic`; narrow exception to Принцип 3 so `archived`/`valid_until<now` drop from DEFAULT queries while staying readable. Fixes 9,11; enforces 2.
+ infra carry-overs: maxDepth/cycle guard for **links** traversal; `thread`/`inReplyTo` rel + `links.to` integrity.

**Takeaway: the home-card-1 + home-only-cascade decision is the wrong primitive for the agent substrate — fix #1 is load-bearing for the entire reframe.**
