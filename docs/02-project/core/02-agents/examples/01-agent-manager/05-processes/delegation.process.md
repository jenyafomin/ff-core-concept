---
node_type: design-note
title: delegation — как агент раздаёт задачи под-агентам
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../02-defectovka/01-agent/agent.design.md
  - ../02-defectovka/11-cost-snapshot/cost-snapshot.design.md
  - ./README.md
---

# Процесс: delegation

## Суть
Агент раздаёт задачи под-агентам через видимое ребро `delegates-to`, не скрытый вызов. Политика
fan-out (`max_fanout`, `on_conflict`, `model_default`) — данные на агенте, не хардкод.

## Вход
- `agent.delegation` — `{can_spawn, children[], policy: {max_fanout, on_conflict, model_default}}`.
- Работа, требующая делегирования (часть `phase.expected_action`, или отдельный шаг проверки).

## Шаги
1. Родительский агент решает делегировать часть работы (напр. параллельная критика, или под-задача вне
   его роли).
2. Проверяется `delegation.policy.max_fanout` — если `children[]` уже на пределе, новый спавн
   отклоняется/ставится в очередь (`on_conflict`).
3. Создаётся дочерний агент (`agent:parent#childN`) с более узкой `identity.role` (напр. `"critic"`);
   `runtime.model = policy.model_default`, если не переопределён явно.
4. Ребро `agent --delegates-to--> agent` (родитель→ребёнок), обратное `delegated-by`.
5. Ребёнок явно наследует контекст (проект/пространство) — это НЕ происходит автоматически, нужна
   отдельная передача (`runs-in`, `scoped-by`).
6. Ребёнок выполняет работу (сам может запустить свой `loop-run` или единичный `action`), эмитит
   `output`.
7. `on_conflict` управляет ситуацией, если несколько детей дают несовместимые результаты (напр.
   `"queue"` — сериализация).
8. Родитель агрегирует выходы детей; стоимость детей учитывается в `attribution.others` родительского
   снапшота (см. `snapshot-capture.process.md`).
9. Акт на родителе: `{kind: "delegated", ref: child_agent_id}`.

## Выход
- Новый(е) узел(узлы) `agent` (дочерние).
- Рёбра `delegates-to` / `delegated-by`.
- Выходы детей и их вклад в `attribution` родительского снапшота.

## Ограничения
- **`on_conflict: "queue"` не специфицирован операционно.** Блокирует ли это ход родителя, или ставит
  задачу в асинхронную очередь с уведомлением позже — не описано.
- **Нет лимита глубины делегирования.** Ребёнок сам может делегировать (делегирование делегирования) —
  вопрос учёта стоимости внуков в `attribution` родителя открыт (см. U11 Q-2).
- **Жизненный цикл ребёнка не определён.** После завершения задачи ребёнок архивируется/удаляется, или
  остаётся постоянным узлом графа навсегда?

## Открытые вопросы
- Q-1: `attribution.others` считается только по прямым детям, или по всему поддереву делегирования
  (тот же класс вопроса, что в `snapshot-capture.process.md`)?
- Q-2: под-агент — отдельный `node_type`, или грань `agent` с полем `parent` (открыт в agent.design.md)?
- Q-3: что именно делает `on_conflict: "queue"` — блокирующая сериализация или асинхронная очередь?

## Мини-пример
```json
// до: агент без детей
{ "agent": { "id": "agent:ff-personal", "delegation": { "children": [], "policy": { "max_fanout": 4 } } } }

// после: делегировали критику
{
  "agent": { "id": "agent:ff-personal", "delegation": { "children": ["agent:critic#1"] } },
  "edge": { "predicate": "delegates-to", "from": "agent:ff-personal", "to": "agent:critic#1" }
}
```
