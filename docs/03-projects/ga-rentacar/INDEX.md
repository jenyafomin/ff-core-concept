---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-25
Scope: project
node_type: overview
title: ga-rentacar — навигатор проекта (первый реальный жилец FF)
Related:
  - ../../02-project/core/00-kernel/INDEX.md   # ядро/паспорт узла — сюда растут требования
  - ../../../.claude/rules/doc-tree.md          # законы размещения
---

# 🚗 ga-rentacar — навигатор (dashboard)

> **Что это:** компания по прокату авто (Dubai/UAE) — **первый реальный жилец платформы FF**.
> Задача: её живые данные (Google Sheets + Telegram-переписки) лечь **как граф** = память + агентский
> слой поверх, НЕ замена CRM. На ней проверяем модель единицы памяти на реальных данных.
> Читать этот файл первым; детали — в файлах по ссылкам.

> 🧭 **Навигатор-визард (steps/paths):** [`ga-rentacar.concept.json`](ga-rentacar.concept.json) — через него включается навигация, не открывая файлы по отдельности.

## 🪜 Где мы сейчас (стадии)
- ✅ **S1** концепт-направление ga-rentacar
- ✅ **S2** ядро-канон (инварианты + ADR-0004/5/6 + оси incl. `lens` + время) — спроектирован, доказан killer-прогоном
- ✅ **S3** прогон рентакар-данных через модель на бумаге (линзы, синк, форки, паспорт)
- 🟡 **S4 ← ТЫ ЗДЕСЬ:** спек инжеста написан ([`specs/01-ingest-slice.spec.md`](specs/01-ingest-slice.spec.md)); первый прогон синка Orders ×2 — ждёт «строй» на код (В-1)
- ⬜ **S5** тонкий движок `TOOLS/ff-engine` (phase-1) — код не начат

## 📊 Статус по областям
| Область | Статус | Файл |
|---|---|---|
| Направление + границы MVP | 🟢 решено | [`decisions/01-direction-and-mvp.decision.md`](decisions/01-direction-and-mvp.decision.md) |
| Процесс=конфиг топика; роли; сессии | 🟢 решено | [`decisions/02-topic-config-and-sessions.decision.md`](decisions/02-topic-config-and-sessions.decision.md) |
| Риски данных и дедупа (проход Fable) | 🟢 зафиксировано | [`analyses/01-data-and-dedup-risks.analysis.md`](analyses/01-data-and-dedup-risks.analysis.md) |
| Линзы/доступ/формулы ↔ ядро | 🟢 замаплено | [`analyses/02-lenses-and-access-mapping.analysis.md`](analyses/02-lenses-and-access-mapping.analysis.md) |
| Потенциал по данным (impact×сложность) | 🟢 собрано | [`analyses/03-capability-potential.analysis.md`](analyses/03-capability-potential.analysis.md) |
| Быстрый путь к живой базе (роудмап, driver-минимум) | 🟢 написан (draft) | [`plans/01-fast-path-roadmap.plan.md`](plans/01-fast-path-roadmap.plan.md) |
| Спек инжеста (1 стр., паспорт + idem-upsert + тест-план) | 🟢 написан (draft) | [`specs/01-ingest-slice.spec.md`](specs/01-ingest-slice.spec.md) |
| Открытые вопросы | 🟡 ждут владельца | [`questions/open-questions.question.md`](questions/open-questions.question.md) |
| Первый срез (код/синк) | 🔜 не начат | ждёт «строй» на код по В-1 (спек готов) |

## 🗄 Источники данных (внешние проекты — указатели)
- **Живые данные:** `/Users/mac16/Documents/IT/Apps/PROJETS/RENTACAR_EXCEL_ANALYTICS`
  — Sheets→PostgreSQL, срезы в `data/raw/*.peek.json` (Orders ~4100, Cars, Transactions, Maintenance, FINES, Unpaid Fines). Модель: `docs/DATA-MODELS.md`.
- **Код-MVP CRM + ABAC/роли (референс, НЕ поднимаем):** `/Users/mac16/Documents/IT/Apps/PROJETS/CRM-Rent`
  — NestJS+React, роли SUPER_ADMIN/ADMIN/MANAGER/ACCOUNTANT/DRIVER/INVESTOR. Берём только словарь модели и идеи ABAC на будущее.
- **Лендинги (к данным отношения нет):** `Rent_Next`, `Car_Mikle_USA`, `CAR_MICHAEL_USA_2`.

## 🔗 Связи с ядром FF
- Требования к **паспорту узла/ребра** (версия, tombstone, паспорт ребра) → растят `docs/02-project/core/00-kernel/`.
- Принцип идентичности (локально + обратимое `same-as`) = каноны FF (lose-nothing, статус=метка).

## 🧭 КООРДИНАЦИЯ (как ga-rentacar связан с остальными нитями)
ga-rentacar — **не отдельный остров**, а первый реальный жилец, который **тестирует ядро на живых данных**.
- **Кормит ВВЕРХ (требования → ядро):** traverse-depth bound (В-5) → `00-kernel/open-questions.md` (новый KQ);
  расширение паспорта (версия/tombstone/паспорт-ребра, D6) → `00-kernel/`.
- **Потребляет ИЗ ядра (свежий совет 2026-07-25):** **KQ-11** (память = проекция, акт `observation`) прямо решает
  «факт из чата»; **KQ-8** (удаление, ADR-0007) — как жить с удалёнными строками Sheets (tombstone).
- **Пульт всех нитей:** `docs/00-states/STATE.md` + 5 state-топиков (00-global-build · 01-tree-rules · 02-agent-mechanics · 03-brain · 04-improvement-plans).
- **Развилка «библиотека памяти vs независимый сервер»** → решается в phase-1 движка (`TOOLS/ff-engine`), см. reply 2026-07-25.

## 🧭 След (trace)
Что делали по шагам — в `_log/` (сессия 2026-07-25). Здесь — только знание, не след.
