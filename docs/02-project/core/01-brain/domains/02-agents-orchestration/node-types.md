---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: node-type-registry
domain: agents-orchestration
Related:
  - README.md
  - edge-types.md
  - ../../synthesis/2026-07-12-fable-db-module/C-orchestration-tenancy.md
---

# Node-types домена 02 (реестр)

Все — строки реестра `node-type` на общем субстрате (узлы+рёбра), не отдельные таблицы. Паспорт тонкий,
специфика — в payload.

## Personality
Шаблон агента: роль, системный промпт, дефолтная policy. **Глобальна — одна на флот** (не на проект, не
на слот). `scope: global`. Payload: промпт/инструкции; паспорт: `personalityId`, `name`, `committed`.
От неё штампуются AgentSlot (C2).

## AgentSlot
Резервирование исполнения: «шаблон → слот». Поля: `personalityId`, `boundTopicId?`, `mode: bound|background|task`,
`replicaOf?`. `scope: project` (привязка к конкретному чату/проекту) поверх глобальной Personality.
Инвариант «≤1 Active на слот» — **partial unique index**, не код (I-2: поведение движком, не хардкодом).
Репликация = штамповка нового AgentSlot с `replicaOf` на родителя; **память не шарится** между репликами.

## Session
Память слота на время исполнения. Держит `sessionKey`, привязку к `AgentSlot` (`bound-to`), окно
контекста/резюме. **Открытый вопрос (см. README):** содержимое памяти агента — payload Session или
thin-ref на узлы домена 01? Рабочая гипотеза — второе (Session = координата, не хранилище).

## ChannelBinding (conversationRef)
Channel-нейтральная привязка: `conversationRef = channel:conversationId` (напр. `telegram:1112667160:56`).
Паспорт: `channel` (telegram/discord/email/cron…), `conversationId`, проекция канала (для Telegram —
`Topic.threadId`, per `cwd`-биндинг из `config.json` шлюза). Новый канал = новая строка `channel`, схема
не меняется (C4). Детали — `modules.md` → M-P2.

## Observation / WorkLog
**Append-only журнал-шина**, общий позвоночник модуля (C5). Одна запись: `(tenantId, slotId, sessionKey,
conversationRef, phase, cost, ts)`. Пишут ВСЕ механики (агенты · telegram · память · петли) в ОДИН поток;
читают петли (гейты), кокпит (M-P4), метаболизм памяти. Fable self-report токенов/контекста — один из
источников Observation, не отдельный тип.

## Pattern / Task (кросс-ссылка, детально в M-P3)
Узлы петель (Loop Engineering): паттерн описан данными, не кодом. Здесь появляются только как сосед
через `verified-by` (см. `edge-types.md`) — исполнитель не ставит done, ставит верификатор. Полное
раскрытие — модуль M-P3 (не в фокусе этой сессии, см. `../../architecture/MODULES.md`).

## Что НЕ здесь
Payload файлов/заметок/задач владельца — домен 01. Реестр типов/policy-схема самого движка — M-G3
(глобальный модуль, не этот домен).
