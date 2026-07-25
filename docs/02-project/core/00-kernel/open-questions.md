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
2. **KQ-10 · `sum(cost)` = R1 data-enum или R3 new-fold** — гейтит заявку «step 10 доказан в Phase 1»;
   при R3 шаг 10 vertical-сценария откладывается.
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
- **Статус:** `PROVISIONAL-answer`.
- **Провизорный ответ:** контрольная точка — **meta-cap-gate** (`core:manage-*`); финальный ответ OPEN
  до ADR по persistence/policy.
- **Кто решает:** needs-ADR (persistence/policy).
- **Что блокирует:** финализацию модели самоуправления политикой.

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
- **Статус:** `OPEN`.
- **Провизорный ответ:** склонность к `recordedAt`-only + per-type opt-in bitemporal (не подтверждено).
- **Кто решает:** owner (возможно needs-ADR при закреплении temporal-модели).
- **Что блокирует:** темпоральную модель ядра v1; форму `meta:type`.

### KQ-6 · `recordedAt` только на акте?
- **Вопрос (crisp):** должен ли `recordedAt` жить ТОЛЬКО на акте (envelope-summary derived, а не второй
  источник времени)?
- **Где поднят:** `axes-and-time.design.md` §5 Q2. Цикл C2.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** owner.
- **Что блокирует:** число источников времени (single source of record-time).

### KQ-7 · Valid-time: интервал vs точка + close-event
- **Вопрос (crisp):** valid-time как интервал `[validFrom, validTo)` или как точка + отдельный
  close-event?
- **Где поднят:** `axes-and-time.design.md` §5 Q3. Цикл C2.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** owner (зависит от KQ-5).
- **Что блокирует:** представление valid-time (форму хранения интервалов).

### KQ-8 · Что считается deletion?
- **Вопрос (crisp):** что такое «удаление» — tombstone, projection-hide или physical erase?
- **Где поднят:** `invariants.md` open-section; на этом держатся **I-4 / I-12**, но термин не определён.
  Цикл C1–C2.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** needs-ADR (пересечение с persistence/consent-erasure).
- **Что блокирует:** инварианты I-4 / I-12; семантику удаления.

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
- **Статус:** `OPEN`.
- **Провизорный ответ:** если R3 — vertical step 10 **откладывается** (README банит новые folds из
  Phase 1).
- **Кто решает:** owner / needs-ADR (классификация изменения R1 vs R3).
- **Что блокирует:** заявку «step 10 доказан в Phase 1». 🔴 (см. топ-блокеры).

---

## Область 5 — Vertical scenario specifics (специфика вертикального сценария)

### KQ-11 · Memory (step 6): проекция или first-class node?
- **Вопрос (crisp):** «память» на шаге 6 — это чистая проекция над узлом-задачей (ноль новых узлов), или
  first-class `type:memory` узел с ребром `recalls → task`? Решает: `domain_event` vs `observation`.
- **Где поднят:** `vertical-scenario.spec.md` (Q). Цикл C3.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** owner.
- **Что блокирует:** классификацию шага 6 (domain_event vs observation); модель памяти в сценарии.

### KQ-12 · Назвать конкретное hidden-поле + агента (step 8 falsifiability)
- **Вопрос (crisp):** назвать в seed конкретное скрытое поле + агента, чтобы шаг 8 был фальсифицируемым.
- **Где поднят:** `vertical-scenario.spec.md` (Q). Цикл C3.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** owner (или builder при написании seed).
- **Что блокирует:** фальсифицируемость шага 8 (конкретность deny-теста).

### KQ-13 · Добавить 11-й шаг plugin-upgrade?
- **Вопрос (crisp):** добавить 11-й шаг «plugin-upgrade»? GPT test 6 (plugin-upgrade) — единственный
  kernel-тест, который single-lifecycle vertical НЕ покрывает.
- **Где поднят:** `vertical-scenario.spec.md`, mapping тестов. Цикл C3.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** owner.
- **Что блокирует:** полноту покрытия kernel-тестов вертикальным сценарием (test 6).

---

## Область 6 — Strategy (стратегия)

### KQ-14 · Go-wide-now vs consolidate-deep-first
- **Вопрос (crisp):** идти вширь сейчас или сперва консолидировать вглубь? killer-README предписал
  «следующий ход = консолидация + глубина (B2/B4 + depth), НЕ рост вширь», а Phase 1 = рост вширь
  (service + PG + scale). Решить сознательно, не по умолчанию.
- **Где поднят:** `phase-1-engine/README.md` §📌.3 + SYNTHESIS critic #3. Цикл C3.
- **Статус:** `OPEN`.
- **Провизорный ответ:** —.
- **Кто решает:** owner.
- **Что блокирует:** направление Phase 1 (широта vs глубина); осознанность стратегии.

---

## Сводка

| id | Область | Вопрос (кратко) | Статус | Кто решает |
|---|---|---|---|---|
| KQ-1 | primitives | assertion = 7-й примитив? | OPEN | owner |
| KQ-2 | primitives | relation — адресуемая единица? | OPEN | needs-ADR |
| KQ-3 | policy | policy self-reference через resolve()? | PROVISIONAL | needs-ADR |
| KQ-4 🔴 | policy | trace-leg редакции deny-field (I-7) | OPEN | needs-ADR |
| KQ-5 | temporal | bitemporal в v1? | OPEN | owner |
| KQ-6 | temporal | recordedAt только на акте? | OPEN | owner |
| KQ-7 | temporal | valid-time интервал vs точка | OPEN | owner |
| KQ-8 | temporal | что считается deletion? | OPEN | needs-ADR |
| KQ-9 🔴 | temporal | persistence-as-policy ADR + file-first | PROVISIONAL | needs-ADR |
| KQ-10 🔴 | engine | sum(cost) R1 vs R3 | OPEN | owner/needs-ADR |
| KQ-11 | vertical | memory step 6: проекция vs node | OPEN | owner |
| KQ-12 | vertical | назвать hidden-поле + агента (step 8) | OPEN | owner |
| KQ-13 | vertical | добавить 11-й plugin-upgrade шаг? | OPEN | owner |
| KQ-14 | strategy | go-wide vs consolidate-deep | OPEN | owner |

**Инвариант:** вопрос по ядру, всплывший в цикле, но не занесённый сюда = процессная ошибка
(см. `../../open-questions/INDEX.md` → process/docs-first-and-question-capture).
