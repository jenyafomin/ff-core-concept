---
node_type: question
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
plan: ../README.md
title: "Q-F6confirm — дожать F6-рекомендацию (form-agnosticism sufficiency + edge-identity direction) до ratification-ready owner-confirm"
run: ../../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
source_queue: ../../../../../_log/2026-08-09-autonomous-question-closure/planning/QUEUE-questions.plan.md
depends_on: ../01-s3scope/01-s3scope.question.md   # ОДНОСТОРОННЯЯ: этот вопрос ссылается на итог s3scope, не наоборот (s3scope §5(d))
related:
  - ../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md   # reify/opaque-key/concede — линза edge-identity
  - ../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/06-fork2-f6.report.md   # "ПРИНЯТ по-слойно" граница (D1.b), :108-119
  - ../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md   # трещина time-on-edge, fix-class не оценён :151-156
  - ../01-s3scope/analyses/01-s3scope.analysis.md   # §5(d) F6-форк односторонний · §6 open fix-class edgeId vs supersedes
  - ../../../01-S1-ratify-two-laws/work/two-laws.invariant-candidate.md   # U-L1 Instance 2 (opaque edge-identity, F6-линза) :50-55,87-89
  - ../../../../_shared/task-pool.md   # T-D1b-f6-accept-boundary :57 · T-D1b-second-form-falsification :51 · T-prove-2nd-form
  - ../../../../../../packages/engine/src/core/predicates.ts   # foldEdges dedup key :113, value-blind契約 :1-11
  - ../../../../../../packages/engine/src/core/types.ts        # Edge frozen shape :32-42, validFrom/validTo reserved :38-41
synthesis: ./synthesis/
---

# Q-F6confirm — F6 до ratification-ready (per-facet owner-confirm)

## Вопрос · ставка
F6 = «form-agnosticism sufficiency» — самая важная НОВАЯ грань переписи D1.b, прямо = анти-тавтология-тест
Закона-2/G2 (доказать, что хребет form-agnostic на ≥2 структурно разных формах). Рекомендация уже
СУЩЕСТВУЕТ (два дома: `06-fork2-f6.report.md:108-119` — граница «по-слойно»; `F6-edge-identity-design.design.md`
— направление reify/opaque-key/concede). **Задача НЕ переоткрывать, а КРИСТАЛЛИЗОВАТЬ существующее в одну
строку на грань + пометить owner-confirm** (per-facet, provisional до фальсификации S3, где применимо).
Ставка: снять с владельца работу интерпретации двух отчётов — «прочитал одну строку, сказал да».

## Кто/зачем сейчас
Ночной автономный прогон `2026-08-09-autonomous-question-closure`, итерация 4 (после Q-S3scope/итер.1 —
`depends_on` односторонняя). Линза: `system-architect` (границы/кристаллизация) + `critic` (smuggle-gate).
Компрессия, НЕ новое решение — оба источника уже прошли critic выше по потоку
(`06-fork2-f6.report.md` внутри Этап-2 адверсариала; `F6-edge-identity-design` внутри push-critique).

## Ключевой архитектурный ход — F6 расщепляется на ДВЕ owner-confirm грани
Источники и QUEUE-карточка слегка СЛИВАЮТ два разных вопроса под именем «F6». Разрез (моя линза):

| грань | что решает | статус | provisional до S3? | дом-рекомендации |
|---|---|---|---|---|
| **A · sufficiency-boundary** | сколько ДОКАЗАТЕЛЬСТВА достаточно (второй кит vs «по-слойно») | decided-pending-owner | **НЕТ** — независим от S3 (`01-s3scope.analysis.md §5(d)`) | `06-fork2-f6.report.md:108-119`; `task-pool.md:57` |
| **B · edge-identity direction** | ФОРМА stateful-ребра (reify vs opaque-key vs concede) | provisional | **ДА** — первая фальсификация = time-on-edge (S3) | `F6-edge-identity-design.design.md:167-199` |

**Почему это важно:** подтверждение грани A НЕ ратифицирует направление B и наоборот — их надо подавать
владельцу РАЗДЕЛЬНО, иначе «да» на достаточность доказательства тихо протащит выбор формы ребра (smuggle).

## Предварительный task-спек (для критика)
- Проверить, что обе строки-рекомендации (см. `synthesis/01-f6confirm.synthesis.md`) — ЛИНЗЫ, не вердикты:
  ни одна не пишет «да» за владельца; условие грани A («сузить F6 до form-agnostic по-слойно») названо явно.
- Проверить smuggle: не превращает ли расщепление A/B тихо грань A в «уже принято» (она decided-**pending**-owner).
- Проверить связь с S3 fix-class: согласуется ли reify-first (B) с open sub-question `01-s3scope §6`
  (edgeId vs supersedes) — и что зависимость ОДНОСТОРОННЯЯ.

## Статус
`review` — кристаллизация готова (`synthesis/01-f6confirm.synthesis.md`), якоря `file:line`. Ждёт лёгкий
critic-на-смугл (MACHINERY §2e/§3 — не полный адверсариал, оба источника прошли critic выше по потоку)
перед `resolved`. При CLEAN → карточки в `OWNER-QUEUE.md` (две грани отдельно), обновить `task-pool.md:57`
(T-D1b-f6-accept-boundary) и `RUN-INDEX.md`. Ответ владельца НЕ подменяем — это owner-confirm форк.
