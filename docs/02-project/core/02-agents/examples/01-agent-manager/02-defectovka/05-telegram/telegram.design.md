---
node_type: design-note
title: telegram-module — единица «поверхность I/O» как конструктор данных
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../04-space-team-role/space-team-role.design.md
  - ../10-event/event.design.md
  - ../12-output/output.design.md
---

# U5 · telegram-module — эталон дефектовки

## 1. Суть
Поверхность ввода/вывода агента наружу: читает и пишет в Telegram, принимает входящие события
(текст/аудио/фото/документ), исполняет команды управления агентом и системой, и предоставляет
**линзы-концепты** — настраиваемые виды на разную информацию (например «пульт» vs «лог сессии»).
Модуль — не хардкод набора действий, а **набор capabilities**, каждая — видимый узел данных, который
можно включить/выключить/переопределить под конкретное пространство.

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество модуля (обычно один на бота) | `telegram-module:ff-personal-bot` |
| `binding` | конструктор | к какому боту/проекту привязан | `{bot_token_ref, project}` |
| `capabilities` | capability[] (конструктор) | что модуль умеет делать (не хардкод!) | `[{cap_id, kind, enabled, applies_to}]` |
| `commands` | command[] (конструктор) | команда как данные, не switch-case в коде | `[{cmd, args_schema, handler_ref}]` |
| `views` | view[] (конструктор; было «lens», унифицировано с envelope.view) | виды на информацию для этого канала | `[{view_id, shows, format}]` |
| `intake` | конструктор | правила приёма входящих событий | `{accepted_kinds[], max_size, transcribe}` |
| `state` | конструктор | текущее состояние подключения | `{connected, last_poll_at}` |
| `acts` | акт[] | история включений/команд (append-only) | `[{at, kind, cap_id}]` |

## 3. Под-сущности (сами становятся узлами)
- `capability` — атомарная способность модуля: `reply`, `react`, `edit_message`, `download_attachment`,
  `transcribe_voice` и т.п. Каждая имеет `enabled` и опциональный `applies_to` (в каких `space` доступна
  — это привязка/binding.target, не про кто-видит; не путать с `visibility`).
- `command` — управляющая команда владельца (`/prompt`, `/bind`, `/new`, `/context`) как данные: имя +
  схема аргументов + ссылка на обработчик, а не текстовый парсер внутри кода агента.
- `view` (было «lens») — концепт просмотра: например `view:pult` (сводка состояния) или
  `view:session-log` (сырой трейс) — одни и те же данные системы, разное представление под разные
  топики. Термин унифицирован с `envelope.view` (см. `../../_schema/envelope.md`).

## 4. Связи (рёбра)
```
telegram-module(U5) --delivers--> output(U12)
telegram-module(U5) --receives--> event(U10)
telegram-module(U5) --surfaces--> space(U4)
telegram-module(U5) --exposes--> view
agent(U1) --uses--> telegram-module(U5)   (через capability, не напрямую)
```

## 5. Форма данных (конструктор)

**Быстрый пример:**
```json
{
  "id": "telegram-module:ff-personal-bot",
  "type": "telegram-module",
  "binding": { "bot_token_ref": "secret:tg-bot-token", "project": "project:ff-personal" },
  "capabilities": [
    { "cap_id": "cap:reply", "kind": "output", "enabled": true, "applies_to": "all-spaces" },
    { "cap_id": "cap:transcribe_voice", "kind": "intake", "enabled": true, "applies_to": "all-spaces" },
    { "cap_id": "cap:react", "kind": "output", "enabled": false, "applies_to": "space:tg-ff-personal:topic-56" }
  ],
  "commands": [
    { "cmd": "/prompt", "args_schema": { "text": "string" }, "handler_ref": "handler:set-prompt" },
    { "cmd": "/bind", "args_schema": { "path": "string" }, "handler_ref": "handler:bind-cwd" }
  ],
  "views": [
    { "view_id": "view:pult", "shows": "state-summary", "format": "markdown" },
    { "view_id": "view:session-log", "shows": "raw-trace", "format": "markdown" }
  ],
  "intake": { "accepted_kinds": ["text", "voice", "photo", "document"], "max_size_mb": 20, "transcribe": true },
  "state": { "connected": true, "last_poll_at": "2026-07-23T10:00:00Z" },
  "acts": [ { "at": "2026-07-23T09:00:00Z", "kind": "capability.disabled", "cap_id": "cap:react" } ]
}
```

**Вариант A (минимальный модуль, только чтение/запись текста):** `capabilities` = только `cap:reply`,
`intake.accepted_kinds = ["text"]`, `views` пуст — модуль-заглушка до расширения.
**Вариант B (мульти-бот на проект):** несколько `telegram-module` с разным `binding.bot_token_ref`,
каждый `surfaces` в свой набор `space` — например отдельный бот для внутренних уведомлений vs для
владельца.

## 6. Дизайн-паттерн / метод
- **Capability-as-data.** Способности модуля — список включаемых/выключаемых узлов, а не жёстко
  зашитый набор методов; можно точечно выключить `cap:react` для одного пространства, не трогая код.
- **Command-as-data.** Команда владельца — запись `{cmd, args_schema, handler_ref}`, а не строковый
  parser/switch — новую команду добавляют данными, не правкой кода агента.
- **View поверх одних данных (было «lens»).** `views` не хранят копию информации — это метка вида
  (совпадает с принципом «линза=view = метка, не копия» из overview §5).

## 7. Открытые вопросы
- Q-1: `capability.applies_to` — ссылается на `space(U4)` напрямую или проходит через `policy` пространства
  (см. `04-space-team-role`)? Сейчас дублирование логики прав в двух местах — модуль и пространство.
- Q-2: `intake` (приём аудио/фото/документов) физически порождает `event(U10)` — где граница: модуль
  сам создаёт event, или событие создаёт внешний слой (шлюз), а модуль только парсит payload?
- Q-3: один `telegram-module` на весь проект или на бота? Если проект использует несколько ботов
  (владелец упоминал разные боты под разные топики) — нужен ли уровень `bot` между модулем и space.
