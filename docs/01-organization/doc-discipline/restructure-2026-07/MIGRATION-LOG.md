---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-19
Scope: project
node_type: analysis
title: MIGRATION-LOG — исполнение переездов restructure-2026-07 (§1–4 + skeleton)
Related:
  - ./MAP-target.md
  - ./MAP-current.md
  - ./README.md
  - ../PATCH-2026-07-17-conventions.md
---

# 🚚 MIGRATION-LOG — исполнение переездов (2026-07-19)

> Библиотекарь (doc-discipline-раннер) исполнил MAP-target «Переезды» §1–4 + skeleton. §5 (перенумеровка
> легаси-тем) и §6 (инбокс/логи) — вне этого прохода. Обратимо: бэкап + `git mv` + заглушки-редиректы.
> **НЕ закоммичено** — изменения в рабочем дереве, коммитит оркестратор после проверки.

## Бэкап (rule 1)
`/tmp/ff-restructure-backup/` — зеркало относительных путей всех затронутых директорий (18 файлов):
`…/01-model/_shared/mechanisms/orchestration/`, `…/01-model/state/`, `…/01-model/plan/`,
`…/01-brain/domains/02-agents-orchestration/`, `…/01-brain/state/`, `…/02-agents/`,
`…/01-brain/decisions/ADR-DRAFT-orchestration-state-plan-task-loop.md`.

## Skeleton создан (rule 5 — каждая новая нумерованная папка получила README-индекс)
- `docs/02-project/core/02-agents/01-orchestration/` (индекс = переехавший domain-README)
  - `01-state/` (индекс = переехавший L1-def) · `02-plan/` 🆕README · `03-task/` 🆕README ·
    `04-loop/` 🆕README · `decisions/` 🆕README · `analyses/` 🆕README
- `docs/02-project/core/01-brain/decomposition/01-model/05-plan-family/` (индекс = переехавший plan-README + добавлен раздел «Механизм вариаций»)

**Папок создано: 8** (01-orchestration + 6 детей + 05-plan-family). README-индексов написано с нуля: **5**
(02-plan, 03-task, 04-loop, decisions, analyses); остальные 3 индекса = переехавший контент.

## Переезды (git mv — история сохранена) · from → to

| # | From | To |
|---|------|----|
| §1 | `…/01-model/_shared/mechanisms/orchestration/DESIGN.md` | `…/02-agents/01-orchestration/DESIGN.md` |
| §2 | `…/01-brain/domains/02-agents-orchestration/README.md` | `…/02-agents/01-orchestration/README.md` (индекс) |
| §2 | `…/domains/02-agents-orchestration/node-types.md` | `…/01-orchestration/node-types.md` |
| §2 | `…/domains/02-agents-orchestration/edge-types.md` | `…/01-orchestration/edge-types.md` |
| §2 | `…/domains/02-agents-orchestration/policy.md` | `…/01-orchestration/policy.md` |
| §2 | `…/domains/02-agents-orchestration/modules.md` | `…/01-orchestration/modules.md` |
| §2 | `…/domains/02-agents-orchestration/agents-orchestration.concept.json` | `…/01-orchestration/agents-orchestration.concept.json` |
| §3 | `…/01-brain/decisions/ADR-DRAFT-orchestration-state-plan-task-loop.md` | `…/01-orchestration/decisions/ADR-DRAFT-orchestration-state-plan-task-loop.md` |
| §4 | `…/01-brain/state/README.md` (L1 def) | `…/01-orchestration/01-state/README.md` |
| §5 | `…/01-model/plan/README.md` (generic) | `…/01-model/05-plan-family/README.md` |

**Файлов перемещено: 10.**

## Заглушки-редиректы (rule 3 — `Status: moved`, `Date: 2026-07-19`, тело «➡️ Переехало в: …»)
Оставлены на каждом освобождённом месте (10 переездов) + 1 конвертация:
1. `…/orchestration/DESIGN.md` → `…/02-agents/01-orchestration/DESIGN.md`
2–7. `…/domains/02-agents-orchestration/{README,node-types,edge-types,policy,modules,agents-orchestration.concept.json*}` → соответствующие в `01-orchestration/` (*json-стаб как .json нет — см. ниже)
8. `…/01-brain/decisions/ADR-DRAFT-orchestration-…md` → новый путь в `01-orchestration/decisions/`
9. `…/01-brain/state/README.md` → `…/01-orchestration/01-state/README.md`
10. `…/01-model/plan/README.md` → `…/05-plan-family/README.md`
11. **Конвертация (§4, dedup):** `…/01-model/state/README.md` — было **trace**, не def → перезаписан заглушкой
    `➡️ ../NAV.concept.json` (истина уже в NAV; оригинал в бэкапе).

**Заглушек оставлено: 11** (10 редиректов + 1 trace-конвертация). Все таргеты проверены `os.path.exists` = OK.
> Прим.: `agents-orchestration.concept.json` заглушка записана как `.md`-контент внутри `.json`-имени — если
> нужен валидный JSON-стаб, оркестратор может заменить (низкий приоритет; inbound-ссылки на этот json уже
> перенаправлены в `decisions.concept.json`).

## Фикс inbound-ссылок (rule 4)
- **Внутри перемещённых файлов** пересчитаны все относительные `Related:` и inline-ссылки:
  DESIGN.md, 01-orchestration/README.md (+ тело), ADR (frontmatter), 01-state/README.md (+ тело),
  05-plan-family/README.md (+ тело), node-types/edge-types/policy/modules (`../../{synthesis,architecture,values}` → `../../01-brain/…`).
- **Внешние inbound исправлены точечно:**
  - `…/01-model/plan/GLOBAL.md` `Related: README.md` → `../05-plan-family/README.md`.
  - `…/01-brain/decisions/decisions.concept.json` — путь ADR → новый дом.
  - `…/02-agents/INDEX.md` — добавлен пункт `01-orchestration/` + `loop-system` fold-note.
- **Broken-link скан 02-agents = 0.** Полный скан трёх зон: единственная моя регрессия (01-state → session-handoff
  STATE.md, не хватало одного `../`) — **исправлена**.

## Deferred (не гадал — rule «leave and NOTE»)
1. **`…/01-model/plan/GLOBAL.md`** и **`…/01-model/plan/design-queue.md`** — НЕ перемещены. §5 делит plan на
   «generic → 05-plan-family» vs «concrete/agent-manager → 01-orchestration/02-plan». Оба файла — **конкретные
   планы БАЗЫ** (постройка brain: миграция, passport, engine-spec / routing-rule + hard-erase), а НЕ
   agent-manager-оркестрация и не generic-семья. Ни один из двух целевых домов §5 не подходит чисто. Оставил в
   `01-model/plan/` до решения владельца: (а) завести дом «рабочих планов базы», или (б) считать их частью
   05-plan-family. Ссылки на них из 05-plan-family помечены `*(deferred)*`.
2. **`loop-system/` fold** в `04-loop/` — вне §1–4; оставлен на месте, отмечен в INDEX и 04-loop/README как «позже».

## Предсуществующий долг (НЕ мой — обнаружен сканом, к сведению)
Полный скан трёх зон нашёл ~22 битых ссылки в файлах, которых я НЕ касался (пре-долг ссылок, о котором
предупреждает MAP-current): напр. `01-node/01-passport/fields.md` → `../../../DECISIONS-LOG.md`,
`../../../domains/01-knowledge-graph/node-types.md`; `01-node/02-policy-block/*` → `../../../architecture/modules/M-G3-…`;
`01-node/analyses/02-states.md` → `../../02-stack/01-database.md`; `DECISIONS-LOG.md` → `…/01-brain/INDEX.md`.
Вне scope этого прохода — отдельная волна чистки легаси.

## Ссылки, которые СОЗНАТЕЛЬНО оставлены на старые пути (ловятся заглушками)
- `session-handoff/STATE.md`, `session-handoff/2026-07-18-ratification-backlog/OPEN-ITEMS.md` — указывают на
  старые пути DESIGN/ADR/L1-state → **приземляются на заглушки-редиректы** (rule 3). Обновить в следующую уборку.
- `restructure-2026-07/{MAP-current,MAP-target,README}.md` — намеренно описывают СТАРЫЕ пути как снимок «current»
  и план переездов. **Не трогал** (иначе испортится нарратив карты).
