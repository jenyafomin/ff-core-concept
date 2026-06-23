# FF — Personal Management

A personal life-management system, designed across several council sessions (see `docs/`).

**One-line:** a *second brain that also acts* — one connected store of everything (a node
graph), with a layer of AI agents that read it, do work, and write results back, organized by
life directions, built to run **on Claude Code** (files as the graph, agents as operators).

## Why a monorepo
The system is one graph viewed many ways; packages are layers over that single substrate, not
separate apps with separate databases (see `docs/council/COUNCIL-2026-06-13-architecture.md`).

## Packages
- **`@ff/core`** — the node-graph kernel. Everything (tasks, notes, chats, agents, messages,
  traces) is a *node*; structure is `parentId`; directions are tags; connections are links;
  context cascades like `CLAUDE.md`; levels are computed zoom (L1 title → L2 snippet → L3 body).
  This is the substrate the agent layer, chats, and aggregation will stand on.

## Design docs (the thinking behind this)
- `docs/product/VISION.md` — vision; §7 is the reframe (agent platform, not an organizer)
- `docs/product/SYSTEM-IN-PLAIN-WORDS.md` — the whole system in plain language
- `docs/architecture/AGENTS-CATALOG.md` — agent jobs + easy/hard triage
- `docs/architecture/AGENT-WORKSPACES.md` — pre-configured chats, the agent "office"
- `docs/architecture/CHAT-HIERARCHY-AND-CONTEXT.md` — chat hierarchy + context model
- `docs/council/*` — the three council deliberations

## Develop
```bash
npm install        # installs workspace deps
npm run typecheck  # type-check all packages
npm test           # run tests
npm run demo       # run the @ff/core end-to-end demo
```

## Status
Early. `@ff/core` is the first slice — the graph substrate. Agents, chats, aggregation and the
Electron frontend come on top, in that order. The single hard capability (autonomy + persistence
+ external integration) is deliberately deferred — see the plain-words doc.
