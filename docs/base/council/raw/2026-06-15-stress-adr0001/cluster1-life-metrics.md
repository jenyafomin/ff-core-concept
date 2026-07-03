# RAW — Stress ADR-0001 · Cluster 1 (Life / Metrics) · analyst · 2026-06-15
> Condensed-faithful. Synthesis: `docs/product/VERDICT-2026-06-15-adr0001-stress.md`.

Tally: 4✅ / 6⚠️ / 2❌.

ADR-0001 WINS vs v1: `occurred`+`valid_from/until` top-level (fixes 6/10 prior time complaints); `typeBlock.measurement{metric,value,unit}` (fixes "all in meta"); `epistemic:hypothesis/proposal` (insights, vague obs); `rel:also-serves`+one-home (cross-belonging Finance×Sport).

### Verdict matrix
| # | Scenario | V | Gap (field) |
|---|---|---|---|
| 1 | Workout 80kg×5 | ⚠️ | `measurement` single-scalar; no slot for `reps` (compound) |
| 2 | Bodyweight time series | ✅ | holds; (caveat: no query contract for series) |
| 3 | Meditation habit+streak | ⚠️ | NO `recurrence`/`schedule` field; streak (derived) homeless |
| 4 | Health goal+sub-goals | ⚠️ | goal `state` values unspecified; no progress rollup |
| 5 | Gym subscription (cross) | ✅ | `also-serves`+one home by design (needs backlink to query from Sport) |
| 6 | Recurring monthly expense | ❌ | no recurrence primitive; valid_until≠repeat pattern |
| 7 | Budget planned vs actual | ❌ | `measurement` single-value; dual-value (planned+actual) breaks |
| 8 | Birthday yearly | ⚠️ | recurrence gap; `occurred` misused for annual |
| 9 | Meditation insight | ✅ | `epistemic:hypothesis` clean |
| 10 | "Feeling tired" vague | ✅ | `epistemic:proposal`+`stage:inbox` exact use |
| 11 | Running dist+duration | ⚠️ | compound measurement (same as #1) |
| 12 | Savings rate (derived) | ⚠️ | no `derived` flag / invalidation |

### (A) Verdict: needs 3 changes. Root causes:
1. **No recurrence/schedule primitive** (3,6,8) — models a truth-window, not a repeating pattern.
2. **Measurement is single-scalar** (1,7,11) — compound (weight+reps, planned+actual) impossible without node-explosion.
3. **No derived/rollup contract** (4,12) — goals/budgets/KPIs derived from children go stale or need undefined query.

### (B) Top fixes
1. Add `recurrence: <rrule|simple?>` to TIME axis (null=one-time).
2. Extend measurement: `value/unit` + optional `secondary:[{value,unit,label}]` + `derived:bool`.
3. Specify `goal`/`habit` type state-machines in the registry (goal: open|in-progress|achieved|failed|abandoned; habit: active|paused|broken|archived).
