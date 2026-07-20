---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-19
Scope: project
node_type: analysis
title: КАРТА-1 — текущая реальность дерева (где всё лежит сейчас)
Related:
  - ./MAP-target.md
  - ./README.md
---

# 🗺️ КАРТА-1 — ТЕКУЩАЯ реальность

> Снимок «как есть» на 2026-07-19. Легенда verdict: `base`=остаётся в 01-brain · `module`=переезд в
> 02-agents · `trace`=указатель/лог · `DUP`=дубль · `pile`=куча в одном месте (анти-паттерн).

## 🔴 Главная проблема: оркестрация РАЗМАЗАНА по ~6 местам в `01-brain/`, а `02-agents/` пуст

| # | Текущий путь | Что это | Verdict |
|---|--------------|---------|---------|
| 1 | `01-brain/decomposition/01-model/_shared/mechanisms/orchestration/` | `DESIGN.md` + `state/` — дизайн STATE·PLAN·TASK·LOOP | **module** (переезд) |
| 2 | `01-brain/decomposition/01-model/plan/` | plan def (README, GLOBAL, design-queue) | **module** (конкретика) + чуть base |
| 3 | `01-brain/decomposition/01-model/state/` | ранний state-def = по факту **трейс** «где в дизайне» | `trace` → раствор в NAV (**DUP** с #6) |
| 4 | `01-brain/domains/02-agents-orchestration/` | node-types·edge-types·policy·modules оркестрации | **module** (**DUP** типов с #1) |
| 5 | `01-brain/architecture/modules/M-G2-orchestrator`, `…/M-P3-loops` | модульные наброски оркестратора и лупов | **module** |
| 6 | `01-brain/state/` (L1 «читать первым») | концепт механизма state | **base-грань/module** (**DUP** с #3) |
| 7 | `01-brain/plan/` (PLAN.md, GLOBAL) | план-механизм / рабочий план | **module** (+ разнести: plan-механизм vs рабочий план проекта) |

## 🔴 Куча `decisions/` (всё в одном месте — анти-паттерн)

Путь: `01-brain/decisions/`
| Файл/папка | Про что | Verdict |
|------------|---------|---------|
| `ADR-DRAFT-orchestration-state-plan-task-loop.md` | оркестрация | **module** → `02-agents/…/decisions/` |
| `ADR-DRAFT-single-substrate-modular.md` | база/субстрат | **base** (остаётся) |
| `D1-engine-vs-registry/` … `D4-rebuild-reconcile-owner/` | форки движка/памяти базы | **base** |
| `SPEC-DRAFT-forgetting-hard-erase.*` | забвение (база) | **base** |
| `DECISIONS-LOG.md` | сводный журнал DL-01…29 | `trace` (сводный указатель — ок, но чистить) |
| `decisions.concept.json` | навигатор | `trace`/nav |

→ **Проблема:** «decisions» свалены вместе (base + module + trace). Решение относится К ЧЕМУ-ТО —
должно жить в доме своей темы, а `DECISIONS-LOG.md` лишь ССЫЛАТЬСЯ.

## Дубли и швы (свести при переезде)
- **state ×2:** `01-brain/state/` (#6) vs `01-model/state/` (#3) — правило: def→module, трейс→NAV (O-1b).
- **типы оркестрации ×2:** `_shared/mechanisms/orchestration/` (#1) vs `domains/02-agents-orchestration/` (#4).
- **plan ×2+:** `01-model/plan/` (#2) vs `01-brain/plan/` (#7) — разнести «механизм plan» и «рабочий план проекта».
- **02-agents/ почти пуст:** только `loop-system/`, `runs/`, `INDEX.md` — целевой дом модуля не наполнен.

## Прочие крупные дома `01-brain/` (в основном ОСТАЮТСЯ = base)
`architecture/` · `db-readiness/` · `open-questions/` · `values/` · `synthesis/` · `portrait/` ·
`scenarios/` · `domains/` (кроме 02-agents-orchestration) · `infrastructure/` · `todo/`.
→ Это концепты БАЗЫ памяти (тест-полигон) — **остаются в 01-brain**, чистятся отдельно (пре-долг ссылок).
