---
node_type: analysis
status: draft
owner: jenya.stasik@gmail.com
date: 2026-08-12
scope: project
title: "Реальность СЕЙЧАС — файл ⟂ единица (vision Раунд 3, стартовая карта)"
related:
  - ../UNIT-SPEC-v1.design.md
  - ../INDEX.md
  - ../../../../../architecture/ADR/ADR-0006-persistence-as-policy.md
  - ../../../../../_inbox/2026-08-04-picture-coverage/questions/oq-6-node-model-reconcile.question.md
  - ../../../../../_inbox/2026-08-04-picture-coverage/questions/oq-3-file-edit-act-kind.question.md
  - ../../01-overview/L0-memory-unit.md
supersedes: []
---

# Реальность СЕЙЧАС — файл ⟂ единица

> READ-ONLY карта для vision Раунда 3 («файл↔единица»). Не решает ничего, не выбирает разрез. Фиксирует,
> что СЕГОДНЯ есть в доках и коде, чтобы будущая рамочная волна имела под ногами реальность, а не догадку.
> Метод: `docs/01-organization/rules-and-skills/session-logging/SKILL.md`-совместимо; факты — с якорем
> `file:line`.

## 1. Что такое «единица» СЕГОДНЯ (по UNIT-SPEC v1)

Спека (`../UNIT-SPEC-v1.design.md`, v1.1-s3, 2026-08-11) определяет единицу как **доверяемую композицию**:
неломаемое ядро (`canonical_id` + 7 полей-состояний по ценностям Ц-1..Ц-7 + policy-слот) + растущий реестр
типов граней + один путь записи через `resolve()`/PEP. Ключевая ось: **АКТ → ГРАНЬ → ЛИНЗА = одно вещество**
(пишем в append-only лог → материализуем грань как проекцию → читаем как линзу, линза не хранится).
«Файл» **нигде не упомянут** в тексте спеки (ни как ядро, ни как тип грани, ни как ось) — единица определена
абстрактно, поверх лога актов, безотносительно к тому, в чём физически лежит.

## 2. Как файлы представлены в коде СЕГОДНЯ — ДВЕ разные, официально не свёденные модели

Обнаружена явная, задокументированная в коде развилка (не моя интерпретация — это прямая цитата кода):

- **`@ff/core` (`packages/core/src/node.ts:1-69`, `schema.ts:14-29`)** — модель `FFNode`
  (`id·kind·title·body·tags·links·…`). **Файл = 1:1 узел.** `FileNodeStore`
  (`packages/core/src/store.ts:18-37`) хранит «одна нода = один `.md`-файл с YAML frontmatter» под
  `<root>/nodes/<id>.md`; сериализация/парсинг через `gray-matter` (`store.ts:43-59`). Комментарий в коде:
  «the files ARE the graph» (`store.ts:21`). `NODE_KINDS` (`node.ts:14-24`) перечисляет 9 родов узла
  (task/note/thought/group/chat/agent/message/trace/summary) — **отдельного рода `file` НЕТ.** В этой
  модели файл не «один из типов узла» — он способ хранения ЛЮБОГО узла.
- **`@ff/engine` (`packages/engine/src/core/types.ts:1-98`)** — модель `EnvelopeNode`
  (`id·type·state·edges·view·visibility·access·acts·policy_ref·body`), «SYSTEM ENVELOPE model». Файл в
  этой модели не первичен: единица записи — **акт** в append-only лог (`Act`, `types.ts:250-265`,
  payload идёт по ссылке `payloadRef`/`payloadHash`, НИКОГДА inline — `admission.ts:5, 78, 128-133`).

Сам код документирует это как НЕРЕШЁННЫЙ шов, не мою находку:
`packages/engine/src/core/types.ts:8-11` — *«this is a DIFFERENT substrate from `@ff/core`'s FFNode
(…) — the two models are reconciled at M3»*; `packages/engine/src/adapters/store-md.ts:5-25` — мост-адаптер
`store-md.ts`, который **сейчас** просто кладёт целый `EnvelopeNode` как JSON-блоб ВНУТРЬ тела одного
`FFNode`-carrier (`kind:'note'`, `NODE_CARRIER_MARK = 'envelope'`, `store-md.ts:8-9, 31`) — честно
помечено «keeping the mapping honestly provisional» (`store-md.ts:11`), реальный маппинг прозы→envelope =
`TODO(M3)` (`store-md.ts:13-24, 158, 187`).

## 3. «File-first» — третий, отдельный механизм (не равен ни FFNode, ни UNIT-SPEC грани)

`ADR-0006` (`docs/architecture/ADR/ADR-0006-persistence-as-policy.md:5`) вводит **file-first как
policy-на-тип**: для типов `doc/adr/spec/prompt` человек правит `.md` руками, а **акт выводится ИЗ ДИФФА
файла** — движок «первый ЧИТАТЕЛЬ, не первый писатель» (`store-md.ts:17-24`). Реализовано частично:
`FILE_FIRST_KINDS` (`store-md.ts:55`) — allowlist из `@ff/core`-родов (`note/agent/thought/summary/group`),
явно помечено `⚠️ DESIGN FORK (NOT decided here)` (`store-md.ts:46-54`), потому что это ДРУГАЯ таксономия,
чем engine-side whitelist из ADR-0006 §(g) (`doc/config/prompt/agent/adr/spec/lens`). Т.е. «какой файл
разрешено считать file-first-единицей» решается СЕЙЧАС в двух не согласованных местах.

## 4. Острейшая непокрытая двусмысленность файл↔единица

Открытый вопрос уже назван в доках, но не закрыт: **`OQ-6`**
(`docs/_inbox/2026-08-04-picture-coverage/questions/oq-6-node-model-reconcile.question.md:12-19`) —
«Reconcile двух моделей узла (store-port ↔ `@ff/core`)», связан с `OQ-3` (какой `act kind` у правки файла).
Конкретно НЕ решено ни в UNIT-SPEC, ни в коде:
- **Файл — это единица, или единица — это то, что живёт ВНУТРИ файла-контейнера?** Сегодня оба ответа
  верны в разных слоях одновременно: в `@ff/core` файл = буквально узел (1 файл = 1 нода на диске); в
  UNIT-SPEC единица определена через акт/грань/линзу, где файл в лучшем случае — представление ОДНОЙ
  грани (payload-by-ref) или несущий carrier, но это нигде явно не зафиксировано как правило.
- **Может ли одна единица держаться в нескольких файлах, или один файл нести несколько единиц?**
  Ни один документ не отвечает; текущий код структурно допускает только 1 файл = 1 `FFNode`-carrier
  (`store.ts:35-37`), т.е. де-факто 1:1, но это artefact реализации M0/файлового carrier'а, а не
  спроектированное правило UNIT-SPEC (которое вообще не упоминает файл).
- **File-first правка — это акт над существующей единицей, или отдельный источник истины, догоняющий
  граф диффом?** `store-md.ts` реализует второе (диф → act с `source:'file-first'`,
  `FILE_FIRST_SOURCE` `store-md.ts:41`), но это признано `TODO(M3)`, не финализировано на уровне единицы.

## 5. Прежние заметки, касавшиеся файл↔единица (до UNIT-SPEC)

- `docs/02-project/core/01-brain/01-overview/L0-memory-unit.md:33` — ранняя (2026-07-05, до UNIT-SPEC)
  формулировка: *«Волна = access plane: узел через рёбра ЯВЛЯЕТСЯ группой/файлом/пунктом — зерно есть
  свойство ВЗГЛЯДА, не вещи»* — т.е. «файл» здесь уже трактовался как ЛИНЗА/проекция узла, а не как
  отдельная сущность-контейнер. Эта интуиция совместима с текущей осью АКТ→ГРАНЬ→ЛИНЗА в UNIT-SPEC §2,
  но никогда не была явно сведена с ней.
- Совет `council-erase-vs-file-first-2026-07-26` (`docs/02-project/core/01-brain/01-overview/01-values/
  07-soglasie/analyses/council-erase-vs-file-first-2026-07-26.analysis.md:29-33`) обсуждал файл (git) как
  **payload-класс**, требующий отдельного admission-режима — ещё один срез «файл как носитель, не как
  единица», решённый только частично (payload-класс, не структурная модель узла).

## Unknowns остаются (не мой ответ — фиксация для будущей рамочной волны)
- Официального решения `TODO(M3)` нет; `OQ-6`/`OQ-3` открыты.
- Нет явного текста, где UNIT-SPEC говорит, что физически хранит грань (файл? запись в логе? БД?) — §4
  спеки говорит только про «стираемость = атрибут ТИПА грани», не про носитель.
