---
node_type: question
title: "OQ-3 · Отдельный kind: file_edit для file-first актов?"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/SYNTHESIS.md (R2)
tags: [durable-store, file-first, act-kinds, ADR-0006]
---

# OQ-3 · Отдельный `kind: file_edit` для file-first актов?

**Суть:** сейчас file-first перо (`store-md.ts`, `ingest()`) порождает `domain_event` — единственный kind,
который граф сворачивает. Отдельный `file_edit`/`file_observation` = аддитивная правка frozen `ACT_KINDS`
в `types.ts`.

- **(A)** завести свой kind `file_edit`/`file_observation`.
- **(B)** оставить на `domain_event` с `provenance.source='file-first'`.

**Что блокирует:** дизайн-шов M3 (file-first перо, полный срез).

**Связь:** refines OQ-6 (reconcile модели узла) — оба про то, как file-first данные ложатся в типизированную
модель актов.
