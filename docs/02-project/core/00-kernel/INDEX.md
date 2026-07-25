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

**Планируется** (room to grow): `open-questions.md` · `act-kinds` (домены потоков `ActKind`) ·
граница `kernel / runtime / plugins` · `PluginManifest`.

## Связанные якоря

- **Фаза 1 — движок:** [`phase-1-engine/README.md`](../../../00-states/00-global-build/realization-plan/phase-1-engine/README.md)
- **ADR-0004** (LSR + capability access): [`ADR-0004`](../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md)
- **ADR-0005** (структура субстрата данных): [`ADR-0005`](../../../architecture/ADR/ADR-0005-data-substrate-structure.md)
- **GPT-ревью 1** (RAG vs система): [`1-overview-rag-vs-system.md`](../../../_inbox/1-gpt-review/1-overview-rag-vs-system.md)
- **GPT-ревью 2** (направление / terminology / PluginManifest): [`2-overview-direction.md`](../../../_inbox/1-gpt-review/2-overview-direction.md)
- **Ночной handoff** 2026-07-25: [`_log/2026-07-25-phase-1-design/HANDOFF.md`](../../../_log/2026-07-25-phase-1-design/HANDOFF.md) *(trace, gitignored)*
