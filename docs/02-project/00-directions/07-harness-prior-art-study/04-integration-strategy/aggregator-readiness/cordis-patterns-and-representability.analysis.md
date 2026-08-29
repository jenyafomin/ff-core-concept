---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-23
Scope: project
Related: ../../01-deepseek-harness-cordis/analyses/architecture-and-plugin-model.analysis.md, ../../01-deepseek-harness-cordis/facts/architecture-facts.md, ../../01-deepseek-harness-cordis/questions/architecture-open-questions.md, ../../01-deepseek-harness-cordis/ideas/capabilities-to-borrow.idea.md, docs/02-project/core/01-brain/01-overview/01-values/_CARDS-2026-07-08.md
External source: github.com/deepseek-ai/deepseek-harness (MIT), vendored Cordis (`vendor/cordis/`) — read-only, code not executed. Read-only shallow clones at `/tmp/harness-study-a1-new` and `/tmp/harness-study-a2-work/repo` (both from Wave 1, 2026-08-23; not persisted, advisory only per source-of-truth hierarchy).
---

# Aggregator-thesis test: can our memory-substrate represent any Cordis pattern as data?

## Scope and method

Owner's aggregator-thesis (verbatim intent): FF is an **aggregator**, so the memory-substrate must be
able to represent ANY agentic pattern as **data in the graph** (node/edge/policy-as-data) — never as
something only a specific engine's code can express. This analysis tests that claim against Cordis, the
plugin framework DeepSeek Harness is built on, going one layer deeper than Wave 1's architecture study
(which already produced verified `file:line` facts — this pass reads the source Wave 1 flagged as unread:
`reflect.ts`, `utils.ts` (`DisposableList`), `permission-presets/src/index.ts`, `ui-slots/src/store.ts`,
`cordis-host-runner/src/{lifecycle,index}.ts`).

For each pattern: mechanism + code citation, then a representability verdict:
- **✅ representable as data** — expressible as a node/edge/field in our graph, no live engine required to
  define its existence.
- **⚠️ partial** — the STATE/SHAPE is data-representable, but the pattern's actual work happens in a live
  engine our graph doesn't replace (form travels, behavior doesn't).
- **❌ pure runtime** — the pattern IS a live mechanism (reactive recomputation, closures over live
  objects, subscriptions); there is no honest data encoding, only a description of it.

## Catalog: 8 patterns

### P1 — Plugin-as-service: `{inject?, apply(ctx)}` or a `Service` subclass

**Mechanism.** One composition vocabulary for the whole harness. `Service` base class
(`vendor/cordis/src/service.ts:42-59`): constructor self-registers via `ctx.reflect.provide(name, self,
check)` — no external registry call. A plugin is either that class shape or a bare `{inject, apply(ctx)}`
function object (`registry.ts:8-10` gates on `typeof object.apply === 'function'`). 78 named rows in
`packages/bundle/base/cordis.patch.yml` all satisfy this one contract (Wave 1 fact #13).

**Representability: ⚠️ partial.** The DECLARATION — a name, its `inject` dependency list, its static
`Config` schema — is cleanly data-shaped: exactly a node (`id=serviceName`, `type=service`) with typed
edges to the services it depends on. We verified this ourselves reading `registry.ts:16-23`
(`Inject<M> = (keyof M)[] | {[K in keyof M]?: M[K]}` — a plain dependency list, nothing exotic). But
`apply(ctx)` is executable code, and Cordis's own `Impl` record (`reflect.ts:116-125`) stores `value: any`
— usually a live object holding open resources, not serializable state. The wiring diagram is data; the
plugin body is not, and Cordis makes no attempt to separate the two into a portable payload (confirmed —
Wave 1 Q1 already flagged this: "no policy/schema payload traveling WITH the plugin object itself, only a
code reference").

### P2 — Reactive DI / Fiber epoch computation

**Mechanism.** `Fiber._refresh()` (`fiber.ts:611-623`) recomputes an `epoch` string from the `uid`s of
every injected service's OWNING fiber; any unresolved dependency collapses the epoch to sentinel
`INACTIVE`. `ReflectService.notify()` (`reflect.ts:307-336`, read this pass) is the actual propagation
engine: on every `provide`/dispose, it walks `ctx.registry.values()` → every `runtime.fibers`, calls
`fiber._checkImpl(name)` + `fiber._refresh()` for every fiber whose `inject` names the changed service,
and additionally fires an `internal/service` event. `ReflectService.store` (`reflect.ts:209`) is a live
`Dict<Impl, symbol>` keyed by an **isolation-label symbol** minted per (name, scope) — reads walk this
live index through a JS `Proxy` (`context.ts:74`, confirmed: `Context` = `new Proxy<this>(this,
ReflectService.handler)`), not through a query over stored facts.

**Representability: ❌ pure runtime.** This is not "a graph with lazy edges" — it is a **push-based
pub-sub engine that eagerly recomputes on every write**, walking live object identity (`fiber.uid`,
`Symbol` keys minted at runtime, not stable ids). Even the "which service names does fiber X inject"
FACT is data-shaped (and we already credit that to P1), but the propagation — who gets notified, in what
order, synchronously, via closures captured over a live `Context` — has no non-executing encoding. A
node/edge model can describe the WIRING; it cannot describe "this recomputes automatically on every
write" without itself becoming a live engine (which is exactly what our own engine layer would have to
be — this pattern is evidence for what belongs in the ENGINE, not in the data).

### P3 — Mount/unmount FSM + effect-scope disposer (strict LIFO)

**Mechanism.** States: `PENDING, LOADING, ACTIVE, FAILED, DISPOSED, UNLOADING`
(`fiber.ts:147-154`). `ctx.effect()` (`fiber.ts:415-561`) is the SOLE registration primitive: whatever a
plugin's setup returns (a disposer, a promise of one, or an iterable of several) becomes exactly what
unwinds it. We independently read the disposal collection: `DisposableList` (`utils.ts:5-40`) — a
`Map<number, T>` keyed by an incrementing serial number plus a parallel `WeakMap` for O(1) delete-by-value;
`clear()` (`utils.ts:27-31`) returns `[...map.values()].reverse()` — confirms strict LIFO teardown is a
genuine, small, auditable primitive (16 lines), not folklore.

**Representability: ⚠️ partial.** The FSM STATE ITSELF maps directly onto a field we already have a slot
for — `lifecycle_stage` (Ц4 Витальность: `nascent→active→cooling→cold`). Storing "which of 6 named states
is this unit in" as an enum field is trivial data. But the TRANSITION MACHINERY — a live `DisposableList`
of closures, walked and invoked in reverse order on unload — is runtime. A closure cannot be written to a
graph; at best we could record "unit X registered N effects, effect 3 was a timer, effect 7 was a listener"
as a log of WHAT was registered, but re-invoking them requires the same live process that created them.
Worth noting: this is the cleanest asymmetry in the whole catalog between "record that a lifecycle event
happened" (✅ trivial) and "be the code that performs the transition" (❌ always runtime).

### P4 — `ctx.isolate()` / `ctx.intercept()` (context fork = multi-tenancy)

**Mechanism.** `isolate(name, label)` (`context.ts:121-125`, confirmed) creates a CHILD context where a
service name resolves against a fresh label unless the label is deliberately shared — two branches of the
plugin tree get independent implementations of the same-named service without the parent knowing.
`intercept(name, config)` (`context.ts:139-145`) layers per-branch config, resolved ancestor-first
(`service.ts:86-102`, `[symbols.resolveConfig]`, confirmed this pass: it walks `this.ctx[Context.intercept]`
prototype-chain, `configs.unshift`-ing each ancestor's entry before `base`/`head`). Both operations return
NEW child contexts; the parent object is never mutated. Resolution itself is a live pointer-chase: the
`ReflectService.handler.get` trap (`reflect.ts:152-166`, read this pass) walks `fiber.parent[symbols.isolate][prop]`
up the chain on every property read that isn't already resolved.

**Representability: ⚠️ partial.** The TOPOLOGY — "context B is a child of context A, and resolves service
`llm` against a different label than its parent" — is exactly a scope tree, expressible as nodes-with-parent-edges
plus a per-edge override table (which is structurally close to what our own `intercept`-shaped need would
be: policy overrides per scope, Ц5's "own policy travels" ambition). But the RESOLUTION — the Proxy trap
walking live symbol-keyed maps on every read — is runtime. Confirms and sharpens Wave 1's Q1 finding: this
is real precedent for "declare a fork, don't hand-wire two copies," but it is intra-runtime portability
(a scope inside ONE live Context tree), not our harder claim of a unit surviving a move to a DIFFERENT
engine (Ц5's `engine_contract_version` / foreign-data-wrapper ambition has no Cordis analogue at all —
Cordis never asks "what if this scope's provider lived in a different process's Context").

### P5 — Agent given the SAME primitive as tool-surface (`cordis_define` / `cordis_run`), append-only immutable Packages

**Mechanism, define() (data half).** `DynamicCordisRunnerService.define()`
(`packages/extensions/cordis-host-runner/src/index.ts:151-202`, read this pass in full): validates
name/purpose/code non-empty, mints a `packageId`, builds a plain `DynamicCordisDefinition` record
(`{packageId, name, purpose, hostCode?, clientCode?}` — source code as STRINGS), then
`plugin.packages.set(packageId, definition)` — always a fresh key, confirmed no code path overwrites an
existing entry. `undefine()` (`index.ts:210-218`) does the opposite: `this.registry.delete(pluginId)` —
this is a genuine HARD DELETE of the plugin and every package under it, no tombstone kept (flag below).

**Mechanism, run() (execution half).** `run()` (`index.ts:248-`) resolves a plan then, on the host side,
`startHostHalf()` (`lifecycle.ts:22-45`, read this pass): awaits the parking-lot group fiber, mounts the
sandbox-produced plugin as a real child `Fiber` via `group.ctx.plugin(...)`, and on ANY startup failure
`await fiber.dispose()` runs before rethrow — "never leave a failed fiber mounted" is enforced by 24 lines
of code, not a convention.

**Representability: split, and the split is the finding.** ✅ the DEFINE half — `{packageId, name,
purpose, hostCode, clientCode}` keyed by a minted, never-reused id, owned by a stable parent `pluginId` —
is close to a textbook match for our own append-only unit model (Ц2 `variant_of`/append philosophy,
`docs/.claude/rules/doc-tree.md` law 9 "статус, не удаление... дубли гасим редирект-заглушкой"). It is
literally source text plus metadata sitting inert until something mounts it — exactly "inert data a
separate gate later promotes," which is the framing Wave 1's Q3 flagged as an OPEN QUESTION for us (does
agent-authored content get runtime weight immediately, or stay data until promoted?). Cordis's own design
answers differently per phase: define = inert data (✅), run = immediate runtime weight with the SAME
mount rights as engineer code (❌, no capability/permission gate on which services an `inject` may name —
Wave 1 fact #21, confirmed).

### P6 — Approval as an event-fold over a durable log, not a bare boolean or FSM library

**Mechanism.** This is the strongest finding of this pass, and Wave 1's ideas doc undersold it by
labeling it "presets" — the actual load-bearing mechanism is a PURE REDUCER over an append-only log.
`applyKnobEvent(state, event)` (`packages/interaction/permission-presets/src/index.ts:129-140`, read this
pass in full):
```ts
export function applyKnobEvent(state: KnobState, event: SessionEvent): KnobState {
  switch (event.type) {
    case 'permission/preset': return { ...state, preset: event.data.preset }
    case 'sandbox/mode':      return { ...state, sandbox: event.data.mode }
    case 'approval/policy':   return { ...state, approval: event.data.policy }
    default: return state
  }
}
```
Three independent event TYPES (`permission/preset`, `sandbox/mode`, `approval/policy`) are appended to
`session.events` (an append-only log — same file confirms `session.append('permission/preset', ...)`,
never a mutation); `foldKnobs()` replays the whole log cold, `effectivePermissionPreset()` walks it
backward for the last value. The SERVICE class (`PermissionPresetService`) wraps this fold with
convenience (schema, settings, a `/permission` command) but the CORE mechanism — durable events in, pure
fold out, a derived "current preset" view (`selectFor`) — needs no live class to exist as a concept.
Separately: `CordisRunStatus` (`cordis-host-runner/src/types.ts:105-114`) — `'awaiting-approval' |
'starting-host' | 'client-pending' | 'running' | 'waiting' | 'rejected' | 'failed' | 'cancelled' |
'stopped'` — is a field on a PERSISTED record (`DynamicCordisRunAttempt`, `types.ts:143-162`), not a
private class field; the doc comment literally says "Persisted state of the latest activation attempt."

**Representability: ✅ the fold, ⚠️ the delivery.** The event log + pure reducer + derived view is, almost
verbatim, our own `domain_event`/day-mirror model (owner's day → durable memory → lens, commit `6c33395`)
independently reinvented for a different domain (permission knobs instead of a day's activity). This is
the single cleanest existence-proof in the whole study that "policy state = fold over append-only facts"
generalizes past our own use case — a real point in favor of the aggregator-thesis. The weaker half:
delivering the OUTCOME back to the requester is a live method call — `steerRunOutcome()`
(`cordis-host-runner/src/index.ts:1019-1047`, read this pass) builds a text message and calls
`agent.steer(createUserMessage(...))` on a live `Agent` object so "the SAME agent that requested the mount
sees the outcome in its next turn." The DECISION RECORD (`approved`/`rejected`/`failed` + reason) is data;
the ACT of steering it into a live conversation is not.

### P7 — UI slot system (declarative contract + live store engine)

**Mechanism.** `packages/client/ui-slots`: a `register({ name, children?, store?, inject?, kind, scope,
... }, Component)` call contributes a component to a named slot AND optionally declares child slots, a
store seat, and an injected props share — all type-checked via TypeScript declaration-merging into a
`SlotMap` interface (`src/index.ts:24`, confirmed: `export interface SlotMap {}` — deliberately empty in
this compilation unit, every consumer package merges its own entries in). `SlotKind = 'single' | 'list' |
'keyed' | 'chain'`, `SlotScope = 'root' | 'session-maybe' | 'session'` (`src/index.ts:88-91`) are a real,
closed, enumerable vocabulary. Underneath, `StoreHandle`/`StoreInstance` (`src/store.ts:44-92`, read this
pass in full) is a Zustand-shaped engine: `getSnapshot()`, `subscribe(fn)` (uSES-compatible), immer-draft
`ActionsDecl` as "the store's complete write set (the audit face)," `clearPersisted()` called by the
framework "when the owning scope dies for good."

**Representability: ⚠️ the manifest, ❌ the engine.** WHICH component claims WHICH named slot, at what
`kind`/`scope`, is a genuine declarative manifest — could be written down as data (a table: slot name →
occupant → kind → scope), and the fact that Cordis enforces it via compile-time type-checking rather than
a runtime registry is itself informative (their "data" is TYPES, ours would need to be VALUES, since our
policy travels at runtime not compile-time). But the actual live behavior — subscribe/getSnapshot, immer
drafts, React hook binding, `clearPersisted()` firing on scope death — is a UI state-management runtime
with zero overlap with a knowledge/memory graph's job. This pattern sits OUTSIDE our domain (UI
composition, not memory representation) more than it fails our representability test — worth naming
explicitly so it isn't miscounted as evidence against the aggregator-thesis; it's simply a different
problem than the one our graph solves.

### P8 (divergence, not a pattern to represent) — `undefine()` is a hard delete, no tombstone

**Mechanism.** Already cited under P5: `undefine()` calls `this.registry.delete(pluginId)` unconditionally
— every package version under that plugin, including ones that were successfully running, is gone with no
recoverable trace beyond whatever external session-telemetry log happened to capture the earlier `define`
calls. There is no `canonical_id`-survives-as-tombstone concept (our Ц2 Р10) anywhere in the dynamic-plugin
lifecycle.

**Why this matters for the aggregator-thesis.** It is NOT that Cordis's pattern is data-unrepresentable —
a hard delete is trivially representable (it's the absence of a record). The finding is that Cordis
chose NOT to build the durability guarantee we've already committed to (Ц2/Ц7 tombstone-after-erase). This
is a place where borrowing their form would silently REGRESS our own canon if done carelessly — worth
flagging to the owner explicitly, not just noting as a gap.

## Mapping onto our 7 values

- **V1 Читаемость** — no reinforcement, no direct tension. Cordis has no cheap-facet/progressive-disclosure
  concept; a service is either resolvable or throws (`reflect.ts:144`, `"cannot get property ... without
  inject"`). The closest cousin is P6's cheap derived `selectFor()` view (read a summary without re-walking
  the whole log each time) — same ECONOMIC shape as V1's "nужную грань по нужной цене," but applied to
  config state, not to a memory node's label/summary/payload levels. Silent, not contradicted.

- **V2 Тождество** — P5's append-only `packages.set(packageId, ...)` under a stable `pluginId` is a strong,
  independently-arrived-at precedent for "meняем не теряя себя." P8 is a direct DIVERGENCE: Cordis's
  `undefine()` throws away the whole append-only history on delete — exactly the failure mode Ц2's
  tombstone rule exists to prevent. Net: the GROWTH half of V2 is reinforced, the SURVIVAL half is
  contradicted by their own code, worth citing as "don't copy this part."

- **V3 Доверие** — P6's fold-over-log is a real structural cousin of "движок пересчитывает `confidence` при
  чтении" (Ц3's obligation): a cheap, synchronous, read-time recompute from durable facts rather than a
  cached mutable field. But Cordis carries no `confidence` number, no `source`, no `supersession`, no
  contagion-threshold — the MECHANISM (fold-don't-cache) transfers, the SEMANTIC content (calibrated trust)
  does not exist there at all.

- **V4 Витальность** — P3's FSM states could fill our `lifecycle_stage` field's SHAPE, but the axis is
  wrong (Wave 1 Q2, reconfirmed after reading `reflect.ts:notify()`): Fiber dormancy is a pure function of
  dependency availability, recomputed on every registry write, with no notion of elapsed time, usage
  frequency, or earned/decayed `salience`. "Teardown-is-mechanical" (P3's LIFO disposer) remains a genuine
  implementation borrow IF we ever attach live resources (a watcher, a subscription) to a cooling node —
  independent of the trigger being dependency-loss (theirs) vs. salience-decay (ours).

- **V5 Суверенность** — P4 (isolate/intercept) is real precedent for "fork a scope with its own policy
  overrides," reinforcing the FORM of "policy travels with a scope." But it is engine-internal fork, not
  cross-engine portability — confirmed again after reading the Proxy resolution trap directly: an isolated
  context is unusable outside the live `Context` tree that produced it. P5's define()-time record (pure
  source text + immutable id, no live fiber required to exist) is the closest Cordis gets to a portable
  unit, and it is still JS meant for Cordis's own VM sandbox, not schema-carrying data for an arbitrary
  reader — Wave 1's verdict holds under deeper reading, not weakened.

- **V6 Реляционность** — Cordis's `inject` lists ARE a real, data-shaped dependency graph (P1), but every
  edge is anonymous and disposable: no `id`, no `confidence`, no `stale`, recomputed fresh from live object
  identity every epoch (P2). This is close to a clean illustration of exactly what V6 claims beyond a plain
  DI graph: Cordis has edges-as-plumbing; V6 wants edges-as-memory (their own passport, their own
  degradation, cascade rules by type). The gap is not "Cordis lacks edges" — it's "Cordis's edges have no
  standing of their own."

- **V7 Согласие** — no analogue anywhere in the code read this pass, confirming Wave 1's ideas doc. The
  Host/Client "only lossless JSON may cross" boundary (`tool-cordis/src/prompt.ts:98`, cited by Wave 1) is
  a DATA-BOUNDARY discipline — a narrow, explicit, serializable seam between two trust/runtime domains —
  which is a good general shape (worth borrowing as an implementation pattern for any future consent
  boundary), but it enforces WHAT CAN CROSS, not WHO CONSENTED; it is not itself a consent mechanism.

## Verdict on the aggregator-thesis

**Score across 8 patterns:** 2 clean ✅ (P5's define-half, P6's event-fold), 4 explicit ⚠️ splits (P1, P3,
P4, P7's manifest-half; each has a data-representable shell around a runtime core), 2 clean ❌ (P2's live
propagation engine, P7's store/render engine), plus 1 divergence flag (P8) that isn't about
representability at all.

**The thesis holds at the boundary the owner already drew, and this study makes that boundary sharper
rather than looser.** Every pattern that survived translation to ✅/⚠️ was already a case where the STATE
or the DECLARATION is what we'd want to hold — never a case where we needed to hold a running algorithm.
The clean ❌ cases (P2's reactive epoch recomputation, P7's subscribe/getSnapshot store engine) are not
counter-examples to "the aggregator can represent any pattern as data" — they are the other half of the
same claim, made visible: an aggregator that tried to encode "recompute this on every write, synchronously,
by walking live object identity" AS DATA would not be representing the pattern, it would be quietly
reimplementing a second execution engine inside the data model (Cordis's `reflect.ts:notify()` is 30 lines
of imperative graph-walking code for a reason — it could not have been a declarative fact table and stayed
correct).

**Sharper form of the boundary, evidenced by this pass:** the aggregator can hold (a) identity + append-only
history of a unit (P5, P6, matches our Ц2/Ц3 shape almost exactly), (b) declared topology — who depends on
whom, who is scoped under whom (P1, P4, P6's decision record) as edges/fields, and (c) a closed-vocabulary
lifecycle STATE as an enum field (P3). It cannot hold, and should not try to hold, (d) the propagation
engine that keeps (b) internally consistent on every write (P2), or (e) a live subscription/rendering
runtime bound to a specific presentation layer (P7). (d) and (e) are ENGINE duties by construction, not
gaps in our data model — this is a direct, evidence-backed input to the γ vs δ decision: whichever
integration shape we pick, the reactive-recompute layer and any UI-store layer are things our engine runs,
never things our graph stores.

**One clarification the owner should weigh before treating this as settled:** the aggregator-thesis as
stated ("вместить ЛЮБОЙ агентный паттерн как данные") is TRUE only under the reading "represent the state
and topology a pattern produces/needs," not the stronger reading "encode the pattern's algorithm itself as
inert data." Cordis's own codebase treats that second reading as false for its own domain (their config
rows are patchable DATA, but `apply(ctx)` stays code — they never tried to make the reactive DI engine
itself declarative). If "any pattern as data" was meant in the strong sense, this study is evidence against
it; if it was meant in the state/topology sense (which matches how our 7-value canon already frames
`policy-as-data` — a POLICY the engine EXECUTES, not the engine itself), it is well supported.
