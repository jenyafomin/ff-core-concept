# Метаморфоза памяти (пп. 20–24 семени) — что УЖЕ есть в проекте

- **Status:** draft
- **Owner:** jenya.stasik@gmail.com
- **Date:** 2026-10-11
- **Потребитель:** лид + свод линз метаморфозы (`metamorphosis/`), владелец при выборе «моста».
- **Поглощает:** ничего (сырьё линзы analyst; свод его заменит).
- Источник пп. 20–24: `B/ideas/2026-10-11-owner-seed-capture-graph.idea.md:50-62`.

## Факты по пяти вопросам

1. **Диалог-граф.** Протокол: `CLAUDE.md` (узлы N-NNN; типы goal/principle/open-question/answer/insight/problem/decision; связи refines/answers/raises/tension-with/grounds). Реально использован ТОЛЬКО в `docs/base/dialogue/THREAD-2026-06-15-foundation.md` (984 строки, N-001…N-104, ~217 упоминаний id; связи `refines→`, `answers→`, `tension-with→`, а также `corrects→`, `constrains→` — словарь уже шире протокола). Путь `docs/dialogue/` в CLAUDE.md устарел: папка уехала в `docs/base/` (архив). После июня — не продолжен; роль узлов взяли ADR/analysis/idea/question-файлы. Узлы — прозой, не машиночитаемо.
2. **Doc-tree + CGC.** doc-tree.md: папка-узел `NN-` «потенциал роста» (разделится), plural-контейнеры `ideas/ questions/ decisions/ analyses/`, закон 10 LOSE-NOTHING (датированные версии рядом), закон 9 статус `archived|superseded`. Это «вопрос → внутри идеи/ответы/анализы» ПОЧТИ дословно (структурная метаморфоза). Но CGC (`docs/01-organization/doc-discipline/growth-and-sequencing/CONVENTION-controlled-growth-cycle.md`) — НЕ expand→group→deepen: это жизненный цикл ЕДИНИЦЫ РАБОТЫ (вход→state→plan→работа→архив, 7 шагов). Ближайшее к «углубить» — шаг 4 «углубление = подпункты внутри плана»; «группировать в темы» — закон 3/4 doc-tree (консолидируй, нет loose-файлов), но как гигиена, не как итерируемый цикл «расширить слой абстракции; не расширяется — углубить». Цикла роста по абстракции в докам НЕТ.
3. **Brain/engine.** Журнал актов append-only (`packages/engine/src/adapters/replay.ts` — replayJournal, JournalSource; ADR-0008 log+graph CQRS). Freshest-wins + supersede с inherit-on-silence (`packages/engine/src/core/projection.ts:14,89,103`); merge рёбер по cardinality (`:114`). Genesis (`packages/brain/src/domain/genesis.ts:210-226`): предикаты `derived-from, motivated-by, informed, resolves, about, part-of, example, supersedes(one), variant-of(one, «резерв»), instance-of`; тип `decision` со статусом proposed/accepted/superseded (`:156`); `type-def/predicate-def` со статусом active/candidate/cold. Time-travel / as-of ЧТЕНИЕ — НЕТ в коде (grep `asOf` в src: только поле consent в `types.ts:112`); `axes-and-time.design.md:22` прямо: «движок time-travel отложен по D-5», битемпоральность только описана (§3). Хронология восстановима реплеем журнала, но читателя «срез на момент T» нет.
4. **Creative-ledger** (`docs/_log/creative-ledger.jsonl`, 33 записи): статусы seed(21)→candidate(9)→direction(3), типы insight/side-idea/link/rejected-gem/question; поля `link`, `source`. Это ровно «созревание» мыслей, но плоский jsonl без рёбер между зёрнами (только теги-ссылки на дома), без голосов; trace, gitignored.
5. **Голоса.** Нет структуры. Совет: `docs/council/raw/` (14 папок/файлов, агентские прогоны, напр. `2026-08-01-acts-as-git/ANALYSIS.md` — ментальная модель «акты как git», ближе всего к п.21) — голоса только как проза в синтезах («голос» встречается в facets/states/D3); кто-что-проголосовал не фиксируется.

## Таблица: элемент метаморфозы → где есть → чего нет → мост

| Элемент | Док-уровень | Код-уровень | Не хватает | Минимальный мост |
|---|---|---|---|---|
| Вопрос как семя, растёт внутрь (п.20) | doc-tree: папка-узел + `questions/ ideas/ analyses/`; THREAD-узлы `open-question→answer` | тип `note`/`task`; нет типа question | типа `question` и рёбер «вариант/ответ» | новые `u:`-типы `question`,`idea`,`answer` через type-def (кандидаты) + предикаты `answers`,`refines` (candidate) |
| Варианты/ответы | THREAD `answers→`; `.idea.md`/`.decision.md` | `variant-of` (one, резерв), `example`, `derived-from` | `variant-of` one → ветвление ограничено | снять резерв, many для вариантов или `refines` many |
| Агенты добавляют внутрь, кто взаимодействовал | council/raw (файлы агентов), ledger `source` | актор в акте (`principal`/actor), `informed` | связи «агент X → узел» как данные | брать актора акта как «кто»; взаимодействие = акт, не поле |
| Голосования | проза в council | нет | всё | предикат `endorses/opposes` (candidate, edge-паспорт с confidence) либо тип `vote`; минимум — ребро с паспортом (INTAKE-примитив) |
| Git-для-смысла, хронология (п.21) | `acts-as-git` ANALYSIS, ADR-0008, `axes-and-time` §3 | append-only журнал, replay, supersede | as-of читатель; битемпоральность | `read(asOf=T)` = фолд журнала до `recordedAt≤T` (журнал уже даёт; нужна лишь функция среза) — «линза времени» |
| Цикл роста expand→group→deepen (п.22) | частично: доктрина doc-tree 3/4 + CGC шаг 4 | нет | итерируемого процесса и его «узла-цикла» | описать цикл как скилл/луп (`лупы — развивать память`, К-вопросы); группировка = `part-of` на тему-узле |
| Позвоночник решений (п.23) | `decision` + ADR «Context/Alternatives»; THREAD `grounds→` | `decision`+`motivated-by`/`derived-from`/`informed`/`supersedes` | обязательность оснований; обход «почему» по времени | правило: `decision` без `motivated-by` → предупреждение; вид «позвоночник» = обход `motivated-by` по `recordedAt` |
| Дерево фактов+абстракций | doc-tree (3 архетипа), `part-of` | `part-of`, `instance-of`, `lens:` | — (структура есть) | абстракция = узел-родитель через `part-of`; уровни не нужны как поле |
| Созревание зёрен | ledger seed→candidate→direction | type-def/predicate-def `candidate→active` — ТА ЖЕ идея в движке | связь зерно↔узел памяти | ledger-запись = узел `note`/`idea` со статусом; `candidate` уже есть как механика |
| Статус/архив без удаления | status archived/superseded, LOSE-NOTHING | `supersedes`, `decision.status=superseded` | единый словарь статусов | выровнять словарь (draft/active/superseded/archived) в enum |

## Ключевой вопрос
Да, в основном: метаморфоза = дисциплина doc-tree (структура роста, LOSE-NOTHING, статусы) + диалог-граф (типизированные узлы/рёбра) + созревание ledger, перенесённые из файлов в журнал бейна. Но не «просто перенос»: (а) диалог-граф фактически умер после июня, и его словарь рёбер надо взять из реального THREAD (`corrects, constrains` тоже), не из CLAUDE.md; (б) CGC — не цикл expand→group→deepen, этот цикл новый; (в) в движке нет as-of-среза и структур голосов/взаимодействий — две реально новые вещи. Остальное — отображение: question/idea/answer → u:-типы, refines/answers/tension-with → candidate-предикаты, supersedes/informed/motivated-by уже есть.

## Риски
- Путь `docs/dialogue/` в CLAUDE.md неверен (фактически `docs/base/dialogue/`) — ссылка гниёт (L).
- `variant-of`/`supersedes` cardinality `one` ломает ветвление вариантов (M).
- Новый предикат-словарь рядом со старым THREAD-словарём = два дома истины (M); консолидировать первым.

## Неизвестное
- Как далеко THREAD использовался после N-104 в других местах (проверить grep по `N-1xx` вне base).
- Есть ли отдельный замысел as-of в ADR-0008 (не читал целиком).

Итог: решение-кандидат — метаморфоза ≈ doc-tree + dialogue-граф + ledger, перенесённые в журнал бейна; новое только as-of-срез и голоса/взаимодействия (рёбра с паспортом), мосты малые и перечислены выше.
