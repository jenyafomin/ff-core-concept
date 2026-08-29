---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-23
Scope: project
Related: ../analyses/dvizh-capabilities-and-plan.analysis.md, ../questions/dvizh-vs-harness-open-questions.md
---

# Факты — Движ (agents-manager), со ссылками

Источник: локальный репозиторий `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager` (ветка на момент
чтения — рабочая копия, не проверялась отдельно). Все ссылки — `file:line` реального дерева на 2026-08-23.

## 1. Что это и текущий милстоун

- Проект = «Свой шлюз Telegram → Claude Code»: входящее сообщение резюмирует durable-сессию Claude Code,
  агент делает один ход, процесс завершается (`README.md:1-3`).
- **Текущий статус: M4 — один бот end-to-end (MVP)** + **M4.5 — самонастраиваемые диалоги**
  (`README.md:5-19`). Мульти-бот реестр, агрегация/саммари, tmux, стрим-прогресс — заявлены как **M5**
  (`README.md:8`).
- `package.json:1-3` — имя пакета `@dwizh/gateway`, `version: 0.0.0`, описание фиксирует стадию «M2:
  репозитории + print-runner» (устарело относительно README M4/M4.5 — расхождение версии описания и факта).

## 2. Архитектура — гексагональная, порты/адаптеры, единственный композиционный корень

- Слои и жёсткое направление зависимостей: `channel-telegram → core ← server`, `claude-runner → core`;
  `core` не импортирует никого; сшивает всё **единственный** `src/app` (`README.md:21-46`).
- `src/core/ports/` — 15 файлов интерфейсов: `channel.interface.ts`, `router.interface.ts`,
  `queue.interface.ts`, `approval-gate.interface.ts`, `tool-approval-gate.interface.ts`,
  `permission-policy.interface.ts`, `live-egress.interface.ts`, `forum-topics.interface.ts`,
  `send-to-topic.interface.ts`, `summarizer.interface.ts`, `plan-usage.interface.ts`,
  `rebuild-controller.interface.ts`, `route-result.interface.ts`, `approval-action.interface.ts`,
  `approval-decision.enum.ts` (директория `src/core/ports/`, листинг подтверждён напрямую).
- Единственная сегодняшняя реализация `IAgentRunner` — раннер (`README.md:33`); единственная реализация
  `IChannel` — `TelegramChannel` (`README.md:37-39`). То есть: архитектурно расширяемо (можно дописать
  второй `IChannel`/`IAgentRunner`), но **фактически один канал, один раннер** — не мультиканальность
  «из коробки».
- Persistence — TypeORM + `better-sqlite3`, `entities/` + `mappers/` (домен ↔ строка БД), 9-10
  операционных репо: job/session/message/agent/bot/topic/decision-journal/process-lease/seen-update/summary
  (перечислены в `docs/architecture/ADR/ADR-0006-strangler-migration-live-gateway-operability.md:37`).

## 3. Раннер — печатный (CLI one-shot) → SDK-раннер (in-process), ADR-0001

- Файл: `docs/01-project/01-architecture/01-infra-agent-manager/ADR-0001-sdk-runner.md`.
  Status: **approved** (реализовано на `feat/sdk-runner`; e2e из Telegram помечена pending) — `:3`.
- Проблема исходной модели (`PrintRunner`, `src/claude-runner/print-runner.ts`): one-shot процесс на ход
  (фон/долгие суб-агенты не переживают конец хода), approval невозможен мид-ран (CLI без TTY), стрим
  фейковый (финал одним чанком) — `ADR-0001.md:12-21`.
- Решение: `SdkRunner implements IAgentRunner` поверх `@anthropic-ai/claude-agent-sdk` (`query()`
  in-process, типизированные события, `canUseTool`), `PrintRunner` остаётся fallback,
  переключение через `GATEWAY_RUNNER_MODE` (дефолт `sdk`) — `ADR-0001.md:26-63`.
- **Approval-мост per-tool**: `canUseTool` вызывается SDK на каждый мутирующий тул-колл; read-only тулы
  (`Read/Glob/Grep/LS/NotebookRead/TodoWrite`) → allow молча; мутации (`Write/Edit/Bash/WebFetch/Task/MCP…`)
  → `ToolApprovalGate.requestTool()` шлёт в Telegram **3 кнопки** (✅ Раз · ♾️ Всегда · ⛔ Отклонить) —
  `ADR-0001.md:42-47`.
- «Всегда» реализовано через SDK-нативный `PermissionResult.updatedPermissions` (`addRules`,
  `destination: 'localSettings'`) — **без своего хранилища правил** — `ADR-0001.md:49-53`.
- Открытые пункты на момент ADR: реальная e2e-валидация из Telegram — pending; токен-стрим в Telegram-эдиты
  не реализован (сейчас `stream()` = финал одним чанком, MVP) — `ADR-0001.md:92-95`.

## 4. Topic/session scope и awareness — ADR-0002 (gateway-topic-and-reply-awareness) + ADR-0004 (topic-awareness-model)

- ⚠️ **Дублирование номера ADR** в дереве: существуют ДВА разных `ADR-0002` (`ADR-0002-access-roles-and-approval-policy.md`,
  status draft, и `ADR-0002-gateway-topic-and-reply-awareness.md`, status approved) и ДВА разных `ADR-0004`
  (`ADR-0004-node-model-unified-viewer-concept-first.md` и `ADR-0004-topic-awareness-model.md`, status
  proposed). Нумерация ADR в этом репо не уникальна — дисциплина слабее, чем в FF (`doc-tree.md` требует
  один дом/уникальную нумерацию).
- `ADR-0002-gateway-topic-and-reply-awareness.md` (status approved, 2026-07-08): каждое входящее сообщение
  несёт `conversationId` вида `chat:thread`, сквозной от входа до egress — топик Telegram-форума = единица
  адресации (`:11-16`). Решение вводит: `IInboundMessage.threadRef?`/`replyToText?`,
  `ITopicRepo.findByThreadId(botId, threadId)`, линковку `session.topicId` при создании сессии, строку
  контекста темы в `systemPrompt`, reply-сниппет как фолбэк, если сообщение не найдено в истории
  сессии (`:40-49`). Явно НЕ вводится: молчаливая авто-регистрация темы (D2), кэш topic-контекста в сессии
  (резолв на каждый ход — тот же паттерн, что каскад конфигурации диалога) (`:51-65`).
- `ADR-0004-topic-awareness-model.md` (status proposed, 2026-07-27) идёт дальше: вводит `ITopicAwarenessRef`
  (`stateRef?`, `logRef?`, задел `planRef?`, `handoffAt?`) как одну JSON-колонку на `ITopic` — связь
  топик↔стейт-проекту↔лог, БЕЗ новой миграции схемы на каждое новое измерение (`:39-46`). На момент чтения:
  Слой-2 (кросс-топиковый обзор для агента-координатора, `forBot`) — **DEFERRED**, не реализован (`:66-68`);
  companion-фикс `originThreadRef` в `job-row` (topic-awareness переживает рестарт посреди хода) — тоже
  **DEFERRED** (`:49-52`).
- README фиксирует **scope выбора на бота**: `GATEWAY_BOT_SCOPE` = `topic` (общая сессия на топик, дефолт)
  или `user` (изоляция по юзеру) (`README.md`, таблица переменных).

## 5. Egress/доставка в Telegram

- `channel-telegram/egress/telegram-message-handle.ts` — `IMessageHandle`: эдит одного сообщения (live
  прогресс) (`README.md`, структура).
- **Live-egress (мультисообщения за ход)** уже реализован технически: агент шлёт несколько сообщений с
  гардами (≤2/ход, ≤500 симв.), промежуточные approval = auto-allow+гарды; флаг `GATEWAY_LIVE_EGRESS` НЕ
  включён по умолчанию в коде (`ADR-0002-gateway-topic-and-reply-awareness.md:28-31`).
- Ответ всегда уходит в тот же `message_thread_id`, что и входящее — адресация проверена на живых логах
  (`out [...:56]`, `out [...:65]` — уходит в конкретный топик), это зафиксировано отдельным ГЛОБАЛЬНЫМ
  правилом FF (`~/.claude/rules/gateway-telegram-egress.md`), не только локальным ADR — двойное
  подтверждение поведения.
- Хедер ответа (`GATEWAY_REPLY_HEADER`, вкл по умолчанию): компактная строка `🤖 роль · модель · 💰 $ход
  (Σ $сессия)` над успешным ответом (`README.md`, таблица переменных).

## 6. Governance / approval / роли — ADR-0002-access-roles-and-approval-policy (status: **draft**, код не начат)

- Файл: `docs/architecture/ADR/ADR-0002-access-roles-and-approval-policy.md:1-25` — явно помечен «Черновик.
  Код НЕ начат. Требует одобрения владельца».
- Проблема A («блокер №1»): единственный approver — владелец (`OwnerAllowlist`), ночью/в отсутствие
  владельца approve делать некому — автономность в лупе невозможна (`:30-35`).
- Проблема B: нет среднего яруса доступа между «свой (полный доступ)» и «чужой (deny-all)» — ни в канале,
  ни в роутере, ни в approval-gate, ни в tool-gate (`:37-42`).
- Решение (draft): три класса действий **GREEN/YELLOW/RED** с инвариантом «класс определяется действием,
  не ролью» (`:70-80`); роли **owner/operator/viewer** (`:82-124`); режим сна/автопилот
  time-boxed за флагом `GATEWAY_AUTOPILOT`, RED никогда авто (`:126-153`); фикс self-approve (разделение
  «кто попросил» / «кто утверждает», `route.approverId = systemOwner`) (`:119-124`); фиче-флаги +
  мгновенный откат одним флипом (`:160-170`).
- MVP-срез одобрен владельцем 2026-07-19 (Addendum): `turn-scoped` доверие + журнал решений (3 типа:
  approved/denied/failed-cmd) + конфигурируемый deny-list, область = топик (`:327-329`). Статус ADR
  ОСТАЁТСЯ draft на дату чтения — реализация MVP началась «после этого gate», факт реализации не
  верифицирован в рамках этого разведочного прохода (не читал код `PermissionPolicy`/`IUser`).

## 7. Стратегия эволюции памяти — ADR-0005/ADR-0006/ADR-0009 (все status: draft/proposed, платформенный трек)

- `ADR-0005-one-store-unit-type-event-schema.md` (draft, 2026-08-02): схема единого стора — три примитива
  Unit / Event(Commit) / Ref-Lens; identity = `namespace:slug` (ADR-0003 id-marker), append-only Events,
  «свёртка (fold) Events = текущая форма» (`:1-60`+).
- `ADR-0006-strangler-migration-live-gateway-operability.md` (draft, 2026-08-02): курс — **strangler, не
  greenfield** (FORK-1 закрыт в пользу strangler; отвергнута деструктивная миграция 10 репо) (`:17-19,
  94-100`); operability-инвариант первого класса: живой pm2-шлюз **никогда** не зависит от нового пути,
  пока флаг `GATEWAY_UNIT_STORE` (дефолт OFF) не поднят; откат = флаг off или drop tables (`:70-81`).
  Стадийность S0-S7 фиксирована (`:51-68`).
- `ADR-0009-pattern-as-data-handoff-foundation.md` (draft, 2026-08-20): «паттерн как данные» —
  минимальная форма (TypeUnit `system:pattern@1`, TypeUnit `system:handoff@1`, ребро `hands-off`),
  explicit **generic-движка паттернов НЕТ** — «правило двух»: обобщение движка откладывается до 2-го
  прецедента-механизма (не только хэндофф) (`:36-38, 44-51`). Первый слайс — **только доки**, БД не
  тронута, approval не требуется (`:42, 64-65`).
- Критик той же волны прямо называет риск **«plugin hell»** при динамических паттернах без реестра типов
  (`docs/01-project/ideas/2026-08-20-auto-handoff-mechanism/analysis/lenses-wave3/critic-grandiosity.md:49`),
  и архитектор в этом же треке относит «визуальный конструктор (n8n-канвас) · plugin-реестр паттернов» к
  явно **отложенным** пунктам roadmap («пользовательская поверхность», не сейчас) —
  `docs/01-project/ideas/2026-08-20-auto-handoff-mechanism/analysis/lenses-wave4/architect-adr-and-roadmap.md:324`.
  Других упоминаний слова "plugin" в `docs/`/`src`/`package.json` НЕТ (grep-проверка) — расширяемость
  сегодня = архитектурная (порты/адаптеры), НЕ пользовательская (нет установки стороннего плагина
  владельцем/третьей стороной).

## 8. Зависимости и стек (`package.json`)

- Рантайм-зависимости: `@anthropic-ai/claude-agent-sdk`, `better-sqlite3`, `grammy` (Telegram-бот SDK),
  `reflect-metadata`, `typeorm`. Никаких MCP-серверов, плагин-фреймворков, оркестраторов сторонних
  агентов в зависимостях нет.
- Тесты: `pnpm test` — 86 тестов (`README.md`, §Тесты) через `node --test` + `tsx`, без реальной сети/
  токенов; `pnpm m2:smoke` — единственный реальный e2e против `claude -p` (тратит токены подписки).
- Известное операционное ограничение: шлюз ходит под ПОДПИСКОЙ владельца Claude (общие лимиты с
  интерактивной работой) — README называет это принятой конкуренцией MVP, «отдельная подписка под раннер
  — prod» со ссылкой на ADR-0034 и `analytics/review-2026-07-01.md` P0-2 (`README.md`, §Запуск MVP).

## 9. Состояние живого шлюза относительно этого треда

- `docs/00-states/README.md` — верхний активный узел `state-06-universal-brain` (кросс-проектная память)
  и `state-05-platform-rebuild` (зонтик платформы, первый потребитель мозга); `state-07-graph-loop-autonomy`
  — «слой автономного действия и контроля… механики описаны + аудит пройден (док ~83% / стройка ~65%)».
  Это подтверждает картину: **много спроектировано, платформенный трек в основном design-stage (draft/
  proposed ADR), реализовано и approved — раннер (ADR-0001) и topic/reply-awareness (ADR-0002-топики)**.
