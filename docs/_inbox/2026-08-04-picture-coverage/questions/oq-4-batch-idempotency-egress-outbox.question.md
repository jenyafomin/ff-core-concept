---
node_type: question
title: "OQ-4 · Batch/turn-level идемпотентность + egress-outbox (R4)"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md
  - docs/_inbox/2026-08-04-durable-store-substrate/HANDOFF.md (§3 R4)
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/SYNTHESIS.md (R4)
tags: [durable-store, idempotency, egress, risk-core-conflict, not-built]
---

# OQ-4 · Batch/turn-level идемпотентность + egress-outbox

**Суть:** дедуп сейчас работает только для ОДНОГО `domain_event` на ход (по `source_ref`+`snapshotHash`).
Co-emitted `observation`-акты НЕ дедупятся вообще → claim ADR-draft-0009 «exactly ONE act-batch» не держится
на batch-уровне. Egress-outbox (T2 guard) вообще не начат → S7 закрыл лишь ПОЛОВИНУ dup-LLM/dup-egress бага.

**Что блокирует:** полное закрытие S7-хвоста; риск конфликта с ядром store-core, если строить параллельно.

**Открытый вопрос:** строить отдельной волной (не в параллель со store-core)?

**Приоритет:** 🟠 (ранжирование S7 SYNTHESIS, второй по значимости после R1/R2/R3 которые уже сделаны).
