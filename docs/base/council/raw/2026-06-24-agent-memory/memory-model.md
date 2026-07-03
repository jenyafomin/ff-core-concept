---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Type: architecture-research
Subject: Память агента и память пользователя КАК КЛАССЫ УЗЛОВ в нашем графе (Agent & User memory as node-classes)
Stage: L3 Research / L5 Solution-sketch (DESIGN, no code)
Related:
  - docs/architecture/ADR/ADR-0002-thin-passport.md (тонкий паспорт — несущая модель)
  - docs/product/SYNTHESIS-2026-06-24-competitors.md (4 паттерна A/B/C/D; мы = C∩D)
  - docs/graph-example/ (стиль ячеек: file-node-ts, insight-multidimensionality)
  - docs/STATE.md (фаза = DESIGN; 7 инвариантов на ратификацию; кандидат ADR-0004 «Движок»)
---

# Память агента / пользователя как классы узлов (Agent & User memory as node-classes)

> **Тезис (one-liner).** Память — это НЕ отдельная подсистема и НЕ отдельное хранилище. Память = **обычные узлы
> графа**, размеченные существующими полями паспорта (`type · epistemic · sensitivity · source · principal`) и
> связанные **существующими рёбрами** со своим субъектом и со своим принципалом. Семантическая / эпизодическая /
> процедурная память (semantic / episodic / procedural, LangMem) ложатся на TYPE-узлы. Тиры (hot/warm/cold, паттерн B)
> = **ЛИНЗА-вид (view)**, а не хранилище. Консолидация = агент-актор + ребро + лестница `epistemic`. Забывание =
> `archived` + инвалидация ребра (паттерн C, Zep/Graphiti), без удаления.
>
> **Главный вывод по полям: НИ ОДНОГО нового обязательного поля паспорта не требуется.** Один опциональный,
> движком-проставляемый, НЕ-авторитетный сигнал `heat` обсуждается ниже (§5) — но это поле ДВИЖКА (как `stale`/
> `derived`/`canonical_id`), не несущая ось паспорта. Вариант без него тоже работает.

---

## 0. Почему это вообще ложится на нашу модель без боли

Наша модель уже на пересечении **C (темпоральный граф знаний) ∩ D (файлы-как-истина, agent-curated)** — ровно там,
где живёт «правильная» память агента (SYNTHESIS-2026-06-24-competitors §2). То, что индустрия строит как отдельный
memory-store, у нас УЖЕ есть как граф:

| Что нужно памяти | Чем уже закрыто в ADR-0002 | Не нужно изобретать |
|---|---|---|
| «Это факт или догадка?» | `epistemic: draft\|proposal\|hypothesis\|fact\|archived` | новый статус памяти |
| «Чья это память / приватно ли?» | `sensitivity` (приватность) ⟂ `principal` (чья) | scope-таблица памяти |
| «Откуда узнали?» (provenance) | `source: human\|agent\|connector` + `external_ref` | отдельный provenance-store |
| «Память о чём?» | ребро `about` / `home` к субъекту | foreign-key субъекта |
| «Забыть» | `epistemic: archived` + инвалидация ребра (паттерн C) | hard-delete |
| «Что вспомнить сейчас?» | ЛИНЗА (предикат по осям паспорта + время) | tiered storage engine |
| procedural-память | уже есть: prompt-узлы = control-plane (ТИП/ПАТТЕРН) | новый класс |

Вывод: память — это **применение** паспорта, а не расширение. Дальше — конкретика.

---

## 1. Node-classes для памяти (semantic / episodic / procedural)

Таксономия LangMem (semantic / episodic / procedural) мапится на наши TYPE-узлы. Напомню: TYPE — это узел
control-plane (Принцип 0), значит **новые типы НЕ трогают ядро** — это запись в реестре типов, R0/R1.

### 1.1 Карта типов

| Память (рус / eng) | TYPE-узел (`type`) | Что это | epistemic-дефолт | Несущее ребро к субъекту | Аналог индустрии |
|---|---|---|---|---|---|
| **Семантическая / semantic** = устойчивый факт о мире/пользователе | `memory-fact` (или просто доменный факт-тип) | «Женя живёт в часовом поясе X», «предпочитает голос в Telegram» | `hypothesis` пока не подтверждён → `fact` | `about → <субъект>` | mem0 fact, Zep entity-fact |
| **Эпизодическая / episodic** = след события «что произошло» | `trace` (атомарный шаг) и `episode` (сессия/эпизод как контейнер) | «агент N в 14:02 прочитал узлы X,Y, вызвал tool Z, получил R» | `fact` (это реально случилось) — но `fact-of-occurrence`, см. §4 | `about → <субъект/задача>`, `produced-by → <agent>` | Letta event, Graphiti episode |
| **Процедурная / procedural** = «как делать» | **уже есть как control-plane:** `prompt` / `skill` / `pattern` / `lens`-узлы | системный промпт агента, скилл, паттерн сборки | `fact`/`proposal` | `governs → <agent>` / `applies-to → <type\|scope>` | LangMem procedural, Letta blocks |

**Ключ:** procedural-память — это НЕ новый класс памяти, это **тот же control-plane (ТИП/ЛИНЗА/ПАТТЕРН + prompt-узлы)**,
который ADR-0002 уже сделал узлами графа. «Агент учится новой процедуре» = создаётся/правится prompt/pattern-узел.
Это и есть «self-editing procedural memory» Letta — у нас бесплатно, потому что control-plane = данные.

### 1.2 Минимальный набор НОВЫХ TYPE-узлов (регистрация в реестре, не правка ядра)

- `trace` — атомарный эпизодический след (один шаг агента). schema: `trace@1`.
- `episode` — контейнер-эпизод (сессия/прогон), агрегирует trace-узлы. schema: `episode@1`. (Аналог нашего
  `message`-агрегатора из Консилиума №1 — контейнер + `body` + рёбра, а не дублирование.)
- `memory-fact` — семантический факт (если доменного факт-типа недостаточно). schema: `memory-fact@1`.
- (опц.) `reflection` — узел саморефлексии/инсайта консолидации (можно переиспользовать существующий `insight`).

prompt / skill / pattern / lens — **уже есть** (control-plane). Не создаём.

### 1.3 Рёбра памяти (переиспользуют существующий словарь + 2-3 уточняющих rel)

Несущие рёбра уже есть (`about`, `home`, `produced-by`/`source`, `grounds`, `contradicts`, `supersedes`,
`builds_on`, `facet-of`). Для памяти добавляем тонкий слой `rel`-значений (это словарь ребра, НЕ поля паспорта):

| `rel` | Смысл | Откуда → Куда |
|---|---|---|
| `about` | память О субъекте | memory-node → subject |
| `produced-by` | кто породил след/факт | trace/fact → agent-node (принципал-агент) |
| `derived-from` | факт сконсолидирован из этих следов | memory-fact → trace[] (провенанс консолидации) |
| `part-of` | trace входит в episode | trace → episode |
| `consolidates` | рефлексия/прогон консолидации, породившая факт | reflection → trace[] |
| `governs` | процедура управляет агентом | prompt/skill → agent |
| `contradicts` / `supersedes` / `builds_on` | разрешение конфликтов (§4) | fact → fact |

`derived-from` и `consolidates` — единственные действительно новые `rel`. Это значения в словаре ребра (как `weight`
из understand-anything — кандидат поля ребра), не изменение паспорта. Risk-class R1.

---

## 2. Память пользователя vs рабочая память агента (разделение по `principal` + рёбрам)

Это решается **уже существующим полем `principal`** (ADR-0002: «чья нода / какого агента»). Ничего нового.

### 2.1 Три принципала памяти

- **`principal: owner`** — «факты жизни пользователя» (semantic about the user). Долгоживущие, делятся между всеми
  агентами через ЛИНЗУ (с учётом `sensitivity`). Это «User memory».
- **`principal: agent:<id>`** — «рабочие заметки/следы агента N» (working notes, traces). Это «Agent working memory».
  По умолчанию scoped к этому агенту.
- **`principal: shared`** (или `org`) — консолидированное знание, явно повышенное в общий слой (после консолидации +
  авторизации, §3).

### 2.2 Scoping и retrieval = ЛИНЗА с предикатом по `principal`

Извлечение памяти НЕ требует отдельного движка памяти. Это ЛИНЗА (control-plane, ADR-0002 §2б/§4):

```
lens: agent-N-working-memory
  predicate: principal == "agent:N" AND epistemic != archived AND type in {trace, episode, memory-fact}
  disclosure: payload         # своя память — полное раскрытие
  class: soft-perception

lens: user-life-facts
  predicate: principal == "owner" AND type == "memory-fact" AND epistemic == "fact"
  disclosure: payload | title  # по sensitivity целевого агента
  class: hard-ABAC             # приватность пользователя — жёсткое правило
  enforce_point: disclosure
```

**Принцип разделения:**
- Агент N **по умолчанию видит**: свою (`principal: agent:N`) + общую (`principal: shared`) + пользовательскую
  (`principal: owner`) через hard-ABAC-линзу, фильтрующую по `sensitivity`.
- Агент N **НЕ видит** рабочую память агента M (`principal: agent:M`) — кроме случая, когда есть линза cross-agent
  (explicit). Это даёт изоляцию рабочих заметок без отдельного хранилища.
- «Всё видно ИИ» (Принцип 3) сохраняется для **первостороннего** агента/владельца; изоляция между агентами и
  default-deny для модулей/3rd-party — это уже линза-hard-ABAC, согласовано с открытым вопросом ABAC (ADR-0003).

### 2.3 Почему не путается приватность и владение

`sensitivity` (приватно?) ⟂ `principal` (чьё?) — ортогональны (это прямой инвариант ADR-0002). Пример:
- факт `principal: owner, sensitivity: private` → факт пользователя, приватный → агенту виден только под линзой с
  правом на private.
- заметка `principal: agent:N, sensitivity: internal` → рабочая заметка агента, не приватная → но scoped к агенту N
  по principal, не по sensitivity.

---

## 3. Консолидация / self-editing (raw episodic → semantic fact)

Это самое ценное и самое тонкое. Инвариант проекта (ADR-0002 §3): **автор ≠ авторизатор для повышения epistemic
до `fact`**. Память обязана это уважать.

### 3.1 Поток консолидации (sleeptime / idle, паттерн Letta + LangMem)

```
[trace, trace, trace]  (epistemic: fact-of-occurrence — события реально были)
        │  агент-консолидатор (idle/sleeptime прогон) читает следы
        ▼
[reflection]  consolidates → trace[]
        │  выводит обобщение
        ▼
[memory-fact]  epistemic: hypothesis   ← АГЕНТ-АВТОР МОЖЕТ ТОЛЬКО ДО hypothesis
  source: agent
  principal: owner | agent:N
  derived-from → trace[]   (провенанс: из чего сконсолидировано — не теряется)
        │
        ▼ (повышение hypothesis → fact)
[promotion-policy узел проверяет]:  actor ≠ author; actor_class ∈ {human, verifier-agent}; capability assert:fact
        │  трейс-узел повышения логируется (actor, from, to, policy_ref, ts)
        ▼
[memory-fact]  epistemic: fact
```

**Ключевые свойства (всё из существующих механизмов):**
- Агент-консолидатор **порождает факт как `hypothesis`**, НЕ как `fact` (самоповышение до fact запрещено — §3 ADR).
  Это закрывает классическую дыру памяти: «агент сам себя убедил и записал догадку как истину».
- Повышение `hypothesis → fact` делает **другой** актор (человек-владелец, или verifier-агент ≠ автор) по узлу
  `promotion-policy`. Для бытовых фактов о пользователе дефолт-политика может разрешить владельцу подтверждать
  пакетно («да, всё верно») — это политика-узел, настраивается, не код.
- `derived-from` хранит, **из каких именно следов** выведен факт → провенанс консолидации не теряется (в отличие от
  mem0/vector, где после извлечения исходный контекст растворяется).
- Сами trace-узлы НЕ удаляются при консолидации — они `archived` или остаются `fact-of-occurrence` под cold-линзой
  (§5). Можно всегда восстановить «почему агент так решил».

### 3.2 Self-editing процедур

Когда агент «учится делать лучше» — он правит свой prompt/skill/pattern-узел (procedural). Тот же epistemic-клапан:
правка процедуры, влияющей на необратимые действия, проходит valve (ADR-0002 §3 клапан). Self-editing у нас = правка
control-plane-узла под политикой, а не магический внутренний стейт агента.

### 3.3 Sleeptime / idle консолидация = ПАТТЕРН-узел + триггер движка

Консолидация запускается не в горячем пути, а в простое (Letta sleeptime). У нас это:
- **ПАТТЕРН-узел** `consolidation-pattern` (control-plane род ПАТТЕРН): «собери trace[] за окно → reflection →
  memory-fact(hypothesis)».
- Запуск — реактивность ДВИЖКА (вынесена из паспорта в движок ещё в VERDICT-2026-06-19). Триггер: idle / расписание /
  порог числа несконсолидированных trace. Это вход в engine-spec / ADR-0004, не в паспорт.

---

## 4. Провенанс и противоречия (без потери данных)

Принцип проекта: **ничего не стирается, всё видно ИИ, эпистемика — метка, не стена.** Конфликт памяти решается
рёбрами + epistemic, а НЕ перезаписью.

### 4.1 Когда новый факт противоречит старому

```
[memory-fact A]  "пользователь работает из дома"   epistemic: fact   valid_from: 2026-01
        ▲ contradicts
[memory-fact B]  "пользователь переехал в офис"      epistemic: hypothesis → fact   valid_from: 2026-06
```

Правило разрешения (без удаления):
1. Новый факт B создаётся со ребром `contradicts → A` (или `supersedes → A`, если это эволюция того же факта, а
   `builds_on → A`, если уточнение).
2. **A не удаляется.** Если B повышен до `fact` и `supersedes A`, движок ставит A → `epistemic: archived` И/ИЛИ
   **инвалидирует ребро** `about` у A (паттерн C, Zep/Graphiti: forgetting = edge invalidation, bi-temporal).
3. Bi-temporal: у факта два времени — `valid_from/valid_to` (когда факт ИСТИНЕН в мире) ⟂ `created/updated` (когда
   записан). Это уже в духе нашей битемпоральности (ADR-0001 truth-time ⟂ file-time). **A остаётся в истории**:
   «было верно с янв по июнь». Cold-линза его видит, hot — нет.
4. Если конфликт НЕ разрешён (оба `hypothesis`, никто не повышен) — оба живут с ребром `contradicts`, и линза при
   retrieval **показывает оба + флаг конфликта** агенту, а не молча выбирает один. Разрешение — задача
   консолидатора/владельца, не молчаливая перезапись.

### 4.2 Почему это сильнее конкурентов

- mem0/vector: при конфликте обычно ПЕРЕЗАПИСЫВАЕТ или дедуплицирует → теряет, что было верно раньше.
- У нас: `contradicts/supersedes/builds_on` + `archived` + bi-temporal `valid_to` → **полная история убеждений
  агента/системы во времени**, ноль потерь, аудируемо. Это прямое следствие «ничего не стирается».

### 4.3 Зависимость от ADR-0004

`valid_from/valid_to` (срок валидности факта) и «инвалидация ребра вместо удаления» — это **кандидат-инвариант /
ADR-0004** из SYNTHESIS-competitors §🟡(1). Модель памяти **спроектирована совместимо** с ним, но не ломается без
него: до ратификации bi-temporal достаточно `epistemic: archived` + `supersedes`-ребра (потеря — только точный
`valid_to`, восстановим из trace). **Это аргумент ЗА ratifиkацию bi-temporal как инварианта** — память — её первый
реальный потребитель.

---

## 5. Тиры (hot / warm / cold, паттерн B) = ВИД (view), а не хранилище

Letta/MemGPT/MemoryOS держат tiered storage с авто-миграцией. **Мы НЕ копируем хранилище.** У нас один граф (файлы=
истина), а тиры — это **производный вид ЛИНЗЫ** по существующим осям + динамическому `heat`.

### 5.1 Тиры как линзы над одним графом

| Тир | Что это | Как вычисляется (предикат линзы) |
|---|---|---|
| **hot / в контексте** | сейчас в промпте агента | recency (`updated`) + высокий `heat` + `principal` текущего агента + `epistemic ∈ {fact, hypothesis}`, top-N по бюджету |
| **warm / по запросу** | подгружается just-in-time | по запросу/ребру (`about`, `derived-from`), FTS/BM25, позже вектор (SYNTHESIS-competitors §3) |
| **cold / архив** | редко, для аудита | `epistemic: archived` ИЛИ низкий heat ИЛИ старый `valid_to`; не грузится по умолчанию |

Это **ровно `getContext(node, budget)`** (канонический запрос из Консилиума №2) + heat-сортировка. Тир — это НЕ
поле узла; узел не «лежит в hot». Тир — это ОТВЕТ линзы для данного агента в данный момент. Один и тот же факт
горяч для агента-планировщика и холоден для агента-бухгалтера.

### 5.2 `heat` — единственное обсуждаемое поле, и оно НЕ паспортное

MemoryOS heat-score (доступы × recency × важность) даёт динамику, которой не хватает статичной `priority`-на-ребре.
**Решение в духе ADR-0002:**
- `heat` — **производное поле ДВИЖКА**, проставляется как `stale`/`derived`/`canonical_id` (движок пишет, автор нет).
  Это НЕ несущая ось паспорта (по инварианту несущести: по `heat` НЕ принимается решение «как обращаться с ячейкой
  без чтения» — это сигнал ранжирования для линзы, эфемерный).
- Формула heat живёт в **линзе/движке** (`heat = f(touch_count, recency, priority, epistemic)`), не в ядре.
- Падение heat → узел естественно уходит в warm/cold через линзу. Это и есть «забывание как деградация ранга», без
  удаления (мягче, чем decay-удаление у mem0).

**Вердикт по новому полю:** `heat` **не обязателен и не паспортный**. Если движок его не считает — тиры всё равно
работают на `updated` (recency) + `priority`-на-ребре + `epistemic`. `heat` — улучшение ранжирования, кандидат в
engine-spec, **НЕ новое поле паспорта**. Итог задачи: **0 неизбежных новых полей паспорта.**

---

## 6. Конкретный пример (граф: nodes + edges, стиль graph-example)

Сценарий: владелец дважды голосом упомянул, что предпочитает короткие ответы по утрам. Агент-консолидатор выводит
факт о пользователе.

### Узел 1 — эпизодический след (trace, working memory агента)

```yaml
id: trace-0af3
type: trace
schema: trace@1
created: 2026-06-24T08:14:00Z
updated: 2026-06-24T08:14:00Z
epistemic: fact            # событие РЕАЛЬНО произошло (fact-of-occurrence)
sensitivity: private       # содержимое голосового — приватно
source: connector          # пришло из Telegram-коннектора
principal: agent:secretary # рабочая память агента-секретаря
external_ref: { connector: telegram, key: "msg/8842" }
links:
  - { rel: child-of, to: episode-morning-2026-06-24, home: true, priority: 1 }  # ГДЕ ЛЕЖИТ
  - { rel: about, to: owner, home: false }                                       # про пользователя
  - { rel: produced-by, to: agent-secretary, home: false }
```
Поведение: scoped к `agent:secretary` (его рабочая память); приватно; bi-temporal не нужен — это событие, не утверждение о мире.

### Узел 2 — эпизод-контейнер (episode)

```yaml
id: episode-morning-2026-06-24
type: episode
schema: episode@1
created: 2026-06-24T08:00:00Z
updated: 2026-06-24T08:30:00Z
epistemic: fact
sensitivity: private
source: agent
principal: agent:secretary
links:
  - { rel: child-of, to: agent-secretary-memory, home: true, priority: 2 }
  - { rel: about, to: owner, home: false }
```

### Узел 3 — сконсолидированный семантический факт о пользователе (после idle-прогона)

```yaml
id: fact-owner-morning-brevity
type: memory-fact
schema: memory-fact@1
created: 2026-06-24T03:00:00Z   # sleeptime-прогон
updated: 2026-06-24T03:00:00Z
epistemic: hypothesis           # АГЕНТ-АВТОР МОЖЕТ ТОЛЬКО ДО hypothesis (не fact!)
sensitivity: private
source: agent
principal: owner                # это ФАКТ ПОЛЬЗОВАТЕЛЯ (не рабочая память агента)
level: data
# valid_from: 2026-06-24        # bi-temporal — опц., вступит с ADR-0004
links:
  - { rel: child-of, to: user-profile, home: true, priority: 4 }   # дом — профиль пользователя
  - { rel: about, to: owner, home: false }
  - { rel: derived-from, to: trace-0af3, home: false }             # провенанс консолидации
  - { rel: derived-from, to: trace-0bb1, home: false }
  - { rel: consolidates, to: reflection-0c12, home: false }
```
Поведение:
- `principal: owner` → переехал из рабочей памяти агента в слой пользователя (но ещё `hypothesis`).
- `derived-from → trace[]` → видно, ИЗ ЧЕГО выведено; следы не удалены.
- Повысить до `fact` сможет ТОЛЬКО владелец / verifier-агент (не agent:secretary) через `promotion-policy`.

### Узел 4 — повышение epistemic (трейс-узел авторизации)

```yaml
id: trace-promote-0d44
type: trace
schema: trace@1
created: 2026-06-24T09:01:00Z
updated: 2026-06-24T09:01:00Z
epistemic: fact
sensitivity: internal
source: human
principal: owner
links:
  - { rel: about, to: fact-owner-morning-brevity, home: false }   # что повысили
  - { rel: child-of, to: episode-morning-2026-06-24, home: true, priority: 1 }
# payload: { actor: owner, from: hypothesis, to: fact, policy_ref: promotion-policy-user-facts, ts: 2026-06-24T09:01Z }
```
После этого движок переводит `fact-owner-morning-brevity.epistemic → fact`. Author (agent:secretary) ≠ authorizer (owner). Инвариант соблюдён, всё логируется.

### Ребро retrieval (линза, не узел) — как агент это вспомнит

```
lens: hot-context-for(agent:writer)
  predicate: principal in {owner, shared} AND epistemic == fact AND sensitivity allowed-for(agent:writer)
             AND about == <current-task-subject>
  rank: heat desc, updated desc        # heat — производное движка (§5), опц.
  budget: top-N
```
`fact-owner-morning-brevity` попадёт в hot-контекст агента-писателя, потому что `principal: owner`, `epistemic: fact`,
и тема совпала. Агенту-бухгалтеру тот же факт холоден (тема не совпала) — один граф, разные линзы.

---

## 7. Карта на паспорт (итоговая) и вердикт по новым полям

| Аспект памяти | Несущее поле/механизм паспорта (существующее) | Новое? |
|---|---|---|
| тип памяти (sem/epi/proc) | `type` (TYPE-узел: memory-fact / trace+episode / prompt+pattern+lens) | НЕТ (реестр типов, R0/R1) |
| факт vs догадка | `epistemic` | НЕТ |
| приватность | `sensitivity` | НЕТ |
| чья память (user vs agent) | `principal` (owner / agent:N / shared) | НЕТ |
| провенанс | `source` + `external_ref` + ребро `derived-from` | НЕТ (rel — словарь ребра) |
| субъект памяти | ребро `about` / `home` | НЕТ |
| консолидация | `epistemic`-лестница + `promotion-policy` + рёбра `derived-from`/`consolidates` | НЕТ (2 новых rel, R1) |
| конфликт без потерь | `contradicts`/`supersedes`/`builds_on` + `archived` + (bi-temporal валидность) | bi-temporal = кандидат ADR-0004 |
| тиры hot/warm/cold | ЛИНЗА-вид + (опц.) `heat` производное движка | `heat` НЕ паспортное, опц. движок |
| забывание | `epistemic: archived` + инвалидация ребра | совместимо с ADR-0004 |

**Единственный честный флаг:** ноль новых ОБЯЗАТЕЛЬНЫХ полей паспорта. Два уточнения, оба вне ядра:
1. `heat` — опциональное производное поле ДВИЖКА (как `stale`/`canonical_id`), не паспортная ось. Можно не делать.
2. `valid_from/valid_to` (bi-temporal) — не для памяти специально, это общий кандидат ADR-0004; память — его первый
   потребитель и аргумент за ратификацию.

Плюс 2 новых `rel` в словаре ребра (`derived-from`, `consolidates`) — это R1, не касается паспорта.

---

## 8. Открытые вопросы (к владельцу / в engine-spec / ADR-0003 / ADR-0004)

1. **Гранулярность trace.** Логировать КАЖДЫЙ шаг агента как узел? Риск взрыва объёма (миллионы trace). Предложение:
   trace по умолчанию `sensitivity`-агрегируется в `episode`; сырые trace — cold, с TTL-архивацией движком. Порог?
2. **Кто verifier-агент для бытовых фактов?** Для важных фактов — владелец. Но «короткие ответы по утрам» владельца
   спамить апрувами накладно. Нужна ли политика «низко-рисковые user-facts автоповышаются до fact после N
   подтверждённых наблюдений, высоко-рисковые (здоровье/деньги/люди) — только владелец»? Это политика-узел, но порог
   и категории — решение владельца.
3. **`heat` — делаем ли вообще?** Или стартуем на `updated`+`priority`+`epistemic` и добавляем heat по доказанной
   боли (как векторы)? (Рекомендация: отложить, как векторы.)
4. **Bi-temporal (ADR-0004)** — ратифицируем ли `valid_from/valid_to` + инвалидацию ребра как инвариант? Память —
   первый реальный потребитель; без него конфликты разрешаемы, но без точного «когда перестало быть верным».
5. **Cross-agent видимость рабочей памяти.** Дефолт = агенты НЕ видят рабочие заметки друг друга (по `principal`).
   Нужны ли исключения (оркестратор видит всё)? Это линза-hard-ABAC, согласовать с ADR-0003.
6. **Sleeptime-триггер** — расписание / idle / порог несконсолидированных trace? Вход в engine-spec.
7. **Эмбеддинг приватной памяти.** Если добавим векторы — `sensitivity: private` НЕ эмбеддить в облако (локальный
   эмбеддер или исключение по метке). Паспорт это уже поддерживает (SYNTHESIS-competitors §3) — но подтвердить как
   инвариант движка.
