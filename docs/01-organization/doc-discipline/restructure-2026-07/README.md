---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-21
Scope: project
node_type: plan
title: Реструктуризация дерева 2026-07 — ПЛАН-ОФ-РЕКОРД (как именно пойдёт) + навигатор трека
supersedes: "версия-вход 2026-07-19 (две карты путей) — свёрнута сюда"
Related:
  - ../../../INDEX.md                     # карта понимания docs/
  - ../../../../.claude/rules/doc-tree.md  # законы размещения (всегда в контексте)
  - ./brain-top-level/PLACEMENT-AUDIT-2026-07-21.md  # карта размещения brain (что→куда)
  - ./MAP-target.md                       # целевая инфраструктура
  - ../../../00-states/04-improvement-plans/PLAN-03-docs-structure.md  # S-03 = мета-план/пульт; R-A = его трек исполнения
---

# 🗺️ Реструктуризация 2026-07 — ПЛАН (как именно пойдёт)

> Один файл-ответ на «как будет происходить реструктуризация» + навигатор трека. Дом плана — ЗДЕСЬ
> (`01-organization/doc-discipline/`), не в `_log` (лог = след, план = знание). **Файлы двигаются только по «строй».**

## 🎯 Два независимых потока (не смешивать)
| Поток | Что | Заблокирован? |
|---|---|---|
| **R-A · Уборка ДОК-ОРГАНИЗАЦИИ** | груда карт, `_inbox`, `substrate`, навигаторы, опечатка `04-knowladge` | ❌ НЕТ — готов к «строй» |
| **R-B · Единицы brain → `02-units/`** | 5 единиц + опоры хребта + синтез дублей | ✅ ДА — ждёт 9 форков (PLACEMENT-AUDIT §9) |

---

## R-A · План уборки док-организации (готов, обратимо)
Порядок (каждый шаг: заглушка-редирект + git-точка, 0 удалений):
1. **Груда карт → контейнер.** `MAP-current · MAP-target · DECOMPOSITION-DISSOLVE-MAP · AUDIT-MAP-2026-07-21 · PLACEMENT-AUDIT-2026-07-21` → `maps/` (датированные, плюрал-контейнер).
2. **Предложения → контейнер.** `HOOK-PROPOSAL · SKILL-UPGRADE-PROPOSAL · REGISTRY-UNIFICATION` → `_proposals/`.
3. **`brain-top-level/` (16f 🔴).** `01…11-*.md` оставить как нумерованный ряд-спека; `DEVELOPMENTAL-MODEL` рядом; карты → `maps/`; этот README = единственный навигатор.
4. **`docs/_inbox/`** (растворён, остался README) → убрать (редирект в `_log`).
5. **`docs/02-project/substrate/`** (пустой дубль) → свернуть в `01-brain` редиректом.
6. **`docs/04-knowladge/`** (опечатка) → `04-knowledge` ИЛИ убрать до контента.
7. **Related-чек** после каждого переезда (нет битых ссылок = критерий «готово»).
8. **Перегенерировать** `node tools/lint/doc-tree.mjs` → 26 🔴 должно упасть.

## R-B · План единиц brain (заблокирован форками)
Строгий гейт из `PLACEMENT-AUDIT-2026-07-21.md` §10 — НЕ исполнять до ответов:
1. Владелец отвечает 9 форков (блокер F1 = что значит «домен»).
2. **ADR** структуры субстрата + 3 опоры хребта + Supersedes между DEVELOPMENTAL-MODEL / 11-facet / AUDIT-MAP.
3. Конституция + integrity-as-engine-duty → файлы (backbone) ДО движения единиц.
4. **claim-ledger LOSE-NOTHING** (0 неучтённых строк из `_archived/.../01-model/`) → потом `git mv` в `02-units/`.

---

## 🧭 Что лежит в трек-папке (навигатор по типам)
| Тип | Файлы | Роль |
|---|---|---|
| **план/навигатор** | `README.md` (этот) | вход + план-оф-рекорд |
| **maps (from→to)** | MAP-current · MAP-target · DECOMPOSITION-DISSOLVE-MAP · AUDIT-MAP-2026-07-21 · brain-top-level/PLACEMENT-AUDIT-2026-07-21 | карты размещения (→ `maps/` по R-A шаг 1) |
| **модель/спека** | brain-top-level/DEVELOPMENTAL-MODEL · brain-top-level/01…11-*.md | модель роста + 11 аспектов дисциплины |
| **_proposals** | HOOK-PROPOSAL · SKILL-UPGRADE-PROPOSAL · REGISTRY-UNIFICATION | предложения (→ `_proposals/` по R-A шаг 2) |
| **trace/лог** | MIGRATION-LOG · LOG-MODEL | след миграции (проверить: не в `_log`?) |

## Статус
`active` · R-A готов к исполнению по «строй» · R-B заблокирован 9 форками. История «две карты путей» (2026-07-19) свёрнута в этот план.
