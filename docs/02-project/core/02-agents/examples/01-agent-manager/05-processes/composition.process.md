---
node_type: design-note
title: composition — как агент собирается из skill/mcp/playlist
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../02-defectovka/01-agent/agent.design.md
  - ../02-defectovka/08-skill-playlist/skill-playlist.design.md
  - ./README.md
---

# Процесс: composition

## Суть
Агент — не промпт, а **сборка из видимых узлов**: `agent.composition = {skills[], mcp[], playlist}`.
Процесс — как эта сборка возникает и меняется, не оставаясь скрытой обвязкой.

## Вход
- `agent(U1)` — поле `composition`, поле `state`.
- `skill(U8)` — узлы скиллов, каждый со своим `bound_to[]`.
- `mcp-binding` — под-узел агента (какой MCP, какие инструменты, статус).
- `playlist(U8)` — узел плейлиста, на который агент ссылается.
- `policy_ref` (опционально) — политика, фиксирует ли composition снапшотом на старте лупа или живёт-меняется.

## Шаги
1. Агент создан/активирован → `composition` инициализируется пустым или из шаблона (болванка, см.
   agent.design.md «Вариант B»).
2. Для каждого включаемого скилла: ребро `agent --composed-of--> skill`; создаётся `skill-binding`
   (откуда, в какой фазе, включён ли) → акт `skill.enabled`.
3. Для каждого MCP-сервера: ребро `agent --composed-of--> mcp-server`; создаётся `mcp-binding`
   (`tools[]`, `status`) → акт `mcp.connected`.
4. Плейлист прикрепляется: ребро `agent --composed-of--> playlist`. Плейлист сам несёт `items[]` со
   скиллами — на этом шаге они НЕ копируются в `composition.skills`, а разрешаются на чтении (см.
   `playlist-bind.process.md`).
5. Композиция читается графом-лупом при входе в фазу (`phase.bound_playlist` активирует лист →
   composition эффективно расширяется/сужается на время фазы).
6. Каждое изменение пишет `acts[]` на агенте (append-only) — история сборки видна как лог.

## Выход
- `agent.composition` заполнен/обновлён.
- Узлы `skill-binding`, `mcp-binding` созданы или обновлены.
- Рёбра `agent --composed-of--> {skill, mcp-server, playlist}`.
- `agent.acts[]` пополнен записями сборки.

## Ограничения
- **Снапшот vs live не решено** (открытый вопрос из agent.design.md): фиксируется ли `composition` один
  раз на старте `loop-run`, или она «дышит» вместе с фазами? Пока оба варианта совместимы со схемой —
  это конкретный источник рассинхрона, если не выбрать один режим.
- **Риск двойного представления.** Скилл может одновременно числиться в `agent.composition.skills` И
  внутри `playlist.items` — правила дедупликации/приоритета между этими двумя списками не описаны.
- **Нет версионирования снапшота сборки** — нельзя откатиться к «composition, какой она была час назад»,
  только читать `acts[]` вручную.

## Открытые вопросы
- Q-1: `composition` — снимок на старте `loop-run` или живая проекция активного плейлиста + ручных
  включений?
- Q-2: если скилл есть и в `composition.skills`, и в активном `playlist.items` — это один и тот же факт
  дважды или намеренно разные источники (ручное включение vs плейлист)?
- Q-3: кто вправе менять `composition` в середине прогона — только сам агент, или это тоже команда
  владельца/событие (см. `event-trigger.process.md`)?

## Мини-пример
```json
// до
{ "id": "agent:critic#1", "composition": { "skills": [], "mcp": [], "playlist": null } }

// после (включили скилл + подключили плейлист)
{
  "id": "agent:critic#1",
  "composition": {
    "skills": [ { "ref": "skill:code-review", "bound_to": "phase:verify", "enabled": true } ],
    "mcp": [],
    "playlist": "playlist:check-mode"
  },
  "acts": [ { "at": "2026-07-23T11:00", "kind": "skill.enabled", "ref": "skill:code-review" } ]
}
```
