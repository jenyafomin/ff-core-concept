---
node_type: design-note
title: playlist-bind — как скиллы полиморфно привязываются
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../02-defectovka/08-skill-playlist/skill-playlist.design.md
  - ../02-defectovka/09-graph-loop/graph-loop.design.md
  - ./README.md
---

# Процесс: playlist-bind

## Суть
Плейлист включается не только «по умолчанию к фазе» — привязка **полиморфна**: к фазе (дефолт), к
лупу целиком, к типу задачи, или вручную. Три параллельных пути активации, без объявленного приоритета.

## Вход
- `playlist(U8)` — `activation {mode, ref}`, `items[]`, `parent_lists[]`/`child_lists[]`.
- `skill(U8)` — `bound_to[]` (`axis: "loop-phase" | "format" | "check" | …`).
- `phase(U9)` — `bound_playlist` (дефолтный путь).
- `event(U10)` — может тоже триггернуть `playlist.activation`.

## Шаги
1. Определяется путь активации по `playlist.activation.mode`.
2. **Дефолт (`auto-on-phase`):** когда `loop-run.current_phase == activation.ref` — плейлист включается
   автоматически (`phase --bound-to--> playlist`).
3. **Ручной (`manual`):** явная команда (владелец или сам агент) включает плейлист независимо от текущей
   фазы — привязка к лупу целиком или к типу задачи, не к фазе.
4. **Через скилл (не через плейлист):** отдельный `skill.bound_to[]` может тянуть скилл в игру по другой
   оси (`axis: "format"` или `"check"`), не связанной с текущей фазой лупа вовсе.
5. **Через событие:** `event --triggers--> playlist.activation` — третий независимый путь (см.
   `event-trigger.process.md`).
6. На активации: `playlist.state.active = true`, `activated_by` проставлен, акт `list.activated`
   добавлен.
7. `items[]` разрешаются по `order`/`required`; если у плейлиста есть `parent_lists`, дерево листов
   обходится, требуемые скиллы родителя мержатся по `merge_policy` ребра `list-edge`.

## Выход
- `playlist.state` обновлён (активен/кем).
- Набор действующих скиллов для текущего хода агента (см. связку с `composition.process.md`).
- Акт `list.activated`/`list.created` в истории плейлиста.

## Ограничения
- **Нет приоритета между тремя путями активации.** Если фаза говорит «включи плейлист A», а событие
  одновременно пытается включить плейлист B — правило разрешения конфликта отсутствует.
- **Конфликт required-скиллов в дереве листов не решён.** Родитель требует X, ребёнок исключает X — чья
  воля побеждает, не описано (открытый Q-2 в skill-playlist.design.md).
- **Ось `bound_to.axis` — открытый текст.** Ничего не мешает придумать произвольную ось, которую никто не
  читает — привязка становится «мёртвой» молча, без сигнала об ошибке.

## Открытые вопросы
- Q-1: `bound_to.axis: "loop-phase"` — ссылается на КОНКРЕТНЫЙ узел графа (`phase:*`) или на абстрактный
  тип фазы, переносимый между разными графами-лупами?
- Q-2: конфликт `required` скиллов внутри унаследованного дерева листов — чья воля побеждает?
- Q-3: приоритет между `auto-on-phase`, `manual` и `event`-активацией — кто выигрывает при одновременном
  срабатывании нескольких путей?

## Мини-пример
```json
// до: playlist:design-mode неактивен
{ "playlist": { "id": "playlist:design-mode", "state": { "active": false } } }

// после: фаза frame вошла в силу → авто-активация
{
  "playlist": {
    "id": "playlist:design-mode",
    "state": { "active": true, "activated_by": "phase:frame" }
  },
  "act": { "at": "2026-07-23T09:00", "kind": "list.activated", "via": "auto-on-phase" }
}
```
