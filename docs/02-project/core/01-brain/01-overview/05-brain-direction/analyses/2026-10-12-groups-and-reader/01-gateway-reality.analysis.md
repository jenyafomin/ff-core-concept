---
status: draft
---
# Реальность шлюза для «читателя над логом» (gw-reader)

- **Status:** draft · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-12
- **Потребитель:** builder / лид · **Поглощает:** ничего
- **Вопрос-цель:** как минимально и безопасно встроить «читателя над логом» в живой шлюз, чтобы агент в топике читал (с фильтром секретов ДО модели), и что для этого реально есть?
- Режим: только чтение. Ничего не менялось, `.env` не читался, pm2 не перезапускался.

## 1. Git шлюза (`/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager`)
- Ветка `feat/phase-0-unblock`. HEAD `f24d0f4` (R1 влит). Затем `1ce1ebe`, `9a12bda`, `84649f9` (G1), `fba4c01`.
- `status --porcelain`: изменены только доки (`docs/00-states/state-08-agent-system-vision/README.md`, `state.concept.json`) и неотслеживаемые `AXES.md`, `mindmap/`. Код `src/` ЧИСТ. Это несохранённая работа владельца в доках: не трогать, не делать checkout/stash.
- Worktree `agents-manager-p2-dedup`: ветка `fix/p2-voice-dedup`, HEAD `c60dad5` («rescue commit», не влит, 40 коммитов позади, ожидаются 3 конфликта), дерево чистое.

## 2. Как агент получает инструменты
- Раннер = SDK (`query()` из `@anthropic-ai/claude-agent-sdk` ^0.3.285). Подтверждено логом pm2: «раннер = SDK».
- MCP задаётся КОДОМ, не конфигом топика: `src/claude-runner/sdk-query.adapter.ts:72` (`withMcpServers(buildMcpServers(params))`), сборка `:310-326`: in-process `gateway_egress` + внешний stdio `ff-brain` (`brain-mcp.ts`).
- Per-topic `config.json` знает только `model, cwd, respondType, rotateAtPct` (`src/server/orchestration/conversation-config.ts:29-56`; факт: у топика 56 `{model, cwd}`). Поля `mcp` НЕТ. Промпт-слои R1 (`PROMPT.md`) дают текст, а не инструменты.
- `ff-brain` включается `GATEWAY_BRAIN_MCP=1` (`build-app.ts:309,327`). По логу сейчас ВЫКЛЮЧЕН (нет «ff-brain MCP ON»). Подключается только при `ownerId` хода (`brain-mcp.ts` `buildBrainMcpServer`); идентичность хода кладётся в env MCP (`FF_BRAIN_CONVERSATION_ID/SENDER_ID/MESSAGE_ID`).
- Гейт прав: `sdk-tool-gate.ts:51-54` автоматически разрешает только `mcp__ff-brain__find|read` (`BRAIN_MCP_READ_TOOLS`). Любой другой MCP-тул в режиме `default` вызывает кнопку владельцу.
- Стоп-лист (`brain-home-guard.ts`): режет путь `~/.ff-brain`, подмену `FF_BRAIN_*`, запуск brain-mcp. Это PreToolUse-хук на тулы агента, на внешний MCP-процесс он не действует.
- `settingSources` в адаптере НЕ задан → SDK грузит user/project/local настройки (`sdk.d.ts:2225-2239`: «omitted = all sources»). Значит `.mcp.json` в cwd топика и `.claude/settings.local.json` читаются. В cwd FF `.mcp.json` нет; в `settings.local.json` есть allow-правила на `mcp__context7__*`.

## 3. Варианты встраивания
| Вариант | Код шлюза | Рестарт | Риск для бота | Заметка |
|---|---|---|---|---|
| (а1) stdio-MCP `gw-reader` через `.mcp.json` в cwd FF + allow-правило `mcp__gw-reader__*` в `settings.local.json` | нет | НЕТ | низкий | Каждый ход = новый процесс CLI, конфиг читается заново. Но: подключится ко ВСЕМ топикам с cwd FF и к обычным сессиям Claude Code в репо. Проектные MCP из `.mcp.json` требуют разрешения (`enabledMcpjsonServers`) — проверить на смоуке. Нет идентичности топика → топик только аргументом (его задаёт агент). Подменить тему в рамках «владелец-доверенный» допустимо; для V7-границы нет. |
| (а2) «подмена» `ff-brain` через `GATEWAY_BRAIN_MCP=1` + `GATEWAY_BRAIN_MCP_CMD/ARGS` на скрипт читателя | нет | ДА (env читается при старте, `--env-file-if-exists=.env`) | средний | Бонус: готовая идентичность хода в env + авто-allow `find/read`. Минус: занимает слот мозга, затирает будущий настоящий `ff-brain`; правка `.env`. |
| (а3) новая запись в `buildMcpServers` (настоящий `gw-reader` с env топика + флаг) | ДА | ДА | средний (живой бот, 40-коммитный разрыв с dedup-веткой) | Правильная целевая форма, не «сейчас». |
| (б) команда `/open` | ДА (`command-handler.ts`) | ДА | средний | Читает владелец, а не агент: не решает задачу «агент читает». |
| (в) скрипт + промпт-слой | нет | нет | низкий | Агент вызывает Bash `sqlite3` → обход фильтра ДО модели (вывод видит модель). Годится только как скрипт, печатающий уже отфильтрованное; жёсткой границы нет. |

**Рекомендация «применить сейчас»: (а1)**, сначала проба на одном топике (отдельный cwd/рабочая папка топика с собственным `.mcp.json`, чтобы не затронуть остальные), затем решить про (а3). Рестарт шлюза не нужен. Целевая форма: (а3) после влития/разбора dedup-ветки.

## 4. pm2 и подхват конфига
- Процесс `agent` (id 2, online, uptime 2D, 5 рестартов). Старт: `bash -c "corepack pnpm start"`, cwd `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager`; `package.json` start = `node --env-file-if-exists=.env --import tsx src/main.ts`. Живёт из рабочего дерева, `watch` выключен; TS исполняется на лету, поэтому правка `src/` без рестарта не применяется (код уже загружен).
- Подхват на ход: env шлюза и код — только при рестарте. `.mcp.json`, `settings*.json`, `PROMPT.md`, `config.json` — каждый ход заново (CLI-процесс на `query()`; `PROMPT.md` — по CLAUDE.md проекта «применяется со следующего сообщения»). Рестарт и смена pm2 cwd — действие владельца.
- `agent-shadow` (песочница) описан в `ecosystem.shadow.config.cjs`, сейчас не запущен: естественное место для проверки (а3).

## 5. Схема `messages` (`data/gateway-ff-personal.db`, 13 957 строк)
Колонки: `id, sessionKey, botId, direction, userId, username, text, ts(мс), refs, costUsd, channelMessageId, kind`.
- НЕТ колонок `chat_id/thread_id/message_id/forward_*`. chat+thread внутри `sessionKey` = `telegram:<chatId>:<threadId>:<agentId>` (топик 56 = 2 881 строк).
- `direction`: `in` 2 621 (из них `channelMessageId` есть у 2 346), `out` 11 340 (`channelMessageId` пуст у ВСЕХ; `kind='intermediate'` 8 715). Адрес `gw:topic<thread>/m<message_id>` реален только для `in`; для `out` стабильного message_id нет (нужен суррогат, например `ts`/`id`).
- Пересланное: отдельного поля нет. Единственный признак — текстовый префикс `[Пересланное сообщение от <кто>]` (`normalize-inbound.util.ts:43-46,124`). Фильтр V7: исключать `in` с `text LIKE '[Пересланное сообщение%'` (ловить префикс в начале, на нормализованной первой строке). Ограничение: ответ владельца с цитатой чужого текста префикса не несёт; `replyToText` в БД не сохраняется.
- `userId` у `in` — автор (в одиночном топике владелец); у `out` — пусто/имя бота. `refs` пуст везде. Фильтр секретов (пароли, `amqp://`, токены) в БД не применён: весь текст хранится как есть, фильтровать должен читатель до выдачи.

## 6. Postgres и мозг
- pm2-процесс `pg` (id 0, stopped, 278 рестартов) = `/Users/mac16/Documents/IT/Apps/PROJETS/YashaBot/database.sh`, docker-контейнер `pg` проекта YashaBot; логи с декабря 2024. К шлюзу и мозгу отношения НЕ имеет.
- Мозг FF: хранилище — файловый `journal.jsonl` (+ lock, backups) за сервисом с unix-сокетом (`packages/brain/src/service/journal.ts`), `@ff/brain-mcp` ходит по сокету. Ни PG, ни SQLite не используются. Сервис мозга не запущен (по памяти — ждёт pm2). `dist` у brain-mcp собран.

## Риски
- Читатель читает «живую» SQLite шлюза: открывать строго `mode=ro` (WAL-совместимо), не в `data/` на запись; проверить `journal_mode`.
- (а1): одна общая точка входа для всех топиков cwd FF → утечка между топиками, если читатель не ограничивает область. Нужен allowlist топиков в самом читателе.
- Фильтр секретов обязан стоять внутри читателя; Bash-путь (в) его обходит.
- Неотслеженные доки владельца в дереве шлюза: любая правка в `TOOLS/agents-manager` — только через отдельный worktree.

Итог: решение — (а1) на пробе одного топика без рестарта; (а3) как целевая форма после разбора dedup-ветки.
