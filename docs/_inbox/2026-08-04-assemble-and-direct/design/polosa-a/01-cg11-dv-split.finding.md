---
node_type: analysis
title: "CG-11/CG-08 — DV расщепление на 3 смысла + судьба selection/relevance-долга"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-05
scope: project
related:
  - ../01-execution-plan.synthesis.md
  - ../02-coverage-gate.synthesis.md
  - ./00-coorch-framing.md
  - ../../../../02-project/core/01-brain/01-overview/01-values/04-vitalnost/README.md
  - ../council/drill-recall-design.md
  - ../council/depth-fable-deepest.md
source:
  - docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md
  - docs/_inbox/2026-08-04-assemble-and-direct/design/02-coverage-gate.synthesis.md
  - docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/README.md
---

# CG-11/CG-08 — DV расщепление на 3 смысла + судьба selection/relevance-долга

## (A) Верифицированные вхождения `DV` — якоря + дословно

Все вхождения `DV` в `docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md`
(проверено `grep -n "DV"`, 5 строк):

1. **`01-execution-plan.synthesis.md:104`** (таблица §3):
   `| **DV** | **Vitality / drift-detector** (the real "Vitality=0" debt) | \`00-states/09-vitality-meter/\` | Later, first-class (NOT in the slice) |`
   → смысл: **DV-process** (заявлен как «drift-detector», но дом-папка называется `vitality-meter` — сама папка уже засеивает коллизию имени, см. §C).

2. **`01-execution-plan.synthesis.md:106`**:
   `**KILL-SHOT 1 applied:** the live Vitality/usage observer is **DV**, a separate first-class plan — it is NOT`
   (продолжение строки 107: `smuggled into D1.c's gate. D1.c ships only a **hand-triggered verification script**.`)
   → смысл: **DV-process**, но текст называет его «Vitality/usage observer» — снова смешивает слово Vitality с процессным drift.

3. **`01-execution-plan.synthesis.md:187`** (заголовок §4 секции):
   `### DV — Vitality / drift-detector (the real Vitality=0 debt, first-class)`
   → смысл: **DV-process** (по телу right-point ниже), заголовок использует канонное слово ценности «Vitality».

4. **`01-execution-plan.synthesis.md:201`** (§5 Wave 3):
   ``D2`-rest ‖ `D5`-heavy (own branch, after snapshot) ‖ `D3` (on 2nd-agent trigger) ‖ `DV` (Vitality plan).``
   → смысл: **DV-process**, снова подписан как «Vitality plan» (не «Drift plan»).

5. **`01-execution-plan.synthesis.md:239`** (§7 R5 risk row):
   `| R5 | **"Well-documented fiction"** — no named beneficiary, zero evidence memory changes behavior | value lens Q5 | D1 slice acceptance requires a real behavior-change; standing risk until DV exists |`
   → смысл: **DV-process** (нужен наблюдатель, чтобы ДОКАЗАТЬ behavior-change) — не про графовые механизмы Витальности.

**Третий кандидат — D0 enforcement(b)** (НЕ содержит буквы `DV`, но со-оркестратор подозревает пересечение):
`01-execution-plan.synthesis.md:121-122`:
`(b) a generator check that **flags any \`status: active\` card stale past a threshold** (the anti-rot`
`mechanism, not a label).`
Симметрично в риск-регистре, **`01-execution-plan.synthesis.md:238`**:
`| R4 | **Card-rot** (\`status:active\` forever) | 4/5 \`00-states\` tracks frozen-but-active | D0: generated pult + stale-active generator check (mechanism, not label) |`
И в census, **`02-coverage-gate.synthesis.md:70`** (столбец `D0`, строка Q7):
`⬜(stale-active check — контракт карточек)`
→ Все три места **явно атрибутируют** этот чек к `D0`, ни разу не к `DV`. Вывод в §B ниже: это ОТДЕЛЬНАЯ,
третья вещь, не переименование DV, а самостоятельный узкий механизм.

**Итог переписи:** ни разу в плане `DV` не используется в значении «6 механизмов графовой Витальности»
(Ц4) — но census (`02-coverage-gate.synthesis.md:60`) считает, что читатель мог так подумать по имени:
`| Ц4 | Витальность (decay/forgetting/…) | – | – | ◐(cost-tree-relabel) | – | – | – | ⬜(имя совпадает, предмет другой — CG-11) | **MISLABELED-PARTIAL** |`

## (B) Три смысла — верифицированы, предложенные имена

Канон Витальности (`docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/README.md:39-46`),
дословно 6 граней (таблица):
```
| 01 | salience-weight | Живой вес: затухание без использования, подъём при подтверждении | 4 |
| 02 | consolidation-emergence | Сжатие многих в одно vs рождение нового смысла из старого сырья | 4 |
| 03 | forgetting-lifecycle | Доступность угасает явными стадиями; содержимое не удаляется | 4 |
| 04 | reinterpretation | Та же единица меняет смысл содержимого, не теряя тождества | 3 |
| 05 | pending-open-loops | Незакрытое — своя ось, не участвует в затухании | 3 |
| 06 | metabolism-governance | Бюджет и мотор метаболизма принадлежат базе, не ячейке | 4 |
```
(заголовок файла, строка 1: `# Ценность: Витальность (Metabolism)`)

Три различённых предмета:

1. **`DV` (сохранить ID, сузить label)** — процессный drift/liveness-наблюдатель: usage/liveness/drift
   у КАРТОЧЕК/ВЕТОК/системы в целом (плановые артефакты, не граф памяти). Источник right-point:
   `01-execution-plan.synthesis.md:188`: «a live, cheap self-observation organ (usage/liveness/drift) —
   the meta-organ whose absence hid the 5 truths». Later/first-class/Wave 3, дом
   `00-states/09-vitality-meter/`. **Проблема:** и label («Vitality / drift-detector»), и имя папки
   (`vitality-meter`) буквально несут слово ценности — это и есть корень путаницы CG-11, не только
   3-буквенный акроним `DV`.

2. **`DV-graph`** (термин УЖЕ канон, не изобретаю — критик поправил: `task-pool.md:169`
   («Расщепить DV-process vs DV-graph до Wave 3») и `00-coorch-framing.md:38/48/86` уже используют
   ровно это имя; моя черновая версия `V-graph` форкнула бы терминологию — тот самый баг класса CG-11,
   исправляю) — канонический предмет ценности Ц4: 6 граней Витальности графа памяти (salience-weight,
   consolidation-emergence, forgetting-lifecycle, reinterpretation, pending-open-loops,
   metabolism-governance — см. цитату выше). **UNCLAIMED**: ни одна ветка D0..D5/DV плана
   `01-execution-plan.synthesis.md` не ссылается на этот список ни разу
   (`grep -n "salience\|consolidation\|forgetting-lifecycle\|reinterpretation\|pending-open-loops\|metabolism-governance"` по плану — 0 совпадений). Census уже это фиксирует как MISLABELED-PARTIAL
   (`02-coverage-gate.synthesis.md:60`).

3. **`D0(b)` / "card-staleness-check"** (новое узкое имя) — генератор-чек по `status: active`-возрасту
   карточек, ЖИВЁТ и гейтится ВНУТРИ `D0` (`01-execution-plan.synthesis.md:121-122`, `:238`, census
   `:70`). Это НЕ `DV` (нигде не назван этой буквой) и НЕ `DV-graph` (не про граф, про мета-документы).
   Родство с `DV` есть по СЕМЬЕ идеи (оба про «staleness/drift»), но различие по ОСИ:
   `D0(b)` = статический, дешёвый, doc-frontmatter-level чек, работает СЕЙЧАС и гейтит `D1.c`
   (`01-execution-plan.synthesis.md:205`: «`D0 → D1.c` ONLY»). `DV` = «live... self-observation organ»,
   явно ПОЗЖЕ (Wave 3) и явно ИСКЛЮЧЁН из гейта `D1.c` по формулировке KILL-SHOT 1 (`:106-107`: «it is
   NOT smuggled into D1.c's gate»). Если бы `D0(b)` тайно был тем же механизмом, что `DV`, план сам себя
   нарушал бы (KILL-SHOT 1 запрещает live-observer в гейте D1.c, а D0 гейтит D1.c) — поэтому важно
   зафиксировать текстом, что это РАЗНЫЕ по охвату чеки, не один под двумя ярлыками.

## (C) Точечный патч плана (было → стало, с номерами строк)

Все патчи — в `docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md`.

**Патч 1 — таблица §3, строка 104.**
Было:
`| **DV** | **Vitality / drift-detector** (the real "Vitality=0" debt) | \`00-states/09-vitality-meter/\` | Later, first-class (NOT in the slice) |`
Стало:
`| **DV** | **Drift-Observer** (process/usage-liveness drift — cards, branches, dist/src; NOT the canonical Vitality-graph value Ц4, see DV-graph) | \`00-states/09-drift-observer/\` | Later, first-class (NOT in the slice) |`

**Патч 2 — после строки 107 (после абзаца KILL-SHOT 1), новый абзац:**
```
**Naming split (CG-11 — do not re-collide these three):**
- **`DV`** — the process drift-observer above ONLY (cards/branches/dist-src usage-liveness-drift).
- **`DV-graph`** (canon term, `task-pool.md:169`) — the canonical value Ц4 «Витальность»: 6 graph mechanisms (salience-weight ·
  consolidation-emergence · forgetting-lifecycle · reinterpretation · pending-open-loops ·
  metabolism-governance — `docs/02-project/core/01-brain/01-overview/01-values/04-vitalnost/README.md`).
  **UNCLAIMED** — no branch in this plan owns it; backlog until an owner/home is chosen. `DV` does NOT
  cover it despite the shared word "Vitality".
- **`D0(b)` card-staleness-check** (§4 D0 Enforcement) — narrow, NOW, generator-level check on document
  frontmatter age, scoped inside `D0` (gates `D1.c`). **Working reading (not settled fact): treated as
  DISTINCT from `DV`** — `DV` is later/live/excluded from `D1.c`'s gate by KILL-SHOT 1; `D0(b)` is
  static/cheap/doc-level and stays inside D0 on purpose. **Open alternative, not ruled out by the plan
  text: `D0(b)` may instead be an early, narrow SLICE of `DV` pulled forward into D0**, not a separate
  mechanism — the plan never states either reading explicitly (CG-11 gap). Pick one on next review.
```

**Патч 3 — заголовок §4, строка 187.**
Было:
`### DV — Vitality / drift-detector (the real Vitality=0 debt, first-class)`
Стало:
`### DV — Drift-Observer (process/usage-liveness drift, first-class; NOT the Vitality-graph value — see DV-graph, CG-11)`

**Патч 4 — right-point, строки 188-189.**
Было:
`- Right-point: a live, cheap self-observation organ (usage/liveness/drift) — the meta-organ whose absence hid`
`  the 5 truths. **Later, named, NOT in the slice.** Folder: \`00-states/09-vitality-meter/\`. Critic = value.`
Стало:
`- Right-point: a live, cheap self-observation organ (usage/liveness/drift OF THE PROCESS — cards,`
`  branches, dist/src staleness; NOT the memory-graph's decay/forgetting) — the meta-organ whose absence`
`  hid the 5 truths. **Later, named, NOT in the slice.** Folder: \`00-states/09-drift-observer/\`.`
`  **Named debt (CG-08, merged here — see §D):** \`selection/relevance\` (which graph node an agent should`
`  read, currently full-scan in \`balance-observer.ts\` per \`council/drill-recall-design.md:102,108\`) is`
`  an explicit backlog line of this plan — owner TBD, sized when DV kicks off (Wave 3), NOT silently`
`  assumed-covered. (Note: distinct from D0(b)'s card-staleness-check, §4 D0 — reading not settled, see`
`  patch 6.) Critic = value.`

**Патч 5 — §5 Wave 3, строка 201.**
Было:
`\`D2\`-rest ‖ \`D5\`-heavy (own branch, after snapshot) ‖ \`D3\` (on 2nd-agent trigger) ‖ \`DV\` (Vitality plan).`
Стало:
`\`D2\`-rest ‖ \`D5\`-heavy (own branch, after snapshot) ‖ \`D3\` (on 2nd-agent trigger) ‖ \`DV\` (Drift-Observer plan; see CG-11 split for DV-graph/D0(b)).`

**Патч 6 — §4 D0 Enforcement, строки 121-122.**
Было:
`(b) a generator check that **flags any \`status: active\` card stale past a threshold** (the anti-rot`
`mechanism, not a label).`
Стало:
`(b) a generator check that **flags any \`status: active\` card stale past a threshold** (the anti-rot`
`mechanism, not a label) — **\`D0(b)\` "card-staleness-check"**, scoped to document frontmatter only.`
`**Working reading, NOT a settled fact:** treated here as distinct from \`DV\`'s later live`
`process-observer (KILL-SHOT 1 still excludes \`DV\` from \`D1.c\`'s gate; \`D0(b)\` stays inside \`D0\``
`because it is static/cheap, not "live"). **Open alternative:** \`D0(b)\` could instead be read as an`
`early, narrow slice of \`DV\` pulled forward into D0, not a separate mechanism — the plan text does not`
`rule this out; resolve on next review (CG-11).`

**Патч 7 — §7 риск-регистр, строка 238 (R4).**
Было:
`| R4 | **Card-rot** (\`status:active\` forever) | 4/5 \`00-states\` tracks frozen-but-active | D0: generated pult + stale-active generator check (mechanism, not label) |`
Стало:
`| R4 | **Card-rot** (\`status:active\` forever) | 4/5 \`00-states\` tracks frozen-but-active | D0: generated pult + stale-active generator check (**\`D0(b)\`, not \`DV\`** — mechanism, not label) |`

**Патч 8 — §7 риск-регистр, строка 239 (R5).**
Было:
`| R5 | **"Well-documented fiction"** — no named beneficiary, zero evidence memory changes behavior | value lens Q5 | D1 slice acceptance requires a real behavior-change; standing risk until DV exists |`
Стало:
`| R5 | **"Well-documented fiction"** — no named beneficiary, zero evidence memory changes behavior | value lens Q5 | D1 slice acceptance requires a real behavior-change; standing risk until \`DV\` (Drift-Observer) exists |`

**Патч 9 — census `02-coverage-gate.synthesis.md`, строка 60 (Ц4) и 90 (CG-11), 89 (CG-08).**
Ц4, было:
`| Ц4 | Витальность (decay/forgetting/…) | – | – | ◐(cost-tree-relabel) | – | – | – | ⬜(имя совпадает, предмет другой — CG-11) | **MISLABELED-PARTIAL** |`
Ц4, стало (последний столбец переименовать в новую колонку `DV-graph`/`DV`-раздельно, либо минимально дописать):
`| Ц4 | Витальность (decay/forgetting/…) | – | – | ◐(cost-tree-relabel) | – | – | – | ⬜(DV-graph — расщеплено от DV, всё ещё UNCLAIMED — CG-11 РЕШЕНО-расщеплением, не покрытием) | **MISLABELED-PARTIAL, теперь однозначно** |`

CG-11, было (строка 90):
`| CG-11 | **P1** (класс canon-inflation) | Ц4×DV | \`DV\`=«drift-детектор процесса» ≠ «6 механизмов Витальности графа»; одно имя, разный предмет | D0 — расщепить DV-process vs DV-graph до Wave 3 |`
Стало:
`| CG-11 | **P1** (класс canon-inflation) | Ц4×DV | \`DV\` рисковал накрыть ТРИ предмета: process-observer / 6 механизмов Ц4 (DV-graph, канон \`task-pool.md:169\`) / D0(b) card-staleness-check | **РЕШЕНО**: расщеплено на \`DV\`/\`DV-graph\`/\`D0(b)\`, см. \`polosa-a/01-cg11-dv-split.finding.md\` |`

CG-08, было (строка 89):
`| CG-08 | P2 (process-honesty) | Q1/Q3×DV | \`selection/relevance\`-долг устно «в DV», DV-карточка его не называет — риск «второй cost-tree» | D0/DV — назвать долг явной строкой |`
Стало:
`| CG-08 | P2 (process-honesty) | Q1/Q3×DV | \`selection/relevance\`-долг устно «в DV» (\`council/drill-recall-design.md:102,108\`), сам план его не называл | **РЕШЕНО, слито**: явная строка добавлена в DV §4 (патч 4 выше), отдельная сущность не заведена |`

## (D) Судьба CG-08 — слить (не отдельная сущность)

**Решение: слить в DV-текст (§4, патч 4), НЕ заводить отдельный deferred-with-home.**

Обоснование:
1. **Тот же паттерн бага, что CG-11/CG-12/CG-13** — план (или его семья файлов) ссылается на механизм,
   которого нет явной строкой в доме-адресате. Долг реально существует и задокументирован — но НЕ в
   `01-execution-plan.synthesis.md`, а в рабочем council-файле `council/drill-recall-design.md:102`
   (`**LOGGED → DV**: index/by-type query is ADR-0008 reprojection...`) и `:108` (`Full-scan is an
   honest v1 IF the scaling debt is written down as a DV item the same hour`) — цитата показывает, что
   ЗАМЫСЕЛ был «записать в DV в тот же час», но синтез в execution-plan этого не унаследовал.
2. **Дом уже named** — `DV`/`00-states/09-...` — не нужен новый branch/folder, только строка.
3. **Размер тривиален** — одна bullet-строка (патч 4), не отдельная сессия/владелец.
4. Со-оркестратор прямо рекомендует слияние (`00-coorch-framing.md:43-44`: «Рекомендация: слить в И1
   (один файл-семья, DV §4), не заводить И5»).

## (E) Риски / открытые вопросы для критика

- **R-a (средний):** Патч 2/4 предлагают переименовать папку `00-states/09-vitality-meter/` →
  `00-states/09-drift-observer/`. Это ТЕКСТОВОЕ предложение (я не трогал файлы/код per инструкции) — если
  папка `09-vitality-meter/` уже физически существует с контентом, переименование требует отдельного
  git-mv шага и проверки ссылок на неё в других доках (`grep -rn "09-vitality-meter"` по всему `docs/`
  не выполнен мной за пределами плана — критику стоит это перепроверить перед принятием патча).
- **R-b — RESOLVED (правка ревью 1):** первая версия этого файла изобретала имя `V-graph`. Критик поймал:
  канон уже держит термин `DV-graph` для той же сущности — `task-pool.md:169` («Расщепить DV-process vs
  DV-graph до Wave 3») и `00-coorch-framing.md:38/48/86`. Это была бы ровно та ошибка, которую CG-11
  должен убить (форк терминологии). Везде в §B/C/D/F ниже заменено на `DV-graph`; отдельного действия
  над `task-pool.md` не требуется — он и есть источник термина, файл ему теперь СЛЕДУЕТ, а не спорит.
- **R-c (низкий, ОГОВОРКА обязательна — правка ревью 2):** D0(b)-vs-DV «distinct» — это МОЯ ТРАКТОВКА
  текста плана, НЕ прямая цитата. Аргумент за distinct: KILL-SHOT 1 явно исключает live-observer из гейта
  `D1.c`, а `D0` гейтит `D1.c` (`:205` «D0 → D1.c ONLY») — если бы D0(b) был тем же механизмом, что DV, это
  было бы самопротиворечие. Но сам этот аргумент ОСЛАБЛЕН (критик прав): гейт `D0 → D1.c` в тексте плана
  описан как «карточка должна существовать, чтобы записать в неё статус» (`02-coverage-gate.synthesis.md`
  §1 CRUX #2: «gates only D1.c (a card must exist to write status into)») — то есть про СУЩЕСТВОВАНИЕ
  карточки, не про staleness-check конкретно. Самопротиворечие не железно доказано. **Обе читки остаются
  открытыми и обе зафиксированы в патче:** (i) «distinct» — D0(b) и DV разные по охвату механизмы (моя
  рабочая версия, патчи 2/4/6 ниже); (ii) АЛЬТЕРНАТИВА — «D0(b) — ранний, узкий срез того же DV,
  вынесенный в D0 пораньше по времени, не отдельная сущность». План НИГДЕ явно не пишет ни «D0(b) ≠ DV»,
  ни «D0(b) = precursor of DV» — это была ДЫРА (со-оркестратор её поднял, `00-coorch-framing.md:38`), и
  патч 6 её закрывает ФОРМУЛИРОВКОЙ С ХЕДЖЕМ, не окончательным фактом. Финальный выбор между (i)/(ii) —
  решение владельца/следующего ревью, не факт, установленный этим файлом.
- **Не проверено:** существует ли уже физически файл/скрипт для D0(b) card-staleness-check (это вопрос
  И2/CG-12 брифа, не моего) — я НЕ трогал `tools/` и не запускал код, только читал текст плана.

## (F) Крючки самопроверки (P3) — как реализатор поймёт, что расщепление применено верно

1. **Grep-инвариант:** после патча, `grep -n "Vitality" 01-execution-plan.synthesis.md` возвращает
   строки ТОЛЬКО с явной оговоркой «NOT the ... value» / «Vitality-graph value» рядом — ни одного «голого»
   упоминания «Vitality» без дизамбигуации в контексте `DV`.
2. **Три термина, три разных якоря:** `grep -n "DV-graph"` находит ≥1 упоминание с прямой ссылкой на
   `04-vitalnost/README.md` (и совпадает с `task-pool.md:169` — не форкает канон); `grep -n "D0(b)"`
   находит ≥2 упоминания (§4 enforcement + R4 риск-строка); `grep -n "\`DV\`"` — все вхождения относятся
   ТОЛЬКО к process/usage-liveness (никогда не путается с Ц4/decay/forgetting в том же предложении).
3. **Census согласован с планом:** `02-coverage-gate.synthesis.md` строки Ц4/CG-11/CG-08 после патча 9
   не противоречат `01-execution-plan.synthesis.md` (тот же вердикт: DV-graph — unclaimed backlog,
   D0(b) — внутри D0, DV — process-only, CG-08 — слито).
4. **Не потерян ни один из трёх кандидатов** (harvest-критерий И1 из `00-coorch-framing.md:86-88`):
   патч должен именовать ВСЕ ТРИ (DV-process/DV-graph/D0(b)) — если финальный diff трогает только 2, это
   FAIL по gate-критерию, заявленному со-оркестратором.
5. **Хедж distinct-vs-precursor не потерян (правка ревью 2):** реализатор должен увидеть в патче 6/§E
   явную фразу, что «D0(b) ≠ DV» — ТРАКТОВКА с указанной альтернативой, а не окончательный факт; если
   финальный текст плана утверждает «distinct» БЕЗ этой оговорки — FAIL, вернуть на ревью.
