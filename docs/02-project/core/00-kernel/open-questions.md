---
id: kernel-open-questions
node_type: open-questions
status: active
owner: jenya.stasik@gmail.com
date: 2026-07-25
related:
  - terminology.md
  - invariants.md
  - axes-and-time.design.md
  - ../../../00-states/00-global-build/realization-plan/phase-1-engine/vertical-scenario.spec.md
  - ../../../00-states/00-global-build/realization-plan/phase-1-engine/README.md
  - ../../../_inbox/1-gpt-review/1-overview-rag-vs-system.md
  - ../../../_inbox/1-gpt-review/2-overview-direction.md
  - ../../../_inbox/1-gpt-review/3-ideas.md
  - ../../open-questions/INDEX.md
---

# ❓ Kernel / Substrate — реестр открытых вопросов (KQ)

> ✅ **РАТИФИКАЦИЯ 2026-07-26** (владелец: «Стартуй ратификацию»). Закрыты как **RATIFIED**:
> **KQ-3 · KQ-5 · KQ-6 · KQ-7 · KQ-10 · KQ-12 · KQ-13 · KQ-14**; **KQ-11** — частично (фасет
> рефлексивности `recallFeedback`, ядро проекция-vs-node OPEN). Акт-истина:
> `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`. Открытыми остаются
> **KQ-1, KQ-2, KQ-4🔴, KQ-8, KQ-9🔴, KQ-11(ядро)**.

> **PLACEMENT (2026-07-25, staged, reversible):** папка `00-kernel/` заведена как staging-дом канона
> субстрата (terminology · invariants · axes-and-time · этот реестр). Размещение **обратимо** — если
> канон получит постоянный дом, файл переезжает целиком (LOSE-NOTHING, `git mv`, редирект-заглушка).
> Пока `00-kernel/` — единственный дом для kernel-вопросов; модульный указатель — в
> `../../open-questions/INDEX.md` (строка «kernel (субстрат)»).

Единый реестр открытых решений по **ядру/субстрату**, собранный по итогам ночных циклов проектирования
**C1–C3** и `phase-1-engine/README.md`. Принцип: **LOSE-NOTHING** — все всплывшие вопросы захвачены, ни
один не потерян. Каждый вопрос = запись с 6 полями:

- **Вопрос (crisp)** — сжатая формулировка.
- **Где поднят** — документ + цикл.
- **Статус** — `OPEN` / `PROVISIONAL-answer`.
- **Провизорный ответ** — если есть.
- **Кто решает** — `owner` / `needs-ADR`.
- **Что блокирует** — downstream-работа, стоящая на этом вопросе.

---

## 🔴 Блокирует больше всего (гейтит downstream)

Три вопроса, от которых зависит наибольший объём последующей работы — решать сознательно, не по умолчанию:

1. **KQ-9 · Persistence-as-policy ADR + file-first type list** — гейтит C5-ADR, всю тему хранения и
   опт-ин типов «файл-истина».
2. ~~**KQ-10 · `sum(cost)` = R1 data-enum или R3 new-fold**~~ — ✅ **RATIFIED 2026-07-26** (B1-e): выбор
   из enum = R1 data; расширение enum = R3 код+ADR; **ship в Phase-1** → 🔴-блокер снят.
3. **KQ-4 · Trace-leg редакции deny-field (I-7 / kernel-тест 5)** — гейтит закрытие инварианта I-7 и
   kernel-теста 5; пока не решён — trace-нога теста НЕ верифицирована.

---

## Область 1 — Kernel primitives (примитивы ядра)

### KQ-1 · Assertion как 7-й примитив?
- **Вопрос (crisp):** является ли **assertion** отдельным 7-м примитивом ядра, или роль assertion уже
  играет поле `body` конверта (envelope)?
- **Где поднят:** `terminology.md` §7.1 + `invariants.md` — помечено **UNSURE**. Цикл C1.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** owner (возможно needs-ADR, если ядро получает 7-е существительное).
- **Что блокирует:** решение, получает ли kernel 7-й noun (число примитивов ядра).

### KQ-2 · Relation — самостоятельная адресуемая единица?
- **Вопрос (crisp):** **relation** — это отдельная адресуемая единица, или хранится как пары-рёбра
  внутри конверта узла-источника? Relation является access-bearing (несёт доступ) → риск утечки по
  ADR-0004.
- **Где поднят:** `terminology.md`, запись «relation»; **НЕ ратифицировано ADR**. Цикл C1.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** needs-ADR (адресуемость + политика на рёбрах).
- **Что блокирует:** адресуемость relation + policy на edges (leak-risk по ADR-0004).

---

## Область 2 — Policy / Access (политика и доступ)

### KQ-3 · Policy self-reference
- **Вопрос (crisp):** можно ли редактировать саму политику через тот же `resolve()`, которым она
  управляет?
- **Где поднят:** `terminology.md` §7.5 + open-section в `invariants.md` (теперь согласованы — оба
  считают ответ провизорным). Цикл C1–C2.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-a).
- **Ратифицировано:** политика правится **только** через `core:manage-*` + genesis-нота (meta-cap-gate).
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner.
- **Что разблокировано:** модель самоуправления политикой (gate зафиксирован).

### KQ-4 · Trace-leg редакции deny-field-everywhere (GPT test 5 / I-7)
- **Вопрос (crisp):** как denied-поле удерживается вне `agent_trace`, если `agent_trace` — это WRITE-поток,
  а не gated через `resolve()`?
- **Где поднят:** `vertical-scenario.spec.md` Q#5; связь с инвариантом **I-7** и kernel-тестом 5
  (GPT-review test 5). Цикл C2–C3.
- **Статус:** `OPEN`.
- **Провизорный ответ:** два варианта — (1) trace-writer редактирует поле ДО сериализации; (2) trace =
  проекция, clamped на чтении. Пока не выбрано — trace-нога теста 5 НЕ верифицирована.
- **Кто решает:** needs-ADR (или owner-решение по механике trace).
- **Что блокирует:** закрытие инварианта I-7 / kernel-теста 5. 🔴 (см. топ-блокеры).

---

## Область 3 — Storage / Temporal (хранение и время)

### KQ-5 · Bitemporal в v1?
- **Вопрос (crisp):** нужно ли valid-time (`validFrom`/`validTo`) вообще в v1, или достаточно одного
  `recordedAt` — с valid-time как опт-ин на тип (`meta:type` объявляет `temporal: uni|bi`)?
- **Где поднят:** `axes-and-time.design.md` §5 Q1. Цикл C2.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-b).
- **Ратифицировано:** `temporal: uni | bi` опт-ин на тип, **дефолт `uni`** (per §P-1 — свойство типа).
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner.
- **Что разблокировано:** темпоральную модель ядра v1; форму `meta:type`.

### KQ-6 · `recordedAt` только на акте?
- **Вопрос (crisp):** должен ли `recordedAt` жить ТОЛЬКО на акте (envelope-summary derived, а не второй
  источник времени)?
- **Где поднят:** `axes-and-time.design.md` §5 Q2. Цикл C2.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-b).
- **Ратифицировано:** `recordedAt` живёт **только на акте** (envelope-summary derived, не второй источник).
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner.
- **Что разблокировано:** single source of record-time.

### KQ-7 · Valid-time: интервал vs точка + close-event
- **Вопрос (crisp):** valid-time как интервал `[validFrom, validTo)` или как точка + отдельный
  close-event?
- **Где поднят:** `axes-and-time.design.md` §5 Q3. Цикл C2.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-b).
- **Ратифицировано:** valid-time = **интервал** `[validFrom, validTo)` (не точка + close-event).
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner.
- **Что разблокировано:** представление valid-time (форма хранения интервалов).

### KQ-8 · Что считается deletion?
- **Вопрос (crisp):** что такое «удаление» — tombstone, projection-hide или physical erase?
- **Где поднят:** `invariants.md` open-section; на этом держатся **I-4 / I-12**, но термин не определён.
  Цикл C1–C2.
- **Статус:** `OPEN` (ведётся в **ADR-0007**; день-1-минимум G3 = approved). Блок-4 совет «эрейж ⟂ file-first/git» — pending.
- **Провизорный ответ:** режим удаления = свойство per type/policy `hide | prune | shred` (ADR-0007 §b);
  `hide` дефолт; **`shred` ограничен file-first-границей** (crypto-shred недоказуем против git-payload — B3-d,
  ADR-0007 OQ-7). Payload-separability + erasure-as-act = предлагаемый I-15 (свод carve-out I-4 в `I-15-proposal §2-bis`).
- **Кто решает:** needs-ADR (ADR-0007 текст) + owner (KQ-8-Q1/Q2) + Блок-4 совет (file-first-эрейж).
- **Что блокирует:** инварианты I-4 / I-12; семантику удаления; ратификацию текста ADR-0007.

### KQ-9 · Persistence-as-policy ADR + file-first type list
- **Вопрос (crisp):** формализовать «хранение как политику» (D-1 ратифицирован как рамка, ADR ожидается)
  — и какие типы являются file-first (опт-ин «файл-истина»)?
- **Где поднят:** `phase-1-engine/README.md` §📌.1. Цикл C3.
- **Статус:** `PROVISIONAL-answer` (рамка D-1 принята; список и ADR — открыты).
- **Провизорный ответ:** D-1 = frame ратифицирована; конкретный ADR + список file-first типов — pending.
- **Кто решает:** needs-ADR (C5 ADR).
- **Что блокирует:** C5-ADR; всю тему хранения + опт-ин типов. 🔴 (см. топ-блокеры).

---

## Область 4 — Engine / View (движок и представления)

### KQ-10 · `sum(cost)` — R1 data-enum или R3 new-fold?
- **Вопрос (crisp):** `sum`/`avg`/`count` в стадии `shape` вью — это значение data-enum (R1) или новый
  fold (код движка, R3)?
- **Где поднят:** `vertical-scenario.spec.md` Q#6 + `phase-1-engine/README.md` («Заповеди
  расширяемости», README запрещает новые folds из Phase 1). Цикл C3.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-e).
- **Ратифицировано:** **выбор** агрегатора из enum (`sum/avg/count`) = R1 data (свойство вью);
  **расширение** enum = R3 код+ADR (жёсткая граница). **Ship в Phase-1** — шаг 10 не откладывается.
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner.
- **Что разблокировано:** заявку «step 10 доказан в Phase 1» (🔴-блокер снят).

---

## Область 5 — Vertical scenario specifics (специфика вертикального сценария)

### KQ-11 · Memory (step 6): проекция или first-class node?
- **Вопрос (crisp):** «память» на шаге 6 — это чистая проекция над узлом-задачей (ноль новых узлов), или
  first-class `type:memory` узел с ребром `recalls → task`? Решает: `domain_event` vs `observation`.
- **Где поднят:** `vertical-scenario.spec.md` (Q). Цикл C3.
- **Статус:** 🟡 `PARTIAL` — фасет рефлексивности ✅ RATIFIED (2026-07-26, B2-a); **ядро OPEN**.
- **Ратифицировано (фасет):** рефлексивность памяти = свойство `recallFeedback: off | passive | active`,
  дефолт `passive`; `active` — с клапаном затухания. Дом: `../prefer-properties-over-poles.design.md` §5.
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Осталось OPEN (ядро, = B3-a/KQ-11-Q2):** проекция vs first-class node → `domain_event` vs
  `observation`. 🔧 **Блок-3 фикс B3-a применён (2026-07-27):** 3-й дом `act-kinds.design.md §5` сведён —
  добавлен RECONCILIATION-указатель на единый дом-истину (L0 + `kq11-L0-reconciliation`); провизорный канон =
  «проекция · observation-акт · insight-EDGE, НЕ `type:memory` узел». Осталось = **ратификация KQ-11-Q2
  владельцем** (механика сведена, дубль-домов больше нет). KQ-11-Q4 (carve-out I-5) закрыт как мнимый (B3-c).
- **Кто решает:** owner (ратифицировать KQ-11-Q2; механика Блока 3 готова).
- **Что блокирует:** классификацию шага 6; модель памяти в сценарии.

### KQ-12 · Назвать конкретное hidden-поле + агента (step 8 falsifiability)
- **Вопрос (crisp):** назвать в seed конкретное скрытое поле + агента, чтобы шаг 8 был фальсифицируемым.
- **Где поднят:** `vertical-scenario.spec.md` (Q). Цикл C3.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-c).
- **Ратифицировано:** `salary`/`person` field-level deny = канон-пример фальсифицируемости шага 8;
  механизм под ним = видимость поля через policy-as-data (PROPERTY).
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner (конкретный seed — builder при написании).
- **Что разблокировано:** фальсифицируемость шага 8 (конкретность deny-теста).

### KQ-13 · Добавить 11-й шаг plugin-upgrade?
- **Вопрос (crisp):** добавить 11-й шаг «plugin-upgrade»? GPT test 6 (plugin-upgrade) — единственный
  kernel-тест, который single-lifecycle vertical НЕ покрывает.
- **Где поднят:** `vertical-scenario.spec.md`, mapping тестов. Цикл C3.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-d).
- **Ратифицировано:** добавить 11-й шаг «plugin-upgrade» в vertical-сценарий (покрывает GPT test 6).
  Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner.
- **Что разблокировано:** полноту покрытия kernel-тестов вертикальным сценарием (test 6).

---

## Область 6 — Strategy (стратегия)

### KQ-14 · Go-wide-now vs consolidate-deep-first
- **Вопрос (crisp):** идти вширь сейчас или сперва консолидировать вглубь? killer-README предписал
  «следующий ход = консолидация + глубина (B2/B4 + depth), НЕ рост вширь», а Phase 1 = рост вширь
  (service + PG + scale). Решить сознательно, не по умолчанию.
- **Где поднят:** `phase-1-engine/README.md` §📌.3 + SYNTHESIS critic #3. Цикл C3.
- **Статус:** ✅ `RATIFIED` (2026-07-26, B1-f).
- **Ратифицировано:** **консолидация ВГЛУБЬ, не вширь** (killer-README): следующий ход = глубина/B2/B4,
  не рост service+PG+scale. Акт: `./decisions/2026-07-26-ratification-p1-block1-b2a.decision.md`.
- **Кто решал:** owner.
- **Что разблокировано:** направление Phase 1 (осознанный выбор глубины).

---

## Сводка

| id | Область | Вопрос (кратко) | Статус | Кто решает |
|---|---|---|---|---|
| KQ-1 | primitives | assertion = 7-й примитив? | OPEN | owner |
| KQ-2 | primitives | relation — адресуемая единица? | OPEN | needs-ADR |
| KQ-3 | policy | policy self-reference через resolve()? | ✅ RATIFIED (B1-a) | owner |
| KQ-4 🔴 | policy | trace-leg редакции deny-field (I-7) | OPEN | needs-ADR |
| KQ-5 | temporal | bitemporal в v1? | ✅ RATIFIED (B1-b) | owner |
| KQ-6 | temporal | recordedAt только на акте? | ✅ RATIFIED (B1-b) | owner |
| KQ-7 | temporal | valid-time интервал vs точка | ✅ RATIFIED (B1-b) | owner |
| KQ-8 | temporal | что считается deletion? | OPEN (Блок 4 совет) | needs-ADR |
| KQ-9 🔴 | temporal | persistence-as-policy ADR + file-first | PROVISIONAL | needs-ADR |
| KQ-10 | engine | sum(cost) R1 vs R3 | ✅ RATIFIED (B1-e) | owner |
| KQ-11 | vertical | memory step 6: проекция vs node | 🟡 PARTIAL (B2-a done; ядро OPEN) | owner |
| KQ-12 | vertical | назвать hidden-поле + агента (step 8) | ✅ RATIFIED (B1-c) | owner |
| KQ-13 | vertical | добавить 11-й plugin-upgrade шаг? | ✅ RATIFIED (B1-d) | owner |
| KQ-14 | strategy | go-wide vs consolidate-deep | ✅ RATIFIED (B1-f) | owner |

**Инвариант:** вопрос по ядру, всплывший в цикле, но не занесённый сюда = процессная ошибка
(см. `../../open-questions/INDEX.md` → process/docs-first-and-question-capture).
