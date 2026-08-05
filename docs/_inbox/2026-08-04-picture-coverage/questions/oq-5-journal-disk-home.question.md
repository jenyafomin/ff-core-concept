---
node_type: question
title: "OQ-5 · Дом журнала на диске — подтвердить"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/SYNTHESIS.md (R5)
tags: [durable-store, doc-discipline, placement]
---

# OQ-5 · Дом журнала на диске

**Суть:** R1 положил per-topic `journal.jsonl` по умолчанию в gitignored `.store/` (переопределяется
`--store-dir`). Архитектор рекомендует: ВНЕ коммитимого дерева, `.store/<chat>/<thread>/`, НЕ в `docs/`.

**Варианты:**
- **(A)** оставить `.store/` как есть (текущий дефолт).
- **(B)** per-topic под `.gateway/` (альтернатива, поднятая владельцем).

**Что блокирует:** doc-discipline-решение; нужно решить ДО wiring раннера дальше (уже частично провязано в R1).

**Кто решает:** owner (doc-discipline).
