---
node_type: question
title: "KQ-1 · Assertion как 7-й примитив ядра?"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/02-project/core/00-kernel/open-questions.md (KQ-1)
tags: [kernel, primitives, needs-owner]
---

# KQ-1 · Assertion как 7-й примитив?

**Суть:** является ли **assertion** отдельным 7-м примитивом ядра, или его роль уже играет поле `body`
конверта (envelope)?

**Что блокирует:** получает ли ядро 7-е существительное (число примитивов).

**Кто решает:** owner (возможно needs-ADR, если ядро действительно растёт на примитив).

**Легаси:** поднято в цикле C1 (`terminology.md` §7.1), помечено UNSURE с 2026-07-25, до сих пор не тронуто
(не входило ни в одну из ратификационных корзин 07-26/07-27).
