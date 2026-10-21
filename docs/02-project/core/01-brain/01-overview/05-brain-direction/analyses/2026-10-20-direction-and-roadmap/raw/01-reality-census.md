# 01 — Перепись реальности: что построено, что мешает, насколько готово под «единую документацию»

- **Status:** draft · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-20
- **Потребитель:** лид + агенты волн 2–3 разбора `2026-10-20-direction-and-roadmap` · **Поглощает:** ничего
- **Линза:** analyst (вглубь). Код не менялся. Тесты запущены (по пакетам, `npx vitest run`).
- **Ограничения среды:** хуки блокируют чтение `~/.ff-brain`, `agents-manager/.env`, любые команды со строкой FF_BRAIN_*/запуск brain-mcp. Поэтому: живое состояние шлюза/папки памяти НЕ проверено (помечено «не проверено»).

## 1. Что построено (факты)

### 1.1 Размеры и тесты (запущено 2026-10-20)
| Пакет | src LOC (ts) | Тесты |
|---|---|---|
| `@ff/core` | ~370 | 4 файла, 14 passed |
| `@ff/engine` | 4238 | 37 файлов, 240 passed + 7 todo |
| `@ff/brain` | ~4400 | 24 файла, 214 passed, 1 skipped |
| `@ff/brain-mcp` | ~1300 | 5 файлов, 25 passed |
| `@ff/gw-reader` | ~920 | 3 файла, 125 passed |
Всё зелёное. НО это юнит/интеграция в процессе; живого прогона 0 (pm2 list: процесса `ff-brain` нет; в списке только `agent` online 5D, `pg` stopped с 278 рестартами).

### 1.2 Хранилище: один файл-журнал JSONL
- Истина = append-only `journal.jsonl` актов (`packages/engine/src/adapters/store-durable-fs.ts:1-40`): fsync на каждую запись (C1), реконструкция проекции из журнала на старте (C2), PID-lock одного писателя (C5). Проекция (граф узлов) — в памяти процесса.
- Мозг: `packages/brain/src/service/runtime.ts` — одна очередь записи (`WriteQueue`), ok:true только после fsync; починка рваного хвоста (`service/journal.ts:repairTornTail`), бэкап каждые 50 актов/15 мин + ночной + зеркало (`service/backup.ts`, `LIMITS.backupEveryActs` в `contract.ts`), idem-индекс из журнала (`service/idem.ts`).
- Транспорт: HTTP по unix-сокету (`service/http.ts`, 248 строк), токены в папке памяти (`service/auth.ts`), читатели/привязки топиков в `readers.json` (`service/readers.ts`).
- Домен: реестр типов/предикатов читается только из журнала (`domain/registry.ts`), валидатор актов (`domain/validate-act.ts`, 745 строк — самый большой файл), genesis-типы `task decision note person day friction raw` + `sys:`-словарь (`prompt-layer`, `target`, `lens`, `applies-to`) (`domain/sys-types.ts`).

### 1.3 MCP-инструменты (4 глагола)
`record · find · read · link` (`packages/brain-mcp/src/server.ts`, схемы `recordInput/findInput/readInput/linkInput`). Идентичность (conversationId, sender) в тело НЕ входит — только env→заголовки (`server.ts:1-6`, `client.ts`). Есть outbox для «мозг лёг» (`outbox.ts`), ординал для idem (`ordinal.ts`). Служебные verbs сервиса (не в MCP): `lens`, `export`, `stats`, `health` (runtime.ts, `bin/ff-brain.ts` CLI).
`find` пресеты: morning/evening/open/scope (`contract.ts` FIND_PRESETS). `read` глубина ≤2, ≤50 узлов (`LIMITS`).

### 1.4 gw-reader (не мозг, отдельный read-only MCP над SQLite шлюза)
5 тулов `gw_recent/gw_resolve/gw_topics/gw_label/gw_labels`, свои метки в `~/.ff-gw-reader/labels.jsonl`, редактор секретов 265 строк (`src/redact.ts`). НЕ пишет в мозг (прямо сказано `workspaces/memory-reader/README.md:12`). Это ОТДЕЛЬНЫЙ стек: свой журнал меток, не мозг.

### 1.5 Что работает end-to-end (в тестах)
launch-тест «todo protocol on per-topic binding» (brain/test/service, виден в выводе): task с `fields.kind` принимается, owner-only в scope `personal`, находится `find`. То есть цикл record→find→read→link→export по сокету проходит ТОЛЬКО в тестах. Вне тестов — 0 запусков.

## 2. Блокеры запуска СЕГОДНЯ (RUNBOOK `launch-kit/RUNBOOK.md`)

Узел: все шаги — РУКАМИ владельца (агентам запрещены `~/.ff-brain`, `.env`, запуск MCP). Агент-запуск невозможен по конструкции хуков.

| # | Блокер | Где | Статус |
|---|---|---|---|
| B1 | Процесс не запущен: `ff-brain` отсутствует в `pm2 list` | pm2 | факт |
| B2 | pm2-демон 5.4.2 в памяти vs локальный 7.0.3 («In-memory PM2 is out-of-date») — `pm2 update` рестартует ВСЕ процессы, включая живой `agent`; RUNBOOK говорит «pm2 update/kill не делаем» (`launch-brain.sh:13`, шапка) | pm2 | факт; риск: если ecosystem-старт требует свежего демона — конфликт |
| B3 | Захардкожен путь node: `ecosystem.brain.config.cjs:11` `/Users/mac16/.nvm/versions/node/v22.23.2/bin/node`, `launch-brain.sh:31` тот же. Сейчас `node -v` = v22.23.2 → совпадает, ок. Сломается при обновлении nvm-версии | config | хрупкость, не блок |
| B4 | Шаг 0: коммит шлюза должен быть `f24d0f4 2026-10-09`, чистое дерево | RUNBOOK:37-45 | НЕ проверено (хук блокирует) |
| B5 | Шаг 4: флаги `GATEWAY_PROMPT_SOURCE=shadow`, `GATEWAY_BRAIN_MCP=1` в `agents-manager/.env` руками + `pm2 restart agent` (обрывает идущие ходы) | RUNBOOK:~96-110 | не сделано (по RUNBOOK) |
| B6 | Фикс дубля голосового `c60dad5` НЕ влит (40 коммитов позади, 3 конфликта) → у голосового нет `message_id` → idem не защищает → дубль задач (RUNBOOK:34-36, смоук 6.6). Основной ввод владельца — голос | worktree `agents-manager-p2-dedup` | принятый риск (G-20), но это самый вероятный первый сбой |
| B7 | Стоп-лист: инструменты `mcp__ff-brain__*` требуют кнопки одобрения; после «Всегда» правило в `FF/.claude/settings.local.json` — действует только в папке FF (RUNBOOK:~Шаг 6.2). Топик 56 → cwd FF? Привязка проверяется только смоуком | RUNBOOK | не проверено |
| B8 | Единственная область `personal` (owner-only, `pii-scope.ts:114-115`). Для сценария «документация на несколько проектов» нужны области проектов (`ff`, `cardex`, …). RUNBOOK: родителя к существующей области позже НЕ добавить (`validate-act.ts:679-699`) — «верхнеуровневые» области решать ДО первой записи | RUNBOOK «Стартовый набор» | ДИЗАЙН-блок для сценария «доки» (см. §3) |
| B9 | `GATE-7days.md` ждёт утверждения владельцем; baseline (stats/export «до») — руками | launch-kit | процесс |
| B10 | Нет живых данных/мигратора: импорт промптов (`pnpm prompt:import` ~47 слоёв) живёт в agents-manager, не в этом репо | RUNBOOK шаг 3 | вне репо |

Вывод: технически запуск = 7 шагов руками (~30–60 мин), код-блокеров нет. Блокеры — процессные/решения (B6, B8) и непроверенные живые состояния (B4, B7).

## 3. Готовность под «единую документацию для нескольких проектов»

Есть:
- **Ссылка на файл/URL/акт:** `record.source = {kind: file|act|url, ref, hash?}` (`contract.ts:225-229`, `brain-mcp/src/server.ts` recordInput.source). `ref` ≤200 знаков, паттерн `[A-Za-z0-9._/:#-]+`, без цифровых серий ≥9 (`contract.ts` PATTERNS). Хранится в provenance акта, НЕ в payload (`to-act.ts:12`).
- **Одна запись в нескольких областях:** `scopes[] ≤10` (`LIMITS.recordScopesMax`); «записи между областями переносимы» (RUNBOOK:30). Т.е. один узел-«док» может принадлежать областям ff + cardex + agents-manager.
- **Рёбра M:N** (`link`, `edges ≤20`), поиск по ребру (`find.edge`).
- **Тело большого текста:** поле `text` ≤4KB по умолчанию; per-field `max_bytes` внутри акта ≤64KB (`LIMITS.actFieldsMaxBytes`); прецедент — `sys:prompt-layer.body` ≤32KB verbatim (`sys-types.ts:5,62`). То есть md-док до ~32–60KB влезает как поле, но НЕ тип `doc`: такого типа нет.
- **Прецедент синхронизации файл→мозг:** импортёр промптов (agents-manager `prompt:import`), с `source.hash` + `lens.ts:104-108` (`lastSource`, `sourceHash` в выдаче линзы): «unchanged 15» при повторе = идемпотентная синхронизация по хэшу. Паттерн существует, но заточен под `sys:prompt-layer`.

Нет (с доказательствами):
1. Нет типа `doc` / `sys:document` — `GENESIS_TYPES` = task/decision/note/person/day/friction/raw (`genesis.ts`, `sys-types.ts`). Типы создаются как `u:`-тропа (ADR-0016 D11), валидатор имён (ADR-0017 D1) обязателен до первого не-genesis определения — РЕАЛИЗОВАН? В `registry.ts` проверка есть по тестам domain, но реальный пакет `pack:` не заводился.
2. Нет чтения файла мозгом: `kind:'file'` — только метка. grep по `read/` и `service/` не находит ни одного места, где `source.ref` открывается/сверяется с диском/git; `hash` сравнивается ТОЛЬКО в линзе промптов (`lens.ts`). Значит «мозг видит, что файл изменился» = нет; кто сравнит — агент/скрипт снаружи.
3. Нет git-интеграции: ни `git`, ни `commit` sha как kind (`SOURCE_KINDS` = file|act|url). Можно положить `ref="repo@path#sha"`, но `@` запрещён паттерном (`PATTERNS.sourceRef`, to-act.ts:71 «без @»), `ref` ≤200. Коммит-sha — 40 hex, цифровые серии ≥9 отсекает `sourceRefDigitRun`: sha с 9+ подряд цифр (вероятность мала, но реальна ~ (10/16)^9×32 позиции ≈ 0.5 на sha) → ОТКАЗ валидации. Гипотеза-риск, проверить тестом.
4. Адресация «из разных проектов»: адрес = id единицы `u_<ts36><6rand>` (`ids.ts`) — читаем только через мозг. Нет человекочитаемого стабильного адреса (slug) вида `doc:ff/architecture`; `find.text` — поиск по label/тексту, не по пути. Гипотеза: нужна конвенция label или поле `path`.
5. Нет обратной записи мозг→файл (md остаётся источником; владелец: «мозг дополняет git»). Нет watcher/sync-агента. Нет экспорт-в-md (есть `export` в JSON, `ff-brain.ts`).
6. Нет схемы «производное из источника»: `derived_from` (`^[ua]_…@\d+$`) ссылается только на u/a-id, не на файл; `source` — отдельное поле. Модель «источник→производные» частично есть (source + derived_from), без правила устаревания при смене hash (V3).
7. Права: область `personal` owner-only; многопроектные области и «ff» — без родителя до запуска (B8). Для документов «разных проектов» нужна топология областей ДО записи (необратимо: `validate-act.ts:679-699`).

Итог §3: хранить можно (note/raw + source{file,ref,hash} + несколько scopes), адресовать — слабо, синхронизировать с файлом/git — нет (только паттерн промпт-импортёра).

## 4. Шов хранилища (ADR-0017) — цена Postgres

Что абстрагировано: `StorePort` — `load · readNode · writeAct · acts · rebuild` (`engine/src/ports/store-port.ts`), контракт «verbatim, порядок не меняется». Есть `replay.ts` (миграция журнал→другой адаптер ниже Engine, 86 строк), адаптеры memory/md/durable-fs (848 строк в adapters). Для PG — аддитивный адаптер по замыслу ADR-0008/0017.

Что зашито (доказательства):
1. **Порт СИНХРОННЫЙ** (`load(): EnvelopeNode[]`, `writeAct(): Act`). `pg` — асинхронный. Реальный PG-адаптер = write-through кэш в памяти + async-append с ожиданием (ломает «ok:true после fsync»: придётся `await` в `WriteQueue`/`Engine.write`) ИЛИ смена порта на async во всех вызовах. `store.acts()/load()/readNode()` вызывается ≥34 раз в `brain/src` (grep) и в `Engine`. Это главная цена.
2. **Тип привязан к `DurableFsStore`, не к порту**: `domain/schemas.ts:14,53,64` (`createBrainEngine(store: DurableFsStore…)`, `Pick<DurableFsStore,'readNode'>`), `bootBrain` делает `new DurableFsStore(storeDir…)` (`schemas.ts:5`). Совпадает с выводом 2026-10-14 (3 привязки).
3. **Прямой доступ к файлу журнала мимо порта**: `service/runtime.ts:13,153,170` (readFileSync journal для bad-lines), `service/journal.ts` (preflightLock, repairTornTail — fs/pid), `service/backup.ts` (копия файла + sha256), `service/stats.ts`, `read/access.ts`, `service/paths.ts`, `bin/ff-brain.ts`. Бэкап/lock/починка хвоста — файловые по природе; в PG это другие механизмы (pg_dump, advisory lock). Т.е. ≥8 файлов знают, что журнал = файл.
4. **Реестр читается из файла**: `domain/registry.ts` `scanJournalRegistry(journal.jsonl)` — проход 1 до открытия стора (`schemas.ts:4`).
5. Idem, lens, friction работают поверх `store.acts()` (полный скан журнала в памяти: `lens.ts:102-108`; `IdemIndex.fromJournal`). Масштаб: всё в RAM; 20k+ актов — пересчёт на каждый вызов lens.

Оценка (гипотеза, не замер): PG как носитель журнала с кэшем в памяти — 3–5 дней (async-граница + вынос lock/backup/repair за интерфейс + contract-тест порта); без кэша (настоящая проекция в SQL) — недели и пересмотр `find/read/lens`. Готовность шва ≈0.5–0.6 (совпадает с оценкой analyst 10-14). Шаги «сейчас» из свода 10-14 (снять 3 привязки, contract-тест порта) — не сделаны (грепом привязки на месте).

## 5. Кандидаты на рефакторинг / расхождения

1. **Дубль contract.ts**: `brain/src/contract.ts` == `brain-mcp/src/contract.ts` (625 строк, байт-в-байт; охраняется `brain-mcp/test/contract-sync.test.ts`). Осознанный дубль (brain-mcp без зависимости от brain), стоимость — ручная синхронизация; кандидат: генерация копии скриптом. Сейчас безопасно (тест).
2. **Гигант-файлы**: `validate-act.ts` 745, `contract.ts` 625, `runtime.ts` 488, `to-act.ts` 464, `registry.ts` 401 — SRP-запах, но тесты плотные (214). Не трогать до запуска.
3. **Привязка к файлу** (см. §4.2–4.4) — главный долг ДО PG.
4. **Хрупкость путей**: `ecosystem.brain.config.cjs:11` и `launch-brain.sh:31` — абсолютный путь nvm; `launch-brain.sh:9-10` ссылка на старый `docs/_log/.../RUNBOOK.md` (там теперь указатель — ок).
5. **Мёртвый/нетронутый код (гипотеза, проверить)**: `engine/src/adapters/store-md.ts` (241 строка) и `ports/viewer-resolver.ts`, `surface/*` (day-graph, process-view, agent-run) — используются скриптами `engine/scripts/*.mjs` (day-graph, agent-run), не брейном; `ingest-rentacar`, `rental-balance` — отдельная вертикаль (ga-rentacar). Для задачи «запуск мозга» это не нужное; для рефактора — карта «кто на кого ссылается» не проведена. TODO/FIXME в `brain/brain-mcp/gw-reader src`: 0 (grep).
6. **docs:code**: docs ≫ code. Только дерево `05-brain-direction/analyses` + ADR 0016-0018 + launch-kit; код brain ~4.4k LOC. Нет рассинхрона обнаруженного на выборке (RUNBOOK ссылки `validate-act.ts:679-699`, `pii-scope.ts:114-115`, `ordinal.ts:34-40` существуют; точные строки не сверял кроме существования файлов). Рассинхрон указателя: MEMORY говорит «gw-reader не включён, нужен /bind на workspaces/memory-reader» — workspaces/memory-reader существует, не закоммичен (git status: `?? workspaces/`, `?? packages/gw-reader/`, `?? ADR-0018`).
7. **Всё НЕ закоммичено**: `packages/gw-reader/`, `workspaces/`, ADR-0018, 3 analyses — untracked на ветке `refactor-tree`. Риск потери (git-safety); сам brain/brain-mcp закоммичены ранее.
8. **Рискованные места**: (а) одиночный писатель + PID-lock (`journal.ts:preflightLock`): переиспользованный pid после краша блокирует старт (сообщение подсказывает ручное удаление) — приемлемо; (б) журнал append-only без `hard_erase` (V7: «стирания пока нет», RUNBOOK:смоук) — всё записанное необратимо → для документов с чужими данными дверь открыта; (в) полный скан `acts()` в lens/idem на каждый вызов — масштаб; (г) `pg`-процесс в pm2 `stopped, 278 рестартов` — чужая история, но ясно, что БД в этой среде уже падала.

## 6. Что не знаем (как проверить)
- Живое состояние шлюза (коммит, флаги .env, привязка топика 56 → cwd): владелец руками, Шаг 0 RUNBOOK.
- Принимает ли валидатор `source.ref` с git-sha (риск `sourceRefDigitRun`): 1 юнит-тест на 20 случайных sha.
- Лимит реального md-дока: типичный размер доков проектов vs ≤32–60KB поле (замер `wc -c` по `docs/` проектов).
- Реальная скорость `find` на 10k актов: `brain/test/bench.test.ts` есть — прочитать пороги (не читал).

Ответил частично: код готов к запуску (все 5 пакетов зелёные, 7 ручных шагов, код-блокеров нет), но под сценарий «единая документация» не готов — нет типа doc, нет чтения/сверки файла/git, нет slug-адресации; шов PG ~0.5 (синхронный порт + 8 файлов с прямым доступом к файлу журнала). Не ответил: нужны ли владельцу PG/Nest (зависит от В1–В3).
