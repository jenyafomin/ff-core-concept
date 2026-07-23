---
title: Граф-вид — как агентская система выглядит как ОДНА связная база данных
type: overview
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../01-overview/README.md            # карта 12 единиц
  - ../03-schema/README.md              # уровни, полиморфные рёбра, политики
  - ../../_schema/envelope.md           # системный конверт узла
  - ../02-defectovka/README.md          # каждая единица подробно
---

# Граф-вид агентской системы

> Одна картинка на весь экран: из чего система собрана, как узлы связаны, что у одного узла «внутри»,
> и — самое главное — как **линза** превращает кучу узлов в готовый ответ. Всё, что ниже, — **данные**:
> один конверт, один словарь рёбер, один способ смотреть.

---

## 1. Граф целиком (ASCII, конкретными словами)

Не «уровень 1 → уровень 2», а живые узлы и настоящие предикаты из словаря схемы (§2 схемы).

```
                              user:jenya
                                  │  serves⁻¹ (агент служит юзеру)
              member-of          ▼
        ┌───────────────────► agent:ff-personal ──drives──► loop:agent-map
        │                       │   │   │                      │
        │            runs-in    │   │   │ composed-of          │ sequences
        │        ┌──────────────┘   │   └──────────┐           ▼
        │        ▼                  │              ▼        action:draft-graph
        │   project:ff              │        skill:concept       │ emits
        │        │ owns             │        playlist:design      ▼
        │        ▼                  │ delegates-to           output:msg-56
        │   planning:ff             ▼                             │ delivers⁻¹
        │        │ owns        agent:critic#1                     ▼
        │        ▼                                          telegram-module
        │   task:001 ──belongs-to──► branch:example              │ receives
   space:topic-56                                                ▼
        │ scopes {user, agent, rule}                         event:voice-in
        │ binds-to project:ff                                     │ triggers
        │ hosts agent:ff-personal                                 ▼
        └───────────────────────────────────────────────►  loop / action

   snapshot:ctx-14 ──measures──► {agent:ff-personal, action:draft-graph}   (затраты во времени)
   policy:snapshot-adaptive ◄──policy_ref── {agent, snapshot}              (настройка = данные)
   knowledge:ff ◄──stores/reads── {user-knowledge, project-knowledge, agent-memory}
```

Читается так: **агент запускается в проекте, собран из скиллов/плейлистов, служит юзеру, гонит луп,
луп нанизывает действия, действия рождают выводы, вывод уходит в телеграм; пространство-топик задаёт
кто/что можно; снапшоты меряют затраты; политики настраивают поведение.** Каждая стрелка — предикат из
канонического словаря, у каждой есть инверсия (граф читается с обеих сторон).

---

## 2. «Грани» одного узла — системное отдельно от обычного

Возьмём узел `task:001`. У него **две группы граней**: конверт (движок гарантирует) и body (домен).

```
                       ┌──────────────── task:001 ────────────────┐
                       │                                          │
   ── СИСТЕМНЫЕ ГРАНИ (конверт, framework-owned) ──               │
                       │                                          │
   id ─────────────►  адрес узла              "task:001"          │
   type ───────────►  форма body + дом        "task"             │
   state ──────────►  живое состояние         {status, phase}    │
   edges[] ────────►  связи (полиморфные)     belongs-to / …     │
   view[] (lens) ──►  сохранённые проекции    by-branch          │
   visibility ─────►  кого видно + клапан      visible-to-ai      │
   access ─────────►  права read/write         agent:* / owner   │
   acts[] ─────────►  append-only история      created, moved    │
   policy_ref[] ───►  ссылки на политики       snapshot-adaptive  │
                       │                                          │
   ── ОБЫЧНЫЕ ГРАНИ (body, domain-owned; своё у каждого type) ──  │
                       │                                          │
   kind ───────────►  agentic | manual | hybrid                  │
   branch ─────────►  {ref, flow}                                │
   links ──────────►  {project, assigned_to, parent, blocks[]}   │
   roles ──────────►  {owner, executor}                          │
                       └──────────────────────────────────────────┘
```

**9 системных граней + N обычных.** Правило: обычное НИКОГДА не дублирует системное — нет своего
`status` в body, если есть `state.status`. Конверт одинаков у ЛЮБОГО узла (agent, space, snapshot…);
меняется только `type` и набор обычных граней. Именно это делает базу однородной: ИИ смотрит на всё
через один и тот же конверт.

---

## 3. Одна единица целиком — живой JSON (весь конверт заполнен)

`task:001` — как узел реально лежит в базе: **конверт + рёбра + body**, ничего не спрятано.

```json
{
  "id": "task:001",
  "type": "task",
  "state": { "status": "in_progress", "phase": "phase:execute", "started_at": "2026-07-23T14:00:00+03:00" },

  "edges": [
    { "predicate": "belongs-to", "target": "project:ff" },
    { "predicate": "belongs-to", "target": "branch:example", "meta": { "flow": "flow:design-phase" } },
    { "predicate": "assigned-to", "target": "agent:ff-personal", "meta": { "since": "2026-07-23T14:00:00+03:00" } },
    { "predicate": "triggers",    "target": "loop:agent-map" }
  ],

  "view": [
    { "id": "lens:by-branch", "filter": "edges[predicate=belongs-to, target~branch:*]",
      "note": "проекция задачи в дерево веток — без копии данных" }
  ],

  "visibility": { "level": "visible-to-ai", "valve": "none" },
  "access":     { "can_read": ["agent:*", "user:owner"], "can_write": ["agent:ff-personal", "user:owner"] },

  "acts": [
    { "at": "2026-07-23T14:00:00+03:00", "kind": "task.created",  "by": "user:owner" },
    { "at": "2026-07-23T14:05:00+03:00", "kind": "state.changed", "by": "agent:ff-personal",
      "from": "todo", "to": "in_progress", "cost_ref": "snapshot:ctx-14" }
  ],

  "policy_ref": [ "policy:snapshot-adaptive", "policy:knowledge-ref" ],

  "body": {
    "kind": "agentic",
    "title": "Собрать граф-вид агентской системы",
    "branch": { "ref": "branch:example", "flow": "flow:design-phase" },
    "links": { "project": "project:ff", "assigned_to": "agent:ff-personal",
               "parent_task": null, "blocks": [], "blocked_by": [] },
    "roles": { "owner": "user:owner", "executor": "agent:ff-personal" }
  }
}
```

Обрати внимание: `assigned-to` есть и в `edges` (машинно-читаемое ребро графа), и продублировано
удобной ссылкой в `body.links` — это осознанная проекция для домена, не рассинхрон; истина — ребро.

---

## 4. Линзы в работе — данные → вид → результат

Линза (`view`/lens) — это **узел-конструктор**, а не код: `{filter, over, group_by}`. Она НЕ копирует
данные — берёт узлы графа и возвращает срез. Ниже 3 примера с ВХОДом и ВЫХОДом.

### Линза A — «расходы этого лупа по под-агентам, деревом»

**Вход (узлы):** снапшоты, которые `measures` действия и агентов.
```json
[
  { "id": "snapshot:ctx-14", "type": "snapshot",
    "edges": [ { "predicate": "measures", "target": "agent:ff-personal" } ],
    "body": { "loop": "loop:agent-map", "tokens": 48120, "usd": 0.71 } },
  { "id": "snapshot:ctx-15", "type": "snapshot",
    "edges": [ { "predicate": "measures", "target": "agent:critic#1" } ],
    "body": { "loop": "loop:agent-map", "parent_agent": "agent:ff-personal", "tokens": 12030, "usd": 0.18 } }
]
```
**Линза (конструктор):**
```json
{ "id": "lens:loop-cost-tree", "type": "view",
  "over": "type=snapshot",
  "filter": "body.loop == 'loop:agent-map'",
  "group_by": "measures.target -> delegation-tree",
  "aggregate": { "tokens": "sum", "usd": "sum", "roll_up": "children->parent" } }
```
**Выход (что вернётся):**
```
loop:agent-map — итого 60 150 токенов · $0.89
└─ agent:ff-personal    48 120 · $0.71
   └─ agent:critic#1    12 030 · $0.18   (под-агент, свернут в родителя)
```

### Линза B — «все задачи проекта, by-branch»

**Вход (узлы):** задачи проекта `project:ff` (task:001 из §3 + ещё две).
**Линза (конструктор):**
```json
{ "id": "lens:tasks-by-branch", "type": "view",
  "over": "type=task",
  "filter": "edges[predicate=belongs-to, target='project:ff']",
  "group_by": "edges[predicate=belongs-to, target~branch:*].target",
  "show": ["id", "state.status", "roles.executor"] }
```
**Выход (что вернётся):**
```
branch:example (active)
├─ task:001  in_progress  → agent:ff-personal
└─ task:002  todo         → agent:critic#1
branch:telegram-io (paused)
└─ task:003  blocked      → user:owner
```
Одни и те же задачи можно тут же пересобрать `group_by: roles.executor` — получишь «кто чем занят»,
БЕЗ переписывания данных. Линза — угол зрения, не таблица-копия.

### Линза C — «что видно пользователю в этом топике»

**Вход (узлы):** пространство `space:topic-56` + узлы с `visibility`/`access`.
```json
{ "id": "space:topic-56", "type": "space",
  "edges": [ { "predicate": "scopes", "target": "user:guest-1" },
             { "predicate": "hosts",  "target": "agent:ff-personal" } ],
  "body": { "policy_default": { "can_read": true, "can_write": false },
            "policy_overrides": [ { "user": "user:guest-1", "role": "role:read-only" } ] } }
```
**Линза (конструктор):**
```json
{ "id": "lens:visible-to", "type": "view",
  "for": "user:guest-1",
  "in_space": "space:topic-56",
  "filter": "visibility.level != 'hidden' AND access.can_read matches viewer-role",
  "show": ["id", "type", "state.status"] }
```
**Выход (что вернётся):**
```
Гость user:guest-1 в topic-56 (role:read-only) видит:
  task:001    task    in_progress     (read: yes, write: no)
  output:msg-56  output  sent          (read: yes)
  скрыто: agent-memory, snapshot:*  (visibility != visible для гостя)
```
Тот же граф, другой зритель — другой ответ. Видимость и права — **грани узла**, а не отдельная система.

---

## 5. Что отсюда будем ВЫТЯГИВАТЬ

Модель «один конверт + рёбра + линзы» позволяет получать ответы, не строя под каждый вопрос новую структуру:

- **Стоимость чего угодно, деревом во времени** — «сколько сожрал этот луп и его под-агенты», «тренд
  контекста за сессию» — через `snapshot --measures-->` + линза-агрегат (пример A).
- **Работа в любом разрезе** — задачи by-branch, by-executor, by-status; поменял `group_by` — новый
  вид без миграции данных (пример B).
- **Персональная видимость** — «что видит вот этот гость в этом топике», «что скрыто за клапаном» —
  из граней `visibility`/`access`, а не из отдельной ACL-подсистемы (пример C).
- **Состав агента как данные** — «из каких скиллов/MCP собран агент прямо сейчас и что он делегировал» —
  обход рёбер `composed-of` / `delegates-to`.
- **Полная трасса** — «кто, когда и какой ценой менял узел» — из `acts[]` + `cost_ref` на снапшот,
  единообразно для ЛЮБОГО типа узла.

---

> Итог: система — не 12 разных таблиц, а один граф. **Данные лежат один раз; линза решает, каким углом
> на них смотреть.** Добавить новый вопрос = добавить новую линзу (узел `view`), а не новую схему.
