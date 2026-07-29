---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-25
Scope: project
node_type: analysis
title: Потенциал системы по реальным данным проката (impact × сложность)
Related:
  - ../INDEX.md
  - ../decisions/02-topic-config-and-sessions.decision.md
---

# Потенциал по данным (что вообще возможно)

> Основано на реальных срезах: Orders ~4100 · Transactions **8742** · Fines 672 · Unpaid 320 · Cars · Maintenance.
> Ключевое: **связи уже лежат в данных** — Transactions несут `Order Id` + `Fine Id` + `Customer Phone`;
> Fines несут Customer+Vehicle+Invoice; Cars несут `Investor`+`Project`+даже `NODE ID`. Граф рёбер почти готов.

## Tier 1 — высокий выхлоп, низкая сложность (чистая проекция полей)
- **Единый долг клиента:** `Orders.Remaining` + `Unpaid.Remaining` + `Fines.Unpaid` → «кто и сколько должен».
- **Просрочки/напоминания:** прошли `Follow-up` / `Expected Return` / `Due Date` → агент напоминает.
- **Досье клиента:** все заказы+платежи+штрафы, стянутые к одному человеку (по телефону-кандидату).
- **Пульт парка:** `Cars.Status` (Booked/Available) → занятость.
- **Дедлайны документов:** `License Exp` / `Insurance Exp` приближаются → проактивный alert.
- **Риск-клиент:** неоплаченные штрафы + `Black Points` (Dubai Police) → флаг.

## Tier 2 — средняя сложность (проекция + связи)
- **P&L по инвестору:** `Cars.Investor`/`Project` + Transactions → закрывает роль INVESTOR (P3, в CRM не сделана).
- **Профит по авто/дням:** Transactions In/Out + daily rate → **виртуальное поле-линза** (не хранить, считать на чтение).
- **Граф сделки:** Transaction→Order→Fine→Vehicle→Customer (ключи уже есть) → сквозная картина по сделке/форку.
- **Эффективность продавца:** `Salesman` по заказам/оплатам.

## Tier 3 — высокая сложность (LLM/понимание) — ВНЕ первого среза
- Извлечение фактов из `Recent Note` / Maintenance `Comments` (свалка НЛ: одометр, топливо, обещания).
- Понимание Telegram-переписок → авто-заведение фактов.
- Прогноз/аномалии по деньгам.

## Новые подтверждения грязи (усиливают риски analyses/01)
- **Transactions: колонки съехали** — `Customer`=«Infiniti QX80 2021» (авто!), `Customer Phone`=«MAHMUDOV TAHIR» (имя!).
  → наивный маппинг по имени колонки сломается; нужен контроль схемы на инжесте.
- **Maintenance:** мусорные строки-заголовки (`#`=«CRS», «Green Age Rent a Car | Head Office»), 40 колонок, много пустых.
- **Один человек в разных таблицах разным ключом:** Fines.Customer=«NAGAEV TALGAT 971501534168» (имя+телефон в одном поле)
  vs Orders.Name+Mobile раздельно → нормализация обязательна до `same-as`.

## Вывод
Tier 1 достижим почти сразу и даёт владельцу/ролям реальную ценность на голой проекции. Tier 2 — после того как
граф рёбер собран. Tier 3 — отдельная фаза. Приоритет первого среза = Tier 1 на чистых сущностях (Orders/Cars/Customer).
