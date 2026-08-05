---
node_type: question
title: "KQ-11 · Память (шаг 6): проекция или first-class узел? (ядро OPEN)"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/02-project/core/00-kernel/open-questions.md (KQ-11)
tags: [kernel, memory, vertical-scenario, domain_event, observation, needs-owner-ratify]
---

# KQ-11 · Память (step 6): проекция или first-class node?

**Суть:** «память» на шаге 6 — чистая проекция над узлом-задачей (ноль новых узлов), или first-class
`type:memory` узел с ребром `recalls → task`? Решает: `domain_event` vs `observation`.

**Статус:** 🟡 `PARTIAL` — фасет рефлексивности ✅ RATIFIED (2026-07-26): `recallFeedback: off|passive|active`,
дефолт `passive`. **Ядро вопроса ОСТАЁТСЯ OPEN.**

**Провизорный канон (механика сведена, дублей домов больше нет, B3-a применён 07-27):** проекция ·
`observation`-акт · insight-EDGE, НЕ `type:memory` узел.

**Что блокирует:** классификацию шага 6; модель памяти в вертикальном сценарии.

**Кто решает:** owner — осталось только ратифицировать KQ-11-Q2 (механика уже готова, ждёт подписи).
