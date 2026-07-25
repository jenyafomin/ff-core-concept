---
node_type: design-note
title: output-deliver — как выход доставляется через telegram
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../02-defectovka/12-output/output.design.md
  - ../02-defectovka/04-space-team-role/space-team-role.design.md
  - ./README.md
---

# Процесс: output-deliver

## Суть
Всё, что агент выдаёт вовне, несёт собственные `access`/`visibility` как данные — доставка через
`telegram-module` проверяет их, а не полагается на код канала.

## Вход
- `output(U12)` — `kind`, `content`, `target`, `access`, `visibility`, `produced_by`.
- `space(U4)` — источник дефолтных `policy_default`/`policy_overrides` для наследования `access`.
- `telegram-module(U5)` — доставляющий модуль.

## Шаги
1. Агент эмитит `output` (`agent --emits--> output`), `produced_by` проставлен.
2. `output.access` по умолчанию наследуется от `target.space` (см. `space-scope.process.md`); может быть
   локально СУЖЕН (но не расширен) — по идее, не по проверке.
3. `output.target` резолвится в конкретное место доставки (`space.surface.chat_id/thread_id`).
4. `telegram-module.delivers` вызывается: создаётся `delivery-attempt {via, status, attempt}`.
5. Успех → `output.delivery.status = "delivered"`, акт `output.delivered`.
6. Отказ → `delivery-attempt` фиксирует причину (напр. `file-too-large`); дальнейшее поведение (повтор?
   эскалация владельцу?) не определено правилом.
7. `output.visibility` (`owner-only | space | public`) сверяется с `space-scope`, чтобы понять, кто из
   участников пространства реально это увидит.

## Выход
- `delivery-attempt` записи, `output.delivery` обновлён.
- Акты `output.created` / `output.delivered` (или `failed`).
- При повторных отказах — потенциально новый `event(kind=system.notification)` владельцу.

## Ограничения
- **Нет политики повтора при отказе доставки.** `attempt` инкрементируется, но правило backoff/предел
  попыток отсутствует.
- **«Сузить, не расширить» не проверяется механикой.** Правило описано как намерение (Вариант из
  output.design.md), но нет валидации на записи — агент технически может выставить слишком широкий
  `access`, и ничто это не поймает.
- **`kind: "interim"` (live-egress карточки) размыт между output и event** (открытый Q-2
  output.design.md) — конвейер доставки для промежуточных карточек может требовать других правил (без
  уведомления, без повтора), чем финальный output, а сейчас это не разведено.

## Открытые вопросы
- Q-1: `output.access` всегда наследуется от `space` целиком, или агент может локально сузить (не
  расширить) правила ниже уровня пространства?
- Q-2: `kind: "interim"` — тот же `node_type: output`, или отдельный тип «прогресс-событие», ближе к
  `event(U10)`?
- Q-3: какая политика повтора/backoff при `delivery.status = "failed"` — сколько попыток, кто решает
  эскалацию владельцу?

## Мини-пример
```json
// до: output создан, доставка не начата
{ "output": { "id": "output:ff-001", "delivery": { "via": "telegram-module", "status": "pending", "attempt": 0 } } }

// после: доставка провалилась (файл слишком большой)
{
  "output": {
    "id": "output:ff-001",
    "delivery": { "via": "telegram-module", "status": "failed", "attempt": 1, "error": "file-too-large" }
  }
}
```
