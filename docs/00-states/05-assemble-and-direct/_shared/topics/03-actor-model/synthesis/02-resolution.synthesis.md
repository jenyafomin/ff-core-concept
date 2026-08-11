---
node_type: synthesis
title: "U3 actor-model — резолюция (CLEAN после 2 фиксов критика)"
status: resolved
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
iteration: 8
kind: knowledge
lenses: [system-architect, analyst, critic]
verdict: "CLEAN (после DIRTY→фикс: subject-framing + FORK-U3 form-only note)"
inputs:
  - ../analyses/01-actor-roles.analysis.md
  - ../analyses/02-actor-dataflow.analysis.md
  - ../synthesis/01-critic-check.critic.md
---

# U3 actor-model — итог

> DESIGN-набросок, НЕ решение и НЕ стройка. 3 линзы (architect границы · analyst dataflow · critic
> адверсариал). Критик вернул DIRTY с 2 хирургическими фиксами; фиксы применены лидом (мелкая правка,
> ECONOMY §6). Ниже — резолюция ПОСЛЕ фиксов. Полное сырьё — в `analyses/` + `synthesis/01-critic-check`.

## 1. Модель ролей — ДВА контракта, не три (принято, критик-verified)
`SubjectRef = string` (`packages/engine/src/core/types.ts:14`) носит ТРИ синтаксически одинаковые роли,
но семантически это **два контракта**:
- **PRINCIPAL** (действующая личность): `viewer` (`types.ts:151`, читатель — кто спрашивает доступ) +
  `actor` (`types.ts:217`, автор акта — кто записал). Одна забота идентичности, две стороны (read/write).
- **REFERENT** (указатель, не сторона): `subject` (`types.ts:159-160`) — **это `GrantBody.subject`, цель
  выдачи capability** (grant-target), потребители `resolve.ts:130,148`. ⚠️ **НЕ «держатель согласия/владелец
  данных»** — так его ошибочно оформил вопрос-спек, и architect унаследовал (критик отклонил, п.2). «Data
  subject» согласия/стирания в коде **не представлен вообще** — см. §4 остаточный риск.

## 2. Ключевая находка — write-half PEP не подключён (ИНТЕГРИТИ-ДЕФЕКТ, критик независимо verified)
`resolveWrite` (`packages/engine/src/core/resolve.ts:191-231`) построен и подключён в generic-диспетчер
`resolve()` (`resolve.ts:120`), но **`Engine.write()` (`packages/engine/src/engine.ts:73-108`) его НЕ
вызывает** — 0 продакшн-вызовов вне тестов. Read-путь гейтится корректно (`view-compiler.ts:58,102,142,223`),
write-путь — нет. Это прямое нарушение I-7 (`docs/02-project/core/00-kernel/invariants.md:135-140` — «resolve()
единственный PEP, НИ ОДИН путь не обходит»).

**Критик заострил сверх analyst'а:** цитируемый в `invariants.md:36-37` энфорсер (`envelope-validator.ts`)
валидирует `EnvelopeNode` против `ENVELOPE_FIELDS` (`types.ts:81-92`), где `actor`/`provenance` **вообще
нет** (это поля `Act`, другой тип) → не «недоподключено», а **category mismatch**. Даже доказанный `actor`
проходит незамеченным. **Это отдельный дефект, НЕ решается `T-actor-identity`** (резолв идентичности не
чинит незалоченный write-путь) → заведён `T-write-pep-unwired` в `task-pool.md`.

## 3. Минимальная форма к резервированию СЕЙЧАС (Закон-1 = форма, не enforcement)
Актор-моделирование **складывается в S2, а не в третий шов** (критик подтвердил, enforcement НЕ смуглить):
- **Один principal-seam:** обобщить бумажно-замороженный `ViewerResolver` (`ports/viewer-resolver.ts:14`,
  `resolveViewer(surfaceIdentity):SubjectRef`) в шов, на который ссылаются ОБА — read-сторона (viewer,
  deref-seam S2) и write-сторона (actor). Сегодня read-choke-point есть (`viewer-resolver.ts:14`),
  **write-choke-point отсутствует** (`engine.ts:73-108` берёт `act.actor` вербатим).
- **`subject` остаётся на referent/admission-стороне** (S2 admission классифицирует референт-класс).
- **Форма, НЕ политика:** резервируем присутствие principal-seam для write; КТО и КАК резолвит (M5,
  Telegram uid→user:/agent:, `viewer-resolver.ts:8`) и force-bind-vs-attest — **не сейчас** (см. FORK-U3).
- ⚠️ **Убрано смугл-предложение** (критик п.3): доккоммент «actor never free-set by caller» = это уже
  Option A (force-bind) под видом «form-only». Форма резервирует ШОВ, выбор поведения — форк владельца.

## 4. Остаточный риск (за пределами U3, НЕ терять)
«Data subject» (владелец данных / держатель согласия для стирания) **не имеет кодового представления
нигде**: реальная цель стирания = `provenance.source_ref` (opaque source-system строка, напр.
`erasure-byref-shred.test.ts:43`), никогда не `SubjectRef`; `erasure.ts:117-137` не имеет consent-поля;
`resolve.ts:265-272` `valveGate`/`consent_event` не подключён к erasure. → **заблокирует `T-referent-consent`
/ FORK-2, когда откроются.** Заведено как spawned в `task-pool.md`, связано с truth-keystone (§согласие).

## 5. Форк владельцу (реальный, но 🟡 низкая срочность)
**FORK-U3** — как write-principal-seam связывает `actor`: **force-bind** (движок ставит actor = резолвнутый
principal, клиент не задаёт) vs **attestation-stamp** (клиент заявляет actor, движок штампует «заявлено,
не доказано»). Резервирование ШВА идентично при обоих (не предрешено). Срочность 🟡: `SurfacePort` = 0
реализаций (paper-freeze), не тикает как R4. Карточка → `OWNER-QUEUE.md#Q-FORK-U3`.

## 6. Открытые под-вопросы (в task-pool, не решены здесь)
- **Делегация:** может ли агент авторить акт КАК другой principal? Ответ выбирает enforcement-стиль FORK-U3.
- Write-PEP-gap — `T-write-pep-unwired` (заведён, 🔴, distinct from T-actor-identity).

## Влияние на готовность
G1-G5 не двинуты. Находка §2 (write-PEP unwired) — **интегрити-дефект**, усиливает G3-долг (спека/канон
обещает write-гейт, код не держит) — НЕ новый canon-lie в тексте, а code-vs-invariant divergence, вынесен
задачей. G4 (форки): +1 форк FORK-U3 (🟡). Формы актора (§3) — вход в S2 principal-seam, не заложены (design-набросок).
