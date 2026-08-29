---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-23
Scope: project
Related: ../facts/architecture-facts.md, ../questions/architecture-open-questions.md
---

# Architecture & plugin model — DeepSeek Harness (DSH) on Cordis

Read-only study. Source: shallow clone `deepseek-ai/deepseek-harness` @ default branch (cloned
2026-08-23 to `/tmp/harness-study-a1-new`, not persisted, no code executed). Cordis is **vendored
in-repo** at `vendor/cordis/` (not an npm black box) — DSH ships its own copy of the framework and
documents the sync procedure in `vendor/README.md`. This is itself a V5-relevant fact: they don't
depend on an external mutable authority for their composition substrate, they own a frozen copy.

## 1. The core claim: "a plugin is an object that implements Service"

Cordis primer (`docs/cordis-primer.md:9`) states five ideas; the load-bearing one is: *a plugin is
either a function `{ inject?, apply(ctx) }` or a `Service` subclass whose lifecycle Cordis mounts
into the current context.* There is exactly ONE unit of composition. Services, event listeners,
tool registrations, UI slot contributions, timers, HTTP routes — all of them are plugins wrapping a
`ctx.effect()`/`ctx.on()`/`ctx.provide()` call. This is verified structurally: 78 top-level `id:`
rows in `packages/bundle/base/cordis.patch.yml` (session, llm, agent, tools, mcp, lsp, sandbox,
schedule, workspace, credentials, feedback... every harness subsystem) are declared as named Cordis
plugins in one declarative list, not wired by hand in a bootstrap function.

## 2. The DI/context model (space axis)

- `Context` (`vendor/cordis/src/context.ts:42`) is the container. It's a **JS Proxy** over a plain
  object; property reads route through `ReflectService`, meaning `ctx.llm` is not a field lookup, it's
  a resolved service reference walked through the isolation chain.
- **Services claim a name** (`ctx.<key>`) via `Service` base class (`vendor/cordis/src/service.ts:42`):
  constructor calls `ctx.reflect.provide(name, this, check)`. A service subclass is self-registering —
  no separate registry.set() call from outside.
- **Dependency declaration is `inject`**, not constructor injection in the classic sense. A plugin
  declares `inject: ['sessions', 'llm']` (array = required, object form = required + intercept
  config per `registry.ts:16-23`). The framework computes an **epoch string** from the uids of every
  injected service's owning fiber (`fiber.ts:611-623`, `_refresh()`); if any required service is
  absent, epoch becomes the sentinel `INACTIVE` and the fiber sits `PENDING` — never wired, never
  even attempted. This is declarative, reactive DI: no manual "wire A before B" ordering exists
  anywhere in the composition file (confirmed by the comment in the bundle patch:
  `packages/bundle/base/cordis.patch.yml:14` — "Row order carries no load semantics (activation is
  service-availability driven)").
- **Isolation, not global singletons.** `Context.isolate(name, label)` (`context.ts:121`) creates a
  child context where a given service name resolves against a *different* label — i.e. two branches
  of the plugin tree can each get their own `sessions` implementation without the parent scope
  knowing. `Context.intercept(name, config)` (`context.ts:139`) layers per-branch config onto a
  service's resolved config, ancestor-first. Both return NEW child contexts; parent is never
  mutated. This is the multi-tenancy primitive — worth noting for our own agent/session boundary
  questions.

## 3. Mount/unmount (time axis): the Fiber state machine

`Fiber` (`vendor/cordis/src/fiber.ts:184`) is the runtime instance of one plugin application — one
per `ctx.plugin()` call. States (`fiber.ts:147-154`): `PENDING → LOADING → ACTIVE`, or `FAILED`; any
active/pending fiber can go `→ UNLOADING → DISPOSED`. Transitions are driven purely by the injected
services' presence:
- A fiber starts `PENDING`. `_refresh()` recomputes its `epoch` from currently-resolved `inject`
  names on every relevant registry change (a service (dis)appearing anywhere it can see).
- Epoch flips from `INACTIVE` to a real value → `_setEpoch` schedules `_reload()` (LOADING → ACTIVE),
  calling the plugin's `apply(ctx)` and awaiting whatever `Effect` it returns.
- A required service disappearing (its owning fiber disposed) flips epoch back to `INACTIVE` →
  `_unload()` runs, walking `_disposables` **in reverse registration order** (`fiber.ts:675-696`,
  `_disposables.clear().map(...)` reversed via `DisposableList`), i.e. teardown is a strict LIFO
  unwind of everything the plugin registered — timers, tool schemas, event listeners, DI-provided
  services it itself was providing to its OWN children. Nothing is orphaned; a parent's disposal
  cascades to children because children hold the parent's context as their prototype chain and their
  own effects were registered ON that context's fiber.
- **Every registration IS the disposal contract.** `ctx.effect(execute)` (`fiber.ts:415-561`) is the
  single primitive: `execute()` runs, and whatever it returns (a disposer function, a promise of
  one, or an iterable/async-iterable of several) becomes exactly what runs on teardown. There is no
  separate "unregister" API surface to keep in sync by hand — you cannot register a live effect
  without simultaneously supplying its own undo. `ctx.on()`, `ctx.provide()`, tool registration, etc.
  are all built as thin wrappers that call `ctx.effect()` under the hood and return the disposer.
- **Restart = dispose + reload with the same fiber identity.** `fiber.restart()` (`fiber.ts:718-723`)
  forces epoch to `INACTIVE` then immediately `_refresh()`s — same `uid`, fresh execution. `update()`
  (`fiber.ts:736-753`) runs an `internal/update` **waterfall** first so listeners can veto/rewrite the
  new config before the restart commits (this is literally hot-reload/HMR's hook point —
  `@deepseek-ai/cordis-plugin-hmr` is one row in the bundle patch).

## 4. The meta-layer: plugins the LLM agent itself can mint at runtime

This is the most distinctive architectural move and the strongest signal for our concept. DSH does
not stop at "our engineers compose the harness out of plugins" — it exposes **plugin authorship as a
tool the LLM calls during a session**: `packages/extensions/tool-cordis` (host-side tool surface) +
`packages/extensions/cordis-host-runner` (lifecycle service) + `packages/extensions/cordis-client-runner`
(browser half) + `packages/extensions/ui-cordis`.

- Contract: `cordis_define` → `cordis_run` → (optional) `cordis_stop` / `cordis_undefine`, plus
  `cordis_inspect_*` for read-only capability discovery before writing code
  (`packages/extensions/tool-cordis/src/prompt.ts:26-36`).
- **Plugin identity is versioned and append-only.** A `pluginId` (stable) owns N immutable
  `packageId`s (each define call appends, never overwrites — `cordis-host-runner/src/index.ts:151-202`,
  `plugin.packages.set(packageId, definition)`). `run` vs `update` mode is explicit and mutually
  exclusive by current-vs-target package identity (`resolvePlan`, `index.ts:768-808`) — you cannot
  silently clobber a running version; you always define a NEW package and explicitly switch to it.
  This maps directly onto our own "never overwrite, append + supersede" instinct (V2/V9-shaped, see
  doc-tree law 9 in our own repo).
- **Host/Client split with an explicit narrow channel.** Host code runs in the Node process (files,
  network, Agent/Session access); Client code runs in the browser page (UI, Slots). They only talk
  via `harness.handle(method, handler)` / `host.call(method, args)` and **only lossless JSON may
  cross it** (`prompt.ts:98`) — this is a deliberately narrow, serializable service boundary between
  two trust/runtime domains, enforced by the wire types (`DynamicCordisInvokeResult`,
  `types.ts:356-358`) rather than by convention alone.
- **Human-in-the-loop is a first-class state, not a side-channel.** A Client-bearing activation can
  require approval (`requiresApproval`, `types.ts:152-155`); the state machine has an explicit
  `awaiting-approval` status and a single/double-checkmark distinction between "approve this version"
  vs "approve all future versions of this Plugin" (`prompt.ts:45`). Rejection and failure are steered
  back into the agent's own context as a user message (`steerRunOutcome`, `index.ts:1019-1047`) so the
  SAME agent that requested the mount sees the outcome in its next turn — the approval loop closes
  inside the conversation, not outside it.
- **Explicit non-security-boundary disclosure.** `prompt.ts:8`: *"The restricted execution environment
  prevents accidental misuse; it is not a security boundary for malicious code."* They are honest in
  the agent-facing prompt itself that the sandbox (`sandbox.ts`, VM timeout config
  `index.ts:88-91,127-129`) is a mistake-guard, not a trust boundary — dynamic plugin code that calls
  a real Service touches the real runtime with the real Service's authority. No separate
  capability/permission model gates WHICH services a dynamically-defined plugin's `inject` may name.

## 5. Declarative composition file = the "which plugins are active" answer

`packages/bundle/{base,web-app,headless}/cordis.patch.yml` + user profile `cordis.patch.yml` are
**patches over an empty profile root**, addressed by row `id`, "last write wins per row"
(`base/cordis.patch.yml:1-14`). Loader config docs (`docs/cordis-primer.md:38`) note two evaluation
times: a row's `config` is interpolated once its declared injections are active (against THAT
plugin's context, e.g. `ctx.llm`), while `disabled` is re-evaluated at *every* mount decision against
the loader's own context — i.e. you can write an expression that dynamically toggles a plugin on/off
as OTHER services come and go, still driven by the same reactive DI graph, not by imperative
if/else in a bootstrap script.

## 6. How "everything became a plugin" — the mechanism, plainly

1. One base class (`Service`) + one function shape (`{inject?, apply(ctx)}`) is the entire
   composition vocabulary.
2. Composition in space = a proxied `Context` that resolves service names through an isolation
   chain; `isolate()`/`intercept()` fork that chain per branch without touching the parent.
3. Composition in time = a `Fiber` state machine whose activation is a pure function of "are my
   declared dependencies currently resolvable," recomputed reactively (`_refresh`/`_setEpoch`) on
   every relevant change anywhere in the tree — never manually sequenced.
4. Every act of registration (service, listener, tool, timer, UI slot) is required to hand back its
   own undo (`ctx.effect`'s single contract), so unmount is mechanical LIFO unwind, not
   hand-maintained cleanup code.
5. This same vocabulary is then handed to the LLM agent itself as a tool surface (`cordis_define` /
   `cordis_run`), turning "the agent extends its own runtime" into the SAME primitive as "the
   engineering team composes the harness" — no second, weaker plugin system for the dynamic case.

## Diagram in words

```
Root Context (proxy, holds isolate-map + intercept-map)
 └─ fiber(uid=0, ACTIVE, root plugin)
     ├─ ctx.plugin(sessionPlugin)      -> Fiber A  [provides: sessions]
     │    └─ ctx.plugin(sessionTitle)  -> Fiber A1 [inject: sessions]  (PENDING until A ACTIVE)
     ├─ ctx.plugin(llmPlugin)          -> Fiber B  [provides: llm]
     ├─ ctx.plugin(agentPlugin)        -> Fiber C  [inject: sessions, llm, tools]
     │        (PENDING until epoch = f(A.uid, B.uid, toolsFiber.uid) all resolvable)
     └─ ctx.plugin({name:'cordis-dynamic', apply: noop})   -> group Fiber (host-runner's parking lot)
          └─ [at runtime, per cordis_run] group.ctx.plugin(sandboxProducedPlugin) -> child Fiber
               (guarded; on failure: awaited, then fiber.dispose() before rethrow — never left mounted failed)
```

Dispose of Fiber A (e.g. hot-reload) → its `_disposables` (which include Fiber A1's own dispose
wrapper, since A1's effect was registered on A's context) unwind LIFO → A1 goes PENDING again
automatically, no coordinator needed to notice or re-sequence anything.
