---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-23
Scope: project
Related: ../analyses/architecture-and-plugin-model.analysis.md, ../facts/architecture-facts.md
---

# Open questions — architecture lens, with links to our 7 values

## Q1. Does "everything is a plugin" strengthen or fight our V5 Suverenность (portability)?

**Both, and the split is instructive.** Cordis's plugin unit (`{inject?, apply(ctx)}` or a `Service`
subclass) is portable ACROSS THE SAME Cordis runtime — you can move a plugin between DSH bundles
(`base`/`web-app`/`headless`) because the composition contract (declare what you need via `inject`,
provide what you offer via `ctx.reflect.provide`) is uniform. That is real, demonstrated portability
within one substrate: 78 heterogeneous subsystems (llm, session, mcp, lsp, sandbox...) all satisfy
the same contract and get reshuffled per-bundle via a declarative patch file, not per-bundle bespoke
wiring code (`architecture-facts.md` #13-14).

But it does NOT solve our V5's harder claim — *a unit carries its OWN policy+schema and survives a
move to a DIFFERENT engine*. Cordis portability is engine-INTERNAL: the plugin's `inject` names are
meaningless outside a Cordis `Context`; there is no policy/schema payload traveling WITH the plugin
object itself, only a code reference plus a declared dependency list resolved by whichever `Context`
happens to host it. Our V5 is closer to: the unit (memory-node) carries its schema+policy as DATA
(frontmatter/JSON) that a DIFFERENT storage/agent engine could read without sharing Cordis's runtime
at all. Cordis's dynamic-plugin layer is the closest analogue to true portability-of-a-unit — a
`define()`'d Package is pure source text + immutable id, stored independent of any live fiber
(`architecture-facts.md` #17) — but it's still JS source meant for the Cordis VM sandbox
(`sandbox.ts`), not schema-carrying data meant for an arbitrary reader.

**My current read:** Cordis's pattern is a strong PRECEDENT for "declare your dependencies, don't
hardcode wiring" (useful for our agent/service boundaries) but is NOT itself an implementation of
cross-engine portability — that remains our own, harder problem. Worth flagging to the lead:
don't let "they solved plug-in" become an unexamined assumption; they solved *intra-runtime*
plug-in composition, we're reaching for *inter-runtime* unit portability.

→ My proposed answer, confidence: medium (I did not read `vendor/cordis/src/reflect.ts` in depth,
which might carry more of the "identity travels with the value" story than I credit here).

## Q2. Does Fiber mount/unmount resemble our V4 Витальность (dormancy, not deletion)?

**Structurally close, semantically different axis.** Fiber's `PENDING ↔ ACTIVE` cycle is fully
REVERSIBLE and driven by *external* condition (dependency availability) — a fiber isn't "choosing"
to go dormant, it's forced dormant because something it needs vanished, and springs back the instant
that need is met again, with no memory of "how long was I down" or "should I still bother." That's
closer to a circuit breaker / lazy-activation pattern than to our V4's *intentional* value-decay
(salience cooling, `hot→cold`, consolidation). Cordis has no notion of a node earning less trust or
attention over TIME while nothing about its dependencies changed — Fiber state is a pure function of
the dependency graph, never of elapsed time or usage frequency.

The one genuinely useful borrow: **teardown-is-mechanical** (`architecture-facts.md` #6-7) — every
registration MUST hand back its own undo, so going dormant never leaves stray effects (timers, event
listeners) running. If we ever give our nodes a "cool → inactive" state that also needs to release
resources (e.g. a running background watcher tied to a node), the discipline "you may not register a
live effect without simultaneously supplying its own reversal, and unwind is strict LIFO" is a
concrete implementation pattern worth stealing regardless of whether the trigger is dependency-loss
(theirs) or salience-decay (ours).

→ My proposed answer, confidence: medium-high on the "different axis" claim, lower on how much of
their teardown machinery would actually transfer to a memory-node runtime (that's a builder/architect
question, not one I can settle by reading source).

## Q3. Is the LLM-authored dynamic-plugin layer a preview of what our own "agents write to the graph"
mechanic should look like?

Cordis's answer to "the agent extends its own runtime" is: expose the SAME composition primitive
(define → run → stop/undefine) to the model as a tool surface, with append-only immutable versions,
explicit human-approval-as-state-machine, and an honest disclosure that the sandbox stops accidents
not malice (`architecture-facts.md` #16-21). That is a genuinely different design point from "agent
writes structured data into a graph that a separate policy layer later gates" (our current framing) —
theirs is "agent writes CODE that becomes a live, first-class citizen of the runtime, with the same
mount/unmount rights as engineer-authored plugins." Open question for us: do we want agent-authored
graph contributions to have that same RUNTIME weight (can activate services, receive events) or do we
deliberately want agent writes to stay inert data until a separate, non-code gate promotes them? Our
V7 Согласие (consent) and the "clapan только на внешние необратимые действия" principle in our
CLAUDE.md suggests we lean toward the latter — but Cordis shows the former is buildable and shippable
with real approval-loop discipline (checkbox semantics, steer-back-into-context). Worth a direct
question to the owner/architect: is "agent can mint a live plugin" ever in scope for FF, or is it
explicitly out-of-bounds by design (data-only agents)?

→ My proposed answer, confidence: low — this is a scope decision for the owner, not something I can
resolve by reading DSH source.

## Residual gap

I read the DSH-vendored copy of Cordis and DSH's own primer/tutorial pointer, but did NOT
independently fetch the upstream `cordisjs/cordis` repo/docs this pass (see fact #24) — a second pass
against upstream could reveal whether DSH's vendored copy has diverged (patches, restrictions) in
ways that matter for the portability question in Q1.
