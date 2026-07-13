---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: module-deepdive
module: M-G4
Related:
  - ../../MODULES.md
  - ../../README.md
  - ../../synthesis/2026-07-12-fable-db-module/00-SYNTHESIS.md
  - ../../../synthesis/2026-07-12-fable-basis-node-edge.md
  - ../M-G3-type-registry-policy/README.md
---

# M-G4 — Локальность / резиденция (глобальный)

## Назначение
Модуль отвечает на два РАЗНЫХ вопроса, которые нельзя смешивать: **кому знание видно/принадлежит** (`scope`) и
**где физически лежит его истина** (`storageLevel`). Это **ДВЕ ортогональные оси** (синтез, инвариант 1). Поверх —
управляет **материализацией** одного узла в трёх режимах (live / cache / copy) и держит **control-plane** (БД
оркестратора: тонкие паспорта + `DataResidency`) над **data-plane** (проектные БД/файлы, payload). Главная
дисциплина модуля — не дать control-plane стать **вторым источником истины** (критичный риск консилиума).

## node-type / edge-type
Паспорт-колонки (на КАЖДОМ узле, тонкие, дёшево сканируются) — обе оси:
- `scope` — **кому**: `private | project | shared | global`.
- `storageLevel` — **где**: `ephemeral | session | local | project-db | global-db`.
- + `ownerId/tenantId`, `localOnly` (bool), `provenance`, `committed`.

- **node-type `residency-record`** (таблица `DataResidency`) — на `canonicalId`: `homeStore` (адрес истины в
  data-plane), `materialization` (live|cache|copy), `region/tenant`, `derivedAt/freshness`, `provenance`. Это
  **выводимая проекция**, не первичный факт.
- **edge-type `resides-in`** (thin-ref, derived) — узел → store/tenant (навигация «где истина»).
- **edge-type `replica-of`** (assertion, DAG) — copy-материализация → home (ключ федерации/слияния БД).
- **edge-type `cached-from`** (derived, DAG) — cache → источник (TTL/инвалидация).
- **edge-type `shared-with`** (assertion + consent-taint, Ц-7) — узел → scope/tenant (грант доступа).

## policy-as-data
Политики резиденции/шаринга — узлы `policy` в реестре M-G3, разрешаются тем же каскадом:
- **residency-policy** (`valueRef=Суверенность`): дефолтный `storageLevel` по node-type; enforcement `localOnly`
  (не материализуется вверх дальше разрешённого scope); `DataResidency`-регион (данные не покидают юрисдикцию/тенант).
- **sharing-policy** (`valueRef=Согласие`): при `scope=shared` — какая материализация допустима (cache vs copy),
  consent-gate на `shared-with`.
- **matrix-policy**: какие пары (`scope × storageLevel`) допустимы (напр. запрет `global + ephemeral`).

## Поведение-в-БД
- **Материализация (read-time вид):** движок для чтения разрешает по паспорту — `live` → data-plane напрямую;
  `cache` → отдать кэш + проверить свежесть по `cached-from` (DAG); `copy` → отдать реплику + provenance.
- **Поток строго СНИЗУ ВВЕРХ:** запись идёт в **data-plane** (истина в payload) → движок ВЫВОДИТ паспорт-колонки
  и `residency-record` как следствие (событие/derive). Control-plane — read-оптимизированный индекс, **руками не
  правится**, никогда не диктует payload.
- **Rebuild-с-нуля — операция ПЕРВОГО ДНЯ:** снести все `residency-record` + производные паспорт-колонки → пере-
  сканировать payload data-plane → пере-вывести. Это не «потом», а тест-инвариант, встроенный сразу.

## Как гасим риск «второго источника истины»
Паспорт = **ВЫВОДИМАЯ** проекция локальной истины. Четыре гвоздя, забиваемые сейчас: (1) поток только снизу-вверх;
(2) control-plane read-only для человека/агента (правится лишь как следствие записи в payload); (3) **rebuild-from-
scratch** доступен и прогоняется с первого дня + периодическая сверка (reconcile) паспорт↔payload; (4) `localOnly`
не всплывает вверх за пределы разрешённого scope. Так дрейф индекса физически не может стать «правдой».

## Память
`residency-record` + append-only журнал: `replica-of`/`shared-with`/Observation фиксируют, где и когда возникла
материализация, кто и когда получил доступ (провенанс федерации и согласия).

## Global / project
**Глобальный.** Инвариант «две оси + control/data-plane» и `DataResidency`-регион — global (Суверенность). Проектные
дефолты `storageLevel` и допустимые пары — узлы `policy` со `scope=project`, `applies-to`→проект, переопределяют
глобальные через каскад M-G3.

## Кросс-связи
M-G1 (движок читает паспорт при каждом чтении для материализации) · M-G3 (residency/sharing = policy-узлы, каскад) ·
M-G5 (`ownerId/tenantId`, каскад суверенности от корневого профиля) · M-G2 (control-plane оркестратора над data-plane) ·
M-P2 (channel-нейтральный `conversationRef` — где живёт разговор) · M-P4 (кокпит «кто-где-сколько» читает `DataResidency`).

## 🔴 Сейчас (ретрофит невозможен)
Паспорт-колонки `scope`+`storageLevel` (2 ортогональные оси) пустые с дефолтами · таблица `DataResidency` ·
`localOnly`+`provenance` · `replica-of`/`cached-from` с DAG-инвариантом · **поток снизу-вверх + rebuild-from-scratch
как операция первого дня** · consent-taint на `shared-with`.

## 🟢 Позже (дёшево)
Физический раскол per-project БД · механика материализации cache/copy · федерация/слияние БД по `replica-of` ·
per-tenant residency-overrides · region-enforcement · менеджмент флота реплик · кросс-тенант шаринг.

## Открытые вопросы Fable
1. `DataResidency` — отдельный `residency-record` node-type ИЛИ полностью растворяется в паспорт-колонках узла? Где
   граница «колонка на узле» vs «отдельный узел на материализацию»?
2. `localOnly`-данные: control-plane **не знает их паспорт вообще** (полная невидимость) или знает паспорт-факт, но
   не payload? Это стык Суверенности и принципа «всё видно ИИ».
3. `scope` × `storageLevel` — полностью независимы или нужна **матрица допустимости** (запрещённые пары), и чей это
   долг — policy (M-G3) или integrity-движок?
