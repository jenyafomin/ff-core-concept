---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-30
Scope: project
node_type: spec
title: A4 — персистентный диск-StorePort (durable append-on-write + rebuild-on-boot)
Related:
  - ./05-m3-topic-agent-contract.spec.md          # ПОТРЕБИТЕЛЬ этого порта; §4 задаёт требования-контракт M3↔A4
  - ./03-observation-latest-wins.spec.md           # EQ-1 latest-wins в read-path (наблюдения на диске)
  - ../analyses/07-canonicalid-cost.analysis.md    # цена модели персистентного узла (EnvelopeNode↔FFNode)
  - ../analyses/06-design-round-critic-verdicts.analysis.md  # критик A6: висячая ссылка на A4 → этот файл её снимает
  - ../../../../packages/engine/src/store-md        # текущий MdEnvelopeStore — load-only мост (стартовая точка)
---

# A4 — персистентный диск-StorePort (durable append-on-write + rebuild-on-boot)

> **Статус: СТАБ (draft).** Файл заведён, чтобы снять висячую ссылку из `specs/05` (критик A6) и дать A4
> постоянный дом. Несущие требования к порту УЖЕ инлайн-зафиксированы в `specs/05` §4 (контракт M3↔A4);
> здесь — их владелец и место для последующего раскрытия (реализация + недостающий тест). Полноценный
> дизайн раскрывается, когда курс дойдёт до P2 (сейчас курс = M2, `specs/04`).

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
