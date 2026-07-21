---
id: state-01-tree-rules-and-librarian
node_type: state
theme: Правила дерева · doc-discipline · библиотекарь (КАК мы работаем)
status: active
owner: jenya.stasik@gmail.com
opened: 2026-07-19
updated: 2026-07-19
agents: [orchestrator-fable]
handoff: ../../_log/2026-07-19-restructure-orchestration/HANDOFF.concept.json
last_session: 2026-07-19-restructure-orchestration
plans:
  - ../../01-organization/doc-discipline/restructure-2026-07/MAP-target.md
  - ../../01-organization/doc-discipline/restructure-2026-07/SKILL-UPGRADE-PROPOSAL.md
Related:
  - ../README.md
  - ../../01-organization/doc-discipline/restructure-2026-07/README.md
---

# 📍 STATE-01 — Правила дерева + библиотекарь

> Реальный экземпляр `state` (дог-фудим механизм оркестрации). R2: дом `docs/00-states/`, тонкая
> схема; истина — по ссылкам. Статус = живое (пока md-линза; станет узлом+актами при build).

## На чём работаем (тема)
Общие правила дерева документов, дисциплина `doc-discipline`, механизм **библиотекаря** (навык-раннер),
единый `_log`, нумерация R1, распределённые decisions. Это слой «КАК мы работаем».

## Привязанные планы
1. **Реструктуризация 2026-07** — `restructure-2026-07/` (две карты + миграция исполнена).
2. **Апгрейд doc-discipline** — `SKILL-UPGRADE-PROPOSAL.md` (U-1..6, ждут «да» → agent-builder).

## Открытые развилки этого state
- U-6: свести `_log`↔`session-logging` (в работе — модель `_log` создана).
- U-1..5: применить апгрейд скилла (детерминир. хук — главный рычаг).
- Легаси-нумерация тем (`architecture/ values/`) — перенумеровать по R1.

## Текущий статус
`active` · открыт 2026-07-19 · ведётся оркестратором. Лог хода — `log.md`.
