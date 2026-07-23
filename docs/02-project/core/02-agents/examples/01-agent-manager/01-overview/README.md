---
title: Agent-Manager — обзор идеи + КАРТА переменных и связей
type: overview
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../concept.json
  - ../02-defectovka/README.md
  - ../../README.md
---

# Agent-Manager — осмотр идеи и карта мира вокруг агента

## 1. Что мы делаем (одной фразой)

Собираем **пример «менеджера системы»**: выкладываем как **данные (граф)** всё, что живёт вокруг
агента — сущности, их переменные, связи и механики — чтобы стало видно, из чего система вообще состоит
и на чём её потом можно построить. Не список ради списка, а **связная карта**, где каждый узел — конструктор.

## 2. Зачем (боль)

- Сейчас многое «подключается, но невидимо для глаза» (скиллы, MCP, правила) → это **косяк**: всё,
  с чем работает агент, должно быть видно как данные.
- Пока нет карты — вторая итерация не ложится в правильное место, решения теряются.
- Нужен **agent-first** взгляд: не «заметки о системе», а рабочий субстрат, который ИИ читает и пишет.

## 3. Единицы (модели), вокруг которых всё крутится

> Каждая — **конструктор**, не строка. Ниже одна фраза; переменные/форма данных — в `02-defectovka/<единица>/`.

| # | Единица (node_type) | Что это, коротко |
|---|---------------------|------------------|
| U1 | **agent** | Действующее лицо. Собран из: скиллов, MCP-серверов, проекта запуска, методологии (луп), выходов. Может делегировать под-агентам. |
| U2 | **user** | Кого агент обслуживает. Запросы, поведение в разных чатах/темах, накапливаемое знание о нём. Агент может достать любую инфу по нему. |
| U3 | **project** | Контекст работы: знания, задачи, цели, состояние, правила, доп. скиллы. Сейчас живёт как документация — целится в базу знаний. |
| U4 | **space / team / role** | Пространство взаимодействия (TG-группа/топик = область настройки). Кто в чате, локальные разрешения, правила «можно/нельзя» под каждого. |
| U5 | **telegram-module** | Поверхность I/O: чтение/запись/команды, приём событий (аудио/фото/док), линзы-концепты для просмотра. |
| U6 | **planning-module** | Задачи (агентские и иные), привязка к проекту, **ветки/потоки**, роли. Отдельный модуль, не «поле задач». |
| U7 | **knowledge-base-module** | Базовые операции над графом знаний; через агента — настраиваемые ВИДЫ/линзы на разную информацию. |
| U8 | **skill / playlist(list)** | Скиллы как данные + **плейлисты** (листы), куда они складываются: для старта лупа, для проверки, для формата общения. Пересекаются → дерево листов. |
| U9 | **loop / graph-loop** | Методология работы агента как **граф лупа** (не линейный loop-engineering). Отдельный модуль, с которым агент умеет взаимодействовать. |
| U10 | **event** | Что происходит: со стороны агента, внутри системы (крон, уведомления), входящее (аудио/фото/док). Триггерит механики. |
| U11 | **cost / snapshot** | Как «живёт» ресурс: токены, потребление, **снапшоты контекста во времени** — сколько потратил сам агент и сколько другие. |
| U12 | **output / message** | Что агент выдаёт: текст/сообщения в чат, разные типы — с явным **access-контролем** (что можно этим выходом) отдельно от **visibility** (кто видит). |
| U13 | **action** | Что агент реально делает внутри фазы/лупа — единица работы между методологией и результатом: `loop --sequences--> action --emits--> output`. Несёт вызов скилла/инструмента, стоимость (снапшот), результат. Добавлен реконсиляцией (была дыра — узел упоминался, но не имел дома). |

## 4. Связи (граф — рёбра между единицами)

> Рёбра — из общего словаря предикатов (`../03-schema/README.md` §2). Каждое новое ребро объявляется
> **парой** (прямой/обратный) и поднимается сюда — иначе карта «лжёт». Мини-легенда пар — в конце раздела.

**Ядро (было):**
```
user(U2) ──interacts-with──> agent(U1) ──runs-in──> project(U3) ──has──> {knowledge, task(U6), goal}
agent(U1) ──composed-of──> {skill(U8), mcp-server, playlist(U8)}
agent(U1) ──delegates-to──> agent(U1)                    (под-агент / командная работа)
agent(U1) ──drives──> loop/graph-loop(U9) ──sequences──> action(U13) ──emits──> output(U12)
playlist(U8) ──bundles──> skill(U8) ──bound-to──> {loop-phase, format, check}
space(U4, TG topic) ──scopes──> {user(U2), agent(U1), rule}     (кто/что можно в этом чате)
telegram-module(U5) ──delivers──> output(U12) ; ──receives──> event(U10)
event(U10) ──triggers──> {loop(U9), action(U13), notification}
planning-module(U6) ──owns──> task(U6) ──belongs-to──> {project(U3), branch/flow}
knowledge-base(U7) ──stores──> {user-knowledge, project-knowledge, agent-memory}
cost/snapshot(U11) ──measures──> {agent(U1), action(U13), context, task(U6), loop-run(U9), event(U10), output(U12)}
```

**Добавлено реконсиляцией** (было объявлено внутри `02-defectovka/*`, но не поднято сюда — карта «лгала»):
```
agent(U1) ──serves──> user(U2)
agent(U1) ──scoped-by──> space(U4)
agent(U1) ──uses──> telegram-module(U5)
agent(U1) ──views-via──> view(U7)                        (было «lens» — унифицировано с envelope.view)
agent(U1) ──produces──> snapshot(U11)
agent(U1) ──performs──> action(U13)

user(U2) ──member-of──> space(U4)
user(U2) ──produces──> event(U10)
user(U2) ──owns──> user-knowledge                         (партиция U7; было точечно `user.knowledge_ref -->`, см. фикс в U7)

project(U3) ──owns──> rule
project(U3) ──owns──> skill(U8)

space(U4) ──binds-to──> project(U3)
space(U4) ──hosts──> agent(U1)                            (какой агент отвечает в этом пространстве)

telegram-module(U5) ──surfaces──> space(U4)
telegram-module(U5) ──exposes──> view                     (было «lens»)

task(U6) ──assigned-to──> {agent(U1), user(U2)}
task(U6) ──triggers──> loop/graph-loop(U9)
branch/flow(U6) ──sequences──> task(U6)
planning-module(U6) ──scoped-by──> space(U4)

graph-loop(U9) ──composed-of──> {phase, transition}
loop-run(U9) ──instantiates──> graph-loop(U9)
phase(U9) ──bound-to──> playlist(U8)                      (полиморфно: default=phase, может быть loop/task-kind — см. U8 activation.axis)
playlist(U8) ──extends──> playlist(U8)                    (дерево листов)
transition(U9) ──loop-back-to──> phase(U9)                (цикл — возврат к пройденной фазе)

event(U10) ──occurs-in──> space(U4)
event(U10) ──originates-from──> {agent(U1), user(U2), system}

output(U12) ──targets──> {user(U2), space(U4)}
output(U12) ──delivered-by──> telegram-module(U5)

snapshot(U11) ──bound-to──> {loop-run(U9), task(U6)}      (полиморфная граница измерения, тот же паттерн, что skill.bound_to)
snapshot(U11) ──follows──> snapshot(U11)                  (цепочка срезов одного subject → delta)

action(U13) ──invokes──> {skill(U8), tool/mcp}
```

**Мини-легенда инверсных пар** (полный словарь + правило объявления пар — `../03-schema/README.md` §2):

| Прямой | Обратный | Где встречается |
|--------|----------|------------------|
| `runs-in` | `hosts` | agent↔project |
| `composed-of` | `part-of` | agent/graph-loop → части |
| `delegates-to` | `delegated-by` | agent↔agent |
| `drives` | `driven-by` | agent→loop |
| `emits` | `emitted-by` | action/agent→output |
| `scopes` | `scoped-by` | space↔{user,agent,rule,output,planning-module} |
| `measures` | `measured-by` | snapshot→{agent,action,context,task,loop-run,event,output} |
| `triggers` | `triggered-by` | event→{loop,action}; task→loop |
| `bound-to` | `binds` | skill/phase/snapshot→{phase,loop-run,task} — **полиморфно**, несёт `axis` |
| `owns` | `owned-by` | project/planning-module/user → {rule,skill,task,user-knowledge} |
| `produces` | `produced-by` | agent/user → {snapshot,event} |
| `delivers` | `delivered-by` | telegram-module↔output |
| `targets` | `targeted-by` | output→{user,space} |
| `member-of` | `has-member` | user↔space |
| `instantiates` | `instantiated-by` | loop-run→graph-loop |
| `extends` | `extended-by` | playlist↔playlist |
| `views-via` | `viewed-by` | agent→view |

> ⚠️ `binds-to` (space↔project — структурная статическая привязка узел-узел) ≠ `bound-to` (полиморфная
> привязка через `axis`, напр. skill/phase/snapshot → phase/loop-run/task). Похожие слова, **разный**
> предикат — не путать при чтении графа.

**Два вещества одной системы** (важный рефрейм владельца): у агентской системы есть (а) **структуры/механики**,
где переменные живут независимо, и (б) **действия**, которые происходят внутри конкретной механики.
Сейчас мы работаем **данными** — фиксируем переменные и связи; на их основе строятся механики.

## 5. Важные моменты (не потерять)

- **Всё видно ИИ.** Скиллы/MCP/правила — не «невидимая обвязка», а узлы данных с состоянием.
- **Конструктор, не массив.** Любая единица управляется как данные (id · тип · состояние · связи · линза · акты).
- **Снапшоты во времени.** Затраты и контекст — не «текущее число», а история срезов (тренд, кто сколько потратил).
- **Пространства-настройки.** Чат/топик = область правил; под каждого пользователя — своё «можно/нельзя».
- **Линзы.** Одни и те же данные смотрятся разными видами (линза = метка вида, не копия данных).

## 6. Где что дальше

- Наполнение вширь по каждой единице → `../02-defectovka/` (по подпапкам-единицам).
- Крайне-детальные примеры-данные (JSON-конструкторы) → `../_generated-examples/` (фаза 2).
- Навигатор ветки (цель/направления/вопросы/решения) → `../concept.json`.
