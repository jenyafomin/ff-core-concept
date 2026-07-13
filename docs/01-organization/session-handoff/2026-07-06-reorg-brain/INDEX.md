---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Scope: project
Session: реорг brain + реестр типов-разделов
Related:
  - docs/01-organization/session-handoff/2026-07-06-navigation/INDEX.md
  - docs/01-organization/doc-discipline/2026-07-06-reorg-and-section-types.md
  - docs/01-organization/doc-discipline/section-types-registry.md
  - docs/02-project/core/01-brain/INDEX.md
---

# HANDOFF — сессия 2026-07-06 (реорг brain + реестр типов)

> Второй хендофф за 06.07 (первый — про `NAVIGATION.md`). Передача понимания: что сделано, чтобы
> следующая сессия продолжила без потери контекста. **Обновляет** расположение brain: он больше НЕ в topics.

## Темы сессии (тонкие логи → проекции канона)
- [01 — Реорг brain](01-brain-reorg.md)
- [02 — Типы-разделы + правило роста](02-section-types-and-growth.md)
- [03 — Механика сессий/логов + баг шлюза + скилл](03-session-logging-and-gateway-bug.md)

## Задача сессии
brain-работа копилась в архиве `topics/10-synthesis/memory-unit/`, а канон-место в дереве —
пустая заглушка. Каша. Цель: реорг brain в дерево + завести общие типы-разделы + начать session-handoff.

## Что СДЕЛАНО (артефакты, полные пути)
1. Решение-замок (D1-D7): `docs/01-organization/doc-discipline/2026-07-06-reorg-and-section-types.md`.
2. Реестр типов (6 шаблонов + разводка D6 «4 дома»): `docs/01-organization/doc-discipline/section-types-registry.md`.
3. **Перенос brain выполнен** (git mv, 20 файлов) → `docs/02-project/core/01-brain/`:
   - Мастер: `docs/02-project/core/01-brain/INDEX.md` (active).
   - `L0-memory-unit.md` · `portrait/` · `values/` (V1-V7 + 3×L1) · `scenarios/` ·
     `open-questions/` (FQ1-24·VQ1-4) · `synthesis/` (3 дига Fable) · `decisions/DECISIONS-LOG.md` ·
     `todo/TODO.md` · `plan/PLAN.md`.
   - Редирект: `docs/topics/10-synthesis/memory-unit/INDEX.md` (superseded).
   - Сырьё `docs/topics/20-analysis/`, `docs/topics/60-raw/` — НЕ переносили (источник, канон ссылается).

## Решения владельца
- Вариант A: brain-канон едет целиком; сырьё остаётся в topics.
- Общие типы = переиспользуемые шаблоны (реестр).
- Fork #2 (справки об агентах) → `docs/02-project/core/02-agents/reference/` — ещё НЕ перенесено.

## Открыто / следующий шаг
1. ✅ Долг ссылок закрыт (агент починил 2 ссылки в scenarios/INDEX, остальное валидно).
2. Форвард оркестрации по brain от владельца → наполнить `docs/02-project/core/01-brain/plan/PLAN.md`.
3. Перенести справки об агентах в `docs/02-project/core/02-agents/reference/`.
4. Заполнить опорные пустоты: `docs/02-project/core/03-contract/` и `docs/01-organization/session-handoff/STATE.md`.
5. Ратифицировать 7 ценностей после ответов на FQ/VQ → engine-spec / ADR «Конституция памяти».

## Процесс
- Баг шлюза: дубль голосового убивал фоновых агентов (4×). Обход: запись в файлы по частям +
  тяжёлые шаги в СИНХРОННОМ режиме. Держать, пока баг жив.
