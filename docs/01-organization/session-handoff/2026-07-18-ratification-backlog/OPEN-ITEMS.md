---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-19
Scope: project
node_type: handoff
title: OPEN-ITEMS — что НЕ сделано / не доработано (подхват новой сессией)
Related:
  - HANDOFF.md
  - LEDGER.md
  - ../../../02-project/core/01-brain/decomposition/01-model/_shared/mechanisms/orchestration/DESIGN.md
---

# 🔲 OPEN-ITEMS — что НЕ сделано / не до конца проработано

> Явный долг, чтобы ничего не потерялось и новая сессия подхватила. Сгруппировано по тяжести + дом.
> Точка входа сессии: `STATE.md` (RESUME 2026-07-19) → этот файл → `HANDOFF.md`.

## 🔴 CRITICAL — блокирует «любой подключится и разберётся»
| # | Что НЕ сделано | Почему висит | Дом/фикс |
|---|----------------|--------------|----------|
| O-1 | ~~35 битых `Related:`~~ → **сегодняшние регрессии ПОЧИНЕНЫ** (11 файлов). Остаток ~40 = **ПРЕ-существующий долг** в `synthesis/2026-07-12-*`, `architecture/`, `open-questions/`, `01-node/analyses/` (absolute-стиль `docs/...` или ссылки на несуществующее — было ДО сегодня) | Bash оживал урывками | отдельным заходом: нормализовать старые `Related:` (absolute→relative или удалить мёртвые); включить `Related:`-чек в критерий «готово» |
| O-1b | **Дубль состояния** — **ПРАВИЛО РАЗРЕШЕНИЯ ЕСТЬ** (ADR §Развилка-5): это НЕ одна вещь дважды, а две разные с одним именем → `01-model/state/`=**трейс** «где в дизайне» (растворить в NAV); `01-brain/state/`=**def механизма state** (перенести в `_shared/mechanisms/orchestration/`). Миграция обратимая (заглушки+бэкап). Исполнить после ратификации | ADR §Развилка-5 |
| O-2 | **Уборка `01-node/`** — 17 process-файлов вперемешку с каноном; README = контент волны, не индекс дома | откладывалось 2× (риск аккреции) | перенести process (START-HERE·HANDOFF-16·NEXT-STEPS·PROCESS-UPGRADE·APPLIED·VISION-SIMPLE·analyses-конвенций) → session-handoff; переписать `01-node/README.md` как индекс «канон/архив» |
| O-3 | **Bash permission-стрим** нестабилен (`Stream closed`) | инфраструктура шлюза | ТЗ: `process/bugs/gateway-tool-permission-stream/TZ.md` → чинить в `agents-manager` |

## 🟡 ЖДЁТ РЕШЕНИЯ ВЛАДЕЛЬЦА
| # | Что | Дом |
|---|-----|-----|
| O-4 | ~~5 развилок не отвечены~~ → **ОТВЕЧЕНЫ (proposed), ждут ратификации.** ADR-драфт: `decisions/ADR-DRAFT-orchestration-state-plan-task-loop.md` (из типов+ценностей, критик пройден). Ответы: STATE=**оба-грани** (узел+линза) · статусы=**хребет+листья** · LOOP=**свой node_type, композирует plan** · task=**статич.указатель, статус только в линзе** · дом типов=**вынесен в DL-29/doc-discipline** (не ADR). **Новое:** разв.6 материализации + reconcile `02-states.md` (↓) | `decisions/ADR-DRAFT-orchestration-…md` |
| O-4a | 🔴 **Разв.6 (критик): политика материализации 4 линз** (`state.current`/`board`/`plan.progress`/`loop.ledger`) — live vs материализована (DL-04/05). Реальный предратификационный блокер (`state.current` = самая горячая тропа) | ADR §Развилка-6 |
| O-4b | 🔴 **Reconcile `01-node/analyses/02-states.md`** (до-CQRS хранимый `status`, пишет агент) с event-sourcing → пометить superseded/поправить. Иначе разв.1 не approved (доки противоречат) | `01-node/analyses/02-states.md` |
| O-4c | **Риск гонок записи в одно `state`** (`agents:[…]` мн.ч. → рваный срез) — DL-26 Temporal-lite не подключён → дизайн-очередь | `_shared/mechanisms/orchestration/` |
| O-5 | **Дизайн-очередь** — не проработаны: D-7 разводящее правило · hard-erase кластер (дыры off-graph, INV-LINEAGE) | `_shared/routing-rule/` · `_shared/mechanisms/hard-erase/` |
| O-6 | **Открытые FQ** (⚠️ уточнить ×13 + оспорено FQ6·9·17·21·24) — не ратифицированы | `open-questions/` |

## 🟢 STAGED — механическая доработка
| # | Что | Дом |
|---|-----|-----|
| O-7 | Слить `00-card.md`/`CARD.md` в `README.md` домов (контент-мерж) | `01-node/`, `_shared/policy-as-data/` |
| O-8 | Расформировать `_to-dissolve/` (layers→поле actor+линза; categories→тип ребра+поля узла) | `_shared/_to-dissolve/` |
| O-9 | FQ01-24 → per-question дома под `questions/` — **сперва сверить с каноном** `open-questions/FQxx/` (section-types-registry), переносить ссылки, не контент | `01-model/questions/` |
| O-10 | Дубль `values/01-chitaemost/` vs `values/V1-chitaemost/` (нарушает DL-29) — слить как unit→01-node | `values/` |
| O-11 | ~~правка драфт~~ → **ПРЕДЛОЖЕНИЕ ГОТОВО** (со снятием дубля с L0): `2026-07-14-…/skills-draft/concept-first/STEP-0-PROPOSAL.md`. Ждёт «да» владельца → `agent-builder` вошьёт (R1). НЕ применено | `STEP-0-PROPOSAL.md` |
| O-12 | Passport-контракт — не начат (разблокирует edge/act/lens) | `_shared/passport/` |

## Приоритет для новой сессии
1. Починить Bash (O-3) → закрыть O-1 + O-2 одним заходом с проверкой ссылок.
2. Ответы на 5 развилок (O-4) → ADR оркестрации.
3. Passport-контракт (O-12) → углубление Акта.
Затем — механический долг O-7…O-10.
