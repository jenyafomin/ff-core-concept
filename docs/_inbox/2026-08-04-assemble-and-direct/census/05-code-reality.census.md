---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-04
Scope: project
node_type: census
title: "Census — код-реальность: что РЕАЛЬНО построено в packages/ vs что только в дизайне"
Related:
  - ./02-ga-rentacar.census.md
  - ../../../00-states/STATE.md
  - ../../../02-project/core/00-kernel/decisions/ADR-DRAFT-root-seal-durable-store.md
---

# Census — код-реальность (ground-truth для совета)

> Метод: Read/Grep по `packages/{core,engine,ingest-rentacar,rental-balance}/src` + счёт `it(`/`test(` в
> `*.test.ts`. НЕ запускал тесты/сборку — только статически считал assertions per файл (близко к реальному
> счёту vitest, но не гарантированно идентично suite-count). Не секреты, не менял код. `dist/` бегло
> сверен на дрейф (см. риск ниже), не читан построчно.
>
> Дополняет `02-ga-rentacar.census.md` (тот — жилец+риски M2/M3; этот — весь код-субстрат построчно,
> включая `@ff/core` и ACT_KINDS/PEP/durable-store детали, которых там нет).

## Таблица модулей

| Путь | Что делает | Статус | Тесты | Канон-доке |
|---|---|---|---|---|
| `packages/core` (`@ff/core`) | Файловый граф FFNode (id·kind·title·body·tags·links), frontmatter+zod-схема, levels (L1-L3 zoom), context-cascade, trace-node writer | **построено и зелёное** | 14 assertions / 4 файла | `docs/02-project/core/01-brain/` (частично; brain как "субстрат" описан шире кода) |
| `packages/core/src/store.ts` | `FileNodeStore` — CRUD по `<root>/nodes/<id>.md`, gray-matter, полная директория в память (personal-scale, без индекса/БД) | построено | покрыт store.test.ts (7) | соответствует |
| `packages/engine` (`@ff/engine`) | Kernel: EnvelopeNode/Act/Graph модель, resolve()=PEP, admission (no-inline-PII), projection (CQRS reducer), view-compiler (cost-tree/visible-to/actions-by-agent), durable-fs store, durable-runner | **построено и зелёное** | **92 assertions / 15 файлов** (было 77 на момент STATE.md L31 — коммит 490d5bb добавил durable-runner + crash-test + file-first тесты со вчерашней сессии, канон уже отстал) | `docs/00-states/00-global-build/realization-plan/phase-1-engine/M0-spec.md`, ADR-0004/0006/0007/0008 |
| `core/types.ts` | Frozen envelope shape (10 полей), `ACT_KINDS` enum (6 kinds), `Act` конверт (payloadRef+Hash, no inline PII) | построено (типы) | косвенно, через все тесты | act-kinds.design.md |
| `core/resolve.ts` | `PermissionPolicy` — ЕДИНЫЙ PEP: `resolve('read'\|'write'\|'write:field', ...)`. FIXED-режим: deny-wins fold, meta-cap gate на control-plane полях (Hole A), namespace-ceiling (write, prefix), per-node ceiling (read, exact — асимметрия ратифицирована F-5(c)), `valveGate` (consent на irreversible-действия — сверяет `consent_event`, не спуфабельный label) | **построено и зелёное** | capability.test.ts(7) + resolve-ceiling.test.ts(7) + invariants I-7(отд.) | resolve verbatim-порт run-capability.mjs (NAIVE 3/15\|FIXED 15/15 в комменте — историческая метрика самого seed-корпуса, НЕ engine-suite) |
| `core/admission.ts` | `admit()` — no-inline-PII гейт (структурный по schema + heuristic email/phone regex), `admitHome()` — one-home барьер (factKind→domain), **fail-OPEN если `domain` отсутствует у акта** | построено, **но barrier no-op в проде** (ни один cli/writer сегодня не инжектит `HomeRegistry`/`fact_kind` — см. `02-ga-rentacar.census.md` риск 3) | invariants PII-block(5) | ADR-0007 §G3 |
| `core/projection.ts` | CQRS reducer: ТОЛЬКО `domain_event` фолдится в state; `observation`/`access_event`/`agent_trace`/`system_telemetry` — side-journal, журналируются но НИКОГДА не трогают граф | построено | projection.test.ts(9) | ADR-0008 |
| `core/idempotency.ts` | R5 — kernel-computed SHA-256 content-hash (не caller-trust snapshotHash), дедуп при повторной записи | построено | idempotency.test.ts(5) | R5 kernel invariant |
| `core/predicates.ts` | D1 cardinality-as-data. `DEFAULT_PREDICATES = {}` (ядро — 0 доменных предикатов). `LOCKED_MANY_PREDICATES = {'same-as'}` (identity-ceiling, всегда wins). Guard against `many→one` narrowing на replay | построено, **guard формально существует, но 0 не-тестовых вызовов** (см. `02-ga-rentacar.census.md` риск 4 — `predicates.ts:78`) | cardinality.test.ts(6) + write-plane(a) | GAP 3(a) |
| `core/view-compiler.ts` | `costTree` (обход `delegates-to`, суммирует `body.tokens` по умолчанию через `cost_via.field`, GATED резолвом при FIXED), `visibleTo`, `actionsByAgent`, `loopGuard` — единый 4-стадийный pipeline `from·traverse·filter·shape` | построено и зелёное (Hole B закрыт: ветка, которую viewer не может читать, PRUNED целиком) | projection/invariants (частично) | run-view.mjs seed-порт |
| `core/erasure.ts` | V7/Согласие: **shape-level ТОЛЬКО**. `splitAct`/`redactAct`/`isErasureVerifiable` — доказывают, что immutable-meta и erasable-payload разделимы. Явно в комментарии: "NOT the feature". Куда физически едет erasable-payload (out-of-journal blob vs inline) — НЕ решено, hard-erase не реализован | **заглушка (проверенная тестами форма, не механизм)** | erasure-seam.test.ts(5) | seal-vs-values-review §3, критик Risk 1 |
| `adapters/store-memory.ts` | In-memory StorePort — base⊕projection, `writeAct` инкрементально фолдит, `rebuild('journal')` доказуемо bit-for-bit равен инкременту (ADR-0008 §2) | построено | покрыт всем write-plane suite | — |
| `adapters/store-durable-fs.ts` | **S7 durable store.** JSONL-журнал, `fsyncSync` ДО возврата `ok` (C1), rebuild-from-journal на boot (C2), append-only + drop оборванной последней строки при краше (C3), идемпотентность через ребут (C4), advisory PID single-writer lock с reclaim мёртвого владельца (C5) | **построено и зелёное, реально протестировано через границу OS-процесса** (spawn→SIGKILL→новый процесс с диска) | crash-mid-turn(2) + durable-reboot-matrix(2) + survive-turn(3) + durable-runner(3) | `docs/.../specs/07-durable-storeport.spec.md` — статус design→**built-green** |
| `adapters/store-md.ts` | `MdEnvelopeStore` — делегирует к `@ff/core FileNodeStore`, оборачивает EnvelopeNode/Act как JSON-carrier ноды. Плюс "file-first перо" (ADR-0006 §f): `ingest()`/`detectStale()` — хэширует md-файл, диффит против known-hash, продюсит `domain_event` при дрейфе | построено ЧАСТИЧНО: carrier-запись работает; **семантический парсинг prose→envelope НЕ решён (TODO M3)**; eligibility whitelist (§g) — консервативный allowlist (`note/agent/thought/summary/group`), НЕ спека §(g) meta:type whitelist + write-time gate (не построен, помечен design fork) | store-md-filefirst.test.ts(4) + invariants store-md(1) | ADR-0006 §f/g — §f реализован минимально, §g НЕТ |
| `runner/durable-runner.ts` | P2 spine: boot(store+engine)→record()→view()→restart() (симулирует границу хода без спавна процесса), close() | **построено, новое в этой сессии (490d5bb)** | durable-runner.test.ts(3) | НО: **ни один M2/M3-модуль ga-rentacar сегодня не гоняется через него** — всё живёт на `MemoryStore` (см. 02-census) |
| `surface/cli.ts` | Единственное место с `process.exit` (ADR-0004). Verbs: validate·view·resolve·load·rebuild·write·bench | построено | cli-durable.test.ts(1) | M0-spec §3.1 |
| `packages/ingest-rentacar` (`@ff/ingest-rentacar`) | M1+M2: Orders/Cars/Customers sync (`reduce.ts`), content-hash+key namespacing, `same-as` dedup-candidates (PURE, no write-path by construction — auto-merge structurally impossible), same-as-writer (reversible merge/un-merge act-builder), customer-lens (both-ways union read), latest-wins observation reducer, `FilePayloadStore` (content-addressed PII-by-ref) | **построено и зелёное** | **32 assertions / 4 файла** (STATE.md ещё помнит "7/7" — это дособытие M1-only; M2-слайсы dedup/lens/latest-wins добавлены коммитом a02f759 и уже дают 32) | `docs/03-projects/ga-rentacar/specs/01,04,06` |
| `ingest-rentacar/lens/customer-lens.ts` | Читает граф напрямую (`graph.byId`), **минует PEP** (не вызывает `resolve()`); объединяет `rented`+`for-customer` (both-ways, задокументированный workaround keyspace-раскола) | построено, но **не same-as-aware** (AC5/T3 спека НЕ реализован — линза не сворачивает дубль-кластер клиента) | ingest.test.ts частично | `04-m2-dedup-and-customer-lens.spec.md` AC5 = красный |
| `packages/rental-balance` (`@ff/rental-balance`) | P1: `balance.ts` (чистая арифметика над Graph — remaining=total−Σpayments, обнаруживает orphan/overpaid), `balance-observer.ts` (первый честный agent-cycle: read через PEP → compute → write `observation` act), payment reduce, CLI | построено (тесты не прогонялись в ЭТОЙ сессии; STATE.md исторически даёт 9/9) | **9 assertions / 1 файл** (счёт статический, совпадает с историческим 9/9) | BUILD-P1 §4 |

**Итого по репо:** 4 пакета, ~28 src-модулей охвачено чтением, **147 test-assertions статически** (core 14 + engine 92 + ingest-rentacar 32 + rental-balance 9). Engine-суита реально прогонялась и подтверждена независимо дважды за сегодня (`02-ga-rentacar.census.md` даёт тот же 92/92, ingest-rentacar тот же 32/32) — цифры схлопываются, доверие высокое.

## Код vs канон (расхождения) — топ-5

1. **`access_event` объявлен, но НИКОГДА не создаётся.** `types.ts:174` — единственное упоминание кроме комментария в `projection.ts:6` ("side-journal, никогда не трогает граф"). Ни один writer (`engine.write`, `balance-observer`, `ingest.ts`, `same-as-writer`) не строит акт с `actKind:'access_event'` — grep по всему `packages/**/*.ts` (не `dist`) находит 0 site вызовов. **Канон, называющий это работающим observability-механизмом, лжёт о статусе.** Файл: `packages/engine/src/core/types.ts:174`, `packages/engine/src/core/projection.ts:6`.
2. **Explain-chain / T-7 — нет вообще никакого кода.** Grep `explain` по `packages/engine/src` и `packages/engine/test` — 0 совпадений. Это не "частично построено", это ноль строк. Файл: n/a (отсутствует).
3. **`cost-tree` = буквально `Σ body.tokens` по умолчанию (настраиваемо через `cost_via.field`), НЕ модель "Витальности".** Это generic числовой rollup по `delegates-to` рёбрам с PEP-gating и loop-guard — честно построенный примитив, но не несёт семантику ценности "Vitality" (нет понятия энергии/усталости/health-score в коде вообще). Файл: `packages/engine/src/core/view-compiler.ts:67` (`field = 'body.tokens'`).
4. **`system_telemetry` — то же, что и `access_event`: только enum-запись + комментарий, 0 продюсеров.** Файл: `packages/engine/src/core/types.ts:176`.
5. **STATE.md отстаёт от HEAD по числу тестов и по составу пакетов.** STATE.md:31 фиксирует "engine-сьют 77/77" — реальный HEAD (коммит 490d5bb) даёт 92/92 (15 файлов, +durable-runner.test +crash-mid-turn +durable-reboot-matrix +store-md-filefirst добавлены той же сессией ПОСЛЕ строки 31 была написана). Аналогично ingest-rentacar исторический "7/7" (M1-only) — реально сейчас 32/32 (M2 dedup+lens+latest-wins). Оба расхождения — канон не успевает за кодом, не наоборот; но при чтении STATE.md с ходу можно принять устаревшую цифру за текущую. Файл: `docs/00-states/STATE.md:31`.

(`agent_trace` — частный случай: используется в 1 месте, но это `projection.test.ts:130`, тестовая фикстура, а не production-эмиттер. Формально "не ноль", но нет ни одного реального писателя вне тестов — тот же паттерн, что access_event/system_telemetry, просто помечен отдельно, т.к. технически встречается в grep.)

## Что durable (S7) реально умеет

- **Умеет:** fsync-append JSONL до возврата `ok` (durability на immediate hard-kill) · rebuild-from-journal через ТОТ ЖЕ чистый reducer, что MemoryStore (bit-for-bit гарантия) · переживает реальную границу OS-процесса (spawn→SIGKILL→новый процесс, не симуляция) — `crash-mid-turn.test.ts`, `durable-reboot-matrix.test.ts` · advisory single-writer PID-lock с reclaim мёртвого владельца (защита от гонки двух писателей — прямая контрмера на `gateway-dup-message-bug`) · идемпотентность (R5 content-hash) переживает ребут, т.к. дедуп сверяется с ДИСКОВЫМ журналом.
- **НЕ умеет (за рамками этого среза):** не персистит seed/base-корпус (constitution и т.п. подаётся заново на каждый boot, не в журнале) · не компактит журнал (append-only forever, нет retention/rotation — `oq-7-journal-retention.question.md` в picture-coverage помечает это открытым) · не имеет multi-writer/распределённого режима (single-writer — это дизайн-граница, не временная заглушка) · durable-runner (P2, композиционный слой) существует, но **0 продакшн-модулей ga-rentacar сегодня на нём не работают** — все M1/M2/P1-слайсы гоняются на `MemoryStore`, durable путь проверен только собственными тестами движка.

## Ценности с код-якорем vs без

Код НЕ содержит явного списка "7 ценностей" (Читаемость·Тождество·Доверие·Витальность·Суверенность·Реляционность·Согласие) как artefact — это картирование по факту, какой механизм какую ценность материализует:

| Ценность | Код-якорь | Оценка |
|---|---|---|
| **Суверенность** (capability/PEP) | `resolve.ts` целиком: `holdsCapability`, grant-fold (deny-wins), meta-cap gates (canWriteAccessFields/canMintGrant/canWriteNamespace/canMintCapability), namespace-ceiling (write, prefix) + per-node ceiling (read, exact) | **сильный код-якорь**, реально протестирован (14 тестов), production-режим FIXED enforced по конструктору Engine |
| **Реляционность** (edges/graph) | `edge-index.ts` (computed inverse), `predicates.ts` (cardinality-as-data, one/many fold), `projection.ts` (edge-fold в проекции) | **сильный код-якорь** |
| **Тождество** (identity/dedup) | `ingest-rentacar/dedup/candidates.ts` + `same-as-writer.ts` + `LOCKED_MANY_PREDICATES` в ядре (same-as всегда many, identity-ceiling) | **частичный код-якорь**: candidates+writer построены и тестированы, но потребитель (`customer-lens`) НЕ same-as-aware — механизм есть, конвейер не замкнут (см. 02-census риск 1) |
| **Доверие** (admission/no-inline-PII) | `admission.ts` (`admit()` PII-scan) + `FilePayloadStore` (content-addressed ref) | **сильный код-якорь** на PII-часть; one-home барьер (тоже "доверие" в широком смысле) — код есть, но **no-op в проде** (fail-open, никто не инжектит HomeRegistry) |
| **Согласие** (V7 consent/erasure) | `resolve.ts::valveGate` (проверяет `consent_event` на irreversible-действиях, реально FIXED-gated) + `erasure.ts` (shape-only) | **частичный код-якорь**: valve-gate реален и протестирован; hard-erase (собственно "право на забвение") — только доказанная разделимость zones, механизм стирания НЕ построен |
| **Читаемость** (levels/passport) | `@ff/core levels.ts` (L1/L2/L3 zoom snippet) | **слабый код-якорь**: есть примитив zoom, но "паспорт узла" (упоминаемый в ga-rentacar decisions) как таковой в коде не существует — 0 кода |
| **Витальность** | — | **0 кода.** Ни одного модуля/поля, которое моделирует "vitality"/energy/health как понятие. `cost-tree` иногда используется как proxy в доках, но это generic token-sum, не Vitality-специфичный механизм (см. расхождение #3 выше) |

## Дыры карты

- `packages/*/dist/` не читан построчно — только замечен риск дрейфа src↔dist (упомянут в `02-ga-rentacar.census.md` риск 5: `ingest-rentacar` в какой-то момент тянул устаревший `dist/engine`, что маскировало CRITICAL-регресс). Не проверил, актуален ли dist сейчас vs src на HEAD.
- Тесты НЕ запускались в этой сессии (по условию задачи) — счёт 92/32/14/9 статический (подсчёт `it(`/`test(` по исходнику), не факт что 1:1 совпадает с реальным vitest-отчётом (вложенные `describe.each`/`test.each` могут давать иной итог). Независимое совпадение с `02-ga-rentacar.census.md` (та же 92/92, 32/32) снижает этот риск, но не убирает.

Путь: `docs/_inbox/2026-08-04-assemble-and-direct/census/05-code-reality.census.md`
