---
id: kernel-terminology
node_type: terminology
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
related:
  - ../../../_inbox/1-gpt-review/1-overview-rag-vs-system.md          # 4 кубика vs kernel-strict, actor≠scope, bitemporal
  - ../../../_inbox/1-gpt-review/2-overview-direction.md              # список terminology.md, Envelope, PluginManifest
  - ../../../00-states/00-global-build/realization-plan/phase-1-engine/README.md   # resolve()/PEP/LSR, view 4 стадии, StorePort/SurfacePort
  - ../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md   # scope, LSR, capability, actor, combinator
---

# Terminology — словарь ядра (kernel glossary)

> **PLACEMENT:** staged in `00-kernel/` autonomously per night handoff 2026-07-25; owner may relocate — reversible.

> **Зачем этот файл.** Пока термины не закреплены, «код начинает принимать архитектурные решения случайно»
> (GPT-review 2, §terminology.md). Здесь — точные определения 20+ примитивов: у каждого крепкая дефиниция,
> отличие от соседнего путающего термина и строка **NOT** (чем он НЕ является). При конфликте с ADR/Spec —
> побеждает ADR/Spec; этот файл описывает, а не решает.

---

## 0. Два уровня словаря — ПУБЛИЧНЫЙ и ЯДЕРНО-СТРОГИЙ

Ядро говорит на более строгом языке, чем то, что показываем человеку. Не путать уровни.

| Уровень | Примитивы | Для кого | Источник |
|---------|-----------|----------|----------|
| **PUBLIC (4 кубика)** | Вещь · Связь · Акт · Проекция | объяснение человеку, UI, маркетинг | GPT-review 1 §«Оценка четырёх кубиков» |
| **KERNEL-STRICT (6 примитивов)** | Entity · Assertion · Relation · Event · Projection · Policy | инварианты движка, код ядра | GPT-review 1 §«внутри ядра я бы жёстко различал» |

Правило перевода: публичная **Вещь** внутри ядра расщепляется на **Entity** (идентичность) +
**Assertion** (что про неё утверждается). Публичный **Акт** расщепляется на **Event** (что изменило
состояние) + не-канонические потоки (trace/access/telemetry). Пользователю оставляем 4 кубика; ядру
нужны более строгие инварианты — это сознательное решение, а не разночтение.

---

## 1. PUBLIC-модель (4 кубика)

### thing — «вещь»
Всё, что существует в субстрате и имеет стабильный идентификатор: задача, человек, сообщение, метрика,
память агента, файл, промпт, конфиг. Публичное, крупнозернистое понятие «узел графа».
- **vs unit:** `thing` — концептуальный ярлык («что-то существует»); `unit` — та же вещь как
  адресуемая единица работы движка (конверт с id). Практически синонимы на публичном уровне; `unit` —
  реализационный термин.
- **vs entity:** `thing` = `entity` + `assertion` вместе взятые (идентичность + утверждения о ней). Ядро
  их различает, публика — нет.
- **NOT:** `thing` — НЕ обязательно файл. Файл — лишь ОДИН тип вещи (рефрейм msg 141). Формат agent-first,
  не notes-first.

### relation — «связь» (публичный слой; ядерный см. §2)
Как вещи соотносятся: `task —blocks→ task`, `message —about→ project`. На публичном уровне — ребро графа.
- **vs edge:** «связь» — понятие; `edge` — её физическое хранение (пара в поле `edges` конверта,
  инверсно индексируется, phase-1 `edge-index.ts`).
- **NOT:** связь — НЕ атрибут внутри `body`; это отдельно адресуемое ребро (или Relation-узел, §2).

### act — «акт»
Публичное имя для «что произошло»: создание, изменение, наблюдение, команда, действие агента. **Акт
первичен, память и интерфейсы — проекции** (northern star, «The Log is the Agent»).
- **vs event:** ядро сужает: канонический, меняющий-состояние акт = **Event**; прочие акты (чтение,
  трейс агента, телеметрия) делят общий конверт, но НЕ канон (§3). Не всякий `act` — `Event`.
- **vs trace:** `act`/`Event` — вещество ЗНАНИЯ (истина субстрата); `trace` — вещество СЛЕДА (что
  случилось в сессии, append-only указатели). Не смешивать (doc-tree закон №1).
- **NOT:** `act` — НЕ мутация состояния на месте. Каноническое изменение происходит ТОЛЬКО через акт;
  сам акт после принятия неизменяем (invariant).

### projection — «проекция»
Вычисленное представление субстрата: текущее состояние, timeline, граф связей, RAG-контекст, UI-вид.
Детерминированная функция над узлами; имеет `id` и версию; полностью пересобираема из канона.
- **vs lens:** `projection` — общий класс (любой вычисленный вид); `lens` — КОНКРЕТНЫЙ переиспользуемый
  запрос-проекция (`cost-tree`, `visible-to`, `actions-by-agent`), исполняемый view-компилятором. Линза —
  это оформленная, именованная проекция. Всякая линза — проекция; не всякая проекция оформлена как линза.
- **vs knowledge:** проекция — ПРОИЗВОДНАЯ; knowledge (канон) — истина. Проекцию можно снести и пересобрать
  без потери знания (invariant: embeddings/read-model rebuildable).
- **NOT:** проекция — НЕ второй источник истины. Текущее состояние — проекция, а не параллельный канон
  (GPT invariant #4). PostgreSQL read-model = проекция, одноразово rebuildable (phase-1 CQRS-lite).

---

## 2. KERNEL-STRICT примитивы (строже 4 кубиков)

### entity — сущность (ядро)
Носитель СТАБИЛЬНОЙ ИДЕНТИЧНОСТИ. Только `id` + факт существования; переживает все изменения своих
утверждений. «Что остаётся тем же самым, когда всё про него поменялось».
- **vs assertion:** entity — «есть нечто с этим id»; assertion — «про это нечто верно X». Идентичность vs
  содержание.
- **NOT:** entity НЕ хранит данные напрямую — данные живут в assertions/`body`. Смена данных ≠ смена entity.

### assertion — утверждение (ядро)
Утверждение чего-либо об entity (значение поля, атрибут, статус). Может быть темпоральным и провенансным.
*(⚠ не ратифицировано ADR; принятие `assertion` как отдельного 7-го примитива ядра — открытый вопрос, см. §7 п.2:
возможно, конверт `body` уже покрывает assertion.)*
- **vs event:** assertion — состояние-как-факт («задача имеет приоритет high»); event — изменение,
  породившее это состояние. Assertion может быть проекцией свёртки events.
- **vs knowledge:** assertion — единица knowledge; knowledge — весь их корпус.
- **NOT:** assertion — НЕ обязательно истина в мире. Может нести эпистемический статус (факт vs
  предположение агента) — метка, не стена (CLAUDE.md рефрейм).

### relation — связь (ядро)
Первоклассное, отдельно адресуемое ребро между entity: `(source, predicate, target)`. В ядре — примитив
наравне с entity, НЕ подвид assertion.
- **vs assertion:** relation связывает ДВА entity; assertion описывает ОДНО. (Открытый вопрос GPT: relation
  — самостоятельная unit или отдельный primitive? Здесь фиксируем: **отдельный примитив**, но хранится в
  конверте узла-источника как пара `edges` — см. phase-1.)
- **NOT:** relation — НЕ поле `body`. Права/видимость могут утекать через связи, поэтому связь адресуема и
  подчинена policy (риск «обход доступа через relation», GPT-review 2 §4).

### event — событие (ядро)
Канонический, append-only, неизменяемый ФАКТ изменения или наблюдения, меняющий состояние. Источник
истины; текущее состояние — его свёртка (reducer).
- **vs act (public):** event — подмножество актов, которое КАНОНИЧНО и меняет состояние. `ActKind` GPT
  различает: `domain_event` (это event) vs `observation | command | access_event | agent_trace |
  system_telemetry` (общий конверт, но иные retention/authority/replay — НЕ канон-состояние).
- **vs trace:** event живёт в domain-log (knowledge); agent_trace/access/telemetry — отдельные потоки-следы.
- **NOT:** event — НЕ «любой read». Чтение — `access_event`, отдельный поток; иначе журнал превращается в
  смесь бизнес-фактов, аудита и телеметрии (GPT-review 1, явное предупреждение).

### projection (ядро)
См. §1 «проекция» — на уровне ядра это КОНТРАКТ: `Projection<TInput,TOutput>` c `id` + `version` +
детерминированным `execute`. Инвариант: имеет версию и пересобираема.

### policy — политика (ядро)
Декларативная модель, определяющая ДОПУСТИМОСТЬ операции (что можно читать/писать/исполнять). Хранится как
ДАННЫЕ (узел `policy:*`, напр. `policy:access-priority`, `policy:constitution`), но её ПРИМЕНЕНИЕ живёт
ниже обычных линз/плагинов (policy kernel / PEP).
- **vs capability:** policy — ПРАВИЛО («каков порядок разрешения, каков пол/потолок»); capability — ВЫДАННОЕ
  ПРАВО конкретному actor («может `core:write-knowledge`»). Policy определяет решение; capability —
  входной токен в это решение.
- **vs lens/projection:** policy — данные, как и они, НО enforcement нельзя делать обычной проекцией —
  иначе циклы и обход. «Одна декларативная модель — разные trust boundaries» (GPT-review 1 §5).
- **NOT:** policy — НЕ обычный плагин и НЕ обычная линза. «Не делай права обычным плагином» (GPT резолюция).
  Пол (`deny`) и потолок (Конституция) — ЗАЖИМЫ после свёртки, не выразимы данными (ADR-0004 D3).

---

## 3. Оси адресации — ФОРМУЛА и почему scope ≠ actor

Каноническая формула адресации (GPT-review 1 §2, исправление «проекты — не значение actor»):

```
thing × actor × scope × lens × time
```

Пять НЕЗАВИСИМЫХ осей. Главная развилка — **scope ≠ actor**, их постоянно смешивают.

### actor — актор
КТО действует. Значения оси: `user` · `agent` · `plugin` · `system`. Носитель провенанса и capability.
- **vs viewer:** actor — кто ДЕЙСТВУЕТ (пишет акт); viewer — кто СМОТРИТ (параметр `resolve(key,viewer,node)`
  на read-path). Часто один субъект, но роли разные: запись vs видимость.
- **vs scope:** ⚠️ **РАЗНЫЕ ОСИ.** actor = субъект (user/agent/plugin/system); scope = пространство
  (project/module/space). «planning-agent» — actor; «project-alpha» — scope. Не класть проект в actor.
- **NOT:** actor — НЕ проект/модуль. Проект — это scope. (Ключевая ошибка, которую этот файл фиксирует.)

### scope — область/пространство
ВНУТРИ какого пространства происходит операция. Значения оси: `project` · `module` · `space` · `team`.
Ось containment для разрешения доступа: стек `node > space.override > space.default > project > module`
(ADR-0004 D1, LSR reach-ось).
- **vs actor:** см. выше — scope = пространство, actor = субъект.
- **vs capability:** scope — ГДЕ действует право; capability — КАКОЕ право. Грант = capability × scope
  («может писать knowledge В project-alpha»).
- **NOT:** scope — НЕ пользователь и НЕ агент. И НЕ жёсткий слой кода `if(project===X)` — партиция есть
  ещё один слой-ДАННЫЕ в LSR-стеке (phase-1 §risks).

### time — время (bitemporal)
Ось истории. Различаем ДВА времени (GPT-review 1 §2, XTDB/Datomic-модель):
- **`recordedAt`** (system time) — когда система УЗНАЛА/записала факт.
- **`validFrom` / `validTo`** (valid time) — когда факт был ДЕЙСТВИТЕЛЕН в реальном мире.
- Различает «что мы СЧИТАЛИ правдой 3 июля?» vs «что БЫЛО правдой 3 июля с учётом поздних правок?».
- **NOT:** одно поле `timestamp` НЕ достаточно. Полная битемпоральность отложена за MVP (phase-1 D-5),
  но конверт закладывает оба поля сразу.

### lens — линза
См. §4 (движковый термин). Как ось формулы — «под каким углом читается вещь для этого потребителя».

---

## 4. Движковый словарь (engine vocabulary — phase-1)

### unit — единица
Адресуемая единица субстрата = узел-конверт, с которым работает движок. Реализационное имя для `thing`.
- **vs thing/entity:** см. §1/§2. `unit` — операционное («то, что грузит loader, валидирует
  envelope-validator»).
- **NOT:** unit — НЕ обязательно «1 файл = 1 узел». Файл = бандл узлов (phase-1 D-1); unit — логическая, не
  файловая единица.

### envelope — конверт
Единая обёртка КАЖДОГО узла — общий контракт полей поверх любого типа. 10-полный конверт (ADR-0004
Appendix A): `id · type · state · edges · view · visibility · access · acts · policy_ref · body`. GPT-форма
`RecordEnvelope`: + `kind · scopeId · actorId · version · provenance · temporal{recordedAt,validFrom,validTo}`.
- **vs body:** envelope — ОБЩИЕ поля (движок их знает); `body` — тип-специфичный payload (движок НЕ
  интерпретирует, «не знает, что такое задача»).
- **NOT:** envelope — НЕ схема домена. Ядро знает конверт, но НЕ знает «task/CRM/calendar» (GPT-review 2
  §Kernel: «ядро не должно знать»).

### lens — линза
Именованный, переиспользуемый view-запрос, скомпилированный в 4 стадии **`from · traverse · filter ·
shape`** (phase-1 R-1). Три доказанных: `cost-tree`, `visible-to`, `actions-by-agent`.
- **vs projection:** линза — оформленная проекция (см. §1). Линза = конкретный view-def; projection =
  общий класс.
- **vs semantic-lens:** обычная линза фильтрует по структуре; semantic-lens добавляет предикат `similar`
  в стадию `filter` (см. ниже).
- **NOT:** линза — НЕ обход прав. Стадия `filter` включает `resolve()` (видимость = тот же запрос);
  порядок **rights → similarity**.

### resolve() / PEP / LSR
- **resolve()** — единый choke-point разрешения: `resolve(key, viewer, node) = clamp( fold( combinator,
  orderedStack, safeDefault ) )` (ADR-0004 D0). Зовут ОБА пути: view-filter (видимость) и write-path (запись).
- **PEP** (Policy Enforcement Point) — та точка, где `resolve()` физически применяется; единственные врата.
- **LSR** (Layered Scope Resolution) — примитив «свернуть упорядоченный стек слоёв в эффективное значение».
  Доступ — инстанс №1; тот же примитив: каскад промптов (ACCUMULATE), конфиги (MERGE), политики (VETO/CLAMP).
- **NOT:** resolve() — НЕ только про доступ. Это общий контракт разрешения слоёв (ADR-0004 D0).

### combinator — комбинатор
Правило свёртки стека, ВЫБИРАЕМОЕ из ЗАКРЫТОГО enum как данные: `override | accumulate | merge | veto/clamp`
(ADR-0004 D2). Шов controlled/flexible: ВЫБОР = данные (R1); РЕАЛИЗАЦИЯ = движок (R3).
- **NOT:** нельзя ПИСАТЬ новый combinator данными — новый fold = код + ADR.

### capability — возможность
Именованное право (`core:write-knowledge`, `core:manage-access`, `external-irreversible`), которое субъект
должен ПРЕДЪЯВИТЬ, чтобы операция прошла. Плоскость управления (`core:manage-*`) гейтится отдельно от
рядовых данных (ADR-0004 D4) — нельзя выписать себе права дешёвым `write-knowledge`.
- **vs policy:** capability — токен-право (у actor); policy — правило разрешения (в данных). См. §2 policy.
- **vs grant:** grant = выданная привязка capability к subject × scope (узел). Capability — тип права;
  grant — его выдача.
- **NOT:** capability — НЕ самодекларируемая метка. Клапан согласия сверяет `irreversible`-флаг на самой
  `meta:cap/*`, а не строку на узле (ADR-0004 D5).

### viewer — смотрящий
Субъект, от чьего имени исполняется чтение/линза: параметр `viewer` в `resolve(key,viewer,node)`. Через
HTTP без auth-модели viewer подделывается (`user:jenya`) → дыра S1 → phase-1 держит строго CLI (доверенный
оператор), HTTP за гейтом.
- **vs actor:** viewer = кто смотрит (read); actor = кто действует (write). См. §3.
- **NOT:** viewer — НЕ обязательно человек; агент/плагин тоже viewer.

### StorePort / SurfacePort
Порты гексагональной архитектуры (phase-1). **StorePort** — контракт хранилища корпуса (адаптеры
`store-md` = истина+journal, `store-pg` = read-model, `store-memory` = тесты). **SurfacePort** — контракт
интерфейса (`cli` phase-1, `http` за гейтом).
- **NOT:** порт — НЕ адаптер. Порт = контракт (в ядре); адаптер = реализация (снаружи). Ядро-домен без I/O.

---

## 5. Плагины, провенанс, следы

### plugin — плагин
Подключаемый модуль, поставляющий ДАННЫЕ + декларативный манифест, не трогая движок. `PluginManifest`
(GPT-review 2): `provides{types, relations, projections, policies, actions, agents}` · `requires{capabilities,
pluginVersions}` · `permissions{read, write, execute, network}`. «Плагин как актор с паспортом и словарём».
- **vs actor:** plugin МОЖЕТ быть actor (пишет акты от своего имени), но по сути — пакет расширения.
- **vs capability:** plugin ТРЕБУЕТ capabilities (в манифесте); capability — само право.
- **NOT:** plugin — НЕ ядро. RAG, semantic retrieval, планировщик, CRM, workflow — всё плагины; policy
  enforcement — НЕ плагин (GPT: «не делай права обычным плагином»). Удаление плагина НЕ удаляет
  канонические данные (GPT invariant #9).

### provenance — провенанс
Проверяемое происхождение узла/акта: `sourceIds · createdBy · correlationId`. Любое агентное изменение
имеет actor + provenance (GPT invariant #6). Позволяет объяснить цепочку `source → actor → command →
policy decision → act → resulting projection`.
- **vs trace:** provenance — часть КАНОНА (кто/из чего создал факт, хранится в конверте); trace — сессионный
  СЛЕД рассуждений агента (отдельный поток, не канон).
- **NOT:** provenance — НЕ телеметрия. Это происхождение факта, не latency/tokens.

### trace — след
Append-only записи хода работы: рассуждения агента, вызовы инструментов, делегирование (`agent_trace`);
плюс сессионные логи проекта. Дом — `docs/_log/` (gitignored), только УКАЗАТЕЛИ на knowledge (doc-tree
закон №1: два вещества не мешать).
- **vs event:** trace — «что произошло в СЕССИИ/агенте»; event — канонический факт, меняющий состояние
  субстрата. Разные retention/authority/replay.
- **vs knowledge:** trace ССЫЛАЕТСЯ на knowledge, не хранит его. Trace эфемернее.
- **NOT:** trace — НЕ источник истины и НЕ идёт в domain-log. Иначе журнал = смесь фактов/аудита/телеметрии.

### knowledge — знание
Каноническое, переживающее сессии содержание субстрата: entities, assertions, relations, canonical events —
всё, из чего пересобираемы любые проекции. «Истина: как устроено».
- **vs trace:** knowledge = истина (дерево, переживает сессии); trace = след (что произошло, эфемерно).
  Первый несокращаемый закон doc-tree.
- **vs projection:** knowledge = канон-истина; projection = производный вид (сносим и пересобираем).
- **NOT:** knowledge — НЕ файлы/заметки. Это рабочий СУБСТРАТ для ИИ-агентов, agent-first (CLAUDE.md msg 141).
  Semantic index / embeddings — НЕ knowledge (их можно перестроить без потери, GPT invariant #8).

### similarity / semantic-lens — семантическая линза
RAG как ПОДКЛЮЧАЕМАЯ проекция, а не канон. Предикат `similar(query)` в стадии `filter` линзы; вектор —
производный индекс (pgvector), пересобираемый из канона. Порядок запроса: **rights → similarity → expand →
re-check rights → rerank → load canonical → assemble context** (GPT-review 1 §retrieval pipeline).
- **vs lens:** semantic-lens — линза с `similar`-фильтром; сам pipeline тяжелее, чем `filter.similar(query)` —
  это полный retrieval внутри границ policy kernel.
- **NOT:** semantic-lens — НЕ источник истины. «Не делай RAG источником истины» (GPT резолюция). Embeddings —
  расходуемая производная; каждый `SemanticIndexEntry` несёт `sourceId/version`, `actorScope/knowledgeScope`,
  `provenanceIds` — права проверяются ДО выдачи (бьёт OWASP #2).

---

## 6. Соответствие GPT-примитивов ↔ НАШ канон

Где называют одно и то же — говорим прямо; где расходятся — НАШ термин канонический, GPT — алиас.

| GPT-review термин | НАШ канонический | Статус |
|-------------------|------------------|--------|
| Entity | thing/unit (public) → entity (kernel) | тот же; мы расщепляем на entity+assertion |
| Assertion | (новое) assertion | принимаем в kernel-strict слой |
| Relation | связь / edge-пара | тот же; у нас хранится в конверте источника |
| Event | акт (public) → event (kernel) | тот же; мы уже различаем ActKind-потоки |
| Projection | проекция / lens | тот же; `lens` = оформленная проекция |
| Policy | policy-узел + LSR | тот же; enforcement = наш `resolve()`/PEP |
| Capability / grant | capability / grant | тот же (ADR-0004 D4) |
| RecordEnvelope | envelope (10-полный) | тот же контракт; GPT-поля — доп. явные |
| PluginManifest | plugin + манифест | тот же |
| system time / valid time | recordedAt / validFrom-validTo | тот же (bitemporal) |
| actor / scope (раздельно) | actor-ось / scope-ось | тот же; мы фиксируем scope≠actor как закон |
| SemanticIndexEntry | semantic-lens индекс | тот же; у нас — производный pgvector |

---

## 7. Открытые вопросы (для роутинга в open-questions)

Не решаем здесь — фиксируем, чтобы не решить «случайно кодом»:

1. **Relation — самостоятельная unit или отдельный primitive?** Здесь фиксируем «отдельный примитив,
   хранится в конверте источника» — но это НЕ ратифицировано ADR (GPT-review 2 §open-questions).
2. **Assertion как отдельный примитив** — принимаем ли kernel-strict расщепление `thing = entity +
   assertion`, или в нашем конверте `body` уже покрывает assertion? (Терминологический шов public/kernel.)
3. **Что считается «удалением»?** (GPT open-question) — статус-архивация vs физическое удаление; для
   entity/event/plugin ответы разные.
4. **Projection — чистая функция или допускает side effects?** (GPT open-question) влияет на определение
   `lens`.
5. **Можно ли менять policy тем же механизмом, который policy контролирует?** — **Провизорно:** meta-cap-гейт
   (`core:manage-*`) + Конституция-неперезаписываемость — точка контроля; но полноценный ответ
   (само-референтность policy) — **ОТКРЫТЫЙ вопрос до persistence/policy ADR**, не финал. (Согласовано с
   `invariants.md` §«Что осталось нерешённым».)
