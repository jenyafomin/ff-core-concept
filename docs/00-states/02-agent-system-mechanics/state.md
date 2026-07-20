---
id: state-02-agent-system-mechanics
node_type: state
theme: Механика инфраструктуры агентской системы (оркестрация · модуль agent-manager)
status: active
owner: jenya.stasik@gmail.com
opened: 2026-07-19
updated: 2026-07-19
agents: []
plans:
  - ../../02-project/core/02-agents/01-orchestration/decisions/ADR-DRAFT-orchestration-state-plan-task-loop.md
queue:
  - ../../02-project/core/01-brain/decomposition/01-model/plan/design-queue.md
Related:
  - ../README.md
  - ../../02-project/core/02-agents/01-orchestration/README.md
---

# 📍 STATE-02 — Механика агентской системы

> Реальный экземпляр `state`. **Список чтения в этом state ДРУГОЙ** (замысел владельца): сюда —
> документы модуля agent-manager, не общий brain. Читать: `02-agents/01-orchestration/`.

## На чём работаем (тема)
Как устроена **движуха**: оркестрация `STATE·PLAN·TASK·LOOP` как грани над базой, конкретные plan-kinds,
loop/guard, стык модуля с базой. Слой «ЧТО и КАК работает» в инфраструктуре агентов.

## Что читать в этом state (reading list)
- `02-agents/01-orchestration/` — DESIGN · node-types · edge-types · policy · modules.
- `01-orchestration/decisions/ADR-DRAFT-orchestration-…` — 5 ответов + разв.6 материализации.
- База: `01-brain/…/01-model/{01-node,02-edge,03-act,04-lens,05-plan-family}`.

## Привязанные планы / очередь
1. **Ратификация ADR оркестрации** (5 ответов + разв.6 + reconcile 02-states.md).
2. **Дизайн-очередь** (`design-queue.md`) — DQ-1 разводящее правило и т.д. → **закрывается этим state**
   (замысел владельца: у состояния есть очередь, которую оно ведёт/закрывает).

## Открытые (из этого хода)
- 🔴 **guard/loop прописаны не совсем правильно** — ревью аналитиком в работе → фикс.
- Дом `01-model/plan/{GLOBAL,design-queue}` — GLOBAL=base-план; design-queue → к этому state.

## Текущий статус
`active` · открыт 2026-07-19. Лог — `log.md`.
