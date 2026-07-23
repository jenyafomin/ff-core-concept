---
node_type: design-note
title: loop / graph-loop — методология агента как граф лупа (конструктор данных)
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../08-skill-playlist/skill-playlist.design.md
  - ../13-action/action.design.md
---

# U9 · loop / graph-loop — эталон дефектовки

## 1. Суть
Методология работы агента — не линейный «loop-engineering» (шаг1→шаг2→шаг3→конец), а **граф**: узлы —
фазы/шаги, рёбра — переходы, среди которых есть ветвление и циклы (возврат к более ранней фазе). Это
**отдельный модуль**, с которым агент умеет взаимодействовать (спросить «в какой я фазе», переключиться,
получить рекомендованный плейлист фазы). Граф секвенирует `action → output`; событие (U10) может
триггерить весь луп или конкретный переход.

## 2. Переменные (поля)

### 2.1 `graph-loop` (сам граф — шаблон методологии)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество графа-методологии | `graph-loop:agent-manager-map` |
| `label` | строка | человекочитаемое имя | `"Картирование агентской системы"` |
| `phases` | node[] | узлы графа (см. 2.2) | `[phase:frame, phase:build, phase:verify, ...]` |
| `transitions` | edge[] | рёбра графа (см. 2.3) | `[{from, to, condition}, ...]` |
| `entry_phase` | ссылка | с чего граф стартует | `"phase:frame"` |
| `terminal_phases` | ссылка[] | где граф может завершиться | `["phase:done"]` |
| `state` | конструктор | версия графа, активен ли как методология | `{version: 2, status: "active"}` |
| `acts` | акт[] | история правок графа (редизайн методологии) | append-only |

### 2.2 `phase` (узел графа — фаза/шаг)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество фазы | `phase:frame` |
| `label` | строка | что это за фаза | `"Framing — держим высоту, не спешим в код"` |
| `kind` | enum | тип узла | `"phase" \| "checkpoint" \| "branch" \| "loop-back-target"` |
| `bound_playlist` | ссылка | какой плейлист/скиллы включаются на входе (→ U8) | `"playlist:design-mode"` |
| `expected_action` | конструктор | что агент делает в этой фазе | `{kind: "elicit", output_shape: "concept-nodes"}` |
| `exit_conditions` | конструктор[] | что должно быть верно, чтобы уйти дальше | `[{check: "owner-said-build", to: "phase:build"}]` |

### 2.3 `transition` (ребро графа)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `from` / `to` | ссылка | между какими фазами | `"phase:build" → "phase:verify"` |
| `type` | enum | природа перехода | `"forward" \| "branch" \| "loop-back" \| "abort"` |
| `condition` | конструктор | когда срабатывает | `{on: "check-failed", ref: "verify.result=fail"}` |
| `triggered_by` | enum | кто инициирует переход | `"agent-decision" \| "event" \| "owner-command"` |

### 2.4 `loop-run` (живой прогон графа — экземпляр, не шаблон)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество конкретного прогона | `loop-run:2026-07-23-a` |
| `graph_ref` | ссылка | по какому графу идёт | `"graph-loop:agent-manager-map"` |
| `current_phase` | ссылка | где сейчас | `"phase:build"` |
| `history` | акт[] | пройденные фазы/переходы (append-only, снапшоты) | `[{at, phase, action, output_ref}]` |
| `sequence` | конструктор | текущий action→output | `{action: "act:write-file", output: "output:…"}` |

## 3. Под-сущности (сами становятся узлами)
- `action` (U13) — конкретное действие агента внутри фазы (→ ребро `sequences`). Теперь отдельная
  единица со своим домом — см. `../13-action/action.design.md` (было дырой, реконсиляция завела её).
- `checkpoint` — особый вид `phase` с обязательной проверкой (часто требует `playlist.purpose_tag="check"`).
- `loop-back-edge` — переход назад к уже пройденной фазе (цикл), несёт `reason` (напр. «критик вернул»).
- `event-trigger` — привязка события (U10) к запуску лупа целиком или к конкретному переходу.

## 4. Связи (рёбра)
```
agent(U1) --drives--> loop/graph-loop(U9)
graph-loop --composed-of--> phase, transition
loop-run --instantiates--> graph-loop            (экземпляр графа-шаблона)
phase --bound-to--> playlist(U8)                 (см. U8: playlist.activation={axis,ref} — по умолчанию axis="loop-phase" и ref=phase.id, но привязка полиморфна)
loop --sequences--> action(U13) --emits--> output(U12)
event(U10) --triggers--> {loop-run, transition}  (было точечно `loop-run.start`, переведено в предикатную форму — деталь «на старте» уходит в meta ребра, не в target)
transition --loop-back-to--> phase               (цикл: возврат к более ранней фазе)
cost/snapshot(U11) --measures--> loop-run         (сколько потрачено по ходу графа)
```

## 5. Форма данных (конструктор)

**Быстрый пример (граф-шаблон + один живой прогон):**
```json
{
  "graph_loop": {
    "id": "graph-loop:agent-manager-map",
    "label": "Картирование агентской системы",
    "entry_phase": "phase:frame",
    "terminal_phases": ["phase:done"],
    "phases": [
      {
        "id": "phase:frame",
        "label": "Framing — держим высоту",
        "kind": "phase",
        "bound_playlist": "playlist:design-mode",
        "expected_action": { "kind": "elicit", "output_shape": "concept-nodes" },
        "exit_conditions": [ { "check": "owner-said-build", "to": "phase:build" } ]
      },
      {
        "id": "phase:build",
        "label": "Build — накидываем данные/файлы",
        "kind": "phase",
        "bound_playlist": "playlist:build-mode",
        "expected_action": { "kind": "write", "output_shape": "design-note.md" },
        "exit_conditions": [ { "check": "unit-drafted", "to": "phase:verify" } ]
      },
      {
        "id": "phase:verify",
        "label": "Verify — критик/проверка",
        "kind": "checkpoint",
        "bound_playlist": "playlist:check-mode",
        "expected_action": { "kind": "review", "output_shape": "verdict" },
        "exit_conditions": [
          { "check": "verdict=pass", "to": "phase:done" },
          { "check": "verdict=fail", "to": "phase:build" }
        ]
      },
      { "id": "phase:done", "label": "Done — синтез/хендофф", "kind": "phase" }
    ],
    "transitions": [
      { "from": "phase:frame", "to": "phase:build", "type": "forward", "triggered_by": "owner-command", "condition": { "on": "owner-said-build" } },
      { "from": "phase:build", "to": "phase:verify", "type": "forward", "triggered_by": "agent-decision", "condition": { "on": "unit-drafted" } },
      { "from": "phase:verify", "to": "phase:done", "type": "forward", "triggered_by": "agent-decision", "condition": { "on": "check-passed" } },
      { "from": "phase:verify", "to": "phase:build", "type": "loop-back", "triggered_by": "agent-decision", "condition": { "on": "check-failed" }, "reason": "критик вернул на доработку" }
    ],
    "state": { "version": 2, "status": "active" },
    "acts": [ { "at": "2026-07-20T…", "kind": "graph.redesigned", "note": "заменили линейный loop на граф с verify→build циклом" } ]
  },
  "loop_run": {
    "id": "loop-run:2026-07-23-a",
    "graph_ref": "graph-loop:agent-manager-map",
    "current_phase": "phase:build",
    "sequence": { "action": "act:write-skill-playlist-design", "output": "output:file-write#1" },
    "history": [
      { "at": "2026-07-23T09:30", "phase": "phase:frame", "action": "elicit-owner-intent", "output_ref": null },
      { "at": "2026-07-23T09:50", "phase": "phase:build", "action": "act:write-agent-design", "output_ref": "output:file-write#0" }
    ]
  }
}
```

**Вариант A (ветвление, не цикл):** `transition.type: "branch"` из `phase:build` — если `expected_action`
даёт `output_shape: "needs-research"`, переход не в `phase:verify`, а в отдельную `phase:research`
(параллельная ветка, потом сливается обратно рёбрами `forward` в `phase:verify`).

**Вариант B (событие триггерит луп, не команда владельца):** `event(U10)` типа `cron` или
`incoming-message` создаёт новый `loop-run` с `entry_phase` не по умолчанию, а из
`event.payload.suggested_entry`; в `history[0]` фиксируется `triggered_by: "event:cron#daily-review"`
вместо `owner-command`.

## 6. Дизайн-паттерн / метод
- **Граф ≠ линия** — методология явно допускает ветвление (`branch`) и возврат (`loop-back`), это и есть
  «граф-луп инжиниринг» в противовес линейному loop-engineering; цикл `verify→build` — рабочий пример.
- **Template vs instance** — `graph-loop` (шаблон методологии, редко меняется, версионируется) отделён от
  `loop-run` (живой прогон, много экземпляров, append-only история); это позволяет держать граф стабильным,
  а прогоны — расходным материалом с собственным снапшотом затрат (→ U11).
- **Phase-bound playlist** — каждая фаза явно тянет свой плейлист (U8 `activation.ref` = `phase.id`), а не
  «агент сам вспоминает, какие скиллы сейчас нужны» — снова лечит невидимость.
- **Event-as-first-class-trigger** — событие (U10) может запустить весь `loop-run` или дёрнуть конкретный
  `transition`, не только владелец командой; граф одинаково реагирует на оба источника.
- **Sequencing action→output** — `loop.sequences: action --emits--> output` даёт единый способ понять «что
  луп произвёл на этом шаге», совместимый с U12 (output/message, scope-контроль).

## 7. Открытые вопросы
- Q-1: `graph-loop` — один общий граф-методология на всю систему, или у каждого типа задачи/проекта свой
  граф-шаблон (и тогда `agent.state.active_loop` выбирает ИЗ библиотеки графов)?
- Q-2: `loop-back` без ограничения числа повторов — нужен ли `max_iterations`/предохранитель на фазе
  `verify→build`, чтобы не зациклиться бесконечно?
- Q-3: где живёт решение «эта фаза требует ветку `branch`» — жёстко в `exit_conditions` графа, или это
  может динамически предлагать сам агент по ходу (граф как soft-guideline, не hard state machine)? (см.
  concept.json Q-4 про связь playlist↔graph-loop — тот же класс вопроса: жёсткость vs гибкость привязки)
