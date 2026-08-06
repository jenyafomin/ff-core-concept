---
node_type: analysis
title: "Harvest gate (Волна 4) — co-pilot verification of И1..И4 findings+verdicts + consolidated patch plan"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-05
scope: project
related:
  - ./00-coorch-framing.md
  - ./01-cg11-dv-split.finding.md
  - ./01-cg11.verdict.md
  - ./02-cg12-d0-generator.finding.md
  - ./02-cg12.verdict.md
  - ./03-cg13-census-gate.finding.md
  - ./03-cg13.verdict.md
  - ./04-sameas-guard.finding.md
  - ./04-sameas-guard.verdict.md
  - ../01-execution-plan.synthesis.md
  - ../02-coverage-gate.synthesis.md
  - ../../../../00-states/05-assemble-and-direct/_shared/task-pool.md
source:
  - packages/engine/src/adapters/store-durable-fs.ts
  - packages/engine/src/core/predicates.ts
  - packages/engine/src/core/projection.ts
  - packages/engine/src/core/erasure.ts
  - tools/lint/doc-tree.mjs
---

# Harvest gate (Волна 4) — co-pilot read, третий адверсариал где нужно

> Роль: гейт, не автор. Читал findings+verdicts вместо лида, проверил КАЖДУЮ обязательную правку критика
> реально применённой (не декларативно), сам перечитал код там, где это входило в задачу (И4). Не патчил
> файлы на диск (нет «строй») — ниже точный план для лида.

## 1. Gate-лог: обязательные правки критика — применены или нет

### И1 · CG-11 (DV-расщепление)
Verdict: REVISE, 2 обязательные правки.
1. Хедж «distinct vs precursor» ВНУТРИ текста патча (не только в §E risks) — **ПРИМЕНЕНО**. Патчи 2/4/6
   finding-файла содержат явную фразу «Working reading (not settled fact)» / «reading not settled» инлайн.
2. Переименовать `V-graph` → `DV-graph` везде (патчи 1/2/4/9) — **ПРИМЕНЕНО**. Finding §B прямо документирует
   инцидент и везде далее использует канон `DV-graph` (совпадает с `task-pool.md:169`).
**Вывод: обе обязательные правки СЕЛИ.** ACCEPT.

### И2 · CG-12 (D0-генератор)
Verdict: REVISE (minor), 1 обязательная правка.
1. Перенести schema-mismatch caveat из §E (риск-сноска) в §C (тело патча, которое реально уедет в план) —
   **ПРИМЕНЕНО**. Finding §C содержит прямой текст: «schema ... is UNVALIDATED ... must be RE-DERIVED from
   the actual proven-pattern card ... no `gate`, no `value-checkpoint`, no `home` field exists there. The
   task is not "wire up doc-tree.mjs to the `:117` schema"; it is "derive the pult schema from real cards,
   THEN wire up doc-tree.mjs"».
**Вывод: правка СЕЛА.** ACCEPT.

### И3 · CG-13 (census-gate механизация)
Verdict: REVISE (mandatory), 2 обязательные + 1 minor.
1. §E4 переписать: CG-13 УЖЕ поглощена сегодня (не «нужно решить на харвесте») — **ПРИМЕНЕНО**. Finding §E,
   пункт 4: «Циркулярность — проверено, НЕ падает на себе сейчас» + прямая цитата substring-доказательства.
2. Добавить task-line для CI/pre-commit wiring (не оставлять риск-абзацем) — **ПРИМЕНЕНО**. Finding §C
   содержит полноценный второй блок `T-census-check-ci` (owner-slot, sizing, acceptance).
3. Minor: поправить диапазон цитаты `:95-106`→`:97-106` — **НЕ ПРИМЕНЕНО** (§A всё ещё цитирует `:95-106`).
   Verdict сам пометил это non-blocking («Minor... the quoted text is accurate either way») — не требую
   повторной правки, фиксирую для лида как известный мелкий недочёт (см. §4 патч-план, one-line fix).
**Вывод: обе MANDATORY правки сели, 1 minor не применена, но она сама некритична и признана таковой
критиком.** ACCEPT (с косметическим one-liner в консолидированном патче).

### И4 · T-sameas-guard / CG-14 — особая пере-скептичность (по заданию)
Verdict: REVISE (mandatory, blocked harvest as drafted), 3 обязательные правки — самый тяжёлый раунд (round 2,
критик поймал ВТОРОЙ тавтологию: v1 сравнивала два in-memory `project()`-снимка, что структурно не может
упасть, см. finding §C-header «REVISED (критик, раунд 2)»).
1. Анкорить precond 3 на реальный `StoreDurableFs` disk round-trip (не in-memory `project()`) — **ПРИМЕНЕНО**.
   Finding §C, шаг 2, явно требует `S1.close()` → новый инстанс `DurableFsStore` → `hydrateFromDisk()`; §D
   патч прямо запрещает «must NOT compare two in-memory project() calls».
2. Определить «live» точно (`tombstone !== 'archived'`, `projection.ts:49,98`) — **ПРИМЕНЕНО**. Finding §F.2
   и §D содержат точную формулу с якорями.
3. Явно DEFER выбор группировки (direct/transitive) до первого реального disk-round-trip наблюдения —
   **ПРИМЕНЕНО**. Finding §C, последний абзац + §F.1.
**Вывод: все 3 обязательные правки сели.**

**Моя независимая перепроверка кода (не повтор критика — свежее чтение):**
- `store-durable-fs.ts:64-194` прочитан целиком. Подтверждено: конструктор (`:79-94`) вызывает
  `hydrateFromDisk()` (`:90`) на КАЖДОМ новом инстансе; `hydrateFromDisk` (`:139-156`) читает
  `journal.jsonl` построчно (`:146-153`), `JSON.parse`, при провале — `break` (`:151-152`, C3) — якорь
  точный, дословно совпадает с finding/verdict.
- `predicates.ts:98-119` (`foldEdges`) — единственная точка удаления ребра во всём файле — `splice` (`:108`),
  гейтится веткой `cardinalityOf(...) === 'one'` (`:105`), структурно недостижимой для `same-as` (та же
  блокировка §A). Подтверждено.
- `projection.ts:76-123` (`foldInto`) — тombstone (`:98`) НЕ трогает `edges` (`:115` всегда вызывает
  `foldEdges` независимо от `archived`). Подтверждено.
- `erasure.ts:25-34` — `edges` в `IMMUTABLE_ACT_META`. Подтверждено.
- **Реальная достижимость сценария в D1.b:** `store-durable-fs.ts:1-10` (шапка модуля) прямо говорит, что
  DurableFsStore существует ИМЕННО потому, что «каждый ход = свежий процесс» (motivating comment) —
  значит boot-цикл S1→close→S2-new-instance НЕ синтетический тестовый трюк, а буквально ШТАТНЫЙ путь
  каждого хода после D1.b. Проверка не «искусственная», она гоняет ровно то, что будет происходить в
  проде на каждом ходу.
- **Нюанс, который ни finding, ни verdict явно не проговорили (моя добавка):** «схлопывание группы» через
  C3-torn-line технически ограничено тем, что `writeAct` (`:168-180`) делает `writeSync`+`fsyncSync`+
  `closeSync` СИНХРОННО и возвращает `act` вызывающему только ПОСЛЕ этого — то есть строка, уже попавшая в
  снимок «ДО» через `S1.load()`, к моменту снятия снимка уже прошла через `fsyncSync` и физически не может
  сама оказаться «оборванной» этим же путём. Реальный канал потери ИМЕННО ранее-видимого ребра — не
  «torn last line» этого самого акта, а **потеря на границе диска ПОСЛЕ подтверждённого fsync** (класс
  «fsync солгал» — виртуализованная/сетевая ФС, page-cache не долетел до диска при жёстком отключении
  питания) — иной под-механизм той же категории «disk durability boundary», НЕ буквально C3-break на
  СВОЕЙ строке. Обе разновидности (torn-line на чужой более поздней строке НЕ трогает более раннюю строку —
  проверено по коду; настоящий канал потери именно РАНЕЕ подтверждённого ребра — post-fsync loss) **ловятся
  ОДНИМ И ТЕМ ЖЕ ассёртом** (сравнение edge-membership до/после реального ребута) — так что сам ЧЕК остаётся
  валиден и падуч, но узкая формулировка «C3 torn-line» в тексте патча чуть точнее было бы обобщить как
  «disk-durability-boundary loss (torn-line ИЛИ post-fsync loss), не только C3 буквально».
- **Отдельный практический разрыв (не блокирующий план-текст, но для будущего builder):** ни finding, ни
  verdict не называют, КАК тест будет физически имитировать обрыв (реальный `kill -9` посреди `writeSync`
  недетерминирован для юнит-теста vs. ручное усечение `journal.jsonl` между `S1.close()` и созданием S2 —
  fault-injection на уровне файла, что практичнее). Это деталь реализации теста, не решение этого патча —
  не блокирует харвест текста плана, но должно попасть в задачу-реализацию (T-sameas-guard), не потеряться.

**Вердикт по И4: ACCEPT — все 3 обязательные правки критика применены, механика проверена независимым
чтением кода, сценарий реально достижим (штатный boot-цикл D1.b, не синтетика). НЕ требую ещё одного
адверсариала** — обе найденные мной нюансы (torn-line vs post-fsync-loss framing; fault-injection техника
теста) не меняют падучесть чека, это точность формулировки + операционная деталь будущей реализации.
Обе внесены в консолидированный патч ниже как уточнение текста + follow-up-заметка к задаче.

## 2. Общий дом И2/И3 (`tools/lint/doc-tree.mjs`) — РЕШЕНИЕ

Обе находки (CG-12 §D, CG-13 §D) сознательно НЕ решили сами, оставили харвесту три опции: (i) один скрипт,
два режима; (ii) один модуль, две точки входа; (iii) два отдельных файла, если логика разная.

**Решение: (iii) — два отдельных новых файла, `doc-tree.mjs` не трогать.**
- `tools/lint/doc-tree.mjs` — остаётся как есть (архетип-линт дерева папок, своя, третья тема — не путать
  с двумя новыми).
- `tools/lint/state-pult.mjs` **(новый, И2/CG-12)** — генератор root-пульта из frontmatter карточек
  (`id·theme·status·gate·home·handoff·value-checkpoint·fork?`, схему сперва передоказать от
  `04-improvement-plans/state.md`, см. gate-лог И2 выше).
- `tools/lint/census-gate.mjs` **(новый, И3/CG-13)** — линтер полноты переписи (сверяет `CG-*` P0/P1-строки
  `02-coverage-gate.synthesis.md` против `task-pool.md`).

**Обоснование:** закон 2 doc-tree.md — «один дом на ТЕМУ», не «один файл на все генераторы». У двух задач
РАЗНЫЕ модели данных (frontmatter-обходчик карточек vs markdown-таблица-кросс-чек) — слияние в один режим
одного файла нарушило бы single-responsibility сильнее, чем экономит закон 2. Общее — только каталог
`tools/lint/` (уже существующая конвенция инструментов доку-дисциплины) и наименование по симметрии с
`doc-tree.mjs`. Явное решение, не default.

## 3. Применимость gate-критериев Волны 0 — по каждой из 4

| задача | критерий Волны 0 (`00-coorch-framing.md §4`) | вердикт |
|---|---|---|
| И1/CG-11 | назвать ВСЕ ТРИ кандидата (DV-process/DV-graph/D0(b)) с домами, не потерять ни один | **ACCEPT** — все три названы, домы явные, хедж internal |
| И2/CG-12 | owner+sizing задача НЕ выполненная сейчас, ИЛИ честная правка текста — не код сейчас | **ACCEPT** — задача (a), не код; scope-риск §R-outcome-boundary в finding подтверждает границу не нарушена |
| И3/CG-13 | работающий/запускаемый стаб + owner + acceptance, читает существующие файлы, не ждёт CG-12-схему | **ACCEPT** — T-census-check + T-census-check-ci, acceptance = падает на CG-02/03/05/06/07 сегодня (подтверждено дважды, finding+verdict grep) |
| И4/T-sameas-guard | новый ассёрт НЕ переиспользует `cardinalityOf`/`assertForwardMonotone`, падуч на реальных данных | **ACCEPT** — независимо перепроверено чтением кода (§1 выше), падуч на реальном disk-boundary, не тавтология |

## 4. КОНСОЛИДИРОВАННЫЙ ПЛАН ПАТЧА (для лида — точный, по строкам)

> Порядок применения к `01-execution-plan.synthesis.md`: **СНИЗУ ВВЕРХ по номеру строки** (239→98), чтобы
> более ранние правки не сдвигали номера строк последующих. Один блок (§4.5 ниже) — РЕАЛЬНЫЙ merge-conflict
> между И2 и И1 (оба целят в строки 116-122) — merged-текст дан целиком, не два отдельных патча.

### 4.1 `01-execution-plan.synthesis.md:239` (риск-регистр R5) — источник CG-11 патч8
Было: `D1 slice acceptance requires a real behavior-change; standing risk until DV exists`
Стало: `D1 slice acceptance requires a real behavior-change; standing risk until \`DV\` (Drift-Observer) exists`

### 4.2 `01-execution-plan.synthesis.md:238` (риск-регистр R4) — CG-11 патч7
Было: `D0: generated pult + stale-active generator check (mechanism, not label)`
Стало: `D0: generated pult + stale-active generator check (**\`D0(b)\`, not \`DV\`** — mechanism, not label)`

### 4.3 `01-execution-plan.synthesis.md:235` (риск-регистр R1) — sameas-guard патч
Было: `D1.b precondition: fired clean on **real** replay`
Стало (уточнено моей формулировкой §1, не только «C3 torn-line»):
`D1.b precondition: same-as-group edge-membership check across a real disk round-trip via DurableFsStore
(write→reboot→re-read, store-durable-fs.ts:139-156) — catches BOTH a torn-line drop (C3, :148-153) and a
post-fsync loss at the disk boundary; not an in-memory project() re-run and not the predicate-registry guard
— see precond 3 rewrite`

### 4.4 `01-execution-plan.synthesis.md:201` (§5 Wave 3) — CG-11 патч5
Было: `` `D2`-rest ‖ `D5`-heavy (own branch, after snapshot) ‖ `D3` (on 2nd-agent trigger) ‖ `DV` (Vitality plan). ``
Стало: `` `D2`-rest ‖ `D5`-heavy (own branch, after snapshot) ‖ `D3` (on 2nd-agent trigger) ‖ `DV` (Drift-Observer plan; see CG-11 split for DV-graph/D0(b)). ``

### 4.5 `01-execution-plan.synthesis.md:187-189` (§4 DV heading + right-point) — CG-11 патч3+4
Было (`:187`): `### DV — Vitality / drift-detector (the real Vitality=0 debt, first-class)`
Стало: `### DV — Drift-Observer (process/usage-liveness drift, first-class; NOT the Vitality-graph value — see DV-graph, CG-11)`

Было (`:188-189`):
`- Right-point: a live, cheap self-observation organ (usage/liveness/drift) — the meta-organ whose absence hid the 5 truths. **Later, named, NOT in the slice.** Folder: \`00-states/09-vitality-meter/\`. Critic = value.`
Стало (полный текст патч4, включает слитый CG-08):
```
- Right-point: a live, cheap self-observation organ (usage/liveness/drift OF THE PROCESS — cards,
  branches, dist/src staleness; NOT the memory-graph's decay/forgetting) — the meta-organ whose absence
  hid the 5 truths. **Later, named, NOT in the slice.** Folder: `00-states/09-drift-observer/`.
  **Named debt (CG-08, merged here):** `selection/relevance` (which graph node an agent should
  read, currently full-scan in `balance-observer.ts` per `council/drill-recall-design.md:102,108`) is
  an explicit backlog line of this plan — owner TBD, sized when DV kicks off (Wave 3), NOT silently
  assumed-covered. (Note: distinct from D0(b)'s card-staleness-check, §4 D0 — reading not settled, see
  patch below.) Critic = value.
```

### 4.6 MERGED: `01-execution-plan.synthesis.md:116-122` (§4 D0 right-point + enforcement) — И2×И1 конфликт, слито
**Обе находки целятся в один блок разным содержанием — ниже единый merged-текст, не два патча.**

Было (`:116-122`):
```
- **Right-point:** root `STATE.md` is a **generated** index (schema: id·theme·status·gate·home·handoff·
  value-checkpoint·fork?); the 4 unregistered branches (ga-rentacar, durable-store, picture-coverage,
  assemble-and-direct) registered as cards; the **HARVEST/CLOSE gate documented as a RULE**.
- **Enforcement (not prose):** (a) root `STATE.md` **generated via existing `tools/lint/doc-tree.mjs`** —
  teams edit **only their own card's frontmatter**, never the root table (kills the append-stack merge-rot);
  (b) a generator check that **flags any `status: active` card stale past a threshold** (the anti-rot
  mechanism, not a label).
```
Стало (merged CG-12 rewrite + CG-11 D0(b) label/hedge):
```
- **Right-point:** root `STATE.md` is a **generated** index (schema: id·theme·status·gate·home·handoff·
  value-checkpoint·fork? — see UNVALIDATED note below); the 4 unregistered branches (ga-rentacar,
  durable-store, picture-coverage, assemble-and-direct) registered as cards; the **HARVEST/CLOSE gate
  documented as a RULE**.
- **Enforcement (not prose):** (a) **TODO — no generator exists yet.** `tools/lint/doc-tree.mjs` today only
  emits a tree-shape view (`docs/_generated/doc-tree.view.md` — folder archetype + loose-file flag; verified
  `tools/lint/doc-tree.mjs:82-83`); it does not read/write `id/theme/gate/home/handoff/value-checkpoint`.
  **New sized task (`T-state-pult-generator`, own file `tools/lint/state-pult.mjs` — see CG-12/CG-13 shared-home
  decision, do NOT extend doc-tree.mjs, do NOT fold into census-gate.mjs).** Owner: TBD. Sizing: S (one script
  + fixture cards), blocks D1.c only, does not block D1.a/D1.b (`:205` unaffected). **Acceptance step:** the
  schema `id·theme·status·gate·home·handoff·value-checkpoint·fork?` above is **UNVALIDATED** — it was never
  checked against a real card's frontmatter and must be RE-DERIVED from the actual proven-pattern card,
  `docs/00-states/04-improvement-plans/state.md:1-11`, whose real frontmatter fields are
  `id, node_type, theme, status, owner, opened, updated, agents, handoff, last_session, plans` — no `gate`,
  no `value-checkpoint`, no `home` field exists there. The task is not "wire up a generator to the schema
  above"; it is "derive the pult schema from real cards, THEN build the generator." Until this task lands,
  D0's "generated pult" is **not-yet-real** and D1.c stays gated on it exactly as `:153`/`:205` already say.
  (b) a generator check that **flags any `status: active` card stale past a threshold** (the anti-rot
  mechanism, not a label) — **`D0(b)` "card-staleness-check"**, scoped to document frontmatter only, same
  open dependency as (a) (folds into the same `T-state-pult-generator` task, not a second one). **Working
  reading, NOT a settled fact (CG-11):** treated here as distinct from `DV`'s later live process-observer
  (KILL-SHOT 1 still excludes `DV` from `D1.c`'s gate; `D0(b)` stays inside `D0` because it is static/cheap,
  not "live"). **Open alternative:** `D0(b)` could instead be read as an early, narrow slice of `DV` pulled
  forward into D0, not a separate mechanism — the plan text does not rule this out; resolve on next review.
```

### 4.7 `01-execution-plan.synthesis.md:148` (D1.b Enforcement bullet) — sameas-guard патч
Было: `` in any tenant journal line**; `same-as` guard `predicates.ts:78` fired clean on **real** replay; ``
Стало: `` in any tenant journal line**; same-as-group edge-membership check across a real DurableFsStore disk round-trip (write → close → reboot new instance → hydrateFromDisk, store-durable-fs.ts:139-156 — catches both torn-line C3 drop and post-fsync boundary loss) shows no group shrinkage and no dropped edge between tombstone-live nodes; ``

### 4.8 `01-execution-plan.synthesis.md:104` (§3 overview table, DV row) — CG-11 патч1
Было: `` | **DV** | **Vitality / drift-detector** (the real "Vitality=0" debt) | `00-states/09-vitality-meter/` | Later, first-class (NOT in the slice) | ``
Стало: `` | **DV** | **Drift-Observer** (process/usage-liveness drift — cards, branches, dist/src; NOT the canonical Vitality-graph value Ц4, see DV-graph) | `00-states/09-drift-observer/` | Later, first-class (NOT in the slice) | ``

### 4.9 после `01-execution-plan.synthesis.md:107` (после KILL-SHOT 1 абзаца) — CG-11 патч2, новый абзац
Вставить дословно текст из `01-cg11-dv-split.finding.md` строки 120-134 (naming-split блок трёх сущностей —
DV / DV-graph / D0(b), с хеджем «Working reading (not settled fact)»). Не сокращаю здесь повторно — вербатим
уже точен в finding-файле, лид копирует блок как есть.

### 4.10 `01-execution-plan.synthesis.md:83` (Fable's non-waivable preconditions, item 3) — sameas-guard патч
Было: `` 3. The `same-as` guard (`predicates.ts:78`) **fired clean on real replay** (not mis-attributing, not unresolved). ``
Стало: вставить дословно текст `04-sameas-guard.finding.md` §D, строки 136-149 (полная спецификация
disk-round-trip precond, включая явный запрет на `cardinalityOf`/`assertForwardMonotone`-повторное
использование и на in-memory-only round-trip). Дополнить фразой из §1 этого файла: «(catches torn-line C3
drop AND post-fsync boundary loss, not just C3 literally)».

### 4.11 `01-execution-plan.synthesis.md:98` (§3 overview table, D0 row) — CG-12 патч
Было: `` | **D0** | Harness skeleton (generated pult + harvest gate) | `00-states/05-assemble-and-direct/` (meta-state produces it) | Parallel W1; gates **only D1.c** | ``
Стало: `` | **D0** | Harness skeleton (**pult generation = TODO, sized task `T-state-pult-generator`** + harvest gate) | `00-states/05-assemble-and-direct/` (meta-state produces it) | Parallel W1; gates **only D1.c** | ``

### 4.12 Косметика (И3's unfixed minor) — `02-coverage-gate.synthesis.md` §«Как это гейтит строй»
Найти цитату диапазона `:95-106` в `03-cg13-census-gate.finding.md` §A (если этот текст копируется в план
дословно) → поправить на `:97-106` (сам блок правила начинается после заголовка/пустой строки). One-liner,
не блокирует.

## 5. Новые задачи → `task-pool.md` (добавить в «Индекс» + развёрнутые блоки)

| id | имя | ветка/план | приор | статус |
|---|---|---|---|---|
| T-state-pult-generator | root-пульт генератор из карточек (схема передоказать от `04-improvement-plans/state.md`), файл `tools/lint/state-pult.mjs` | D0 | 🔴 | todo |
| T-census-check | механизировать R-b: `tools/lint/census-gate.mjs`, читает `task-pool.md`+`02-coverage-gate.synthesis.md` напрямую, падает на непоглощённых P0/P1 CG-* | D0 | 🔴 | todo |
| T-census-check-ci | подключить `T-census-check` к реальному входу в «строй» (pre-commit хук ИЛИ ручной шаг в `HANDOFF.template.md`) | D0 (после T-census-check) | 🟠 | todo |

Развёрнутые блоки для `T-census-check`/`T-census-check-ci` — копировать дословно из
`03-cg13-census-gate.finding.md` §C (уже полностью готовы, с owner-slot/sizing/acceptance/якорями). Блок
`T-state-pult-generator` — компоновать из merged-текста §4.6 выше (это моя синтез-добавка для трекинга в
живом пуле, а не буквальный task-pool-блок из finding-файла — И2 писал только план-текст).

## 6. Правки `02-coverage-gate.synthesis.md` — пометить CG-11/12/13/14 addressed-with-home

- **CG-11** (строка 90): заменить на вердикт из `01-cg11-dv-split.finding.md` §C патч9 (дословно готов):
  «**РЕШЕНО**: расщеплено на `DV`/`DV-graph`/`D0(b)`, см. `polosa-a/01-cg11-dv-split.finding.md`».
- **CG-08** (строка 89): заменить на текст из того же патч9: «**РЕШЕНО, слито**: явная строка добавлена в
  DV §4, отдельная сущность не заведена».
- **Ц4 строка** (60): заменить на текст патч9 («DV-graph — расщеплено от DV, всё ещё UNCLAIMED — CG-11
  РЕШЕНО-расщеплением, не покрытием»).
- **CG-12** (строка 91, НЕ покрыта готовым патчем — добавить сейчас): дописать «**РЕШЕНО (задача заведена)**:
  `T-state-pult-generator` открыта (D0, TBD owner), план-текст исправлен на честный TODO, см.
  `polosa-a/02-cg12-d0-generator.finding.md`».
- **CG-13** (строка 92, аналогично): «**РЕШЕНО (задача заведена)**: `T-census-check`+`T-census-check-ci`
  открыты (D0), см. `polosa-a/03-cg13-census-gate.finding.md`».
- **CG-14** (строка 93, аналогично, НЕ покрыта готовым патчем в sameas-finding — добавить сейчас): «**РЕШЕНО
  (текст патча готов)**: precond 3 D1.b переанкорен на реальный disk round-trip (`DurableFsStore`), не на
  registry-guard; см. `polosa-a/04-sameas-guard.finding.md` §D + харвест-уточнение
  `polosa-a/05-harvest-gate.md` §1».

## 7. Оставшиеся блокеры / открытые точки (не блокируют харвест текста, но не терять)

- **Owner: TBD** на всех трёх новых задачах (`T-state-pult-generator`, `T-census-check`, `T-census-check-ci`)
  — назначение владельца явно вне scope этой волны, лид/владелец должен закрыть на харвесте.
- **D0(b) distinct-vs-precursor** (CG-11) осознанно оставлен хеджем, не фактом — «resolve on next review».
  Не блокер для входа в строй D1.a/D1.b (не гейтит их), но должен всплыть до Wave 3 (DV kickoff).
- **Fault-injection техника для T-sameas-guard-теста** (реальный kill vs. ручное усечение `journal.jsonl`)
  не решена ни одной находкой — операционная деталь будущей реализации, зафиксировать в самой задаче
  `T-sameas-guard`, когда она перейдёт в in-progress (не потерять, см. §1 выше).
- **Grouping method (direct vs transitive)** для same-as-групп — сознательно DEFERRED до первого реального
  disk-round-trip наблюдения, не решать раньше времени (per finding).
