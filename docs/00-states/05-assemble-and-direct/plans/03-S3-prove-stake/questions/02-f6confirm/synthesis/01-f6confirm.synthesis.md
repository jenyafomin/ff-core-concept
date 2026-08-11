---
node_type: synthesis
status: review
owner: jenya.stasik@gmail.com
date: 2026-08-09
agent: system-architect
question: ../02-f6confirm.question.md
kind: crystallization
inputs:
  - ../../../../../../_inbox/2026-08-04-assemble-and-direct/design/d1b-width-census/build/stage2-reports/06-fork2-f6.report.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/synthesis/F6-edge-identity-design.design.md
  - ../../../../../../_log/2026-08-08-orchestrated-design-push/work/D3-f6-time-on-edge-falsification.analysis.md
  - ../../01-s3scope/analyses/01-s3scope.analysis.md
  - ../../../../01-S1-ratify-two-laws/work/two-laws.invariant-candidate.md
related:
  - ../../../../../../../packages/engine/src/core/predicates.ts
  - ../../../../../../../packages/engine/src/core/types.ts
---

# F6 — кристаллизация до owner-confirm (per-facet)

> Компрессия существующих рекомендаций, НЕ новое решение. F6 расщеплён на две owner-confirm грани
> (см. `../02-f6confirm.question.md` §Ключевой ход). Ни одна строка ниже НЕ решает за владельца —
> обе оформлены как готовые-к-подтверждению ЛИНЗЫ.

## Грань A — sufficiency-boundary (одна строка)

> **ПРИНЯТЬ F6 на serialization/per-layer уровне — второй проецируемый кит НЕ строить (признанный
> over-proof); оба шва уже несут не-rentacar второй экземпляр (`access_event` байты + `linked-to`
> in-memory fold, `predicates.ts:113`/`write-plane.test.ts:109-142`), их композиция A∘B следует из
> ADR-0008 чистоты проекции — ПРИ УСЛОВИИ сузить формулировку F6 до «form-agnostic по-слойно».**

- Дом: `06-fork2-f6.report.md:108-119`; `task-pool.md:57` (`decided-pending-owner`).
- Направление {reify/opaque-key/concede} здесь НЕ возникает — грань A про ДОСТАТОЧНОСТЬ доказательства,
  не про форму ребра.
- **provisional до S3? НЕТ.** `01-s3scope.analysis.md §5(d)`: `T-D1b-f6-accept-boundary` — самостоятельный
  форк, НЕ гейтит и НЕ гейтится S3/time-on-edge. Подтверждаем НЕЗАВИСИМО, хоть сейчас.

## Грань B — edge-identity direction (ДВЕ разные вещи под одной меткой — разнесены)

Грань B слепляла в одну строку почти-доказанный ТЕХ-факт и настоящую owner-ЛИНЗУ. Разрез:

### B(a) — почти-доказано, подтверждение = формальность S3 (НЕ owner-decide)

> **НИКОГДА interval-as-key (B-interval) или kernel interval-branch (C-kernel) — оба тащат
> value-awareness в value-blind `foldEdges` (`predicates.ts:1-11`); принять «salvageable core» B
> (identity-key = registry-DATA, только opaque-поля).**

- Статус: **почти-доказано на бумаге** — D3 нашёл конкретный контрпример, ломающий interval-as-key
  (`D3:114-131`); это инженерный запрет, не ценностный выбор. Владельцу тут решать НЕЧЕГО —
  подтверждение приходит формальностью при фальсификации S3 (grep-check «zero interval value-comparison»).

### B(b) — owner-decide: НАПРАВЛЕНИЕ формы (настоящая линза)

> **По умолчанию §5-reification (stateful-стинт → собственная ЕДИНИЦА, сворачивается под уже
> доказанной payload-facet freshest-wins формой); fallback — opaque `edgeId` (Option A) только для
> ГОЛОГО корректируемого интервала.**

- Статус: **owner-decide** — что именно считать «отношением с жизненным циклом» (→ reify) vs «голым
  корректируемым интервалом» (→ edgeId) есть суждение владельца/architect, не следствие кода.
- Дом обеих: `F6-edge-identity-design.design.md:167-199` (таблица маршрутов + названные ловушки).
- **provisional до S3? ДА (обе).** B(a) — формальность S3; B(b) — направление кладётся на силе
  БУМАЖНОЙ рекомендации, первая реальная фальсификация = `time-on-edge` в S3
  (`two-laws.invariant-candidate.md:50-55,87-89`; U-L1 Instance 2). Разница: B(a) владельцу
  подтверждать НЕ надо (закроется тестом), B(b) — надо (это и есть выбор формы).

## Связь с S3 fix-class (открытый под-вопрос `01-s3scope §6`)

`01-s3scope.analysis.md:134-139` оставляет открытым fix-class для S3: **стабильный `edgeId` на
frozen `Edge`-shape** (`types.ts:32-42`) vs **act-уровневый `supersedes`/correction-маркер**.
Согласуется ли направление B с этим выбором?

1. **Согласуется И ПОГЛОЩАЕТ.** Reify-first (грань B default) делает выбор edgeId-vs-supersedes
   **fallback-only**: если стинт-с-жизненным-циклом повышается в ЕДИНИЦУ, у него вообще НЕТ
   edge-identity — он сворачивается как узел под proven payload-facet формой
   (`F6-edge-identity-design.design.md:145-163`). edgeId/supersedes нужен ТОЛЬКО остаточному
   классу «голый корректируемый интервал» (Option A).
2. **Внутри Option A они НЕ соперники, а слои.** `edgeId` = механизм идентичности; `supersedes: edgeId`
   = ОПЦИОНАЛЬНАЯ аудит-форма «тот же id, скорректирован» (`F6-edge-identity-design.design.md:44,47-48`).
   Дедуп ведёт равенство `edgeId`; `supersedes` — не альтернативный ключ, а провенанс-сахар сверху.
3. **Зависимость ОДНОСТОРОННЯЯ** (`01-s3scope.analysis.md §5(d)`): Q-F6confirm ССЫЛАЕТСЯ на итог
   s3scope; s3scope НЕ ждёт F6. → S3 выбирает fix-class внутри своей волны (architect+critic),
   уже зная: reify-first сужает вопрос до fallback-класса, а в нём edgeId — первично, supersedes — аудит.

**Формулировка зависимости для владельца:** подтверждение грани B = «reify-first» НЕ обязывает выбрать
конкретный fix-class сейчас — оно СУЖАЕТ поле выбора S3, оставляя fix-class инженерным под-решением S3
(не owner-форк, `01-s3scope §6`).

## Честность — где компрессия балансировала на грани смугла (для critic)
1. **Расщепление A/B.** Риск: подать грань A как «уже принято» (она `decided-pending-owner`, не принято).
   Защита: статус в frontmatter и в таблице явно `pending-owner`; строка A несёт условие «ПРИ УСЛОВИИ сузить
   F6…», не декрет. **Критику проверить:** не читается ли расщепление как тихая ратификация A.
2. **«Reify-first» как default.** Риск: default звучит как решённое направление. Защита: source
   (`F6-edge-identity-design.design.md:167`) сам подаёт это как ЛИНЗУ («owner/architect decides»);
   грань B помечена provisional-до-S3. **Критику проверить:** не звучит ли «по умолчанию» как выбор за владельца.
3. **Поглощение fix-class reification'ом.** Риск: объявить open sub-question `01-s3scope §6` закрытым.
   Защита: явно сказано «S3 выбирает fix-class в своей волне» — поглощение СУЖАЕТ, не закрывает. **Критику
   проверить:** не протащено ли «edgeId выбран» вместо «edgeId первичен В fallback-классе, решает S3».
