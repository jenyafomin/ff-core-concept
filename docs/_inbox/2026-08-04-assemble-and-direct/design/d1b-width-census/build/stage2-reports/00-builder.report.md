---
node_type: analysis
title: "Stage 2 D1.b builder report — §9-3/3b mutant-falsify plane + shredPayload + F6"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
stage: 2
agent: builder
related:
  - ../stage2-falsify-plane.assignment.md
  - ../00-width-census.synthesis.md
---

# Stage 2 — сердце падучести: построено, прогнано, мутант красный

## Что построено

| Файл | Тип | Назначение | Строки |
|---|---|---|---|
| `packages/engine/src/adapters/store-durable-fs.ts` | **изменён (prod)** | новый метод `shredPayload(actId)` — физический шред payload-зоны JSONL-строки на диске + re-hydrate; добавлен импорт `redactAct`, `writeFileSync` | +41 / −1 |
| `packages/rental-balance/test/harness/erasure-plane-harness.ts` | **новый (test infra)** | cross-process harness (spawnSync child): P1 пишет РЕАЛЬНЫЕ ga-rentacar акты → `shredPayload` → exit; P2 boots fresh → читает. Сценарии `order` / `sameas` / `access`, флаги `--mutant` / `--hostile` / `--unlock` | 181 |
| `packages/rental-balance/test/erasure-plane-falsify.test.ts` | **новый (test)** | 6 тестов: §9-3 honest, §9-3 mutant, §9-3b same-as, §9-3b lock-holds-hostile, §9-3b lock-mutant, F6 access_event | 158 |

**Ключевое отклонение по РАЗМЕЩЕНИЮ (обосновано, см. «Новые грани»):** тесты §9-3/3b/F6 живут в
`packages/rental-balance/test/`, а НЕ в `packages/engine/test/erasure-plane-falsify.test.ts` (как в §1
задания). Причина — `shredPayload` prod-код лёг в engine (как и требовалось), но ТЕСТ обязан идти через
РЕАЛЬНЫЙ ga-rentacar путь (`@ff/ingest-rentacar` `reduceOrderRow`/`confirmSameAs`), а `@ff/engine` НЕ может
импортировать `@ff/ingest-rentacar` — это цикл зависимостей (`ingest-rentacar` → `engine`). `rental-balance`
— единственный пакет, зависящий от ОБОИХ. Побочно закрывает census-разрыв §0-п.2 (S10-на-продукте) бесплатно.

### `shredPayload` — минимальность (§1 п.1, риск §6.2)
Реализация ровно «прочитать журнал целиком → переписать целиком без payload у ОДНОЙ строки → `hydrateFromDisk()`».
Переиспользует существующие чистые функции: `lineToAct` → `redactAct` → `actToLine`. Атомарность/WAL НЕ
тронуты (грань F3, DEFER — явный комментарий в коде). Supersede/двойной id: шредится ТОЛЬКО первое вхождение,
ограничение закомментировано как F5/FORK-2 (риск §6.2а).

## Acceptance §4 — по 7 пунктам

1. ✅ **`store-durable-fs.ts` получает реальный disk-shred метод.** `shredPayload(actId)` — новый prod-код
   (не только тест). Engine build + typecheck зелёные, 92/92 engine-тестов проходят.
2. ✅ **§9-3 на НЕЗАВИСИМОМ до-снимке + реальный disk round-trip.** `edgesBefore = structuredClone(orderAct.edges)`
   из ИСХОДНОГО акта (harness строка ~118), НЕ через `splitAct`/`project`. P1/P2 — отдельные OS-процессы
   (`spawnSync`), отдельный harness-файл. Assert: `test:44` `edgesAfter == edgesBefore` + `bodyKeysAfter == []`.
3. ✅ **§9-3 assert ПАДАЕТ под мутантом — обязательная часть suite.** Тест `MUTANT (edges dropped…)` —
   постоянный green-тест, доказывающий что честный assert пал бы (см. «Мутант — красный вывод»). Мутант
   `{ payload, edges: undefined, ...rest }` впрыснут мона-патчем instance-свойства `actToLine` в harness
   (НЕ правка боевого store). `test:56-70`.
4. ✅ **§9-3b same-as (≥3, реальный `confirmSameAs`) переживает шред ЧУЖОГО payload.** Группа = subject
   `ORDER_REF` + 2 target (`identity:renter-B/C`) через `confirmSameAs`. Шред идёт по payload-акту order,
   same-as edges целы. Assert: `test:82-89`.
5. ✅ **F6 кандидат 1 через РЕАЛЬНЫЙ `DurableFsStore`.** `access_event` (новый кит), вложенный/массивный
   payload `{ resource:{…}, grants:[…] }`, non-rentacar предикат `granted-to` + `same-as`. Прогон через
   `DurableFsStore.writeAct` + shred + reboot. Assert: `test:104-111`. ⚠️ **см. грань про проекцию ниже** —
   assert идёт на write-model (`store.acts()`), не на projected node, т.к. `access_event` непроецируемый.
6. ✅ **Все тесты — cross-process (`spawnSync` + harness), не same-process.** По прецеденту
   `crash-mid-turn.test.ts`/`durable-reboot-matrix.test.ts` (тот же паттерн `spawnSync(process.execPath,
   ['--import','tsx',HARNESS,…])`).
7. 🟡 **Численный cap — незначительно превышен, флагую (не прячу).** Adapter +41/−1 (в норме «30-50»).
   Test-side: harness 171 + test 118 = **289 строк** против «~150-250». Превышение ~15%, преимущественно
   WHY-комментарии (шапки файлов) + один harness покрывает 3 сценария × 2 режима (файлов держал 3, не плодил).
   Не считаю это over-scope-эскалацией, но фиксирую честно (см. §6 задания).

**Итого: 6 ✅ + 1 🟡 (cap slightly over). 🟥 нет.**

## Мутант — красный вывод ВЕРБАТИМ

Крючок I7 исполнен: честный §9-3 assert (`expect(r.edgesAfter).toEqual(w.edgesBefore)`) временно поставлен
под мутантом и прогнан — упал КРАСНЫМ; затем возвращён постоянный falsify-assert (`.not.toEqual` + `toEqual([])`).

```
 ❯ test/erasure-plane-falsify.test.ts (4 tests | 1 failed | 3 skipped) 275ms
   × §9-3 … > MUTANT (edges dropped in serialization) BREAKS the §9-3 assert — the assert has teeth
     → expected [] to deeply equal [ { predicate: 'rented', …(2) }, …(1) ]

AssertionError: expected [] to deeply equal [ { predicate: 'rented', …(2) }, …(1) ]
- Expected
+ Received
- Array [
-   Object { "meta": { "role": "renter" }, "predicate": "rented",
-            "target": "sheets:Orders#45832-2865:customer" },
-   Object { "predicate": "drives", "target": "sheets:Cars#AB-12345" },
- ]
+ Array []
 ❯ test/erasure-plane-falsify.test.ts:68:28
```

Под мутантом (serialization роняет `edges`) проецируемый узел приходит с `edges: []` вместо реальных
`rented`+`drives` — честный assert обязан упасть, и падает. Тавтология снята: assert имеет зубы.

## §9-3b lock-falsification (довесок critic-верификации 2026-08-06)

**Находка critic (валидна):** исходный §9-3b тест НЕ фальсифицировал сам лок кардинальности.
`RENTACAR_PREDICATES` не упоминает `same-as`, поэтому тест прошёл бы по дефолту `?? 'many'`
(`predicates.ts:58`) даже если удалить `LOCKED_MANY_PREDICATES` целиком — та же порода тавтологии.

**Закрытие (2 новых теста, тот же harness/файл):**
- **Honest lock через диск:** same-as группа (≥3) прогнана через `DurableFsStore` + reboot под ВРАЖДЕБНЫМ
  реестром `{ ...RENTACAR_PREDICATES, 'same-as': 'one' }` (флаг `--hostile`). Assert: все target'ы выживают —
  значит группу держит ТОЛЬКО `LOCKED_MANY_PREDICATES`, форсящий `many` поверх данных реестра
  (`predicates.ts:49,56-59`), а не дефолт-фолбэк. Прецедент in-memory: `write-plane.test.ts:78-103`.
- **Мутант (лок снят):** флаг `--unlock` удаляет `same-as` из экспортированного `LOCKED_MANY_PREDICATES`
  в рантайме (мутация того же module-singleton, который читают `foldEdges`/`project` стора — НЕ правка
  боевого `predicates.ts`). Тогда враждебный `one` побеждает → REPLACE-fold → группа схлопывается к
  последнему target'у. Постоянный green-тест доказывает схлопывание (`.not.toEqual` + `length <`).

**Мутант — красный вывод ВЕРБАТИМ** (I7: честный lock-assert `toEqual(before)` временно под `--unlock` → красный, затем возвращён falsify-assert):
```
   × §9-3b … > MUTANT (kernel lock removed) COLLAPSES the group under same-as:one — the lock-assert has teeth
     → expected [ 'identity:renter-C' ] to deeply equal [ 'identity:renter-B', …(1) ]

AssertionError: expected [ 'identity:renter-C' ] to deeply equal [ 'identity:renter-B', …(1) ]
  Array [
-   "identity:renter-B",
    "identity:renter-C",
  ]
 ❯ test/erasure-plane-falsify.test.ts:130:36
```
Со снятым локом враждебный `same-as:'one'` схлопывает группу к `identity:renter-C` (last-wins REPLACE) —
честный lock-assert обязан упасть, и падает. Тавтология лока снята.

**Обновлённый счёт:** `erasure-plane-falsify.test.ts` теперь **6 тестов** (было 4): +honest-lock, +lock-mutant.
Полный rental-balance = **15 passed** (было 13). Cap: harness 181 (+10), test 158 (+40) — довесок ~50 строк
против ожидания «10-20»; причина — каждый cross-process тест требует P1+P2 spawn + try/finally (≈18 строк/тест).
Флагую честно, файлов не добавлял.

## Результаты прогона тестов (вербатим)

**rental-balance (полный, ПОСЛЕ довеска):**
```
 ✓ test/balance.test.ts (9 tests)
 ✓ test/erasure-plane-falsify.test.ts (6 tests)
 Test Files  2 passed (2)
      Tests  15 passed (15)
```
**engine (полный, регресс не сломан):**
```
 Test Files  15 passed (15)
      Tests  92 passed (92)
```
**typecheck:** `@ff/engine` `tsc --noEmit` — clean; `@ff/rental-balance` `tsc --noEmit` — clean.
**build:** `@ff/engine` `tsc -p tsconfig.json` — clean (dist пересобран, `shredPayload` в dist; dist gitignored, дерево чистое).

## Численный cap — числа

- Adapter (prod): **+41 / −1** строка. Норма «30-50» — в пределах.
- Test-side: harness **171** + test **118** = **289**. Норма «150-250» — **превышено на ~39 строк (~15%)**.
  Файлов: **3** (1 изменён + 2 новых), норма «2-3» — в пределах. Overage — доп-комментарии + мульти-сценарный
  harness. Флагую как минор, не эскалирую.

## ⚠️ Новые грани для лида

1. **Дом теста ≠ engine (цикл зависимостей).** Задание §1 предлагало
   `packages/engine/test/erasure-plane-falsify.test.ts`, но «реальный ga-rentacar путь» (§0-п.2) требует
   `@ff/ingest-rentacar`, который engine импортировать НЕ может (цикл). Тесты ушли в `rental-balance`.
   **Вектор:** если хочется чисто-engine-версию §9-3 (без ingest), придётся строить СИНТЕТИЧЕСКИЙ payload-акт
   прямо в engine-тесте — но это ровно тот generic-fixture, от которого census предостерегал. Реальный путь
   сильнее. Оставил в rental-balance.

2. **F6 `access_event` НЕпроецируемый — assert ушёл на write-model, не read-model.** Находка чтением
   `projection.ts:42` `isProjectable = actKind === 'domain_event' && source_ref`. Задание §3-Кандидат-1
   явно просило «новый actKind: `access_event`… честно второй кит», но такой акт НЕ сворачивается в
   projected node — `readNode` вернул бы `null`. Поэтому F6-assert идёт по `store.acts()` (журнал:
   edges целы + payload удалён), а не по узлу графа. Это доказывает **form-agnosticism erasure-seam НА ДИСКЕ**
   (то, ради чего F6 и затевался), но НЕ прогоняет edge-fold/same-as-lock проекции на втором ките.
   **Вектор/развилка для лида:** если нужно доказать плоскость проекции (edge-fold + same-as ceiling) на
   ВТОРОМ act-kind — либо (a) сделать F6-кандидат `domain_event` в новом tenant-домене с новым предикатом
   `granted-to:'one'` (проецируется, но это уже НЕ «второй кит», а «второй tenant»), либо (b) признать, что
   «второй кит» по определению side-journal и проекции не касается. Я выбрал минимально-достаточное
   (журнальный round-trip реального второго act-kind); полноценный «второй проецируемый tenant» — отдельная,
   более крупная ставка (совпадает с риском §6.3 «не строить второй ingest-пакет»).

3. **`shredPayload` элегантно переиспользует `redactAct`** — оказалось, что «шред строки на диске» = ровно
   `lineToAct → redactAct → actToLine`, без новой логики сериализации. Это подтверждает, что erasure-seam
   спроектирован симметрично (split ⟂ merge ⟂ redact над ОДНОЙ формой строки). Приятная валидация абстракции,
   не проблема.

## Эскалации (архитектурные развилки — НЕ решал сам)

- **F3 (durability/WAL шреда):** `shredPayload` делает полную перезапись файла без атомарности/fsync-order.
  Для ЭТОГО этапа допустимо (задание §1-п.1, риск §6.2). Крэш посреди перезаписи журнала = потенциальная
  порча — это грань F3, оставлена DEFER, НЕ тянул в scope.
- **F5/FORK-2 (cascade shred по supersede-цепочке):** если id встречается дважды (supersede), шредится
  только первое вхождение (закомментировано в коде). Каскадный шред всей цепочки — отдельное архитектурное
  решение, не принимал.
- **Дом теста (грань №1 выше):** решение «rental-balance вместо engine» — обратимое, но это отклонение от
  буквы задания; если лид хочет иначе, готов перенести (потребует синтетический fixture в engine).
