# RAW — Advanced Stress · Cluster C (Where logic & rules live) · system-architect · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT2-2026-06-15-advanced.md`. Score: 0✅/2⚠️/8❌ — WEAKEST cluster.

One-line: ADR-0001 models STATE superbly but has NO logic layer. No event, trigger, formula, recompute, precedence, or logic-ownership anywhere. `recordTrace` (append) + `effectiveContext` (pull-time concat) are the only "active" mechanics — both passive. The model can be read/rewritten but cannot ACT in response to change. Missing axis = the **ACT axis**.

### Verdict matrix
| # | Scenario | V | Gap |
|---|---|---|---|
| 1 | overdue → notify | ❌ | no trigger node, no clock, no firing path |
| 2 | computed node (savings rate) | ❌ | no formula/inputs/invalidation; value & sources diverge |
| 3 | rule-as-data vs code validator | ⚠️ | SoT arbitration unspecified; no `enforced_by` |
| 4 | type default behavior (habit auto-gen) | ❌ | type-decl is passive shape; no on-create/recurrence generator |
| 5 | cross-node invariant (actual ≤ planned) | ❌ | zod is single-node; can't range over a node-set; no "flag" action |
| 6 | agent triggered by graph event | ❌ | graph emits nothing; trace = post-hoc log, not event bus |
| 7 | where module logic lives | ⚠️ | core boundary exists; module data-vs-code-vs-skill undecided |
| 8 | conditional/dynamic links | ❌ | edges unconditional & non-temporal (asymmetric vs bitemporal nodes) |
| 9 | recompute/invalidation propagation | ❌ | no dependency edge, dirty-flag, propagation — silent staleness |
| 10 | cross-module logic/precedence | ❌ | only ordering primitive is cascade_order (context-scoped) |

### (A) Verdict: NO logic layer — a state layer + 2 passive mechanics. Engine is correct but INERT (file store + router, no evaluator, no clock). Validation is single-node (zod-per-file) → every interesting rule in a complex system is cross-node = one tier below what's needed. Good news: substrate is RIGHT for adding logic (everything-is-a-node → rules/triggers/computed/deps all = nodes+edges, no new store). Fix is ADDITIVE but must be specced before code. SoT ruling: **code = enforcer, data = declaration**; linked by `enforced_by`; engine flags `enforced_by:none`; data never overrides code at runtime.

### (B) Top improvements (→ ADR-0002 "Logic & Reactivity")
1. **Event/Trigger model (the ACT axis)**: `trigger` node `{on: created|updated|deleted|due-passed|schedule, match:{type?,home_subtree?,rel?,state?}, action: skill|agent-ref, debounce?}` + `event` node (engine emits on every mutation) + engine seam `evaluate(triggers,event)` at the write funnel. One genuinely new component: a thin external clock that only INJECTS due/schedule events (holds no logic). Closes 1,4,6,9.
2. **Computed-node contract + invalidation graph**: `computed:{formula: skill-ref, inputs:[id], fresh_as_of, stale:bool}`; engine keeps dependency back-index (reuse backlink machinery); input write → mark dependents stale + recompute event; lazy or eager recompute. **Invariants = computed booleans with an action** (fold sc.5 in). Unifies scattered freshness/rollup/derived holes. Closes 2,5,9.
3. **Module-logic + precedence policy**: module logic = code/skill SHIPPED, REFERENCED by node (data = intent+wiring, code = execution); `enforced_by: code|data|none`. Precedence as data: `precedence:int`+`scope:module-id` on triggers/constraints; conflict → highest wins, loser logged, ties → `decision` flag. Conditional edges: optional `when:` predicate on Link. Closes 3,7,8,10.

8/10 failures collapse into 3 missing primitives — all additive on the node substrate. Spec before node.ts v2.
