---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Related: docs/TREE.md, docs/00-canon/DOC-CONVENTION.md
---

# Migration Plan — Numbered Doc Tree

## 1. Survey summary

Total files counted: 103 (excluding this file and new skeleton READMEs).
Total directories (current): 15 inside docs/.

---

## 2. Group taxonomy

| Group | Prefix | Ordering basis | What lives here |
|-------|--------|----------------|-----------------|
| `00-canon` | `00-` | Importance/sequence (NN-) | STATE.md, DECISIONS-LOG, VISION, SYSTEM-IN-PLAIN-WORDS, ADRs, SPEC, CLAUDE.md ref, invariants-to-ratify |
| `10-synthesis` | `10-` | Date (YYYY-MM-DD-) | All SYNTHESIS-*, SWEEP-*, VERDICT-*, RATIONALE-*, CONCEPT-* after deliberation |
| `20-analysis` | `20-` | Date (YYYY-MM-DD-) | ANALYSIS-*, RESEARCH-*, DEEPDIVE-*, CAPABILITY-MAP-*, FACETS-EXPLAINED-*, UNIVERSAL-NODE-canvas, RATIONALE- |
| `30-plan` | `30-` | Date (YYYY-MM-DD-) | STRATEGY-*, REGLAMENT-*, plan files |
| `40-dialogue` | `40-` | Date (YYYY-MM-DD-) | THREAD-* dialogue graph files, DECISIONS-LOG cross-ref |
| `50-council` | `50-` | Date (YYYY-MM-DD-) | COUNCIL-* (non-raw synthesized council outputs) |
| `60-raw` | `60-` | Date (YYYY-MM-DD-) | council/raw/* — all agent raw outputs, by session date |
| `70-ideas` | `70-` | Date or sequence | IDEA-*, TASK-research files |
| `80-examples` | `80-` | Sequence | graph-example/* reference models |
| `90-historical` | `90-` | Date (YYYY-MM-DD-) | HANDOFF-2026-06-16 (stale), stress-test-2026-06-15-detailed (superseded by VERDICT), STRATEGY-2026-06-16 (if superseded), architecture/ runtime/chat files if no longer active |
| `99-qa` | `99-` | Sequence | VALIDATION-* qa files |

---

## 3. Migration map — every existing file

### GROUP 00-canon (ordered by importance/sequence)

| # | Current path | Proposed new path | Ordering basis | Notes |
|---|-------------|-------------------|----------------|-------|
| 1 | `docs/STATE.md` | `docs/00-canon/01-STATE.md` | importance: ALWAYS FIRST | Navigation anchor |
| 2 | `docs/DECISIONS-LOG.md` | `docs/00-canon/02-DECISIONS-LOG.md` | importance | Short-memory log, read second |
| 3 | `docs/product/VISION.md` | `docs/00-canon/03-VISION.md` | importance | Product north star |
| 4 | `docs/product/SYSTEM-IN-PLAIN-WORDS.md` | `docs/00-canon/04-SYSTEM-IN-PLAIN-WORDS.md` | importance | Plain explanation |
| 5 | `docs/architecture/ADR/ADR-0001-node-schema.md` | `docs/00-canon/ADR/ADR-0001-node-schema.md` | sequence (ADR number) | Keep ADR-NNNN naming |
| 6 | `docs/architecture/ADR/ADR-0002-thin-passport.md` | `docs/00-canon/ADR/ADR-0002-thin-passport.md` | sequence (ADR number) | Approved, ratified |
| 7 | `docs/spec/SPEC-core-kernel.md` | `docs/00-canon/SPEC/SPEC-core-kernel.md` | sequence | Core spec |

**OWNER DECISION NEEDED:**
- ADR-0004 "Engine" does not yet exist as a file — will be created at the spec stage. Put in `docs/00-canon/ADR/ADR-0004-engine.md`.
- `docs/product/CONCEPT-2026-06-15-data-model-stress-test.md` — is this now canon (ratified) or a synthesis artifact? Currently classified as `10-synthesis` below; move to `00-canon` if owner ratifies it explicitly.

---

### GROUP 10-synthesis (ordered by date)

| Current path | Proposed new path |
|-------------|-------------------|
| `docs/product/SWEEP-2026-06-23-series.md` | `docs/10-synthesis/2026-06-23-SWEEP-series.md` |
| `docs/product/SYNTHESIS-2026-06-21-next.md` | `docs/10-synthesis/2026-06-21-SYNTHESIS-next.md` |
| `docs/product/SYNTHESIS-2026-06-23-dogfood-schema.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-dogfood-schema.md` |
| `docs/product/SYNTHESIS-2026-06-23-engine-spec.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-engine-spec.md` |
| `docs/product/SYNTHESIS-2026-06-23-q3-dual-role.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-q3-dual-role.md` |
| `docs/product/SYNTHESIS-2026-06-23-smart-categories.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-smart-categories.md` |
| `docs/product/SYNTHESIS-2026-06-23-stress-test.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-stress-test.md` |
| `docs/product/SYNTHESIS-2026-06-23-valve-rules.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-valve-rules.md` |
| `docs/product/SYNTHESIS-2026-06-23-verbs-and-containers.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-verbs-and-containers.md` |
| `docs/product/SYNTHESIS-2026-06-23-version-edges-stream.md` | `docs/10-synthesis/2026-06-23-SYNTHESIS-version-edges-stream.md` |
| `docs/product/SYNTHESIS-2026-06-24-competitors.md` | `docs/10-synthesis/2026-06-24-SYNTHESIS-competitors.md` |
| `docs/product/VERDICT-2026-06-15-adr0001-stress.md` | `docs/10-synthesis/2026-06-15-VERDICT-adr0001-stress.md` |
| `docs/product/VERDICT-2026-06-19-facets-multicritic.md` | `docs/10-synthesis/2026-06-19-VERDICT-facets-multicritic.md` |
| `docs/product/VERDICT-2026-06-21-ratify.md` | `docs/10-synthesis/2026-06-21-VERDICT-ratify.md` |
| `docs/product/VERDICT2-2026-06-15-advanced.md` | `docs/10-synthesis/2026-06-15-VERDICT2-advanced.md` |
| `docs/product/CONCEPT-2026-06-15-data-model-stress-test.md` | `docs/10-synthesis/2026-06-15-CONCEPT-data-model-stress-test.md` |
| `docs/product/CONCEPT-2026-06-21-dialogue-as-data.md` | `docs/10-synthesis/2026-06-21-CONCEPT-dialogue-as-data.md` |
| `docs/council/COUNCIL-2026-06-13-architecture.md` | `docs/10-synthesis/2026-06-13-COUNCIL-architecture.md` |
| `docs/council/COUNCIL-2026-06-13-first-slice.md` | `docs/10-synthesis/2026-06-13-COUNCIL-first-slice.md` |
| `docs/council/COUNCIL-2026-06-13-reframe.md` | `docs/10-synthesis/2026-06-13-COUNCIL-reframe.md` |
| `docs/council/COUNCIL-2026-06-14-c1-node-meaning.md` | `docs/10-synthesis/2026-06-14-COUNCIL-c1-node-meaning.md` |
| `docs/council/COUNCIL-2026-06-14-c2-links-and-shadow.md` | `docs/10-synthesis/2026-06-14-COUNCIL-c2-links-and-shadow.md` |
| `docs/council/COUNCIL-2026-06-14-strategy-A-subscription-layer.md` | `docs/10-synthesis/2026-06-14-COUNCIL-strategy-A-subscription-layer.md` |
| `docs/council/COUNCIL-2026-06-14-strategy-B-api-runtime.md` | `docs/10-synthesis/2026-06-14-COUNCIL-strategy-B-api-runtime.md` |
| `docs/council/COUNCIL-2026-06-14-synthesis-A-vs-B.md` | `docs/10-synthesis/2026-06-14-COUNCIL-synthesis-A-vs-B.md` |

**Count: 25 files → 10-synthesis**

---

### GROUP 20-analysis (ordered by date)

| Current path | Proposed new path |
|-------------|-------------------|
| `docs/product/ANALYSIS-2026-06-12-multi-lens.md` | `docs/20-analysis/2026-06-12-ANALYSIS-multi-lens.md` |
| `docs/product/ANALYSIS-2026-06-14-data-cell-and-modules.md` | `docs/20-analysis/2026-06-14-ANALYSIS-data-cell-and-modules.md` |
| `docs/product/ANALYSIS-2026-06-14-information-model.md` | `docs/20-analysis/2026-06-14-ANALYSIS-information-model.md` |
| `docs/product/CAPABILITY-MAP-2026-06-15-knowledge-base.md` | `docs/20-analysis/2026-06-15-CAPABILITY-MAP-knowledge-base.md` |
| `docs/product/DEEPDIVE-2026-06-15-c2c3-extract-route.md` | `docs/20-analysis/2026-06-15-DEEPDIVE-c2c3-extract-route.md` |
| `docs/product/FACETS-EXPLAINED-2026-06-19.md` | `docs/20-analysis/2026-06-19-FACETS-EXPLAINED.md` |
| `docs/product/RATIONALE-2026-06-19-two-foundations.md` | `docs/20-analysis/2026-06-19-RATIONALE-two-foundations.md` |
| `docs/product/RESEARCH-2026-06-21-load-bearing.md` | `docs/20-analysis/2026-06-21-RESEARCH-load-bearing.md` |
| `docs/product/UNIVERSAL-NODE-2026-06-16-canvas.md` | `docs/20-analysis/2026-06-16-UNIVERSAL-NODE-canvas.md` |
| `docs/research/RESEARCH-2026-06-14-graph-architecture.md` | `docs/20-analysis/2026-06-14-RESEARCH-graph-architecture.md` |
| `docs/architecture/AGENT-WORKSPACES.md` | `docs/20-analysis/AGENT-WORKSPACES.md` |
| `docs/architecture/AGENTS-CATALOG.md` | `docs/20-analysis/AGENTS-CATALOG.md` |
| `docs/architecture/CHAT-HIERARCHY-AND-CONTEXT.md` | `docs/20-analysis/CHAT-HIERARCHY-AND-CONTEXT.md` |
| `docs/architecture/CLAUDE-CODE-RUNTIME-OPTIONS.md` | `docs/20-analysis/CLAUDE-CODE-RUNTIME-OPTIONS.md` |

**OWNER DECISION NEEDED:** The 4 `docs/architecture/` files (AGENT-WORKSPACES, AGENTS-CATALOG, CHAT-HIERARCHY, CLAUDE-CODE-RUNTIME-OPTIONS) — are these active reference docs or analysis artifacts? If still actively referenced → keep in `architecture/` or move to `00-canon`. If reference only → `20-analysis`.

**Count: 14 files → 20-analysis**

---

### GROUP 30-plan (ordered by date)

| Current path | Proposed new path |
|-------------|-------------------|
| `docs/plan/STRATEGY-2026-06-16-stages.md` | `docs/30-plan/2026-06-16-STRATEGY-stages.md` |
| `docs/plan/STRATEGY-2026-06-21-next-steps.md` | `docs/30-plan/2026-06-21-STRATEGY-next-steps.md` |
| `docs/plan/STRATEGY-2026-06-23-smart-categories.md` | `docs/30-plan/2026-06-23-STRATEGY-smart-categories.md` |
| `docs/plan/REGLAMENT-2026-06-23-execution-sequence.md` | `docs/30-plan/2026-06-23-REGLAMENT-execution-sequence.md` |

**Count: 4 files → 30-plan**

---

### GROUP 40-dialogue (ordered by date)

| Current path | Proposed new path |
|-------------|-------------------|
| `docs/dialogue/THREAD-2026-06-15-foundation.md` | `docs/40-dialogue/2026-06-15-THREAD-foundation.md` |

**Count: 1 file → 40-dialogue**
*(More THREAD-* files expected as dialogue continues — always date-prefixed)*

---

### GROUP 60-raw (ordered by date — mirrors current structure)

All files under `docs/council/raw/` retain their session-folder structure, moved under `docs/60-raw/`:

| Current folder | Proposed new folder |
|---------------|---------------------|
| `docs/council/raw/README.md` | `docs/60-raw/README.md` |
| `docs/council/raw/2026-06-15-c2c3-extract-route/` | `docs/60-raw/2026-06-15-c2c3-extract-route/` |
| `docs/council/raw/2026-06-15-cluster4-schema-stress/` | `docs/60-raw/2026-06-15-cluster4-schema-stress/` |
| `docs/council/raw/2026-06-15-stress-adr0001/` | `docs/60-raw/2026-06-15-stress-adr0001/` |
| `docs/council/raw/2026-06-15-stress2-advanced/` | `docs/60-raw/2026-06-15-stress2-advanced/` |
| `docs/council/raw/2026-06-16-universal-node/` | `docs/60-raw/2026-06-16-universal-node/` |
| `docs/council/raw/2026-06-19-facets-multicritic/` | `docs/60-raw/2026-06-19-facets-multicritic/` |
| `docs/council/raw/2026-06-21-load-bearing/` | `docs/60-raw/2026-06-21-load-bearing/` |
| `docs/council/raw/2026-06-21-passport-lock/` | `docs/60-raw/2026-06-21-passport-lock/` |
| `docs/council/raw/2026-06-21-ratify/` | `docs/60-raw/2026-06-21-ratify/` |
| `docs/council/raw/2026-06-23-series/` | `docs/60-raw/2026-06-23-series/` |
| `docs/council/raw/2026-06-23-stage1-inventory/` | `docs/60-raw/2026-06-23-stage1-inventory/` |
| `docs/council/raw/2026-06-23-stress-github-scenario/` | `docs/60-raw/2026-06-23-stress-github-scenario/` |
| `docs/council/raw/2026-06-23-verbs-and-containers/` | `docs/60-raw/2026-06-23-verbs-and-containers/` |
| `docs/council/raw/2026-06-24-agent-memory/` | `docs/60-raw/2026-06-24-agent-memory/` |
| `docs/council/raw/2026-06-24-competitors/` | `docs/60-raw/2026-06-24-competitors/` |
| `docs/council/raw/2026-06-24-doc-tree/` | `docs/60-raw/2026-06-24-doc-tree/` *(this file)* |
| `docs/council/raw/2026-06-24-engine/` | `docs/60-raw/2026-06-24-engine/` |
| `docs/council/raw/2026-06-24-viewer/` | `docs/60-raw/2026-06-24-viewer/` |

**Count: ~70 files (all raw agent outputs) → 60-raw**

---

### GROUP 70-ideas (ordered by date or topic)

| Current path | Proposed new path |
|-------------|-------------------|
| `docs/ideas/IDEA-agent-context-budget.md` | `docs/70-ideas/IDEA-agent-context-budget.md` |
| `docs/ideas/IDEA-session-per-message-autolink.md` | `docs/70-ideas/IDEA-session-per-message-autolink.md` |
| `docs/ideas/IDEA-sources-ingestion.md` | `docs/70-ideas/IDEA-sources-ingestion.md` |
| `docs/ideas/IDEA-task-ownership.md` | `docs/70-ideas/IDEA-task-ownership.md` |
| `docs/ideas/README.md` | `docs/70-ideas/README.md` |
| `docs/ideas/TASK-cost-accounting-research.md` | `docs/70-ideas/TASK-cost-accounting-research.md` |

**Count: 6 files → 70-ideas**

---

### GROUP 80-examples (reference models — ordered by topic)

| Current path | Proposed new path |
|-------------|-------------------|
| `docs/graph-example/README.md` | `docs/80-examples/README.md` |
| `docs/graph-example/category-service.md` | `docs/80-examples/category-service.md` |
| `docs/graph-example/decision-adr0002.md` | `docs/80-examples/decision-adr0002.md` |
| `docs/graph-example/file-node-ts.md` | `docs/80-examples/file-node-ts.md` |
| `docs/graph-example/goal-second-brain.md` | `docs/80-examples/goal-second-brain.md` |
| `docs/graph-example/insight-multidimensionality.md` | `docs/80-examples/insight-multidimensionality.md` |

**Count: 6 files → 80-examples**

---

### GROUP 90-historical (stale / superseded — kept, never deleted)

| Current path | Proposed new path | Reason |
|-------------|-------------------|----|
| `docs/HANDOFF-2026-06-16.md` | `docs/90-historical/2026-06-16-HANDOFF.md` | Explicitly marked stale in STATE.md |
| `docs/product/stress-test-2026-06-15-detailed.md` | `docs/90-historical/2026-06-15-stress-test-detailed.md` | Superseded by VERDICT files |

**OWNER DECISION NEEDED:** `docs/plan/STRATEGY-2026-06-16-stages.md` — is this still active or superseded by 2026-06-21 strategy? If superseded → move to 90-historical.

**Count: 2 confirmed → 90-historical; 1 ambiguous**

---

### GROUP 99-qa

| Current path | Proposed new path |
|-------------|-------------------|
| `docs/qa/VALIDATION-0002-10cells.md` | `docs/99-qa/VALIDATION-0002-10cells.md` |

**Count: 1 file → 99-qa**

---

## 4. Ambiguous items requiring owner decision

| # | File | Question | Options |
|---|------|----------|---------|
| A1 | `docs/product/CONCEPT-2026-06-15-data-model-stress-test.md` | Ratified canon or synthesis artifact? | → `00-canon` or `10-synthesis` |
| A2 | `docs/architecture/AGENT-WORKSPACES.md` | Active reference or analysis? | → `00-canon/arch-ref/` or `20-analysis` |
| A3 | `docs/architecture/AGENTS-CATALOG.md` | Active reference or analysis? | → `00-canon/arch-ref/` or `20-analysis` |
| A4 | `docs/architecture/CHAT-HIERARCHY-AND-CONTEXT.md` | Active reference or analysis? | → `00-canon/arch-ref/` or `20-analysis` |
| A5 | `docs/architecture/CLAUDE-CODE-RUNTIME-OPTIONS.md` | Active reference or analysis? | → `00-canon/arch-ref/` or `20-analysis` |
| A6 | `docs/plan/STRATEGY-2026-06-16-stages.md` | Still active or superseded? | → `30-plan` (active) or `90-historical` |

---

## 5. File count summary

| Group | Count |
|-------|-------|
| 00-canon | 7 (+ 6 ambiguous) |
| 10-synthesis | 25 |
| 20-analysis | 10 (+ 4 ambiguous) |
| 30-plan | 4 (1 ambiguous) |
| 40-dialogue | 1 |
| 60-raw | ~70 files |
| 70-ideas | 6 |
| 80-examples | 6 |
| 90-historical | 2 (+ 1 ambiguous) |
| 99-qa | 1 |
| **TOTAL** | **~132** |

---

## 6. Naming convention (proposed)

### Logs and session outputs → DATE prefix: `YYYY-MM-DD-`
Applies to: `10-synthesis`, `20-analysis`, `30-plan`, `40-dialogue`, `60-raw` sessions.
Within a session folder in `60-raw`, files keep their role names (analyst.md, architect.md, etc.).

### Canon and specs → IMPORTANCE/SEQUENCE prefix: `NN-` or `ADR-NNNN`
Applies to: `00-canon` top-level files (01-STATE, 02-DECISIONS-LOG…), ADRs, SPECs.
ADRs keep `ADR-NNNN-title.md` convention.

### Ideas and examples → topic name (no date needed, sorted alphabetically)
Applies to: `70-ideas`, `80-examples`.

### New files always get: date prefix if they are time-bound session outputs; sequence prefix if they are canon/decisions.

---

*End of migration plan. This file stays in 60-raw as the agent output that produced the skeleton.*
