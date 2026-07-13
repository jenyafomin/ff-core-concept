---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-11
Scope: project
Type: session-handoff
Related:
  - VERDICT.md
  - session.concept.json
  - CAPTURE.md · CAPTURE-2-theme-management.md
  - /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager (ветка feat/tg-theme-merged)
---

# HANDOFF — сессия 2026-07-10 → 11 · направления → расследование → agents-manager плумбинг

## Фаза
DESIGN (память). Параллельно — плумбинг agents-manager (не зависит от brain, разрешён).

## Что сделали (по порядку)
1. **Триаж 4 направлений.** Синтез, снявший дилемму: **agents-manager = генератор ТРЕБОВАНИЙ к
   памяти** (сессии/планы/трейсы/связи/области хотят жить в БД). «Начать с памяти» и «agents-manager
   главный» — не спорят. → `CAPTURE.md`.
2. **Большое расследование, 8 развилок** (ресёрч→консилиум 3 линз→синтез, без Fable): `research/*` +
   `council/*` → единый `VERDICT.md` (таблица 8 тем + чек-лист «заложить сейчас» + **22 вопроса F1-F22
   для Fable**, 5 мастер-развилок).
3. **Два правила:** `rules-and-skills/investigation-economics/RULE.md` (модельная лестница, Fable не в
   веере, инструментовка стоимости) и `rules-and-skills/investigation-reporting/RULE.md` (формат отчёта
   = `*.concept.json`, note = МИНИМУМ).
4. **Управление темами/агентами:** видение → `CAPTURE-2-theme-management.md` (TM-1..10, RM-1..5);
   карта кода → `analysis/agents-manager-current-state.md`; модель+план → `analysis/theme-management-vision-and-plan.md`.
5. **СОБРАНО в agents-manager** (2 пакета, слиты в `feat/tg-theme-merged`, HEAD `cc43b58`, 427/427
   зелёные, НЕ запушено):
   - Пакет 1: RM-5 markdown→HTML (жирность!), персона-по-топику, `reportsToChat`.
   - Пакет 2: единый жизненный цикл темы (SAVE/ACTIVATE), `/new` архивирует, `/resume` ожил, карточка имени.
   - Отчёт: `agents-manager/docs/01-project/reports/2026-07-11-theme-and-rich-packages.concept.json`.
6. **Автоподтверждение команд:** ADR **уже был** — `agents-manager/.../ADR-0002-access-roles-and-approval-policy.md`.
   Добавлен addendum 2026-07-11: 3 режима (ask/light-confirm/full-auto), меню длительности `1ч/2ч/3ч/день/навсегда`,
   sonnet-ревьюер = да, новый вопрос **V-6 «навсегда» vs fail-closed**.
7. **`/concept`-визион** (визард, отчёты-по-файлам) → `agents-manager/.../2026-07-11-session4-concept-command-and-wizard.md`.

## Ждут решения владельца
- **V-6:** форма «навсегда» для автопилота (рек.: разрешить, но только 🟡обратимое; 🔴/сеть — всегда гейт).
- **Активация:** `git checkout feat/tg-theme-merged` + рестарт шлюза → увидишь жирность + темы. Один смок: `/new`,`/resume`,ответ с `**жир**`.
- **Пакет 3?** каждый ход → .md-файл + richMessage + concept.json (RM-1/2). да/нет.
- **Ветки/worktrees:** пушить `feat/tg-theme-merged`? Убрать worktrees `am-pkg1/am-pkg2/am-merge` после активации.
- Формат отчётов — согласован (concept/preset, минимум note). ✅

## Технический контекст (не потерять)
- Checkpoint WIP владельца: коммит `4522876` на `feat/sdk-runner` (обратимо `git reset --soft HEAD~1`).
- Worktrees: `TOOLS/am-pkg1` (Пакет1), `am-pkg2` (Пакет2), `am-merge` (слияние). node_modules — симлинки.
- gpg: коммитить `git -c commit.gpgsign=false commit --no-verify` (иначе pinentry вешает).

## ▶ Следующее (главное) — ПАМЯТЬ
Многие механики нельзя делать на уровне агентов, пока не закрыт вопрос памяти (планы-как-данные,
связи-роутер, трейс токенов, сессия-как-узел, «тема ждёт вопросов», персона-как-узел — всё это узлы БД).
→ Следующая сессия = **сходимость единицы памяти** по мастер-развилкам **F1-F5** (`VERDICT.md §5`) с
дорогим Fable. Это гейт, разблокирующий agents-manager дальше.
