---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Scope: project
Related:
  - docs/01-organization/doc-discipline/2026-07-06-reorg-and-section-types.md
  - docs/01-organization/doc-discipline/section-types-registry.md
  - docs/topics/10-synthesis/memory-unit/INDEX.md
---

# Карта переноса brain (BLUEPRINT — НЕ выполнять)

> Основание: `2026-07-06-reorg-and-section-types.md` (D1 перенос целиком, D4 L0-синк).
> Это ПЛАН переноса `topics/10-synthesis/memory-unit/` → `02-project/core/01-brain/`.
> Исполнитель (sonnet) идёт по этой таблице, чинит ссылки. Каждый файл — экземпляр типа из
> `section-types-registry.md`. Сырьё остаётся в `topics/` как архив-источник (D1).

## Границы переноса (что едет, что остаётся)

- **ЕДЕТ (канон):** `memory-unit/` целиком — INDEX, values, scenarios, open-questions, 3 синтеза Fable;
  плюс из родителя `10-synthesis/`: L0, три L1, портрет ячейки (D4).
- **ОСТАЁТСЯ в topics/ (архив-источник, D1):** `20-analysis/*` (deep-scenarios, forgotten, round3,
  other-projects-survey), `60-raw/2026-07-05-memory-research/`. Канон **ссылается** на них, не наоборот.
  Это сырьё агентов — источник, не истина.

## Целевое дерево `02-project/core/01-brain/`

```
01-brain/
├── INDEX.md                      ← мастер-навигация (из memory-unit/INDEX.md), правит все ссылки
├── MIGRATION-BLUEPRINT.md        ← этот файл
├── L0-memory-unit.md             ← цель + 39 целей (Г1-Г39); синк с values (D4)
├── portrait/
│   └── cell-portrait-now.md      ← «ячейка как есть»
├── values/                       ← тип: values (7 карточек + INDEX)
│   ├── INDEX.md                  ← карта осей + «values↔L0 синк» (D4)
│   ├── V1-chitaemost.md … V7-soglasie.md
│   ├── L1-values-seed.md         ← генезис ценностей (сид)
│   ├── L1-values-and-L2-task.md
│   └── L1-values-fable.md
├── scenarios/                    ← тип: scenarios
│   ├── INDEX.md
│   └── S-multistructure-views.md
├── open-questions/               ← тип: open-questions
│   └── INDEX.md                  ← FQ1-24 · VQ1-4 · закрытые
├── decisions/                    ← тип: decisions (НОВЫЙ — извлечь замки)
│   └── DECISIONS-LOG.md          ← В2 bitemporal, В4 ребро-паспорт, хребет 3 уровня
├── synthesis/                    ← сырьё-синтезы Fable (промежуточное, не тип)
│   ├── brain-components-and-source.md
│   ├── fable-nonlinear-dig.md
│   └── subcell-and-review-fable2.md
├── todo/                         ← тип: todo (НОВЫЙ, пустой каркас)
│   └── TODO.md
└── plan/                         ← тип: plan (НОВЫЙ, пустой каркас)
    └── PLAN.md
```
