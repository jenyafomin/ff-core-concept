---
node_type: design
title: "Stage 1 assignment — wire DurableFsStore to the real path + wire erasure to disk (S10 + §9-2)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
stage: 1
gate-source: ../00-width-census.synthesis.md
---

# Stage 1 — «подключить durable к жизни» (S10 keystone + §9-2)

## Проблема (из гейта)

`00-width-census.synthesis.md` §1: S10 и §9-2 — БЛОК-КЕЙСТОУН. Продуктовый путь
(`rental-balance`) сегодня пишет ТОЛЬКО в `MemoryStore` — падучесть, которую доказывают тесты
`packages/engine`, никогда не проверяется на реальном ga-rentacar акте. `erasure.ts` написан, но
`store-durable-fs.ts` его не импортирует (0 хитов грепом) — payload может течь в journal.jsonl
inline, без разделения на erasable/immutable зоны. Без этого этапа §9-3/§9-3b/F6/§9-4 проверяют
лабораторию, не продукт (synthesis §0 п.5).

**Хорошая новость: паттерн уже существует в кодовой базе.** `packages/engine/src/surface/cli.ts:45-49`
уже реализует `--store <memory|durable>` + `--store-dir <path>` flag-swap между `MemoryStore` и
`DurableFsStore` за тем же `StorePort`-интерфейсом. `rental-balance/src/surface/cli.ts` этот
паттерн не переиспользует — задача Stage 1 ровно в этом.

## Точечные правки

### 1. `packages/rental-balance/src/surface/cli.ts:10` — импорт

Текущая строка:
```
import { Engine, FIXED_POLICY, MemoryStore, load, buildIndex, type Graph } from '@ff/engine';
```
Правка — добавить `DurableFsStore` и `type StorePort` (оба уже экспортируются из
`packages/engine/src/index.ts:16,23`, правка не трогает пакет `engine`):
```
import { Engine, FIXED_POLICY, MemoryStore, DurableFsStore, load, buildIndex, type Graph, type StorePort } from '@ff/engine';
```

### 2. `packages/rental-balance/src/surface/cli.ts:17-22` — тип `VerticalRun`

Текущая строка 19: `store: MemoryStore;`
Правка: `store: StorePort;` — сужение до порта, не конкретного адаптера (оба класса реализуют
`StorePort`, см. `packages/engine/src/ports/store-port.ts:16-27`). Без этой правки TS не даст
присвоить `DurableFsStore` полю, типизированному под `MemoryStore`.

### 3. `packages/rental-balance/src/surface/cli.ts:25-26` — `runVertical`

Текущий код:
```ts
export function runVertical(fixturesDir: string): VerticalRun {
  const store = new MemoryStore([MIN_CONSTITUTION], RENTACAR_PREDICATES);
```
Правка — добавить ВТОРОЙ опциональный параметр (не ломает существующие вызовы
`runVertical(FIXTURES)` в `balance.test.ts:192` — default сохраняет сегодняшнее поведение теста):
```ts
export function runVertical(
  fixturesDir: string,
  opts: { store?: 'memory' | 'durable'; storeDir?: string } = {},
): VerticalRun {
  const store =
    opts.store === 'durable'
      ? new DurableFsStore(opts.storeDir ?? '.store', [MIN_CONSTITUTION], RENTACAR_PREDICATES)
      : new MemoryStore([MIN_CONSTITUTION], RENTACAR_PREDICATES);
```
Зеркалит сигнатуру `DurableFsStore(storeDir, base, registry)` из
`packages/engine/src/adapters/store-durable-fs.ts:79`.

### 4. `packages/rental-balance/src/surface/cli.ts:40-58` — `runCli`

Добавить чтение флагов `--store` и `--store-dir` (тот же `flag()` хелпер, что уже используется
для `--fixtures`/`--plate`), прокинуть в `runVertical`:
```ts
const storeMode = (flag('store') ?? 'memory') as 'memory' | 'durable';
const storeDir = flag('store-dir') ?? '.store';
...
const run = runVertical(fixturesDir, { store: storeMode, storeDir });
```
`--store-dir` НЕ хардкодить как единственный путь — каталог должен быть параметризуем (флаг с
дефолтом), чтобы прод-запуск на ga-rentacar мог указать реальный каталог, а тесты/CI — временный
(см. риски ниже про параллельные прогоны тестов на одном `.store`).

### 5. Подключить erasure к пути записи

Якорь: `packages/rental-balance/src/agent/balance-observer.ts:96-105` (`writeOnce`) — здесь
формируется `Act` с `payload: { type: OBS_KIND, ...obs }` и уходит в `this.engine.write(act)`.
`balance.test.ts`/`balance-observer.ts` НЕ трогать напрямую под этим пунктом — разделение
payload/meta должно произойти НИЖЕ, в самом сторе (`store-durable-fs.ts:writeAct`), а не в каждом
вызывающем месте, иначе каждый будущий писатель акта обязан не забыть вызвать erasure вручную.

Правка в `packages/engine/src/adapters/store-durable-fs.ts`:
- Импортировать `splitAct` из `../core/erasure.js` (сегодня 0 импортов — `synthesis §1 строка S9-2`).
- В `writeAct` (строки 168-180) при сериализации journal-строки записывать НЕ сырой `act` целиком, а
  результат `splitAct(act)` в форме, эквивалентной `redactAct`-контракту: `meta` (без `payload`)
  плюс payload-зона, вынесенная в отдельный сериализуемый блок (blob/ref или отдельное поле —
  РЕШЕНИЕ КАКОГО РОВНО формата НЕ входит в Stage 1, см. риски: F2/F3/F4 намеренно deferred).
  Минимум для Stage 1 (padающий acceptance ниже): top-level JSON-объект журнальной строки НЕ должен
  содержать ключ `payload` напрямую рядом с остальными meta-полями без прохода через `splitAct`.
- НЕ вызывать `redactAct` при записи (это функция для будущего hard-erase другого акта, не для
  каждой записи) — `writeAct` должен использовать `splitAct` только чтобы физически развести зоны
  в форме на диске, не шредить данные при первой записи.

## Acceptance (падучий, не тавтология)

1. Реальный акт ga-rentacar физически появляется на диске: прогон `runVertical(fixturesDir, { store: 'durable', storeDir: <tmp> })`
   (или CLI с `--store durable --store-dir <tmp>`) на fixtures рентакар оставляет файл
   `<tmp>/journal.jsonl`, который существует, непустой, и парсится построчно как JSON-акты
   (тот же формат, что грепает `crash-mid-turn.test.ts`).
2. Журнальная строка содержит META-поля (`id · actor · provenance · recordedAt · actKind · edges ·
   payloadRef · payloadHash` — список `IMMUTABLE_ACT_META`, `erasure.ts:25-34`) и НЕ содержит сырой
   `payload`-ключ рядом с ними как плоское top-level поле того же объекта, что и meta (assert должен
   ПАДАТЬ, если кто-то уберёт вызов `splitAct` и вернёт `writeAct` к сериализации `act` целиком).
3. `erasure` реально достижим ИЗ ПУТИ ЗАПИСИ — не только из `erasure-seam.test.ts` (тест чистых
   функций в памяти). Проверяется импортом: `grep -n "from '../core/erasure" packages/engine/src/adapters/store-durable-fs.ts`
   должен дать ≥1 хит (сегодня 0, `synthesis` §1 строка S9-2).

## Крючки самопроверки для builder (I7)

Прежде чем сдавать:
1. `pnpm --filter @ff/engine test` и `pnpm --filter @ff/rental-balance test` — существующие тесты,
   использующие `MemoryStore` (список — см. «Риски» ниже), должны остаться зелёными БЕЗ правок
   (значит default-режим `memory` не сломан).
2. Ручной прогон: `node packages/rental-balance/dist/surface/cli.js balance --fixtures <fixtures>
   --store durable --store-dir /tmp/ff-stage1-check` (или через vitest helper) → `cat
   /tmp/ff-stage1-check/journal.jsonl` глазами: файл есть, JSON-строки парсятся, нет голого
   `"payload":` рядом с meta-полями без прохода через `splitAct`.
3. Повторный запуск того же прогона ВТОРЫМ процессом на тот же `--store-dir` без предварительной
   очистки лока — должен либо переиспользовать журнал (если первый процесс завершился и снял
   PID-lock), либо упасть `DurableStoreError`, а не тихо потерять данные — так фиксируется, что
   single-writer lock (`store-durable-fs.ts:96-125`) не сломан правкой.
4. `grep -n "from '../core/erasure" packages/engine/src/adapters/store-durable-fs.ts` — ≥1 хит.
5. Прогнать существующий `packages/engine/test/durable-reboot-matrix.test.ts` — должен остаться
   зелёным (round-trip не должен сломаться из-за изменённого формата journal-строки).

## Риски/подводные

1. **Совместимость формата journal-строки задним числом.** Если где-то (тест, инструмент) уже
   ожидает, что journal-строка = plain `JSON.stringify(act)` (например, будущий S11
   no-payload-key-journal-test, `synthesis` строка S11), смена формата в `writeAct` должна остаться
   СОВМЕСТИМОЙ по чтению: `hydrateFromDisk` (строки 139-156) реконструирует акт из строки для
   `project()` — если строка теперь = `{ meta, erasable }`, `hydrateFromDisk` тоже обязан измениться
   симметрично, иначе round-trip (`durable-reboot-matrix.test.ts`) сломается. Это САМЫЙ большой риск
   этапа — вносить split в `writeAct`, забыв симметрично поправить `hydrateFromDisk`.
2. **Побочные тесты на `MemoryStore`.** 15+ мест по кодовой базе (`grep -rn "new MemoryStore"`)
   конструируют `MemoryStore` напрямую и НЕ проходят через `runVertical`/`runCli` — эта правка их не
   касается (у них нет флага, они не участвуют в swap), но `VerticalRun.store: StorePort` сужение
   типа (правка №2 выше) может потребовать точечных `as MemoryStore` в местах, которые
   специфично используют `MemoryStore`-only методы (сегодня таких мест не найдено — `StorePort`
   покрывает весь используемый набор методов `load/readNode/writeAct/acts/rebuild`).
3. **Параллельные тесты на один `.store`-каталог / PID-lock.** Если несколько тестовых прогонов
   Stage-1 acceptance используют один и тот же default `--store-dir` без явного tmp-пути, второй
   прогон упрётся в `DurableStoreError` (single-writer lock, `store-durable-fs.ts:110-114`) — задание
   явно требует уникальный/временный `storeDir` per-run (см. крючок самопроверки №2-3), не
   захардкоженный `.store`.
4. **Формат payload-зоны на диске не решён на уровне ADR.** `erasure.ts` header (строки 11-15)
   прямо называет «WHERE erasable payload physically lives (out-of-journal blob vs inline)» —
   ОТЛОЖЕННЫМ owner-решением, CRITICAL. Stage 1 обязан развести zоны (acceptance п.2), но НЕ обязан
   решать blob-vs-inline архитектурно — F2/F3/F4 (synthesis §1) заведены как отдельные грани именно
   поэтому. Если builder почувствует, что не может выполнить acceptance без этого решения — СТОП,
   поднять вопрос владельцу, не изобретать архитектуру самостоятельно.

## Планы наблюдательных векторов (после builder)

**Этап 1 (важность ВЫСОКАЯ-кейстоун, сложность СРЕДНЯЯ) — 2 вектора:**
- (а) **Reviewer — корректность swap/совместимость.** Читает диф точечно против пунктов правок
  выше + риска №1 (симметрия `writeAct`/`hydrateFromDisk`); гоняет existing test suite; PASS/FAIL
  с цитатой на конкретный файл:строка, если контракт C1-C5 (`store-durable-fs.ts:12-24`) нарушен.
- (б) **Runtime-verify — акт реально лёг на диск, erasure реально достижим.** Независимый прогон
  (не читает диф, только исполняет): CLI/helper с `--store durable`, глазами/грепом проверяет
  `journal.jsonl` по acceptance п.1-3 выше. Это тот вектор, который ловит «тесты зелёные, но
  никто реально не пробовал руками» — синтез §2 явно называет это риском картирования.

**Этапы 2-3 (набросок, не детализировано):** Этап 2 (§9-3/3b независимый снимок + F6 второй формат
— важность ВЫСШАЯ, сложность ВЫСОКАЯ) — больше векторов: reviewer на assert-логику + adversarial
критик на мутационное тестирование (assert обязан падать под мутантом `edges: undefined`) + отдельный
прогон на втором form-факторе для F6. Этап 3 (§9-4 property-based fault-injection — сложность
ВЫСШАЯ) — минимум reviewer на независимость oracle (не переиспользует `project()`) + отдельный
adversarial-прогон fuzzing самих оффсетов инъекции сбоя (не hand-picked).
