---
node_type: question
title: "KQ-9 · Persistence-as-policy ADR + file-first type list"
status: open
topic: picture-coverage
date: 2026-08-04
source:
  - docs/02-project/core/00-kernel/open-questions.md (KQ-9)
tags: [kernel, persistence, ADR-0006, file-first, needs-ADR]
---

# KQ-9 · Persistence-as-policy ADR + file-first type list

**Суть:** формализовать «хранение как политику» (D-1 ратифицирован как рамка) — и какие типы являются
file-first (опт-ин «файл-истина»)?

**Статус:** `PROVISIONAL-answer` — рамка D-1 принята; конкретный ADR-текст + список file-first типов ещё
открыты.

⚠️ **Возможно частично устарело:** ADR-0006 упоминается в более поздних записях STATE.md (07-26) как
`approved` — нужно свериться, закрывает ли это KQ-9 целиком или остаётся хвост «список file-first типов».
Не проверено в этом харвесте (флаг на верификацию).

**Что блокирует:** тему хранения + опт-ин типов целиком; C5-ADR.

**Кто решает:** needs-ADR (C5).
