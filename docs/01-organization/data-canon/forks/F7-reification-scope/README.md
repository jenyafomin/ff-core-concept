---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-07-22
Scope: project
node_type: fork
title: F7 — `reification`: domain-local vs сквозной? (критик: до git mv)
Related:
  - ../README.md
  - ../../../doc-discipline/restructure-2026-07/brain-top-level/PLACEMENT-AUDIT-2026-07-21.md   # §9
  - ../../../../architecture/ADR/ADR-0005-data-substrate-structure.md   # Ratified-by: ADR-0005 (консолидация 9 форков)
---

# F7 — `reification`: domain-local vs сквозной?

## Вопрос
Механика **`reification`** — domain-local ИЛИ сквозной? **Router и AUDIT-MAP противоречат** — выбрать канон.

## Варианты
- **(А)** domain-local.
- **(Б)** сквозной.

## Ход мысли — что учесть (открыто, не исчерпывающе)
- Источник форка = прямое противоречие Router ↔ AUDIT-MAP; надо снять его каноном (см. F9).
- Критик требует решить **до любого `git mv`**.

## От чего зависит / downstream
- Блокирует `git mv` R-B; связано с F9 (supersession канон-доков).

## РЕШЕНИЕ: **(Б) сквозной** _(синтез 2026-07-22, ждёт кивка → ADR; сверить с DEVELOPMENTAL-MODEL)_
- Реификация (сделать неявное явным узлом графа) — базовая операция анатомии/движка, не собственность
  одного домена → сквозной канон.
- Противоречие Router ↔ AUDIT-MAP снимается в пользу сквозного; фиксируется через F9 (supersession).
- ⚠️ Вывод по смыслу термина — перед ADR сверить с `DEVELOPMENTAL-MODEL`, чтобы не разойтись с исходным
  определением reification там.
