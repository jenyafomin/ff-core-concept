---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: ADR-draft
title: Единый граф-субстрат + модульная архитектура
Related:
  - ../analyses/2026-07-12-architecture-synthesis/2026-07-12-SYNTHESIS-matrix.md
  - ../02-infrastructure/01-overview/MODULES.md
  - ../analyses/2026-07-12-fable-series/2026-07-12-fable-db-module/00-SYNTHESIS.md
---

# ADR-DRAFT — Единый граф-субстрат + модульная архитектура

> ⚠️ DRAFT/proposed. НЕ утверждать, пока не сняты блокеры (см. низ). Собран из волны 8 агентов + 2 скептиков (2026-07-12).

## Контекст
Нужна память-платформа, растущая от крошечной до огромной без миграций, из переиспользуемых plug-in-модулей,
соблюдающая 7 ценностей. Консилиум 3× Fable и волна из 8 deep-dive независимо сошлись к одной модели.

## Решение (несущее)
1. **Единый граф-субстрат:** 2 физ. таблицы (узлы, рёбра) + тонкий паспорт + payload. Всё остальное —
   ДАННЫЕ в реестрах (`node-type`/`edge-type`/`view-def`/`VariantGroup`). Рост = INSERT типа, не миграция.
2. **Модуль** = единица системы: набор типов + policy-as-data + поведение-в-БД. Система = композиция
   модулей (global `M-G*` / project `M-P*`), кросс-связь через БД. Реестр — `MODULES.md`.
3. **Инварианты (заложить сейчас):** `canonicalId`(UUID) везде · 2 класса связи (thin-ref/assertion) ·
   DAG на derived · паспорт-оси `scope`≠`storageLevel` + `DataResidency` · VariantGroup(`mode: xor\|or\|and`) ·
   единый append-only журнал (`journal-entry`, `kind: observation\|worklog`) · channel-нейтральный `conversationRef`.
4. **policy:** много `policy`-узлов + один каскад **Конституция > policy-as-data > integrity**; 7 ценностей = 7 policy-узлов.
5. **Правило производного состояния (уточнённое):** default = read-time проекция; материализация легитимна
   ТОЛЬКО при объявленном derivation-rule + проходящем rebuild-from-scratch + маркере `derived=true` +
   синхронной инвалидации для concurrency/security (uniqueness `≤1 Active`, breaker, ACL).

## Альтернативы (отклонены)
- Таблица-на-сущность (классика) → рост = миграции; отклонено.
- Один гигантский policy-узел → ломает адресуемость/провенанс/слияние; отклонено скептиком.
- Всё-проекция без исключений → гонки concurrency/ACL, невозможность офлайн-федерации; отклонено.

## Последствия
(+) рост данными, plug-in, переносимость FF↔agents-manager, одна правда через журнал.
(−) дисциплина type-gate (иначе свалка синонимов); операционный долг rebuild/reconcile; паспорт-дрейф — риск.

## 🔴 БЛОКЕРЫ — снять до утверждения
- [ ] Ратифицировать 5 канон-имён типов (коллизии `profile-ref`/журнал/`reports-to`/`verified-by`/сироты) — SYNTHESIS §«Коллизии».
- [ ] Форк **M-G1 ↔ M-G3**: один модуль или два.
- [ ] Форк **Session ↔ домен 01**: payload или thin-ref.
- [ ] Назначить владельца операционного долга rebuild/reconcile.
- [ ] Разобрать пробелы: **M-P1 Планы**, **M-P5/Домен 03** (не приклеивать к `container` в обход type-gate).

## План валидации
Rebuild-from-scratch тест журнала (day-1) · type-gate CI (нет дублей имён) · слияние двух БД по canonicalId (идемпотентность).
