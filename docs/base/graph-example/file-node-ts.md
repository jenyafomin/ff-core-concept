---
id: file-node-ts
type: file
schema: file@1
created: 2026-06-14
updated: 2026-06-23
epistemic: fact
sensitivity: internal
source: human
principal: owner
level: what
external_ref: { connector: git, key: "packages/core/src/node.ts" }
links:
  - { rel: child-of, to: folder-core-src, home: true, priority: 3 }   # ГДЕ ЛЕЖИТ (один дом)
  - { rel: facet-of, to: category-service, home: false }              # ПРО ЧТО (тех. срез)
  - { rel: facet-of, to: category-data-model, home: false }           # ПРО ЧТО (домен)
  - { rel: facet-of, to: category-core-area, home: false }            # владелец/область
  - { rel: part-of, to: plan-passport-v2, home: false }               # участие в плане
  - { rel: version-of, to: lineage-node-ts, home: false, seq: 1 }     # ось истории
---

# Файл node.ts (пример МНОГОМЕРНОСТИ)

Ядро `FFNode`. Лежит в одной папке, но участвует сразу в нескольких измерениях.

## Поведение (комментарии)
- **Один `home`** (`folder-core-src`) — только по нему наследуется контекст. Перенесём файл (`git mv`) → re-home
  сам перецепит дом, а все `facet-of`/`version-of` рёбра выживут (они на `id`, не на путь).
- **Много `facet-of`** (сервис × домен × область) — это и есть «один файл в нескольких местах сразу», чего ФС не умеет.
  Срез «всё про data-model, что является сервисом» = пересечение двух facet-осей (работа линзы).
- `external_ref{git,…}` — байты живут в git; ячейка лишь указывает на них, не дублирует.
- `version-of`+`seq` — ось истории отдельно от важности (`priority`): seq=порядок, priority=важность.
