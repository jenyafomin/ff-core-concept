---
node_type: question
title: "KQ-4 · Trace-leg редакции deny-field-everywhere (I-7 / kernel test 5)"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/02-project/core/00-kernel/open-questions.md (KQ-4)
tags: [kernel, trace, invariant-I-7, blocker, needs-ADR]
---

# KQ-4 · Trace-leg редакции deny-field-everywhere

**Суть:** как denied-поле удерживается вне `agent_trace`, если `agent_trace` — это WRITE-поток, а не
gated через `resolve()`?

**Варианты:**
- **(1)** trace-writer редактирует поле ДО сериализации.
- **(2)** trace = проекция, clamped на чтении.

**Что блокирует:** 🔴 закрытие инварианта I-7 / kernel-теста 5 (GPT-review test 5) — топ-блокер ядра, не
закрыт с цикла C2–C3 (07-25).

**Кто решает:** needs-ADR или owner-решение по механике trace.
