---
node_type: analysis
title: "T-sameas-guard (CG-14) — D1.b precond 3 is a tautology; real-data replacement"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-05
related:
  - ../01-execution-plan.synthesis.md
  - ./00-coorch-framing.md
  - ../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../packages/engine/src/adapters/store-durable-fs.ts
  - ../../../../../../packages/engine/src/core/projection.ts
  - ../../../../../../packages/engine/src/core/erasure.ts
---

# T-sameas-guard (CG-14) — precond 3 is a tautology; real-data replacement

## A. Код-механика тавтологии (якоря дословно)

`packages/engine/src/core/predicates.ts:49`
```
export const LOCKED_MANY_PREDICATES: ReadonlySet<string> = new Set(['same-as']);
```

`packages/engine/src/core/predicates.ts:57`
```
  if (LOCKED_MANY_PREDICATES.has(predicate)) return 'many'; // lock wins over any registry (identity ceiling)
```
(inside `cardinalityOf`, line 56: `export function cardinalityOf(predicate: string, registry: PredicateRegistry = DEFAULT_PREDICATES): Cardinality {`)

`packages/engine/src/core/predicates.ts:78` — the guard the plan cites:
```
export function assertForwardMonotone(prev: PredicateRegistry, next: PredicateRegistry): Problem[] {
```
Its failure condition, line 84:
```
    if (before === 'many' && after === 'one') {
```
where `before`/`after` come from `cardinalityOf(predicate, prev)` / `cardinalityOf(predicate, next)` (lines 82-83).

**Why it is structurally unfalsifiable for `same-as`:** `cardinalityOf` checks `LOCKED_MANY_PREDICATES.has(predicate)` **first** (line 57), before ever consulting `registry[predicate]`. For `predicate === 'same-as'` this branch always returns `'many'`, unconditionally — no caller-supplied `prev`/`next` registry value can reach the `registry[predicate] ?? 'many'` line (58) for this predicate, because the lock short-circuits. Consequently, in `assertForwardMonotone`, for `predicate === 'same-as'`: `before === cardinalityOf('same-as', prev) === 'many'` always, and `after === cardinalityOf('same-as', next) === 'many'` always. The failure condition `before === 'many' && after === 'one'` can **never** be true for `same-as` — `after` is never anything but `'many'`. This is not a property of any particular replay's data; it is a property of the function's control flow (a `Set.has` short-circuit before any data is read). No real journal, no real registry content, no amount of "real replay" can make this predicate's check fail. A "clean fire" on this guard is therefore not evidence that identity-merge history survived the replay intact — it is evidence that the code contains lines 49/57, which was already known statically.

## B. Дословный precond плана (было)

`docs/_inbox/2026-08-04-assemble-and-direct/design/01-execution-plan.synthesis.md:83` (numbered list item 3 of "Fable's non-waivable preconditions on D1.b"):
```
3. The `same-as` guard (`predicates.ts:78`) **fired clean on real replay** (not mis-attributing, not unresolved).
```

Duplicated/echoed at two more anchors in the same file (same tautology, restated — a patch to line 83 alone would leave these inconsistent with the fixed precondition):

`01-execution-plan.synthesis.md:148` (inside D1.b's "Enforcement" bullet):
```
in any tenant journal line**; `same-as` guard `predicates.ts:78` fired clean on **real** replay;
```

`01-execution-plan.synthesis.md:235` (risk table, row R1):
```
| R1 | **same-as guard untested seam** | `predicates.ts:78` (0 non-test calls) | D1.b precondition: fired clean on **real** replay |
```

## C. Новый ассёрт — что читать/сравнивать (спецификация проверки, не реализация)

> **REVISED (критик, раунд 2).** Первая версия этой секции сравнивала два `Edge[]`-снимка, оба взятых через
> in-memory `project()`/`foldInto()` в одном процессе. Критик проследил все пути удаления рёбер: `foldEdges`
> (`predicates.ts:98-119`, splice только под веткой `cardinality === 'one'`, недостижимой для `same-as`),
> `foldInto` (`projection.ts:76-110`, тombstone пишет только `state.tombstone`, `edges` не трогает — см. F.2
> ниже) и `erasure.ts` (`splitAct`/`redactAct`, `erasure.ts:25-34` — `edges` в списке `IMMUTABLE_ACT_META`,
> то есть erasure по конструкции никогда не касается `edges`). Значит `same-as`-ребро физически не может
> исчезнуть между двумя in-memory прогонами `project()` над одним и тем же журналом актов — это ВТОРАЯ
> тавтология того же класса, просто на слой глубже: старый ассёрт не мог упасть из-за registry-lock, новый
> (v1) не мог упасть из-за отсутствия delete-пути в чистой in-memory редукции. Оба падуче-пусты.

**Что НЕ делает:** не вызывает `cardinalityOf`, не вызывает `assertForwardMonotone`, не читает `PredicateRegistry`. Не сравнивает два in-memory вызова `project()`/`foldInto()` над одним и тем же журналом — этот путь доказано (F.2/F.3) никогда не может упасть, значит он не проверка, а ещё один тождественно-зелёный ритуал.

**Что читает:** реальные `Edge[]` из проекции, полученной **круговым проходом через диск** — конкретно
`DurableFsStore` (`packages/engine/src/adapters/store-durable-fs.ts`): запись через `writeAct` (:168-180,
реальный `fsyncSync` на строке 173) → закрытие процесса/инстанса → **новый** инстанс `DurableFsStore` на
том же `storeDir`, чей конструктор (:79-94) вызывает `hydrateFromDisk()` (:139-156), которая реально
`readFileSync`-ит `journal.jsonl` (:145) и **только тогда** зовёт `project()` (:155). Это тот самый путь,
который doc-комментарий класса называет **C2 rebuild-from-journal** (:15) — "the constructor reads the
whole journal file and re-folds it... same code path as MemoryStore, only the SOURCE differs (disk vs
in-RAM array)". Разница источника — это ровно то различие, которого не было в v1 этой секции.

**Процедура (снаружи ядра, на уровне harness/replay-теста):**
1. **Снимок ДО**: через реальный `DurableFsStore` (инстанс S1, конкретная `storeDir` на диске) выполнить
   серию реальных `writeAct` (:168-180), создающих `same-as`-рёбра между реальными узлами. Прочитать
   `S1.load()` (:159-161) → построить `same-as`-группы (метод группировки — см. ниже, DEFERRED). Зафиксировать
   `sizeBefore(groupId)`.
2. **Реальный replay = реальный reboot, не повторный вызов `project()` в том же процессе.** Закрыть S1
   (`S1.close()`, :128-136, снимает advisory-lock) и создать **новый** инстанс `DurableFsStore` (S2) на ТОЙ ЖЕ
   `storeDir` — его конструктор идёт по `hydrateFromDisk()` (:139-156): реальный `readFileSync` журнала с
   диска (:145), реальный построчный `JSON.parse` (:149), и только из результата — `project()` (:155). Это
   заставляет данные пройти сериализацию на диск и десериализацию обратно — единственная точка, где
   `same-as`-ребро реально может не долететь (см. F.1 ниже, C3-torn-line).
3. **Снимок ПОСЛЕ**: `S2.load()` (:159-161) → той же процедурой группировки построить `same-as`-группы,
   зафиксировать `sizeAfter(groupId)`.
4. **Сравнение (провал = любое из двух):**
   - **Схлопывание.** Существует группа `g` из снимка 1 (`sizeBefore(g) > 1`), для которой в снимке 3
     `sizeAfter(g) < sizeBefore(g)` либо группа `g` отсутствует целиком.
   - **Потеря участника.** Конкретное `(subject, target)` `same-as`-ребро из снимка 1 отсутствует в снимке 3,
     при этом ОБА узла — subject и target — всё ещё **live** в S2 (см. F.2: `live` = `node.state.tombstone
     !== 'archived'`, `projection.ts:49,98`, точное определение, не догадка).
5. **Успех** = ни одно `same-as`-ребро, живое в снимке 1, не пропало в снимке 3 для узлов, всё ещё живых в
   снимке 3; ни одна группа не уменьшилась.

**Почему это теперь падуче (реальный, а не гипотетический механизм отказа):** `hydrateFromDisk()` содержит
контракт **C3 append-only-forward** — при обрыве строки на диске (`store-durable-fs.ts:148-153`) парсер
делает `break` на первом `JSON.parse`-провале и **молча прекращает читать журнал дальше этой точки**:
"a torn final line (process killed mid-append) — stop here; earlier lines are intact" (комментарий :151).
Это НЕ гипотеза — это явно закодированный, преднамеренный поведенческий контракт. Если акт, создающий
`same-as`-ребро, физически записан в файл ПОСЛЕ строки, которая на диске оказалась повреждена/оборвана
(частичная запись, гонка процессов, поведение вне happy-path `writeAct`'s `fsyncSync`), `hydrateFromDisk()`
на следующем реальном reboot восстановит проекцию БЕЗ этого акта — same-as-группа в S2 будет меньше, чем
была в S1 до его "потери". Это ровно класс бага, который R1/GAP-3(b) называет ("un-merging identity history
on the next rebuild-from-journal", `predicates.ts:41-44`) — и он не закрыт `LOCKED_MANY_PREDICATES`, потому
что ceiling действует на уровне ДЕКЛАРАЦИИ кардинальности в реестре, а не на уровне того, долетела ли строка
журнала до диска и обратно. Новый ассёрт способен это увидеть, потому что он сравнивает данные ДО записи на
диск и ПОСЛЕ реального чтения с диска — не два прогона одной и той же in-memory редукции.

**Группировка (direct vs transitive) — DEFERRED, не решается в этом патче.** Пока прецедент падения не
подтверждён на реальном disk round-trip (шаг 2), выбор между "прямые исходящие `same-as`-рёбра субъекта" и
"транзитивная связная компонента по всему графу" — **moot**: ни один способ группировки не увидит разницы,
если ничего не схлопывается. Решение откладывается до момента, когда #1 (диск round-trip) даст первый
реальный ре-прогон с данными — тогда выбор метода группировки будет приниматься на конкретном наблюдаемом
случае, а не абстрактно.

## D. Патч плана (стало)

**Строка 83** (было → стало):
```
Было:
3. The `same-as` guard (`predicates.ts:78`) **fired clean on real replay** (not mis-attributing, not unresolved).

Стало:
3. A same-as-GROUP INTEGRITY check across a REAL DISK ROUND-TRIP (write via DurableFsStore.writeAct →
   close → fresh DurableFsStore instance on the same storeDir → hydrateFromDisk, store-durable-fs.ts:139-156,
   the C2 rebuild-from-journal contract at :15): snapshot every same-as group's real edge membership from
   S1.load() BEFORE the reboot and from S2.load() AFTER the disk-rebuilt reboot; FAIL if any group's member
   count shrinks, or any same-as edge between two nodes still live (node.state.tombstone !== 'archived',
   projection.ts:49,98) present in S1 is absent in S2. This check must NOT call
   `cardinalityOf`/`assertForwardMonotone`, and must NOT compare two in-memory `project()` calls over the
   same journal in one process — neither path can ever observe a collapse (predicates.ts:49/57 locks the
   registry check; foldEdges/foldInto/erasure.ts never delete a `same-as` edge in pure in-memory folding,
   `erasure.ts:25-34` keeps `edges` in `IMMUTABLE_ACT_META`). The only real loss path is the disk boundary:
   `hydrateFromDisk`'s C3 torn-line handling (store-durable-fs.ts:148-153) `break`s silently on the first
   unparseable line, dropping every act after it — this check exists to catch exactly that class of loss.
   Grouping method (direct out-edges vs transitive closure) is DEFERRED to first real fail-observation.
```

**Строка 148** (согласовать формулировку — было → стало):
```
Было:
in any tenant journal line**; `same-as` guard `predicates.ts:78` fired clean on **real** replay;

Стало:
in any tenant journal line**; same-as-group edge-membership check across a real DurableFsStore disk
round-trip (write → close → reboot new instance → hydrateFromDisk, store-durable-fs.ts:139-156 — see
precond 3) shows no group shrinkage and no dropped edge between tombstone-live nodes;
```

**Строка 235, R1 mitigation column** (было → стало):
```
Было:
D1.b precondition: fired clean on **real** replay

Стало:
D1.b precondition: same-as-group edge-membership check across a real disk round-trip via DurableFsStore
(write→reboot→re-read, store-durable-fs.ts:139-156), not an in-memory project() re-run and not the
predicate-registry guard — see precond 3 rewrite
```

## E. Проверка «не вызывает cardinalityOf/assertForwardMonotone» (и не вызывает второй тавтологии)

- Новый ассёрт принимает на вход два снимка `Edge[]`/проекции — `S1.load()` до записи-и-закрытия, `S2.load()`
  после реального reboot нового `DurableFsStore`-инстанса с диска — и не принимает `PredicateRegistry` вообще.
- Сравнение (шаг 4 в C) оперирует исключительно счётом рёбер/участников группы — никаких обращений к
  `LOCKED_MANY_PREDICATES`, `registry[predicate]`, `cardinalityOf`, `assertForwardMonotone`.
- **Второй барьер (по итогам ревизии критика):** ассёрт также не сравнивает два in-memory вызова `project()`
  над одним и тем же `Act[]` в одном процессе — этот путь доказано не падуч (F.2/F.3), и патч (D) прямо
  требует диск-round-trip (`DurableFsStore` write→close→новый инстанс→`hydrateFromDisk`) как единственно
  допустимый источник снимка "после".
- Патч (D) содержит явный текстовый запрет на оба ложных пути и называет ЕДИНСТВЕННЫЙ реальный механизм
  потери (`store-durable-fs.ts:148-153`, C3 torn-line `break`), чтобы будущий реализатор не мог молча
  откатиться ни на реестровую проверку, ни на in-memory повтор.

## F. Риски для критика

1. **Определение "группы" (direct vs transitive) — теперь явно DEFERRED, не unknown.** Решение отложено до
   первого реального наблюдаемого случая на disk round-trip (§C, последний абзац) — по требованию критика
   (пункт 3 его вердикта), потому что до фикса #1 вопрос был moot (ничто не схлопывалось ни при каком
   способе группировки). Остаётся риск: если реализатор забудет вернуться к этому решению после первого
   реального прогона и оставит группировку "как получилось" — критик должен проверить, что выбор
   зафиксирован ЯВНО в коде/комментарии на момент первой реализации, не оставлен молчаливым.
2. **"Live node" теперь определено ТОЧНО, не unknown.** `live` = `node.state.tombstone !== 'archived'`
   (`projection.ts:49` — комментарий "`archived` → tombstone"; `projection.ts:98` — код
   `if (archived) state.tombstone = 'archived';` внутри `foldInto`). Это устраняет риск №2 из первой версии
   этого файла (был помечен unknown; критик указал, что механизм существовал и просто не был найден). Остаточный
   риск: `foldInto` (:98) комментирует tombstone как "projection output, not a mutation of a stored node" —
   то есть tombstone — это ПРОЕКЦИЯ, не физическое удаление узла из `base`/`journal`; ассёрт должен читать
   `state.tombstone` именно из спроецированного `EnvelopeNode`, не из сырого акта, иначе живость определится неверно.
3. **Источник "реального replay" теперь конкретен и проверен чтением кода** (`store-durable-fs.ts:79-156`),
   а не является unknown-предположением — устраняет риск №3 первой версии. Остаточный риск: харнесс/тест-раннер
   должен уметь физически создать ДВА раздельных инстанса `DurableFsStore` на одном `storeDir` в рамках
   одного тестового процесса (закрыть S1 перед созданием S2, иначе `acquireLock` :97-125 откажет со
   "another writer holds the single-writer lock") — это конкретное, но решаемое требование к тест-инфраструктуре,
   не архитектурная неопределённость.
4. **Второй-порядковая тавтология в v1 этой секции была реальной, а не придиркой критика.** Я (И4) сначала
   специфицировал ассёрт над двумя in-memory `Edge[]`-снимками без указания, ЧЕМ они произведены — критик
   корректно показал, что оба снимка через `project()`/`foldInto()` в одном процессе физически не могут
   разойтись (ни один код-путь не удаляет `same-as`-edge вне registry-lock ветки). Урок для будущих
   ассёртов в этом плане: "читает реальные данные, а не реестр" недостаточно специфично — нужно называть
   ИМЕННО ту границу (диск/сеть/reboot), где реальное расхождение физически достижимо.
5. **Патч меняет 3 места плана (83/148/235), но плана-файла я не редактировал** — по заданию (T4/CG-14) выход
   — это ФАЙЛ-НАХОДКА с предложенным патчем, не применение патча к `01-execution-plan.synthesis.md` напрямую
   (та работа принадлежит харвесту/лиду). Если ожидание было "применить патч на диск" — не выполнено
   намеренно, чтобы не трогать чужой синтез без явного «строй».
6. **`erasure.ts` цитируется как доказательство "edges не трогается"** (`erasure.ts:25-34`,
   `IMMUTABLE_ACT_META` включает `'edges'`) — это верно для `splitAct`/`redactAct` СЕГОДНЯ (shape-level seam,
   "NOT the feature" по собственному комментарию модуля, `erasure.ts:2`). Если/когда hard-erase будет
   реализован (сейчас — "deferred owner fork", `erasure.ts:12-15`), это утверждение может перестать быть
   верным — новый ассёрт (и это risk-примечание) не защищены от будущего изменения erasure-семантики,
   только от сегодняшнего кода.

## G. Крючки самопроверки

- [x] :49 дословно подтверждена чтением файла — `export const LOCKED_MANY_PREDICATES: ReadonlySet<string> = new Set(['same-as']);`
- [x] :57 дословно подтверждена — `if (LOCKED_MANY_PREDICATES.has(predicate)) return 'many'; // lock wins over any registry (identity ceiling)`
- [x] :78 дословно подтверждена — `export function assertForwardMonotone(prev: PredicateRegistry, next: PredicateRegistry): Problem[] {`
- [x] Механика тавтологии прослежена до конкретной строки провала (line 84, `before === 'many' && after === 'one'`) и показано почему `after` не может стать `'one'` для `same-as`.
- [x] Precond плана найден дословно в 3 местах (83, 148, 235), не только в одном — патч покрывает все три, не оставляя рассинхрона.
- [x] Новый ассёрт специфицирован без единого упоминания вызова `cardinalityOf`/`assertForwardMonotone` в своей логике; явный запрет вписан в текст патча.
- [x] **Второй барьер (раунд 2):** ассёрт также явно запрещён к сравнению двух in-memory `project()`-прогонов
      в одном процессе — подтверждено чтением `predicates.ts:98-119` (splice только под `'one'`),
      `projection.ts:76-110` (tombstone не трогает `edges`), `erasure.ts:25-34` (`edges` в `IMMUTABLE_ACT_META`).
- [x] **Диск-граница подтверждена чтением кода** `store-durable-fs.ts:64-194` — конструктор (:79-94),
      `hydrateFromDisk` (:139-156), `writeAct` (:168-180), C3 torn-line `break` (:148-153) — это конкретный,
      названный по номерам строк механизм реального отказа, не гипотеза.
- [x] **"Live node" переопределено точно** через `projection.ts:49,98` (`state.tombstone === 'archived'`),
      подтверждено чтением, не оставлено unknown.
- [x] Группировка (direct/transitive) явно помечена DEFERRED-до-первого-наблюдения, не unknown и не тихо решена.

## H. Changelog (раунд 2 ревизии)

Критик (round 2) нашёл: §C/§D v1 — second-order тавтология (in-memory `project()` до/после физически не
может разойтись; критик проследил `predicates.ts:108` splice, `projection.ts` `foldInto`, `erasure.ts`).
Три обязательные правки применены:
1. Precond (83/148/235) переанкорен на реальный disk round-trip `store-durable-fs.ts:139-156`
   (write→close→новый инстанс→`hydrateFromDisk`), не in-memory `project()`.
2. "live" определено как `node.state.tombstone !== 'archived'` (`projection.ts:49,98`) — было unknown, факт найден.
3. Выбор group-метода (direct/transitive) явно DEFERRED до первого реального disk-round-trip наблюдения — не решается в этом патче.
Статус: draft → review.
