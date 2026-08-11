---
node_type: question
title: "Q-OQ-D — дом-ADR для порта payload-стирания (ShredablePayloadSink · shred): куда физически ложится решение о шве"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
kind: knowledge-candidate
lens: system-architect (границы/дома/ADR-дисциплина)
plan: ../../README.md
supersedes_disposition:
  - ../../../../../02-project/core/01-brain/01-overview/01-values/07-soglasie/05-revocation-erasure/questions/00-open-questions-register.open-question.md   # строка 37 (Q-ERA-04 = «ADR-0008 thin sub-record») — ЛОЖНА
sources:
  - ../../../../../architecture/ADR/ADR-0009-erasure-witness-and-recursive-seam.md          # :8 scope · :148 R5 · :149-151 carve-out I-4 · :240-242 порт как code-follow-up
  - ../../../../../architecture/ADR/ADR-0007-erasure-and-admission.md                        # семантика стирания/допуска (дом-родитель)
  - ../../../../../_log/2026-08-07-whole-picture-and-cycle/ratification/ADR-0011-pdp-port.draft.md      # РЕЗЕРВ 0011 (read:payload / PDP)
  - ../../../../../_log/2026-08-07-whole-picture-and-cycle/ratification/ADR-0010-compaction-snapshots.draft.md  # РЕЗЕРВ 0010
  - ../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/SPEC-DELTA-DOCKET.md   # §6 :50-54 deref-seam/PayloadStore.get
  - ../work/two-laws.invariant-candidate.md                                                   # U-L1 :62-64 (deref-воронка с viewer)
  - ../../../../STATE.md                                                                        # :169,:173 — ADR-0012 РЕЗЕРВ под node-model (EnvelopeNode/FFNode)
  - ../../../../../_log/2026-07-26-ff-one-system-vision/post-M0-directions/T1-memory-unit.ADR-draft.md  # node-model ADR-draft → будущий ADR-0012
  - ../../../../../03-projects/ga-rentacar/specs/05-m3-topic-agent-contract.spec.md            # :205 «ADR-0012» = node-model, «не существует» (P3)
---

# Q-OQ-D — где живёт решение о порте payload-стирания

## Вход / вопрос
Куда АРХИТЕКТУРНО ложится решение о **шве PayloadStore / `ShredablePayloadSink`** и операции **`shred`**:
новый ADR-NNNN · расширение ADR-0009 · раздел UNIT-SPEC/kernel? Это структурный (доку-дисциплина) вопрос,
не ценностный форк — закрывается рассуждением автономно.

## Почему прошлая диспозиция ЛОЖНА (переигрываем)
Первичная диспозиция Q-ERA-04 (реестр `00-open-questions-register.open-question.md:37`, триаж T1) форсировала
ответ: **«ADR-0008 thin sub-record, scoped to Stage-1 boundary»**. Обоснование (doc-tree law #2 «один дом на
тему; boundary ≠ policy» + прецедент ADR-0007←ADR-0006) — **было верным по НАПРАВЛЕНИЮ** (отдельная тонкая
запись, а не инъекция в 0007). Ложным оказалось лишь **ИМЯ НОМЕРА**:

- **ADR-0008 занят** другой темой — `ADR-0008-log-and-graph-cqrs.md` (log⟂graph CQRS). Коллизия.
- С тех пор **ADR-0009** создан под свидетеля+рекурсивный шов (не порт — порт лишь назван как code-follow-up,
  `ADR-0009:240-242`).
- **ADR-0010 и ADR-0011 РЕЗЕРВИРОВАНЫ pending-черновиками** (`_log/2026-08-07/ratification/`): 0010 =
  compaction/snapshots, 0011 = PDP-порт (`read:payload`). Оба имеют `status: draft` + целевой ADR-дом.

Т.е. диспозиция назвала номер, **не сверившись с реестром занятых/зарезервированных** — ровно тот класс
ошибки, что должен переигрываться. Направление (отдельный тонкий ADR) стоит; номер — пересчитать честно.

## Ставка
Формализовать контракт порта ДО кода `T-D1b-shred-by-ref-pii`; разблокировать R5 (подпись остаточного риска
`ADR-0009:148` блокирована «пока порт `shred` не законтрактован»); закрыть «reopened»-статус.
Обратимо (ADR-черновик, не мерж) → низкая ставка → 1 линза (architect+doc-discipline), критик опционален.

## Task-спек (что произвести)
1. Решить дом: новый ADR vs расширение 0009 vs UNIT-SPEC/kernel — обоснование по `docs-standard` (ADR обязателен
   для storage/integration/архитектуры) + doc-tree law #2.
2. Честно назначить НОМЕР по реестру занятых+зарезервированных (не повторить ошибку 0008).
3. Каркас Context/Decision/Alternatives/Consequences (НЕ писать сам ADR).
4. Проверить owner-форк; если всплывает — линза в OWNER-QUEUE, не решать.
Разбор → `analyses/01-adr-home.analysis.md`; рекомендация → `synthesis/01-adr-home.synthesis.md`.
