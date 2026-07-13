---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-11
Scope: project
Type: status-ledger
Related: HANDOFF.md
---

# STATUS-LEDGER — что готово / не готово (по голосовым заданиям сессии 2026-07-10/11)

## ✅ ГОТОВО
- Разбор 4 направлений + последовательность → `CAPTURE.md`
- Большое расследование 8 развилок (без Fable) → `VERDICT.md`, `research/*`, `council/*`
- Консилиум по каждому вопросу → `council/*`
- 22 вопроса для Fable собраны (5 мастер) → `VERDICT.md §5`
- Правило экономики веера → `rules-and-skills/investigation-economics/RULE.md`
- Правило отчётности (формат concept, note=минимум) → `rules-and-skills/investigation-reporting/RULE.md`
- Ответ: редактировать сообщения / кнопки / plain→rich → ДА (подтверждено по коду grammY)
- Разбор видения «управление темами» (2 агента) → `analysis/agents-manager-current-state.md`, `analysis/theme-management-vision-and-plan.md`
- Код Пакет 1 (жирность markdown→HTML · персона-по-топику · reportsToChat)
- Код Пакет 2 (жизненный цикл темы: `/new` архивирует · `/resume` ожил · карточка имени)
- Мерж двух веток → `feat/tg-theme-merged` @ `cc43b58`, 427/427 зелёные
- ADR автоподтверждения дополнен твоими уточнениями → `agents-manager/.../ADR-0002` addendum
- Формат отчётов согласован + concept облегчён (минимум) → done
- Полный хендоф + кросс-файл concept + STATE сдвинут → `HANDOFF.md`, `session.concept.json`

## 🟡 СДЕЛАНО, НО НЕ АКТИВНО (нужен твой 1 шаг)
- Жирность (RM-5) — фикс в ветке, но в чате ПОКА не видишь → нужен `git checkout feat/tg-theme-merged` + рестарт шлюза.
- Темы (`/new`,`/resume`,карточка имени) — в той же ветке, ждут активации.

## ⬜ НЕ ГОТОВО (с причиной)
- Автономный режим / автоподтверждение — только СПРОЕКТИРОВАН (ADR-0002), код не начат; ждёт решения **V-6** «навсегда».
- Пакет 3 (каждый ответ → .md-файл + richMessage + concept.json; RM-1/RM-2) — не начат, ждёт твоего да/нет.
- Команда `/concept` + wizard (показ отчётов, дерево, переходы) — фаза 2, пока визион → `agents-manager/.../2026-07-11-session4-concept-command-and-wizard.md`.
- Смена личности/роли агента (`/agent list|switch|clone`, TM-6/7) + центральный пульт (TM-9) — захвачено, не начато (размер L).
- «Тема ждёт вопросов» (TM-8) — ждёт ПАМЯТЬ.
- Реестр локальных путей проектов (QW-1: `seven days` и др.) — захвачено в `CAPTURE.md`, НЕ сделано (мелочь, могу быстро).
- Пуш ветки `feat/tg-theme-merged` — не пушено (жду тебя).

## Уже было в коде до сессии (не в счёт)
- Модель в заголовке сообщения (RM-3), `/send` файла целиком (RM-2 частично).
