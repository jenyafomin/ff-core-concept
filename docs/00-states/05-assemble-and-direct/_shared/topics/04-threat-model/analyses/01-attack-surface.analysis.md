---
node_type: analysis
title: "U6 — attack-surface из кода (analyst prism)"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
iteration: 9
kind: knowledge
lens: analyst (attack-surface из кода)
related:
  - ../threat-model.question.md
  - ../../03-actor-model/synthesis/02-resolution.synthesis.md
  - ../../../task-pool.md
---

# U6 — Attack-surface (граница → что не проверено → обход), из кода

> Черновик-карта. НЕ security-контроли, НЕ enforcement, НЕ решение — перечисление. Каждый threat несёт
> вербатим `file:line` для НЕПРОВЕРЯЕМОГО кода (или `needs-anchor`, если это дыра-отсутствие). Все находки
> ниже подтверждены чтением исходников + grep 2026-08-09 (эта сессия), не унаследованы вслепую из затравки.

## Сводная таблица

| # | Граница | Что НЕ проверено (якорь) | Конкретный обход | Трек? | Форма/Политика |
|---|---|---|---|---|---|
| B1 | journal-write (`Engine.write`) | `engine.ts:73-111` — ни разу не зовёт `resolveWrite`/`resolve('write',…)` | любой caller пишет ЛЮБОЙ act (включая протектед namespace/policy-узлы) | **TRACKED** (`T-write-pep-unwired`) | ПОЛИТИКА-WIRING (дёшево: 1 вызов), но ПОСЛЕДСТВИЕ (B6) = форма-уровня риск |
| B2 | `PayloadStore.get/put/shred` порт | `packages/ingest-rentacar/src/ports/payload-store.ts:24-41` + `file-payload-store.ts:43-83` — интерфейс и реализация НЕ принимают `viewer`, НЕТ вызова `resolve()` вообще | любой код с ссылкой на store (или с `payloadHash`, который лежит на acts() как meta) читает сырое PII `store.get(hash)` в обход resolve('read',…) | **NEW** | ФОРМА (порт спроектирован БЕЗ viewer-параметра — retrofit требует менять сигнатуру порта, ADR-уровня) |
| B3 | identity-key / `same-as` | `predicates.ts:49` лочит кардинальность, но capability-резолв (`resolve.ts:144-169`) НЕ обходит `same-as`-рёбра вообще | merge-атака на КАПАБИЛИТИ не работает сегодня (не баг, а отсутствие фичи) — реальный риск смещён в B1 (см. ниже) | tracked иначе (`T-sameas-guard` — про кардинальность, НЕ про capability-merge) | н/п (риска в этой форме нет — см. заметку) |
| B4 | fold/projection материализует payload — CRIT-1 класс | `packages/ingest-rentacar/src/lens/customer-lens.ts:1-40+` — НИ ОДНОГО вызова `policy.resolve(...)` во всём файле (grep=0), лишь `graph.byId`/edge-traversal напрямую | лишний "what we know about customer X" лог собирает across-node PII (order+car+fine) БЕЗ per-node read-gate — тот, кто получает объект лога, получает всё, что видит компилятор, не то, что видит VIEWER | tracked концептуально (`T-carry-crit1-into-s1text`, CRIT-1), но БЕЗ конкретного file:line — этот якорь НОВЫЙ | ФОРМА (лог не принимает viewer вовсе — не параметр, которого не хватает, а отсутствующая архитектурная роль) |
| B5 | erasure/shred (по-ref) | `file-payload-store.ts` `get()` НЕ проверяет, существует ли `erased`-акт для этого hash в журнале — `get()` и журнал НЕ связаны никак | если `shred()` НЕ был вызван (напр. caller забыл, или порядок shred→writeAct нарушен — см. `erasure.ts:111` "ordering is the caller's honesty concern") — PII читаемо НАВСЕГДА, и НИКАКОЙ код это не пересчитывает | смежно tracked (`T-D1b-erasure-debt-ADR`, `T-D1b-shred-by-ref-pii`) — но эти про resurrection/dedup, НЕ про "shred просто не вызвали, и это не детектируется" | ПОЛИТИКА (можно добавить invariant-check дёшево — не форма) |
| B6 | policy-as-data self-reference (I-7/I-8) | `loader.ts:8-12` `byId.set(n.id,n)` — ПОСЛЕДНИЙ побеждает; `store-durable-fs.ts:191` `load()` = `[...base, ...projection.values()]` — projection ИДЁТ ПОСЛЕ base | **ПОДТВЕРЖДЁННЫЙ ПОЛНЫЙ ЗАХВАТ ПОЛИТИКИ**: act с `provenance.source_ref='policy:constitution'` (или `meta:cap/core:manage-core`) проходит `admit()`/`admitHome()` (они не знают о protected namespaces), проецируется `foldInto` (никаких ограничений на source_ref), и ЗАМЕЩАЕТ базовый Constitution-узел в `byId` — ceiling переписан атакующим. **Хуже**: forged `grant`-узел с `body.minted_by:'system'` проходит `grantValid()` (`resolve.ts:138-140`) БЕЗ ПРОВЕРКИ, что это реально system — просто верит самозаявленному полю → атакующий минтит себе `core:manage-core`/любой cap | **NEW** (следствие B1, но КОНКРЕТНЫЙ сценарий не был назван нигде в task-pool) | ФОРМА — `grantValid` доверяет самозаявленному `minted_by` БЕЗ криптографической/структурной привязки к реальному минтеру; это архитектурная дыра, не просто недостающий вызов |
| B7 | read-path вне `resolve()` — `DurableRunner`/`StorePort` сырые аксессоры | `runner/durable-runner.ts:64-66` `read(id)` = `store.readNode(id)` НАПРЯМУЮ, БЕЗ `viewer`; `:74-76` `acts()` = `store.acts()` отдаёт ВЕСЬ журнал (actor/provenance/payloadHash) без gate | caller спины (та самая "composition layer" для будущих surfaces, HTTP включая) получает узел/акт целиком, обходя `resolve('read',…)`; `acts()` даёт `payloadHash` пачками → прямой вход в B2 | **NEW** | ФОРМА (StorePort по дизайну internal/ungated — но `DurableRunner` — уже CROSS-boundary composition layer, комментарий сам называет её тем, что будущий HTTP-caller свяжет) |

## Детали по границам

### B1 · journal-write bypass (TRACKED, но недооценённый по последствиям)
`packages/engine/src/engine.ts:73-111` — `write()` вызывает `admit()` (PII-скан) и `admitHome()` (one-home
барьер), но **ни разу** `this.policy.resolveWrite` или `this.resolve(...)`. Диспетчер `resolve.ts:120`
существует и работает (`resolveWrite` `resolve.ts:191-233`), но никто его не зовёт с write-стороны.
Read-путь гейтится корректно (`view-compiler.ts:58,102,142,223`). **Это уже задача `T-write-pep-unwired`**
(итер.8) — не переоткрываю её существование, но нахожу НОВЫЙ конкретный exploit-инстанс (B6), который она
не называла явно.

### B2 · PayloadStore — порт БЕЗ viewer вообще (NEW)
`packages/ingest-rentacar/src/ports/payload-store.ts:24-41` — интерфейс `PayloadStore { put, get, shred }`
не принимает `viewer`/`SubjectRef` НИ В ОДНОМ методе. `file-payload-store.ts:53-58` `get(payloadHash)`
читает файл с диска и возвращает контент — единственная проверка это "файл существует", НЕ "имеет ли
вызывающий право читать". Любой модуль с DI-ссылкой на store (ingest runner, тест, будущий tool/агент)
читает PII напрямую, минуя `resolve('read',…)` целиком — потому что PayloadStore ЖИВЁТ ВНЕ графа: это не
`EnvelopeNode`, `resolve()` про него вообще не знает.
**Отличие от известных задач:** `T-D1b-erasure-debt-ADR`/`T-D1b-shred-by-ref-pii` — про НАДЁЖНОСТЬ erasure
(dedup resurrection, salt). Эта находка — про ДОСТУП В ПРИНЦИПЕ, до всякого erasure: даже НЕ-erased PII
читается без какой-либо policy-проверки, потому что порт для этого не спроектирован.

### B3 · same-as — риска в форме "capability merge" сегодня НЕТ (пересмотр затравки)
Затравка вопроса просила проверить "merge attacks" через `identity-key/same-as`. По коду:
`holdsCapability` (`resolve.ts:144-169`) матчит `viewer` строкой/glob (`subjMatch`/`capMatch`) — НЕ ходит по
`same-as`-рёбрам вообще. Значит слияние двух customer-узлов через `same-as` НЕ даёт одному "занять" cap
другого. **Риск, который я нашёл вместо этого, живёт не в B3, а в B6** — там подделка НЕ `same-as`,
а прямая подделка `grant`-узла. B3 остаётся угрозой ДАННЫХ (объединение чужих customer-историй в одну
идентичность, если `same-as` пишется бесконтрольно — но это опять следствие B1, не отдельный механизм).

### B4 · CRIT-1 — customer-lens читает граф без PEP (concrete anchor, was missing)
`packages/ingest-rentacar/src/lens/customer-lens.ts` — grep на `resolve(` по всему файлу = 0 совпадений
(кроме несвязанных локальных функций `resolveCar`/`resolveFines`, которые НЕ policy.resolve). Лес
traversal — `graph.byId.get(...)` (:77,86,98,111) напрямую по builded index, без единого прохода через
`ctx.policy.resolve('read',…)`. Компилятор (`view-compiler.ts`) гейтит ТОЛЬКО пути, которые идут через
`compile(def)(...)`; `customer-lens` — отдельный, параллельный read-путь, который граф просто ЧИТАЕТ.
`T-carry-crit1-into-s1text` уже называла этот класс ("fold/снапшот/durable-fs eager-hydrate деref-пути") и
ПРЕДУПРЕЖДАЛА "не сузить funnel только до PayloadStore.get" — это ровно то предупреждение материализовалось:
funnel уже шире (customer-lens — второй, отдельный, ungated deref-путь).

### B5 · erasure/shred — get() не знает о journal-состоянии erased
Нет отдельного нового файла-якоря сверх B2/B3 — это КОМПОЗИЦИЯ B2 (get() без gate) + отсутствие
cross-check "существует ли `erased`-акт для этого ref в журнале". `needs-anchor`: НЕТ кода, который бы
делал этот cross-check (отсутствие, не баг) — искал `ERASES_PREDICATE`/`erased` использование в
file-payload-store.ts и store-durable-fs.ts: 0 совпадений вне erasure.ts/store-durable-fs.ts:216-259
(shredPayload, deprecated inline path). По-ref путь (канон) НЕ читает журнал при `get()` вообще.

### B6 · policy self-reference — ПОДТВЕРЖДЁННЫЙ, не гипотетический (NEW, отвечает invariants.md:261)
Цепочка (все звенья построены и прочитаны в этой сессии):
1. `admit()` (`admission.ts:135-153`) не знает о "protected namespace" — сканирует только PII-паттерны.
2. `admitHome()` (`admission.ts:118-133`) no-op без явно зарегистрированного `fact_kind`.
3. `isProjectable`/`foldInto` (`projection.ts:41-43,73-115`) принимают ЛЮБОЙ `source_ref`-string — нет
   allowlist/denylist на "системные" id (`policy:*`, `meta:cap/*`).
4. `loader.ts:8-12` — `byId.set(n.id, n)` в цикле по `[...base, ...projection.values()]`
   (`store-durable-fs.ts:191`) — projection идёт ПОСЛЕ base → **атакующий узел с id='policy:constitution'
   ЗАМЕЩАЕТ настоящий в byId**.
5. `grantValid()` (`resolve.ts:136-141`) доверяет `g.body?.minted_by === 'system'` БЕЗ верификации —
   forged grant с этим полем проходит как валидный.
Итог: `invariants.md:261` ("можно ли менять policy тем же механизмом, который policy контролирует") —
**открытый вопрос закрывается ДА, и небезопасно**: сегодня policy ПОЛНОСТЬЮ управляема тем же
write-путём, который она должна ограничивать, потому что write-путь НИЧЕМ не ограничен (B1) И даже если
бы resolveWrite был подключён, `canWriteNamespace`/`grantValid` НЕ единственные проверки — `grantValid`
сам доверяет незаверенному полю.

### B7 · DurableRunner/StorePort — сырые аксессоры (NEW)
`packages/engine/src/runner/durable-runner.ts:64-66` (`read`) и `:74-76` (`acts`) вызывают
`store.readNode`/`store.acts()` напрямую — ни `viewer`, ни `resolve()`. Комментарий над классом
(`durable-runner.ts:1-15`) называет его "SPINE seam", "composition layer those surfaces will consume" —
то есть это НЕ внутренний деталь одного адаптера, а именно тот слой, к которому свяжется будущий HTTP/agent
caller (штамп из brief'а B1 seed про S1-класс дыру). `StorePort` сам документирован как "engine-INTERNAL
port... NOT a cross-module seam" (`store-port.ts:1-2`) — но `DurableRunner` СТАВИТ его на cross-module
границу без добавления gate. Форма-конфликт: контракт порта (internal, ungated) и роль раннера
(cross-boundary spine) разъехались.

## Трек-статус (сводно)
- **TRACKED, дополнено новым сценарием:** B1 (существующая задача `T-write-pep-unwired`), B6 — прямое
  следствие B1, но конкретный exploit (constitution overwrite / grant forgery) нигде раньше не был написан
  file:line — предлагаю **обновить** `T-write-pep-unwired` этим сценарием, а не заводить дубль.
- **TRACKED смежно, другое измерение:** B5 (смежно `T-D1b-erasure-debt-ADR`/`T-D1b-shred-by-ref-pii` — те
  про resurrection/dedup, эта про "отсутствие cross-check вообще").
- **Пересмотрено против затравки:** B3 (риск НЕ там, где просил вопрос — capability-merge через same-as
  не воспроизводится кодом; реальный риск в B6).
- **NEW, без трека:** B2 (PayloadStore порт без viewer), B4 (customer-lens конкретный якорь для
  CRIT-1-класса, который раньше был поименован, но не заякорен), B7 (DurableRunner сырые аксессоры).

## Форма vs Политика (Закон-1)
- **Missing FORM (retrofit-невозможно потом, urgent):** B2 (сигнатура порта без viewer — менять сигнатуру
  публичного порта ПОСЛЕ первых real-caller интеграций дорого), B4 (customer-lens — архитектурно НЕ
  принимает viewer, это отдельный funnel, не параметр), B6 (grantValid доверяет незаверенному полю —
  нужна структурная привязка минтера, не просто "добавить проверку"), B7 (DurableRunner - роль "spine
  seam" уже назначена без gate-контракта в форме).
- **Missing POLICY (retrofit-дёшево, can wait):** B1 (один вызов `resolveWrite` в `write()`), B5 (можно
  добавить cross-check `erased`-акта в `get()`, это доп. логика поверх существующей формы, не новая форма).

## Owner-risk (флагирую, НЕ решаю)
Все 7 границ сегодня в проекте с ЖИВЫМ на диске durable-store (веха "wire durable to real path", коммит
`95973a9`) и по-ref erasure на месте — то есть это НЕ бумажная угроза, путь уже ходит в prod-подобный код.
B6 (policy self-reference / полный захват через forged grant) — по силе последствий это КОРНЕВАЯ угроза
("несущие 20%"), но это суждение — для critic/architect-синтеза, не для этого файла.

## Confidence
- B1, B4, B6, B7: **высокая** — прямое чтение исходников + grep=0 на отсутствующие вызовы, цепочка звеньев
  прослежена построчно.
- B2, B5: **высокая** на "нет проверки", **средняя** на "это уже эксплуатируемо в проде сегодня" (зависит
  от того, какие вызывающие модули реально держат ссылку на PayloadStore — не проверял ВСЕ вызовы поимённо
  за пределами ingest/rental-balance пакетов).
- B3: **средняя** — проверил `resolve.ts`/`holdsCapability` целиком, не проверял КАЖДЫЙ будущий/draft
  consumer `same-as` (напр. `dedup/same-as-writer.ts` — не читал целиком, только grep).

## Открытый вопрос (для architect/critic)
Является ли B6 (forged grant с `minted_by:'system'`) тем же classом угрозы, что и B1 (просто "ещё один
пример незагейченного write"), или это ОТДЕЛЬНЫЙ, более острый инвариант-дефект (`grantValid` доверяет
самозаявленному полю ДАЖЕ ЕСЛИ resolveWrite будет подключён завтра — потому что resolveWrite сам не мешает
записи `grant`-узла с `minted_by:'system'`, если у автора нет отдельного meta-cap гейта на "кто может
писать `type:grant` вообще")? Если separate — это может быть НЕСУЩИЙ 20%-угроза сама по себе, а не просто
следствие B1.
