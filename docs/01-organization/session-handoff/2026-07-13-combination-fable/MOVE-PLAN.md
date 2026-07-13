# MOVE-PLAN — перенос скелета «Combination» в отдельный проект

- **Status:** active (ждёт подтверждения владельца) · Owner: jenya.stasik@gmail.com · Date: 2026-07-13

## Почему скелет лежит внутри FF
Ночью (сессия под шлюзом, владелец спит) запись ВНЕ проекта FF была заблокирована — интерактивный запрос
прав некому подтвердить. Чтобы не терять работу, полный скелет собран как СТЕЙДЖ внутри FF:
`docs/01-organization/session-handoff/2026-07-13-combination-fable/combination-scaffold/`.

## Что подтвердить владельцу (2 решения)
1. **Имя проекта:** «Combination» — рабочее. Оставить / переименовать (варианты: `platform`, `core`, `os`,
   `fabric`)?
2. **Путь:** предложение — `/Users/mac16/Documents/IT/Apps/combination` (как FF — прямо в Apps).
   Альтернатива: `/Users/mac16/Documents/IT/Apps/TOOLS/combination` (рядом с agents-manager).

## Команды переноса (выполнить после подтверждения — НЕ ночью)
```bash
# 1) создать целевой проект (пример для имени combination в Apps)
DEST="/Users/mac16/Documents/IT/Apps/combination"
mkdir -p "$DEST"
cp -R "/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/01-organization/session-handoff/2026-07-13-combination-fable/combination-scaffold/." "$DEST/"

# 2) git init (по желанию; НЕ коммитить без явной просьбы — правило проекта)
cd "$DEST" && git init

# 3) перенести аналитические артефакты сессии (разрезы) в docs/decisions/ или docs/_research/ проекта
#    (FABLE-VERDICT.md, SURVIVING-CUT.md, CONTEXT-DIGEST.md, VALUES-diverge-BA.md, FABLE-BRIEF.md)
```

## Патч реестра (~/.claude/registry/projects.json) — НЕ применён ночью (запись вне FF заблокирована)
Добавить запись `combination` (и обновить `updated` → 2026-07-13):
```json
"combination": {
  "path": "/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/01-organization/session-handoff/2026-07-13-combination-fable/combination-scaffold",
  "note": "Combination — контракт объединения Brain+agents-manager в модульную платформу (marketplace). СТЕЙДЖ внутри FF; перенести в свой репозиторий (см. MOVE-PLAN).",
  "tags": ["staged", "design", "needs-move"]
}
```
После переноса: заменить `path` на целевой (`/Users/mac16/Documents/IT/Apps/combination`), снять теги
`staged`/`needs-move`, обновить `updated`.

## Чек-лист после переноса
- [ ] Путь в реестре обновлён, тег `staged` снят.
- [ ] `docs/INDEX.md` читается как канон нового проекта.
- [ ] Ссылки `../../FABLE-VERDICT.md` и т.п. поправлены на новое расположение артефактов.
- [ ] (опц.) bootstrap-agent прогнать для Charter, если решим строить (сейчас фаза DESIGN — не обязательно).
