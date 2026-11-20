# Данные vs код в ff-brain (3 оси) — analyst, 2026-10-26
Вопрос-цель: что настраивается без кода, что зашито. Срез: packages/brain/src, шлюз state-*.ts. Живое хранилище памяти не читал, поэтому число экземпляров считаю по seed в коде, а не по живой памяти.

| Ось | ДАННЫЕ (file:line) | ЗАШИТО | Экземпляров | Спроектировано, не построено |
|---|---|---|---|---|
| Тип | Реестр строится из журнала актов type-def: registry.ts:336,374. Новый `u:`-тип пишется через planDefinition: definitions.ts:30. Поля, `approval`, `write`, `status` лежат в самом дефе: genesis.ts:44-65 | Тексты 10 genesis-типов (genesis.ts ~100-170) и 3 sys-типов (sys-types.ts:60-100): сидятся кодом, но пишутся как акты. Нет HTTP-маршрута «определить тип»: http.ts:131-141 содержит только record/find/read/link/health/stats/export/lens. planDefinition зовут только schemas.ts и sys-types.ts | 13 типов (task, decision, note, person, day, friction, scope, raw, type-def, predicate-def + 3 sys). Предикатов 17. Живых `u:`-типов в коде нет | ADR-0017: packs `pack:<id>/…` только зарезервированы (ADR:31). `extends`, `confidence`, `candidate` хранятся, но не исполняются (genesis.ts:46-50, registry.ts:98) |
| Вид | Единственный вид-как-данные: `lens:prompt-compose@1` (sys-types.ts ~115-135, 205-230), интерпретатор lens.ts:79-194 | Пять пресетов morning/evening/open/scope/overview: `FindPreset` — закрытый union (contract.ts:223), логика в `switch` (presets.ts ~130), статусы `OPEN_STATUS_VALUES`, `STALE_DAYS=7`, лимиты константами (presets.ts ~17-22). У линзы одна `shape: compose` (lens.ts ~128). `/state` в шлюзе: 3 экрана map/scope/record, тег `sm1`, лимиты, вызовы `find` с `preset:'overview'` и `'open'` (state-model.util.ts ~25-60, state-handler.ts:62-87) | 7 видов: 5 пресетов + /state + prompt-compose. Данными настраивается только 1 из 7 | lens-as-data-candidate.idea.md: «вид = f(units, lens)», status candidate, припарковано. engine ViewDef (`from·traverse·filter·shape`, view-compiler.ts) есть, но к brain не подключён |
| Правило-реакция | Политика записи: `approval:owner`, `write:owner` в дефе типа (genesis.ts:56-65). Engine: узлы `policy:*`, `policy:access-priority` (engine.ts:21, patterns-as-rules.concept.md §1) | Реакций «если X, то Y» нет совсем. Статус `proposed` вычисляется кодом в validate-act.ts:607-618. Предикаты ничего не запускают | 2 флага в данных (sys:prompt-layer approval:owner; sys:target и sys:lens write:owner). Реакций 0 | patterns-as-rules.concept.md (active, reference): правила паттерна = данные; в brain не перенесено |

## Жизненный цикл статусов: КОД, не данные
- Общий статус записи `proposed|active|retracted`: validate-act.ts:607-618. `proposed` ставится при `initiative:'agent'` ИЛИ при `approval:owner` у агентского автора. Активация только owner authority (:616).
- Предметные статусы (`open→doing→done`, `proposed→accepted`) — только `enum` в поле (genesis.ts, task/decision). Таблицы переходов нет: любое значение enum можно записать из любого. Жёсткий код: `OPEN_STATUS_VALUES=['open','doing','blocked']` и `'done'` в presets.ts. Тип `u:` со статусом `in_progress` не попадёт в morning/open — скрытая связь данных с кодом.
- Итог: допустимые значения — данные; переходы и «что считать открытым» — код.

## Механизм «агент предлагает → владелец утверждает»
- Для ЗАПИСЕЙ есть и работает: `approval:owner` + `proposed` (validate-act.ts:316-321, 611-618).
- Для ТИПОВ и ПРЕДИКАТОВ нет: нет маршрута записи дефа, `checkDefinition` пускает `u:`-тип только своему писателю (definitions.ts:34). Агент, пишущий неизвестный тип, получает `raw` + friction `UNKNOWN_TYPE` (validate-act.ts:448-454). Это сигнал спроса, но не предложение. Поле `status:'candidate'` у type-def готово, процедуры нет.
- Для ВИДОВ и ПРАВИЛ нет.

## Вывод
Данные: структура типов, права записи, одна линза. Код: пресеты, переходы статусов, /state, реакции. Самое дешёвое звено: путь «агент предлагает type-def (candidate) → владелец активирует» (поля и статус есть, нет входа). Риск: пресеты привязаны к 4 строкам статуса, гибкие типы без них невидимы в morning/open.
