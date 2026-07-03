---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Type: adversarial-critique
Subject: Graph viewer design — stress-test before building
---

# Critique: Graph Viewer for FF Personal Management

> Adversarial stress-test. Phase = DESIGN. No code. Ground truth: ADR-0002 thin passport.
> Reference viewer: understand-anything (competitor research: `docs/council/raw/2026-06-24-competitors/understand-anything.md`).

---

## Critique: Scale and Cognition

### Critical (must address)

- **Force-directed graph is a hairball at 1k+ nodes — it's not a viewer, it's a screensaver.**
  Lens: Scalability stress test. Evidence: understand-anything uses force-directed + ELK + Louvain
  clustering and it works ONLY because their domain is code — a structured artifact with clear
  hierarchies. A "life aggregator" graph has heterogeneous node types (tasks, people, messages,
  metrics, projects) with wildly different connectivity patterns. At 10k nodes, force-directed
  becomes:
  (a) visually useless — hairball of overlapping edges;
  (b) computationally expensive — layout recalculates on every add/delete;
  (c) cognitively misleading — spatial proximity implies semantic proximity, but force-directed
      proximity is an artifact of the layout algorithm, not meaning.
  The seductive "pretty graph" picture belongs in marketing, not in a working viewer.
  **Mitigation:** Force-directed is a LAST resort or supplementary "overview" only. Primary views
  must be: (1) home-spine outline/tree (ациклична, детерминирована, O(n) рендеринг); (2) faceted
  list/table filtered by LENS; (3) focused ego-graph (1-2 hops from current node). Force-directed
  = optional "map" for orientation, never for navigation.

- **The home-spine IS your scalable primary view — you already designed it, now treat it as such.**
  Lens: Assumption audit. Evidence: ADR-0002 §2(а) — home edges form a DAG-forest (ациклична по
  инварианту «ровно один home на ноду»). This is an outline tree. Every file manager, code editor,
  and mail client at scale uses the outline, not the force-graph. The home-spine gives:
  - Stable hierarchy (doesn't change layout on edit);
  - O(1) parent lookup;
  - Natural "cascade context" view (importance, sensitivity, category propagate down);
  - Keyboard navigation without cycles.
  **Mitigation:** Design the home-spine outline as the PRIMARY navigation surface. Everything else
  (faceted list, ego-graph, LENS view) is secondary.

### Concerns (should address or accept)

- **"Pretty graph" will be the first thing the owner asks for and the last thing that helps.**
  Lens: Failure mode analysis. Risk if ignored: weeks of work on a force-directed graph renderer
  that will be abandoned when the graph exceeds 500 nodes. Blast radius: medium (implementation
  cost, UX debt). **Mitigation:** Build outline first, show the force-directed only as a
  "zoomed-out map" with Louvain clustering and hide edges by default. Nodes visible, edges on hover.

- **At 100k nodes (e.g. all Telegram messages as nodes per dogfood schema N-043) even the
  home-spine outline will choke if rendered naively.**
  Lens: Scalability stress test. Evidence: N-043 «огромные секции» — чат=млн сообщений.
  ADR-0002 mentions `section-index` (lazy loading). But the viewer must know about this contract.
  If it renders all children of a "Telegram history" node, it will load hundreds of thousands of
  entries. **Mitigation:** The viewer MUST respect `section-index` convention from the start.
  Virtual scrolling for large child lists. Lazy expand (fetch children on demand, not at load time).

### Provocations (consider)

- **Is a "graph viewer" even the right mental model?** The owner's actual workflow is: "what's
  stuck in project X?", "what should I do today?", "summarize my last week". These are QUERY
  outputs, not graph walks. The viewer might mostly be an inbox/agenda view powered by LENS
  queries, with occasional graph navigation for context. Argue hard for whether you need a "viewer"
  or an "agent answer + drill-down context panel".
  Lens: Missing perspective check.

### Noted (watch)

- Force-directed graph: fine as an Easter egg or "explore mode", but watch that it doesn't become
  the design centerpiece.

---

## Critique: Multidimensionality UX — Facet Walking

### Critical (must address)

- **Walking edges naively will collapse into identity confusion when a node has 5 facet-of edges.**
  Lens: Failure mode analysis. Evidence: ADR-0002 — a node has ONE home but N `facet-of` edges
  to different category nodes. Example: the node `node.ts` (from `docs/graph-example/`) could be
  facet-of "TypeScript", facet-of "Core module", facet-of "Data model", facet-of "ADR-0002 scope",
  facet-of "Week 2026-06-16". If the user follows the "show nodes in this category" link from
  "ADR-0002 scope", they get a list. But then from that list, following ANOTHER facet-of on one
  of those nodes leads to a completely different dimension. After 3 hops the user has NO IDEA
  which "dimension" they are on. The graph has NO inherent narrative direction for facet walks.
  **Mitigation:** The viewer MUST always show the user which LENS/dimension they are currently
  navigating. Each view must be anchored to a LENS node (or "home-spine" for the default).
  Breadcrumb: [LENS: "ADR-0002 scope" → node.ts → LENS: "TypeScript"]. Never allow free facet
  walking without the dimension label visible. This is also why LENS = node (not hardcoded enum)
  matters: the viewer can SHOW the lens name to the user.

- **Multi-parent collision: a node appears "in the wrong place" depending on which parent you
  arrived from — and the viewer won't tell you.**
  Lens: Failure mode analysis / Contradiction detection. Evidence: ADR-0002 §2(а) home + N facet-of.
  If you browse from parent A, you see the node as "child of A". If you arrived via parent B's
  facet listing, it looks like "child of B". The node itself is the same, but the implied
  relationship differs. Naive viewers (like a plain tree) will just show the home parent, hiding
  the other parents silently. The user who added a `facet-of` edge will wonder "where did my
  connection go?". **Mitigation:** The viewer MUST display the node's home parent AND a visible
  indicator of additional facet-of edges ("also in: X, Y, Z"). Clicking one of those navigates
  in LENS context, not in home-spine context.

### Concerns (should address or accept)

- **"Name shadowing" bug identified in synthesis (N-215 in `SYNTHESIS-2026-06-23-verbs-and-containers.md`
  §containers bug) — the viewer will make this invisible.**
  Lens: Missing perspective check. The synthesis identified that nearest-first LENS inheritance
  breaks on DAG when the same concept name appears in two ancestor chains. The viewer will likely
  just show the result without surfacing which ancestor "won". Users will see inconsistent labels
  with no explanation. Risk if ignored: silent confusion, incorrect mental model of the graph.
  **Mitigation:** The viewer should show the cascade-source for inherited properties (e.g. "sensitivity:
  private (inherited from: Project X)"). This requires the engine to pass provenance of inherited
  values alongside the values themselves — design this into the query contract (verb `query`) now,
  not after the viewer is built.

### Provocations (consider)

- **The UX of multidimensionality might be better served by NAMED VIEWS (saved LENS queries) than
  by free edge walking at all.** If the user creates a LENS "my week" that filters by date range
  and home-spine = "Work", they get a focused list. The cognitive load is zero compared to "walk
  facet edges and remember where you are". Named LENS views = the primary UX; edge walking = power
  user escape hatch.
  Lens: Assumption audit.

### Noted (watch)

- The "5 parents, lost in space" problem will appear first in testing, not in design. Revisit once
  dogfood graph has >50 multi-parent nodes.

---

## Critique: Valve in the UI

### Critical (must address)

- **Bulk edit / bulk re-link bypasses the per-node valve check.**
  Lens: Security and adversarial thinking. Evidence: ADR-0002 §3 — valve checks DIRECTLY involved
  nodes. Bulk edit UI lets the user (or agent) select 50 nodes and apply a change. Each individual
  node might pass the direct-boundary check, but the aggregate action has side effects the valve
  wasn't designed to catch: e.g., bulk-relinking a `sensitivity:private` node away from its home
  into a public LENS that will be indexed. The v1 valve checks the node itself (`epistemic`, `sensitivity`,
  `principal`) but does NOT check "what LENS will now include this node after the re-link?".
  Blast radius: data leak of private nodes into public views. **Mitigation:** Bulk mutation operations
  MUST re-run valve on each affected node's NEW graph position (post-edit), not only on the node
  itself. The viewer must make bulk operations explicit (show count, require confirmation) and never
  silently batch them.

- **Drag-to-relink is the most dangerous UI affordance in a graph viewer.**
  Lens: Security and adversarial thinking / Failure mode analysis. A user dragging a node from one
  parent to another in a force-directed graph UI is performing a `home` re-assignment — a structural
  cascade change. Consequences: (a) cascade context changes (new sensitivity, category, priority);
  (b) may violate the "ровно один home" invariant if the UI allows dropping onto a second home
  without removing the first; (c) changes the node's "address" in all downstream LENS that filter
  by home-spine ancestry. None of these consequences are visible in the drag interaction.
  **Mitigation:** Drag-to-relink should NOT exist as a free gesture. Re-homing a node must be an
  explicit action with a confirmation dialog showing "This will change: cascade context from X to Y,
  affects N nodes". Force-directed graph = read-only, no drag-to-reparent.

- **Undo in a graph with cascading home edges is not trivially reversible.**
  Lens: Failure mode analysis. Evidence: ADR-0002 §2(а) re-home rule — moving a home edge triggers
  the cascade re-computation. "Undo" must reverse not just the edge change but ALL cascaded effects
  (inherited sensitivity, category, priority). If the engine only stores the edge delta but not the
  cascade snapshot, undo becomes partial. **Mitigation:** Before "undo" is implemented, design the
  engine's transaction model. Undo is only safe if the engine stores pre-mutation snapshots of
  cascade state OR if all cascade values are fully recomputable from current edge state (prefer this).
  The viewer must not offer undo for cascade-affecting operations until the engine supports it.

### Concerns (should address or accept)

- **Who-approved is invisible in the current viewer concept.**
  Lens: Missing perspective check. ADR-0002 §3 — every `epistemic→fact` promotion creates a
  trace node (actor, from, to, policy_ref, ts). The viewer has no mention of showing this provenance.
  Users will see `epistemic: fact` with no idea who promoted it or when. Risk if ignored: trust
  erosion when a user sees a "fact" they don't recognize as verified. **Mitigation:** The `epistemic`
  badge in the viewer must be clickable — showing the trace node (who promoted, when, under which
  policy). Not just a color badge.

- **Frozen vs live bindings (from SWEEP §版本): the viewer has no affordance to distinguish them.**
  Lens: Missing perspective check. The synthesis identified `binding:live|frozen` on edges
  (version-edges theme). A frozen binding means "this relationship is locked to a specific version".
  A live binding means "this relationship follows the head". If the viewer shows them identically,
  users will not understand why editing one node doesn't update another. **Mitigation:** Edge
  rendering must show binding type. At minimum: a lock icon on frozen edges.

### Provocations (consider)

- **The valve UX paradox: if the viewer shows the valve state prominently, users will game it
  (set `epistemic:fact` to unlock actions). If it doesn't show it, users won't understand why
  actions are blocked.** There's no clean resolution here — design around it with clear error
  messages ("Action blocked: node X is epistemic:hypothesis — verify first") rather than hiding
  the valve concept from the user.
  Lens: Assumption audit.

### Noted (watch)

- Agent vs human edit history: the viewer will need to distinguish "this was edited by an agent
  (source:agent)" vs "human (source:human)". Source field exists in passport. Display it in the
  edit history panel.

---

## Critique: Epistemic and Sensitivity Surfacing

### Critical (must address)

- **Absence of epistemic display is a safety failure, not an aesthetic choice.**
  Lens: Security and adversarial thinking. Evidence: ADR-0002 §3 — the valve on external actions
  checks epistemic status. If the viewer doesn't surface `epistemic` clearly, users will:
  (a) trigger valve blocks without understanding why;
  (b) not know which nodes need verification before an agent can act on them;
  (c) accumulate `epistemic:hypothesis` nodes that block ALL external actions silently.
  The failure mode: the user asks an agent to "book this meeting" and the agent says "blocked —
  can't act on hypothesis nodes". The user doesn't know WHICH node is the problem or why.
  **Mitigation:** Every node in the viewer MUST show `epistemic` as a visible badge (not buried
  in details). Color coding: draft=grey, proposal=blue, hypothesis=yellow, fact=green, archived=muted.
  The blocked-action error must LINK to the specific blocking node(s).

- **Sensitivity must be visible but NOT exposing the sensitive content.**
  Lens: Security and adversarial thinking. A node with `sensitivity:private` should show the
  badge "private" but NOT show the title or description if the viewer is being screen-shared or
  exported. Naive viewers show everything they fetch from the engine. The viewer must implement
  a "public display mode" that redacts private node content while keeping the badge visible.
  This is not optional — it's a core UX requirement for a "life aggregator" that will contain
  genuinely private data (medical info, finances, relationship notes).
  **Mitigation:** The viewer MUST have a "focus mode" / "screen share mode" that hides
  `sensitivity:private|confidential` node content (title, description, body) and shows only
  the badge + node ID. This must be a ONE-CLICK toggle, not a buried setting.

### Concerns (should address or accept)

- **Epistemic badge density becomes noise when 80% of nodes are epistemic:draft.**
  Lens: Failure mode analysis. In early use, most nodes WILL be draft/proposal. If every node
  shows a color badge for epistemic, the view is a sea of grey/blue with no signal. Risk if
  ignored: users habituate to the badges and stop reading them — defeating the purpose.
  **Mitigation:** Design the epistemic display as "exception highlighting" not "constant annotation".
  Default: hide the badge for `draft` (the majority state). Show badges prominently ONLY for
  `fact` (green = trusted) and `hypothesis` (yellow = needs caution). This inverts from "always show"
  to "show when it matters".

- **Two orthogonal statuses (`epistemic` + `state` from workflow module) will confuse users.**
  Lens: Contradiction detection. ADR-0002 §2(в) — `epistemic` is trust in content, `state` is
  workflow progress (in-module, type-dependent). A task might be `state:in-progress` and `epistemic:hypothesis`
  simultaneously. These are different axes but users will conflate them ("is this task done or not?").
  **Mitigation:** The viewer must display these on separate visual tracks. Never merge them into
  one status indicator. Label them explicitly: "Trust: hypothesis" and "Status: in-progress".

### Provocations (consider)

- **Should sensitivity be visible in the node list at all, or only when you open a node?**
  Showing `sensitivity:private` labels in a list view tells an attacker (or shoulder-surfer) exactly
  which nodes to target. There's an argument for showing sensitivity only in the detail view.
  Counter-argument: hiding it in the list makes it impossible to audit what's private at a glance.
  This is a genuine UX/security trade-off that needs an explicit decision.
  Lens: Security and adversarial thinking.

### Noted (watch)

- The `principal` field: when multi-tenant / marketplace arrives, the viewer will need to show
  which principal "owns" a node and whether the current user has read access. Design the node
  detail panel to have a placeholder for this now (even if it's always "you" in v1).

---

## Critique: Keyboard Walking Traps

### Critical (must address)

- **"Navigate by arrow keys along edges" sounds obvious but is undefined without a traversal order.**
  Lens: Failure mode analysis. A node has: 1 home-parent edge, N child edges, M facet-of edges,
  K reference edges (which CAN be cyclic — ADR-0002 invariant: belonging ⟂ reference, reference
  edges can form cycles). When the user presses ArrowRight on node X, what happens? Options:
  (a) go to home-parent;
  (b) go to first child;
  (c) go to next sibling in home-spine;
  (d) go to first reference edge;
  These are FOUR different meanings of "navigate right". The viewer must pick ONE semantic per
  direction key and document it explicitly. If undefined, different parts of the UI will implement
  different behaviors (as happened in understand-anything where arrows were captured for tour
  navigation, breaking graph walking entirely).
  **Mitigation:** Define the navigation contract BEFORE building:
  - `j/k` (or Up/Down): move to prev/next sibling in current outline level (home-spine).
  - `h/l` (or Left/Right): collapse/expand children (outline behavior).
  - `Enter`: open node detail.
  - `g` then `h`: jump to home-parent (mnemonic: "go home").
  - `Tab`: cycle through facet-of contexts for current node.
  This separates outline navigation (home-spine tree) from context switching (LENS/facet).

- **Reference edges are cyclic — keyboard navigation MUST NOT follow them without a cycle guard.**
  Lens: Failure mode analysis / Security. ADR-0002 states belonging (home) is acyclic, reference
  edges CAN be cyclic. If keyboard navigation follows reference edges (e.g. a "related" link),
  and the user holds down a key, they could loop infinitely. This is especially dangerous for
  agent-driven "walk the graph" operations. **Mitigation:**
  (1) Keyboard navigation follows ONLY home-spine (acyclic by invariant) by default.
  (2) Reference edge traversal is an EXPLICIT separate command (not continuous arrow-key navigation).
  (3) For any agent operation that walks edges, the engine's cycle-guard (ADR-0002 §ДВИЖОК,
  `maxDepth`, cycle-terminator `prune|mark-cycle`) MUST be invoked — viewer has no separate cycle
  detection obligation, but it must not bypass the engine.

- **"Dead ends" in keyboard navigation destroy flow — and the home-spine has leaf nodes with no
  children.**
  Lens: Failure mode analysis. When keyboard navigation reaches a leaf node (no children, no next
  sibling), pressing the navigation key does nothing. No visual feedback = broken keyboard UX.
  The user doesn't know if the key failed, if the node is a leaf, or if the viewer is stuck.
  **Mitigation:** At dead ends: show a visual affordance ("no children — press g+h to go home-parent")
  AND wrap to next sibling of parent automatically (outline editor behavior). Never silently swallow
  the keypress.

### Concerns (should address or accept)

- **Ambiguous "next" when a node has children in multiple LENS contexts.**
  Lens: Failure mode analysis. A node has 3 children via home-spine AND 5 nodes facet-linked via
  "Project Alpha" LENS. Which are "next"? This depends on the current LENS context. If the viewer
  doesn't track the active LENS, the keyboard navigation will produce inconsistent results depending
  on how the user arrived at the node. Risk if ignored: confusing navigation behavior that trains
  users to use the mouse instead. **Mitigation:** The viewer must maintain "current LENS context"
  as explicit state. Keyboard navigation always operates within the active LENS. Switching LENS
  is an explicit action (Tab or dedicated key), not implicit.

### Provocations (consider)

- **Vim-style keyboard navigation (h/j/k/l) is familiar to developers but NOT to general users.**
  The owner's use case is a personal life aggregator, not a developer tool. The understand-anything
  viewer is dev-targeted. Should FF's viewer target vim-style or standard arrow keys? Arrow keys
  are more discoverable but conflict with tour/panel navigation (same problem understand-anything hit).
  This needs a design decision: pick the audience and commit.
  Lens: Missing perspective check.

### Noted (watch)

- The `Cmd+K` command palette as a complement to keyboard graph walking: allows jumping to ANY
  node by name/type/LENS without walking the graph at all. This sidesteps the "where am I in the
  graph" problem entirely. High value, relatively low implementation complexity (fuzzy search over
  node index). Should be designed in from the start.

---

## Critique: Borrow List — Understand-Anything vs Cargo-Cult

### GENUINE WORTH COPYING (borrow these)

1. **`/`-search as primary discovery.** Vim/GitHub convention — instantly findable, universal.
   Their implementation detail: the shortcut hook silences key events when focus is in an input
   field (except Escape). This is a subtle correctness detail that prevents key conflicts. COPY THIS
   behavior, not just the shortcut. Their SearchBar two-mode (Fuzzy + Semantic) is worth the pattern
   even if we implement it differently.

2. **`?`-help modal generated from the shortcut array itself.**
   The pattern: one source `{key, category, description, action}[]` → generates both the key bindings
   AND the help modal. This is clean, maintainable, and ensures the help is never out of sync with
   the actual bindings. COPY THE ARCHITECTURE (not the specific keys).

3. **Escape-cascade: close modals → return to overview.**
   Predictable, universal. Every keyboard-driven UI needs this. The behavior: first Escape closes
   the current panel/modal; if nothing is open, Escape returns to the top-level view (home-spine
   root or last search). COPY THIS behavior.

4. **Persona-adaptive depth as LENS analog.**
   Their junior/PM/power-user switch changes information density without changing the data. This
   validates our LENS concept from UX evidence. The implementation difference: theirs is an enum
   in code, ours is a node in the graph (more powerful). Their UX pattern (one-click depth switch
   visible in the toolbar) is worth copying AS A LENS SELECTOR.

5. **Platform-aware shortcut rendering (⌘ on Mac, Ctrl on Win).**
   Small detail, high polish impact. `formatShortcutKey()` — copy this approach for any shortcuts
   panel we build.

6. **PathFinder (find path between two nodes).**
   Useful for understanding graph structure: "how is this task connected to this project?". Works
   for home-spine (always has a path via common ancestor) and reference edges (BFS). For our case:
   "how is person X connected to deal Y?" is a genuine user need. The modal pattern (select source,
   select target, show path) is worth copying. Caveat: for reference edges with cycles, BFS must
   respect `maxDepth` — the engine must provide this, not the viewer.

### CARGO-CULT — do NOT copy blindly

1. **Force-directed graph as primary navigation.** They use it for codebases where structure is
   relatively flat (files → functions → calls). Our graph will have radically heterogeneous node
   types and edge meanings. Their force-directed layout = cargo-cult for our case. Exclude it from
   the primary view.

2. **Single-letter shortcuts (d/f/e/p) without Cmd prefix.**
   Their shortcuts (d=diff, f=filter, e=export, p=path) are app-level, but they conflict with
   standard text input keys at the OS level and with future vim-style navigation keys. Do NOT adopt
   single-letter unmodified shortcuts for non-navigation actions. Use Cmd+K palette or two-key
   combos (g+h, g+l) instead.

3. **Tour system (ordered walk through dependency chain).**
   Their tours exist because understand-anything is an ONBOARDING tool for new developers. Our
   graph is not an onboarding artifact — it's a live operating substrate. "Onboarding tours" have
   no equivalent use case. Their `TourStep` schema is not worth porting.

4. **21 node types + 35 edge types hardcoded as TypeScript enums.**
   They did this because their domain (codebases) is fixed and their control plane is code-side.
   Our design explicitly rejected this (ADR-0002: TYPE/LENS/PATTERN = nodes, open registry).
   Their taxonomy is a REFERENCE for what relationships exist (good research input), NOT a template
   for how to store them. The `weight(0..1)` on edges IS worth considering as an optional field.

5. **Louvain clustering as automatic "meaning".**
   Louvain finds densely connected clusters — in a codebase this roughly correlates with modules.
   In a life graph, Louvain clustering of a person's data could just as easily cluster "all nodes
   created on Monday mornings" as cluster "work projects". Automatic clustering = false authority
   on our heterogeneous graph. Use LENS-defined groups (explicit) not algorithmic clusters (implicit).

6. **`Layer.nodeIds[]` as the grouping mechanism.**
   Their layers are a side-channel (the layer references nodes, nodes don't reference layers).
   This is a shortcut for a read-only graph. Our equivalent is the `facet-of` edge: bidirectional,
   indexed, queryable. Do not introduce a separate "layers" concept — it duplicates what facets do.

---

## Ranked Top Design Risks

| Rank | Risk | Severity | Mitigation |
|------|------|----------|------------|
| 1 | Force-directed graph as primary view becomes useless at scale | CRITICAL | Home-spine outline as primary; force-graph as optional overview only |
| 2 | Drag-to-relink silently re-homes a node with cascading effects | CRITICAL | No drag-to-reparent in graph view; explicit re-home dialog with impact preview |
| 3 | Keyboard navigation captures arrow keys without defining traversal order | CRITICAL | Define navigation contract (j/k/h/l for outline; Tab for LENS switch) before building |
| 4 | Bulk edit bypasses per-node valve — leaks private nodes into public LENS | CRITICAL | Bulk operations re-run valve on post-edit graph position of each affected node |
| 5 | Reference edge cycles crash or loop keyboard/agent navigation | CRITICAL | Arrow-key nav follows home-spine only; reference traversal is explicit command with maxDepth |
| 6 | Epistemic badge hidden → users don't know why actions are valve-blocked | HIGH | Epistemic badge visible on all nodes; blocked actions link to the specific blocking node |
| 7 | Multi-parent node appears "in the wrong place" with no explanation | HIGH | Show home parent + "also in: X, Y" indicator; LENS context label always visible |
| 8 | Section-index (huge child lists) not respected → OOM on Telegram messages | HIGH | Lazy expand, virtual scrolling, respect section-index from day one |
| 9 | Undo for cascade-affecting operations is partial or broken | HIGH | No undo on re-home until engine supports cascade snapshots or full recomputation |
| 10 | Sensitivity badge in list view exposes which nodes are private to shoulder-surfers | MEDIUM | Screen-share mode (one-click) that redacts private node content while keeping badge |
| 11 | Who-approved `epistemic:fact` is invisible → trust erosion | MEDIUM | Epistemic badge clickable → shows trace node (actor, ts, policy) |
| 12 | `epistemic` + `state` conflation in one status indicator | MEDIUM | Two separate visual tracks; never merge into one indicator |
| 13 | Name shadowing in multi-parent cascade not surfaced to user | MEDIUM | Show cascade-source provenance alongside inherited values in detail panel |
| 14 | Frozen vs live bindings displayed identically | LOW | Lock icon on frozen edges |
