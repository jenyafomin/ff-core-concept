---
node_type: design-note
title: event-trigger — как событие запускает loop/action/notification
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../02-defectovka/10-event/event.design.md
  - ../02-defectovka/09-graph-loop/graph-loop.design.md
  - ./README.md
---

# Процесс: event-trigger

## Суть
Событие (аудио/крон/входящее) — узел, который может **триггерить** механику: весь `loop`, конкретное
`action` или `notification`. Событие только репортит, ЧТО реально сработало — правила решения живут
отдельно (в графе-лупе/rule), не внутри события.

## Вход
- `event(U10)` — `source`, `kind`, `payload`, `context`, `triggers[]`, `state`.
- Правила срабатывания — живут в `graph-loop` (какие фазы стартуют от каких событий) или в отдельном
  `rule`-узле, не в самом event.
- Целевые механики: `loop-run`, `action`, `notification` (→ `output`).

## Шаги
1. Событие происходит (одна из трёх семей: `agent-*` / `system.*` / `intake.*`) → узел `event` создаётся,
   `state.status = received`.
2. Правила срабатывания (вне события) сверяют `event.kind`/`context` с зарегистрированными триггерами
   (напр. «на входящее голосовое — стартовать luup», «на cron — прогнать snapshot-обзор»).
3. Для каждого совпавшего механизма — попытка сработать: запись `{mechanism, ref, status}` добавляется в
   `event.triggers[]`.
4. Если `mechanism = loop` — создаётся новый `loop-run` (или продолжается существующий переходом),
   `history[0].triggered_by = "event:…"` вместо `owner-command`.
5. Если `mechanism = action` — action выполняется напрямую, без полного обёртывания в `loop-run`
   (лёгкий путь).
6. Если `mechanism = notification` — создаётся `output(kind=notification)` и идёт в доставку (см.
   `output-deliver.process.md`).
7. `event.state.status = processed`, `processed_at` проставлен; `acts[]` пополняется (напр.
   `transcribed` для голосового).

## Выход
- `event.triggers[]` заполнен фактами (`fired | skipped | failed`).
- Возможно созданы: новый `loop-run`, `action`, `output`.
- Рёбра `event --triggers--> {loop, action, notification}` (и обратные `triggered-by`).

## Ограничения
- **Логика решения разбросана.** Правило «это событие запускает то-то» живёт вне event (в graph-loop или
  rule), а не в одном видимом месте — событие само по себе не отвечает на вопрос «а что вообще МОГЛО
  сработать», только «что сработало по факту». Риск: чтобы понять полный набор возможных триггеров,
  нужно обойти несколько узлов.
- **Нет приоритета при нескольких совпавших механизмах.** Если событие одновременно матчит и `loop`, и
  `notification` — порядок/приоритет обработки не определён.
- **Гонка при почти одновременных событиях**, нацеленных на один и тот же `loop-run` (напр. два входящих
  сообщения подряд) — нет правила сериализации/дедупликации на уровне процесса.

## Открытые вопросы
- Q-1: `triggers[]` пишется синхронно в момент обработки, или это derived-вид (собирается запросом по
  рёбрам `event → loop/action`, а не хранится инлайн)?
- Q-2: кто владеет типизацией `kind` (справочник видов) — сама единица event, или расширяет каждый
  модуль-источник (`telegram-module` добавляет свои `intake.*`)?
- Q-3: событие — append-only trace (`_log/`, по doc-tree) или тоже узел графа знаний с TTL/архивацией?

## Мини-пример
```json
// до: голосовое пришло
{ "event": { "kind": "intake.voice", "state": { "status": "received" }, "triggers": [] } }

// после: событие запустило новый loop-run
{
  "event": {
    "kind": "intake.voice",
    "state": { "status": "processed", "processed_at": "2026-07-23T10:00:05Z" },
    "triggers": [ { "mechanism": "loop", "ref": "loop-run:2026-07-23-b", "status": "fired" } ]
  }
}
```
