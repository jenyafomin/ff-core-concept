---
node_type: analysis
status: draft
topic: rentacar-understanding
owner: jenya.stasik@gmail.com
date: 2026-08-16
source: scout-wave-2026-08-16
---

# Реестр · 04 · Карта существующих доков (два дома) + gaps

> Ключевой вывод: понимание НЕ на нуле. Реестр = свести два дома в единую карту + подсветить
> дыры, а не документировать заново.

## Дом 1 — реальный проект `RENTACAR_EXCEL_ANALYTICS/docs/`
- `CLAUDE.md` — стек, фаза 5, 6 ролей, правила кода, решения.
- `docs/product/PROJECT_CHARTER.md` (Approved) · `CONSTRAINTS.md`.
- `docs/DATA-MODELS.md` — справочник сущностей (14 доменов, enum'ы, полиморфизм, 250+ строк).
  > ⚠ **Правка (критик): док УСТАРЕЛ** — датирован 2026-04-02, HEAD кода 2026-06-03; описывает 14
  > доменов против 20+ в коде (лаг). **Реальные entity уже содержат то, чего в реестре НЕТ и что
  > прямо важно для FF:** `Customer.trustLevel` (ETrustLevel), sync-gate (`source`/`syncLock`/
  > `lockedFields`), PII вынесен (passport/DOB убраны), `tenantId` (заготовка мульти-компании —
  > частично ОТВЕЧАЕТ на «изоляция неясна»). ⇒ перед ТЗ (Фаза-2) сканировать РЕАЛЬНЫЕ entity-файлы,
  > а не только этот док. Это = крупнейший пропуск v0 (V3 Доверие / V7 Согласие).
- `docs/architecture/ARCHITECTURE.md` · `COMPONENT-MAP.md`.
- **`docs/ba/`** — бизнес-аналитика: `00_EXECUTIVE_SUMMARY` · `01_scope_and_goals` (RACI) · **`02_bp_coverage` (BP1–BP17!)** · `03_business_rules_verification` · `04_data_flow_integrity` · `05_financial_calculations` · `06_notification_coverage` · `07_gap_register` · `RBAC-analysis`.
- `docs/plan/domains/*` · `docs/spec/*` (SPEC-p2, abac-fields) · `docs/orchestration/decision-log.md` · `spreadsheets.md`.

## Дом 2 — FF brain (дизайн-линия) `docs/03-projects/ga-rentacar/`
Ценности v1→v3 + критика, форки F-3/F-4/F-5, движок-мост (timeliness), spine P1-P2 собран (engine 92/92), визард owner-решений S0-S9, модель узел/ребро/passport/дедуп-`same-as`, линзы (customer/vehicle/investor), specs ingest/acts/observation/m2/m3/durable-store.

## Перекрытия (одно и то же в двух домах)
| Тема | FF brain | Реальный проект | Разница |
|---|---|---|---|
| Роли | из CRM, без деталей | 6 ролей в RBAC-analysis | FF без DRIVER |
| Сущности | по именам | DATA-MODELS.md field-level | FF концепт, real реализация |
| Дедуп | `same-as` рёбра, ручной ревью | не адресован (Sheets=канон) | FF проектирует, real избегает |
| Investor P&L | «будущая аналитика» | InvestorContract + частичная формула | real есть структура |
| ABAC | отложено | primitives + decision-tree (без enforcement) | real внедряет |
| Telegram | агент пишет факты в граф | notification-скелет (не подключён) | FF замыкает петлю, real — инфра |

## Gaps — чего реестру ещё не хватает (в questions/)
**Данные:** ER-диаграмма (визуал) · PII-матрица (поле × роль × retention) · тест-датасет (4100 заказов) · точный маппинг колонка→поле · правила денормализации.
**Бизнес:** Investor P&L worked-examples · Fine FIFO (когда считается) · state-machine заказа · формула интервала обслуживания · точные триггеры нотификаций.
**Архитектура:** режимы отказа синка/recovery · темпоральная консистентность (как агент знает, что данные устарели) · точки эмиссии событий · аудит/retention · где секреты/шифрование.
**Governance/brain:** владение данными по ролям · может ли агент писать обратно в Sheets · стратегия ручного оверрайда без потери · политика версионирования снапшотов.
**Интеграция:** MCP-обёртка над CRM · деплой-топология/бэкап.

## Реассембл (LOSE-NOTHING)
Реестр НЕ копирует контент двух домов — линкует и синтезирует. При расхождении «дизайн (FF) vs реализация (real)» — со-размещаем, синтез агент+критик, не деструктив.
