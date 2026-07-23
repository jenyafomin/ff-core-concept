---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-07-22
Scope: project
node_type: fork
title: F9 — Supersession между канон-доками (критик: до git mv)
Related:
  - ../README.md
  - ../../../doc-discipline/restructure-2026-07/brain-top-level/PLACEMENT-AUDIT-2026-07-21.md   # §9
  - ../../../../architecture/ADR/ADR-0005-data-substrate-structure.md   # Ratified-by: ADR-0005 (консолидация 9 форков)
---

# F9 — Supersession между канон-доками

## Вопрос
Какой из **`DEVELOPMENTAL-MODEL / 11-facet / AUDIT-MAP`** побеждает и где? Проставить `Supersedes`.

## Варианты
- **(А)** Единый порядок supersession (один документ — источник, остальные ссылаются).
- **(Б)** Раздельно по темам (для каждой темы свой победитель).

## Ход мысли — что учесть (открыто, не исчерпывающе)
- Это мета-форк: снимает противоречия, всплывшие в F2 (11-facet §G), F7 (Router↔AUDIT-MAP), F8 (GROWTH-MAP).
- Критик требует решить **до любого `git mv`**; результат → `Supersedes` во frontmatter + запись в ADR.
- LOSE-NOTHING: проигравший не удаляется, а помечается статусом + `Supersedes`-ссылкой.

## От чего зависит / downstream
- Разблокирует F2/F7/F8; входит в ADR структуры субстрата (R-B, шаг 2).

## РЕШЕНИЕ: **(А) единый порядок — спайн/`data-canon` = арбитр** _(синтез 2026-07-22, ждёт кивка → ADR)_
- Один источник истины: `VOCABULARY-SPINE` / `data-canon`. При ЛЮБОМ конфликте спайн побеждает.
- `DEVELOPMENTAL-MODEL / 11-facet / AUDIT-MAP` выравниваются на спайн через `Supersedes` во frontmatter;
  на своей УНИКАЛЬНОЙ теме остаются active, но уступают спайну на пересечениях.
- LOSE-NOTHING: проигравший не удаляется — статус + `Supersedes`-ссылка.
- Разблокирует F2 (11-facet §G), F7 (Router↔AUDIT-MAP), F8 (GROWTH-MAP); входит в ADR субстрата (шаг 2).
