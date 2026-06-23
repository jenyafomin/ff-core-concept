# RAW — Critic lens · C2+C3 extract→route · 2026-06-15

> Saved verbatim (condensed). Synthesis: `docs/product/DEEPDIVE-2026-06-15-c2c3-extract-route.md`.

## CRITICAL (must address)
1. "надо разобраться с этим" not solvable by Librarian; design pretends otherwise. Zero signal for type/title/home/links/importance → agent hallucinates plausible node, lands as real. No field encodes "I made this up because input was garbage." 6 months → 40 "надо разобраться" nodes, none enriched/linked/done; can't separate "mattered once" from noise. Evidence: status is task-only, no epistemic status (decision #4 unresolved).
2. One-home rule corrupts cross-cutting retrieval; links don't fix it. "встреча с Антоном по вакансии в Яндекс" belongs to Карьера + Люди→Антон + Яндекс. Pick Карьера → Антон's getContext (cascades down home only) can't find the meeting; add link meeting→involves→Антон but CONCEPT says context cascades from home not links → invisible to "context for next Антон meeting" unless separate backlink query, and there's no canonical backlink query yet. Every meeting/cross-domain obligation/person = systematic retrieval blind spot.
3. getContext silently loops or truncates, undetectable. maxDepth=3 promised but ABSENT in code; cycle protection only for parentId not links. Either stack overflow or silent truncation with no "stopped at depth 3, here's what I cut" envelope. Task deep in Карьера→Яндекс→Role→Prep gets envelope omitting Карьера-level strategy → agent acts inconsistent with strategy, owner won't know why.

## CONCERNS
4. Multi-entity message: no defined output contract. "Завтра встреча с Антоном, обсудим бюджет Q3, написать оферту до пятницы" = meeting + person + metric context + task. How many nodes? Антон exists → merge/link/dup? Who approves — one batch or four? CAPABILITY-MAP marks OPEN. Core input pattern for solo worker; without contract every impl inconsistent → 12 "Антон" nodes in 3 months, no canonical one.
5. Proposal-vs-direct-write: asymmetric, design picks neither. Direct → 50 inputs/day = 1500 unreviewed nodes/month, none marked agent-generated-unreviewed. Proposal+approval → 50 proposals every morning = more overhead than paper; owner processes one week then stops → orphan graveyard. WORSE failure = direct-write garbage (poisons every future retrieval + agent action) vs backlogged inbox (merely useless). Design leans direct ("ИИ тянет сам") WITHOUT the epistemic guard that contains damage.
6. Duplicate & contradiction: no resolution. (a) "встреча с Антоном в пятницу" Mon then "напомни про встречу с Антоном" Wed → two nodes? merge? flag? No canonical/supersedes field. (b) "Антон надёжный" June then "Антон подвёл" Aug → two contradictory notes, no current/supersedes/context-valid mechanism; agent gets both, can't weight. validFrom/Until/supersedes proposed (ось A) but open decision #2.
7. Open typing → type sprawl WITHIN one module. Owner is only module-builder → meeting/call/interview/sync all = "time-boxed conversation w/ someone", different name each time because existing type wasn't obvious. No type search/did-you-mean/merge. Owner won't know which type to use = tag-sprawl failure. Stress-test itself lists meeting/event/scheduled-event unresolved.

## PROVOCATIONS
8. inbox→enriched assumes a stable daily ritual — contradicts "второй мозг который действует сам". Truly autonomous → items self-route; self-route w/o approval → direct-write garbage. Progressive enrichment is GTD review ritual in disguise. A system that acts for you doesn't need a daily review ritual; one that needs it isn't acting for you. Design hasn't picked which.
9. Forced decision on propose-vs-write (#4) is the keystone all C2+C3 hinges on, deferred across 3 sessions. Not because hard — because the council avoids the trade-off: accept garbage-in-graph OR accept daily review burden. No middle that scales.
10. Obsidian fork (C6) makes C2+C3 premature. C2 produces a format, C3 places in a structure. If Obsidian-compat changes frontmatter keys/link syntax/file naming, all C2+C3 decisions redone. Designing pipe fittings before choosing the pipe.

## NOTED
- Link.to unvalidated → hanging edges accumulate silently on rename/delete (watch >50 nodes).
- actor only provenance marker; no confidence/method (watch if direct-write chosen).
- meta is current home for type data → migration debt when typed schemas land.

## NOT problems
Graph substrate (node+edges+hierarchy) sound for scope; 6-facet concept clean. @ff/core 14/14 tests, disciplined — problem is what's NOT coded (maxDepth, backlinks, epistemic). files=truth/index=derivative correct, research-confirmed.

## 3 constraints that MUST hold
1. Every agent-written node carries epistemic status at creation — no exceptions. Must exist before Librarian writes one node. Blocks direct-write garbage.
2. Librarian resolves against existing nodes BEFORE creating new — dedup is first-class: search existing, present conflict, don't create if canonical exists. Else unusable in 60 days from entity proliferation.
3. getContext returns bounded envelope with explicit "truncated at depth N" signal — silent truncation worse than no context. Implement maxDepth guard; return type encodes what was excluded.

## THE single question for owner
"When the Librarian extracts a node from your voice note and you haven't reviewed it yet — do you want it IN the graph (visible to agents, potentially acted on) or OUTSIDE (staging area, invisible until you approve)?" Not a design question — about tolerance for autonomous action vs control. IN → implement epistemic status now, make it queryable so agents filter by confidence. OUTSIDE → design staging area as first-class, accept graph lags capture. Every other open decision follows from this.
