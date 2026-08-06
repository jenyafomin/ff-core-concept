---
node_type: design
title: "Этап 2 D1.b — сделать плоскость genuinely падучей: §9-3/3b mutant-assert + F6 второй формат"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
stage: 2
related:
  - ../00-width-census.synthesis.md
  - ../../../../../00-states/05-assemble-and-direct/_shared/RECOMMENDATION-2026-08-06-next-stage.decision.md
---

# Этап 2 — сердце падучести: §9-3/3b (mutant-assert) + F6 (второй формат)

## 0. ⚠️ Находка при разведке — census частично устарел (код ушёл вперёд)

Census (`00-width-census.synthesis.md` §1, строки §9-2/S10) утверждает: «`store-durable-fs.ts` не
импортирует `erasure.ts` (0 хитов)» и «`rental-balance/src/surface/cli.ts:26` создаёт `MemoryStore`».
**Оба утверждения больше НЕ верны на диске сейчас** (видимо, после коммита `490d5bb` "S7 durable-store
tail — wire runner"):

- `packages/engine/src/adapters/store-durable-fs.ts:41` — `import { splitAct } from '../core/erasure.js'`,
  реально используется в `actToLine`/`lineToAct` (`:149-167`): каждая JSONL-строка журнала физически
  разделена на meta-поля (плоские, top-level) + отдельный ключ `erasable`.
- `packages/rental-balance/src/surface/cli.ts:10,38-41` — `DurableFsStore` уже подключаем через флаг
  `--store durable` (не только `MemoryStore`).

**НО это НЕ значит §9-2/S10 закрыты.** Два реальных разрыва остались:
1. **Нет функции физического шреда на диске.** Грепом по `packages/engine` — 0 хитов на `redactAct(`/
   `shredAct(`/`hardErase` вне комментариев. `store-durable-fs.ts` умеет писать (`writeAct`) и читать
   (`hydrateFromDisk`), но НЕ умеет переписать существующую JSONL-строку без payload. `redactAct()`
   (`erasure.ts:59-62`) — чистая функция над объектом `Act` в памяти, её никто не применяет к строке
   журнала на диске.
2. **Нет теста, который гоняет `rental-balance`'s СОБСТВЕННЫЙ `cli.ts` в `--store durable`.**
   `packages/engine/test/cli-durable.test.ts` (R1) гоняет **другой**, generic CLI —
   `packages/engine/src/surface/cli.ts` — с синтетическим fixture-корпусом, НЕ ga-rentacar. Грепом по
   `packages/rental-balance` на `durable` — единственный хит это сам `cli.ts`; `packages/rental-balance/
   test/balance.test.ts` его не касается. **S10 «durable на продуктовом пути» технически wired, но НЕ
   доказан тестом на реальном ga-rentacar акте.**

Builder: пункт 1 обязателен для §9-3 (без физического шреда на диске «шред одного payload» нечего
тестировать). Пункт 2 — не блокер этого задания напрямую, но пиши §9-3/3b тест ЧЕРЕЗ реальный ga-rentacar
путь (`@ff/ingest-rentacar` `RENTACAR_PREDICATES` + реальные `reduceOrderRow`/`buildSameAsAct` акты), а не
через синтетический generic-fixture — это закрывает заодно и разрыв S10-на-продукте, бесплатно.

## 1. §9-3 — снять тавтологию, сделать mutant-падучим

**Диагноз (подтверждён чтением, не только доверием census):** `IMMUTABLE_ACT_META`
(`packages/engine/src/core/erasure.ts:25-34`) включает `edges` ПО ТИПУ; `splitAct`
(`erasure.ts:48-51`, `const { payload, ...meta } = act`) физически не может тронуть `edges` — оно
живёт в `...meta` по конструкции языка. Значит «edges целы после шреда» истинно для ЛЮБОЙ реализации
`splitAct`, включая сломанную. Текущий `erasure-seam.test.ts` (`:24-37`) проверяет ровно это тавтологичное
свойство — round-trip `{...meta, payload: erasable} === original`, но НИКОГДА не идёт через
`store-durable-fs.ts` (диск), и не сравнивает с НЕЗАВИСИМЫМ снимком.

**Что построить (новый тест-файл, не правь `erasure-seam.test.ts` — он валиден как unit-slice, добавь
СЛЕДУЮЩИЙ уровень; предложи имя `packages/engine/test/erasure-plane-falsify.test.ts`):**

1. **Физический шред на диске (предпосылка, см. §0 п.1).** Добавь в `store-durable-fs.ts` минимальный
   метод, реально переписывающий журнал: например `shredPayload(actId: string): void` — читает журнал,
   находит строку(и) с этим `id`, заменяет `erasable` на удалённое (эквивалент `redactAct` применённого к
   ЗАПИСАННОЙ строке, не к акту в памяти), переписывает файл (полная перезапись допустима для ЭТОГО
   теста — атомарность/durability самого шреда — отдельная грань F3, не блокирует §9-3), обновляет
   `this.journal`/`this.projection` через `hydrateFromDisk()`. Это НОВЫЙ код, не только тест — назови это
   builder'у явно как часть задания, не как «уже готово».
2. **Независимый снимок ДО.** Перед `writeAct`, из ИСХОДНОГО объекта `Act` (построенного тестом или через
   `@ff/ingest-rentacar` `reduceOrderRow`/`buildSameAsAct`), скопируй `act.edges` (deep clone,
   `structuredClone`) в отдельную переменную `edgesBefore`. НЕ вычисляй этот снимок через `splitAct(act)`
   или `project([act])` — это была бы та же функция, что тестируется (тавтология, которую чинишь).
3. **Реальный disk round-trip, НЕ same-process.** По дисциплине `crash-mid-turn.test.ts:53-77` /
   `durable-reboot-matrix.test.ts:24-30` (`spawnSync` дочернего процесса + отдельный harness-файл под
   `test/harness/`): P1 — новый процесс пишет акт(ы) через `DurableFsStore.writeAct`, вызывает
   `shredPayload(actId)` на ОДНОМ payload-содержащем акте, завершается. P2 — свежий процесс, поднимает
   `DurableFsStore` НАД ТЕМ ЖЕ `storeDir`, читает `readNode`/`load()`, извлекает `edges` спроецированного
   узла.
4. **Ассерт.** `edgesAfter` (из P2, после шреда+reboot) должен глубоко равняться `edgesBefore`
   (независимому снимку из шага 2) — и ОТДЕЛЬНО, что payload/erasable зона реально пуста (шред сработал:
   `readNode(...)` не содержит исходного payload-контента). Оба утверждения — ОДИН тест, два `expect`.
5. **Mutant, обязателен как ЧАСТЬ acceptance (не опционально).** Второй `it(...)` (или параметризация): с
   намеренно сломанной версией сериализации — впрысни в `actToLine` (тестовая копия/мона-патч через
   локальный dependency injection, НЕ правь боевой `store-durable-fs.ts`) мутант `splitAct`-эквивалент,
   роняющий `edges`: `{ payload, edges: undefined, ...rest }` вместо `{ payload, ...meta }`. Прогони ТОТ ЖЕ
   assert (шаг 4) — он ОБЯЗАН упасть (edges после round-trip ≠ `edgesBefore`). Если тест зелёный и под
   мутантом — тест не годится, переписывай assert, а не мутант.

## 2. §9-3b — same-as group через РЕАЛЬНЫЙ disk round-trip

**Диагноз:** same-as сейчас тестируется ТОЛЬКО в памяти — `write-plane.test.ts:73-142` (`foldEdges`/
`project` напрямую), `invariants.test.ts` не касается same-as, `idempotency.test.ts` тоже. Ни один не
спавнит `DurableFsStore`. Кардинальность `same-as` залочена на `many` в
`packages/engine/src/core/predicates.ts:49,56-59` (`LOCKED_MANY_PREDICATES`) — сам лок доказан только
in-memory.

**Что построить (тот же файл `erasure-plane-falsify.test.ts` или сосед `same-as-disk-roundtrip.test.ts`):**

1. Построй РЕАЛЬНУЮ same-as группу из ≥3 участников через продуктовый билдер
   `packages/ingest-rentacar/src/dedup/same-as-writer.ts:59-80` (`buildSameAsAct` / `confirmSameAs`) —
   не синтетический fixture: `confirmSameAs({sourceRef, target: A, ...})`,
   `confirmSameAs({sourceRef, target: B, ...})` (два ДОБАВЛЯЮЩИХ ребра на одном subject, кардинальность
   `many`). Обрати внимание: эти акты `actKind: 'domain_event'`, `edges: [...]`, БЕЗ `payload` вообще —
   это уже структурно другая форма акта, чем ga-rentacar order/customer (полезно и для F6, см. §3
   кандидат 2).
2. Независимый снимок ДО: собери ожидаемое множество `{predicate:'same-as', target}` из самих актов,
   которые ты строишь (не из проекции).
3. Один из участников группы получает шред на СВОЁМ payload-акте (если в группе участвует акт с payload —
   например, сам subject node тоже писался через `reduceOrderRow`/`reduceCarRow`, у него есть payload;
   шреди именно его через `shredPayload` из §1 п.1).
4. Реальный disk round-trip (spawn/kill/reboot — переиспользуй harness из §1 п.3, не пиши новый с нуля).
5. Ассерт: same-as membership (все target'ы группы) на спроецированном узле ПОСЛЕ reboot == независимый
   снимок из шага 2 — same-as edges НЕ пострадали от шреда чужого payload (edges/identity ⟂ payload зона
   разделены корректно даже под реальным диском).

## 3. F6 — кандидаты второго, структурно иного формата

Сейчас `IMMUTABLE_ACT_META`/plane проверены ТОЛЬКО на ga-rentacar (`packages/ingest-rentacar`) —
единственный существующий ingest-пакет (грепом по `packages/*/package.json`: `core`, `engine`,
`ingest-rentacar`, `rental-balance` — второго ingest'а НЕТ). `ACT_KINDS` (`types.ts:170-177`) объявляет 6
китов; грепом по реальным `actKind: '...'` в коде используются ТОЛЬКО `domain_event` и `observation`
(+ `agent_trace` в ОДНОМ engine-тесте, `projection.test.ts:125-133`, не в продукте). `command`,
`access_event`, `system_telemetry` — 0 реальных употреблений где-либо.

### Кандидат 1 (РЕКОМЕНДУЮ — минимально-достаточный, делай ПЕРВЫМ)
**Синтетический второй tenant/domain, прогнанный через РЕАЛЬНЫЙ `DurableFsStore`** (не `MemoryStore`).
В кодовой базе уже ЕСТЬ прецедент именно такого синтетического второго домена —
`packages/engine/test/write-plane.test.ts:48-59` (`paymentEvent(id, source_ref, domain)` — параметризован
`domain: 'rental-balance' | 'sheets'`) и его home-barrier тест (`:144-190`), но ТОЛЬКО через `MemoryStore`.
Расширь этот паттерн: новый `actKind: 'access_event'` (сейчас 0 реальных употреблений — честно «второй
кит», не переиспользование domain_event), payload — НЕ compact-плоский как у ga-rentacar (`packages/
ingest-rentacar/src/core/reduce.ts:59-63` `compact()`), а вложенный/массивный (`{ resource: {...}, grants:
[...] }`), собственная кардинальность (`granted-to: 'one'` — предикат, которого НЕТ ни у одной
`RENTACAR_PREDICATES` записи, и `same-as` ребро тоже добавь — чтобы §9-3b и F6 пересеклись на одном
фикстур-акте). Прогони через `DurableFsStore.writeAct` → `hydrateFromDisk` (spawn/reboot как в §1).
Докажет: `IMMUTABLE_ACT_META`/erasure/same-as-lock держатся не потому, что весь тестовый код случайно
устроен как ga-rentacar (payload=compact record, provenance={source_ref,snapshotHash}), а потому что
контракт РЕАЛЬНО form-agnostic на уровне полей конверта.

### Кандидат 2 (дёшево, РЕАЛЬНЫЙ продуктовый код — делай как довесок к §9-3b)
**`same-as-writer.ts` M2-акты** (`packages/ingest-rentacar/src/dedup/same-as-writer.ts:59-80`) — уже
существующий, реальный (не синтетика) билдер. Структурно иной, чем ga-rentacar order/customer: **нет
`payload` вообще** (только `edges`), `provenance` без `snapshotHash` в привычном месте у merge/un-merge
акта из `sameAsSnapshotHash` (`:42-52`) кодируется иначе. Это уже часть §2 задания — отдельным кандидатом
не заводи, просто зафиксируй, что этот же фикстур закрывает и F6-кандидат.

### Кандидат 3 (опционально, бонус — НЕ обязателен для входа в прототип)
**`balance-observer.ts` `observation`-акты** (`packages/rental-balance/src/agent/balance-observer.ts:96-
106`) — реальный, уже работающий второй act-kind продукта: `edges: []` (вообще без edges — крайний случай
для §9-3 assert: пустой независимый снимок должен остаться пустым), payload — вложенная
agent-вычисленная структура (`BalanceObservation`), не upstream-строка. Ценно как edge-case (no-edges
class), но НЕ structurally сильнее кандидата 1 (тот же продукт/tenant conventions). Сделай, только если
время осталось после 1+2.

**Минимально-достаточный набор для F6:** Кандидат 1 (новый act-kind + новая кардинальность + вложенный
payload + реальный диск) — этого одного достаточно, чтобы снять тавтологию «работает потому что это
ga-rentacar». Кандидат 2 — почти бесплатный довесок (переиспользует §9-3b фикстуру). Кандидат 3 — не
брать, если давит численный cap (§9-5).

## 4. Acceptance (сведено)

- [ ] `store-durable-fs.ts` получает реальный disk-shred метод (§1 п.1) — новый код, не только тест.
- [ ] §9-3 assert построен на НЕЗАВИСИМОМ до-снимке (не через `splitAct`/`project`), прогнан через
      реальный disk round-trip (spawn/kill/reboot, отдельный harness-файл).
- [ ] §9-3 assert ПАДАЕТ под мутантом `{ payload, edges: undefined, ...rest }` — прогнать как обязательную
      часть test-suite (не как ручную демонстрацию one-off).
- [ ] §9-3b same-as группа (≥3 участника, реальный `buildSameAsAct`) переживает шред ЧУЖОГО payload через
      тот же реальный disk round-trip.
- [ ] F6 кандидат 1 (новый act-kind + новая кардинальность + вложенный payload) прогнан через
      `DurableFsStore` реально (не `MemoryStore`), проходит тот же класс assert'ов, что §9-3/3b.
- [ ] Все новые тесты используют cross-process discipline (`spawnSync` + harness), НЕ same-process
      симуляцию (по прецеденту `crash-mid-turn.test.ts`/`durable-reboot-matrix.test.ts`).
- [ ] Численный cap соблюдён (см. Риски — эта грань до сих пор без числа, эскалируй владельцу если новый
      код выходит за разумные пределы «2-3 файла, ~150-250 строк теста + ~30-50 строк адаптера»).

## 5. Крючки самопроверки (I7)

- Перед тем как звать assert «падучим» — ОБЯЗАТЕЛЬНО прогнать его под мутантом и ПОКАЗАТЬ красный вывод
  (вставить в PR/handoff), не полагаться на «должен упасть по логике».
- Если `shredPayload` (§1 п.1) получается сложнее, чем «прочитать файл целиком, переписать целиком» —
  СТОП, эскалируй архитектору: WAL/атомарность шреда — это F3 (durability order), отдельная грань,
  не тяни её сюда неявно.
- Если F6 кандидат 1 оказывается «слишком похож» на ga-rentacar после написания (тот же payload-shape,
  та же кардинальность-модель) — это сигнал, что тавтология не снята; пересмотри, не закрывай пункт для
  галочки.

## 6. Риски

1. **Скрытый разрыв в S10/§9-2 (см. §0).** Census устарел местами — граница между «уже wired» и
   «доказано на продукте» тоньше, чем казалось на утро 2026-08-06. Builder должен перепроверять якоря
   чтением, не доверять census слепо (та же дисциплина, что породила этот файл).
2. **`shredPayload` — новый производственный код внутри задания, помеченного как «тест».** Риск
   over-scope (§9-5 численный cap ещё не закрыт числом) — держи метод МИНИМАЛЬНЫМ (полная перезапись
   файла допустима для ЭТОГО этапа; атомарность/WAL — DEFER на F3).
2а. Если `shredPayload` тянет за собой вопрос «а что если акт с этим id встречается дважды в журнале
    (supersede-цепочка)?» — не решай архитектурно сам, ограничь тест ОДНИМ вхождением id и явно
    закомментируй ограничение (cascade/multi-line shred = F5/FORK-2, не эта грань).
3. **F6 кандидат 1 может ощущаться «искусственным»** (синтетический tenant, не реальный второй продукт).
   Это ПРИЗНАННЫЙ компромисс census'а (§4 Ключевой риск рекомендации: «over-proof / теория субстрата» —
   guardrail = переиспользовать существующее, не проектировать контракт с нуля). Кандидат 1 уже следует
   этому guardrail (реиспользует `write-plane.test.ts` паттерн). Не эскалируй в «построить настоящий
   второй ingest-пакет» — это отдельная, гораздо более крупная ставка вне scope Этапа 2.
4. **Cross-process harness-файлы размножаются** (`survive-turn-harness.ts`, теперь ещё один под §1-2).
   Проверь, можно ли РАСШИРИТЬ существующий `test/harness/survive-turn-harness.ts` флагами
   (`--shred <actId>`), а не плодить новый harness — держит численный cap ниже.
