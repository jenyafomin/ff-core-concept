---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-20
Scope: project
node_type: plan
title: Растворение decomposition/ — карта переноса (from→to)
Related:
  - ./MAP-target.md
  - ../../../02-project/core/01-brain/INDEX.md
  - ../../../00-states/03-brain-productization/state.md
---

# 🗺️ Растворение `01-brain/decomposition/` — карта переноса

> Владелец (2026-07-20): «decomposition разрослась и дублирует то, что уже есть; всё поперенести по
> домам; ссылки собьются — не страшно, поправим потом». Аналитик подтвердил: 64 файла = trace (сброс
> 2026-07-14 + ночные сессии 07-16…18) + более глубокое, но лежащее НЕ в доме знание, дублирующее
> `domains/`, `architecture/`, `decisions/`. **Рекомендация: растворить `decomposition/` полностью.**

## Диагноз (двухслойное дублирование)
1. `01-model/{01-node,02-edge,_shared/{policy-as-data,passport,hard-erase}}` — новее/глубже, но
   ДУБЛИРУЮТ канон 2026-07-12 в `domains/01-knowledge-graph/{node-types,edge-types,policy}.md`,
   `architecture/modules/M-G3-type-registry-policy/`, `decisions/SPEC-DRAFT-forgetting-hard-erase.md`.
2. Верхний уровень (`README/INTEGRATION/SYNTHESIS-integration/PICTURE/integration.concept.json`) — trace
   ОДНОГО сброса 2026-07-14 (сам ссылается на `session-handoff/2026-07-14-vector-and-defektovka/`).
3. `01-node/{VISION-SIMPLE,HANDOFF-2026-07-16,START-HERE,FABLE-*,…,analyses/}` — trace ночей 07-16…18.
4. `_shared/routing-rule` (D-7), `02-stack`, `03-method` — НЕ дубли, но лежат не в своём типе дома.

## Порядок исполнения
### Шаг 1 — безопасно (исполнено 2026-07-20): чистый trace + мёртвые стабы
- `01-node/` trace-файлы (VISION-SIMPLE, HANDOFF-2026-07-16, START-HERE, NEXT-STEPS, SYNTHESIS-unit,
  DECISIONS-unit, TREE, README, _critique*, FABLE-*, APPLIED-2026-07-18, PROCESS-UPGRADE-2026-07-17,
  analyses/) → **`session-handoff/2026-07-18-memory-unit-design/`**.
- Удалить `moved`-стабы: `01-model/plan/README.md`, `01-model/state/README.md`,
  `01-model/_shared/mechanisms/orchestration/DESIGN.md`.
- Остаток `01-node/` = чистое knowledge (`00-card`, `01-passport`, `02-policy-block`, `03-context-resolver`) → Шаг 3.

### Шаг 2 — структурный перенос (ждёт исполнения; без слияния содержимого)
- `decomposition/{README,INTEGRATION,SYNTHESIS-integration,PICTURE.concept.json,integration.concept.json}`
  → `session-handoff/2026-07-14-vector-and-defektovka/` (⚠️ в integration.concept.json есть ЖИВЫЕ
  owner_focus_questions — перед архивацией вынести открытые форки в state-03/decisions).
- `_shared/routing-rule/README.md` (D-7) → `decisions/D5-routing-rule/` (по образцу D1-D4).
- `01-model/plan/GLOBAL.md` → влить в `00-states/00-global-build/state.md`.
- `02-stack/*` → `architecture/stack/` · `03-method/{01-entity-schema,02-adr-discipline}` → `docs/01-organization/doc-discipline/`.

### Шаг 3 — СМЫСЛОВОЕ слияние дублей (нужен агент-синтезатор, НЕ git mv; ждёт форка D1 владельца)
- `01-node/{00-card,01-passport,02-policy-block,03-context-resolver}` + `_shared/{passport,policy-as-data}`
  → `domains/01-knowledge-graph/{node-types,edge-types,policy}.md` + `architecture/modules/M-G3,M-G2`.
- `_shared/mechanisms/hard-erase` (R-ERASE, INV-LINEAGE) → обновить `decisions/SPEC-DRAFT-forgetting-hard-erase.md`.

### Шаг 4 — финал: удалить пустой `decomposition/`, обновить `01-brain/INDEX.md`.

## Развилки владельца — РАТИФИЦИРОВАНО 2026-07-20
- **F-D1 ✅ новее/глубже побеждает как НАПРАВЛЕНИЕ, но LOSE-NOTHING.** Ничего не удалять — даже схожие
  анализы/вопросы. Обе версии → в ОДНУ папку как отдельные ДАТИРОВАННЫЕ доки (`<slug>-YYYY-MM-DD.md`),
  затем синтез (агент-синтезатор+критик). Реестр: `conventions.mergeLoseNothing`. **Шаг 3 = additive co-location, НЕ git mv-перезапись.**
- **F-D2 ✅ стиль одной волны → `_log`.** `03-method/{04-deepening,05-units-map}` — не универсальное правило →
  в `_log`/session-handoff (исполнено: → `session-handoff/2026-07-18-memory-unit-design/method/`). Всё, связанное
  с session-handoff, храним в логах.
- **F-D3 ✅ `topics/`-стейджинг.** constitution (и всё без чистого типа) → контейнер `topics/` на нужном уровне
  → позже реассембл в дом или `_log`. Исполнено: → `01-brain/topics/01-constitution/`. Реестр: folderType `topics`.
- **F-D4 ✅ ок** — картина «11 тем/3 группы» остаётся историческим снимком в session-handoff; физически темы
  едут в свои дома.

## Новые правила реестра (2026-07-20, из ответов владельца)
- **`topics/`** — плюрал-контейнер-стейджинг для тем без типа (верстак, не дом; реассембл→дом/`_log`).
- **`idea` / `ideas`** — одна идея (`.idea.md`) vs плюрал-контейнер-индекс (агрегирует+линкует, без дублей).
- **`mergeLoseNothing`** — со-размещение датированных версий вместо деструктивной перезаписи.

## ✅ Исполнено 2026-07-20 (builder + проверки оркестратора)
- **Все 4 шага сделаны.** `decomposition/` растворён полностью (64→0), папка удалена.
- Перенос: 60 `git mv` (renames = ничего не потеряно) + 3 намеренных удаления мёртвых стабов (прошлый ход).
  Дубли со-размещены под датированными именами (`*--decomp-2026-07-14.md`) РЯДОМ с каноном (канон не тронут).
- **MERGE-NOTES** (что уникально в глубоких версиях — для будущего синтеза):
  `domains/01-knowledge-graph/MERGE-NOTES-2026-07-20.md` · `architecture/modules/M-G3-type-registry-policy/MERGE-NOTES-2026-07-20.md` · `decisions/MERGE-NOTES-hard-erase-2026-07-20.md`.
- Проверки: линт 33/33; git renames (не deletes); цели на месте; MERGE-NOTES непусты. state-00 GLOBAL-ссылка починена.

## ⏭ Отложено (по решению владельца)
- **СИНТЕЗ дублей** (LOSE-NOTHING → свести `*--decomp-*` в канон по MERGE-NOTES) — отдельный ход, агент-синтезатор+критик.
- **Link-debt: ~63 tracked-дока ещё ссылаются на старые пути `decomposition/…`** — чиним пост-фактум (владелец: «ссылки собьются — не страшно»).
