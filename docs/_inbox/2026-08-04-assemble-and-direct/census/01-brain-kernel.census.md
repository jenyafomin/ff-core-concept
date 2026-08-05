---
node_type: census
title: "Перепись фактов — область BRAIN + ЯДРО (субстрат памяти)"
status: draft
topic: assemble-and-direct
date: 2026-08-04
owner: jenya.stasik@gmail.com
related:
  - ../../../02-project/core/00-kernel/INDEX.md
  - ../../../02-project/core/01-brain/INDEX.md
  - ../../2026-08-04-picture-coverage/analyses/00-COVERAGE-MAP.synthesis.md
source:
  - docs/02-project/core/00-kernel/
  - docs/02-project/core/01-brain/
  - docs/architecture/ADR/
  - docs/02-project/substrate/
  - docs/02-project/open-questions/
  - docs/_inbox/2026-08-04-picture-coverage/
---

# Перепись — BRAIN + ЯДРО (субстрат памяти)

> Не решает, не переезжает. Картирует «где лежит вся информация» этой области для совета-архитектора.
> Прочитано: ~40 файлов целиком (индексы, инварианты, терминология, ADR, decisions-log, coverage-map);
> ~470 путей проглядены по имени (Glob) для полноты дерева, не открыты.

## Таблица домов

| Локация | Что это | Тип | Зрелость | Служит ценности | Свежесть |
|---|---|---|---|---|---|
| `docs/02-project/core/00-kernel/invariants.md` | I-1..I-14 — обязательные гарантии движка (identity/acts/projections/policy/storage/plugins/semantic) | invariants | designed, частично ратифицировано через цитирующие ADR | все 7 (строгость субстрата) | 2026-07-25, активно правится (carve-outs I-4/I-5 помечены pending) |
| `docs/02-project/core/00-kernel/terminology.md` | Словарь: PUBLIC 4 кубика (thing/relation/act/projection) vs KERNEL-STRICT 6 примитивов (entity/assertion/relation/event/projection/policy) + оси `thing×actor×scope×lens×time` | terminology | draft, но де-факто канон под approved-ADR | Читаемость (объяснимость), Суверенность (не путать scope/actor) | 2026-07-25, не обновлялась с тех пор |
| `docs/02-project/core/00-kernel/open-questions.md` | Реестр KQ-1..KQ-14, топ-3 блокера (KQ-9 persistence-ADR · KQ-4 trace-редакция · было KQ-10) | open-questions | 8/14 ратифицировано 2026-07-26, 6 open (KQ-1,2,4🔴,8,9🔴,11-ядро) | все | обновлялся 2026-07-26 (ратификация), актуален |
| `docs/02-project/core/00-kernel/decisions/2026-07-26-ratification-p1-block1-b2a.decision.md` | Акт-истина ратификации KQ-3/5/6/7/10/12/13/14 | decision | ratified | temporal/policy-модель | 2026-07-26 |
| `docs/02-project/core/00-kernel/durable-storeport.design.md` | Контракт S7 (survive-turn durable store) | design | **green-product** — редкий случай: `store-durable-fs.ts` + 2 теста через реальную границу OS-процесса, commit `b881212` | Доверие, Витальность (durability) | 2026-08-04, код опережает и подтверждает канон |
| `docs/02-project/core/00-kernel/decisions/ADR-DRAFT-root-seal-durable-store.md` | Кандидат ADR-0009: корень S1-S8, 4 движковых долга | ADR-draft | S7 sealed (зелёно), S5/S8 ещё open | Доверие/Суверенность | 2026-08-04, банер обновлён поверх текста 2026-07-31 |
| `docs/architecture/ADR/ADR-0004-...capability-access.md` | LSR (Layered Scope Resolution) + capability-доступ, `resolve()` как единственный PEP | ADR | **approved** (ратифицирован 2026-07-25) | Суверенность, Согласие | 2026-07-24/25, канон |
| `docs/architecture/ADR/ADR-0005-data-substrate-structure.md` | Структура субстрата: размещение единиц/доменов/модулей, порядок supersession (консолидация 9 форков) | ADR | **approved** (2026-07-25) | Читаемость (размещение) | 2026-07-22/25 |
| `docs/architecture/ADR/ADR-0006-persistence-as-policy.md` | Хранение = политика-на-тип; PG=default, file-first опт-ин; пишет только движок | ADR | **approved** (голос владельца 2026-07-26) | Суверенность, Доверие | 2026-07-25/26 |
| `docs/architecture/ADR/ADR-0007-erasure-and-admission.md` | Стирание как акт; 3 режима удаления; admission-gate | ADR | **SPLIT**: day-1-минимум (gate G3) = approved; crypto-shred/режим B/C/7 вопросов = proposed/draft | Согласие (Ц7, право на забвение) | 2026-07-26, Блок-3 фиксы применены 2026-07-27 |
| `docs/architecture/ADR/ADR-0008-log-and-graph-cqrs.md` | Истина субстрата = CQRS: лог актов = write-model, граф = детерминированная проекция | ADR | **approved** (2026-07-26), разрешает FQ25 | Доверие (что есть истина) | 2026-07-26, канон, код (S7) уже стоит на нём |
| `docs/02-project/core/01-brain/INDEX.md` | Мастер-индекс brain: 01-overview → 02-infrastructure + questions/decisions/plan | index | active, реструктурирован | навигация всех 7 | 2026-07-21, актуален |
| `docs/02-project/core/01-brain/01-overview/OVERVIEW.md` | «Одна картинка на экране»: анатомия (2 таблицы nodes/edges + паспорт+payload), 4 примитива, инварианты, рост | overview | draft, дизайн-фаза «закрыта» (заявлено), BUILD не стартовал | все 7 (обзор) | 2026-07-13, **не обновлялась после ADR-0008 CQRS-пивота** — модель «2 таблицы» и «журнал» описаны раздельно, не сведены явно |
| `docs/02-project/core/01-brain/01-overview/L0-memory-unit.md` | Определение единицы памяти (роль, не тип) + 34 истинные цели Г1-Г34 + цикл 6 глаголов | design/analysis | designed, ключевые решения В2/В4 закрыты (bitemporal, ребро-с-паспортом) | мост ко всем 7 ценностям | 2026-07-05, не пересматривался с тех пор — старейший несущий файл области |
| `docs/02-project/core/01-brain/01-overview/01-values/` (V1-V7 + `01-`…`07-soglasie/`, 42 грани) | 7 корневых ценностей × 6 граней декомпозиции каждая | values | **0/42 граней на глубине green-product; 8/42 на green-unit** (per coverage-map) | сами ценности | ревизии по значениям (04-05-07 до 2026-08-03); карта покрытия свежая (2026-08-04) |
| `docs/02-project/core/01-brain/01-overview/01-values/_archived/gen1/` | Первое поколение декомпозиции ценностей (7 папок V1-V7 gen1) | archived | superseded, оставлено по закону (статус, не удаление) | — (историческое) | архивировано 2026-07 (реструктуризация 07-21) |
| `docs/02-project/core/01-brain/decisions.INDEX.md` + `decisions/` | DL-01..DL-29 (два раунда: 07-12 архитектура, 07-18 ратификация бэклога) + D1-D5 | decisions-log | ratified (большинство), DL-15 superseded→DL-21 | инфраструктурные ценности (Тождество, Доверие) | 2026-07-18, **не явно сверен** с более поздним ADR-0008 (лог vs граф) |
| `docs/02-project/core/01-brain/02-infrastructure/` | Модули M-G1..G5, M-P3, стек (БД/API/инфра-таксономия), сценарии | design | draft/proposal, до-build blueprint | инфраструктурная реализация всех 7 | 2026-07-09..16, не тронуто с тех пор |
| `docs/02-project/core/01-brain/questions/FQ01..FQ25` | 25 фундаментальных вопросов (ценности/архитектура), с recheck 2026-07-07 | questions | большинство closed/checked; FQ25 resolved-by-ADR-0008 | все 7 | recheck 2026-07-07; FQ25 закрыт 2026-07-26 |
| `docs/02-project/core/01-brain/plan/` (BUILD-milestone-0, FABLE-full-build-plan) | План сборки M0→M8, «дизайн закрыт → BUILD» | plan | draft, **вероятно устарел** — противоречит KQ-14 (ратифицировано 2026-07-26: «консолидация вглубь, НЕ рост вширь») | реализация | 2026-07-12/13, не пересмотрен после KQ-14 |
| `docs/02-project/substrate/INDEX.md` | Заглушка «фундамент (граф/БД/движок)», ссылка на `01-organization/data-canon/` | index/stub | **thin, вероятно дублирующий/устаревший дом** относительно `00-kernel/` | — | 2026-07-06, не обновлялась 29 дней при активном соседнем кернел-каноне |
| `docs/02-project/open-questions/INDEX.md` | Навигатор-указатель по 4 модульным реестрам вопросов (brain/agents/contract/kernel) | navigator | active, тонкий (правильно, по закону) | — | 2026-07-13, не отражает ратификацию KQ 2026-07-26 (хотя и не обязан — тонкий указатель) |
| `docs/_inbox/2026-08-04-picture-coverage/` (COVERAGE-MAP, glossary, priority-stack, fable-verdict) | Инвентарь + скоринг покрытия ценностей кодом; независимая верификация 3 claim'ов против `packages/engine/src` | synthesis/analysis | active, самое свежее и самое проверенное | мета — измеряет остальные 6 | **2026-08-04, сегодня** |

## Истина vs дрейф

- **Главный «доки лгут» — найден и подтверждён СЕГОДНЯ** (`00-COVERAGE-MAP.synthesis.md` §4-5, независимая
  спот-проверка по коду): `access_event` заявлен каноном как «пишется `resolve()`», в коде — 0 записей;
  `kernel-acceptance-tests.md` помечает T-7 (explain-chain) «Phase-1 status: REAL», хотя CLI `inspect/explain`
  не существует; `cost-tree` (единственная реально работающая линза-сосед Витальности) не реализует ни один
  из 6 механизмов ценности, но по инерции в прошлых доках засчитывался как «покрытие». Всё это в паре
  Доверие+Витальность, где обе ценности сейчас 100% designed-only (0 кода) — самый рискованный угол области.
- **Обратный случай (доки были правы, теперь код догнал):** `durable-storeport.design.md` / ADR-DRAFT-root-seal
  S7 — раньше «gap», 2026-08-04 подтверждено git+тестами как реально построенное. Единственный green-product
  узел во всей переписи.
- **Дублирующиеся/устаревшие дома:** `docs/02-project/substrate/INDEX.md` (07-06) и, слабее,
  `docs/02-project/open-questions/INDEX.md` (07-13) — тонкие заглушки уровня `02-project/`, не обновлённые
  с тех пор, как `00-kernel/` (заведён 07-25) стал фактическим каноном субстрата. Закон doc-tree «один дом
  на тему» формально не нарушен (это заглушки-указатели, не дублируют контент), но они не редиректят на
  `00-kernel/` явно — риск, что новый читатель пойдёт по старому пути.
- **Ратифицировано ADR vs draft:** ADR-0004/0005/0006/0008 = approved (канон). ADR-0007 = SPLIT (day-1-минимум
  approved, остальное draft). Файлы `00-kernel/terminology.md` и `invariants.md`, на которые approved-ADR
  прямо ссылаются как на фундамент, сами формально **status: draft** — статусный шов, не поднятый явно нигде
  (не критично, но несогласованность видна).
- **Возможная нестыковка, не проверена до конца:** `01-brain/01-overview/OVERVIEW.md` (2 таблицы nodes/edges,
  журнал как «позвоночник», 2026-07-13) и `ADR-0008` (лог=write-model / граф=проекция CQRS, 2026-07-26) говорят
  об одном и том же по-разному сформулированным языком; не нашёл явного файла-сверки «OVERVIEW ↔ ADR-0008» —
  возможен терминологический дрейф, не смысловой конфликт (не подтверждено, помечаю unsure).
- **План BUILD (07-12/13) vs ратификация KQ-14 (07-26 «консолидация вглубь, не рост вширь»):** план не несёт
  видимой правки после разворота стратегии — вероятно устарел, не проверял глубже.

## Несущие узлы (без них область не читается)

1. `docs/02-project/core/00-kernel/invariants.md` — I-1..I-14, то, что движок ОБЯЗАН гарантировать всегда.
2. `docs/02-project/core/00-kernel/terminology.md` — общий словарь (public/kernel-strict), без которого «код
   начинает принимать архитектурные решения случайно» (цитата из invariants.md).
3. `docs/architecture/ADR/ADR-0008-log-and-graph-cqrs.md` — разрешает корневую развилку «что есть истина»
   (лог vs граф), на которой стоят ADR-0006/0007 и весь S7.
4. `docs/02-project/core/01-brain/01-overview/L0-memory-unit.md` — определяет САМУ единицу памяти (роль, не
   тип) и 34 истинные цели, из которых выросли 7 ценностей.
5. `docs/02-project/core/01-brain/01-overview/01-values/` (7×6 граней + GROWTH-MAP) — ценностная лестница,
   которую обязаны обслуживать все акты/линзы.
6. `docs/02-project/core/00-kernel/durable-storeport.design.md` + `ADR-DRAFT-root-seal-durable-store.md` —
   единственный узел, где «зелёное» подтверждено кодом, а не только бумагой — эталон для остальных.
7. `docs/_inbox/2026-08-04-picture-coverage/analyses/00-COVERAGE-MAP.synthesis.md` — без него картина
   казалась бы построенной сильно больше, чем на самом деле (19-35% против ощущения «почти готово»).

## Изначальная ценность области

Из `01-brain/01-overview/OVERVIEW.md` §1: **«Рабочий СУБСТРАТ для ИИ-агентов** (не хранилище заметок): один
граф, в котором живёт всё, с чем работают агенты — память, задачи, люди, сообщения, трейсы, конфиги, промпты,
файлы. Формат agent-first. Цель — готовый гибкий продукт-память, растущий от крошечного до огромного **без
миграций**.» Дополняет `00-kernel/invariants.md` §«Зачем этот файл»: «Субстрат — это управляемое временное
поле знаний и действий, общее для человека и агентов». Т.е. ядро+brain существуют не как хранилище файлов, а
как разделяемая рабочая память, которую ОДНОВРЕМЕННО читают человек и агенты, с гарантией, что она не
развалится при росте и не примет архитектурных решений «случайно кодом».

## Дыры карты (не проверено / неясен дом)

- `act-kinds.design.md` — упоминается в `00-kernel/INDEX.md` как «соседний канон движка», но физически лежит
  в `02-agents/.../03-schema/` (вне заданной области) — не открыт; сильно цитируется (6 ActKind), но не
  верифицирован лично.
- Сам код `packages/engine/src/` — не читал напрямую; вся оценка «что реально построено» взята из
  `picture-coverage` (который сам верифицировал grep'ом) — на веру, не перепроверено.
- `docs/00-states/00-global-build/realization-plan/phase-1-engine/README.md` — цитируется в kernel INDEX
  как якорь «Фаза 1 — движок», явно центральный документ движка, но не открывался в этой переписи; неясно,
  сколько решений там дублирует/уточняет то, что уже в `00-kernel/`.
