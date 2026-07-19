---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-18
Scope: project
node_type: model-map
title: 01-model — КАРТА модели памяти (примитивы · сквозное · закон дерева)
Related:
  - NAV.concept.json
  - plan/README.md
  - ../../../../01-organization/session-handoff/2026-07-18-ratification-backlog/LEDGER.md
---

# 🧠 01-model — карта модели памяти

> Единая точка входа в модель. Контекст самонавигируем: агент читает этот README → идёт по дереву.
> Метод углубления жил в `deepening/` — переезжает СЮДА (deepening → superseded этим README + NAV).

## Модель = 4 примитива (из VISION: «4 кубика»)
| # | Дом | Примитив | Роль | Статус |
|---|-----|----------|------|--------|
| 1 | `01-node/` (⬅ `unit/`) | **Вещь** (node) | что храним | углублён (референс) |
| 2 | `02-edge/` (⬅ `02-edge.md`) | **Связь** (edge) | как связаны | скаффолд |
| 3 | `03-act/` | **Акт** (act) | что произошло (глагол) | скаффолд · углубляем ПЕРВЫМ |
| 4 | `04-lens/` | **Проекция** (lens) | тот же факт под углом | скаффолд |

## Сквозной регистр `_shared/` (без номера — режет все примитивы)
`passport/` (общий контракт) · `mechanisms/` (propagation·hard-erase·dedup·snapshot) ·
`policy-as-data/` (спина) · `constitution/` (инварианты). **Не примитивы, а сквозное.**
Расформированы: `layers`→поле actor+линза · `categories`→тип ребра+поля узла (критический разбор).

## 🌳 Закон дерева (2 правила)
1. **Одна единица = один дом.** Нет и карты `0N-*.md`, и папки про одно и то же. Карта → `README` дома.
2. **Номер = упорядоченный примитив/узел; без номера = сквозной аспект/формат/правило** (`_shared`, `questions`, `critique`, `plan`).

## ⭐ Два режима наполнения любой папки
- **S · структура-сразу** — устройство известно → нумерованные под-папки, пишем прямо.
- **T · темами** — не знаем → `тема-1·тема-2·analysis/` → СБОРКА в скелет. По умолчанию не знаешь дом → T.

## Скелет любой единицы
`0N-<единица>/ → README · TREE · 0M-<узел>/ · questions/ · critique/(01-critique.md…)`

## Навигация
- **Текущие прямые задачи:** `NAV.concept.json` (открывается в Telegram).
- **Планы (global→module→task):** `plan/README.md`.
- **Бэклог ратификации (свод):** `…/session-handoff/2026-07-18-ratification-backlog/LEDGER.md`.

## ✅ Миграция (выполнена 2026-07-18, бэкап `/tmp/ff-mig-backup`, 0 битых ссылок)
- `unit/ → 01-node/` (naming-баг снят) · `deepening/` растворён → `../03-method/04-deepening-method.md` + этот README + NAV.
- Карты → дома: `01-node/00-card.md · 02-edge/README.md · _shared/policy-as-data/CARD.md`.
- `layers`+`categories` → `_shared/_to-dissolve/` (расформировать: actor-поле+линза / тип-ребра+поля-узла).

**Staged (тонкая уборка, следующий заход):** process-файлы `01-node/` → session-handoff (trace≠знание) ·
слить `00-card`/`CARD` в `README` домов · FQ01-24 → per-question дома под `questions/`.
