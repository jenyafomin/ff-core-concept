---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-23
Scope: project
Related: ../analyses/capabilities-and-customization.analysis.md, ../ideas/capabilities-to-borrow.idea.md
---

# Факты: возможности и кастомизация DeepSeek Harness (`dsh`)

Источник: `git clone --depth 1 https://github.com/deepseek-ai/deepseek-harness` (checkout 2026-08-23,
`main`, версия пакета `0.1.1-rc.2` — `package.json:2`, `apps/cli/package.json:2`). Только чтение, код не
исполнялся. Ссылки — `путь:строка_или_якорь` внутри клона (пути относительные к корню репо).

## Стадия проекта

- **Developer preview, будут breaking changes** — дословно в `README.md` (секция "Developer preview"):
  «DeepSeek Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE
  COMPATIBILITY-BREAKING CHANGES.**»
- Версия `0.1.1-rc.2` (release candidate, до 1.0) — `package.json:2`.
- `AGENTS.md` секция «Pre-release stance: foundation over blast radius»: «**Remove this section at the
  first tagged release.** With no external consumers, prefer the correct foundation over compatibility
  shims... Backends reject old on-disk formats... `dsh-session` keeps `SESSION_FORMAT_VERSION` at `0`
  with no compatibility promise.» — т.е. формат сессий/хранилища прямо объявлен нестабильным.

## Архитектура = «всё плагин» (Cordis)

- `README.md`: «It uses an architecture where **everything is a plugin**, and is powered by
  [Cordis](https://github.com/cordiverse/cordis)».
- `docs/architecture.md#Cordis`: «Every part of the product is a plugin, including the model adapter, the
  tool registry, the session log, and the agent loop itself, so every part is replaceable from
  configuration. There is no privileged core to patch.»
- `docs/cordis-primer.md` («Cordis In Five Ideas»): плагин = объект `Service`; контекст = репозиторий
  сервисов (`ctx.<key>`); зависимости через `inject`; типизированные события (`emit`/`waterfall`/
  `parallel`/`serial`); регистрации — обратимые эффекты (`ctx.effect()`/`ctx.on()`).
- `AGENTS.md` (раздел Conventions): «**A capability seam comprises Service Definition / Service Provider
  / Consumer roles.** It is complete, never one role; split only when roles evolve independently.» —
  это ЕДИНЫЙ паттерн переиспользования по всему харнессу (LLM, shell, fs, web, sandbox, subagent и т.д.).

## Composition/config: profiles → bundles → patches

- `docs/architecture.md#Profiles-and-bundles`: «A running `dsh` is a plugin tree composed at boot from
  ordered layers.» Профиль (`$DSH_HOME/profiles/<name>`) перечисляет **bundles** (npm-пакет с
  `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}`) + собственный `cordis.patch.yml` владельца.
- Порядок слоёв: «each bundle in the profile's listed order, then the profile's `cordis.patch.yml`, then
  the home-level one, then any `--patch` overlay. A patch targets a row by id and replaces its whole
  config, or inserts new rows.» (`docs/architecture.md`).
- Три готовых бандла (`packages/bundle/README.md`): `base/` (ядро на каждый профиль: модель-адаптеры,
  инструменты, персистентность, sandbox/approval, settings, credentials), `web-app/` (браузерный слой),
  `headless/` (одноразовый запуск без Host/Web слоя).
- Установка стороннего плагина: «Out-of-tree bundles install into a profile through
  `dsh plugin --profile <name> add <package>`.» (`packages/bundle/README.md`).
- Просмотр реальной композиции: `dsh --profile web --dump-config` (`docs/architecture.md`).

## Дискавери плагинов — децентрализованная, БЕЗ маркетплейса/реестра

- `README.md` («Community and support»): «Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin)
  topic to your plugin repository for discoverability.» — единственный официальный механизм обнаружения
  сторонних плагинов = GitHub-топик, НЕ централизованный marketplace/registry в самом харнессе.
  Поиск по репозиторию терминов `marketplace`/`plugin registry`/`plugin store` в docs/*.md и
  packages/*/README.md — 0 совпадений (кроме UI-инвентаря установленных плагинов, см. ниже).
- Discord-сообщество для фидбека: `README.md`.

## Четыре режима работы = агент-пресеты (`packages/preset/agent-presets/`)

Механизм: `AgentPresets` (`ctx.agentPresets`), директория = один пресет с `agent.cordis.yml` (+ опционально
`preset.yml` с display-текстом). Пресеты монтируются ОДИН раз на процесс под «стоящим» scope; сессия
присоединяется через родительскую цепочку `dsh-scope` (`packages/preset/agent-presets/README.md`).

Официально поставляемые 4 пресета — `apps/cli/config/agent-presets/{standard,code,minimal,cordis}/`:

| id (папка) | `preset.yml name` | `order` | Суть (комментарий в `agent.cordis.yml`) |
|---|---|---|---|
| `standard` | «标准模式» (Standard) | 1 | «функционально полный coding-агент: редактирование файлов, shell, файловый+веб-поиск, Skills, план, цели, сабагенты, workflow» — `apps/cli/config/agent-presets/standard/preset.yml`, `.../agent.cordis.yml` |
| `code` | «PTC 模式» (Code Mode) | 2 | «Everything in `standard` is here unchanged. What is added is the `tool-presentation` row: instead of one tool call per action, the model writes a TypeScript program against a generated SDK and `run_code` executes it» — `apps/cli/config/agent-presets/code/agent.cordis.yml` |
| `minimal` | «极简模式» (Minimal) | 3 | «a fixed-prompt, two-tool coding-agent composition»: персона = ПОЛНЫЙ системный промпт (`complete: true`), только персистентный `bash`/`pwsh` + `str_replace_editor`, компакция контекста отсутствует — `apps/cli/config/agent-presets/minimal/agent.cordis.yml` |
| `cordis` | «创造模式» (Creator/Cordis mode) | 4 | «the standard coding agent, plus the ability to read and write the runtime it is running in... so a person can ask an agent to author another agent... TRUST: `cordis_mount` evaluates model-written JavaScript against the live runtime... Treat a session on this preset as shell access» — `apps/cli/config/agent-presets/cordis/agent.cordis.yml` |

- Известное ограничение (документировано открыто): «`cordis` and `code` are full copies of `standard`» —
  нет механизма "standard плюс один патч" на уровне пресетов (это есть только на уровне bundle-патчей),
  каждый пресет — независимая полная копия композиции — `packages/preset/agent-presets/README.md`
  («Known Limitations»).
- Владелец может создавать СВОИ пресеты: `copy()` = единственный способ авторства, копирует ВСЮ директорию
  существующего пресета в `$DSH_HOME/.agent-presets/<id>/`; `remove()` не даёт удалить поставляемые
  пресеты — `packages/preset/agent-presets/README.md`.
- Смена пресета сессией возможна ТОЛЬКО пока сессия «ничего не произвела» (`recompose()`,
  blank-only lock) — иначе застрянут уже вызванные инструменты; API-gateway (`dsh-apiproxy`) отдельно
  запрещает это на уровне wire с кодом `agent-preset-locked` — `packages/preset/agent-presets/README.md`.

## Провайдеры моделей — два адаптера на общем LLM-шве (`ctx.llm`)

`packages/llm/README.md`: «Provider adapters register on `ctx.llm`.» Два продуктовых пакета:

1. **`llm-deepseek`** — «Direct DeepSeek adapter» (`packages/llm/README.md`).
2. **`llm-pi-ai`** — «Generic multi-provider adapter... backed by `@earendil-works/pi-ai`»
   (`packages/llm/llm-pi-ai/README.md`).

Через `llm-pi-ai` конфигурируются **route-профили**, ключ = имя провайдера/маршрута:
- Пример конфига в README перечисляет роуты `openai`, `anthropic`, `deepseek`, а также произвольный
  «hand-declared route» `acme-gateway` (OpenAI-compatible шлюз) —
  `packages/llm/llm-pi-ai/README.md#Config`.
- «`supportedProtocols()` is deliberately narrower than pi-ai's full streaming API set: it holds only
  the protocols a profile can *completely* describe with a key, an endpoint, and headers. **Bedrock**
  signs with SigV4 over AWS credentials and a region, **Vertex** needs a project, a location, and
  application-default credentials, **Azure** needs provider environment plus an api-version, and
  **Codex** authenticates through OAuth — offering those would hand back a route that cannot
  authenticate... Catalog routes still reach them through their own provider; only an explicit override
  is refused.» — т.е. **Bedrock/Vertex/Azure/Codex доступны как встроенные каталожные провайдеры pi-ai**,
  но НЕ как настраиваемые вручную route-переопределения — `packages/llm/llm-pi-ai/README.md#Wire-compatibility-switches`.
  (Источник ограничений: `packages/llm/llm-pi-ai/README.md`, раздел про `supportedProtocols()`.)
- Протоколы, которые адаптер может полностью описать вручную (ключ+endpoint+headers):
  `openai-completions`, `openai-responses`, `azure-openai-responses`, `openai-codex-responses`,
  `anthropic-messages`, `bedrock-converse-stream` (упомянут как принимающий `supportsStrictMode`) —
  `packages/llm/llm-pi-ai/README.md`.
- Кастомизация каталога моделей: `models` (заменяет каталог роута), `modelOverrides` (точечно правит одну
  модель, остальные не трогает), `reasoningEfforts` (маппинг уровней рассуждения на wire-значения),
  `compat` (переключатели wire-совместимости для нестандартных OpenAI-совместимых шлюзов) —
  `packages/llm/llm-pi-ai/README.md`.
- Динамическая конфигурация без рестарта: «The adapter reads its profiles through a thunk **once per
  operation** instead of freezing them at construction... a user can add a route, override one field of a
  composition route, or point a route at another proxy, all effective on the next request with no
  restart.» — `packages/llm/llm-pi-ai/README.md#Dynamic-configuration`.
- Credentials — отдельный шов `ctx.credentials`, ключи через `apiKeyEnv` (переменная окружения) —
  «no secret enters this file» — `packages/llm/llm-pi-ai/README.md`.

## Инструменты (tools) — генерируемый каталог, ~30 пакетов

`docs/tool-catalog.md`: «GENERATED and verified fresh by `pnpm run verify-tool-catalog`... BOOTS each
tool plugin on a real context and reads `ctx.tools.schemas()`». Таблица «Tool Package Map» перечисляет
инструменты (выборка, `docs/tool-catalog.md`):
- `bash`/`pwsh` (одноразовый шелл) и персистентный `bash`/`pwsh` (PTY, `dsh-terminal`).
- `run_code` (Code Mode: `@deepseek-ai/dsh-tools`, «a program calls them through bindings scheduled
  under the native concurrency contract»).
- `edit`/`read`/`read_image`/`write` (`dsh-tool-fs`), `str_replace_editor` (отдельный редактор),
  `glob`/`grep` (через упакованный `@vscode/ripgrep`, без хостового `rg`).
- `terminal_open/close/read/send/signal/list` (шесть PTY-инструментов).
- `web_fetch`/`web_search` (`dsh-tool-web`, провайдер скрыт за `ctx.web`).
- `lsp` (`dsh-tool-lsp`, провайдеры вроде `dsh-lsp-stdio`).
- `skill` (`dsh-tool-skill`, каталог/загрузчик скиллов).
- `subagent`/`subagent_fork`, `interrupt_agent`/`list_agents`/`send_message` (делегирование сабагентам).
- `workflow`, `ralph` (фиксированный foreground-workflow «один свежий child на раунд»).
- `todo_write`, `create_goal`/`get_goal`/`update_goal`, `schedule_create/delete/list`,
  `job_kill/list/output` (фоновые задачи), `ask_user_question`, `exit_plan_mode`.
- `session_event_read/search/trace`, `session_search`, `session_trace` (`dsh-tool-session-query`,
  read-only чтение собственной истории сессии).
- `cordis_define/inspect_list/inspect_query/inspect_self/run/stop/undefine` (`dsh-tool-cordis`) — «Not in
  any shipped tree (a deliberate opt-in — dynamic package code reaches the real runtime)».
- Экспериментальный `dsh-experimental-tool-agent-team` — 10 инструментов командной работы
  (`spawn_teammate`, `team_task_*`, `wait_agent`...), «shipped dsh-base bundle keeps the package
  disabled».
- Имя инструмента конфигурируемо на загрузке (например `dsh-tool-subagent`'s `toolName`) —
  `docs/tool-catalog.md`.

## MCP-клиент — переиспользование стороннего инструментального экосистемы

- `packages/mcp/mcp-client/` — «DSH parses the selected Cordis overlay, starts a configured stdio command
  or connects to a configured Streamable HTTP URL, discovers MCP tools, and exposes them as
  `mcp__<serverName>__<tool>`.» (`examples/mcp-memory/README.md`).
- Явно НЕ делает: «does **not** download the server, initialize its database, choose its model or
  embedding provider, create a cloud account, migrate vendor data, or supervise a separate HTTP service.»
  (`examples/mcp-memory/README.md`).
- Безопасность bridge: «The stdio bridge deliberately removes ambient variables whose names usually
  identify credentials and all `DSH_*` variables before launching a child» (`examples/mcp-memory/README.md`).
- Готовые примеры интеграции (default-off overlay-патчи): Memorix, MCP Reference Memory (официальный
  `@modelcontextprotocol/server-memory`), Engram — `examples/mcp-memory/README.md`.

## Skills — файловый реестр навыков, множественные источники

- `packages/skill/skill/README.md`: «Pure agent skill provider registry... It does not know whether
  skills come from local files, embedded plugin data, HTTP, or another backend; providers register those
  sources with `ctx.skills.registerProvider(...)`.» Локальная реализация — `dsh-skill-filesystem`.
- Политика вызова раздельна для модели и человека: `{modelInvocable, userInvocable}` — 4 комбинации,
  «one discovery result can serve model-facing tools, human-facing commands, and trusted internal
  callers without conflating their catalogs» (`packages/skill/skill/README.md`).

## Песочницы (sandboxes) — файловая, платформо-специфичная, без сети/процессов

- `packages/sandbox/sandbox/README.md`: `ctx.sandbox` = контракт `confine(argv, policy)`; вокабуляр
  `SandboxMode` (`read-only`/`workspace-write`/`danger-full-access`, **только файловые эффекты**),
  `SandboxEnforcement` (`full`/`partial`).
- Реализации (`dsh-sandbox-local`): «Linux: `bwrap`, else the per-platform Landlock launcher; macOS:
  `sandbox-exec`/Seatbelt.» Windows — отдельный `sandbox-windows-acl` (ACL-ограниченный runner).
- Явные пределы (документированы как «Known Limitations»): «**File effects are the whole policy
  vocabulary** — the seam expresses no network, process, syscall, device, or credential restrictions.»;
  «**Same-world confinement only** — containers, microVMs, and remote execution require replacing
  capability implementations rather than adding a provider here.»; «**One provider per context**» —
  `packages/sandbox/sandbox/README.md`.
- Fail-closed по умолчанию: если backend недоступен, ошибка `SANDBOX_UNAVAILABLE`, харнесс НЕ запускает
  команду неограниченной — точный текст ошибки приведён в README и требует явного переключения на
  `danger-full-access` (`packages/sandbox/sandbox/README.md`).
- **E2B remote sandbox — прямо назван POC**: `packages/e2b/e2b/README.md` («Known Limitations and
  Deferred Work»): «**This is not a whole-harness runtime**... **Sandbox state is ephemeral**... **No
  deployment platform is configured** — network policy, host-workspace synchronization, and sandbox
  discovery are outside this POC.»
- Landlock — нативный launcher на C (`~300 lines of C11`, статически слинкован с musl), «fail-closed: if
  the kernel cannot enforce, it exits without running the command.» (`native/landlock-run/README.md`).

## UI как плагин (Web GUI = слот-система поверх Cordis)

- `packages/client/README.md`: 45 пакетов `@deepseek-ai/dsh-client-<name>` в `packages/client/`, включая
  `ui-slots` («Defines how UI features register and compose extension slots»), `ui-renderer` («Binds slot
  data to React and mounts the assembled application»), и ~30 feature-пакетов (`ui-conversation`,
  `ui-tool`, `ui-goal`, `ui-subagent`, `ui-plan`, `ui-agent-preset`, `ui-settings-*`, `ui-model-selection`
  и т.д.) — каждый регистрируется в свой слот.
- `packages/client/ui-slots/README.md`: «One `register({ name, children?, store?, inject?, ...kind },
  Component)` call contributes a component into a declared slot and, in the same breath, declares child
  slots... a store seat, and the registrant's business face.» — типобезопасная (TS declaration-merging)
  slot-система, аналог extension points, НЕ просто произвольный React-рендер.
- `ui-settings-plugin-inventory`: «Contributes the read-only Host Loader inventory tab to Plugins
  settings» — т.е. в самом UI есть вкладка «инвентарь плагинов» (что загружено), но это ИНВЕНТАРЬ, не
  МАРКЕТПЛЕЙС/установщик из UI.
- `ui-settings-plugins`: «Owns the Plugins settings section, its tab extension point, and configurable
  host-plane plugin cards» — управление/конфигурация уже установленных host-plane плагинов из UI,
  установка НОВЫХ — через CLI (`dsh plugin --profile <name> add <package>`), не описана как UI-флоу.

## Переиспользуемость композиции (что именно переиспользуемо)

- Явный паттерн переиспользования — capability seam = Service Definition + Service Provider + Consumer,
  зафиксирован как conventions-правило (`AGENTS.md`), а не единичный случай.
- Bundle = «a distribution format for Cordis config rows and the code they mount, so whatever it inserts
  stays patchable by the layers above it.» (`docs/architecture.md`) — то есть переиспользуемая единица
  дистрибуции — YAML-патч + npm-пакет с кодом, ПАТЧИРУЕМЫЙ дальше.
  запись → `dsh plugin --profile <name> add <package>`.
- Subagent-пакеты (Claude Code/Codex hook bridges, `packages/hooks/`) прямо названы примером устанавливаемых
  бандлов: «the Codex and Claude Code subagent packages are directly installable examples» —
  `packages/bundle/README.md`.
- Композиция самого харнесса читаема/патчибельна и раскрывается командой `dsh --profile web --dump-config`
  (полная прозрачность реального дерева плагинов).

## Границы/риски (сводно, помимо dev preview)

- `dsh-agent-presets`: «cordis and code are full copies of standard» (нет наследования пресетов, только
  полное копирование) — `packages/preset/agent-presets/README.md`.
- `dsh-agent-presets`: «A generation is keyed on the composition file alone» — изменение файла скилла/ассета
  рядом с композицией не подхватывается для уже созданных сессий до перезапуска процесса или изменения
  самого `agent.cordis.yml` — `packages/preset/agent-presets/README.md`.
- `dsh-sandbox`: нет сетевой/процессной/syscall-политики — только файловые эффекты (см. выше).
- `dsh-e2b`: явный POC, без reconnect/шаблонов/снапшотов/сетевой политики.
- `dsh-llm-pi-ai`: Bedrock/Vertex/Azure/Codex нельзя настроить как произвольный hand-declared route (нужна
  их нативная аутентификация — SigV4/ADC/OAuth), только как встроенный каталог pi-ai.
- Нет встроенного централизованного plugin-маркетплейса/реестра — обнаружение сторонних плагинов держится
  на GitHub-топике `dsh-plugin` и Discord, а не на встроенном каталоге харнесса.
