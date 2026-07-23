---
node_type: design-note
title: loop-run — как граф-луп прогоняется живьём
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../02-defectovka/09-graph-loop/graph-loop.design.md
  - ../02-defectovka/13-action
  - ./README.md
---

# Процесс: loop-run

## Суть
Живой прогон графа-методологии: `phase → action → output`, с ветвлением и циклами возврата. Граф
(`graph-loop`) — шаблон; `loop-run` — расходный экземпляр с историей.

## Вход
- `graph-loop(U9)` — шаблон: `phases[]`, `transitions[]`, `entry_phase`, `terminal_phases[]`.
- `loop-run` — экземпляр: `graph_ref`, `current_phase`, `history[]`, `sequence`.
- `phase` — текущий узел графа, несёт `bound_playlist`, `expected_action`, `exit_conditions[]`.
- `transition` — ребро графа: `from/to/type/condition/triggered_by`.

## Шаги
1. `loop-run` создаётся: ребро `loop-run --instantiates--> graph-loop`, `current_phase = entry_phase`.
2. При входе в фазу активируется `phase.bound_playlist` (см. `playlist-bind.process.md`).
3. Выполняется `phase.expected_action` → создаётся узел `action`, ребро `loop --sequences--> action`.
4. `action --emits--> output` (см. `output-deliver.process.md`).
5. `phase.exit_conditions[]` проверяются против результата action/output.
6. Подходящий `transition` выбирается (`forward | branch | loop-back | abort`); `current_phase`
   обновляется.
7. `loop-run.history[]` пополняется записью `{at, phase, action, output_ref}` (append-only, снапшот шага).
8. Если `transition.type = loop-back` — возврат к уже пройденной фазе (цикл, напр. `verify → build`).
9. Повтор со 2-го шага, пока не достигнута `terminal_phase`.

## Выход
- `loop-run.current_phase`, `loop-run.history[]` обновлены.
- Узлы `action`, `output` созданы за каждый шаг.
- `transition` зафиксирован как применённый (кто инициировал: `agent-decision | event | owner-command`).

## Ограничения
- **Нет предохранителя на циклы.** `loop-back` не ограничен `max_iterations` — граф может зациклиться
  `verify → build → verify → …` без встроенного стоп-крана (открытый вопрос из graph-loop.design.md).
- **Неясно, кто решает ветвление.** `exit_conditions` — жёсткая машина состояний, или агент может
  предложить `branch` динамически (soft-guideline)? Пока схема допускает оба чтения.
- **Побочные эффекты action необратимы при провале exit_conditions.** Если action уже произвёл эффект
  (например, записал файл), а `exit_conditions` не выполнились — граф просто уходит в другую фазу, без
  правила «откатить/повторить именно этот action».

## Открытые вопросы
- Q-1: нужен ли `max_iterations`/предохранитель на паре fase `verify→build`, чтобы не зациклиться
  бесконечно?
- Q-2: `branch` — жёстко в `exit_conditions` графа, или агент может предложить ветку по ходу (граф как
  soft-guideline)?
- Q-3: один общий `graph-loop` на всю систему, или у каждого типа задачи/проекта свой граф-шаблон (тогда
  `agent.state.active_loop` выбирает ИЗ библиотеки графов)?

## Мини-пример
```json
// до: агент только что перешёл в phase:verify
{ "loop_run": { "current_phase": "phase:verify", "history": [ /* …frame, build… */ ] } }

// после: verify провалился → loop-back в build (цикл)
{
  "loop_run": {
    "current_phase": "phase:build",
    "history": [
      "…",
      { "at": "2026-07-23T12:10", "phase": "phase:verify", "action": "act:review", "output_ref": "output:verdict#3" }
    ]
  },
  "transition_applied": { "from": "phase:verify", "to": "phase:build", "type": "loop-back", "reason": "критик вернул на доработку" }
}
```
