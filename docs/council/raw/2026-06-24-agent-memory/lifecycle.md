---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Title: "Memory lifecycle: bi-temporal edges, forgetting states, heat-as-derived, session protocol, identity guard"
Scope: DESIGN — кандидаты в инварианты + ADR-контент. Фаза без «строй».
Related:
  - docs/architecture/ADR/ADR-0002-thin-passport.md (approved — основание)
  - docs/product/SWEEP-2026-06-23-series.md (7 инвариантов на ратификацию, CRITICAL-1 идентичность)
  - docs/council/raw/2026-06-24-competitors/agent-user-memory.md (конкуренты: Zep bi-temporal, MemoryOS heat, Claude session pattern)
---

# Жизненный цикл памяти в FF-графе: дизайн

> Faza = DESIGN. Ни одна строка ниже не предполагает немедленного кода.
> Задача: спроектировать 5 взаимосвязанных механизмов и назвать, что из этого кандидат ИНВАРИАНТ,
> а что — кандидат ADR-0004/ADR-0003.

---

## 0. Фундамент: почему «lifecycle» вообще нужен отдельно

ADR-0002 (approved) зафиксировал:
- `epistemic: draft|proposal|hypothesis|fact|archived` — ось доверия к содержимому, обяз. поле паспорта.
- `created` / `updated` — системные метки на УЗЛЕ.
- `occurred` / `valid_from` / `valid_until` → ОТЛОЖЕНО в модуль (не в ядре).
- `supersedes` → ребро (настоящая замена, «старое мертво»).
- `version-of` → ребро (сосуществующая история).
- `canonical_id?` → движок проставляет при дедупе.

Проблема: все эти инструменты описывают МОМЕНТЫ (когда создан, когда обновлён), но НЕ дают:
1. Когда факт, выраженный РЕБРОМ, был истинным в реальности (bi-temporal validity).
2. Как нода «забывается» без удаления (forgetting states).
3. Как важность узла эволюционирует со временем (heat).
4. Как агент выживает после restart/compact (session protocol).
5. Как identity-collapse предотвращается при инвалидации (identity guard).

Конкуренты решают это по-разному:
- **Zep/Graphiti** — bi-temporal validity на ребре (`t_valid` / `t_invalid` / `t_created` / `t_expired`).
- **MemoryOS** — heat-score (recency+frequency+access) для promotion STM→LPM.
- **Letta/MemGPT** — sleeptime consolidation (агент в простое консолидирует archival-память).
- **Claude memory tool** — just-in-time + «assume interruption» + initializer/progress-log/end-of-session.

Ниже — как каждый из 5 механизмов ложится на НАШУ модель (тонкий паспорт + рёбра несут принадлежность/состояние).

---

## 1. Bi-temporal validity как концепция РЕБРА

### 1.1 Постановка задачи

«Иван — менеджер проекта FF» — это ребро `involves(people/ivan.md → project/ff.md, rel:manager-of)`.
Но Иван был менеджером с 2025-03 по 2025-11. Потом его заменили. Ребро сейчас «мертво», но история
должна читаться агентом без удаления.

ADR-0002 говорит `created` / `updated` — на УЗЛЕ, а `occurred` / `valid_from` / `valid_until` → модуль.
Bi-temporal на ребре — это НЕ противоречие паспорту: паспорт описывает узел, ребро несёт своё состояние.

### 1.2 Два измерения времени (bi-temporal)

| Измерение | Смысл | Тип |
|---|---|---|
| **Время истинности факта** (`valid_from` / `valid_to`) | Когда факт был верен В РЕАЛЬНОСТИ | Дата или null |
| **Время системного знания** (`known_from` / `known_to`) | Когда СИСТЕМА узнала / инвалидировала факт | Iso timestamp (системное) |

`valid_to = null` → «открытый интервал» (факт актуален сейчас).
`known_to = null` → ребро не инвалидировано в системе.

**Зачем оба измерения?** Агент вносит в граф: «Встреча была 2025-03-01» — в марте 2026. `known_from`=2026,
`valid_from`=2025-03-01. Запрос «что было правдой в 2025-03» работает корректно.

### 1.3 Соотношение с полями узла ADR-0002

| Поле | Где живёт | Что значит |
|---|---|---|
| `created` | УЗЕЛ (паспорт) | Системная метка: когда нода вошла в граф |
| `updated` | УЗЕЛ (паспорт) | Системная метка: когда последний раз менялся файл |
| `valid_from` / `valid_to` | РЕБРО (bi-temporal) | Когда ФАКТ, выраженный этим ребром, был истинным |
| `known_from` / `known_to` | РЕБРО (bi-temporal) | Когда система узнала/инвалидировала этот факт |

Критичное разграничение: `updated` на узле — это «когда я редактировал нод», НЕ «когда перестал быть актуальным
факт». Путать их = ошибка. Поэтому bi-temporal — ТОЛЬКО на ребре, не дублирует паспортные поля.

### 1.4 Инвалидация вместо удаления

**Zep-паттерн адаптированный:** когда новый факт противоречит старому:
1. Новое ребро создаётся с `valid_from = now`.
2. Старое ребро получает `valid_to = now` (ИЗВЕСТНО системе) + `known_to = now` (точка закрытия).
3. Старое ребро НЕ удаляется → оно остаётся в истории.
4. Движок при запросе «текущие факты» фильтрует по `valid_to = null` (или `valid_to > now`).

**Почему НЕ удаление:** «всё видно ИИ» (ADR-0002 philosophy) + провенанс без пробелов + аудит изменений.
Удаление — это потеря истории. Инвалидация — это версионирование факта.

### 1.5 Расположение в модели

Bi-temporal поля — ОПЦИОНАЛЬНЫЕ поля ребра (не нарушают ADR-0002, т.к. паспорт = поля узла):

```
РЕБРО — новые опциональные поля:
  valid_from?   : iso date | null   # факт истинен С
  valid_to?     : iso date | null   # факт истинен ДО (null = открытый)
  known_from?   : iso timestamp     # когда система записала ребро
  known_to?     : iso timestamp | null  # когда система инвалидировала (null = активно)
```

`known_from` может быть проставлен движком при создании (аналог `created` на узле). `known_to` — только
при явной инвалидации (агентом или операцией движка `invalidate-edge`).

**Это не новое обязательное поле паспорта** — паспорт узла не трогается. 0 новых обязательных полей.

### 1.6 Candidate INVARIANT (BI-TEMPORAL)

**BT-1 (кандидат):** Инвалидация факта = установка `known_to` на ребре. Удаление ребра-факта запрещено, если у него
есть `known_from`. Только явный «purge» с трейс-узлом (human, `source:human`) может физически убрать ребро.

**BT-2 (кандидат):** `valid_to < valid_from` на ребре — ошибка целостности, движок отклоняет запись.

**BT-3 (кандидат):** Движок при запросе «текущий граф» фильтрует по `(valid_to IS NULL OR valid_to > now) AND
(known_to IS NULL)` — только активные, не инвалидированные рёбра.

---

## 2. Forgetting without deletion: состояния памяти

### 2.1 Проблема

ADR-0002 `epistemic` = ось доверия к содержимому (`draft|proposal|hypothesis|fact|archived`).
Но `archived` — это состояние узла, не ребра. И «архивирован» ≠ «истёк как факт» ≠ «холодный тир».

Нужна явная модель: что значит «забыть» в нашем графе, без удаления.

### 2.2 Четыре состояния памяти (lifecycle states)

Это НЕ новое поле паспорта — это движок выводит из комбинации существующих полей + bi-temporal.

| Состояние | Условие (выводится движком) | Видимость AI | Участие в клапане |
|---|---|---|---|
| **active** | `epistemic ≠ archived` AND `(known_to IS NULL)` для его рёбер | полная | да (проверяется) |
| **superseded** | Нода имеет `supersedes`-ребро входящее (кто-то её заменил) | полная (читается, не главная) | да, но с пометкой |
| **invalid** | Ребро к этой ноде имеет `known_to IS NOT NULL` (факт инвалидирован) | ограниченная (только при явном hist-запросе) | нет (v1-клапан игнорирует) |
| **archived** | `epistemic = archived` на паспорте ноды | ограниченная (только при явном hist-запросе) | нет |

**Переходы:**
```
active ──→ superseded  (движок при создании supersedes-ребра)
active ──→ archived    (агент/человек ставит epistemic=archived; автор ≠ авторизатор для fact)
active ──→ invalid     (движок при инвалидации ребра: known_to установлен)
superseded ──→ archived (после подтверждения замены + времени)
archived ──→ active    (только человек-владелец; трейс-узел; «де-архивирование»)
invalid — ТЕРМИНАЛЬНО для РЕБРА (ребро нельзя "ревалидировать"; создаётся новое)
```

**Кто может инициировать:**
- `active → archived`: агент (для `epistemic: draft|proposal|hypothesis`) ИЛИ человек-владелец. НЕ агент для `fact` без verifier.
- `active → superseded`: движок при создании `supersedes`-ребра (автоматически).
- `active → invalid`: движок при bi-temporal invalidation (агент создаёт новый факт-ребро → старое инвалидируется).
- Клапан (valve): только через политику `promotion-policy`-узла (ADR-0002 §3).

### 2.3 Cold tier (архивный слой) — концепция

«Холодный тир» — это НЕ отдельное хранилище. Это производная линза движка:
```
cold_tier = {epistemic: archived} UNION {узлы, доступные только через invalid-рёбра}
```

Агент по умолчанию работает с `active + superseded` (warm). Запрос к cold = явный `hist:true` аргумент
в операции `query`. Это ровно то, что называется «ленивая загрузка холодного» у Letta/MemGPT, но без
физически разных хранилищ.

### 2.4 Candidate INVARIANT (FORGETTING)

**FG-1 (кандидат):** Нода с `epistemic=archived` не участвует в v1-клапане (проверка прямых входов
на `fact` не считает archived-нод «блокирующими»).

**FG-2 (кандидат):** `epistemic: fact → archived` требует тех же авторизационных правил, что `draft →
fact` (не сам автор; человек или verifier; трейс). «Разархивировать» (`archived → active`) = ещё строже:
только человек-владелец.

**FG-3 (кандидат):** Физическое удаление ноды запрещено (purge = отдельная операция только human + трейс).
«Forgetting» = архивирование + инвалидация рёбер, никогда не `rm`.

---

## 3. Heat-score как ПРОИЗВОДНОЕ значение

### 3.1 Что это и почему derived

MemoryOS использует heat-score (recency + frequency + access) для promotion STM→LPM.
У нас `priority` на ребре — статично (ставит автор/агент вручную). Нет динамической важности.

**Тезис:** heat — это НЕ трастовый сигнал, не часть паспорта. Это «что горячо СЕЙЧАС» — зависит от
паттернов использования, меняется каждый час. Класть его в файл-истину = нарушать «файлы = истина»
(постоянные инвалидации источника правды ради производного кеша).

**Heat = read-only derived value, вычисляется ENGINE, никогда не пишется в .md файл.**

### 3.2 Формула (кандидат)

```
heat(node, t) = w_r * recency_score(t - last_accessed)
              + w_f * frequency_score(access_count_30d)
              + w_p * priority_score(max priority на входящих home-рёбрах)

recency_score = exp(-λ * Δt)   # экспоненциальный распад, λ≈0.1/day
frequency_score = log(1 + access_count_30d) / log(1 + max_count)
priority_score = priority_on_home_edge / 10.0   # нормализован

w_r + w_f + w_p = 1.0   (дефолт: 0.5, 0.3, 0.2 — настраивается линзой)
```

Это ровно то, что MemoryOS называет «heat-score» для их тирирования, но у нас без физического
разделения на тиры — heat — это просто сигнал ранжирования для агента при выборе контекста.

### 3.3 Использование heat

Heat не заменяет `priority` (ручное), не заменяет `epistemic` (доверие). Он используется:
- Линзой-запроса как сигнал ранжирования при `getContext(anchor, budget)`.
- Движком для «показать warm-ноды в контексте агента» (аналог Letta core memory: что грузить всегда).
- Мониторингом: «давно не обращались» = сигнал для архивирования (предложение агенту, не автоматика).

### 3.4 Где хранить

- `access_count_30d` + `last_accessed` — в SQLite ENGINE-индексе (НЕ в .md файлах).
- `heat` — вычисляется при запросе (или кешируется на час в ENGINE).
- Никогда в frontmatter. Это производное.

### 3.5 Candidate INVARIANT (HEAT)

**HT-1 (кандидат):** `heat` — derived-only. Агент может ЧИТАТЬ heat через ENGINE API, но не может
писать его в паспорт или ребро. Нет поля `heat` в .md файлах.

**HT-2 (кандидат):** Линза может использовать heat как ось ранжирования, но НЕ как фильтр-истину
(«нода с heat > 0.5 = fact» — запрещено). Heat ≠ epistemic.

**HT-3 (кандидат):** Если ENGINE-индекс недоступен (rebuild), запрос без heat = graceful degradation
(возвращает результат без ранжирования). Клапан НЕ зависит от heat.

---

## 4. Agent session protocol (паттерн-узел)

### 4.1 Проблема — «compact anxiety»

Из контекста проекта (N-079, DECISIONS-LOG.md, STATE.md): рестарты и compact разговора = потеря рабочего
контекста агента. Сейчас это решается вручную через STATE.md + DECISIONS-LOG.md.

Claude memory tool доказал паттерн: **initializer → progress-log → end-of-session-update** = +39% к
baseline на длинных задачах. Это нужно формализовать как ПАТТЕРН-узел в нашем control-plane.

### 4.2 Паттерн-узел SESSION-PROTOCOL

Паттерн = узел рода PATTERN в control-plane (ADR-0002 §4: «собрать подграф из многих»).

```
type: pattern
id: pattern/session-protocol-v1
title: "Agent session protocol"
description: "Агент выживает после restart/compact"
epistemic: fact
source: human
```

Паттерн задаёт 3 операции (глагола агента), которые ОБЯЗАНЫ выполняться при начале и конце сессии:

**Операция 1 — INITIALIZER (при старте агента)**
```
1. READ session-state-узел (тип: session-state, linked to agent-узлу)
2. READ last progress-log-узел (тип: progress-log, linked to session-state)
3. READ DECISIONS-LOG.md (или аналог в графе: тип: decisions-log)
4. ЕСЛИ нет session-state → СОЗДАТЬ с epistemic:draft (новая сессия)
5. ЕСЛИ есть → восстановить контекст из progress-log (последняя запись)
```

**Операция 2 — PROGRESS-LOG (в ходе сессии, периодически)**
```
При каждом значимом решении / промежуточном результате:
CREATE node {
  type: progress-log-entry
  home → session-state (через home-ребро)
  body: "что сделал, что понял, что осталось"
  epistemic: proposal (ИИ написал, не верифицировано)
  created: now
}
```

Принцип «assume interruption»: агент пишет так, будто следующий шаг начнётся ДРУГИМ агентом.

**Операция 3 — END-OF-SESSION-UPDATE (при завершении)**
```
1. UPDATE session-state:
   - закрыть progress-log-записи (linked, home)
   - зафиксировать outcome-summary (новый узел тип: session-outcome)
   - если задача выполнена → epistemic=fact (session-outcome)
2. UPDATE linked agent-task (если был) → setLifecycle к следующему статусу
3. WRITE summary в DECISIONS-LOG (плоский лог — legacy-совместимость)
```

### 4.3 Что сессия пишет и когда

| Момент | Что создаётся | Тип узла | epistemic | Где home |
|---|---|---|---|---|
| Старт | session-state | session-state | draft | agent-узел |
| Каждый шаг | progress-log-entry | progress-log-entry | proposal | session-state |
| Ключевое решение | decision-entry | decision | proposal | session-state |
| Конец | session-outcome | session-outcome | proposal / fact* | session-state |
| Верификация | — | (verifier проставляет fact) | fact | — |

*session-outcome → fact только если человек/verifier подтвердил результат.

### 4.4 Выживаемость после compact/restart

Агент после restart выполняет INITIALIZER:
- Находит `session-state` узел по `home → agent-узел`.
- Читает последний `progress-log-entry` (отсортировано по `created` DESC, `seq` — опционально).
- Восстанавливает «где остановился».

Это резонирует с нашей «compact anxiety»: STATE.md — это сейчас ручной аналог session-state.
Паттерн-узел формализует это как механизм, а не конвенцию.

### 4.5 Candidate INVARIANT (SESSION)

**SS-1 (кандидат):** Агент с `type:agent` ОБЯЗАН иметь ровно один активный `session-state` узел при
работе (или inbox, если не запущен). Нет session-state = агент не запущен официально.

**SS-2 (кандидат):** `progress-log-entry` создаётся ТОЛЬКО через home-ребро к `session-state` (не
напрямую «в воздух»). Тип узла задаётся ПАТТЕРН-узлом, не хардкодом.

**SS-3 (кандидат):** `session-outcome` с `epistemic:fact` требует тех же правил авторизации, что и
любое повышение до fact (не сам агент-автор; верификация).

---

## 5. Identity-collapse guard (правило выбора при инвалидации)

### 5.1 Проблема (CRITICAL-1 из SWEEP §Critical)

ADR-0002 и серия синтезов (SYNTHESIS-2026-06-23-version-edges-stream.md, CRITICAL-1) вскрыли:
три механизма `canonical_id` / `version-of` / `supersedes` без правила выбора = тихая потеря данных.

При Zep-стиле инвалидации (bi-temporal invalidation) эта проблема усиливается: когда мы
инвалидируем ребро как «устаревший факт», КАК ENGINE знает, что создавать — новую версию того же
объекта (`version-of`) или замену (`supersedes`) или дедуп (`canonical_id`)?

### 5.2 Правило выбора (selection rule)

```
ПРАВИЛО ТРИГГЕРА (ENGINE при ingestion):

1. canonical_id:
   → Триггер: ENGINE обнаружил почти-дубликат при ingestion (dedup heuristic: hash/embedding близость).
   → Значение: «это дубликат, схлопни» — новая нода = алиас, canonical_id → оригинал.
   → Действие: новая нода НЕ создаётся. Ссылки переписываются на canonical.
   → История: сохраняется как canonical_id-ребро (аудит).

2. version-of:
   → Триггер: объект ПРОДОЛЖАЕТ СУЩЕСТВОВАТЬ в новом состоянии (явная пометка `version_of:<prev_id>`
     ИЛИ агент использует operaton editNode + создаёт новую ноду с link).
   → Значение: «сосуществующая упорядоченная история, всё реально» — старая нода активна и читаема.
   → Действие: старая нода ≠ archived; bi-temporal ребро `version-of` связывает v1→v2.
   → Важно: `version-of ≠ home`. D3 из synthesis: ревизия-1 не наследует контекст ревизии-5.

3. supersedes:
   → Триггер: ЯВНЫЙ акт замены («это заменяет то», агент/человек явно говорит supersedes:<old_id>).
   → Значение: «настоящая замена, старое неактуально» — старая нода → archived.
   → Действие: `supersedes`-ребро + движок проставляет `epistemic=archived` старой ноде + трейс.
   → Нельзя автоматически выбирать supersedes без явного указания (риск: тихое удаление истории).

4. bi-temporal invalidation (новый механизм из §1):
   → Триггер: факт на РЕБРЕ устарел (не узел, а утверждение между двумя узлами).
   → Действие: старое ребро получает `known_to=now`; новое ребро с `valid_from=now`.
   → Узлы НЕ архивируются автоматически — они могут оставаться active с обновлённым ребром.
   → Это НЕ `version-of`, НЕ `supersedes` — это инвалидация отдельного факта, не объекта.
```

### 5.3 Matрица выбора (disambiguation table)

| Ситуация | Правильный механизм | Неправильный |
|---|---|---|
| Та же задача, новый исполнитель | bi-temporal invalidation ребра `assigned-to` | supersedes / version-of узла |
| Задача переписана с нуля | supersedes (явно) | version-of |
| Задача обновлена (контент правился) | editNode + `updated` на узле | supersedes / version-of |
| Добавлена ревизия документа | version-of ребро | canonical_id |
| Найден дубликат при ingestion | canonical_id | version-of |
| Иван больше не менеджер | bi-temporal invalidation ребра `manager-of` | архивирование узла Ивана |
| Компания переименована | editNode на узле + трейс | supersedes |
| Полная замена старого решения новым | supersedes (явно) | version-of |

### 5.4 Защита от коллапса при инвалидации

Специфика для identity-collapse: когда bi-temporal invalidation комбинируется с версиями/supersedes,
нужно гарантировать, что агент не «потеряет» узел, на который ссылаются другие.

**Правило ENGINE: «не сирота при инвалидации ребра»**
```
При инвалидации (known_to = now) ребра E = (A → B, rel=R):
  IF существуют другие рёбра, ссылающиеся на B как essential target:
    → B остаётся active (нельзя тянуть за собой в archived)
  ELSE (нет входящих активных рёбер):
    → движок ПРЕДУПРЕЖДАЕТ (не архивирует автоматически)
    → архивирование = явное человеческое решение
```

Это ровно принцип re-home при удалении home-родителя (ADR-0002 §2a), применённый к bi-temporal
invalidation: нельзя оставить ноды «потерянными» как побочный эффект инвалидации факта.

### 5.5 Candidate INVARIANT (IDENTITY GUARD)

**IG-1 (кандидат, из CRITICAL-1 SWEEP):** ENGINE различает три механизма по явному триггеру:
`canonical_id` = dedup-дедупликат при ingestion; `version-of` = сосуществующая история (не-home);
`supersedes` = явная замена (только human или верифицированный агент). **Никакой механизм не выбирается
молча автоматически — каждый требует явного сигнала.**

**IG-2 (кандидат):** `supersedes`-ребро создаётся только с трейс-узлом (actor + ts + rationale).
Без трейса — отклоняется ENGINE.

**IG-3 (кандидат):** Bi-temporal invalidation ребра НЕ автоматически архивирует связанные узлы.
Архивирование узла = отдельное явное действие (не побочный эффект).

**IG-4 (кандидат — прямо из CRITICAL-1 SWEEP):** ENGINE выбирает механизм ПО ПРАВИЛУ ТРИГГЕРА
(dedup-признак → canonical; явный `version_of:id` → version-of; явный `supersedes:id` → supersedes).
«Не знаю какой» = inbox (версия на усмотрение владельца), никогда не молчаливый supersedes.

---

## 6. Сводка: кандидаты в ИНВАРИАНТЫ vs ADR-контент

### 6.1 Candidate INVARIANTS (ратификация ADR-0002 R1 или отдельным решением)

| ID | Формулировка | Тема |
|---|---|---|
| BT-1 | Инвалидация факта = `known_to` на ребре; удаление ребра с `known_from` — только human+purge+трейс | bi-temporal |
| BT-2 | `valid_to < valid_from` = ошибка целостности, ENGINE отклоняет | bi-temporal |
| BT-3 | «Текущий граф» = фильтр `valid_to IS NULL AND known_to IS NULL` | bi-temporal |
| FG-1 | `epistemic=archived` нода не блокирует v1-клапан | forgetting |
| FG-2 | `fact → archived` = те же авторизационные правила, что `draft → fact` (не сам автор) | forgetting |
| FG-3 | Физическое удаление ноды запрещено; forgetting = архивирование + инвалидация рёбер | forgetting |
| HT-1 | `heat` = derived-only; нет поля heat в .md файлах | heat |
| HT-2 | Heat ≠ epistemic; heat нельзя использовать как фильтр-истину | heat |
| HT-3 | Клапан не зависит от heat; отсутствие ENGINE-индекса = graceful degradation | heat |
| SS-1 | Активный агент имеет ровно один session-state узел | session |
| SS-2 | progress-log-entry только через home → session-state | session |
| SS-3 | session-outcome с fact = те же правила авторизации | session |
| IG-1 | canonical_id/version-of/supersedes: явный триггер, не автоматический выбор | identity guard |
| IG-2 | supersedes-ребро только с трейс-узлом | identity guard |
| IG-3 | Bi-temporal invalidation ребра ≠ автоархивирование узла | identity guard |
| IG-4 | «Не знаю какой механизм» → inbox, никогда не молчаливый supersedes | identity guard |

**Итого: 16 кандидатов.** Все: 0 новых обязательных полей паспорта.

### 6.2 Candidate ADR content

**Для ADR-0003 (ABAC / клапан / trust horizon):**
- FG-1, FG-2 (архивация и клапан)
- BT-3 (фильтр текущего графа = часть v1-клапана)
- IG-2, IG-3, IG-4 (identity guard при инвалидации)
- `frozen`-binding epistemic-check (из CRITICAL-3 version-synthesis)
- Trust horizon: как далеко по bi-temporal цепочке проверять epistemic

**Для ADR-0004 (ENGINE spec, если решат создавать):**
- BT-1, BT-2 (enforcement инвалидации)
- HT-1, HT-2, HT-3 (heat как ENGINE-механизм)
- SS-1, SS-2 (session-state enforcement)
- IG-1 (правило триггера при ingestion)
- Протокол `seq` (из CRITICAL-2 version-synthesis)

### 6.3 Candidate PATTERN-узлы (control-plane)

1. `pattern/session-protocol-v1` — initializer → progress-log → end-of-session-update.
2. `pattern/bi-temporal-invalidation-v1` — как инвалидировать ребро-факт.
3. `pattern/forgetting-v1` — как архивировать узел с сохранением истории.

---

## 7. Открытые вопросы (не решены, нужен ответ владельца или агент-исследование)

**OQ-1 (владельцу):** Bi-temporal validity — нужна ли она СРАЗУ в walking skeleton или это Этап 2?
Ответ определяет, блокирует ли BT-группа «строй».

*Рекоменд.:* BT-2 (валидация целостности) = нужна сразу; BT-1/BT-3 (engine-фильтр + purge-gate) = Этап 2.

**OQ-2 (владельцу):** `valid_from`/`valid_to` на рёбрах — покупаем ли сложность bi-temporal сейчас,
или достаточно `known_to` (только системное время инвалидации)?

*Рекоменд.:* Начать с `known_to`-only (упрощённая временная метка). `valid_from`/`valid_to` — Этап 2
(когда появятся реальные запросы «что было правдой в дату X»).

**OQ-3 (агентам/ENGINE-spec):** Как ACCESS TRACKING (для heat) интегрируется с ENGINE?
getContext(node, budget) должен вызывать ENGINE increment(access_count, node). Это часть ENGINE-spec.

**OQ-4 (владельцу):** Session-protocol — промоутить ли в граф СЕЙЧАС (dogfood-наполнение) или
оставить в виде MD-конвенции (STATE.md + DECISIONS-LOG.md) до walking skeleton?

*Рекоменд.:* MD-конвенция = рабочая, не сломана. Промоут в граф = Этап dogfood после skeleton.

**OQ-5 (агентам):** Для IG-4 («inbox вместо молчаливого supersedes») — как инбокс выглядит в ENGINE
flow? Нужно уточнить в ENGINE-spec (ADR-0004, если будет).

---

## 8. Связь с существующими 7 инвариантами (SWEEP §ИНВАРИАНТЫ)

Из SWEEP-2026-06-23-series.md §ИНВАРИАНТЫ:

| SWEEP инвариант | Связь с lifecycle |
|---|---|
| I-1 Клапан/самоодобрение | FG-2 (архивация fact = те же правила); SS-3 (session-outcome) — усиливают I-1 |
| I-2 Автор ≠ авторизатор | FG-2, SS-3 — прямые аналоги для lifecycle |
| I-3 schema = ключ валидатора | Не затронут lifecycle |
| I-4 facet/категория ≠ форма | Не затронут lifecycle |
| I-5 Контейнер home ≠ категория | SS-1 (session-state home → agent) — конкретный пример I-5 |
| I-6 derived read-only | HT-1 — прямое следствие I-6 |
| I-7 seq⟂priority⟂sort | Не затронут lifecycle |

Lifecycle добавляет 16 новых кандидатов, НЕ конфликтующих с 7 существующими.

---

## Источники (для провенанса)

- **ADR-0002** `docs/architecture/ADR/ADR-0002-thin-passport.md` (паспорт, рёбра, клапан v1, epistemic enum)
- **SWEEP серии** `docs/product/SWEEP-2026-06-23-series.md` (7 инвариантов, 3 CRITICAL, version-edges-stream)
- **SYNTHESIS version-edges-stream** `docs/product/SYNTHESIS-2026-06-23-version-edges-stream.md` (CRITICAL-1/2/3)
- **Competitor research: agent-user-memory** `docs/council/raw/2026-06-24-competitors/agent-user-memory.md`
  (Zep bi-temporal edge invalidation; MemoryOS heat-score; Letta sleeptime; Claude memory tool session pattern)
- **Competitor research: vector-db** `docs/council/raw/2026-06-24-competitors/vector-db-when-useful.md`
  (heat = derived, не source-of-truth; sqlite-vec как ENGINE-кандидат)
- **STATE.md** `docs/STATE.md` N-079 (compact anxiety → DECISIONS-LOG); N-090/N-091 (серия завершена, паспорт выстоял)
