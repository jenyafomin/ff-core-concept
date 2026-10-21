# Этап 1 — шаги владельца: первая запись в память и её чтение из другого проекта

- **Status:** active (готово к исполнению) · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-21
- **Потребитель:** владелец, в своём терминале (не через Telegram). **Поглощает:** ничего (в `RUNBOOK.md` для Этапа 1 используются только шаги 1, 1б, 2 и раздел «Восстановление»).
- **Related:** roadmap `../analyses/2026-10-20-direction-and-roadmap/00-SYNTHESIS-and-ROADMAP.md` §6 «Этап 1», §8 · отчёт подготовки `../analyses/2026-10-20-direction-and-roadmap/stage1/03-stage1-prep.md` · `RUNBOOK.md`

## Что получится в итоге
Ты открываешь Claude Code в папке `agents-manager` и спрашиваешь «что решено про мозг в FF?». Агент находит в памяти
карточку «ADR-0016: один мозг на все проекты» и отвечает с путём к файлу. Эта карточка записана из папки FF.
Шлюз (Telegram) в этом не участвует: ни перезапусков шлюза, ни правок `.env`.

## Почему это делаешь ты, а не агент
Папка памяти `~/.ff-brain` закрыта для агентов (стоп-лист шлюза). Её создание, конфиги и перезапуск сервиса — это твои
действия. Все команды ниже выполняются в обычном терминале Mac. Каждую команду запускай отдельно и сверяй вывод.

**Уже проверено агентом на временной копии (`/tmp`, не на живой памяти):** скрипт областей (dry-run, apply, повтор,
защита от рестарта не той памяти), запись этой самой карточки из папки FF, чтение её через Claude Code в папке
`agents-manager` (`--mcp-config`, путь и хеш совпали), отказ на запись из AM, отказ для чужой папки, репетиция восстановления
(PASS), сканер M8, снимок M5.

Сокращения: `KIT=/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit`.
Сначала выполни в терминале:
```
KIT=/Users/mac16/Documents/IT/Apps/FF-Personal-Managment/docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit
```

---

## Шаг A. Запустить сервис памяти (RUNBOOK шаг 1), ~5 мин
На 2026-10-21 `ff-brain` в pm2 **ещё нет**. Запусти его:
```
cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment
bash packages/brain/scripts/launch-brain.sh
```
Ожидаемо: `node v22.23.2` · `dist built` · `wrote service.json` · `wrote readers.json` · `socket up` · health `"ok": true` ·
`service created token` · в конце dry-run импортёра (`failed []`). Подробности и откат — `RUNBOOK.md` шаг 1.
- Отдельно собирать не нужно: скрипт сам пересобирает `dist` всех четырёх пакетов памяти (строка `dist built`), поэтому последние
  исправления кода попадают в запуск автоматически.
- ⚠️ **Не выполняй `pm2 update` и `pm2 kill`**, даже если pm2 пишет красным «In-memory PM2 is out-of-date, do: pm2 update». Это
  только баннер (в памяти pm2 5.4.2, локально 7.0.3, на работу `ff-brain` не влияет), а `pm2 update` перезапускает живого агента шлюза и
  обрывает идущие ходы в Telegram.
- ⚠️ **В конце скрипт напечатает блок «NEXT … pm2 restart agent … .env».** Это шаги RUNBOOK 3–5 (подключение шлюза), **в Этапе 1
  их НЕ делаем**: ни `prompt:import`, ни правки `.env`, ни `pm2 restart agent`. `pm2 save` (шаг C ниже) делаем, остальное из блока пропускаем.
- **Откат:** `pm2 stop ff-brain` и затем `pm2 delete ff-brain`. Папка памяти остаётся.
- Файл `~/.config/ff-brain/mcp.json` (нужен в шагах E и F) уже есть, проверить: `cat ~/.config/ff-brain/mcp.json`. Если файла нет — скопируй
  шаблон: `mkdir -p ~/.config/ff-brain && cp $KIT/mcp-config.template.json ~/.config/ff-brain/mcp.json`.

## Шаг B. Бэкап есть (RUNBOOK шаг 1б), ~3 мин
```
cd ~/.ff-brain/backups && f=$(ls -t journal-*.jsonl | head -1) && shasum -a 256 -c "$f.sha256"
```
Ожидаемо: строка, которая заканчивается на `: OK`.
```
ls -l ~/Backups/ff-brain-mirror | tail -3
```
Ожидаемо: та же пара файлов (`journal-….jsonl` и `.sha256`).

## Шаг C. Закрепить список pm2 (RUNBOOK шаг 2)
```
pm2 save
```
Ожидаемо: `Successfully saved`. Нужен, чтобы `ff-brain` поднимался после перезагрузки Mac.

## Шаг D. Области `ff` и `agents-manager` и доступ двух папок, ~5 мин
Сначала только посмотреть, что изменится (ничего не пишет):
```
bash $KIT/stage1-scopes.sh
```
Ожидаемо: в блоке `Plan` четыре строки: `+ scope ff`, `+ scope agents-manager`, `~ cli[…FF-Personal-Managment]`, `+ cli[…agents-manager]`.
В конце `DRY RUN — nothing written` и предлагаемые конфиги.

Затем применить:
```
bash $KIT/stage1-scopes.sh --apply
```
Ожидаемо: `service.json.bak-<время>`, `readers.json.bak-<время>` · `wrote readers.json` · `wrote service.json` ·
перезапуск `ff-brain` (это единственный перезапуск за весь этап, шлюз не затрагивается) · `acts N → N+2 (scope acts written)` ·
`FF folder is a known reader` · `agents-manager folder is a known reader`.
Повторный запуск напишет `nothing to change (already applied)` и ничего не тронет.
- **Что получает каждая папка:** FF: запись, области `personal` + `ff` + `agents-manager`, по умолчанию `ff`.
  agents-manager: только чтение, области `ff` + `agents-manager`, личное (`personal`) не видит.
- **Откат:** скрипт печатает в конце готовую команду (`cp ….bak-<время> …` ×2 + `pm2 restart ff-brain`). Сами узлы областей
  останутся в журнале, это безвредно: без записи в `readers.json` их никто не прочитает. Имена `ff` и `agents-manager` закрепляются навсегда.

## Шаг E. Первая запись из папки FF, ~10 мин
1. Проверка на секреты и чужие данные (M8). Ожидаемо: `M8: 0 BLOCK · 0 WARN`:
```
node $KIT/m8-scan.mjs $KIT/stage1-first-record.json
```
2. Сам прочитай `label` и `text` в `stage1-first-record.json`. Если хочешь поправить формулировку — поправь и снова запусти шаг 1.
   Стирания пока нет: записанное останется навсегда.
3. Открой Claude Code в папке FF, подключив память:
```
cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment
claude --mcp-config ~/.config/ff-brain/mcp.json
```
4. Скажи агенту (текст можно скопировать целиком):
   > Посчитай `shasum -a 256 docs/architecture/ADR/ADR-0016-cross-project-brain.md`. Затем вызови `mcp__ff-brain__record` с телом из
   > файла `docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/stage1-first-record.json`, добавив
   > `"source": {"kind": "file", "ref": "repo:ff/docs/architecture/ADR/ADR-0016-cross-project-brain.md", "hash": "<хеш>"}`.
   > Больше ничего не меняй. Покажи ответ инструмента целиком.
5. На кнопку разрешения инструмента ответь «да» (разово). Ожидаемо: `"ok": true`, `"type": "note"`, `"warnings": []` и строка
   `Записано: ADR-0016: один мозг на все проекты → ff, agents-manager · note/active · #xxxxxx`. **Запиши себе полный `id` (`u_…`)**, он понадобится в Этапе 2
   (метка тождества в ADR-0016, см. блок «Перенесено в Этап 2» ниже).
- **Проверка:** `cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment && node packages/brain/dist/bin/ff-brain.js stats`.
  Ожидаемо: `"by_type": {"note": 1, …}`, `"by_scope"` содержит `ff` и `agents-manager`.
- **Если `DEFAULT_DENY`:** Claude Code запущен не из папки FF, или шаг D не применён.

## Шаг F. Чтение из другого проекта (agents-manager), ~10 мин
```
cd /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager
claude --mcp-config ~/.config/ff-brain/mcp.json
```
Спроси: **«что решено про мозг в FF? посмотри в памяти ff-brain»**.
Claude Code спросит разрешение на инструменты `find` и `read` — отвечай «да» (разово).
Ожидаемо: агент вызывает `find` (scope `ff`, text «мозг»), затем `read` по найденному id и отвечает: label «ADR-0016: один мозг на все
проекты», путь `repo:ff/docs/architecture/ADR/ADR-0016-cross-project-brain.md`. Если нужно подробнее, он открывает сам файл.
- Это и есть выход этапа: запись сделана в одном проекте, а прочитана в другом.
- **Запиши в roadmap «Что обнаружили»** (§6): что было неожиданным, сколько заняло, понял ли агент с первого раза.
- **Если `DEFAULT_DENY`:** Claude Code запущен не из папки agents-manager. Если `SERVICE_DOWN`: `pm2 logs ff-brain --lines 50`.

## Шаг G. Репетиция восстановления из бэкапа, ~5–15 мин (живую память не трогает)
Свежий бэкап пишется при каждом старте сервиса. Чтобы карточка из шага E точно попала в бэкап, сначала перезапусти сервис (необязательно):
```
pm2 restart ff-brain
```
Затем:
```
bash $KIT/restore-rehearsal.sh --cleanup
```
`--cleanup` удаляет временную копию в `/tmp` в конце (в ней копия личных данных, не оставляй её лежать). Если будет `FAIL`, а копия нужна
для разбора, запусти без `--cleanup`: путь к копии скрипт напечатает.
Ожидаемо: `sha256 OK` · `last line is valid JSON` · `mirror holds the same file` · `copy bad_lines 0` · `copy acts N = backup lines` ·
`copy stats … by_type {"note":1}` · `backup lag: 0 act(s)` · `REHEARSAL PASS`. Копия остаётся в `/tmp/ff-brain-restore.XXXXXX`,
удалить её можно командой, которую напечатает скрипт (или добавь `--cleanup`).
- Если `FAIL`, на этот бэкап не полагаться. Настоящее восстановление при аварии описано в `RUNBOOK.md`, раздел «Восстановление из бэкапа».

## Шаг H (по желанию). Ежедневный снимок M5
Разово, вручную. Ожидаемо: `m5: appended to …/docs/_log/ff-brain-metrics/<дата>.jsonl (ok:true)`:
```
node $KIT/m5-snapshot.mjs
```
Каждый день автоматически: строка для `crontab -e` есть в шапке `m5-snapshot.mjs`. Агент её **не ставил**. На macOS cron'у нужен
«Полный доступ к диску» (Системные настройки → Конфиденциальность → Полный доступ к диску → `/usr/sbin/cron`), иначе в
`/tmp/ff-brain-m5.log` будет `Operation not permitted`.

---

## Перенесено в Этап 2: метка тождества `brain_id` в ADR-0016
В Этапе 1 ADR-0016 **не правим**. Круг хеша: `brain_id` меняет файл → hash записи устаревает; решаем в ADR-0019
(hash без строки `brain_id` или `brain_id` вне файла). `id` записи из шага E сохрани до Этапа 2.

---

## Если что-то пошло не так
| Симптом | Что делать |
|---|---|
| `stage1-scopes.sh` пишет `STOP: … missing` | не выполнен шаг A |
| `STOP: scope … exists with kind …` | область с таким именем уже есть с другим видом. Ничего не записано, спроси лида |
| `acts N → N` после `--apply` | чаще всего скрипт спросил сервис раньше, чем тот перезапустился. Подожди 10 секунд, выполни `cd /Users/mac16/Documents/IT/Apps/FF-Personal-Managment && node packages/brain/dist/bin/ff-brain.js stats`: в `by_scope` должны быть `ff` и `agents-manager`. Если нет: `pm2 logs ff-brain --lines 50`, затем откат командой из вывода скрипта |
| Claude Code не видит инструментов `ff-brain` | проверь путь `~/.config/ff-brain/mcp.json`, а в Claude Code выполни `/mcp` (сервер `ff-brain` должен быть connected) |
| `SCOPE_DENIED` при записи | FF-запись не получила области, повтори шаг D |
| Всё сломалось | урезание по roadmap: запись в `personal` и чтение через `ff-brain.js export personal` руками |

Итог: решение — Этап 1 исполним шагами A–G (+H по желанию; руки владельца ~1–1.5 ч, 1 рестарт `ff-brain`, 0 рестартов шлюза); открыто: «Что обнаружили» заполняет владелец после шага F; метка `brain_id` в ADR-0016 — Этап 2 (ADR-0019).
