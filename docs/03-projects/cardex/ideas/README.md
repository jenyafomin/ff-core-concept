---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-03
Scope: project
---

# Идеи Cardex — дерево по бизнес-смыслу

Папки — это **бизнес-смысл**, а не тип узла. Дерево идёт **от абстрактного к конкретному**: от ядра (в чём противоречие) к тому, кто и как с этим работает и на чём всё крутится. Каждая идея — свой файл; когда идея растёт — превращается в свою папку с analyses/ questions/ decisions/ и живёт в своей же теме. **«Паркован» — это статус (⏸ в шапке), а не папка:** паркованная идея лежит в своей смысловой теме, просто помечена.

Приоритет (T1–T4) — оверлей: живёт в шапке каждой идеи (`Tier:`), а не отдельным списком. Полная карта приоритетов — в `../priorities.md`.

## 7 тем

### 1. Ядро (core)
_Противоречие, вокруг которого всё._
- [N0 — Единое место vs своя логика](core/N0-central-tension.md) (T1)

### 2. Сделки и бизнес-процесс (deals-process)
_Сердце бизнеса: как устроена сделка._
- [I3 — Вариативность сделок](deals-process/I3-deal-variability.md) (T1)

### 3. Клиенты (clients)
_Привлечение и работа с клиентами._
- [C1 — Клиенты и кошельки](clients/C1-clients-wallets.md) (T1)
- [D1 — Онбординг клиента / KYC](clients/D1-onboarding-kyc.md) (T3)
- [I1 — Raids](clients/I1-raids.md) (T4) ⏸ ПАРКОВАН

### 4. Команда, роли и контроль (team-control)
_Кто делает и кто контролирует._
- [R2 — СБ (безопасность / доступы)](team-control/R2-security.md) (T1)
- [R4 — Кассиры (учёт счетов)](team-control/R4-cashiers.md) (T1)
- [R1 — Менеджер](team-control/R1-manager.md) (T3)
- [R3 — Операционисты](team-control/R3-operations.md) (T3)
- [R5 — Админы (~7)](team-control/R5-admins.md) (T3)
- [G1 — Аудит и история изменений](team-control/G1-audit-history.md) (T3)

### 5. Деньги (money)
_Где маржа и как всё сходится._
- [M1 — Монетизация / юнит-экономика](money/M1-monetization.md) (T2)
- [P1 — Ценообразование / спред-движок](money/P1-pricing-spread.md) (T2)
- [G2 — Сверка балансов (реконсиляция)](money/G2-balance-reconciliation.md) (T2)
- [I2 — Бухгалтерия / «стены»](money/I2-accounting-walls.md) (T4) ⏸ ПАРКОВАН

### 6. Поверхности / User-friendly (experience)
_Как видят систему и взаимодействуют с ней._
- [I4 — Отчёты и агрегации](experience/I4-reports-aggregation.md) (T2)
- [U1 — Telegram Mini Apps](experience/U1-telegram-mini-apps.md) (T3)
- [U2 — Уведомления и алерты](experience/U2-notifications-alerts.md) (T3)

### 7. Инфраструктура и автоматизация (infra-automation)
_На чём всё крутится._
- [X3 — Интеграции и курсы бирж](infra-automation/X3-integrations-rates.md) (T2)
- [D2 — Справочники (валюты / кошельки / биржи)](infra-automation/D2-reference-data.md) (T3)
- [X4 — Команды агентов / автозакрытие](infra-automation/X4-agents-autoclose.md) (T4)
- [X1 — DevOps: размещение частей](infra-automation/X1-devops-placement.md) (T4)
- [X2 — Что переделать](infra-automation/X2-rework.md) (T4)
