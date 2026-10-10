# SPEC — R1: промпт-слои в памяти (первая ступень лестницы «кухня шлюза»)

- **Status:** review (пропатчен по критику 2026-10-09) · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-09
- **Related:** ADR-0017 (D1 имена/принципал, F6 = лестница R1–R6) · ADR-0016 (D1 сокет, D7 файл=истина, D10 idem) · `docs/spec/SPEC-brain-data-doors.md` (**зависимость: двери 1, 2, 5; дверь 3 — для R1.1**) · ревью `docs/spec/reviews/critic-SPEC-brain-r1-prompt-layers.md` · свод `docs/02-project/core/01-brain/02-infrastructure/04-modules/M-G3-type-registry-policy/analyses/2026-10-09-plugins-and-system-types/f6/SYNTHESIS-f6.md` · компас `docs/02-project/core/01-brain/01-overview/05-brain-direction/OVERVIEW.md`
- **Потребитель:** builder · **Поглощает:** —

## 1. Проблема
Промпт диалога = склейка файлов `chat/PROMPT.md` + `chat/thread/PROMPT.md` (`agents-manager/src/server/orchestration/conversation-config.ts:103-153`, склейка `:116-118,:138`). Новый вид слоя (проект/агент/пользователь) = правка кода шлюза; провенанса склейки нет; правда живёт вне памяти — паттерн «файлы рядом с проектом», отвергнутый 2026-10-08.

## 2. Цели / Не-цели
**Цели R1 (минимальный срез):** (1) слои промпта — единицы памяти с тождеством и ревизиями; (2) сборка — линза-данные с манифестом и хэшем; (3) шов `IPromptSource` во флаге `local|shadow`; shadow доказывает точность импорта на живых ходах (гейт «7 дней 0 diff»); (4) новые виды целей добавляются данными, без кода мозга.
**Решение лида-архитектора: режим `brain` → R1.1.** Корректный `brain` требует пути записи владельца (иначе `/prompt` пишет только файл и мозг отстаёт) и правила LKG — это не «мало». В R1 значение `brain` распознаётся, пишет warning и ведёт себя как `local`.
**R1.1:** режим `brain` + LKG (используется, только если его хэш равен последнему увиденному хэшу файлов, иначе побеждают файлы) + `/prompt` в мозг (бывш. R-11) + путь «агент предлагает / владелец одобряет» (бывш. R-12) + пер-юзер слои (бывш. R-13) + `/prompt --for project|agent|user`. **Позже (R1.x):** запись предложений через brain-mcp · `merge: section(<имя>)` · `body_ref` для тел >32 КБ · cwd/model/respondType (= R2) · слой «бот» вместо `Agent.systemPrompt` · линза в `@ff/engine` `view-compiler.ts:196-229` · enforcement V7.

## 3. Модель
- **Типы `sys:`** (плоские имена; сеет сервис принципалом `sys:brain`; новый `packages/brain/src/domain/sys-types.ts`):
  - `sys:prompt-layer@1`: `body` (text, `max_bytes: 32768`, `verbatim: true`), `priority` (number, 0), `merge` (enum `append|prepend|replace`, `append`), `slot` (enum `primary|extra`, `extra`). **Жизненный цикл = статус записи** (`proposed|active|retracted|superseded`, `contract.ts:202`); «retired» ≡ `retracted`. Второго поля статуса нет (V2).
  - `sys:target@1`: `kind` (text, открытый словарь `bot|project|agent|chat|topic|user|…`), `key` (text, `opaque: true` + `pattern: ^[A-Za-z0-9_:.-]{1,64}$`). Ключи: `chat` = `<chatId>`, **`topic` = `<chatId>:<threadId>`** (тема уникальна только внутри чата), `bot` = botId.
  - `sys:lens@1`: `lens_id` (НЕ `name` — `validate-act.ts:349` режет `name` как PII), `version`, `shape` (enum `compose`), `spec` (text-JSON).
  - Предикат `sys:applies-to` (many, `sys:prompt-layer → sys:target`). Область `sys-gateway`.
- **Линза `lens:prompt-compose@1`** (сеется): `spec = {from:"sys:prompt-layer", via:"sys:applies-to", order:["bot","project","agent","chat","topic","user"], filter:{status:"active"}, separator:"\n\n"}`.
  - Применимость: **ВСЕ** цели слоя совпали с контекстом (AND). Слой `{bot,chat,topic}` никогда не входит в контекст без темы; слой бота A не течёт к боту B того же чата (реально: чат `-1004351636302` у двух ботов).
  - **Порядок:** ранг = **MAX индекс в `order`** среди видов целей слоя; ничьи — `priority` по возрастанию, затем `created_at` (recordedAt первого акта), затем id. Импортёр: чат-слой `priority 0`, тема-слой `priority 1`.
  - Пустые тела (`trim()===''`) пропускаются (как `:116`). `replace` отбрасывает собранное ниже. Вид вне `order` → слой пропущен + warning. Новый вид = новый узел + ревизия линзы.
  - Чтение тел и `rev` — из одного снимка индекса за один синхронный вызов (манифест атомарен с текстом).
  - Футер (`buildFooter`, `conversation-config.ts:245-291`), `Agent.systemPrompt`, строка темы и директива режима остаются в шлюзе, вне линзы.
- **Эндпоинт** `POST /v1/lens` `{lens:"prompt-compose@1", context:{bot, chat, topic?, user?, project?, agent?}}` → `{ok, text, manifest:[{id, rev, kinds, source_hash?}], lens:{id, rev}, hash: sha256(text), warnings}`. Только чтение, мимо очереди записи.
- **Мандат шлюза:** токен `~/.ff-brain/gateway.token` (0600, `ensureToken` `service/auth.ts:12`) → читатель `{kind:"service", principal:"sys:gateway", scopes:["sys-gateway"], write:true}`. Принципал — **из мандата, не из заголовков**. `/v1/lens` — только `sys:gateway` в R1.

## 4. Требования (с компаунд-проверкой)
| # | Требование | Что станет дешевле |
|---|---|---|
| R-01 | `FieldSpec` (`genesis.ts:14-21`, аддитивно): `max_bytes` (поле вне бюджета 8 КБ, `validate-act.ts:197,256`) + **агрегатный потолок 64 КБ на акт** для всех полей; `verbatim` (поле не проходит `normalizeDateTimes`, `validate-act.ts:261`; PII-скан остаётся); `pattern` (+`opaque` → значение по шаблону считается непрозрачным id, правка `engine/src/core/admission.ts:70-89`: сейчас `OPAQUE_VALUE_RE` требует букву — Telegram-id `-1004351636302` НЕ проходит). Флаги ставит **только автор схемы** (type-def от genesis/`sys:`/`pack:`), не `record` | большие/дословные/id-поля любого будущего типа — данные, не константы |
| R-02 | Сид `SYS_TYPES/SYS_PREDICATES/линза/область` принципалом `sys:brain`, идемпотентно (как genesis `to-act.ts:274`, `registry.ts:95-102`); после двери 1 | первый `sys:`-набор — образец для `pack:` (F5) |
| R-03 | Мандат `gateway.token` → `sys:gateway` (`http.ts:157` + `read/access.ts:52`) | R2–R6 используют тот же мандат |
| R-04 | **Для `sys:*` типов статус выводится из мандата (дверь 5: полномочие из учётных данных).** `active` и перевод `proposed→active` — только `sys:gateway` или `sys:brain`. Основной/чат-читатель + `sys:prompt-layer` → `proposed` (`approval: owner` в типе); клиентский `initiative:"owner"` без полномочия → `WRITE_DENIED`; попытка повысить → `WRITE_DENIED`. Политика записи — данными в типе (`write: owner`). `sys:target`/`sys:lens` пишут только `sys:gateway`/`sys:brain`. Общий фикс «initiative из мандата» для всех типов — **дверь 5** `SPEC-brain-data-doors.md`; R1 зависит от неё | одно правило анти-самоэскалации для всех конфиг-типов |
| R-05 | Интерпретатор `shape: compose` (`packages/brain/src/read/lens.ts`) + маршрут `/v1/lens` (`http.ts:131-142`, `runtime.ts` через `readPath` `:348`) | второй вид линзы = новый `shape`, маршрут тот же |
| R-06 | Шлюз: порт `IPromptSource.compose(ctx) → {text?, source:"local"|"brain", manifest?, hash}`; реализации local (обёртка `convConfig.resolve().prompt`) и shadow; фабрика по `GATEWAY_PROMPT_SOURCE=local|shadow` (дефолт `local`; `brain`/неизвестное → `local` + warning), образец `pult-source.factory.ts:14-23` | паттерн флага копируется на R2–R6 |
| R-07 | Клиент мозга шлюза: unix-сокет, мандат шлюза, таймаут `GATEWAY_PROMPT_BRAIN_TIMEOUT_MS` (150). Ожидаемы промахи первого вызова после рестарта мозга (холодный сокет) | общий клиент мозга для R1.1–R6 |
| R-08 | shadow: возвращает local; brain-вызов с контекстом только `{bot, chat, topic}`; лог `prompt-shadow {conv, equal, localHash, brainHash, firstDiffOffset, manifest}`; **таймауты/отказы логируются отдельно** (`prompt-shadow-miss`), не как diff; `source_hash` слоя ≠ хэшу файла → ресинк файла импортёром, лог `resync` | гейт «7 дней 0 diff» измерим и честен |
| R-09 | Лог хода `prompt-turn {jobId, conv, source, hash, manifest:[id@rev]}` (после `turn-executor.ts:335`), **без тела** | V3-провенанс; база R3 |
| R-10 | Импортёр (`src/server/orchestration/prompt-layer-importer.ts` + `scripts/import-prompt-layers.ts`, `pnpm prompt:import [--dry-run]`): реестр ботов → `projectCwd` → файлы; цели `{bot, chat}` / `{bot, chat, topic}` (ключ темы `<chatId>:<threadId>`); `slot: primary`; приоритеты 0/1; тело дословно; `source {kind:"file", ref:"gw-prompt", hash}` (в `ref` Telegram-id запрещены, `pii-scope.ts:42`). **Round-trip:** после записи читает слой и сверяет хэш тела; не совпало или PII-отказ → слой не активируется, файл остаётся файловым, отчёт. Идемпотентно; уважает RATE_LIMITED (60/мин) | тот же код = ресинк shadow и ингест правок агента в R1.1 |

## 5. Критерии приёмки
- **AC-R01** Сид даёт ровно 3 `sys:`-типа, предикат, линзу, область; повторный старт — 0 новых актов.
- **AC-R02** Тело 12 КБ (реальный максимум: `FF-Personal-Managment/.gateway/conversations/-1004351636302/56/PROMPT.md`) принимается; 33 КБ → PAYLOAD_TOO_LARGE; акт с полями >64 КБ суммарно → PAYLOAD_TOO_LARGE; `max_bytes`/`verbatim`/`pattern` в `record` → отказ.
- **AC-R03** *(выровнено с дверью 5 решением лида 2026-10-09)* Основной токен (агент/чат/CLI) пишет `sys:prompt-layer` **без** `initiative` → хранится `proposed` (тип несёт `approval: owner`); с клиентским `initiative:"owner"` → `WRITE_DENIED` (поведение двери 5 R-5.2 побеждает); повышение `proposed→active` основным токеном → `WRITE_DENIED`. `active` и одобрение — только мандат шлюза (`sys:gateway`, R-03) или сид `sys:brain`.
- **AC-R04** `/v1/lens` с основным токеном → FORBIDDEN; с `gateway.token` → 200.
- **AC-R05** Импорт → `text` побайтно равен `conv.prompt` на копии всех реальных файлов **плюс фикстура** с ISO-датами/временем (`2026-10-09 14:30`) и 13-значным id; тело не нормализовано.
- **AC-R06** AND: слой `{botA, chat}` не входит в `{botB, chat}`; слой темы не входит в контекст без темы; слой темы `A:56` не входит в контекст чата B с темой 56.
- **AC-R07** Чат-слой + тема-слой → текст == `[chat, topic].join('\n\n')` (как `conversation-config.ts:116-118,:138`). Ничьи: `priority` → `created_at` → id; `replace` работает; вид вне `order` → warning.
- **AC-R08** `manifest` = `id@rev` вошедших слоёв; `hash = sha256(text)`; ревизия меняет `rev` и `hash`, id прежний.
- **AC-R09** `sys:target.key` = `-1004351636302` и `-1004351636302:56` проходит запись (opaque+pattern); тот же ключ в `note.text` по-прежнему отклоняется.
- **AC-R10** `GATEWAY_PROMPT_SOURCE` не задан или `brain` → поведение `local`, `verify` шлюза зелёный.
- **AC-R11** shadow: идентичные данные → `equal:true`; агент правит файл → `resync`, следующий ход `equal:true`; мозг недоступен → `prompt-shadow-miss`, ход на local, diff не засчитан.
- **AC-R12** Импортёр повторно → 0 записей; `--dry-run` → 0; файл с не-round-trip телом → в отчёте, слой не `active`.
- **AC-R13** Каждый ход — одна строка `prompt-turn`, тела в ней нет.

## 6. Затрагиваемые файлы
**Мозг/движок (`packages/`):** `brain/src/contract.ts:116-140` (лимиты +64 КБ), `:176-184` (+`lens`), `:189-199` (+`gatewayToken`), `LensRequest/LensResponse`; байт-копия `brain-mcp/src/contract.ts` (`contract-sync.test.ts`) · `brain/src/domain/genesis.ts:14-21` · новый `domain/sys-types.ts` · `domain/to-act.ts:270-280` · `domain/registry.ts:81,95-102` · `domain/validate-act.ts:197,256,261,437-441` · `engine/src/core/admission.ts:70-89` · `read/access.ts:52-90` · новый `read/lens.ts` · `service/http.ts:46-63,131-142,157` · `service/runtime.ts:233-240,348`.
**Шлюз (`agents-manager`, только worktree):** новый `src/core/ports/prompt-source.interface.ts` · новые `src/server/orchestration/prompt-source/{local,shadow,factory}.ts`, `brain-client.ts`, `prompt-layer-importer.ts` · `turn-executor.ts:134,322-335` · `src/app/build-app.ts:387` · `scripts/import-prompt-layers.ts`, `package.json`.

## 7. Последовательность
1. Двери 1, 2, 5 (`SPEC-brain-data-doors.md`).
2. Мозг: R-01 → R-02 → R-03/R-04 → R-05. Ревью + критик.
3. Шлюз (worktree): R-06/R-07/R-09 под `local` (ноль изменений) → R-10 → R-08.
4. Владелец: импорт → `shadow` 7 дней → гейт «0 diff» → R1.1.

## 8. План верификации
- **Мозг:** `packages/brain/test/domain/sys-types.test.ts` (AC-R01–R03, R09), `test/read/lens-compose.test.ts` (R05–R08; фикстуры дат и id), `test/service/gateway-credential.test.ts` (R04); `packages/engine` тест opaque+pattern. `npm run typecheck && npm test` (корень FF). Бенч: p95 `/v1/lens` <20 мс на 100 слоях (`test/bench.test.ts`).
- **Шлюз:** `git -C /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager worktree add ../am-r1-prompt -b feat/r1-prompt-layers`; там `corepack pnpm install && corepack pnpm verify`. Спеки: `prompt-source.spec.ts` (R10–R11, фейковый сервер на сокете), `prompt-layer-importer.spec.ts` (R12), `turn-executor` (R13).
- **Смоук:** мозг на временном `FF_BRAIN_HOME`, импорт копии `.gateway`, `shadow`, 3 сообщения → `equal:true`; убить мозг → `prompt-shadow-miss`, ответы идут.

## 9. Риски
- Двери 1/2/5 запаздывают → мозговая часть стоит (шлюзовые R-06/R-07/R-09 под `local` идут параллельно).
- `gateway.token` защищён стоп-листом `~/.ff-brain` (G1), не ОС (тот же uid) — принятый риск ISO-2 (ADR-0011).
- `opaque+pattern` ослабляет PII-скан ключа → смягчено: ключ пишут только `sys:gateway`/`sys:brain` (R-04), шаблон узкий.
- Холодный сокет → промахи shadow после рестарта; считаются отдельно.

## 10. Откат
`GATEWAY_PROMPT_SOURCE=local` (или снять) — в R1 файлы остаются истиной, терять нечего. Мозг: типы `sys:` → `cold`, журнал не правится; флаги `FieldSpec` аддитивны.

## 11. Ценности
V1 🟢 манифест · V2 🟢 id слоя стабилен, ревизии · V3 🟢 провенанс, анти-самоэскалация · V4 🟢 `retracted`, не удаление · V5 🟢 линза/слой — переносимые данные · V6 🟢 `applies-to` — ребро к узлу · V7 🟡 пер-юзер слои — R1.1, только форма.

Итог: решение (review, пропатчено по критику) — R1 = 3 `sys:`-типа + сид + `/v1/lens` под мандатом `sys:gateway` + `IPromptSource` (`local|shadow`) + импортёр с round-trip; режим `brain`, LKG и запись `/prompt` в мозг — R1.1 после 7 дней shadow без diff; зависит от дверей 1, 2, 5.
<!-- patched-after-critic 2026-10-09 · AC-R03/R-04 aligned with door 5 (lead decision) 2026-10-09 -->
