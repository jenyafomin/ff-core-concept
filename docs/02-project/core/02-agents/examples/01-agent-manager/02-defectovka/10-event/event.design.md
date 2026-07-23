---
node_type: design-note
title: event — единица «событие» как конструктор данных
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../05-telegram/telegram.design.md
  - ../09-graph-loop/graph-loop.design.md
  - ../01-agent/agent.design.md
---

# U10 · event — эталон дефектовки

## 1. Суть
Событие — то, что «произошло» и способно **триггерить механику**: луп, действие или уведомление. Три
семьи источников: (а) **со стороны агента** — сам что-то инициировал; (б) **внутри системы** —
крон-задачи, системные уведомления в Telegram; (в) **входящее** — аудио/фото/документ/сообщение от
пользователя. Событие — не строка лога, а узел с `source/kind/payload/triggers`, который можно
проследить от возникновения до того, что он вызвал.

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество события | `event:2026-07-23T10:00:00Z:voice-in-1` |
| `source` | конструктор | откуда пришло (кто/что породил) | `{origin, actor, channel}` |
| `kind` | enum (типизация) | вид события — см. §3 | `"intake.voice"` |
| `payload` | конструктор (по kind) | данные события, форма зависит от kind | `{file_ref, duration_s}` |
| `context` | конструктор | где произошло | `{space, project}` |
| `triggers` | trigger[] (конструктор) | что событие ЗАПУСТИЛО (не что должно) | `[{mechanism, ref, status}]` |
| `state` | конструктор | текущий статус обработки | `{status, processed_at}` |
| `acts` | акт[] | история обработки (append-only) | `[{at, kind, note}]` |

## 3. Под-сущности (сами становятся узлами) — типизация видов
- `event.kind` — закрытый (расширяемый) справочник видов, три семьи:
  - **agent-originated**: `agent.action-completed`, `agent.delegated`, `agent.error`
  - **system-internal**: `system.cron-fired`, `system.notification`, `system.cost-threshold`
  - **intake (входящее)**: `intake.text`, `intake.voice`, `intake.photo`, `intake.document`
- `trigger` — связка события с тем, что оно вызвало: `{mechanism: "loop"|"action"|"notification",
  ref, status: "fired"|"skipped"|"failed"}` — один event может иметь 0..N триггеров (событие может не
  вызвать ничего, если правила не сработали).

## 4. Связи (рёбра)
```
event(U10) --triggers--> {loop(U9), action, notification}
telegram-module(U5) --receives--> event(U10)
event(U10) --occurs-in--> space(U4)
event(U10) --originates-from--> {agent(U1), user(U2), system}
cost/snapshot(U11) --measures--> event(U10)     (обработка события тоже стоит ресурс)
```

## 5. Форма данных (конструктор)

**Быстрый пример (входящее голосовое → триггерит луп):**
```json
{
  "id": "event:2026-07-23T10:00:00Z:voice-in-1",
  "type": "event",
  "source": { "origin": "intake", "actor": "user:owner", "channel": "telegram" },
  "kind": "intake.voice",
  "payload": { "file_ref": "tg-file:AwACAgIA...", "duration_s": 42, "transcribed": true },
  "context": { "space": "space:tg-ff-personal:topic-56", "project": "project:ff-personal" },
  "triggers": [
    { "mechanism": "loop", "ref": "loop:agent-manager-map", "status": "fired" }
  ],
  "state": { "status": "processed", "processed_at": "2026-07-23T10:00:05Z" },
  "acts": [ { "at": "2026-07-23T10:00:02Z", "kind": "transcribed", "note": "whisper-cpp ru" } ]
}
```

**Вариант A (системный крон, без входящего payload):**
`source.origin = "system"`, `kind = "system.cron-fired"`, `payload = {cron_id, schedule}`,
`triggers = [{mechanism: "notification", ref: "output:...", status: "fired"}]`.
**Вариант B (событие без триггера — «тихое» событие):**
`kind = "agent.action-completed"`, `triggers = []` — зафиксировано для истории/cost, но ничего не
вызвало (например, промежуточный шаг лупа).

## 6. Дизайн-паттерн / метод
- **Triggers как факт, не как правило.** `triggers[]` фиксирует, что РЕАЛЬНО произошло (fired/skipped/
  failed), а не декларацию «что должно случиться» — правила триггеринга живут отдельно (в
  `loop`/`rule`), событие только репортит результат применения правил.
- **Kind как типизированный, а не свободный текст.** Три семьи (`agent-*` / `system.*` / `intake.*`)
  дают предсказуемую форму `payload` на каждый вид — не «event с произвольным JSON внутри».
- **Событие — узел с историей, не строка лога.** `acts[]` и `state.status` позволяют проследить путь
  события (получено → обработано → что вызвало), что отличает его от plain log line.

## 7. Открытые вопросы
- Q-1: события — append-only поток (`_log/`, по закону doc-tree — trace, не knowledge) или тоже узлы
  графа знаний с TTL/архивацией? Похоже на «два вещества» из overview §5 — нужно явно отнести event к
  trace или к knowledge.
- Q-2: `triggers` пишется синхронно в момент обработки, или это derived-вид (собирается запросом по
  рёбрам `event → loop/action`, а не хранится инлайн)?
- Q-3: кто владеет типизацией `kind` (справочник видов) — сама единица event, или это расширяется
  каждым модулем-источником (`telegram-module` добавляет свои `intake.*`, `graph-loop` — свои
  `agent.*`)?
