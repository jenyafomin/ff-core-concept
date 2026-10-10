---
status: review
owner: jenya.stasik@gmail.com
date: 2026-10-11
---
# 🚀 Запуск — по RUNBOOK

Ответы М1–Д1 даны (М3, М4, М7б обязательны) → запускаем по шагам, **каждая команда отдельно**:

0 предполёт (только чтение) → 1 скрипт мозга → 1б бэкап + база (М2, пояс М7б) → 2 pm2 → 3 импорт промптов → 4 флаги шлюза (`.env` — только руками) → 5 протокол в слой топика 56 → **6 смоук** → 7 старт гейта.

Важно в смоуке:
- 6.2 — «♾️ Всегда» (твоё решение 10-10); если в М8 выбрал «терпеть кнопку» — разово до просмотра export дня 3;
- 6.6 — проба дубля голосового **обязательна**;
- 6.8 — фраза с обязательством → агент предлагает → «да» → запись видна в `find`.

Кит (канон): `docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/RUNBOOK.md`
Протокол агенту: `docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/PROMPT-memory-protocol.md`
Гейт: `docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/GATE-7days.md`
