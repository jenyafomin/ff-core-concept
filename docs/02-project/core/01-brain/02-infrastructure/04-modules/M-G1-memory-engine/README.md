---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: module-deepdive
module: M-G1
Related:
  - ../../MODULES.md
  - ../../README.md
  - ../../../analyses/2026-07-12-fable-series/2026-07-12-fable-db-module/00-SYNTHESIS.md
  - ../../../analyses/2026-07-12-fable-series/2026-07-12-fable-basis-node-edge.md
---

# 🧩 M-G1 «Движок памяти» — корневой модуль (глубокий разбор)

> Global. Корень: на нём стоят ВСЕ остальные модули. Движок = исполнитель над 2 физ. таблицами;
> поведение — данными (реестры/виды), исполнение — здесь. Переносим FF ↔ agents-manager.

## Назначение
Держит **граф-субстрат**: 2 физ. таблицы (`nodes`, `edges`) + тонкий паспорт + payload + append-only
журнал. Исполняет **duty-механики**, которые нельзя выразить данными: распространение (propagation),
дедуп, DAG/циклы, bitemporal, snapshot/diff. Даёт единый `canonicalId`. Всё «что есть» — данные в
реестрах (владеет M-G3); движок — сервис, который эти данные **исполняет**.

## node-type / edge-type
Движок вносит немного собственных МЕТА-типов (доменные типы — данные в M-G3); зато определяет 2 **класса** ребра.
- **Классы ребра (движок определяет):** `thin-ref` — поле узла, без паспорта, судьба=судьба узла (навигация) · `assertion-edge` — сущность с id+узким паспортом (адресуемо, оспариваемо, provenance).
- **node-type:** `variant-group` — контейнер «обоих вариантов» (`mode: xor|or|and`), варианты живут вечно · `observation` — запись append-only журнала-позвоночника (что произошло, кем).
- **edge-type (seed, движок исполняет):** `variant-of` — узел↔его VariantGroup · `chosen-in` — адресуемый выбор варианта (append-only) · `derived-from`/`computed-from` — производное ребро под DAG, триггер propagation · `supersedes` — цепочка bitemporal-истории.

## policy-as-data (место в каскаде)
Каскад: **Конституция > policy-as-data > integrity-as-engine-duty**. Движок сидит на ОБОИХ концах.
- **Верх (Конституция, жёсткие инварианты движок ЭНФОРСИТ):** canonicalId везде · endpoint=ID (никогда path) · append-only · DAG на derived.
- **Середина (policy-узлы, настраиваемые):** `propagation-policy` (глубина/устаревание пересчёта) · `residency-default-policy` (дефолт scope/storageLevel, таблицу владеет M-G4).
- **Низ (integrity-as-engine-duty):** дедуп, детект циклов, DAG-энфорс — пол, который движок держит всегда. **Открыто:** пол жёсткий или настраиваемый policy-узлом (см. вопросы).

## Поведение-в-БД
- **Декларативно (view/flow, НЕ хранимое):** `effective` (разрешение VariantGroup) = read-time вид · `pending`/staleness = вид · **поток** = параметризованный обход (`flow-def`) · **diff/снапшот-за-период = проекция над bitemporal, никогда не сущность**.
- **Делает движок (сервис):** propagation по DAG вдоль `derived-from` · дедуп/слияние по canonicalId · энфорс DAG (реджект ребра, создающего цикл) · bitemporal (valid-time + tx-time, цепочка `supersedes`) · snapshot/diff по запросу · **паспорт = ВЫВОДИМАЯ проекция локального payload; поток снизу вверх; руками не правится; rebuild-с-нуля — операция первого дня**.

## Какую память требует
2 физ. таблицы (`nodes`, `edges`) · паспорт-колонки (`scope, storageLevel, ownerId/tenantId, committed, localOnly, provenance`) · payload · **append-only журнал** (`observation`/worklog) · таблица `DataResidency` (делит с M-G4) · bitemporal-колонки · partial-index «≤1 Active» · малый seed edge-типов.

## Global vs Project
**GLOBAL, корневой.** Один движок на все проекты; та же модель для FF-brain и agents-manager.
Control-plane (движок+паспорт) — глобален; data-plane (payload) физически колется per-project ПОЗЖЕ.

## Кросс-связи
- **M-G3 (реестр типов):** движок ЧИТАЕТ строки `node-type/edge-type/view-def` и исполняет их (не graph-ребро — чтение реестра-узлов). Шов тонкий → развилка границы.
- **M-G4 (резиденция):** читает `DataResidency` + паспорт `scope/storageLevel` для материализации.
- **M-G5 (идентичность):** движок присваивает `canonicalId`; узел-профиль — корень.
- **M-G2 / M-P* (все):** пишут в ОДИН журнал через движок; оркестрация-подграф — рёбрами `reports-to / verified-by / bound-to`. Через субстрат + позвоночник движок связан со ВСЕМИ.

## 🔴 Заложить СЕЙЧАС (ретрофит невозможен)
canonicalId-UUID везде · тонкое ядро+payload · edges с открытым реестром типов (малый seed) · 2 класса ребра · DAG на derived · паспорт-колонки с дефолтами · таблица DataResidency · VariantGroup-минимум (`mode`+`variant-of`) · append-only журнал · endpoint=ID не path · partial-index «≤1 Active» · миграции (не `synchronize`) · паспорт=проекция, поток снизу-вверх, rebuild-с-нуля day-1.

## 🟢 Растёт позже (дёшево)
Физ. раскол per-project · SQLite→Postgres · раннер плагин-интерпретаторов · push-реактивность · материализация видов (live/cache/copy) · богатая payload-валидация · per-tenant overrides · ACL-энфорс · менеджмент реплик · кросс-тенант шаринг · оптимизация snapshot/diff.

## Открытые вопросы для Fable
1. **Граница M-G1 ↔ M-G3:** движок и реестр типов — один модуль или два? Где ровно линия «исполняет vs декларирует»?
2. **integrity-as-engine-duty:** жёсткий пол (hardcoded) ИЛИ настраиваемый policy-узел (порог дедупа, cycle-mode)? Отголосок развилки «один policy-узел или много».
3. **`observation`:** один node-type или два (наблюдение vs WorkLog)? Один позвоночник или две проекции над ним?
4. **Дрейф control-plane:** нужен ли отдельный контроль-сумма/детектор рассинхрона паспорт↔payload, кто триггерит rebuild-day-1?
