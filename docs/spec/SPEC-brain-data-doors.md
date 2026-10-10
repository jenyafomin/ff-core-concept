---
Title: SPEC — пять «дверей данных» мозга до первых реальных данных (ADR-0017 + анти-самоэскалация)
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-10-09
Scope: project (packages/engine, packages/brain, packages/brain-mcp)
Related:
  - docs/architecture/ADR/ADR-0017-type-layers-packs-storage-seam.md (D1, D3, D4, «До первых реальных данных», план валидации)
  - docs/architecture/ADR/ADR-0016-cross-project-brain.md (D10)
  - docs/spec/SPEC-brain-r1-prompt-layers.md (типы `sys:`, мандат `gateway.token`, R-04 анти-самоэскалация)
  - docs/spec/reviews/critic-SPEC-brain-data-doors.md (B1–B3, M1–M5, minor — применены, решения лида 2026-10-09)
  - docs/02-project/core/01-brain/01-overview/05-brain-direction/OVERVIEW.md (компас, шаг 1)
  - docs/02-project/core/01-brain/02-infrastructure/04-modules/M-G3-type-registry-policy/analyses/2026-10-09-plugins-and-system-types/{analyst-one-way-doors,critic-adr-0017,acceptance-adr-0017}.analysis.md
  - docs/_log/2026-10-05-personal-memory-launch/build/SPEC-brain-v0.6.md (формат, AC-01…46)
Потребитель: builder
Поглощает: —
---

# SPEC — двери данных мозга

## 1. Problem
Первая реальная запись навсегда замораживает пять вещей (журнал не переписывается): имена типов и предикатов, формат принципала, ключ idem, правило переноса журнала и источник полномочия «владелец одобрил».
Как сейчас:
- `Registry.addType` (registry.ts:29-34) пишет по голому имени, последний побеждает. Чужой `task@2` перезаписывает и реестр, и узел `typedef:task` (genesis.ts:90).
- Принципал не проверяется (access.ts:68).
- Переноса журнала с сохранением `recordedAt` нет (engine.ts:75).
- Парсеров строки журнала два (store-durable-fs.ts:179-241 и registry.ts:205-232).
- `initiative` приходит от клиента (validate-act.ts:440-441). Основной токен даёт `user:owner` (access.ts:68), поэтому агент сам себе одобряет `proposed→active`.

## 2. Goals / Non-goals
**Goals:**
- G-1 валидатор имён (D1);
- G-2 формат принципала (D1);
- G-3 idem v1 и закрытие D10 (D4);
- G-4 replay ниже Engine и версия строки `_v` (D3);
- G-5 полномочие владельца берётся из учётных данных, а не из запроса.

**Non-goals:**
- `StorePort`-типизация, `JournalSink`/PG, read-порт, `i2:`, rand id, `persistence_class`, манифест, инсталлер;
- выдача мандата `gateway.token` и команда «одобрить» в шлюзе — это SPEC-R1 R-03 и последующие;
- правки репо agents-manager.

## 3. Requirements

### R-1 Имена (дверь 1)
- **R-1.1** В `genesis.ts` появляются `CORE_TYPE_NAMES` (из `GENESIS_TYPES`) и `CORE_PREDICATE_NAMES` (из `GENESIS_PREDICATES`). Второго списка, который ведут руками, нет.
- **R-1.2** Новый `domain/names.ts` задаёт грамматику (решение лида B1):
  - допустимые формы: `core-bare | sys:<n> | pack:<id>/<n> | u:<n>`;
  - `<id>` = `^[a-z0-9][a-z0-9-]{0,31}$`, `<n>` = `^[a-z][a-z0-9-]{0,47}$`;
  - `canonicalName`: `core:x`→`x`; голое ядро остаётся как есть; голое не-ядро → `u:x` (alias); любая другая форма → `null`.
  Хелпер `samePredicate(a,b)` сравнивает канонические формы.
- **R-1.3** `checkDefinition(kind, name, writer)` проверяет, кто может определять какие имена:
  - ядро — только `system:genesis`;
  - `sys:<n>` — любой писатель `sys:*` (пространство платформы);
  - `pack:<id>/<n>` — только `pack:<id>`;
  - `u:<n>` — `user:`/`agent:`/`cli:`;
  - всё остальное отклоняется.
- **R-1.4 Проверка при записи (B2).** Новый `planDefinition(def, writer, registry)` в домене — единственный штатный путь акта type-def/predicate-def. Через него идут genesis (`writeGenesis`, schemas.ts:52), сид `sys:` из R1 и будущий инсталлер. При отказе ничего не дописывается. `planRecord` и так превращает def в `raw` (validate-act.ts:329); это остаётся.
- **R-1.5 Проверка при свёртке (B2, B3) — защита от обхода (appendRaw, прямой `engine.write`).**
  - Кодек R-4.1 отдаёт **целый Act**, а `foldAct(act)` принимает `actor` (registry.ts:108).
  - Pass 1 и runtime идут через один путь свёртки.
  - Нарушитель не попадает в реестр и записывается в `rejected[]`.
  - friction `DEF_REJECTED` получает детерминированный id `frictionId('DEF_REJECTED', act.id)` (friction.ts:46), поэтому повторный старт не плодит дублей.
  - `read` узла `typedef:*`/`pred:*` отдаёт def из реестра, а не проекцию: подменённый журнал не меняет видимую правду (V3).
- **R-1.6 Тождество при alias (M1).**
  - Реестр хранит def по каноническому имени и помнит `defNodeId` = `source_ref` первого принятого def.
  - `planDefinition` для новой версии (`u:idea@2`) передаёт этот `nodeId` в `buildTypeDefAct`/`buildPredicateDefAct` (to-act.ts:208,226; новый опциональный `nodeId`). Узел остаётся `typedef:idea`, для предикатов то же с `pred:`.
  - `instance-of` (validate-act.ts:435) целит в `defNodeId`.
  - `cardinalities()` (:75-79) отдаёт и канонический ключ, и легаси-написание.
- **R-1.7 Два написания предиката (M2).**
  - Лукапы и фильтры принимают любое написание: registry.ts:41-71, find.ts:114, read/traverse/presets.
  - Запись пишет канон.
  - Дедупликация `link` и правило кардинальности `one` сравнивают через `samePredicate`: активное легаси-ребро `lives-in` с той же целью означает «уже есть», с другой целью — отзывается.
- **R-1.8 Публичные входы (M3).**
  - `record.type`, `find.type`, `edges[].pred`, `link.pred`, `find.edge.pred` канонизируются.
  - Ответ возвращает каноническое имя (`u:meeting`).
- **R-1.9 Ref-позиции из запроса** (`scopes`, `edges[].to`, `link.to`, `derived_from`): значение, начинающееся с `core:|sys:|pack:|u:`, даёт `BAD_REQUEST`.
  - Проверено, что легальные id так не начинаются: `u_…`, `a_…`, `typedef:`, `pred:`, `scope:`, `edge:sha256:`.
  - Принципалы `sys:*`/`pack:*` не являются узлами; ссылки на них из запроса запрещены сознательно.
  - Слаг `ScopeSeed` с `:` — ошибка (to-act.ts:244).
- *Удешевляет:* `pack:bt`, типы `sys:` из R1 и тропы `u:` ставятся данными, без коллизий и без переписи.

### R-2 Принципал (дверь 2)
- **R-2.1** Новый `domain/principal.ts` задаёт форму `<scheme>:<id>`:
  - scheme ∈ {`user`,`agent`,`cli`,`sys`,`pack`};
  - `system:` допустим только как `system:genesis`.
- **R-2.2** `resolveReader` (access.ts:52-90): невалидный `principal` или `pack`, либо `system:*` в readers.json, дают `DEFAULT_DENY`.
- **R-2.3** `ChatBinding`/`CliBinding`/`Reader` (contract.ts:456-490, плюс зеркало в brain-mcp) получают необязательное поле `pack?: 'pack:<id>'`.
  - Поле есть → `provenanceFor` (to-act.ts:148) пишет `provenance.pack`.
  - `actor` остаётся принципалом биндинга.
  - `pack` в теле запроса → 400.
- *Удешевляет:* uninstall, экспорт и согласие по пакету становятся фильтром, а не эвристикой (V5, V7).

### R-3 Idem и id входящего (дверь 3)
- **R-3.1** Факт-чек: idem строится из `FF_BRAIN_MESSAGE_ID` (ordinal.ts:30-38, client.ts:64,149). Сервер привязывает его к диалогу (runtime.ts:376). Шлюз отдаёт id входящего (agents-manager `brain-mcp.spec.ts:79`, @9a12bda).
- **R-3.2** Idem v1 фиксируется константами в idem.ts:1-48:
  - клиент: `sha256(conv␀msg␀verb␀ordinal)`;
  - сервер: `sha256(dialog\nclient)`;
  - штамп: `<64hex>.<a–p>`.
  Штампы другой формы пропускаются и учитываются в `skippedStamps`.
- **R-3.3** ADR-0016 D10: пометка «закрыто ADR-0017 D4 + этот SPEC R-3».
- *Удешевляет:* `i2:` добавляется по схеме «сначала читатель», без миграции.

### R-4 Replay ниже Engine + `_v` (дверь 4)
- **R-4.1** Новый `engine/src/adapters/journal-codec.ts`: `encodeLine`, `decodeLine → Act`, `parseJournal(buf) → {acts, bad, torn}`. Его используют `DurableFsStore` (поведение прежнее) и pass 1.
- **R-4.2 Версия строки `_v` (M4).**
  - `encodeLine` пишет `"_v":1` первым ключом. Акт с собственным полем `_v` верхнего уровня отклоняется при записи.
  - `decodeLine` снимает `_v` только если это первый ключ.
  - Нет `_v` → v0 (прежняя эвристика).
  - `_v` не целое, 0, строка или ≠1 → bad line с причиной `unsupported-line-version`.
  - `_v` — версия сериализации адаптера; это не `provenance.schema_v`.
- **R-4.3** Новый `engine/src/adapters/replay.ts`:
  - `readJournalFile(path)` читает без лока, только на чтение;
  - `replayJournal(source, target) → ReplayReport {copied, bad[{lineNo, byteOffset, reason, sha256}], torn, sourcePath, sourceSha256}`;
  - порядок источника сохраняется, `recordedAt` не меняется;
  - непустая цель → `TARGET_NOT_EMPTY`;
  - сырого текста в отчёте нет (V7).
- **R-4.4 Источник сохраняется (M5).** Replay никогда не меняет и не удаляет источник. Правило в комментарии к модулю и в store-port.ts: после миграции исходный журнал архивируется (байты битых строк живут только там).
- **R-4.5** Контракт `StorePort.writeAct` (store-port.ts:21): адаптер не меняет `recordedAt` и порядок.
- *Удешевляет:* PG-проекция, восстановление и смена формата делаются новым адаптером, без переписи.

### R-5 Полномочие из учётных данных (дверь 5, все типы)
- **R-5.1** `Reader.authority: 'owner'|'agent'` ставит только `resolveReader`.
  - Основной токен (chat/brain-mcp, cli) → `'agent'` **всегда**, даже при `principal: user:owner`.
  - `'owner'` дают только мандат шлюза (`gateway.token` → `sys:gateway`, SPEC-R1 R-03) и внутрипроцессный `sys:brain` (сид).
  - Канал самого владельца (его сообщение в Telegram) проходит через агента и **не** даёт полномочия владельца. Одобрение — это команда, которую разбирает шлюз (проверка `inbound.userId` == owner) и шлёт с `gateway.token`.
  - До R1 R-03 HTTP-пути к полномочию владельца нет (fail-closed).
- **R-5.2** `initiative` из запроса работает только как понижение:
  - `'agent'` → `proposed` (AC-45 цел);
  - `'owner'` при `authority:'agent'` → `WRITE_DENIED`.
- **R-5.3** Перевод `proposed→active` и любая смена статуса чужого `proposed` (validate-act.ts:441) — только при `authority:'owner'`, для **всех** типов; иначе `WRITE_DENIED`.
- **R-5.4** Каждый акт несёт `provenance.authority` из reader. Это аддитивное поле и честный след для аудита.
- **R-5.5** Создание сразу в `active` при `authority:'agent'` задаётся политикой-данными типа: новое необязательное поле type-def `approval: 'owner'|'none'` (parseTypeDef, registry.ts:151, должен его сохранять).
  - Нет поля → `none`: агент пишет `active`, как сейчас. **Неломающий дефолт для генезис-типов памяти.**
  - `approval:'owner'` → создание агентом даёт `proposed`. Это ставят типы `sys:` из R1.
  - Развилка владельцу: поставить `approval:'owner'` и генезис-типам — это НЕ дефолт, ломает поток памяти.
- *Удешевляет:* одно правило для всех будущих конфиг-типов (R2–R6, пакеты) вместо поштучных проверок.

## 4. Acceptance criteria
**Имена**
- **AC-D01** Наборы `CORE_*` равны именам из генезиса (сравнение с генезисом, не с литералом).
- **AC-D02** type-def `comment` от `pack:bt`, дописанный обходом:
  - в реестр не попадает;
  - два рестарта дают ровно 1 friction `DEF_REJECTED` с id `frictionId('DEF_REJECTED', act.id)`.
- **AC-D03** `x:foo` и `core:nope` отклоняются. `pack:bt/issue` от `pack:other` → отказ, от `pack:bt` → принят.
- **AC-D04** `planDefinition(task@2)` от `user:owner`:
  - отказ, журнал не вырос;
  - снимок узла `typedef:task` до и после совпадает побайтно;
  - `registry.type('task').version===1`.
  Тот же акт, дописанный обходом: реестр v1, **доменное** чтение `Registry.definitionAt('typedef:task')` отдаёт v1 из реестра (уровень домена, не провода: wire-глагол `read` на узлы реестра по-прежнему отвечает `NOT_FOUND` — они не записи; уточнено по ревью дверей 2026-10-09). От `system:genesis` — принят.
- **AC-D05** `sys:prompt-layer` от `sys:brain` → принят. От `pack:x` → отказ, от `user:owner` → отказ.
- **AC-D06** Легаси `idea` от `user:owner`:
  - `type('idea')` и `type('u:idea')` дают один def с `name:'u:idea'`;
  - `planDefinition(u:idea@2)` пишет в узел `typedef:idea`;
  - `instance-of` целит в `typedef:idea`;
  - байты журнала не изменены.
- **AC-D07** Легаси ребро `lives-in` (`one`) и рестарт:
  - кардинальность сохранена;
  - `find{edge:{pred:'lives-in'}}` и `{pred:'u:lives-in'}` находят ребро;
  - `link u:lives-in` к той же цели → без нового ребра;
  - `link u:lives-in` к другой цели → легаси отозвано, итог одна активная цель.
- **AC-D08** `record{type:'core:task'}` → тип `task`. `scopes:['u:x']` и `link.to:'pack:bt/issue'` → `BAD_REQUEST`, ничего не записано. `edgeIdOf` и `typedef:task` ядра не изменились.

**Принципал**
- **AC-D09** Валидны `user:owner`, `agent:p2`, `cli:/x`, `pack:bt`, `sys:gw`, `system:genesis`. Невалидны `system:x`, `pack:BT`, `pack:a/b`, `foo:bar`, `owner`.
- **AC-D10** Биндинг с `principal:'system:genesis'` или `pack:'nope'` → `DEFAULT_DENY`.
- **AC-D11** Биндинг `pack:'pack:bt'`:
  - запись получает `provenance.pack==='pack:bt'`, `actor` = principal биндинга;
  - без `pack` в биндинге поля нет;
  - `pack` в теле → 400;
  - contract-sync зелёный.

**Idem**
- **AC-D12** Тот же `FF_BRAIN_MESSAGE_ID` в новом процессе brain-mcp → 1 акт, `dedup:true`. Другой message_id → другой ключ.
- **AC-D13** Фикстура из 3 актов: штамп `i2:abc`, штамп `zzz`, валидный v1. Результат: `skippedStamps===2`, ключ v1 дедуплицирует.
- **AC-D14** Штамп v1 побайтно равен формуле R-3.2.

**Replay**
- **AC-D15** Новая строка начинается с `{"_v":1`. `decodeLine(encodeLine(a))` deep-equal `a`. Легаси inline и split без payload читаются как раньше. Акт с полем `_v` → отказ записи.
- **AC-D16** `_v` равное `2`, `"1"` или `0` → `bad` с `unsupported-line-version`, соседние акты целы.
- **AC-D17** Фикстура (без `schema_v`, `provenance`-строка, неизвестные поля, битая строка, оборванный хвост) реплеится в `MemoryStore` и в `DurableFsStore`:
  - `acts()[i]` deep-equal для всех i, включая `recordedAt`;
  - `load()` равны;
  - 1 bad с lineNo, `torn` указан;
  - сырого текста в отчёте нет;
  - sha256 файла-источника не изменился.
- **AC-D18** Непустая цель → `TARGET_NOT_EMPTY`, цель не изменена.
- **AC-D19** Мозг: replay → `bootBrain` → `find`/`read` и idem-индекс равны исходным.

**Полномочие**
- **AC-D20** Reader основного токена при `principal:user:owner` → `authority:'agent'`. Подделанный заголовок или поле тела не меняют authority.
- **AC-D21** `authority:'agent'`:
  - `initiative:'owner'` → `WRITE_DENIED`;
  - `proposed→active` по любому типу → `WRITE_DENIED`, статус прежний.
- **AC-D22** `authority:'owner'` (тестовый reader `sys:gateway`) переводит `proposed→active`. Акт несёт `provenance.authority:'owner'`.
- **AC-D23** Тип с `approval:'owner'`: агент создаёт → `proposed`. Генезис-тип без поля: агент создаёт → `active` (v0.6 цел).

**Регресс**
- **AC-D24 (M3)** База фиксируется до начала: корневой `npm test` (все воркспейсы, включая engine day-scenarios) и `BRAIN_BENCH=1 npm test -w @ff/brain`. После:
  - база плюс новые, 0 failed, 0 удалённых;
  - каждое изменённое утверждение перечислено в PR (файл:строка, было→стало), только из классов §6.

## 5. Verification plan
Новые тесты:
- `packages/brain/test/domain/names.test.ts` — D01–D08;
- `packages/brain/test/domain/principal.test.ts` — D09–D11;
- `packages/brain/test/domain/authority.test.ts` — D20–D23;
- `packages/brain/test/service/idem-v1.test.ts` — D12–D14;
- `packages/engine/test/journal-codec.test.ts` — D15–D16;
- `packages/engine/test/journal-replay.test.ts` — D17–D18;
- `packages/brain/test/service/replay-equivalence.test.ts` — D19.

Команды:
- `npm test -w @ff/engine`
- `npm test -w @ff/brain`
- `npm test -w @ff/brain-mcp`
- `BRAIN_BENCH=1 npm test -w @ff/brain`
- корень `npm test`
- `npm run typecheck`

Затем critic и reviewer PASS.

## 6. Изменяемые утверждения (решение лида: вариант A — правим, не удаляем)
Известные заранее:
- `brain/test/domain/types-form.test.ts:52`: actor `user:owner`→`GENESIS_ACTOR` (через `planDefinition`).
- `brain/test/domain/types-form.test.ts:32`: `name:'meeting'`→`'u:meeting'`.
- `brain/test/domain/genesis-registry.test.ts:74`: `'idea'`→`'u:idea'`.
- `brain/test/domain/genesis-registry.test.ts:80,85`: `'lives-in'`→`'u:lives-in'` (или `samePredicate`).
- `brain/test/domain/record.test.ts:184`: повышение через reader основного токена → ожидание `WRITE_DENIED` плюс повышение тестовым reader `authority:'owner'`.

Допустимые классы правок: каноническое имя в ответе; actor ядра → genesis; повышение только владельцем. Остальное находит полный прогон (AC-D24). Любой падающий тест вне этих классов — стоп и вопрос лиду.

## 7. Touched files
**engine:**
- `src/adapters/journal-codec.ts` (новый)
- `src/adapters/replay.ts` (новый)
- `src/adapters/store-durable-fs.ts:179-241`
- `src/ports/store-port.ts:21`
- `src/index.ts`

**brain:**
- `src/domain/names.ts` (новый)
- `src/domain/principal.ts` (новый)
- `src/domain/genesis.ts:26-50,194+`
- `src/domain/registry.ts:21-232`
- `src/domain/schemas.ts:52-66`
- `src/domain/to-act.ts:148,208-240,244`
- `src/domain/validate-act.ts:88-92,268-269,309-345,413-441,523-570`
- `src/read/access.ts:52-90`
- `src/read/{find.ts:114,read.ts,traverse.ts,presets.ts}`
- `src/contract.ts:79,456-490`
- `src/service/idem.ts:1-90`
- `src/service/runtime.ts:~155`

**brain-mcp:** `src/contract.ts` (зеркало).

**docs:** ADR-0016:71.

## 8. Risks
- Alias даёт два написания одного def или предиката. Покрыто D06/D07; все сравнения идут через `canonicalName`/`samePredicate`.
- Остаточный риск D10: фолбэк шлюза на `replyToMessageId` (turn-executor.ts:298) после рестарта шлюза. Проверить на живом логе.
- Пока нет мандата R1, одобрить `proposed` по HTTP некому. Это сознательный fail-closed, а не баг.
- Расхождение двух contract.ts ловит contract-sync тест.

## 9. Rollback
Откат = revert коммита, журнал не переписан. Оговорка (M4): старый код, читая строки `{"_v":1,…}`, оставит лишний ключ `_v` в объектах Act. Проекции это не вредит, но поле видно в `acts()` и экспорте. Ещё одна оговорка: старый код применит отклонённые defs из журнала. Необратимо только записанное после первых реальных данных — ради этого SPEC и делается до них.

Итог: задача в плане — builder реализует R-1…R-5 (вариант A по §6 одобрен лидом; критик применён); открыта одна развилка владельцу — `approval:'owner'` для генезис-типов (рекомендация: нет); затем шаг 3 компаса.
<!-- patched-after-critic 2026-10-09 -->
