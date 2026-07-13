---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-13
Scope: project
node_type: briefing
Related:
  - ../2026-07-12-brain-concept-edges-flows/cross-ref-loop-engineering.md
  - ../../../02-project/core/01-brain/architecture/modules/M-P3-loops/README.md
  - ../../../02-project/core/01-brain/architecture/MODULES.md
externalRefs:
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/01-project/references/loop-engineering/VERDICT.md
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/01-project/references/loop-engineering/raw/source-extract.md
---

# 🧭 CONTEXT / БРИФ — «Паттерны взаимодействия с brain-системой на базе Loop Engineering»

> Общий бриф для агента-аналитика и Fable-адвайзера. Владелец поставил задачу голосом (2026-07-13, идёт спать):
> запустить тщательный анализ loop-prompting/loop-engineering репо → продумать, **КАК взаимодействовать с
> brain-системой**, разбить всё на **чёткие механизмы** → цель: **максимально гибкий инструмент**.
> Всё документировать в файлах. То, что делает Fable — в отдельные файлы с меткой FABLE.

## Задача (одним абзацем)
Взять внешний референс **loop-engineering** (github.com/cobusgreyling/loop-engineering, MIT, ~6.8k⭐,
Cobus Greyling) и, опираясь на уже спроектированный костяк brain-системы FF, **тщательно проработать
мелкие детали взаимодействия агентов с памятью-графом** и разложить их на отдельные, чётко очерченные
механизмы. Не «строим» — проектируем «КАК построить» (текущая фаза проекта = DESIGN).

## Что такое brain-система FF (короткая суть)
- **База знаний = граф узлов/рёбер = рабочий СУБСТРАТ для ИИ-агентов** (agent-first, НЕ notes-first).
  Всё, с чем работают агенты: задачи, метрики, люди, сообщения, память агентов, трейсы, конфиги, промпты, файлы.
- Хранение: md+frontmatter (файлы-истина), связи по `id`. Формат — паспорт/payload split.
- **Связь/ребро — первоклассная сущность** (не FK). Тип ребра = контракт каскада.
- Хребет: **Конституция > policy-as-data > integrity-as-engine-duty**. Поведение носят ДАННЫЕ (policy-as-data),
  не хардкод. Движок «оказывает услугу декларации».
- 3 scope (глобальный/проектный/локальный) + адресация path/node-ID/ref.
- Уже есть реестр модулей (см. MODULES.md): M-G1 движок памяти, M-G2 оркестратор, M-G3 реестр типов+policy,
  M-G4 локальность/резиденция, M-G5 идентичность; M-P1 планы, M-P2 telegram, **M-P3 петли/Loops**, M-P4 кокпит, M-P5 категории.

## Что уже впитано из Loop Engineering (модуль M-P3, НЕ пересобирать — строить НА этом)
Читать: `docs/02-project/core/01-brain/architecture/modules/M-P3-loops/README.md`. Кратко:
- **node-type `pattern`** — декларативный рецепт петли (goal, cadence, risk, phases, humanGates, tools/skills, cost, weekOneMode L1|L2|L3). Данные, не код.
- **node-type `task`** (LoopState) — экземпляр/шаг; инвариант **`doneBy` заполняет только verifier-агент**.
- Рёбра: `instance-of`, `executed-by`, `verified-by` (несущее ребро гейта), `derived-from` (DAG-провенанс).
- **3 защиты**: verifier-гейт · worktree-изоляция · circuit breaker — всё как **policy-узлы M-G3**, не константы.
- Петля НЕ держит свой стейт-стор → **пишет в общий append-only журнал** (Observation/WorkLog); гейт/breaker = **read-time проекция** того же журнала (одна правда).
- Открытые вопросы Fable уже зафиксированы: (1) гейт read-time vs материализованное поле; (2) verifier обязательно другой слот или self-verify по low-risk; (3) worktree — узел или указатель.

## Что такое сам loop-engineering (из разбора VERDICT.md)
- Смещение точки силы с «промпта» на «петлю»: системы, которые САМИ запускают/оркеструют кодинг-агентов во времени.
- 5 строительных блоков + память: Scheduling · Worktrees · Skills · Connectors(MCP) · Sub-agents(maker/checker) · +State/Memory (STATE.md).
- Машинная единица «паттерн» = `registry.schema.json` (петля описана ДАННЫМИ). Ключевой переносимый актив.
- Фазность L1(отчёт)→L2(патчи по allowlist+гейт)→L3(автономно+circuit breaker). Loop Ready Score (`loop-audit`). Cost-профиль на паттерн.
- STATE.md = хребет памяти вне разговора: High Priority · Watch List · Recent Noise · Run log.
- 7 паттернов: Daily Triage, PR Babysitter, CI Sweeper, Dependency Sweeper, Changelog Drafter, Post-Merge Cleanup, Issue Triage.
- CLI: loop-init, loop-audit, loop-cost, loop-sync, loop-context, loop-mcp-server, loop-worktree, goal-audit.

## ФОКУС ЭТОЙ СЕССИИ (что именно проектируем)
**Механизмы ВЗАИМОДЕЙСТВИЯ агентов ↔ brain-система**, разложенные на отдельные чёткие узлы-механизмы, так,
чтобы получился **максимально гибкий инструмент** (гибкость = поведение меняется правкой данных/policy, не кода).
Мелкие детали НЕ прятать — каждую называть и класть в свой механизм.

Ориентир на 6 стыков (из `raw/cross-system-loop.md` соседней сессии), которые НАДО довести до механизмов:
1. Как граф представляет паттерны петель, чтобы агент их читал/адаптировал.
2. Где/как хранится состояние петель; гидрация диспетчера после рестарта.
3. Как агент пишет обратно в граф без потери целостности; гварды/транзакции/версии/audit/верификация.
4. Как плагины подключаются к памяти; обязательные точки расширения (типы узлов, фасеты, scope, изоляция ошибок).
5. Как делятся права агент/пользователь на одном графе (RBAC/ABAC/ReBAC, линзы, гранты).
6. Как память эволюционирует вместе с системой (версии схемы, адаптеры, миграции, самоулучшение).

## Правила вывода (обязательно)
- Каждый значимый вывод = **файл** (артефакт важнее чата). Пути ниже.
- Для каждого механизма формат: `назначение · вход/выход · node-type/edge-type · policy-as-data · сейчас/позже (retrofit-cost) · открытый вопрос`.
- Помечать статус готовности: 🟢 ясно / 🟡 спорно / 🔴 заложить СЕЙЧАС (ретрофит невозможен).
- Fable-выводы — ТОЛЬКО в файлы `fable/FABLE-*.md`, помечены как продукт Fable.
- Тон: честно называть слабые места и «death by design». Не толкать к стройке.
</content>
