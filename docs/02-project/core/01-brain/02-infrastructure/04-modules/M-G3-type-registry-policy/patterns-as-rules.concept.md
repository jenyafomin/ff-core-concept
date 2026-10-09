---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-09-23
Scope: project
node_type: concept
title: Паттерн = тоже правила — три слоя данных (реестр/политика/проекция)
Related:
  - ./README.md
  - ./policy-as-data--decomp-2026-07-14.md
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/architecture/ADR/ADR-0005-data-substrate-structure.md
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/architecture/ADR/ADR-0006-persistence-as-policy.md
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/architecture/ADR/ADR-0008-log-and-graph-cqrs.md
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/architecture/ADR/ADR-0015-edge-identity.md
  - ../../../01-overview/04-engine-reality-and-evolution/data-evolution-ladder-2026-09-17.concept.md
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/engine/test/predicates-as-data.test.ts
  - /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/_log/2026-09-17-two-maps-and-creative-scan/DRAFT-patterns-as-rules-and-upgrade.md
---

# 🧩 Паттерн = тоже правила — три слоя данных

> **Статус — active (reference).** Этот узел в ОСНОВНОМ рестейтит уже ратифицированный канон
> (Конституция > policy-as-data > integrity-as-engine-duty; ADR-0005/0006/0008). Он НЕ дублирует их —
> держит короткую сводку и **кросс-ссылки**, а НОВОЕ здесь ровно одно: ось **D8=геном / D9=фенотип**.
> Детали механики — в `./README.md` и `./policy-as-data--decomp-2026-07-14.md`.

Несущая мысль владельца (повторял многократно): система должна держать почти **ЛЮБЫЕ** паттерны — и
дизайн-, и знаний; **паттерн = ещё и свои ПРАВИЛА**; понимать по ценностям, насколько гибко он протестирован
на разных данных; и думать, как он развивается/апгрейдится.

## 1. Три слоя — всё ДАННЫЕ, а не хардкод типа

- **Структура** — поля (`EnvelopeNode.body`) + рёбра (`Edge{predicate, target}`) + **кардинальность-как-данные**
  (`PredicateRegistry`). Основание — ADR-0005.
- **Политика** — `policy_ref[]` → узлы-политики; единый PEP `resolve()` складывает их комбинатором, **взятым
  из данных** (`policy:access-priority`), с клампами deny-floor / Constitution-ceiling ПОСЛЕ фолда. Инвариант
  охраняет движок, не автор. Дом слоя — этот модуль M-G3 (`./README.md`, `./policy-as-data--decomp-2026-07-14.md`),
  основание — ADR-0006.
- **Проекции** — `ViewDef` компилируется в исполняемый вид; CQRS: лог-актов → граф-проекция → вид = f(граф, линза).
  Основание — ADR-0008.

## 2. Ключевое доказательство: движок не ветвится по имени типа

**«Поддержать любой паттерн» = движок ИСПОЛНЯЕТ декларативные правила паттерна, а не `switch` по существительному.**
Прямое доказательство в коде: ядро несёт `DEFAULT_PREDICATES = {}` — оно не знает НИ ОДНОГО «существительного»;
тенант ВПРЫСКИВАЕТ реестр на шве store/reducer. Проверка — `packages/engine/test/predicates-as-data.test.ts`.
Хребет ратифицирован: **Конституция > policy-as-data > integrity-as-engine-duty** (ADR-0005/0006/0008); здесь
не переписываем — см. `./README.md`.

## 3. Жизненный цикл паттерна и швы кода

**Объявлен** (данные) → **валидирован** (`assertValid` fail-closed; `assertForwardMonotone` запрещает narrowing
`many`→`one`; PII-gate) → **применён** (`foldEdges`: REPLACE для `one`, ACCUMULATE для `many`;
`LOCKED_PREDICATES` = кернел-потолок) → **спроецирован** (`view-compiler` + rebuild-from-journal) →
**эволюционирует** (`snapshotHash`-supersession → freshest-wins).

- **Держат:** реестр-впрыск, комбинатор-из-данных, CQRS лог→проекция, идемпотентность.
- **НЕ держат (честно):** `edge-identity` только ДЕРИВИРУЕТ `canonical_id` — merge/split/retarget не построен
  (ADR-0015 Reserved); `ConsentAssurance.status` — форма, `resolve()`/`admit()` его НЕ читают; `ViewDef.kind` —
  замороженный enum из 3 видов, не произвольная линза-как-данные. (Флип этих дыр — апгрейд-путь лестницы:
  `../../../01-overview/04-engine-reality-and-evolution/data-evolution-ladder-2026-09-17.concept.md`.)

## 4. НОВОЕ: ось D8=геном / D9=фенотип

Единственная генуинно-новая мысль этого узла — размежевание двух осей роста паттерна:

- **D8 = геном (write-сторона).** Как растить сам ТИП: per-type рост схемы, конструкторы схем, примитивы
  структуры. Направление `00-directions/08-schema-constructors/`.
- **D9 = фенотип (read-сторона).** Один паттерн → N поверхностей: projection-as-data, cross-type, линза как
  переносимая единица. **Сегодня НЕ существует как данные** (`ViewDef.kind` заморожен). Кандидат-направление,
  gated на перепись реальных эпизодов — форму заводим, стройку не начинаем.

Разведение осей снимает путаницу «менять тип» (геном) vs «по-новому ПОКАЗЫВАТЬ тот же тип» (фенотип) — это
разные механизмы с разными швами, не один.

## 5. Острейший адверсариал: конфликт политик на ОДНОЙ единице

`policy_ref[]` — стек политик; `resolve()` фолдит их с deny-floor. Но если паттерн-А объявил предикат `one`,
а паттерн-Б требует `many` — `assertForwardMonotone` **ОТКАЖЕТ (fail-closed)** → единица становится неприменима.

Следствие для формулировки: **«любой паттерн» фактически = «любой НЕ-конфликтующий с уже наложенным паттерн».**
Это несущая дыра гибкости, а не мелочь: свободная композиция примитивов (D8) без инвариантов-ограничителей
(«какие композиции ЗАПРЕЩЕНЫ» — тоже как ДАННЫЕ) даёт комбинаторный взрыв невалидных конфигураций и «кашу
типов», бьющую по V1/V2. Ограничители-как-данные — открытая задача, не решённая.
