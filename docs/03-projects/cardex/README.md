---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Scope: project
---

# cardex — мастер-индекс

Единая точка входа во ВСЕ концепты по Cardex.

> 📌 **Состояние решений** → [`STATE.md`](STATE.md) (решения · открытые вопросы · следующие ходы).
> 🔁 **Продолжить в новом чате** → [`CONTINUE-PROMPT.md`](CONTINUE-PROMPT.md) (промпт-хендофф для топика ff_future).

Два трека:

## Трек 1 — Граф идей продукта (что за экосистема)

🧭 Вход: [`INDEX.md`](INDEX.md) · навигатор [`cardex-ecosystem.concept.json`](cardex-ecosystem.concept.json)
- [`ideas/`](ideas/README.md) — 🌳 дерево идей по категориям (23 идеи, каждая — свой файл, растёт в папку)
- [`graph.md`](graph.md) — карта связей (рёбра)
- [`priorities.md`](priorities.md) — приоритет-оверлей T1–T4
- [`how-to-grow.md`](how-to-grow.md) — как доращивать сам + открытые вопросы

Корневой узел N0 «единое место vs своя логика». Проект-код: Cardex CRM (`cardex:crm-nest-telegram`).

## Трек 2 — Организация моей работы (как я работаю)

🗂️ Вход: [`work-org/INDEX.md`](work-org/INDEX.md) · навигатор [`work-org/work-org.concept.json`](work-org/work-org.concept.json)
- [`work-org/alternatives.md`](work-org/alternatives.md) — варианты A/B/C⭐/D + слой «коннект» + агенты
- [`work-org/capture-and-view.md`](work-org/capture-and-view.md) — сбор идей + визуализация поверх Telegram (reuse кнопок + wizard шлюза)

Ядро: мост capture→дерево, ритм Пн/Чт. Начато 2026-07-31.
