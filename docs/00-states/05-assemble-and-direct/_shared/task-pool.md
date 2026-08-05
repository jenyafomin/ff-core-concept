---
node_type: task-pool
title: "Пул задач — assemble-and-direct (живой список, не хроника)"
status: active
owner: jenya.stasik@gmail.com
date: 2026-08-05
scope: project
reuses: ./README.md
state: ../state.md
handoff: ../../../_log/2026-08-05-depth-and-path/HANDOFF.md
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
| T-index-refresh | INDEX'ы устарели (docs/INDEX · growth-and-seq · process) — новые файлы не видны | S-D | 🔧 | todo |
| T-doctypes-register | завести типы convention/task-pool/template в docs/.doc-types.json | S-D | 🔧 | todo |
| T-forks | FORK-1..4 — решает владелец | — | 🔧 | todo |
| carry-forward | долги прошлых хендофов | S-A / S-D | 🔧 | todo |

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

### T-index-refresh 🔧 · ветка S-D
INDEX'ы устарели (2026-07-06/07-21) → новые файлы не видны из «одного входа» (law 8): `docs/INDEX.md` (нет
04/05-states), `growth-and-sequencing/INDEX.md` (нет CGC/MIGRATION/movement-selfcheck), `process/INDEX.md`.
Обновить, чтобы pool/template/правила/перепись подтягивались сами.
- **Якорь** `needs-anchor` — доку-долг (проверено критиком doc-discipline 2026-08-05).

### T-doctypes-register 🔧 · ветка S-D
Типы `convention`/`task-pool`/`handoff-template` не заведены в `docs/.doc-types.json` → закон 5 «тип решает
дом» формально не на что опереться для растущей семьи.
- **Якорь** `docs/.doc-types.json` — реестр типов→домов (записи отсутствуют).
