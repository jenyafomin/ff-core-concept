# RAW — Stress ADR-0001 · Cluster 3 (Technical/System) · system-architect · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT-2026-06-15-adr0001-stress.md`.

Tally: 4✅ / 4⚠️ / 2❌. **ROOT ENUM HOLE FIXED:** open `type` + `schema:type@version` dissolves the closed-NODE_KINDS root that blocked commit/pr/bug/prompt. epistemic⟂state fixes "one status = бардак". BUT traded typing problem for 3 integrity/execution problems deferred to "infra holes".

### Verdict matrix
| # | Scenario | V | Cited break |
|---|---|---|---|
| 1 | Prompt versions | ✅⚠️ | supersedes = single linked-list, no `version:int`, no single-head guarantee → fork corruption |
| 2 | Agent definition | ✅ | typeBlock{model,tools,role} fits; ⚠️ template/instance boundary undrawn |
| 3 | Code-understanding stale | ❌ | **NO freshness/hash field**; created/updated=node time not target; href points outside graph |
| 4 | Git commit | ✅ | href:true works (the clean win, git=book); ⚠️ to:`id\|url` union unvalidated |
| 5 | PR→commits+task | ⚠️ | commit↔PR linkage outside graph (not queryable); rel free-string |
| 6 | Bug→fix→release | ⚠️ | epistemic⟂state ✅; chain integrity unguarded, no backlinks/transitive query |
| 7 | Validation-rule as node | ❌ | rule-as-data ≠ code validator; no bridge, no precedence → two-truths / meta-regress |
| 8 | Module registers type | ⚠️/❌ | registry EXTERNAL/un-modeled; not self-hosting → "всё видно ИИ" violated for governing layer; dangling-type possible |
| 9 | Skill as node + install | ✅⚠️ | install meta fits; `install.sha` is the only hash anywhere (ad-hoc, cf #3); two-ways-to-version |
| 10 | Model pricing record | ✅ | valid_from/until models price history elegantly (best non-file fit) |

### (A) Verdict: ratifiable for the STRUCTURAL/typing axis; NOT complete. Residual ❌: freshness (#3), rule-as-data↔code bridge + registry self-hosting (#7,#8). Residual ⚠️ pervasive: referential integrity of `links.to` (unenforced id|url union, href OPTIONAL).

### (B) Top fixes
1. **Fingerprint/freshness** (closes #3, harmonizes #9): add `links[].observed_hash/observed_at` (+/or node `fingerprint`); engine rule "stale if target hash≠observed". Paired schema+engine fix.
2. **Decide meta/registry contract**: validation = code (Zod via type@version) is single truth; rule-node = documentation only (`rel:documents`→validator). Make registry self-hosting via ONE bootstrap base type `type-decl@1` in core; a node's `schema` MUST resolve to an existing type-decl (else dangling-type error).
3. **Referentially type `links.to`**: make `href` REQUIRED (default false); href=false ⇒ `to` MUST resolve to existing node (engine flags dangling); href=true ⇒ opaque external uri.
