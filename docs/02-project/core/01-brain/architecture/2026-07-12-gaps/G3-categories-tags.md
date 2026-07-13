---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: gap-review
lens: categories-tags-projections
Related:
  - ../../domains/01-knowledge-graph/node-types.md
  - ../../domains/01-knowledge-graph/edge-types.md
  - ../../domains/01-knowledge-graph/policy.md
  - ../../domains/03-category-taxonomy-domain.md
  - ../modules/M-G3-type-registry-policy/README.md
  - ../../decisions/D3-canonical-type-names/EXPLAIN.md
  - ../2026-07-12-SYNTHESIS-matrix.md
  - ../../open-questions/2026-07-12-FABLE-types-categories-tags-brief.md
---

# G3 — Инвентарь: категории / теги / проекции (сырьё для Fable, не выводы)

## 1. Как выражены сейчас
- **Тип узла (node-type)** — ЕСТЬ. Строка реестра M-G3, паспорт `canonicalId/node-type/scope/storageLevel/...`.
  Определены 10 типов в `domains/01-knowledge-graph/node-types.md` (cell, document, container, concept, event,
  profile-ref→канон `profile`+`profile-ref` по D3, policy-node, view-def/flow-def, VariantGroup, journal-entry).
- **Категория (container+member-of)** — ЕСТЬ, но неполно. `node-types.md:29-32` определяет `container`
  (`containerKind: folder/category/pool`), дети присоединяются рёбрами `member-of` (thin-ref, `edge-types.md:26-27`,
  «множественная принадлежность = read-time вид, не дубль узла»). Нет схемы паспорта самого `container` кроме
  `containerKind`; нет ограничения глубины/цикличности иерархии.
- **Тег** — ДЫРА. Слово «tag» встречается только в policy `valueRef` («ценность как тег-источник на policy»,
  `M-G3/README.md:46`, `SYNTHESIS-matrix.md`) — это ДРУГОЙ смысл (метка ценности на policy-узле), не
  пользовательский тег на ячейке. Ни node-type, ни edge-type, ни свойство паспорта под «тег» нигде не заведено.
- **Грань/проекция (facet-of)** — ЕСТЬ как ребро (`edge-types.md:25`, thin-ref, «узел как грань другого узла, не
  полноценный факт-отношение»), но БЕЗ спецификации: сколько граней у одного узла, пересекаются ли они с
  `member-of`, различие «facet» vs «variant-of» не разведено фактами (только словом «не полноценный факт-отношение»).
- **Дом (home)** — ЕСТЬ, отдельное thin-ref ребро (`edge-types.md:24`), явно разведено с категорией: «отделено
  от категории, канон уже решил: 2 разных ребра». Ссылка на решение — не найден отдельный ADR/decision-файл,
  только упоминание в `docs/STATE.md`/brain INDEX (не проверено содержимое).

## 2. Где хранятся схемы типов и списки категорий
- **Схемы node-type/edge-type** — ЕСТЬ явный модуль: M-G3 (`architecture/modules/M-G3-type-registry-policy/README.md`),
  self-hosting реестр (типы = узлы `type-def`/`node-type-def`/`edge-type-def`/`view-def`), с гейтом добавления
  (`governed-by`→policy) против «свалки синонимов».
- **Списки категорий (системный модуль «категории»)** — ДЫРА, официально признанная. `domains/03-category-taxonomy-domain.md`
  помечен `Status: candidate` — вопрос «отдельный домен или грань домена 01» НЕ решён. `SYNTHESIS-matrix.md:53`
  прямо: «M-P5 Категории / Домен 03 — не углублялись». Рабочая гипотеза (не решение): категория = `container`-узел
  внутри домена 01, без выделенного модуля/схемы списков.

## 3. Мульти-типизация одной ячейки: механизм и ограничения
- **Механизм навесить N категорий/типов** — ЧАСТИЧНО ЕСТЬ: N рёбер `member-of` от узла к N контейнерам (без
  дублирования узла, read-time агрегация) — это явно написано. Альтернатива `VariantGroup(mode: and)` для
  мульти-принадлежности упомянута только как ОТКРЫТЫЙ вопрос, не решение: `domains/03-category-taxonomy-domain.md:27`
  «Мульти-категорийность — VariantGroup(and) или просто N рёбер?» — не закрыто.
- **Ограничение числа/пересечения** — ДЫРА. Нигде не задано: нет лимита на число `member-of`/`facet-of` на узел,
  нет декларации xor/or/and для тегов/категорий (VariantGroup имеет `mode: xor|or|and`, но применение к
  категориям/тегам не специфицировано — используется только для вариантов одного узла, не для мульти-категорий).
  Один node-type (например `cell`) — единственный тип на узел; смешение «типов информации» на одной ячейке
  («и встреча, и идея, и задача») НЕ имеет описанного механизма кроме `facet-of`, спецификация которого сама дыра (см. п.1).

## 4. Кто навешивает
- ДЫРА. Ни в `node-types.md`, ни в `edge-types.md`, ни в `M-G3/README.md` нет поля/актора «кто присвоил
  категорию/тег» (в отличие от `journal-entry`, где есть `actor` явно, `node-types.md:63`). Согласие/провенанс
  (Ц-7/Ц-3) заявлены как общий принцип в `policy.md:49` («consent/scope живёт на узле и на ребре»), но не
  привязаны конкретно к `member-of`/`facet-of`. Роль «особый пользователь» (упомянута владельцем в Fable-брифе)
  нигде в architecture/decisions не отражена — это чистый пробел, не покрытый даже гипотезой.

## 5. Стык домен 03 ↔ домен 01/02
- Домен 03 = кандидат, привязан к домену 01 гипотезой «container-узел» (`03-category-taxonomy-domain.md:22-24`).
- Глобальные vs проектные категории — заявлено как ОТКРЫТЫЙ вопрос («стык с доменом 02»,
  `03-category-taxonomy-domain.md:26-27`), решения нет. Аналогия есть в M-G3 policy (`scope`+`applies-to`,
  проектный override глобальной policy без переписи) — но это explicit для policy-узлов, НЕ перенесено фактически
  на категории/теги ни в одном файле.
- `SYNTHESIS-matrix.md:81` фиксирует риск прямо: «M-P5/Домен 03 — не разобраны; риск обхода type-gate через container-узел» —
  т.е. category/tag-слой сейчас может тихо создавать типы в обход M-G3-гейта, потому что нет собственной policy.

## Свод по пунктам задания
1. Тип — есть; категория — есть частично (container+member-of); тег — дыра; facet — есть как ребро, но
   недоспецифицирован; home — есть, разведён с категорией.
2. Схемы типов — есть (M-G3, self-hosting реестр). Списки категорий/системный модуль — дыра (домен 03 = кандидат, не углублён).
3. Механизм много-навешивания — частично есть (N×member-of); ограничение (число/xor-or-and) — дыра.
4. Кто навешивает — дыра (нет actor/consent поля на member-of/facet-of).
5. Стык домен 03↔01/02 (global vs project категории) — открытый вопрос, аналог в M-G3 policy не перенесён.
