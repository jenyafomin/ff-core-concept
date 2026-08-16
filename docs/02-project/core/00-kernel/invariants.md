---
id: kernel-invariants
node_type: invariants
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
related:
  - ../../../_inbox/1-gpt-review/2-overview-direction.md
  - ../../../_inbox/1-gpt-review/1-overview-rag-vs-system.md
  - ../../../00-states/00-global-build/realization-plan/phase-1-engine/README.md
  - ../../../_log/2026-07-25-phase-1-design/SYNTHESIS-phase-1-engine.md
  - ../../../_log/2026-08-13-metric-and-minimal-slice/wave3-route/ARCH-F2-closure.design.md
---

# Инварианты ядра (Kernel Invariants)

> **PLACEMENT:** staged in `00-kernel/` autonomously per night handoff 2026-07-25; owner may relocate — reversible.

## Зачем этот файл
Субстрат — это **управляемое временное поле знаний и действий, общее для человека и агентов** (microkernel
над графом узлов). Ядро мало по коду, но **очень строгое по семантике**. Инварианты — это то, что субстрат
обязан гарантировать ВСЕГДА. Если они расплывчаты, **код начинает принимать архитектурные решения случайно**
(GPT, file 2): один разработчик тихо пишет прямой SQL в обход прав, другой лечит «дырку» ещё одним `if`,
и через месяц заявленная архитектура и фактическая расходятся.

Здесь слиты **10 инвариантов GPT** (file 2, §«Критические инварианты») с **нашими уже доказанными гарантиями**
(seed `run-view*.mjs`, ADR-0004, SYNTHESIS Фазы 1). Каждый инвариант несёт: **Statement** (жёстко) · *why* ·
*enforced at* (где в ядре/рантайме проверяется) · *violated when* (режим отказа, который стережём) ·
`proven-by:` (какой из «7 тестов ядра» GPT его доказывает, где применимо).

**«7 тестов ядра» (GPT file 2, ярлыки):** `add-type` · `semantic-as-plugin` · `rebuild-index` · `as-of` ·
`deny-field-everywhere` · `plugin-upgrade` · `explain-chain`.

---

## Группа 1 — Identity / Provenance (идентичность и происхождение)

### I-1 · Stable ID
**Любой канонический узел (entity/relation/act) имеет стабильный, глобально адресуемый ID, который НЕ
меняется при изменениях содержимого.**
- *why:* идентичность обязана переживать правки; связи держатся по `id`, а не по значению/пути файла.
- *enforced at:* `core/envelope-validator.ts` — конверт без `id` (или с изменённым `id` при апдейте) = `Problem`,
  отказ до записи. ID выдаётся один раз при создании, не переиспользуется.
- *violated when:* ID перегенерили при апдейте/переносе; идентичность привязали к пути файла или к payload-хешу;
  два разных узла получили один ID.
- `proven-by:` explain-chain · as-of *(post-MVP — as-of/time-travel отложены из MVP per D-5; не доказывает v1)*

### I-2 · Actor + Provenance на каждом изменении
**Каждое каноническое изменение несёт `actor` (кто) и `provenance` (источники/причина: `sourceIds`,
`createdBy`, `correlationId`). Анонимных мутаций не существует.**
- *why:* человек должен понимать, ПОЧЕМУ агент что-то поменял; без этого нет ни аудита, ни доверия, ни разбора.
- *enforced at:* `core/envelope-validator.ts` — act без `actor`/`provenance` отклоняется; write-path требует
  разрешённого `SubjectRef`.
- *violated when:* агент пишет «от системы» без цепочки источников; provenance теряется при проекции/перекладке;
  `actor` подставляется клиентом на доверии (см. связку с I-7).
- `proven-by:` explain-chain

---

## Группа 2 — Acts / History (акты и история)

### I-3 · Канонические изменения ТОЛЬКО через Acts (append-only)
**Состояние графа меняется исключительно добавлением актов в append-only журнал (`acts`). Прямых
in-place мутаций канона нет.**
- *why:* журнал — write-model и единственная истина изменения; из него всё воспроизводимо (replay/rebuild).
- *enforced at:* `adapters/store-md` (journal WAL) + `core` пишет только через `engine.write()` → act → journal.
  Для file-first типов журнал строится диффом ФС (git-hook/fs-watcher), т.е. движок — «первый читатель».
- *violated when:* кто-то правит current-state напрямую, минуя act; журнал редактируется задним числом;
  read/observation пишут в тот же канонический поток, что и domain-изменения (потоки нужно разделять по `ActKind`).
- `proven-by:` explain-chain, rebuild-index

### I-4 · Act неизменяем после принятия (immutable after accept)
**Принятый act больше не редактируется и не удаляется. Исправление = НОВЫЙ act (компенсация/коррекция),
а не правка старого.**
- *why:* «что мы считали правдой тогда» обязано оставаться восстановимым; иначе история — не история.
- *enforced at:* журнал append-only на уровне адаптера; `rebuild --from journal` обязан давать тот же результат
  при повторе (детерминизм).
- *violated when:* «ой, поправлю прошлый act»; компакция/snapshot трёт исходные события вместо того, чтобы быть
  производной оптимизацией поверх них.
- `proven-by:` explain-chain · as-of *(post-MVP — as-of/time-travel отложены из MVP per D-5; не доказывает v1)*

> **🔧 PENDING carve-out (Блок 3 фикс B3-b/B3-f, 2026-07-27; НЕ ратифицирован — ждёт закрытия KQ-8).**
> К I-4 готовится **ЕДИНЫЙ согласованный carve-out** из двух ортогональных клауз (сведены критиком-фиксом,
> чтобы не было двух конфликтующих патчей): **(A) retention-prunability** — не-канонические виды акта
> (`observation`/trace) policy-prunable, `domain_event` — нет; **(B) payload-separability** — иммутабельность
> покрывает координаты/`payloadHash`, но НЕ отделяемый payload (эрейж = терминальный `erased`-акт). Точный
> текст патча — `analyses/council-2026-07-25/I-15-proposal-2026-07-26.md §2-bis`. **Применить в тело I-4 —
> только по «строй» при ратификации KQ-8** (сейчас I-4 остаётся ЖЁСТКИМ как есть).

---

## Группа 3 — Projections / State (проекции и текущее состояние)

### I-5 · Текущее состояние — производная ПРОЕКЦИЯ, не второй источник истины (единственный путь записи — движок)
**(ратифицированная жёсткая часть)** Current-state — детерминированная проекция канона, которую можно
целиком снести и пересобрать. Она **НЕ является вторым источником истины**. Существует **единственный путь
записи (resolve/engine)** — ни один прямой write его не обходит.

> **PROVISIONAL — до persistence-as-policy ADR.** Уточнение «PG ≡ read-model ВСЕГДА / md-journal = write-model»
> (полная CQRS-lite раскладка) — ещё НЕ ратифицировано. Это ADR-кандидат **D-1** (persistence-as-policy), а не
> закон ядра: **D-1 допускает и PG-as-primary для DB-first типов**. Поэтому жёсткая часть инварианта —
> «единый путь записи + состояние ≠ второй источник истины»; конкретное «кто write-model, кто read-model»
> закрепит ADR по типам размещения.

- *why:* два источника истины = рассинхрон и «случайные» решения кода; логическая истина = сам граф/журнал,
  физическое размещение (кто write-model) — политика-на-тип (см. I-11), провизорно PG=read-model для file-first.
- *enforced at:* правило-замок «в PG/канон пишет только движок через `resolve()`» (риск R-2) — прямой SQL в
  обход `resolve()` запрещён; staleness-маркер на производной проекции; `rebuild --from journal` восстанавливает
  проекцию с нуля.
- *violated when:* сырой SQL/debug-скрипт пишет прямо в PG (минует все capability-гейты, проверенные лишь на
  in-memory); проекцию начинают править руками как истину; read-model расходится с журналом без маркера.
- `proven-by:` rebuild-index, as-of

> **🔧 SCOPE-уточнение (Блок 3 фикс B3-c, 2026-07-27; НЕ правит инвариант — делает явным то, что уже верно).**
> I-5 покрывает **ТОЛЬКО детерминированный current-state-fold** (свёртка `domain_event` в state), а НЕ любую
> проекцию. **Ranked/salient recall памяти — отдельная проекция под I-6 (`projectionId/Version`) + I-14
> (эмбеддинги пересобираемы, не источник истины), ВНЕ скоупа I-5** — её недетерминированность не сталкивается
> с I-5. Поэтому предлагавшийся ранее carve-out к I-5 (KQ-11-Q4) **признан мнимым и не вводится**; I-5
> остаётся жёстким для канон-fold без изменений. Разбор: `I-15-proposal-2026-07-26.md §2-ter`.

### I-6 · Проекция имеет id + version
**Каждая проекция (включая семантические индексы и материализованные view) несёт `projectionId` и
`projectionVersion`; каждый её элемент помнит `sourceId` + `sourceVersion`, из которых собран.**
- *why:* без версии нельзя понять, устарела ли проекция и по какой логике собрана; нельзя инвалидировать точечно.
- *enforced at:* контракт `Projection<TInput,TOutput>{ id, version }` (kernel); `SemanticIndexEntry` несёт
  `projectionId/Version` + `sourceId/Version`.
- *violated when:* проекция без версии — нельзя отличить «пересобрать» от «актуально»; элемент индекса не знает
  свой источник → нельзя проверить права/свежесть.
- `proven-by:` rebuild-index

---

## Группа 4 — Policy / Access (права и доступ)

### I-7 · `resolve()` — единственный PEP; НИ ОДИН путь к данным его не обходит
**Есть ровно одна функция-choke-point `resolve(key, viewer, node)` (PEP по LSR). Её проходят ОБА пути —
view-filter (видимость) и write-path (запись). Retrieval/traversal/vector-search НЕ отдают данные до
policy evaluation, и после расширения по связям права проверяются ПОВТОРНО.**
- *why:* если к данным есть хоть один обход прав — весь capability-слой обнулён; policy kernel обязан быть
  НИЖЕ линз и плагинов, а не рядом с ними (GPT file 1 §5).
- *enforced at:* `core/resolve.ts` — единственная точка; линзы зовут её как фильтр, write-path — как гейт;
  порядок retrieval строго `rights → similarity` (семантическая линза), recheck после graph-expansion.
- *violated when:* прямой SQL в PG (I-5); graph traversal или RAG вытаскивает соседей в обход `resolve()`;
  HTTP-клиент сам называет `viewer` (`user:jenya`) без реальной аутентификации → дыра S1-класса (риск R-1,
  поэтому HTTP закрыт за гейтом auth-модели, CLI = доверенный оператор).
- `proven-by:` deny-field-everywhere

### I-8 · deny / Конституция — ЗАЖИМЫ после свёртки, НИКОГДА не слой стека
**Итог доступа = `CLAMP_authority( OVERRIDE_reach( fold(combinator, orderedStack) ) )`. `deny`-пол и
Конституция-потолок применяются КАК ЗАЖИМ ПОСЛЕ свёртки, а не как ещё один участник стека.**
- *why:* если запрет — просто слой в стеке, его перебьёт слой выше по комбинатору; запрет обязан быть
  неперебиваемым потолком/полом (D3 ADR-0004).
- *enforced at:* `core/resolve.ts` (`clamp` после `fold`); `combinator` берётся из ДАННЫХ (узел
  `policy:access-priority`), реализация fold = Strategy — но зажим не конфигурируется данными.
- *violated when:* `deny` кладут в orderedStack как обычный уровень; «исключение для админа» добавляют слоем
  поверх Конституции; появляется второй «deny-как-слой» (тот же анти-паттерн, что и партиция-как-if, см. I-10).
- `proven-by:` deny-field-everywhere

### I-9 · Fail-closed ПО ПОВЕДЕНИЮ (refuse-before-compute), не по exit-коду
**При невалидных данных или неразрешённом доступе система ОТКАЗЫВАЕТ до вычисления (refuse-before-compute)
и ничего не отдаёт. Fail-closed — свойство поведения, а не только код выхода процесса.**
- *why:* seed вычислял и печатал линзы над невалидными данными, а `exit=1` ставил в конце; в HTTP exit-кода
  нет вовсе → «печатать, потом падать» = утечка (риск R-5).
- *enforced at:* валидатор конверта/рёбер/meta отказывает ДО compute; поверхность возвращает явный отказ
  (напр. 503), а не частичный результат; comb-coverage + мета-гейт — в CI.
- *violated when:* линза считается «оптимистично», отказ решается позже; ошибка глотается и возвращается
  пустой/частичный результат как будто валидный.
- `proven-by:` deny-field-everywhere

### I-10 · Партиция — слой-ДАННЫЕ в LSR-стеке, НИКОГДА не `if(project===X)`
**Разделение по проектам/пространствам (scope) выражается как ещё один слой-данные в LSR-стеке разрешения,
а не как код-ветка `if(project===X)` в движке.**
- *why:* код-ветка per-проект = второй «deny-как-слой» и заморозка модели; масштаб/партиция должны
  расширяться данными, а движок оставаться фиксированным.
- *enforced at:* партиция входит в orderedStack как данные; движок не знает конкретных имён проектов;
  ключи кэша/view не закладывают «между project и space ничего не вставят» (стек PROVISIONAL до Q-11).
- *violated when:* в ядро проникает `if (node.project === 'alpha')`; партиция (fallback масштаба Q-7)
  реализована ветвлением кода, а не слоем-данными.
- `proven-by:` deny-field-everywhere

---

## Группа 5 — Storage (хранение)

### I-11 · Логическая истина = граф; физическое размещение = политика-на-тип
**Единственная логическая истина — сам граф (узлы+рёбра). ГДЕ узел лежит физически (PG по умолчанию /
файл опт-ин) — это НАСТРОЙКА на тип (policy-узел), а не глобальный закон и не источник истины.**
- *why:* развилка «файл против базы» ложная — смешивает истину (модель) и размещение (данные-настройку);
  преимущество — не «один движок БД», а «одна адресуемая модель» (GPT file 1 §1); партиция — data-layer.
- *enforced at:* `store-md` (истина+journal для file-first) · `store-pg` (read-model, DB-first по умолчанию),
  оба за `StorePort`; тип узла несёт `policy` размещения (как `knowledge.mode = embed|ref`).
- *violated when:* «файл всегда истина» распространяют на рабочие данные движка (клиенты, снапшоты, трейсы);
  или наоборот PG объявляют самоцелью; размещение хардкодят в ядре вместо policy-узла.
- `proven-by:` rebuild-index

---

## Группа 6 — Plugins / Evolution (плагины и эволюция)

### I-12 · Удаление плагина НЕ удаляет канонические данные автоматически
**Снятие/отключение плагина (тип, линза, политика, агент) не влечёт авто-удаления канонических узлов,
созданных с его участием. Данные переживают плагин.**
- *why:* плагин — актор с паспортом и словарём, а не владелец данных; иначе удаление модуля разрушает канон.
- *enforced at:* runtime plugin registry разводит «код плагина» и «канонические узлы»; деинсталляция снимает
  только capability/типы-определения, узлы остаются читаемыми (возможно как «неизвестный тип»).
- *violated when:* каскадное удаление узлов при снятии плагина; данные хранятся ВНУТРИ плагина, а не в графе;
  «что такое удаление» не определено (см. open-questions).
- `proven-by:` plugin-upgrade

### I-13 · Старые данные читаемы после обновления определения типа / плагина
**После обновления `meta:type` / плагина ранее записанные узлы остаются читаемыми. Эволюционирует модель,
а не фундамент; новый тип добавляется как ДАННЫЕ+конфиг, без перестройки физического хранилища.**
- *why:* event-sourcing требует schema-evolution и backward-compat; «никаких миграций» — про физическую
  storage-схему, но определения типов/валидация всё равно эволюционируют (GPT file 1 §3).
- *enforced at:* версионированный реестр типов (`meta:type`/`meta:pred`); валидатор терпит старые версии payload;
  добавление типа = новый узел реестра, не DDL ядра.
- *violated when:* апдейт type-def делает старые узлы невалидными/нечитаемыми; добавление типа требует правки
  физических таблиц ядра; нет версии у определения → нельзя интерпретировать старый payload.
- `proven-by:` add-type, plugin-upgrade

---

## Группа 7 — Semantic / Retrieval (семантика и поиск)

### I-14 · Embeddings полностью пересобираемы и НИКОГДА не источник истины
**Векторный индекс/эмбеддинги — расходуемая производная проекция. Их можно целиком снести и восстановить
из канона без потери знания. RAG — подключаемая линза, а НЕ источник истины.**
- *why:* «не делай RAG источником истины» (GPT file 1, резолюция); эмбеддинги привязаны к модели/версии и
  устаревают — знание обязано жить в канонических узлах, а не в индексе.
- *enforced at:* семантика = плагин/линза (`similar`-предикат в `filter`, pgvector — производный индекс);
  `SemanticIndexEntry` несёт `embeddingModel/Version` + `sourceId/Version`; `rebuild-index` собирает с нуля.
- *violated when:* факт существует ТОЛЬКО в векторном индексе; поиск возвращает данные до проверки прав
  (нарушая I-7); смена embedding-модели теряет знание, потому что канон не хранил исходный текст.
- `proven-by:` rebuild-index, semantic-as-plugin

---

## Группа 8 — Structural Predicates / Ownership (структурные предикаты и владение)

### I-16 · Kernel-locked structural predicates: `owner`=one, `referent`=many
**Proposed — status: review (owner-кивок ЗАПРОШЕН, ответа ещё нет — 2026-08-14).** ⚠️ Прежняя метка
«Approved задним числом» ОТОЗВАНА: форма и enforcement уже в коде, но kernel-lock `owner`/`referent`
как ROOT-инвариант — НОВОЕ kernel-policy решение (не наследует одобрение `same-as`), требует явного «да»
владельца с трейсом ДО статуса Approved (см. ARCH-F2-closure.design.md §3 "Границы / owner-pending" п.1). Системные предикаты `owner` (единственный
владелец единицы) и `referent` (множественные референты единицы) кардинально ЗАПЕРТЫ в ядре
(`LOCKED_PREDICATES`, `core/predicates.ts`) — ни один тенантский реестр (default или caller-supplied) не
может их переопределить. `owner` всегда `'one'` (переназначение владельца REPLACE-фолдит прежнее ребро —
передача, не накопление); `referent` всегда `'many'` (референты накапливаются; реестр не может сузить до
`'one'`).
- *why:* `owner`/`referent` — не доменная лексика (не нарушают G1 «ядро не знает доменных существительных»),
  а системные роли, несущие суверенность/множественность единицы (Ц-5 суверенность / Ц-7 согласие) — сам
  субстрат доверяемой композиции. Если бы кардинальность была tenant-injected, забытая регистрация
  `{owner:'one'}` в ОДНОМ из вызовов `foldInto`/`MemoryStore` тихо превратила бы передачу владения в
  накопление (два «владельца» вместо замены) — необнаружимо (`admit()`/`foldEdges` не флагуют gap
  реестра). Тот же класс мины, что уже закрыт для `same-as` (GAP 3(b)), воспроизведённый для роли с более
  высокой ставкой.
- *enforced at:* `core/predicates.ts::cardinalityOf` — `LOCKED_PREDICATES['owner']='one'` /
  `LOCKED_PREDICATES['referent']='many'`, консультируется ПЕРЕД любым реестром (тот же choke-point,
  обобщённый из прежнего `same-as`-only лока); `foldEdges` REPLACE-фолдит `owner`, ACCUMULATE-фолдит
  `referent`, независимо от того, что декларирует вызывающий реестр. `assertForwardMonotone` отдельно
  ловит попытку сузить смежные (незапертые) предикаты many→one.
- *violated when:* тенантский реестр объявляет `owner:'many'` (co-ownership тихо становится
  представимым состоянием) или `referent:'one'` (replay истории референтов дропает историю на
  `rebuild-from-journal`); либо кто-то удаляет `owner`/`referent` из `LOCKED_PREDICATES` без owner-кивка
  (имена зарезервированы как системная вокабуляра — INV-C3.3, ARCH-F2-closure.design.md §3.3).
- `proven-by:` `packages/engine/test/f2-closure.test.ts` (описание C3 exploit-тесты) — hostile-реестр
  (`{owner:'many', referent:'one'}`) не может переопределить lock; два owner-reassignment акта фолдятся
  в РОВНО одно ребро (freshest wins); два referent-акта сосуществуют даже под `{referent:'one'}`.

## Быстрая карта: инвариант → тест ядра
| Инвариант | Тест GPT (`proven-by`) |
|---|---|
| I-1 Stable ID | explain-chain · as-of *(post-MVP, D-5)* |
| I-2 Actor+Provenance | explain-chain |
| I-3 Append-only Acts | explain-chain, rebuild-index |
| I-4 Act immutable | explain-chain · as-of *(post-MVP, D-5)* |
| I-5 State=projection (engine-only PG write) | rebuild-index, as-of |
| I-6 Projection id+version | rebuild-index |
| I-7 resolve() single PEP | deny-field-everywhere |
| I-8 deny/Конституция = clamp | deny-field-everywhere |
| I-9 Fail-closed by behavior | deny-field-everywhere |
| I-10 Partition = data-layer | deny-field-everywhere |
| I-11 Truth=graph, placement=policy | rebuild-index |
| I-12 Plugin removal ≠ delete | plugin-upgrade |
| I-13 Old data readable | add-type, plugin-upgrade |
| I-14 Embeddings rebuildable | rebuild-index, semantic-as-plugin |
| I-16 Kernel-locked owner/referent | f2-closure.test.ts (C3 exploit) |

## Что осталось нерешённым (кандидаты в open-questions)
- **«Что считается удалением»** (tombstone-act vs скрытие проекцией vs физическое стирание) — I-12/I-4 это
  предполагают, но не определяют. **🔧 (2026-07-27, Блок 3):** семантика ведётся в **ADR-0007** (режимы
  `hide|prune|shred`, admission-gate) + предлагаемый **I-15** (payload-separability + erasure-as-act) с единым
  carve-out к I-4 (`I-15-proposal §2-bis`). Пока НЕ ратифицировано (KQ-8 OPEN, `shred`-против-file-first — за
  Блоком 4). Внести I-15 + carve-out I-4 в тело этого файла — по «строй» при закрытии KQ-8.
- **Можно ли менять policy тем же механизмом, который policy контролирует** (self-reference) — граница I-7/I-8:
  policy-узлы это данные, но их применение ниже линз; правка политики должна ли идти через тот же resolve()?
  См. `terminology.md` §7 — там дан **провизорный** ответ (meta-cap-гейт `core:manage-*` как точка контроля);
  **финально — открытый вопрос до persistence/policy ADR**. Здесь не переформулируем как решённое.
- **Bitemporal (`system time` vs `valid time`)** — GPT рекомендует, наш MVP as-of/time-travel ОТЛОЖИЛ (D-5).
  Пока НЕ инвариант ядра; кандидат при разморозке temporal (иначе I-4 «что было правдой тогда» неполон).
- **Разделение потоков `ActKind`** (domain_event / observation / access_event / agent_trace / telemetry) —
  упомянуто в I-3, но retention/replay/authority по потокам ещё не зафиксированы как инвариант.
