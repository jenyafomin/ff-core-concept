# RAW — Advanced Stress · Cluster D (Access / ABAC / Privacy) · system-architect · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT2-2026-06-15-advanced.md`. Model has ZERO access concept today.

`actor` exists as PROVENANCE (who created), not AUTHORITY (who may read/write/expose). **Key reconciliation:** Принцип 3 ("всё видно ИИ, epistemic=метка, клапан только на внешние действия") is scoped to ONE owner + ONE first-party AI. Marketplace/multi-user breaks that antecedent. → **Re-scope: Принцип 3 applies to FIRST-PARTY agent only; everyone/everything else (3rd-party modules, other users, external exposure) = default-deny.** ABAC's teeth = WRITE, EXPOSE, SHARE, ACT, and non-first-party reads. First-party READ stays open (П3 intact).

### Verdict matrix
| # | Scenario | V | Gap / fix |
|---|---|---|---|
| 1 | read fact, don't act on draft | ⚠️ | no action-class; need taxonomy + sensitivity + policy |
| 2 | per-node sensitivity | ⚠️ | no field; add `sensitivity: private|shareable|public` (MAX-restrictive cascade!) |
| 3 | sandbox 3rd-party module | ❌ | П3 leaks to modules — TOTAL gap; need principal boundary |
| 4 | multi-user subtree access | ❌ | no 2nd user/`owner`/subtree ACL (home-closure gives subtree free) |
| 5 | per-agent write scoping | ⚠️ | actor=provenance not authority; need write-scope attrs |
| 6 | external-action gate | ✅concept/⚠️form | trust valve is prose; structure as action-class gate |
| 7 | field-level (hide salary) | ⚠️→❌ | typeBlock one unit; PREFER split sensitive field → linked private node |
| 8 | temporary delegation | ❌ | no grant; model `type:grant` + bitemporal valid_until = free expiry/revoke |
| 9 | audit access/action | ⚠️ | trace exists; need auth-decision trace type (mandatory non-first-party + write/act) |
| 10 | policies: nodes or config? | ⚠️ | must be NODES (type:policy/grant) + hard owner-only root-of-trust |

### (A) Verdict: zero access control today. Minimal ABAC = 4 attrs + 1 enforcement point + 1 carve-out, all riding existing axes:
1. `sensitivity` (default private, MAX-restrictive cascade — different merge than importance, else re-home leaks).
2. **Principals as nodes** (first-party-agent | user | module) with capability attrs — makes "AI sees all" scoped to first party; else default-deny.
3. **Action-class gate** (read|write|expose|external-act + reversible/cost); trust valve = the external-act branch; `decision:approved` = grant token. Unifies trust valve + ABAC.
4. **Policy & grant nodes** (default-deny non-first-party, allow-read first-party); grant rides bitemporal valid_until. Hard NON-graph-governed root-of-trust for policy/principal nodes (the ONE real wall, not a label).

**Enforcement point = the query/write contract (problem 9). ABAC impossible without it → escalate problem 9 from "important" to BLOCKER for the marketplace path.**

### (B) Top improvements (→ ADR-0003 "Access & ABAC")
1. Principal model + re-scope Принцип 3 to first-party (owner decision needed). 2. `sensitivity` on node+edge, max-restrictive cascade, principal-aware query; prefer node-splitting over field-level redaction. 3. Unify trust valve + ABAC into action-class gate; policy/grant as nodes behind owner-only root-of-trust.
