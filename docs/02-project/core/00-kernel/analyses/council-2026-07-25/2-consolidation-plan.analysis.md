---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
node_type: analysis
title: План консолидации + META-FINDING (00-kernel переоткрыл 01-brain)
related:
  - ../../open-questions.md
  - ../../../01-brain/01-overview/L0-memory-unit.md
  - ../../../01-brain/01-overview/01-values/07-soglasie/decisions/SPEC-DRAFT-forgetting-hard-erase.md
---

# ♻️ META-FINDING + план консолидации (LOSE-NOTHING)

## META-FINDING (нарушение закона doc-discipline #2 «один дом на тему»)
Ночной канон `00-kernel/` **пере-открыл вопросы, уже проработанные в `01-brain/`, НЕ ссылаясь на них**.
Два дубля-темы, которые нужно свести в один дом ДО ратификации:

| KQ | Переоткрытый в `00-kernel/` | Уже проработан в `01-brain/` |
|----|------------------------------|-------------------------------|
| **KQ-11** (память) | `open-questions.md` KQ-11 | `01-brain/01-overview/L0-memory-unit.md` (2026-07-05) — уже приземлил thin-passport insight **EDGE** + **В2** битемпоральность + **Forget≠Rework** |
| **KQ-8** (удаление) | `open-questions.md` KQ-8 | `.../07-soglasie/decisions/SPEC-DRAFT-forgetting-hard-erase.md` + архив `_archived/decomposition-pre-dissolve-2026-07-20/01-model/01-node/FABLE-ANSWER-hard-erase.md` |

## План реконсиляции (аддитивно, ничего не удаляя)
1. **KQ-11 ↔ L0.** Синтез C **явно линкует** `L0-memory-unit.md` (В4 thin-passport, В2 битемпоральность,
   Forget≠Rework) — совет пришёл к тому же. Свести в один дом = L0 остаётся истиной единицы памяти,
   синтез C проецирует и дополняет scope-clauses (I-4/I-5 carve-outs). НЕ переписывать L0.
2. **KQ-8 ↔ hard-erase.** Синтез D живёт в `decisions/` рядом с `SPEC-DRAFT-forgetting-hard-erase.md` и
   `MERGE-NOTES-hard-erase-2026-07-20.md` — один дом. Архивный `FABLE-ANSWER-hard-erase.md` **не трогаем**
   (`_archived/`), только ссылаемся.
3. **Реестр KQ.** При закрытии KQ-11/KQ-8 в `open-questions.md` проставить указатель на синтезы C/D
   (проекция, не копия контента).

## Стратегия (KQ-14) = ВГЛУБЬ
Записываем как решение направления: **консолидировать существующее вглубь, не расширяться вширь.**
Свидетельства: 3 красных блокера (KQ-9/10/4) + частичное покрытие инвариантов (I-12 без теста;
I-7/8/9/10 частичны; I-10 не гонялся на мульти-scope). Новые темы не заводим, пока эти дыры открыты.

## Открытые форки
- Нужен ли отдельный «reconciliation commit» или реконсиляция уедет внутрь ратификации A/B — на выбор владельца.
