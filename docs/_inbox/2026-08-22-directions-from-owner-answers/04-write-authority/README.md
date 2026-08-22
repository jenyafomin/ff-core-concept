---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-22
Scope: project
node_type: overview
tags: [direction, has-home, global, decision-pending]
title: D4 — Авторитет записи (FORK-U3)
Related:
  - ../../../_log/2026-08-22-owner-answers-and-directions/01-voice-capture.md   # N-030
  - ../../../_log/2026-08-21-first-real-grain-day-mirror/HANDOFF.md             # §7 FORK-U3 не решён
  - ../../../02-project/core/01-brain/01-overview/01-values/03-doverie/         # Ц3 дом-кандидат
  - ../../../02-project/core/01-brain/decisions.INDEX.md                        # FORK-U3 упомянут
---

# D4 · Авторитет записи (FORK-U3)

## Маркер узла
- **Что это:** НАПРАВЛЕНИЕ (**decision-pending** — владелец хочет РЕШИТЬ изначально).
- **Scope:** GLOBAL (Ц3 Доверие / kernel).
- **Тип:** решение-в-ожидании / развилка.
- **Зависимости:** зависит от **D1** (policy). Блокирует корректный write-провод к чему-либо, кроме
  данных владельца (handoff 08-21 §7).
- **Статус:** draft · needs-home.
- **Предлагаемый постоянный дом:** `01-brain/01-overview/01-values/03-doverie/` (провенанс/доверие) ИЛИ
  kernel decisions; FORK-U3 уже фигурирует в `decisions.INDEX.md`. Вливать туда.

## Ответ владельца (вербатим-по-смыслу, N-030)
- Очень правильное направление, рассматривать внимательно.
- Хотел бы РЕШИТЬ ИЗНАЧАЛЬНО (возможно не сразу интегрировать, если сложно, но честно понимать).
- Важно ОСОБЕННО в универсальной системе памяти.
- Звено ДЕШЁВОЕ на старте и ДОРОГОЕ потом.
- → **отдельная КОМАНДА.**

## Что копать (наметка для команды — адверсариал)
- FORK-U3: **force-bind ↔ attest** (из handoff 08-21 §5/§7): сейчас `resolveWrite` не подключён, любой
  агент пишет от любого actor.
- «Дёшево сейчас — дорого потом»: какое минимальное решение сейчас держит дверь открытой.
- Стык с D1 policy (кто вправе писать = policy-as-data) и с D5 (роли/доступ внутри пространств).

## Что кладём в контейнеры
- `questions/` — засеян вопрос force-bind vs attest + timing.
- `ideas/` — варианты `resolveWrite` / authority-модели.
- `analyses/` — адверсариал-разбор (шаг 5 скелета, analyst + critic).
