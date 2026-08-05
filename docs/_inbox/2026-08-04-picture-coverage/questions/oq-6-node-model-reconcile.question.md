---
node_type: question
title: "OQ-6 · Reconcile двух моделей узла (store-port ↔ @ff/core)"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md
tags: [durable-store, file-first, TODO-M3, data-model]
---

# OQ-6 · Reconcile двух моделей узла (store-port ↔ @ff/core, TODO M3)

**Суть:** проза markdown → типизированный envelope. Сейчас тело едет verbatim в `payload.content` — полная
реконсиляция между file-first сырьём и `@ff/core`-моделью узла — это дизайн-шов, ещё не решённый.

**Открытый вопрос:** нужен ли полный reconcile, и в каком объёме (частичный маппинг полей vs полная типизация)?

**Связь:** refines OQ-3 (act kind для file-edit) — оба про стык file-first пера и типизированной модели.
