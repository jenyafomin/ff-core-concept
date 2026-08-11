---
node_type: question
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
plan: ../README.md
title: "Q-S3scope — совпадает ли «вторая форма» D1.b (access_event, Этап2) со «второй формой» S3 (time-on-edge)?"
run: ../../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
source_queue: ../../../../../_log/2026-08-09-autonomous-question-closure/planning/QUEUE-questions.plan.md
related:
  - ../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/00-builder.report.md   # F6 access_event, кандидат 1
  - ../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/06-fork2-f6.report.md  # architect verdict, "по-слойно"
  - ../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md               # paper-falsification time-on-edge, REQUIRES-SPECIAL-CASING
  - ../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md                                  # G2 definition, S3 scope
  - ../../../../_shared/task-pool.md   # T-D1b-second-form-falsification, T-D1b-f6-accept-boundary, T-D1b-second-form-time-on-edge, T-prove-2nd-form
  - ../../../../../../packages/engine/src/core/projection.ts    # isProjectable gate
  - ../../../../../../packages/engine/src/core/predicates.ts    # foldEdges dedup key
  - ../../../../../../packages/engine/src/core/types.ts         # Edge.validFrom/validTo
analyses: ./analyses/
---

# Q-S3scope — access_event (Этап2) vs time-on-edge (S3): одна claim или две?

## Вопрос · ставка
Этап-2 (D1.b, 2026-08-06) уже прогнал F6-фальсификацию хребта на форме `access_event` и получил
architect-вердикт "ПРИНЯТЬ по-слойно" (`06-fork2-f6.report.md`). DIRECTION §3 планирует S3 именно на
форме `time-on-edge`, как заявленной 2-й структурно разной форме для **Закона-2** (promotion-предикат,
G2). **Это одна и та же claim (тогда S3 может быть урезан/переиспользован) или две РАЗНЫЕ claims (тогда
S3 нужен целиком, и G2 всё ещё 🟥)?** Рычаг: честная оценка объёма S3 (~1-2 сессии) и того, что реально
значит "G2 частично закрыт".

## Кто/зачем сейчас
Ночной автономный прогон `2026-08-09-autonomous-question-closure`, итерация 1 (три независимых дешёвых
структурных вопроса, этот — с наибольшим рычагом на переоценку S3). Линза: `analyst` (вглубь кода +
артефактов), команда по плану — `system-architect` (+`analyst` при необходимости); в этой ноде вопрос
взят и закрыт `analyst` соло (доказательство файл:строка достаточно тугое, чтобы не требовать 2-й линзы
до критик-проверки — см. `analyses/01-s3scope.analysis.md` §Открытый под-вопрос про необходимость
дополнительного critic-check).

## Предварительный task-спек (для команды/критика)
- Прочитать `00-builder.report.md` (что именно access_event тестирует и НЕ тестирует), `06-fork2-f6.report.md`
  (architect verdict + explicit отказ строить time-on-edge как over-proof, ДО D3), `D3-f6-time-on-edge-
  falsification.analysis.md` (paper-falsification time-on-edge, найденная трещина), `task-pool.md` строки
  T-D1b-second-form-falsification / T-D1b-f6-accept-boundary / T-D1b-second-form-time-on-edge / T-prove-2nd-form.
  Сверить `projection.ts:42` (`isProjectable`) и `predicates.ts:1-11,113-124` (foldEdges dedup/cardinality
  purpose) — это код, через который реально прогнан access_event, и код, который D3 фальсифицирует на бумаге
  для time-on-edge.
- Ответить: одна форма или две (структурно, по осям: act-kind/предикат-разнообразие VS statefulness/interval-
  identity)? Закрывает ли access_event часть "≥2 форм" для G2 (в текущей формулировке DIRECTION §1, где Закон-2
  = анти-тавтология-тест ставки G2)? Рекомендация по объёму S3.
- См. полный разбор → `analyses/01-s3scope.analysis.md`.

## Статус
`review` — разбор готов (`analyses/01-s3scope.analysis.md`), доказательства якорены `file:line`. Ждёт
критик-check (DIRTY/CLEAN) по процессу MACHINERY §2(e) перед `resolved`; при подтверждении — обновить
`task-pool.md` (T-D1b-second-form-falsification / S3 README) и `RUN-INDEX.md`.
