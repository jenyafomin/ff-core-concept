---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-19
Scope: project
node_type: analysis
title: КАРТА-2 — целевая инфраструктура (куда всё должно лечь)
Related:
  - ./MAP-current.md
  - ./README.md
  - ../../../02-project/core/01-brain/decisions/ADR-DRAFT-orchestration-state-plan-task-loop.md
---

# 🗺️ КАРТА-2 — ЦЕЛЕВАЯ инфраструктура

> «Какой СТАНЕТ»: что уже на месте, где появятся новые файлы, откуда они тянут данные. Разрез —
> **БАЗА (01-brain) ⟂ МОДУЛЬ (02-agents/agent-manager)**, плюс инбокс и распределённые решения.

## Ось разделения (несущая)
**БАЗА `01-brain`** = субстрат + концепты памяти (тест-полигон БД). Держит примитивы и **generic-семьи типов**.
**МОДУЛЬ `02-agents`** (agent-manager, движуха; репо `TOOLS/agents-manager` — потом) = **конкретные грани**
над базой, которыми работают агенты. **Потребляет базу, порождает грани.**

## A. БАЗА — `01-brain/` (остаётся/дочищается)
| Целевой дом | Что живёт | Откуда тянет / новые файлы |
|-------------|-----------|----------------------------|
| `01-brain/…/01-model/` (примитивы) | node·edge·view-def·passport · Акт-журнал · policy-as-data | ратифицированное DL-01…29 |
| `01-brain/…/plan-family/` 🆕 | **generic `plan` как СЕМЕЙСТВО**: базовый тип + механизм **вариаций/подтипов/апгрейд-линз**; контракт «как БД взаимодействует с РАЗНЫМИ планами» | сюда садятся конкретные plan-kinds модуля (ссылками) |
| `01-brain/decisions/` | ТОЛЬКО решения о базе (субстрат, движок, забвение, память) | `DECISIONS-LOG.md` ссылается |
| `01-brain/{architecture,values,open-questions,…}` | концепты памяти | чистятся (пре-долг ссылок) |

## B. МОДУЛЬ — `02-agents/` (наполняется; сюда ПЕРЕЕЗД оркестрации)
| Целевой дом 🆕 | Что живёт | Откуда тянет / новые файлы |
|----------------|-----------|----------------------------|
| `02-agents/orchestration/` 🆕 | **STATE·PLAN·TASK·LOOP как конкретные грани** над базой | тянет примитивы из `01-brain/…/01-model/`; сюда сходятся #1,#4,#5 из MAP-current |
| `02-agents/orchestration/state/` | механизм state (линза+узел, `status_cache` derived) | база: Акт-журнал; L1-state (#6) переезжает сюда |
| `02-agents/orchestration/plan-kinds/` | **конкретные вариации плана**: state-bound plan, loop, апгрейды | наследуют `plan-family` базы (A) |
| `02-agents/orchestration/decisions/` 🆕 | ADR оркестрации + локальные решения модуля | сюда переезжает `ADR-DRAFT-orchestration-…` из `01-brain/decisions/` |
| `02-agents/{roles,runs,loop-system}` | реестр ролей/моделей · прогоны (ссылками) · loop-system | как в текущем `INDEX.md` |
| `03-contract/` | контракт «что агенты пишут в граф» (стык base↔module) | стоит на обоих |

## C. Инбокс + библиотекарь (процесс)
| Дом 🆕 | Что | Правило |
|--------|-----|---------|
| `_inbox/` (на проект) | агенты кладут произведённое «чёткими файлами» черновиком | НЕ истина; стейджинг |
| библиотекарь (навык doc-discipline) | параллельно разносит инбокс → дома по правилам дерева | тема→папки; один дом на вещь; Related-чек |

## D. Решения — РАСПРЕДЕЛЁННЫЕ (снятие анти-паттерна «одна куча»)
- Решение живёт **в доме своей темы** (`02-agents/orchestration/decisions/`, `01-brain/decisions/` — только про базу).
- Папка сама говорит, что внутри (напр. `achievements/`), внутри — `decisions/` если есть ADR по теме.
- `DECISIONS-LOG.md` (в базе) = **сводный журнал-указатель** (DL-номера → ссылки), не хранит контент.

## Где рождаются НОВЫЕ файлы (ответ на «где появятся»)
- Новый концепт оркестрации → `02-agents/orchestration/…` (не в `01-brain/decisions/`).
- Новая вариация плана → `02-agents/orchestration/plan-kinds/`, наследует `01-brain/…/plan-family/`.
- Любой сырой продукт хода → сперва `_inbox/` → библиотекарь разносит.

## Переезды одной строкой (для библиотекаря, по «строй»)
1. `01-model/_shared/mechanisms/orchestration/` + `domains/02-agents-orchestration/` → `02-agents/orchestration/` (свести дубль типов).
2. `01-brain/state/` (L1) + `01-model/state/` → `02-agents/orchestration/state/` (def) · трейс → NAV.
3. `01-brain/decisions/ADR-DRAFT-orchestration-…` → `02-agents/orchestration/decisions/`.
4. `01-brain/plan/` + `01-model/plan/` → разнести: `plan-family` (base) vs `plan-kinds` (module).
5. Завести `_inbox/` + вписать библиотекаря в doc-discipline.
> Каждый переезд: заглушка-редирект + бэкап + git-точка (обратимо).
