---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Scope: project
---

# FF — КАНОН документации (точка входа)

> Читай этот файл первым. Дерево раскрываемое: каждый пункт — папка со своим `INDEX.md`.
> Две оси: **01 = КАК работаем** (организация) · **02 = ЧТО строим** (проект). Логи агентов —
> только ссылками. Основная работа живёт в документах разделов.

## Дерево

- **[01-organization/](01-organization/INDEX.md)** — организация процесса (без неё — хаос)
  - [data-canon/](01-organization/data-canon/INDEX.md) — каноны модели данных/БД (узел, паспорт, рёбра, движок)
  - [doc-discipline/](01-organization/doc-discipline/INDEX.md) — стандарт доков: статусы, дерево, именование
  - [process/](01-organization/process/INDEX.md) — протокол диалога, регламент делегирования, тон/фаза
  - [rules-and-skills/](01-organization/rules-and-skills/INDEX.md) — место под `.claude/rules` + скиллы (проектируется отдельно)
  - [session-handoff/](01-organization/session-handoff/INDEX.md) — точка восстановления сессий (папка, не коллидят)
- **[02-project/](02-project/INDEX.md)** — сам проект FF (цель ≠ обязательно продукт)
  - [substrate/](02-project/substrate/INDEX.md) — фундамент: граф узлов / БД / движок как продукт
  - [core/](02-project/core/INDEX.md) — два ядра и их стык
    - [01-brain/](02-project/core/01-brain/INDEX.md) — единица памяти (тулз 1, проектируется сейчас)
    - [02-agents/](02-project/core/02-agents/INDEX.md) — система агентов через Telegram (тулз 2, «руки»)
    - [03-contract/](02-project/core/03-contract/INDEX.md) — ⟷ КОНТРАКТ brain↔агенты
- **[03-projects/](03-projects/INDEX.md)** — портфель проектов (5) + логи-ссылки работы агентов
  - dwizh · ga-rentacar · cardex · 7days · video-social-music
- **04-knowladge/** — общая база знаний/справка

## Архивы (не удалять, не вести)

- `base/` — старая структура (прошлый переход) → read-only
- `topics/` — второй переход; ценные наработки (memory-unit, TREE) переносим в дерево выше по мере надобности

## Развилки владельцу

См. [01-organization/CANON-SKELETON-PROPOSAL.md](01-organization/CANON-SKELETON-PROPOSAL.md).
