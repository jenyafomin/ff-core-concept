---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-20
Scope: project
node_type: design
title: Целевой скелет 01-brain + карта current→target
Related:
  - ./README.md
  - ../../../../02-project/core/01-brain/INDEX.md
---

# 04 · Целевой скелет + карта current→target

> ФОРКИ РЕШЕНЫ (2026-07-20, см. README): `02-domains/` = домены-данных в `01-overview/`; модули M-G\* →
> `02-infrastructure/04-modules/`; `state` — глобальный `00-states/` (brain-local убрать); индекс = `decisions.INDEX.md`.

## Целевой скелет
```
01-brain/
  01-overview/                    ← концепт + идеи, «как понимаем»
    01-values/                    ← ценности (первыми)
    02-domains/ | 02-modules/     ← [форк BR-1 имя]
  02-infrastructure/              ← как строим
    01-overview/                  ← общий разбор + вопросы + понимание БД
    02-backend/
    03-frontend/
    _shared/
  open-questions/  plan/  to-do/  topics/     ← контейнеры (без номера)
  state/  → [форк BR-2: глобальный 00-states vs brain-local]
  decisions.INDEX.md              ← глобальный индекс решений
  INDEX.md · brain.concept.json   ← навигаторы (ВИД)
```

## Карта current → target (черновик, требует подтверждения форков)
| Сейчас (01-brain/) | Тип | Target |
|---|---|---|
| `values/` | knowledge | `01-overview/01-values/` |
| `domains/` | knowledge | `01-overview/02-domains/` |
| `OVERVIEW.md`, `L0-memory-unit.md` | knowledge | `01-overview/` (как обзор/концепт) |
| `architecture/` (modules, …) | knowledge | `02-infrastructure/` (модули → см. BR-4) |
| `infrastructure/` | knowledge | слить в `02-infrastructure/` |
| `db-readiness/` | knowledge | `02-infrastructure/01-overview/` (аспект 06) |
| `MIGRATION-BLUEPRINT.md` | knowledge | `02-infrastructure/` (или его overview) |
| `decisions/` (D1-D5, SPEC, ADR) | knowledge | распределены + `decisions.INDEX.md` (аспект 07) |
| `DECISIONS-LOG.md` | index | → `decisions.INDEX.md` |
| `open-questions/` | container | остаётся (без номера) |
| `plan/` | container | остаётся (без номера) |
| `todo/` | container | `to-do/` (без номера) |
| `topics/` | staging | остаётся (аспект 03) |
| `state/` | — | форк BR-2 |
| `portrait/`, `scenarios/`, `synthesis/` | ? | распределить (overview/domains или архив) — уточнить |

> Финальные имена и разбивка — после ответов на форки BR-1..BR-4 (см. README). Карту доведём до
> полной from→to перед исполнением (как `DECOMPOSITION-DISSOLVE-MAP.md`).
