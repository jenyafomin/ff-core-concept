---
id: state-00-global-build
node_type: state
theme: Глобальный build проекта (ключевые планы + горизонты) — бывший GLOBAL
status: active
owner: jenya.stasik@gmail.com
opened: 2026-07-19
updated: 2026-07-19
agents: [orchestrator-fable]
plans:
  - ./GLOBAL-plan-2026-07-14.md
Related:
  - ../README.md
---

# 📍 STATE-00 — Глобальный build (бывший GLOBAL)

> Решение владельца 2026-07-19: **отдельного `GLOBAL.md` как «истины» нет** — ключевые планы живут как
> **состояния разных планов** в `00-states/`. Это корневой build-state; его план = 7-шаговый путь
> (`…/01-model/plan/GLOBAL.md`, оставлен как контент-план, помечен переходным).

## План (7 крупных шагов, из GLOBAL)
Структура-дерево → миграция контента → passport-контракт → углубление примитивов (Акт·Связь·Проекция)
→ cross-cutting механизмы → дизайн-очередь → engine-spec/ТЗ → build-репо `TOOLS/`.

## Отношение к другим state
- `01-tree-rules-and-librarian` — «как работаем» (обслуживает шаг 1).
- `02-agent-system-mechanics` — оркестрация/движуха (шаги 4–5 для агентского слоя).
- ⏭ **O-22:** разложить 7 шагов в отдельные per-plan состояния (следующий заход).

## Статус
`active` · корневой build-state.
