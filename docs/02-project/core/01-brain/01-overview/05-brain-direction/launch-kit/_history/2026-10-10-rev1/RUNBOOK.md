# RUNBOOK — запуск памяти (ff-brain) в живую работу

- **Status:** active (готов к исполнению владельцем) · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-10
- **Потребитель:** владелец (команды руками в терминале) + лид (смоук и подсчёт гейта)
- **Поглощает:** шаги 3–6 `../HANDOFF-2026-10-10.md` и «точную последовательность» `../prelaunch-review/analyst.analysis.md` (уточнены)
- **Related:** `../../../../packages/brain/scripts/launch-brain.sh` · `PROMPT-memory-protocol.md` · `GATE-7days.md` · `../prelaunch-review/SYNTHESIS.md`

## Факты, на которых стоит план (проверено 2026-10-10)
- **Рабочий топик = `-1004351636302:56`** (эта беседа «ff_future»: сессия шлюза `telegram:-1004351636302:56:ff-orchestrator`
  ↔ claude-сессия `36d53d28…`, БД `agents-manager/data/gateway-ff-personal.db`). Владелец `user 1112667160`.
  Кандидат на будущее: `7414` «МОИ ЗАДАЧИ» (молчит с 09-29) — `TOPIC_ID=7414` в скрипте, если туду переедет туда.
- **pm2:** живой `agent` работает на Node v22.23.2; демон pm2 — 5.4.2 на Node 18. `ecosystem.brain.config.cjs` теперь
  с абсолютным `interpreter` (v22.23.2, переопределяется `FF_BRAIN_NODE`) — тест `packages/brain/test/service/ecosystem-config.test.ts`.
- **Области (scopes) аддитивны:** при каждом старте genesis пропускает уже существующие узлы и дописывает новые
  (`packages/brain/src/domain/schemas.ts:71-76`, вызов из `service/runtime.ts:141-147`); новые слаги из `service.json`
  подхватываются на рестарте `pm2 restart ff-brain`. НЕ аддитивно: имя/вид существующей области (игнорируется) и
  **родитель (`member_of`) существующей области** — ни через `service.json`, ни через `link`
  (`validate-act.ts:679-699`). Записи между областями переносимы: `record` с тем же id и новыми `scopes`.
  Всё закреплено тестом `packages/brain/test/domain/launch-config.test.ts`.
- **Поэтому стартовый набор = одна область `personal`** (kind `personal`, верхнего уровня — родитель ей не нужен никогда).
  `ff` и компании НЕ заводим сейчас: `ff` позже захочет родителя-компанию, а родителя к существующей области не добавить.
  Компании→проекты владелец продиктует позже → дописать в `service.json` (родители выше детей) → `pm2 restart ff-brain`.
- Область `personal` = записи только для владельца (`pii-scope.ts:114-115`) → привязке топика нужен `"personal": true`,
  иначе агент не увидит собственные задачи (проверено тестом).

## Последовательность (владелец, по порядку; каждая команда — отдельно)

### Шаг 1. Скрипт запуска мозга
```
cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment
bash packages/brain/scripts/launch-brain.sh            # другой топик: TOPIC_ID=7414 bash packages/brain/scripts/launch-brain.sh
```
Ждём: `node v22.23.2` · `dist built` · `wrote service.json` · `wrote readers.json` · `interpreter …/v22.23.2/bin/node` ·
`socket up` · лог `listening … acts 32+, bad_lines 0` · health `ok:true` · `service created token / gateway.token / secret` ·
dry-run импортёра `files 15, created 15, failed []`.
Скрипт идемпотентен: существующие `service.json`/`readers.json` не трогает, ничего не удаляет, `pm2 update/kill` не делает.
Создаёт: папку памяти (0700), `~/Backups/ff-brain-mirror` (0700), `service.json` и `readers.json` (0600).
- **Откат:** `pm2 stop ff-brain` (и `pm2 delete ff-brain`, чтобы забыть процесс). Папка памяти остаётся — её удаление только руками владельца.

### Шаг 2. Закрепить список pm2
```
pm2 save
```
- **Откат:** после `pm2 stop/delete ff-brain` снова `pm2 save`.

### Шаг 3. Реальный импорт промптов в мозг
```
cd /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager
corepack pnpm prompt:import            # ждём failed [], writes ~47; повтор → unchanged 15
```
- **Откат:** не нужен — слои ни на что не влияют, пока `GATEWAY_PROMPT_SOURCE` не `shadow`/`brain`. Не запускать с другим `--cwd` для того же бота (отзовёт слои).

### Шаг 4. Флаги шлюза — дописать в `agents-manager/.env` (руками; агенту нельзя)
```
GATEWAY_PROMPT_SOURCE=shadow
GATEWAY_BRAIN_MCP=1
```
Больше ничего не нужно (дефолты верны): `GATEWAY_BRAIN_HOME`/`GATEWAY_BRAIN_SOCKET` — не задавать (дефолт = папка памяти);
`GATEWAY_BRAIN_MCP_CMD` — не задавать (дефолт = node самого шлюза, v22); `GATEWAY_PROMPT_BRAIN_TIMEOUT_MS` — дефолт 150;
`GATEWAY_RUNNER_MODE` — должен быть пуст или `sdk` (MCP работает только в sdk). **Проверить:** если в `.env` задан непустой
`GATEWAY_LIMIT_ALLOWED_TOOLS`, дописать в него `mcp__ff-brain__find,mcp__ff-brain__read,mcp__ff-brain__record,mcp__ff-brain__link`.
Затем — **когда в топиках нет идущего хода** (рестарт обрывает текущий ход):
```
pm2 restart agent
pm2 logs agent --nostream --lines 200 | grep -E "ff-brain MCP|prompt-shadow"
```
Ждём: `ff-brain MCP ON (…/packages/brain-mcp/dist/index.js)`; после первого сообщения — `prompt-shadow … equal:true`.
- **Откат:** удалить/закомментировать две строки → `pm2 restart agent` (шлюз вернётся к локальным промптам и без памяти).

### Шаг 5. Протокол агенту — слой промпта топика 56 (владелец или лид)
```
cd /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/.gateway/conversations/-1004351636302/56
grep -q "ff-brain-protocol" PROMPT.md && echo "already applied" || {
  cp -n PROMPT.md PROMPT.md.bak-2026-10-10
  { echo; echo "<!-- ff-brain-protocol -->"; awk '/<!-- LAYER-START -->/{f=1;next}/<!-- LAYER-END -->/{f=0}f' \
    /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/_log/2026-10-05-personal-memory-launch/launch/PROMPT-memory-protocol.md; } >> PROMPT.md; }
```
Действует со следующего сообщения; shadow сам ресинкнет слой в мозг. `.gateway/` в git шлюза не входит (`.gitignore:15`) — бэкап только файлом.
- **Откат:** `cp PROMPT.md.bak-2026-10-10 PROMPT.md`.

### Шаг 6. Смоук в Telegram (топик 56)
1. «Что у меня по делам?» → агент зовёт `find(scope:"personal", preset:"scope")` → пусто, без ошибки.
2. «Добавь задачу: <реальное своё дело> до <дата>» → кнопка на `mcp__ff-brain__record` → нажать (или «♾️ Всегда» —
   развилка D4: всегда / терпим трение) → в ответе одна строка-receipt.
3. «Покажи открытые задачи» → задача в списке.  4. «Закрой эту задачу» → receipt со статусом done.
5. Владелец: `cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment && node packages/brain/dist/bin/ff-brain.js stats` → `by_type.task ≥ 1`.
Журнал append-only и стирания пока нет — в смоуке писать только реальное своё дело (без чужих имён).
Провал смоука → откат шага 4 (флаги) и `pm2 logs ff-brain --lines 50` / `pm2 logs agent`.

### Шаг 7. Старт гейта
День 0 = первая реальная запись. Пороги и подсчёт — `GATE-7days.md` (владелец утверждает до старта).

## Откат шлюза-кода (R1, если флаги-выкл недостаточно)
R1 влит fast-forward `9a12bda → f24d0f4`. Без флагов R1 инертен (локальные промпты) — сначала всегда откат шага 4.
Если нужен откат кода (по слову владельца; `git status --porcelain` отдельно и только при чистом дереве):
- `git revert --no-edit 9a12bda..f24d0f4` (новые коммиты-отмены, история цела), затем `pm2 restart agent`; или
- `git switch -c rollback-r1 9a12bda` (ветка на прежнем коммите), затем `pm2 restart agent`.
Никогда `git reset --hard` / `git checkout -- …` в живом дереве шлюза.

## Остаточные риски (знать, не блокеры)
- pm2-демон 5.4.2 + ESM мозга не проверены вместе (analyst проверял на 7.0.3) — смотреть `pm2 logs ff-brain` сразу после шага 1.
- Мозг и MCP живут из рабочего дерева FF (`dist`): пересборка/смена ветки FF под живым мозгом → `pm2 restart ff-brain` после сборки (critic F4).
- Линза перебирает весь журнал на вызов — рост `prompt-shadow-miss {kind:timeout}` = сигнал масштаба, не поломка (analyst N11).

Итог: решение — запуск исполним шагами 1–7; открытые развилки владельцу: D4 (кнопка «Всегда»), пороги гейта (D2).
