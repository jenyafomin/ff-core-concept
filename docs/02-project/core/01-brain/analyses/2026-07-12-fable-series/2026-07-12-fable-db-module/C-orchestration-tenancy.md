---
node_type: fable-council-lens
lens: C — оркестрация и мульти-арендность
Date: 2026-07-12
source: Fable
---

# Линза C — ОРКЕСТРАЦИЯ и МУЛЬТИ-АРЕНДНОСТЬ

## Механики
- **C1 · Тенант-ось: `tenantId` + абстрактный `conversationRef = channel:conversationId`.** Telegram-топик = один вид channel; Telegram-поля только в проекции `Topic.threadId`. Индексы `(tenantId, canonicalId)`.
- **C2 · Personality→AgentSlot→Session = «шаблон → резервирование → исполнение».** Personality глобальна (одна на флот). Slot = привязка (`personalityId, boundTopicId?, mode(bound|background|task), replicaOf?`). Session = память слота. «≤1 Active» = partial unique index, не код. Репликация = штамповка слотов `replicaOf` (память НЕ шарится).
- **C3 · Control-plane / data-plane split.** БД оркестратора = ТОЛЬКО тонкие паспорта + `DataResidency`; payload в проектных БД. Уровень `orchestrator-global` + `fetchInstruction` = «оркестратор знает где что, не вскрывая».
- **C4 · Endpoint-биндинг как каскадная проекция.** `conversationRef → AgentSlot` + вид «effective binding» (каскад чат→топик→слот, как каскад PROMPT.md шлюза). Новый канал (Discord/e-mail/cron) = строка channel-типа, ноль схемы.
- **C5 · Observation/WorkLog как шина модуля.** Все 4 механики (агенты·telegram·память·петли) пишут в ОДИН append-only журнал `(tenantId, slotId, sessionKey, conversationRef, phase, cost)`. Петли читают для гейтов/cost-cap; кокпит — «кто-где-сколько»; память — метаболизм. Позвоночник.

## Стыки
- **→ A:** C3 и «тонкие паспорта + материализация» = ОДИН механизм, одна `DataResidency`; общий словарь `storageLevel`. Не строить два реестра.
- **→ B:** Personality/Slot/Session/Topic = УЗЛЫ; `bound-to/replica-of/reports-to/verified-by` = типизированные РЁБРА (thin-ref); Pattern/Task петель — те же узлы+рёбра. Оркестрация = типы рёбер + policy-as-data.

## Сейчас / позже
СЕЙЧАС: `tenantId` с дефолтом; UUID; `storageLevel/committed/localOnly`; channel-нейтральный `conversationRef`; `mode`+`replicaOf`; partial-index «≤1 Active»; append-only журнал.
ПОЗЖЕ: физический раскол per-project; ACL/visibility enforcement; Postgres; материализация live/cache/copy; менеджмент флота реплик; кросс-тенант шаринг.

## Риск
**Control-plane как второй источник истины** (F3, размноженный на все проекты). Лечение (закладывается сейчас): паспорт = выводимая проекция, перестраиваемая с нуля; поток истины строго снизу вверх; руками не правится.
