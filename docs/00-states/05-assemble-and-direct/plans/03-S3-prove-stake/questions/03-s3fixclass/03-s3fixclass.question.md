---
node_type: question
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
plan: ../README.md
title: "Q-S3fixclass — fix-class для time-on-edge S3-дефект: stable `edgeId` vs `supersedes`-маркер"
run: ../../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
source_queue: ../../../../../_log/2026-08-09-autonomous-question-closure/planning/QUEUE-questions.plan.md
spawned_from: ../01-s3scope/01-s3scope.question.md   # открытый под-вопрос §6, D3 не оценивает
related:
  - ../01-s3scope/analyses/01-s3scope.analysis.md   # §6 открытый под-вопрос fix-class
  - ../02-f6confirm/synthesis/01-f6confirm.synthesis.md   # Грань B(b) reify-first vs opaque-edgeId fallback
  - ../02-f6confirm/02-f6confirm.question.md
  - ../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md   # counter-example, widen-dedup-key falsified, :151-156 fix-class не оценён
  - ../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md   # Option A/B/C + reification lens, где уже лежит бОльшая часть механики
  - ../../../01-S1-ratify-two-laws/work/two-laws.invariant-candidate.md   # U-L1 Instance 2 (opaque edge-identity, retrofit-impossible форма)
  - ../../../../_shared/task-pool.md   # T-prove-2nd-form, Q-S3fixclass строка :385
  - ../../../../../../packages/engine/src/core/predicates.ts   # foldEdges :1-11 (контракт), :98-118 (dedup), LOCKED_MANY_PREDICATES :49-59
  - ../../../../../../packages/engine/src/core/types.ts        # Edge frozen shape :26-41, validFrom/validTo RESERVED
  - ../../../../../../packages/engine/src/adapters/store-durable-fs.ts   # C1/C2/C5 write-path (single-writer lock, replay-determinism)
analyses: ./analyses/
---

# Q-S3fixclass — какой fix-class закрывает time-on-edge REPLACE/ACCUMULATE-дефект

## Вопрос · ставка
`D3-f6-time-on-edge-falsification.analysis.md` фальсифицировал наивный фикс «расширить dedup-ключ
`foldEdges` до `(predicate,target,validFrom,validTo)`» — конкретным контрпримером (коррекция даты стинта
схлопывается в ACCUMULATE вместо REPLACE, `predicates.ts:113-114` против `D3:114-131`). D3 explicitly
оставил ВЫБОР фикс-класса неоценённым (`D3:151-156`). `01-s3scope.analysis.md §6` подняло это как открытый
под-вопрос для S3. `F6-edge-identity-design.design.md` УЖЕ построил Option A (`edgeId`)/B (registry-key)/
C (strategy) + reification-lens на бумаге — эта нода НЕ переоткрывает тот разбор, а **дожимает его до
прямого ответа на два конкретных кандидата, названных в задаче S3fixclass** (`edgeId` vs `supersedes`),
раскладывает их относительно opaque edge-identity заморозки (U-L1 Instance 2) и F6-грани B(b) (reify-
default), и даёт гипотезу + то, что S3 dry-run обязан прогнать. Рычаг: S3 не стартует с чистого листа —
знает, какой фикс-класс тестировать первым.

## Предварительный task-спек
- Прочитать `F6-edge-identity-design.design.md` целиком (Option A механика/cost/falsifiable-test, Option B
  salvageable-core, reification cross-check §5) — бОльшая часть инженерного разбора там уже есть; эта нода
  СЖИМАЕТ её под прямой вопрос "edgeId vs supersedes" + добавляет: (a) явную проверку "supersedes БЕЗ
  edgeId работает?", (b) явную сверку с U-L1 Instance 2 (retrofit-impossible форма), (c) явную сверку с
  F6-B(b) (reify-first сужает поле до fallback-класса).
  Оба (b),(c) уже частично закрыты `01-f6confirm.synthesis.md §Связь с S3 fix-class` — не дублировать,
  ссылаться.
- Код: `predicates.ts:1-11` (контракт correction-vs-new), `:98-118` (`foldEdges`, dedup-ключ `many`-ветки
  `:113`), `types.ts:26-41` (`Edge` frozen shape, `validFrom/validTo` RESERVED).
- Ответить: что каждый fix-class чинит/ломает; совместимы ли (соперники или слои); что открывает reify-
  first F6-B(b) для их роли (fallback-only vs первичный); гипотеза-рекомендация (НЕ финал); что S3 dry-run
  обязан прогнать (falsifiable test).

## Статус
`review` — разбор готов (`analyses/01-s3fixclass.analysis.md`), якоря `file:line`. Ждёт critic-check
(DIRTY/CLEAN, MACHINERY §2e) перед `resolved`. При CLEAN → обновить `task-pool.md` (строка Q-S3fixclass
:385, T-prove-2nd-form :351/:70) и `RUN-INDEX.md`; вопрос сам НЕ гейтит S3-старт (S3 может стартовать
с этим разбором как готовым диагнозом, не блокером).
