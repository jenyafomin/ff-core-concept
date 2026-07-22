---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-20
Scope: project
node_type: merge-notes
title: MERGE-NOTES — что нового в SPEC-DRAFT-forgetting-hard-erase--decomp-2026-07-16 против канона R1-R6/A1-A5
Related:
  - SPEC-DRAFT-forgetting-hard-erase.md
  - SPEC-DRAFT-forgetting-hard-erase--decomp-2026-07-16.md
---

# MERGE-NOTES (2026-07-20) — hard-erase дубль из растворённой `decomposition/`

> Со-размещённый файл `SPEC-DRAFT-forgetting-hard-erase--decomp-2026-07-16.md` (сессия-волна 07-16/18,
> node_type=mechanism, «дом развилки DQ-2») против канона `SPEC-DRAFT-forgetting-hard-erase.md` (R1–R6, A1–A5,
> T1–T5). Ниже — только НОВОЕ. Канон НЕ трогался.

## Что нового (уникально против R1-R6/A1-A5)
- **R-ERASE / примат референта.** Явный приоритет ролей → правило R-ERASE (Ф2): чьё право на забвение
  первично. Канон R5 упоминает «безусловность референта» как триггер, но не оформляет это как отдельное
  разрешающее правило приоритета ролей.
- **INV-LINEAGE (H-5).** Инвариант «запись без `about`+`derived_from` отклоняется» — нужен для каскада забвения
  по lineage (H-4), НО блокирует корневые/системные узлы → требуются исключения. Канона на этот инвариант нет
  (R3 говорит о каскаде по DataResidency/derived, но не о lineage-инварианте на приёме записи).
- **C-offgraph — вне-графовое стирание.** Критическая трещина: summary, ушедший в Telegram (вне графа),
  механизмом hard-erase НЕ покрыт — нужен **taint-замыкание off-graph**. Канон (R3/A2) чистит материализации/
  реплики/эмбеддинги ВНУТРИ субстрата, но внешние утёкшие копии не адресует. Это реальный пробел приёмки.

## Дополнительно (уточнения, не новые требования)
- Развилка **тип×слой при erase (Ф1)** и сегментация свободного текста по референту (Ф2) — как открытые швы.
- **erase vs бэкапы/WAL (M7):** crypto-shredding ИЛИ явно «вне scope» — канон это относит к Non-goals
  («кросс-тенант federation-purge 🟢 позже»), тут поднято острее для payload-store purge (DEC-I-6).
- Форма результата (декомп): инженерная спека + **ADR «erasable payload separation»** + taint-замыкание
  off-graph. Ссылки на аналитику: FABLE-ANSWER-hard-erase, _critique-fable-erase, Ledger секция C.

## Для синтезатора (сухой остаток)
1. Добавить в SPEC: R-ERASE (приоритет ролей) + INV-LINEAGE с исключениями для системных/корневых узлов.
2. Новый критерий приёмки под C-offgraph (taint-замыкание вне-графовых копий) — сейчас дыра в A1–A5.
3. Решить erase vs WAL/бэкапы явно (crypto-shredding vs вне scope) и оформить ADR «erasable payload separation».
