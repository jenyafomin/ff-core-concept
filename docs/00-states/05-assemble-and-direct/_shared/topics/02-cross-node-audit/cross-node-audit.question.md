---
node_type: question
title: "Cross-node audit — сквозная перепись слабых звеньев прогона autonomous-question-closure (2026-08-09)"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
kind: knowledge-candidate
lens: critic (адверсариал, ПОПЕРЁК всех 8 нод)
serves: ../../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
sources:
  - ../../../../../_log/2026-08-09-autonomous-question-closure/RUN-INDEX.md
  - ../../../plans/01-S1-ratify-two-laws/work/two-laws.invariant-candidate.md
  - ../../../plans/01-S1-ratify-two-laws/questions/01-adr-home-erasure-port/
  - ../../../plans/01-S1-ratify-two-laws/questions/02-r4classes/
  - ../../../plans/01-S1-ratify-two-laws/questions/03-l1dom-home/
  - ../../../plans/03-S3-prove-stake/questions/01-s3scope/
  - ../../../plans/03-S3-prove-stake/questions/02-f6confirm/
  - ../../../plans/03-S3-prove-stake/questions/03-l2op/
  - ../../../plans/03-S3-prove-stake/questions/03-s3fixclass/
  - ../../../plans/03-S3-prove-stake/README.md
  - ../../../plans/04-S4plus-breadth/questions/01-critical-faces/
  - ../../task-pool.md
  - ../../OWNER-QUEUE.md
---

# Cross-node audit — вопрос

**Ставка.** 8 growth-nodes этой ночи каждая прошла ≥1 локальный критик-проход (в основном CLEAN/DIRTY-
исправлено). Ни один из них не смотрел ПОПЕРЁК: не проверял, держит ли ОБЩИЙ якорь (`two-laws.invariant-
candidate.md`) всё, что на него ссылается; не проверял, не готовит ли одна нода вход, который тихо не читает
следующая (README staleness); не суммировал ЧИСЛО инженерных предусловий, которые ночь незаметно навесила на
одну ещё не начатую сессию (S3).

**Кто/зачем сейчас.** Автономный ночной critic-прогон (владелец спит). Задача — найти то, что 8 отдельных
критиков структурно не могли увидеть поодиночке (каждый видел одну ноду), классифицировать по серьёзности,
заякорить `file:line`, НЕ чинить самому (только рекомендовать: verify-задача / owner-вопрос / переоткрыть ноду).

**Полный разбор:** `./analyses/01-cross-node-audit.critic.md`.

## Что НЕ входит в этот артефакт
- Не переоценивает вердикты внутри самих 8 нод (те уже прошли свой критик-проход) — только их СТЫКИ.
- Не пишет код, не коммитит, не правит task-pool/RUN-INDEX/OWNER-QUEUE (это бухгалтерия лида) — только
  рекомендует правки этим файлам с точным якорем.
- Не второй критик-check L2op/S3fixclass/l1dom/adr-home по существу — те уже CLEAN/DIRTY-исправлены
  внутри-нодово, доверяю их построчной проверке (сам перепроверил выборочно, расхождений не нашёл).
</content>
