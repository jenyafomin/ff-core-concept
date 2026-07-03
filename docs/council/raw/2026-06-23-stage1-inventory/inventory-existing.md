# As-Is Inventory — FF Personal Management

- **Role:** analyst
- **Date:** 2026-06-23
- **Topic:** Faithful as-is inventory of the FF-Personal-Management project as it physically exists today.
- **Phase rule:** This document records reality only — what exists, what is done, what is in-progress, what is planned. No design proposals.

---

## 1. Project Structure / Root

```
/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/
├── CLAUDE.md                  # Project instructions (POS-compliant, 100 lines)
├── README.md                  # Brief project README
├── package.json               # Monorepo root (npm workspaces)
├── package-lock.json
├── tsconfig.base.json         # Shared TS base config
├── skills-lock.json           # vercel-labs skills lock file
├── .gitignore
├── .claude/
│   ├── settings.local.json    # Local Claude Code permissions
│   └── skills/find-skills     # Project-installed skill (find-skills)
├── packages/
│   └── core/                  # @ff/core — the only package; node-graph kernel
├── tools/
│   ├── whisper/               # Voice transcription tooling
│   └── telegram/              # Telegram message formatting / bundling
├── docs/                      # All design artifacts (see §4)
└── node_modules/
```

**Root config:** `package.json` defines a private npm monorepo (`workspaces: ["packages/*"]`), Node ≥20, top-level scripts delegate to workspaces (`build`, `test`, `typecheck`, `demo`).

---

## 2. Code — `packages/core` (`@ff/core`)

**Status: DONE (v1, implemented; tests passing; NOT yet committed to git — working tree was clean at git status)**

### Purpose
Node-graph kernel. Files-as-graph store: one node = one `.md` file with YAML frontmatter. No DB, no network. Human-readable, git-friendly. Implements the v1 node model (ADR-0001 schema, now superseded by ADR-0002 design; code has NOT been rewritten to ADR-0002 yet).

### Source files (`packages/core/src/`)

| File | Role | Status |
|------|------|--------|
| `node.ts` | Core `FFNode` type + `NodeKind` / `Importance` / `TaskStatus` / `Link` | done |
| `schema.ts` | Zod frontmatter schema (validation on read/write) | done |
| `id.ts` | ULID generation + kind-prefix mapping | done |
| `store.ts` | `FileNodeStore` class — full CRUD + `list` / `query` / `children` / `ancestors` / `link` | done |
| `levels.ts` | `renderLevel(node, L1|L2|L3)` — computed zoom from title/body | done |
| `context.ts` | `contextLayers` / `effectiveContext` — cascade up `parentId` chain | done |
| `trace.ts` | `recordTrace` — writes a `trace` node linking read/wrote/in IDs | done |
| `index.ts` | Re-exports all of the above | done |

### Public API surface (exports)
- **Types:** `FFNode`, `NodeInput`, `NodeKind`, `NODE_KINDS`, `Importance`, `TaskStatus`, `Link`, `Level`, `QueryFilter`, `ContextLayer`, `TraceInput`
- **Classes/functions:** `FileNodeStore`, `newId`, `prefixFor`, `renderLevel`, `snippet`, `contextLayers`, `effectiveContext`, `recordTrace`

### Node model (v1, implemented)
`FFNode` fields: `id` (ULID) · `kind` (9 kinds: task/note/thought/group/chat/agent/message/trace/summary) · `title` · `body` · `tags[]` · `parentId?` · `links[]{to,rel}` · `status?` (task-only) · `due?` · `importance` (low/normal/high/pinned) · `context?` · `actor?` · `created` · `updated` · `meta?`.

**Note:** This is ADR-0001 schema. ADR-0002 (approved) changes: `importance` → `priority` on edge; `home` → flag on edge; adds `epistemic`/`sensitivity`/`source`/`principal`/`schema` fields. The code has NOT been updated to ADR-0002. Explicitly "строй" awaits owner command.

### Tests (`packages/core/test/`)
- `store.test.ts` — CRUD, query, children, ancestors, link
- `levels.test.ts` — L1/L2/L3 rendering
- `context.test.ts` — context cascade
- `trace.test.ts` — trace recording

**14/14 tests passing** (per STATE.md; confirmed as of last build). Build emits `dist/` with `.d.ts`. `npm run demo` runs `demo/demo.ts` (full flow demonstration).

### Build / monorepo setup
- npm workspaces, TypeScript 5.6, `tsx` for demo, `vitest` for tests, `gray-matter` for frontmatter parsing, `zod` for schema validation.
- `tsconfig.base.json` at root; `packages/core/tsconfig.json` extends it.
- `dist/` directory exists (built).

---

## 3. Tools

### `tools/whisper/`

| Item | Description | Status |
|------|-------------|--------|
| `transcribe.sh` | Shell script: audio file → 16kHz mono WAV (via ffmpeg) → whisper-cli → `.txt` transcript saved to `transcripts/`. Accepts `.ogg/.mp3/.m4a/.wav`. Default model: `large-v3-turbo-q5_0`. Args: `<audio-file> [language|auto] [model-name]`. | done |
| `models/` | Directory for whisper.cpp model binaries (not tracked in git) | done |
| `transcripts/` | Output directory for `.txt` transcripts | done |
| `incoming/` | Drop zone for audio files to transcribe | done |
| `README.md` | Usage docs | done |

**Dependencies (system):** `ffmpeg`, `whisper-cli` (via `brew install whisper-cpp`).

### `tools/telegram/`

| Item | Description | Status |
|------|-------------|--------|
| `md2tg.mjs` | Node.js: Markdown → Telegram MarkdownV2 (or `--plain`). Handles bold/italic/code/links; escapes reserved chars. Read from file or stdin, write to stdout. Used before sending messages via Telegram reply tool. | done |
| `bundle-md.mjs` | Node.js: bundles multiple `.md` files into one with TOC and dividers. Args: `[-o out.md] [-t "Title"] file1.md file2.md ...`. Purpose: send analysis results as one file instead of many. | done |
| `README.md` | Usage docs | done |

**Invocation convention:** `node tools/telegram/md2tg.mjs [--plain] file.md`, `node tools/telegram/bundle-md.mjs -t "Title" -o out.md file1.md file2.md ...`.

---

## 4. Docs — Full Enumeration

### State / Handoff
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/STATE.md` | state/handoff | Master save-point: current phase, what's built, data model arc (N-001→N-083), open questions to owner, key doc map. **Read first.** |
| `docs/HANDOFF-2026-06-16.md` | state/handoff | Detailed session handoff from 2026-06-16: full reasoning arc, node model = "interpretation passport" + 11 facets, 3 open questions, resume checklist. Read second. |
| `docs/DECISIONS-LOG.md` | decisions-log | Flat chronological log of key decisions (lightweight, one line each); 4 entries covering 2026-06-21 to 2026-06-23. |

### Product / Vision
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/product/VISION.md` | vision | Full product vision: platform for life management, two modules (knowledge graph + agent management), §7 agent catalog. |
| `docs/product/SYSTEM-IN-PLAIN-WORDS.md` | vision | Plain-language explanation of the system for onboarding. |

### Product — Analysis
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/product/ANALYSIS-2026-06-12-multi-lens.md` | analysis | Multi-lens analysis from 2026-06-12: early product decomposition. |
| `docs/product/ANALYSIS-2026-06-14-data-cell-and-modules.md` | analysis | Data cell + modules model from 2026-06-14. |
| `docs/product/ANALYSIS-2026-06-14-information-model.md` | analysis | Information model analysis (early pass). |
| `docs/product/CAPABILITY-MAP-2026-06-15-knowledge-base.md` | analysis | Capability map for the knowledge base module. |
| `docs/product/stress-test-2026-06-15-detailed.md` | analysis | Detailed 50-cell stress-test workbook for ADR-0001. |

### Product — Concept / Design
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/product/CONCEPT-2026-06-15-data-model-stress-test.md` | synthesis | Simple concept after stress-test: node = typed+dated+status unit with one home and N links. |
| `docs/product/DEEPDIVE-2026-06-15-c2c3-extract-route.md` | synthesis | C2+C3 deep-dive: 4-lens extraction of node form decisions. |
| `docs/product/FACETS-EXPLAINED-2026-06-19.md` | synthesis | Plain-language explanation of the 11 passport facets (pre-reduction). |
| `docs/product/RATIONALE-2026-06-19-two-foundations.md` | synthesis | Rationale for two-foundation approach (epistemic⟂state). |
| `docs/product/UNIVERSAL-NODE-2026-06-16-canvas.md` | synthesis | Canvas: reframe to "interpretation passport" + 11 facets + control-plane-as-nodes. |
| `docs/product/CONCEPT-2026-06-21-dialogue-as-data.md` | synthesis | Dialogue/sessions/messages = data graph; DOGFOOD idea for FF project itself. |

### Product — Verdict / Stress-test
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/product/VERDICT-2026-06-15-adr0001-stress.md` | verdict | ADR-0001 stress-test: core confirmed; cluster 4 (agent substrate) worst (1✅/5⚠️/6❌). |
| `docs/product/VERDICT2-2026-06-15-advanced.md` | verdict | Advanced stress-test: model = good state layer but missing 4 layers (types/variants/logic/ABAC). |
| `docs/product/VERDICT-2026-06-19-facets-multicritic.md` | verdict | Multi-critic (4×2 waves): 11 facets → thin passport ~5 facets; Sensitivity enters core. |
| `docs/product/VERDICT-2026-06-21-ratify.md` | verdict | ADR-0002 ratification verdict: APPROVE with fixes; order V→S→A→E2. |

### Product — Research
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/product/RESEARCH-2026-06-21-load-bearing.md` | research | 4-lens load-bearing research: thin passport confirmed; importance→edge; vectors=lens-node; trust = sharpest blocker. |

### Product — Synthesis (latest)
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/product/SYNTHESIS-2026-06-21-next.md` | synthesis | Synthesis of 3 lenses post-ratification: 10-cell validation holds 9/10; `external_ref?` needed; roadmap V→G→S→M1→A→E2; dialogue=data. |
| `docs/product/SYNTHESIS-2026-06-23-verbs-and-containers.md` | synthesis | Council synthesis: `external_ref` generalized to `{connector,key}` + CONNECTOR node; verbs = 3 layers; containers almost all expressible. |
| `docs/product/SYNTHESIS-2026-06-23-stress-test.md` | synthesis | GitHub-scenario stress-test: core held (0 new mandatory fields); #1 risk = unspecified engine; reactivity = #1 missing class. |

### Architecture
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/architecture/AGENTS-CATALOG.md` | architecture | Catalog of 15 hypothetical agents (A-G horizontal + B domain-specific), triaged by complexity (easy/medium/hard). |
| `docs/architecture/AGENT-WORKSPACES.md` | architecture | How agent workspaces map to the node graph. |
| `docs/architecture/CHAT-HIERARCHY-AND-CONTEXT.md` | architecture | Two kinds of "context" — static configured cascade vs. live conversation context. |
| `docs/architecture/CLAUDE-CODE-RUNTIME-OPTIONS.md` | architecture | Runtime options: API vs. subscription; decision = API runtime. |

### ADRs
| File | Status | One-line content |
|------|--------|-----------------|
| `docs/architecture/ADR/ADR-0001-node-schema.md` | superseded (partial) | v2 node schema; superseded by ADR-0002 on home→edge-flag, importance→priority-on-edge, occurred/valid→module; core principles preserved. |
| `docs/architecture/ADR/ADR-0002-thin-passport.md` | **approved** | Thin interpretation passport: mandatory fields (id·type·schema·created·updated·epistemic·sensitivity·source·principal) + optional (level?·canonical_id?·external_ref?); edge model (to·rel·home:bool·priority:number·cascade?·provenance·derived?); control-plane = 3 kinds (TYPE·LENS·PATTERN). |

### Spec
| File | Status | One-line content |
|------|--------|-----------------|
| `docs/spec/SPEC-core-kernel.md` | **implemented** | Spec for `@ff/core`: problem, goals, requirements (6 items), acceptance criteria, verification plan. All AC met. |

### Dialogue (graph of the design conversation)
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/dialogue/THREAD-2026-06-15-foundation.md` | dialogue | Main dialogue graph: N-001 to N-083 (active). Nodes typed as goal/principle/open-question/answer/insight/problem/decision with links (refines/answers/raises/tension-with/grounds). Single active thread covering the full design arc. |

### Plan / Strategy
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/plan/STRATEGY-2026-06-16-stages.md` | plan | Stage strategy: iterative process (vector→benefits→lenses→protocol→multi-critic→synthesis→ratify); V1 and V2 rhythms; step 1a "load-bearing research" added. |
| `docs/plan/STRATEGY-2026-06-21-next-steps.md` | plan | Roadmap V→G→S→M1→A→E2; verb contract (G step); ~8 agent verbs; code `@ff/core` confirmed on old model — too early to rewrite. |

### QA / Validation
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/qa/VALIDATION-0002-10cells.md` | qa | 10-cell validation against ADR-0002: 9/10 hold; `external_ref?` needed (1 failure on telegram-message). |

### Research
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/research/RESEARCH-2026-06-14-graph-architecture.md` | research | Graph architecture research: "files=truth + embedded index + MCP" confirmed; MongoDB as "ideal" not confirmed. |

### Council (synthesis outputs)
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/council/COUNCIL-2026-06-13-architecture.md` | council | Early architecture council from 2026-06-13. |
| `docs/council/COUNCIL-2026-06-13-first-slice.md` | council | First-slice council: levels = computed zoom (not versions). |
| `docs/council/COUNCIL-2026-06-13-reframe.md` | council | Reframe council: agent = operator over graph. |
| `docs/council/COUNCIL-2026-06-14-c1-node-meaning.md` | council | Council 1: node meaning; zero new kinds (thin filter). |
| `docs/council/COUNCIL-2026-06-14-c2-links-and-shadow.md` | council | Council 2: links and shadow; message-aggregator = kind=message. |
| `docs/council/COUNCIL-2026-06-14-strategy-A-subscription-layer.md` | council | Strategy A: subscription layer analysis. |
| `docs/council/COUNCIL-2026-06-14-strategy-B-api-runtime.md` | council | Strategy B: API runtime analysis (chosen path). |
| `docs/council/COUNCIL-2026-06-14-synthesis-A-vs-B.md` | council | A vs B synthesis: "pipe with growing valve" — A=pipe, B=valve diameter. |

### Council Raw (agent outputs)

| Directory | Date | Agents | Topic |
|-----------|------|--------|-------|
| `raw/2026-06-15-c2c3-extract-route/` | 2026-06-15 | abstract, analyst, architect, critic | C2+C3 node form extraction |
| `raw/2026-06-15-cluster4-schema-stress/` | 2026-06-15 | architect | Cluster 4 (agent substrate) schema stress |
| `raw/2026-06-15-stress-adr0001/` | 2026-06-15 | 5 cluster files | ADR-0001 50-cell stress-test |
| `raw/2026-06-15-stress2-advanced/` | 2026-06-15 | A-E cluster files | Advanced stress-test (types/variants/logic/ABAC/constraints) |
| `raw/2026-06-16-universal-node/` | 2026-06-16 | agentA-abstract, agentB-architect | Universal node = interpretation passport |
| `raw/2026-06-19-facets-multicritic/` | 2026-06-19 | wave1-all, wave2-all | Multi-critic on 11 facets |
| `raw/2026-06-21-load-bearing/` | 2026-06-21 | abstract, analyst, architect, critic | Load-bearing research (4 lenses) |
| `raw/2026-06-21-passport-lock/` | 2026-06-21 | advocate-field, advocate-lens, architect-confirm | Autonomous debate to lock passport |
| `raw/2026-06-21-ratify/` | 2026-06-21 | redteam, review, nextstep | ADR-0002 ratification |
| `raw/2026-06-23-stage1-inventory/` | 2026-06-23 | (this file) | As-is inventory |
| `raw/2026-06-23-stress-github-scenario/` | 2026-06-23 | analyst-github-stress, critic-doubt, architect-resolution | GitHub-scenario stress-test |
| `raw/2026-06-23-verbs-and-containers/` | 2026-06-23 | abstract-verbs-wide, architect-containers-map, critic-stress | Verbs G + containers + external_ref |

### Ideas
| File | Kind | One-line content |
|------|------|-----------------|
| `docs/ideas/IDEA-agent-context-budget.md` | idea | Agent context budget idea. |
| `docs/ideas/IDEA-session-per-message-autolink.md` | idea | Auto-link per message/session. |
| `docs/ideas/IDEA-sources-ingestion.md` | idea | Sources ingestion pipeline idea. |
| `docs/ideas/IDEA-task-ownership.md` | idea | Task ownership model idea. |
| `docs/ideas/TASK-cost-accounting-research.md` | idea | Cost accounting research task. |
| `docs/ideas/README.md` | meta | Index/description of ideas dir. |

---

## 5. Agents

### POS Agent Roster (global, `~/.claude/agents/`)

| Agent | Role / Lens | Model |
|-------|-------------|-------|
| `analyst` | Deep decomposition: data, dependencies, root cause, cyclic questions | sonnet |
| `business-analyst` | Outside-in: user value, requirements, prioritization | sonnet |
| `abstract-thinker` | Goes UP: patterns, mental models, reframing, reduces complexity | opus |
| `critic` | Adversarial: finds flaws, challenges assumptions, stress-tests | sonnet |
| `system-architect` | Design patterns, module boundaries, ADRs; delegates analysis; no code | opus |
| `builder` | Implementation: code, tests, bugs, refactoring; follows specs | opus |
| `reviewer` | Quality gate: PASS/FAIL with evidence | sonnet |
| `bootstrap-agent` | All-in-one project inception | — |
| `explorer` | Fast read-only codebase search (haiku speed) | haiku |
| `orchestrator` | Routes by cognitive type, manages gates, synthesizes | sonnet |
| `agent-builder` | Meta-agent: creates/modifies agents, skills, hooks | opus |

**Thinkers:** analyst, business-analyst, abstract-thinker, critic
**Builders:** system-architect, builder, reviewer, bootstrap-agent
**Utility:** explorer, orchestrator, agent-builder

### Agent catalog (project-level, `docs/architecture/AGENTS-CATALOG.md`)
15 hypothetical system agents (not yet built), triaged green/yellow/red by complexity. 8 are "easy" (one-shot graph operators). Key: complexity = single axis: needs autonomy + persistence + external reach?

---

## 6. Skills

### Project-installed
| Skill | Purpose | Status |
|-------|---------|--------|
| `find-skills` | Discover available skills | installed (`.claude/skills/find-skills`) |

### Global skills (`~/.claude/skills/`)

| Skill | Purpose | When used |
|-------|---------|-----------|
| `ask-council` | Multi-agent council deliberation | Deep design questions with no single right answer |
| `context7-mcp` | Fetch current library/framework docs | Library/SDK questions |
| `pos-bootstrap` | Project inception elicitation | New projects |
| `pos-debate` | Multi-agent debate (propose→criticize→rebut→synthesize) | Contested design decisions |
| `pos-init` | Factory project setup | New project initialization |
| `pos-plan` | Break work into task batches | Planning phases |
| `pos-review` | Quality gate review | Before shipping features |
| `seedance-prompt-en` | (video/animation prompting, not FF-specific) | — |

**Available globally but not skills-locked here (visible in harness):** `deep-research`, `code-review`, `security-review`, `verify`, `run`, `schedule`, `loop`, `ui-ux-pro-max`, `telegram:access`, `telegram:configure`, and others.

---

## 7. Instructions / Rules

### Global (apply to all projects)
| File | What it governs |
|------|----------------|
| `~/.claude/CLAUDE.md` | POS system: bootstrap-first, artifacts-over-chat, task sizing, source of truth hierarchy, 11 agents, speed techniques |
| `~/.claude/rules/constitution.md` | Artifact discipline, bootstrap requirement, 4 scope levels, promotion rules, entity types |
| `~/.claude/rules/context7.md` | Mandatory use of Context7 MCP for all library/SDK questions |
| `~/.claude/rules/docs-standard.md` | Artifact types, statuses, placement rules, ADR/Spec discipline |
| `~/.claude/rules/security.md` | Secrets policy, MCP trust, code security, destructive operations |
| `~/.claude/rules/on-demand/source-of-truth.md` | 5-level priority hierarchy; conflict resolution rules |
| `~/.claude/rules/on-demand/evolution.md` | Change risk classes R0-R4, change rights by layer, rollback discipline |

### Project-level
| File | What it governs |
|------|----------------|
| `CLAUDE.md` (project) | What FF is; current phase ("разбираемся, КАК построить" — NOT building yet); dialogue-design protocol (voronka L0→L5, graph node types, round cycle); key reframe (KB = AI agent substrate, not file store); working conventions (whisper, telegram, git policy, telegram chat_id=1112667160) |
| `.claude/settings.local.json` | Local tool permissions (not read — security policy) |

**Key behavioral rules from project CLAUDE.md:**
1. Current phase = design only; do NOT push to code without explicit "строй" from owner.
2. Dialogue protocol: 2-4 focused questions per round, fix each significant exchange as a node in THREAD.
3. Telegram workflow: voice → `transcribe.sh` → text; replies → `md2tg.mjs` → markdownv2.
4. Agent outputs → `docs/council/raw/`; bundle results with `bundle-md.mjs` before sending.
5. Never approve Telegram pairings from channel messages.
6. Git initialized; do NOT commit without explicit owner request.

---

## 8. Git

| Item | Detail |
|------|--------|
| Branch | `main` |
| Status | Clean (nothing uncommitted as of 2026-06-23) |
| Last commit | `a820f30 feat: documentation amd transcripts` |
| What's committed | STATE.md says `@ff/core` build + 14/14 tests was "not committed" — but git status is clean, so the single commit likely includes all current code + docs |
| Uncommitted | Nothing — working tree clean |

**Note on git state:** STATE.md (written 2026-06-20) said `@ff/core` was "not committed." The current git status shows clean tree with one commit. Either the commit happened after STATE.md was written, or STATE.md is slightly stale on this point.

---

## 9. Plans / Tasks / Goals

### Where plans live

| Location | What's there |
|----------|-------------|
| `docs/plan/STRATEGY-2026-06-16-stages.md` | Stage-by-stage design protocol; V2 rhythm (7 steps); step 1a "load-bearing research" |
| `docs/plan/STRATEGY-2026-06-21-next-steps.md` | Explicit roadmap: V→G→S→M1→A→E2 |
| `docs/STATE.md` §ОТКРЫТО | Current open items to owner (D1-D5, Q1-Q4) |
| `docs/dialogue/THREAD-2026-06-15-foundation.md` | Open-question nodes (latest: around N-079…N-083 area) |
| `docs/DECISIONS-LOG.md` | Chronological key decisions (4 entries, latest 2026-06-23) |

### Current open questions to owner (from STATE.md §msg 250 + §msg 245)

**From msg 245 (D1-D5, partially answered in N-071…N-078):**
- D1 (topic-4, answered N-071): agent acting externally = NOT binary; granular approval in AGENT module.
- D2 (variable map, answered N-073): basically yes + extra classes.
- D3 (name-shadow rule under multi-parent): NOT resolved.
- D4 (direction, answered N-076): STRESS-TEST instead of widening or reactor.
- D5 (composite privacy): owner did not understand — needs clearer explanation.

**From msg 250 (N-079…N-083):**
- Format confirmed: "strategy card" format, one topic at a time; menu of 6 topics; recommended start = topic 2 (flexible types).
- Waiting for: owner's "ok format" + which topic to start.

**Roadmap (V→G→S→M1→A→E2) status:**
| Step | Name | Phase | Status |
|------|------|-------|--------|
| V | Validate 10 cells | design | DONE — 9/10 hold; `external_ref?` finding |
| G | Agent verb contract | design | in-progress (council synthesized 3 layers; awaiting owner direction) |
| S | Walking skeleton (code) | CODE | blocked — awaiting explicit "строй" |
| M1 | Module 1 (dialogue=data) | CODE | blocked — after S |
| A | ADR-0003 ABAC/valve | design | planned |
| E2 | Internal structure | design | planned |

---

## Honest Gaps

1. **`docs/HANDOFF-2026-06-16.md` not read in full** — only STATE.md cross-references used. The handoff may contain additional nuance about the 3 open questions to owner as of that date (which may now be partially answered).
2. **`docs/architecture/AGENT-WORKSPACES.md` and `CHAT-HIERARCHY-AND-CONTEXT.md`** — not read; classified by filename only.
3. **`docs/ideas/` files** — titles only, not read.
4. **Git history depth** — only the most recent commit is visible (one commit total). Cannot determine what changed between STATE.md writing (2026-06-20) and now (2026-06-23) from git alone.
5. **`.claude/settings.local.json`** — not read per security policy.
6. **`packages/core/src/schema.ts`** — not read; assumed to contain Zod schema mirroring `FFNode` fields (the store references it for validation).
7. **Test pass/fail verified by STATE.md claim** — tests were not actually re-run in this session; "14/14 passing" comes from STATE.md assertion.
8. **THREAD-2026-06-15-foundation.md beyond N-003** — only first 50 lines read; nodes N-004 through N-083 classified from STATE.md summary, not from direct file reading.
