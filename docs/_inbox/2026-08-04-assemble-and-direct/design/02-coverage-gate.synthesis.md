---
node_type: synthesis
title: "Coverage-gate: ценности + проекции сессии × ветки D0..DV — орган переписи ширины"
status: draft
topic: assemble-and-direct
owner: jenya.stasik@gmail.com
date: 2026-08-05
scope: project
related:
  - ./01-execution-plan.synthesis.md
  - ../../2026-08-04-picture-coverage/analyses/00-COVERAGE-MAP.synthesis.md
  - ../../2026-08-04-picture-coverage/analyses/02-values-lenses-acts-frame.analysis.md
  - ../../2026-08-04-picture-coverage/analyses/coverage/03-readability-identity.coverage.md
  - ../../2026-08-04-picture-coverage/analyses/coverage/04-trust-vitality.coverage.md
  - ../../2026-08-04-picture-coverage/analyses/coverage/05-sovereignty-relationality-consent.coverage.md
  - ./council/drill-recall-design.md
  - ./council/depth-fable-deepest.md
  - ../../../02-project/core/01-brain/INDEX.md
source:
  - packages/ingest-rentacar/src/lens/customer-lens.ts
  - packages/engine/src/core/predicates.ts
  - packages/engine/src/core/erasure.ts
  - packages/engine/src/adapters/store-durable-fs.ts
  - packages/rental-balance/src/agent/balance-observer.ts
  - packages/engine/src/core/resolve.ts
  - tools/lint/doc-tree.mjs
---

# Coverage-gate: ценности×проекции × ветки плана

> Не вторая карта покрытия. `00-COVERAGE-MAP.synthesis.md` (2026-08-04) уже посчитала 42 грани × линзы ×
> акты — эти числа НЕ пересчитаны здесь. Этот файл — **другая ось той же переписи**: для каждой грани +
> сквозной проекции проверяет, есть ли у неё **дом среди веток D0..DV** (`01-execution-plan.synthesis.md`
> §3). Пустая клетка — не «дыра в коде» (это уже посчитано соседями), а **дыра в ПЛАНЕ**: грань реальна,
> дыра известна, но ни одна ветка её не собирается закрывать.

## Как читать матрицу
1. **Строки** = 7 корневых ценностей (агрегат facet-приоритетов из coverage-волны 2, без пересчёта) +
   7 проекций-строк `Q1..Q7`, поднятых советом `assemble-and-direct` (2026-08-05).
   ⚠️ **Из Q1..Q7 действительно НОВЫЕ (нет в 42-гранном реестре): только Q1 recall, Q2 erasure-cascade,
   Q7 failure-contract.** Остальные — переоткрытие уже посчитанных граней, приведены к их id из
   `00-COVERAGE-MAP`: **Q4 actor-identity = #14** (Ц3/01 provenance, Priority 21.3) · **Q5 referent-consent
   = #15** (Ц7/01 referent, 21.3) · **Q6 conflict-reconcile = #16** (Ц2/05 короференция-конфликт, 20) ·
   `consent-taint` (в CG-05) **= #7** (Ц7/04, Priority 30). Q3 selection граничит с `#Ц4/01 salience-weight`
   — граница не проведена (флаг). Не заводить дубль-работу над уже посчитанными гранями.
2. **Столбцы** = 7 веток `01-execution-plan.synthesis.md` §3 (`D1` держит фазы a/b/c одной колонкой,
   расхождение по фазе — в примечании к клетке).
3. **Символ клетки:** `✅` закрыта (право-точка ветки доводит грань ≥ green-unit) · `◐` частично · `⬜`
   соседняя/промах (ветка касается ЭТОЙ области кода, но не этой грани — самый опасный класс, повторяет
   ложный `cost-tree`) · `–` ветка вне домена грани. (Приоритеты задач ниже — бакеты P0..P3 из формулы
   `00-COVERAGE-MAP`; ряды-проекции намеренно названы `Q`, чтобы НЕ путать с бакетами P.)

## Матрица

| # | Строка | D0 | D1 | D2 | D3 | D4 | D5 | DV | Вердикт |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| Ц1 | Читаемость (passport/temperature/…) | – | ⬜ | ⬜ | – | – | – | – | **UNCLAIMED**, весь корень |
| Ц2 | Тождество (dedup/варианты/конфликт) | – | ◐(a: same-as traversed, M3-wiring частично) | – | – | – | – | – | PARTIAL — 1/6 граней, P1-грань 03 нет |
| Ц3 | Доверие (provenance/data-honesty/…) | – | ⬜(a не задевает) | ◐(canon-honesty relabel, не механизм) | – | – | – | – | PARTIAL — только доку-честность |
| Ц4 | Витальность (decay/forgetting/…) | – | – | ◐(cost-tree-relabel) | – | – | – | ⬜(имя совпадает, предмет другой — CG-11) | **MISLABELED-PARTIAL** |
| Ц5 | Суверенность (policy/capability/…) | – | ◐(a: resolve()/capability переиспользован) | – | – | – | – | – | PARTIAL — 2/6 косвенно |
| Ц6 | Реляционность (edge/cascade/variants) | – | ⬜(a: same-as трогает ребро, не грань) | – | – | – | – | – | **UNCLAIMED**, весь корень |
| Ц7 | Согласие (referent/consent-taint/…) | – | ◐(b: erasure-by-ref усиливает revocation-erasure) | – | – | – | – | – | PARTIAL — инфра эрейжа да |
| Q1 | recall/read-plane (payload-plane PEP) 🆕 | – | ◐(b: `PayloadReadPort`+RT-precond спроектирован, код=0) | – | – | – | – | ⬜(SELECTION-долг устно «в DV») | Лучшая строка сессии — designed, код 0 |
| Q2 | erasure-cascade (cascade-on-delete×erasure) 🆕 | – | ⬜(b: erasure-by-ref едет БЕЗ спецификации рёбер) | – | – | – | – | – | **UNCLAIMED / мина** |
| Q3 | selection/relevance (recall-индекс; граничит с Ц4/01) | – | ◐(b: явное «full-scan сейчас, долг в DV») | – | – | – | – | ⬜(долг устный) | PARTIAL-НО-НЕ-ЗАВЕДЕНО |
| Q4 | actor-identity =#14 provenance (P2, 21.3) | – | ⬜(a: F-3 stamps `domain`=писатель) | ⬜(соседне к canon-honesty) | – | – | – | – | UNCLAIMED (уже посчитан #14) |
| Q5 | referent-consent =#15 referent (P2, 21.3) | – | – | – | – | – | – | – | **FULLY UNCLAIMED** — фундамент Ц7 |
| Q6 | conflict-reconcile =#16 (P2, 20) | – | ⬜(a: latest-wins та же файл-семья, видимости нет) | – | – | – | – | – | UNCLAIMED (уже посчитан #16) |
| Q7 | failure-contract (refused/tampered/shredded; R5) 🆕 | ⬜(stale-active check — контракт карточек) | ◐(b: `PayloadResult` designed) / ⬜(c: R5 «standing risk until DV») | – | – | – | – | – | PARTIAL + честно-открытый риск |

**Итог по строкам:** 0/14 `✅` (фаза DESIGN). Полностью/почти unclaimed: Ц1, Ц6, Q5, Q6 — из них Q5
(`referent-consent`, =#15) самая тяжёлая: держит весь корень Ц7. Ложное срабатывание по имени (класс
`cost-tree`): Ц4/DV и Q1·Q3/DV.

## Задачи, посеянные пустыми/ложными клетками

| id | приоритет | клетка | одной фразой | дом-ветка-куда |
|---|---|---|---|---|
| CG-03 | **P1** (40, top facet-gap бокса после KQ-4) | Ц3×D1/D2 | `data-honesty` (тихая ложь единиц/валют) не в плане ВООБЩЕ | D1.a (envelope-validator) или D2 |
| CG-05 | **P1** (=#7, 30) | Ц7×D1 | `consent-taint` (обход `resolve()` через агрегат/линзу) не заведён; D1.a/b уже строят PEP-door | D1.a/b — 3-е расширение PEP (node→payload→lens) |
| CG-02 | **P1** (32) | Ц2×D1 | dedup shipped без предохранителя от поедания намеренных вариантов — живой риск | D1.a — та же файл-семья (`predicates.ts`) |
| CG-06 | **P1** (=#15, блокирует 5 граней Ц7) | Ц7/Q5 | `referent` (referent≠owner≠author) не начат нигде — фундамент consent/revocation | design-precondition в D1.b, до CG-05 |
| CG-09 | P2 (=#14, ≈21) | Q4 | `actor-identity` — «кто ручается СЕЙЧАС» ≠ «кто писал» | D2 (canon/trust-honesty) |
| CG-10 | P2 (=#16, 20) | Q6×D1 | `conflict-reconcile` — `latest-wins` прячет конфликт, а не показывает 3-й стороне | D1.a — follow-on к CG-02 |
| CG-04 | P2 (root целиком unclaimed) | Ц6×— | Весь корень Реляционность без дома | нет естественного дома → кандидат owner-fork (флаг) |
| CG-01 | P2/P3 (root целиком unclaimed) | Ц1×— | Весь корень Читаемость без дома | как CG-04 — флаг |
| CG-07 | **P1** (риск R1/R2 плана: мина на первом erasure) | Q2×D1 | `erasure-cascade` — D1.b учит эрейж-by-ref, но не специфицирует поведение рёбер на удалённый узел | D1.b (сосед `erasure.ts`) или FORK-2 |
| CG-08 | P2 (process-honesty) | Q1/Q3×DV | `selection/relevance`-долг устно «в DV», DV-карточка его не называет — риск «второй cost-tree» | D0/DV — назвать долг явной строкой |
| CG-11 | **P1** (класс canon-inflation) | Ц4×DV | `DV`=«drift-детектор процесса» ≠ «6 механизмов Витальности графа»; одно имя, разный предмет | D0 — расщепить DV-process vs DV-graph до Wave 3 |
| CG-12 | **P1** (D1.c рассчитывает на него) | D0×D0 | код-проверено: `tools/lint/doc-tree.mjs` пишет `docs/_generated/doc-tree.view.md` (вид дерева), НЕ карточку-пульт схемы D0 | D0 — расширить `doc-tree.mjs`/отдельный генератор, до D1.c |
| CG-13 | **P1** (гейт-прозой = то, что чиним) | R-b | сам census-gate сегодня проза, без generator-check (нарушает «no prose-only gate» плана §43-45) | D0 — generator-check R-b по карточкам |
| CG-14 | **P1** (D1.b precond 3 доказывает пустоту) | Ц2×D1.b | `same-as` залочен в `many` (predicates.ts:49,57) → `assertForwardMonotone` (:78) для него ТАВТОЛОГИЧЕСКИ чист; «fired clean on replay» не доказывает R1 | D1.b — заменить precond 3 на ассёрт реальной кардинальности same-as-группы |

## Как это гейтит строй (правило R-b)

> **R-b — census-gates-build, ПОВЕТОЧНО.** Ветка не переходит в «строй», пока для СУЩНОСТИ ЭТОЙ ВЕТКИ
> матрица держит P0/P1-строку в `⬜`/`UNCLAIMED` без одного из трёх: (a) задачи, **принятой карточкой
> ветки-дома** (не просто упомянутой здесь); (b) промоции в owner-fork (§6 `01-execution-plan`); (c) явной
> датированной пометки «отложено, риск принят владельцем». **Гейт поветочный, не глобальный** — эта
> матрица кросс-веточная и потому СЕЕТ backlog + advisory, а связывает вход в строй именно per-branch
> перепись (иначе D4/D2/D5-prep из Wave 1, безусловные к матрице, были бы ложно заблокированы).
>
> Статус на 2026-08-05: все CG-* **посеяны как задачи** (таблица выше, с домами-ветками), но ещё **НЕ
> поглощены карточками веток** → критерий (a) формально не закрыт. Сам этот гейт пока проза — его
> машинизация = задача **CG-13** (generator-check в D0, симметрично KILL-SHOT 2 плана §43-45).

## Границы

- **Снимок, не живой дашборд.** Верно на 2026-08-05; при новых ветках/фактах — перегенерировать (law 8).
- **V/G/R/C/Rdy 7 корневых строк унаследованы без пересчёта** из `coverage/03,04,05-*.md` (сами помечены
  как нератифицированные). Q4/Q5/Q6 несут числовой Priority своих исходных id (#14/#15/#16); Q1/Q2/Q7 —
  качественные (новые, вне 42-гранного реестра).
- **Не открыты** `07-suspect-paths-review`, `08-homing-and-linking-plan`, `09-fable-verdict`,
  `10-conflict-pair-registry`, `wave1/*`, `wave2-critique.md` полностью — возможны ещё проекции; вторая
  проверка нужна прежде чем R-b станет обязательным гейтом.
- **Код вне `engine/src/core`, `ingest-rentacar/src`, `rental-balance/src`** не перепроверён — наследуемое
  слепое пятно исходных coverage-файлов.
