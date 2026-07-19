---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-18
Scope: project
node_type: handoff
title: HANDOFF 2026-07-18 — ратификация бэклога + консолидация дерева модели
Related:
  - LEDGER.md
  - ../../../02-project/core/01-brain/DECISIONS-LOG.md
  - ../../../02-project/core/01-brain/decomposition/01-model/NAV.concept.json
  - ../../../02-project/core/01-brain/decomposition/01-model/README.md
---

# 🧭 HANDOFF 2026-07-18 — ратификация + чистое дерево модели

> Тезис владельца: готового много и хорошего; отличать нас будет **скорость правильными шагами** —
> **строить, не переделывать** (переделка = испорченный контекст = потеря информации).

## Ключевые ценности/итоги (со ссылками на концепты — открой и анализируй)
1. **Ратификация бэклога.** 71 провизорная позиция собрана → `LEDGER.md`; ратифицировано пакетом →
   `DECISIONS-LOG.md` **DL-20…DL-29**: Акт=2-я единица+ADR · **БД=PostgreSQL** (закрыт DL-15) · namespace@version ·
   паспорт-пакет · policy-пакет · рёбра · движок/доступ+root-авторитет · снапшот · reply-binding · закон дерева.
   НЕ ратифицировано (дизайн-очередь): D-7 разводящее правило · hard-erase кластер.
2. **Чистое дерево модели.** `01-model/README.md` (карта+закон дерева+2 режима) · `NAV.concept.json`
   (текущие прямые задачи, gateway-схема). Верхний уровень: `01-node · 02-edge · 03-act · 04-lens · _shared · plan · questions · state`.
3. **Миграция выполнена (бэкап `/tmp/ff-mig-backup`, 0 битых ссылок):**
   - `unit/ → 01-node/` (снят naming-баг unit≠node).
   - `deepening/` **растворён** → метод в `03-method/04-deepening-method.md`, карта в README, навигатор в NAV.
   - Карты → дома: `01-node/00-card.md · 02-edge/README.md · _shared/policy-as-data/CARD.md`.
   - `layers`+`categories` → `_shared/_to-dissolve/` (расформировать: layers→поле actor+линза, categories→тип ребра+поля узла).
4. **Дома развилок/вопросов** (принцип: живёт в своём доме+аналитика, индекс лишь перечисляет):
   `_shared/routing-rule/` (DQ-1) · `_shared/mechanisms/hard-erase/` (DQ-2) · `plan/design-queue.md` (индекс) · `questions/` (дом вопросов).

## Вердикт decomposition vs deepening (твой вопрос)
`deepening/` **был дубликатом** `03-method/` (оба = метод) + дублировал навигатор и карту → **растворён**.
`decomposition/` (model+stack+method) — законная группировка, **оставлена**. Дубль устранён.

## В работе
- **Обновление скиллов** (`concept-first` + `doc-discipline`) — агент `agent-builder` (фон): почему схема
  concept.json конфликтовала со шлюзом, почему аккреция вместо консолидации, принцип «дом+индекс». С `.bak`.

## Staged — следующий заход (тонкая уборка, аккуратно чтобы не рвать контекст)
- Process-файлы `01-node/` (START-HERE·HANDOFF·NEXT-STEPS·FABLE-*·SYNTHESIS·APPLIED) → в session-handoff (trace≠знание).
- Слить `00-card.md`/`CARD.md` в `README.md` домов (контент-мерж).
- FQ01-24 → per-question дома под `questions/` + индекс.
- Passport-контракт (`_shared/passport/`) → углубление **Акта** (H-1) → DQ-1/DQ-2.

## Точка входа следующей сессии
`decomposition/01-model/NAV.concept.json` → `README.md` → `state/README.md`. Решения: `DECISIONS-LOG.md`. Свод: `LEDGER.md`.
