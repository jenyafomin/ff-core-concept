---
node_type: design-note
title: snapshot-capture — как рождается снапшот затрат
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../02-defectovka/11-cost-snapshot/cost-snapshot.design.md
  - ../../_schema/envelope.md
  - ./README.md
---

# Процесс: snapshot-capture

## Суть
Ресурс (токены/контекст) — не текущее число, а **серия срезов**. Процесс — как срез рождается: с какой
частотой, как строится цепочка `delta`, как считается «дерево» вложенных затрат по под-агентам.

## Вход
- `policy:snapshot-adaptive` — `{target: snapshot, cadence, intensify_when, store: tree, aggregate: children}`.
- Субъект среза — `agent`, `action` или `context` (`subject_kind`).
- Предыдущий снапшот того же subject (для `delta`).
- Дерево делегирования (`agent --delegates-to--> agent`) — для `attribution`.

## Шаги
1. Наступает точка снятия среза — по `policy.cadence` (напр. per-action, per-phase, по таймеру).
2. Проверяется `policy.intensify_when` (напр. `context_growth > rate`) — если условие истинно, частота
   снятия срезов растёт (гуще, не реже).
3. Собираются сырые метрики субъекта на момент среза (`tokens_in/out/total`, `context_size`).
4. Ищется предыдущий снапшот того же subject (ребро `snapshot --follows--> snapshot`) → вычисляется
   `delta`.
5. Считается `attribution` ВНУТРИ текущего `scope` (луп/задача): доля самого агента vs доля дочерних
   агентов (по рёбрам `delegates-to`).
6. Создаётся узел `snapshot`: `{subject, subject_kind, metrics, delta, scope, attribution}`; рёбра
   `snapshot --measures--> subject`, `snapshot --follows--> previous`.
7. Агрегат по дереву (сумма/тренд по серии срезов детей) вычисляется КАК ЛИНЗА поверх истории при чтении
   — не хранится отдельным узлом-истиной.

## Выход
- Новый узел `snapshot` + звено цепочки `follows`.
- `agent.acts[]` может нести `cost_ref` на созданный снапшот (envelope §`acts[].cost_ref`).
- Агрегированный вид «сколько потрачено по дереву» — производная линза, не сохраняется отдельно.

## Ограничения
- **Формула адаптивной частоты не специфицирована.** `intensify_when: "context_growth>rate"` — идея, не
  формула; без порогов есть риск либо пропустить рост контекста, либо захлебнуться срезами при слишком
  чувствительном условии.
- **Глубина attribution не решена.** Считается ли `others` только по прямым детям делегирования, или по
  всему поддереву (внуки под-агентов тоже)? Это прямо меняет число «сколько стоила задача».
- **Аггрегат всегда пересчитывается заново** (не кэшируется как узел) — на глубоком дереве делегирования
  это потенциально дорогой запрос при каждом чтении тренда.

## Открытые вопросы
- Q-1: с какой частотой реально рождается snapshot — на каждый tool-call, на фазу лупа, или по таймеру?
  Прямо определяет объём истории.
- Q-2: `attribution.others` — только прямые `delegates-to`-дети, или всё поддерево делегирования?
- Q-3: снятие среза — синхронно в ходе агента, или асинхронно/батчем (влияет на задержку и точность
  `delta`)?

## Мини-пример
```json
// до: предыдущий снапшот агента
{ "id": "snapshot:agent-ff:...T13-50", "metrics": { "tokens_total": 3060 } }

// после: новый срез, delta и attribution по дереву делегирования
{
  "id": "snapshot:agent-ff:...T14-05",
  "metrics": { "tokens_total": 4300 },
  "delta": { "tokens_total": "+1240" },
  "attribution": { "self": 4300, "others": { "agent:critic#1": 900 } },
  "follows": "snapshot:agent-ff:...T13-50"
}
```
