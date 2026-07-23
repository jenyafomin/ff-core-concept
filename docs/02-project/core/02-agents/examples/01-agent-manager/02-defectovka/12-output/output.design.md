---
node_type: design-note
title: output/message — единица «выход агента» со scope-контролем
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../../01-overview/README.md
  - ../01-agent/agent.design.md
  - ../05-telegram/telegram.design.md
  - ../04-space-team-role/space-team-role.design.md
---

# U12 · output/message — что агент выдаёт, под контролем scope

## 1. Суть
Всё, что агент выдаёт ВОВНЕ (не внутренний акт, а видимый исход): текст, карточка, файл,
уведомление. Разные типы — не текст в вакууме, а данные с явным **scope-контролем** (что, куда, кому
можно) и видимым каналом/статусом доставки.

## 2. Переменные (поля)

| Поле | Тип | Зачем | Пример |
|------|-----|-------|--------|
| `id` | node-id | тождество выхода | `output:ff-2026-07-23-001` |
| `kind` | enum | тип выдачи | `text \| card \| file \| notification \| interim` |
| `content` | конструктор | само содержимое, форма зависит от `kind` | `{text: "…"}` / `{file_path, caption}` |
| `target` | конструктор | куда/кому адресовано | `{space: "space:tg-92", user: "user:jenya"}` |
| `access` | конструктор (было `scope` — переразведено; не дублировать `visibility` ниже) | что МОЖНО этим выходом (действия) | `{allowed_actions: ["reply"]}` |
| `visibility` | enum | кто видит | `owner-only \| space \| public` |
| `delivery` | конструктор | через что доставлено + статус | `{via: "telegram-module", status: "delivered"}` |
| `produced_by` | ref | кто выдал | `agent:ff-personal` |
| `acts` | акт[] | история (создан/отредактирован/удалён) | append-only |

## 3. Под-сущности (сами становятся узлами)
- `content-block` — вложенный конструктор содержимого; форма меняется по `kind` (текст vs файл vs
  карточка — разные поля, не один общий "text").
- `delivery-attempt` — попытка доставки через конкретный канал (успех/ошибка/повтор), не просто факт
  «ушло».
- `access-rule` (было `scope-rule`) — правило «что можно» — по умолчанию наследуется от `space(U4)`,
  может сужаться локально для конкретного output. Не путать с `visibility` (кто видит) — разные поля.

## 4. Связи (рёбра)
```
agent(U1) --emits--> output
output --targets--> user(U2)
output --targets--> space(U4)
output --scoped-by--> space(U4)              (наследует можно/нельзя чата/топика)
telegram-module(U5) --delivers--> output
output --delivered-by--> telegram-module(U5) (обратное ребро — видно КАК доставлено, для трейса)
cost/snapshot(U11) --measures--> output       (опционально: стоимость генерации выхода)
```

## 5. Форма данных (конструктор)

**Быстрый пример (текст, доставлен через Telegram):**
```json
{
  "id": "output:ff-2026-07-23-001",
  "type": "output",
  "kind": "text",
  "content": { "text": "Дефектовка U6/U11/U12 готова, файлы созданы." },
  "target": { "space": "space:tg-92", "user": "user:jenya" },
  "access": { "allowed_actions": ["reply", "react"] },
  "visibility": "space",
  "delivery": { "via": "telegram-module", "status": "delivered", "attempt": 1 },
  "produced_by": "agent:ff-personal",
  "acts": [
    { "at": "2026-07-23T14:20:00+03:00", "kind": "output.created" },
    { "at": "2026-07-23T14:20:02+03:00", "kind": "output.delivered", "via": "telegram-module" }
  ]
}
```

**Вариант A (`kind: "interim"`, промежуточная карточка live-egress):** `visibility: "owner-only"`,
`access.allowed_actions: []` — только показать прогресс, не триггерит дальнейших действий.

**Вариант B (`kind: "file"`, доставка сорвалась):**
`delivery: { "via": "telegram-module", "status": "failed", "attempt": 2, "error": "file-too-large" }`
— видна попытка и причина отказа, а не молчаливая потеря выхода.

## 6. Дизайн-паттерн / метод
- **Output-as-access-scoped-data** (было `scope` — переразведено) — выход несёт СВОЙ `access` (что
  можно) отдельно от `visibility` (кто видит) как данные; контроль проверяется по полю, а не спрятан в
  коде канала доставки.
- **Delivery-as-edge/act** — доставка — отдельный акт с каналом и статусом (`delivered-by`), видна
  попытка/успех/ошибка, а не факт «просто ушло».
- **Kind-differentiated content** — `content` — вложенный конструктор, форма зависит от `kind`
  (text/file/card/interim), не единое строковое поле на всё.

## 7. Открытые вопросы
- Q-1: `access` output — всегда наследуется от `space(U4)` целиком, или агент может сам ЛОКАЛЬНО сузить
  (но не расширить) правила ниже уровня пространства?
- Q-2: `kind: "interim"` (live-egress карточки прогресса) — это тот же `node_type: output`, или
  отдельный тип «прогресс-событие», ближе к `event(U10)`, чем к финальному выходу?
