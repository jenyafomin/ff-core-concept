---
node_type: design-note
title: skill / playlist(list) — единица «скилл + плейлист» как конструктор данных
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../09-graph-loop/graph-loop.design.md
---

# U8 · skill / playlist(list) — эталон дефектовки

## 1. Суть
Скилл — не «подключился и исчез», а **видимый узел данных**: что он делает, к чему привязан (фаза лупа,
формат общения, тип проверки), включён ли сейчас. Плейлист — **лист** (узел), который собирает скиллы в
быстро подключаемый набор; листы могут ссылаться друг на друга и складываться в **дерево листов** (или
оставаться линейными). Пофиксить главный косяк владельца: «скиллы подключаются, но невидимы для глаза».

## 2. Переменные (поля)

### 2.1 `skill`

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество скилла | `skill:concept-first` |
| `source` | конструктор | откуда скилл (плагин/проект/глобальный) | `{kind: "global", ref: "~/.claude/skills/concept-first"}` |
| `purpose` | строка | одна фраза что делает | `"держит высоту идеи, не даёт свалиться в код"` |
| `bound_to` | конструктор[] | к чему привязан (совпадает с фазами U9) | `[{axis: "loop-phase", ref: "phase:frame"}, {axis: "format", ref: "long-form"}]` |
| `trigger_hints` | строка[] | слова-триггеры (когда включать) | `["держи высоту", "не спеши в реализацию"]` |
| `state` | конструктор | включён ли сейчас, для кого (было `scope` — переразведено в `applies_to`) | `{enabled: true, applies_to: "agent:ff-personal"}` |
| `acts` | акт[] | история подключений/отключений | append-only |

### 2.2 `playlist` (лист)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество листа | `playlist:design-mode` |
| `label` | строка | человекочитаемое имя | `"Режим проектирования"` |
| `purpose_tag` | enum | под что лист заточен | `"loop-start" \| "check" \| "format" \| "mixed"` |
| `items` | конструктор[] | скиллы в листе, с порядком/весом | `[{skill: "skill:concept-first", order: 1, required: false}]` |
| `parent_lists` | ссылка[] | листы, из которых наследует (дерево) | `["playlist:base-communication"]` |
| `child_lists` | ссылка[] | листы, что растут из этого (дерево) | `["playlist:design-mode-strict"]` |
| `activation` | конструктор | как включается лист целиком — привязка **полиморфна** (см. схема §Уровень4 DEC): `axis` называет тип цели, `ref` — конкретный узел; по умолчанию `axis:"loop-phase"`, но может быть `loop`/`task-kind` | `{mode: "manual" \| "auto", axis: "loop-phase", ref: "phase:frame"}` |
| `state` | конструктор | активен ли сейчас | `{active: true, activated_by: "agent:ff-personal"}` |
| `acts` | акт[] | история сборки/правок листа | append-only |

## 3. Под-сущности (сами становятся узлами)
- `skill-binding` — конкретное включение скилла В КОНКРЕТНОМ плейлисте (order, required, override триггеров).
- `list-edge` — ребро наследования между листами (parent→child), несёт `merge_policy` (заменяет/дополняет).
- `activation-rule` — правило, когда лист включается сам (напр. «на входе в фазу X плейлиста N»).

## 4. Связи (рёбра)
```
playlist --bundles--> skill
skill --bound-to--> {loop-phase(U9), format, check}
playlist --extends--> playlist            (дерево листов: parent_lists/child_lists)
agent(U1) --composed-of--> playlist       (агент несёт активный плейлист, см. U1.composition)
loop/graph-loop(U9) --activates--> playlist   (вход в фазу может включить лист целиком)
event(U10) --triggers--> playlist             (внешнее событие тоже может включить лист — конкретно через playlist.activation, было точечной нотацией `playlist.activation`, переведено в предикатную форму)
```

## 5. Форма данных (конструктор)

**Быстрый пример (одновременно skill + playlist, с деревом листов):**
```json
{
  "skill": {
    "id": "skill:concept-first",
    "source": { "kind": "global", "ref": "~/.claude/skills/concept-first" },
    "purpose": "держит высоту идеи, не даёт свалиться в код раньше времени",
    "bound_to": [
      { "axis": "loop-phase", "ref": "phase:frame" },
      { "axis": "format", "ref": "long-form-reflective" }
    ],
    "trigger_hints": ["держи высоту", "не спеши в реализацию", "сначала концепт"],
    "state": { "enabled": true, "applies_to": "agent:ff-personal" },
    "acts": [ { "at": "2026-07-23T10:00", "kind": "bound", "playlist": "playlist:design-mode" } ]
  },
  "playlist": {
    "id": "playlist:design-mode",
    "label": "Режим проектирования",
    "purpose_tag": "loop-start",
    "items": [
      { "skill": "skill:concept-first", "order": 1, "required": true },
      { "skill": "skill:doc-discipline", "order": 2, "required": false }
    ],
    "parent_lists": ["playlist:base-communication"],
    "child_lists": [],
    "activation": { "mode": "auto", "axis": "loop-phase", "ref": "phase:frame" },
    "state": { "active": true, "activated_by": "agent:ff-personal" },
    "acts": [ { "at": "2026-07-23T09:40", "kind": "list.created" } ]
  }
}
```

**Вариант A (плейлист «для проверки», конец лупа):**
`purpose_tag: "check"`, `activation: {axis: "loop-phase", ref: "phase:verify"}`, `items` включает `skill:code-review`,
`skill:verify` с `required: true` (проверка обязательна, в отличие от старта, где скиллы — подсказки).

**Вариант B (линейный лист без дерева):** `parent_lists: []`, `child_lists: []` — просто плоский набор
(«быстрый плейлист для формата общения в TG»), не обязан расти в дерево.

## 6. Дизайн-паттерн / метод
- **Skill-as-data с `bound_to`** — скилл несёт явную привязку (фаза/формат/проверка), а не «висит в
  конфиге»; это и есть лекарство от «подключается, но невидимо».
- **Playlist-as-node, не массив** — лист сам узел с состоянием/активацией/историей, а не поле `skills[]`
  внутри agent; поэтому листы можно переиспользовать, версионировать, включать по событию.
- **Дерево листов через `extends`** — пересечение плейлистов моделируется наследованием
  (`parent_lists`/`child_lists`), а не копированием скиллов между листами.
- **Много скиллов сразу** — `items[]` с `order`/`required` даёт контролируемую пачку включения, не «один
  скилл на раз».

## 7. Открытые вопросы
- Q-1: `bound_to.axis: "loop-phase"` — ссылается на КОНКРЕТНЫЙ узел графа (U9 `phase:*`) или на абстрактный
  тип фазы, общий для разных графов? (влияет на переносимость плейлиста между лупами)
- Q-2: конфликт `required` скиллов внутри унаследованного дерева листов (parent требует X, child исключает
  X) — чья воля побеждает?
- Q-3: activation `mode: "auto"` (по умолчанию `axis: "loop-phase"`, но полиморфно — см. схема §Уровень4
  DEC) — кто фактически включает лист: сам граф-луп (U9) как акт, или отдельный слушатель событий (U10)?
  (см. concept.json Q-4)
