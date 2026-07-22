---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-19
Scope: project
node_type: plan
title: PLAN L1 — план проекта brain (темы последовательно + лог действий)
Related:
  - ../state/README.md
  - ../decomposition/01-model/plan/GLOBAL.md
  - ../decomposition/01-model/NAV.concept.json
---

# 🗺️ PLAN L1 — план проекта brain

> **L1 = проектный уровень** (крупные темы-фазы последовательно). Детальные планы модулей — уровнем ниже
> (`decomposition/01-model/plan/`). Задачи прямого действия — в `NAV.concept.json` (`current_direct_tasks`).
> Этот файл ЛОГИРУЕТ выполненные темы (след) + держит очередь тем. Обновляется по ходу.
> ⚠️ Форма временная (md); цель — план живёт в САМОЙ базе как узлы `plan/task/loop` (проектирует архитектор, в работе).

## Уровни (дерево, раскладывается в себя)
`L1 тема-фаза → L2 план модуля → задача → подзадача`. У каждого узла: цель · статус · контекст(ссылки) · лог.

## ✅ Выполнено (лог тем)
| Тема | Итог | Ссылка |
|------|------|--------|
| T-ratify | Ратификация бэклога (71→DL-20…29, Postgres, Акт, namespace) | `../decisions.INDEX.md` · `session-handoff/2026-07-18-ratification-backlog/LEDGER.md` |
| T-tree | Консолидация дерева модели (unit→01-node, deepening растворён, карты→дома) | `../decomposition/01-model/README.md` |
| T-skills | Обновление скиллов concept-first+doc-discipline (корень ошибок) | `~/.claude/skills/*/SKILL.md` |

## ⏳ Очередь тем (последовательно)
| # | Тема-фаза | Что | Дом |
|---|-----------|-----|-----|
| L1-1 | **STATE/PLAN/LOOP как механизмы данных** | объявить типы (state·plan·task·loop) над 4 примитивами | архитектор (в работе) → `../decomposition/01-model/_shared/` |
| L1-2 | **Тонкая уборка** | process-файлы `01-node/`→handoff · слить карты · FQ→дома | `../decomposition/01-model/` |
| L1-3 | **Passport-контракт** | общий паспорт (разблокирует edge/act/lens) | `_shared/passport/` |
| L1-4 | **Углубление Акта** | волна fable-orchestrator (H-1) | `01-model/03-act/` |
| L1-5 | **Дизайн-очередь** | разводящее правило · hard-erase | `_shared/routing-rule/` · `_shared/mechanisms/hard-erase/` |
| L1-6 | **Engine-spec → ТЗ** | Postgres+Temporal-lite → build-репо `TOOLS/` | — |

## Правило ведения
Новая тема-фаза = строка в очереди; завершённая → в лог с итогом и ссылкой. Каждый агент, работающий по
плану, явно отмечает выполненное (пока — вручную здесь; далее — акт в журнале базы).
