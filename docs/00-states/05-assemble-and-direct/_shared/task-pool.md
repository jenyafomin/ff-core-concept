---
node_type: task-pool
title: "Пул задач — assemble-and-direct (живой список, не хроника)"
status: active
owner: jenya.stasik@gmail.com
date: 2026-08-05
scope: project
reuses: ./README.md
state: ../state.md
handoff: ../../../_log/2026-08-05-movement-rules-and-census/HANDOFF.md
---

# 🗂 Пул задач — Собрать и направить

> **Живой список, НЕ хроника.** Стейт наполняется отсюда; каждая задача принадлежит одному/нескольким
> планам-веткам. Владелец распределяет по сессиям (одна сессия = одна ветка, неглубоко). Закрытое не
> удаляем — переводим `status: done` (LOSE-NOTHING).
>
> **Якорь = вербатим.** У инженерных задач — `file:line` + дословная строка исходника (проверено grep-ом).
> Концептуальные задачи без кода помечены `needs-anchor` (указатель на прозу HANDOFF/FORK).
> Статусы: `todo · in-progress · done · deferred`. Приоритет: 🔴 несущее · 🟠 важное · 🔧 инструментальное.

## Индекс

| id | имя | ветка/план | приор | статус |
|----|-----|-----------|-------|--------|
| T-recall | recall-through-the-same-door | D1 (срез), визард S1 | 🔴 | todo |
| T-erasure-cascade | derived-акты несут PII мимо erasure | D1 / FORK-2 | 🔴 | todo |
| T-selection | релевантность/выбор узла ≠ масштаб | DV | 🔴 | todo |
| T-actor-identity | SubjectRef=string, нет ViewerResolver | D3 / DV | 🔴 | todo |
| T-referent-consent | согласие на ВПИСАТЬ ~2700 клиентов | FORK-2 (владелец) | 🔴 | todo |
| T-field-classify | классификация операндов (PII vs фин-ретенция) | до D1.b | 🟠 | todo |
| T-conflict-reconcile | два значения об одном факте — latest-wins молчит | D2 | 🟠 | todo |
| T-failure-contract | recall после стирания / store недоступен | D1.c / D2 | 🟠 | todo |
| T-concurrency | «агент ровно один» — скрытое допущение → долг | D3 / DV, визард S2 | 🟠 | todo |
| T-honest-canon | снять ложные «REAL» (честный derived) | D2, визард S3-A | 🟠 | todo |
| T-human-view | человеческий вид узла + act «оспорить память» | кандидат-карточка, визард S3-B | 🟠 | todo |
| T-usage-test | диагностический прогон recall (обратимо) | перед D1.b, визард S4 | 🔧 | todo |
| T-baton | task-pool + HANDOFF.template + правила + перепись (Нить A) | S-D | 🔧 | done |
| T-sameas-guard | same-as guard тавтологически чист (D1.b precond 3 не доказывает R1) | D1.b | 🔴 | todo |
| T-plan-honesty | ошибки ПЛАНА из переписи (CG-11 DV-коллизия · CG-12 генератор D0 · CG-13 гейт-прозой) | D0 | 🔴 | todo |
| T-state-pult-generator | root-пульт генератор из карточек (схема передоказать от `04-improvement-plans/state.md`), файл `tools/lint/state-pult.mjs` | D0 | 🔴 | todo |
| T-census-check | механизировать R-b: `tools/lint/census-gate.mjs`, читает `task-pool.md`+`02-coverage-gate.synthesis.md` напрямую, падает на непоглощённых P0/P1 CG-* | D0 | 🔴 | todo |
| T-census-check-ci | подключить `T-census-check` к реальному входу в «строй» (pre-commit хук ИЛИ ручной шаг в `HANDOFF.template.md`) | D0 (после T-census-check) | 🟠 | todo |
| T-index-refresh | INDEX'ы устарели (docs/INDEX · growth-and-seq · process) — новые файлы не видны | S-D | 🔧 | todo |
| T-doctypes-register | завести типы convention/task-pool/template в docs/.doc-types.json | S-D | 🔧 | todo |
| T-forks | FORK-1..4 — решает владелец | — | 🔧 | todo |
| carry-forward | долги прошлых хендофов | S-A / S-D | 🔧 | todo |
| T-D1b-durablefs-swap-realpath | S10 · продуктовый путь на `DurableFsStore`, не `MemoryStore` | D1.b (блокер-кейстоун) | 🔴 | **done** (Этап1, verified 2вектора) |
| T-D1b-legacy-line-test | unit-тест `lineToAct` на legacy-строку (top-level payload, без `erasable`) — заметка reviewer Этапа1 | D1.b | 🟠 | todo |
| T-D1b-second-form-falsification | F6 · form-agnostic хребет против ВТОРОГО формата | D1.b (блокер-кейстоун ⭐) | 🔴 | **done (RESOLVED S3)** — 2-я СТРУКТУРНАЯ форма `time-on-edge` доказана: residual=2 сосуществующих `drives`-ребра под неизменными ключами, ZERO type-delta, анти-тавтология-мутант КРАСНЫЙ на реальном коде; `:110`-gap закрыт волной 4. Ptr: `../../../_log/2026-08-11-S3-prove/HANDOFF.md` (Gate 1+2), тест `packages/engine/test/second-form-spine.test.ts` |
| T-D1b-shred-assert-independent-snapshot | §9-3/3b · edges-снимок ДО шреда + disk round-trip (снять тавтологию) | D1.b (блокер-кейстоун, Этап2) | 🔴 | **done** (Этап2, verified 3вектора: reviewer PASS · critic снята · runtime CONFIRMED байтами) |
| T-D1b-shred-on-disk | §9-3 · НОВАЯ prod-функция `shredPayload` на диске (`redactAct` только in-memory) — минимум, не WAL | D1.b (Этап2) | 🔴 | **done** (Этап2, `store-durable-fs.ts:226-251`, мутант красный) |
| T-D1b-samehas-lock-falsify | §9-3b · лок `same-as:'many'` фальсифицирован враждебным реестром через диск (был тавтологичен по дефолту) | D1.b (Этап2 довесок) | 🔴 | **done** (Этап2, rental-balance 15/15) |
| T-D1b-shred-by-ref-pii | ⭐ by-ref PII (`payloadRef`/`payloadHash` blob `<storeDir>/payload/*.json`) переживает `shredPayload` — hard-erase настоящего PII. Fable+critic: не в D1.b (over-proof), а **отдельный несущий под-кейстоун ПОСЛЕ Этапа 3**; до закрытия — **dev/test-only забор** (R1-гейт: реальный PII не впускать). Вектор: это первый жилец плоскости, ПЕРЕД Q5 consent | D1.b→next несущее (Q2/Ц7) — **owner:TBD** | 🔴 | todo (anchor: `fable-fork3-pii-erasure.advisory.md`, `05-fork3-critic.report.md`) |
| T-D1b-erasure-debt-ADR | ADR о ГРАНИЦЕ долга стирания (Fable, 4 натяжения): (1) engine структурно не шредит blob — порт `PayloadStore` живёт в `ingest-rentacar`; (2) content-addressed dedup ломает erase (общий blob → over/under-erase); (3) идемпотентный `put` (`file-payload-store.ts:22-24`) ВОСКРЕШАЕТ стёртый blob при ре-инжесте (T24 нарушен дизайном); (4) `hash.ts:9` «hashing PII safe» ложно для телефона (несолёный sha256 = оракул) | D1.b / erasure — **owner:TBD** | 🔴 | todo (anchor: `fable-fork3-pii-erasure.advisory.md` §3) |
| T-D1b-f6-accept-boundary | F6 грань №2: architect + рекомендация лида = ПРИНЯТЬ серилизационный уровень, второго проецируемого кита НЕ строить (over-proof). Оба шва (конверт+проекция) уже имеют не-rentacar второй экземпляр (`write-plane.test.ts:109-142` `linked-to`); композиция следует из ADR-0008 чистоты. Условие: сузить формулировку F6 до «form-agnostic по-слойно». Опц. упрочнение: `--scenario projfold` на существующем harness | D1.b (Этап2) | 🟠 | **decided-pending-owner** (anchor: `06-fork2-f6.report.md`) |
| T-D1b-second-form-time-on-edge | F6 · второй формат по оси `time-on-edge` (`validFrom/validTo` `types.ts:38-41`) — решение лида | D1.b (Этап2) | 🔴 | deferred (builder выбрал access_event по спецу §3; time-on-edge не понадобился — same-as едет на проецируемом order-узле) |
| T-D1b-rental-durable-test | хвост Этап1 · коммит-тест реального ga-rentacar durable-пути (`cli-durable.test.ts` гоняет generic-CLI) | D1.b | 🟠 | todo |
| T-D1b-property-fault-injection | §9-4 · property-based усечение + независимый byte-oracle | D1.b (блокер-кейстоун) | 🔴 | todo |
| T-D1b-wire-erasure-to-disk | §9-2 · `erasure.ts` не импортируется адаптером (0 хитов) | D1.b (блокер-кейстоун) | 🔴 | **done** (Этап1, `store-durable-fs.ts:41,140` splitAct подключён) |
| T-D1b-rest (§9-5/6/7/8/9, S11/S12, F2/F3/F4, F5→FORK-2) | отложенные грани переписи ширины | D1.b (отложить-с-домом) | 🟠 | todo |
| T-ratify-law1 | ратифицировать Закон-1 (форма retrofit-невозможна / политика дешева) | S1 (`plans/01-S1-ratify-two-laws/`) | 🔴 | todo |
| T-ratify-law2 | ратифицировать Закон-2 (юнит-статус зарабатывается жизненным циклом = promotion-предикат) | S1 (`plans/01-S1-ratify-two-laws/`) | 🔴 | todo |
| T-i4-decide | закрыть I-4 (гейт кода Шага-1 — да/нет владельца) | S1 (`plans/01-S1-ratify-two-laws/`) | 🔴 | todo |
| T-lay-deref-seam | заложить ФОРМУ deref-seam funnel (retrofit-невозможна, берёт viewer) | S2 (`plans/02-S2-lay-forms/`) | 🔴 | todo |
| T-opaque-edge-id | заложить ФОРМУ opaque замороженного edge-id (retrofit-невозможна) | S2 (`plans/02-S2-lay-forms/`) | 🔴 | todo |
| T-admission-failclosed | заложить ФОРМУ admission-гейта (choke-point) сейчас — retrofit-невозможно; fail-open/closed + классы = R4 (pending владелец) | S2 / R4 (`plans/02-S2-lay-forms/`) | 🔴 | todo |
| T-s9-honesty | §9 три-полки честность спеки (retrofit-дёшево, 0 canon-lie) | S2 (`plans/02-S2-lay-forms/`) | 🟠 | todo |
| T-prove-2nd-form | доказать хребет promotion-предикатом на 2-й форме `time-on-edge` (анти-тавтология) | S3 (`plans/03-S3-prove-stake/`) | 🔴 | **done (RESOLVED S3, 2026-08-11)** — 4 ворот GREEN (2-я форма · мутант красный на реальном коде · монумент-атрибуция держится · opaque-edge-id финализирована пере-резкой); G2=🟢. Ptr: `../../../_log/2026-08-11-S3-prove/HANDOFF.md` |
| T-D1b-opaque-edge-id-final | Gate-4 · финализация формы opaque-edge-id (снять provisional ИЛИ пере-резать) | S3 / D1.b / UNIT-SPEC §4(d) | 🔴 | **done (RESOLVED S3)** — ПЕРЕ-РЕЗКА: буквальный `edgeId` отклонён (сам = миграция), `supersedes`-на-Act отклонён (delete-history); реализовано через зарезервированные `validFrom/validTo`+cardinality-as-data. `provisional` снят в UNIT-SPEC §4(d). Ref `wave1-design-architecture.md:34-51` |
| T-S3-fu-a-110gap | (follow-up a) `:110`-only REPLACE / `'one'`-cardinality gap в мутант-покрытии | S3 / D1.b | 🔧 | **done** (закрыт волной 4, `wave4-harden-110.md`; `predicates.ts:110`) |
| T-S3-fu-b-drives-cosmetic | (follow-up b) КОСМЕТИКА · claim «`drives` — новый предикат» НЕ load-bearing: `DEFAULT_PREDICATES` пуст (`predicates.ts:31,33`), незарегистрированные дефолтятся в `many`; уточнить формулировку, ставку не трогает | S3 / D1.b | 🔧 | todo (не несущее) |
| T-S3-fu-c-f6-grain | (follow-up c) F6 grain A/B нота — грань A form-agnostic по-слойно settled, грань B закрыта пере-резкой Gate-4; свернуть `T-D1b-f6-accept-boundary` | S3 / D1.b | 🔧 | todo |
| T-critical-face-list | владелец ратифицирует список «критических 20% граней» (иначе G5 геймится) | pre-S4 (`plans/04-S4plus-breadth/`) | 🟠 | todo |

> **Перепись ширины (орган-гейт):** `../../../_inbox/2026-08-04-assemble-and-direct/design/02-coverage-gate.synthesis.md`
> — сеет CG-01..CG-14 (дыры ПЛАНА). Правила движения: `../../../01-organization/doc-discipline/growth-and-sequencing/CONVENTION-movement-and-selfcheck.md`.

---

## Задачи (вербатим из HANDOFF §3 + §7-E, с якорями)

### T-recall 🔴 · ветка D1 (срез), визард S1
Внести рефрейм RECALL-THROUGH-THE-SAME-DOOR: D1.b +5-я precondition (round-trip чтения через дверь),
D1.c проверяет провенанс операнда, завести КОНЦЕПТ recall. → ветка D1 (срез). Решить визард S1.
Уточнение (§7-E): добавить 5-ю precondition + `PayloadReadPort.deref` + завести долг ВЫБОРА-скана в DV. Малый райдер.
- **Якорь 1** `packages/ingest-rentacar/src/ports/payload-store.ts:23` — бездверный `.get()`:
  `get(payloadHash: string): unknown | null;`
- **Якорь 2** `packages/rental-balance/src/agent/balance-observer.ts:105` — `observe()` пишет через движок:
  `this.engine.write(act);`

### T-erasure-cascade 🔴 · ветка D1 / FORK-2
Derived observation-акты несут PII inline в payload; `erasure.ts` их не видит (split/redact нигде не
подключены к пути записи наблюдений). Пересекается с T-recall и FORK-2.
- **Якорь 1** `packages/rental-balance/src/agent/balance-observer.ts:103` — PII-операнды летят inline:
  `payload: { type: OBS_KIND, ...obs },` (акт-блок :96–105, запись :105).
- **Якорь 2** `packages/engine/src/core/erasure.ts:48,59` — `splitAct`/`redactAct` существуют, но
  вызываются ТОЛЬКО из теста (grep: нет вызова вне `test/`) → путь записи наблюдений их обходит.

### T-selection 🔴 · ветка DV
Релевантность/выбор узла — это НЕ масштаб. Сейчас спрятана как долг DV («полный скан для ВЫБОРА узлов»).
Отделить «какой узел нужен агенту в момент решения» от «сколько узлов сканируем».
- **Якорь** `needs-anchor` — кода выбора нет (это отсутствие). Проза: HANDOFF §7-A «V1: полный скан для
  ВЫБОРА узлов оставить (долг масштаба → DV), но DEREF операндов НЕ откладываемый».

### T-actor-identity 🔴 · ветка D3 / DV
`SubjectRef` — голая строка (доверие клиента); `ViewerResolver` объявлен, но НЕ реализован (paper-freeze).
Пока личность актора не резолвится, `resolve()` (I-7) гейтит по недоказанному субъекту.
- **Якорь 1** `packages/engine/src/core/types.ts:14`:
  `export type SubjectRef = string; // "agent:ff-personal", "user:jenya", or a glob "agent:*"`
- **Якорь 2** `packages/engine/src/ports/viewer-resolver.ts:12` — интерфейс без реализации:
  `export interface ViewerResolver {` … `TODO(M5): implement per-surface identity resolution` (:8).
- **Якорь 3** `docs/02-project/core/00-kernel/invariants.md:134` — `### I-7 · resolve() — единственный
  PEP; НИ ОДИН путь к данным его не обходит` (⚠️ путь исправлен: инвариант живёт в docs/kernel, НЕ в packages).

### T-referent-consent 🔴 · FORK-2 (решает владелец)
Базис согласия на ВПИСАТЬ ~2700 клиентов (не только на выход/стирание). FORK-2 сейчас только про erasure/выход.
- **Якорь** `needs-anchor` — политический/ADR-вопрос, кода нет. Проза: HANDOFF §3 T-forks «FORK-2 PII/erasure».

### T-field-classify 🟠 · до D1.b
(критик KS2): классифицировать операнды (`total`/`paidSum`/`remaining`) — это PII-стираемое или фин-данные
со статутной ретенцией (возможно, вообще не должны покидать meta)? 1 сессия ДО D1.b — может сузить всю recall-дверь.
- **Якорь** `packages/rental-balance/src/agent/balance-observer.ts:24–28` — сами поля:
  `total?: number; paidSum?: number; remaining?: number; amount?: number;`

### T-conflict-reconcile 🟠 · ветка D2
Два значения об одном факте: latest-wins выбирает молча (позиция в журнале решает, `recordedAt` не смотрится),
superseded сохраняется, но конфликт нигде не всплывает. Нет акта «оспорить/сверить».
- **Якорь 1** `packages/ingest-rentacar/src/observation/latest-wins.ts:4` — молчаливый выбор:
  `encountered LAST in the input array wins its key; `recordedAt` is never consulted`.
- **Якорь 2** `packages/ingest-rentacar/src/core/reduce.ts:91` — §4 fold (ingest-сторона):
  `// §4: fold EVERYTHING (incl. PII, as a one-way digest) so any upstream change supersedes.`
- **Якорь 3** `packages/ingest-rentacar/test/latest-wins.test.ts` — существует (AC-1..AC-6), покрывает выбор, НЕ примирение.

### T-failure-contract 🟠 · ветка D1.c / D2
Контракт не задан для: (а) recall после законного стирания (`get()` вернёт `null`); (б) store недоступен.
KS3: пропущенный payload тихо коэрсится в число → ложное «работает».
- **Якорь 1** `packages/rental-balance/src/balance.ts:33` — тихая коэрсия (⚠️ уточнение: коэрсит в `0`, не в `NaN`):
  `return typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0;`
- **Якорь 2** `packages/ingest-rentacar/src/ports/payload-store.ts:23` — «null if absent/erased»:
  `get(payloadHash: string): unknown | null;` (нет контракта на null у читателя).

### T-concurrency 🟠 · ветка D3/DV, визард S2
«Агент ровно один» (гейт E2) поднять из скрытого допущения в ЯВНЫЙ долг с триггером. → D3/DV. Визард S2.
- **Якорь** `needs-anchor` (`unverified`) — гейт E2 живёт в плане/прозе, не нашёл кодового замка на
  «ровно один агент». Проверить `01-execution-plan.synthesis.md` §E2 при взятии.

### T-honest-canon 🟠 · ветка D2, визард S3-A
Снять ложные «REAL» (explain-chain/access_event) — честный статус derived. → D2. Визард S3-A.
- **Якорь** `packages/engine/src/core/types.ts:170–178` — `ACT_KINDS` (`access_event` в списке derived-видов):
  `'access_event', 'agent_trace', 'system_telemetry'`; честность статуса — за пределами типа (`needs-anchor` на «REAL»-разметку канона).

### T-human-view 🟠 · кандидат-карточка, визард S3-B
Человеческий вид узла (паспорт) + act-тип «оспорить/поправить память». → кандидат-карточка. Визард S3-B.
- **Якорь** `needs-anchor` — вид/act-тип не заведены (проектная задача).

### T-usage-test 🔧 · перед D1.b, визард S4
Диагностический прогон: реальный журнал ga-rentacar meta-only → balance-observer → лог payload-голоданий +
бездверных fetch. Падающий прогон = спецификация recall. Безопасно (чтение/лог). → перед D1.b. Визард S4.
Уточнение (§7-E): scratch-копия (observe ПИШЕТ!) + baseline-assert (KS3: пропущенный payload может тихо
коэрсить `undefined→0` → ложное «работает»; сверять с эталоном).
- **Якорь** `packages/rental-balance/src/agent/balance-observer.ts:105` — почему не read-only:
  `this.engine.write(act);` (гонять на одноразовой копии-scratch, не на durable).

### T-baton 🔧 · ветка S-D · done
Первый шаг Нити A: `_shared/task-pool.md` (этот файл) + `_shared/HANDOFF.template.md` + правила движения
(CONVENTION-movement-and-selfcheck) + орган переписи (02-coverage-gate). Прошло волну авторов + 2 критиков
(адверсариал + doc-discipline). Генерируемый STATE-индекс + generator-check R-b (D0) — шаг 2 (CG-12/CG-13).
- **Якорь** `docs/00-states/05-assemble-and-direct/_shared/` — pool + template созданы; правила и перепись — в своих домах.

### T-forks 🔧 · решает владелец
FORK-1 ADR-ценности · FORK-2 PII/erasure (⚠️ теперь пересекается с recall: payload = и приватность, и
операнды) · FORK-3 ack durable-by-ref · FORK-4 свежесть fact-base. → решает владелец.
- **Якорь** `needs-anchor` — развилки владельца (проза HANDOFF §3).

### carry-forward 🔧 · ветки S-A / S-D
Из прошлых хендофов (не повторяю): N-G C1/C2 не прогнаны; doc-discipline долги (OQ дубли, INDEX устарел);
durable-store хвост R4/R6/OQ-1..6. → S-A/S-D.
- **Якорь** `needs-anchor` — указатели в прошлых HANDOFF (`prev:` chain).

---

## Задачи из переписи + перепроверки критиков (2026-08-05)

### T-sameas-guard 🔴 · ветка D1.b (precond 3)
`same-as` залочен в кардинальность `many`, поэтому `assertForwardMonotone` для него **тавтологически чист** —
условие срабатывания (`many → one`) недостижимо по построению. План называет «`same-as` guard fired clean on
real replay» non-waivable precondition D1.b (доказательство, что R1 не сработал) — но зелёный результат НЕ
доказывает НИЧЕГО про R1. Заменить precond 3 на ассёрт реальной кардинальности same-as-группы после реплея
(«ни одна ранее many-группа не схлопнулась в one»).
- **Якорь 1** `packages/engine/src/core/predicates.ts:49` — `const LOCKED_MANY_PREDICATES = new Set(['same-as']);`
- **Якорь 2** `packages/engine/src/core/predicates.ts:57` — `if (LOCKED_MANY_PREDICATES.has(predicate)) return 'many';`
- **Якорь 3** `packages/engine/src/core/predicates.ts:78` — вызов guard (`assertForwardMonotone`), на который опирается план D1.b.
> **Обновление polosa-a (2026-08-05):** ПОСТАНОВКА исправлена патчем polosa-a — precond 3 D1.b переанкорен на
> реальный disk round-trip (`DurableFsStore`, `store-durable-fs.ts:139-156`), не registry-guard; см. §4.10 плана +
> `polosa-a/04-sameas-guard.finding.md` §D. **Реализация ассёрта впереди** (задача остаётся `todo`). Fault-injection
> техника теста (реальный `kill -9` vs. ручное усечение `journal.jsonl`) не решена — деталь реализации, зафиксировать
> при переходе в in-progress (harvest §7).

### T-plan-honesty 🔴 · ветка D0 (ошибки ПЛАНА — самое дорогое, P1 владельца)
Перепись нашла 3 ошибки в самом `01-execution-plan.synthesis.md`, которые просочились бы в реализацию:
- **CG-11** — `DV` в плане = drift-детектор ПРОЦЕССА/карточек, но имя сталкивается с ценностью Витальность
  (6 механизмов графа: salience/consolidation/forgetting/…). Расщепить DV-process vs DV-graph до Wave 3.
- **CG-12** — план D0: «root `STATE.md` generated via `tools/lint/doc-tree.mjs`». Код-проверено: генератор
  пишет `docs/_generated/doc-tree.view.md` (вид дерева), НЕ карточку-пульт схемы D0. D1.c зависит от этого пульта.
- **CG-13** — census-gate (R-b) сегодня проза, без generator-check → нарушает собственное правило плана
  «no gate ships prose-only» (§43-45). Механизировать проверку карточек.
- **Якорь** `docs/_inbox/2026-08-04-assemble-and-direct/design/02-coverage-gate.synthesis.md` (таблица CG-11..13) +
  `tools/lint/doc-tree.mjs:5` (пишет `doc-tree.view.md`, не пульт).
> **Обновление polosa-a (2026-08-05):** ПОСТАНОВКА исправлена патчем polosa-a — CG-11 расщеплена (`DV`/`DV-graph`/`D0(b)`,
> `polosa-a/01-cg11-dv-split.finding.md`), CG-12 → задача `T-state-pult-generator`, CG-13 → `T-census-check`+`T-census-check-ci`;
> план-текст исправлен на честный TODO. **Реализация впереди** (задача остаётся `todo`).

### T-index-refresh 🔧 · ветка S-D
INDEX'ы устарели (2026-07-06/07-21) → новые файлы не видны из «одного входа» (law 8): `docs/INDEX.md` (нет
04/05-states), `growth-and-sequencing/INDEX.md` (нет CGC/MIGRATION/movement-selfcheck), `process/INDEX.md`.
Обновить, чтобы pool/template/правила/перепись подтягивались сами.
- **Якорь** `needs-anchor` — доку-долг (проверено критиком doc-discipline 2026-08-05).

### T-doctypes-register 🔧 · ветка S-D
Типы `convention`/`task-pool`/`handoff-template` не заведены в `docs/.doc-types.json` → закон 5 «тип решает
дом» формально не на что опереться для растущей семьи.
- **Якорь** `docs/.doc-types.json` — реестр типов→домов (записи отсутствуют).

---

## Новые задачи из полосы A / harvest (2026-08-05)

> Заведены харвест-гейтом (`../../../_inbox/2026-08-04-assemble-and-direct/design/polosa-a/05-harvest-gate.md` §5).
> Общий дом инструментов решён (harvest §2, вариант iii): **два отдельных новых файла**, `doc-tree.mjs` не трогать.

### T-state-pult-generator 🔴 · ветка D0 (шаг 2, симметрично T-census-check)
Генератор root-пульта `STATE.md` из frontmatter карточек — НОВЫЙ файл `tools/lint/state-pult.mjs` (НЕ
расширять `doc-tree.mjs`, НЕ сливать в `census-gate.mjs` — решение harvest §2, вариант iii). Сегодня
генератора НЕ существует: `doc-tree.mjs` пишет только tree-shape вид (`docs/_generated/doc-tree.view.md`,
verified `tools/lint/doc-tree.mjs:82-83`), не читает/пишет `id/theme/gate/home/handoff/value-checkpoint`.
Owner: TBD. Sizing: S (один скрипт + fixture-карточки). Блокирует ТОЛЬКО D1.c, НЕ блокирует D1.a/D1.b.
Acceptance: схема `id·theme·status·gate·home·handoff·value-checkpoint·fork?` — **UNVALIDATED**, её надо
ПЕРЕДОКАЗАТЬ от реальной карточки `docs/00-states/04-improvement-plans/state.md:1-11` (реальные поля:
`id, node_type, theme, status, owner, opened, updated, agents, handoff, last_session, plans` — нет `gate`,
нет `value-checkpoint`, нет `home`). Задача не «подключить генератор к схеме выше», а «вывести схему пульта
от реальных карточек, ПОТОМ построить генератор». Включает `D0(b)` card-staleness-check (флаг
`status: active`-карточек, устаревших сверх порога) — та же задача, не вторая.
- **Якорь 1** `tools/lint/doc-tree.mjs:82-83` — пишет tree-view, не пульт.
- **Якорь 2** `docs/00-states/04-improvement-plans/state.md:1-11` — proven-pattern карточка (реальные поля).
- **Якорь 3** `01-execution-plan.synthesis.md` §4 D0 Enforcement (a)/(b) — merged-текст патча (harvest §4.6).

### T-census-check 🔴 · ветка D0 (шаг 2, симметрично T-baton)
Механизировать R-b (CONVENTION-movement-and-selfcheck.md:26-29): скрипт читает НАПРЯМУЮ task-pool.md +
02-coverage-gate.synthesis.md; падает, если P0/P1 CG-* строка не поглощена ни (a) отдельной задачей,
ни (b) упоминанием внутри существующей, ни (c) owner-fork промоцией. НЕ проектировать под root-пульт
CG-12 (мягкая зависимость, харвест сводит — 00-coorch-framing.md §3).
Owner: [назначить на харвесте]. Sizing: 1 сессия (скрипт ~50-80 строк, парсинг двух markdown-таблиц).
Acceptance: падает СЕЙЧАС на CG-02/03/05/06/07 (реальные данные, не синтетика — см. §B) и проходит после
их поглощения задачами.
Дом инструмента: tools/lint/doc-tree.mjs (расширение, не новый генератор — см. §D) ИЛИ соседний
tools/lint/census-gate.mjs, если И2 решит держать root-пульт-генератор отдельно (свести на харвесте).
- Якорь 1 `01-execution-plan.synthesis.md:43-45` — правило, которое R-b нарушает.
- Якорь 2 `CONVENTION-movement-and-selfcheck.md:26-29` — R-b, «цель машинная».
- Якорь 3 `02-coverage-gate.synthesis.md:95-106` — прозо-гейт + признание «критерий (a) не закрыт».
> **Дом решён (harvest §2):** отдельный новый файл `tools/lint/census-gate.mjs` (вариант iii), `doc-tree.mjs` не трогать.

### T-census-check-ci 🟠 · ветка D0 (после T-census-check, отдельный шаг)
Подключить T-census-check к реальному входу в «строй» — сегодня скрипт (§B) только печатает FAIL, никто
его не обязан запускать. Минимум: pre-commit хук ИЛИ ручной шаг в чек-листе HANDOFF.template.md перед
переходом ветки в статус active/in-progress (не обязательно CI сервер — это может быть локальный git hook,
симметрично тому, как doc-tree.mjs уже используется). Без этого шага R-b остаётся ручной переписью с
подсказкой, не гейтом.
Owner: [назначить на харвесте, тот же владелец, что T-census-check]. Sizing: 0.5 сессии (хук/чек-лист +
1 строка в HANDOFF.template.md).
Acceptance: попытка перевести карточку ветки в active/in-progress с непройденным T-census-check либо
блокируется хуком, либо явно требует ручной галочки «прогнал T-census-check, вижу N фейлов, принимаю
осознанно» — не молчаливый пропуск.
- Якорь `_shared/HANDOFF.template.md` — точка, куда встраивается чек-шаг (дом ветки S-D).

---

## Задачи из переписи ширины D1.b (2026-08-06) — 🟥 ГЕЙТ I2 = БЛОК

> **Дом якорей = синтез переписи** (не дублируем контент, law-3):
> `../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/00-width-census.synthesis.md` §1 —
> матрица 19 граней с вербатим `file:line` по каждой. Здесь — только живой индекс + ранжирование.
> Гейт ширины (I2): «строй» D1.b ЗАПРЕЩЁН, пока не закрыты блокеры-кейстоуна ниже. Ветка ещё DESIGN.

**Блокеры-кейстоуна (без них прототип НИЧЕГО не доказывает, даже зелёный):**
- **T-D1b-durablefs-swap-realpath** 🔴 — `rental-balance/src/surface/cli.ts:10,26` создаёт `MemoryStore`; ни один
  акт вертикали не ложится на диск → критерии 2/3/3b проверяют лабораторию движка, не продукт.
- **T-D1b-second-form-falsification** 🔴⭐ — `IMMUTABLE_ACT_META` протестирован только на ga-rentacar; без
  ВТОРОГО структурно иного формата «растёт без миграций» = незаработанный зелёный (класс CG-14/K4).
- **T-D1b-shred-assert-independent-snapshot** 🔴 — §9-3 тавтологичен: `edges` в `IMMUTABLE_ACT_META`, `splitAct`
  их не трогает (`erasure.ts:25-34,48-50`). Снять снимок edges/same-as ДО шреда, сравнить ПОСЛЕ реального
  disk round-trip; assert обязан падать под мутантом `{payload, edges: undefined, ...rest}`. (§9 доки пропатчен.)
- **T-D1b-property-fault-injection** 🔴 — §9-4: `crash-mid-turn.test.ts:119` hand-picked offset; нужен
  property-based рандом-offset + **независимый byte-oracle** (не импортирует `project()`/parse из адаптера,
  считает ожидаемые акты чистой байт-арифметикой).
- **T-D1b-wire-erasure-to-disk** 🔴 — §9-2: `erasure.ts` не импортируется `store-durable-fs.ts` (0 хитов
  грепом); `erasure-seam.test.ts:23-57` гоняет чистые функции в памяти — erasure не подключён к реальному диску.

**Отложить-с-домом (не блокируют вход в прототип, НЕ терять — I8):** §9-5 численный cap · §9-6 owner-legible
карточка · §9-7 form-agnostic leak-test (`predicates.ts:29` `DEFAULT_PREDICATES = {}`) · §9-8 referent
reject-path · §9-9 V4-сверка вторым агентом · S11 no-payload-key journal-тест · S12 dist/src parity ·
F2 erased-read-контракт (dangling ref) · F3 durability-order META↔payload · F4 orphan-payload sweep ·
F5 cascade-erasure → **привязать к FORK-2** явно. Все с якорями — см. синтез §1.

---

## Задачи прогона S1..S4 (DIRECTION-to-ready, 2026-08-08)

> **Дом плана = `../plans/`** (узлы S1-S4) · **контракт прогона = `SESSION-CONTROL.md`** ·
> **направление/законы = `../../../_log/2026-08-08-orchestrated-design-push/synthesis/DIRECTION-to-ready.md`.**
> Эти задачи КОНЦЕПТУАЛЬНЫЕ (ратификация/формы-дизайн) → `needs-anchor` на § DIRECTION, не код. Код-якоря
> появятся при переходе форм-задач (S2/S3) в стройку. Ветки-планы см. в индексе выше.

### T-ratify-law1 🔴 · план S1
Ратифицировать **Закон-1** (форма retrofit-невозможна / политика retrofit-дешева) как кандидат-инвариант
UNIT-SPEC. Растворяет F1-форк «платить сейчас/за швом». Один проход решения владельца, не 4 форка.
- **Якорь** `needs-anchor` — DIRECTION §1 (Закон-1) + §7-1 (формулировка к ратификации). Брифы форков:
  `../../../_log/2026-08-08-orchestrated-design-push/work/D4-decision-lens-briefs.analysis.md`.
- **Owner-queue карточка (2026-08-09):** `OWNER-QUEUE.md#Q-Law1`.

### T-ratify-law2 🔴 · план S1
Ратифицировать **Закон-2** (юнит-статус зарабатывается жизненным циклом = один promotion-предикат:
файл↔единица + монумент-рекурсия + N-020 + состояние-ребра) как несущий, НЕ отложенный.
- **Якорь** `needs-anchor` — DIRECTION §1 (Закон-2) + §7-2 + §5 (свёрнутые концепты).
- **Owner-queue карточка (2026-08-09):** `OWNER-QUEUE.md#Q-Law2`.

### T-i4-decide 🔴 · план S1
Закрыть **I-4** — гейт кода Шага-1 (явное да/нет владельца). Отдельно от ратификации законов.
- **Якорь** `needs-anchor` — DIRECTION §7 (Шаг-2 S1) + D4-briefs (I-4 линзой). Пульт-хендофф-указатель на решение.
- **Owner-queue карточка (2026-08-09):** `OWNER-QUEUE.md#Q-I4`.

### T-lay-deref-seam 🔴 · план S2 (retrofit-НЕВОЗМОЖНА)
Заложить структурную ФОРМУ deref-seam funnel, берущую viewer (choke-point, вызывающий не обходит).
Только форма/шов сейчас — enforcement-логику потом (Закон-1). ⚠️ провизорно до S3.
- **Якорь** `needs-anchor` — DIRECTION §2 Нить A (deref-seam §6/F1) + §3 (S2). Код-якорь при входе в стройку.

### T-opaque-edge-id 🔴 · план S2 (retrofit-НЕВОЗМОЖНА)
Заложить ФОРМУ opaque замороженного `Edge`-id. Кладётся на БУМАЖНОЙ рекомендации F6 (per-facet) → провизорно,
первая реальная фальсификация = S3.
- **Якорь** `needs-anchor` — DIRECTION §2 Нить A (opaque edge-id §4/F6) + §3 (S2 provisional).

### T-admission-failclosed 🔴 · план S2 / R4
Заложить **ФОРМУ admission-гейта (choke-point) СЕЙЧАС** — retrofit-невозможно (Закон-1), до первого
прод-payload реального ga-rentacar PII (ЧАСЫ). Кладётся только ФОРМА/choke-point; **fail-open/closed +
какие классы-референты admission исключает = R4, решает ВЛАДЕЛЕЦ (pending)** — не enforcement-логика,
не записываем политику за него.
- **Якорь** `needs-anchor` — DIRECTION §1/§7 (форма-не-политика: закон кладёт форму, R4 наполняет выбором) +
  §2 Нить A (admission choke-point §4/F2). ⚠️ fail-open/closed НЕ решено — R4-форк владельца (D4-briefs A/B/C).

### T-s9-honesty 🟠 · план S2 (retrofit-дёшево)
§9 три-полки честность спеки: текст не обещает больше кода (G3, 0 canon-lie). Дешёвый retrofit, но нужен для G3.
- **Якорь** `needs-anchor` — DIRECTION §3 (S2 «§9 три-полки честность») + §0 (G3).

### T-prove-2nd-form 🔴 · план S3
Доказать хребет: reify-to-unit stateful-рёбер (Закон-2) → минимальная фальсификация 2-й формой `time-on-edge`
с ЧЕСТНЫМ анти-тавтология-тестом. Несущая ставка всего проекта; здесь S2-форма подтверждается или пере-режется.
- **Якорь** `needs-anchor` — DIRECTION §3 (S3) + §1 (Закон-2 = анти-тавтология-тест) + §2 Нить B. При стройке —
  код-якорь `packages/engine/src/core/types.ts:38-41` (`validFrom/validTo`, ось `time-on-edge`).

### T-critical-face-list 🟠 · pre-S4
Владелец ратифицирует список «критических 20% граней» ДО S4 (иначе G5 геймится задним числом той же командой).
- **Якорь** `needs-anchor` — DIRECTION §3 (⚠️ pre-S4) + §0 (G5) + §5. Перепись: `d1b-width-census/00-width-census.synthesis.md` §1.

---

## Задачи ночного прогона autonomous-question-closure (2026-08-09)

> **Дом прогона:** `docs/_log/2026-08-09-autonomous-question-closure/` (`RUN-INDEX.md` + `planning/`).
> `task-pool.md` остаётся **ЕДИНСТВЕННЫМ источником очереди**; `planning/QUEUE-questions.plan.md` —
> рабочая ПРИОРИТЕЗИРОВАННАЯ ПРОЕКЦИЯ этих строк на ночь (порядок итераций 1-10), не второй источник истины.
> Якорь пока `needs-anchor` на `QUEUE-questions.plan.md` — growth-node появится при взятии вопроса в работу
> (см. `RUN-INDEX.md` «живой список итераций»).

**Автономно закрываемые (агент думает + пишет ноду, критик проверяет):**

| id | имя | тип | ветка/план | приор | статус |
|----|-----|-----|-----------|-------|--------|
| Q-OQ-D | дом-ADR для PayloadStore/ShredablePayloadSink | автономный | run=autonomous-question-closure | 🔴 | **done** (итер.1 — дом = новый ADR Extends ADR-0009, номер следующий свободный после 0012 занят node-model; owner-форк не всплыл) |
| Q-S3scope | совпадает ли 2-я форма D1.b (access_event) со 2-й формой S3 (time-on-edge)? | автономный | run=autonomous-question-closure / S3 | 🔴 | **done** (итер.1 — CLEAN: две разные формы, НЕ одна; G2 НЕ продвинут, S3 сужен до fix-class → `Q-S3fixclass`) |
| Q-owner-packet | сжать весь owner-ask S1 в один быстрый to-read | автономный | run=autonomous-question-closure / S1 | 🔴 | todo |
| Q-R4classes | черновой список regime-B референт-классов (меню владельцу, решение НЕ здесь) | автономный (меню) | run=autonomous-question-closure / R4 | 🔴 | **done** (итер.2 — 7 классов, меню обогатило `OWNER-QUEUE.md#Q-R4`; спаунило `Q-classifier-gap`+`Q-vip-mechanism`) |
| Q-critical-faces | ранжировать 19 граней переписи, предложить «критические 20%» | автономный (черновик) | run=autonomous-question-closure / pre-S4 | 🟠 | **done** (итер.2 — критические 20% = F6·§9-4·F2·F3+F4; смугл census-2026-08-06 пойман, task-pool унаследовал верно) |
| Q-F6confirm | дожать F6-рекомендацию (`T-D1b-f6-accept-boundary`) до ratification-ready | автономный | run=autonomous-question-closure / D1.b | 🟠 | **done** (итер.3 — CLEAN, F6 = 2 owner-confirm грани A/B, обогатило `OWNER-QUEUE.md#Q-F6-grain-A/B`) |
| Q-L2op | оператор Закона-2 (promotion-предикат) — пространство операторов + гипотеза | концептуальный, keystone | run=autonomous-question-closure / S3 | 🔴 | **done** (итер.4 — гипотеза: оператор второстепенен, own-C структурно недостижима до повышения → спаунило `Q-S3-C-tooth`) |
| Q-S2draft | черновик (НЕ мерж) retrofit-дёшевых дельт §9/§1/§3 UNIT-SPEC | автономный, staged-only | run=autonomous-question-closure / S2 | 🟠 | todo |
| Q-S3dryrun | условный dry-run анти-тавтология-теста Закона-2 на `time-on-edge` | автономный, design-репетиция | run=autonomous-question-closure / S3 | 🟠 | todo |
| Q-formsdraft | черновик (НЕ мерж) retrofit-невозможных форм S2 (deref-seam/opaque-edge-id/admission-форма) | автономный, staged-only | run=autonomous-question-closure / S2 | 🟠 | todo |
| Q-widthdesign | дизайн топ-1-2 «критических» граней из Q-critical-faces (опционально, если токены остаются) | автономный, design-only | run=autonomous-question-closure / S4+ | 🔧 | todo (opt) |
| Q-S3fixclass | какой fix-class `time-on-edge` для S3 (stable edgeId vs supersedes marker) — под-вопрос, рождённый Q-S3scope; D3 уже фальсифицировал widen-dedup-key фикс | автономный | run=autonomous-question-closure / S3 | 🔴 | **done (гипотеза edgeId-primary)** — итер.4, CLEAN: edgeId primary побеждает D3 = opaque-identity U-L1, supersedes = отложенный аудит-слой; ⚠️ **практическая релевантность УСЛОВНА на `Q-S3-fixture-noreify` (todo)** — если residual-класс окажется почти пуст, edgeId-фикс нерелевантен; спаунило `Q-S3-fixture-noreify` |
| Q-classifier-gap | инженерная находка (итер.2) — НЕТ классификатора minors/health сегодня → «unknown→block» (R4 default-кандидат) заблокирует почти все записи | автономный | run=autonomous-question-closure / R4 | 🔴 | todo (spawned итер.2, якорь: `packages/ingest-rentacar/src/core/reduce.ts:75-77` + `admission.ts:26-43`) |
| Q-vip-mechanism | инженерная находка (итер.2) — VIP-класс не ложится в A/B/C admission-схему R4; нужна отдельная access-restriction политика, не admission-refuse | автономный | run=autonomous-question-closure / R4 | 🟠 | todo (spawned итер.2, якорь: `plans/01-S1-ratify-two-laws/questions/02-r4classes/`) |
| Q-S3-C-tooth | S3-дизайн-ограничение (итер.4, spawned Q-L2op) — S3 обязан построить генуинную own-C=«да» пробу (согласие/стирание достижимо), иначе C-зависимые операторы не тестируются | автономный | run=autonomous-question-closure / S3 | 🔴 | **done (RESOLVED S3, 2026-08-11)** — генуинная own-ось: erasable-referent payload→`buildErasedAct` ОК + witness необратим; payload-less структурное ребро бросает (M2 КРАСНЫЙ). Ptr: `../../../_log/2026-08-11-S3-prove/HANDOFF.md` |
| Q-S3-fixture-noreify | S3-дизайн-ограничение (итер.4, spawned Q-S3fixclass) — fixture S3 НЕ должен тереть `foldEdges` через reify (residual-near-empty риск), иначе фикстура не тестирует то, что должна | автономный | run=autonomous-question-closure / S3 | 🔴 | **done (RESOLVED S3, 2026-08-11)** — residual реален и НЕ пуст из настоящих `project()`/`foldEdges`; риск near-empty снят. Ptr: `../../../_log/2026-08-11-S3-prove/HANDOFF.md` |
| Q-completeness-census | перепись НЕ-открытых вопросов прогона (U1-U7) | перепись/аудит | run=autonomous-question-closure | 🟠 | **done** (итер.5 — 7 найдено, U1 закрыт итер.6, U2-U7 → next-session ниже) |
| Q-cross-node-audit | сверка 11 нод прогона на противоречия + проверка integrity-дефектов | адверсариал/critic | run=autonomous-question-closure | 🟠 | **done** (итер.5 — противоречий нет, 3 integrity-дефекта исправлены) |
| Q-truth-keystone | что значит «правда» для субстрата (U1) | концептуальный, keystone | run=autonomous-question-closure | 🔴 | **RESOLVED** (итер.6 — 6 осей правды; owner-fork spawned `OWNER-QUEUE.md#Q-truth-fork`; спаунило 3 truth-задачи ниже) |

**Owner-fork (НЕ закрывается рассуждением → карточка в `_shared/OWNER-QUEUE.md`):**

| id | имя | тип | ветка/план | приор | статус |
|----|-----|-----|-----------|-------|--------|
| Q-L1dom | дом-файл двух законов (ядро `invariants.md` I-16/I-17 vs UNIT-SPEC-локально) | ⛔ owner-fork (⚠️ переклассифицирован из автономного — `two-laws.invariant-candidate.md:35` метит эту развилку «owner/S2, линза, не решаем») | run=autonomous-question-closure / S1-S2 | 🔴 | **бриф готов** (итер.3 — 4 опции A/B/C/D, `OWNER-QUEUE.md#Q-L1dom`) → ждёт OWNER-QUEUE |
| Q-R4 | admission fail-open/closed default + regime-B классы (A/B/C/отложить) | owner-fork, тикает (реальный ga-rentacar PII) | run=autonomous-question-closure / R4 | 🔴 | todo → OWNER-QUEUE |
| Q-R3 | юрисдикции считают топологический остаток identifying? | owner-fork, отложен (юр. суждение) | run=autonomous-question-closure / R3 | 🟠 | deferred → OWNER-QUEUE |
| Q-R5 | подписать остаточный риск топологии | не актуален (блокирован портом `shred`, которого нет в коде) | run=autonomous-question-closure / R5 | 🔧 | not-actionable |

- **Закон-1 / Закон-2 / I-4** уже заведены выше как `T-ratify-law1` / `T-ratify-law2` / `T-i4-decide` (план S1) —
  здесь НЕ дублируются строкой, только дополнены owner-queue карточками `OWNER-QUEUE.md#Q-Law1` /
  `#Q-Law2` / `#Q-I4` (см. пометки в их ### подсекциях выше).
- **Якорь для всех Q-строк:** `docs/_log/2026-08-09-autonomous-question-closure/planning/QUEUE-questions.plan.md`
  (полный разбор суть/варианты/рычаг/зависимости/порядок по каждому id) + `_shared/OWNER-QUEUE.md` (owner-карточки).

**Next-session очередь (найдена итер.5 `completeness-census`, `_shared/topics/01-completeness-census/`; U1 уже закрыт итер.6 → `Q-truth-keystone` выше, здесь только U2-U7):**

| id | имя | тип | автономно/owner | приор | статус |
|----|-----|-----|-----------------|-------|--------|
| U2-g1-falsify | G1-полнота (готовность) сегодня нефальсифицируема — нет теста «все формы заложены» | процесс/дизайн | автономный (построить falsification-тест) | 🟠 | **done** (итер.7, 2026-08-09) — red-team проведён, 2 CONFIRMED дыры (valid-time не в S1-тексте · CRIT-1 сужен), falsifiable G1-test предложен → `plans/01-S1-ratify-two-laws/questions/04-g1-missing-form/` |
| U3-actor-model | актор-агент не смоделирован (пересекается с существующим `T-actor-identity`, `ViewerResolver` не реализован) | инженерный | автономный (design), не дублировать T-actor-identity | 🟠 | **done** (итер.8, 2026-08-09) — модель ролей = 2 контракта (principal=viewer+actor · referent=subject), НЕ 3; минимальная форма = один principal-seam на write; критик DIRTY→CLEAN. Спаунило `T-write-pep-unwired`+`T-data-subject-no-code`+FORK-U3. Нода: `topics/03-actor-model/synthesis/02-resolution.synthesis.md` |
| U4-value-arbitration | межценностный арбитраж 7 ценностей не решён (упомянут в `state.md` как сквозной owner-форк → ADR) | ценностный | owner-fork | 🔴 | todo (next-session) |
| U5-identity-merge-split | merge/split тождества единицы не смоделирован (пересекается с Законом-2/promotion-предикатом) | концептуальный | автономный (design), owner подтверждает | 🟠 | todo (next-session) |
| U6-threat-model | нет явной threat-model субстрата | инженерный/security | автономный (черновик), owner принимает риск | 🟠 | **done** (итер.9, 2026-08-09) — карта: 2 двери (write/read), обе воронки; adjudicated missing-FORM = **только F1 write-principal-seam + F2 data-subject-binding** (= формы итер.8, СХОЖДЕНИЕ, новых retrofit-невозможных нет). 2 эксплуатируемых СЕГОДНЯ бага провенанса (grant-forgery read-path · policy-node overwrite). Спаунило `T-grant-forgery`+`T-policy-node-provenance`+`T-customer-lens-ungated`+`T-durablerunner-raw-read`. Нода: `topics/04-threat-model/synthesis/02-resolution.synthesis.md` |
| U7-factbase-freshness | свежесть fact-base (проекта) не проверена с последнего свода | процесс | автономный (проверка/обновление) | 🔧 | todo (next-session) |

**Truth-spawned (итер.6, `Q-truth-keystone`, `_shared/topics/02-truth-keystone/`):**

| id | имя | тип | ветка/план | приор | статус |
|----|-----|-----|-----------|-------|--------|
| valid-time-primitive | новый примитив valid-time/as-of для оси свежести (не заложен сегодня в коде) | инженерный | run=autonomous-question-closure / next | 🔴 | todo (spawned итер.6) |
| epistemic-passport-form | форма эпистемо-паспорта (провенанс/статус/полнота-тишина, «не лгать о себе», сегодня пусто) | инженерный/дизайн | run=autonomous-question-closure / next | 🟠 | todo (spawned итер.6) |
| conflict-visibility-predicate | предикат видимости конфликта (спорный/протухший claim всплывает, не молчит) | инженерный/дизайн | run=autonomous-question-closure / next | 🟠 | todo (spawned итер.6) |

**Red-team-spawned (итер.7, `U2-g1-falsify`, `plans/01-S1-ratify-two-laws/questions/04-g1-missing-form/`):**

| id | имя | тип | ветка/план | приор | статус |
|----|-----|-----|-----------|-------|--------|
| T-carry-crit1-into-s1text | CRIT-1 (fold/снапшот/durable-fs eager-hydrate деref-пути) не назван по имени в `two-laws.invariant-candidate.md` Instance-1 — уточнить формулировку ДО подписи S1, иначе S2 рискует закодировать узкий funnel (только `PayloadStore.get`) | инженерный/архитектурный, дёшево (правка текста, не кода) | S1 (до подписи Q-Law1) | 🔴 | todo (spawned итер.7) |
| T-carry-validtime-into-s1 | valid-time/as-of (ось D truth-keystone) — оценить, входит ли в периметр Закона-1/S2-заморозки конверта акта, ДО того как конверт заморожен; сейчас есть только как отдельная future-итерация, не как явная строка S1-ратификации | инженерный, срочность = дедлайн S2 | S1/S2 граница | 🔴 | todo (spawned итер.7) |
| T-g1-boundary-lint | построить механическую инвентаризацию границ субстрата (journal-write · PayloadStore · identity-key · fold/projection) + single-chokepoint lint по каждой — заменить ручной prose-список G1 фальсифицируемым тестом (обобщение уже спроектированных F1 A-T3/C-T1) | инженерный, S2-масштаб | S2 | 🟠 | todo (spawned итер.7) |

**Actor-model-spawned (итер.8, `U3-actor-model`, `_shared/topics/03-actor-model/`):**

| id | имя | тип | ветка/план | приор | статус |
|----|-----|-----|-----------|-------|--------|
| T-write-pep-unwired | ⭐ ИНТЕГРИТИ-ДЕФЕКТ: write-половина I-7 PEP не подключена — `Engine.write()` не вызывает построенный `resolveWrite`; цитируемый энфорсер валидирует не тот тип (EnvelopeNode, где нет `actor`/`provenance`). Distinct от T-actor-identity (резолв идентичности НЕ чинит незалоченный write). Критик независимо verified | инженерный/интегрити | D3/DV / kernel I-7 | 🔴 | todo (spawned итер.8, якоря: `packages/engine/src/engine.ts:73-108` не вызывает `packages/engine/src/core/resolve.ts:191-231`; диспетчер `resolve.ts:120`; канон `docs/02-project/core/00-kernel/invariants.md:135-140` обещает write-гейт; category-mismatch `envelope-validator.ts`↔`types.ts:81-92` `ENVELOPE_FIELDS` без actor) |
| T-data-subject-no-code | «Data subject» (владелец данных/держатель согласия на стирание) НЕ представлен в коде: цель стирания = `provenance.source_ref` opaque-строка, никогда не `SubjectRef`; `erasure.ts` без consent-поля; `valveGate`/`consent_event` не подключён к erasure. Заблокирует T-referent-consent/FORK-2 при открытии | концептуальный/инженерный | FORK-2 / T-referent-consent / согласие(Ц7) | 🟠 | todo (spawned итер.8, якоря: `packages/engine/src/core/erasure.ts:117-137` нет consent; `packages/engine/src/core/resolve.ts:265-272` valveGate не подключён; `packages/engine/test/erasure-byref-shred.test.ts:43` source_ref-цель) |
| T-actor-delegation | под-вопрос: может ли агент авторить акт КАК другой principal (делегация)? Ответ выбирает enforcement-стиль FORK-U3 (force-bind vs attest) | концептуальный | run=autonomous-question-closure / next | 🔧 | todo (spawned итер.8, needs-anchor — проза `topics/03-actor-model/synthesis/02-resolution.synthesis.md §6`) |

**Threat-model-spawned (итер.9, `U6-threat-model`, `_shared/topics/04-threat-model/`):**

| id | имя | тип | ветка/план | приор | статус |
|----|-----|-----|-----------|-------|--------|
| T-grant-forgery | ⭐ Форж capability на READ-пути, эксплуатируем СЕГОДНЯ (independent от write-PEP): `grantValid()` доверяет самозаявленному `body.minted_by` без проверки; `canMintGrant`/`canMintCapability` = 0 call-sites → форжат grant проходит через `holdsCapability` на read. Обход capability = обход всего PEP. cheap-policy-fix, но 🔴 severity | инженерный/security | kernel I-7/I-8 | 🔴 | todo (spawned итер.9, якоря: `packages/engine/src/core/resolve.ts:136-141` grantValid без проверки minted_by · `resolve.ts:247` holdsCapability read-path · `canMintGrant`/`canMintCapability` 0 call-sites) |
| T-policy-node-provenance | Форж policy-узла: акт с `source_ref='policy:constitution'` перезаписывает реальный узел last-write-wins; admission/projection не проверяют namespace/source_ref. Fix = write-PEP + namespace-gate на source_ref (distinct от T-write-pep-unwired: тот про capability-fields, этот про identity-namespace) | инженерный/security | kernel I-7/I-8 | 🔴 | todo (spawned итер.9, якоря: `packages/engine/src/core/loader.ts:8-11` + `store-durable-fs.ts:191-192` last-write-wins `[...base, ...projection]` · `admission.ts` не чекает namespace · `projection.ts` принимает любой source_ref) |
| T-customer-lens-ungated | B4 · второй негейтованный deref-путь — `customer-lens.ts` = 0 вызовов `policy.resolve` во всём файле (read обходит PEP). cheap policy, но реальная дыра | инженерный/security | D2 / kernel I-7 | 🟠 | todo (spawned итер.9, якорь: `packages/ingest-rentacar/src/...customer-lens.ts` 0 `policy.resolve` — перепроверить точный путь grep-ом при взятии) |
| T-durablerunner-raw-read | B7 · `DurableRunner.read()`/`acts()` минуют `resolve()` полностью, без viewer-параметра (spine-роль негейтована) | инженерный/security | D1.b / kernel I-7 | 🟠 | todo (spawned итер.9, якорь: `packages/engine/src/...durable-runner.ts:64-76` read/acts без resolve — перепроверить путь grep-ом) |
