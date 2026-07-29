---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-26
node_type: index
title: Концепт — граф знаний, деревья документов и ветки кода (git), через проекции
needs_home: true
related:
  - ../../../../../architecture/ADR/ADR-0006-persistence-as-policy.md
  - ../../invariants.md
  - ../../prefer-properties-over-poles.design.md
---

# 🕸️↔🌳↔🔀 Концепт: граф ↔ дерево ↔ git (через проекции)

> **Ранняя концепция (L0/L1).** Держим ВЫСОТУ: растим вопросами, не строим. Заведён как ОДИН дом
> (консолидация ВГЛУБЬ, KQ-14), линкующий существующие опоры — а не сирота.

## Файлы
- **`01-capture.idea.md`** — захват концепции владельца + грунт + фокус-вопросы (концепт-first).

## Откуда пришло
Владелец (голос 2026-07-26): накидал концепцию поверх ратификации ядра. Trace →
`docs/_log/2026-07-26-kernel-ratification-unblock/r3-graph-tree-git-concept/`.

## Существующие опоры (линкуем, не переоткрываем — explorer 2026-07-26)
- Нить «brain-граф дублирует папки → агент общается через граф» = **кандидат в ADR** (STATE L130).
- **ADR-0006** persistence-as-policy: «одна адресуемая модель над многими стораджами» (git-ветки = ещё стор?).
- **KQ-11** (проекция·observation-act) + **I-5/I-11** (состояние=проекция, истина=граф).
- **doc-tree закон #1**: trace ⟂ knowledge (git-история = trace-вещество?).
- `cross-system-loop.md` §3.2 (граф как субстрат, стыки Brain↔Agents).
