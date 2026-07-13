# Контекст-дайджест — два куска, которые объединяем в «Combination»

- **Status:** active · Owner: jenya.stasik@gmail.com · Date: 2026-07-13
- Источник: две картирующие сессии (explorer по Brain + explorer по agents-manager), 2026-07-13.

## Слой A — Brain (память/состояние). Стадия: DESIGN, не построен.
**Что это:** граф-субстрат для агентов. «Всё — узел/ребро на одном субстрате» (DL-01). Не хранилище
заметок, а рабочий субстрат (рефрейм msg141).
**Хребет:** `Конституция (инварианты) > policy-as-data (паспорт узла) > integrity-as-engine-duty (движок)`.
**Формула:** DATA = «что я есть» · DB = «что мы вместе» · CONSTITUTION = «что нельзя нарушить».
**Ключевые механизмы:** canonical_id (идентичность), bitemporal (время-истины + аудит + откат),
INSERT-not-migrate (DL-14 — новые типы через INSERT в реестр типов, без миграций схемы после M1),
Engine Contract/Portability #15 (**фундамент плагинов/marketplace + key-custody**), Passport #7,
Unified PEP #5 (доступ), Forgetting/hard-erase, Edge Engine, Provenance, Lens, Gardener.
**Структура доков:** `values/` (7 ценностей × 6 направлений) · `infrastructure/` (16 модулей: INDEX +
README + ideas/ + scenarios/) · `open-questions/` (FQ-шаблон) · `decisions/` (DECISIONS-LOG + ADR/SPEC
DRAFT) · `plan/` (M0→M8).
**План:** walking skeleton M0→M8. M2 = «переиспользовать agents-manager как runner»; агенты живут на
субстрате (Personality→Slot→Session = подграф). **R6: agents-manager зовёт ТОЛЬКО API графа, НЕ SQL.**

## Слой B — agents-manager / «Движ» (исполнение/нервы). Стадия: РАБОЧИЙ КОД.
**Что это:** durable шлюз Telegram↔Claude. Чистая гексагональная архитектура (порты-и-адаптеры).
**Порты (13):** IChannel, IAgentRunner, IApprovalGate, IQueue, IRouter + 9 репозиториев. Композиция
только в `app/build-app.ts`. Строгая дисциплина импортов (core без зависимостей).
**Своё состояние (SQLite):** `bots · agents · agent_bindings · sessions · jobs · messages · topics ·
seen_updates · summaries`. Репозитории = интерфейсы → SQLite один адаптер (Postgres меняется без
связности схемы).
**Поток:** conversationId → IInboundMessage → Router (команды/дедуп) → Job → Queue → TurnExecutor
(provision session · каскад PROMPT.md · budgets · runner · approval · persist) → IAgentRunner (print|sdk)
→ IOutboundMessage → Telegram.
**Конфиг на лету:** каскад `PROMPT.md` (chat→topic) + `config.json` (cwd/model) в `.gateway/conversations/`.
**Гейты:** job-level keyword + per-tool SDK canUseTool (3 кнопки TG).
**Роадмап (PLAN-0001):** Task/Plan-сущности → Dispatcher (мульти-топик) → safety-reviewer → автономный
ночной цикл. **Открытый 2a (на ADR): планы/задачи per-project vs универсальный `~/.claude`** — это прямо
про кросс-проектную/модульную архитектуру.

## Шов (где они встречаются уже сейчас)
- Плановая связь **уже заложена в Brain**: M2/R6 — шлюз = runner, живёт на субстрате, зовёт только API графа.
- Значит «Combination» не выдумывает связь с нуля — он **формализует и обобщает** этот шов до
  marketplace-контракта.

## Два узла напряжения (для Fable/ADR)
1. **Одно хранилище или два.** Brain: всё — узлы (пуризм субстрата). Шлюз: своя реляционная SQLite
   (sessions/jobs/messages). Слить операционное состояние в граф ИЛИ федерация двух БД + контракт?
2. **Два понимания «плагина».** Brain: policy-as-data + Engine Contract = плагин на уровне ДАННЫХ/движка.
   Шлюз: ports/adapters + registry = плагин на уровне ИСПОЛНЕНИЯ/кода. «Модуль marketplace» = свести оба.

## Рабочая гипотеза до Fable (проверить/опровергнуть его разрезом)
«Модуль» = **бандл**: {схема узлов/рёбер (типы) · политики (policy-as-data) · роль-агент (prompt+tools) ·
команды/UI · миграции/версия · манифест зависимостей+совместимости}. Brain = «storage-модуль», шлюз =
«runtime-модуль», «План» = прикладной модуль. Апгрейд = новая версия манифеста + миграция-как-узлы поверх
bitemporal (старые данные живут, новая интерпретация — новая транзакция). Форк = lineage-ребро к оригиналу
+ объявленная совместимость версий. Combination-проект = **владелец спеки манифеста + реестра + движка
апгрейдов/совместимости**; НЕ переписывает Brain и шлюз, а даёт контракт, которому оба подчиняются.
