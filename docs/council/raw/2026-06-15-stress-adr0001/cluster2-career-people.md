# RAW — Stress ADR-0001 · Cluster 2 (Career / People / Comms) · analyst · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT-2026-06-15-adr0001-stress.md`.

Tally: 3✅ / 3⚠️ / 4❌. Every failure traces to ONE gap: **the schema ratifies a storage contract but leaves the QUERY/retrieval contract unspecified** — "мульти-принадлежность ЖИВЁТ в links" is correct storage but incomplete retrieval (cascade is from home only; backlinks are a TODO not a schema guarantee).

### Verdict matrix
| # | Scenario | V | Gap |
|---|---|---|---|
| 1 | Person/contact (Anna) | ⚠️ | `person` typeBlock illustrative not registered; no interaction history / `last_contacted` |
| 2 | Meeting 3 participants | ❌ | backlinks absent; single home = retrieval blind spot; no `rel`/`occurred`-range query |
| 3 | Commitment I made | ⚠️ | `due` ABSENT from canonical block; direction = rel-string convention; no `commitment` type |
| 4 | Debt owed to me | ⚠️ | same; no structured `direction`; task vs commitment conflated |
| 5 | Career goal + sub-areas | ✅ | hierarchy via home+`contains` clean (goal state enum undefined) |
| 6 | Skill progress over time | ❌ | `supersedes` single-scalar = linked list, not queryable history; no trend |
| 7 | Course→skill→goal | ✅⚠️ | links work; single home hides course from career-goal traverse; rollup undefined |
| 8 | Lesson in course | ✅ | clean leaf (duration unstructured) |
| 9 | Project + stakeholders (M:N) | ❌ | backlinks absent → people→project impossible; edges carry no role/period |
| 10 | Interaction history | ❌ | no `interaction` type; `occurred`-range query undefined; single-home forces person-vs-project |

### (A) Verdict: sound skeleton; holds for pure hierarchy, breaks on cross-cutting relations. The central bet "multi-belonging lives in links" is right for storage, incomplete for retrieval. Every Cluster-2 failure = the unspecified query contract.

### (B) Top fixes
1. **Backlinks as first-class** (engine maintains reverse index on `links[].to`; `query(backlinks_to:id)` defined). Without it 2,9,10 permanently broken.
2. Add `due:<iso?>` to canonical block + a `commitment` type with structured `direction:i-owe|owed-to-me` + `counterparty`.
3. **Define the query contract IN the ADR** (filter by type / links[].rel / links[].to / occurred-due range / state). Schema is write-only without it.
