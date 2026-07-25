---
id: vertical-scenario
node_type: spec
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
related:
  - ./README.md                                                                                    # движок Фазы 1: envelope, view 4 стадии, resolve()-PEP, cost-tree, DoD, риски
  - ../../../../02-project/core/00-kernel/terminology.md                                            # словарь: thing/act/lens/scope/actor/viewer, ActKind, combinator
  - ../../../../02-project/core/00-kernel/invariants.md                                             # I-1..I-14 + «7 тестов ядра»
  - ../../../../02-project/core/00-kernel/axes-and-time.design.md                                   # оси адресации, recordedAt/validFrom/validTo (шаг 9)
  - ../../../../02-project/core/02-agents/examples/01-agent-manager/07-extensibility/semantic-lens.design.md  # шаг 7: rights→similarity, view:hybrid
  - ../../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md         # resolve()/PEP, deny=clamp, capability-гейт (шаги 8, 10)
  - ../../../../_inbox/1-gpt-review/2-overview-direction.md                                         # источник 10 шагов + «7 тестов ядра» + риск преждевременной универсальности
---

# Vertical Proof Scenario — единственный вертикальный срез, доказывающий гипотезу субстрата

> **Один сценарий, 10 шагов, ноль спец-таблиц.** Если эти 10 шагов исполняются на ФИКСИРОВАННОМ движке
> (generic envelope + view-компилятор `from·traverse·filter·shape` + `resolve()`-PEP + policy-as-data) —
> **без единой bespoke-схемы под шаг** — несущая гипотеза доказана. Это walking-skeleton не «вширь по
> фичам», а «вглубь по одной нити»: create → relate → act → project → authorize → agent read → propose →
> validate → write → replay → inspect (GPT-review, проход 5 «тонкий вертикальный срез»).

---

## §Problem / зачем именно этот сценарий

GPT-review назвал **риск №1 — нетехнический**: **преждевременная универсальность** (premature universality):

> «Мы строим систему, способную представить всё, но пока она не решает ни одну задачу лучше
> специализированного приложения.» (GPT-review 2, §«Самый большой архитектурный риск».)

Универсальность сама по себе пользователем не ощущается. Антидот — **ОДИН вертикальный сценарий, который
разом задействует ВСЕ преимущества субстрата** и делает это **без специальных таблиц под каждый шаг**.

**Falsifiable claim (то, что этот спек делает опровержимым):**

> **Каждый из 10 шагов — это ДАННЫЕ + КОНФИГ на неизменном движке, а НЕ таблица/код под шаг.**
> Цель ставится узлом-конвертом (не `goals`-таблицей); приоритет меняется актом (не `UPDATE priority`);
> скрытое поле — решением `resolve()` (не `hidden_fields`-таблицей); срез недели — replay актов (не
> `snapshots`-таблицей); стоимость цепочки — обход `cost-tree` (не `cost`-колонкой).

Если хоть один шаг требует bespoke-схему — гипотеза «движок фиксирован, модули = данные» **опровергнута** на
этом шаге, и мы честно это увидим ДО кода. Сценарий = исполнимый детектор преждевременной универсальности.

**Три вещи, которые сценарий обязан доказать (GPT-review, §Итог):**
1. Новая модель подключается без перестройки ядра (шаги 1–3: `goal`/`task`/`research` — новые типы, ноль DDL).
2. Разные агенты и человек действительно работают с ОДНИМ объектом (шаги 1→2→3→4→5→6 — один граф, много акторов).
3. История, права и retrieval остаются согласованными (шаги 7–10: RAG-права, скрытие, срез времени, стоимость).

---

## §The 10 steps — по одному подразделу на шаг

Обозначения. **Envelope** = 10-полный конверт (`id · type · state · edges · view · visibility · access ·
acts · policy_ref · body`, ADR-0004 App. A). **ActKind** ∈ `domain_event · observation · command ·
access_event · agent_trace · system_telemetry` (terminology §2/§5). **Линза** = view-def, скомпилированный в
4 стадии `from·traverse·filter·shape`. **resolve()** = `clamp(fold(combinator, orderedStack, safeDefault))`
(единый PEP, ADR-0004 D0). **7 тестов ядра** = `add-type · semantic-as-plugin · rebuild-index · as-of ·
deny-field-everywhere · plugin-upgrade · explain-chain`.

---

### Шаг 1 — Человек создаёт цель

| Поле | Значение |
|------|----------|
| **actor** | `user:jenya` (ось actor; носитель provenance+capability) |
| **scope** | `project-alpha` (ось scope; НЕ actor) |
| **node** | создаётся `goal:*`, `type:"goal"` — envelope, `body={title, intent, ...}` |
| **ActKind** | `domain_event` (create) → append в `acts[]` |
| **relation** | `goal —part-of→ project-alpha` (пара-ребро в `edges[]` источника) |
| **lens** | unit-view (просмотр единицы) — тривиальный `from{id}·shape` |
| **policy / resolve()** | write-path: `resolve("write-knowledge", user:jenya, goal)` → allow (грант `core:write-knowledge` в `project-alpha`) |
| **инварианты** | **I-1** stable id · **I-2** actor+provenance · **I-3** append-only act · **I-13** новый тип = данные+конфиг |
| **7 тестов** | **add-type** (тип `goal` регистрируется узлом `meta:type`, физической таблицы нет) · **explain-chain** |

**No special table:** цель — это generic envelope с `type:"goal"`; тип объявлен узлом реестра `meta:type`,
а НЕ таблицей `goals` и НЕ DDL ядра (add-type).

---

### Шаг 2 — Агент создаёт связанные задачи

| Поле | Значение |
|------|----------|
| **actor** | `agent:planner` |
| **scope** | `project-alpha` |
| **node** | N узлов `type:"task"`, `body={title, status:"open", ...}` |
| **ActKind** | `domain_event` (create) на каждый task; `provenance.sourceIds=[goal:*]` |
| **relation** | `task —part-of→ goal` (первоклассное ребро; relation = примитив, terminology §2) |
| **lens** | `actions-by-agent` (что сделал этот агент) начинает наполняться; `cost-tree` копит вклад |
| **policy / resolve()** | write-path: `resolve("write-knowledge", agent:planner, task)` → allow (грант агенту в scope) |
| **инварианты** | **I-2** агентское изменение имеет actor+provenance · **I-1** · **I-3** · relation-примитив |
| **7 тестов** | **explain-chain** (`goal → agent:planner → create → allow → task`) |

**No special table:** задачи — envelope `type:"task"`; связь `part-of` хранится **парой-ребром в `edges[]`
узла-источника** (инверсно индексируется `edge-index.ts`), а НЕ строкой в join-таблице `goal_tasks`.

---

### Шаг 3 — Другой агент добавляет ресёрч

| Поле | Значение |
|------|----------|
| **actor** | `agent:researcher` |
| **scope** | `project-alpha` |
| **node** | `type:"research"` (заметка/находка), `body={summary, sources}` |
| **ActKind** | `domain_event` (create research) — канон; **отдельно** `agent_trace` (рассуждения/вызовы) — НЕ канон |
| **relation** | `research —about→ task` (или `—supports→ goal`) |
| **lens** | `actions-by-agent` (виден второй агент на том же графе) |
| **policy / resolve()** | write-path allow; `provenance.sourceIds=[внешние источники]` |
| **инварианты** | **I-2** · **I-3** + **разделение потоков ActKind** (domain_event ≠ agent_trace, разные retention) |
| **7 тестов** | **explain-chain** |

**No special table:** ресёрч — envelope `type:"research"`; рассуждения агента уходят в поток `agent_trace`
(дом `docs/_log/`, gitignored), а НЕ в domain-log и НЕ в таблицу `research_notes`. Один конверт — разные
политики хранения (GPT-review 2: «общий envelope, но разные retention/replay»).

---

### Шаг 4 — Планировщик меняет приоритет

| Поле | Значение |
|------|----------|
| **actor** | `agent:planner` (scheduler) |
| **scope** | `project-alpha` |
| **node** | читает `task`, **добавляет** акт-утверждение `priority:"high"` (НЕ мутирует поле на месте) |
| **ActKind** | `domain_event` (assertion change); `recordedAt` (обяз.), опц. `validFrom` (когда приоритет вступает) |
| **relation** | новых нет |
| **lens** | current-state — свёртка (reducer) `acts[]` → `state` показывает `priority:high` |
| **policy / resolve()** | write-path gate: `resolve("write-knowledge", agent:planner, task)` → allow |
| **инварианты** | **I-3** изменение = append акта · **I-4** акт неизменяем (коррекция=новый акт) · **I-5** state=проекция свёртки |
| **7 тестов** | **rebuild-index** (state пересобираем из журнала) · **explain-chain** · закладка **as-of** (`recordedAt`) |

**No special table:** приоритет — это **поле, утверждённое новым актом в `task.acts[]`**; смена = append, а
не `UPDATE tasks SET priority`. История приоритетов = сам журнал актов, отдельной `priority_history`-таблицы
нет (I-3/I-4).

---

### Шаг 5 — Человек видит задачу в кокпите

| Поле | Значение |
|------|----------|
| **viewer** | `user:jenya` (ось viewer на read-path) |
| **scope** | `project-alpha` |
| **read** | `task` (+ связанные `goal`/`research`) через линзу |
| **ActKind** | `access_event` (чтение логируется отдельным потоком, НЕ в domain-log) |
| **relation** | traverse `part-of` (задача↔цель) |
| **lens** | **cockpit** = view-def: `from{type:task}·traverse{part-of}·filter{visible_to:$viewer}·shape{fields}` |
| **policy / resolve()** | read-path: `filter.visible_to` вызывает `resolve(key, user:jenya, node)` как ФИЛЬТР |
| **инварианты** | **I-7** resolve() единственный PEP на чтении · **I-9** fail-closed · **I-6** проекция имеет id+version |
| **7 тестов** | **deny-field-everywhere** (частично — видимость применена) · **explain-chain** |

**No special table:** кокпит — это **линза (view-def), скомпилированная generic 4-стадийным компилятором**;
никакой bespoke `cockpit`-таблицы или заранее сшитой materialized-view. Кокпит = `from·traverse·filter·shape`
над тем же графом (DEC-11: Q-7 не протаскивает PG materialized view в обход).

---

### Шаг 6 — Memory-агент воспринимает её как воспоминание

| Поле | Значение |
|------|----------|
| **actor / viewer** | `agent:memory` |
| **scope** | `project-alpha` (+ memory-пространство того же графа) |
| **node** | НЕ дублирует контент: воспоминание = **проекция** над тем же `task`; опц. ребро `memory —recalls→ task` |
| **ActKind** | `observation` (memory-агент наблюдает) — не-канон поток; опц. `domain_event`, если заводит узел-указатель |
| **relation** | опц. `recalls` (память ссылается на канон, не копирует) |
| **lens** | memory-projection (timeline / `actions-by-agent` под углом памяти) |
| **policy / resolve()** | read-path: `resolve(key, agent:memory, task)` → allow в рамке |
| **инварианты** | **I-5** память = проекция, НЕ второй источник истины · **I-2** actor+provenance (I-14 не применим: в шаге 6 нет эмбеддинга — это территория I-5) |
| **7 тестов** | **explain-chain** · подводит к **semantic-as-plugin** (память как подключаемая линза) |

**No special table:** воспоминание — **проекция/линза над существующим узлом `task`** (плюс необяз. ребро
`recalls`), а НЕ таблица `agent_memory`, дублирующая содержимое. Тот же субстрат — другой угол (I-5).
*(Phase-1: memory-агент = projection-stub, см. §What is stubbed.)*

---

### Шаг 7 — RAG находит похожее прошлое решение

| Поле | Значение |
|------|----------|
| **actor / viewer** | `agent:planner` (ищет прецедент) |
| **scope** | `project-alpha` (+ knowledge-scope прошлых решений) |
| **read** | похожие узлы `type:"decision"` из прошлого |
| **ActKind** | `access_event` |
| **relation** | similarity — **НЕ ребро**; предикат `similar` в стадии `filter`; матч несёт `_score` + provenance |
| **lens** | **semantic-lens / `view:hybrid`**: `filter:[{visible_to:$viewer}, {similar:{field, query, top_k, threshold}}]` |
| **policy / resolve()** | **порядок B: rights → similarity.** `visible_to` (resolve) отсекает недоступное ДО ANN; `_score` только пережившим clamp |
| **инварианты** | **I-14** embeddings пересобираемы, RAG≠истина · **I-7** права ПЕРЕД retrieval · **I-6** `SemanticIndexEntry` несёт projId/ver + sourceId/ver |
| **7 тестов** | **semantic-as-plugin** · **rebuild-index** (вектор сносим/восстановим) · **deny-field-everywhere** |

**No special table:** похожесть — это **предикат `similar` в `filter`** (закрытый enum, аддитивно к R-1);
вектор живёт в **производном pgvector-индексе** (пересобираем из текста-истины), а НЕ полем-истиной и НЕ
таблицей `similar_decisions`. Тот же view-компилятор + один предикат. *(Phase-1: стаб-эмбеддер, §Stubbed.)*

---

### Шаг 8 — Часть данных скрыта от определённого агента ★ флагман

| Поле | Значение |
|------|----------|
| **viewer** | `agent:crm` (ограниченный сторонний агент) |
| **scope** | `project-alpha` |
| **read** | тот же `task`, но одно поле/суб-узел (напр. `body.private_note` или связанный узел `type:"person"`) закрыт |
| **ActKind** | `access_event` (в т.ч. отказ) |
| **relation** | попытка утечки через `part-of`/traverse — блокируется recheck после expansion |
| **lens** | `visible-to` (кому что видно) |
| **policy / resolve()** | `resolve(key, agent:crm, field/node)` → **deny** как **CLAMP после fold** (не слой стека) |
| **инварианты** | **I-7** единый PEP · **I-8** deny=зажим после свёртки · **I-9** refuse-before-compute · **I-10** партиция=слой-данные |
| **7 тестов** | **deny-field-everywhere** — центральный тест всего сценария |

**No special table:** скрытое поле — это **deny-решение `resolve()` в ЕДИНОЙ точке PEP**, применяемое
единообразно на READ-путях, а НЕ таблица `hidden_fields` и НЕ отдельный проход-редактор. На путях
query · graph-traversal · vector · prompt поле не эмитится, потому что каждый из них проходит через
`resolve()` (I-7). Deny — не последний слой стека, а зажим (I-8), поэтому node-allow его не перебьёт.

**⚠ Трейс-нога — НЕ автоматически закрыта единым `resolve()` (ОТКРЫТЫЙ вопрос).** `agent_trace` (шаг 3) —
это поток **ЗАПИСИ** (свой ActKind, свой retention), а НЕ read-path, зажатый `resolve()`. Собственный
дамп рассуждений/debug агента может **повторно эмитить** запрещённое значение в обход PEP. Автоматической
гарантии нет. Требуется явный механизм — на выбор:
- **(вариант 1)** writer трейса зовёт `resolve()`/redaction **ПЕРЕД** сериализацией дампа;
- **(вариант 2)** trace — проекция, зажимаемая **на чтении** тем же PEP.

**РЕШЕНИЕ ОТКРЫТО.** До его принятия **trace-нога теста 5 (deny-field-everywhere) = НЕ верифицирована и
НЕ PASS** (см. §Open questions).

---

### Шаг 9 — Человек смотрит состояние недельной давности

| Поле | Значение |
|------|----------|
| **viewer** | `user:jenya` |
| **scope** | `project-alpha` |
| **read** | состояние `task`/`goal`, каким лог его знал на срез `recordedAt ≤ T-7d` |
| **ActKind** | `access_event` |
| **relation** | traverse по актам, не по спец-хранилищу |
| **lens** | replay/rebuild: `rebuild --from journal`, фильтр `recordedAt ≤ cut`, свёртка до точки |
| **policy / resolve()** | read-path для viewer применяется к реконструированному срезу |
| **инварианты** | **I-3** append-only даёт replay · **I-4** акт неизменяем → «во что верили тогда» сохранено · **I-5** state=свёртка, пересобираема |
| **7 тестов** | **as-of** *(post-MVP по D-5)* · **rebuild-index** |

**No special table:** прошлое состояние — это **replay актов с фильтром `recordedAt ≤ cut` и свёрткой до
точки**, а НЕ таблица `snapshots`. История ЕСТЬ журнал актов; time-travel = та же свёртка с временным
фильтром. *(Phase-1: `recordedAt` реален и полный `rebuild --from journal` доказан; as-of-СРЕЗ как линза
отложен по D-5, §Stubbed.)*

---

### Шаг 10 — Видна стоимость всей цепочки делегирования · ⚠ PROVISIONAL (см. §Open questions)

> **PROVISIONAL:** шаг 10 предполагает, что агрегация `sum(cost)` в стадии `shape` — это **ЗНАЧЕНИЕ
> закрытого enum (данные, R1)**, а не новый **fold (код, R3)**. Это ОТКРЫТЫЙ вопрос README («Заповеди
> расширяемости», граница R1/R3 view-исполнителя; НЕ-цели README запрещают новые fold'ы в Phase 1). Если
> решение = **R3**, шаг 10 **отложен / требует ADR**, а НЕ «доказан в Phase 1».

| Поле | Значение |
|------|----------|
| **viewer** | `user:jenya` |
| **scope** | `project-alpha` |
| **read** | стоимость по всему дереву делегирования агент→суб-агент |
| **ActKind** | читает `system_telemetry` (tokens/cost на актах) через обход; `access_event` на сам просмотр |
| **relation** | **`delegates-to`** (рёбра делегирования) |
| **lens** | **`cost-tree`**: `from{root}·traverse{delegates-to}·shape{sum(cost)}`, итеративный обход. ⚠ `sum(cost)` предполагается ЗНАЧЕНИЕМ enum `shape` (R1) — если новый fold (R3), шаг отложен (§Open questions) |
| **policy / resolve()** | read: `resolve()` на каждом узле обхода (не утекать стоимость скрытого суб-агента, ср. S12) |
| **инварианты** | **I-7** resolve() на traversal · **I-6** проекция id+version · cycle-guard+`max_delegation_depth` = **DoD-требование, не инвариант** (не входит в I-1..I-14) |
| **7 тестов** | **explain-chain** (стоимость = звено цепочки) · **rebuild-index** |

**No special table:** итог-стоимость — это **обход `cost-tree` по рёбрам `delegates-to` со сложением
per-act cost**, а НЕ денормализованная `cost`-колонка и НЕ таблица-роллап. Стоимость сворачивается на
чтении из того же потока актов/телеметрии; защита от бесконечности — cycle-guard (visited-set) +
`policy.max_delegation_depth`, итеративно (loop-guard лупа не защищает статический обход дерева).

---

## §Acceptance criteria

Сценарий **PASSES** тогда и только тогда, когда:

- [ ] **(a) Ноль спец-схем.** Все 10 шагов исполняются на generic-движке (envelope + 4-стадийный
      view-компилятор + `resolve()`-PEP + policy-as-data) **без единой per-step таблицы/колонки/код-ветки**.
      Каждый «no special table» из §10-шагов проверен на реальном прогоне (не на бумаге).
      **Что значит «прогон» (falsifiable):** для каждого шага acceptance = **конкретный CLI-вызов на seed-корпусе**
      с ожидаемым результатом, а не галочка «на глаз». Примеры (не исчерпывающе все 10):
      шаг 5 — `ff-engine view cockpit --viewer user:jenya` → задача видна;
      шаг 8 — `ff-engine resolve <field> --viewer agent:crm --node <task-id>` → ожидается **deny** (поле не в выводе);
      шаг 10 — `ff-engine bench cost-tree --root <agent-id> --depth 10000` → конечный итог, без зависания/переполнения стека.
- [ ] **(b) Скрытое поле отсутствует ВЕЗДЕ (шаг 8).** Поле, закрытое для `agent:crm`, доказуемо не попадает
      в **(1) обычный query · (2) graph-traversal · (3) (future) vector-search · (4) prompt** — потому что эти
      read-пути проходят единый PEP. **(5) trace-нога — НЕ гейтит в Phase 1: `agent_trace` = поток ЗАПИСИ, не
      read-path под `resolve()`; закрытие требует явного механизма (redaction перед сериализацией ЛИБО trace-
      как-проекция-на-чтении) — РЕШЕНИЕ ОТКРЫТО, до него trace-нога = НЕ верифицирована** (см. §Open questions).
      Маппится на **GPT-тест 5 (deny-field-everywhere) / I-7 + I-8**. Прогон-аналог NAIVE-vs-FIXED: видимый
      релевантный узел не вытеснен, невидимый не эмитится и не «светит» существованием.
- [ ] **(c) Rebuild из журнала доказан; as-of-срез — вне гейта Phase 1 (шаг 9).** В Phase 1 гейтит **только**
      то, что реально: полный `rebuild --from journal` до **ТЕКУЩЕГО** состояния доказан (свёртка `acts[]` без
      `snapshots`-таблицы; **I-3 / I-5**). **As-of-срез** (`recordedAt ≤ T` как линза time-travel) — **ОТЛОЖЕН
      по D-5**; в Phase 1 он **НЕ гейтит** PASS (аддитивен над теми же `acts[]`, post-MVP → **as-of / I-4**).
      Не гейтить на отложенной половине.
- [ ] **(d) Стоимость цепочки конечна и защищена (шаг 10).** `cost-tree` по `delegates-to` уважает
      **cycle-guard (visited-set) + `policy.max_delegation_depth`**, итеративный обход; на патологической
      цепочке (>10⁴, near-cycle) не зависает и не переполняет стек.
- [ ] **(e) explain-chain на любом изменении.** Для шагов 1–4/10 воспроизводится цепочка
      `source → actor → command → policy decision → act → resulting projection` (**GPT-тест 7 / I-2**).
- [ ] **(f) Fail-closed по поведению.** На невалидном узле или неразрешённом доступе движок ОТКАЗЫВАЕТ ДО
      вычисления линзы (refuse-before-compute), а не «печатает, потом падает» (**I-9**, риск R-5).

---

## §What is stubbed vs real in Phase 1 (честно)

Смысл сценария — **КОНТРАКТ, а не production-качество**. В Фазе 1 намеренно заглушено:

| Элемент | Phase-1 статус | Что реально / что стаб |
|---------|----------------|------------------------|
| **Шаг 7 · RAG / similarity** | **STUB** | Механика прав реальна (`rights → similarity`, порядок B); эмбеддер — **детерминированный стаб** (bag-of-tokens cosine, per A-2). Доказываем НЕ «поиск хорош», а что невидимый узел не эмитится и не вытесняет видимый. |
| **Шаг 6 · memory-агент** | **STUB** | Память = **projection-stub** над `task` (без нейросети памяти). Доказываем контракт «память = проекция, не второй источник истины» (I-5), не качество припоминания. |
| **Шаг 9 · as-of срез** | **PARTIAL / DEFERRED (D-5)** | `recordedAt` на актах — **реален**; полный `rebuild --from journal` (текущее состояние) — **доказан**; сам **as-of-СРЕЗ на дату** (фильтр `recordedAt ≤ T` как линза) — **отложен по D-5**. Контракт replay определён; линза time-travel — post-MVP (аддитивно над теми же `acts[]`). |
| **HTTP-поверхность** | **НЕ строится** | Только **CLI** (доверенный оператор); `viewer` через HTTP без auth = дыра S1 (R-1). Шаги 5–10 с `viewer` гоняются под CLI. |
| **Хранилище шага 7 (pgvector)** | **PARTIAL** | Вектор — производный индекс; на Фазе-1-прогоне достаточно стаб-эмбеддера в памяти; HNSW/pgvector — при интеграции движка Фазы 1/2. |

Не-стаб (реально в Фазе 1): envelope-валидатор, edge-index, 4-стадийный view-компилятор, `resolve()`-PEP
(доказан 15/15 NAIVE-vs-FIXED), `cost-tree`/`visible-to`/`actions-by-agent`, append-only journal + rebuild.

---

## §Mapping to the 7 kernel tests

| GPT-тест ядра | Какие шаги демонстрируют | Инвариант |
|---------------|--------------------------|-----------|
| **1 · add-type** (новый тип без правки таблиц ядра) | Шаг 1 (`goal`), Шаг 2 (`task`), Шаг 3 (`research`) | I-13 |
| **2 · semantic-as-plugin** (семантика как плагин, не меняя запись) | Шаг 7 | I-14 |
| **3 · rebuild-index** (снести индекс/проекцию и восстановить) | Шаг 4, Шаг 5, Шаг 7 (вектор), Шаг 9 | I-5, I-6, I-14 |
| **4 · as-of** (состояние на момент времени) | Шаг 9 *(post-MVP по D-5)* | I-3, I-4, I-5 |
| **5 · deny-field-everywhere** (запрет поля во всех путях) | **Шаг 8** (флагман), Шаг 5, Шаг 7 (rights→sim), Шаг 10 (S12) | I-7, I-8, I-9, I-10 |
| **6 · plugin-upgrade** (обновить плагин, старые данные читаемы) | ⚠️ **НЕ покрыт** этим вертикальным срезом (сценарий = один жизненный цикл, не версионирование плагина) — см. §Open questions | I-12, I-13 |
| **7 · explain-chain** (объяснить каждое изменение цепочкой) | Шаги 1, 2, 3, 4, 10 (каждый write) | I-1, I-2, I-3, I-4 |

> **Честный пробел:** тест 6 (**plugin-upgrade**) — единственный из семи, который этот вертикальный срез не
> задействует: сценарий прогоняет ОДИН жизненный цикл данных, а не эволюцию версии плагина. Кандидат — 11-й
> шаг (обновить плагин `researcher`, старый `research` остаётся читаемым) или отдельный мини-срез. Решает
> владелец (§Open questions).

---

## §Open questions (владельцу)

1. **Шаг 6 (память): проекция или узел?** Воспоминание — это *чистая проекция* над `task` (ноль новых
   узлов) или *первоклассный узел* `type:"memory"` с ребром `recalls→task`? Затрагивает I-5 и открытый
   вопрос terminology §7.2 (`assertion` как отдельный примитив vs `body`). От ответа зависит, эмитит ли
   шаг 6 канонический `domain_event` или только `observation`.

2. **Шаг 9 (as-of): тянем ли тонкий срез в Фазу 1?** Journal уже несёт `recordedAt`, значит as-of-срез =
   дешёвый фильтр `recordedAt ≤ T` + существующая свёртка. Включаем как тонкую линзу (чтобы срез был
   end-to-end исполним), или держим полностью за гейтом D-5 и в Фазе 1 доказываем лишь rebuild текущего
   состояния? Без какого-то temporal-чтения шаг 9 не замыкается «по-настоящему».

3. **Шаг 8: назвать конкретный скрытый узел/поле и ограниченного агента в seed.** По принципу-зеркалу (I-2:
   «тип без живого примера запрещён») нужен именованный пример — какое поле (`body.private_note`? связанный
   `person`?) и какой viewer (`agent:crm`?), чтобы deny-field-everywhere был **опровержимым**, а не прозой.

4. **Тест 6 (plugin-upgrade): добавить 11-й шаг или принять пробел?** Расширяем срез шагом «обновить плагин
   `researcher` — старый `research` читаем» (закрывает I-12/I-13 делом), или сознательно оставляем вне этого
   вертикала как отдельный мини-прогон?

5. **Шаг 8 (trace-нога deny-field-everywhere): каким механизмом закрываем поток `agent_trace`?** `agent_trace` —
   поток **ЗАПИСИ** (свой ActKind, свой retention), а НЕ read-path под единым `resolve()`, поэтому единый PEP
   его **не** закрывает автоматически; собственный дамп агента может повторно эмитить запрещённое значение.
   Выбрать: **(1)** writer трейса зовёт `resolve()`/redaction ПЕРЕД сериализацией, ЛИБО **(2)** trace = проекция,
   зажимаемая на чтении тем же PEP. **До решения trace-нога теста 5 = НЕ верифицирована и НЕ гейтит PASS** (крит.
   пробел флагман-теста).

6. **Шаг 10 (`sum(cost)`): агрегация `shape` — значение enum (R1) или новый fold (R3)?** README («Заповеди
   расширяемости») оставляет границу R1/R3 view-исполнителя ОТКРЫТОЙ, а НЕ-цели README запрещают новые fold'ы в
   Phase 1. Если `sum/avg/count` — ЗНАЧЕНИЕ закрытого enum `shape` (данные, R1), шаг 10 доказуем в Phase 1. Если
   это новый fold (код, R3) — шаг 10 **отложен / требует ADR**, а не «доказан в Phase 1». Нужно решение владельца/README.

---

**Статус:** `draft` — описывает контракт сценария; НЕ создаёт код и НЕ ратифицирует. Перед прогоном закрыть
open-questions 1–3 **и 5** (крит.: механизм закрытия trace-ноги флагман-теста), уточнить 6 (R1/R3 для
`sum(cost)`), и связать со списком реальных seed-узлов (`nodes.json` / `nodes-cap.json`).
