---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: domain-index
domain: knowledge-graph
Related:
  - ../README.md
  - ../02-agents-orchestration-domain.md
  - ../03-category-taxonomy-domain.md
  - ../../synthesis/2026-07-12-fable-db-module/00-SYNTHESIS.md
  - ../../synthesis/2026-07-12-fable-basis-node-edge.md
  - ../../values/INDEX.md
---

# Домен 01 — 🧠 ГРАФ ЗНАНИЙ (память/ячейка)

> Раскрытие домена в папку (2026-07-12). **Старый файл [`../01-knowledge-graph-domain.md`](../01-knowledge-graph-domain.md)
> был stub — теперь свёрнут сюда**, оставлен как редирект-заглушка. Читать с этого README.

## Что за домен
Единый граф-субстрат: 2 физические таблицы (узлы, рёбра) + тонкий паспорт + payload. Всё остальное —
данные в реестрах (node-type, edge-type, view-def/flow-def, VariantGroup). Домент = «как хранится
память» (в отличие от домена 02 — «как устроена оркестрация агентов» и домена 03 — грань категорий).

## Под-файлы
| Файл | О чём |
|---|---|
| [node-types.md](node-types.md) | Реестр типов узлов: cell, document, container, concept, event, profile-ref, policy-node, view-def, VariantGroup, journal-entry |
| [edge-types.md](edge-types.md) | 2 класса связи (thin-ref / assertion-edge) + seed-реестр типов рёбер |
| [policy.md](policy.md) | 7 ценностей как policy-узлы, каскад Конституция > policy-as-data > integrity-as-engine-duty |
| [growth.md](growth.md) | Как домен растёт добавлением ДАННЫХ (INSERT типа/вида), не миграцией схемы |

## Опора
Базис узел/связь: `../../synthesis/2026-07-12-fable-basis-node-edge.md` · БД=граф-субстрат:
`../../synthesis/2026-07-12-fable-db-module/00-SYNTHESIS.md` · мастер-таблица ОБА:
`../../synthesis/2026-07-12-forks-both-variants/00-OVERVIEW.md` · 7 ценностей: `../../values/`.

## Главный открытый вопрос
Граница с доменом 02 (агенты/оркестрация): **память агента (Session/Personality/Slot) физически
хранится здесь** (узлы того же субстрата), но её смысл и владение принадлежат домену 02. Это грань
(один субстрат, два «читателя»), не разрыв домена — нужно явно зафиксировать в след. сессии.

## Прочие открытые вопросы (наследие stub)
- Домен 03 (категории) — отдельный домен или грань этого домена (`container` + `member-of`)?
- Что из `values/*` и `open-questions/` ещё не легло как node-type/edge-type реестра.
