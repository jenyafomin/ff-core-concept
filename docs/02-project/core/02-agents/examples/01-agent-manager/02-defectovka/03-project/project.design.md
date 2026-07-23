---
node_type: design-note
title: project — единица «контекст работы агента» как конструктор данных
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../06-planning/planning.design.md
  - ../07-knowledge-base/knowledge-base.design.md
---

# U3 · project — единица «контекст работы агента» как конструктор данных

## 1. Суть
Контекст, в котором агент работает: знания, задачи, цели, текущее состояние, правила и
дополнительные скиллы поверх тех, что несёт сам агент. **Сейчас** это живёт как обычная документация
(папки `docs/`, файлы правил) — читаемо человеком, но не граф. **Целится** стать частью базы знаний
(U7): project как партиция графа, а не набор файлов. Граница между «project как документация» и
«project как часть knowledge-base» пока не проведена — это главный открытый вопрос единицы (см. §7).

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество проекта | `project:ff-personal` |
| `identity` | конструктор | имя, где физически лежит, чартер | `{name, root_path, charter_ref}` |
| `state` | конструктор | текущая фаза/статус работы | `{phase, status, since}` |
| `knowledge` | конструктор (переходный!) | сейчас: ссылки на доки; целится: партиция U7 | `{mode: "docs"\|"kb-partition", refs[]}` |
| `goals` | goal-node[] (конструктор) | цели проекта, не строка | `[{id, statement, horizon, status}]` |
| `rules` | rule-node[] (конструктор) | правила, которыми проект владеет (rule = утверждение-норма, НЕ путать с `policy`-узлом настройки поведения движка, см. `../../_schema/envelope.md`) | `[{id, applies_to, statement, source}]` |
| `skills_extra` | ref[] | доп. скиллы поверх агентских дефолтных (→ U8) | `[skill:doc-discipline]` |
| `tasks` | ref[] | задачи проекта (владеет planning-module, U6) | `[task:...]` |
| `acts` | акт[] | история изменений состояния/фазы (append-only) | `[{at, kind, from, to}]` |

## 3. Под-сущности (сами становятся узлами)
- `goal-node` — цель проекта: формулировка + горизонт + статус (не строка в списке «цели»).
- `rule-node` — правило, которым владеет ИМЕННО проект (project-local), в отличие от универсальных
  правил агента/системы — своя запись, свой источник (`.claude/rules/*` или `docs/`). `rule` = норма
  (утверждение «так надо»); `policy` — отдельный тип узла настройки поведения движка («как именно») —
  разные вещи, project владеет `rule`, а не `policy`.
- `knowledge-link` — переходная сущность: пока `mode: "docs"`, это список ссылок на файлы; когда
  `mode: "kb-partition"` — это один `ref` на партицию графа в U7.

## 4. Связи (рёбра)
```
agent(U1) --runs-in--> project(U3)
project(U3) --has--> {knowledge, task(U6), goal}
project(U3) --owns--> rule
project(U3) --owns--> skill(U8)                          (доп. скиллы поверх агентских)
task(U6) --belongs-to--> {project(U3), branch/flow}
knowledge-base(U7) --stores--> project-knowledge          (целевое состояние knowledge)
space(U4) --binds-to--> project(U3)
```

## 5. Форма данных (конструктор)

**Быстрый пример:**
```json
{
  "id": "project:ff-personal",
  "type": "project",
  "identity": {
    "name": "FF Personal Management",
    "root_path": "/Users/mac16/Documents/IT/Apps/FF-Personal-Managment",
    "charter_ref": "docs/product/VISION.md"
  },
  "state": { "phase": "design-not-build", "status": "active", "since": "2026-06-15" },
  "knowledge": {
    "mode": "docs",
    "refs": ["docs/02-project/core/01-brain/INDEX.md", "docs/INDEX.md"]
  },
  "goals": [
    { "id": "goal:agent-map-01", "statement": "Собрать карту единиц агентской системы как данные", "horizon": "текущая сессия", "status": "in-progress" }
  ],
  "rules": [
    { "id": "rule:doc-tree", "applies_to": "project", "statement": "Дисциплина дерева документов", "source": ".claude/rules/doc-tree.md" }
  ],
  "skills_extra": ["skill:doc-discipline", "skill:concept-first"],
  "tasks": ["task:defectovka-02-user", "task:defectovka-03-project"],
  "acts": [ { "at": "2026-06-15", "kind": "phase.set", "from": null, "to": "design-not-build" } ]
}
```

**Вариант A (текущее состояние, «живёт как документация»):** `knowledge.mode = "docs"`, `refs[]` —
просто пути к md-файлам; агент читает их напрямую, граф отсутствует.
**Вариант B (целевое состояние, «часть базы знаний»):** `knowledge.mode = "kb-partition"`,
`knowledge.refs = ["kb:ff#project-knowledge:ff-personal"]` — один адрес в U7, документы становятся
узлами графа, а не файлами вне его.

## 6. Дизайн-паттерн / метод
- **Transitional-mode field.** `knowledge.mode` явно фиксирует, что единица СЕЙЧАС в переходном
  состоянии (docs → kb-partition), вместо того чтобы притворяться, будто граф уже есть — честная
  дефектовка, а не забегание вперёд.
- **Goals/rules-as-nodes.** Цели и правила — узлы со своим статусом и источником, а не текстовые
  списки в чартере — позволяет агенту трекать «какая цель ещё in-progress», а не перечитывать доку.
- **Ownership-as-edge (project owns rule/skill).** Проект владеет частью правил/скиллов отдельно от
  агента — снимает путаницу «это правило агента или правило именно этого проекта».

## 7. Открытые вопросы
- Q-1 (главный): где физическая граница **project ↔ knowledge-base**? Один project = одна партиция
  графа в U7, и «project» как отдельная единица тогда вырождается в обёртку (identity+state+rules)? Или
  knowledge остаётся отдельно и project лишь на неё ссылается? Тот же вопрос всплывает и в U2 (Q-1) —
  нужно одно сквозное решение.
- Q-2: `rules` — как разграничить универсальные правила (`~/.claude/rules/`, применяются ко всем
  проектам) и project-local (`.claude/rules/`) как узлы, если физически это два разных файловых дома?
- Q-3: может ли один `project` обслуживать несколько одновременных `agent` runtime (разные топики/
  пространства работают в одном и том же project) — и как это не путать с `space --binds-to--> project`
  (пространство ⊆ project, а не наоборот)?
