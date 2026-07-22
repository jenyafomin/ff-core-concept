---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-21
Scope: project
node_type: growth-map
title: GROWTH-MAP — как углубляется ветка доменов-моделей
Related:
  - ./README.md
  - ./01-knowledge-graph/knowledge-graph.concept.json
  - ../../../../01-organization/doc-discipline/restructure-2026-07/brain-top-level/11-facet-template-and-numbering.md
---

# GROWTH-MAP · 02-domains

> Как эта ветка растёт: домены-модели **деривируются из ценностей**, каждый раскладывается по фасет-шаблону.
> Карта = где мы сейчас + заготовки под будущие домены-модели (аспект 11.G — единицы пере-раскладываются в слоты).

## Принцип роста
1. Ценность (из `01-overview/01-values/`) → рождает **домен-модель данных**.
2. Домен заводится как нумерованная единица `0N-<domain>/` с фасет-слотами:
   `01-explain · 02-entities · 03-relations · 04-mechanics · 05-policy · 06-nuances` + `questions/` + `decisions/`.
3. Сквозные механики между доменами → НЕ дублировать: увести в `_shared/`/`_mechanics/` уровня (underscore),
   приписать доменам ссылкой.
4. Выявленное-но-нерешённое → `_unverified/` (рабочее имя) + крутить в `questions/` домена.

## Состояние доменов

| # | Домен-модель | Статус | Слоты заполнены | Примечание |
|---|---|---|---|---|
| 01 | **knowledge-graph** | КАНОН (эталон фасетинга) | explain, entities, relations, mechanics(9), policy | 06-nuances пуст; decisions ещё не со-локейтнуты |
| 02 | _category-taxonomy_ | заготовка | — | был stub `03-category-taxonomy-domain.md` (в `_archived/`); частично живёт в `01-knowledge-graph/04-mechanics/categories-tags-facets--decomp` — решить: свой домен или грань графа |
| 03 | _(домен-3)_ | не заведён | — | дериваци­я из ценности TBD |
| 04 | _(домен-4)_ | не заведён | — | дериваци­я из ценности TBD |
| 0N | _(домен-5, если родится)_ | не заведён | — | «если станет 5 — так же» (аспект 11.B) |

## Открытые развилки ветки
- **BR-1 решён:** это домены-ДАННЫХ; агенты-оркестрация — отдельная область (`02-agents/`), тут только редиректы в `_archived/`.
- **Category-taxonomy:** отдельный домен-модель ИЛИ грань внутри knowledge-graph (categories/tags/facets)? — держать в `01-knowledge-graph/questions/` до решения.
- **Сквозные механики:** какие из `04-mechanics/*--decomp` домена графа на самом деле сквозные (passport, layers, lens) и должны подняться в `_shared/`? — аудит по `MERGE-NOTES-2026-07-20.md`.

## Что дальше (заготовки под наполнение)
- Со-локейтнуть решения домена графа в `01-knowledge-graph/decisions/` + линк в глобальный `decisions.INDEX`.
- Наполнить `01-knowledge-graph/06-nuances/` уникальными нюансами модели графа.
- Перенести реальные развилки из `MERGE-NOTES` в `01-knowledge-graph/questions/README.md`.
- Завести домены 02-04 по мере деривации ценностей.
