---
node_type: analysis
lens: depth-user
date: 2026-08-05
topic: assemble-and-direct
owner: jenya.stasik@gmail.com
source:
  - ../01-execution-plan.synthesis.md
  - ../00-fact-base.synthesis.md
  - ../../census/01-brain-kernel.census.md
  - ../../../../02-project/core/01-brain/INDEX.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/V1-chitaemost.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/V7-soglasie.md
---

# Depth-user lens — does the memory-base meet what a real human will expect?

> Method: put yourself as the human whose life this base holds. Walk the 6 interrogation axes the
> orchestrator specified, anchor every claim to a file/line, separate BLOCKER (breaks a stated promise)
> from SERIOUS (real miss, not yet promised loudly) from NICE (polish).

## Axis 1 — Readability / passport: can the human SEE their memory?

`01-brain-kernel.census.md` line 50: "Читаемость (нет паспорта)" is the census's own verdict — zero code,
zero unit. `V1-chitaemost.md` (`01-overview/01-values/V1-chitaemost.md`) defines Читаемость as "unit gives
the right facet to the right reader at the right price, without exposing itself whole" — this is a design
sentence about an *agent-facing* projection mechanism (progressive disclosure, CQRS projections, JSON-LD
`@context`), not a human UI. There is no artifact anywhere in the read set that describes "what does the
owner see when they open a memory item." `OVERVIEW.md` (`01-overview/OVERVIEW.md`, per census) describes
"2 tables nodes/edges + passport+payload" as a data-model sketch, still not a *view*. The passport concept
exists as a noun in the anatomy sketch but has no owner-facing rendering, no CLI, no query surface.
**Concretely**: if the owner asked "what does my base currently believe about my rent payment," there is
no code path that answers that in human language — `explain-chain`/T-7 is 0 lines (fact-base line 40,
census line 59: canon claims `kernel-acceptance-tests.md` marks T-7 "Phase-1 status: REAL" while the CLI
`inspect/explain` does not exist — a **canon lie**, verified against code today). This is agent-only soup
by default; readability is a *value name*, not a delivered capability.

## Axis 2 — Control / consent: real or theatre?

`V7-soglasie.md`: "hard-erase (право на забвение, заложить сейчас)" is listed as an L2 idea to design, not
a shipped mechanism. Fact-base line 49 ("Ценности × код-якорь"): "Согласие (`valveGate` есть, erase —
форма)" — i.e. the one piece of code that exists (`valveGate`) is a form/gate shape, not a working
consent-revocation flow. `01-execution-plan.synthesis.md` §6 FORK-2 states explicitly: "`erasure.ts` =
'NOT the feature'"; ADR-0007 (per census line 40) is **SPLIT** — only the day-1 admission-gate minimum is
approved, "crypto-shred/mode B/C/7 questions" remain draft. So: "forget this," "don't act on that,"
"correct a wrong memory" — none of these have a real, tested path today. The owner-facing promise (project
CLAUDE.md: "видно, что он делает... клапан только на внешние необратимые действия") implies revocable
consent is core, but the actual state is a name (`valveGate`) plus an unfinished ADR. This is real
theatre risk: a value card that reads as settled ("Ц-7 Согласие") while the enforcement layer is a
stub.

## Axis 3 — Seeing what agents do: audit or blind trust?

CLAUDE.md's promise "всё видно ИИ; ИИ не ограничен; видно, что он делает" maps directly onto the
explain-chain/T-7 capability — and that capability is **0 lines of code**, with the canon actively
mis-claiming it as "REAL" (census line 59, verified against code same day, 2026-08-04). `access_event` is
"declared as written by `resolve()`" in canon but has **0 writes** in code (census line 59). So the two
mechanisms that would let a human audit agent action on their memory — an event log a human can query, and
an explain/inspect CLI — both do not exist, while the docs describing them assert they do. This is the
sharpest MISMATCH in the whole read set: it's not merely undone, the canon is currently *false* about it,
which is worse than an honest gap for user trust.

## Axis 4 — Trust / wrong memory / mis-attribution recourse

`01-execution-plan.synthesis.md` §6 FORK-2 and §7 R2: ~2000-2700 real customers' PII flows through
ga-rentacar with `erasure.ts` "NOT the feature," `PayloadStore` an "unread blind zone." Fact-base truth #4:
M2 was built by a lens that bypasses PEP and does not traverse `same-as` — i.e. the one production module
touching real people's data was, until this plan, capable of silently mis-joining/mis-attributing facts
across identities, with no user-facing correction path. §2's PROCEED-BY-REF verdict fixes the *storage*
risk (payload stays shreddable-by-ref) but does **not** create a user-facing "this is wrong, fix it" flow
— that remains FORK-2, "standing, not blocking." For the *end user* (a rentacar customer, or the owner
themselves), if the base attributes a fact to the wrong person today, there is no described mechanism to
even discover it happened (no explain-chain), let alone correct it.

## Axis 5 — Value felt on day one

`01-execution-plan.synthesis.md` R5 states the standing risk plainly: "no named beneficiary, zero evidence
memory changes behavior" — this is quoted from the value lens directly into the risk register, meaning the
council itself flagged that nobody has yet shown a human or even an agent's decision actually changing
because of something the memory remembered. D1's acceptance criterion (§ "Slice-level acceptance") was
added specifically to force one concrete instance: balance-observer changing a flag on a real order because
of an earlier fact. As of this read, that proof does not yet exist — it's a plan requirement, not a
delivered result. So today, day one, the honest answer to "what do I get" is: nothing demonstrable yet.

## Axis 6 — Growth without overwhelm

Weakest-evidenced axis in the read set — no artifact directly addresses "how does a human stay oriented as
their memory graph grows to thousands of nodes." The closest adjacent signal is DV ("Vitality/drift-detector
... the real 'Vitality=0' debt," `01-execution-plan.synthesis.md` §4 DV, fact-base line 50: "Витальность
(0 кода)") — but DV as scoped is a *system* liveness/drift observer for engineers, not an
orientation/navigation aid for the human owner browsing their own growing base. Readability (Axis 1) is the
load-bearing value for this axis and it is equally undelivered, so growth-without-overwhelm inherits Axis
1's blocker by transitivity — there is no passport to page through.

## Ranked gaps

1. **[BLOCKER] No human-facing view of a memory node at all** ("passport" is a data-model noun, not a
   delivered projection/UI). Anchor: `01-brain-kernel.census.md` line 50 ("Читаемость — нет паспорта");
   `V1-chitaemost.md`.
2. **[BLOCKER] Canon actively claims audit/explain capability ("T-7 REAL") that has 0 lines of code** —
   this is not absence, it's a false positive the owner would trust. Anchor:
   `01-brain-kernel.census.md` line 59 (verified against code 2026-08-04).
3. **[BLOCKER] Consent/erasure is a stub wearing a finished-sounding name** (`valveGate` exists,
   revocation/hard-erase does not; ADR-0007 SPLIT). Anchor: `01-execution-plan.synthesis.md` §6 FORK-2;
   `V7-soglasie.md`; fact-base line 49.
4. **[SERIOUS] Real PII (2000-2700 people) flowed through a lens that bypassed identity resolution
   (`same-as`) until this plan** — mis-attribution risk with no correction path even after the fix, because
   the fix addresses storage, not user-facing dispute/correction. Anchor:
   `01-execution-plan.synthesis.md` §7 R1/R2; fact-base truth #4.
5. **[SERIOUS] Zero evidence any agent decision has ever changed because of memory** — the core value
   proposition is unproven even to the builders, flagged in their own risk register. Anchor:
   `01-execution-plan.synthesis.md` §7 R5.
6. **[SERIOUS] No mechanism for the human to correct a wrong memory once found** — even after explain-chain
   ships, there's no described "dispute/amend" act type in the read set (only `IMMUTABLE_ACT_META`,
   erasure-by-reference). Anchor: `01-execution-plan.synthesis.md` §2 (by-ref journal design); absence
   noted, not found elsewhere.
7. **[NICE] Growth/orientation-at-scale has no dedicated owner-facing design** — inherits from Readability
   gap; DV is scoped as an engineering liveness meter, not a human navigation aid. Anchor:
   `01-execution-plan.synthesis.md` §4 DV.

## THE-ONE

**Gap 3 — consent/erasure is a stub wearing a finished-sounding name — is the single gap most worth
drilling with a serious advisor this hour.** Why non-obvious: on a skim, "Ц-7 Согласие" reads as a settled,
named value with code (`valveGate`) behind it — it looks *more* done than Readability (which openly says
"no passport"). The real state is the inverse of the surface impression: Согласие *looks* shipped and is
actually a shape with no revocation engine behind it (erasure.ts explicitly "NOT the feature," ADR-0007
SPLIT), while the project's own outward promise — "видно, что он делает," "клапан на необратимые действия"
— is *specifically about consent/control*, not about readability. This is the value where the gap between
stated promise and delivered reality is widest AND least visible on casual reading, and it sits directly on
top of a live PII risk (2000-2700 real people, FORK-2 "standing"). Readability's gap (#1/#2) is more
totally undelivered but is honestly labeled as such everywhere it's mentioned; Consent's gap is dangerous
precisely because it doesn't look like a gap.

## MISMATCH (code reality vs stated promise)

- CLAUDE.md promise: "всё видно ИИ; видно, что он делает" ↔ code reality: `access_event` 0 writes,
  explain-chain/T-7 0 lines, while `kernel-acceptance-tests.md` marks T-7 "Phase-1 status: REAL" — canon
  actively lies, not merely silent. (`01-brain-kernel.census.md` line 59.)
- Value name "Ц-7 Согласие" (consent) ↔ code reality: `valveGate` = form/gate shape only; hard-erase is an
  L2 idea "to lay down now," not built; `erasure.ts` explicitly documented as "NOT the feature."
  (`V7-soglasie.md`; `01-execution-plan.synthesis.md` §6 FORK-2.)
- "Читаемость" (legibility) framed as an agent-projection mechanism in `V1-chitaemost.md`, with no
  corresponding human-view artifact anywhere — the value's own definition never mentions the owner as a
  reader, only "нужному читателю" (agents, implicitly).

## READING (for the owner)

1. `docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md` §6 (OWNER FORKS,
   especially FORK-2) and §7 (risk register R2/R5) — this is where the plan itself admits the user-facing
   gaps as standing, unresolved forks.
2. `docs/02-project/core/01-brain/01-overview/01-values/V7-soglasie.md` — five lines that show exactly how
   thin the consent mechanism is versus how settled the value card reads.
