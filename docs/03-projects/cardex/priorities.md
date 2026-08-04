---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-03
Scope: project
Related: INDEX.md, ideas/README.md, how-to-grow.md
---

# Приоритеты — оверлей поверх дерева (не линейный)

Приоритет **не** линейный список и **не** отдельная структура. Это **свойство каждой идеи** (`Tier:` в шапке файла в `ideas/`). Тема задаёт *бизнес-смысл*, приоритет — *отдельное измерение*, которое «прыгает» по темам.

Логика тиров: **нельзя автоматизировать или строить витрину того, чего не понял.**

## T1 — Несущее (понять сперва)
- `ideas/core/N0-central-tension.md` — единое место vs своя логика
- `ideas/clients/C1-clients-wallets.md`
- `ideas/team-control/R4-cashiers.md` — учёт счетов
- `ideas/deals-process/I3-deal-variability.md`
- `ideas/team-control/R2-security.md` — границы доступа

## T2 — Ценность и деньги
- `ideas/money/M1-monetization.md`
- `ideas/money/P1-pricing-spread.md`
- `ideas/infra-automation/X3-integrations-rates.md`
- `ideas/experience/I4-reports-aggregation.md`
- `ideas/money/G2-balance-reconciliation.md`

## T3 — Поверхность и удобство
- `ideas/experience/U1-telegram-mini-apps.md`
- `ideas/experience/U2-notifications-alerts.md`
- `ideas/team-control/R1-manager.md`, `ideas/team-control/R3-operations.md`, `ideas/team-control/R5-admins.md`
- `ideas/clients/D1-onboarding-kyc.md`
- `ideas/infra-automation/D2-reference-data.md`
- `ideas/team-control/G1-audit-history.md`

## T4 — Автоматизация и парковки
- `ideas/infra-automation/X4-agents-autoclose.md`
- `ideas/clients/I1-raids.md` ⏸, `ideas/money/I2-accounting-walls.md` ⏸
- `ideas/infra-automation/X1-devops-placement.md`, `ideas/infra-automation/X2-rework.md`

---

**Прыжки приоритета:** T1 разбросан по core / clients / team-control / deals-process — приоритет режет дерево поперёк тем. Тема ≠ приоритет.

**Как двигать:** меняешь `Tier:` в шапке идеи → эта карта отражает. Если T3/T4 блокирует старт — подними Tier в файле идеи и поправь тут.
