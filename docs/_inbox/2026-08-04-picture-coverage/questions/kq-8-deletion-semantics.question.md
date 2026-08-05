---
node_type: question
title: "KQ-8 · Что считается deletion? (tombstone / hide / physical erase)"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/02-project/core/00-kernel/open-questions.md (KQ-8)
tags: [kernel, deletion, ADR-0007, invariant-I-4, invariant-I-12, needs-ADR]
---

# KQ-8 · Что считается deletion?

**Суть:** что такое «удаление» — tombstone, projection-hide или physical erase? Держит инварианты I-4/I-12,
но термин не определён.

**Провизорный ответ (частично ратифицирован):** режим удаления = свойство per type/policy
`hide | prune | shred` (ADR-0007 §b); `hide` дефолт; `shred` ограничен file-first-границей (crypto-shred
недоказуем против git-payload). Payload-separability + erasure-as-act = предлагаемый I-15.

**Что осталось OPEN:** ведётся в ADR-0007 (день-1-минимум G3 = approved), но Блок-4 совет «эрейж ⟂
file-first/git» — pending. КОРРЕКТИРОВКА: STATE.md (07-26) отмечал 🔴 CRITICAL — crypto-shred недоказуем
против file-first payload в git-истории; смыкается с более широким Г20.

**Кто решает:** needs-ADR (текст ADR-0007) + owner (KQ-8-Q1/Q2) + Блок-4 совет.

**Связь:** tension-with `oq-7-journal-retention.question.md` (тот же корень-термин «удаление/обрезка» на
разных уровнях системы).
