# RAW — Abstract-thinker lens · C2+C3 extract→route · 2026-06-15

> Saved verbatim (condensed). Synthesis: `docs/product/DEEPDIVE-2026-06-15-c2c3-extract-route.md`.

## ABSTRACTION LENS

### 0. Assumptions
Files=truth; markdown+frontmatter; one solo owner + few agents are only writers. "6 facets" is a description not a committed schema. Originating pain: memory doesn't separate fresh from stale fact, my-fact from agent-guess, and context flows down only one parent.

### 1. Extraction & routing = two phases of ONE act, separated by confidence
C2 produces node with status `proposed`. C3 = moving the SAME node to `accepted` + (side effect) attaching home + links. The only boundary is EPISTEMIC STATUS, not mechanism. `raw→proposed→routed→enriched` is not four capabilities — it is ONE field changing value over time. The pipeline is an illusion of boxes around states of one object.
→ Don't build separate "extractor" + "router" skills with a handoff format. Build one op `propose(node)` and one op `commit(node, home)` (commit = raise status + set home). Links/importance = enrichment, before or after commit, no own capability.

### 2. Home = a privileged link
A home is not a different KIND of relationship — it is a privileged link: the one edge you agree to inherit from. Mechanically home = link{rel:parent}. What's special is a POLICY: "context + importance cascade along THIS edge only."
Cleanest model: **A node has many edges. Exactly one edge is marked `inherit:true`. That edge is the home.**
Gain: delete a field + a concept; re-homing = flip a boolean; honestly polymorphic (belong to Sport+Career via two edges, one inherits) → Axis B contradiction DISSOLVES (cascade was never incompatible with multi-belonging, only with the parentId implementation that fused parent + context-source).
Lose: tiny guardrail (must enforce "exactly one inherit:true" — one-line validation); a little human legibility (home: career/ml reads clearer than hunting the flagged link — matters for Obsidian).
Recommendation: keep `home` as a SURFACE convenience field but understand it as nothing more than the inheriting edge. One concept with a flag, not two concepts.

### 3. Irreducible core = IDENTITY · CONTENT · EDGES (5 fields)
Core = id, type, title, body, edges[]. The 6 facets collapse:
- id+type+title+description+body → IDENTITY+CONTENT (drop `description` as stored field — it patches "title not enough for AI"; use title + optional body summary/embedding; fewer slots, no "which field do agents read").
- time → a meta field DEFINED BY TYPE (metric/event/fact), NOT universal (person has no validUntil, metric has no body). Putting occurred/validFrom/Until on every node = same mistake as closed kind enum: forcing one shape on heterogeneous things.
- status → TWO orthogonal axes mashed: EPISTEMIC (true/trusted: proposed→accepted, fact/hypothesis/archived) vs WORKFLOW (done: open/doing/done). A task can be accepted+doing. A fact is accepted + has no workflow status. Fusing them is THE confusion that rots everything.
- home → an edge with inherit:true, not a facet.
- links → EDGES (core).
- importance → cascaded/computed with manual override, derived not core.
Defensible shape = core(5) + two typed axes (epistemic + optional time-by-type) + computed importance = 3 layers, not 6 flat facets.

### 4. Mental model — the self-filing catalog card / library
Git analogy (add=stage candidate, commit=exists with parent, home=parent commit, epistemic=staged vs committed, bitemporal=author-date vs commit-date) fits files=truth.
Chosen model: **node = a catalog card that also files itself; owner + agents are librarians.** Raw arrives at front desk (inbox). A librarian writes a proposed card (extraction). Card sits in "to-be-filed" tray (proposed). Filing (routing) = stamp accepted, put in ONE drawer (home), run cross-reference threads (links). Cross-referenced from many drawers, lives in one. Old cards get "superseded — see #N" stamp, not shredded.
Fits solo owner + agents = library with one head librarian + assistant librarians. The "should agent file or just propose?" tension = apprentice rule: apprentice may write cards into the tray, cards stay `proposed` until head librarian (or trusted senior agent) files them. That IS decision #4.
Predictions (testable): (1) inbox is a place not a state machine — don't over-engineer C1; (2) one drawer per card (home) natural + unlimited cross-refs — #1 is correct; (3) the stamp matters more than the card — epistemic status is load-bearing, #4 not optional; (4) cards age — store supersession edges not deletions; (5) card is tiny, book is elsewhere — node = thin wrapper, heavy thing (file, git commit, URL) lives outside and is referenced (href) → #5 resolved: git is the book, node is the card pointing to it; don't mirror commits, file a card referencing them only when you want a cross-ref.

### 5. THE one conceptual confusion
Conflating "is this trusted/true?" with "is this done / where does it live?" — one `status` field doing an epistemic axis AND a lifecycle axis; and `home` pretending to differ from an edge. Boiled down: mixing "how much do I believe this?" with every other question. It's THE one because the system exists for TRUST UNDER AUTONOMY. If "trusted?" isn't a clean independent first-class axis: agents cite hypotheses as facts; proposed-vs-accepted tangles with open-vs-done; the C2→C3 (confidence) boundary becomes undefinable. Category error — leaks into every query/prompt/cascade. Fix once: make `trust` (epistemic) its own axis. Then C2 = create node trust:proposed, C3 = raise trust + set home.

### (A) Simplest defensible shape
```
node: id, type, title, body?, edges[]{to,rel,inherit?,href?}, trust: proposed|accepted|superseded
  # type-defined (not universal): metric→value/unit/occurred; task→workflow open|doing|done; fact→validFrom/Until
  # computed w/ manual override: importance (inherited along inherit-edge + nudge)
```
5 universal fields (id,type,title,edges,trust) + type-defined bag + one computed number. home/metrics/time/task-status stop being top-level. 3 layers: core/typed/computed.

### (B) Reframing question for owner
"When an AI agent reads something and decides it's true — is that the SAME act as when YOU decide it's true, or a different one?" If different (almost certainly) → trust is first-class, C2 produces proposed, C3 = acceptance, home = the inherit edge — whole design falls out. If same → don't need epistemic at all, model shrinks further, but you lose the safety that justified the project.

### Recommended next step
system-architect should test 5-field core + home-as-inheriting-edge + trust-as-orthogonal-axis against the 50 stress-test cells — checking whether splitting status into trust + per-type workflow cleanly resolves Axis B and C without a 6th universal field.
