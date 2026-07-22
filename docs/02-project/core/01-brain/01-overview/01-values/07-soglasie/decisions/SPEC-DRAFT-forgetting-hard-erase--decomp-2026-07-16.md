---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-18
Scope: project
node_type: mechanism
title: hard-erase — дом механизма забвения (DQ-2)
Related:
  - ../../../plan/design-queue.md
  - ../../../01-node/FABLE-ANSWER-hard-erase.md
  - ../../../01-node/_critique-fable-erase.md
---

# 🔥 hard-erase — право на забвение (дом механизма)

> Это ДОМ развилки DQ-2 (не loose-пункт). Здесь живёт аналитика; `design-queue.md` лишь ссылается сюда.
> Не «да/нет», а инженерный разбор. Блокирует M3→M7.

## Что решаем
Право на забвение как исполнимый механизм: тип×слой при erase (Ф1), приоритет ролей → R-ERASE (Ф2),
каскад по lineage (H-4), tombstone (DL-17), payload-store purge (DEC-I-6).

## Открытые трещины (из критики)
- **C-offgraph** — вне-графовое стирание (summary→Telegram): механизма НЕТ. Нужен taint-замыкание.
- **H-5 INV-LINEAGE** — «запись без about+derived_from отклоняется» блокирует корневые/системные узлы → исключения.
- **Ф2** — сегментация свободного текста по референту: шва нет.
- **Erase vs бэкапы/WAL (M7)** — crypto-shredding ИЛИ явно «вне scope».

## Источники (аналитика уже есть)
- `../../../01-node/FABLE-ANSWER-hard-erase.md` · `../../../01-node/_critique-fable-erase.md`
- Ledger секция C: `…/2026-07-18-ratification-backlog/LEDGER.md`

## Форма результата
Инженерная спека + ADR «erasable payload separation» + taint-замыкание off-graph. Делегировать fable-orchestrator/ask-council.
