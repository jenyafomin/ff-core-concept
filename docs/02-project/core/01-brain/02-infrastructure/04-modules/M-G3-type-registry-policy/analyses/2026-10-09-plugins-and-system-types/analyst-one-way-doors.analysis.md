# Analyst: односторонние двери мозга до первых данных (код-реальность)

- **Status:** draft
- **Owner:** jenya.stasik@gmail.com
- **Date:** 2026-10-09
- **Потребитель:** автор ADR-0017 + владелец
- **Поглощает:** —
- Related: ADR-0016, SPEC-brain-v0.6, `g1/analyst-storage-files-vs-postgres.md`, соседние линзы (architect/abstract/critic)

## 1. Store port: sync vs Postgres

Прод-вызовы `acts()/load()/readNode()/writeAct()/rebuild()`: ~39 (engine.ts:53,145,150,153,158; durable-runner.ts:65,75; brain/src ~24: access.ts:165,238,240, idem.ts:74,114, read.ts:80,92,117, runtime.ts:184,263,270,324,404,413, schemas.ts:60,107 и др.; rental-balance 4). Плюс 12 прод-вызовов `engine.write`. Тесты: 121 вызов в 26 файлах + 79 `.write(` в 20 файлах.

- **(a) async сейчас:** большой. `Engine` строит `graph = load(store.load())` в конструкторе (engine.ts:53), `view()/resolve()` читают граф синхронно, а `EngineClient.write/rebuild` FROZEN (ports/engine-client.ts) — async ломает кросс-модульный шов (шлюз M3). ~25 файлов, ~250 строк, ~40 тест-файлов. Выигрыш мал: очередь записи brain уже сериализована (queue.ts), чтения идут из памяти.
- **(b) sync + кэш + write-behind:** DurableFsStore уже ровно это (journal[] + projection в памяти). Для PG как истины ломает C1 (ack до durable) — только если PG вторичен.
- **(c) CQRS: журнал = истина, PG = проекция:** 0 правок порта/Engine/brain-вызовов. Нужен хук `JournalSink.append(act, seq)` в `DurableFsStore.writeAct` после fsync (~20 строк) + PG-хвостовик. Малый. Покрывает весь выигрыш PG (find/JOIN/pgvector, ADR-g1 :Гибрид A).
- **Не чисто аддитивно сегодня:** `BrainDomain.store: DurableFsStore` (schemas.ts:48,84), `scanJournalRegistry` читает файл напрямую мимо порта (registry.ts:200–232), backup копирует файл. Чтобы PG-адаптер был «чистым», типизировать на `StorePort` и вынести проход 1 за порт. Малый-средний.
- **Вердикт:** (c) + сейчас убрать 3 привязки к файлу. Смена *истины* на PG — это позже (a), но она тогда не data-миграция, а только кодовая и без потери.

## 2. Формат журнала

Строка JSONL = `{...meta, erasable}` (store-durable-fs.ts:actToLine/lineToAct). Есть: id акта (`a_…`), `recordedAt` ISO, `actKind`, `edges[]` с `id=edge:sha256:v1:<hex>`, `provenance.schema_v=1` (только brain-акты, to-act.ts:57,148), `type`, `type_v`. Порядок = номер строки (семантически несущий: `rev` = число проекций на ref, idem.ts:75; projection «последний побеждает»).
Нехватает для lossless replay:
1. **Нет версии формата строки/файла** (только schema_v в provenance brain-актов). «Отсутствует = v1» работает бесплатно ⇒ дверь дешёвая, но стампить `v` в actToLine — малая.
2. **Replay должен идти ниже Engine:** `Engine.write` пере-штампует `recordedAt` (engine.ts:74) ⇒ импорт через write теряет время. Правило: перенос = адаптер-в-адаптер, сохраняя `seq` и `recordedAt`.
3. **Два парсера формата** (store + scanJournalRegistry) — любое изменение трогает оба + PG-реплей.
4. Битые строки пропускаются (lossy by design) — зафиксировать, что replay сообщает их, а не молча теряет.
5. Нет namespace/pack в actах (см. §3, §6).

## 3. Type ids и версии

Типы — голые имена (`task`, `person`), хранятся в `payload.type`, `provenance.type`, `instance-of → typedef:<name>` (genesis.ts:ID_PREFIX, to-act.ts:435). Реестр строится из журнала (registry.ts), хранит все версии (`name→version→def`), `type_v` в каждом акте. Namespace (core:/sys:/pack:/u:) **нет**; предикаты глобальны по голому имени, а cardinality — один глобальный map (registry.cardinalities → store при boot).
Если добавлять позже: `instance-of`-рёбра хэшируют target `typedef:x` в `edge id` (edge-identity.ts:edgeIdOf) ⇒ переименование меняет id рёбер в append-only журнале; остаётся только alias-слой «голое = core». Конкретная коллизия уже сейчас: `typeDefId(name)=typedef:<name>` — два плагина с типом `comment` пишут в ОДИН узел и один `typeVersions[name][v]` (registry.ts:addType) — последний молча затирает. Сейчас: грамматика `ns:name` (голое = `core:` неявно, существующие данные не трогаются) — малый.

## 4. IDs и идемпотентность

`u_<ts36><rand6>`, `a_…`, genesis `a_g…` детерминирован; ребро `edge:sha256:v1:` (схема-префикс, версионирован — хорошо). Idem-ключ = sha256(`dialog\nclientIdem`) (idem.ts:idemKey), штамп `<64hex>.<a–p>` в `provenance.idem` — переносим, без секрета. Но **body-tag зависит от server secret** (runtime.ts:377 `argsHash(req, secret)`): при потере секрета F-5-mismatch перестаёт срабатывать (мягко). Dialog = `chat:<id>`/`cli:<key>` — не знает о плагине; вызов разных плагинов в одном диалоге с одним idem дедупится (низкий риск; можно включить plugin id в dialog).

## 5. Paper test: баг-трекер как манифест на текущем реестре

Манифест (чистые данные, форма = существующие `TypeDef`/`PredicateDef`):
```json
{ "pack": "bugtracker", "version": 1,
  "types": [
   {"name":"issue","version":1,"status":"active","fields":{
      "status":{"kind":"enum","values":["open","closed"],"default":"open"},
      "severity":{"kind":"enum","values":["s1","s2","s3"]},
      "body":{"kind":"text"},"due":{"kind":"date"}}},
   {"name":"comment","version":1,"status":"active","fields":{"text":{"kind":"text"}}},
   {"name":"tag","version":1,"status":"active","fields":{"title":{"kind":"text"}}}],
  "predicates": [] }
```
Связи на готовых предикатах: issue→task `about`/`blocks`; issue→person `assigned-to`; comment→issue `part-of`; issue→tag `part-of`. 4 глагола работают без правок: `find(type:'issue',status:'open')` (find.ts:106 читает поле `status`).
**Ловушки (нужно было учесть):** поле `name` — PII-отказ вне person (validate-act.ts:~6b), поэтому `title`; `label` — зарезервированное ключ тела (BRAIN_BODY_KEYS), поэтому тип `tag`; `from_hint/to_hint` не проверяются (registry.ts:181 только хранит) — плагин не может ограничить ссылки; `status` = единственное именованное поле для find (нет общего фильтра по полю).
**Кодовых правок в доменной логике: 0.** Но нужен ИНСТАЛЛЕР: type-def через `record` невозможен (становится `raw`, validate-act.ts:329), `writeGenesis` пишет только genesis. Минимум: ~30 строк цикла `buildTypeDefAct/buildPredicateDefAct` + `engine.write`, и **рестарт** (registry и cardinalities — снимок на boot, schemas.ts:bootBrain). `parseTypeDef` молча отбрасывает неизвестные ключи манифеста (`pack`, `version`) — в журнале они остаются, в реестре нет. Рамка держится: плагин = данные + инсталлер.

## 6. Односторонние двери (по убыванию «цена потом − цена сейчас»)

| # | Дверь | Потом | Сейчас |
|---|---|---|---|
| 1 | Грамматика namespace типов и предикатов (`ns:name`, голое=core) | огромная: рёбра с хэшем target, коллизии `typedef:`, alias навсегда | малая (~6 src-файлов, ~60 строк, ~10 тестов) |
| 2 | Стамп `pack`/`pack_v` в type-def и `provenance` записей плагина | неатрибутируемые записи: нельзя uninstall/export/согласие (V5/V7) | малая (опциональное поле, parseTypeDef, to-act) |
| 3 | Store: типизация на `StorePort`, hook `JournalSink`, проход 1 реестра за порт | средняя (больше кода зависит от файла) | малая–средняя |
| 4 | Правило «replay ниже Engine, сохраняя seq+recordedAt» + `v` в строке | средняя (смешанные форматы без маркера) | малая |
| 5 | Plugin id в idem-dialog; secret в бэкап | малая | малая |
| — | Async-порт | не data-дверь: цена кода та же потом, но растёт число тестов | большая — НЕ делать |

## Неизвестные
- Нужны ли уникальность имён между пользовательскими `u:`-типами и плагинами (решает ADR-0017).
- Кто владеет cardinality предиката при конфликте плагинов.
