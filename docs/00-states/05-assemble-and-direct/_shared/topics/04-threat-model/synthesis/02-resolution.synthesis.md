---
node_type: synthesis
title: "U6 threat-model — резолюция (CLEAN, дивергенция лоб-в-лоб адъюдицирована)"
status: resolved
owner: jenya.stasik@gmail.com
date: 2026-08-09
run: autonomous-question-closure
iteration: 9
kind: knowledge
lenses: [analyst, system-architect, critic-adjudicator]
verdict: "CLEAN — критик независимо перетрассировал всю цепь; дивергенция form-vs-policy решена"
inputs:
  - ../analyses/01-attack-surface.analysis.md
  - ../analyses/02-trust-boundaries.analysis.md
  - ../synthesis/01-critic-check.critic.md
---

# U6 threat-model — итог (черновик-карта, owner принимает риск)

> DESIGN-черновик, НЕ стройка, НЕ security-контроли. 3 линзы (analyst surface · architect boundaries ·
> critic-адъюдикатор). Analyst и architect разошлись на несущем (form-vs-policy shortlist + реальна ли
> policy-takeover) — критик перетрассировал код независимо и решил. Сырьё — `analyses/` + `synthesis/01`.

## 1. Карта: у субстрата ДВЕ двери, обе воронки
- **write** → `Engine.write()` (`packages/engine/src/engine.ts:73-111`); **read** → `resolve()`.
- INSIDE периметра = PEP + append-only journal (immutable, I-4). OUTSIDE = `SubjectRef=string`
  (`types.ts:14`), surface-идентичности, ingest-строки, out-of-band PII.
- `admit()`/`admitHome()` РЕАЛЬНО гейтят PII/один-дом (`engine.ts:76`) — но НИ ОДИН из них не проверяет
  подлинность актора / namespace source_ref / провенанс гранта (критик, обе линзы частично правы).

## 2. Адъюдицированный missing-FORM shortlist (retrofit-НЕВОЗМОЖНО, несущие 20%)
Критик подтвердил УЗКИЙ список архитектора (тест = frozen-data по I-4, не severity):
- **F1 · write-principal-seam** (подлинность `actor`, вмерзает в journal при первой записи) — = форма
  актор-модели итер.8 + `FORK-U3`. Choke-point на write отсутствует (`engine.ts:75` берёт actor вербатим).
- **F2 · data-subject/consent-binding** (цель стирания = opaque `source_ref`, не личность) — = `T-data-subject-no-code`
  (итер.8). ГДЕ живёт binding (ребро/payload-поле/consent-ledger) — сворачивается в существующий FORK-2/
  `T-referent-consent`, НЕ новый owner-форк (критик: none new).
- **Схождение с итер.8:** новых retrofit-невозможных форм СВЕРХ этих двух threat-model НЕ нашёл. Ургентные
  формы = ровно две опоры идентичности, уже найденные. Остальное — cheap POLICY (воронка уже существует).

Analyst'ов 4-элементный form-список (PayloadStore-sig · customer-lens · grantValid minted_by · DurableRunner)
**переклассифицирован в cheap POLICY** — analyst спутал тяжесть с тестом Закона-1 (воронка есть → чинится потом).

## 3. Несущая НАХОДКА: forge-грант на READ-пути (реально, эксплуатируемо СЕГОДНЯ)
Хуже, чем сказала любая линза (критик перетрассировал):
- `grantValid()` (`packages/engine/src/core/resolve.ts:136-141`) доверяет самозаявленному `body.minted_by`
  БЕЗ проверки; `canMintGrant`/`canMintCapability` имеют **0 call-sites нигде** → форжат capability и
  проходят через `holdsCapability` на READ-пути (`resolve.ts:247`) — **независимо от починки write-PEP**.
- Forge policy-узла: акт с `source_ref='policy:constitution'` перезаписывает реальный узел через
  last-write-wins (`loader.ts:8-11` + `store-durable-fs.ts:191-192`, `[...base, ...projection]`); admission
  (`admission.ts`) и `projection.ts` не проверяют namespace/source_ref.
→ Заведено `T-grant-forgery` 🔴 (read-path, distinct от `T-write-pep-unwired`) + `T-policy-node-provenance` 🔴.

## 4. Реальные, но cheap-POLICY, untracked (заведены задачами)
- **B4 customer-lens** — второй негейтованный deref-путь (0 `policy.resolve` в файле) → `T-customer-lens-ungated` 🟠.
- **B7 DurableRunner** — `read()`/`acts()` минуют `resolve()`, без viewer → `T-durablerunner-raw-read` 🟠.
- **hash-oracle** — НЕ новое: уже `T-D1b-erasure-debt-ADR` (`task-pool.md:56`, `hash.ts:9` несолёный sha256);
  добавлено: `isWitnessNonReversible` — dead code (0 call-sites) → аннотация в ту задачу.

## 5. Что threat-model даёт прогону
- **Ургентность 80/20 подтверждена:** несущие retrofit-невозможные формы = F1+F2 (обе = идентичность,
  уже найдены итер.8). Всё остальное — cheap policy, чинится когда угодно (Закон-1). Это СНИЖАЕТ панику:
  не «субстрат дырявый везде и это надо чинить до строя», а «две формы заложить сейчас, воронки закрыть потом».
- **Но 2 эксплуатируемых СЕГОДНЯ бага провенанса** (grant-forgery read-path · policy-node overwrite) —
  реальны, не бумажные тигры; policy — но 🔴 severity (обход capability = обход всего PEP). Owner принимает
  риск текущего dev/test-only статуса (нет реального PII под R1-забором), но задачи заведены явно.

## Влияние на готовность
G1-G5 не двинуты числом. G3-долг усилен (канон I-7/I-8 обещает гейт write + capability-mint, код не держит —
`T-grant-forgery`/`T-policy-node-provenance`/`T-write-pep-unwired` — три грани одного code-vs-invariant
divergence). G4: НЕ новый owner-форк (data-subject-location сворачивается в FORK-2). Ургентные формы = F1+F2
подтверждены как единственные retrofit-невозможные — вход в S2 principal-seam + consent-binding.
