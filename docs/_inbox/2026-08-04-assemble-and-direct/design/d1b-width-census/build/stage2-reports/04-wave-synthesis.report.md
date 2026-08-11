---
node_type: analysis
title: "Синтез волны — Этап 2 D1.b: плоскость genuinely падуча (§9-3/3b ✅), 3 грани для вектора"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-06
stage: 2
kind: synthesis
inputs:
  - ./00-builder.report.md
  - ./01-reviewer.report.md
  - ./02-critic-adversarial.report.md
  - ./03-runtime-verify.report.md
related:
  - ../stage2-falsify-plane.assignment.md
  - ../../00-width-census.synthesis.md
  - ../../../../../00-states/05-assemble-and-direct/_shared/RECOMMENDATION-2026-08-06-next-stage.decision.md
---

# Синтез волны сборки — Этап 2 D1.b (сердце падучести)

> Оркестрация синхронными волнами (правило gateway, без фона). Волна 1 — builder. Волна 2 — 3 независимые
> линзы верификации (reviewer · critic · runtime-verify), параллельно. Микро-довесок — лок-фальсификация.
> Все агенты писали отчёты в файлы (00-03). Fable не привлекался (нет отчёта `fable*`).

## 1. Вердикт: сердце кейстоуна — НАСТОЯЩЕЕ ✅
Плоскость `edges/identity ⟂ payload` теперь genuinely падуча — не «зелена по типу». Сошлись ТРИ вектора:

| Линза | Вердикт | Ключевое доказательство |
|-------|---------|-------------------------|
| reviewer (01) | **PASS**, 0 critical | `shredPayload` минимален (`store-durable-fs.ts:226-251`, +41/−1), мутант перепрогнан вручную красным |
| critic (02) | **§9-3 тавтология СНЯТА** | `edgesBefore = structuredClone(act.edges)` из исходного акта, не через `splitAct`/`project`; мутант бьёт общую точку `actToLine`; P1/P2 — реально разные OS-процессы |
| runtime-verify (03) | **CONFIRMED** | физический шред доказан БАЙТАМИ: ключ `erasable` удалён из `journal.jsonl`, `edges`/`provenance`/`payloadRef` целы; два PID (P1=15567, P2=15569) |

- Тесты: engine **92/92**, rental-balance **15/15** (после довеска), typecheck чист.
- Мутанты падают красным (перепрогнано независимо reviewer'ом и runtime-verify).
- §9-3b лок кардинальности `same-as:'many'` — **фальсифицирован** (довесок): враждебный реестр
  `{'same-as':'one'}` через диск → target'ы выживают благодаря `LOCKED_MANY_PREDICATES`; снять лок → assert падает.

## 2. Три грани, вскрытые верификацией (для вектора — решает владелец)

### Грань №1 — §9-3b лок не фальсифицировался → ЗАКРЫТА ✅
Critic: исходный тест проходил по дефолту `?? 'many'` (реестр `RENTACAR_PREDICATES` не упоминает `same-as`).
Довесок builder'а добавил честную лок-фальсификацию через диск + мутант. В мандате Этапа 2, закрыто в этом же ходу.

### Грань №2 — F6 «второй кит» только на сериализации, НЕ на проекции 🟡 (развилка)
Спец §3 рекомендовал `access_event`, но он **непроецируем** (`projection.ts:42` фолдит только `domain_event`).
Итог: доказан form-agnostic **сериализации/erasure-seam на диске** ✅, но edge-fold/same-as-lock на read-model
второго структурного кита — НЕ прогнан. Same-as ребро в ACCESS_ACT — мёртвый груз (не идёт через `foldEdges`).
- **Рек. лида:** ПРИНЯТЬ сериализационный уровень + записать границу. Строить проецируемого второго жильца =
  ровно «over-proof / теория субстрата», помеченный переписью как ГЛАВНЫЙ риск (recommendation §4). Проекция-
  уровень частично покрыт in-memory (`write-plane.test.ts:48-59,144-190` — второй синтетический домен).
- **Альтернатива (если владелец хочет сильнее):** второй tenant на `domain_event` + новый предикат → прогнать
  edge-fold/lock на read-model второго формата. Дороже, ближе к over-proof.

### Грань №3 ⭐ — by-ref PII переживает шред (нашли ДВА агента независимо → сильный сигнал) 🟥→форк
`shredPayload` стирает только **inline non-PII** `erasable`-запись журнальной строки. Реальный PII — имя, телефон
`0501234567`, заметка «call the renter back» — уезжает по `payloadRef`/`payloadHash`, а это **`IMMUTABLE_ACT_META`**,
намеренно нетронутое. Blob-стор `<storeDir>/payload/*.json` переживает шред.
- Это НЕ баг Этапа 2 (`erasure.ts` сам объявил blob-шред отдельной отложенной гранью).
- НО «payload physically gone» **уже**, чем звучит: зелёный §9-3 не должен молча подразумевать полное стирание PII.
- Меняет смысл слова «стирание» для всего субстрата → утыкается в **Q2 erasure / Ц7 Согласие** (D1.b и должен был втянуть Q2).
- **Рек. лида:** (а) сузить формулировку §9-3 до «inline erasable zone стёрта на диске»; (б) завести форк
  **`T-D1b-shred-by-ref-pii`** (рядом с F3) — hard-erase by-ref blob-стора; (в) кандидат на **Fable-адвайзера**
  (семантика стирания/согласия, высокая цена ошибки) ДО решения глубины. Ждёт опт-ина владельца.

## 3. Эскалации (не решались агентами сами)
- **F3** (WAL/атомарность шреда): `shredPayload` = полная перезапись файла без fsync-order. DEFER.
- **F5/FORK-2** (cascade shred): шредится только первое вхождение id (supersede-цепочка не тронута), закомментировано.
- **Цикл зависимостей:** тесты живут в `packages/rental-balance/test/` (не engine), т.к. `ingest-rentacar → engine`
  цикл. Побочно закрыл census-разрыв §0-п.2 (S10-на-продукте) бесплатно.

## 4. Состояние git
Не коммичено (правило проекта: коммит только по явной просьбе владельца). Дерево = 95973a9 + правки Этапа 2
(изменён `store-durable-fs.ts`; новые `erasure-plane-falsify.test.ts`, `erasure-plane-harness.ts`; папка reports).

## 5. NEXT (после решения владельца по граням №2/№3)
- Цепь: Этап 2 (СДЕЛАН) → **Этап 3 = §9-4 property-based fault-injection** (независимый byte-oracle) `T-D1b-property-fault-injection`.
- Открыто владельцу: F6-уровень (грань №2) · PII-erasure глубина + Fable? (грань №3) · коммит Этапа 2? · FORK-1..4.
