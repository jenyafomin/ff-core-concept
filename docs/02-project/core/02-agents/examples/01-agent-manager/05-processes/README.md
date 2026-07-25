---
node_type: design-note
title: Процессы — как данные двигаются (индекс)
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../01-overview/README.md
  - ../03-schema/README.md
  - ../02-defectovka/README.md
---

# Процессы agent-manager — индекс

> Уровень 4 схемы (`../03-schema/README.md`) назвал 4 механики движения + настройку. Здесь они разложены
> **по одному процессу — один файл**, чтобы владелец мог рассматривать и задавать вопросы к каждому
> отдельно, не проваливаясь во весь граф сразу.

## Правило
**Один процесс = один файл.** У каждого — свой вход/выход, свои ограничения (где предел/риск) и свои
открытые вопросы. Не сводить в одну простыню: процессы пересекаются по узлам, но у каждого своя точка
входа и свой режим отказа.

## Список процессов

| Файл | Процесс | Суть одной фразой |
|------|---------|--------------------|
| [`composition.process.md`](./composition.process.md) | **composition** | Как агент собирается из skill/mcp/playlist как данные (не скрытая обвязка). |
| [`loop-run.process.md`](./loop-run.process.md) | **loop-run** | Как граф-луп прогоняется живьём: phase→action→output, ветвление, история. |
| [`event-trigger.process.md`](./event-trigger.process.md) | **event-trigger** | Как событие (аудио/крон/входящее) триггерит loop/action/notification. |
| [`snapshot-capture.process.md`](./snapshot-capture.process.md) | **snapshot-capture** | Как рождается снапшот затрат: адаптивная частота, дерево, агрегат по детям. |
| [`knowledge-resolve.process.md`](./knowledge-resolve.process.md) | **knowledge-resolve** | Как единица достаёт знание: embed vs ref, линза-фильтр. |
| [`space-scope.process.md`](./space-scope.process.md) | **space-scope** | Как пространство (в т.ч. вложенное) применяет per-user «можно/нельзя». |
| [`playlist-bind.process.md`](./playlist-bind.process.md) | **playlist-bind** | Как скиллы полиморфно привязываются — дефолт к фазе, но и к лупу/типу задачи. |
| [`delegation.process.md`](./delegation.process.md) | **delegation** | Как агент раздаёт задачи под-агентам — ребро `delegates-to`, политика fan-out. |
| [`output-deliver.process.md`](./output-deliver.process.md) | **output-deliver** | Как выход доставляется через telegram с access/visibility. |

## Как читать один файл
Каждый — 7 секций: **Суть · Вход · Шаги · Выход · Ограничения · Открытые вопросы · Мини-пример**.
«Ограничения» — не второстепенное: это где механика ломается или где решение ещё не принято (владелец
просил это явно расписывать, не прятать за оптимистичным описанием).

## Связь с остальным деревом
- Единицы (узлы), которые двигают эти процессы, — детально в `../02-defectovka/<единица>/`.
- Общий конверт узла и словарь предикатов рёбер — `../../_schema/envelope.md`, `../03-schema/README.md`.
- Процессы не вводят новых типов узлов — только последовательности над уже описанными в дефектовке.
