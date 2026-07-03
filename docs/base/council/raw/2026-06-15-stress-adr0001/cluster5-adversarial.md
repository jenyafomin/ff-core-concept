# RAW — Stress ADR-0001 · Cluster 5 (Adversarial) · critic · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT-2026-06-15-adr0001-stress.md`.

Prior C1-C5 accounting: C1 multi-parent RESOLVED (one home). C2 cycles/maxDepth PARTIAL (prose only, not in schema/code). C3 closed-enum RESOLVED in concept (but node.ts still has old enum — doc↔code inconsistency). C4 broadcast/O(N) ACKNOWLEDGED future. C5 validation-conflict PARTIAL (type@version, but composed/priority is prose).

### Attack matrix
| Attack | Severity | Fixed by ADR? |
|---|---|---|
| 1 Cycle guard on links (loop/OOM) | CRITICAL | NO — future work, unspecified |
| 2 maxDepth + truncation signal | CRITICAL | NO — field absent |
| 3 Dangling links (href optional, no integrity) | CRITICAL | NO — href optional, deferred |
| 4 Dedup: no aliases/canonical_of | CRITICAL | NO — prose promise, no field |
| 5 One-home blind spot cross-area | CONCERN | NO — trade-off accepted, retrieval path undefined |
| 6 Importance re-home eager vs lazy | CONCERN | NO — unspecified |
| 7 Contradiction: no `claim_about` | CONCERN | NO — no structural hook |
| 8 Epistemic gate: no schema signal for external action | CONCERN | NO — prose principle, no field/mechanism |
| 9 Type sprawl: registry not graph-queryable | CONCERN | NO — code-side only |
| 10 O(N) query, no pagination contract | CONCERN | NO — absent from ADR |
| 11 Zero-signal input + `description` missing in node.ts v1 | CONCERN/CRITICAL | PARTIAL — flow ok; description field absent in code |

### CRITICAL detail
- A1 cycle: A→B→C→A organic semantic cycle; getContext recurses → stack overflow/OOM. Guard not a field/flag/defined behavior; where it lives, fallback, trace-on-truncation all undefined.
- A2 maxDepth: not a field; no "truncated at depth N" signal → agent reasons from silently-incomplete context, no audit. Violates ADR's own observability principle.
- A3 dangling: `links.to` string, no FK; `href` OPTIONAL → can't distinguish dead internal id from external url; can't automate integrity. 500-link broadcast × 1% = 5 silent broken edges/node.
- A4 dedup: "Anna"≠"Аня", both proposal, no `aliases`/`canonical_of`/`merged_into`/`fingerprint`; `supersedes` is temporal not identity-merge. Fragments person-graph within a week of bilingual use.

### Confirmed SOUND (no problem found): single-home principle (kills multi-parent non-determinism); epistemic⟂state orthogonal axes; ULID stable id; supersedes for temporal (not dedup).

### Watch: valid_until null vs absent (define); actor agent:id unenforced; source free-string (define canonical format); occurred vs valid_from for retro-knowledge (define which).

### (A) 4 CRITICALs to close BEFORE code
1. Cycle guard = named engine contract: traversal carries `visited:Set` + `maxDepth`. Correctness pre-condition, not infra TODO.
2. Truncation signal: `context_truncated:bool` (+depth) on traversal output; specify format before first getContext consumer.
3. `href` REQUIRED (true=url / false=node-id) — only way engine detects dangling.
4. Dedup: add `aliases:string[]` + `canonical_of:id?` — OR explicitly declare dedup out-of-scope for v2 and drop the prose promise.

### (B) Verdict: does NOT survive adversarial review without revision. Big improvement over v1 (C1/C3 resolved, axes sound, one-home/open-types/agent-first well-argued) — but ships 4 holes that are correctness pre-conditions, not future infra. node.ts v2 must not ship before they're closed or explicitly gated. Also: `description` mandatory in ADR but absent in node.ts v1 = direct doc↔code contradiction.
