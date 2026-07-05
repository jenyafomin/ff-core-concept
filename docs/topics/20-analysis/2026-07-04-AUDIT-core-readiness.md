---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-07-04
Related: ADR-0002 · 10-synthesis/2026-07-04-CONCEPT-unified-db-organization.md · 30-plan/2026-07-03-PLAN-agent-system-launch.md §3g
Source: sonnet-аудит по запросу владельца («насколько движок готов, можем ли стартовать»)
---

# АУДИТ — готовность @ff/core к walking skeleton v1

## 1. Что есть сейчас
@ff/core — 434 строки TS в 8 файлах (node/schema/store/levels/context/trace/id/index), Zod-валидация,
тесты идут (14/14, vitest). Ноль потребителей в репо (только demo.ts) и ноль реальных данных — код
написан, но не эксплуатировался.

Модель узла (`FFNode`): `kind` — ЗАКРЫТЫЙ enum из 9 значений (task/note/thought/group/chat/agent/message/
trace/summary), `title`+`body` (level вычисляется на лету), `tags: string[]` — плоский массив (не рёбра),
`parentId?` — одно поле-указатель (не ребро), `links: {to,rel}[]` — плоский массив без доп. полей,
`importance` (low/normal/high/pinned) — поле НОДЫ, `status`/`due` — только для task, `context?` —
CLAUDE.md-каскад по цепочке `parentId`, `actor?` — свободная строка, `created/updated`, `meta?`.
Store: `FileNodeStore` — один узел = один md-файл; `list()`/`query()` читают ВСЮ директорию в память
(индекса нет). `ancestors()` — цикл-гард только для single-parent. `trace.ts` — генерический recordTrace.

## 2. Дельта до ADR-0002 + V3
- **Паспорт — отсутствуют:** `epistemic`, `sensitivity`, `source`(типизир.), `principal`,
  `schema`(type@version), `canonical_id`, `level?`.
- **Есть, но неверной формы:** `kind`(закрытый enum) → нужен открытый type-реестр; `importance` на ноде →
  `priority`+`sort` на ребре; `parentId`-поле → `home:bool`-ребро («ровно один home»); `tags[]` → рёбра
  `facet-of`/`tagged-as`.
- **Рёбра:** нет `priority`/`sort`/`cascade`/`cascade_order`/`provenance`/`derived`; нет енфорса
  «ровно один home», разрешения ромба (DAG), re-home при удалении родителя.
- **Control-plane:** полностью отсутствует (ТИП/ЛИНЗА/ПАТТЕРН, promotion-policy, клапан, first-party-gate).
- **Инфраструктура V3:** нет SQLite-индексатора (M1 не начат), нет разделения authored/stream (каждый
  узел — файл: физически не выдержит «все telegram-сообщения + трейсы»), нет `query`/`getContext`
  с бюджетом, нет реестра типов с by-type валидаторами.

## 3. Вердикт готовности
**~15% переиспользуемо** (идея сериализации md+frontmatter, генерация id, паттерн trace, каскад context);
почти все конкретные структуры переписываются. Хорошая новость: **coupling=0, данных=0 → рефакторинг без
риска**; миграционного долга от кода — ноль.
- Выбросить: закрытый `NODE_KINDS`, `importance`-на-ноде, `parentId`-как-единственная-связь.
- Переписать: `schema.ts`+`node.ts` (паспорт v2), `store.ts` (edge-модель + инварианты).
- Дописать с нуля: SQLite-индексатор, control-plane, authored/stream, `canonical_id`-дедуп.

**Оценка walking skeleton v1 (builder/opus):** node v2 паспорт 2-3 дн · md-сериализатор authored/stream
1-2 дн · SQLite-индексатор (M1, read-only) 3-5 дн · query/getContext + мин. линза 3-5 дн · edge-модель
(home/priority/cascade/provenance + ромб + re-home) 3-4 дн · инжест докового корпуса 2-3 дн.
**Итого ≈ 14-22 builder-дня**, БЕЗ клапана/ADR-0003/gateway-интеграции (M3, позже).

## 4. План наполнения
Первый корпус — **`docs/tree-test/`** (совпадает с M1-целью концепта): активное свежее дерево, меньше
legacy, чем `docs/base/` (архив под старую схему — инжест задвоил бы работу). Вторая волна — диалог-узлы
`THREAD-*` (уже есть конвенция id/type/status — удобно проверять линзы и control-plane).
Риски разовой миграции корпуса: присвоение стабильных `id`/`type` задним числом, конфликтующие тайтлы,
выбор ОДНОГО home для доков с несколькими логичными родителями (структура папок ≠ валидный home-граф),
`cascade_order` для кросс-ссылок.
