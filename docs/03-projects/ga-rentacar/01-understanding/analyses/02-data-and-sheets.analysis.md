---
node_type: analysis
status: draft
topic: rentacar-understanding
owner: jenya.stasik@gmail.com
date: 2026-08-16
source: scout-wave-2026-08-16 (read-only, secrets NOT read)
grounds: /Users/mac16/Documents/IT/Apps/PROJETS/RENTACAR_EXCEL_ANALYTICS
---

# Реестр · 02 · Данные и Google-таблицы

> Что «включает каждая табличка» (запрос владельца). Источник — код sync-конфигов и
> `spreadsheets.md`/`docs/DATA-MODELS.md`. Секреты (`service-account.json`, `.env`) НЕ читались —
> id таблиц взяты из не-секретных доков; при шеринге наружу редактировать.

## 3 Google-таблицы (источники)
| Таблица | Назначение | Доступ |
|---|---|---|
| **IMP & EXP** | Главный CRM-источник: заказы, транзакции CRM, штрафы, обслуживание | Service-account readonly |
| **Cars Connect** | Мастер-данные машин, привязка инвесторов | readonly |
| **Transactions** | Бухгалтерия EXP (текущие + исторические) | readonly |

## Вкладки (что внутри)
**IMP & EXP:** Orders (заказы: rate, invoice, paid, remaining, customer, vehicle, dates, status) · Transactions (движения: amount In/Out, type, category, orderId, plate) · FINES (штрафы: customer, invoice#, vehicle, amount, source DUBAI POLICE|RTA) · UNPAID Traffic Fines (агрегат неоплаченных → обновляет поля Order) · Maintance (обслуживание: plate, odometer, компоненты, dates, status).
**Cars Connect:** EXP (машины: VIN, plate, mamaCrId, nodeId, project BRO|GA, investor, category, mark/model/year, status, expiry license/insurance).
**Transactions:** EXP Transactions (текущие: type Paid|Transfer|Income|Refund, spender, account Cash|Bank, amount+currency+rate, category, idCar, investor) · EXP Transactions (old) (архив).

## Сущности ← источник (маппинг)
| Сущность | Источник | Ключ | Записей (~) |
|---|---|---|---|
| Vehicle | Cars Connect / EXP | plateNumber (PK) | ~20 активных |
| Order | IMP&EXP / Orders | orderId (PK) | сотни–~4100 за жизнь |
| Transaction (CRM) | IMP&EXP / Transactions | (externalId, source='Node') | тысячи |
| Transaction (EXP) | Transactions / EXP | (externalId, source='Accounting') | тысячи |
| Fine | IMP&EXP / FINES | fineId (PK) | сотни |
| Maintenance | IMP&EXP / Maintance | plate (1:1 снапшот) | ~20 |
| **Customer** | АВТО-создаётся из Order+Fine | mobile (PK) | сотни |
| **Investor** | АВТО-создаётся из Vehicle+Transaction | name (PK) | ~10–20 |

> ⚠ **Правка (критик 2026-08-16): «Ключ» выше = уникальный БИЗНЕС-ключ, НЕ первичный.**
> PK везде = `id` (auto-increment). `mobile`/`name`/`plateNumber` — UNIQUE-ключи для дедупа и
> FK-релинка. Критично для FF-модели тождества (V2): не путать «ключ дедупа» с PK, иначе
> downstream-дизайн canonical_id получится кривым.

## Граф сущностей (ядро)
`Vehicle(plate)` ← Orders(orderId) ← Fines(invoice→order) · Transactions(plate/idCar) · Maintenance(plate, дельта → MaintenanceSession). Customer(mobile) и Investor(name) — деривативы. FK-релинк ПОСЛЕ синка: сырое значение (plate, name, orderId) → PK в БД.

## Как код читает таблицы (без секретов)
GoogleSheetsService (auth service-account, scope `spreadsheets.readonly`) → SyncEngineService (парсит 2D-массив по column-mapping) → 8 sync-конфигов → домен sync-services → RelinkService (FK) → BatchSyncOrchestrator → SyncScheduler (крон 30м/60м/3ч).

> ⚠ **Правка (критик): реальный порядок в `batch-sync-orchestrator.service.ts` —**
> **Vehicles → Customers → Orders → Fines → Maintenance → Transactions.** Customers идёт ВТОРЫМ,
> ДО Orders (комментарий в коде: Order FK→Customer.id резолвится по имени при синке Order, значит
> Customer-строки должны существовать раньше). Investor создаётся ВНЕ SYNC_ORDER (не в этом списке).
> Мой первый черновик ставил Customers последними — неверно, исправлено.

## Gaps/грязь данных (в вопросы + риск-лог)
- **phone=SIM, не человек** (турист/водитель) — дедуп Customer рискован (совпадает с FF-анализом).
- Soft-delete: строка исчезла из Sheets = ? (default `keep`, нет tombstone).
- Форматы дат разнородны (текст, кирилл-локаль в EXP).
- Maintenance.engineOil — денорм concat-строка, нестандартный сплит.
- Валюта: rate AED/USD хардкод/ручной, нет канон-FX.
- Investor P&L: формула частична (profitShare% vs monthlyFixed, visibleCategories JSONB — не живая).
- Fine FIFO-аллокация по Order — не сверяется с фактическими Transaction.
- Один orderId в CRM и EXP одновременно — GL-реконсиляция неясна.
