---
node_type: analysis
title: "Синтез Q-OQ-D — рекомендация по дому порта payload-стирания (1 абзац)"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
lens: system-architect
question: ../adr-home-erasure-port.question.md
analysis: ../analyses/01-adr-home.analysis.md
resolves: Q-OQ-D (reopened Q-ERA-04)
confidence: high
---

# Рекомендация

> ⚠️ **ПОПРАВКА (2026-08-09, critic-check, LOSE-NOTHING):** номер исправлен **0012 → 0013**. Первая версия
> назвала 0012, сверившись только с `docs/architecture/ADR/` — но **0012 негласно зарезервирован под node-model
> ADR** (`STATE.md:169,173` · `ga-rentacar spec:205` · `T1-memory-unit.ADR-draft.md`). Прежняя рекомендация
> (0012) аннулирована; направление (новый ADR Extends 0009, автономно) — не тронуто.

Дом решения о `ShredablePayloadSink` / `shred` = **новый тонкий ADR, `Extends: ADR-0009` (через него ADR-0007),
рекомендуемый номер ADR-0013**. Направление исходной диспозиции (отдельная запись, boundary≠policy, doc-tree
law #2) было верным — ложным было только имя номера: ADR-0008 занят log⟂graph CQRS; 0010/0011 зарезервированы
pending-черновиками (compaction, PDP-порт); **0012 зарезервирован под node-model** (EnvelopeNode/FFNode).
Честно-свободный (grep `ADR-00NN` по всему `docs/` = 0 упоминаний ≥0013) — **0013** (подтвердить при кристаллизации).
Расширять тело ADR-0009 нельзя (0009 = свидетель+рекурсивный шов; порт там лишь code-follow-up — сплав тем);
класть в UNIT-SPEC/kernel нельзя (там живёт ЗАКОН присутствия шва, U-L1 Instance-1 — работа sibling Q-L1dom, а
не КОНТРАКТ порта); сворачивать в ADR-0011 нельзя (PDP = решение доступа `read:payload`, а sink = жизненный цикл
хранилища — разные швы, но обязателен явный кросс-реф пары read-seam⟂write-erase-seam). В ADR-0013 кладём каркас
Context/Decision/Alternatives/Consequences (детали — в analysis): контракт narrow-sink (put/get + `shred`=
«unrecoverable»), engine владеет минимальной поверхностью, tombstone port-local, `payloadRef`⟂`payloadHash`
наследуется. **Owner-форк отсутствует** — решение автономно-структурное; смежные R3/R4/R5/carve-out-I-4 остаются
за границей ADR (R5 им лишь разблокируется). Уверенность: высокая; обратимо (ADR-черновик, не мерж).
