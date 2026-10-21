# Волна 1 / линза глубины: что из механики роста памяти УЖЕ есть в базе

- **Status:** draft · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-11
- **Потребитель:** лид волны 1 + свод линз цикла «как должна расти память?» (`../../README.md`), помощник при приёмке.
- **Поглощает:** ничего; уточняет `analyses/2026-10-11-capture-graph-intake/metamorphosis/analyst-exists.analysis.md` (его выводы проверены, расхождения ниже).
- Корни путей: `B=docs/02-project/core/01-brain/01-overview/05-brain-direction`; код — `packages/`.

## 0. Проверка прошлой инвентаризации
Подтверждено: предикаты `derived-from, motivated-by, informed, resolves, supersedes(one), variant-of(one,«резерв»)`, тип `decision` со статусом `proposed|accepted|superseded` (`brain/src/domain/genesis.ts:156-160, 210-226`); as-of чтения в `brain/src` нет (grep `asOf` пуст); в ledger 33 записи = 21 seed / 9 candidate / 3 direction. Дополнение: (а) ребро УЖЕ с паспортом в API (`brain/src/contract.ts:350-395` — `id, author, confidence, created_at, status=retracted`; `link` принимает `confidence`, `note`); (б) у записи есть `provenance.derived_from[]` и `source{kind:file|act|url, ref, hash}` (`contract.ts:224-230, 250-258`), но `stale` НЕ считается (AC-43, «форма без вычисления»); (в) `temperature hot|cold` и `include_cold` есть в контракте (`contract.ts:217, 294, 339`); (г) `initiative:agent` → статус `proposed`, подтверждение владельцем активирует (тест «initiative AC-45» зелёный) — это готовый «шов согласия» для предложений агентов; (д) неизвестный тип пишется как `raw` + `friction` (`domain/to-act.ts:408-428`) — «тип = тропа» работает как сигнал, но тип `question/idea` надо завести type-def'ом, иначе запись уйдёт в `raw`.

## 1. Таблица «элемент роста → где есть → доки/код/нигде → зрелость»

| Элемент | Где уже есть | Док / Код | Зрелость |
|---|---|---|---|
| Вопрос-узел | доки: папка-узел `questions/` (doc-tree), THREAD `open-question` (`docs/base/dialogue/THREAD-2026-06-15-foundation.md`, N-001…N-104); код: типа `question` НЕТ (genesis: task/decision/note/person/day/friction/scope/raw/type-def/predicate-def) | доки; код — нигде | доки зрелые, диалог-граф мёртв после июня; в мозге 0 |
| Идея | `.idea.md` в `ideas/`; ledger `type:insight/side-idea`; код: ближайшее `note` | доки; код — заменитель | доки зрелые |
| Голос/позиция агента | сырьё в `docs/council/raw/*` (прозой), `pos-debate/SKILL.md` (proposers→critics→rebuttal→synthesis); в коде — актор акта (`principal`, `author` ребра) | доки (проза) + код (актор) | позиции не структурированы: «кто что сказал» только в файле агента |
| Развилка | `questions/*.concept.json` визард (`questions/2026-10-11-owner-morning.concept.json`, 17 шагов); светофор 🟢🟡🔴 в SYNTHESIS; код — нигде | доки | процесс есть, объекта «развилка» нет |
| Голосование | `ask-council/SKILL.md` — совет + перекрёстный допрос + синтез; в `pos-debate` слов vote нет (grep пуст). Подсчёта голосов нет нигде; отвергнуто START §6 «не строить машину голосования» | доки (деливерация, не подсчёт) | «голосование» = синтез, не счёт |
| Решение | код: тип `decision` (`proposed/accepted/superseded`, `rationale`, `decided_at`) + `resolves/motivated-by`; доки: ADR, `decisions/` | код + доки | **код готов**, живых записей нет (мозг не запущен) |
| Коррекция/supersession | код: `supersedes(one)`, freshest-wins (`engine/src/core/projection.ts:14,89,103`), `record` с `id`+`expected_rev` (update), `retract:true`; доки: статусы `archived|superseded`, LOSE-NOTHING | код + доки | зрелое; ограничение: `supersedes`/`variant-of` cardinality `one` → ветвление вариантов не выражается |
| «Из чего выросло» | код: `derived_from[]`, `source{kind,ref,hash}`, предикаты `derived-from/motivated-by/informed`; ledger `link[]`; доки: `grounds→` в THREAD | код + доки | форма есть, вычисление свежести нет (AC-43) |
| Статусы жизни V4 | код: `temperature hot/cold`, `include_cold`, `type-def.status active/candidate/cold`, пресет «stale» (`brain/src/read/presets.ts:155-160` — устаревшие открытые задачи); доки: ledger seed→candidate→direction | код (частично) | остывание типов есть; автоматического остывания записей/идей нет |
| Уведомление владельца | код: нет; процесс: Telegram через шлюз, `morning`/`evening` пресеты `find`, `initiative:agent→proposed` (владелец подтверждает) | процесс + пресеты | механизма «развилка → пинг владельцу» нет |
| Линза «почему» / «git для смысла» | код: журнал append-only + replay (`engine/src/adapters/replay.ts`), `read` depth≤2 BFS (`brain/src/read/traverse.ts`), линзы-как-данные только `compose` для промптов (`brain/src/read/lens.ts:1-12`); доки: `council/raw/2026-08-01-acts-as-git/ANALYSIS.md`, `axes-and-time.design.md:22` («time-travel отложен D-5») | дизайн; код — основа | обход «почему» (по `motivated-by`) возможен вручную `read`; среза во времени и вида «позвоночник» НЕТ |

Паспорт-ребро: `link` даёт ребро с `confidence`/`author`/`created_at`/retract, но произвольный `note` и роль «голос за/против» в паспорте — только как `note`-строка; предикатов `answers/refines/endorses/opposes` нет (надо завести как `predicate-def` в статусе `candidate`).

## 2. Сверка 24 мыслей владельца
Покрыто базой (код или дерево): **3** (дерево+`part-of`), **4** (теги/категории — `scope`/`type`), **5** (журнал актов), **19, 2-в-форме** (журнал+`derived_from`), **20 частично** (дерево папок и ledger растут «вопрос→идеи», в мозге нет), **23 частично** (`decision`+`motivated-by`; обязательности нет).
Не покрыто / только бумага:
- **8 люди:** тип `person` (`pii:'person'`) и `referent` есть — слой заведён формой; «системно сохранять» не запущено, стирание (`erased` акт, `engine/src/core/erasure.ts`, `types.ts:256`) есть в движке, **НЕ подключено в `@ff/brain`** (grep `erase` по `brain/src` пуст) — тот самый гейт «авто-захват после hard_erase».
- **9 retention:** `temperature` есть; политик «не сохранять/удалять через время по источнику» нет (policy-as-data — решение 10-10 п.4, кода нет).
- **10 задачи разных проектов:** `scope kind project|company` + `in-scope/member-of` есть; связь задач с источниками другого типа — через `source{}` форму.
- **11 умные фильтры:** `find` (пресеты morning/evening/open/scope); произвольных фильтров/категорий-показа нет.
- **13 луп-цель на много проектов:** кода нет; ближе всего `lens compose` (но он про промпт-слои, не про цели).
- **14 линзы в памяти:** ЧАСТИЧНО ЕСТЬ — линза = `sys:lens` запись (`lens.ts`), но единственная форма `compose` (промпты); линзы-как-concept.json в памяти нет, `lens-as-data` в каталоге помечен candidate/gated.
- **16 генеалогия:** `altitude/question-genealogy.analysis.md` (~31 вопрос) — бумага; в мозг не переселена.
- **18 системы/роли:** `scope`+`principal`/readers (`service/readers.ts`) дают роли чтения, процесс как данные — нет.
- **21 git для смысла:** журнал даёт хронологию, читателя `asOf` нет.
- **22 цикл роста expand→group→deepen:** нигде как процесс (CGC — жизненный цикл единицы работы, не он); START §5 Б — первый ручной прогон.
- **21–24 голоса/голосования:** как структура — нет.

## 3. Самый короткий путь без новой стройки (только существующее)
1. **Ручной цикл Б → записи через уже готовые `record` + `link`.** Тип `decision` (есть) для решения; вопрос и идею писать как `note` с полем `text` и префиксом в label (`вопрос:…`), либо одним `type-def` кандидатом `u:question` (механизм `type-def` статус `candidate`, `genesis.ts` — без правки ядра, ADR-0017). Связи «из чего выросло» — существующие `derived-from`/`motivated-by`/`informed` через `link` (с `confidence`, `note`), supersession — `supersedes`. Все инструменты MCP уже есть: `record, find, read, link` (`brain-mcp/src/server.ts:96-136`).
2. **Предложения агентов → `initiative:agent` (статус `proposed`) → «да» владельца** активирует. Это и есть «голос агента, держим владельца в курсе» без машины голосования: каждый агент-линза пишет `proposed`-узел идеи, `derived-from` вопросу; владелец подтверждает единственным «да» (шов уже под тестом AC-45).
3. **Перенос ledger → мозг одним проходом:** `docs/_log/creative-ledger.jsonl` (33 записи, поля `id,type,seed,link,status,source`) отображается 1:1 на `note`+`status` (`seed→candidate→direction` аналог `type-def.status candidate→active`) — это ровно «созревание», уже придуманное и уже работающее в механике type-def.
Условие: мозг ещё не запущен (трек А — руки владельца, RUNBOOK); до этого шаги 1–3 можно только описать/вести в доках (так и сказано START §5 Б).

## 4. Чего реально не хватает (дельта, малая)
(1) `asOf`-читатель; (2) предикаты `answers/refines/endorses/opposes` (candidate) и тип `question/idea/answer`; (3) снять `one` с `variant-of` для ветвления; (4) подключение erasure в `@ff/brain` (гейт авто-захвата); (5) слой людей/retention как policy-данные; (6) пинг владельца при `proposed`; (7) правило «`decision` без `motivated-by` → предупреждение». Остальное — отображение существующего.

## 5. Тесты
Запущено только чтение: `packages/brain` → `npx vitest run` → **24 файла прошло, 1 пропущен; 214 тестов прошло, 1 пропущен; 20 с**. Утверждение «зелёные» подтверждено для `brain`. `packages/engine`, `brain-mcp` — **не проверено** (вне запроса). Живых записей мозга нет: мозг не запущен.

Итог: рост памяти на ~80% выражается существующими `record/link/decision/derived_from/supersedes/initiative:agent`; нового кода нужно мало (asOf, 4 предиката, erasure в brain), главное недостающее — процесс (цикл expand→group→deepen) и запуск.
Вопрос-цель: ответил — механика есть в доках почти целиком, в коде есть решение/провенанс/supersession/согласие-предложение, нет вопросов-типа, голосов, asOf, erasure в brain; вопрос верен, но стоит уточнить рамку: «чего не хватает» — не кода, а первого живого прогона.
