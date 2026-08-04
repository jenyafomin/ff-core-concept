---
node_type: analysis
date: 2026-08-04
owner: jenya.stasik@gmail.com
scope: project
title: "S7 durable StorePort — architect cut (as-built ratification + 4-question design)"
related:
  - ../../../02-project/core/00-kernel/durable-storeport.design.md   # контракт S7 (C1–C5, OQ-1)
  - ../../../03-projects/ga-rentacar/specs/07-durable-storeport.spec.md  # A4 стаб-спек
  - ../../../architecture/ADR/ADR-0006-persistence-as-policy.md      # одна модель / много сторов / PG-default
  - ../../../architecture/ADR/ADR-0008-log-and-graph-cqrs.md         # лог=SoR, граф=проекция
  - ../../../02-project/core/00-kernel/invariants.md                 # I-5 / I-6 / I-11
  - ../../../../packages/engine/src/adapters/store-durable-fs.ts     # AS-BUILT адаптер
  - ../../../../packages/engine/src/ports/store-port.ts              # контракт порта (sync)
  - ../../../../packages/engine/test/survive-turn.test.ts            # AC-2 cross-process
  - ../../../../packages/engine/test/durable-reboot-matrix.test.ts   # C4/C3 reboot matrix
---

# S7 durable StorePort — architect cut

> **Разрез:** system-architect (интерфейс, границы, backend, раскладка). Кода не пишу.
> **Фаза по CLAUDE.md = дизайн.** НО ключевой факт ниже переворачивает премиссу задачи.

## 0. ⚠️ ГЛАВНАЯ НАХОДКА — S7/GAP 1 УЖЕ ЗАКАЛЁН В КОДЕ (премисса задачи устарела)

Задача сформулирована как «граф в RAM, надо спроектировать долговечное хранилище». **Это уже
сделано.** git log ветки `refactor-tree`:

- `b881212 feat(engine): seal GAP 1 — durable StorePort (survive-turn)`
- `4a98e89 test(engine): GAP 1 durable matrix Tests 2 & 3 (idempotent-reboot + forward-monotone)`

На диске `packages/engine/src/adapters/store-durable-fs.ts` = `DurableFsStore implements StorePort`.
Он реализует ВЕСЬ контракт `durable-storeport.design.md §2`:

| Контракт | Как реализовано (as-built) |
|---|---|
| C1 durable append-on-write | `writeAct`: `openSync('a')` → `writeSync` → **`fsyncSync` до return** → `foldInto` проекции |
| C2 rebuild-from-journal on boot | конструктор `hydrateFromDisk()` читает весь `journal.jsonl` → `project(journal, registry)` |
| C3 append-only-forward | только append; рваная последняя строка (kill в момент записи) отбрасывается на parse |
| C4 идемпотентность через reboot | `acts()` отдаёт диск-журнал → дедуп движка (`source_ref+snapshotHash`) держится ПОСЛЕ рестарта |
| C5 single-writer | advisory PID-lock `journal.jsonl.lock`; живой PID → fail-closed; мёртвый → reclaim |

**Тесты реальны (не single-process false-green):** `survive-turn.test.ts` + `durable-reboot-matrix.test.ts`
гоняют **настоящую границу OS-процесса** через `spawnSync(node --import tsx harness)` — P1 пишет и
`exit`, P2 стартует с нуля, разделено ТОЛЬКО `journal.jsonl` на диске. AC-2 (survive-turn), AC-3
(idempotent reboot), AC-4 (forward-monotone rebuild bit-for-bit) — зелёные.

**Вывод:** invariant survive-turn («акт хода N читаем в ходе N+1 через границу процесса») — **выполнен
на слое движка**. Мой разрез — не переизобретать существующее, а (1) ратифицировать as-built против
канона, (2) ответить на 4 вопроса конкретно, (3) назвать дрейф канон↔код и остаточные ложно-зелёные.

---

## 1. Q1 — Минимальный интерфейс StorePort + sync|async

### As-built (ратифицирую как минимальный и правильный)
```
interface StorePort {              // все SYNC
  load(): EnvelopeNode[]                       // прочитать проекцию (read-model)
  readNode(id): EnvelopeNode | null            // один узел из проекции
  writeAct(act): Act                           // append-act в SoR (durable)
  acts(): readonly Act[]                        // read-only взгляд на write-model (для rebuild/дедуп/PII-grep)
  rebuild(from: 'journal'|'files'): EnvelopeNode[]  // пересборка проекции
}
```
Это ровно 4 операции, которые задача просила (append-act / read-projection / rebuild), плюс `acts()`
(аддитивно добавлен под CQRS — порт engine-INTERNAL, рост разрешён, в отличие от замороженного
cross-module `EngineClient`). **`snapshot` в порту НЕТ** — и это сейчас корректно (см. Q3): снапшот по
ADR-0006/0008 = производная оптимизация, не фундамент. Когда понадобится — добавляется **аддитивно**
(прецедент `acts()` доказывает, что рост порта безопасен), без смены сигнатур потребителей.

### Sync vs async — развилка OQ-1 РЕШЕНА КОДОМ в пользу (A) SYNC
Design §3 оставлял OQ-1 [P0] владельцу («до ответа durable-адаптер НЕ пишется в код»). Код выбрал **(A)
sync + durable-fs**. Ратифицирую выбор как ПРАВИЛЬНЫЙ для модели хода:
- Ход коротко-синхронный (`boot→work→persist→exit`), один писатель, нет сети → async не покупает
  ничего; sync-fs + fsync проще и строго durable.
- Потребителей мало (ingest, rental-balance) — цена sync низка сейчас.

**НО — конкретная ложь в коде, которую design §3 предсказал и требовал снять:** комментарий
`store-port.ts` всё ещё обещает *«swapping to PG at M4 = ADDITIVE new adapter, never a core edit»*. Под
**sync**-портом это ЛОЖНО: PostgreSQL по природе async → переход = **breaking-рефактор сигнатур ВСЕХ
потребителей**, не аддитивный адаптер. Это надо исправить прямым текстом (§4 дрейфа).

---

## 2. Q2 — Физическая раскладка на диске + примирение с каноном

### As-built раскладка (per store-dir)
```
<storeDir>/
├── journal.jsonl        # append-only лог актов = СИСТЕМА-ЗАПИСИ (1 акт = 1 строка, fsync'd)
└── journal.jsonl.lock   # advisory PID single-writer lock (C5)
```
Три уровня, чётко разведены:
1. **Система-записи = `journal.jsonl`** — единственная durable истина (ADR-0008 write-model).
2. **Read-model / граф-проекция = ТОЛЬКО в RAM** — `project(journal, registry)`, пересобирается на
   каждом boot. **НЕ персистится.** (Это и есть ответ «где кэш проекции»: сегодня кэша НЕТ, всегда
   полный replay — см. Q3.)
3. **Seed/base (напр. `policy:constitution`) = подаётся loader'ом каждый boot, НЕ журналится.**

### Один источник истины или уровни?
**Один источник = журнал.** Граф — производное (сносимо, RAM). Base-seed — субстрат, подаётся извне.
Ровно CQRS ADR-0008: `journal.jsonl` = write-model SoR; граф = детерминированная проекция;
`rebuild('journal')` = контракт §3 ADR-0008, доказан bit-for-bit (Test 3).

### Примирение с каноном
- **ADR-0008 (CQRS):** идеальное совпадение. Ничего не нарушено.
- **ADR-0006 §(c) + doc-tree закон №1 «файлы=истина»:** **КОНФЛИКТА НЕТ, и это надо сказать явно.**
  doc-tree «файлы=истина» относится к ДЕРЕВУ ДОКУМЕНТОВ (`docs/`), а `journal.jsonl` — **рабочие данные
  движка** (ADR-0006 §(c) прямо разводит «два вещества»). Журнал — engine-data, не knowledge-tree.
- **I-5 / I-11:** держатся. Состояние=проекция (RAM, сносимо); истина логическая=граф, размещение
  (файл-журнал) = деталь.
- **КОНФЛИКТ, который НЕ замазываю — JSONL ≠ конечное состояние ADR-0006.** ADR-0006 §(b): DB-first
  типы (журнал `acts`, снапшоты, трейсы) по умолчанию → **PostgreSQL**. As-built = **JSONL-файл, не
  PG**. Это НЕ нарушение: ADR-0006 §(a) MVP = «физически два стора: md+journal + PG», и `journal.jsonl`
  = именно «md+journal» write-model. Но это **переходный event-store**, а не end-state (где PG держит и
  write-, и read-model DB-first). Назвать прямо: JSONL-журнал = MVP; PG-адаптер = M4-цель, и переход на
  него под sync-портом = breaking-рефактор (см. Q1). «Ложно-зелёное» снимется только когда либо PG
  придёт, либо в каноне зафиксируем JSONL как сознательный MVP-floor с известной ценой миграции.

### Где журнал живёт физически (OQ-2 — ВСЁ ЕЩЁ ОТКРЫТО)
Harness использует `mkdtempSync(tmpdir())`. **Production per-topic store-dir не назначен.** Мой
архитектурный рид: журнал = trace-подобные engine-data → должен жить **ВНЕ коммитимого дерева
документов** (gitignored, напр. `.store/<chatId>/<threadId>/journal.jsonl` или под `_log`-подобным
домом), НЕ в `docs/`. Обоснование: (1) doc-tree «два вещества» — журнал не knowledge; (2)
git-working-tree-safety — машинный append-only файл в рабочем дереве шлюза = риск затирания; (3)
per-topic = совпадает с моделью «топик=сессия=cwd» (CLAUDE.md). **Решение владельца/doc-discipline ДО
wiring раннера** (иначе агент выдумает путь).

---

## 3. Q3 — Cold-start: replay vs снапшот+хвост vs кэш

### As-built = ПОЛНЫЙ REPLAY каждый boot
`hydrateFromDisk()` читает ВЕСЬ `journal.jsonl` и сворачивает через `project()`. Снапшота нет,
tail-кэша нет, инкремента между процессами нет.
- Для MVP-масштаба (один топик, ga-rentacar ~4102 Order → ~4102 domain_event + observations) полный
  replay = миллисекунды. Корректно и просто.
- Это ОРАКУЛ детерминизма: `rebuild('journal')` из полного лога — то, с чем любой будущий снапшот
  ОБЯЗАН совпасть bit-for-bit (Test 3 уже это гоняет).

### Лестница cold-start (всё аддитивно; порт меняется максимум на 1 доп. метод)
Владелец просил «можно полностью кэшировать последние изменения, опционально по процессам» → это
паттерн **снапшот + хвост**:

1. **СЕЙЧАС (built): полный replay.** Floor. Оставить как оракул.
2. **NEXT (когда replay начнёт стоить): снапшот + хвост.** Персистить
   `<storeDir>/snapshot.json = { watermark: <offset|last-act-id>, projectionId, projectionVersion,
   projection }`. Boot = загрузить снапшот → доиграть только строки журнала ПОСЛЕ watermark. Снапшот =
   **КЭШ** (I-5 держится: сносим, пересобираем из журнала; I-6: несёт `projectionId/version` — смена
   reducer'а инвалидирует). «Опционально по процессам» = каденс снапшота = **policy на store/процесс**
   (ADR-0006 policy-as-data): напр. снапшот каждые N актов или на чистом `exit`.
3. **Guard против второго источника истины:** если `снапшот ⊕ хвост ≠ полный replay` — побеждает
   полный replay (I-5). Boot-time/CI сверка тем же bit-for-bit harness'ом, что уже есть.

Никогда не персистить проекцию как ИСТИНУ — только как ускоритель. Журнал остаётся единственной
системой-записи.

---

## 4. Q4 — Границы модуля: что StorePort НЕ делает

StorePort = порт персистентности ЗА движком (Hexagonal, **engine-internal**, НЕ cross-module seam;
cross-module шов = `EngineClient`). Его работа: durable append + пересобираемая проекция + чтение.
As-built `DurableFsStore` корректно НЕ делает ничего лишнего — просто append+fold. Явные НЕ-обязанности:

- **Sync-адаптеры (Sheets-ingest, внешний синк) — ОТДЕЛЬНЫЙ узел.** ingest эмитит акты в
  `Engine.write`; `sync-intent` = свой акт (T-SYNC job-in-DB). StorePort лишь персистит пришедшие акты.
- **Policy / access — ОТДЕЛЬНЫЙ choke-point.** `resolve()` = единственный PEP (I-7). Порядок:
  `Engine.write → admission (ADR-0007) → resolve → store.writeAct`. Store НИЖЕ политики, «тупо-durable».
  (as-built: адаптер не знает о policy — правильная граница.)
- **Идентичность / same-as / canonicalId (M2, node-model ADR) — вне scope.** Store везёт конверты
  как есть (JSONL). OQ-3 (EnvelopeNode↔FFNode) открыт; store **не должен цементировать blob-форму** как
  неизменную.
- **Механика стирания — Engine-level.** ADR-0007 admission/erasure живёт в `core/erasure.ts`
  (`erasure-seam.test` уже юзает `DurableFsStore`). Store лишь append'ит `erased`-акт; НЕ воскрешать
  стёртый payload на rebuild (детерминизм-до-границы-эрейжа, ADR-0008 §3) — но механизм в движке.
- **Живые между-ходами процессы / фоновые watcher'ы — вне scope (design §5).** Store =
  «перечитайся с диска на старте», НЕ «не умри». Баг `gateway-agents-die` ортогонален.
- **Мульти-стор fan-out (vector-index, graph-index, telemetry) — будущие аддитивные проекции.**
  StorePort MVP = один журнал + RAM-проекция; их порты — отдельно, StorePort ими не владеет.

---

## 5. Дрейф канон↔код (называю явно, не замазываю)

1. **Код обогнал «фаза=дизайн» / гейт OQ-1 P0.** Design §3 + §6 говорят «до ответа владельца
   durable-адаптер НЕ пишется». Код написан и запечатан (`b881212`). Либо владелец дал go (STATE
   показывает seal-коммиты как принятые), либо P0-гейт обойдён. **Действие:** обновить
   `durable-storeport.design.md` — пометить OQ-1 → `resolved: (A) sync`, сослаться на seal-коммиты,
   снять клаузу «не пишется до ответа».
2. **Ложь в комментарии `store-port.ts`:** «PG at M4 = ADDITIVE adapter» под sync-портом ФАЛЬШ. Снять
   обещание, записать: «PG-переход = breaking-рефактор sync→async сигнатур».
3. **`ga-rentacar/specs/07` (A4-стаб) устарел** — описывает A4 как «нереализовано, раскроется на P2».
   Реализовано. Перевести в `superseded`/актуализировать; несущий дом контракта = kernel design-файл
   (его §7 Вариант 1).

## 6. Остаточные ложно-зелёные (почему acts-as-git / sync / кэш ещё НЕ полностью зелёные)

Durable-store НЕОБХОДИМ, но НЕ ДОСТАТОЧЕН:

- **acts-as-git (Ц3):** журнал = ОДНА линейная линия. Ветка-гипотеза (ADR-0008 / T-ACTS-AS-GIT) = метка-
  линия НАД одним логом — **ещё не реализована** (нет `branch`/`line`-метки на актах). Durable дал логу
  пережить ход; ветвление над ним — отдельный дизайн.
- **sync (Ц4):** T-SYNC job-in-DB теперь разблокирован (durable есть), но сам sync-модуль +
  декларативный выбор источника истины (policy) — не построены.
- **кэш/снапшот для масштаба (Ц1 «навсегда» при росте):** только полный replay; лестница снапшот+хвост
  (Q3) не построена.
- **node-model ADR (OQ-3):** конверты = непрозрачные блобы в журнале; каноническая модель узла не
  ратифицирована.
- **🔴 Живой gateway-путь НЕ провязан.** `DurableFsStore` доказан В ТЕСТЕ (harness), но **ни один
  production-раннер его не потребляет** (grep: только test/harness + erasure + index-export). M3 P4
  (`tsx cli.ts --store`) не написан. → Ц1 «память переживает ход» **зелена на слое движка, ложно-зелена
  на слое продукта/шлюза**, пока раннер не провяжет `DurableFsStore` + фиксированный per-topic store-dir
  (OQ-2). Это следующий несущий шаг ценности, не новый дизайн store.

## 7. Уверенность
**HIGH** по as-built ратификации и границам (читал код+тесты+5 канон-якорей; тесты реально cross-process).
**MED** по лестнице снапшота (форма верна по ADR-0006/0008, но не прогнана) и по дому журнала OQ-2
(архитектурный рид ясен, решение за владельцем/doc-discipline).
