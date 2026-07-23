---
node_type: design-note
title: agent — единица «агент» как конструктор данных
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../08-skill-playlist/skill-playlist.design.md
  - ../09-graph-loop/graph-loop.design.md
---

# U1 · agent — эталон дефектовки

## 1. Суть
Действующее лицо системы. Не «промпт», а **сборка**: конфигурация (из чего собран) + состояние (что
сейчас) + история (что делал). Всё, из чего агент состоит, — видимые узлы данных, а не скрытая обвязка.

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество агента | `agent:ff-personal` |
| `identity` | конструктор | роль/лицо/границы (не строка) | `{role, frame, boundaries[]}` |
| `runtime` | конструктор | где и на чём запущен | `{project, model, cwd}` |
| `composition` | конструктор | из чего собран (видимо!) | `{skills[], mcp[], playlist}` |
| `state` | конструктор | текущее живое состояние | `{status, active_loop, context_size}` |
| `delegation` | конструктор | как раздаёт под-агентам | `{can_spawn, children[], policy}` |
| `outputs` | ссылка[] | что выдал (→ U12 output) | `[output:...]` |
| `acts` | акт[] | история изменений (снапшоты) | append-only |

## 3. Под-сущности (сами становятся узлами)
- `skill-binding` — какой скилл включён, откуда, в какой фазе (→ U8).
- `mcp-binding` — какой MCP-сервер подключён, какие инструменты открыл, статус.
- `child-agent` — под-агент, которому делегируют (→ ребро delegates-to).

## 4. Связи (рёбра)
```
agent --runs-in--> project(U3)
agent --composed-of--> skill(U8), mcp-server, playlist(U8)
agent --delegates-to--> agent            (командная работа)
agent --drives--> loop/graph-loop(U9)
agent --emits--> output(U12)
agent --serves--> user(U2)
agent --scoped-by--> space(U4)           (что можно в этом чате)
agent --uses--> telegram-module(U5)      (через capability, не напрямую — см. U5)
agent --views-via--> view(U7)            (было «lens» — унифицировано с envelope.view, см. схема §2)
agent --produces--> snapshot(U11)        (эхо acts[] — каждый акт может рождать срез)
agent --performs--> action(U13)          (см. U13: центральный узел loop--sequences-->action--emits-->output)
cost/snapshot(U11) --measures--> agent
```

## 5. Форма данных (конструктор)

**Быстрый пример:**
```json
{
  "id": "agent:ff-personal",
  "type": "agent",
  "identity": { "role": "personal-manager", "frame": "agent-first", "boundaries": ["no-irreversible-without-valve"] },
  "runtime": { "project": "project:ff", "model": "opus", "cwd": "/…/FF-Personal-Managment" },
  "composition": {
    "skills": [ { "ref": "skill:concept-first", "bound_to": "loop.phase:frame", "enabled": true } ],
    "mcp": [ { "ref": "mcp:telegram", "tools": ["reply","react"], "status": "connected" } ],
    "playlist": "playlist:design-mode"
  },
  "state": { "status": "running", "active_loop": "loop:agent-manager-map", "context_size_tokens": 48120 },
  "delegation": { "can_spawn": true, "children": ["agent:critic#1"], "policy": { "max_fanout": 4, "on_conflict": "queue", "model_default": "sonnet" } },
  "acts": [ { "at": "2026-07-23T…", "kind": "skill.enabled", "ref": "skill:concept-first" } ]
}
```

**Вариант A (под-агент, узкий):** нет `delegation.can_spawn`, `identity.role="critic"`, `runtime.model="sonnet"`.
**Вариант B (спящий):** `state.status="idle"`, `composition` минимальна — «болванка», собирается под задачу.

## 6. Дизайн-паттерн / метод
- **Composition-as-data** — агент = данные о сборке, а не жёсткий класс; `skill/mcp` — видимые binding-узлы, не скрытая обвязка (лечит «подключается, но невидимо для глаза»).
- **Act-log (снапшоты)** — `acts[]` append-only → история и связь с U11 (затраты во времени).
- **Delegation-as-edge** — командная работа = рёбра `delegates-to`, а не спрятанный вызов.

## 7. Открытые вопросы
- Q-1: под-агент — отдельный `node_type` или грань `agent` с `parent`? (см. concept.json)
- `composition` фиксируется снапшотом на старте лупа или живёт-меняется в ходе?
