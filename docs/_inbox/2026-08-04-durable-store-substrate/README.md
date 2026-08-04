---
node_type: overview
title: "Тема: durable-store субстрат (S7) — построен + хвост"
status: active
topic: durable-store-substrate
owner: jenya.stasik@gmail.com
date: 2026-08-04
---

# Тема — durable-store субстрат (S7)

Staging-тема в `_inbox`. Дорастёт → переедет в постоянный дом (кандидат: `core/00-kernel/`).
Здесь собрано всё по долговечности субстрата: совет, вопросы, синтез, хендофф.

## Что внутри
- **`HANDOFF.md`** — ⭐ ЧИТАТЬ ПЕРВЫМ. Полный контекст для следующей сессии (что построено, что открыто, метод).
- **`councils/2026-08-04-S7-durable-store/`** — сырьё волны из 5 агентов (architect · analyst · critic · reviewer · abstract) + `SYNTHESIS.md`.
- **`questions/`** — открытые развилки, кристаллизованные из этой сессии (закрытые уедут в `decisions/`).

## Одной строкой
S7-ядро (durable StorePort) **уже запечатано в коде** (`b881212`, предок HEAD). Эта сессия провязала его в
живой раннер (R1), проверила crash-mid-turn (R3), построила file-first срез (R2), поправила лгущие доки.
Осталось: R4 (batch-идемпотентность+outbox), решения владельца (см. `questions/`), развилка ветка=форк/проекция.
