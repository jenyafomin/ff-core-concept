---
node_type: analysis
title: "Разбор дома для порта payload-стирания (ShredablePayloadSink · shred)"
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
lens: system-architect
question: ../adr-home-erasure-port.question.md
---

# Разбор: дом решения о порте payload-стирания

## (1) Вход / вопрос
Дом решения о `ShredablePayloadSink` + операции `shred`: новый ADR · расширение ADR-0009 · раздел UNIT-SPEC/kernel.
Уже ФОРСИРОВАНО реестром (не пере-решаем содержание порта, только его ДОМ):
- `register:38` (Q-ERA-05) → tombstone (`isShredded`) **port-local** (ingest — dumb adapter).
- `register:39` (Q-ERA-06) → **narrow `ShredablePayloadSink`** (не поднимать весь PayloadStore в engine; min-surface/no-cycle).
Т.е. ФОРМА порта решена; нет физического ДОМА-записи контракта.

## (2) Варианты / призмы
- **A. Новый тонкий ADR** (Extends ADR-0009), номер по честному реестру.
- **B. Расширить тело ADR-0009.**
- **C. Секция UNIT-SPEC-v1 / инвариант kernel.**
- **D. Свернуть в ADR-0011 (PDP-порт, `read:payload`).**

## (3) Разбор по критериям

### Критерий 1 — doc-standard: нужен ли ADR-уровень?
`docs-standard`: ADR обязателен при изменении **data storage / key integrations / архитектуры**. Порт, владеющий
жизненным циклом payload-blob'ов ЧЕРЕЗ границу пакетов engine⟂ingest (`packages/engine` ↔ `packages/ingest-rentacar`)
= storage + integration boundary → **ADR-территория**, не спека-секция, не kernel-инвариант. Прецедентный ряд это
подтверждает: каждое persistence/erasure-граничное решение здесь — ADR (0006 persistence · 0007 erasure · 0009
witness · 0010 compaction · 0011 PDP). Порт-стирания принадлежит этому ряду. → **отвергает C.**

### Критерий 2 — doc-tree law #2 (один дом на тему): порт ≠ свидетель
Темы РАЗНЫЕ:
- ADR-0009 scope (`ADR-0009:8`) = **как устроен СВИДЕТЕЛЬ (`payloadHash`) и что шов делает со своим монументом**.
  Порт назван лишь как **code-follow-up** (`ADR-0009:240-242`: «Порт `PayloadStore`/`ShredablePayloadSink` получает
  операцию `shred`»; «`erased` — терминальный акт»), т.е. 0009 СОЗНАТЕЛЬНО не контрактует порт (downstream).
- Порт = **модуль-граница/интеграционный контракт** (какой пакет владеет sink'ом, поверхность интерфейса,
  локальность tombstone). Другой РОД решения.
Инъекция контракта в тело 0009 сплавила бы две темы (нарушение law #2) и раздула бы approved-ADR. Это ровно то,
почему исходный Q-ERA-04 хотел ОТДЕЛЬНУЮ запись — направление верное. → **отвергает B.**

### Критерий 3 — порт-стирания ≠ PDP-порт (D)
ADR-0011 (draft) = **PDP-порт: ось `read:payload`, решение ДОСТУПА (allow/deny) из PEP**. `ShredablePayloadSink` =
**storage-lifecycle** (put/get/`shred` blob'ов). Авторизация ≠ жизненный цикл хранилища — разные швы, хоть и
соседи в области §6 материализации (`SPEC-DELTA-DOCKET:50-54`). Складывать нельзя; но **явный кросс-реф пары
read-seam (0011) / write-erase-seam (новый)** обязателен. → **отвергает D, требует кросс-реф.**

### Критерий 4 — расщепление ЗАКОН vs КОНТРАКТ (де-конфликт с sibling Q-L1dom)
Есть ДВА разных артефакта, их нельзя смешивать:
- **Закон присутствия шва** («shred-способная deref-воронка с viewer ДОЛЖНА присутствовать до первого payload»,
  U-L1 Instance-1, `two-laws.invariant-candidate.md:62-64`) → дом = kernel-инвариант / §-инвариант UNIT-SPEC
  (это работа sibling-вопроса **Q-L1dom**, не здесь).
- **Контракт конкретного порта** (поверхность `ShredablePayloadSink`, владелец, локальность tombstone) → **ADR**.
Чистое расщепление: ADR не дублирует закон, закон не описывает контракт. Снимает риск двойного дома.

### Критерий 5 — честный НОМЕР (сердце переигровки)
⚠️ **ПОПРАВКА (2026-08-09, critic-check, LOSE-NOTHING).** Первая версия этого разбора рекомендовала **0012** —
сверившись ТОЛЬКО с `docs/architecture/ADR/` и `_log/2026-08-07/ratification/`, НЕ со STATE.md. Это тот же класс
ошибки, что критикуется у Q-ERA-04→0008: **0012 уже негласно зарезервирован под node-model ADR** (EnvelopeNode/
FFNode) — `STATE.md:169` («→ будущий **ADR-0012**»), `STATE.md:173` («память=0012, не 0009»), подтверждено
`ga-rentacar/specs/05-m3-topic-agent-contract.spec.md:205` («node-model ADR … «ADR-0012» не существует»),
черновик `T1-memory-unit.ADR-draft.md`. Прежняя рекомендация 0012 **аннулирована**; ниже — исправленный леджер.

Полный реестр занятых/зарезервированных на 2026-08-09 (сверено: `docs/architecture/ADR/` + все `*.ADR-draft.md`
через glob + STATE.md + grep `ADR-00NN` по всему `docs/`):
| номер | тема | статус |
|---|---|---|
| 0004-0006 | scope/substrate/persistence | approved |
| 0007 | erasure & admission | SPLIT (part approved) |
| 0008 | **log⟂graph CQRS** | approved — **НЕ порт** (сюда целилась ложная диспозиция Q-ERA-04) |
| 0009 | erasure-witness & recursive-seam | SPLIT approved |
| 0010 | compaction/snapshots | draft — РЕЗЕРВ (`_log/2026-08-07/.../ADR-0010-*.draft.md`) |
| 0011 | PDP-порт (`read:payload`) | draft — РЕЗЕРВ (`_log/2026-08-07/.../ADR-0011-*.draft.md`) |
| **0012** | **node-model (EnvelopeNode/FFNode)** | **РЕЗЕРВ** — `STATE.md:169,173` · `ga-rentacar spec:205` · `T1-memory-unit.ADR-draft.md` |
| 0013+ | — | **свободно** (grep `ADR-00NN` по всему `docs/` = 0 упоминаний ≥0013) |
Следующий генуинно-свободный = **ADR-0013** (доказательство: grep по всему дереву не находит ни одного
`ADR-0013`+). Оговорка сохраняется: финальный номер подтвердить при кристаллизации (если 0010/0011/0012-черновики
растворятся — renumber дёшев, ADR ещё не написан).

## (4) Вердикт / что принято
**Вариант A: новый тонкий ADR-0013 (draft/proposed), `Extends: ADR-0009` (через него — ADR-0007).**
_(номер исправлен с 0012→0013 по critic-check — см. Критерий 5 поправку; 0012 занят node-model.)_
Каркас (НЕ пишем сам ADR):
- **Context:** реестр форсировал форму порта (`register:38-39`); ADR-0009 назвал порт code-follow-up, но не
  контрактовал (`ADR-0009:240-242`); U-L1 Instance-1 требует присутствия deref-воронки (`two-laws:62-64`); граница
  engine⟂ingest реальна (`SPEC-DELTA-DOCKET:50-54`).
- **Decision:** контракт `ShredablePayloadSink` — narrow surface (put/get + **`shred`** = «unrecoverable», не «файл
  удалён»); engine владеет минимальным sink-интерфейсом, богатый store остаётся в ingest (Q-ERA-06); tombstone
  **port-local** (Q-ERA-05), не engine-lookup перед `put`; `payloadRef` ⟂ `payloadHash` (наследие ADR-0009 —
  per-act shred чист); соль-co-shred / `hashScheme` влезают под тот же контракт; явный кросс-реф с ADR-0011 (read-seam).
- **Alternatives:** B (тело 0009 — сплав тем, law#2) · C (UNIT-SPEC/kernel — то ЗАКОН, не контракт; Q-L1dom) ·
  D (в ADR-0011 — access ≠ storage-lifecycle) · lift-whole-PayloadStore (цикл/поверхность, Q-ERA-06) ·
  tombstone-as-engine-erased-lookup (ingest перестаёт быть dumb, Q-ERA-05).
- **Consequences:** (+) разблокирует **R5** (`ADR-0009:148`) — подпись остаточного риска требует законтрактованного
  `shred`; даёт контракт для code-фазы (hash.ts:9 / erasure.ts / порт / `erased` — `ADR-0009:237-242`).
  (−) ещё один тонкий ADR в ряду (принято — law#2 > компактность). **Границы:** ADR контрактует ПОРТ (storage-sink);
  **НЕ решает** карве-аут I-4 и семантику `erased`-акта (конституционный ранг, owner-pending `ADR-0009:149-151`).

## (5) Открытые форки
- **Owner-форк из ДОМА-решения: НЕТ.** Дом — доку-структурный, автономный. Смежные owner-pending (carve-out I-4,
  R3/R4/R5) не решаются и не создаются этим вопросом: R5 **разблокируется** контрактом (рычаг), I-4/`erased`
  **вынесены за границу** ADR (остаются в ADR-0009 pending). Новой карточки OWNER-QUEUE не порождает.
- **1 открытый вопрос:** точный номер (0013) зависит от судьбы 0010/0011/0012-черновиков; и — сделать ли ADR-0011↔0013
  явной парой (read-seam ⟂ write-erase-seam). Рекомендация: да, кросс-реф в обе стороны при кристаллизации.
- **LOSE-NOTHING (follow-up, НЕ исполняю без «строй»):** в реестре `00-open-questions-register.open-question.md:37`
  строку Q-ERA-04 пометить `superseded` с указателем на эту ноду (диспозиция «ADR-0008» ложна). Правка чужого
  файла — вне «вырасти ноду»; описываю, не делаю.
