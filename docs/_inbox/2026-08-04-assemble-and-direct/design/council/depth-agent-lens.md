---
node_type: analysis
lens: depth-agent
date: 2026-08-05
owner: jenya.stasik@gmail.com
topic: assemble-and-direct
related:
  - ../01-execution-plan.synthesis.md
  - ../00-fact-base.synthesis.md
  - ../../census/01-brain-kernel.census.md
  - ../../census/03-agent-system.census.md
  - ../../../../02-project/core/00-kernel/invariants.md
  - ../../../../02-project/core/01-brain/01-overview/OVERVIEW.md
  - ../../../../02-project/core/03-contract/INDEX.md
---

# Depth-probe: does the memory-base design meet a real agent's needs?

> Method: read inside-the-agent. For each expectation (recall, knowing-what-it-knows, write-back,
> concurrency, forgetting/salience, time), checked whether the design ANSWERS it concretely, and whether
> code (per census/coverage-map) backs the answer or it's paper-only.

## RECALL — designed on paper, unusable in practice
- `I-7` (resolve() single PEP) states retrieval order is `rights → similarity` and mentions vector-search
  as a controlled path. `I-14` allows embeddings as a rebuildable projection, RAG as a pluggable lens —
  so a *relevance* layer is conceptually permitted.
- But: 0 code. `access_event` (would log what an agent looked up) has 0 writers (picture-coverage
  spot-check, confirmed in `01-brain-kernel.census.md` "Истина vs дрейф"). `cost-tree`, the one working
  lens neighboring retrieval, implements none of the value-6-facets it claims.
- Worse: TODAY's only real production reader (`customer-lens.ts`, ga-rentacar) reads via `graph.byId`
  bypassing `resolve()` entirely — exactly the "PEP obligatory, not opt-in" lesson in fact-base truth #4.
  D1.a in the execution plan is *literally* "route customer-lens off byId onto resolve()".
- **Conclusion: an agent today can only fetch a node if it already holds the id.** There is no query
  language, no "find nodes relevant to X" API, no ranking — designed-permitted, not designed-specified,
  not built. This is the sharpest form of the owner's fear: it *reads* green (I-7/I-14 exist, sound
  rigorous) but answers zero of "how does an agent find what it needs."

## KNOWING-WHAT-IT-KNOWS — write-time only, read-time unspecified
- `I-2` mandates actor+provenance on every write ("no anonymous mutation") — solid write-side lineage.
- Epistemic status is named as a principle in project CLAUDE.md ("эпистемический статус = метка, не
  стена") and `03-doverie/` has a `02-calibration/` facet folder — so the INTENT to expose trust/confidence
  at read time exists.
- But nothing in the read path (no `resolve()` clause, no API shape) says an agent calling for a node gets
  back "this is provenance X, confidence Y, last verified Z" as opposed to just the payload. Doverie is
  rated "частичный" and Vitality "0 кода" in fact-base's value×code table — the value pair most exposed to
  this exact gap.
- **Verdict: SERIOUS, not blocker yet** — the model has the right bones (I-2) but nothing forces provenance
  to surface back to the reading agent; an agent cannot currently ask "is this stale/unverified?" and get
  a real answer.

## WRITING-BACK — contract is a literal empty frame
- `docs/02-project/core/03-contract/INDEX.md` (read directly): 8 lines of header + a 3-line "what goes
  here" list. Zero concrete rules. Unchanged since 2026-07-06 — the census calls it "the oldest,
  least-developed home in the area."
- The one real write-back cycle in existence, `balance-observer.ts` (graph → observation → graph), was
  built entirely ad hoc and never reflected back into the contract — "implementation outran the contract
  document" (census, verbatim).
- `invariants.md`'s own trailing open item: ActKind separation (`domain_event / observation /
  access_event / agent_trace / telemetry`) is *named* but "retention/replay/authority по потокам ещё не
  зафиксированы как инвариант." `agent_trace` — an agent's own reasoning as a node — is mentioned once and
  never specified.
- **Verdict: BLOCKER.** An agent has no documented promise of what it may write, what shape its own
  reasoning trace takes, or what's authoritative vs advisory. One working instance exists in code; it does
  not generalize because nothing generalizes it.

## CONCURRENCY / MULTI-AGENT — absent, and hidden inside a safety gate, not named as a gap
- No file found under kernel/brain/agents/contract that discusses concurrent writers, write ordering,
  conflict resolution, or staleness between two agents. Grep across the whole core tree for
  concurrency/lock/race/multi-writer returns only tangential hits (terminology glossary entries, unrelated
  designs).
- The only real signal is buried in the execution plan's risk register, not in the design docs: **D4 gate
  E2 — "do NOT grow agent count until D1.a green (F-3 fail-open is safe only with today's single correct
  writer)."** Read plainly: the system's current safety property for concurrent writes is *"there is
  exactly one agent."* The moment a second real agent writes, this property is gone and nothing replaces
  it — D3 (agent-layer maturation) is explicitly **deferred until "≥2 real agents disagree about the
  contract"** — i.e. concurrency semantics get designed reactively, after a live collision, not before.
- **Verdict: BLOCKER, and the most non-obvious one** — it doesn't show up as a named open question
  anywhere; it's an implicit precondition load-bearing a green status, exactly the kind of "looks green on
  paper" risk the owner fears, except inverted: paper doesn't even claim to cover it, so no one is tracking
  it as debt.

## FORGETTING / SALIENCE — designed-intent only, compounds with the recall gap
- `I-4`'s pending carve-out (retention-prunability for `observation`/`trace` vs `domain_event`) shows the
  team knows durable-forever needs *some* pruning path — but it's un-ratified (blocked on KQ-8).
- `01-values/06-relyacionnost/04-edge-decay/` exists as a facet folder (title alone confirms decay was
  imagined), and Vitality (Ц-4) is explicitly the value meant to carry "salience/liveness" — coverage-map
  rates it **0/42 facets at green-product depth** and fact-base states flatly: **"Витальность = 0 кода
  вообще."**
- **Verdict: SERIOUS, compounding.** Combined with the RECALL gap: an agent facing a durable, never-forgets
  graph has no query layer to filter it AND no decay/salience mechanism to deprioritize old facts. Today
  it's cheap only because the graph is still small (M2, one tenant, unshipped). It will not stay cheap.

## TIME (as-of) — the one gap that IS honestly flagged
- `axes-and-time.design.md` + `invariants.md` explicitly: bitemporal fields (`recordedAt/validFrom/
  validTo`) are in the schema intent, but as-of/time-travel query is **openly deferred, D-5, post-MVP**,
  called out in the invariant table itself (`I-1`/`I-4`/`I-5` all footnoted "*post-MVP, does not prove
  v1*"). `kernel-acceptance-tests.md` T-4 is marked "○ DEFERRED, nothing to run."
- **Verdict: NICE-for-now.** Real gap, but self-aware — tracked as a named, owned deferral, not a silent
  blind spot. Lower priority to drill than the four above precisely because nobody is pretending it's done.

## Ranking rationale
Recall and write-back-contract are named or half-named already in the owner's own framing (byId, empty
contract) — real but expected. Concurrency is the one gap that (a) blocks the system's own near-term
roadmap (D3/D4 explicitly gate agent-count on it existing), (b) is nowhere written down as a design gap,
only implied by a risk-mitigation sentence, and (c) will surface the moment the plan's own D3 trigger
("≥2 real agents disagree") fires — meaning the plan is currently betting the contract gets written
*after* the first real collision, not before.

## What's designed well (don't over-correct)
1. **Access control substrate** — `resolve()` as sole PEP (I-7) + fail-closed-by-behavior (I-9) +
   deny-as-clamp-not-layer (I-8) is a genuinely rigorous, consistent model; `durable-storeport` is the one
   node in the whole census independently verified as green via real cross-process tests (commit
   `b881212`), not just docs.
2. **Write-time lineage discipline** — I-2 (actor+provenance mandatory, no anonymous mutation) and
   append-only I-3/I-4 give a solid backbone for later audit/explain-chain work, even though explain-chain
   itself isn't built yet.

## Reading pointers for the owner
- `docs/02-project/core/03-contract/INDEX.md` — read it directly; 8 lines, unchanged since 2026-07-06.
  Seeing the literal emptiness makes the write-back gap undeniable in a way the census prose can't.
- `docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md` §4 "D4 — Gateway
  reliability" (gate E2) — the single sentence that reveals concurrency is currently "solved" by capping
  agent count at one, not by any actual mechanism.
