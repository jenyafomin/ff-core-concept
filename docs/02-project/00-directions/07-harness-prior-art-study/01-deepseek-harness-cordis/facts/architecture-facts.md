---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-23
Scope: project
Related: ../analyses/architecture-and-plugin-model.analysis.md
---

# Architecture facts — verifiable, source-anchored

Source root: shallow clone `deepseek-ai/deepseek-harness` (default branch), cloned read-only to
`/tmp/harness-study-a1-new` on 2026-08-23. No install/build/run was executed. Paths below are
repo-relative to that clone unless a full github.com URL is given.

1. **Cordis is vendored, not an external npm black box.** `vendor/cordis/src/{fiber,context,
   service,registry,events,reflect,logger,utils,index}.ts` — full framework source lives inside the
   DSH repo. Sync procedure documented at `vendor/README.md` (not read in this pass).

2. **Primer states the 5-idea model explicitly.** `docs/cordis-primer.md:9-13` — plugin = object
   implementing Service; context = repository of services; `inject` = declarative dependency;
   typed Events with 4 dispatch modes; registrations are reversible effects via `ctx.effect()`/`ctx.on()`.

3. **Dispatch modes table.** `docs/cordis-primer.md:19-24` — `emit` (fire-and-forget, no return),
   `waterfall` (unawaited but chainable/around-middleware, returns value), `parallel` (awaited, no
   return), `serial` (awaited, listeners run in order, returns value).

4. **`Fiber` is the mount/unmount unit; states are an enum.** `vendor/cordis/src/fiber.ts:147-154`
   — `PENDING, LOADING, ACTIVE, FAILED, DISPOSED, UNLOADING`.

5. **Activation is a pure function of dependency resolvability, not manual ordering.**
   `vendor/cordis/src/fiber.ts:611-623` (`_refresh()` builds an `epoch` string from injected
   services' owning-fiber `uid`s; any missing → sentinel `INACTIVE`); `fiber.ts:625-639`
   (`_setEpoch` schedules `_reload()`/`_unload()` purely from the epoch transition).

6. **Effect registration IS the disposal contract — single primitive.**
   `vendor/cordis/src/fiber.ts:415-561` (`effect()` method): accepts a disposer, a promise of one,
   or a (async) iterable of several; whatever is returned becomes exactly what unwinds on teardown.

7. **Teardown is strict LIFO.** `vendor/cordis/src/fiber.ts:675-696` (`_unload()`):
   `this._disposables.clear().map(...)` where `DisposableList` (defined in `utils.ts`, not fully
   read this pass) preserves reverse-registration order per the primer and the inline comments at
   `fiber.ts:430-431` (`disposables.splice(0).reverse()`).

8. **`Context` is a Proxy over `ReflectService.handler`.** `vendor/cordis/src/context.ts:74`
   (`new Proxy<this>(this, ReflectService.handler)`) — property reads on `ctx` are not plain field
   lookups, they resolve through the reflection/service layer.

9. **Isolation and intercept are child-context forks, parent never mutated.**
   `vendor/cordis/src/context.ts:121-125` (`isolate(name, label)` creates a child whose service
   `name` resolves against a new label unless `label` is shared to join scopes);
   `context.ts:139-145` (`intercept(name, config)` layers per-branch service config,
   ancestor-first-then-head, merge order documented at `service.ts:86-102`).

10. **`Service` base class self-registers on construction.** `vendor/cordis/src/service.ts:42-59`
    — `constructor(ctx, name)` calls `ctx.reflect.provide(name, self, check)`; no external
    registry.set call needed. Static symbol keys (`Service.init`, `Service.check`, `Service.invoke`,
    `Service.extend`) let a service be constructible, availability-gated, callable, or derivable.

11. **`Inject` accepts array or object form; object form carries per-service intercept config.**
    `vendor/cordis/src/registry.ts:16-23` (`Inject<M> = (keyof M)[] | {[K in keyof M]?: M[K]}`).
    `@Inject()` decorator exists for class-based plugins/methods (`registry.ts:29-58`).

12. **`isApplicable` gate: a plugin object must have a callable `apply`.**
    `vendor/cordis/src/registry.ts:8-10` (`typeof object.apply === 'function'`).

13. **Declarative composition file lists 78 named plugin rows in the base bundle.**
    `packages/bundle/base/cordis.patch.yml` — 451 lines, verified via
    `grep -c '^\s*- id:' packages/bundle/base/cordis.patch.yml` = 78. Comment at lines 1-14
    explicitly states row order carries no load semantics because "activation is
    service-availability driven."

14. **Patches are additive-by-id over an empty root, last-write-wins per row, across three layers.**
    `packages/bundle/{base,web-app,headless}/cordis.patch.yml` + user profile's own
    `cordis.patch.yml` (per comment header, `base/cordis.patch.yml:1-6`).

15. **Loader has two distinct evaluation times for the same row.**
    `docs/cordis-primer.md:38` — a row's `config` is interpolated once its own declared injections
    activate (against that plugin's context); its `disabled` field is re-evaluated at every mount
    decision (against the loader's context).

16. **Dynamic (LLM-authored) plugins exist as a first-class extension package family.**
    `packages/extensions/{cordis-host-runner, tool-cordis, cordis-client-runner, ui-cordis}`.
    Host-side lifecycle service: `packages/extensions/cordis-host-runner/src/index.ts`
    (`DynamicCordisRunnerService`, `class ... extends TypertRemoteService`, line 124).

17. **Plugin identity is versioned and append-only; never overwrite a package.**
    `packages/extensions/cordis-host-runner/src/index.ts:151-202` (`define()`:
    `plugin.packages.set(packageId, definition)` — always a NEW packageId, existing entries are
    never mutated). `run` vs `update` mode enforced mutually exclusive against current package
    identity in `resolvePlan()`, `index.ts:768-808`.

18. **Host/Client split communicates only lossless JSON, one direction of call-initiation.**
    `packages/extensions/tool-cordis/src/prompt.ts:98` — "Host uses harness.handle(method, handler),
    and Client uses host.call(method, args). The direction is Client→Host, and only lossless JSON
    may cross it." Wire type: `DynamicCordisInvokeResult`,
    `packages/extensions/cordis-host-runner/src/types.ts:356-358`.

19. **Human approval is a first-class state in the run state machine, not a side channel.**
    `CordisRunStatus` includes `'awaiting-approval'`
    (`packages/extensions/cordis-host-runner/src/types.ts:105-114`); single-checkmark
    vs double-checkmark approval semantics documented at
    `packages/extensions/tool-cordis/src/prompt.ts:45` ("A single check mark authorizes only the
    current Package; double check marks authorize future versions of the same Plugin.").

20. **Outcome of an async activation is steered back into the SAME agent's context, not a side
    channel.** `packages/extensions/cordis-host-runner/src/index.ts:1019-1047`
    (`steerRunOutcome` → `agent.steer(createUserMessage(...))`).

21. **Explicit disclosure: the sandbox is not a security boundary.**
    `packages/extensions/tool-cordis/src/prompt.ts:8` — "The restricted execution environment
    prevents accidental misuse; it is not a security boundary for malicious code. Services obtained
    by dynamic code connect to the real runtime." No separate capability/permission gate on WHICH
    services a dynamic plugin's `inject` may declare, beyond normal service availability.

22. **A failed dynamic-plugin startup is never left half-mounted.**
    `packages/extensions/cordis-host-runner/src/lifecycle.ts:22-45` (`startHostHalf`): on
    `fiber.await()` throwing, `await fiber.dispose()` runs before rethrow; error message is
    rewritten with a "how to replace" recipe when the failure is an "already registered" name
    collision (lines 34-41).

23. **Restart/update goes through a vetoable waterfall before committing.**
    `vendor/cordis/src/fiber.ts:736-753` (`update()`: `context.waterfall(this, 'internal/update',
    config, noSave, () => {...})`) — HMR (`@deepseek-ai/cordis-plugin-hmr`, row in
    `base/cordis.patch.yml`) hooks this same waterfall.

24. **Cordis upstream project (not read directly in this pass, inferred from vendored copy +
    package.json scope `@deepseek-ai/cordis`).** The vendored package.json/LICENSE at
    `vendor/cordis/package.json` and `vendor/cordis/LICENSE` were not opened this pass; upstream
    `cordisjs/cordis` was not independently fetched — this study relied entirely on the DSH-vendored
    copy and DSH's own primer/tutorial docs (`docs/cordis-primer.md`, `docs/cordis-tutorial/` dir
    present but not read). Flag as a residual gap, see open questions.
