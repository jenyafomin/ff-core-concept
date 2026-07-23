---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-07-22
Scope: project
node_type: fork
title: F6 — `hard-erase`: где живёт? (критик: до git mv)
Related:
  - ../README.md
  - ../../../doc-discipline/restructure-2026-07/brain-top-level/PLACEMENT-AUDIT-2026-07-21.md   # §9
  - ../../../../architecture/ADR/ADR-0005-data-substrate-structure.md   # Ratified-by: ADR-0005 (консолидация 9 форков)
---

# F6 — `hard-erase`: где живёт?

## Вопрос
Где постоянный дом механики **`hard-erase`** (право на забвение)?

## Варианты
- **(А)** Value-owned — под `07-soglasie` (Согласие).
- **(Б)** Сквозной — `_mechanics/hard-erase`.
- **(В)** Оба — SPEC под Согласием + механика в `_mechanics` (router «принадлежит vs служит»).

## Ход мысли — что учесть (открыто, не исчерпывающе)
- Критик требует решить **до любого `git mv`**.
- Правило одного дома (doc-tree §2): контент не дублировать; служит многим → `_shared/` + теги,
  но всё равно один дом.

## От чего зависит / downstream
- Блокирует `git mv` R-B; связано с router «принадлежит vs служит» (DEVELOPMENTAL-MODEL).

## РЕШЕНИЕ: **(А) value-owned под `07-soglasie`** _(синтез 2026-07-22, ждёт кивка → ADR)_
- Право на забвение семантически ПРИНАДЛЕЖИТ Согласию → один дом = `07-soglasie`.
- СЛУЖИТ всем доменам → сквозная видимость тегом/тонкой ссылкой, НЕ вторым домом (doc-tree §2).
- Вариант В (SPEC + механика в `_mechanics`) отклонён: два дома = риск дубля; допустим лишь если
  запись в `_mechanics` — чистый указатель на дом в Согласии, без контента.
- Enforcement `hard-erase` — обязанность движка (integrity-as-engine-duty), но это ортогонально дому дока.
- Router «принадлежит vs служит» → тут «принадлежит Согласию, служит всем».
