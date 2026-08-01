---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-31
Scope: project
node_type: analysis
lens: system-architect (module boundaries, contracts, patterns)
title: "Pre-root R3 — минимальный контур КОРНЯ + развилка БД (DL-15) за StorePort"
Related:
  - ../../02-project/core/01-brain/decisions/ADR-DRAFT-fork-discipline-read-write-planes.md
  - ../../02-project/core/01-brain/analyses/2026-07-31-wider-multilevel-and-self-augmenting/
  - ../../02-project/core/00-kernel/axes-and-time.design.md
  - ../../03-projects/ga-rentacar/specs/07-durable-storeport.spec.md
  - ../../02-project/core/01-brain/decisions.INDEX.md   # DL-15 / DL-21
  - packages/engine/src/engine.ts                       # ground truth: write()/admission/CQRS
  - packages/engine/src/ports/store-port.ts             # ground truth: StorePort seam
---

# Pre-root R3 — контур корня + БД за StorePort

> Линза: структурный паттерн (границы/контракты/потоки), не код. Фаза = дизайн на бумаге.
> Метод: гипотезу владельца («корень уже несёт конституцию») сверил с РЕАЛЬНЫМ кодом
> (`packages/engine`, `packages/core`), а не с прозой. Ниже — что уже несёт корень, что ещё нет,
> и где выбор БД реально живёт.

## 0. Что корень УЖЕ несёт (проверено по коду, не по STATE)

CQRS-шов, admission, resolve-PEP, конституция-потолок, реестр предикатов — **уже в коде**, не нарратив:

- `Engine.write()` = единственный путь записи; `admit()` ОТКАЗЫВАЕТ до `store.writeAct` (fail-closed на inline-PII).
- `Engine` **refuse-to-start** без `policy:constitution` (fail-stop, не fail-open) и без FIXED-policy (ungated cost-tree несобираем).
- Идемпотентность записи по `source_ref + snapshotHash` (T1) — уже есть.
- `StorePort` = engine-internal порт `load · readNode · writeAct · acts · rebuild`; коммент прямо декларирует «swap to PG at M4 = ADDITIVE adapter, never a core edit».
- read-model = проекция, свёрнутая **в app-коде** (`projection.ts`, `edge-index.ts`, `view-compiler.ts`, `predicates.ts`), НЕ в БД.

**Вывод:** гипотеза владельца в основном ВЕРНА и частично уже воплощена. Корень уже CQRS + конституция-первой.
Недостаёт ровно ТРЁХ вещей: (1) durable StorePort (survive-turn), (2) integrity-as-engine-duty как enforced-обязательства (сейчас частично дисциплина), (3) лестницы уровня/автономии как ЧТЕНИЕ (спроектированы, не в коде — но корень не должен хардкодить против них).

---

## 1. Минимальный контур корня (walking-skeleton) — 8 швов

Каждый шов = один модуль/граница. `[E]`=есть в коде · `[P]`=частично · `[N]`=нет (несущий пробел).

| # | Шов | Что несёт (контракт) | Плоскость | Статус |
|---|-----|----------------------|-----------|--------|
| S1 | **Журнал (write-model)** | append-only лог актов = система-записи; один писатель на путь (`Engine.write`→`writeAct`); битемпоральные поля на акте (`recordedAt` req · `validFrom/To` opt) | write | `[P]` есть API, durable нет |
| S2 | **Fold / проекция (read-model)** | write→node свёртка; `rebuild(journal\|files)`; проекция = ПРОИЗВОДНОЕ, не второй источник истины (ADR-0008) | шов read⟂write | `[E]` |
| S3 | **Конверт/паспорт** | тонкий паспорт (дёшево скан) ⟂ payload (редко вскрывают); ребро = гражданин со своим тонким паспортом; provenance-слот на ребре | data | `[E]` |
| S4 | **Read-time линзы + resolve-PEP** | «и так и так» живёт ЗДЕСЬ (Форма #1 диммер: много линз над одной истиной); `resolve()` = единственный путь видимости, default-deny, clamp по конституции | read | `[E]` |
| S5 | **Admission-gate (integrity-as-engine-duty)** | fail-closed на PII; **один-дом barrier** (отвергнуть второй узел-дом на тот же факт); scope-барьер; refuse-to-start | write | `[P]` PII/refuse есть; **один-дом нет** |
| S6 | **Реестры policy-as-data + Конституция** | конституция-узел = потолок; каскад Конституция>policy>integrity; реестры `node-type/edge-type/predicate+cardinality/view-def` = ДАННЫЕ (рост = INSERT) | control | `[E]` предикаты+кардинальность есть |
| S7 | **Durable StorePort (survive-turn)** | durable append-on-write + rebuild-on-boot; `Engine.write`→диск синхронно; следующий ход/процесс видит акт; ре-инжест не трёт `observation` | write/infra | `[N]` **spec-07 стаб — ключевой пробел** |
| S8 | **Закон уровня/автономии (как ЧТЕНИЕ + append-only-forward)** | уровень = траверс (глубина provenance + reach), НЕ тип/папка; автономия = клапан на L3; `append-only-forward` (правило СУЖАЕТ будущее, не переписывает прошлое) | read + [HARD] | `[N]` дизайн есть, чтения нет |

**Минимальность:** S1–S6 уже стоят → корень УЖЕ «субстрат+конституция», а не «хранилище+потом». Гипотеза владельца выполнима почти нацело. Достроить до walking-skeleton = **S7 (durable) + S5-one-home + S8-append-only-forward**. Всё прочее — INSERT данных.

**Ключевой структурный факт:** «и так и так» физически разведён по CQRS-шву S2. write-плоскость (S1/S5/S7) = один-дом; read-плоскость (S2/S4) = много линз. Инвариант fork-discipline — это НЕ политика поверх, это уже топология корня. Стену держит движок (S5+S2), не автор линзы.

---

## 2. Развилка БД (DL-15): что за StorePort (обратимо) vs что необратимо

### 2a. Три корзины

**ОБРАТИМО — прячется за `StorePort` (Форма #2, свап адаптера):**
- Физический layout (Postgres rows+JSONB `nodes/edges/acts` ⟂ граф-натив).
- Конкретный адаптер (`memory · md · pg · graph`) — порт уже это декларирует.
- Стратегия материализации индексов/снапшотов.
→ Свап = НОВЫЙ адаптер, не правка ядра. Порт это уже гарантирует контрактом.

**ИНВАРИАНТНО — в ядре, существует при ЛЮБОЙ БД (не за портом, но и не зависит от неё):**
- Журнал актов = write-model / система-записи (S1).
- Fold/проекция = read-model **в app-коде** (S2) — DB-agnostic by construction.
- Форма конверта/паспорта + битемпоральные поля на акте (S3).
- `resolve`-PEP + view-compiler (S4) — app-level, не DDL (DL-18: view-def = app-композиция, НЕ `CREATE VIEW`).
- Admission + append-only-forward (S5/S8).

**НЕОБРАТИМО — один-дом (Форма #3), и КРИТИЧНО: НЕ зависит от БД:**
- Модель идентичности: лестница `source_ref`(L0) → `canonicalId`(L1) + замок `same-as cardinality='many'`.
- Namespace/словарь предикатов (`rented` vs `for-customer`).
- Один дом на факт (платёж = только `rental-balance`).

### 2b. Честная рекомендация по DL-15

**DL-15 РЕШАЕМА СЕЙЧАС и НЕ является блокером корня.** Три довода:

1. **Противоречие в доках нужно снять честно.** DL-15 (2026-07-12) = «открыто, склон к графу». **DL-21 (2026-07-18) = «БД=PostgreSQL, закрывает DL-15»** — ратифицировано пакетом. По source-of-truth Rule-2 (позднее ратифицированное бьёт раннее) **DL-15 уже закрыт = Postgres**. Задача R3 переоткрыла его во фрейминге — это надо явно подтвердить/снять, а не держать в подвешенном виде.

2. **Выбор спрятан за уже существующим `StorePort`.** Пока read-model свёрнут в app-коде (S2/S4 — так и есть сегодня), БД = просто act-store + KV. Graph-натив стал бы необратим ТОЛЬКО если пустить его traversal-семантику (Cypher и т.п.) в view-compiler как read-контракт — это Форма #3 (словарь, который читают многие). **Не пускать.** Держать обход в `edge-index.ts`/`view-compiler.ts` (app) → БД полностью обратима.

3. **Ловушка «граф, потому что по-серьёзу граф».** Это выбор по эстетике, не по замеру — ровно анти-паттерн fork-discipline (полюс вместо свойства). Правильно: **Postgres-default за StorePort; граф-натив — будущий АДДИТИВНЫЙ адаптер по ЗАМЕРУ горячих traverse-путей** (DL-21 это уже и говорит).

**Итог DL-15:** закрыть как *«Postgres-default за StorePort, ядро DB-agnostic; граф-натив — будущий измеренный адаптер»*. Реальные блокеры корня — НЕ БД, а три DB-независимых один-дом-решения (идентичность-лестница · предикат · дом платежа) = ровно 4 гейта fork-discipline ADR. **Не дать выбору БД маскироваться под блокер.**

---

## 3. read/write + append-only-forward как ДВИЖОКОВЫЙ долг (не дисциплина)

integrity-as-engine-duty конкретизируется в **4 enforced-обязательства корня** (иначе честность «на дисциплине автора»):

1. **Admission one-home barrier (S5).** Отвергнуть второй узел-дом на тот же факт (домен-барьер). Сегодня есть дедуп по `source_ref+snapshotHash`, но НЕ отказ второму дому в другом домене → **долг** (снимает B-1/B-3/B-6, форк #3).
2. **Read-path несёт meta+tombstone (S2/S4).** Инверс-индекс сегодня роняет `meta` → access-plane теряет маркер уровня/tombstone (C-CROSSTURN, D5). Уровень-как-чтение (S8) невозможен, пока чтение не переносит маркер. → **долг движка.**
3. **`rebuild-from-journal` = append-only-forward (S2/S8).** Поздно зарегистрированное правило (`same-as='one'`) НЕ вправе ретроактивно переписать историю un-merge через replay. Fold обязан быть forward-монотонным. Сегодня replay берёт все акты подряд → мина **A-C2** → **[HARD] движка**, не данные.
4. **Конституция неписуема данными (S5/S6).** rule-узел не может заявить Constitution-scope (admission-тест); память пишет L2–L4 policy, но НЕ инварианты; клапан на необратимом = `[HARD]`.

Эти 4 = **acceptance-тесты корня**, а не гайдлайны. Именно они превращают fork-discipline ADR из бумаги в топологию движка.

---

## 4. Где ga-rentacar подключается — ПЕРВЫЙ ЖИЛЕЦ, не часть корня

**Граница уже физически правильная в коде** (проверено): зависимости идут `ingest-rentacar → @ff/engine`, `rental-balance → @ff/engine`; `engine → core`; ядро НЕ зависит ни от чего проектного. Это и есть шов plug-in.

| В КОРНЕ (universal) | В ЖИЛЬЦЕ ga-rentacar (project scope, plug-in) |
|---------------------|-----------------------------------------------|
| S1–S8: журнал, fold, паспорт, resolve, admission, реестры, durable-store, закон уровня | ingest-адаптер Sheets→акты (`ingest-rentacar`) |
| контракт промоушена L0→L1 (rollup), append-only-forward | предикаты `rented/for-customer` = строки реестра |
| один-дом barrier (механизм) | правила `same-as` ДЛЯ клиентов (данные) |
| resolve-PEP (механизм) | `rental-balance` = ЕДИНСТВЕННЫЙ дом платежа + клиентская линза |

**Роль ga-rentacar = DRIVER**, доказывающий контракты корня на реальных данных (Orders 4102, Transactions 8742) ДО хардкода: он — двухуровневый мозг в миниатюре (L0 `source_ref` → L1 `same-as` → L2 реестр предикатов). Он проверяет контракт **промоушена** (rollup) и **survive-turn** до того, как корень их зацементирует.

**Что ga-rentacar ВСКРЫВАЕТ как пробел КОРНЯ (не жильца):** durable StorePort (S7). «Живой топик-агент M3 невозможен по построению» без survive-turn (spec-07 §1). Значит **S7 обязан быть в walking-skeleton корня**, и именно ga-rentacar его форсирует. Дисциплина: ни один проектный словарь (rental-предикаты, домен платежа, схема Sheets) НЕ протекает в `packages/core`/`packages/engine` — уже соблюдено, ратифицировать как enforced-границу (import-lint).

---

## 5. Топ-вопросы владельцу

1. **[framing · P0]** Снять противоречие DL-15↔DL-21: закрыть DL-15 как *«Postgres-default за StorePort, ядро DB-agnostic; граф-натив — будущий измеренный аддитивный адаптер»*? (DL-21 это уже ратифицировал; R3-фрейминг переоткрыл — нужно да/нет.)
2. **[scope · P0]** Корневой walking-skeleton ВКЛЮЧАЕТ durable StorePort (S7, survive-turn, spec-07) как обязательный шов — т.е. корень = «субстрат, переживающий ход шлюза», а не «хранилище + прикрутим»? (Прямо гипотеза владельца — нужно явное да.)
3. **[decision · P0]** Ратифицировать integrity-as-engine-duty как 4 enforced-обязательства (§3: one-home barrier · read-path несёт meta/tombstone · append-only-forward fold · Конституция неписуема) → они становятся acceptance-тестами корня, не дисциплиной?
4. **[boundary · P1]** 4 гейта fork-discipline: рамка read/write + append-only-forward = КОРЕНЬ (universal); предикат/платёж/правила-идентичности = ЖИЛЕЦ (project instance)? Подтвердить это распределение.
5. **[boundary · P1]** Заблокировать направление зависимости (import-lint): `core`/`engine` без проектного словаря; все rental-термины только в `ingest-rentacar`/`rental-balance` (уже так) — ратифицировать как enforced-границу?

---

## 6. ADR-указатель

Рекомендуемый следующий канон-артефакт: **ADR-0009 «Root scope + durable StorePort + integrity-as-engine-duty»**
(после ответов на §5) — фиксирует S1–S8 как контур корня, 4 движоковых долга §3, и DL-15-разрешение §2b.
Пишется, когда владелец пройдёт 5 вопросов. Fork-discipline ADR-DRAFT остаётся его read/write-фундаментом.
