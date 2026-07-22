---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-20
Scope: project
node_type: design
title: 02-infrastructure — структура + db-readiness
Related:
  - ./04-target-skeleton.md
  - ../../../../02-project/core/01-brain/db-readiness/
---

# 06 · `02-infrastructure/` + db-readiness

## Структура (голос владельца)
После `01-overview` (концепт+идеи) идёт **инфраструктура** (владелец: «скорее просто инфраструктура»,
не «архитектура»):
```
02-infrastructure/
  01-overview/     ← ОБЩИЙ: что нужно сделать в инфре + вопросы + понимание БД
  02-backend/      ← как представляем бэкенд
  03-frontend/     ← как представляем фронтенд
  _shared/         ← сквозное (underscore)
```
`01-overview` может быть общим (вопросы к инфре); `02/03` — конкретные представления слоёв.

## db-readiness → `02-infrastructure/01-overview/`
- `db-readiness/` переезжает в infra-overview: **понимание БД** живёт здесь.
- Внутри — разбить на **папки/под-папки** (не свалка): выбор БД, схема, локальность, миграции…
  → чёткая картина «как это должно выглядеть».
- Связь: сюда же тянутся выводы `architecture/stack/01-database.md` (переехал при растворении decomposition)
  и MERGE-NOTES по модели.

## Открытое (BR-4)
`architecture/modules/` (M-G1..G5) — это инфраструктура (backend-механика) или часть
`01-overview/02-domains`? Решить: модули = инфра-слой vs домены-данных = overview. Влияет на карту (аспект 04).
