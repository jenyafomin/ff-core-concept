---
node_type: design-note
title: Системный конверт узла — поля, которыми владеет движок
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ./README.md
  - ../01-agent-manager/03-schema/README.md
---

# Системный конверт (envelope) — общий скелет ЛЮБОГО узла

> Эти поля есть у каждого узла независимо от типа. Их не придумывают под тип — движок гарантирует их
> присутствие и смысл. «Обычные» (доменные) поля живут рядом, в `body`, и свои у каждого типа.

## Форма

```json
{
  "id": "task:onboard-42",
  "type": "task",
  "state": { "status": "in_progress", "phase": "phase:execute" },

  "edges": [
    { "predicate": "belongs-to", "target": "project:ff" },
    { "predicate": "assigned-to", "target": "agent:ff-personal", "meta": { "since": "…" } }
  ],

  "view":       [ { "id": "lens:by-branch", "filter": "edges.branch", "note": "проекция, не копия" } ],
  "visibility": { "level": "visible-to-ai", "valve": "none" },
  "access":     { "can_read": ["agent:*"], "can_write": ["agent:ff-personal"] },

  "acts":       [ { "at": "…", "kind": "state.changed", "by": "agent:ff-personal", "cost_ref": "snapshot:…" } ],
  "policy_ref": [ "policy:snapshot-adaptive", "policy:knowledge-ref" ],

  "body": { "…обычные поля типа task…": "срок, приоритет, ветка/поток" }
}
```

## Поля конверта

| Поле | Владелец | Смысл | Примечание |
|------|----------|-------|------------|
| `id` | движок | адрес `type:slug` | стабилен, не переиспользуется |
| `type` | движок | тип узла | решает форму `body` и дом |
| `state` | движок+домен | живое состояние | статус/текущая фаза |
| `edges[]` | движок | полиморфные связи | `{predicate, target, meta}`; предикат из словаря (README §2) |
| `view[]` (lens) | движок | сохранённые проекции | вид/фильтр над узлом или графом — **без дубля данных** |
| `visibility` | движок | кого видно + клапан | эпистемический статус = метка, не стена; клапан только на внешнее необратимое |
| `access` | движок | права чтения/записи | это НЕ visibility и НЕ scope-как-target |
| `acts[]` | движок | append-only история | каждый акт может нести `cost_ref` → узел snapshot |
| `policy_ref[]` | движок | ссылки на политики | «по-разному» = данные (см. ниже) |
| `body` | домен | обычные поля типа | единственное, что различается между типами |

## Политики (policy) — где живёт «по-разному»

Настройка поведения — это отдельный узел `policy`, на который узлы ссылаются `policy_ref`. Примеры:

```json
{ "id": "policy:snapshot-adaptive", "type": "policy", "body":
  { "target": "snapshot", "cadence": "per-action", "intensify_when": "context_growth>rate", "store": "tree", "aggregate": "children" } }

{ "id": "policy:knowledge-ref", "type": "policy", "body":
  { "target": "knowledge", "mode": "ref", "fallback": "embed" } }
```

Движок читает policy → ведёт себя по-разному в разных местах/времени, **без изменения схемы**. Это и есть
first-class гибкость (DEC-6): режим — данные, а не ветка кода.

## Инвариант
Обычные поля НИКОГДА не дублируют системные (нет своего «status» в `body`, если есть `state.status`).
Наивный массив/строка вместо конструктора в `body` — сигнал на правку (закон качества дефектовки).
