---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-22
Scope: project
node_type: analysis
type: analysis
title: Одна агент-система + ресурсы (per-project/shared) + триггеры — как данные графа
tags: [data-strategy, needs-home, D1, D2, D5, resources]
Related:
  - INDEX.md
  - 03-key-capabilities.analysis.md
  - ../2026-08-22-directions-from-owner-answers/01-memory-as-universal-substrate/analyses/01-substrate-and-policy.analysis.md
  - ../2026-08-22-directions-from-owner-answers/02-microsystems-node-groups/analyses/01-microsystems-architecture.analysis.md
  - ../2026-08-22-directions-from-owner-answers/05-spaces-roles-access/README.md
  - ../2026-08-22-directions-from-owner-answers/03-vitality-salience-decay/analyses/01-vitality-vectors.analysis.md
engine_anchors:
  - packages/engine/src/core/types.ts:14   # SubjectRef
  - packages/engine/src/core/types.ts:214  # GrantBody
  - packages/engine/src/core/predicates.ts:44
---

# 04 · Одна агент-система, ресурсы, триггеры — как данные

## Важное предупреждение раньше решения

Этот пункт запроса владельца **пересекается напрямую с уже открытыми развилками** D1 (память-как-субстрат
+ policy-as-data) и D5 (пространства/роли/доступы, скрестить, шире rentacar) из портфеля того же дня
(`../2026-08-22-directions-from-owner-answers/INDEX.md`). D5 явно зависит от D1+D4+Ц7. Ниже — КАК это
ложится на существующие примитивы (форма), а не новое решение поверх ещё не решённых D1/D4/D5.

## Отображение на существующие примитивы (переиспользование, не изобретение)

- **«Одна агент-система»** уже представима: `SubjectRef` (`types.ts:14`, `'agent:ff-personal'` или глоб
  `'agent:*'`) — один агент-id (или семья под глобом) с грантами-возможностями (`GrantBody`: `subject`/
  `in_scope`/`allow`/`deny`/`minted_by`, `types.ts:214`), скоупящими, ЧТО она может трогать по проекту. Это
  ровно вектор D («личный модуль агента = его capability-набор»), уже названный в D1-разборе
  (`01-substrate-and-policy.analysis.md` §2.D) — вопрос владельца здесь НЕ новый, он уже открыт как D1/D4
  фактор («личный модуль без аутентифицированного принципала спуфится» — та же оговорка применима и тут).

- **«Ресурсы per-project vs shared, перераспределяемые»** — моделируется РЕБРОМ, не полем: узел
  `resource-pool` (общий) + рёбра `allocated-to` (кардинальность 'many' либо 'one' в зависимости от
  эксклюзивности — решается как ДАННЫЕ в `predicates.ts`, как уже сделано для rentacar) на узлы-проекты.
  Перераспределение = переписать target/вес ребра — обычная запись, без миграции схемы (Ц6: ребро как
  полноправная память первого класса — совпадает с паттерном D2 `member-of`/`bundles`, уже предложенным
  для микросистем). История per-project = собственные акты/рёбра узла-проекта (уже namespaced по
  `source_ref`); общая история = акты на самом узле `resource-pool`.

- **«Триггеры, меньше затратного»** — триггер естественно ложится как `domain_event`/`command` акт с
  payload, называющим условие (напр. `reminder-due`), ПРОИЗВОДИМЫЙ периодическим чтением уже существующей
  линзы («садовник», уже названный незастроенным в D3-разборе, `../2026-08-22-directions-from-owner-
  answers/03-vitality-salience-decay/analyses/01-vitality-vectors.analysis.md` §3, как асинхронный
  проход) — то есть триггер = линза + периодический актор, а НЕ новое поле в конверте акта. Это тот же
  строительный блок, что и «просрочки/напоминания по типу» из `03-key-capabilities.analysis.md` №3 — один
  механизм, два мотива (владелец видит дедлайн И агент-система троттлится/просыпается по тому же сигналу).

## Рекомендация к наполнению данными

Не фронтранить эту грань собственными фикстурами `resource-pool`/`allocated-to` ДО решения владельца по
D1 (где живёт логика разрешения policy) и D5 (домен пространств/ролей). Если нужен ранний прощуп —
ограничиться ОДНИМ узлом-проектом + ОДНИМ узлом-пулом + одним ребром `allocated-to` внутри той же
day-log-микросистемы (§02) — не отдельной инфраструктурой, а как ЕЩЁ ОДИН узел/ребро в уже растущем реальном
графе владельца. Это даёт форму на пощупать, не обязывая ни к какому решению D1/D5 заранее.
