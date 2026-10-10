# W5 builder: сухой прогон + патчи кита запуска + переезд в git-дом
- **Status:** review · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-11
- **Потребитель:** лид (приёмка, коммит), владелец (утро: открытые вопросы), critic (перепроверка)
- **Поглощает:** слитые таблицы `../w4-critique/critic-launch-set.analysis.md` §4 + `../w4-critique/co-orch-acceptance.md` §3/§7 (патч 1 «сухой прогон»)
- **Меняет:** канон кита теперь `docs/02-project/core/01-brain/01-overview/05-brain-direction/launch-kit/{RUNBOOK,PROMPT-memory-protocol,GATE-7days,README}.md` (+ `_history/2026-10-10-rev1/`);
  в `docs/_log/2026-10-05-personal-memory-launch/launch/`: `RUNBOOK.md`, `GATE-7days.md` = 3-строчные указатели; `PROMPT-memory-protocol.md` = **симлинк** на канон (см. §4); `reviewer-kit.analysis.md` не тронут. Код (`packages/`, шлюз) не тронут.

## 1. Сухой прогон (временный дом, живой мозг/pm2 не тронуты)
Как: `FF_BRAIN_HOME=/tmp/ffb-dry5/home` (оверрайд `packages/brain/src/service/paths.ts:28-30`), `ff-brain-serve.js` из `dist` на Node 22.23.2,
вызовы — HTTP по сокету с личностью **CLI-читателя** (привязка `cli[cwd]` с `write:true` в temp `readers.json`), как это делает `ff-brain.js`.
**Отклонение:** запуск brain-mcp из Bash заблокирован стоп-листом («подмена личности памяти… запрещена») — не обходил. Поэтому слой MCP
(zod) не прогонялся: про него — чтение кода (`packages/brain-mcp/src/server.ts:3-5`, «Unknown keys are stripped by zod»). Отличие CLI-пути от чата:
`authority` одинаково `agent` (`read/access.ts:57-80`), нет idem (нет `message_id`).

Точные выходы (сокращены только id):
```
SERVE: listening … (acts 33, records 0, bad_lines 0)
find {scope:personal,type:task,status:open}                    → {"ok":true,"items":[],"total":0}
record task «Оплатить интернет…» fields{status:open,due,kind:"быт",src:"owner"}
                                                               → ok:true status:"active" receipt "Записано: … · task/open · #daac3t"
record … src:"offer" (ВЕРХНИЙ уровень)                         → {"ok":false,"code":"BAD_REQUEST","message":"unknown key 'src'"}
record «cardex: Проверить выгрузку отчётов» fields{…,src:"offer"} → ok:true status:"active"
record «Купить фильтр…» initiative:"agent" fields{…,src:"offer"} → ok:true status:"proposed" receipt "task/proposed"
find {…status:open}                                            → total 3 — ВКЛЮЧАЯ proposed (status в выдаче = fields.status "open")
record {id:t1, fields{status:"done",done_at:"2026-10-10"}}     → ok:true rev 2 "task/done"
find {…status:open}                                            → total 2 (закрытая ушла)
find {scope:personal,preset:"scope"}                           → digest «Область personal · 3 • … · done · … • … · open …»
record {id:proposed, fields{status:"open"}}                    → ok:true, status ОСТАЛСЯ "proposed"   (K1 подтверждён)
record {id:proposed, initiative:"owner", …}                    → WRITE_DENIED «initiative 'owner' requires owner authority»
record fields.why «Обсудить сроки с Андрей Петров»             → ok:true (имя сервер не ловит — A подтверждён)
ff-brain.js export personal → {"ok":true,"path":"/tmp/ffb-dry5/home/export/brain-export-<ts>.json","count":4}  (печать — путь, не данные; файл 0600, 115 строк, pretty)
ff-brain.js stats           → total 4, by_type.task 4   (считает proposed)
jq B (как написан, A=2026-10-10 B=2026-10-17) → {"S1_tasks":3,"S1_days":1,"S1_burst":3,"S2_done":1,"proposed_not_counted":1}
jq B + src-диагностика                          → …,"src_owner":1,"src_offer":2,"src_missing":0
jq дни в поясе (off=4)                           → ["2026-10-10"]
grep A-1 секреты    → 0 попаданий (rc=1); позитив-контроль на строках «пароль…», «?token=» → оба пойманы
grep A-2 заглавное  → 99:с Андрей   (поймал имя; «Петров» после него не выдан — -o не перекрывается; эвристика)
grep A-3 поля       → 0 (rc=1)
backup: shasum -a 256 -c journal-….jsonl.sha256 → OK; tail -n1 | jq -e . → ok; файл кончается \n
```
Выводы: (1) B jq работает на настоящем export без правок — нужен только файл через `p=$(… export personal | jq -r .path)`; (2) A-команды работают
только по `$p` (исходное `> /tmp/brain-export.json` даёт JSON-ответ `{ok,path,count}`, не данные → ложное «чисто», K3 подтверждён);
(3) `src` вне `fields`: сервис → BAD_REQUEST, через MCP (код) — молча отбрасывается и запись проходит БЕЗ src → ловится `src_missing` в jq и смоуком 6.8;
(4) `proposed` в `find(status:open)` виден и не промоутится агентом — C-механизм `initiative:"agent"`→«open» невыполним, принят вариант critic.
Мусор: `/tmp/ffb-dry5/` (temp дом, драйвер), сервис остановлен (SIGTERM).

## 2. Что поменялось по файлам (против rev1)
**PROMPT-memory-protocol.md** (52 строки файла, слой 42): блок «ПЕРВАЯ НЕДЕЛЯ — ГРАНИЦЫ» (A, сжат: сервер не ловит имена/секреты; роль вместо имени;
секреты-стоп с F 0.2б внутри; запрещённые поля; проверка перед record). п.1 = утренний `find(open)` ≤3 по due (C п.14 слит). п.2 = слово владельца →
`fields.src:"owner"`; хвосты → предложение в ЧАТЕ, запись только после «да», обычный record без `initiative`, `fields.src:"offer"`, ≤3, 2 отказа → стоп,
без фразы-обязательства не предлагать; «своего не пиши» (co-orch: без initiative/proposed). п.3 = закрытый kind из 8, проект префиксом label, kind/src
только в fields, `why` обезличенно без цитат, `decision`/`day` не в неделю 1. п.7 «уже было». п.12 «про имена и секреты отказа не будет». F 0.2а — отклонён (дубль п.7/8/11).
**GATE-7days.md:** база + пояс (вопрос) + файл «до»; раздел «Как считать» с проверенным jq (+ src owner/offer/missing, вариант дней в поясе); stats — только «жив»;
S1/S2 из export; S3 «по запросу/принесено»; два счётчика читателя как наблюдение (R-agent: утро vs запросы; R-owner минус свои прогоны); стоп-кран +
`src:offer` без «да» = 0, + имя/секрет с grep по `$p` день 1/3; ОДНО правило дня 3 (critic §4.2: push только при S1≥4 на ≥2 днях и S3=0; утренний список ≠ push);
красный флаг «склад»; таблица счёта расширена.
**RUNBOOK.md:** шаг 0 предполёт (только чтение; вместо `pm_uptime`-эпохи — `pm2 describe agent | grep -iE "created at|restarts"`, **не прогонялось**: живой pm2 не трогал);
шаг 1б (sha256 бэкапа — проверено на temp, база гейта); шаг 4 + проверка «нет идущего хода»; шаг 5 — новый путь awk (+ как переприменить, если rev1 уже стоит);
смоук: 6.2 разовое нажатие, «Всегда» не жать (D4); 6.6 проба дубля обязательна; 6.7 отложен; 6.8 захват хвоста + проверка `src:"offer"`/`active` через export;
раздел «Восстановление из бэкапа»; репетиция отложена. Команды шагов 1–5 по сути те же.

## 3. Отклонения от задания
- `PROMPT-memory-protocol.md` в `_log` — не 3-строчный стаб, а **симлинк** на канон: владелец сохранил команду шага 5 rev1 со старым путём; стаб без
  маркеров LAYER дал бы пустой awk → в PROMPT.md топика лёг бы один маркер, и `grep` навсегда отвечал бы «already applied». Проверено симуляцией на temp-копии: старая команда даёт 42 строки слоя.
- Добавлен `launch-kit/_history/2026-10-10-rev1/` — rev1 жил только в gitignored `_log`; без копии он бы потерялся (LOSE-NOTHING).
- Имя папки `launch-kit/` без `NN-` (doc-tree закон 6 просит номер для именованного узла) — взято как указал лид; переименование — решение лида.
- `packages/brain/scripts/launch-brain.sh` в шапке ссылается на старый путь RUNBOOK — указатель в `_log` это покрывает, код не правил.

## 4. Открытые вопросы владельцу (утро, до первой записи)
1. **Часовой пояс** для «дней» гейта (Asia/Dubai = +4? не угадывал). 2. **Q8** пороги S1/S2/S3 и правило дня 3. 3. **D4** «Всегда» на record/link (после смоука).
4. **Q-3rd** имена (дефолт A: роль вместо имени). 5. **Q6/Q6b** захват хвостов после «да» + утренний список (дефолт B + да). 6. **G-20** живём с дублем.
7. Путь одобрения `proposed`→`active` владельцем (нет owner-authority в чате) — вне недели 1, к ADR.
8. Для лида: есть ли `message_id` у голосового ингресса (иначе idem не работает — смоук 6.6 покажет).

Итог: решение — сухой прогон подтвердил K1/K2/K3 и рабочие команды (jq B, grep A по `$p`, sha256 бэкапа); три файла кита пропатчены по слитой таблице и переехали в git-дом `launch-kit/` (rev1 в `_history/`, в `_log` указатели + симлинк протокола); открыто владельцу: пояс, Q8, D4, Q-3rd, Q6, G-20.
