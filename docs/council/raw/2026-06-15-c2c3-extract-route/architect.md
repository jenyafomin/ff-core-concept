# RAW — System-architect lens · C2+C3 extract→route · 2026-06-15

> Saved verbatim (condensed). Synthesis: `docs/product/DEEPDIVE-2026-06-15-c2c3-extract-route.md`.

## Framing rule (Obsidian fork anchored)
"The frontmatter is the typed contract. The markdown body is the human surface. Anything Obsidian renders for free (wikilinks [[...]], #tags, dataview-able frontmatter) we reuse; anything it can't express → frontmatter keys it ignores." Obsidian ignores unknown frontmatter keys gracefully (survive round-trips, show in properties, Dataview/Bases-queryable). That seam = both Obsidian-native AND strictly typed.

## 1. Canonical frontmatter (real YAML)
4 axes → frontmatter: TIME (occurred, valid_from, valid_until, supersedes + measurement block; Dataview-queryable). BELONGING (home = exactly one wikilink = cascade parent; all other belonging = links[] / inline [[..]]). EPISTEMIC (epistemic fact/hypothesis/proposal/archived SEPARATE from state open/doing/done). OPEN TYPING (type = free string vs runtime registry; schema = type@version).

Base schema (every node): id(ULID, ≠filename), type(open string), schema(type@version), title, description(always), created/updated, occurred?, valid_from?/valid_until?/supersedes?, home("[[..]]" ONE), epistemic, state(type decides if applies), stage(inbox|routed|enriched), links[]{to,rel,href?}, importance(1-5), actor(user|agent:id), source, tags[].
Two deliberate splits: epistemic ⟂ state (a node can be epistemic:fact+state:done OR epistemic:proposal+state:open; conflating = original sin in FFNode.status). home = ONE wikilink; "belongs to Sport AND Career" = links[] rel:also_serves (shows in graph+backlinks, NO second cascade) → resolves Axis B.
Examples: task (home Career, state open, due in task-type schema), measurement (occurred=truth-time, measurement:{metric,value,unit}, links rel:sample_of to series node — time-series query = type:measurement where metric==X order by occurred), person (person:{handles,role}, commitments = separate nodes rel:owes_to → "commitments to people this week" = reverse query over owes_to filtered by due).

## 2. Boundary SKILL vs AGENT vs ENGINE (load-bearing)
Map assigns owning-agents but conflates "who's responsible" with "what artifact does the work."
- ENGINE @ff/core (pure, deterministic, no LLM, unit-tested): parse/serialize frontmatter↔FFNode; type registry + validation; route() MECHANICS (write file into home, set stage, cycle/depth guards); link integrity. An LLM must never be in the path of "is this valid / where does file physically go."
- SKILL (procedure, stable I/O, model judgment): extract (raw → proposed node object); route POLICY (given node+graph propose the one home).
- AGENT (identity, authority, lens): Librarian invokes extract+route skills; Inbox owns capture→triage; Keeper owns C7 enrichment/epistemic transitions. Agents own WHEN + WHAT-allowed-to-commit, not the procedure.
Answers: extract = SKILL (pure transform raw→ProposedNode[], reusable by Librarian/cron/user; Librarian is default CALLER). route = SPLIT: mechanics=ENGINE (write, set home, flip stage, guards, reject two-homes), policy=SKILL (choose which home → proposed, engine applies). Direct-write-vs-confirm governed by epistemic+stage NOT hardcoded: Librarian writes epistemic:proposal stage:inbox; promotion to fact/routed = the approval gate = pipe-with-growing-valve (mechanism same regardless of valve width).

## 3. extract contract + routing rules
extract: INPUT {raw, source, hint?{type?,home?}} → OUTPUT {nodes: ProposedNode[]}.
ProposedNode = {type, title, description(always), body, occurred?, proposed_home?, proposed_links?[], proposed_tags?[], typed_payload?, epistemic:"proposal"(ALWAYS), stage:"inbox"(ALWAYS), confidence:0..1}.
Contracts: extract NEVER writes files, NEVER asserts fact; MAY split one blob into multiple nodes (array); confidence = routing fuel.
route(node)→home, cheapest first: (1) BY TYPE (engine, deterministic): registry default_home (measurement→series via sample_of, person→[[People]], agent→[[Agents]]); no LLM. (2) BY CONTENT (skill, LLM): score candidate homes vs description+tags+links → top+confidence; if ≥threshold AND valve allows → auto-route. (3) BY ASKING (agent→user): low confidence / epistemic-sensitive → ask; stays stage:inbox until answered.
Engine invariant regardless of tier: exactly one home; two homes = validation error; home edge cycle-checked + depth-limited (maxDepth=3 soft). Multi-belonging always degrades to links[], never second home. Enrichment = stage advancing inbox→routed→enriched, each an engine op w/ guard, triggered by agent.

## 4. ADRs
#1 Belonging: exactly one home (cascade source for context+importance); multi-belonging = typed links[] (rel:also_serves/part_of) in graph+backlinks but NO cascade. Alts: multi-parent cascade (rejected: ambiguous importance max/min/weighted + ambiguous context merge), no-home pure graph (rejected: loses deterministic inherit, flat soup). Consequences: deterministic testable cascade; Obsidian-native (home+links = wikilinks); (−accepted) "two directions equally" feels lossy but is first-class queryable link; re-home = guarded engine op.
#3 Open registry: type = open string vs runtime registry; core ships base types; modules register additional w/ validator LAYERED on base; schema=type@version pins. Alts: closed TS enum (rejected: module types compile-time-only = Axis D gap), free types no validation (rejected: loses typed integrity). Registration shape: registerType({name, version, defaultHome, validate(node):Issue[] validates ONLY type-specific block, resolveHome?}). Pipeline = baseSchema.validate (always) THEN registry.get(type).validate (if known); unknown type → degrade to note + warning, never reject (open/closed principle). Consequences: prompts/commits/people/rules become types w/o recompiling core; schema@version enables migration; (−) two-layer validation cheap; name collisions → registry namespaces/rejects dup.
#4 Epistemic: add epistemic (fact|hypothesis|proposal|archived) ORTHOGONAL to state (open/doing/done). Extraction always epistemic:proposal; promotion to fact = explicit logged transition (valve). Alts: one status field (rejected: central risk agent cites own hypotheses as facts + executes unapproved), per-node confidence float only (rejected: can't gate execution authority cleanly, need discrete states). Consequences: hard engine rule — agents may not read hypothesis/proposal nodes as facts in getContext, may not execute side-effects from proposal = trust-valve mechanism; valve = auto-promotion threshold proposal→fact (width=config, mechanism=fixed); promotion needs logged transition (a trace node) = the trust log STATE.md wants.

## 5. Diff vs @ff/core node.ts
kind:NodeKind(closed) → type:string + schema:string (keep NODE_KINDS as SEED registry not frozen type). parentId? → rename home?:string. status?:TaskStatus → split state?:string(workflow) + epistemic:Epistemic(new, required). Link{to,rel} → +href?:boolean (external/git). ADD description:string(required), occurred?/valid_from?/valid_until?/supersedes? (Axis A), stage(inbox|routed|enriched), source?. meta → typed block per type (node.measurement, node.person) validated by registry, not junk drawer. actor → formalize 'user'|'agent:<id>'.
New types: EPISTEMIC=['fact','hypothesis','proposal','archived']; STAGE=['inbox','routed','enriched']; Link{to,rel,href?}.
New pure module to build: @ff/core/obsidian.ts — maps FFNode ↔ Obsidian markdown (frontmatter↔fields, body↔content, home/links.to↔[[wikilinks]]); unit-testable, no LLM.

## (A) Canonical schema — to lock (see §1 YAML).

## (B) Single architectural question for owner
**Is `home` a physical FOLDER (file literally lives in that directory) or purely a logical frontmatter pointer (flat vault, home: = just a link)?**
Folder=home: Obsidian-native org free, "one home" visually real, but re-homing = file-move, location & cascade-parent fused (rigid but simple). Logical: flat vault, re-home = one-line frontmatter edit, cascade computed, but lose folder navigation, lean on Dataview/graph. Determines whether route() = file-move or frontmatter-write, whether getContext walks filesystem or index, how much Obsidian navigation inherited vs rebuilt. Shapes all of C3 + C5; decide before any code.
