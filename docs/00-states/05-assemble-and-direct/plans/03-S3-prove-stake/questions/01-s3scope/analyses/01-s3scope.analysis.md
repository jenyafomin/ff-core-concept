---
node_type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
agent: analyst
question: ../01-s3scope.question.md
inputs:
  - ../../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/00-builder.report.md
  - ../../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/06-fork2-f6.report.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md
  - ../../../../_shared/task-pool.md
related:
  - ../../../../../../../packages/engine/src/core/projection.ts
  - ../../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../../packages/engine/src/core/types.ts
---

# Q-S3scope — deep analysis: access_event vs time-on-edge

## 1. Что реально проверил Этап-2 на `access_event` (ground truth из builder-отчёта)

`00-builder.report.md:51-54` (F6 кандидат 1):
> "F6 кандидат 1 через РЕАЛЬНЫЙ `DurableFsStore`. `access_event` (новый кит), вложенный/массивный payload
> `{ resource:{…}, grants:[…] }`, non-rentacar предикат `granted-to` + `same-as`. Прогон через
> `DurableFsStore.writeAct` + shred + reboot. Assert: `test:104-111`. ⚠️ см. грань про проекцию ниже —
> assert идёт на write-model (`store.acts()`), не на projected node, т.к. `access_event` непроецируемый."

Критично — `00-builder.report.md:159-164` (лидовая грань, найдена ЧТЕНИЕМ кода):
> "F6 `access_event` НЕпроецируемый — assert ушёл на write-model, не read-model. Находка чтением
> `projection.ts:42` `isProjectable = actKind === 'domain_event' && source_ref`. Задание §3-Кандидат-1
> явно просило «новый actKind: `access_event`… честно второй кит», но такой акт НЕ сворачивается в
> projected node — `readNode` вернул бы `null`. Поэтому F6-assert идёт по `store.acts()` (журнал: edges
> целы + payload удалён), а не по узлу графа. Это доказывает **form-agnosticism erasure-seam НА ДИСКЕ**
> …, но НЕ прогоняет edge-fold/same-as-lock проекции на втором ките."

**Вывод №1 (факт, не интерпретация): `access_event` никогда не проходит через `foldEdges`/материализацию.**
`isProjectable` (`packages/engine/src/core/projection.ts:42`) гейтит на `actKind === 'domain_event'`;
`access_event` — другой `actKind`, поэтому весь фолд/проекционный механизм — именно тот механизм, где
живёт Закон-2/promotion-предикат и где D3 находит трещину — для `access_event` **не исполняется вообще**.

Вторая половина F6-Этап2 — предикат `linked-to` (`write-plane.test.ts:109-142`, упомянут в
`06-fork2-f6.report.md:54-57`) — ДЕЙСТВИТЕЛЬНО проходит через `foldEdges`, но:
- он in-memory (не через диск/`DurableFsStore`);
- он тестирует ТОЛЬКО ось "предикат внедряется через реестр-данные, а не хардкод" (кардинальность
  `one`/`many`, `predicates.ts:49,56-59`) — **никакой interval/state на самом ребре нет.**

## 2. Что должен проверить `time-on-edge` (ground truth из D3-анализа)

`D3-f6-time-on-edge-falsification.analysis.md:41-49`: `time-on-edge` — это факт **на ребре**
(`validFrom/validTo`, `types.ts:38-41`), интервал-как-состояние. Осевое различие с `access_event`/
`linked-to` — НЕ "другой act-kind" и НЕ "другой предикат", а **ребро несёт СОБСТВЕННОЕ эволюционирующее
состояние**, что прямо задевает §5 UNIT-SPEC (promotion-предикат/Закон-2: "растит идентичность+состояние
→ повышается до единицы").

`D3:58-70` находит крэш именно в материализации: `foldEdges` `many`-ветка дедупит по `(predicate,
target)` (`predicates.ts:113`); для интервального ребра это либо (a) схлопывает два непересекающихся
интервала в один (теряя историю), либо (b) при попытке расширить ключ идентичности до
`(predicate,target,validFrom,validTo)` — ломает СУЩЕСТВУЮЩУЮ семантику REPLACE-vs-ACCUMULATE
(`predicates.ts:1-11`), которую `foldEdges` был написан защищать (`D3:114-131`, конкретный контрпример:
исправление даты окончания стинта схлопывается в "новое" ребро вместо REPLACE того же).

**Вердикт D3 (`D3:105`): REQUIRES-SPECIAL-CASING** — трещина реальна и найдена НА БУМАГЕ, без кода; ни
`edgeId`, ни `supersedes`-маркер ещё не спроектированы (`D3:151-156`, явно оставлено нерешённым).

## 3. Одна форма или две? (прямой ответ)

**ДВЕ РАЗНЫЕ структурные формы, тестирующие ДВЕ РАЗНЫЕ claims, по двум разным осям:**

| | `access_event` (Этап2, F6 кандидат-1) | `linked-to` (Этап2, F6 Seam-B) | `time-on-edge` (S3 цель) |
|---|---|---|---|
| Ось различия | act-kind + вложенный payload | предикат-имя (не rentacar) | **состояние НА ребре (interval)** |
| Проходит через `foldEdges`? | **НЕТ** (`isProjectable=false`, `projection.ts:42`) | ДА, in-memory | ДА — и именно там ломается |
| Проверяет | erasure/envelope form-agnosticism на диске | реестр-инъекция кардинальности (Seam B) | edge-identity/dedup под stateful-формой = ядро Закона-2 |
| Задевает §5 promotion-предикат? | Нет (не проецируется → §5 неприменим) | Нет (ребро без состояния) | **Да — прямое назначение S3** |
| Задевает `foldEdges` REPLACE/ACCUMULATE-контракт? | Нет | Нет (простая кардинальность) | **Да — найденный контрпример** |

Формально: заявка F6/Этап2 ("хребет form-agnostic") и заявка S3/Закон-2 ("promotion-предикат работает
на stateful-ребре, не тавтологично") — **разные claims об одном и том же коде**, проверяющие разные
инварианты (§6 материализация/erasure vs §5 recursion+`foldEdges` dedup-контракт). `access_event`
структурно НЕ МОЖЕТ подставиться вместо `time-on-edge`, потому что он даже не доходит до кода, который
`time-on-edge` ломает.

## 4. Закрыл ли Этап-2 уже часть «≥2 форм» для G2?

Зависит от того, что именно считать claim G2. DIRECTION даёт два прочтения, и они **разошлись со
временем**:
- Широкое (исходная формулировка G2, `DIRECTION:23`): "Form-agnostic спине выжил на ≥2 СТРУКТУРНО разных
  формах" — по этому прочтению `access_event`+`linked-to` действительно закрывают ОДНУ грань (envelope+
  Seam-B generic-fold), что и зафиксировано `06-fork2-f6.report.md:108-119` как "F6 ПРИНЯТ по-слойно" —
  но статус в `task-pool.md:51,57` явно **🟡/decided-pending-owner**, не зелёный факт.
- Узкое, более позднее (`DIRECTION §1:43-44`, датировано ТЕМ ЖЕ 2026-08-08, что и D3): "Закон-2 ЕСТЬ
  анти-тавтология-тест ставки (G2), а не отложенное" — т.е. DIRECTION уже сама сузила боевую claim G2 до
  promotion-предиката конкретно. По ЭТОМУ прочтению (которое и наследует S3 README, `../README.md:24-30`:
  "закрывает G2 (хребет доказан на ≥2 СТРУКТУРНО разных формах)" в контексте "reify-to-unit stateful-
  рёбер") — `access_event` **НЕ закрывает НИЧЕГО**, потому что он никогда не касается §5/promotion.

**`DIRECTION:28` "G2 🟥 (доказан на 1 форме, 2-я нашла трещину)" уже написана ПОСЛЕ Этап-2 (оба документа
датированы 2026-08-08, в одной сессии-push) и НЕ засчитывает access_event как форму №2** — "1 форма" там
= исходный ga-rentacar/`domain_event` прогон (pre-critique baseline), "2-я, нашедшая трещину" = именно
`time-on-edge` (D3). Это подтверждает узкое прочтение как уже ДЕЙСТВУЮЩЕЕ в актуальном докете, а не
альтернативную гипотезу.

**Вывод: G2 (в смысле, который сейчас несёт S3) закрыт на 0 из 2 требуемых форм НАПРЯМУЮ через
promotion-предикат; но фальсификация 2-й формы (`time-on-edge`) уже НАЧАТА на бумаге D3-анализом и уже
нашла трещину — то есть S3 не стартует с нуля, а продолжает с уже известным диагнозом.**

## 5. Рекомендация по объёму S3

**(a) Отдельный S3-прогон НУЖЕН — не сокращается переиспользованием access_event.** Access_event
физически не проходит код, который S3 обязан фальсифицировать (`isProjectable` гейт, `projection.ts:42`).
Нет пути "переиспользовать" тест, который никогда не касается `foldEdges`.

**(b) Вторая форма для S3 = `time-on-edge`, как и запланировано (DIRECTION/README уже верны в этом).**
Ничего не нужно менять в выборе формы — вопрос только развеивает иллюзию, что access_event её уже закрыл.

**(c) Объём S3 можно СЖАТЬ по сравнению с "1-2 сессии с нуля" — D3 уже сделал бумажную анти-тавтология-
фазу.** README S3 (`../README.md:32-44`) описывает вход как "reify-to-unit stateful-рёбер → минимальная
фальсификация 2-й формой с ЧЕСТНЫМ анти-тавтология-тестом" + команду `builder`+`reviewer`+`critic`. D3
уже: (i) построил falsifiable tautology-test (`D3:90-101`, code-checkable: grep за value-comparison +
property-test схема); (ii) нашёл конкретный контрпример, ломающий очевидный "первый" фикс (widen dedup
key) — экономит команде S3 целый цикл "предложили → критик нашёл дыру". S3 может стартовать сразу с
диагноза "простое расширение dedup-ключа не работает" и сфокусироваться на **втором** классе решения —
явный `edgeId`/`supersedes`-маркер (`D3:152-156`, explicitно НЕ оценено D3) — вместо повторного прохода
через уже опровергнутый вариант.

**(d) Не путать closure двух РАЗНЫХ owner-forков.** `T-D1b-f6-accept-boundary` (owner: принять ли
"по-слойно" границу F6/Этап2) — самостоятельный форк, НЕ гейтит и НЕ гейтится S3/time-on-edge; их можно
закрывать независимо (Q-F6confirm, итерация 4 очереди, уже это учитывает через `Зависимости: пересекается
с Q-S3scope` — эта нода подтверждает, что зависимость ОДНОСТОРОННЯЯ: F6-подтверждение может ссылаться на
итог этого вопроса, но НЕ наоборот).

## 6. Открытый под-вопрос

**Какой именно фикс-класс выбрать для S3** — стабильный `edgeId` на `Edge`-форме (расширение frozen-shape,
`types.ts:32-42`) или act-уровневый `supersedes`/correction-маркер? D3 explicitly не оценивает (`D3:152-
156`). Это НЕ ценностный owner-форк (инженерный выбор конструкции), но требует своей волны (architect+critic)
внутри S3, не решается этим вопросом. → в `task-pool.md` рядом с `T-prove-2nd-form`.

Второй, более мелкий под-вопрос: нужен ли отдельный critic-check ПЕРЕД тем, как этот разбор станет
`resolved` (MACHINERY §2e) — доказательная база тугая (все claims заякорены `file:line` из ДВУХ независимых
источников, builder-отчёт Этап2 и D3-анализ, которые сами уже прошли через critic/adversarial-пассы
внутри своих прогонов: `02-critic-adversarial.report.md` для Этап2, "Critic-corrections" секция внутри
самого D3). Рекомендация: 1 лёгкий critic-на-смугл (не полный адверсариал заново, MACHINERY §3 "не
дублировать адверсариал, если вопрос уже прошёл ≥2 линзы выше по потоку" — здесь обе половины (access_event
И time-on-edge) уже прошли critic выше по потоку).

## 7. Верификация якорей (file:line, вербатим)

- `packages/engine/src/core/projection.ts:42` — `isProjectable` gate (act-kind must be `domain_event`).
- `packages/engine/src/core/predicates.ts:1-11` — заявленная цель `foldEdges` (различать correction vs
  new fact), `predicates.ts:49,56-59` — `LOCKED_MANY_PREDICATES`/дефолт-кардинальность, `predicates.ts:113`
  — `many`-ветка dedup ключ `(predicate,target)`.
- `packages/engine/src/core/types.ts:32-42` — `Edge` frozen shape, `:38-41` `validFrom/validTo` RESERVED.
- `docs/_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/00-builder.report.md:51-54,159-168`
- `docs/_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/06-fork2-f6.report.md:20-24,50-68,108-119`
- `docs/_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md:41-49,58-70,105,114-131,151-156`
- `docs/_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md:23,28,43-44,76-78`
- `docs/00-states/05-assemble-and-direct/_shared/task-pool.md:51,57,58,70`
