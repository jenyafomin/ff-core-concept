---
node_type: analysis
title: "Фактический инвентарь: ценности · линзы · акты (с цитатами источников)"
status: draft
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
related:
  - ../README.md
  - ./02-values-lenses-acts-frame.analysis.md
  - ../../../02-project/core/01-brain/INDEX.md
  - ../../../02-project/core/01-brain/01-overview/01-values/GROWTH-MAP.md
  - ../../../02-project/core/00-kernel/terminology.md
  - ../../../02-project/core/00-kernel/invariants.md
  - ../../../architecture/ADR/ADR-0008-log-and-graph-cqrs.md
  - ../../../02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md
  - ../../../../packages/engine/src/core/types.ts
  - ../../../../packages/engine/src/core/projection.ts
  - ../../../../packages/engine/src/core/view-compiler.ts
  - ../../../../packages/engine/src/core/admission.ts
source:
  - packages/engine/src/core/types.ts
  - packages/engine/src/core/projection.ts
  - packages/engine/src/core/view-compiler.ts
  - packages/engine/src/core/admission.ts
  - docs/02-project/core/01-brain/INDEX.md
  - docs/02-project/core/01-brain/01-overview/01-values/GROWTH-MAP.md
  - docs/02-project/core/00-kernel/terminology.md
  - docs/02-project/core/00-kernel/invariants.md
  - docs/architecture/ADR/ADR-0008-log-and-graph-cqrs.md
  - docs/02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/abstract-reframe.md
---

# Фактический инвентарь: ценности · линзы · акты

> Метод: только то, что реально названо/закодировано, с путём-цитатой на каждую строку. Не выдумываю
> недостающее — где канон не называет вещь прямо, помечаю статус (`proven-code` / `designed-only` /
> `post-MVP` / `undefined-term`). Дополняет `./02-values-lenses-acts-frame.analysis.md` (тот файл —
> определения и рубрика; этот — факты и числа).

---

## Таблица 1 — ЦЕННОСТИ (грани)

### 1a. Корневые ценности (N=7)

| # | Ценность | Источник |
|---|----------|----------|
| Ц-1 | Читаемость | `docs/02-project/core/01-brain/01-overview/01-values/GROWTH-MAP.md` («7 замкнутых ценностей») |
| Ц-2 | Тождество | там же |
| Ц-3 | Доверие | там же |
| Ц-4 | Витальность | там же |
| Ц-5 | Суверенность | там же |
| Ц-6 | Реляционность | там же |
| Ц-7 | Согласие | там же |

Кросс-проверка: `docs/02-project/core/01-brain/INDEX.md` (таблица «7 ценностей», карточки V1-V7) — идентичный набор, идентичный порядок.

### 1b. Грани-декомпозиция (N=42 = 7 × 6, факт из дерева)

Каждая ценность имеет папку-декомпозицию с ровно 6 нумерованными фасет-подпапками (проверено `ls`):

| Ценность | Папка | Фасеты (6 шт., все проверены на диске) | Источник |
|---|---|---|---|
| Читаемость | `01-chitaemost/` | passport · polysemy-lens · progressive-disclosure · temperature · dual-audience · fractal-stability | `docs/02-project/core/01-brain/01-overview/01-values/01-chitaemost/` |
| Тождество | `02-tozhdestvo/` | kriteriy-i-dedup · tozhdestvo-vo-vremeni · vetvleniye-i-varianty · kompoziciya-i-tip · koreferenciya-i-konflikt · dvizhkovyy-dolg | `.../02-tozhdestvo/` |
| Доверие | `03-doverie/` | provenance · calibration · poisoning-defense · supersession-audit · concurrency-zombie · data-honesty | `.../03-doverie/` |
| Витальность | `04-vitalnost/` | salience-weight · consolidation-emergence · forgetting-lifecycle · reinterpretation · pending-open-loops · metabolism-governance | `.../04-vitalnost/` |
| Суверенность | `05-suverennost/` | self-describing · policy-as-data · engine-contract · foreign-residence · ownership-keys · constitutional-ceiling | `.../05-suverennost/` |
| Реляционность | `06-relyacionnost/` | edge-as-citizen · typed-edges-and-cascade · variants-and-templates · edge-decay · composition-and-emergence · conflict-cycles-and-scale | `.../06-relyacionnost/` |
| Согласие | `07-soglasie/` | referent · visibility · use-vs-read · consent-taint · revocation-erasure · custodial-override | `.../07-soglasie/` |

**N(ценности) = 7 (корни) ИЛИ 42 (грани, единица счёта для гипотезы «много»).** GROWTH-MAP.md явно называет фасет-слоты как ось углубления ценности (`01-explain…06-nuances` — целевая схема; текущие папки `NN-*` ей ПРЕДШЕСТВУЮТ, т.е. это переходное состояние, не финальная сетка).

---

## Таблица 2 — ЛИНЗЫ (проекции fold(journal))

Термин «линза» используется в каноне на ДВУХ уровнях строгости — это первое расхождение (см. ниже). Свожу оба.

| # | Линза | Статус | Источник |
|---|---|---|---|
| L1 | `cost-tree` | **proven-code** (реализована, view-def kind) | `packages/engine/src/core/types.ts:137` (`ViewDef.kind`) · `packages/engine/src/core/view-compiler.ts` (реализация) · `docs/02-project/core/00-kernel/terminology.md:198-200` («Три доказанных: `cost-tree`, `visible-to`, `actions-by-agent`») |
| L2 | `visible-to` | **proven-code** | те же источники |
| L3 | `actions-by-agent` | **proven-code** | те же источники |
| L4 | current-state-fold (граф/read-model) | **proven-code**, базовая проекция, которую L1-L3 читают через `from` | `packages/engine/src/core/projection.ts` (`project`/`foldInto`) · ADR-0008 §2 · `docs/02-project/core/00-kernel/invariants.md` I-5 |
| L5 | semantic-lens / RAG (`similar`-предикат) | **designed-only** — названа, НЕ найдена в коде (`grep similar packages/engine/src/core/*.ts` — 0 совпадений в view-compiler) | `docs/02-project/core/00-kernel/terminology.md:284-290` · `invariants.md:225-233` («RAG — подключаемая линза, а НЕ источник истины») |
| L6 | recall/salient (ранжированная память) | **designed-only**, явно выведена ВНЕ скоупа I-5 в отдельную проекцию | `invariants.md:113-116` (сноска-скоуп I-5, «Ranked/salient recall памяти — отдельная проекция под I-6») |
| L7 | provenance/explain-chain | **designed-only** (kernel-тест T-7, не отдельный view-def) | `docs/02-project/core/00-kernel/kernel-acceptance-tests.md:214` (`## T-7 · explain-chain`) · `invariants.md` (колонка `proven-by: explain-chain` на I-1..I-4) |
| L8 | access/audit-view (чтение `access_event`) | **designed-only** | `act-kinds.design.md` (строка `access_event`, «Read for audit/investigation only») |
| L9 | as-of/temporal | **post-MVP, отложена явно (D-5)** | `invariants.md:45,79` («as-of/time-travel отложены из MVP per D-5; не доказывает v1») |

**N(линзы) зависит от строгости прочтения термина:**
- **Строго (кернел-канон, terminology.md §4, «Три доказанных»): N = 3** (L1-L3).
- **Широко (включая базовую проекцию + все именованные-но-не-реализованные): N ≈ 9** (L1-L9).
- S7-синтез (`abstract-reframe.md`) добавляет ЧЕТВЕРТУЮ рамку: ветка-гипотеза / синк / кэш / новый-слой названы «**РОЛЯМИ одной операции `fold(journal)`**», а не отдельными линзами — т.е. это не 4 новых пункта к списку, а мета-утверждение о том, как ЛЮБАЯ линза используется.

---

## Таблица 3 — АКТЫ (виды в ленте-журнале, ActKind)

| # | ActKind | Меняет канон? | Реплеится? | Источник (код = истина) |
|---|---|---|---|---|
| A1 | `domain_event` | ДА — единственный вид, сворачиваемый в `state` | ДА (`rebuild --from journal`) | `packages/engine/src/core/types.ts:171` · `packages/engine/src/core/projection.ts` (`isProjectable`: «ONLY `domain_event` folds into canonical state») |
| A2 | `observation` | НЕТ | НЕТ (в канон); может — в свою memory-проекцию | `types.ts:172` · `act-kinds.design.md` §1 |
| A3 | `command` | НЕТ (до принятия — принятие само эмитит `domain_event`) | НЕТ, читается для explain-chain | `types.ts:173` · `act-kinds.design.md` §1 |
| A4 | `access_event` | НЕТ | НЕТ, аудит-окно | `types.ts:174` · `act-kinds.design.md` §1 |
| A5 | `agent_trace` | НЕТ | НЕТ, ephemeral (`docs/_log/`, gitignored) | `types.ts:175` · `act-kinds.design.md` §1 |
| A6 | `system_telemetry` | НЕТ | НЕТ, читается (не реплеится) линзой `cost-tree` | `types.ts:176` · `act-kinds.design.md` §1 |

**N(акты) = 6.** Источник истины — `packages/engine/src/core/types.ts:170-177` (`export const ACT_KINDS = [...]`), дословно совпадает с `act-kinds.design.md` (draft, не ратифицирован ADR-ом) §1 «шесть потоков одного конверта».

---

## Связи акт → линза → ценность (конкретные, с цепочкой)

1. **`domain_event` → current-state-fold (L4) → L1/L2/L3** — каждый акт бизнес-факта сворачивается в граф-проекцию; `cost-tree`/`visible-to`/`actions-by-agent` читают эту проекцию через стадию `from`. Обслуживает **Тождество** (Ц-2, грань `tozhdestvo-vo-vremeni` — узел переживает свёртку), **Читаемость** (Ц-1, `passport` — паспорт = read-time проекция, I-5), **Витальность** (Ц-4, `metabolism-governance`). Источник: `projection.ts` + ADR-0008 §2 + I-5.
2. **`system_telemetry` → `cost-tree` (L1)** — телеметрия НЕ реплеится в канон, а СУММИРУЕТСЯ линзой `cost-tree` (`cost_ref` per act). Обслуживает **Витальность** (Ц-4, грань `metabolism-governance` — стоимость/метаболизм субстрата). Источник: `act-kinds.design.md` таблица §1, строка `system_telemetry`.
3. **`access_event` ← пишется САМИМ `resolve()`** (не актором) → аудит-линза (L8, designed-only) → обслуживает **Доверие** (Ц-3, грань `provenance`/`supersession-audit`) и **Согласие** (Ц-7, грань `visibility`). Источник: `act-kinds.design.md` §1 («Written by `resolve()`/the PEP itself, not by the actor»).
4. **`command` → provenance/explain-chain (L7)** — читается кернел-тестом T-7 по цепочке `source → actor → command → policy decision → act → projection`. Обслуживает **Доверие** (Ц-3, грань `provenance`) и **Согласие** (Ц-7, грань `custodial-override` — кто санкционировал действие). Источник: `act-kinds.design.md` §1 + `kernel-acceptance-tests.md:214`.
5. **`observation` → recall/salient (L6, designed-only)** — единственная явно названная связь для НЕ-реализованной линзы. Обслуживала бы **Витальность** (Ц-4, грань `salience-weight`/`consolidation-emergence`) и **Тождество** (Ц-2). Источник: `act-kinds.design.md` §1 + `invariants.md:113-116` (I-6 scope note).
6. **`agent_trace` → НИКУДА (разрыв)** — явно помечен «Not replayed — pure observability/debug artifact», живёт в `docs/_log/` (gitignored), ни одна линза его не сворачивает. Формально должен бы обслуживать **Доверие** (объяснимость поведения агента), но цепочка сегодня НЕ замкнута. Источник: `act-kinds.design.md` §1, строка `agent_trace`.

---

## Проверка гипотезы «ценности МНОГО > линз МЕНЬШЕ > актов ЕЩЁ МЕНЬШЕ»

| Прочтение | N(ценности) | N(линзы) | N(акты) | Гипотеза держится? |
|---|---|---|---|---|
| Строгое (корни ценностей, кернел-линзы, ActKind) | 7 | 3 | 6 | **НЕТ — переворот на дне.** 3 < 6: строгих линз МЕНЬШЕ, чем видов актов. |
| Грани-ценности + широкие линзы | 42 | 9 | 6 | **ДА.** 42 > 9 > 6. |
| Грани-ценности + строгие линзы | 42 | 3 | 6 | **НЕТ — тот же переворот на дне** (3 < 6). |
| Корни-ценности + широкие линзы | 7 | 9 | 6 | **НЕТ — переворот в середине** (7 < 9, линз больше, чем ценностей). |

**Вывод.** Гипотеза владельца держится РОВНО в одном прочтении — считать ценности ГРАНЯМИ (42) И линзы ШИРОКО (9, включая 6 designed-only/post-MVP наравне с 3 proven-code). Она НЕ является математическим законом дерева — это подтверждает и сам frame-файл этого бокса (`02-values-lenses-acts-frame.analysis.md` §2 «Где воронка ВЫПИРАЕТ»). Дополнительно к его выпираниям (Согласие/Доверие требуют 1:1 акт+линзу) я нахожу **вторую точку слома** — она не про «прожорливые грани», а про САМ выбор гранулярности слоя «линза»: если считать линзами только то, что реально закодировано (L1-L4, ближе к 4, чем к 3, если включать current-state-fold), актов оказывается БОЛЬШЕ, чем линз, потому что 5 из 6 ActKind (`observation/command/access_event/agent_trace/system_telemetry`) сегодня НЕ имеют реализованной линзы-потребителя — только `domain_event` полностью замкнут в цепочку.

---

## Где доки/код расходятся (3 находки)

1. **Число ActKind в самом этом боксе расходится.** Сосед-файл `./02-values-lenses-acts-frame.analysis.md` §1.3 пишет «Виды из I-3-хвоста: `domain_event · observation · access_event · agent_trace · telemetry` (≈5)» — **пропущен `command`** и `system_telemetry` переименован в `telemetry`. Код (`types.ts:170-177`) и `act-kinds.design.md` §1 однозначно дают 6, включая `command`. Это не мелочь: `command` несёт свою governance-строку (propose-грант, explain-chain), пропуск меняет матрицу связности §2 того файла.
2. **Термин «линза» не имеет единого счёта в каноне.** `terminology.md` §4 (кернел-словарь) СТРОГО ограничивает линзу тремя доказанными view-def (`cost-tree/visible-to/actions-by-agent`) и явно отличает её от «projection» как общего класса (line 201: «линза — оформленная проекция… не всякая проекция оформлена как линза»). При этом S7-синтез (`abstract-reframe.md`) и frame-файл этого бокса используют «линза» гораздо шире — вплоть до того, что называют ветку/синк/кэш/слой «ролями fold(journal)», близко к синониму линзы. Карта покрытия обязана явно выбрать одно значение и пометить, иначе числа §«Проверка гипотезы» выше будут несопоставимы между волнами агентов.
3. **`act-kinds.design.md` — единственный источник governance-таблицы актов, но имеет `status: draft`, не ратифицирован ADR-ом**, хотя код (`types.ts`) уже реализует его буквально (тот же 6-элементный список, тот же порядок). Канон-статус ниже, чем код-статус — обратная ситуация тому, что обычно ловит doc-tree (обычно доки забегают вперёд кода; здесь код обогнал ратификацию). Кандидат на быструю ратификацию ADR, раз код уже это подтверждает (аналогично прецеденту S7/ADR-0008, где `docs/00-states/STATE.md` наоборот ЗАПАЗДЫВАЛ за кодом).

---

## Неполнота инвентаря (честно)

- Линзы L5-L9 подтверждены только ЦИТАТОЙ канона, не поиском по всему `packages/`; возможно есть частичные заготовки вне `core/` (не проверял `packages/engine/src/adapters/`, `surface/` целиком построчно на предмет semantic/recall-кода).
- Не проверял `packages/` за пределами `engine` (если есть другой пакет с независимым списком ActKind/линз — не найдено ни одного `grep`-совпадения, но это не 100%-исчерпывающий обход монорепо).
- Связь «линза → ценность» в разделе выше — МОИ проведённые связи по семантике грани (напр. `cost-tree`→`metabolism-governance`), НЕ прямая цитата канона, который такую матрицу нигде явно не строит (это и есть «волна 2» этого бокса, ещё не сделана — см. `../README.md` «Статус волн»).
