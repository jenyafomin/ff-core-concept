---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-17
Scope: project
node_type: analysis
title: Универсальное логирование — logs/conversations/NN + concept.json (замена session-logging)
Related:
  - ../README.md
  - ../TREE.md
  - ../../../../../../01-organization/rules-and-skills/session-logging/SKILL.md
  - ../../../../../../01-organization/session-handoff/STATE.md
  - ../../integration.concept.json
---

# Универсальное логирование — рекомендация (оформление склонности владельца)

## 1. Структура
```
logs/                                  ← корень, целиком в .gitignore
└── conversations/
    └── NN/                            ← один /new = один разговор (NN = порядковый, zero-pad)
        ├── concept.json               ← перелинковщик разговора (см. п.2)
        ├── analyses/NN-<slug>.md
        ├── questions/NN-<slug>.md
        ├── ideas/NN-<slug>.md
        └── speeches/                  ← появляется только когда разговор разросся
            └── NN/                    ← под-разговор, та же подструктура внутри
```
Нумерация разговоров сквозная и монотонная (не по дате — по порядку `/new`); внутри разговора темы (`analyses/questions/ideas`) нумеруются свои — так же, как в session-logging нумеровались темы.

## 2. `concept.json` (минимум полей)
```json
{
  "conversation_id": "07",
  "started": "2026-07-17",
  "topic": "короткий ярлык",
  "status": "open|closed",
  "summary": "1-2 строки — что реализовано по факту (не пересказ, а замок)",
  "canon_links": [{"ref": "docs/.../путь.md", "note": "что туда легло"}],
  "speeches": []
}
```
`canon_links` — это ровно роль старого `→ Проекция в канон` из session-logging, но машиночитаемая.

## 3. Что gitignore-ится
- Весь `logs/` целиком (включая `conversations/**`) — не попадает в репо ни при каких условиях.
- Внутри logs правило доп.уровня: сырой промпт владельца не тащим дословно даже в локальные файлы разговора — только `summary` (короткий реализованный концепт) живёт в `concept.json`, т.к. именно `summary`/`canon_links` — кандидат на будущее промоушен в docs (experimental → project, см. `~/.claude/rules/on-demand/evolution.md`), а сырой текст — нет.

## 4. Замена session-logging
Текущий скилл (`docs/01-organization/rules-and-skills/session-logging/SKILL.md`) построен вокруг единицы «сессия = дата+контекст» в `docs/01-organization/session-handoff/`, физически не установлен и коммитится в репо. Новая схема меняет единицу на «разговор = `/new`» и переносит журнал целиком в локальный гitignore-`logs/`; `INDEX.md` сессии → `concept.json` разговора; `STATE.md` в docs остаётся ЕДИНСТВЕННЫМ committed-указателем «где мы» и должен получать обновление вручную/по мосту из свежих `canon_links`, а не дублировать их. Это ЗАМЕНА, не надстройка — правки в SKILL.md session-logging нужно переписать под эту схему (или пометить `obsolete` и завести новый скилл `logs-conversations`).

## 5. Риск
Поскольку `logs/` не в git и не шарится между машинами/агентами — `concept.json.canon_links` может разойтись с реальным состоянием `docs/` (обещали «легло сюда», а канон-док с тех пор переехал/переименован), и без ручной сверки со `STATE.md` это тихо накапливает orphan-указатели.
