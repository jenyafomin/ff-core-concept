---
node_type: design-note
title: planning-module — единица «планирование» как конструктор задач/веток
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../03-project/project.design.md
---

# U6 · planning-module — задачи, ветки, потоки как данные

## 1. Суть
Отдельный МОДУЛЬ планирования, а не «поле задач у проекта». Владеет `task` — единицами работы разной
природы (агентская/не-агентская), которые растут не плоским списком, а **ветками/потоками**
(branch/flow), и несут роли участников. Модуль — держатель реестра; `task` — сам конструктор.

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество модуля | `planning:ff` |
| `applies_to` | ref | к какому проекту привязан (было `scope` — переразведено, см. envelope) | `project:ff` |
| `registry.branches` | конструктор[] | список веток/потоков (не плоский массив id) | `[{id, name, status, sequencing}]` |
| `registry.roles` | конструктор[] | роли участников задач (кто может что) | `[{id, name, permissions[]}]` |
| `tasks` | ref[] | владеемые задачи (сами узлы) | `[task:...]` |
| `views` | view[] (конструктор, не плоский объект) | настраиваемые срезы (по ветке/агенту/роли) | `[{id: "view:by-branch", groups_by: "branch"}, {id: "view:by-agent", groups_by: "agent"}, {id: "view:by-status", groups_by: "status"}]` |
| `acts` | акт[] | история операций модуля (создание веток, смена статусов) | append-only |

## 3. Под-сущности (сами становятся узлами)

- **`task`** — единица работы; сама конструктор, не строка в списке дел:

  | Поле | Тип | Зачем | Пример |
  |------|-----|-------|--------|
  | `id` | node-id | тождество задачи | `task:ff-2026-07-23-001` |
  | `kind` | enum | природа задачи — агентская/ручная/смешанная | `agentic \| manual \| hybrid` |
  | `state` | конструктор | текущий статус + время | `{status, started_at, closed_at}` |
  | `branch` | ref-конструктор | какой ветке/потоку принадлежит | `{ref: "branch:...", flow: "flow:..."}` |
  | `links` | конструктор | связи с миром вокруг задачи | `{project, assigned_to, parent_task, blocks[], blocked_by[]}` |
  | `roles` | конструктор | кто владелец, кто исполнитель (не одно поле "assignee") | `{owner, executor}` |
  | `acts` | акт[] | история изменений задачи | append-only |

- **`branch/flow`** — ветка/поток исполнения: последовательность или параллельный пучок задач, может
  ветвиться и сливаться (не «просто тег на задаче»).
- **`role`** — роль участника внутри потока (что можно делать с задачей — читать/менять/закрывать).

## 4. Связи (рёбра)
```
planning-module --owns--> task
task --belongs-to--> project(U3)
task --belongs-to--> branch/flow
task --assigned-to--> agent(U1)            (kind=agentic)
task --assigned-to--> user(U2)             (kind=manual)
branch/flow --sequences--> task            (порядок/параллельность внутри потока)
task --triggers--> loop/graph-loop(U9)     (агентская задача может запускать луп — опционально)
planning-module --scoped-by--> space(U4)   (кто что может видеть/менять в этом чате/проекте)
cost/snapshot(U11) --measures--> task      (стоимость исполнения задачи, опционально)
```

## 5. Форма данных (конструктор)

**Быстрый пример (агентская задача):**
```json
{
  "id": "task:ff-2026-07-23-001",
  "type": "task",
  "kind": "agentic",
  "title": "Наполнить дефектовку U6/U11/U12",
  "state": { "status": "in-progress", "started_at": "2026-07-23T14:00:00+03:00", "closed_at": null },
  "branch": { "ref": "branch:agent-manager-example", "flow": "flow:design-phase" },
  "links": {
    "project": "project:ff",
    "assigned_to": "agent:builder#1",
    "parent_task": null,
    "blocks": [],
    "blocked_by": []
  },
  "roles": { "owner": "user:jenya", "executor": "agent:builder#1" },
  "acts": [ { "at": "2026-07-23T14:00:00+03:00", "kind": "task.created" } ]
}
```

**Вариант A (не-агентская, ручная задача):** `kind: "manual"`, `links.assigned_to: "user:jenya"`,
нет `triggers-> loop` — задача существует только как данные для трекинга, агент её не исполняет.

**Вариант B (ветка/поток верхнего уровня):**
```json
{ "id": "branch:agent-manager-example", "type": "branch", "name": "Agent-Manager example",
  "status": "active", "sequencing": "sequential", "tasks": ["task:...-001", "task:...-002"] }
```

## 6. Дизайн-паттерн / метод
- **Task-as-constructor** — `kind` различает агентскую/ручную задачу ОДНОЙ моделью данных, а не двумя
  параллельными сущностями «дела агента» и «дела человека».
- **Branch/flow-as-graph** — поток задач — это последовательность/ветвление, не плоский список; порядок
  и параллельность — данные (`sequencing`), а не порядок строк в файле.
- **Roles-as-edges** — `owner`/`executor` разведены явно; это готовит почву под scope-правила из U4
  (кто в чате что может делать с задачей).

## 7. Открытые вопросы
- Q-1: связь `task --triggers--> loop` — направление верно (задача порождает луп), или наоборот
  (луп по ходу работы порождает задачи в planning-module)? Возможно оба ребра нужны.
- Q-2: `branch/flow` — отдельный `node_type`, или атрибут-ссылка внутри `task` (текущий вариант)?
