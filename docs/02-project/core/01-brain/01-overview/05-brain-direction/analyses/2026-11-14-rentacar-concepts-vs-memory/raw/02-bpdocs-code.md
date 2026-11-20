---
status: draft
date: 2026-11-14
owner: jenya.stasik@gmail.com
type: analysis-raw
scope: Project (FF-Personal-Management)
source: репозиторий rentacar-analytics, ветка feat/bp-docs-153, папка apps/bp-docs (чтение через gh api, без клонирования)
consumer: свод 2026-11-14-rentacar-concepts-vs-memory
---

# bp-docs: устройство в коде и в БД

Пути ниже — от `apps/bp-docs/`. Числа объёма взяты из `docs/06-data-model.md` (замер владельца ветки на копии базы 03.11.2026), не пересчитаны мной.

## 1. Архитектура в 10 строк
1. Один процесс Node 22 + Hono: `/api/*`, `/api/mcp`, статика SPA (React 19, TanStack Query, cytoscape). `docs/01-architecture.md`.
2. Источник правды текста — git-корпус md и YAML-реестры (`docs/spec/business-process/**`, `_meta/registries/*.yaml`). БД Postgres `bp_docs` — производная.
3. Ingest: poller / кнопка / `bp ingest` читает git → parse → реестры → resolve (корпус, ACL) → write (ревизии, связи, утверждения, решения, книга, потоки, issues) → materialize → events. Одна транзакция (`src/server/ingest/run.ts`).
4. После COMMIT отдельной короткой транзакцией считается ядро: `kernel/run.ts` → `compute.ts` → `kernel_runs/kernel_nodes`. Падение ядра ingest не откатывает.
5. Чтение: роль `bp_docs_query` (read-only, таймаут 5 с) только через виды `q_*` (security_barrier) под `bp.acc`. Без аккаунта вид падает (fail-closed).
6. Запись «живого слоя» (вопросы, ответы, комментарии, флажки, решения, план) идёт мимо git, прямо в БД: `src/server/live/write.ts`, роль `bp_docs_app`, идемпотентность по requestId.
7. Значит запись двойная: текст корпуса пишется только через git (правят люди и агенты коммитами), а надстройка поверх (issues, comments, signals, decisions, plan_items) пишется через UI/MCP в БД. Из БД обратно в git ничего не пишется (в `live/write.ts` git не используется).
8. Чтение виджетов — «числа считает сервер, клиент только рисует». Zod-договоры в `src/shared/api/*` проверяются на клиенте.
9. Идентификаторы вечны: удаления сущностей нет, только `presence` (present/tombstone/absent/renamed/stub).
10. Воркеры: poller, reaper сессий, dump (бэкап), session-scan (ветки `feat/bp-docs-*`, трейлеры коммитов `Bp-Session`/`Bp-Turn` → экран «Изменения»).

## 2. Модель данных
Миграции: `db/migrations/0001…0971` (около 35 файлов), откат только для 0970/0971 (`db/rollback/`).
- `entities` (`0020_entities.sql:2`): `id` (вечный, `ORD-CLS`, `ORD-CLS.S-pay`, `role:manager`), `type` → `info_types`, `origin` git|registry|db, `root_id`, `parent_id` (часть→целое), `sensitivity` normal|restricted|secret, `maturity` 0–4, `impl_status`, `phase`, `facets` jsonb, `presence`. Рядом `entity_aliases`, `entity_spaces`, `entity_roles`.
- Текст отдельно от сущности: `entity_revisions → revision_blocks → block_contents(hash, md, html, plain)` (`0040_git_revisions.sql:31-46`). Есть `commits`, `ingest_runs`, `snapshot_ranges`, `lint_findings`.
- `links` (`0050_links.sql`, + `meta` в `0970_links_meta.sql:10`): `id = gl_ + sha1(src|dst|kind|found_in)[:16]` (сдвиг строк id не меняет), `kind` → `link_kinds`, `found_in` (откуда взято: `regex:refs`, `header:<метка>`, `table:steps:<колонка>`…), `src_anchor` (путь:строка#блок), `origin`, `weak`, `retired_at` (снятые не удаляются). `meta` jsonb: `ord` (1 = главный родитель), `conds` (условия перехода), `note/truth`, `flow/flows`, `derived/via`. Meta не входит в id ребра.
- Виды `v_edges`/`q_edges` добавляют `part-of` из `parent_id` и `targets` из `issue_targets`. Скрытый поток обрезает текст meta (`0970:23-30`).
- Живой слой: `issues`, `issue_targets`, `comments`, `signals`, `decisions`, `claims`, `votes`, `plan_items`, `entity_reads`, `entity_marks` (`0060`, `0075`, `0802`, `0070`).
- Журнал: `events` append-only, запись только через `bp_event_append` под advisory-замком 7001 (`0070_journal.sql`). Также `work_sessions`, `turns`, `idempotency`.
- Ядро (`0971_kernel_derived.sql`): `kernel_runs (run_id, scope all|normal, sha, branch, status, meta)`, `kernel_nodes` (строки 20-31: `truth, work, resolved, resolved_why, decider, red[], red_nums[], open_q[], gray, agg, radius, time, home, areas, level, parents[]`), `kernel_area_links (a, b, n, n2, layers)`. Хранятся 2 последних снимка на ветку.
- Реестры как данные: `info_types` (около 40 видов), `link_kinds` (29 активных видов связи), `rights`, `spaces`, `sections`, `fact_map_rules`, `registry_items`. Схемы реестров лежат в `db/fixtures/registries/_schema/*.schema.json`.

## 3. Ядро вычислений
`kernel/compute.ts` — чистая функция (без файлов, SQL, часов), порт эталона `.tmp-audit/w2-graph.mjs`. Считает: «правду» (`truth`), решённость в 3 состояния с «почему» (решено · ждёт ответа · не спрашивали), «кто решает», красные («не сходится»), серые дыры (шаг без экрана, шаг без «кто», процесс ничего не меняет, не достижим из потока, данные без процесса, «родитель снят без причины»), области и их вес/кольцо, радиус, группы дыр. Модули: `compute-base.ts`, `compute-holes.ts`, `compute-flow.ts`. Оракул: `test/kernel/oracle.test.ts` (по заголовку файла: совпадение по 926 узлам с эталоном). Вход оракула, судя по `data/pilot/graph-2026-11-01.json`, — корпус пилота: 926 узлов, 1904 ребра, 34 связи областей, 47 таблиц.
Выключатель `BP_KERNEL_COMPUTE=off` → API ядра 503.

## 4. Доступ
- Роли БД: `owner` (миграции), `app` (DML, без DELETE на entities, events только через функцию), `query` (SELECT на `q_*`, лимит соединений 5, таймаут 5 с), `backup` (`db/ROLES.md`).
- Аккаунты: `accounts.kind` owner|human|agent|system; `grants` (space/section/types/entity_ids, `rights[]`, `deny`, `expires_at`), `grant_roles`, `account_roles`. Материализация прав в `acl_entity(account_id, entity_id, rights)`, пересчёт триггерами (`0080_access.sql:16`). Каждый `q_*` фильтруется через `acl_entity` для `bp_acc()`. 43 вида `q_*`.
- Чувствительность: `sensitivity` на сущности, плюс маска id в заголовках/HTML (`api/_mask.ts`). Ядро считается дважды: `scope=all` читает только владелец, остальные — `scope=normal`, где закрытое просто не участвует в числах.
- Токены API `bpd_<prefix>_<secret>` (`0850_api_tokens_guard.sql`): в БД только sha256, принимаются только на `/api/mcp` как Bearer, срок обязателен (agent ≤30 дн, human/owner ≤90), проверка в БД на каждый запрос без кеша, `allowed_ips`, scopes, отзыв необратим. Панель `/admin/tokens` (`api/tokens.ts`): список и отзыв, выпуск только CLI `bp tokens issue`.

## 5. MCP и API для агентов
- `/api/mcp`, stateless: новый Server на запрос, SDK `@modelcontextprotocol/sdk` (`mcp/index.ts`). Единый реестр `mcp/tools/_registry.ts:37` — 27 tools.
  - scope read (15): ping, server_info, describe, search, get_entity, get_context, related, list_entities, list_issues, search_issues, list_changes, get_session, get_book_chapter, list_decisions.
  - scope query (1): `query` — JSON-DSL по белому списку `q_*`, без сырого SQL (`mcp/dsl.ts`).
  - scope write (11): begin/end session и turn, create_issue, propose_answer, set_issue_status, add_comment, set_comment_status, mark_reviewed, set_agent_priority, propose_impl_status; `record_vote` отключён.
- Порядок проверок на каждый вызов: scope-потолок → `MCP_WRITES=off`/`MCP_TOOLS_DISABLED` → лимит → строгая zod-схема входа (лишние поля отвергаются) → handler. Отказ засчитывается токену (`denials24h`).
- Чтение MCP = те же REST-маршруты, вызванные in-process (`mcp/inproc.ts`): одна реализация SQL и масок, подмена аккаунта снаружи невозможна.
- Агент пишет предложения (ответ «answered», а не «confirmed»; impl_proposed, а не факт), а не факты. Подтверждает владелец.
- REST для видов: `/api/vpage/:id` (+ `/map`, `/compare`, `/links`, `/secflow`, `/situations`, `/kinds/:kind`), `/api/map*`, `/api/kernel/{map,node/:id,holes}`, `/api/graph`, `/api/entities`, `/api/related`, `/api/search`, `/api/proto/:viewId` (прототип экрана в iframe) и др. (`api/index.ts:46-79`). Маршрута `/api/ro` в дереве ветки я не нашёл.
- UI: `/v/:id` (универсальная страница любой вещи, около 27 вкладок-видов), `/net` (drill-граф, голос 153), `/` теперь с сетью по разделам; `/m/:id` как отдельный маршрут в ветке не найден (возможно, алиас или в другой ветке).

## 6. Объём (по `06-data-model.md`, 03.11.2026)
- Сущности: около 4,9 тыс. present (вопросы 1036, шаги 979, поля данных 704, гейты 388, исключения 326, role-diff 248, утверждения 195, таймеры 157, решения 134, процессы 118 и ещё около 25 видов).
- Связи: около 14,9 тыс. активных, 29 видов (refs 7881, uses 1746, performs 1048, reads 738, next 648, includes 521…). Больше половины — слабые `refs` из regex по тексту.
- Модель v4e для drill-графа — статический `features/variants/data/v4e/model.json`: 160 units, 696 links. Это снимок, не живая БД.
- Расхождение: пилот ядра (926 узлов, `T1/nodes/*.md`, русские виды «шаг/поток/правило») — другая, меньшая и старая раскладка корпуса, чем 4,9 тыс. в БД.

## 7. Сильное · пределы
Сильное:
- Жёсткое разделение «текст в git» и «надстройка в БД». Ничего не теряется (retired_at, tombstone, неизменяемый journal).
- Происхождение у каждой связи: `found_in` + `src_anchor` (путь:строка). Реестры видов, связей и прав — данные, а не код.
- ACL на уровне БД: fail-closed, виды под security_barrier, агент по токену видит только разрешённое. Вычисления дважды (all / normal) не протекают закрытым.
- Ядро — чистая функция с оракулом против эталона. Агент пишет предложения, не факты.
- Один код чтения для UI и MCP.

Пределы:
- Единственный пишущий в корпус путь — git/коммиты, ingest односторонний (git→БД). Живой слой в git не возвращается, поэтому есть два дома истины.
- Модель жёстко заточена под бизнес-процессы: русские типы, метки шапки (`входит-в:`, `меняет:`), колонки таблиц шагов. Перенос на другой домен — через реестры и парсеры, а не настройкой.
- Много слабых связей `refs` (regex по тексту), класс связи — «гипотеза главного, не подтверждено владельцем» (`06-data-model.md` §6.3).
- Ядро и вычисления на корпусе одного бизнеса; параллельно живут два снимка модели (v4e статический, пилот 926 узлов, БД 4,9 тыс.).
- Токены только для MCP, не для REST. Одна БД на ветку сайта, а не граф между областями.
- Не проверено: `kernel/load.ts` и `compute-holes.ts` построчно, правила ACL в `lib/acl`, тесты (gates/corpus).

Вопрос-цель: ответил (кроме `/api/ro`, `/m/:id` — в ветке не найдены, и без построчного чтения `load.ts`/`lib/acl`).
