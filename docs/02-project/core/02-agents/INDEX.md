---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Scope: project
Related: /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager
---

# 02-agents — система агентов (руки)

> Слой, который читает граф, делает работу и пишет обратно. Живёт как отдельный тулз
> (`TOOLS/agents-manager`, Telegram-шлюз), в дереве FF — как модуль со ссылкой.

Что сюда кладём:
- `01-orchestration/` — **STATE·PLAN·TASK·LOOP как конкретные грани над базой** (переехало 2026-07-19:
  DESIGN, типы node/edge, policy, modules, `decisions/` (ADR), `01-state/`). Тянет примитивы из `01-brain/…/01-model/`.
- Обзор системы агентов и её границы (что она есть, coupling с FF).
- Реестр ролей/моделей (кто; sonnet/opus/haiku/fable).
- `runs/` — реестр прогонов: кто/что/сколько контекста делает — ТОЛЬКО ссылками.
- `loop-system/` — механизм петель (позже сфолдится в `01-orchestration/04-loop/`).
- Контракт «что агенты пишут в граф» → `../03-contract/`.
