# SPEC — @ff/core node-graph kernel

- **Status:** implemented
- **Owner:** jenya.stasik@gmail.com
- **Date:** 2026-06-13
- **Related:** [SYSTEM-IN-PLAIN-WORDS.md](../product/SYSTEM-IN-PLAIN-WORDS.md), [CHAT-HIERARCHY-AND-CONTEXT.md](../architecture/CHAT-HIERARCHY-AND-CONTEXT.md)

## Problem
Everything in the system (tasks, notes, chats, agents, messages, traces) needs a single
substrate so connectivity is free and "graph = memory" holds. Building separate stores per
module was rejected by the councils. We need the kernel first; agents/chats/aggregation stand on it.

## Goals
- One uniform primitive: the **node**. Structure via `parentId`, directions via `tags`,
  connections via `links`, configured context that **cascades** like `CLAUDE.md`, and
  **computed levels** (L1 title → L2 snippet → L3 body).
- Human-readable, git-friendly persistence (markdown + frontmatter); no DB, no network.
- A **trace** mechanism so every agent action is recorded back into the graph.

## Non-goals (deferred — the single hard capability)
Autonomy, scheduling, external integrations, real-time observability, the Electron frontend,
conversation-context compaction policy. These come later, deliberately (see plain-words doc).

## Requirements
1. `FileNodeStore`: create / get / require / update / delete / list / query / children /
   ancestors / link, persisting one node per `.md` file with validated YAML frontmatter.
2. `query` filters by kind, tag, parentId (incl. roots), status, importance.
3. `effectiveContext` merges ancestor contexts root → node (the cascade).
4. `renderLevel` returns L1/L2/L3 zoom computed from title/body (no stored versions).
5. `recordTrace` writes a `trace` node linking read/wrote/in nodes.
6. Schema validated with zod on read and write; invalid files fail loudly.

## Acceptance criteria
- All of the above covered by tests; `npm test` green.
- `npm run typecheck` clean (strict TS).
- `npm run build` emits `dist` with `.d.ts`.
- `npm run demo` shows a full flow: direction → chat+agent (with cascading context) →
  thought → triaged task+note → trace → level zoom.

## Verification plan
```bash
npm install
npm run typecheck   # strict, no errors
npm test            # vitest — store/context/levels/trace
npm run build       # tsc emit to dist
npm run demo        # end-to-end print
```
**Status 2026-06-13:** all four green. 14/14 tests pass.
