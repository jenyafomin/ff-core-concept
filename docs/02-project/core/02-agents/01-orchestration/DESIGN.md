---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-19
Scope: project
node_type: design
tags: [orchestration, adr-candidate]
title: STATE·PLAN·TASK·LOOP как механизмы над 4 примитивами (дизайн → ADR)
Related:
  - ../../01-brain/decomposition/01-model/README.md
  - ../../01-brain/decomposition/01-model/01-node/analyses/02-states.md
  - ../../01-brain/decomposition/01-model/01-node/analyses/04-plan-task.md
  - ../loop-system/concept.json
---

# ⚙️ Оркестрация: STATE·PLAN·TASK·LOOP — дизайн (кандидат в ADR)

> Источник: системный архитектор (2026-07-19). Сохранено, чтобы не потерять. **Не ратифицировано** —
> ждёт ответов на 5 развилок → оформить как ADR (изменение модели данных).

## Ядро
Ни один из четырёх — **НЕ новый примитив и НЕ спец-таблица.** Каждый =
**узел-якорь (identity, паспорт) + акты (журнал = истина) + линза (текущий статус) + policy-as-data (переходы).**
Паттерн **Event Sourcing + CQRS** над журналом Акта:
- Акт-журнал = event store (append-only, DL). Статус нигде не хранится намертво — **вычисляется линзой** (CQRS read-model).
- Восстановимость состояния из журнала → срез «кто что делал во времени» и откат работают **без обязательного закрытия сессии** (DEC-10).
- Рост = **INSERT `node_type`/`act_type`/`edge_type` + новый view-def**, никогда не миграция (DL-01) = сохранённая гибкость.
- Альтернативы отвергнуты: спец-таблицы ломают DL-01; «state как хранимое поле-истина» теряет восстановимость.

## Типы к объявлению
| Тип | Род | Ключевые поля / контракт | Дом |
|-----|-----|--------------------------|-----|
| **state** | node+lens | паспорт + `theme·status{active\|paused\|done}·opened_at·updated_at`; «живое»=линза `state.current` | эта папка (def) · рантайм `docs/00-states/NN-slug/` |
| **plan** | node | `goal·phase{L1\|L2}·status{draft\|active\|blocked\|done\|archived}·target_state`; шаги=под-узлы | эта папка (+ рантайм `plans/`) |
| **task** | node | `status·topic·parent_plan?·assignees[]`; дефолт=строка плана, промоция в узел при `>1 артефакта`; контекст-сбор=акты `observe/gather` | эта папка |
| **loop** | node (подтип plan?) | `pattern·trigger·budget·guards·members[]`; циклический план-оркестратор (≠ task); аккаунтинг=линза над актами+policy | эта папка |
| **session** | node (линкер) | `opened·closed?·state_ref·agents[]`; «ключевая связь» (DEC-10), привязывает акты к state без обяз. закрытия | эта папка |
| agent/personality | node | конструктор (tools/scope/data, DEC-8); носит скиллы (DEC-1); несёт свой loop (DEC-7) | `02-agents/` |
| **рёбра** | edge | `targets`(plan→state) · `has-subplan/has-task`(дерево) · `attached-to`(гибкий якорь task→{plan\|node\|loop\|state}) · `assigned-to/carries`(task↔agent, 1 агент N задач) · `member-of/carries-loop`(группа+рекурсия) · `depends-on/blocks` | edges.md |
| **акты** | act | `state.open/transition/pause/close` · `plan.create/revise` · `task.create/assign/start/progress/block/complete/promote` · `loop.spawn/iterate/guard-check/halt` · `observe/gather` · `session.open/close` | `03-act/` |
| **линзы** | view-def | `state.current`(**читать ПЕРВЫМ**) · `agent.worklist` · `plan.progress`(дерево+статус) · `loop.ledger`(guard-аккаунтинг) · `board`(по theme/status) | `04-lens/` |

## Как взаимодействуют
Агент открывает `session` (привязана к `state`, `state_id` жёстко на отрезок) → **читает первым линзу `state.current`**
(дешёвая проекция «на чём работаем»). `plan` ребром `targets` ведёт state к цели; его шаги = `task`'и (`has-task`/`attached-to`),
назначены агентам (`assigned-to`, агент несёт N). Каждое действие = **акт** в журнал; статусы = **линзы** над актами (CQRS).
`loop` = план-оркестратор особого рода: `orchestrates` группу (`member-of`), крутит витки (`loop.iterate`), бюджет/guard = policy,
проверяется линзой `loop.ledger`; рекурсия — агент `carries-loop` под-луп. Итог: state=«где мы», plan=«куда/как», task=«атом», loop=«как крутится».

## Сверка с loop-system — противоречий нет
DEC-9(статус+план)→plan+линза ✅ · DEC-4/10(авто-лог/сессия/не обяз. закрытие)→event-sourcing+session ✅ ·
DEC-7(рекурсия)→carries-loop ✅ · DEC-2(луп=конструкт)→budget/guards=policy ✅. Закрывает открытые Q-B1/Q-B2 loop-system.

## 5 развилок (ждут владельца → ADR)
1. **STATE** — линза над журналом (+тонкий узел-кэш) [реком.] или хранимый узел-истина?
2. **Единый словарь статусов** plan/task/loop `draft|active|blocked|done|archived` (state — свой) — да?
3. **LOOP** = подтип `plan` или отдельный `node_type`?
4. **task** после промоции: строка-в-плане = read-only ссылка на узел (не раздваивать истину) — да?
5. **Дом типов** = эта папка (`_shared/mechanisms/orchestration/`) + свести сюда `01-model/state/`+`plan/`; рантайм в `00-states/`/`plans/` — ок?

## Следующий шаг
Ответы на 5 → **ADR** «Оркестрация STATE·PLAN·TASK·LOOP» в `docs/architecture/ADR/`. До фиксации — стресс критиком (read-time-cost ~100k, `04-lens/03-read-time-cost`).
