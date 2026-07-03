---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
---

# Documentation Tree — FF Personal Management

> Master index. Read this to navigate. Updated whenever the structure changes.
> Convention: `docs/00-canon/DOC-CONVENTION.md`

---

## TARGET structure (proposed — owner executes migration)

```
docs/
│
├── TREE.md                          ← THIS FILE — master navigation index
│
├── 00-canon/                        ← SOURCE OF TRUTH (approved, ordered by importance)
│   ├── README.md
│   ├── DOC-CONVENTION.md            ← convention rules (this doc system)
│   ├── 01-STATE.md                  ← [TARGET] from docs/STATE.md — read FIRST
│   ├── 02-DECISIONS-LOG.md          ← [TARGET] from docs/DECISIONS-LOG.md
│   ├── 03-VISION.md                 ← [TARGET] from docs/product/VISION.md
│   ├── 04-SYSTEM-IN-PLAIN-WORDS.md  ← [TARGET] from docs/product/SYSTEM-IN-PLAIN-WORDS.md
│   ├── ADR/
│   │   ├── ADR-0001-node-schema.md  ← [TARGET] from docs/architecture/ADR/ADR-0001-*
│   │   └── ADR-0002-thin-passport.md← [TARGET] from docs/architecture/ADR/ADR-0002-*
│   └── SPEC/
│       └── SPEC-core-kernel.md      ← [TARGET] from docs/spec/SPEC-core-kernel.md
│
├── 10-synthesis/                    ← DELIBERATION OUTPUTS (ordered by date)
│   ├── README.md
│   ├── 2026-06-13-COUNCIL-architecture.md
│   ├── 2026-06-13-COUNCIL-first-slice.md
│   ├── 2026-06-13-COUNCIL-reframe.md
│   ├── 2026-06-14-COUNCIL-c1-node-meaning.md
│   ├── 2026-06-14-COUNCIL-c2-links-and-shadow.md
│   ├── 2026-06-14-COUNCIL-strategy-A-subscription-layer.md
│   ├── 2026-06-14-COUNCIL-strategy-B-api-runtime.md
│   ├── 2026-06-14-COUNCIL-synthesis-A-vs-B.md
│   ├── 2026-06-15-CONCEPT-data-model-stress-test.md
│   ├── 2026-06-15-VERDICT-adr0001-stress.md
│   ├── 2026-06-15-VERDICT2-advanced.md
│   ├── 2026-06-19-VERDICT-facets-multicritic.md
│   ├── 2026-06-21-CONCEPT-dialogue-as-data.md
│   ├── 2026-06-21-SYNTHESIS-next.md
│   ├── 2026-06-21-VERDICT-ratify.md
│   ├── 2026-06-23-SWEEP-series.md               ← FRESHEST entry (20-agent series)
│   ├── 2026-06-23-SYNTHESIS-dogfood-schema.md
│   ├── 2026-06-23-SYNTHESIS-engine-spec.md
│   ├── 2026-06-23-SYNTHESIS-q3-dual-role.md
│   ├── 2026-06-23-SYNTHESIS-smart-categories.md
│   ├── 2026-06-23-SYNTHESIS-stress-test.md
│   ├── 2026-06-23-SYNTHESIS-valve-rules.md
│   ├── 2026-06-23-SYNTHESIS-verbs-and-containers.md
│   ├── 2026-06-23-SYNTHESIS-version-edges-stream.md
│   └── 2026-06-24-SYNTHESIS-competitors.md
│
├── 20-analysis/                     ← ANALYSIS ARTIFACTS (ordered by date)
│   ├── README.md
│   ├── 2026-06-12-ANALYSIS-multi-lens.md
│   ├── 2026-06-14-ANALYSIS-data-cell-and-modules.md
│   ├── 2026-06-14-ANALYSIS-information-model.md
│   ├── 2026-06-14-RESEARCH-graph-architecture.md
│   ├── 2026-06-15-CAPABILITY-MAP-knowledge-base.md
│   ├── 2026-06-15-DEEPDIVE-c2c3-extract-route.md
│   ├── 2026-06-16-UNIVERSAL-NODE-canvas.md
│   ├── 2026-06-19-FACETS-EXPLAINED.md
│   ├── 2026-06-19-RATIONALE-two-foundations.md
│   ├── 2026-06-21-RESEARCH-load-bearing.md
│   ├── AGENT-WORKSPACES.md          ← [OWNER DECISION: canon ref or analysis?]
│   ├── AGENTS-CATALOG.md            ← [OWNER DECISION: canon ref or analysis?]
│   ├── CHAT-HIERARCHY-AND-CONTEXT.md← [OWNER DECISION: canon ref or analysis?]
│   └── CLAUDE-CODE-RUNTIME-OPTIONS.md← [OWNER DECISION: canon ref or analysis?]
│
├── 30-plan/                         ← PLANS AND STRATEGIES (ordered by date)
│   ├── README.md
│   ├── 2026-06-16-STRATEGY-stages.md      ← [OWNER DECISION: active or historical?]
│   ├── 2026-06-21-STRATEGY-next-steps.md
│   ├── 2026-06-23-REGLAMENT-execution-sequence.md
│   └── 2026-06-23-STRATEGY-smart-categories.md
│
├── 40-dialogue/                     ← DESIGN DIALOGUE GRAPH (ordered by date)
│   ├── README.md
│   └── 2026-06-15-THREAD-foundation.md
│
├── 60-raw/                          ← RAW AGENT OUTPUTS (immutable, ordered by date)
│   ├── README.md
│   ├── 2026-06-15-c2c3-extract-route/
│   │   ├── abstract.md
│   │   ├── analyst.md
│   │   ├── architect.md
│   │   └── critic.md
│   ├── 2026-06-15-cluster4-schema-stress/
│   │   └── architect.md
│   ├── 2026-06-15-stress-adr0001/
│   │   ├── cluster1-life-metrics.md
│   │   ├── cluster2-career-people.md
│   │   ├── cluster3-technical.md
│   │   ├── cluster4-agents-substrate.md
│   │   └── cluster5-adversarial.md
│   ├── 2026-06-15-stress2-advanced/
│   │   ├── clusterA-type-lifecycle.md
│   │   ├── clusterB-variants.md
│   │   ├── clusterC-logic.md
│   │   ├── clusterD-abac.md
│   │   └── clusterE-constraints.md
│   ├── 2026-06-16-universal-node/
│   │   ├── agentA-abstract.md
│   │   └── agentB-architect.md
│   ├── 2026-06-19-facets-multicritic/
│   │   ├── wave1-all.md
│   │   └── wave2-all.md
│   ├── 2026-06-21-load-bearing/
│   │   ├── abstract.md, analyst.md, architect.md, critic.md
│   ├── 2026-06-21-passport-lock/
│   │   ├── advocate-field.md, advocate-lens.md, architect-confirm.md
│   ├── 2026-06-21-ratify/
│   │   ├── nextstep.md, redteam.md, review.md
│   ├── 2026-06-23-series/
│   │   ├── dogfood-schema/, engine-spec/, q3-dual-role/,
│   │   ├── smart-categories/, valve-rules/, version-edges-stream/
│   ├── 2026-06-23-stage1-inventory/
│   ├── 2026-06-23-stress-github-scenario/
│   ├── 2026-06-23-verbs-and-containers/
│   ├── 2026-06-24-agent-memory/
│   ├── 2026-06-24-competitors/
│   ├── 2026-06-24-doc-tree/          ← migration-plan.md (this task)
│   ├── 2026-06-24-engine/
│   └── 2026-06-24-viewer/
│
├── 70-ideas/                        ← IDEAS AND RESEARCH STUBS (alphabetical)
│   ├── README.md
│   ├── IDEA-agent-context-budget.md
│   ├── IDEA-session-per-message-autolink.md
│   ├── IDEA-sources-ingestion.md
│   ├── IDEA-task-ownership.md
│   └── TASK-cost-accounting-research.md
│
├── 80-examples/                     ← REFERENCE EXAMPLES (alphabetical)
│   ├── README.md
│   ├── category-service.md
│   ├── decision-adr0002.md
│   ├── file-node-ts.md
│   ├── goal-second-brain.md
│   └── insight-multidimensionality.md
│
├── 90-historical/                   ← HISTORICAL / SUPERSEDED (never deleted, date prefix)
│   ├── README.md
│   ├── 2026-06-15-stress-test-detailed.md  ← from docs/product/stress-test-2026-06-15-detailed.md
│   └── 2026-06-16-HANDOFF.md               ← from docs/HANDOFF-2026-06-16.md
│
└── 99-qa/                           ← VALIDATION AND QA (sequence-prefixed)
    ├── README.md
    └── VALIDATION-0002-10cells.md
```

---

## CURRENT structure (before migration)

```
docs/
├── STATE.md                         → TARGET: 00-canon/01-STATE.md
├── DECISIONS-LOG.md                 → TARGET: 00-canon/02-DECISIONS-LOG.md
├── HANDOFF-2026-06-16.md            → TARGET: 90-historical/2026-06-16-HANDOFF.md
├── TREE.md                          ← NEW (this file)
│
├── architecture/
│   ├── ADR/
│   │   ├── ADR-0001-node-schema.md  → TARGET: 00-canon/ADR/ADR-0001-node-schema.md
│   │   └── ADR-0002-thin-passport.md→ TARGET: 00-canon/ADR/ADR-0002-thin-passport.md
│   ├── AGENT-WORKSPACES.md          → TARGET: 20-analysis/ [OWNER DECISION]
│   ├── AGENTS-CATALOG.md            → TARGET: 20-analysis/ [OWNER DECISION]
│   ├── CHAT-HIERARCHY-AND-CONTEXT.md→ TARGET: 20-analysis/ [OWNER DECISION]
│   └── CLAUDE-CODE-RUNTIME-OPTIONS.md→TARGET: 20-analysis/ [OWNER DECISION]
│
├── council/
│   ├── COUNCIL-2026-06-13-*.md (×3) → TARGET: 10-synthesis/
│   ├── COUNCIL-2026-06-14-*.md (×5) → TARGET: 10-synthesis/
│   └── raw/                         → TARGET: 60-raw/ (keep session structure)
│
├── dialogue/
│   └── THREAD-2026-06-15-foundation.md → TARGET: 40-dialogue/
│
├── graph-example/                   → TARGET: 80-examples/
│
├── ideas/                           → TARGET: 70-ideas/
│
├── plan/                            → TARGET: 30-plan/
│
├── product/
│   ├── VISION.md                    → TARGET: 00-canon/03-VISION.md
│   ├── SYSTEM-IN-PLAIN-WORDS.md     → TARGET: 00-canon/04-SYSTEM-IN-PLAIN-WORDS.md
│   ├── ANALYSIS-*.md (×3)           → TARGET: 20-analysis/
│   ├── CAPABILITY-MAP-*.md          → TARGET: 20-analysis/
│   ├── CONCEPT-*.md (×2)            → TARGET: 10-synthesis/
│   ├── DEEPDIVE-*.md                → TARGET: 20-analysis/
│   ├── FACETS-EXPLAINED-*.md        → TARGET: 20-analysis/
│   ├── RATIONALE-*.md               → TARGET: 20-analysis/
│   ├── RESEARCH-*.md                → TARGET: 20-analysis/
│   ├── SWEEP-*.md                   → TARGET: 10-synthesis/
│   ├── SYNTHESIS-*.md (×9+)         → TARGET: 10-synthesis/
│   ├── UNIVERSAL-NODE-*.md          → TARGET: 20-analysis/
│   ├── VERDICT-*.md (×3)            → TARGET: 10-synthesis/
│   └── stress-test-*.md             → TARGET: 90-historical/
│
├── qa/                              → TARGET: 99-qa/
│
├── research/                        → TARGET: 20-analysis/
│
└── spec/                            → TARGET: 00-canon/SPEC/
```

---

## Navigation guide

| I want to... | Start here |
|--------------|------------|
| Resume after compact | `00-canon/01-STATE.md` |
| See all key decisions in 1 min | `00-canon/02-DECISIONS-LOG.md` |
| Understand the product vision | `00-canon/03-VISION.md` |
| Read the schema decisions | `00-canon/ADR/` |
| Find the latest synthesis | `10-synthesis/` (latest date at bottom) |
| Trace HOW a decision was made | `40-dialogue/2026-06-15-THREAD-foundation.md` |
| Find raw agent debate output | `60-raw/YYYY-MM-DD-session-name/` |
| Understand this doc system | `00-canon/DOC-CONVENTION.md` |

---

## Owner decisions needed before migration can complete

| # | Question | Options |
|---|----------|---------|
| A1 | Is `product/CONCEPT-2026-06-15-data-model-stress-test.md` ratified canon? | → `00-canon` or `10-synthesis` |
| A2-A5 | Are the 4 `architecture/` non-ADR files active canon references? | → `00-canon/arch-ref/` or `20-analysis/` |
| A6 | Is `plan/STRATEGY-2026-06-16-stages.md` still active? | → `30-plan/` or `90-historical/` |
