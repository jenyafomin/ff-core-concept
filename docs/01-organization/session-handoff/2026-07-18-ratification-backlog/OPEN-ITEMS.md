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
| O-1 | **35 битых `Related:`-ссылок** (frontmatter) в 12 файлах | Bash-канал падал («Stream closed»); нужна скриптовая починка | скрипт по `01-brain`, поправить относит. глубину; включить `Related:` в критерий «миграция готова» |
| O-2 | **Уборка `01-node/`** — 17 process-файлов вперемешку с каноном; README = контент волны, не индекс дома | откладывалось 2× (риск аккреции) | перенести process (START-HERE·HANDOFF-16·NEXT-STEPS·PROCESS-UPGRADE·APPLIED·VISION-SIMPLE·analyses-конвенций) → session-handoff; переписать `01-node/README.md` как индекс «канон/архив» |
| O-3 | **Bash permission-стрим** нестабилен (`Stream closed`) | инфраструктура шлюза | ТЗ: `process/bugs/gateway-tool-permission-stream/TZ.md` → чинить в `agents-manager` |

## 🟡 ЖДЁТ РЕШЕНИЯ ВЛАДЕЛЬЦА
| # | Что | Дом |
|---|-----|-----|
| O-4 | **ADR «Оркестрация STATE·PLAN·TASK·LOOP»** — 5 развилок не отвечены (STATE линза/узел · словарь статусов · LOOP подтип/тип · task read-only-строка · дом типов+переезд) | `_shared/mechanisms/orchestration/DESIGN.md` → `architecture/ADR/` |
| O-5 | **Дизайн-очередь** — не проработаны: D-7 разводящее правило · hard-erase кластер (дыры off-graph, INV-LINEAGE) | `_shared/routing-rule/` · `_shared/mechanisms/hard-erase/` |
| O-6 | **Открытые FQ** (⚠️ уточнить ×13 + оспорено FQ6·9·17·21·24) — не ратифицированы | `open-questions/` |

## 🟢 STAGED — механическая доработка
| # | Что | Дом |
|---|-----|-----|
| O-7 | Слить `00-card.md`/`CARD.md` в `README.md` домов (контент-мерж) | `01-node/`, `_shared/policy-as-data/` |
| O-8 | Расформировать `_to-dissolve/` (layers→поле actor+линза; categories→тип ребра+поля узла) | `_shared/_to-dissolve/` |
| O-9 | FQ01-24 → per-question дома под `questions/` — **сперва сверить с каноном** `open-questions/FQxx/` (section-types-registry), переносить ссылки, не контент | `01-model/questions/` |
| O-10 | Дубль `values/01-chitaemost/` vs `values/V1-chitaemost/` (нарушает DL-29) — слить как unit→01-node | `values/` |
| O-11 | concept-first «шаг-0: направление/ценность перед вопросами» — правка драфт, не применена; сверить с воронкой L0 в CLAUDE.md | `~/.claude/skills/concept-first/SKILL.md` |
| O-12 | Passport-контракт — не начат (разблокирует edge/act/lens) | `_shared/passport/` |

## Приоритет для новой сессии
1. Починить Bash (O-3) → закрыть O-1 + O-2 одним заходом с проверкой ссылок.
2. Ответы на 5 развилок (O-4) → ADR оркестрации.
3. Passport-контракт (O-12) → углубление Акта.
Затем — механический долг O-7…O-10.
