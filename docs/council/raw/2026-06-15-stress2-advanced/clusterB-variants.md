# RAW — Advanced Stress · Cluster B (Variants / Versioning) · analyst · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT2-2026-06-15-advanced.md`. Score: 0✅/3⚠️/7❌.

Owner idea (msg 175): a node/branch can have VERSIONS differing in CONTENT — "two kinds of plan of the same thing" coexisting in parallel. Distinct from `supersedes` (TIME: old→new). Parallel coexistence is a THIRD axis the model has no vocabulary for.

### Verdict matrix
| # | Scenario | V | Gap |
|---|---|---|---|
| 1 | two parallel plans, both alive | ❌ | no `variant-of` rel, no variant-group anchor |
| 2 | mark one variant active | ❌ | no `active_variant` pointer |
| 3 | compare variants (diff) | ⚠️ | no `diff_base`; no comparability contract |
| 4 | 80% shared content | ❌ | no derivation/override primitive → full duplication |
| 5 | variant of whole subtree | ❌ | no fork-depth (shallow=share children / deep=clone) |
| 6 | merge variant back / promote | ❌ | `supersedes` is wrong axis (marks loser "past" not "incorporated") |
| 7 | variant + supersedes combined | ⚠️ | no head-pointer rule; finding live variant = multi-hop |
| 8 | cascade for sibling variants | ❌ | both variants cascade equally; no exclusion of inactive |
| 9 | which variant agents see by default | ❌ | no query filter; context bloat (all variants) |
| 10 | archive loser, keep decision history | ⚠️ | `epistemic:archived` works; rationale unstructured |

### (A) Verdict: variant cluster COMPLETELY UNMODELED. Risk: implementers abuse `supersedes` for variants (corrupts time axis) or use unvalidated `rel:variant-of` (invisible to cascade/query).

### (B) Top improvements
1. **`variant-of` edge + `variant-group` anchor node**: group holds `active_variant: id` + `variant_decision:{chosen,reason,decided_at,decided_by}`. Each variant `variant-of → group`, `variant_role: budget|comfort|...`. Cascade follows active_variant by default; others on-demand. Fixes 1,2,8,9,10.
2. **`diff_base: id?` + `fork_depth: shallow|deep`**: diff = compare against base; shallow = children shared by reference, deep = children cloned & re-homed (subtree branch). Fixes 3,4,5.
3. **Variant-aware getContext rule** (in query contract): active_variant → include only its subtree in hot context; null → enumerate all; override via context(include_variants:...). For variant+supersedes: active_variant must always point to HEAD of supersedes chain. Fixes 7,8,9.

New: 1 node type (variant-group), 1 edge rel (variant-of + variant_role), 2 fields (diff_base, fork_depth), 1 query clause.
