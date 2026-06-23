# RAW — Advanced Stress · Cluster E (Constraints / Limits / Governance) · critic · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT2-2026-06-15-advanced.md`. (Doesn't repeat the 9 problems; focuses on NEW risks from on-the-fly type/data authoring + marketplace.)

### Risk matrix
| Risk | Severity | State | Guardrail |
|---|---|---|---|
| Type sprawl (100+ near-dup types) | CRITICAL | no dedup | registry dedup check + confirmation on every type-create; AI can't auto-create in background |
| Schema migration corrupts existing nodes | CRITICAL | no contract | append-only versioning + new fields nullable + dry-run + owner approval + rollback |
| **AI acts on `proposal` via external action** | CRITICAL | `decision` unimplemented | engine gate: external act requires `decision:approved` AND `epistemic:fact` (code-level, not prompt) |
| Marketplace module captures sensitive data | CRITICAL | no sandbox | namespace isolation + capability manifest + staged install (decision:proposed) + reject secret-like fields |
| Rule/automation loop (A→B→A) | CONCERN | no chain guard | engine rule-chain depth counter (max 5) + suppress+trace |
| AI uses superseded node as current fact | CONCERN | archive-on-supersede not auto | atomic: write `supersedes:X` → engine sets X `epistemic:archived` |
| Variant/version explosion | CONCERN | no fork-vs-edit policy | enrichment = in-place edit by default; fork = explicit |
| Personal data leak via export/share | CONCERN | no scope boundary | scope-declared export: root + depth limit + explicit hop expansion |
| Query cost cliff at 100k+ | CONCERN | query contract unfixed (#9) | pagination + max-result caps + required filters in ADR |
| AI silently resolves contradictions | PROVOCATION | no protocol | ADR: when fact vs hypothesis contradict at same importance — surface or pick? |
| AI-node placement degrades home invariant | PROVOCATION | unstated | dedicated AI-node home subtree; home required (not null) for AI writes |
| `actor` omitted on AI writes | NOTED | optional | make actor required at engine write layer |
| `rel:<string>` vocabulary sprawl | NOTED | ungoverned | managed rel vocabulary; audit distinct rels |

### (A) HARD INVARIANTS — engine-level "system must NEVER" (prompt can be ignored; these cannot)
1. NEVER create a type without a registry dedup check (AI + user alike; no bypass).
2. NEVER execute an external irreversible action unless node has `decision:approved` AND `epistemic:fact` (engine gate; missing decision = blocked).
3. NEVER apply a breaking type-schema change without declared migration + owner confirm; new fields default nullable.
4. NEVER write `supersedes:X` without atomically setting X `epistemic:archived` (no stale active facts).
5. NEVER traverse links without maxDepth + truncation signal.
6. NEVER let a marketplace module write outside its declared namespace without explicit per-field grant.
7. NEVER store `password|credential|token|secret|api_key`-like fields without explicit security-review flag.
8. NEVER let a rule chain fire > N times (default 5) from one event (engine-maintained counter).

### (B) Top governance limits before open authoring
1. Type registry with dedup gate (AI proposes to a confirm queue, can't background-create).
2. Versioned type changes with migration contract (append-only for breaking; dry-run + sign-off).
3. **Decision gate for irreversible actions — implement `decision` field FIRST** (the #1 autonomy mitigation is currently unimplemented; it's the highest-severity gap).
4. Module sandbox + namespace isolation + capability manifest + staged install.

### Sharpest observation
ADR-0001 accepted "AI can rely on unverified `proposal` nodes, mitigated by the external-action valve" — but that valve (`decision`) is item #7 of the 9 unfixed. **The mitigation for the highest-severity autonomy risk is itself unimplemented. Close `decision` first.**
