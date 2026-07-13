---
node_type: domain
domain: agents-orchestration
Status: superseded
Date: 2026-07-12
Related:
  - 02-agents-orchestration/README.md
---

# Домен 02 — 🤖 АГЕНТЫ / ОРКЕСТРАЦИЯ

> ⚠️ **SUPERSEDED (2026-07-12) — свёрнут в папку** [`02-agents-orchestration/README.md`](02-agents-orchestration/README.md).
> Этот stub оставлен как история/сырьё, дальше не редактируется. Читать новую структуру.

> Stub под углубление — **главный фокус след. сессии** (агентная система как архитектура в БД).

## Что здесь живёт (данные)
Personality (глобальна, одна на флот) · AgentSlot (`mode: bound|background|task`, `replicaOf`) ·
Session (память слота) · привязки каналов (`conversationRef = channel:conversationId`) · Pattern/Task петель ·
Observation/WorkLog (append-only журнал-шина).

## Как хранится
Подграф узлов + типизированные рёбра (`bound-to / replica-of / reports-to / verified-by`) на ТОМ ЖЕ субстрате —
не отдельная БД. Настройки: **глобальные (все проекты) vs под проект** через `scope` + policy-override.
Control-plane (тонкие паспорта) над data-plane (проектные БД).

## Инфра-модули (направление «от модулей»)
Диспетчер/оркестратор · **модуль планов** (позже; взаимодействует с БД и агентами) · telegram-адаптер ·
петли/loops (Loop Engineering) · кокпит «кто-где-сколько». Модули **кросс-связываются через БД** (единый connect
связей и знаний). Возможно **несколько разных агент-модулей**, подключаемых как плагины.

## Policy-as-data + поведение в БД (заложить)
**policy-as-data:** настройки «глобально (все проекты) ↔ под проект» = policy-узлы со `scope` + override-каскад,
а не хардкод per-проект. **Поведение:** оркестрация (Personality→Slot→Session), петли, привязки каналов =
**подграф** узлов + типов рёбер (`bound-to/replica-of/reports-to/verified-by`); диспетчеризация/гейты — движок
над append-only журналом (Observation/WorkLog), общий позвоночник, не отдельный код на каждый проект.

## Открытые вопросы домена (в след. сессию)
- Сколько агент-модулей и как они кросс-связаны (через какие типы рёбер)?
- Что глобально (все проекты), что под проект — правилом или движком?
- Локальное ↔ глобальное знание: что выводится наружу и как с ним взаимодействовать.
- Стык с доменом 01 (где живёт память агента).

## Ссылки
`../synthesis/2026-07-12-fable-db-module/C-orchestration-tenancy.md` ·
`../../../01-organization/session-handoff/2026-07-12-brain-concept-edges-flows/cross-ref-loop-engineering.md` ·
ВНЕ проекта: `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/00-organization/session-handoff/2026-07-12-loop-engineering-repo-analysis/03-db-design-tasks.md`
