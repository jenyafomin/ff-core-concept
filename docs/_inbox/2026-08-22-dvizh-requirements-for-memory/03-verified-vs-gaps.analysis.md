---
id: ff:inbox-dvizh-verified-vs-gaps
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-22
related:
  - INDEX.md
  - 02-tech-requirements.analysis.md
---

# 3. Что у нас УЖЕ есть (VERIFIED, file:line) vs чего нет

Все пути — `/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/`, если не указано иное.

## VERIFIED — уже есть в коде

| # | Требование (см. файл 2) | Где VERIFIED | Что именно |
|---|---|---|---|
| R3 | side-journal акты, не проецирующиеся в граф | `packages/engine/src/core/types.ts:225-238` (`ACT_KINDS`) + `packages/engine/src/core/projection.ts:6-9,42-44` (`isProjectable`) | `ActKind` уже включает `observation \| command \| agent_trace \| system_telemetry` рядом с `domain_event`; `projection.ts` явно фильтрует: ТОЛЬКО `domain_event` фолдится в граф, остальное «едет журналом рядом». Ровно то, что Движ хочет получить из мех.02 (§1.5) — у нас это уже реализовано и протестировано (`packages/engine/test/projection.test.ts:130` — реальный тест с `actKind: 'agent_trace'`). |
| R5 | provenance + идемпотентность (dedup на replay) | `packages/engine/src/core/types.ts:256-260` (`Provenance{source_ref, snapshotHash}`) + `projection.ts:20-36` | `source_ref` = натуральный ключ проекции, `snapshotHash` = дискриминант «то же самое или новое» — «freshest wins» уже в `foldInto`. Движ это ТОЛЬКО проектирует (ADR-0005 draft, «барьер от повтора» — открытая задача мех.02). **FF здесь опережает Движ.** |
| R6 | гвард итераций/глубины как данные | `packages/engine/src/core/view-compiler.ts:166-192` (`loopGuard`) + `packages/engine/test/invariants.test.ts:124-137` | Реальная работающая функция: узел `type: 'loop-run'`, лимит читается из узла-политики через `policy_ref` (`body.max_iterations`, `body.on_exceed`), тест зелёный (`loop-guard trips when a loop-run exceeds max_iterations`). Форма ИДЕНТИЧНА тому, что Движ описывает как замысел (мех.08, «гвард глубины как данные»), но у нас работает КОД, а не только README. |
| R2 (частично) | рёбра «агент → выполняет» + запрос по агенту | `packages/engine/src/core/view-compiler.ts:145-164` (`actionsByAgent`) | Группирует узлы `type: 'action'` по inverse-ребру `performs` от агента — буквально «кто что делал», нужное для мех.06 (fleet-supervisor observability) Движа. Реализовано и типизировано, НЕ протестировано отдельным юнит-тестом (не нашёл `actionsByAgent` в test/*.ts — GAP теста, не функции). |
| R7 | двухосевая аутентичность исполнителя | `packages/engine/src/core/types.ts:262-314` (`PrincipalAssurance{whoActed, underWhoseAuthority, issuer, seamAuthority, delegation}`) | RESERVED FORM (ADR-0010/0011, ratified на форме), 0 миграций, но СХЕМА уже есть — тот же класс задачи, что у Движа появляется только сейчас в разговоре про owner-attribution/dup-bug. **Enforcement НЕ подключён** ни там, ни там — это честный паритет, не опережение. |
| R9 (частично) | «поведение как данные» на уровне ниже (не паттерн-агента, а predicate-cardinality) | `packages/engine/src/core/predicates.ts` (весь файл) | `cardinalityOf`, `LOCKED_PREDICATES`, `assertForwardMonotone` — реальный, протестированный (`predicates` упоминается projection.test.ts) механизм «правило хранится в реестре-данных, не в коде». Это НЕ то же самое, что `TypeUnit.fieldSchema` Движа (тот описывает ПОВЕДЕНИЕ агента/паттерна, наш — кардинальность связи), но методологически тот же принцип, уже проверенный на практике. |
| R1/R2/R6 (ВАЖНАЯ находка) | целый словарь агент-графа (agent/action/loop-run/graph-loop/task/event/output + рёбра triggers/drives/instantiates/sequences/measures) уже СПРОЕКТИРОВАН и ПРОГНАН | `docs/02-project/core/02-agents/examples/01-agent-manager/_generated-examples/` (`nodes.json`, `nodes-depth2.json`, `README.md`, `README-depth2.md:44-109`) | Это отдельная, более ранняя (2026-07-24) narrative-сессия, буквально названная «01-agent-manager» — уже строила ровно ту модель, которую сейчас просит Движ: дерево делегирования агентов (`agent:ff-personal → builder-A/thinker-B → explorer-A/B/C, loop-worker`), `loop-run` с `loop_backs`, `policy:loop-guard.max_iterations`, `cost-tree` (subtree vs direct rollup), `actions-by-agent`. **Депф-2 прогон реально исполнялся** (`node run-view-depth2.mjs`, вывод скопирован в README, не переписан руками) и **поймал стопкран на данных** («loop-guard tripped at iteration 6»). Токены `builder-A/thinker-B/explorer-*` — `measured` (реальные замеры той сессии); сама иерархия делегирования и `loop-worker` — `reconstructed` (собраны под тест, честно помечено). Это МЕНЯЕТ вывод файла 5: прецедент частичных реальных данных уже ЕСТЬ, просто в другом углу дерева доков и не подключён к текущему live-engine write-пути (`types.ts`/`projection.ts`) — тот же `loop-run`/`loopGuard` в `view-compiler.ts` явно ПОРТИРОВАН из этого корпуса (см. header-комментарий `types.ts:4-6`). |

## GAPS — чего нет

| # | Требование | Что отсутствует | Почему это дыра |
|---|---|---|---|
| R1 | типы узлов агент-работы (`agent-task`, `agent-finding`, `approval-decision`, `pattern`, `handoff`) | НЕТ ни одного из этих `type` в кодовой базе (grep по `EnvelopeNode.type` литералам в src/test не находит) — единственный «агентный» тип это `loop-run`/`action`, и оба существуют ТОЛЬКО как читаемые узлы в тестовых фикстурах, не как write-путь | Требование R1 сформулировано ПО АНАЛОГИИ с Движом, у нас нет ни одного реального агента, который бы писал такие узлы — см. файл 5. |
| R1/R6 | write-путь для `loop-run` | `loopGuard()` (`view-compiler.ts:177`) ЧИТАЕТ узлы `type: 'loop-run'`, но нет НИ ОДНОГО файла в `packages/engine/src`, который бы их СОЗДАВАЛ (grep `'loop-run'` находит только `view-compiler.ts` и `invariants.test.ts` — тест руками кладёт фикстуру) | Гвард существует «в вакууме» — потрогать в реальном сценарии некому. Это ровно тот разрыв, что Движ описывает про свои же поля graph-structure: «проводка проложена, тока нет» (§1.5). |
| R4 | approval-queue / pending-owner как проекция | Нет `view`-варианта `pending-approval` в `ViewDef.kind` (`types.ts:190-202`: только `cost-tree \| visible-to \| actions-by-agent`) | Добавить новый `kind` — это правка ЗАМОРОЖЕННОГО enum (`view-compiler.ts` комментарий «FROZEN: четырёхстадийный pipeline») — то есть небольшое архитектурное решение, не тривиальная правка. |
| R8 | topic/conversation-awareness | В `EnvelopeNode`/графе FF нет понятия «сессия диалога агента»; ближайшее — `docs/_log/` (файлы, не граф) | У Движа это ОДНО nullable JSON-поле, аддитивно (ADR-0004). У FF аналога нет вообще, т.к. FF-граф сегодня — про жизнь ВЛАДЕЛЬЦА (day-graph), не про работу агентов. |
| R10 | handoff как узел графа (не только `.md`) | `recursive-orchestration-method.md` и `session-logging` — оба чисто файловые (frontmatter, не Act) | Явно совпадает с тем, что у Движа ADR-0009 переводит `handoff.concept.json` в проекцию Unit — у FF этот шаг даже не начат как идея. |
| — | GrantBody / capability-node (`types.ts:214-221`) VERIFIED существует, но не связан ни с одним требованием агент-памяти выше | — | Не gap, а НЕИСПОЛЬЗОВАННЫЙ актив: `GrantBody{subject, in_scope, allow, deny, minted_by}` уже структурно близок к approval-праву («агенту Х разрешено Y в скоупе Z») — Движ такого явного узла-права не имеет (у него approval — per-request в БД раннера, не в графе). Это МОГ БЫ быть наш анкер для R4/R7, см. файл 4. |

## Итог
FF-engine ОПЕРЕЖАЕТ Движ по фундаменту (append-only + provenance/idempotency + predicate-as-data,
всё протестировано), но НЕ ИМЕЕТ ни одного реального агентного write-пути — все совпадающие с Движом
формы (`loop-run`, `actionsByAgent`) существуют только как read-стороны над РУЧНЫМИ тестовыми фикстурами.
