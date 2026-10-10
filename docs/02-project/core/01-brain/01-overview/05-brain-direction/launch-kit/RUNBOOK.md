# RUNBOOK — запуск памяти (ff-brain) в живую работу

- **Status:** active (готов к исполнению владельцем) · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-11 (rev2; rev1 2026-10-10)
- **Потребитель:** владелец (команды руками в терминале) + лид (смоук и подсчёт гейта)
- **Поглощает:** rev1 из `docs/_log/2026-10-05-personal-memory-launch/launch/RUNBOOK.md` (там теперь указатель сюда);
  шаги 3–6 `docs/_log/2026-10-05-personal-memory-launch/HANDOFF-2026-10-10.md`; дифы ночи 2026-10-11 (F шаг 0 / восстановление / смоук, A просмотр export, C смоук захвата) — по слитой таблице `docs/02-project/core/01-brain/01-overview/05-brain-direction/analyses/2026-10-11-night-waves/w4-critique/critic-launch-set.analysis.md` §4.3
- **Related:** `/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/packages/brain/scripts/launch-brain.sh` · `PROMPT-memory-protocol.md` · `GATE-7days.md` (эта же папка) · сухой прогон команд: `.../analyses/2026-10-11-night-waves/w5-synthesis/builder-launch-patches.md`
- **Что изменилось в rev2:** добавлены шаг 0 (предполёт, только чтение), шаг 1б (бэкапы + база гейта), пункты смоука 6.2/6.6/6.7/6.8,
  раздел «Восстановление из бэкапа». Команды шагов 1–5 — те же, что владелец уже сохранил (в шаге 5 поменялся только путь файла протокола;
  старый путь в `docs/_log/.../launch/PROMPT-memory-protocol.md` — симлинк сюда, сохранённая команда rev1 тоже работает).

## Факты, на которых стоит план (проверено 2026-10-10)
- **Рабочий топик = `-1004351636302:56`** (беседа «ff_future»: сессия шлюза `telegram:-1004351636302:56:ff-orchestrator`
  ↔ claude-сессия `36d53d28…`, БД `agents-manager/data/gateway-ff-personal.db`). Владелец `user 1112667160`.
  Кандидат на будущее: `7414` «МОИ ЗАДАЧИ» (молчит с 09-29) — `TOPIC_ID=7414` в скрипте, если туду переедет туда.
- **pm2:** живой `agent` работает на Node v22.23.2; демон pm2 — 5.4.2 на Node 18. `ecosystem.brain.config.cjs` —
  с абсолютным `interpreter` (v22.23.2, переопределяется `FF_BRAIN_NODE`) — тест `packages/brain/test/service/ecosystem-config.test.ts`.
- **Области (scopes) аддитивны:** genesis на старте пропускает существующие узлы и дописывает новые
  (`packages/brain/src/domain/schemas.ts:71-76`, `service/runtime.ts:141-147`); новые слаги из `service.json` — на `pm2 restart ff-brain`.
  НЕ аддитивно: имя/вид существующей области и **родитель (`member_of`) существующей области** (`validate-act.ts:679-699`).
  Записи между областями переносимы (`record` с тем же id и новыми `scopes`). Тест `packages/brain/test/domain/launch-config.test.ts`.
- **Стартовый набор = одна область `personal`** (верхнего уровня). `ff` и компании НЕ заводим сейчас (родителя к существующей области не добавить).
- Область `personal` = записи только для владельца (`pii-scope.ts:114-115`) → привязке топика нужен `"personal": true`.
- **Шлюз (предполёт ночи 2026-10-11, F):** все закоммиченные правки до R1 уже в живом процессе; фикс дубля голосового (G-20)
  лежит НЕзакоммиченным в `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager-p2-dedup` и завтра НЕ едет. Дубль того же
  Telegram-сообщения новую запись в памяти не создаёт (idem по `message_id`, `brain-mcp/src/ordinal.ts:34-40`), если у сообщения есть `message_id`.

## Последовательность (владелец, по порядку; каждая команда — отдельно)

### Шаг 0. Предполёт (5 минут, только чтение — ничего не меняет)
```
cd /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager
git status --porcelain                 # ждём пусто
git log -1 --format='%h %ci'           # ждём f24d0f4 2026-10-09 11:24
date -r $(git log -1 --format=%ct)     # момент коммита в поясе ЭТОЙ машины
pm2 describe agent | grep -iE "created at|restarts"    # «created at» позже момента выше → деплой актуален
```
- Сравнивать **как моменты времени, не как цифры**: `%ci` показан в поясе коммита (-0700), pm2 — в локальном; `date -r` приводит коммит к локальному.
- 0.1 **G-20 (решение владельца одной фразой):** «фикс дубля НЕ летит; живём с риском дубля, память защищена idem».
  Worktree `agents-manager-p2-dedup` не трогать и не коммитить.
- Если `git status` не пуст или коммит другой — стоп, сначала разобраться (ничего не откатывать вслепую).

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

### Шаг 1б. Бэкап есть + база гейта (3 минуты, только чтение; руками владельца — агентам путь запрещён)
```
cd ~/.ff-brain/backups && f=$(ls -t journal-*.jsonl | head -1) && shasum -a 256 -c "$f.sha256"   # ждём «: OK»
ls -l ~/Backups/ff-brain-mirror | tail -3                                                       # та же пара файлов
cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment
node packages/brain/dist/bin/ff-brain.js stats                                                  # база: by_type пусто / task нет
node packages/brain/dist/bin/ff-brain.js export personal | jq -r .path                          # база: путь к пустому export «до»
```
Записать в `GATE-7days.md` «База»: stats, путь export «до», свой часовой пояс, «сейчас веду дела в: ____».
Репетиция восстановления на копии — **отложена** до после дня 0 (не проверена на живом размере).

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
Затем — **когда в топиках нет идущего хода** (рестарт обрывает текущий ход; проверка: `pm2 logs agent --nostream --lines 20` — нет свежего job без итога):
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
    /Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/PROMPT-memory-protocol.md; } >> PROMPT.md; }
```
Действует со следующего сообщения; shadow сам ресинкнет слой в мозг. `.gateway/` в git шлюза не входит (`.gitignore:15`) — бэкап только файлом.
Если слой уже применялся из старой (rev1) версии — `grep` скажет «already applied»: тогда сначала `cp PROMPT.md.bak-2026-10-10 PROMPT.md`, затем блок заново.
- **Откат:** `cp PROMPT.md.bak-2026-10-10 PROMPT.md`.

### Шаг 6. Смоук в Telegram (топик 56)
Журнал append-only и стирания пока нет — в смоуке писать только реальное своё дело (без чужих имён и секретов).
1. «Что у меня по делам?» → агент зовёт `find(scope:"personal", …)` → пусто, без ошибки.
2. «Добавь задачу: <реальное своё дело> до <дата>» → кнопка на `mcp__ff-brain__record` → нажать **«♾️ Всегда»** (решение владельца
   2026-10-10, зерно 9; потом так же на `link`; правило общее для всех топиков и сессий в папке FF). → одна строка-receipt.
   Альтернатива (если в визарде М8 выбрано «терпеть кнопку до чистого export дня 3»): жать **разово** до просмотра export дня 3 —
   кнопка сейчас единственная проверка имени/секрета ДО записи. Откат «Всегда»: удалить 2 строки из `FF/.claude/settings.local.json`.
   После «Всегда» следующая запись должна пройти без кнопки; иначе правило не подхватилось (записать в леджер).
3. «Покажи открытые задачи» → задача в списке.  4. «Закрой эту задачу» → receipt со статусом done.
5. Владелец: `cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment && node packages/brain/dist/bin/ff-brain.js stats` → `by_type.task ≥ 1`.
6. **Проба дубля (обязательно — голос основной ввод):** отправить голосовое «добавь задачу …»; если шлюз продублировал ход —
   в «покажи открытые задачи» задача ОДНА. Две одинаковые → записать в леджер (у голосового нет `message_id` → idem не работает).
7. Проба «мозг лежит» (`pm2 stop ff-brain`) — **отложена** на день 1–2, в простое (риск забыть `pm2 start`).
8. **Захват хвоста:** в обычной рабочей реплике сказать фразу с обязательством («надо до пятницы проверить выгрузку cardex»)
   → в конце хода агент предлагает «Записать как дела? 1) …» → «да» → receipt `ok:true` → «покажи открытые» — она в списке.
   Проверка поля (лид или владелец): `p=$(node packages/brain/dist/bin/ff-brain.js export personal | jq -r .path)` затем
   `jq '.records[]|select(.type=="task")|{label,status,src:.fields.src,kind:.fields.kind}' "$p"` → у этой задачи `status:"active"`, `src:"offer"`.
   `src:null` = агент положил `src` вне `fields` (MCP молча отбросил) → поправить протокол до дня 0.
Провал смоука → откат шага 4 (флаги) и `pm2 logs ff-brain --lines 50` / `pm2 logs agent`.

### Шаг 7. Старт гейта
День 0 = первая реальная запись. Пороги, подсчёт и просмотр export день 1/3 — `GATE-7days.md` (владелец утверждает до старта).

## Восстановление из бэкапа (процедура; репетиция — после дня 0)
`<HOME>` = папка памяти `~/.ff-brain` (руками владельца; агентам путь запрещён).
1. `pm2 stop ff-brain` (одиночный писатель; иначе `BrainLockError`, `journal.ts:31-40`).
2. Выбрать самый свежий `<HOME>/backups/journal-<ts>-<n>.jsonl` (или из `~/Backups/ff-brain-mirror`). Проверить в его папке:
   `shasum -a 256 -c <файл>.sha256` → `OK`; `tail -n1 <файл> | jq -e . >/dev/null` → последняя строка — валидный JSON.
3. **Текущий журнал не удалять:** `mv <HOME>/store/journal.jsonl <HOME>/store/journal.jsonl.broken-<дата>`; зависший лок
   `<HOME>/store/journal.jsonl.lock` убрать только если процесса `ff-brain` нет.
4. `cp <бэкап> <HOME>/store/journal.jsonl && chmod 600 <HOME>/store/journal.jsonl`.
5. `pm2 start ff-brain` → `pm2 logs ff-brain --lines 30`: ждём `listening … bad_lines 0` (genesis повторно не пишется — `durability.test.ts:118-150`).
6. Из папки FF: `node packages/brain/dist/bin/ff-brain.js health` и `stats` — `by_type` как до инцидента; в Telegram «Что у меня по делам?».
7. Акты между бэкапом и аварией — в `journal.jsonl.broken-*` (разбирать вручную); `outbox/` дольёт то, что агент ставил «в очередь».

## Откат шлюза-кода (R1, если флаги-выкл недостаточно)
R1 влит fast-forward `9a12bda → f24d0f4`. Без флагов R1 инертен (локальные промпты) — сначала всегда откат шага 4.
Если нужен откат кода (по слову владельца; `git status --porcelain` отдельно и только при чистом дереве):
- `git revert --no-edit 9a12bda..f24d0f4` (новые коммиты-отмены, история цела), затем `pm2 restart agent`; или
- `git switch -c rollback-r1 9a12bda` (ветка на прежнем коммите), затем `pm2 restart agent`.
Никогда `git reset --hard` / `git checkout -- …` в живом дереве шлюза.

## Остаточные риски (знать, не блокеры)
- pm2-демон 5.4.2 + ESM мозга не проверены вместе (analyst проверял на 7.0.3) — смотреть `pm2 logs ff-brain` сразу после шага 1.
- Мозг и MCP живут из рабочего дерева FF (`dist`): пересборка/смена ветки FF под живым мозгом → `pm2 restart ff-brain` после сборки.
- Линза перебирает весь журнал на вызов — рост `prompt-shadow-miss {kind:timeout}` = сигнал масштаба, не поломка.
- Ветка шлюза не запушена (`origin/feat/phase-0-unblock` = `df1dd38`): R1/G1 живут только локально.
- `packages/brain/scripts/launch-brain.sh` в шапке ссылается на старый путь RUNBOOK в `_log` — там указатель сюда (код не правим).

Итог: решение — запуск исполним шагами 0–7; D4 решён владельцем 2026-10-10 («Всегда»; альтернатива — визард М8); открыто владельцу: G-20 (путь дубля, визард Д1), пороги и часовой пояс гейта (визард М7а/М7б).
