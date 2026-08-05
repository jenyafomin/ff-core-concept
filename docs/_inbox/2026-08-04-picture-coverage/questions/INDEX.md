---
node_type: index
title: "Индекс открытых вопросов и идей — бокс picture-coverage"
status: active
topic: picture-coverage
date: 2026-08-04
related:
  - ../README.md
  - ideas/
---

# Индекс — questions/ + ideas/ (бокс picture-coverage)

Харвест всех открытых развилок/идей проекта на 2026-08-04. Дедуп применён — одна развилка = один файл,
источники перечислены внутри файла.

## questions/

| id | тема | статус | источник(и) | смысл одной строкой |
|---|---|---|---|---|
| OQ-1 | durable-store/acts-as-git | open | OQ-file, S7-SYNTHESIS | ветка = форк ленты или вариант проекции? (не кодом, владелец: пока не думать) |
| OQ-2 | durable-store/crash | open | OQ-file, S7-SYNTHESIS R3 | PID-reuse может залочить boot — нужен heartbeat? (нужно измерение) |
| OQ-3 | durable-store/file-first | open | OQ-file, S7-SYNTHESIS R2 | свой `kind:file_edit` или оставить на `domain_event`? |
| OQ-4 | durable-store/idempotency | open | OQ-file, HANDOFF R4, S7-SYNTHESIS R4 | batch-идемпотентность + egress-outbox не построены — риск конфликта с core |
| OQ-5 | durable-store/placement | open | OQ-file, S7-SYNTHESIS R5 | дом журнала `.store/` подтвердить или `.gateway/`? |
| OQ-6 | durable-store/data-model | open | OQ-file | reconcile store-port ↔ @ff/core модели узла — в каком объёме? |
| OQ-7 | durable-store/retention | open | HANDOFF R6, S7-SYNTHESIS R6 | журнал растёт без retention — не срочно, снапшот+хвост аддитивен |
| Q-branch | acts-as-git/data-model | open | 08-01 HANDOFF §пробел7 | ветка = лейбл или адресуемый узел-hypothesis? tension-with OQ-1 |
| KQ-1 | kernel/primitives | open | open-questions.md | assertion = 7-й примитив ядра или роль body-конверта? |
| KQ-2 | kernel/primitives | open | open-questions.md | relation — адресуемая единица или пары-рёбра в конверте? (leak-risk ADR-0004) |
| KQ-4 | kernel/trace | open | open-questions.md | 🔴 как denied-поле держится вне agent_trace? блокирует I-7/тест 5 |
| KQ-8 | kernel/deletion | partial-open | open-questions.md | tombstone/hide/shred — частично ратифицировано (ADR-0007 draft), file-first-эрейж совет pending |
| KQ-9 | kernel/persistence | provisional | open-questions.md | ADR-текст + список file-first типов не завершены (⚠️ сверить с ADR-0006 approved) |
| KQ-11 | kernel/memory | partial-open | open-questions.md | память=проекция vs first-class узел — ядро вопроса не ратифицировано (механика готова) |

## ideas/

| id | тема | статус | источник(и) | смысл одной строкой |
|---|---|---|---|---|
| self-upgrade-under-valve | governance/agents | draft | HANDOFF durable-store §4, 08-01 HANDOFF | само-апгрейд системы — под клапаном или автономно; напряжение с KQ-3 |
| folder-in-folder-restructuring | structure | draft | HANDOFF durable-store §4, 08-01 HANDOFF | пересборка дерева в слои — docs-дерево или граф? (двусмысленность не снята) |
| client-n8n-toolkit | integration | draft | HANDOFF durable-store §4, 08-01 HANDOFF | «клиент» — 3 прочтения (домен/коннектор/generic-слой), не различены |
| policy-scope-project-vs-universal | governance/policy | draft (по факту decision-shaped) | HANDOFF durable-store §4, 08-01 HANDOFF §Р1 | policy-узел = project или universal scope? связать с ADR-0004+constitution |

## Дубли и связи (снятые при харвесте)

- **OQ-4 ≡ HANDOFF-R4 ≡ SYNTHESIS-R4** — один файл `oq-4-batch-idempotency-egress-outbox.question.md`.
- **OQ-7 (журнал retention) собран из HANDOFF-R6 + SYNTHESIS-R6** — не было отдельного OQ-номера в
  исходном OQ-file, присвоен новый id (R6 — не decision-блокер, скорее backlog, но открыт).
- **4 «широких кандидата»** встречаются ОДНОВРЕМЕННО в `durable-store/HANDOFF.md §4` и в
  `_log/2026-08-01-docs-as-memory-and-tidy/HANDOFF.md` — один файл на кандидата, оба источника указаны.
- **tension-with OQ-1 ↔ Q-branch** — одна физическая тема (ветка-гипотеза), два разных вопроса на разных
  уровнях (семантика ленты vs форма данных метки); НЕ слиты в один файл, т.к. отвечаются независимо.
- **tension-with KQ-8 ↔ OQ-7** — общий термин «удаление/обрезка» на разных слоях (акт-эрейж vs
  журнал-retention); не слиты, разные механизмы.

## Что осталось НЕ покрыто источниками (флаг для следующего раунда)

- **«Версии как грань»** — HANDOFF 08-01 просил прогнать через 5-воротный тест, не сделано; не материализовано
  отдельным файлом (слишком сырое для question/idea формата).
- **«Агрегация» решений в системный вывод** — звено не смоделировано, упомянуто вскользь (HANDOFF 08-01 §пробел 6).
- **copy-forced прецедент** (шаблон-проект → инстанс-проект `docs/03-projects/`) — пример, не развилка; не заведён отдельным файлом.
- **Легаси FQ1-24 / VQ1-4 серия** (`docs/_log/2026-07-07-brain-open-questions/`) — на 07-07 отмечены 8 неотвеченных
  (FQ2·FQ4·FQ6·FQ9·FQ16·FQ17·FQ21·FQ24), но НЕ проверена свежесть против месяца последующей kernel-работы
  (00-kernel/ переоткрыл часть решений без ссылок — уже отмечено как системный баг в STATE 07-25). Нужен
  отдельный freshness-проход, не включено в этот харвест как открытые вопросы.
- **ga-rentacar форки** (`docs/03-projects/ga-rentacar/_inbox/HANDOFF-2026-08-04-forks-and-values.md`) — своя
  тема, за пределами обозначенных источников этого харвеста, НЕ прочитана.
