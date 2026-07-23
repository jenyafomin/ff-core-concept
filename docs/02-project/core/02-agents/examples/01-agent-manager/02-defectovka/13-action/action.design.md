---
node_type: design-note
title: action — единица «единичное действие» как конструктор данных (реконсиляция — была дырой)
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../09-graph-loop/graph-loop.design.md
  - ../11-cost-snapshot/cost-snapshot.design.md
  - ../12-output/output.design.md
---

# U13 · action — центральный узел между методологией и результатом

> Заведён реконсиляцией: узел упоминался в overview и в 09-graph-loop/09-event/11-cost-snapshot
> (`loop --sequences--> action --emits--> output`, `snapshot --measures--> action`, `event --triggers--> action`)
> но не имел собственного дома — карта «лгала». Это дом. Собран по эталону `01-agent/agent.design.md`.

## 1. Суть
Единичное действие агента внутри фазы лупа — атом работы, который **соединяет методологию (loop/phase)
с результатом (output)** и служит точкой отсчёта стоимости (snapshot). Не «шаг в логе», а узел: что
вызвано (скилл/инструмент), с каким входом, что получилось, сколько стоило. `action` — не сам
tool-call и не сам loop-run целиком, а единица между ними: одно осмысленное действие агента, которое
можно указать пальцем и спросить «что это дало» (→ output) и «сколько это стоило» (→ snapshot).

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество действия | `action:2026-07-23-write-skill-playlist-design` |
| `kind` | enum | природа действия | `tool-call \| skill-invocation \| decision \| write` |
| `invocation` | конструктор | что именно вызвано — скилл/инструмент (не строка) | `{kind: "skill" \| "tool", ref: "skill:doc-discipline"}` |
| `context_ref` | конструктор | где это произошло — фаза + прогон лупа (не плоское поле) | `{phase: "phase:build", loop_run: "loop-run:2026-07-23-a"}` |
| `input` | конструктор | что подано на вход действия | `{prompt_summary, refs[]}` |
| `result` | конструктор | что получилось | `{status: "ok" \| "failed", summary}` |
| `output_ref` | ref | что действие произвело вовне (→ U12) | `output:file-write#1` |
| `state` | конструктор | текущий статус исполнения | `{status: "running" \| "done" \| "failed"}` |
| `acts` | акт[] | история самого действия (старт/финиш, append-only) | `[{at, kind}]` |

## 3. Под-сущности (сами становятся узлами)
- `invocation-target` — конкретный скилл/инструмент/MCP-tool, который дёрнули (ссылка на U8/mcp-binding
  агента, не копия).
- `result-artifact` — то, что действие реально произвело; чаще всего это `output_ref` (→ U12), но может
  быть 0 (действие не породило видимого выхода — например, промежуточное решение) или несколько.

## 4. Связи (рёбра)
```
loop/graph-loop(U9) --sequences--> action
action --emits--> output(U12)
action --invokes--> {skill(U8), tool/mcp}
agent(U1) --performs--> action
cost/snapshot(U11) --measures--> action
event(U10) --triggers--> action
```

## 5. Форма данных (конструктор)

**Быстрый пример:**
```json
{
  "id": "action:2026-07-23-write-skill-playlist-design",
  "type": "action",
  "kind": "write",
  "invocation": { "kind": "tool", "ref": "tool:write-file" },
  "context_ref": { "phase": "phase:build", "loop_run": "loop-run:2026-07-23-a" },
  "input": { "prompt_summary": "наполнить дефектовку U8 по эталону U1", "refs": ["agent.design.md"] },
  "result": { "status": "ok", "summary": "skill-playlist.design.md создан" },
  "output_ref": "output:file-write#1",
  "state": { "status": "done" },
  "acts": [
    { "at": "2026-07-23T09:38:00+03:00", "kind": "action.started" },
    { "at": "2026-07-23T09:40:00+03:00", "kind": "action.completed" }
  ]
}
```

**Вариант A (действие без видимого выхода):** `kind: "decision"`, `output_ref: null` — например, агент
внутри фазы решил, в какую ветку пойти (branch), это action, но он не эмитит output — эмитит только
переход в графе (`transition`, → U9).
**Вариант B (действие, вызванное событием, не лупом):** `context_ref.loop_run` есть, но `acts[0]`
несёт `triggered_by: "event:cron#daily-review"` — событие (U10) дёрнуло конкретное действие напрямую,
не весь loop-run (см. U10 §7 Q-1 про trace vs knowledge — тот же вопрос применим и к action).

## 6. Дизайн-паттерн / метод
- **Action-as-bridge.** `action` — единственная единица, которая одновременно принадлежит «методологии»
  (`context_ref.phase/loop_run`, → U9) и «результату» (`output_ref`, → U12) — без неё эти два мира не
  сходятся в одном узле, и непонятно, какой output от какой фазы.
- **Cost-attribution point.** `snapshot(U11) --measures--> action` даёт точечную (не только агрегатную по
  агенту) стоимость: «этот конкретный шаг стоил X», не только «агент в целом стоил Y».
- **Invocation-as-data, не как вызов функции в коде.** `invocation{kind,ref}` — тот же паттерн, что
  `skill.bound_to`/`playlist.activation` (axis+ref): что вызвано — видимые данные, не скрытая обвязка.

## 7. Открытые вопросы
- Q-1: гранулярность — один `action` = один tool-call, или один `action` = одно осмысленное действие
  агента, которое МОЖЕТ состоять из нескольких tool-call (тогда tool-call — под-сущность action, не сам
  action)? Текущий черновик склоняется ко второму (см. пример: `invocation.ref: "tool:write-file"`, но
  `kind: "write"` — уже осмысленный уровень, не сырой вызов).
- Q-2: `action` — узел графа знаний (хранится) или derived-проекция из `loop-run.history[]` (см. U9
  §2.4) — не дублировать историю в двух местах? Тот же класс вопроса, что U10 §7 Q-1 (trace vs knowledge).
- Q-3: если `action` не породил `output_ref` (Вариант A) — это ещё валидный `action`, или в этом случае
  правильнее завести узел `transition`(U9) напрямую, без action между ними?
