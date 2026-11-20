---
title: Примитивы ff-brain — что есть в коде и что выражается композицией
status: draft
owner: jenya.stasik@gmail.com
date: 2026-11-14
lens: analyst
related: ../GOAL.md · ../../2026-11-14-rentacar-concepts-vs-memory/raw/04-architect-matrix.md · ../../2026-10-26-flexible-growth/SYNTHESIS.md · docs/architecture/ADR/ADR-0016, 0017, 0009, 0010 · 03-unit/UNIT-SPEC-v1.design.md
---
Потребитель: свод волны pattern-coverage. Поглощает: ничего (сырьё линзы). Оси матрицы архитектора не повторяю.
Пути от `packages/`; `B`=`brain/src`, `E`=`engine/src`.

## 1. Примитивы (по коду)
| # | Примитив | Что умеет · жёсткие пределы | file:line | Данные/код |
|---|---|---|---|---|
| 1 | Запись (unit) | id `u_…` вечный, не несёт тип/проект; `label` ≤120; fields — только скаляры и `string[]` (не объект, нет decimal/валюты); поле не из type-def терпится как есть | `B/contract.ts:94-96`, `B/domain/validate-act.ts:231-247` | код |
| 2 | Тип (type-def) | поля: text·enum·date·number·bool·ref; `required/default/pattern/max_bytes`; версии хранятся все; `extends` хранится, НЕ исполняется; `ref` = обычная строка, целостности нет | `B/domain/genesis.ts:12-64`, `validate-act.ts:251-262` | **данные**, но 11 типов из кода |
| 3 | Имена слоёв | `core` / `sys:` / `pack:id/` / `u:`; кто что может определять | `B/domain/names.ts:3-90` | код |
| 4 | Ребро | id = hash(from·pred·target) → одна пара = одно ребро; cardinality one/many по предикату; meta ФИКСИРОВАНА: author·status·created_at·confidence·note (на `record.edges` — только `{pred,to}`, confidence/note лишь через `link`) | `E/core/edge-identity.ts:34`, `B/domain/to-act.ts:110-116`, `B/contract.ts:182` | предикат — данные, паспорт — код |
| 5 | Предикат | 16 в genesis + `sys:applies-to`; `from_hint/to_hint` — лишь подсказки; `locked` (owner/referent) | `genesis.ts:210-227` | данные (но заводить нечем, см. §2) |
| 6 | Область (scope) | `in-scope` M:N, `member-of` M:N, `kind` personal·company·project, ≤10 областей на запись | `genesis.ts:173,211-212`, `contract.ts:127` | узел-данные |
| 7 | Статус записи | `active·proposed·retracted·superseded`; `retract` + `reason`; update с `expected_rev` (оптимистичная блокировка) | `contract.ts:215`, `validate-act.ts:401,609` | код |
| 8 | proposed / authority | `initiative:agent` или `approval:owner` в type-def → `proposed`; активирует только owner-authority (по токену, не по запросу) | `validate-act.ts:462,612-618`, `genesis.ts:49-58` | политика типа — данные |
| 9 | referent/visibility | `referent ≠ owner` или тип `pii:person` → `visibility=owner` (жёстко); PII-скан значений; `personal`-область | `validate-act.ts:624-630`, `pii-scope.ts` | код |
| 10 | Источник | `source{kind file\|act\|url, ref, hash}`, `derived_from[u@rev]`, `layer` (число) — форма, валидируется по формату; `stale` НЕ считается | `contract.ts:226-231`, `validate-act.ts:365` | код |
| 11 | Время | tx-time: `recordedAt` на акте (движок, неизменно) + `meta.created_at/updated_at`. Valid-time: только пользовательские поля `date` (`due`, `decided_at`, `done_at`) | `E/core/types.ts` (Act), `genesis.ts:150-159` | см. §2 |
| 12 | cold/pinned | `temperature` hot/cold, `pinned` — поля meta; ни один код-путь не ставит `cold` и не `pinned=true` (только переносит); пресеты прячут cold, сортируют pinned | `to-act.ts:207,367`, `presets.ts:81,147` | поле есть, механизма нет |
| 13 | raw + friction | неизвестный тип → `raw` + `declared_type` + warning + friction (code+sha256 имени, не имя); friction = запись со счётчиком, ≤50/сутки | `validate-act.ts:437-457`, `service/friction.ts` | код |
| 14 | find | фильтры: scope·type·status·text(подстрока)·due_before·edge{pred,to} (только исходящее)·preset; ≤50; тела не отдаёт | `read/find.ts:60-128` | код |
| 15 | read/traverse | BFS по исходящим активным ребрам, depth ≤2, ≤50 узлов, цикл-safe, невидимое молча пропускается | `read/traverse.ts:25-57`, `contract.ts:131-136` | код |
| 16 | Пресеты | morning·evening·open·scope·overview — закрытый union + switch; опираются на значения поля `status` (open/doing/blocked/done) и `due` | `presets.ts:21-30` | код |
| 17 | Линза | ОДНА форма `compose`: from-тип · via-предикат · order видов цели · merge append/prepend/replace · separator; AND по целям; читает только `sys:prompt-layer` (+`sys:target`); спека — запись `lens:id@v` (иммутабельная версия) | `read/lens.ts:1-12,54-70`, `sys-types.ts:119-125` | **данные** + код-интерпретатор |
| 18 | Реестр как журнал | реестр строится сверткой журнала; def из «чужого» писателя отвергается (friction DEF_REJECTED) | `B/domain/registry.ts`, `runtime.ts:182` | данные |
| 19 | Act/журнал | append-only, `domain_event` свёртывается «последний побеждает» по `source_ref`; `snapshotHash` → дедуп; idem-ключ; бэкап | `E/core/projection.ts`, `B/service/idem.ts` | код |
| 20 | Стирание | шов: `erased`-акт, split payload/мета, salted-hash свидетель — в движке; в мозге НЕ подключён | `E/core/erasure.ts:1-60` | код (шов) |
| 21 | Заготовки формы в движке | `Edge.validFrom/validTo`, `subjectRole.consent{status…}`, `canonical_id`, `Act.principal` — ЕСТЬ в типе, мозгом не ставятся, проекцией не читаются, ничего не принуждают | `E/core/types.ts:22-100` | форма |

## 2. Что НЕЛЬЗЯ выразить сейчас без кода
1. Новый тип/предикат со стороны пользователя или агента: `planDefinition` зовут только genesis и sys-сид; запись типа `type-def` идёт в `raw` (`validate-act.ts:448`). Код-путь «объявить тип данными» закрыт для всех; `candidate`-типы агент завести не может.
2. Новые статусы с семантикой: переходы = код; пресеты видят только `open/doing/blocked/done` — тип с иными статусами невидим для morning/open.
3. `superseded` как следствие связи `supersedes`: ничто не ставит статус и не читает ребро (grep: только enum/decode). «Новое закрывает старое» — ручной ритуал агента.
4. Второе ребро между той же парой с другим смыслом/условием/интервалом (id без времени и meta); условия, порядок, поток на ребре; `found_in/anchor/weak`.
5. Valid-time: «действовало с–по», «на дату X» — нет ни поля, ни среза; `validFrom/validTo` не пишутся и не читаются. Bitemporal нет, есть только tx-time.
6. Обратный обход (кто ссылается на X) в `find`/`read` — только исходящее.
7. Агрегаты, суммы, производные значения, формулы; money-тип; вычисляемое поле.
8. Группировка/сортировка/проекция полей по произвольным полям в `find`; фильтр по значению открытого поля (кроме status/due).
9. Любая линза кроме `compose` над промпт-слоями (shape enum = `['compose']`).
10. Остывание/слияние/расщепление: cold не вычисляется, merge/split нет.
11. Процессы, состояния-ситуации, таймеры, события «если–то».
12. Целостность `ref`-полей; наследование типов; миграция записей между версиями типа.
13. Согласие как условие (consent/use≠read), стирание, права на тип/поле/роль/срок.

## 3. Задумано в доках, но не в коде
- UNIT-SPEC §4(d) opaque edge-identity «FINALIZED», `time-on-edge` через `validFrom/validTo` + cardinality-as-data — формы есть в типе движка, поведения нет.
- UNIT-SPEC §4(f) valid-time/as-of на конверте акта — `provisional`; в `Act` поля нет (types.ts).
- UNIT-SPEC §3 ядро «7 полей» (`salience`, `key_mode`, `contract_version`, `policy`-слот): `salience`/policy-слота в коде нет.
- ADR-0009 `erased`-акт + `shred` порт + carve-out I-4 — OWNER-PENDING (R3/R4/R5); ADR-0010 ③ enforcement принципала — open.
- ADR-0016 D5 `extends`, `candidate→active`, слияние/расщепление типов — «только форма»; D7 `stale`, поведение слоёв — форма.
- ADR-0017 D2 `persistence_class`/`placement` — «словарь-резерв, не поле»; D3 PG-шов — C-bis решён, не построен; манифест пакетов `manifest_v:0`; `pack:` установщика нет.
- Flexible-growth: общий исполнитель вида (`group_by/fields/sort`), категории статусов, маршрут «агент предлагает тип → владелец утверждает», friction с ИМЕНЕМ типа — решение «строй», в коде нет. Правила-как-данные — сознательно отложены.
- Устав: «≤3 record за ход» — только текст (`brain-mcp/src/charter.ts`), кодом лимит 60/мин.

## 4. Односторонние двери (дорого менять после данных)
1. Формат id записи `u_…` и id ребра `edge:sha256:v1` от (from·pred·target): добавить время/условие в ключ = перенумерация всех рёбер. Схема-префикс версионируется, но старые не мигрируют.
2. Поля ребра в акте: журнал append-only; чего не записано (`found_in`, valid-time, `conds`) — потеряно навсегда для старых актов.
3. Valid-time на конверте акта (UNIT-SPEC f): не записан сейчас → ретрофит невозможен. Самая острая дыра для rentacar (договор «с–по»).
4. Пространство имён `core/sys/pack/u` + алиас голых имён → `u:`: замороженный `CORE_NAMES`.
5. Принцип «тело в git, память держит адрес» (`source.ref+hash`): копия тела = вторая правда.
6. `referent`/`owner` → visibility=owner; PII-гейт значений; отсутствие стирания (R3/R4/R5) — реальные ПДн без `shred` не класть.
7. Журнал-файл как истина, replay ниже Engine, `recordedAt` не перештамповывать (ADR-0017 D3).
8. Идемпотентность без args (D10) и формат принципала `user:/agent:/cli:/sys:/pack:`.
Не дверь (дешёво): пресеты, линзы-как-данные, новые версии типов, `sys:`/`pack:` типы, лимиты.

## Композиция: что выражается сейчас
Запись+тип+область+ребро+`proposed`+`source`+версия типа+линза-compose дают: задачи/решения/заметки/люди/дни, вопросы с «закрыто статусом», граф «о/часть/блокирует/решает», авторитет «агент предлагает — владелец утверждает», промпт-каскад. Не дают: время «с–по», вычисления, процессы, пользовательские типы, обратные запросы.

Вопрос-цель: ответил — примитивов 21, из них «данные» только тип/предикат/область/линза-compose; композицией выразимы граф знаний и статусные жизненные циклы; время valid-time, производное, процессы, пользовательские типы — нет.
