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
  - ../../04-graph-view/README.md          # каноничная envelope-форма узла task (§3)
  - ../../../_schema/envelope.md            # системный конверт
---

# U6 · planning-module — задачи, ветки, потоки как данные

## 1. Суть
Отдельный МОДУЛЬ планирования, а не «поле задач у проекта». Владеет `task` — единицами работы разной
природы (агентская/не-агентская), которые растут не плоским списком, а **ветками/потоками**
(branch/flow), и несут роли участников. Модуль — держатель реестра; `task` — сам конструктор.

## 2. Форма — envelope + body (единый конверт)

`planning-module` — узел как ЛЮБОЙ другой: **системный конверт** (движок гарантирует) + **`body`**
(доменные поля модуля) + **рёбра**. Это та же форма, что в `04-graph-view` и `_schema/envelope.md` —
НЕ плоский объект.

**Системные грани (конверт):**

| Поле | Что | Пример |
|------|-----|--------|
| `id` | тождество модуля | `planning:ff` |
| `type` | тип узла | `planning-module` |
| `state` | живое состояние | `{ "status": "active" }` |
| `edges[]` | связи графа | `belongs-to project:ff` · `owns task:*` · `scoped-by space:*` |
| `view[]` | сохранённые срезы (по ветке/агенту/роли) | `[{id:"view:by-branch", group_by:"branch"}, {id:"view:by-agent", group_by:"agent"}, {id:"view:by-status", group_by:"status"}]` |
| `visibility` | кого видно + клапан | `{ "level": "visible-to-ai", "valve": "none" }` |
| `access` | права read/write | `{ "can_read": ["agent:*","user:owner"], "can_write": ["user:owner"] }` |
| `acts[]` | append-only история (создание веток, смена статусов) | `[{ "at": …, "kind": "branch.created" }]` |
| `policy_ref[]` | ссылки на политики | опционально |

**Доменные грани (`body`):**

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `registry.branches` | конструктор[] | список веток/потоков (не плоский массив id) | `[{id, name, status, sequencing}]` |
| `registry.roles` | конструктор[] | роли участников задач (кто может что) | `[{id, name, permissions[]}]` |

> **Переразведение (было плоско):** привязка к проекту (`applies_to`, ранее `scope`) — теперь РЕБРО
> `belongs-to project:ff`, не body-поле (обычное не дублирует системное). Владеемые задачи — рёбра
> `owns task:*`, а не body-массив `tasks`. `views` → системное `view[]` конверта.

## 3. Под-сущности (сами узлы)

- **`task`** — единица работы; узел в ЕДИНОМ конверте (та же форма, что `04-graph-view §3`), а не
  строка в списке дел:

  **Конверт:** `id · type:"task" · state{status, started_at, closed_at} · edges[] · view[] ·
  visibility · access · acts[] · policy_ref[]`.

  **`body` (домен задачи):**

  | Поле | Тип | Зачем | Пример |
  |------|-----|-------|--------|
  | `kind` | enum | природа задачи — агентская/ручная/смешанная | `agentic \| manual \| hybrid` |
  | `title` | строка | заголовок задачи | `"Наполнить дефектовку U6/U11/U12"` |
  | `branch` | конструктор | к какой ветке/потоку принадлежит | `{ ref: "branch:…", flow: "flow:…" }` |
  | `links` | конструктор | связи с миром вокруг задачи | `{ project, assigned_to, parent_task, blocks[], blocked_by[] }` |
  | `roles` | конструктор | кто владелец, кто исполнитель (не одно поле "assignee") | `{ owner, executor }` |

  Связи задачи — в `edges[]` (истина графа): `belongs-to project`, `belongs-to branch`,
  `assigned-to agent|user`, `triggers loop` (для `kind=agentic`). `body.links` — удобная доменная
  проекция тех же связей, а НЕ второй источник истины (осознанная проекция, см. `04-graph-view §3`).

- **`branch/flow`** — ветка/поток исполнения: последовательность или параллельный пучок задач, может
  ветвиться и сливаться (не «просто тег на задаче»).
- **`role`** — роль участника внутри потока (что можно делать с задачей — читать/менять/закрывать).

## 4. Связи (рёбра)
```
planning-module --owns--> task
planning-module --belongs-to--> project(U3)   (было applies_to/scope — теперь ребро)
task --belongs-to--> project(U3)
task --belongs-to--> branch/flow
task --assigned-to--> agent(U1)            (kind=agentic)
task --assigned-to--> user(U2)             (kind=manual)
branch/flow --sequences--> task            (порядок/параллельность внутри потока)
task --triggers--> loop/graph-loop(U9)     (агентская задача может запускать луп — опционально)
planning-module --scoped-by--> space(U4)   (кто что может видеть/менять в этом чате/проекте)
snapshot(U11) --measures--> task           (стоимость исполнения задачи, опционально)
```

## 5. Форма данных — конверт целиком

**Агентская задача (весь конверт заполнен):**
```json
{
  "id": "task:ff-2026-07-23-001",
  "type": "task",
  "state": { "status": "in-progress", "started_at": "2026-07-23T14:00:00+03:00", "closed_at": null },

  "edges": [
    { "predicate": "belongs-to", "target": "project:ff" },
    { "predicate": "belongs-to", "target": "branch:agent-manager-example", "meta": { "flow": "flow:design-phase" } },
    { "predicate": "assigned-to", "target": "agent:builder#1", "meta": { "since": "2026-07-23T14:00:00+03:00" } },
    { "predicate": "triggers",    "target": "loop:agent-map" }
  ],

  "view": [
    { "id": "view:by-branch", "filter": "edges[predicate=belongs-to, target~branch:*]",
      "note": "проекция задачи в дерево веток — без копии данных" }
  ],

  "visibility": { "level": "visible-to-ai", "valve": "none" },
  "access":     { "can_read": ["agent:*", "user:owner"], "can_write": ["agent:builder#1", "user:owner"] },

  "acts": [ { "at": "2026-07-23T14:00:00+03:00", "kind": "task.created", "by": "user:jenya" } ],
  "policy_ref": [],

  "body": {
    "kind": "agentic",
    "title": "Наполнить дефектовку U6/U11/U12",
    "branch": { "ref": "branch:agent-manager-example", "flow": "flow:design-phase" },
    "links": {
      "project": "project:ff",
      "assigned_to": "agent:builder#1",
      "parent_task": null,
      "blocks": [],
      "blocked_by": []
    },
    "roles": { "owner": "user:jenya", "executor": "agent:builder#1" }
  }
}
```

**Вариант A — ручная (не-агентская) задача:** `body.kind: "manual"`, ребро `assigned-to` целит в
`user:jenya`, НЕТ ребра `triggers loop` — задача существует только как данные для трекинга, агент её
не исполняет.

**Вариант B — ветка/поток верхнего уровня** (`branch` — тоже узел в конверте):
```json
{
  "id": "branch:agent-manager-example",
  "type": "branch",
  "state": { "status": "active" },
  "edges": [
    { "predicate": "sequences", "target": "task:…-001" },
    { "predicate": "sequences", "target": "task:…-002" }
  ],
  "body": { "name": "Agent-Manager example", "sequencing": "sequential" }
}
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
