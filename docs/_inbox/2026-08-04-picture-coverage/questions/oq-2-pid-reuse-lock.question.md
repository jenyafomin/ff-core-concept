---
node_type: question
title: "OQ-2 · PID-reuse в single-writer lock"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/SYNTHESIS.md (R3)
tags: [durable-store, crash-safety, lock, needs-measurement]
---

# OQ-2 · PID-reuse в single-writer lock

**Суть:** crash-mid-turn журнал переживает (доказано R3), НО если ОС переиспользует PID мёртвого писателя
под живой чужой процесс — `pidAlive` вернёт `true` → boot fail-closed до ручного снятия lock.

**Что блокирует:** решение, нужен ли heartbeat / start-time-тайбрейк вместо голого PID-чека.

**Провизорный ответ:** актуально только если шлюз быстро крутит PID (частые рестарты процесса) — нужно
измерить реальную частоту, прежде чем решать.

**Кто решает:** owner, после измерения (не чисто дизайн-решение).
