---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-07-22
Scope: project
node_type: fork
title: F5 — family-shared ярус `02-units/_shared/` (критик: обязателен до git mv)
Related:
  - ../README.md
  - ../../../doc-discipline/restructure-2026-07/brain-top-level/PLACEMENT-AUDIT-2026-07-21.md   # §9
  - ../../../../architecture/ADR/ADR-0005-data-substrate-structure.md   # Ratified-by: ADR-0005 (консолидация 9 форков)
---

# F5 — family-shared ярус `02-units/_shared/`

## Вопрос
Ввести ли **третий уровень** между domain-local и сквозным — для passport-подобных контрактов,
которые нужны нескольким единицам (node+edge+act+lens)?

## Варианты
- **(А)** Да — ярус `02-units/_shared/` (family-shared).
- **(Б)** Нет — только два уровня (domain-local ↔ сквозной).

## Ход мысли — что учесть (открыто, не исчерпывающе)
- Критик требует определить это **до любого `git mv`** (иначе passport-контракты повиснут).
- Кандидаты в ярус: контракты, общие для семьи `node·edge·act·lens`.

## От чего зависит / downstream
- Блокирует `git mv` R-B; связано с F1 (домены → что «family»).

## РЕШЕНИЕ: **(Б) Нет — два уровня, ярус не вводить сейчас** _(синтез 2026-07-22, ждёт кивка → ADR)_
- Отдельный `02-units/_shared/` преждевременен: раскладка единиц ещё не известна.
- «Служит многим» уже покрыт стандартом `_shared/` + теги (doc-tree §2) — escape-hatch есть.
- Ярус промоутим по факту (promotion-by-evidence: 2+ реальных passport-контракта), не заранее.
- Зависит от F1: что считается «family» определяется после канона доменов (data-субъект).
