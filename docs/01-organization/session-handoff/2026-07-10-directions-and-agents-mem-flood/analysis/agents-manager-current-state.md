---
Status: active
Date: 2026-07-10
Type: reality-map
Owner: JenyaFomin
Scope: /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager (шлюз «Движ», grammY + Claude SDK-раннер)
Related: docs/01-organization/session-handoff/2026-07-10-directions-and-agents-mem-flood/CAPTURE.md,
  docs/01-organization/session-handoff/2026-07-10-directions-and-agents-mem-flood/CAPTURE-2-theme-management.md
---

# agents-manager — карта ТЕКУЩЕГО состояния кода (не видения)

Читал реальный код (`src/`), `.gateway/` живьём (реальные топики владельца), docs репозитория
(`docs/01-project/problems/`, `docs/01-project/ideas/`). Цель — что УЖЕ есть под видение владельца
об управлении темами/агентами, а чего нет. Код не менял.

---

## 1. Хранилище разговоров/топиков/сессий

**Вердикт: ЕСТЬ, зрело, ДВЕ параллельные системы хранения с разными ролями.**

Не одна система, а две, разделённые по смыслу:

**(а) Файловый каскад `.gateway/`** — конфигурация диалога (промпт + cwd + модель), НЕ история сообщений.
`src/server/orchestration/conversation-config.ts:54-233` (`ConversationConfigService`). Живьём в
`agents-manager/.gateway/conversations/<chatId>/[<threadId>/]{PROMPT.md,config.json}` — проверил, это
не гипотеза: у владельца реально 7 чатов и топики `92, 195, 56, 216, 681, 431, 325, 196, 65, 147`.
Читается **на каждый ход** (`turn-executor.ts:207-213`), правка агентом файла применяется со
следующего сообщения без рестарта. `PROMPT.md` чата и топика **склеиваются** (не перезаписывают друг
друга), `config.json` — топик побеждает чат (cwd/model).

**(б) БД (TypeORM/SQLite) — durable-состояние**: `session`, `message`, `job`, `topic`, `agent`,
`bot`, `agent_binding`, `process_lease`, `seen_update` (`src/server/persistence/entities/*.entity.ts`).
`ISession` (`src/core/domain/session.interface.ts:16-40`) хранит `claudeSessionId` (для `--resume`),
`topicId` (опц. связь на `ITopic`), `agentId`, `cwd`, `costUsdTotal/costUsdSinceNew`, `newAt`. Ключ
сессии — `channel:conversationId[:participantId][:agentId]` (scope=topic по умолчанию,
`registry.config.ts:41-43`).

**claudeSessionId ↔ топик**: топик НЕ хранит claudeSessionId напрямую — связь идёт через
`ISession.key` (включает `conversationId` = `chatId:threadId`) → `ISession.claudeSessionId`.
`resume` резолвится в `src/claude-runner/sdk-runner.ts:199-206`: `task.claudeSessionId` (явно
передан) → иначе `session.claudeSessionId` из БД → иначе первый ход (undefined, SDK сам генерит id).
Claude-сессии живут **per-cwd** (`~/.claude/projects/<cwd>`) — смена `cwd` физически ломает resume,
поэтому `applyCwdOverride` (`turn-executor.ts:318-346`) **осознанно сбрасывает** claudeSessionId при
смене привязки (новая родословная).

`ITopic` (проекция форум-топика Telegram) — отдельная сущность от `ISession`, регистрируется через
`/topic new` (`command-handler.ts:157-169`), связь `Session.topicId` — по `threadRef`
(`orchestrator.ts:150-168`, «S9-light»: не создаёт `ITopic` молча, если тема не зарегистрирована).

## 2. Команды владельца: `/new`, `/bind`, `/prompt`, `/context`

**Вердикт: ЕСТЬ, реализованы, но `/new` — НЕ архивация, только сброс.**
`src/server/orchestration/command-handler.ts:61-106` (диспетчер), детали — по ниже.

- **`/new`** (`command-handler.ts:63-66`, `resetSession` в `566-589`): читает текущую `ISession`,
  создаёт новую запись с **тем же ключом** (перезаписывает, не архивирует), явно ОПУСКАЯ
  `claudeSessionId` и `parentSessionId` — «новая родословная». `costUsdTotal` (общий счётчик за всю
  жизнь) сохраняется, `costUsdSinceNew` обнуляется. Комментарий в коде честно фиксирует это
  (`command-handler.ts:65`: «Tier4: не обещаем "архивацию" (её нет) — resetSession лишь сбрасывает
  claudeSessionId»). Старая claude-сессия НЕ удаляется физически (лежит на диске Claude Code), но
  шлюз теряет к ней путь — `/resume` (см. ниже) её не находит.
- **`/resume`** — почти мёртвая команда: `ECommand.Resume` (`command-handler.ts:67-70`,
  `ensureActive`) лишь возвращает сессию из `Archived` в `Idle`, но статус `Archived` нигде не
  проставляется на `/new` (см. выше) — комментарий в коде: «M5: /resume сейчас практически
  недостижим (сессия не архивируется без полной архивации)».
- **`/bind <путь>`** (`527-554`): пишет `{cwd: <путь>}` в `config.json` уровня топика (или чата, вне
  форума). Валидирует: абсолютный путь + существующая папка (`isValidCwd`,
  `conversation-config.ts:185-191`). Смена cwd на СЛЕДУЮЩЕМ ходе триггерит `applyCwdOverride` →
  новая claude-сессия (см. п.1). Поддерживает `--topic <id>` — привязать чужой топик того же чата,
  не переключая текущий диалог.
- **`/prompt [текст]`** (`494-518`): без аргумента — показывает склеенный каскад + пути файлов; с
  аргументом — пишет `PROMPT.md` уровня топика (или чата). Тоже поддерживает `--topic <id>`.
- **`/context`** (`599-617`, `ECommand.Context`): снимок ОДНОЙ сессии по ключу текущего диалога —
  `claudeSessionId`, статус, `costUsdTotal`/`costUsdSinceNew`, возраст с `/new` +
  вычисляемая метка свежести (`fresh/aging/stale`, пороги 2ч/6ч — `reply-header.util.ts:135-141`).
  Не показывает долю контекстного окна (это per-turn данные, не в `ISession`).

Дополнительно есть `/status` (все сессии бота + активные джобы, `443-463`) — это ближе к «пульту»,
см. п.8.

## 3. Каскад промптов PROMPT.md

**Вердикт: ЕСТЬ, зрело, ровно как описано в проектном CLAUDE.md.**
`src/server/orchestration/conversation-config.ts` — `ConversationConfigService.resolve()` (89-127):
читает `chatPromptPath` + `topicPromptPath` (если в форум-топике), **конкатенирует** непустые части
через `\n\n` (102-104,118), добавляет служебный «футер самонастройки» (`buildFooter`, 198-232) —
явную инструкцию агенту, где лежат его файлы и что он может их сам править. Вызывается заново
`turn-executor.buildTask()` **на каждый ход** (`turn-executor.ts:207-213`) — без кеша, без рестарта.
Порядок слоёв факта: `Agent.systemPrompt` (роль из БД) → промпт чата → промпт топика → топик-контекст
(«где я», `resolveTopicLine`) — конкатенируются в `task.systemPrompt`
(`turn-executor.ts:242-267`).

## 4. Концепт «личность/роль агента» (переиспользуемые персоны)

**Вердикт: ЧАСТИЧНО — модель данных на переиспользование ЕСТЬ, но фактическое поведение = один
дефолтный агент на бота, без выбора/переключения персон владельцем.**

- `IAgent` (`src/core/domain/agent.interface.ts:10-24`) — полноценная модель роли:
  `systemPrompt`, `model`, `tools[]`, `skills[]`, `limits`. Хранится в БД (`agent.entity.ts`).
- `IBotBinding` (`src/core/domain/bot-binding.interface.ts:7-16`) — связка Agent↔Bot↔**опц. Topic**
  (поле `topicId?`), т.е. схема ДОПУСКАЕТ разные персоны на разные топики одного бота.
- **НО** реальный резолв в роутере игнорирует топик: `src/server/routing/router.ts:27`
  — `this.agents.findBinding(message.botId)` — вызов **без** `topicId`, хотя
  `IAgentRepo.findBinding(botId, topicId?)` его принимает. Значит на практике у бота ровно один
  «дефолтный» агент (`isDefault: true`), персона НЕ варьируется по топику, несмотря на то что схема
  БД это поддерживает.
- Единственный способ завести Agent сейчас — `seedRegistry()` (`src/app/seed-registry.ts`) на старте
  процесса из ENV (`GATEWAY_AGENT_ID/NAME/SYSTEM_PROMPT/MODEL`, `registry.config.ts:112-132`) —
  **один агент, захардкоженный в `.env`**, не runtime-командой владельца. Нет команды
  `/agent new|switch|list` в `ECommand` (`src/core/domain/command.enum.ts`) — полный список команд
  там не содержит ничего про агентов/персон.
- Живой пример — `.env.ff-personal` в самом agents-manager задаёт **один** `GATEWAY_AGENT_*` для
  всего бота «FF Personal».
- Вывод: инфраструктура «роль отдельно от транспорта» заложена архитектурно (см. комментарий
  `agent.interface.ts:6-7` — «Agent — роль/личность отдельно от транспорта»), но живой продукт даёт
  ровно ОДНУ роль на бота, задаваемую через `.env`, без runtime-репликации персон и без привязки
  персоны к конкретному топику.

## 5. Egress-форматирование (RM-5: жирность не доходит)

**Вердикт: ЕСТЬ конвертация в HTML, но `**bold**` НЕ конвертируется — баг подтверждён в коде.**

`src/channel-telegram/egress/format-telegram.util.ts:1-42` (`toTelegramHtml`) обрабатывает РОВНО
два случая: тройные бэктики → `<pre>` (строки 34-39), инлайн `` `code` `` → `<code>` (20-29,
regex `INLINE` = строка 12). **Всё остальное** проходит только через `escapeHtml()` (15-17), которая
экранирует лишь `& < >`. Markdown-разметка (`**bold**`, `_italic_`, `# заголовок`, списки `-`)
**не парсится вообще** — нет ни одного regex/токенайзера под неё в файле.

`src/channel-telegram/telegram-channel.ts:238-241` (`sendChunk`) шлёт `sendMessage(...,
toTelegramHtml(text), { parse_mode: 'HTML' })`. Telegram в режиме `parse_mode: HTML` **не понимает
Markdown-синтаксис `**`** — это не HTML-тег, значит `**слово**`, приходящее от Claude (модель почти
всегда форматирует ответ Markdown'ом), доходит до Telegram буквально как два литеральных символа
`*` вокруг текста, БЕЗ полужирного начертания.

**Точная причина RM-5:** конвейер `Claude reply (Markdown) → toTelegramHtml() → parse_mode: HTML`
теряет форматирование, потому что `toTelegramHtml()` — это HTML-**экранировщик** (safety), а не
Markdown→HTML **транслятор**. Функция была спроектирована только для защиты код-блоков
(комментарий в файле, строки 2-6, явно говорит про код, ни слова про bold/italic). Нужен шаг
`**x**→<b>x</b>`, `_x_→<i>x</i>` и т.п. до эскейпинга остального текста — этого шага физически нет
в коде. `docs/01-project/ideas/2026-07-10-telegram-rich-messages/README.md` фиксирует смежную, но
другую задачу (таблицы через `sendRichMessage`, Bot API 10.1) — bold-баг там не упомянут и не
покрывается тем решением напрямую (Rich Messages — параллельный, не пересекающийся тракт).

## 6. Кнопки/inline-keyboard/callback + live-egress

**Вердикт: ЕСТЬ инфраструктура кнопок, но она НЕ доступна произвольному ходу агента — только
предопределённым сценариям. Live-egress — отдельные НОВЫЕ сообщения, не редактирование.**

- Кнопки заведены под 2 сценария: **(1) governance-гейт** — `ApprovalGate.request()`
  (`src/server/approval/approval-gate.ts:36-68`) шлёт 2 кнопки Approve/Reject с callback,
  закодированным `buildApprovalCallback`; **(2) файловый навигатор/дерево/визард/концепт**
  (`/files /tree /wizard /concept`, `command-handler.ts:267-363`) — кнопки `fb:`/`tv:`/`wz:`-callback,
  редактируют то же сообщение (`telegram-channel.ts:387-446`, `handleBrowseCallback`).
- Финальный ответ агента (`decorateReply` → `outbound` в `turn-executor.ts:408-417`,
  `persistOutcome`) **не** включает поле `buttons` — обычный ход агента кнопки эмитить не может;
  это зашито в конкретных command-handler'ах, не в общем тракте вывода.
- `buildKeyboard()` (`telegram-channel.ts:494-518`) канало-агностичен и поддерживает multi-row —
  инфраструктура готова принять кнопки от любого источника `IOutboundMessage.buttons`, просто
  сегодня их выставляют только approval-gate и browser-handler'ы.
- **Live-egress** (`GATEWAY_LIVE_EGRESS`, off по умолчанию, `src/app/build-app.ts:101-112`) — MCP-
  инструмент `send_message` (`src/claude-runner/live-egress-tool.ts`), доступный агенту ВНУТРИ хода.
  Гарды: `maxMessages`/`maxChars` за ход (`LiveEgressTurn.send`, строки 50-77). Реализация
  `src/server/live-egress/live-egress.ts:29-64` — **сначала пишет** intermediate-`IMessage` в БД
  (аудит), **потом** `channel.send()` — это ВСЕГДА новое сообщение (`sendMessage`), НЕ
  `editMessageText`. Формулировка «что редактирует» из задания неточна относительно кода: live-egress
  ничего не редактирует, он добавляет отдельные сообщения по ходу выполнения.

## 7. Отправка файла целиком (RM-2) + пометка модели (RM-3)

**Вердикт: ОБА ЕСТЬ.**

- **RM-2 (файл одним сообщением)** — команда `/send [--topic <id>] <путь>…`
  (`command-handler.ts:202-258`, `handleSend`): гардит путь через `resolveProjectFile` (не выйти из
  корня, не отдать секреты), проверяет размер (`inspectFile`, лимит 50 МБ — Bot API,
  строки 703-718), кладёт пути в `outbound.files`; `telegram-channel.ts:207-218` шлёт их
  `sendDocument` — то есть файл уходит документом целиком, отдельным сообщением после текста.
- **RM-3 (пометка модели)** — уже встроено в стандартный хедер финального ответа, не отдельная
  фича: `reply-header.util.ts` + `turn-executor.decorateReply()` (`423-452`) собирают строку
  `📁 папка · 🤖 роль · модель` (сегмент модели — реальная `result.model` хода, фолбэк на
  `agent.model`). Легенда хедера доступна командой `/header` (`command-handler.ts:396-406`).

## 8. Центральный «пульт»/логирование бесед + управление несколькими агентами (TM-8/TM-9)

**Вердикт: ЧАСТИЧНО — БД-лог диалогов есть и достаточно богат, но нет отдельного UI/дашборда;
единственная поверхность — текстовые команды `/status`/`/topics` в самом Telegram.**

- `messages` (таблица, `message.entity.ts:8-29`) хранит **каждое** сообщение (in/out, включая
  live-egress intermediate) с `sessionKey`, `botId`, `direction`, `userId`/`username`, `ts`,
  `costUsd`, `kind` — индексы по `sessionKey` и `ts`. Это и есть «кто/когда/о чём», но доступ к
  этому — только программный (репозиторий), нет HTTP/UI поверх.
- «Ждёт ответа» — косвенно через `job.status` (`EJobStatus`: queued/running/awaiting_approval/…)
  и `ApprovalGate.pending` (in-memory Map, не персистентная витрина).
- `/status` (`command-handler.ts:443-463`) — ближайший аналог «пульта»: список сессий бота
  (свежие первыми) + маркер «работает» по running-джобам + суммы расхода. Это ответ ТЕКСТОМ в
  чат по запросу, не живой дашборд.
- `/topics` (`115-128`) — список тем бота (имя/статус/id).
- **Нет**: веб-UI, HTTP API для чтения БД, cross-bot/cross-agent сводной панели — искал по
  `find . -iname "*dashboard*" -o -iname "*ui*"` (вне `node_modules/dist`) — пусто. `src/app/`
  (`build-app.ts`, `index.ts`, `rebuild.ts`) — только композиционный корень процесса шлюза, не
  сервер с эндпойнтами.
- Управление несколькими агентами (TM-8/TM-9 в терминах владельца) технически возможно на уровне
  схемы (`agent_bindings` — many-to-many Agent↔Bot↔Topic), но, как в п.4, роутер сегодня резолвит
  только ОДНОГО дефолтного агента на бота — многоагентное управление НЕ построено поверх этой схемы.

---

## Сжатая таблица

| # | Пункт | Вердикт | Ключевой файл | Как есть (1 строка) |
|---|---|---|---|---|
| 1 | Хранилище топиков/сессий + resume | ЕСТЬ | `src/server/orchestration/conversation-config.ts`, `src/core/domain/session.interface.ts`, `src/claude-runner/sdk-runner.ts:199-206` | Два слоя: файлы `.gateway/` (конфиг диалога) + БД `session/message/topic` (durable-состояние); resume через `claudeSessionId` в `ISession`, привязан per-cwd. |
| 2 | Команды `/new /bind /prompt /context` | ЕСТЬ (частично честно урезано) | `src/server/orchestration/command-handler.ts` | `/new` НЕ архивирует — только сбрасывает `claudeSessionId` (комментарий в коде это признаёт); `/resume` практически мёртв; `/bind`/`/prompt` пишут файлы каскада. |
| 3 | Каскад PROMPT.md чат→топик | ЕСТЬ, зрело | `src/server/orchestration/conversation-config.ts:89-127` | Склейка чат+топик, читается на каждый ход, футер учит агента редактировать свои файлы. |
| 4 | Персоны/роли агента | ЧАСТИЧНО | `src/core/domain/agent.interface.ts`, `src/server/routing/router.ts:27` | Схема (`IAgent`+`IBotBinding.topicId`) готова под мультиперсоны, но роутер резолвит только 1 дефолтного агента на бота из `.env`; нет команды создания/переключения персон. |
| 5 | Egress-форматирование / RM-5 bold | ЧАСТИЧНО (баг подтверждён) | `src/channel-telegram/egress/format-telegram.util.ts:1-42` | `toTelegramHtml()` конвертирует только код-блоки; `**bold**` не транслируется в `<b>`, проходит как литеральные звёздочки в HTML-режиме → не жирный. |
| 6 | Кнопки/callback + live-egress | ЧАСТИЧНО | `src/server/approval/approval-gate.ts`, `src/claude-runner/live-egress-tool.ts` | Кнопки — только approval-gate и file-browser; обычный ответ агента кнопок не может; live-egress шлёт НОВЫЕ сообщения, ничего не редактирует. |
| 7 | Файл одним сообщением (RM-2) + модель в ответе (RM-3) | ЕСТЬ, оба | `command-handler.ts:202-258` (`/send`), `src/server/orchestration/reply-header.util.ts` | `/send` шлёт документ(ы) целиком с гардом пути/размера; модель уже в стандартном хедере ответа. |
| 8 | Центральный пульт / мультиагент-управление | ЧАСТИЧНО | `src/server/persistence/entities/message.entity.ts`, `command-handler.ts:443-463` (`/status`) | БД хранит полный лог сообщений/сессий/джобов, но нет UI/API-дашборда — только текстовые `/status`/`/topics` в чате; мультиагент-схема есть, не используется. |

## Точная причина RM-5 (жирность не доходит)

`src/channel-telegram/egress/format-telegram.util.ts` реализует `toTelegramHtml()` как **экранировщик
безопасности** для HTML (`& < >`) плюс перевод ТОЛЬКО код-разметки (```` ``` ```` → `<pre>`, `` ` ``
→ `<code>`) — никакого транслятора остальных Markdown-конструкций (`**bold**`, `_italic_`, `# h1`,
списки) в файле нет. Ответ модели Claude почти всегда markdown-форматирован. Он уходит в
`bot.api.sendMessage(..., parse_mode: 'HTML')` (`telegram-channel.ts:238-241`). В режиме `HTML`
Telegram не распознаёт `**` как разметку (это синтаксис MarkdownV2, не HTML) — строка остаётся
буквальными звёздочками вокруг текста. Итог: жирность «теряется» не из-за сбоя экранирования, а
потому что нужного шага перевода (`**x**` → `<b>x</b>` и т.д.) в конвейере попросту не существует.
