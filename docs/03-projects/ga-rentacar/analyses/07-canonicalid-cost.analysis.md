---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-30
Scope: project
node_type: analysis
title: Цена canonicalId и модель персистентного узла (EnvelopeNode↔FFNode)
Related:
  - ../decisions/04-node-identity-canonicalId.adr-draft.md   # A2 идентичность узла (canonicalId) — ADR-черновик, гейтит M2
  - ../specs/07-durable-storeport.spec.md                    # A4 персистентный StorePort — потребитель модели узла (§2 требование 4)
  - ../specs/05-m3-topic-agent-contract.spec.md              # M3 §4 P3 — настоящий node-model ADR как предусловие
  - ../analyses/06-design-round-critic-verdicts.analysis.md  # вердикты критиков дизайн-раунда (REVISE)
---

# Цена canonicalId и модель персистентного узла (EnvelopeNode↔FFNode)

> **Статус: СТАБ (draft).** Файл заведён, чтобы снять висячую ссылку из `specs/05` и дать анализу цены
> постоянный дом. Здесь — рамка вопроса и что надо оценить; полный расчёт раскрывается, когда курс дойдёт
> до node-model ADR (P3, `specs/05` §6). Сейчас курс = M2.

## 1. Вопрос

Что стоит зафиксировать каноническую модель персистентного узла и ввести additive `canonicalId`
(A2, `decisions/04`) — по сравнению с текущим «непрозрачный JSON-блоб в `@ff/core`-note».

## 2. Текущее состояние (факт с кода)

- `store-md` несёт rental-конверт **непрозрачным JSON-блобом** в `@ff/core`-note; rental-поля
  **не** отражены в `links/tags/parentId`.
- Идентичность узла сегодня — без явного `canonicalId`; `decisions/04` предлагает **additive**
  `canonicalId` (НЕ opaque-UUID-везде), append-only фиксирует historical edge-targets.

## 3. Что оценить (оси цены)

1. **Миграция данных.** Ре-энкод существующих note-блобов в EnvelopeNode↔FFNode — обратимость, объём.
2. **Реконсиляция идентичности.** `same-as` (M2) ↔ `canonicalId`: как рёбра переживают смену канона,
   стоимость перестроения проекции.
3. **Read-path.** Влияние на `resolve()`/линзы — не ломает ли additive-поле существующую политику.
4. **Стоимость НЕ-решения.** Что ломается, если оставить opaque-блоб (агент не видит структуру →
   риск Q1 «грязные поля → агент соврёт»).

## 4. Выход

Рекомендация «делать / не делать сейчас» + вход в настоящий node-model ADR (P3). До расчёта — вопрос
**открыт**; `specs/05` и `specs/07` лишь ссылаются на этот дом, не предрешают ответ.
