---
title: Как это всё работает вместе — единая картина агентской системы на сквозном примере
type: overview
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-23
related:
  - ../01-overview/README.md            # карта 13 единиц + ~40 рёбер
  - ../03-schema/README.md              # единая БД: конверт + обычные поля + рёбра + политики
  - ../../_schema/envelope.md           # системный конверт узла
  - ../04-graph-view/README.md          # граф-вид + линзы
  - ../05-processes/README.md           # 9 процессов (механик движения)
  - ../concept.json                     # навигатор ветки (Q-8..Q-11 — открытые развилки)
---

# Как это всё работает вместе

> До этого файла мы раскладывали систему на части: 13 единиц (`01-overview`), один конверт для любого
> узла (`_schema/envelope.md`), граф со всеми рёбрами и линзами (`04-graph-view`), 9 механик по
> отдельности (`05-processes`). Здесь мы **собираем их обратно в один механизм** и прогоняем сквозь него
> живой сценарий — чтобы стало видно не «из чего система состоит», а **как она работает как целое**.

---

## 1. Вся система в одном абзаце

Агентская система — это **одна база-граф**, где всё лежит однотипными узлами (один системный конверт:
`id · type · state · edges · view · visibility · access · acts · policy_ref · body`), а поведение
задаётся не кодом, а **узлами-политиками**, которые движок читает. Вокруг агента живут 13 видов узлов:
поверхность ввода-вывода (`telegram-module`), пространство-настройка (`space` = TG-топик), сам `agent`
(собранный из `skill`/`mcp`/`playlist`), его методология как `loop`/`graph-loop`, единицы работы
`action`, что он выдаёт (`output`), сколько это стоило (`snapshot`), где живёт знание
(`knowledge-base`), кто заказчик (`user`), в каком `project` он работает, какие задачи (`planning`), и
что вообще произошло (`event`). Всё это **видно ИИ как данные** и связано каноническими предикатами
(`runs-in`, `composed-of`, `drives`, `sequences`, `emits`, `measures`, `scopes`, `triggers`…), у
каждого — инверсия, чтобы граф читался с обеих сторон. **Зачем:** чтобы «подключается, но невидимо»
(скиллы, MCP, правила, затраты) стало видимым субстратом, на котором можно строить, а любой вопрос
(«сколько стоило?», «что видит гость?», «из чего собран агент?») решался **новой линзой, а не новой
схемой**.

---

## 2. Единая диаграмма — как 13 единиц сцеплены в ОДИН механизм

Это не 13 отдельных карточек, а **один поток**: поверхность → пространство → агент → луп → действия →
выход → затраты → знание. Стрелки — реальные предикаты из словаря (`03-schema` §2). Читать сверху вниз
как ход одного разговора.

```
   ┌─ ПОВЕРХНОСТЬ ─────────────────────────────────────────────────────────────┐
   │  user:jenya ──produces──► event:voice-in ──receives⁻¹── telegram-module    │
   └───────────────────────────────────────────┬───────────────────────────────┘
                                                │ occurs-in
   ┌─ ПРОСТРАНСТВО (настройка «можно/нельзя») ──▼───────────────────────────────┐
   │  space:topic-56 ──scopes──► {user, agent, rule}                            │
   │        │ binds-to project:ff        │ hosts                                │
   │        ▼                            ▼                                      │
   │  project:ff ──owns──► {knowledge, task, rule, skill}   agent:ff-personal   │
   └─────────────────────────────────────────────────────────┬─────────────────┘
                                        event triggers loop → │ serves⁻¹ user:jenya
   ┌─ АГЕНТ (сборка из видимых узлов) ─────────────────────────▼────────────────┐
   │  agent:ff-personal ──composed-of──► {skill:concept, mcp, playlist:design}  │
   │        │ delegates-to ──► agent:critic#1                                    │
   │        │ drives                                                             │
   │        ▼                                                                    │
   │  loop:agent-map ──sequences──► action ──emits──► output                    │
   │   (graph-loop: phase→transition; loop-back возможен)                       │
   └───────────────┬─────────────────────────┬───────────────────┬─────────────┘
                   │ sequences               │ emits             │ measured-by
   ┌─ ДЕЙСТВИЯ ────▼──┐   ┌─ ВЫХОД ──────────▼──┐   ┌─ ЗАТРАТЫ ───▼──────────────┐
   │ action:draft-    │   │ output:msg-56       │   │ snapshot:ctx-14            │
   │ graph            │   │  targets {user,     │   │  measures {agent, action} │
   │  invokes skill/  │   │  space}             │   │  follows prev → delta     │
   │  mcp             │   │  delivered-by       │   │  attribution self/others  │
   │                  │   │  telegram-module ───┼──►│  policy:snapshot-adaptive  │
   └──────────────────┘   └─────────────────────┘   └────────────────────────────┘
                   │ invokes / reads                          ▲ policy_ref
   ┌─ ЗНАНИЕ ──────▼─────────────────────────────────────────┴─────────────────┐
   │  knowledge-base:ff ──stores/reads──► {user-knowledge, project-knowledge,   │
   │        agent-memory}     mode = embed | ref (policy:knowledge-ref)         │
   └────────────────────────────────────────────────────────────────────────────┘

   view/lens ── это НЕ ещё один слой, а угол зрения поверх ЛЮБОГО из узлов выше
               (напр. lens:loop-cost-tree над snapshot; lens:visible-to над space)
```

Одна фраза на весь рисунок: **событие с поверхности входит в пространство → пространство говорит, какому
агенту можно ответить → агент (собранный из видимых узлов) гонит луп → луп нанизывает действия → действия
рождают выход, который телеграм доставляет обратно → каждый шаг оставляет снапшот затрат и след в acts →
знание достаётся по ссылке или встроенно → а линза в любой момент показывает всё это нужным углом.**

---

## 3. Сквозной пример №1 (главный) — голосовое в топик → ответ + видимые расходы

**Сценарий владельца:** Женя надиктовывает голосовое в топик Telegram
(«собери мне граф-вид агентской системы»), а через минуту получает текстовый ответ и **видит, во сколько
это обошлось**. Проведём эти данные насквозь. На каждом шаге: какой узел рождается · какое ребро ·
какой ПРОЦЕСС из `05-processes` отрабатывает · какая политика/линза включается.

### Шаг 0 — поверхность приняла звук → родился `event`
Владелец шлёт `.oga` в топик. `telegram-module` (U5) принимает входящее.

- **Рождается узел:** `event:voice-in`, `type=event`, `state.status=received`.
- **Ребро:** `user:jenya ──produces──► event:voice-in` ; `telegram-module ──receives──► event`.
- **Процесс:** `event-trigger.process.md`, шаг 1 (событие семьи `intake.*` создаётся).

```json
{ "id": "event:voice-in", "type": "event", "state": { "status": "received" },
  "edges": [ { "predicate": "produced-by", "target": "user:jenya" },
             { "predicate": "occurs-in",   "target": "space:topic-56" } ],
  "body": { "source": "telegram", "kind": "intake.voice", "payload": { "file": "voice.oga" }, "triggers": [] } }
```

### Шаг 1 — событие «приземлилось» в пространство → включается `space-scope`
Прежде чем хоть что-то запустить, система спрашивает: **а в этом топике этому пользователю вообще можно
дёргать агента?**

- **Ребро:** `event ──occurs-in──► space:topic-56` ; `space ──scopes──► {user:jenya, agent, rule}`.
- **Процесс:** `space-scope.process.md` — резолв `member-of`, затем `policy_overrides` → иначе
  `policy_default`. Женя — владелец (`role:owner`), `can_trigger_agent=true` → **allow**.
- **Линза/политика:** `space.policy_default` + per-user `policy_overrides` (это и есть «настройка = данные»).
- **Честная оговорка:** для вложенного топика правило наследования от группы ещё не зафиксировано
  (Ограничение в `space-scope`, Q-11) — здесь спасает то, что актор = владелец.

### Шаг 2 — событие триггерит методологию → рождается `loop-run`
Правило срабатывания («на входящее голосовое — стартовать луп») лежит НЕ в событии, а в `graph-loop`/`rule`.

- **Рождается узел:** `loop-run:2026-07-23-b` (расходный экземпляр шаблона `loop:agent-map`).
- **Ребро:** `event ──triggers──► loop` ; `loop-run ──instantiates──► graph-loop` ; в событие
  дописывается `triggers[] = [{mechanism:"loop", ref:"loop-run:…-b", status:"fired"}]`,
  `event.state.status=processed`, `acts[] += transcribed`.
- **Процесс:** `event-trigger.process.md`, шаги 3–4 (mechanism=loop → новый `loop-run`,
  `history[0].triggered_by = "event:voice-in"`). Здесь же голос прошёл через `tools/whisper` → текст
  осел в `acts[]` как `transcribed`.

### Шаг 3 — какой агент отвечает + из чего он собран → `composition`
Пространство уже сказало `hosts agent:ff-personal`. Теперь агент собирается из **видимых узлов**, а не из
скрытого промпта.

- **Ребро:** `space ──hosts──► agent:ff-personal` ; `agent ──composed-of──► {skill:concept, mcp, playlist:design}` ; `agent ──serves──► user:jenya` ; `agent ──runs-in──► project:ff`.
- **Процесс:** `composition.process.md` — для каждого скилла ребро `composed-of` + `skill-binding`;
  плейлист прикреплён, но его `items[]` **не копируются** — разрешатся на чтении (следующий шаг).
- **Честная оговорка:** снапшот-vs-live composition не выбран (Q-1 composition) — фиксируется ли сборка
  на старте лупа или «дышит» с фазами.

### Шаг 4 — луп пошёл по фазам, фаза включила плейлист → `loop-run` + `playlist-bind`
Луп — это граф фаз, не линейный цикл. Входим в фазу `phase:frame`.

- **Ребро:** `phase:frame ──bound-to──► playlist:design` (полиморфная привязка, дефолт = фаза).
- **Процесс:** `playlist-bind.process.md`, путь `auto-on-phase` — `loop-run.current_phase == frame` →
  плейлист активируется сам, `playlist.state.active=true`, акт `list.activated (via auto-on-phase)`.
  Активный лист определяет, какие скиллы реально в игре на этот ход (связка с `composition`).

### Шаг 5 — фаза выполняет действие → рождается `action`
Внутри фазы происходит **единица работы** — тот самый узел, что раньше был дырой.

- **Рождается узел:** `action:draft-graph`, `type=action`.
- **Ребро:** `loop ──sequences──► action:draft-graph` ; `action ──invokes──► {skill:concept, mcp}`.
- **Процесс:** `loop-run.process.md`, шаг 3 (выполняется `phase.expected_action` → узел `action`).

### Шаг 6 — часть работы уходит под-агенту → `delegation`
`ff-personal` решает проверить черновик критиком (параллельная критика — по методологии владельца
«council/критик-проход»).

- **Рождается узел:** `agent:critic#1` (дочерний, `identity.role="critic"`, `model=policy.model_default`).
- **Ребро:** `agent:ff-personal ──delegates-to──► agent:critic#1` (обратное `delegated-by`).
- **Процесс:** `delegation.process.md` — проверка `policy.max_fanout`, спавн ребёнка, **явная** передача
  контекста (`runs-in`/`scoped-by` — не наследуется само), ребёнок эмитит свой `output`, а его стоимость
  ляжет в `attribution.others` родителя.
- **Честная оговорка:** глубина учёта (только прямые дети или всё поддерево) — Q-10, ещё не решена.

### Шаг 7 — каждый шаг оставляет след затрат → `snapshot-capture`
Затраты — не «текущее число», а серия срезов деревом.

- **Рождаются узлы:** `snapshot:ctx-14` (меряет `agent:ff-personal` + `action:draft-graph`),
  `snapshot:ctx-15` (меряет `agent:critic#1`).
- **Ребро:** `snapshot ──measures──► {agent, action}` ; `snapshot ──follows──► previous` (→ `delta`).
- **Процесс:** `snapshot-capture.process.md` — `policy:snapshot-adaptive` задаёт частоту (гуще при росте
  контекста), `attribution` делит расход `self` vs `others` по рёбрам `delegates-to`, агрегат по дереву —
  это **линза при чтении**, не отдельный узел-истина.

```json
{ "id": "snapshot:ctx-15", "type": "snapshot",
  "edges": [ { "predicate": "measures", "target": "agent:critic#1" } ],
  "body": { "loop": "loop:agent-map", "parent_agent": "agent:ff-personal", "tokens": 12030, "usd": 0.18 } }
```

### Шаг 8 — агенту нужно знание → `knowledge-resolve`
Чтобы собрать граф-вид, агент читает уже накопленное (напр. «владелец не спешит в код без явного строй»).

- **Ребро:** `agent ──views-via──► lens` ; `knowledge-base ──stores/reads──► {agent-memory, project-knowledge}`.
- **Процесс:** `knowledge-resolve.process.md` — `policy:knowledge-ref` говорит `mode=ref` → читаем
  указатель на партицию единой базы, БЕЗ копии; если партиция недоступна — `fallback=embed`.
- **Честная оговорка:** граница `project-knowledge` vs `agent-memory` размыта (Ограничение knowledge-resolve).

### Шаг 9 — действие родило выход → `output`
Черновик собран, критик вернул замечания, луп при необходимости сделал `loop-back` (`verify → build`) и
финализировал. Действие эмитит результат.

- **Рождается узел:** `output:msg-56`, `type=output`, несёт **собственные** `access` (что этим выходом
  можно) и `visibility` (кто видит) — отдельно друг от друга.
- **Ребро:** `action ──emits──► output:msg-56` ; `output ──targets──► {user:jenya, space:topic-56}`.
- **Процесс:** `loop-run.process.md` шаг 4 → передача в `output-deliver`.

### Шаг 10 — выход доставлен обратно в тот же топик → `output-deliver`
- **Ребро:** `output ──delivered-by──► telegram-module` ; `telegram-module ──delivers──► output`.
- **Процесс:** `output-deliver.process.md` — `output.scope` наследуется от `target.space` (может быть
  сужен, не расширен), `target` резолвится в `chat_id/thread_id` топика, создаётся `delivery-attempt`,
  успех → `output.delivery.status="delivered"`, акт `output.delivered`.
- **Важно (правило шлюза):** агент просто возвращает текст — адресацией в нужный топик занимается сам
  шлюз (см. `~/.claude/rules/gateway-telegram-egress.md`); это ровно то, что здесь моделирует
  `delivered-by telegram-module`.

### Шаг 11 — владелец видит расходы → линза расходов (`view`)
Женя получил ответ и хочет: «а во сколько встал этот заход?». Ответ строится **не новой таблицей, а
линзой** поверх снапшотов шага 7.

- **Линза:** `lens:loop-cost-tree` (`type=view`) — `over: type=snapshot`, `filter: body.loop=='loop:agent-map'`,
  `group_by: measures.target → delegation-tree`, `aggregate: sum + roll_up children→parent`.
- **Выход линзы:**
```
loop:agent-map — итого 60 150 токенов · $0.89
└─ agent:ff-personal    48 120 · $0.71
   └─ agent:critic#1    12 030 · $0.18   (под-агент, свёрнут в родителя)
```

**Итог трассы данных:**
`event:voice-in → (space-scope) → loop-run → (composition) → phase/(playlist-bind) → action:draft-graph →
(delegation) agent:critic#1 → snapshot:ctx-14/15 → (knowledge-resolve) → output:msg-56 →
(output-deliver) telegram → lens:loop-cost-tree.` Все девять процессов отработали над **одним графом**, ни
один не завёл своей отдельной базы.

---

## 4. Сквозной пример №2 (короткий) — «сколько это стоило?»

Владелец спрашивает уже ПОСЛЕ, отдельным сообщением: «а во сколько мне встала вся сессия в этом топике за
сегодня?». Здесь **нет нового лупа-стройки** — есть только линза над деревом снапшотов.

**Вход (узлы):** все `snapshot:*`, накопленные за день, с рёбрами `measures` на агентов/действия и
`follows` в цепочки.

**Вид (линза-конструктор):**
```json
{ "id": "lens:today-cost", "type": "view",
  "over": "type=snapshot",
  "filter": "occurs-in == 'space:topic-56' AND acts.at within today",
  "group_by": "measures.target -> delegation-tree",
  "aggregate": { "tokens": "sum", "usd": "sum", "roll_up": "children->parent", "trend": "by follows-chain" } }
```

**Выход:**
```
topic-56, сегодня — итого 3 захода · 141 900 токенов · $2.10
├─ agent:ff-personal   118 400 · $1.74   (тренд контекста ↑ к вечеру)
│   └─ agent:critic#1   12 030 · $0.18
└─ agent:critic#2       11 470 · $0.18
```

Ключ: тот же граф, тот же конверт, **другой угол** — `group_by`/`filter` поменяли, данные не тронули.
Новый вопрос = новый узел `view`, а не новая схема (`04-graph-view` §5). Процесс под капотом —
`snapshot-capture` (агрегат по дереву как линза при чтении, шаг 7).

---

## 5. Как читать это как ОДНУ картину

- **Это один граф в одной базе.** agent, space, snapshot, output, event — не пять подсистем со своими
  таблицами, а узлы с **одним конвертом**. ИИ смотрит на всё однородно: `id · type · state · edges …`.
- **Единый конверт = единый язык.** Раз у каждого узла есть `acts[]` + `cost_ref`, «кто, когда и какой
  ценой менял узел» отвечается **одинаково** для задачи, агента и сообщения — не надо N разных механизмов.
- **Рёбра держат сцепку, инверсии держат читаемость.** Любую стрелку можно пройти в обе стороны
  (`hosts`⁻¹ `runs-in`), поэтому «какой агент в этом топике» и «в каком топике этот агент» — один и тот же
  факт, не два.
- **Поведение — это данные (policy), а не код.** `snapshot-adaptive`, `knowledge-ref`, `space.policy_overrides` —
  узлы; движок их читает и ведёт себя по-разному в разных местах без ветвлений в коде (DEC-6).
- **Линза — не слой, а угол.** Расходы, «что видит гость», «задачи by-branch» — всё это `view` поверх тех
  же узлов. Добавить вопрос = добавить линзу, а не мигрировать схему.

---

## 6. Что картина ДОКАЗЫВАЕТ — а что ещё НЕТ

**Уже держится связно (модель работает как целое):**
- Сквозной путь `event → space → agent → loop → action → output → snapshot → knowledge → view`
  проходится без разрывов: у каждого перехода есть **ребро из словаря** и **процесс** в `05-processes`.
- «Невидимое стало видимым»: скиллы/MCP/плейлисты/затраты — это узлы (`composition`, `snapshot`), а не
  скрытая обвязка. Изначальная боль (`01-overview` §2) закрыта на уровне модели.
- Один конверт выдержал все 13 типов: `snapshot`, `output`, `action` легли в ту же форму, что `task`
  (см. живой JSON в `04-graph-view` §3). Реконсиляция (DEC-9) свела ~40 рёбер и развела перегруженные
  слова (`scope→visibility/access`, `lens→view`, `rule≠policy`).
- Линзы доказаны на трёх разных вопросах (расходы деревом · задачи by-branch · видимость гостя) — все три
  как `view`, без новой схемы.

**Ещё НЕ доказано — картина честно провисает здесь (открытые развилки, `concept.json` Q-8..Q-11):**
- **Q-9 — предохранитель лупа.** `loop-back` (`verify→build`) без `max_iterations` может зациклиться;
  побочки уже выполненного `action` при провале `exit_conditions` не откатываются. Пример №1 «сработал»,
  потому что критик вернул конечное число раз — но правило-стопкран в модели пока НЕТ.
- **Q-10 — учёт затрат по дереву.** `attribution.others` — только прямые дети или всё поддерево
  делегирования? Это **прямо меняет число** в линзе расходов (шаг 11 / пример №2). Одна развилка,
  повторяется в snapshot/delegation/composition — решить надо один раз, ещё не решено.
- **Q-11 — space/team/role как одна единица.** Новые рёбра `space--hosts-->agent`, `member-of` стоят на
  допущении, что это ОДНА единица с гранями. Если делим на три — рёбра **переезжают**, и шаги 1/3
  переописываются. Наследование политик вложенного топика тоже не зафиксировано (`space-scope`).
- **Q-8 — дубль представления.** `assigned-to` живёт и в `edges[]`, и удобной ссылкой в `body.links` —
  осознанная проекция или рассинхрон? По всей картине принято «истина — ребро», но правило не ратифицировано.
- **Общий предел (Q-7).** «Всё в одной БД» на этом примере не нагружено масштабом — killer-JSON фазы 2
  (`_generated-examples/`) ещё не прогнан, поэтому «не станет ли одна база тормозом» остаётся открытым.

> Короче: **скелет и проводка уже единые и связные** — данные проходят насквозь. Провисает не структура, а
> **несколько правил поведения на развилках** (стопкран цикла, глубина учёта затрат, деление
> space/role, дубль ребро/ссылка). Это и есть список на решение владельцу перед фазой 2.
