---
Title: 04-engine-reality-and-evolution — навигатор узла
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-09-23
Scope: project
node_type: area-index
Related:
  - ./OVERVIEW.md
  - ../03-what-memory-is/README.md
  - ../../../../../_log/2026-09-23-log-to-canon-consolidation/CONSOLIDATION-PLAN.md
---

# 🔧 04-engine-reality-and-evolution — «что движок реально делает + путь эволюции»

> Узел-дом темы: РЕАЛЬНОСТЬ движка памяти против обещаний 7 ценностей и лестница эволюции данных.
> Отдельный топик от `03-what-memory-is` (тот — концептуальный «что память ЕСТЬ»; этот — «что она ДЕЛАЕТ»).
> Собран консолидацией черновиков `_log/2026-09-17` + `_log/2026-09-23` → канон (LOSE-NOTHING).

## Как читать
**Начни с `OVERVIEW.md` — вверху ГЕЙТ ПЕРЕПИСИ** (прибранные доки ≠ проверенная жизнью память). Дальше — по группам.

## Что внутри (по группам)

### Обзор / навигация
- **`OVERVIEW.md`** — вид владельцу за 30 сек; вверху гейт переписи. *(draft)*
- **`README.md`** — этот навигатор. *(draft)*

### Снимки-реальности *(регенерируемые: перегенерировать при изменении `packages/engine/test/value-collisions.test.ts`)*
- **`capability-map-2026-09-17.analysis.md`** — T1–T7 (🟢держит/🔴обещание/🟡todo) с привязкой к коду. *(active — снимок)*
- **`two-maps-2026-09-17.analysis.md`** — ось ценностей V1–V7 × ось паттернов жизни данных. *(active — снимок)*
- **`days-and-value-tests-2026-09-17.analysis.md`** — дизайн 3 синтетических дней + комбинации. *(active)*

### Концепты
- **`data-evolution-ladder-2026-09-17.concept.md`** — лестница L0→L4 + апгрейд-путь (proposal, не решение). *(draft/proposal)*

### Решения
- **`decisions/test-conventions.decision.md`** — «.fails = перевёрнутая декларация», tripwire, «тест = возможность». *(active)*

### Вопросы *(все status: open — НЕ ратифицированы)*
- **`questions/real-episode-census.question.md`** — ГЕЙТ: форк двух вопросов (синтетика=движок vs реальные эпизоды=фит модели к жизни). *(open)*
- **`questions/one-way-doors.question.md`** — 4 необратимые двери, каждой нужен ADR. *(open)*
- **`questions/scope-full-project-overview.question.md`** — флаг лида: сужение до brain/памяти не подтверждено владельцем. *(open)*

### Идеи
- **`ideas/lens-as-data-candidate.idea.md`** — projection-as-data (READ-сторона субстрата); припаркованный кандидат, gated. *(candidate)*
- **`ideas/rejected-gems.idea.md`** — LOSE-NOTHING: рассмотренные и НЕ выбранные альтернативы. *(preserved)*

## Границы узла
Этот узел — про brain/память (F-A, не подтверждено владельцем — см. scope-вопрос). Снимки/концепты/решения —
регенерируемые виды поверх кода (`packages/engine/test/`), а не второй источник истины; полный переезд/синтез
остального содержимого в канон завершается по явному «строй» владельца (doc-tree §строгость). Исходные черновики
остаются в `_log/2026-09-17-two-maps-and-creative-scan/` (5 DRAFT) как trace (LOSE-NOTHING).
