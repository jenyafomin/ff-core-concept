---
node_type: question
title: "OQ-7 · Retention журнала без обрезки (R6)"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/_inbox/2026-08-04-durable-store-substrate/HANDOFF.md (§3 R6)
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/SYNTHESIS.md (R6)
tags: [durable-store, retention, performance, not-urgent, KQ-8]
---

# OQ-7 · Retention журнала без обрезки

**Суть:** full replay гоняется НА КАЖДЫЙ ход. Сейчас (~тысячи актов, <50мс) не проблема, но
`observation`/`agent_trace`/`system_telemetry` растут без retention. Стоимость replay-на-ход растёт
незаметно. `KQ-8` (что считается deletion) открыт, carve-out I-4 не ратифицирован.

**Провизорный путь:** снапшот+хвост — аддитивная лестница (снапшот = КЭШ, никогда 2-й источник истины).

**Приоритет:** 🟡 не срочно — не блокирует S7-хвост, но накапливающийся технический долг.

**Связь:** tension-with `kq-8-deletion-semantics.question.md` (общий термин «удаление/обрезка» на разных
уровнях — акт-эрейж vs журнал-retention).
