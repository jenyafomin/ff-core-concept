---
node_type: analysis
title: "D1.b width-census — synthesis: единая матрица ширины + гейт I2/I4"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-06
sources:
  - raw/01-real-surface.map.md
  - raw/02-paired-faces.map.md
  - raw/03-falsifiability.map.md
gate: movement-selfcheck-I2
related:
  - ../../../../00-states/05-assemble-and-direct/_shared/RECOMMENDATION-2026-08-06-next-stage.decision.md
---

# D1.b width-census — synthesis

Метод: свести Карту №1 (реальная поверхность), Карту №2 (парные/пропущенные грани), Карту №3
(адверсариал падучести) в одну матрицу; разрешить противоречия между картами независимой проверкой
кода; поставить вердикт гейта ширины (I2).

## 0. Разрешённые противоречия карт (кросс-чек I4)

1. **Грань №1 (именованная граница writeAct→hydrateFromDisk).** Карта №1: ✅ (реальный SIGKILL-тест).
   Карта №3: ⬜-риск («тест может остаться in-process симуляцией»). **Проверено чтением**
   `packages/engine/test/crash-mid-turn.test.ts:53-77` — тест реально делает `spawn` дочернего процесса,
   ждёт `COMMITTED`, шлёт `SIGKILL`, поднимает НОВЫЙ процесс `--verify`. Это настоящий cross-process kill,
   не same-process reconstruction. **Разрешено в пользу Карты №1: ✅.**
2. **Грань №7 (позитивный form-agnostic).** Карта №1: ⬜ (константа `IMMUTABLE_ACT_META` есть, теста нет).
   Карта №3: 🟥 always-green (default registry пуст → даже написанный тест был бы vacuous без инъекции
   form-specific ключа). Не противоречие по сути — обе согласны, что ИСПОЛНЯЕМОГО falsifying-теста
   сейчас НЕТ. **Свёл к 🟥** (нет теста = нет защиты инварианта, что бы ни говорила константа).
3. **(а) Тавтология критерия №3 — реально ли §9 принял always-green текст?** Да, подтверждено чтением
   `packages/engine/src/core/erasure.ts:25-34,48-50`: `IMMUTABLE_ACT_META` включает `edges` по ТИПУ,
   `splitAct` деструктурирует `{ payload, ...meta }` — `edges` физически вне зоны действия функции.
   Значит «edges целы после шреда» истинно для ЛЮБОЙ реализации erasure, включая сломанную. §9 п.3 принят
   в таком виде — критерий структурно не может упасть. Подтверждаю находку Карты №3.
4. **(б) F6 form-agnosticism — тот же класс, что CG-14/K4?** Да, Карта №2 сама называет это прямо
   («same defect class as CG-14: same-as locked in `many` → guard trivially clean»). Проверка на ОДНОМ
   форм-факторе (ga-rentacar) доказывает форм-агностичность тавтологически. Согласен.
5. **(в) Durable-плоскость не подключена к реальному пути — грань переписи или отдельный долг?**
   Отношу к ГРАНИ переписи D1.b, не к отдельному долгу: ставка «растёт без миграций» проверяется на
   ПРОДУКТОВОМ пути, а не изолированно в `packages/engine`. Пока `rental-balance/src/surface/cli.ts:26`
   создаёт `MemoryStore`, критерии 2/3/3b валидны только для лаборатории движка, не для реального ga-rentacar
   акта — это делает весь кейстоун недоказанным на deployment-плоскости, что и есть суть «сломать
   плоскость».

## 1. Единая матрица ширины (19 граней)

| грань | статус | якорь file:line (вербатим) | дом задачи |
|---|---|---|---|
| §9-1 Именованная граница writeAct→hydrateFromDisk | ✅ закрыта | `crash-mid-turn.test.ts:53-77,80-104` real SIGKILL cross-process | — |
| §9-2 Раздельная падучесть round-trip vs erasure-on-disk | 🟥 БЛОК (половина) | round-trip ✅ `durable-reboot-matrix.test.ts:56-78`; erasure-on-disk ✗ — `store-durable-fs.ts` не импортирует `erasure.ts` (грепом: 0 хитов); `erasure-seam.test.ts:23-57` тестирует чистые функции в памяти | T-D1b-wire-erasure-to-disk |
| §9-3 Q2 шред-одного assert («хребет+edges целы») | 🟥 БЛОК — тавтология | `erasure.ts:25-34` (`edges` в `IMMUTABLE_ACT_META`) + `:48-50` (`splitAct` не трогает `edges` по конструкции) | T-D1b-shred-assert-independent-snapshot |
| §9-3b same-as group через РЕАЛЬНЫЙ disk round-trip | 🟥 БЛОК | нет теста; same-as тестируется только в памяти (`write-plane.test.ts`, `invariants.test.ts`, `idempotency.test.ts`) — ни один не спавнит `DurableFsStore` | T-D1b-sameas-disk-roundtrip |
| §9-4 Fault-injection генуинно падуч + независимый oracle | 🟥 БЛОК | `crash-mid-turn.test.ts:119` hand-picked offset; oracle переиспользует ту же parse-цепочку что и `hydrateFromDisk` | T-D1b-property-fault-injection |
| §9-5 Численный cap на срез | 🟥 БЛОК | `RECOMMENDATION:96` — «файлы/строки/срок» без числа | T-D1b-set-numeric-cap |
| §9-6 Owner-legible артефакт «ставка держится/сломалась» | 🟥 БЛОК | нет генератора (`01-execution-plan.synthesis.md:147-149` "TODO — no generator exists yet") | T-D1b-owner-legible-card |
| §9-7 Позитивный form-agnostic (никакой form-specific ключ не течёт в хребет) | 🟥 БЛОК | `predicates.ts:29` `DEFAULT_PREDICATES = {}` — пусто, тест был бы vacuous; теста нет вообще | T-D1b-form-agnostic-leak-test |
| §9-8 CG-06 split (referent-DESIGN исполняемый инвариант) | 🟥 БЛОК (design, не код) | `RECOMMENDATION:101-102` — декларативно, 0 хитов на "referent" в `packages/` | T-D1b-referent-reject-path |
| §9-9 Сверка V4 (Витальность←хребет) вторым агентом | 🟥 БЛОК (процесс) | `docs/02-project/core/01-brain/01-overview/01-values/V4-vitalnost.md` есть файл, сверки/второго проверяющего нет | T-D1b-v4-second-agent-check |
| S10 MemoryStore→DurableFsStore на реальном пути | 🟥 БЛОК — КЕЙСТОУН | `packages/rental-balance/src/surface/cli.ts:10,26` `const store = new MemoryStore(...)` | T-D1b-durablefs-swap-realpath |
| S11 «нет ключа payload» в journal-строке (precond-2) | 🟥 отложена-с-домом | нет теста, читающего сырые JSONL-строки на отсутствие top-level `payload` | T-D1b-no-payload-key-journal-test |
| S12 dist/src parity check (precond-4) | 🟥 отложена-с-домом | `grep -rl "dist/src\|parity" tools/` → пусто, инструмента нет | T-D1b-dist-src-parity-tool |
| F2 Чтение шредднутого payload — dangling ref → определённый "erased"-маркер | 🟥 БЛОК (новая, не в §9) | нет контракта; спина после шреда хранит `payloadRef`/`payloadHash` в никуда | T-D1b-erased-read-contract |
| F3 Двух-writes crash-окно META↔payload (порядок durability) | 🟥 БЛОК (новая, механический runner-up) | `store-durable-fs.ts:173` fsync журнала — blob пишется НЕЗАВИСИМЫМ швом, нет WAL-порядка | T-D1b-durability-order-contract |
| F4 Orphan payload (инверсия F3) — блоб без референта, unerasable PII | 🟥 БЛОК (новая) | erasure ходит по спине, orphan никогда не посещается | T-D1b-orphan-sweep-or-forbid |
| F6 ⭐ Form-agnosticism SUFFICIENCY (второй, структурно иной формат) | 🟥 БЛОК — САМАЯ важная новая грань | `IMMUTABLE_ACT_META` протестирован только на ga-rentacar; нет второго формата | T-D1b-second-form-falsification |
| F5 Cascade-erasure — дом отложенной грани | ⬜ отложена-с-домом (уточнить) | §9-3 DEFER, но CG-07 говорит «D1.b OR FORK-2» — не решено | T-FORK2-cascade-erasure (привязать к FORK-2 явно) |
| F1 Recall через agent-door после round-trip | ⬜ отложена-с-домом (корректно) | `load()` — прямое чтение стора (`store-durable-fs.ts:159-161`), минуя `resolve()`/PEP; recall = Q1/D1.c | D1.c / Q1 (не блокер D1.b, но не считать зелёным) |

Бонус вне §9 (для контекста, не входит в счёт): PID single-writer lock — ✅ закрыта, `store-durable-fs.ts:96-125` + `crash-mid-turn.test.ts:80-104` реальный SIGKILL.

**Итог по счёту:** 19 граней · ✅ 1 · ⬜ 2 (обе — корректно deferred-with-home, не блокеры) · 🟥 16 (14 блок-кейстоуна + 2 «отложена-с-домом» по объёму S11/S12).

## 2. ВЕРДИКТ гейта ширины (I2)

**«Строй» ЗАПРЕЩЁН.** По сущности «D1.b плоскость» — минимум 14 граней 🟥, включая тавтологичный
акцептанс-критерий (§9-3) и полностью неподключенный к продукту путь (S10). Ветка ещё DESIGN.

**Минимальный набор для genuine-падучего прототипа (прототип-где-зелено):**
Блокеры кейстоуна (без них прототип НИЧЕГО не доказывает, даже если тесты будут зелёные):
1. S10 — DurableFsStore на реальном пути ga-rentacar (иначе §9-2/3/3b проверяют лабораторию, не продукт).
2. §9-3 / §9-3b — переписать shred-assert на независимый до-снимок edges/same-as + реальный disk round-trip
   (сейчас тавтология по типу).
3. F6 — второй, структурно иной формат поверх того же edge-vocabulary (иначе «form-agnostic» пустое слово).
4. §9-4 — property-based fault-injection с независимым (не переиспользующим `project()`) oracle.
5. §9-2 — подключить erasure к реальному диску (сейчас `erasure.ts` не импортируется адаптером вообще).

Отложить-с-домом (не блокируют вход в прототип, но не терять): §9-5 (число cap), §9-6 (owner-card),
§9-7 (form-agnostic leak-test), §9-8 (referent reject-path), §9-9 (V4 второй агент), S11, S12, F2, F3, F4,
F5→FORK-2.

## 3. Патч принятого §9, п.3

Текущий текст (RECOMMENDATION §9 п.3): *«Ограничить Q2 — шред РОВНО одного payload → ассерт «хребет +
same-as edges целы»; каскад-полнота → DEFER»*.

**Правка (падучая формулировка):**
> Ограничить Q2 — шред РОВНО одного payload → ассерт «хребет + same-as edges целы», где edges/same-as
> membership снимаются **НЕЗАВИСИМЫМ снимком ДО шреда** (не пересчётом через `splitAct`/`project()` — та
> же функция, что тестируется), сравниваются с состоянием **ПОСЛЕ реального disk round-trip** (spawn/kill/
> reboot, не same-process). Assert обязан ПАДАТЬ под мутантом, роняющим `edges` внутри `splitAct`
> (`{ payload, edges: undefined, ...rest }`) — прогнать это как часть acceptance, не как опциональную
> проверку. Каскад-полнота → DEFER, привязана к FORK-2 явным пунктом бэклога (не голый «DEFER»).

Нужен — да.

## 4. Рекомендация следующей волны
Три волны, синхронно (по правилу gateway): (1) S10 swap + §9-2 wire-erasure-to-disk — инфраструктурная
предпосылка, без неё остальное лабораторно; (2) §9-3/3b переписать под независимый снимок + F6 второй
формат — сердце падучести; (3) §9-4 property-based fault-injection с независимым oracle — самое хрупкое.
Отложенные (§9-5/6/7/8/9, S11/S12, F2-F5) — сеять как задачи с домами T-D1b-*, не блокировать вход.
