# Этап 1, шаг 5: живой запуск памяти ff-brain (первый живой прогон скилла ff-brain-build)

- **Status:** active · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-23 · **Исполнитель:** builder (по «строю» владельца, разовое исключение G1 только на скрипты запуска/обслуживания)
- **Потребитель:** лид (приёмка, roadmap §6 «Что обнаружили») + владелец (что осталось). **Поглощает:** ничего
- **Related:** `../../../launch-kit/STAGE1-OWNER-STEPS.md` · `../../../launch-kit/RUNBOOK.md` · `03-stage1-prep.md` · скиллы `~/.claude/skills/ff-brain-build/` и `~/.claude/skills/ff-brain-use/` (журналы трения пополнены)
- **Вопрос-цель:** работает ли память живьём: запись в одном проекте, чтение в другом? **Ответ: да.**

## Выжимка (≤150 слов)
Сервис `ff-brain` поднят в pm2 (health ok, bad_lines 0) и закреплён `pm2 save`. Заведены области `ff` и `agents-manager`, папка FF пишет, agents-manager только читает (acts 33→35, повтор — «nothing to change»). Импорт промптов шлюза: 47 записей, failed [], повтор — unchanged 15. Первая запись ADR-0016 сделана из папки FF через `claude -p --mcp-config`: M8 = 0 BLOCK, квитанция показывает области `ff, agents-manager`, id `u_mvkcmjbs153v21`. Из agents-manager агент нашёл запись, путь и hash совпали с файлом. Репетиция восстановления — PASS. Протокол памяти добавлен в PROMPT.md топика 56 (бэкап есть, повтор безопасен). Живой шлюз `agent` не тронут (тот же pid, рестартов 8). Хук заблокировал два шага: проверку бэкапа в `~/.ff-brain` и прямой CLI `health/stats`. Обхода не было, оба покрыты выводом скриптов. Важно: первая запись ещё не в бэкапе (lag 48), а слой протокола в топике 56 пока без инструментов: нужны флаги `.env`.

## По шагам
| # | Команда | Результат | Итог |
|---|---|---|---|
| 0 | `git status --porcelain` (FF, AM) · `pm2 ls` | FF: чисто (кроме не относящейся `docs/03-projects/00-portfolio-focus/`). AM: несохранённые правки владельца (`.env`, 3 дока, 2 новых) — шаги их не касаются, не трогал. `ff-brain` в pm2 нет | OK (предполёт) |
| A | `cd FF && bash packages/brain/scripts/launch-brain.sh` | node v22.23.2 · dist built · созданы папка памяти и зеркало (0700) · wrote service.json/readers.json · interpreter v22.23.2 · socket up · `listening … acts 33, records 0, bad_lines 0` · health `ok:true`, `last_backup_at` есть · токены созданы сервисом · dry-run импортёра `files 15, failed []`. Баннер «pm2 update» проигнорирован, блок NEXT про `.env` пропущен | OK |
| B | `shasum -c` последнего бэкапа в `~/.ff-brain/backups` | **заблокировано хуком стоп-листа** («доступ к ~/.ff-brain запрещён»). Не обходил | BLOCKED |
| B′ | sha256 пары в зеркале `~/Backups/ff-brain-mirror` (вывод только статус) | `mirror pairs=1 sha256: OK`. sha256 самого бэкапа в папке памяти позже подтвердил скрипт шага H (1/5 `sha256 OK`, `mirror holds the same file`) | OK (покрыто) |
| C | `pm2 save` | `Successfully saved` | OK |
| D1 | `bash $KIT/stage1-scopes.sh` (dry-run) | Plan ровно 4 строки: `+ scope ff`, `+ scope agents-manager`, `~ cli[FF]` (write true, default ff), `+ cli[AM]` (read-only, personal false) | OK |
| D2 | `bash $KIT/stage1-scopes.sh --apply` | `.bak-20261023-062536` ×2 · wrote readers/service · рестарт только `ff-brain` · `acts 33 → 35` · обе папки — known reader | OK |
| D3 | `ff-brain.js health/stats` (напрямую) | **заблокировано хуком** («подмена личности памяти»). Не обходил; health/stats уже внутри D2 | BLOCKED (покрыто) |
| D4 | повтор dry-run | `nothing to change (already applied)` | OK |
| E1 | `cd AM && corepack pnpm prompt:import` | files 15, created 15, writes 47, `failed []` | OK |
| E2 | повтор | unchanged 15, writes 0, `failed []` | OK |
| F1 | `node $KIT/m8-scan.mjs $KIT/stage1-first-record.json` | `M8: 0 BLOCK · 0 WARN` | OK |
| F2 | `shasum -a 256 docs/architecture/ADR/ADR-0016-cross-project-brain.md` (закоммичен `ebc7bae`, чистый) | `c253565f…e03f1fc37` | OK |
| F3 | `cd FF && claude -p --strict-mcp-config --mcp-config ~/.config/ff-brain/mcp.json --allowedTools find,read,record` → find (дубля нет, total 0) → record | `ok:true`, `rev 1`, `dedup:false`, `warnings:[]`, receipt «Записано: ADR-0016: один мозг на все проекты → ff, agents-manager · note/active · #153v21»; полный id `u_mvkcmjbs153v21` (нужен для `brain_id` в Этапе 2) | OK |
| G | `cd AM && claude -p … --allowedTools find,read` «что решено про мозг между проектами?» | label ADR-0016 · ref `repo:ff/docs/architecture/ADR/ADR-0016-cross-project-brain.md` · hash `c253565f…` = F2 | OK |
| H | `bash $KIT/restore-rehearsal.sh --cleanup` | sha256 OK · last line JSON · mirror same · copy bad_lines 0 · copy acts 35 = backup · live acts 83, by_type `{"note":1}` · **backup lag 48** · копия удалена · `REHEARSAL PASS` | OK (с оговоркой) |
| I | RUNBOOK шаг 5 (grep маркера отдельно → блок с `cp -n PROMPT.md PROMPT.md.bak-2026-10-23`) | маркер был 0 → `applied`; 31→76 строк; первые 31 строка = бэкап; повторная проверка → «already applied» | OK |
| — | `pm2 jlist` (agent, ff-brain) | agent pid 31988, online, restarts 8 (не тронут) · ff-brain online, restarts 1 (рестарт из D2) | OK |

## Что обнаружили при первой записи
1. **Путь работает с первого раза:** 1 вызов find и 1 вызов record из FF; из AM — find+read. Агент AM понял вопрос без подсказки и дал путь и hash. На всё ушло около 3 минут.
2. **Квитанция показывает области** (`→ ff, agents-manager`): фикс `8707fb7` подтверждён на живой памяти.
3. **Неинтерактивный путь:** `claude -p --strict-mcp-config --mcp-config … --allowedTools …` работает без кнопки, разрешение задаёт `allowedTools`. В шагах владельца описан только интерактивный путь.
4. **Агент AM сказал «пересчитанный хеш совпадает»**, хотя разрешены ему были только find/read. Как он считал — не видно. Хеш я сверил снаружи, он совпал. В протокол стоит добавить: «не утверждай, что сверил, если не мог посчитать».
5. **Агент AM сам вспомнил оговорку ADR-0016:** до стоп-листа на папку мозга не подключать мозг к агентам с доступом к командам. Стоп-лист живой — хук блокировал агента дважды за этот прогон.
6. **Первая запись не в бэкапе:** бэкап только стартовый, лаг 48 актов (47 импорт + 1 запись). Порог бэкапа — 50 актов или 15 минут. Ожидание STAGE1 G (`by_type {"note":1}` в копии, lag 0) не выполнено, потому что `pm2 restart ff-brain` перед репетицией не поручался.
7. **Слои промптов не видны в stats:** live total 1 при 47 записях импорта. Видимо, системные типы в `by_type` не считаются. Не ошибка, но в RUNBOOK про это не сказано.

## Что осталось владельцу
- **Бэкап с первой записью:** либо `pm2 restart ff-brain` и снова `bash $KIT/restore-rehearsal.sh --cleanup` (ждём lag 0, в копии `note:1`), либо подождать ≤15 мин до бэкапа по таймеру.
- **Флаги шлюза (RUNBOOK шаг 4, только руками):** `GATEWAY_PROMPT_SOURCE=shadow`, `GATEWAY_BRAIN_MCP=1` в `agents-manager/.env`. Если задан `GATEWAY_LIMIT_ALLOWED_TOOLS`, дописать четыре `mcp__ff-brain__*`. Затем `pm2 restart agent` в простое и проверка `ff-brain MCP ON` / `equal:true`. ⚠️ **До этого протокол в PROMPT.md топика 56 ссылается на инструменты, которых в топике нет.** Если флаги включать не скоро, откатить: `cp PROMPT.md.bak-2026-10-23 PROMPT.md` в `.gateway/conversations/-1004351636302/56/`.
- **Смоук в Telegram (RUNBOOK шаг 6)** — после флагов.
- **Сохранить id** `u_mvkcmjbs153v21` для `brain_id` в Этапе 2 (ADR-0019).
- **База гейта (RUNBOOK 1б, `GATE-7days.md`):** stats/export «до» агенту закрыты хуком, их снимает владелец.
- **Не закоммичено** (по наказу). Изменения в git FF: только этот отчёт.
- **Трение ff-brain-build: 5 строк** — выше порога 3. Следующий ход — предложение правки скилла через `agent-builder` (а2/а4 агенту закрыты хуком, рестарт перед репетицией, порядок «слой протокола вместе с флагом», строка-исключение в таблице прав). ff-brain-use: 2 строки, ниже порога.

## Откаты (на случай)
- Сервис: `pm2 stop ff-brain && pm2 delete ff-brain && pm2 save` (папка памяти остаётся).
- Области: команда `cp …bak-20261023-062536` ×2 + `pm2 restart ff-brain`, которую напечатал D2. Слаги `ff`/`agents-manager` заняты навсегда.
- Запись: `record{id:"u_mvkcmjbs153v21", retract:true, reason}` — мягко, строка в журнале остаётся.
- Протокол топика 56: `cp PROMPT.md.bak-2026-10-23 PROMPT.md`.

Итог: решение — Этап 1 исполнен живьём (запись в FF → чтение в AM, PASS); задачи владельцу: рестарт `ff-brain` + репетиция для lag 0, флаги `.env` + смоук; задача в плане: правка ff-brain-build по 5 строкам трения через agent-builder.
