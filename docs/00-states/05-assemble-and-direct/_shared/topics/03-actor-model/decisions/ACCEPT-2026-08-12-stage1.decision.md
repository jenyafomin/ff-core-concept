---
type: decision
status: review  # self-graded автономным прогоном 2026-08-12; ждёт РЕАЛЬНОЙ ратификации владельца
owner: jenya.stasik@gmail.com
date: 2026-08-12
theme: ACCEPTANCE — Стадия-1 (write-side PEP · force-bind trust plane) признана как частичное ужесточение
decision-id: ACCEPT-2026-08-12-stage1
resolves: FORK-1 (OWNER-FORKS-2026-08-12 · variant 1 «признать как есть»)
related:
  - ./OWNER-FORKS-2026-08-12.decision.md
  - ../../../../state.md
  - ../../../../../../_log/2026-08-12-m5-census-and-operating-model/HANDOFF.md
  - ../../../../../../architecture/ADR/ADR-0010-principal-authority-vs-attribution.md
  - ../../../../../../architecture/ADR/ADR-0011-agent-isolation-model.md
  - ../design/01-seam-and-lifecycle.design.md
  - ../../../../../../council/raw/2026-08-11-next-step-strategy/REVIEW-trust-plane-stage1.review.md
---

# ACCEPT-2026-08-12 — Стадия-1 признана (write-side PEP + force-bind)

> **DESIGN-режим.** При сборке этой записи product-код НЕ писался и НЕ менялся; коммитов/git-мутаций нет.
> Выполнены только read-only проверки: `git show --stat`, чтение исходников, `npm test` (workspace vitest run).
> Это **административно-приёмочный** ход (move 1 = «признать Стадию-1»), а не инженерный.

## Решение (одна строка)

**Стадия-1 признаётся как честное ЧАСТИЧНОЕ ужесточение write-плоскости, уже находящееся в git.**
Не откатываем, не доращиваем спешно. Формулировка «uncommitted / держу» в пульте и хендоффах —
**устарела** и подлежит замене на «принято, в истории ветки». Это реализация варианта 1 из
`OWNER-FORKS-2026-08-12.decision.md` (FORK-1, рекомендация high-confidence).

## Что Стадия-1 доставила (по факту кода)

Единица приёмки = **write-side Policy Enforcement Point (PEP) + force-bind trust plane** на движке. Конкретно:

1. **Write-PEP на проектируемых актах** — `packages/engine/src/engine.ts:84-126` (блок с шапкой
   `── WRITE-SIDE PEP · trust plane (Stage-1, force-bind) ──`). Только проектируемый `domain_event`
   может касаться canonical / control-plane состояния (`policy:*`, `meta:cap/core:*`, `grant:*`);
   непроектируемые акты (observation/agent_trace) идут в side-journal и не гейтятся — поведение
   balance-observer не изменилось.
2. **F1 force-bind `minted_by`** — `engine.ts:105-107`: при записи `grant` движок ЖЁСТКО перезаписывает
   `payload.minted_by = finalized.actor`. Тело акта больше не может само-объявить `minted_by:'system'`.
3. **F2/F3 namespace-ceiling** — `engine.ts:110-115`: запись в защищённое семейство (`policy:*`,
   `meta:cap/core:*`) отклоняется, если писатель не держит `core:manage-core`. No-op, когда конституция
   не перечисляет `protected_namespaces`.
4. **F1/F3 mint-authority** — `engine.ts:118-124`: минт/правка `grant` гейтится `core:manage-grants`
   ДО проекции; кованый self-mint отклоняется на write-границе, так что read-side `grantValid`
   (`resolve.ts:141-147`) опирается на гейтированную запись, а не на голое доверие телу.
5. **Порты шва (paper-freeze, форма без поведения)** — `packages/engine/src/ports/principal-resolver.ts`
   (+49), `principal-stamper.ts` (+48). Замораживают ТИП write-principal-шва; реализации нет, в
   `engine.ts` / write-путь НЕ подключены (см. ниже — 0 call-site = ожидаемо в DESIGN).

## Доказательства (evidence)

- **Коммиты (git, проверено `git show --stat`):**
  - `3474cd1` «Brain going forward» (2026-08-12 04:36) — финальный чекпоинт trust-линии: правит
    `engine.ts` (+46/-), `resolve.ts` (+7), `core/types.ts` (+49); добавляет
    `ports/principal-resolver.ts`, `ports/principal-stamper.ts`,
    `test/{trust-plane,principal-form,principal-seam}.test.ts`, ADR-0010, ADR-0011; правит
    `rental-balance/src/core/constitution.ts` (+6/-). Весь пакет trust-линии ушёл в ОДИН коммит.
  - `ccbbb96` «feat: huge work S1-S3» (2026-08-11 17:14) — предшествующая волна дизайн-артефактов
    (актор-модель, threat-model, decision-ready пакеты S1-S3); продукт-код в нём trust-плоскости не нёс.
  - `95973a9` «feat(engine,rental-balance): durable → real path + erasure split on disk (D1.b Stage 1)»
    (2026-08-06) — durable-путь store (`adapters/store-durable-fs.ts` +35) и erasure-split в CLI
    (`rental-balance/src/surface/cli.ts`). Это durable-подложка, поверх которой стоит write-PEP.
- **Тесты (ФАКТ, наблюдён `npm test` = `vitest run` по 4 воркспейсам, 2026-08-12):**
  - `@ff/core` — **14 passed** (4 файла)
  - `@ff/engine` — **120 passed | 1 todo** (19 файлов); включая `trust-plane.test.ts`, `principal-form.test.ts`,
    `principal-seam.test.ts` — зелёные
  - `@ff/ingest-rentacar` — **32 passed** (4 файла)
  - `@ff/rental-balance` — **21 passed** (3 файла)
  - **ИТОГО: 187 passed + 1 todo (188 всего). 0 fail, 0 регрессий.**
  - Заявленное в хендоффе «187/187» **подтверждается** — 187 проходящих ровно. (Уточнение: есть ещё
    1 `todo`-тест в engine, итоговых кейсов 188; «187» = число зелёных, не общее.)
- **Порты имеют 0 call-site в `src`** (проверено `grep` по `packages/*/src`, исключая сами порт-файлы):
  `principal-resolver` / `principal-stamper` нигде в продукт-коде не вызываются. **Это ОЖИДАЕМО и
  корректно для DESIGN-фазы** — порты заморожены как ФОРМА (тип write-principal-шва), поведение
  отложено до M5 / ADR-0011 (см. TODO в шапке `principal-resolver.ts`).

## Что ЯВНО ещё НЕ построено (границы приёмки)

- **`T-actor-delegation` НЕ закрыт.** `engine.ts` всё ещё гейтит по `finalized.actor` — само-заявленному
  полю тела под замороженной сигнатурой `write(act): Ack` (см. NOTE `engine.ts:96-98`: «open fork, NOT
  closed by force-bind»). Reviewer (`REVIEW-trust-plane-stage1.review.md`) живым эксплойтом показал:
  `mallory` может выставить `actor:'user:admin'` → эскалация всё ещё возможна. Стадия-1 закрывает
  **подделку `minted_by`** и **namespace-ceiling**, но НЕ подлинность самого actor.
- **Resolver-поведение = DEFER-build.** Реальный authenticated-principal source (кто удостоверяет
  `actor`/`trust`) НЕ реализован — это работа M5 (surface-identity) по секвенсу
  `ADR-0010 → ADR-0011 → M5 → ③`. Строить resolver-код сейчас = театр (подтверждено переписью ширины
  M5 и Fable-синтезом: 0 работающего источника личности, порты имеют 0 call-site).
- **Enforcement НЕ «живой» через границу.** Шлюз (`agents-manager`) с движком FF не связан; разрыв
  доверия на хопе `T-agent` (ADR-0011). Флип enforcement заблокирован предусловиями P-1…P-4 ADR-0011,
  в т.ч. P-2 (фикс `gateway-dup` в чужом репо).

## Честная формулировка приёмки

**Приёмка = «код существует + тесты зелёные + границы честно промаркированы в самом коде».**
Это НЕ «enforcement живой» и НЕ «trust защищён». Комментарии в `engine.ts:84-98` сами документируют,
что force-bind — частичное решение; это промаркированная честность, а не скрытый театр (ADR-0010:186-187
прямо требует разделять «частично ужесточено» и «доверие защищено»). Принимаем именно частичное
ужесточение, зафиксированное в истории ветки `refactor-tree`.

## Следствия (что делать после приёмки)

1. Обновить пульт `state.md` и хендоффы: убрать «Стадия-1 uncommitted / держу» → «принято (`3474cd1`),
   частичное ужесточение, тесты 187 зелёных». (Правка доков, вне этого файла — отдельным ходом.)
2. FORK-1 считать закрытым (вариант 1). FORK-2 (ратификация ADR-0010 §③-bis + ADR-0011) — следующий
   бумажный ход. Resolver/M5 — DEFER-build до owner-«строй» и прохождения гейтов P-1…P-4.

---

## Critic review 2026-08-12

Adversarial pass (part of a 3-file review with RATIFY and T5-nongoal). One defect found and fixed here.

- **Fixed — broken relative link in frontmatter.** `related:` line 16 pointed to `../REVIEW-trust-plane-stage1.review.md`
  (resolves to `docs/00-states/05-assemble-and-direct/_shared/topics/03-actor-model/REVIEW-trust-plane-stage1.review.md`,
  which does not exist). The real file lives at
  `docs/council/raw/2026-08-11-next-step-strategy/REVIEW-trust-plane-stage1.review.md` (it's the same review
  cited by ADR-0010's own Related list). Corrected to
  `../../../../../../council/raw/2026-08-11-next-step-strategy/REVIEW-trust-plane-stage1.review.md` and
  verified it resolves. Additive, reversible (revert the one line).
- **Overclaim check: PASS.** This doc is explicit about NOT claiming enforcement or closed trust — "Это НЕ
  «enforcement живой» и НЕ «trust защищён»" (line ~99) and the live-exploit callout (`mallory` →
  `actor:'user:admin'`) is kept front-and-center under "Что ЯВНО ещё НЕ построено", not buried. No overclaim
  found.
- **Evidence claims spot-checked against RATIFY's citation of the same numbers (187/187, `3474cd1`) — consistent
  across both files**; did not independently re-run `npm test` in this pass (out of scope for a docs review),
  treated as accepted per the artifact's own "read-only proofs" methodology note.
