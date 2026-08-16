---
node_type: analysis
status: draft
topic: rentacar-understanding
owner: jenya.stasik@gmail.com
date: 2026-08-16
source: scout-wave-2026-08-16 (read-only inventory RENTACAR_EXCEL_ANALYTICS)
grounds: /Users/mac16/Documents/IT/Apps/PROJETS/RENTACAR_EXCEL_ANALYTICS
---

# Реестр · 01 · Карта системы (код/сервисы)

> Что реально построено в `RENTACAR_EXCEL_ANALYTICS`. Продакшн, не лендинг. Brain-first
> взгляд: каждый компонент — кандидат-узел; связи ниже — кандидат-рёбра. Дедуп с
> существующими доками брата (`docs/architecture/*`, `docs/DATA-MODELS.md`) — см. файл 04.

## Что это (одним абзацем)
Платформа аналитики автопарка. Поток: **Google Sheets → PostgreSQL (sync-engine) → REST API
(2 портала) → React-фронты + Telegram-алерты + история активности**. Монорепо Lerna/NPM
workspaces. Бэкенд NestJS + TypeORM. Фронты React 19 + Vite. БД Postgres (основная) + Mongo
(отчёты синка, TTL). Крон: NestJS Schedule + EventEmitter. Auth: JWT (15м access, 7д refresh).

## Компоненты (узлы) — component | путь | тип | что делает | связи
| Компонент | Путь | Тип | Что делает | Связи |
|---|---|---|---|---|
| NestJS Backend | `apps/back-end/src` | API-сервер | Порт 3000, роутит данные, оркестрирует синк, эмитит события, шлёт TG. Swagger `/api/docs` | Postgres, Mongo, Sheets API, TG, event-bus |
| **Sync Engine** | `apps/back-end/src/features/sync-engine/` | Фон-сервис (ЦЕНТР) | Читает Sheets → диффит old↔new → эмитит `created[]`/`updated[]`. 8 sync-конфигов, крон 30м–3ч | Sheets API, Postgres, event-emitters, Mongo |
| Telegram Alerts | `apps/back-end/src/features/telegram/` | Потребитель событий | Слушает домен-события → форматирует → шлёт в TG-чат | event-bus, все домены |
| Cron Boot | `apps/back-end/src/infrastructure/cron/` | Реестр джоб | Регистрирует NestJS Schedule джобы из доменов | домен-модули |
| Owner Dashboard (P1) | `apps/front/src` | React SPA (read) | Аналитика для SUPER_ADMIN: `/sheets`, `/db`, `/analytics` (recharts) | `/api/p1/*`, auth |
| Employee Portal (P2) | `apps/front-p2/src` | React SPA + PWA | CRUD для admin/manager/accountant/driver. 20+ доменов. ABAC на уровне полей | `/api/p2/*`, auth, ABAC |
| `@rentacar/types` | `packages/types/src` | NPM-пакет | Enums, интерфейсы, DTO, события — общий словарь | бэкенд + оба фронта |
| `@rentacar/abac` | `packages/abac` | NPM-пакет | ABAC: декораторы/guard/interceptor (бэк) + hooks/компоненты (React) | все домены, формы P2 |
| `@rentacar/react` | `packages/react/src` | NPM-пакет | Общие UI-компоненты (Radix/shadcn), React Query | оба фронта |
| PostgreSQL | (docker) | Реляц. БД | Источник рантайм-истины всех сущностей. TypeORM миграции | бэкенд |
| MongoDB | (docker) | Док. БД | Отчёты синка (TTL). Фолбэк в память если нет URI | sync-engine |
| Google Sheets API | `infrastructure/google-sheets/` | Источник данных | Service-account **readonly**. Читает по sheetId+range | sync-engine, домены |

## Слои инфраструктуры (бэкенд)
auth (JWT, LRU-кэш User 5м) · event-bus (EventEmitter + outbox) · abac (правила role-resource-action)
· google-sheets (reader) · common (attachments/comments/activity-history/notifications/model-resolver/CRM-queue)
· query (data-loader) · sync (lock-gates от параллельного синка).

## Домен (шаблон, напр. orders)
`core/` (models·repos·services·controllers·dto) + `event/` (events·emitter·listener) + `sync/` (sync-config·sync-service·batch-sync). Паттерны: инфра→домен только через DI; события каскадом; UPSERT только изменённых строк; полиморфизм (modelType+modelId); soft-delete через status+deletedAt.

**Все домены (20+):** Orders, Transactions, Vehicles, Fines, Maintenance, Customers, Accounts, Investors, Companies, Users, Tasks, Projects, Departments, Transportation, Settings, Documents, Currencies, Photo Scripts, Damage Claims, Dictionaries, Exchange Rates.

## Кандидат-центр («с которым всё взаимодействует»)
**Sync Engine + event-bus + Postgres** = нервный центр. Каждый домен регистрирует свой sync-конфиг; BatchSyncOrchestrator эмитит события.

> ⚠ **Правка (критик): разделить два разных утверждения.** (1) «Большинство доменов зависят от
> sync-engine» — ВЕРНО, проверено. (2) «События каскадят до алертов/аудита end-to-end» — ГИПОТЕЗА:
> `emit()` реально есть в ~12 доменах (лучше, чем в устаревшем DATA-MODELS.md), но полная цепочка
> (order created → transaction listener → notification → TG) НЕ прослежена. Пометить как гипотезу
> до трассировки одного полного пути. Вторичные хабы: User+Auth (кто что может), GoogleSheetsService (шлюз к внешним данным), OrdersService/VehiclesService (больше всего кросс-домен-связей).

## Где хаос/связанность (эвиденс)
- `orders/event/order-transaction.listener.ts` — жёсткая связка Orders→Transactions.
- `common/notifications/` — правила в БД могут молча рассыпаться при смене payload события.
- sync-registry — ручная регистрация доменов (забыл — не синкается).
- дубль домен-логики бэк↔фронт (order schema меняется в двух местах).
- `packages/types/enums/` — бутылочное горло (все enum через один пакет).
- 40+ миграций — сложный откат.
- JWT: роль из LRU-кэша 5м → окно устаревших прав.

## Открытые неизвестные (в вопросы, файл questions/)
Деплой-топология (один/несколько контейнеров) · частота крона по факту · офлайн-кэш фронтов · где хранятся фото · charts считаются на бэке или клиенте · кто получает TG-алерты · мульти-компания (Companies есть, изоляция неясна).
