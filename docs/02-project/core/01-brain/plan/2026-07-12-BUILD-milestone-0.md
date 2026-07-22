---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-13
Scope: project
node_type: work-plan
title: BUILD Milestone-0 — Walking Skeleton (единый граф-субстрат)
Related:
  - ../analyses/2026-07-12-architecture-synthesis/2026-07-12-FABLE-readiness-verdict.md
  - ../analyses/2026-07-12-architecture-synthesis/2026-07-12-SYNTHESIS-matrix.md
  - ../decisions.INDEX.md
---

# 🚶 BUILD Milestone-0 — Walking Skeleton (единый граф-субстрат)

> Дизайн-фаза закрыта (DL-14). Цель milestone-0 — минимальный РАБОТАЮЩИЙ скелет, доказывающий несущие
> инварианты кодом. Не продукт — фундамент, на котором модули дальше наращиваются ДАННЫМИ.

## 🎯 Цель
Собрать субстрат + самохостящийся реестр типов + движок записи так, чтобы прошли **4 теста-инварианта**.
Пройдут → модель доказана, дальше M-G2/агенты/категории/календарь добавляются INSERT'ом типа, без ретрофита.

## Что строим (scope — из вердикта Fable)
- **2 таблицы:** `nodes`, `edges` (**PostgreSQL**; миграции с первого дня, НЕ synchronize). Репо — новый в `TOOLS/` (DL-16).
- **5 node-type (seed):** `cell` · `container` · `journal-entry` · `registry-row` (type-def) · `view-def`.
- **4 edge-type (seed):** `member-of` (thin-ref) · `derived-from` (assertion, DAG) · `provenance` · `same-as`.
- **Минимальный паспорт:** `canonicalId(UUID)` · `node_type` · `scope`(дефолт `private`) · `status` ·
  `validFrom/validUntil` · `provenance` · `derived`.
- **Реестр M-G3 self-host:** типы = строки-узлы `registry-row`; type-gate (нельзя вставить узел неизвестного типа).
- **Движок M-G1:** запись узла/ребра с canonicalId; append-only `journal-entry` на каждую запись; read-path через `view-def`.
- **`view-def` = app-level композиция запроса (проекция в движке), НЕ динамический `CREATE VIEW`/DDL.** Схема БД мутирует только через `migrations/`; view-def не трогает схему.

## Не в scope (🟢 позже, INSERT'ом или отдельным модулем)
Агенты/оркестрация (M-G2) · telegram (M-P2) · петли (M-P3) · кокпит (M-P4) · физраскол per-project БД (M-G4) ·
категории/теги-UI · **календарь и отношения людей** (DL-14) · **hard-erase** (после скелета, SPEC-DRAFT готов).

## Задачи (батчи, с зависимостями)
| Батч | Что | Зависит от |
|---|---|---|
| **B0 Setup** | репо-каркас · инструмент миграций · CI-раннер тестов | — |
| **B1 Субстрат** | таблицы `nodes`/`edges` + первая миграция · паспорт-колонки (минимум выше) | B0 |
| **B2 Реестр M-G3** | `registry-row` как узлы · type-gate на запись | B1 |
| **B3 Движок M-G1** | запись узла/ребра + `canonicalId` · append-only `journal-entry` · классы thin-ref/assertion | B2 |
| **B4 Read-path** | минимальная `view-def` проекция (`effective`) — доказать «проекция-первой» | B3 |
| **B5 Тесты-инварианты** | 4 теста (критерии приёмки) + `dag-guard` + **append-only enforcement** (UPDATE/DELETE на `journal_entry` запрещены триггером/GRANT) в CI | B3, B4 |

## ✅ Критерии приёмки (4 инварианта Fable + 2 усиления критика; milestone-0 done, когда все зелёные)
1. **canonicalId-слияние (исполнимо):** сид ДВУХ фикстур-датасетов A/B (часть UUID пересекается, часть — разные) → CLI-merge → прогон ДВАЖДЫ → (а) идемпотентность повторного прогона, (б) разные ID стали `same-as`-ребром, а НЕ мутацией/перенумерацией.
2. **rebuild-from-journal:** снести все проекции/паспорт-производные → пересобрать из `journal-entry` → идентично.
3. **проекция-первой (статический schema-introspection, НЕ рантайм на пустой БД):** в схеме физически нет авторитетной колонки под производное (`effective`, агрегаты); `derived=true` где кэш.
4. **type-gate:** запись узла/ребра неизвестного типа отклоняется (нет свалки синонимов).
5. **dag-guard:** цикл в `derived-from` отклоняется на записи (ребро в seed → тест в M0).
6. **append-only enforcement:** UPDATE/DELETE на `journal_entry` физически запрещены (триггер/GRANT), не только соглашением.

## План верификации
4 теста гоняются в CI на каждый коммит B3+. `rebuild-from-journal` — как отдельный smoke, запускается «день один».

## Setup-решения (приняты)
- **Репо:** новый репозиторий в `TOOLS/` (DL-16); `agents-manager` — для оркестрации/агентов позже.
- **БД:** PostgreSQL (DL-15); миграции с первого дня.
- **Открыто:** язык/раннер движка + ORM/инструмент миграций — выбор B0.
