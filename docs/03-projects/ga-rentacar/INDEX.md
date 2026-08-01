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

## 🔴 С ЧЕГО НАЧАТЬ ЧТЕНИЕ (утро 2026-07-31)

**1. Главный файл → SYNTHESIS:**
   [`docs/_log/2026-07-30-rental-design-push/SYNTHESIS.md`](../../../_log/2026-07-30-rental-design-push/SYNTHESIS.md) 
   — картина за ночь, честный итог, 7 вопросов владельцу.

**2. Вердикты критиков → что снять до кода:**
   [`analyses/10-council-critic-verdicts.analysis.md`](analyses/10-council-critic-verdicts.analysis.md)
   — 5 блокеров, приоритизированы по глубине; 4 критерия; что подтвердилось vs что упало.

**3. Решения совета:**
   - [`decisions/05-groupA-identity-engine.decision.md`](decisions/05-groupA-identity-engine.decision.md) — группа A
   - [`decisions/06-groupB-data-pii.decision.md`](decisions/06-groupB-data-pii.decision.md) — группа B

**4. Анализы (контекст):**
   - [`analyses/09-qd1-qd2-data-findings.analysis.md`](analyses/09-qd1-qd2-data-findings.analysis.md) — канон Transactions, PII
   - [`analyses/08-designpack-adversarial-critique.analysis.md`](analyses/08-designpack-adversarial-critique.analysis.md) — где лёгкий путь дырявый

**5. Спец (обновлён):**
   [`specs/06-m2-build-steps.spec.md`](specs/06-m2-build-steps.spec.md) — M2 build-steps после критики

---

## 🪜 Где мы сейчас (стадии)
- ✅ **S1** концепт-направление ga-rentacar
- ✅ **S2** ядро-канон (инварианты + ADR-0004/5/6 + оси incl. `lens` + время) — спроектирован, доказан killer-прогоном
- ✅ **S3** прогон рентакар-данных через модель на бумаге (линзы, синк, форки, паспорт)
- 🟡 **S4 ← ТЫ ЗДЕСЬ:** спек инжеста написан ([`specs/01-ingest-slice.spec.md`](specs/01-ingest-slice.spec.md)); первый прогон синка Orders ×2 — **БЛОКИРОВАН 5 блокерами (SYNTHESIS §3 + вердикты § 10)**
- ⬜ **S5** тонкий движок `TOOLS/ff-engine` (phase-1) — код не начат

## 📊 Статус по областям
| Область | Статус | Файл |
|---|---|---|
| Направление + границы MVP | 🟢 решено | [`decisions/01-direction-and-mvp.decision.md`](decisions/01-direction-and-mvp.decision.md) |
| Процесс=конфиг топика; роли; сессии | 🟢 решено | [`decisions/02-topic-config-and-sessions.decision.md`](decisions/02-topic-config-and-sessions.decision.md) |
| **Q1 вертикаль + диспозиция launch-подписей** (итог ночного аудита) | 🟢 **решено: пивот B (клиентская линза), M2→M3; деньги паркуются** | [`decisions/03-vertical-and-signoffs.decision.md`](decisions/03-vertical-and-signoffs.decision.md) |
| **Дизайн-раунд M2/M3** (грунт на реальных данных, 6 артефактов) | 🟡 draft — критик: 1 FLAWED (Q2 ADR) · 4 REVISE | [`analyses/06-design-round-critic-verdicts.analysis.md`](analyses/06-design-round-critic-verdicts.analysis.md) |
| ↳ Грунт на реальных данных (цифры, паттерны дублей) | 🟡 draft | [`analyses/04-real-data-grounding.analysis.md`](analyses/04-real-data-grounding.analysis.md) |
| ↳ **Спек M2** (дедуп same-as + линза клиента) | 🟡 draft (REVISE: D5 авто-слияние) | [`specs/04-m2-dedup-and-customer-lens.spec.md`](specs/04-m2-dedup-and-customer-lens.spec.md) |
| ↳ Контракт M3 (живой топик-агент) | 🟡 draft (REVISE) | [`specs/05-m3-topic-agent-contract.spec.md`](specs/05-m3-topic-agent-contract.spec.md) |
| ↳ EQ-1 latest-wins (отзыв наблюдения) | 🟡 draft (REVISE: ключ=журнал) | [`specs/03-observation-latest-wins.spec.md`](specs/03-observation-latest-wins.spec.md) |
| ↳ Q2 identity ADR-draft (canonicalId) | 🔴 draft (FLAWED — переписать на реальном коде) | [`decisions/04-node-identity-canonicalId.adr-draft.md`](decisions/04-node-identity-canonicalId.adr-draft.md) |
| ↳ Ремедиэйшн-рескоуп под пивот B | 🟡 draft (REVISE) | [`analyses/05-remediation-rescope-under-pivot.analysis.md`](analyses/05-remediation-rescope-under-pivot.analysis.md) |
| **НОЧНОЙ РАУНД (2026-07-30): лёгкий путь vs реальный код** | 🟡 draft · **Трёхуровневый контроль (Fable + совет A/B/C + критика)** | [`docs/_log/2026-07-30-rental-design-push/SYNTHESIS.md`](../../../_log/2026-07-30-rental-design-push/SYNTHESIS.md) |
| ↳ Критика дизайн-пака (поиск дыр в «бесплатной» клиентской линзе) | 🟡 draft | [`analyses/08-designpack-adversarial-critique.analysis.md`](analyses/08-designpack-adversarial-critique.analysis.md) |
| ↳ Q-D1/Q-D2: канон платежей + паспорт/PII (на живых данных) | 🟡 draft | [`analyses/09-qd1-qd2-data-findings.analysis.md`](analyses/09-qd1-qd2-data-findings.analysis.md) |
| ↳ Вердикты критиков (5 блокеров, 4 критерия готовности) | 🟡 draft | [`analyses/10-council-critic-verdicts.analysis.md`](analyses/10-council-critic-verdicts.analysis.md) |
| ↳ Решение группы A: отложить canonicalId + лёгкий read-path | 🟡 draft | [`decisions/05-groupA-identity-engine.decision.md`](decisions/05-groupA-identity-engine.decision.md) |
| ↳ Решение группы B: паспорт узла + PII-стратегия | 🟡 draft | [`decisions/06-groupB-data-pii.decision.md`](decisions/06-groupB-data-pii.decision.md) |
| ↳ Спек M2 (build-steps, дополнен после критики) | 🟡 draft | [`specs/06-m2-build-steps.spec.md`](specs/06-m2-build-steps.spec.md) |
| Риски данных и дедупа (проход Fable) | 🟢 зафиксировано | [`analyses/01-data-and-dedup-risks.analysis.md`](analyses/01-data-and-dedup-risks.analysis.md) |
| Линзы/доступ/формулы ↔ ядро | 🟢 замаплено | [`analyses/02-lenses-and-access-mapping.analysis.md`](analyses/02-lenses-and-access-mapping.analysis.md) |
| Потенциал по данным (impact×сложность) | 🟢 собрано | [`analyses/03-capability-potential.analysis.md`](analyses/03-capability-potential.analysis.md) |
| Быстрый путь к живой базе (роудмап, driver-минимум) | 🟢 написан (draft) | [`plans/01-fast-path-roadmap.plan.md`](plans/01-fast-path-roadmap.plan.md) |
| Спек инжеста (1 стр., паспорт + idem-upsert + тест-план) | 🟢 написан (draft) | [`specs/01-ingest-slice.spec.md`](specs/01-ingest-slice.spec.md) |
| **Шлюз: баг агентов на рестарте** (параллельный трек) | 🟡 анализ+дизайн | [`../../01-organization/process/bugs/gateway-agents-die-on-restart/design/`](../../01-organization/process/bugs/gateway-agents-die-on-restart/design/) |
| Открытые вопросы | 🟡 ждут владельца | [`questions/open-questions.question.md`](questions/open-questions.question.md) |
| Первый срез (код/синк) | 🔜 **БЛОКИРОВАНО** | **5 блокеров (см. SYNTHESIS §3), затем «строй M2»** |

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
