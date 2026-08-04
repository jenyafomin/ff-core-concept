---
Status: superseded
Owner: jenya.stasik@gmail.com
Date: 2026-08-04
Scope: project
node_type: spec
superseded_by: ../../../../02-project/core/00-kernel/durable-storeport.design.md
title: A4 — персистентный диск-StorePort (durable append-on-write + rebuild-on-boot) [SUPERSEDED]
Related:
  - ./05-m3-topic-agent-contract.spec.md          # ПОТРЕБИТЕЛЬ этого порта; §4 задаёт требования-контракт M3↔A4
  - ./03-observation-latest-wins.spec.md           # EQ-1 latest-wins в read-path (наблюдения на диске)
  - ../analyses/07-canonicalid-cost.analysis.md    # цена модели персистентного узла (EnvelopeNode↔FFNode)
  - ../analyses/06-design-round-critic-verdicts.analysis.md  # критик A6: висячая ссылка на A4 → этот файл её снимает
  - ../../../../packages/engine/src/store-md        # текущий MdEnvelopeStore — load-only мост (стартовая точка)
---

# A4 — персистентный диск-StorePort (durable append-on-write + rebuild-on-boot)

> **⛔ SUPERSEDED (2026-08-04) — редирект-заглушка.** S7 durable StorePort **построен и запечатан в коде**:
> `packages/engine/src/adapters/store-durable-fs.ts` (`DurableFsStore`), коммит `b881212 seal GAP 1`; тесты
> `packages/engine/test/survive-turn.test.ts` + `durable-reboot-matrix.test.ts` гоняют реальную границу
> OS-процесса. Контракт S7 — **корневой шов** (R3/R4), его постоянный дом переехал в
> **`../../../../02-project/core/00-kernel/durable-storeport.design.md`** (Status: active). Этот файл был
> проектным стабом; держать оба = два дома у одной темы (нарушение doc-tree закон №2). Контент ниже сохранён
> (LOSE-NOTHING), но **НЕ источник истины**. Остаточный хвост (провязка в раннер · file-first · crash-тест ·
> M3 topic-agent AC) ведётся в kernel-design §8 (R1–R6). **OQ-1 (sync|async) РЕШЁН кодом = (A) sync.**
>
> _(историч. ниже: Статус: СТАБ (draft) — заведён чтобы снять висячую ссылку из `specs/05` критика A6.)_

## 1. Проблема

`Engine.write()` сегодня пишет в инъектированный **sync-`MemoryStore` (RAM)**. `store-md`
(`MdEnvelopeStore`) — **load-only мост**: гидрирует `MemoryStore` с диска (`loadEnvelopeNodes →
toMemoryStore`), но его `writeAct`/`writeNode` **не подключены к `Engine.write()`**. Следствие: наблюдение,
записанное за ход, **исчезает в конце хода** → живой топик-агент (M3, T4) невозможен по построению.

## 2. Требования (контракт стыка M3↔A4 — источник в `specs/05` §4)

1. **Durable append-on-write.** `Engine.write()` → `store.writeAct(act)` дописывает акт на диск **синхронно**
   в момент записи. Rehydrate следующего хода видит этот акт.
2. **Rebuild-from-journal on boot.** На старте процесса: прочитать диск-журнал → свернуть проекцию
   (уже доказано, ADR-0008 §2).
3. **Идемпотентный re-ingest не затирает наблюдения.** Ре-синк Sheets (`domain_event`) не трогает
   non-projectable `observation`-акты.
4. **Модель персистентного узла зафиксирована ADR.** EnvelopeNode↔FFNode; сегодня конверт едет
   непрозрачным JSON-блобом в `@ff/core`-note. Реконсиляция и её цена — `analyses/07`. Настоящий ADR
   (не мифический «ADR-0012») — предусловие P3.

## 3. Известная дыра в тестах (что A4 обязан закрыть)

`test/invariants.test.ts:275` round-trip'ит **только `writeNode`** (`writeNode → toMemoryStore →
readNode`). **`writeAct` не имеет round-trip покрытия**, и **durable-путь до `Engine.write()` не
протестирован** — нет теста «write → рестарт процесса → re-read акта с диска». Это, а не «ноль тестов», —
реальная дыра.

## 4. Acceptance (черновик)

- **AC-1.** `Engine.write(act)` c инъектированным диск-`StorePort` дописывает акт на диск синхронно.
- **AC-2.** Новый OS-процесс поднимается с диска и читает акт, записанный предыдущим процессом
  (закрывает отсутствующий durable-`writeAct` тест).
- **AC-3.** Ре-инжест `domain_event` не стирает `observation`-акты (T4 держится).

## 5. Открытые вопросы (owner / позже)

- Дом журнала: непубличный per-topic store-dir под FF-репо — точное место = doc-discipline решение,
  зафиксировать ДО wiring.
- Согласованность записи (single-writer / file-lock при перекрытии ходов) — при коротко-синхронном
  supervised-соло ходе контеншн низкий; формализовать позже.
- Модель узла (требование 4) гейтится настоящим node-model ADR (P3) + `analyses/07`.
