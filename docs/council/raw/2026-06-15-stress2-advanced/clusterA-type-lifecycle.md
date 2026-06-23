# RAW — Advanced Stress · Cluster A (NL/AI type creation by non-experts) · business-analyst · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT2-2026-06-15-advanced.md`. Score: 0✅/3⚠️/7❌.

Owner framing (msg 175): ordinary people + AI create/adapt/edit cell-types on the fly from plain instructions. Model today treats types as "solved" (open registry + type@version) but the TYPE LIFECYCLE (creation, approval, migration, undo, namespacing, legibility) is the hardest UNSOLVED problem.

### Verdict matrix
| # | Scenario | V | Gap |
|---|---|---|---|
| 1 | AI invents new type on the fly | ❌ | no `type-decl` structure, no registry-creation protocol, no place type lives |
| 2 | AI designs fields; user understands/trusts | ⚠️ | actor/epistemic exist; NO human-language type description/legibility |
| 3 | AI edits type, migrate existing nodes | ❌ | no migration contract; version-bump semantics undefined |
| 4 | per-node one-off field vs type change | ❌ | no sanctioned escape hatch → forces type-wide change or invalid frontmatter |
| 5 | AI invents field conflicting validator | ⚠️ | no `schema_rejected` stage → silent loss/corruption |
| 6 | marketplace collision (two "plant") | ❌ | type strings global, unqualified; no namespacing/trust |
| 7 | v1→v2, old nodes valid? | ⚠️ | `type@version` field exists, compatibility contract empty |
| 8 | undo a type change AI made | ❌ | no type-change record, no rollback covering def+nodes |
| 9 | non-tech user, no YAML | ❌ | no human interaction surface (by design "agent-first") |
| 10 | unapproved AI type goes live | ❌ | no control-plane/data-plane gate → AI type proliferates before owner sees |

### (A) Verdict: UNFIT for NL/AI-driven type lifecycle. Core (epistemic/state, open types, ULID, bitemporal, one-home) is right, but type LIFECYCLE absent as a design dimension.

### (B) Top improvements
1. **Type-as-Node (`type-decl@1`)** — each type is a first-class node: `qualified_name (namespace/type@ver)`, `human_label/human_description`, `fields[{name,human_label,type,required}]`, `decision: proposed|approved|rejected`, `supersedes`. Unlocks: AI proposes (decision:proposed, visible but NOT a valid validator until approved), non-tech legibility (human_label), namespacing (collisions), version chain (undo), registry IS the graph (queryable). Engine rule: a type validates only when its type-decl `decision:approved`.
2. **Schema-migration as a node** (`schema-migration`): from/to schema, change_kind additive|breaking, added/removed fields, affected ids, migration_rule, decision. Additive = old nodes stay valid; breaking = require explicit migration + re-validate; old validators never deleted; migration node = the undo handle.
3. **Per-node `adhoc: {}` block** (opaque, unvalidated, not cascaded/indexed) for one-off fields + every AI type/node action emits a human-language `conversation` node (`rel: explains`) = the interaction surface (user reads that, not YAML).

Through-line: control plane (types) must be FIRST-CLASS NODES → legible + approvable + queryable ("всё видно ИИ" for the governing layer).
