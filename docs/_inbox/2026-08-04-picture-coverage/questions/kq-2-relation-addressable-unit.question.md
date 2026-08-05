---
node_type: question
title: "KQ-2 · Relation — самостоятельная адресуемая единица?"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/02-project/core/00-kernel/open-questions.md (KQ-2)
tags: [kernel, primitives, ADR-0004, leak-risk, needs-ADR]
---

# KQ-2 · Relation — самостоятельная адресуемая единица?

**Суть:** **relation** — отдельная адресуемая единица, или хранится как пары-рёбра внутри конверта
узла-источника? Relation является access-bearing (несёт доступ) → риск утечки по ADR-0004.

**Что блокирует:** адресуемость relation + policy на рёбрах (leak-risk).

**Кто решает:** needs-ADR (адресуемость + политика на edges).

**Легаси:** поднято в `terminology.md` (цикл C1), НЕ ратифицировано ADR — единственный из "примитивов" блок
без движения с 07-25.
