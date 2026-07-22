---
node_type: fable-council-lens
lens: A — рост и локальность
Date: 2026-07-12
source: Fable
---

# Линза A — РОСТ и ЛОКАЛЬНОСТЬ

**Ядро:** схема растёт не вширь (DDL), а **по адресу** — форма единицы неизменна, меняется только ГДЕ живёт payload. Рост = смена residency, не переписывание схемы.

## Механики
- **M1 · Паспорт/payload как физический закон схемы.** Каждая единица = тонкий паспорт (`canonicalId, type, scope, storageLevel, committed, localOnly, provenance`) + 1:1 `DataResidency` (`inline|file|external-api`, `fetchInstruction`, `cachePolicy`). Паспорт всегда в БД оркестратора, payload — где угодно. Инвариант формы всей схемы.
- **M2 · Две ортогональные оси: `scope` ≠ `storageLevel`.** `scope` (общая·проект·агент·пользователь — КОМУ) и `storageLevel` (interaction→session→project→orchestrator-global→cache — ГДЕ). 5 уровней ↔ 3 scope совмещаются именно потому, что это РАЗНЫЕ оси. + движок-услуга promote/demote.
- **M3 · Федерация с одним индексом.** `canonicalId`=UUID; per-project БД и БД оркестратора имеют идентичную паспорт-таблицу; проектная = шард (residency=local); паспорта реплицируются вверх engine-duty.
- **M4 · Схема подчиняется R-C: миграции expand→migrate→contract.** `synchronize:true` = interaction-уровень (dev-песочница); миграции = committed-уровень. Метаданные схемы append-only, формы payload заменяемы.
- **M5 · Материализация = policy-as-data: live / cache+TTL / copy.** «Зеркалить в проект» = смена политики на паспорте (copy), не отдельный механизм.

## Стыки
- **→ B:** residency = тип ребра «паспорт-узел → узел-хост» (thin-ref); control-plane = граф над хост-узлами, ноль новых сущностей.
- **→ C:** Personality/Slot/Session = носители scope/tenantId в паспорте; тот же скан даёт и кокпит, и изоляцию; репликация бота = copy-материализация (переиспользует M5).

## Сейчас / позже
СЕЙЧАС: canonicalId-UUID; паспорт-колонки (пустые с дефолтами); таблица `DataResidency`; переход на миграции до первого переименования.
ПОЗЖЕ: физический сплит per-project; SQLite→Postgres; promote/demote; TTL-выселение; ACL-enforcement; live-фетчеры.

## Риск
**Индекс-как-вторая-истина** (F3-рассинхрон на всю федерацию). Противоядие: индекс = derived-кэш локальной истины, реплика ТОЛЬКО снизу вверх, руками не правится, rebuild — операция первого дня.
