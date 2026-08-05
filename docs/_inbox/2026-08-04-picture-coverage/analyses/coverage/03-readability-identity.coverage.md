---
node_type: analysis
title: "Покрытие: Читаемость (Ц1) и Тождество (Ц2) — грани × акт→линза × глубина × приоритет"
status: draft
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
related:
  - ../01-building-blocks.analysis.md
  - ../02-values-lenses-acts-frame.analysis.md
  - ../../README.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/GROWTH-MAP.md
  - ../../../../02-project/core/00-kernel/invariants.md
source:
  - docs/02-project/core/01-brain/01-overview/01-values/01-chitaemost/*/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/02-tozhdestvo/*/README.md
  - docs/02-project/core/00-kernel/invariants.md
  - docs/02-project/core/00-kernel/kernel-acceptance-tests.md
  - packages/engine/src/core/types.ts
  - packages/engine/src/core/predicates.ts
  - packages/engine/src/core/projection.ts
  - packages/engine/src/core/view-compiler.ts
  - packages/engine/src/core/admission.ts
  - packages/ingest-rentacar/src/dedup/candidates.ts
  - packages/ingest-rentacar/src/dedup/same-as-writer.ts
  - packages/ingest-rentacar/src/lens/customer-lens.ts
  - packages/ingest-rentacar/src/observation/latest-wins.ts
---

# Покрытие: Читаемость (Ц1) и Тождество (Ц2)

> Метод и рубрика — из `../02-values-lenses-acts-frame.analysis.md` §3-4 (глубина 0-3, Priority=(V×G×R×Rdy)/C,
> бакеты P0≥60·P1 30-59·P2 12-29·P3<12). Факты об актах/линзах — из `../01-building-blocks.analysis.md`.
> Каждая из 12 граней (6+6) проверена на диске (`ls`) и в коде (`grep` по `packages/engine`,
> `packages/ingest-rentacar`). Где цепочка не цитируется явно ни в одном канон-доке — помечено `unverified`
> и не поднимает глубину сверх того, что доказано напрямую.

## Ц1 Читаемость — 6 граней

| Грань | Цепочка акт→линза | Глубина | V | G | R | C | Rdy | Priority | Бакет | Обоснование |
|---|---|---|---|---|---|---|---|---|---|---|
| **01-passport** (`.../01-chitaemost/01-passport/`) | `domain_event → current-state-fold (L4, proven-code)` — связь цитирована в `01-building-blocks.analysis.md` п.1 («Обслуживает Читаемость… passport = read-time проекция, I-5») | **1** | 4 | 2 | 4 | 3 | 2 | 21.3 | **P2** | Fold-машинерия реально green (`projection.ts`, I-5/I-6), но САМ минимальный шейп паспорта (id/type/label/**salience**/**temperature**, `price_hint`) НЕ существует в `EnvelopeNode` (`types.ts:67-78` — только `id/type/state/edges/view/visibility/access/acts/policy_ref/body`, ни одного из полей паспорта). Facet-doc сам в статусе «дивергенция» (Q1 не решён) — цепочка есть на бумаге, не удовлетворяет обещание (§3.1 п.3). |
| **02-polysemy-lens** (`.../02-polysemy-lens/`) | Нет цитируемой связи в `01-building-blocks`. Найдено `unverified`-по-коду: `packages/ingest-rentacar/src/lens/customer-lens.ts` — реальный, green-unit-тестируемый (6 тестов) read-lens, различающий грань по роли читателя («что мы знаем о клиенте X»), объединяет два keyspace на чтении | **1** (borderline →2) | 3 | 2 | 3 | 4 | 2 | 9 | **P3** | `customer-lens.ts` реализует ОДНУ фиксированную роль (клиент), не общий механизм «линза как переиспользуемая единица» — открытые развилки facet-doc (природа линзы, где материализуется, open/fixed enum) не закрыты НИ ОДНИМ решением. Строгий канон (`terminology.md` §4) определяет «линзу» как `ViewDef.kind` — `customer-lens.ts` им не является. Оценено консервативно как designed(1); флаг для владельца — граница спорная. |
| **03-progressive-disclosure** (`.../03-progressive-disclosure/`) | Нет цитируемой связи. `unverified`-по-коду: `view-compiler.ts` содержит реальный green `rollup` (subtree/direct агрегация, строки 113-119), но это агрегация **cost** (числа для cost-tree), НЕ 5-ступенчатая лестница `label→one-liner→summary→payload→трейс`, которую грань требует | **1** | 3 | 2 | 3 | 3 | 2 | 12 | **P2** | Соседний green-механизм (`rollup`) решает другой вопрос (числовая агрегация), не лестницу раскрытия. Facet-doc: 5 нерешённых развилок (число ступеней, rollup-механизм, `@context`, хранение трейса) — ничего не выбрано. |
| **04-temperature** (`.../04-temperature/`) | Нет источника вообще — `grep -rniE "temperature" packages/engine/src` даёт только несвязанный комментарий про `edge-passport` (`types.ts:26`) | **0** | 3 | 4 | 3 | 2 | 1 | 18 | **P2** | Ни поля, ни политики push-фильтрации по температуре нигде не закодировано и не процитировано в каноне как связка акт→линза. Полностью открытая грань. |
| **05-dual-audience** (`.../05-dual-audience/`) | Нет источника — `grep` по `dual-format\|human.readable\|dualAudience` даёт 0 совпадений | **0** | 3 | 4 | 4 | 3 | 1 | 16 | **P2** | R повышен (4): грань напрямую про Г4 — независимый канал проверки, если агент недоступен/скомпрометирован; сейчас такого канала нет вовсе. |
| **06-fractal-stability** (`.../06-fractal-stability/`) | Нет источника — `grep` по `part-?of\|composite\|fractal` в `packages/engine/src` даёт 0 совпадений | **0** | 3 | 4 | 3 | 4 | 1 | 9 | **P3** | Опирается на решение В2 (bitemporal, см. Тождество 02) как ПРЕДПОСЫЛКУ, которое само на глубине 1 — двойная нереализованность. |

**Средняя глубина Ц1 (Читаемость) = (1+1+1+0+0+0)/6 = 0.50**

## Ц2 Тождество — 6 граней

| Грань | Цепочка акт→линза | Глубина | V | G | R | C | Rdy | Priority | Бакет | Обоснование |
|---|---|---|---|---|---|---|---|---|---|---|
| **01-kriteriy-i-dedup** (`.../02-tozhdestvo/01-kriteriy-i-dedup/`) | `domain_event(same-as edge, LOCKED_MANY predicate) → current-state-fold (foldEdges/cardinalityOf, proven-code, predicates.ts) → customer-lens` (read). Тенант-код: `dedup/candidates.ts` (pure same-as кандидат-генератор), `dedup/same-as-writer.ts` (confirm/un-merge reversible acts) | **2** | 4 | 1 | 4 | 2 | 3 | 24 | **P2** | Реально построено и green-unit (32/32 в `@ff/ingest-rentacar`, включая 11 dedup-тестов + `predicates-as-data.test.ts` в ядре). Кернел-лок `LOCKED_MANY_PREDICATES=['same-as']` (`predicates.ts:49`) закрывает replay-безопасность структурно. НЕ green-product: коммит `a02f759` явно пишет «M3 wiring deferred» — не подключено к реальному продукт-слою ga-rentacar. |
| **02-tozhdestvo-vo-vremeni** (`.../02-tozhdestvo-vo-vremeni/`) | `domain_event → current-state-fold (L4, proven-code)` — цитировано в `01-building-blocks` п.1 как обслуживающее «Тождество, tozhdestvo-vo-vremeni — узел переживает свёртку» | **1** | 4 | 2 | 4 | 5 | 1 | 6.4 | **P3** | Слабая форма (I-1 Stable ID: id не меняется при апдейте) реально green (`envelope-validator.ts`, proven-by explain-chain). Но facet просит ПОЛНЫЙ bitemporal (valid-time+tx-time, `as-of T`) — `invariants.md` явно: «as-of/time-travel отложены из MVP per D-5; не доказывает v1» (I-1/I-4 сноска). `grep bitemporal\|valid-?time\|as-?of` в `packages/engine/src` = 0 совпадений. Решение В2 принято НА БУМАГЕ, не в коде. |
| **03-vetvleniye-i-varianty** (`.../03-vetvleniye-i-varianty/`) | Нет источника — `grep variant-?of\|branch-?of` в `packages/engine/src` = 0 | **0** | 3 | 4 | 4 | 3 | 2 | 32 | **P1** | ⚠ Живой риск: dedup-движок (01, ныне green-unit и ШИТ в ga-rentacar) **не имеет** защиты «руки прочь от вариантов» (идея явно названа в facet-doc 01 как нерешённая, P1). Пока 03 на глубине 0, у 01 нет предохранителя от случайного слияния намеренных сиблингов — R=4 обоснован именно эксплуатационно, не гипотетически. |
| **04-kompoziciya-i-tip** (`.../04-kompoziciya-i-tip/`) | Нет источника — `grep part-?of\|composite` в `packages/engine/src` = 0 | **0** | 3 | 4 | 3 | 4 | 1 | 9 | **P3** | Полностью открыто; 5 развилок facet-doc не решены (id композита, роль part-of, распад, смена типа, перенос граней). |
| **05-koreferenciya-i-konflikt** (`.../05-koreferenciya-i-konflikt/`) | Нет прямой цитаты в `01-building-blocks`. `unverified`-по-коду: `observation/latest-wins.ts` — реальный green-unit (8 тестов) редьюсер над `observation`-актами, но реализует ИМЕННО тот форк, который facet-doc НЕ предпочитает («выбрать победителя по свежести», не «обе + confidence», Г17 «спор виден» не выполняется — superseded сохраняются, но не помечены как конфликт для третьего) | **1** | 4 | 2 | 5 | 4 | 2 | 20 | **P2** | Facet-doc сам называет эту грань «самой тяжёлой и НЕ покрытой в L0» (дословно из related). Реальный код есть и green, но НЕ закрывает обещание грани (§3.1 п.3 не выполнен: конфликт не становится видимым третьему) — цепочка засчитана на 1, а не выше, несмотря на наличие теста. |
| **06-dvizhkovyy-dolg** (`.../02-tozhdestvo/06-dvizhkovyy-dolg/`) | Нет цитируемой связи (это «субстрат-долг», не грань в строгом смысле facet-doc сам это оговаривает). Реально в коде: журнал = массив в порядке вставки (позиционный порядок single-writer) — минимальная, недокументированная как контракт форма «глобального порядка» | **1** | 4 | 2 | 4 | 5 | 2 | 12.8 | **P2** | `grep HLC\|monotonic\|union-?find` в `packages/engine/src` = 0. Позиционный порядок акта в массиве де-факто существует (`latest-wins.ts` явно на него опирается: «journal POSITION is the only order that decides a winner»), но это НЕ спроектированный контракт (HLC/rassinhron-часов/конкурентная запись агентов, Г16) — только побочный эффект single-writer MVP. |

**Средняя глубина Ц2 (Тождество) = (2+1+0+0+1+1)/6 = 0.83**

---

## Сводка

- **Читаемость:** 6 граней, средняя глубина **0.50** (все ≤1; половина граней — 0, полностью не начаты: temperature, dual-audience, fractal-stability).
- **Тождество:** 6 граней, средняя глубина **0.83** (одна грань на 2 — kriteriy-i-dedup, единственная во всей выборке с реальным green-unit кодом; две на 0).
- **Общий паттерн:** ни одна из 12 граней НЕ достигла глубины 3 (green-product). Единственный green-unit случай (kriteriy-i-dedup) — тенантский код (`@ff/ingest-rentacar`), не кернел; ADR/ратификация отсутствуют.

### Топ-3 дыры (по Priority)

1. **03-vetvleniye-i-варианты** (Тождество) — Priority **32**, бакет **P1**. Живой риск: dedup (уже shipped, green-unit) не защищён от поедания намеренных вариантов — грань-предохранитель на глубине 0.
2. **01-kriteriy-i-dedup** (Тождество) — Priority **24**, бакет **P2**. Единственная грань выборки на глубине 2; не хватает только продукт-проводки (M3), готовность (Rdy=3) высокая.
3. **01-passport** (Читаемость) — Priority **21.3**, бакет **P2**. Fold-механизм green, но нет ни одного поля паспорта (price_hint/salience/temperature) в `EnvelopeNode` — весь Q1 открыт.

(Следом по Priority: `05-koreferenciya-i-konflikt`=20, `04-temperature`=18, `05-dual-audience`=16 — все P2.)

### Где не хватило данных

- **02-polysemy-lens**: граница «считать ли `customer-lens.ts` линзой» не решена каноном (`terminology.md` строго ограничивает термин `ViewDef.kind`, facet-doc и S7-синтез используют шире) — оценка глубины 1 консервативна, реальное значение может быть 2. Флаг для следующей волны/владельца.
- **06-dvizhkovyy-dolg**: сам факт, является ли это «гранью» в счётной модели (`01-building-blocks`/`02-values-lenses-acts-frame`) или сквозным субстрат-долгом, не разрешён исходными боксами — включена в таблицу по номеру папки на диске, но её V/G/R/C/Rdy носят более гипотетический характер, чем у остальных 11.
