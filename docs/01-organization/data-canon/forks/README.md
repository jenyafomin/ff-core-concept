---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-22
Scope: project
node_type: overview
title: Открытые форки владельцу — навигатор + приоритет + следующие действия
Related:
  - ../doc-discipline/restructure-2026-07/brain-top-level/PLACEMENT-AUDIT-2026-07-21.md   # ИСТОЧНИК форков (§9/§10)
  - ../doc-discipline/restructure-2026-07/README.md    # план-оф-рекорд R-A/R-B
  - ../VOCABULARY-SPINE.md
  - ../CONFUSIONS-REGISTER.md      # C8 = живой форк F1
---

# 🔀 Открытые форки — навигатор

> **Зачем этот контейнер.** Форки не должны теряться в чате. Здесь — **9 решений владельца**,
> которые блокируют переезд brain-единиц (R-B). Источник = `PLACEMENT-AUDIT §9`. Каждый форк —
> **свой узел-папка** (потенциал роста; сюда наращиваем «ход мысли / что учесть»). Это README —
> единственный навигатор (ВИД), а не второй дом истины. Ответ владельца пишем в строку
> `РЕШЕНИЕ:` внутри папки форка (LOSE-NOTHING, дубля контента нет).

## Таблица форков

| # | Форк | Вопрос (кратко) | Приоритет |
|---|------|-----------------|-----------|
| 🚨 F1 | [F1-domain/](./F1-domain/) | «Домен» = концерн-кластер (D1–D4) ИЛИ data-домен (knowledge-graph один)? | **БЛОКЕР №1** |
| F2 | [F2-units-law-or-exception/](./F2-units-law-or-exception/) | `02-units/` — checkable-закон или логированный one-off (n=1)? | следом |
| F3 | [F3-project-axis-and-core/](./F3-project-axis-and-core/) | Ось `02-project` + `core→01-core`: кто равноправные звенья? | после F1/F4 |
| F4 | [F4-platform-node/](./F4-platform-node/) | Узел «платформа»/«модуль» (D1-Q8): завести node_type + дом? | после F1 |
| F5 | [F5-family-shared-tier/](./F5-family-shared-tier/) | family-shared ярус `02-units/_shared/` — ввести? | **до git mv** |
| F6 | [F6-hard-erase-home/](./F6-hard-erase-home/) | `hard-erase`: value-owned vs сквозной vs оба? | **до git mv** |
| F7 | [F7-reification-scope/](./F7-reification-scope/) | `reification`: domain-local vs сквозной — выбрать канон? | **до git mv** |
| F8 | [F8-category-taxonomy-close/](./F8-category-taxonomy-close/) | `category-taxonomy`: ратифицировать закрытие форка? | следом |
| F9 | [F9-canon-supersession/](./F9-canon-supersession/) | Supersession между канон-доками — кто побеждает и где? | **до git mv** |

## Статус ответов (2026-07-22)
**Все 9 форков получили `РЕШЕНИЕ` — статус `review` (синтез, ждут кивка владельца → ADR).** Своды:
- **F1** — домен = субъект данных; расщепить слово; убрать ось `ценность→домен`; `02-domains` по предикату.
- **F5** — ярус `_shared/` не вводить (хватает `_shared/`+теги; promotion-by-evidence).
- **F6** — `hard-erase` дом = `07-soglasie` (принадлежит Согласию, служит всем).
- **F7** — `reification` = сквозной (⚠️ сверить с DEVELOPMENTAL-MODEL).
- **F9** — единый арбитр = спайн/`data-canon`; проигравшие → `Supersedes`.
- **F2** — `02-units/` = исключение (n=1), не закон; предикат логируем `experimental`.
- **F3** — `substrate` = дубль brain → слить в `core/01-brain/02-infrastructure/01-overview/`.
- **F4** — node_type «платформа» НЕ вводить; расщепить: платформа=субстрат+рантайм, модуль=manifest+рёбра+lens.
- **F8** — `category-taxonomy` закрыть → `decisions.INDEX` (DL-09/DL-10); GROWTH-MAP → `Supersedes`.

## Приоритет ответов (история)
Критично сначала: **F1 (блокер)** → затем **F5, F6, F7, F9** (критик требует до любого `git mv`).
Остальные (F2/F3/F4/F8) — следом. _(Все отвечены 2026-07-22.)_

## Следующие действия (сохранённый план)

**Поток R-A (уборка, НЕ форк-блокирован) — можно параллельно:**
1. Политика заглушек = **A** (надгробие не считается «кучей») — согласовано.
2. Прогон уборки: архив `base/`+`topics/`→мост-ledger · опечатка `04-knowladge→04-knowledge` ·
   навигаторы `02-infrastructure/01-overview` + `02-agents/01-orchestration` → 1 навигатор ·
   `01-values` карточки → под-папки. Критик-гейт, LOSE-NOTHING.
3. Перегенерить `tools/lint/doc-tree.mjs` → 🔴 должно упасть с 26.

**Поток R-B (brain-единицы, ФОРК-блокирован):**
1. Владелец закрывает F1 + F5/F6/F7/F9 (папки выше).
2. **ADR** структуры субстрата + 3 опоры хребта + `Supersedes` (F9).
3. claim-ledger LOSE-NOTHING (0 неучтённых строк из `_archived/.../01-model/`).
4. `git mv` единиц в `02-units/` — только по «строй».

> Правило: без ответа на F1 нумерация доменов и половина переезда «стоят на песке» (аудит §10).
