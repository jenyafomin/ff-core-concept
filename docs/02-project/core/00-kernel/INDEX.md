---
id: kernel-index
node_type: index
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
scope: project
related:
  - ./terminology.md
  - ./invariants.md
  - ./axes-and-time.design.md
  - ./open-questions.md
  - ./kernel-acceptance-tests.md
  - ../../../00-states/00-global-build/realization-plan/phase-1-engine/README.md
  - ../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md
  - ../../../architecture/ADR/ADR-0005-data-substrate-structure.md
---

# 00-kernel — канон строгости ядра-субстрата (навигатор)

**00-kernel** = канон строгости субстрата-ядра (микроядро под `brain` + `agents`). Здесь фиксируется,
что движок **ОБЯЗАН** гарантировать (инварианты) и **КАК** мы называем примитивы (терминология). Родилось
из GPT-ревью + совета 3 линз, ночная итерация **2026-07-25**.

> **PLACEMENT (важно):** дом выбран **автономно ночью** (handoff 2026-07-25); владелец может перенести узел —
> **ОБРАТИМО**. Кандидат-альтернативы: `docs/product/` (сейчас НЕ существует) или `docs/01-organization/`.
> Флаг владельцу поднят в STATE.

## Файлы узла

| Файл | Что внутри |
|------|-----------|
| [`terminology.md`](./terminology.md) | Словарь ядра: 12+ терминов; два уровня — PUBLIC (4 кубика) vs KERNEL-STRICT примитивы; scope≠actor; открытые вопросы §7 |
| [`invariants.md`](./invariants.md) | I-1..I-14 критических инвариантов ядра (identity, acts, projections, policy, storage, plugins, semantic) + карта «инвариант → тест ядра» |
| [`axes-and-time.design.md`](./axes-and-time.design.md) | Оси адресации `thing × actor × scope × lens × time`; actor≠scope (вердикт: ADR-0004 уже корректен, нужна лишь глосса); битемпоральные поля `recordedAt/validFrom/validTo` на `acts[]` (движок as-of ОТЛОЖЕН, D-5) |
| [`open-questions.md`](./open-questions.md) | Реестр KQ-1..KQ-14 — все открытые решения субстрата, собранные за ночь (по областям, с провенансом и «кто решает»); топ-3 блокера: persistence-ADR · sum(cost) R1/R3 · trace-leg redaction |
| [`kernel-acceptance-tests.md`](./kernel-acceptance-tests.md) | 7 практических тестов ядра (add-type·semantic-as-plugin·rebuild-index·as-of·deny-field-everywhere·plugin-upgrade·explain-chain) → матрица T→I; вскрыл дыры покрытия: I-12 без реального теста, I-7/8/9/10 частичны (через partial T-5), I-10 partition не гонялся на мульти-scope |

**Соседние доки движка (в других домах):** `act-kinds.design.md` (потоки `ActKind`, в `02-agents/.../03-schema/`) ·
`kernel-runtime-plugins.design.md` (граница + PluginManifest, в `02-agents/.../08-core-and-modules/`).

**Планируется** (room to grow): интеграция битемпоральных полей · killer-прогон семантики (A-2) · persistence ADR (C5).

## 🌱 Корневой билд / печать шва (2026-07-31)

> Родился из pre-root раунда (4 линзы + рабочая команда, проверено кодом). Корень = **уже-построенный CQRS-шов**
> (`@ff/engine`, 44/44, commit `2c8d177`), который надо **запечатать**. Знание durable здесь; трейс — в `_log/` (gitignored).

| Файл | Что внутри |
|------|-----------|
| [`decisions/ADR-DRAFT-root-seal-durable-store.md`](./decisions/ADR-DRAFT-root-seal-durable-store.md) | Кандидат **ADR-0009**: контур корня S1–S8 · 3 пробела (durable StorePort · admission one-home · append-only-forward) · 4 движоковых долга = приёмка. ⚠ code-верификация W2: durable-store физически ОТСУТСТВУЕТ (RAM), домен утёк в `predicates.ts` (граница пробита). ⏳ 4 P0 владельцу |
| [`durable-storeport.design.md`](./durable-storeport.design.md) | Контракт S7: durable append-on-write · rebuild-on-boot · single-writer · инвариант **survive-turn**; `sync`\|`async` decision-node ⏳ |
| Фундамент read/write (дом brain): [`../01-brain/decisions/ADR-DRAFT-fork-discipline-read-write-planes.md`](../01-brain/decisions/ADR-DRAFT-fork-discipline-read-write-planes.md) | Инвариант «read = и-так-и-так / write = один-дом» = **топология** корня, не политика поверх |
| Сверка канон↔код: [`../../../01-organization/process/2026-07-31-canon-vs-code-reconcile.analysis.md`](../../../01-organization/process/2026-07-31-canon-vs-code-reconcile.analysis.md) | DL-15/16/21 vs реальность — предложения владельцу |

## Связанные якоря

- **Фаза 1 — движок:** [`phase-1-engine/README.md`](../../../00-states/00-global-build/realization-plan/phase-1-engine/README.md)
- **ADR-0004** (LSR + capability access): [`ADR-0004`](../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md)
- **ADR-0005** (структура субстрата данных): [`ADR-0005`](../../../architecture/ADR/ADR-0005-data-substrate-structure.md)
- **GPT-ревью 1** (RAG vs система): [`1-overview-rag-vs-system.md`](../../../_inbox/1-gpt-review/1-overview-rag-vs-system.md)
- **GPT-ревью 2** (направление / terminology / PluginManifest): [`2-overview-direction.md`](../../../_inbox/1-gpt-review/2-overview-direction.md)
- **Ночной handoff** 2026-07-25: [`_log/2026-07-25-phase-1-design/HANDOFF.md`](../../../_log/2026-07-25-phase-1-design/HANDOFF.md) *(trace, gitignored)*
