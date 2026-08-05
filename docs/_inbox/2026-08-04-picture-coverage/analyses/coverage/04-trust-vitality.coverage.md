---
node_type: analysis
title: "Покрытие корней Доверие (Ц-3) и Витальность (Ц-4) — 12 граней, глубина цепочки, приоритет дыр"
status: draft
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
related:
  - ../README.md
  - ../01-building-blocks.analysis.md
  - ../02-values-lenses-acts-frame.analysis.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/GROWTH-MAP.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/03-doverie/README.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/04-vitalnost/README.md
  - ../../../../02-project/core/00-kernel/invariants.md
  - ../../../../02-project/core/00-kernel/kernel-acceptance-tests.md
  - ../../../../02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md
  - ../../../../../packages/engine/src/core/view-compiler.ts
  - ../../../../../packages/engine/src/core/resolve.ts
  - ../../../../../packages/engine/src/core/projection.ts
source:
  - docs/02-project/core/01-brain/01-overview/01-values/03-doverie/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/03-doverie/01-provenance/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/03-doverie/02-calibration/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/03-doverie/03-poisoning-defense/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/03-doverie/04-supersession-audit/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/03-doverie/05-concurrency-zombie/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/03-doverie/06-data-honesty/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/01-salience-weight/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/02-consolidation-emergence/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/03-forgetting-lifecycle/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/04-reinterpretation/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/05-pending-open-loops/README.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/06-metabolism-governance/README.md
  - docs/02-project/core/00-kernel/invariants.md
  - docs/02-project/core/00-kernel/kernel-acceptance-tests.md
  - docs/02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md
  - packages/engine/src/core/view-compiler.ts
  - packages/engine/src/core/resolve.ts
  - packages/engine/src/core/projection.ts
  - packages/engine/src/core/envelope-validator.ts
  - packages/engine/src/surface/cli.ts
  - packages/engine/test/invariants.test.ts
  - packages/engine/test/capability.test.ts
---

# Покрытие: Доверие (Ц-3) и Витальность (Ц-4)

> Метод: для каждой грани — реальная цепочка `акт → линза → ответ` (код = истина, `grep`-проверено),
> глубина 0-3 по шкале волны 2, и Priority для дыр (глубина < 3). Ссылки на `01-building-blocks.analysis.md`
> и `02-values-lenses-acts-frame.analysis.md` как базис; расхождения с их выводами — отмечены явно.

---

## 0. Проверка предпосылки задания (факт-чек по коду)

Задание просит проверить 3 утверждения инвентаря. Проверено `grep`/чтением кода (`packages/engine/src/core/`):

1. **`agent_trace` не сворачивается ни в одну линзу → дыра Доверия.** **ПОДТВЕРЖДЕНО.** `projection.ts:7`
   явно: «agent_trace... side-journals that ride the same log but NEVER touch the graph's state». Нет ни
   одного `grep`-совпадения на `agent_trace` вне `types.ts`/комментария в `projection.ts` — ни линзы, ни
   consumer'а. Подтверждено и самим `act-kinds.design.md` §4: «no capability gate today — this is exactly
   the gap».
2. **`access_event`/explain-chain designed-only → Доверие/Согласие.** **ПОДТВЕРЖДЕНО, СИЛЬНЕЕ чем в
   инвентаре.** `access_event` не только не имеет линзы — он **вообще не пишется кодом**: `grep access_event
   resolve.ts` = 0 совпадений, хотя design-doc заявляет «written by `resolve()`/the PEP itself». CLI
   (`surface/cli.ts`) не имеет команд `inspect`/`explain` — T-7 explain-chain (6-звенная цепочка) **не
   собирается кодом нигде**, несмотря на то что `kernel-acceptance-tests.md:232` маркирует T-7 как
   «**Phase-1 status: REAL**». Эта пометка REAL относится только к пред-условиям I-1/I-2 (actor+provenance
   на конверте, проверено `envelope-validator` + `invariants.test.ts:189`), а не к самой сборке цепочки —
   **канон здесь завышает статус относительно кода** (расхождение, аналогичное найденному в
   `01-building-blocks.analysis.md` находка №3, но в обратную сторону серьёзности).
3. **`system_telemetry`→`cost-tree`→Витальность работает.** **НЕ ПОДТВЕРЖДЕНО, ТРЕБУЕТ ПРАВКИ базиса.**
   `act-kinds.design.md:231-234` §5 сам говорит: «`system_telemetry` — **deferred as its own stream**. Cost
   accounting today rides on `domain_event.cost_ref` pointing at a `snapshot` node... which is sufficient for
   step 10's `cost-tree`». Код подтверждает: `view-compiler.ts:67` (`costTree`) читает числовое поле
   (`body.tokens` по умолчанию) с узлов, связанных ребром `measures` — это узлы-снапшоты, заведённые как
   **`domain_event`**, НЕ поток `system_telemetry` (который нигде не `grep`-ается в `packages/engine/src/`).
   `cost-tree` — реально **green-product** линза (протестирована в `invariants.test.ts`/`capability.test.ts`,
   включая gated-режим через `resolve()`), но её вход — `domain_event`, а не `system_telemetry`. Более того,
   `cost-tree` считает СУММУ токенов — она НЕ реализует ни один из 6 механизмов Витальности (decay,
   consolidation, forgetting, reinterpretation, pending, governance-ceiling); это соседний измерительный
   примитив, а не покрытие грани `06-metabolism-governance`. **Правка reconciled-базиса:** зелёная цепочка —
   `domain_event.cost_ref → snapshot → cost-tree`, `system_telemetry` как ActKind остаётся полностью
   неподключённым (ни линзы, ни кода записи) — та же категория дыры, что `agent_trace`, просто не названная
   в задании явно.

---

## 1. Таблица — Доверие (Ц-3), 6 граней

| Грань (путь) | Цепочка акт→линза | Глубина | Обоснование |
|---|---|:---:|---|
| **01 provenance** (`03-doverie/01-provenance/`) | `domain_event` (actor+provenance обязательны) → нет отдельной линзы; facet требует ребро `wasDerivedFrom` + пара origin/effective — не в коде | **1** | I-1/I-2 (stable id, actor+provenance) — green-unit на уровне ЯДРА (`envelope-validator` + `invariants.test.ts:189`), но это НЕ закрывает обещание грани («кто ДО СИХ ПОР ручается» ≠ «кто создал») — развилки 1-4 не решены, `wasDerivedFrom` не смоделирован |
| **02 calibration** (`02-calibration/`) | Задуманный акт: `observation`/`access_event` → байесовский пересчёт confidence — НЕ в коде (`grep confidence packages/engine/src` = 1 совпадение, комментарий про edge-meta, не механизм) | **1** | Чистый designed-only; развилка 1 (движок vs садовник) прямо помечена как сквозной нерешённый спин |
| **03 poisoning-defense** (`03-poisoning-defense/`) | `access_event` (ActKind объявлен в `types.ts`, но НЕ пишется кодом, см. §0.2) → роль «верификатор» не существует | **1** | Designed-only; хуже соседей — даже опорный акт (`access_event`) нигде не эмитируется |
| **04 supersession-audit** (`04-supersession-audit/`) | `contradicted-by` self-annul + bitemporal as-of (L9) → as-of явно **post-MVP, D-5** (`invariants.md:45,79`) | **1** | Designed-only, самая дальняя от кода — зависимая линза (as-of) сама отложена, без даты возврата |
| **05 concurrency-zombie** (`05-concurrency-zombie/`) | Merge-протокол / `conflicts-with` ребро — ничего в коде (`grep conflicts-with` = 0) | **1** | Designed-only, изолированная грань — не делит инфраструктуру ни с одной green-лапой |
| **06 data-honesty** (`06-data-honesty/`) | Guard на `envelope-validator` при записи (unit/locale/currency) → **не реализовано** (`grep unit\|locale\|currency envelope-validator.ts` = 0) | **1** | Designed-only, но READY выше среднего: место внедрения (`envelope-validator`, уже green-unit gate для I-1..I-4) существует и переиспользуемо без нового движка |

**Средняя глубина Ц-3 (Доверие): 1.0 / 3** (все 6 граней designed-only; ни одна не достаёт до green-unit хотя бы частично для СВОЕЙ специфики — примыкающий green-unit есть только у kernel-инвариантов I-1/I-2, которые покрывают лишь узкую базу «actor+provenance на акте», не полное обещание ни одной грани).

### Приоритет дыр — Ц-3 (V=4, конституционная; G=2 designed-only везде)

| Грань | R | C | Rdy | Priority=(V×G×R×Rdy)/C | Бакет |
|---|:---:|:---:|:---:|:---:|:---:|
| **06 data-honesty** | 5 (тихая ложь единиц/валюты, ретрофит невозможен — сам канон помечает «заложить СЕЙЧАС») | 2 (поле + guard в уже существующем validator) | 2 (validator-гейт green-unit, переиспользуем) | **40** | **P1** |
| **01 provenance** | 4 (граф без «кто ручается» — предпосылка доверия агента к записи) | 3 (новый edge-тип + origin/effective split, модуль) | 2 (I-1/I-2 baseline green-unit) | **21.3** | P2 |
| **02 calibration** | 5 (флагманский катастроф-сценарий Opus #6: агент верит устаревшему числу) | 4 (новый примитив движка с нуля) | 1 | 10 | P3 |
| **03 poisoning-defense** | 5 (без барьера calibration тривиально отравляется) | 4 (роль-верификатор + contagion threshold) | 1 | 10 | P3 |
| **04 supersession-audit** | 5 (тот же катастроф-сценарий, активная сторона) | 5 (bitemporal-аудит + as-of, самый дорогой) | 1 | 8 | P3 |
| **05 concurrency-zombie** | 3 (edge-case многописательности, уже сглажен единой моделью doc-tree) | 4 | 1 | 6 | P3 |

---

## 2. Таблица — Витальность (Ц-4), 6 граней

| Грань (путь) | Цепочка акт→линза | Глубина | Обоснование |
|---|---|:---:|---|
| **01 salience-weight** (`04-vitalnost/01-salience-weight/`) | Формула decay/reinforcement (Generative Agents × W-TinyLFU) — НЕ в коде (`grep salience\|decay packages/engine/src` = 0) | **1** | Designed-only, развилки 1-4 (формула, симметрия, что считать использованием, где хранить параметры) все открыты |
| **02 consolidation-emergence** (`02-consolidation-emergence/`) | `derived_from`-узел/ребро-инсайт — не в коде; косвенная опора на I-6 (projection id+version, green-unit) для будущей трассируемости | **1** | Designed-only; I-6 даёт ТОЛЬКО инфраструктуру версионирования проекций вообще, не сам механизм эмердженса |
| **03 forgetting-lifecycle** (`03-forgetting-lifecycle/`) | Конечный автомат стадий видимости + событие-причина — не в коде | **1** | Designed-only; риск «тихой эрозии» прямо назван нерешённым (развилка 3) |
| **04 reinterpretation** (`04-reinterpretation/`) | Заявлен как переиспользование bitemporal-версионирования (В2, «уже решено» в L0) → но bitemporal **нигде не реализован** в `packages/engine/src/` (`grep bitemporal\|validTime` = 0) | **1** | Designed-only; ссылка «уже решено» — решение НА БУМАГЕ (L0-документ), не код; ложная надежда на переиспользование |
| **05 pending-open-loops** (`05-pending-open-loops/`) | Поле/ребро `pending`, не участвует в decay — не в коде | **1** | Designed-only, но концептуально простая грань (сама признаёт «локальная», не завязана на инфру других граней) |
| **06 metabolism-governance** (`06-metabolism-governance/`) | Бюджет-потолок + садовник + dirty-list → НЕ реализовано (`grep budget\|metabolism\|garden packages/engine/src` = 0). Единственная смежная green-product линза — `cost-tree` (сумма токенов), но она НЕ ставит потолок и не управляет ничем (см. §0.3) | **1** | Designed-only; `cost-tree` — измерительный примитив-сосед, ошибочно засчитываемый инвентарём как покрытие этой грани — на деле обещание грани (ceiling enforcement, DB-control) не закрыто |

**Средняя глубина Ц-4 (Витальность): 1.0 / 3** (все 6 граней designed-only; `cost-tree`, единственная green-product линза рядом с этим корнем, покрывает измерение стоимости, но НЕ покрывает ни один из 6 механизмов витальности — глубина остаётся 1 у всех, поправка к базису задания в §0.3).

### Приоритет дыр — Ц-4 (V=3 «значимая», кроме 06 — V=4, явно названа инвариантом «Г15»; G=2 везде)

| Грань | R | C | Rdy | Priority=(V×G×R×Rdy)/C | Бакет |
|---|:---:|:---:|:---:|:---:|:---:|
| **06 metabolism-governance** | 5 (владелец прямым текстом: «Витальность — первая ценность, которая ломается при росте базы») | 5 (новый акт+линза+инфра dirty-list, самый дорогой во всём боксе) | 2 (`cost-tree` — переиспользуемый измерительный кирпич) | **16** | **P2** |
| **05 pending-open-loops** | 4 (незакрытое обещание тихо тонет в затухании — реальный провал для владельца) | 2 (простое поле/ребро + таймаут) | 1 | **12** | **P2** |
| **03 forgetting-lifecycle** | 4 («тихая эрозия» без сигнала) | 3 | 1 | 8 | P3 |
| **02 consolidation-emergence** | 3 | 4 | 2 (I-6 versioning-инфра) | 9 | P3 |
| **01 salience-weight** | 3 | 3 | 1 | 6 | P3 |
| **04 reinterpretation** | 3 | 3 (переоценка стоимости после находки «bitemporal не в коде») | 1 | 6 | P3 |

---

## 3. Сводка

- **Ц-3 Доверие:** 6/6 граней глубина 1 (designed-only), средняя = **1.0**. Топ-дыра **06 data-honesty
  (P1, Priority=40)** — единственная P1 во всём боксе; далее **01 provenance (P2, 21.3)**.
- **Ц-4 Витальность:** 6/6 граней глубина 1 (designed-only), средняя = **1.0**. Топ-дыры **06
  metabolism-governance (P2, 16)** и **05 pending-open-loops (P2, 12)**.
- **Ни одна из 12 граней не достигает глубины ≥2.** Единственные green-код лапы рядом с этими корнями —
  kernel-инварианты I-1/I-2 (Доверие, узко: actor+provenance на акте) и линза `cost-tree` (Витальность,
  узко: сумма токенов) — обе смежные строительные блоки, ни одна не закрывает обещание своей грани целиком.
