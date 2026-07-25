---
title: Depth-2 прогон — механически закрывает две честные дыры killer-кейса (subtree vs direct · стопкран лупа)
type: overview
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-24
related:
  - ./nodes-depth2.json                       # ВТОРОЙ корпус: 64 узла, глубина делегирования 2
  - ./run-view-depth2.mjs                     # движок depth-2 (linзы + стопкран)
  - ./README.md                               # первый (depth-1) killer-кейс — не заменяется
  - ./nodes.json                              # первый корпус (65 узлов) — остаётся зелёным
  - ../../_schema/envelope.md                 # системный конверт
  - ../../../../../_log/2026-07-23-agent-manager-example/FABLE-ADVICE.md   # DEC-11..13
---

# Depth-2: тест МЕХАНИЗМА обхода (не второе заявление о стоимости)

> Первый прогон (depth-1, `README.md`) вернул реальную сумму `181 946` токенов, но честно признал ДВЕ
> недоказанные дыры (`README.md` §«Что осталось честно недоказанным»):
> **(1)** глубина делегирования = 1 → `subtree` и `direct-children` совпадали, развилка Q-10 не видна;
> **(2)** `loop_backs = 0` → предохранитель `policy:loop-guard` ни разу не срабатывал.
> Этот корпус закрывает ровно их — **механически, исполнением** (`node run-view-depth2.mjs`, `exit 0`).

## Честная рамка (критично)

Это **тест механизма обхода дерева**, а НЕ вторая оценка реальной стоимости. Числа собраны так:

- **`measured` (реальные замеры ЭТОЙ сессии):** builder Дело A = `116 157`, thinker Дело B = `65 378`,
  explorer-A/B/C = `39 577 / 41 336 / 43 633`. Это настоящие token-замеры реальных под-агентов.
- **`reconstructed` (НЕ выдаётся за measured):** self главного = `57 400` (та же реконструкция, что в
  depth-1); внук `loop-worker` = `28 000` — этого внука в реальности не было, он заведён, чтобы у
  `thinker-B` был 4-й потомок с `loop-back` для проверки стопкрана. Помечен `reconstructed` и в данных
  (`snapshot:loop-worker.body.measurement`), и в выводе движка (`[RECONSTRUCTED]`).
- **Структура (иерархия «кто чей внук») — reconstructed.** Реальные измеренные агенты собраны в дерево
  делегирования глубины 2; сами по себе числа `measured`, но их взаимное расположение — сборка под тест.

## Как воспроизвести

```bash
cd docs/02-project/core/02-agents/examples/01-agent-manager/_generated-examples
node run-view-depth2.mjs
```

## РЕАЛЬНЫЙ ВЫВОД (скопирован из живого прогона, не переписан руками)

```
[1] ВАЛИДАЦИЯ МОДЕЛИ (конверт · рёбра-пары · meta-типы/example)
    ✔ OK — все узлы в конверте, все рёбра ведут в существующие узлы,
      каждый предикат объявлен парой в meta:pred, каждый тип имеет example.

[2] ДЕРЕВО ДЕЛЕГИРОВАНИЯ (глубина 2: main → дети → внуки)
    agent:ff-personal — ПОДДЕРЕВО 391 481 ток. (self 57 400 RECONSTRUCTED)
    ├─ agent:builder-A  self 116 157 ток. [measured]
    │  ├─ agent:explorer-A  self 39 577 ток. [measured]
    │  └─ agent:explorer-B  self 41 336 ток. [measured]
    └─ agent:thinker-B  self 65 378 ток. [measured]
       ├─ agent:explorer-C  self 43 633 ток. [measured]
       └─ agent:loop-worker  self 28 000 ток. [RECONSTRUCTED]

[3] ДВЕ ЛИНЗЫ НА ОДНОМ КОРПУСЕ — Q-10 материален?
    view:cost-tree-SUBTREE (self + ВСЕ потомки):        391 481 ток.
    view:cost-tree-DIRECT  (self + ТОЛЬКО прямые дети):  238 935 ток.
    ДЕЛЬТА (subtree − direct):        152 546 ток.
    сумма внуков (depth≥2):           152 546 ток.   ✔ дельта = внуки
    ⇒ ДЫРА 1 ЗАКРЫТА: развилка Q-10 материальна — линзы дали РАЗНЫЕ числа.

[4] СТОПКРАН ЛУПА (Q-9) — сработал ли предохранитель на данных?
    loop-guard tripped at iteration 6
      loop-run: loop-run:2026-07-24-deep  (iterations=7, loop_backs=6, max_iterations=5)
      on_exceed → halt+flag  ⇒ прогон остановлен + флаг владельцу
    ⇒ ДЫРА 2 ЗАКРЫТА: Q-9 из «заведён» → «сработал на данных».

МЕХАНИЗМ ДОКАЗАН НА ДАННЫХ: subtree≠direct (Q-10 материален) + стопкран СРАБОТАЛ (Q-9).
```

## Что это ДОКАЗЫВАЕТ

- **Q-10 материален (не декларация).** Один корпус, две линзы одного 4-стадийного вида (`view:cost-tree-*`),
  различие — единственное поле `shape.rollup.scope` (`subtree` vs `direct`). `subtree` = `391 481`,
  `direct` = `238 935`. **Дельта `152 546` = ровно сумма внуков** — то есть выбор «считать по поддереву»
  против «по прямым детям» меняет число на 152 546 токенов. При depth-1 эта дельта была `0` (потому и не
  доказывалась). Теперь развилка `policy:snapshot-adaptive.aggregate` имеет наблюдаемую цену.
- **Стопкран сработал.** `loop-run:2026-07-24-deep` имеет `loop_backs=6`, `iterations=7`; движок читает
  `policy:loop-guard.max_iterations=5` (через `policy_ref`), ловит превышение и печатает
  `loop-guard tripped at iteration 6`, `on_exceed=halt+flag`. Q-9 переехал из «заведён, но не сработал» в
  «сработал на данных». В графе это видно: `loop-run.state=halted`, `action:synthesize.state=skipped`
  (`not-reached`), `output:msg-deep.state=flagged`.
- **Инварианты depth-1 держатся.** Тот же валидатор (конверт · инверсные рёбра-пары · meta-типы с example)
  зелёный на новом корпусе; `run-view.mjs` над первым корпусом по-прежнему `exit 0` (не тронут).

## Состав корпуса (64 узла)

- **Дерево (7 агентов):** `agent:ff-personal` (main, depth 0) → `builder-A`, `thinker-B` (depth 1) →
  `explorer-A`, `explorer-B` (внуки builder-A), `explorer-C`, `loop-worker` (внуки thinker-B) (depth 2).
- **Прогон:** `user:jenya` · `project:ff` · `event:voice-deep` · `graph-loop:agent-map` ·
  `loop-run:2026-07-24-deep` · 10 `action:*` · `output:msg-deep` · 7 `snapshot:*` · 3 `policy:*`.
- **Линзы (4):** `view:cost-tree-subtree` · `view:cost-tree-direct` · `view:visible-to` · `view:actions-by-agent`.
- **Meta (27):** `meta:envelope` · `meta:type/type` (фикспойнт) + 13 `meta:type/*` · 13 `meta:pred/*`.

## Что теперь ЗАКРЫТО из честных дыр depth-1, что осталось

| Дыра depth-1 | Статус здесь |
|--------------|--------------|
| Глубина делегирования = 1; `subtree` vs `direct` совпадали (Q-10 не материален) | **ЗАКРЫТА.** depth 2, дельта `152 546 ≠ 0`. |
| `loop_backs = 0`; предохранитель ни разу не сработал (Q-9) | **ЗАКРЫТА.** `loop-guard tripped at iteration 6`. |
| Масштаб (Q-7): 64–65 узлов — не нагрузка | **НЕ ЗАТРОНУТА.** Нужен корпус 10³–10⁴ узлов. |
| self реконструирован, не измерен | **ЧАСТИЧНО.** self главного (`57 400`) и внук `loop-worker` (`28 000`) — `reconstructed`; остальные 5 узлов дерева — `measured`. Честный self главного = следующий прогон. |
| B2 (`task` дважды), B4 (переименования в `05-processes/`) | **НЕ ЗАТРОНУТЫ.** Вне этого дома — отдельный проход консолидации. |
