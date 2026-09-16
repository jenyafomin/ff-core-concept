---
status: open
owner: jenya.stasik@gmail.com
date: 2026-09-15
scope: project
door: one-way
values: [Ц1-Читаемость, Ц2-Тождество]
related:
  - ./invariants.md
  - ../01-brain/03-unit/
  - docs/00-states/05-assemble-and-direct/plans/01-S1-ratify-two-laws/questions/03-l1dom-home/
  - docs/00-states/05-assemble-and-direct/_shared/OWNER-QUEUE.md
queue_card: Q-L1dom
---

# Вопрос: где физически живут Закон-1 / Закон-2?

## Суть
Куда падают Закон-1 / Закон-2 при ратификации — в тело ядра `invariants.md` (субстрат-широкий choke-point,
по прецеденту I-1..I-14) или в §-инварианты самой UNIT-SPEC (спека-локально)? Источник явно метит это
«owner/S2, линза, не решаем».

## Варианты (без вердикта)
- **A** = оба закона → ядро `invariants.md` (choke-point-широкий, симметрично I-1..I-14).
- **B** = оба закона → UNIT-SPEC §-инвариант (спека-локально).
- **C** = гибрид — Закон-1 → ядро, Закон-2 → спека-локально, ссылается ИЗ ядра (фаворит-эвристика по
  существующей конвенции doc-tree, но НЕ вердикт).
- **D** = отсрочка — оба остаются `CANDIDATE`/provisional в `work/`, физический дом решается ПОСЛЕ S3.

## Рычаг
S2-докет знает, куда патчить, без повторного открытия вопроса на ратификации.

## Тип
🔴 Односторонняя дверь. Статус: ждёт owner.

## Первоисточник
`docs/00-states/05-assemble-and-direct/plans/01-S1-ratify-two-laws/questions/03-l1dom-home/`
(бриф 4 опций A/B/C/D + рычаг).
