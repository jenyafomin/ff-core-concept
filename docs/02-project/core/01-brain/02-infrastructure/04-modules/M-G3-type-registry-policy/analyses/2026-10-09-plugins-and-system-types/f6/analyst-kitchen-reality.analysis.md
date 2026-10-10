# F6 — реальность «кухни» шлюза (analyst)

- **Status:** draft
- **Owner:** jenya.stasik@gmail.com
- **Date:** 2026-10-09
- **Потребитель:** F6 synthesis
- **Поглощает:** —
- **Related:** ADR-0017 F6; шлюз `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/src` (read-only)

## 1. Каскад промптов сегодня
- Единственный резолвер: `server/orchestration/conversation-config.ts` — `paths()` :76-100, `resolve()` :103-153. Файлы: `<projectCwd>/.gateway/conversations/<chatId>/PROMPT.md` и `.../<threadId>/PROMPT.md` (+ `config.json`).
- Слияние: `[chat, topic].filter(непустые).join('\n\n')` (:116-118, :138). Это КОНКАТЕНАЦИЯ. Скаляры (cwd/model/respondType/rotateAtPct) — «топик ?? чат» (:119-124).
- Полная сборка system prompt: `turn-executor.ts:307-330` — `Agent.systemPrompt` (реестр бота) → `conv.prompt` → `conv.footer` → директива respondType; `topicLine` — unshift первым (:326-335). Читается на КАЖДЫЙ ход в `buildTask` (:257-262, до старта агента); кеша нет (fs.readFile).
- Писатели: `/prompt` (`command-handler.ts:1416-1418`, writeFile в топик-уровень, иначе чат); `/bind` (`patchLevelConfig` :1366-1387); сам агент обычными файловыми тулами (футер `conversation-config.ts:250-291` учит его).
- Вызовов `convConfig.resolve`: 18 (turn-executor 3; command-handler 10; nav/tree/find/file-browser/wizard/concept-card — по 1). Но `.prompt` потребляют ТОЛЬКО 2 места: `turn-executor.ts:323` и `command-handler.ts:1405` (показ). Остальные берут cwd/respondType.
- Шов `PromptSource`: `resolve(projectCwd, conversationId) → {prompt, footer, cwd, model, …}` уже ЕСТЬ как класс `ConversationConfigService` (конструируется один раз, `build-app.ts:387`). Нужен интерфейс над ним: 1 место конструирования, 18 вызовов без правки (тот же метод), реально меняется семантика в 2 потребителях `.prompt` + запись `/prompt`/агентская самоправка (агент пишет ФАЙЛЫ — при brain-реализации нужен иной путь записи: `record`, футер надо переписать). Прочие слои (user, project) = новые ключи в `resolve`; contextual ввод (userId, projectId) сейчас в `resolve` не передаётся — сигнатуру надо расширить (userId есть в `job`).

## 2. Дедуп
- `DedupStore` (`orchestration/dedup-store.ts`): in-memory `Set` + FIFO-очередь (cap 2000), персист в `seen_updates` (PK key, seenAt) fire-and-forget (:58-74), гидрация `load()` на старте (:24-37).
- Путь: `orchestrator.ts:78-86` — самая первая операция `handle()`, ключ `channel:conversationId:messageId`. `markIfNew` СИНХРОННЫЙ — бюджет задержки ≈ 0 (Set lookup); БД не на горячем пути.
- Сбой БД: только `console.error`, ход идёт (fail-open на персист). Окно «увидел→крэш до flush» признано в комментарии :9-12. Если бы источник был remote и блокирующий — пришлось бы выбирать: fail-open = двойной прогон хода (дорого, деньги токенов), fail-closed = потерянное сообщение.

## 3. Process lease
- НЕ лидерство/единый поллер. Это реестр pid дочерних `claude --resume` (`core/domain/process-lease.interface.ts`, таблица `process_leases`, ключ claudeSessionId). Пишется после spawn (`print-runner.ts:207-221`), снимается по завершении (:225-232), на старте `OrphanReaper.reap()` (`lifecycle/orphan-reaper.ts:43-56`) SIGKILL'ит живые pid своего host ДО `Queue.recover`.
- Зачем: после SIGKILL родителя сирота продолжает писать транскрипт → двойной `--resume`. Единый поллер Telegram lease'ом НЕ защищён (grammY long polling, `telegram-channel.ts:137`; `event-log.store.ts:30` прямо говорит «кросс-процессный CAS вне»).
- Недоступность: запись/снятие ошибки проглатываются (лог). Но смысл lease — pid + host, привязка к локальной ОС; в brain он станет сетевой записью о локальном процессе. Нужен ЛОКАЛЬНЫЙ файл/SQLite в любом случае (после краха мозга сироты не найти).

## 4. Остальные сущности (EntitySchema, `server/persistence/entities/`)
- Уже event-log-образные (append-only, PK id/ts, индексы по conversation): `unit_event` (eventId, unitId, idempotencyKey, UNIQUE(unitId,idemKey) — уже idem-форма), `decision_journal` (+ обёртка `event-logging-decision-journal.repo`, зеркалит в unit_event), `token_ledger`, `messages` (direction/ts/refs). Дёшево зеркалить в мозг асинхронно (fire-and-forget, один писатель, потеря допустима).
- Не лог, а изменяемое состояние: `jobs`, `sessions`, `bots`, `agents`, `topics` — требуют CAS/апдейтов; переносить позже.

## 5. Примитивы мозга (`packages/brain`)
- Атомарный CAS: ЕСТЬ на записи — `expected_rev` → `CONFLICT` (`domain/validate-act.ts:287-293`) внутри ЕДИНОЙ очереди записи (`service/queue.ts`, одна цепочка промисов; весь write атомарен относительно других). Идемпотентность: `idem` (`service/idem.ts`, ключ sha256(dialog+idem), реплей → оригинальный ответ) — это готовый дедуп-примитив, переживает рестарт (строится из журнала). Однопроцессность: lock-файл (`journal.ts:34`).
- Batch: НЕТ (глаголы record/find/read/link; `contract.ts:176-186`, по одному). Лимит записей 60/мин на диалог (`LIMITS.recordsPerMinutePerConversation`) — ПРЯМО блокирует дедуп на каждое сообщение и логирование ledger через record.
- Чтения: HTTP по unix-сокету + токен, индекс в памяти (store.load) — вероятно суб-10мс, но ЗАМЕРОВ чтения в репо нет (health даёт только p95 записи, `health.ts`). Суб-мс не доказан.
- Слои/линзы: поле `layer` в record (:249, :348) и presets/find есть; «наслоение с мёрджем по линзе» как примитив — не найдено, придётся строить (конкатенация по порядку слоёв + scope-фильтр).
- Локальный снапшот/кеш: должен сидеть ВНУТРИ шлюза за `PromptSource` (write-through: при успешном чтении пишем последнюю версию в `.gateway/…/PROMPT.cache.md`; при SERVICE_DOWN — читаем кеш). Для дедупа — прежний `DedupStore` остаётся L1, мозг = L2 (гидрация); для lease — только локально.
- Шлюз уже говорит с мозгом, но только как MCP-тулы агента (`claude-runner/brain-mcp.ts`, fail-open, opt-in `GATEWAY_BRAIN_MCP`); собственного клиента мозга у шлюза нет.

## Вывод
Промпты переносимы дёшево и безопасно (читаются раз за ход, 2 потребителя, fail-safe через кеш). Дедуп переносим как L2 при сохранении in-memory L1 (иначе рейт-лимит и сеть на горячем пути). Lease переносить нельзя по смыслу (pid локален); можно лишь зеркалить как событие.

Итог: решение (вход для F6-синтеза) — PromptSource-шов первым; дедуп только L1+L2; lease локально + опц. событие.
