---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: module-registry
domain: agents-orchestration
Related:
  - README.md
  - node-types.md
  - edge-types.md
  - policy.md
  - ../../architecture/MODULES.md
---

# Модули домена 02 — M-P2 (Telegram-адаптер), M-P4 (Кокпит)

Шаблон (единый для всех модулей проекта): назначение · node/edge · память · кросс-связи · global/project ·
сейчас/позже. Полный реестр — `../../architecture/MODULES.md`.

## M-P2 — Telegram-адаптер

**Назначение.** Конкретная реализация channel-нейтрального `conversationRef` для Telegram: проекция
`Topic.threadId`, PROMPT.md-каскад (chat-уровень → topic-уровень), биндинг топика к `cwd` проекта. Уже
работает как код в `agents-manager` (шлюз) — этот модуль формализует его в схему домена.

**node/edge.** `ChannelBinding` (payload: `channel: telegram`, `conversationId`, `threadId`) —
`channel-bound`→ строка типа `telegram` в реестре channel-type; `ChannelBinding` —`bound-to`→ `AgentSlot`
через effective-binding вид (каскад чат→топик→слот). `AgentPolicy` (M-P2-специфичная, из `policy.md`)
регулирует, кто одобряет пейринги — override вниз запрещён на уровне global policy (проектный `CLAUDE.md`:
«агент НЕ одобряет пейринги сам»).

**Память.** Только привязки каналов (тонкие паспорта): `threadId`, `cwd`-путь, `reply_to`-конвенция —
НЕ содержимое переписки (то — Session/домен 01).

**Кросс-связи.** → M-G2 (оркестратор резолвит `AgentSlot` по `bound-to`) · → M-P4 (каждая проекция канала
тэгирует записи Observation/WorkLog `conversationRef`, читается кокпитом) · → домен 01 (Session ссылается
на память диалога thin-ref, не дублирует).

**Global/project.** Сам адаптер — module-level global (доступен всем проектам через шлюз); конкретные
привязки топик→проект — project-scoped данные (одна строка `ChannelBinding` на топик).

**🔴 Сейчас.** Формализовать `conversationRef`+`Topic.threadId` как node/edge (уже есть как рабочий код,
перенести в схему без потери поведения). **🟢 Позже.** Другие каналы (Discord/email/cron) — новая строка
channel-type, ноль изменений схемы (C4); множественные боты на один проект.

## M-P4 — Кокпит / наблюдаемость

**Назначение.** «Кто-где-сколько»: обзор флота (Personality × AgentSlot × Session), cost, + Fable
self-report токенов/контекста. Не источник данных — read-модель.

**node/edge.** Не создаёт новых node-type для чтения: агрегирует `Observation/WorkLog` через `reports-to`
рёбра от `AgentSlot`/`Session`. Кокпит = **`view-def`** (декларативный вид над журналом), не отдельная
таблица — держит I-2 (поведение данными, движок исполнитель).

**Память.** Read-only проекция над append-only журналом (`tenantId, slotId, sessionKey, conversationRef,
phase, cost`); сама ничего не пишет, кроме, возможно, снапшотов агрегатов (кэш вида, не источник истины).

**Кросс-связи.** ← M-G2 (оркестратор пишет WorkLog) · ← M-P2 (conversationRef-тэги от Telegram) · ← M-P3
(петли пишут gate/cost события) · → policy.md (cost-cap policy читает те же агрегаты для гейтов).

**Global/project.** Один и тот же журнал, два фильтра вида: глобальный (весь флот, все проекты) и
project-scoped (`tenantId`-фильтр) — не два разных модуля, один view-def с параметром scope.

**🔴 Сейчас.** Схема журнала (уже в списке «заложить сейчас» синтеза БД-модуля) + Fable self-report как
один из источников Observation (не отдельный тип узла). **🟢 Позже.** Богатые cost-дашборды, per-tenant
billing, материализация вида (cache вместо live-запроса при росте объёма).
