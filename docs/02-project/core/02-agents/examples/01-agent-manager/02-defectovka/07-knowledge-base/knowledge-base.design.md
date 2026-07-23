---
node_type: design-note
title: knowledge-base-module — единица «база знаний» как конструктор данных
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../02-user/user.design.md
  - ../03-project/project.design.md
---

# U7 · knowledge-base-module — единица «база знаний» как конструктор данных

## 1. Суть
Модуль над графом знаний: базовые операции чтения/записи/связывания + слой **линз** — настраиваемых
видов на разную информацию. Хранит три партиции знания в одном графе — `user-knowledge`,
`project-knowledge`, `agent-memory` — но не как три отдельных склада, а как размеченные области
одного субстрата. Линза — **метка вида, не копия данных**: агент настраивает, ЧТО видно, не создавая
второй экземпляр информации.

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество графа/инстанса базы | `kb:ff` |
| `storage` | конструктор | где физически лежит субстрат | `{backend: "md+frontmatter", root_path}` |
| `partitions` | partition-node[] (конструктор) | размеченные области графа | `[{id, kind, owner_ref}]` |
| `operations` | capability-node[] (конструктор) | что вообще можно делать с графом | `[{id, verb, access, requires_valve}]` |
| `views` | view-node[] (конструктор; было «lens», унифицировано с envelope.view) | настраиваемые виды поверх партиций | `[{id, name, applies_to, filter}]` |
| `acts` | mutation-act[] | история записей/изменений графа (append-only) | `[{at, op, node_id, by}]` |

## 3. Под-сущности (сами становятся узлами)
- `partition` — размеченная область графа: `user-knowledge` (→ факты конкретного U2), `project-knowledge`
  (→ знание конкретного U3), `agent-memory` (→ то, что помнит сам агент между сессиями). Партиция — не
  отдельная база, а тег/namespace внутри одного субстрата.
- `view` (было «lens») — сохранённый вид: имя + предикат-фильтр + к какой партиции/партициям
  применяется. View не хранит данные — только правило отбора и представления. Термин унифицирован с
  `envelope.view` (см. `../../_schema/envelope.md`).
- `capability` (операция) — базовая операция над графом (`read`, `write`, `link`, `query`) со своим
  `access` (насколько широко можно дотянуться: own-partition/cross-partition/any-partition) и пометкой,
  требует ли valve (см. `.claude/rules` — валв только на необратимые внешние действия).

## 4. Связи (рёбра)
```
knowledge-base(U7) --stores--> {user-knowledge, project-knowledge, agent-memory}
project(U3) --has--> knowledge                    (project.knowledge → партиция project-knowledge в U7)
user(U2) --owns--> user-knowledge                  (партиция U7, адресуемая из U2; было точечно `user.knowledge_ref -->`, переведено в предикатную форму)
agent(U1) --views-via--> view(U7)                  (агент смотрит на граф через view, не напрямую; было «lens»)
```
> Оба этих ребра — расширение поверх исходной карты overview (agent--views-via-->view делает явным
> механизм, которым U1 читает U7; user--owns-->user-knowledge заменяет точечную нотацию `user.knowledge_ref`).
> Уже подняты в `../../01-overview/README.md` §4 реконсиляцией.

## 5. Форма данных (конструктор)

**Быстрый пример:**
```json
{
  "id": "kb:ff",
  "type": "knowledge-base",
  "storage": { "backend": "md+frontmatter", "root_path": "docs/" },
  "partitions": [
    { "id": "kb:ff#user-knowledge:owner", "kind": "user-knowledge", "owner_ref": "user:owner" },
    { "id": "kb:ff#project-knowledge:ff-personal", "kind": "project-knowledge", "owner_ref": "project:ff-personal" },
    { "id": "kb:ff#agent-memory:ff-personal", "kind": "agent-memory", "owner_ref": "agent:ff-personal" }
  ],
  "operations": [
    { "id": "op:read", "verb": "read", "access": "any-partition", "requires_valve": false },
    { "id": "op:write", "verb": "write", "access": "own-partition", "requires_valve": false },
    { "id": "op:link", "verb": "link", "access": "cross-partition", "requires_valve": false }
  ],
  "views": [
    {
      "id": "view:tasks-only",
      "name": "только задачи проекта",
      "applies_to": "kb:ff#project-knowledge:ff-personal",
      "filter": { "node_type": "task", "status": ["open", "in-progress"] }
    }
  ],
  "acts": [ { "at": "2026-07-23T10:00:00Z", "op": "write", "node_id": "fact:owner-002", "by": "agent:ff-personal" } ]
}
```

**Вариант A (агент без view, admin-режим):** запрос идёт напрямую к партиции без `view` — видит всё,
на что даёт право `operations` (полезно для владельца/отладки, не для рядового space).
**Вариант B (view, привязанный к пространству):** `view.applies_to` сужен до конкретного `space` (U4) —
например, гость в топике видит только `view:public-facts`, не весь `user-knowledge`; view здесь
пересекается с `policy_overrides` пространства (см. U4 §7 Q-3).

## 6. Дизайн-паттерн / метод
- **View-as-lens, not copy** (термин унифицирован — было «lens», теперь везде `view`). Ключевой паттерн
  запроса: view — метка правила отбора поверх общего субстрата, а не второй экземпляр данных. Снимает
  риск рассинхрона «копия устарела» и делает виды дешёвыми (создать view = не скопировать граф, а
  описать фильтр).
- **Partition-as-namespace.** Три вида знания (user/project/agent-memory) живут в ОДНОМ графе как
  размеченные области, а не три отдельных хранилища — упрощает cross-partition связи (напр. факт о
  пользователе, привязанный к конкретной задаче проекта).
- **Capability-as-node.** Операции над графом — сами объекты со `access` и пометкой valve, а не
  зашитый в код список прав — согласуется с `access_policy` в U2 и `policy_default/overrides` в U4.

## 7. Открытые вопросы
- Q-1: физически — один граф с тегами-партициями, или отдельные графы/индексы per partition с общим
  слоем связей поверх? Влияет на то, как дёшево линзе смотреть «сквозь» несколько партиций сразу.
- Q-2: кто создаёт/утверждает линзу — агент автономно по ходу работы, или требуется явное одобрение
  владельца (по аналогии с R1/promotion-правилами из `~/.claude/rules/on-demand/evolution.md`)?
- Q-3: где заканчивается **project-knowledge** (U3) и начинается **agent-memory** (U1)? Например,
  «агент запомнил, что в этом проекте лучше не спешить к коду» — это факт о проекте или память агента?
  Тот же класс вопроса, что Q-1 в U2 и Q-1 в U3 — граница между «единица владеет знанием» и «знание
  живёт в U7 как партиция» решается один раз на все три единицы.
