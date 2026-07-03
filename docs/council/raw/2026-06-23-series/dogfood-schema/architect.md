# Stage 2 — Конкретная dogfood-схема графа проекта FF (предлагаемая)

- **Тема:** Превратить conception-mapping в КОНКРЕТНУЮ предлагаемую схему графа проекта FF — финальный список типов + их паспорта + рёбра + категории + версии. Проверить на реальных файлах репо. Описать конкретный путь Q11 «промоутить THREAD-узлы сейчас» (формат файла-ячейки, папка, связи), опираясь на готовый `docs/graph-example/`.
- **Роль:** system-architect (структурное мышление: границы, контракты, потоки данных).
- **Дата:** 2026-06-23
- **Статус:** raw (конкретный предлагаемый дизайн + путь миграции THREAD; НЕ финальная ратификация). Фаза = ДИЗАЙН, без кода, без «строй».
- **Опирается на:** `ADR-0002-thin-passport.md` (locked), `SYNTHESIS-2026-06-23-stress-test.md` (рёбра seq/binding, движок, модуль версий/lineage, stream-класс, инварианты), `conception-mapping.md` (Stage 1, ~28 типов), `docs/graph-example/` (готовый формат ячейки), реальность репо (`packages/core/src/node.ts`, `docs/`, `tools/`, `.claude/`), хвост THREAD N-068…N-089.

---

## 0. Дисциплина (три инварианта-привратника — каждый выбор ниже проходит через них)

Держу те же три инварианта, что Stage 1, чтобы схема не «потолстела» и не вскрывала payload:

- **I-1 Несущесть (ADR-0002 §Контекст).** Поле несущее ⟺ движок решает, как обращаться с ячейкой, БЕЗ вскрытия payload и БЕЗ знания типа. Всё прочее = payload / на ребре / в control-plane. Паспорт тонкий: **9 обязательных + 2 опц.** (`level?`, `canonical_id?`); `external_ref?` — третье опц. (валидировано VALIDATION-0002, N-053).
- **I-2 Принадлежность ⟂ Ссылка (stress §1, несущий пруф).** Ровно одно `home`-ребро = каскад-спина (лес, всегда ацикличен). Любая другая связь (`calls`, `uses`, `version-of`, `facet-of`, `depends-on`) = обычные рёбра, могут циклиться свободно. Это держит реальную кодовую базу без взрыва каскада.
- **I-3 Схема решается из паспорта (stress §3).** `schema` (`type@version`) ОДИН выбирает валидатор. Ветвление валидатора по значению payload запрещено → «один гибкий тип с дискриминатором в payload» нелегален; **вариант = свой тип + линза, собирающая «один логический объект».**

Если маппинг ниже напрягает один из них — флагую в §6, не гну молча.

**Уверенность по разделам:** §1–§3 (типы/паспорта/рёбра) — высокая (прямой вывод из locked-модели + проверено на файлах). §4 (категории/версии) — высокая на принципе, средняя на границах (что-узел/что-stream). §5 (путь Q11) — высокая (есть готовый формат graph-example, переношу 1:1). §6 (вопросы) — это и есть открытые места.

---

## 1. ФИНАЛЬНЫЙ список типов dogfood (предлагаемая схема)

Принцип каталога: **открытый реестр-данные**, не закрытый enum. Каждый тип = узел-`model-def` (control-plane), правила типа живут в нём, не в ядре. Все ~28 типов несут полный паспорт из 9 полей; в таблицах ниже — только НЕ-дефолтные/примечательные поля и характерные рёбра.

Группирую в 5 регистров (по плоскости назначения). Это **не** под-типы и не иерархия — просто читаемая группировка для человека; в графе все равны.

### Регистр A — control-plane (настройки, которым система подчиняется; это УЗЛЫ, Принцип 0)

| type | паспорт (примечательное) | характерные рёбра | репо-реальность |
|---|---|---|---|
| `model-def` | `epistemic: fact`, `source: human`, `level: how` | `validates →` (какие типы); `variant-of →` (deal-sale variant-of deal) | реестр «как выглядит ячейка `task`/`agent`/`commit`» |
| `lens` | предикат+disclosure в payload; `level: how` | `applies-to →` типы/scope; `enforce-at →` (promotion\|valve\|disclosure) | L1/L2/L3-зум, «что застряло», ABAC, code-level-линза |
| `pattern` | `recursion_terminator: prune\|mark-cycle`, `maxDepth` в payload | `composes →` подграфы | агрегация/группировка-по-уровню/декомпозиция; «2 режима контейнера» = 2 pattern-узла |
| `connector` | `key_schema`, `capabilities: read\|edit\|send`, `resolver` в payload; **first-party-only на `send`** | `binds-to-types →`; адресуется из `external_ref` | git · telegram · gmail · gcal · filesystem (каждый = свой узел, тот же паспорт) |
| `promotion-policy` / `valve-policy` | класс линзы hard-ABAC; `enforce_point: promotion\|valve`; **регистрация first-party-only (R4)** | `applies-to →` тип/scope | кто поднимает epistemic→fact; что требует одобрения перед записью-вовне |
| `skill-manifest` | какие линзы/типы/scope трогает + процедура | `grants →` линзы/типы; `scoped-to →` контейнер | по узлу на скилл в `.claude/skills/` + глобальные (ask-council, find-skills, pos-*) |
| `scope` | `global \| project:<id> \| container:<id>` | `contains →` | где видна переменная/тип/линза |

### Регистр B — агент-рантайм (список владельца msg 252)

| type | паспорт | характерные рёбра | репо-реальность |
|---|---|---|---|
| `agent` | `source: system\|human`; `principal` = арендатор агента | `uses-prompt →`; `assigned-to →` chat; `has-skill →` skill-manifest; `overlaps-with →` agent | 11 POS-агентов (analyst/architect/builder/critic…) в `.claude/` |
| `prompt` | `epistemic: fact`, `level: how` | `version-of →` (+`seq`); входящие `uses-prompt` от многих агентов | тела определений агентов, системные промпты; **один промпт у нескольких агентов = много входящих рёбер, не дубль** |
| `chat` | рабочее пространство | `home →` project/container; `assigned-agent →`; `contains →` message | совет, рабочая сессия мульти-агента |
| `session` | один прогон | `home →` chat; `produces →` trace | один council-run |
| `message` | **stream-класс** (§4) — почти голая, наследует дефолты от потока по home | `home →` chat/stream; `in-reply-to →`; `seq` на home-ребре | THREAD N-0xx; голосовые TG; обмены совета |
| `instruction` | `epistemic: fact`, `level: how`, `source: human` | `governs →` (что ограничивает); `home →` project/scope | CLAUDE.md, `.claude/rules/*`, «что Claude всегда читает» |
| `trace` | движок пишет; `source: agent\|system`, `epistemic: fact` | `by →` agent; `from/to →` (переход epistemic); `cites →` ноды | запись действия агента (что прочёл → что записал); лог промоушна; решения клапана |
| `agent-memory` | `sensitivity` per scope | `home →` agent; `about →` subject | устойчивые заметки агента |

### Регистр C — «работа» (сегодня хранится как DOCS)

| type | паспорт | характерные рёбра | репо-реальность |
|---|---|---|---|
| `goal` | `level: why` | `home →` project; `raised-by ←` dialogue | цели VISION/charter |
| `plan` | `level: what` | `home →`; `realizes →` goal; `connects-to →` code-structure; `part-of →` plan | `docs/plan/STRATEGY-*.md`; «планы привязаны к структуре кода» |
| `task` | `state` в модуле (open/doing/done) ⟂ `epistemic` | `home →` plan/container; `attaches-to →` (file\|folder\|instruction\|spec); `seq` для шагов | рабочие единицы |
| `spec` | `level: what` | `home →`; `specifies →` code-structure; `verified-by →` validation | `docs/spec/SPEC-core-kernel.md` |
| `analysis` | `epistemic: hypothesis\|fact`; `source: agent` | `home →`; `about →`; `cites →` | `docs/product/ANALYSIS-*`, council/raw, synthesis |
| `adr` | `epistemic: fact` после approve | `supersedes →` (настоящая замена); `decides →` | ADR-0001 (superseded), ADR-0002 (approved) |
| `dialogue-node` | типизирован под-видом (goal/insight/problem/decision…); `epistemic` per вид | `refines/answers/raises/tension-with/grounds →` | THREAD N-0xx — УЖЕ граф; пруф диалог=данные → §5 |

### Регистр D — код / версии (трудная половина — §4)

| type | паспорт | характерные рёбра | репо-реальность |
|---|---|---|---|
| `file` | `external_ref: {connector: git, key}`; `level: what` | `home →` folder (ОДИН); `facet-of →` категории (МНОГО); `version-of →` lineage | `packages/core/src/node.ts` |
| `folder` | контейнер; **home ≠ категория** | `home →` parent folder; `contains ←` | `packages/core/src/`, `tools/telegram/` |
| `category` | узел-цель классификации (НЕ home) | `facet-of ←`; `kind-of →` тип (умная категория, N-087) | «service» · «data-model» · «auth» |
| `function` | **derived, read-only** (файл=истина); лениво/по запросу | `defined-in →` file; `calls →` (может циклиться) | функции в node.ts — не материализуем жадно |
| `commit` | `external_ref: {connector: git, key: <sha>}`; `epistemic: fact`; immutable | `version-of →` lineage (+`seq`); `touches →` (file\|folder); `home →` lineage-anchor | git-история (1 коммит: a820f30) |
| `lineage` | модуль версий (§4); упорядоченная сосуществующая история | `version-of ←` (+`seq`); `home →` логический объект | цепочка коммитов, ревизии докторов, версии промптов |
| `setting` | `epistemic: fact`, `source: human\|system` | `home →` scope; `binds →` (live\|frozen) потребители | app-настройки, конфиг, реплицируемые значения |

### Регистр E — связь с реальностью v1-прототипа (мост от `node.ts`)

`@ff/core/node.ts` сегодня хардкодит **9 `NODE_KINDS`** (`task·note·thought·group·chat·agent·message·trace·summary`). Это v1-прототип под ADR-0001; **открытый реестр (~28 типов выше) его SUPERSEDES** — но мост однозначный, фиксирую таблицей (это закрывает Q1 как известное расхождение, не концептуальный спор):

| v1 `NODE_KIND` | → dogfood-тип(ы) | примечание |
|---|---|---|
| `task` | `task` | + `state` уходит в модуль, не в ядро |
| `note` | `analysis` / `spec` / `instruction` | «note» был слишком общим — расщепляется по назначению |
| `thought` | `dialogue-node` (вид insight) / inbox-`message` | «инбокс» = `stage` (движок), не тип |
| `group` | `folder` / `category` / `chat` / `scope` | v1 слил 4 роли в «group»; dogfood разделяет (см. Q3 — спор именно тут) |
| `chat` | `chat` | прямой |
| `agent` | `agent` | + промпт/скилл вынесены в свои типы (`prompt`, `skill-manifest`) |
| `message` | `message` (stream-класс) | прямой |
| `trace` | `trace` | прямой |
| `summary` | `analysis` (вид) / pattern-вывод | summary = производное линзы/паттерна, не корневой тип |

**Вывод моста:** v1 был «9 родов через `kind`-дискриминатор» — это РОВНО анти-паттерн `payload-дискриминатор`, от которого I-3 защищает на новом уровне (там дискриминатор хотя бы был на обложке-`kind`, а не в payload, но реестр был закрыт). Dogfood = открытый реестр + правила-в-`model-def`. `importance`/`status`/`parentId`/`tags`/`links` из `FFNode` тоже мигрируют: `importance`→`priority` на ребре, `status`→`state` в модуле, `parentId`→`home`-ребро, `tags`→`facet-of`-рёбра, `links`→несущие рёбра. Это в точности таблица Supersedes ADR-0002.

---

## 2. РЁБРА — словарь связей dogfood (с несущими полями)

Несущие поля ребра (ADR-0002): `to·rel·home:bool·priority·sort?·cascade?·cascade_order?·provenance·derived?` + **новые из stress: `seq`, `binding:live\|frozen`**.

| `rel` | несущие поля | смысл | пример из репо |
|---|---|---|---|
| `child-of` / контейнер | `home:bool` (ровно один true), `priority`, `cascade?`, `cascade_order?` | принадлежность + каскад-спина | file → folder |
| `facet-of` / `tagged-as` | (нет home) | многомерная классификация | file → category «service» |
| `version-of` | `seq` (NEW) | упорядоченная сосуществующая история | commit_N → lineage |
| `uses-prompt` / `assigned-to` / `has-skill` | — | рантайм-проводка (agent↔prompt↔skill↔chat) | architect → prompt-architect |
| `depends-on` / `calls` / `imports` | — (могут циклиться, I-2) | ссылка, НЕ принадлежность | node.ts → id.ts |
| `binds` | `binding: live\|frozen` (NEW) | живая привязка к общему значению (frozen = снимок) | task → setting |
| `supersedes` | — | НАСТОЯЩАЯ замена (сужена модулем версий) | ADR-0002 supersedes ADR-0001 |
| `governs` | — | инструкция ограничивает (read-always-контекст) | CLAUDE.md → project |
| `refines/answers/raises/tension-with/grounds` | — | связи диалог-графа | N-041 refines N-020 |
| `derived:true` | `rule_ref` | ребро вывел движок, read-only | function → file |

**Ключевая дисциплина рёбер (повторяю — это самое нарушаемое):** `priority` (важность, per-parent, N-041) и `seq` (порядок, не важность, stress §2A) — **РАЗНЫЕ поля**. Шаг-3 плана не «важнее» шага-2; коммит N — *после* N-1, не *выше*. `external_ref` — поле ПАСПОРТА, не ребро.

### 2b. Конкретный подграф — реальный коммит, трогающий файлы, с планом + спекой

Беру реальное репо: гипотетический PR «переписать схему ядра на passport-v2», трогающий `packages/core/src/node.ts` и `schema.ts`, под `SPEC-core-kernel.md`.

```
                    goal:"второй мозг, который действует" (level=why)
                              ▲ realizes
                    plan:"passport-v2 rewrite" (level=what)
                     │ home                 │ specifies
                     ▼                       ▼
        project:"FF-Personal-Mgmt" ◄─home─ spec:"SPEC-core-kernel"
             │ contains (home-спина)              │ verified-by
             ▼                                     ▼
     folder:"packages/core/src" ──home──► file:"node.ts" ──facet-of──► category:"core-schema"
             │ home                          │  ▲                    └─facet-of──► category:"service"
             ▼                               │  │ touches
        file:"schema.ts" ◄──────────calls───┘  │
             ▲                                  │
             │ touches                          │
        commit:"a820f30" ──external_ref{git,sha}──► connector:"git"
             │ version-of (+seq:1)
             ▼
        lineage:"node.ts history" ──home──► file:"node.ts"
             ▲ attaches-to
        task:"migrate kinds→open registry" ──home──► plan:"passport-v2 rewrite"
```

Чтение как контрактов:
- `task —attaches-to→ file —home→ folder —home→ project` = **каскад-спина** (sensitivity/scope/дефолт-линза текут детерминированно вниз по ней).
- `file —facet-of→ category`, `commit —touches→ file` = **ссылочные рёбра** — могут фан-инить 500-широко, циклиться, пересекать проекты, и **никогда** не возмущают каскад (I-2).
- `external_ref` коммита держит git книгой-истиной; узел-`commit` = карточка-указатель (ADR-0001 retained: «git = книга, узел = карточка»), не зеркалит diff.

---

## 3. МНОГОМЕРНОСТЬ — несущая точка (N-081), на реальном `node.ts`

Это первый пруф, что модель даёт то, чего ФС не может. Один конкретный файл: `packages/core/src/node.ts`.

**ДО — файловая система (single-home, вынужденно):** путь `packages/core/src/node.ts` ЕСТЬ идентичность. Выразить «это технически *сервис*», «про *домен data-model*», «область *core-kernel*», «часть *плана passport-v2*» — ФС предлагает только тупые инструменты: дубль файла (дрейф), договор имён (`node.service.model.ts` — сворачивает измерения в строку), или отдельный индекс (гниёт). **Один файл, одно место, один смысл.**

**ПОСЛЕ — наша модель (один home + много facet):**

```
file:node.ts (паспорт: id, type=file, schema=file@1, epistemic=fact, sensitivity=internal,
              source=human, principal=owner, external_ref={git,"packages/core/src/node.ts"}, level=what)
  ──home──────► folder:"packages/core/src"    (ОДИН каскад-родитель)
  ──facet-of──► category:"service"            (тех. срез)
  ──facet-of──► category:"data-model"         (домен)
  ──facet-of──► category:"core-kernel-area"   (область/владелец)
  ──part-of───► plan:"passport-v2 rewrite"    (участие в проекте)
  ──version-of► lineage:"node.ts history"     (своя ось истории)
  ──implements► spec:"SPEC-core-kernel"
```

**Что изменилось структурно:**
- **Идентичность отвязана от расположения.** `id` (ULID) — стабильный ключ; git-путь теперь *одно* `external_ref`, не идентичность. `git mv` → re-home сам перецепит дом (stress пруф 4), а все facet/version/spec-рёбра выживут (указывают на `id`, не путь).
- **Ячейка в нескольких местах сразу** — но `home` только ОДИН (каскад). Четыре `facet-of` несут **ноль** home → их может быть произвольно много без неоднозначности слияния (I-2 + BELONGING-инвариант). Это и есть N-081 «не плоско, не только вложенно — многомерно»: тех-срез × домен × привязки одновременно.
- **Запрос «все *service*-ячейки про *data-model* в *плане passport-v2*»** = линза, пересекающая три facet-оси — невозможно на ФС без параллельной БД, нативно здесь.

Это **уже материализовано** в `docs/graph-example/file-node-ts.md` — формат проверен и работает на md+frontmatter.

---

## 4. КАТЕГОРИИ и ВЕРСИИ — конкретно

### 4a. Категории (как живут)

`category` = **узел-цель** `facet-of`, НЕ контейнер. Несущие свойства:
- Категория **не несёт home** для своих членов → не каскадит контекст, не перетягивает scope. (Это инвариант «контейнер home ≠ категория», stress §2C — корень спора Q3.)
- «Умная категория» (N-087): `category —kind-of→ тип` — привязана к типу, может нести свои доп. поля/уровни определения (dropdown у «покупки», которого нет у «продажи»). Это мощно для ЛИНЗЫ.
- Член входит в категорию ребром `facet-of` (`provenance: manual` = файл-истина / `auto` = движок по правилу).

Уже материализовано: `docs/graph-example/category-service.md` (с `kind-of → type-file`).

**Предлагаемый стартовый набор категорий dogfood** (тех-срез × домен × область):
- тех-срез: `service` · `schema` · `tool` · `doc` · `config`
- домен: `data-model` · `agents-module` · `dialogue` · `integrations` · `qa`
- область: `core-kernel-area` · `telegram-area` · `whisper-area`

Каждая = узел `category@1`, цель `facet-of`. Открытый реестр — добавить = добавить узел.

### 4b. Версии / lineage (модуль; §2B stress — модель тут РАСТЁТ, честно)

Сегодня модель НЕ держит «сосуществующую упорядоченную историю»: `supersedes` = «старое мертво», `canonical_id` = «схлопнуть в одно». Ни одно не выражает «всё реально, упорядочено, сосуществует» (цепочка коммитов — постоянная история, не замена).

**Предлагаемая конструкция (модуль версий, БЕЗ новых полей паспорта):**
```
lineage:"node.ts history"  (узел-якорь логического объекта)
   ▲ version-of (seq:1)   commit:a820f30
   ▲ version-of (seq:2)   commit:<next>
   ▲ version-of (seq:3)   commit:<next>
   │ home → file:node.ts  (логический объект, к которому крепится история)
```
- Узел-`lineage` + рёбра `version-of` + `seq` (порядок) + `home` на якорь.
- `supersedes` СУЖАЕТСЯ до «настоящей замены» (ADR-0002 supersedes ADR-0001 — да; commit_N supersedes commit_N-1 — НЕТ, это `version-of`+`seq`).
- «Каждый вариант = тип» — **НЕТ** (взорвёт реестр на 120k коммитов). «Один логический объект через версии» собирается ЛИНЗОЙ.
- Граница «какой коммит становится узлом» — **открыта (Q6)**: на GitHub-масштабе коммиты = stream + rollup, материализуются лениво; но lineage нужны *адресуемые* точки. Для dogfood (1 коммит сейчас) — тривиально: каждый коммит = узел. Решать модулем.

### 4c. Stream-класс (масштаб; §2B stress)

`message`/`commit`/log-строки на масштабе: узел-`stream` держит полный паспорт, записи **почти голые** (наследуют поля от потока по home). Строки кода, call-sites, транзитивные зависимости — **НЕ узлы вообще** (правило оптимизации: вещь=узел ⟺ стабильный id + свой home + ценность как единица запроса). Для dogfood это касается прежде всего THREAD-сообщений (см. §5) и будущей git-истории.

---

## 5. Q11 — КОНКРЕТНЫЙ путь «промоутить THREAD-узлы сейчас»

Это самая практическая часть: THREAD-граф **уже** граф (N-001…N-089, каждый = `id · тип · статус · L-слой · links`). Промоушн = самый дешёвый первый реальный граф (без кода, md+frontmatter, валидировано). Опираюсь 1:1 на готовый `docs/graph-example/` (тот же формат паспорта+links+«Поведение»).

### 5a. Папка и именование

- **Папка:** `docs/graph/dialogue/` (рядом с `docs/graph-example/`, но это уже не пример — живой граф). Альтернатива — `docs/graph/` как корень будущего реального графа, поддиректория `dialogue/` под нити. **Рекомендую `docs/graph/dialogue/`** (оставляет `docs/graph/` под другие наполнители — проект/код — по регламенту).
- **Один файл = одна ячейка** (как graph-example): `N-041-importance-on-edge.md`. Имя файла = читаемый slug; **идентичность = `id` во frontmatter** (`dlg-N-041` или ULID), НЕ имя файла. THREAD-номера (N-041) сохраняем как human-anchor в id для прослеживаемости с исходной нитью.
- **Исходный `THREAD-2026-06-15-foundation.md` НЕ удаляем** — он остаётся human-readable «репетицией»/индексом. Промотированные ячейки = машинно-читаемая истина; нить = навигация для человека. (Это и есть «истина в 1 месте, проекция в других»: при желании нить становится производной линзы над ячейками.)

### 5b. Формат файла-ячейки (паспорт + рёбра + поведение) — пример N-041

```
---
id: dlg-N-041
type: dialogue-node
schema: dialogue-node@1
created: 2026-06-21
updated: 2026-06-21
epistemic: decision        # вид диалог-узла несёт epistemic-окраску (decision=решено)
sensitivity: internal
source: human
principal: owner
level: what
links:
  - { rel: child-of, to: thread-foundation, home: true, priority: 4, seq: 41 }  # ГДЕ ЛЕЖИТ + порядок в нити
  - { rel: refines, to: dlg-N-020, home: false }      # уточняет ранний узел (важность-на-ребре снимает возражение N-020)
  - { rel: grounds, to: decision-adr0002, home: false } # обосновывает ADR-0002
  - { rel: raises, to: dlg-N-046, home: false }        # породил синтез несущего
---

# N-041 — Важность = приоритет/сортировка НА РЕБРЕ (per-parent)

Важность относительна к родителю → снимает возражение N-020 против мультиродителя. importance уходит
из паспорта на ребро принадлежности. Остаток: направление/границы/дефолт.

## Поведение (комментарии)
- `child-of → thread-foundation` (home) + `seq:41` — ячейка живёт в нити, порядок=seq (НЕ priority).
- `refines → dlg-N-020`, `grounds → decision-adr0002` — обычные рёбра (не home); ячейка про другие узлы.
- `epistemic: decision`-вид — это РЕШЕНИЕ; линза «решения диалога» соберёт через тип+epistemic, не вскрывая тело.
```

### 5c. Как связывать (маппинг THREAD → рёбра)

THREAD-узлы уже несут `*links:* grounds→… refines→… answers→… raises→… tension-with→…`. Маппинг прямой:

| THREAD-нотация | dogfood-ребро `rel` | home? |
|---|---|---|
| (узел внутри нити) | `child-of → thread-foundation` + `seq:<N>` | **home: true** (один) |
| `refines→` | `refines` | no |
| `answers→` | `answers` | no |
| `raises→` | `raises` | no |
| `tension-with→` | `tension-with` | no |
| `grounds→` | `grounds` | no |
| вид узла (goal/insight/problem/decision/answer/principle/feedback/open-question) | → `epistemic` + payload; **тип остаётся `dialogue-node`**, вид = под-различие в payload/level, НЕ отдельный тип | — |

**Дисциплина I-3 здесь:** виды диалог-узла (goal/insight/decision…) — это НЕ 8 отдельных типов и НЕ payload-дискриминатор для выбора валидатора. Все = `dialogue-node@1` (один валидатор). Вид влияет на `epistemic`/`level`/линзу-проекцию, но валидатор один. Если позже вид начнёт требовать своей валидации (напр. `decision` обязан нести `decides→`) — тогда `decision` становится своим типом (`variant=тип`, I-3), а не дискриминатором. Сейчас НЕ требуется.

### 5d. Контейнер нити

Узел `thread-foundation` (type: `chat` или новый `dialogue-thread`):
```
---
id: thread-foundation
type: chat              # нить = рабочее пространство диалога (или dialogue-thread, если хотим отдельный тип)
schema: chat@1
epistemic: fact
sensitivity: internal
source: human
principal: owner
links:
  - { rel: child-of, to: project-ff, home: true, priority: 5 }
---
```
Все `dlg-N-0xx` → `child-of → thread-foundation` (home). Нить → `child-of → project-ff` (home). Каскад-спина: `dlg-N-041 → thread-foundation → project-ff`. По ней наследуются sensitivity (internal) и дефолт-линза. 89 узлов = 89 файлов; на этом масштабе stream-класс ещё НЕ нужен (порог ~300, STATE), материализуем все.

### 5e. Стоимость и порядок промоушна (конкретно)

- **89 узлов** в THREAD. Промоушн = механический: разбить нить на 89 ячеек по шаблону §5b. Без кода — ручной/полу-ручной (агент-помощник может сгенерировать из существующих `### N-NNN · type · status · L — title` + `*links:*`).
- **Порядок:** (1) создать `project-ff` + `thread-foundation` контейнеры; (2) промотировать pinned-узлы L0/L1 (несущие: N-040/041/046/048/052/078/084-089) — ~25 ячеек; (3) остальные по мере надобности (lazy). НЕ обязательно все 89 сразу.
- **Это безопасно делать СЕЙЧАС** (до движка): md+frontmatter — истина, движок добавит лишь валидацию/индекс позже. Риск: ручные рёбра могут разойтись с нитью → митигация: нить остаётся индексом-истиной до появления валидатора, промоушн идёт инкрементально.

**Рекомендация по Q11:** ДА, промотировать — но **инкрементально и начиная с pinned-узлов**, в `docs/graph/dialogue/`, формат §5b (1:1 с graph-example). Это даёт первый реальный граф без кода и без риска (нить-исходник сохранён как индекс).

---

## 6. ВОПРОСЫ-ДЛЯ-ОБСУЖДЕНИЯ (с провенансом)

Формат: **вопрос · откуда · почему важно · кому.** Помечаю владелец/агент.

1. **Q-A — Папка живого графа: `docs/graph/dialogue/` vs `docs/graph-example/` расширить?**
   *Откуда:* §5a vs готовый `docs/graph-example/` (N-089). *Почему:* graph-example помечен как «пример» (часть ячеек не материализована); живой граф должен быть отдельным деревом-истиной, иначе пример и реальность смешаются. *Кому:* **владельцу** (это «куда кладём первый реальный граф» — его решение по регламенту).

2. **Q-B — Виды диалог-узла (goal/insight/decision/…) = под-различие ОДНОГО типа `dialogue-node`, или отдельные типы?**
   *Откуда:* §5c + I-3 (вариант=тип vs дискриминатор) + Q8 stress (владелец склонялся к «один тип с вариантами»). *Почему:* если завтра `decision` обязан нести `decides→`, а `problem` — нет, валидатор расщепляется → по I-3 это РАЗНЫЕ типы. Сейчас один тип безопасен; нужно подтвердить, что виды НЕ требуют своей валидации СЕЙЧАС. *Кому:* **владельцу** (это конкретный экземпляр его открытого Q8 «вариант=тип+линза»).

3. **Q-C — `dialogue-thread` как отдельный тип, или переиспользовать `chat`?**
   *Откуда:* §5d (контейнер нити). *Почему:* нить ≈ чат (контейнер сообщений-обменов), но диалог-граф несёт refines/grounds-семантику, которой у обычного чата нет. Лишний тип = реестр-bloat; недостающий = потеря семантики. *Кому:* агенту (механизм), но **владельцу** флаг — это снова «когда новый тип оправдан».

4. **Q-D — Группа = И дом-папка, И категория для тех же членов? (повтор Q3 Stage 1, не закрыт)**
   *Откуда:* владелец N-074/N-081 («группы как категории», многомерность) vs инвариант «контейнер home ≠ категория» (stress §2C). *Почему:* **острейшее напряжение dogfood** — многомерность (§3) работает РОВНО потому, что home и facet раздельны; перенесёшь файл из `auth/` → молча потеряет ярлык «auth». Владелец сам отправил это в КОНСИЛИУМ (N-086). *Кому:* **владельцу** (он должен увидеть конкретную цену) + консилиум (механизм третьей конструкции, если цена неприемлема).

5. **Q-E — Открытый реестр (~28 типов) vs хардкод 9 `NODE_KINDS` в `node.ts`. Зафиксировать как известное расхождение?**
   *Откуда:* §1 регистр E (мост) — `node.ts` line 14 vs ADR-0002 «открытый реестр». *Почему:* работающий прототип противоречит locked-направлению; dogfood нужно ~28 типов, код даёт 9. Это код/спека-разрыв (не концепт владельцу), НО должно быть записано, чтобы никто не считал `node.ts` контрактом. *Кому:* агенту (фиксирует мост §1-E как divergence-запись; переписать `node.ts`=v2 ждёт «строй»).

6. **Q-F — Граница «какой commit/version становится узлом» на масштабе.**
   *Откуда:* §4b + Q6 Stage 1 (commits=stream+rollup vs lineage нужны адресуемые точки). *Почему:* 120k коммитов как полные паспорта = тот самый «9 полей × миллионы = налог», ради которого изобрели stream-класс; но lineage нужны *некоторые* адресуемые. Граница не определена. *Кому:* агенту (дизайн модуля версий).

7. **Q-G — `external_ref`: поле паспорта vs inline-в-payload-схеме ячейки?**
   *Откуда:* владелец N-073 («оба ок») vs I-1. *Почему:* если часть ячеек несёт его в паспорте, часть в payload — generic-резолвер должен проверять два места, ИЛИ теряем гарантию «движок резолвит без вскрытия payload» для payload-варианта. *Кому:* агенту (механизм) + **владельцу флаг**, что payload-размещение ослабляет I-1 для тех ячеек.

8. **Q-H — `instruction` (CLAUDE.md/rules) на каскаде: `home` в проект (каскадит scope всем) или только `governs→` (ссылка, не каскадит)?**
   *Откуда:* §1-B + Q5 Stage 1 (владелец msg 252 «инфа о корне проекта… чтобы задачи цеплялись»). *Почему:* инструкции = read-always-контекст. Home → каскадят на всё (может верно); только `governs→` → задачи цепляются, но не каскадят. Смешение переоткрывает home-vs-ссылка для целого класса. *Кому:* агенту (раунд).

9. **Q-I — Реактивность («каждое утро собрать застрявшее») — dogfood уже её хочет, модель не держит.**
   *Откуда:* stress §D + §6 Stage 1 Q10 — это рабочий процесс владельца сегодня вручную. *Почему:* модель держит *состояние*, не *подписки*; честный маппинг проекта обнажает, что реальная повторяющаяся задача агента не имеет дома в модели. Вне рамок по рамке владельца (ждёт topic-4/D1 + ADR-0003), но dogfood делает отсутствие конкретным. *Кому:* **владельцу** (topic-4/D1 — его открытый гейт).

10. **Q-J — `principal` для dogfood: кто арендатор, когда всё first-party (один владелец)?**
    *Откуда:* паспорт требует `principal` vs dogfood single-owner. *Почему:* поле обязательно, но ответ тривиален (`principal=owner`) → риск «мёртвого веса» до маркетплейса, ИЛИ риск недо-моделирования при первом внешнем агенте/коннекторе. *Кому:* агенту (вероятно «principal=owner для всех dogfood-нод; пересмотр в ADR-0003»).

**Разметка адресата:** владелец = Q-A, Q-B, Q-D, Q-I (+флаги Q-G); агент-раунд = Q-C, Q-E, Q-F, Q-H, Q-J (+механизмы Q-B, Q-D, Q-G).
