---
node_type: glossary
title: "Глоссарий бокса: ценность/грань · линза/проекция · акт · fold · журнал"
status: draft
topic: picture-coverage
owner: jenya.stasik@gmail.com
date: 2026-08-04
related:
  - ../README.md
  - ../analyses/01-building-blocks.analysis.md
  - ../analyses/02-values-lenses-acts-frame.analysis.md
  - ../../../02-project/core/00-kernel/terminology.md
source:
  - docs/02-project/core/00-kernel/terminology.md
  - docs/architecture/ADR/ADR-0008-log-and-graph-cqrs.md
  - docs/02-project/core/02-agents/examples/01-agent-manager/03-schema/act-kinds.design.md
  - docs/_inbox/2026-08-04-durable-store-substrate/councils/2026-08-04-S7-durable-store/abstract-reframe.md
---

# Глоссарий: ценность/грань · линза/проекция · акт · fold · журнал

> Короткие рабочие определения ТОЛЬКО для терминов этого бокса (picture-coverage). Кернел-канон —
> `docs/02-project/core/00-kernel/terminology.md`; при конфликте канон побеждает, здесь — сжатая
> выжимка + явная пометка, где данный бокс использует термин ШИРЕ канона.

**Журнал (акты-лента)** — append-only список актов, система-записи субстрата (write-model, ADR-0008).
Единственное, что хранится «навсегда» без пересборки. Источник: `ADR-0008` §1.

**Акт (act)** — один неизменяемый элемент журнала: `id · actor · provenance · recordedAt · actKind ·
edges (+ payloadRef/payloadHash)`. Единица правды-произошедшего, не единица смысла. Источник:
`packages/engine/src/core/types.ts` (`interface Act`).

**Вид акта (ActKind)** — governance-класс акта (кто пишет · реплеится ли в канон · retention). В коде
РОВНО 6: `domain_event · observation · command · access_event · agent_trace · system_telemetry`.
Источник: `types.ts:170-177`, `act-kinds.design.md` §1.

**fold** — чистая функция, сворачивающая последовательность актов в конкретный ответ:
`fold(journal, question-shape) → view`. В коде — `project()`/`foldInto()` (только для `domain_event`
→ current-state); в широком смысле S7-синтеза — общая операция, ролями которой являются граф, кэш,
ветка-гипотеза, синк, новый слой. Источник: `packages/engine/src/core/projection.ts`,
`abstract-reframe.md` («durable = ленту несгораемой; всё, что сворачивается — дёшево»).

**Проекция (projection)** — ОБЩИЙ класс: любой вычисленный вид над журналом (read-model). Не всякая
проекция названа и переиспользуема. Источник: `terminology.md` §4 («`lens` vs `projection`»).

**Линза (lens)** — КОНКРЕТНАЯ, именованная, переиспользуемая проекция, оформленная как view-запрос в
4 стадии `from · traverse · filter · shape`. В строгом кернел-смысле их РОВНО 3 (доказаны кодом):
`cost-tree · visible-to · actions-by-agent`. **В этом боксе термин используется ШИРЕ** — как синоним
«направления/проекции fold(journal)» (граф, семантический индекс, ранжированная память, аудит-вид,
as-of и т.д.), часть из которых designed-only или post-MVP, не только 3 доказанных. Это НАМЕРЕННОЕ
расширение владельца-темы бокса поверх кернел-строгости — см. `01-building-blocks.analysis.md`
таблицу 2 и находку №2 (доки/код расходятся) для точной границы. Источник: `terminology.md:198-206`.

**Ценность (грань, value facet)** — атомарное обязательство субстрата перед человеком/агентом
(«гарантирую тебе X»). 7 корневых ценностей (Читаемость·Тождество·Доверие·Витальность·Суверенность·
Реляционность·Согласие), каждая раскрыта в 6 граней-фасетов на диске (42 итого). «Ценностей много» в
формуле владельца = именно грани (42), не 7 корней. Источник: `01-brain/01-overview/01-values/
GROWTH-MAP.md`, дерево `01-chitaemost/…07-soglasie/`.

**Покрытие (coverage)** — существование цепочки `вид-акта → линза → ответ`, реально удовлетворяющей
грань, не нарушая инвариантов (I-1..I-14). Определение и рубрика приоритета — в
`02-values-lenses-acts-frame.analysis.md` §3-4 (этот файл не переопределяет, только ссылается).

**Роли fold (ветка · синк · кэш · слой)** — по S7-абстрактному синтезу это НЕ отдельные линзы/подсистемы,
а РОЛИ одной и той же операции fold(journal) над разными вопросами/reducer-ами. Введено, чтобы не
плодить «5-й-6-й-7-й примитив» под каждую новую функцию субстрата. Источник: `abstract-reframe.md`
Фаза 3.
