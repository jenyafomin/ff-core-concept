---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: orchestration-board
Related:
  - NEXT-SESSION-brief.md
  - MODULES.md
---

# 🎛️ Оркестрация 2026-07-12 — параллельный разбор архитектуры (Fable-режим)

Цель: за ~30 мин углубить модули и домены по единому шаблону — руками агентов. Каждый агент = своя папка
(без конфликтов записи). Синтез и адверсариальная проверка — после возврата.

## Единый шаблон deep-dive
`назначение · node-type/edge-type · policy-as-data · поведение-в-БД · память · global/project ·
кросс-связи · 🔴 сейчас / 🟢 позже · открытые вопросы (Fable)`

## Процессы (fan-out)
| # | Трек | Что | Папка | Агент |
|---|---|---|---|---|
| A1 | BRAIN | M-G1 Движок памяти | `architecture/modules/M-G1-memory-engine/` | architect |
| A2 | BRAIN | M-G3 Реестр типов + policy | `architecture/modules/M-G3-type-registry-policy/` | architect |
| A3 | BRAIN | M-G4 Локальность/резиденция | `architecture/modules/M-G4-locality-residency/` | architect |
| A4 | BRAIN | M-G5 Идентичность/самость | `architecture/modules/M-G5-identity-self/` | architect |
| A5 | BRAIN | Домен 01 Граф знаний (folder-form) | `domains/01-knowledge-graph/` | analyst |
| A6 | AGENTS | M-G2 Оркестратор/диспетчер | `architecture/modules/M-G2-orchestrator/` | architect |
| A7 | AGENTS | M-P3 Петли / Loops | `architecture/modules/M-P3-loops/` | architect |
| A8 | AGENTS | Домен 02 + M-P2 Telegram + M-P4 Кокпит | `domains/02-agents-orchestration/` | analyst |

## После возврата
Синтез оркестратора → матрица `домен × модуль` из готовых механизмов → адверсариальная проверка спорных
(policy-каскад, границы модулей) → кандидат в ADR «Единый граф-субстрат + модульная архитектура».
