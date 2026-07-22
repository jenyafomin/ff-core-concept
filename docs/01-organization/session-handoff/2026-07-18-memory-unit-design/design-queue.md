---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-18
Scope: project
node_type: plan-index
title: design-queue — ИНДЕКС развилок в дизайн (живут в своих домах)
Related:
  - ../_shared/routing-rule/README.md
  - ../_shared/mechanisms/hard-erase/README.md
---

# 🔴 Дизайн-очередь — ИНДЕКС (не штамп, проектируем)

> Принцип владельца: развилка живёт в СВОЁМ доме с собственной аналитикой; здесь — только перечисление
> со ссылками. Не loose-пункты. Открой дом → там разбор и источники.

| # | Развилка | Дом (аналитика) | Статус | Блокирует |
|---|----------|-----------------|--------|-----------|
| **DQ-1** | «Разводящее правило» — измерение → поле/policy/тип/ребро/view | [`../_shared/routing-rule/`](../_shared/routing-rule/README.md) | несущий блокер | erase-каскад, enforcement, passport |
| **DQ-2** | Hard-erase (Ф1/Ф2 + дыры off-graph, INV-LINEAGE) | [`../_shared/mechanisms/hard-erase/`](../_shared/mechanisms/hard-erase/README.md) | 🔴 трещины | M3→M7 (PII, backups) |

## Порядок
**DQ-1 → DQ-2**, оба ПОСЛЕ миграции + passport-контракта (проектировать на чистом дереве).
Форма работы каждой: делегированный fable-orchestrator/ask-council → вердикт+развилки → в дом развилки.

## Расширение
Новая развилка = новый дом (папка с README+аналитикой) + строка в этой таблице. Так очередь = живой индекс.
