---
status: active
owner: jenya.stasik@gmail.com
date: 2026-08-04
node_type: census
title: "Census — область: агентная система + шлюз + оркестрация"
scope: project
phase: DESIGN
related:
  - ../../../02-project/core/02-agents/INDEX.md
  - ../../../00-states/02-agent-system-mechanics/state.md
  - ../../../02-project/core/03-contract/INDEX.md
  - ../../../01-organization/process/bugs/gateway-dup/INDEX.md
  - ../../../01-organization/process/bugs/gateway-agents-die-on-restart/INDEX.md
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager
---

# Census — агентная система + шлюз + оркестрация

> Не-read: полный код `agents-manager` (только верхний уровень/ADR-ссылки из FF-доков); `docs/architecture/ADR/ADR-0001/0002` шлюза не открывал (внешний репо).

## Таблица домов

| Локация | Что | Тип | Зрелость | Служит | Свежесть/дрейф |
|---|---|---|---|---|---|
| `docs/02-project/core/02-agents/INDEX.md` | Обзор слоя агентов (руки над графом) | overview | draft | стык brain↔agents | 2026-07-06, не обновлялся под P1 |
| `docs/02-project/core/02-agents/01-orchestration/DESIGN.md`, `ADR-DRAFT-orchestration-state-plan-task-loop.md`, `node-types.md`, `edge-types.md`, `policy.md`, `modules.md` | STATE·PLAN·TASK·LOOP дизайн над 4 примитивами (Event Sourcing+CQRS) | design+ADR-draft | proposed, НЕ ратифицирован (ждёт 5 развилок) | механизм оркестрации | 2026-07-20, стух ~2 нед |
| `docs/00-states/02-agent-system-mechanics/state.md` | Активный пульт этой темы, привязывает ADR-DRAFT+design-queue | state | active | ведёт ратификацию ADR | 2026-07-19/20, не тронут с тех пор — вероятный дрейф от P1-факта |
| `docs/02-project/core/03-contract/INDEX.md` | Контракт brain⟷agents (что видно, что можно писать) | overview | draft, **не конкретизирован** (только рамка «клапан на необратимое») | стык двух ядер | 2026-07-06, старейший, без развития |
| `docs/02-project/core/02-agents/runs/INDEX.md` | Реестр прогонов агентов (журнал-указатель) | registry | draft, **пустой** (0 строк-записей) | трассировка прогонов | 2026-07-06, не используется |
| `docs/02-project/core/02-agents/loop-system/` (concept.json, DEFEKTOVKA, NAV.md) | Механизм петель (loop) — предшественник `01-orchestration/04-loop/` | design | частично устарел, помечен на сфолдинг в orchestration | детализация LOOP | 2026-07-15 |
| `docs/02-project/core/02-agents/ideas/01..03/` | 3 сырые идеи (наслойность/TG-бот, межагентное общение, self-understanding) | idea | draft, не decision | будущие направления | 2026-07-25/27 |
| `docs/02-project/core/02-agents/examples/01-agent-manager/` | Крупный учебный пример графа (defectovka, 13 узлов, процессы, extensibility) | worked-example | зрелый как учебный кейс, НЕ спецификация продукта | иллюстрация модели узел/акт/лента | 2026-07 (без даты в шапке INDEX, не проверял точно) |
| `docs/_log/2026-07-14-agents-audit-and-vision/VISION-agents.md` (+ raw/A1,A2) | Fable-видение слоя управления агентами: адресация=политика | vision (внешняя, advisory) | не ратифицировано в ADR | ценность слоя | 2026-07-15 |
| `docs/_log/2026-07-10-.../analysis/agents-manager-current-state.md` | Полная реальность-карта КОДА шлюза (хранилище/команды/каскад/персоны/egress/кнопки/пульт) на дату | reality-map | зрелый, детальный, но **снимок на 2026-07-10** | факт-основа для решений про шлюз | 2026-07-10, ~3.5 нед устарел — часть багов (RM-5 bold, dup) может быть уже тронута |
| `docs/_log/2026-07-11-agents-manager-battle-state/` | Терминология/форки/критика по шлюзу | analysis+backlog | review-уровень | UPGRADE-BACKLOG для шлюза | 2026-07-11 |
| `docs/_log/2026-07-26-ff-one-system-vision/design/04-gateway-topology.design.md` | Топология шлюза: owner-bot + business-gateway на ОДНОМ `@ff/engine` (fork F5) | design | draft, ссылается на ADR-0001/0002/0004/0006-0008 шлюза и FF | архитектурное решение интеграции | 2026-07-26 |
| `docs/_log/2026-07-26-ff-one-system-vision/post-M0-directions/T2-agents-manager-reconciliation.md` | Реконсиляция плана с реальностью agents-manager (T2) | analysis | review | сверка видения с кодом | 2026-07-26 |
| `docs/01-organization/process/bugs/gateway-dup/INDEX.md` | БАГ: дубль сообщения → убивает фоновых агентов + «тишина» | bug-doc | **active, живой, регулярный** | обход задокументирован (глобальное правило `orchestration-sync-under-gateway.md`) | 2026-07-13 |
| `docs/01-organization/process/bugs/gateway-agents-die-on-restart/INDEX.md` (+ `design/01-04`) | БАГ: фоновый агент не переживает рестарт хода → тишина; родственный класс с dup | bug-doc | **active**, есть root-cause analysis + ADR-draft рекомендации (пофиксить не начато) | тот же класс отказа | 2026-07-28, свежайший в этой области |
| `docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md` (OQ-4) | Batch/turn-идемпотентность + egress-outbox (T2 guard) — **вторая половина** dup-egress бага, НЕ построена | open-question | open, P1-приоритет в другом треке | закрытие бага стороны шлюза | 2026-08-04, самое свежее упоминание |
| `packages/rental-balance/src/agent/balance-observer.ts` | **Единственный реальный агент в коде** — читает граф, считает остаток, пишет `observation` обратно | код (не доки) | реализован, 9/9 тестов, reviewer PASS-WITH-CONDITIONS | первый write-back-цикл | 2026-07-28 (коммит), актуален |

## В коде vs дизайн

- **В коде:** ровно один агент — `balance-observer` (`packages/rental-balance/src/agent/balance-observer.ts`), первый write-back-цикл (граф→наблюдение→граф). До него — **0 агентов в коде** (факт зафиксирован в `docs/00-states/STATE.md:97`, коммит P1 `refactor-tree`, НЕ смёржен в main).
- **Дизайн:** весь `01-orchestration/` (STATE·PLAN·TASK·LOOP), `loop-system/`, `runs/`, `03-contract/`, 3 идеи в `ideas/` — ни одного строчного соответствия в коде FF. Пример `examples/01-agent-manager/` — учебный, не рантайм.
- Шлюз `agents-manager` (внешний репо) — зрелый работающий код (хранилище/команды/каскад-промптов подтверждены чтением исходников на 2026-07-10), но это ДРУГОЙ продукт/репо, не FF; связь — по упоминаниям/ADR-ссылкам.

## Живые баги шлюза (задокументированы)

1. `docs/01-organization/process/bugs/gateway-dup/INDEX.md` — дубль входящего убивает фоновых агентов + даёт «тишину» (нет дедупа входящих).
2. `docs/01-organization/process/bugs/gateway-agents-die-on-restart/INDEX.md` — фоновый агент не переживает `--resume`-рестарт хода; тот же класс, что и (1); есть root-cause + ADR-draft рекомендации, фикс НЕ реализован.
3. `docs/_inbox/2026-08-04-durable-store-substrate/questions/OQ-open-decisions.question.md` (OQ-4) — egress-outbox (T2 guard) на стороне шлюза вообще не начат → закрывает лишь половину dup-бага; отдельная волна, не в этом треке.
4. Обход на сегодня закреплён ГЛОБАЛЬНЫМ правилом `~/.claude/rules/orchestration-sync-under-gateway.md`: под шлюзом агентов запускать **синхронно**, не в фон.

## Контракт brain↔agents

`docs/02-project/core/03-contract/INDEX.md` существует, но содержит только РАМКУ (что кладём: контракт чтения/записи, границы, «клапан» на необратимое) — **ни одного конкретного правила не сформулировано**, файл не рос с 2026-07-06 (самый старый и самый недоразвитый дом в области). Фактическая проверка контракта на практике — только внутри `balance-observer` (код), но это НЕ отражено обратно в `03-contract/`. Разрыв: реализация обогнала контракт-документ.

## Изначальная ценность агентного слоя (одной фразой)

Слой, который ЧИТАЕТ граф базы знаний, ДЕЛАЕТ работу и ПИШЕТ результат обратно в граф (write-back), живущий как модульный «плагин» поверх субстрата — не хранилище заметок, а рабочая среда для агентов.

## Дыры карты (1-2)

1. Контракт brain↔agents — только заголовок; нет ни одного файла, где реально прописаны допустимые операции записи агента (частично закрыто ad-hoc в коде `balance-observer`, не вынесено в доку).
2. `docs/_log/2026-07-10-.../agents-manager-current-state.md` — единственная детальная реальность-карта кода шлюза, но снята **3.5 недели назад**; не проверял, актуальны ли выводы (RM-5 bold-баг, dup) на сегодня — новый OQ-4 (2026-08-04) говорит, что dup жив лишь наполовину закрыт, но это из другого трека (durable-store), не re-audit шлюза.
