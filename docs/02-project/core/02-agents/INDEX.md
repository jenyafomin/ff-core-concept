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
- Обзор системы агентов и её границы (что она есть, coupling с FF).
- Реестр ролей/моделей (кто; sonnet/opus/haiku/fable).
- `runs/` — реестр прогонов: кто/что/сколько контекста делает — ТОЛЬКО ссылками.
- Контракт «что агенты пишут в граф» → `../03-contract/`.
