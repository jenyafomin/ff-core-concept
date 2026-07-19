---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-17
Scope: project
node_type: patch
title: Патч для ~/.claude/skills/doc-discipline/SKILL.md — ратифицированные конвенции 2026-07-17 (НЕ применён)
Related:
  - ../../02-project/core/01-brain/decomposition/01-model/01-node/analyses/RECOMMENDATIONS.md
  - ../../02-project/core/01-brain/decomposition/01-model/01-node/analyses/RATIFIED-and-new-concepts-2026-07-17.md
  - ../../02-project/core/01-brain/decomposition/01-model/01-node/PROCESS-UPGRADE-2026-07-17.md
  - registry.seed.json (docs/01-organization/registry.seed.json)
---

# ⚠️ Патч не применён к скиллу — только к докам

**Флаг владельцу:** сессия agent-builder от 2026-07-17 НЕ смогла записать в
`~/.claude/skills/doc-discipline/SKILL.md` — путь вне разрешённых рабочих директорий этой сессии
(запись за пределы `.claude/` блокируется разрешениями; попытки Write/Edit/Bash все вернули
`Tool permission request failed: Error: Stream closed`). Раздел ниже подготовлен готовым к вставке —
**добавь его вручную** в конец `~/.claude/skills/doc-discipline/SKILL.md` (перед разделом
«## Само-улучшение» или после него — не критично), либо попроси agent-builder в сессии с доступом
к `~/.claude/skills/` дописать файл. Бэкап самого скилла в этой сессии тоже не был создан (та же причина);
сделай его перед правкой (`cp SKILL.md SKILL.md.bak-2026-07-17`).

Всё остальное из задачи (session-logging, registry.seed.json, docs/00-states/README.md, миграция
PROCESS-UPGRADE) — выполнено, см. итоговый отчёт сессии.

---

## Раздел для вставки в `doc-discipline/SKILL.md`

```markdown
## Конвенции 2026-07-17 (ратифицировано)

> Источник: `docs/02-project/core/01-brain/decomposition/01-model/01-node/analyses/RECOMMENDATIONS.md` (R1–R5)
> + `RATIFIED-and-new-concepts-2026-07-17.md` (решение владельца, 2026-07-17). R1·R2·R4 — применять сейчас.
> R5 — отдельная волна (см. RATIFIED, Концепт-1); здесь только сид реестра
> (`docs/01-organization/registry.seed.json`), полный дизайн реестра+навигации не входит в этот скилл.

### R1 — Нумерация
- Именованная папка-узел (сущность/концепт) всегда получает порядковый префикс (`01-`, `02-`…) по очереди
  обсуждения; при пересборке дерева — перенумеровка.
- Плюральные КОНТЕЙНЕРЫ (`analyses/ questions/ ideas/ plans/ states/`) — БЕЗ номера на уровне самой папки;
  файлы ВНУТРИ контейнера — нумеруются как обычно.
- Неизвестная папка (нет типа в реестре) → заводи «доску» ВНУТРИ обязательного `INDEX.md` этой папки
  (3 строки: Концепт · Ожидаемый тип · Проверка зрелости). НЕ создавай отдельную `rules/` — коллизия с
  `.claude/rules`. `concept-first` сигналит момент переезда/кристаллизации, `doc-discipline` делает механику
  переноса.

### R2 — Состояния (states)
- Единственный дом: `docs/00-states/` на КОРНЕ дерева документации (не внутри тем/веток проекта).
- Плоская схема `00-states/NN-<slug>/`; тема, к которой относится состояние, — ПОЛЕ внутри (`theme:` в
  фронтматтере), не вложенность папок.
- Внутри узла состояния: `state.md` (`id·theme·status·opened/updated·agents[]·plans[]`) + append-only `log.md`.
- Состояние НИКОГДА не удаляется — при закрытии архивируется СТАТУСОМ (`status: archived`), не удалением
  файла/папки; рост компенсируется дисциплиной архивации, а не выпиливанием (см. риск в RECOMMENDATIONS.md).

### R4 — План / Задача
- Контейнер `plans/` (без номера, конвенция R1); файл плана — `PLAN-<id>-<slug>.md`.
- Обязательные поля фронтматтера плана: `node_type · status (draft/active/blocked/done/archived) · topic ·
  target_state · parent_plan · owner · date`.
- `task` по умолчанию — строка/пункт ВНУТРИ плана (не отдельный файл). Промотируется в `tasks/<id>/` только
  когда нужен собственный подграф (обязателен `parent_plan`, указывающий назад на план).
- Ребро `plan --targets--> state`: план целится в конкретное целевое состояние; один `state` может держать
  несколько планов одновременно (большой луп).

### R5 — Реестр (СИД, полный дизайн ОТЛОЖЕН)
- Минимальный сид типов лежит в `docs/01-organization/registry.seed.json` (10 базовых типов, `scope: global`
  на каждый). Это словарь минимальных известных типов, не enforcement-механизм.
- Полный дизайн реестра+навигации (проектный оверлей поверх глобального, версии папок, `concept.json`-как-граф,
  инструмент в шлюз) — НЕ входит сюда, поднят отдельной волной (см. `RATIFIED-and-new-concepts-2026-07-17.md`,
  Концепт-1). Не расширяй этот раздел до завершения той волны.
```
