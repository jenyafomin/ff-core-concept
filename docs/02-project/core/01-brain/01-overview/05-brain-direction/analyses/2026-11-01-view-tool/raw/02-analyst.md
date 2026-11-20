---
title: Analyst — что уже показывает память/данные и где шов вид-инструмента
status: draft
owner: jenya.stasik@gmail.com
date: 2026-11-01
related: ../QUESTIONS.md · ../../2026-10-26-flexible-growth/SYNTHESIS.md · ../../2026-10-31-tool-on-memory/SYNTHESIS.md
---
Потребитель: свод волны 11-01 (читает один свод, это приложение). Поглощает: ничего.

Пути: FF = `/Users/mac16/Documents/IT/Apps/FF-Personal-Managment`, GW = `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager`.

## 1. Инвентарь «показывалок»
| Что | Где | Потребитель | Данные/код |
|---|---|---|---|
| `find` (фильтры text/type/status/scope/due_before/edge, cursor) | FF `packages/brain/src/read/find.ts:104` (`FIND_KEYS` :23, лимит 20/50 `contract.ts:131`) | агент (MCP), шлюз | код; ответ без тел (`toFindItem` :38) |
| 5 пресетов morning/evening/open/scope/overview | `read/presets.ts:130` `runPreset`, закрытый union `FIND_PRESETS` (`contract.ts:224`) + switch | агент | код; потолок 12 строк/4000 зн (`contract.ts:137`), overview 1500 |
| `read` одной записи (с телом) | `read/read.ts` | агент, /state | код |
| lens `compose` (слои промптов по контексту) | `read/lens.ts`; запись `sys:lens` | шлюз (сборка промпта) | ЕДИНСТВЕННЫЙ вид-данными; одна форма `compose`, не для показа людям |
| MCP-инструменты | `brain-mcp/src/server.ts:98-128`: record · find · read · link | агент | тонкий клиент; `lens` в MCP НЕТ |
| Устав как `instructions` | `brain-mcp/src/charter.ts` (≤1500 зн) | агент | код-строка |
| `gw_recent/resolve/topics/label` | `gw-reader/src/server.ts` | агент (чтение переписки шлюза) | код + redact.ts; другая «память» (SQLite шлюза) |
| `/state` карта→область→запись | GW `server/orchestration/state-handler.ts`, `state-model.util.ts` (`renderMap/Scope/Record`, `CARD_MAX_CHARS=3500`, `RECENT_LIMIT=10`) | человек (Telegram) | код; состояние экрана — в тексте карточки (`serializeStateView`) |
| `/access` | GW `access-handler.ts`, `access-model.util.ts` | человек | код; правит readers.json |
| Визард/концепт `*.concept.json` | GW `channel-telegram/browser/wizard/` (`detectConcept` `concept-graph.util.ts:108`, `wizard.util.ts`, `wizard-handler.ts`) | человек | ДАННЫЕ→UI: схема файла рисует шаги кнопками; корень — cwd топика, состояние в первой строке 🧭 |
| `/files`, дерево, nav, live-card, concept-card | GW `file-browser`, `tree-handler`, `nav-handler`, `concept-card-emitter` | человек | код+файлы проекта; live-card — plain text (решение 2026-07-27) |

Итог: показ у человека живёт ТОЛЬКО в Telegram-карточках (≤3500 зн, кнопки). Показывалок на «группу/сортировку/поля» нет.

## 2. Источники данных и объём (что реально показать сегодня)
- **Память ff-brain**: `find preset:overview` (живой вызов): 3 записи — 2 decision (proposed) + 1 note (active); области personal 0 · ff 3 · agents-manager 3 (записи общие через рёбра/области; distinct = 3). Виду нечего показывать: одна группа «тип×статус» уже в overview.
- **Дерево docs FF**: 2155 `.md`, 665 с `status:` в frontmatter, 45 `*.concept.json`, 89 `INDEX.md`, 12 `OVERVIEW.md`, реестр типов `docs/.doc-types.json`, `THESES.md` — 1 штука (`2026-10-14-settings-and-storage/`), `docs/_log/creative-ledger.jsonl` — 45 строк JSON. Это единственный реальный объём (десятки–сотни единиц со статусом/датой/типом), но он НЕ в памяти, а в файлах — вид над ним = другой источник, не find.
- **rentacar** (структура, без ПДн): `PROJETS/RENTACAR_EXCEL_ANALYTICS/docs` (795 md; BP-* 6 файлов, ADR-* 4, BR/GAP по имени файла 0 — слой знаний лежит иначе/в `ba/`, `spec/`, `qa/`), `PROJETS/Rent_Next/rentacar/docs/plan`. Данные клиентов в `data/`, `service-account.json` — НЕ трогал. В память не заведено ничего (0).
- **Граф шлюза**: SQLite шлюза (gw-reader, owner-фильтр) — сообщения/топики; другая природа, потенциал вида «топики/открытые».

Вывод для Q5: витрина над памятью сегодня = над пустым складом; реальные объёмы — docs-дерево и rentacar-docs. Память можно наполнить из frontmatter (адрес-не-копия), но это шаг наполнения, не вида.

## 3. Шов
Минимальный шов — ВНУТРИ `find` (точка: `read/presets.ts` `runPreset` + `find.ts:104`), как в SYNTHESIS 10-26 (+ правки critic):
1. Исполнитель вида = расширение `find`: `group_by` (scope/type/status/поле), `fields`, `sort`, плоские фильтры по `rec.fields` (сейчас фильтрация только `status`/`due`; `textMatches` ходит по полям, но фильтра по полю нет). Все нужные примитивы уже лежат: `VisibleRecord` (gate уже применён — `access.ts`), `countBy` (`presets.ts:~170`), `toFindItem`, `byCarrier/byUpdatedDesc`. Новый код — порядка одной функции `runView(params, pool)`; пресеты переписываются как параметры позже (golden-снимки).
2. Категории статусов: сегодня `OPEN_STATUS_VALUES=['open','doing','blocked']`, `DONE='done'` (`presets.ts:17-19`) — пресет не видит тип с другими статусами (скрытая связка; `proposed` у decision тоже мимо `isOpen`).
3. Адаптеры: данных-структура → (a) MCP: добавить поля в схему `find` (`server.ts:109`) + `client.ts`; (b) Telegram: `/state` уже форматирует `ITopicFindResult` (`renderScope`), надо лишь передавать параметры вида; (c) визард: `*.concept.json` — готовый рендерер «данные→кнопки» для человека БЕЗ нового кода (можно вид выгружать как concept.json).
4. **HTTP-адаптера для людей/программ нет.** Есть только `createBrainHttpServer` по Unix-сокету (`brain/src/service/http.ts`; маршруты `record/find/read/link/health/stats/export/lens` :131-141, Bearer + заголовки личности). TCP/веб-сервера в шлюзе нет (grep `listen/createServer` в `GW/src` пусто). Веб-вид = новый слой (порт, аутентификация), в дереве «Не делаем сейчас: фронтенд».
5. Расхождение клиента: шлюзовый `ITopicFindRequest.preset?: 'overview'|'open'` (`topic-brain-reader.ts:59`) — локальная копия контракта (coupling 0); новые параметры вида надо дублировать вручную → риск дрейфа (в brain-mcp есть тест-на-совпадение копии `contract.ts`, у шлюза — нет).

## 4. Скрытые связки и риски
- Видимость: `find` фильтрует per-record гейтом (`read/access.ts`: PEP + scope). `/state` идёт с личностью `chat:thread` + sender=owner (`topic-brain-reader.ts` шапка) → человек видит ровно то же, что агент топика (Q6 уже да). `group_by`/`fields` обязаны брать пул ПОСЛЕ гейта, иначе счётчики групп утекут (overview — карта с счётчиками, это уже сознательно).
- Скрытые счётчики: `total` и `next_cursor` раскрывают размер пула; `overview` игнорирует фильтры (`find.ts` `isMap`) — вид с `group_by` не должен делать так же молча.
- Стоп-лист: под шлюзом доступ к каталогу данных памяти (сокет/токен/журнал) заблокирован хуком — подтверждено в этой сессии: любой вид читает ТОЛЬКО через MCP/HTTP-клиент, не файлы. Вид над docs-деревом — другой путь (чтение файлов проекта, без гейта памяти) → отдельная политика видимости, иначе «вид шире читателя» (V7).
- ПДн rentacar: вид над rentacar-docs безопасен только по структуре; V7 enforcement в движке не подключён → знания без ПДн, данные клиентов нет.
- Лимиты: 12 строк/4000 зн и 3500 зн карточки — вид «таблица/граф» в Telegram не влезет; нужен внешний показ (файл/страница) → снова HTTP или `send_file`.
- Подпись выхода: нужен `view_v` (V5) и автор вида (V3) — сейчас в ответах `find` версии нет.

## Ответ по Q2/Q7 (данные)
Структура одна (параметры → сгруппированный список), адаптеров три; «вид из вопроса» технически = параметры вида, собранные агентом по вопросу — вне кода ничего лишнего.

Вопрос-цель: ответил (инвентарь, объём, шов `find`+параметры; HTTP для людей отсутствует), не ответил на Q1 (реальный вопрос владельца — нужен от него).
