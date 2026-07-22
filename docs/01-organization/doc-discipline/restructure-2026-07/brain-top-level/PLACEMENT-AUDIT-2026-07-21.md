---
title: "Карта размещения brain — синтез аудита 6 зон + абстракт + критик"
node_type: design
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-21
Scope: project
Related:
  - ./DEVELOPMENTAL-MODEL.md            # модель ХРЕБЕТ×КЛЕТКА (5 единиц, 02-units, router «принадлежит vs служит»)
  - ./11-facet-template-and-numbering.md # фасет-шаблон §G (конфликтует: node→02-entities)
  - ./AUDIT-MAP-2026-07-21.md            # предыдущая карта того же дня (местами конфликтует с router)
  - ../../session-handoff/2026-07-18-memory-unit-design/   # хендофф-источник богатого оригинала единиц
---

# 🗺️ Карта размещения brain (синтез, 2026-07-21)

> ⚠️ Это **карта, а не переезд.** Ни один файл не двигается по этому документу. Гейт перед любым
> `git mv` — claim-ledger = **0 неучтённых строк** из богатого архивного оригинала
> (`_archived/decomposition-pre-dissolve-2026-07-20/01-model/`) + ратификация форков владельцем (§9).

---

## 1. 🎯 Резюме одной страницей

**Счётчики (агрегат по 6 зонам):**

| Метрика | Кол-во | Комментарий |
|---|---|---|
| **misplaced** | ~24 | ядро — 5 единиц семьи растащены по 02-entities/03-relations/04-mechanics |
| **homeless** (нет дома в каноне) | ~31 | почти весь богатый оригинал `_archived/.../01-model/` + опоры хребта |
| **duplicate** (кластеры под LOSE-NOTHING) | ~9 | node · edge · passport · policy-as-data · context-resolver · loop · substrate · category · hard-erase |
| **outdated** (стейл-редиректы, битые ссылки, врущие навигаторы) | ~18 | README/concept.json описывают СТАРУЮ модель; moved-стабы |
| **missingAbstractions** (несущие, без файла) | ~16 | 2 из 3 опор хребта (Конституция, integrity) + слот 02-units + implements-ребро + _mechanics + платформа |

**Топ-3 боли:**
1. **Семья из 5 единиц физически растащена.** `node`→02-entities, `edge`→03-relations, `act/lens/passport`→04-mechanics как датированные `--decomp`. Санкц. слот `02-units/` в живом дереве **НЕ существует** (find вне `_archived` = пусто). Модель это описывает — дерево этого не делает.
2. **2 из 3 опор ХРЕБТА без файла.** Конституция = самоотрицающий topics-стаб + open FQ3; integrity-as-engine-duty = абзац в M-G1 README. Нельзя строить self-describing дерево на стволе, которого нет как узла.
3. **Богатство живёт только в архиве.** Глубокий слой 07-16 (passport-registry 24 поля, policy contents/attachment, context-resolver, `_critique`, 2 вердикта Fable, D-U1..7) есть ТОЛЬКО в `_archived`; живые twins — тонкие карточки 07-14. Уже растворилось один раз (07-20). claim-ledger не сведён.

**Готовность «инфраструктура сама за себя отвечает»: ≈ 3/10 (низкая).**
Навигаторы систематически **врут про модель**: `02-domains/README.md` перечисляет generic-слоты, не 02-units; `domains.concept.json` ведёт в мёртвые архив-стабы; `core/INDEX.md` кодирует peer-модель (два ядра), а не layered (память=база); `02-infrastructure/README.md` ссылается на несуществующий сосед `../01-model/`. Читатель воспроизведёт ту же боль растаскивания. Форма-фасет верна там, где доехала (M-G1..G5, 04-modules, analyses/, values-ветка), но ствол и слот семьи ещё не материализованы.

---

## 2. 🏠 Дом 5 единиц (семья `node·edge·act·lens·plan-family`)

**Почему семья, а не 5 фасет-категорий:** knowledge-graph — субстрат-домен, чей ПРЕДМЕТ есть сама система типов; peer-отношение единиц («вместе образуют модель») сильнее их индивидуальной фасет-категории. Санкц. исключение (DEVELOPMENTAL-MODEL): тип-семья субстрат-домена держится в слоте `02-units/`, чтобы быть ВИДНОЙ, а не размазанной. Целевой корень для всех пяти:
`docs/02-project/core/01-brain/01-overview/02-domains/01-knowledge-graph/02-units/`

| Единица | Текущее состояние | Целевой дом | Питающая ценность |
|---|---|---|---|
| **node** | РАЗОРВАН: `02-entities/node-types.md` (реестр) + `04-mechanics/node--decomp-07-14` (волна) + богатейший оригинал `_archived/.../01-model/01-node/` (29 файлов) + trace `session-handoff/2026-07-18` | `02-units/01-node/` (01-explain·02-fields(passport)·04-mechanics·05-policy·06-nuances·questions·decisions) | Читаемость (Ц-1) |
| **edge** | РАЗОРВАН: `03-relations/edge-types.md` + `04-mechanics/edge--decomp-07-14` + оригинал `_archived/.../02-edge/` | `02-units/02-edge/` (уникум: span/якорь → questions или 06-nuances) | Реляционность (Ц-6) |
| **act** | ПОГРЕБЕНА: `04-mechanics/act--decomp-07-14`; дом-скаффолд только в `_archived/.../03-act/README` | `02-units/03-act/` (углублять ПЕРВЫМ — Q-2) | Доверие + Витальность |
| **lens** | ПОГРЕБЕНА: `04-mechanics/lens--decomp-07-14`; скаффолд в `_archived/.../04-lens/README` | `02-units/04-lens/` (снапшот = линза НАД журналом акта = композиция) | Читаемость (Ц-1) |
| **plan-family** | САМАЯ бездомная: живой generic-тип нет; база в `_archived/.../05-plan-family/README`; **живой decomp утёк в `02-agents/01-orchestration/02-plan/plan-family--decomp-07-14`** (recovery HANDOFF ошибочно писал «нет decomp») | `02-units/05-plan-family/` (generic-база; конкретные plan-kinds наследуют в модуле 02-agents; loop НЕ входит) | — (структурная) |

> ⚠️ **Критик-развилка по семье:** `passport` router кладёт в `02-units/01-node/02-fields/` (domain-local, принадлежит node). Но `_shared/passport/README` само-описывается как контракт «на каждом примитиве» (нужен edge/act/lens тоже), а `03-act/README` заводит свой `01-act-passport`. Это **family-shared** случай — нужен третий ярус `02-units/_shared/` (модель его рисует в диаграмме, но router в него не маршрутизирует). См. §5 и форк F5 (§9).

---

## 3. 🧩 4 домена-модели (ось деривации ценность→концерн)

Развилка «домен» несёт ДВА несовместимых смысла (см. §9, форк F1): (А) value-домены = концерн-кластеры 7 ценностей; (Б) data-домены = графы-субъекты. Хребет говорит `01-values→02-domains(4)`, но 7 ценностей НЕ выводят честно 4 data-домена (knowledge-graph — прыжок, не деривация). Ниже — **концерн-прочтение** (Ось-А); из него реальный дом есть только у D1.

| Домен | Из ценностей | Статус дома | Содержание |
|---|---|---|---|
| **D1 · Структура графа** (knowledge-graph) | Читаемость (Ц-1) + Реляционность (Ц-6) | ✅ ЕСТЬ дом `01-knowledge-graph/` | семья `02-units` (node·edge·act·lens·plan-family); как узлы читаются и связываются |
| **D2 · Тождество и Эпистемика** | Тождество (Ц-2) + Доверие (Ц-3) | ❌ БЕЗ дома | canonical_id, bitemporal, дедуп, provenance, supersession-audit; реализует движок (integrity) |
| **D3 · Витальность / Жизненный цикл** | Витальность (Ц-4) | ❌ БЕЗ дома | salience, consolidation, forgetting-lifecycle, open-loops; временной движок над журналом акта |
| **D4 · Управление** (governance) | Суверенность (Ц-5) + Согласие (Ц-7) | ❌ БЕЗ дома | policy-as-data, constitution, consent, hard-erase, ownership; сюда параллельный трек доступа (DEC-6) |

**Узел «платформа»/«модуль» (D1-Q8, СЛИТЫ, нет дома):**
- **СУБСТРАТ** (brain) = ЗЕМЛЯ, не модуль. Граф + движок-инвариант. Дом: `01-brain` целиком.
- **МОДУЛЬ** (M-G1..G5, M-P3) = единица реализации механики домена; связь `implements`. Дом: `02-infrastructure/04-modules/`.
- **ПЛАТФОРМА** = композиция модулей = plug-in-поверхность (VISION/маркетплейс). **Нет ни определения, ни дома.** Предложение: `02-infrastructure/03-platforms/` + node_type `platform`/`module` через doc-discipline.
- **Связь «память ↔ модули поверх»:** brain = фундамент-основание; agents-orchestration, projects, contract и будущие модули строятся ПОВЕРХ памяти + «базовых механик взаимодействия с агентами». Этот layered-стык **не имеет файла** (§5).

---

## 4. 🗺️ ТАБЛИЦА РАЗМЕЩЕНИЯ (главная)

Сортировка внутри каждой зоны: severity high→low. Пути сокращены от корня `docs/02-project/core/01-brain/`; полные — в тексте зон.

### Зона A — DOMAINS (`01-overview/02-domains/`)

| path | kind | verdict | target home | sev | why |
|---|---|---|---|---|---|
| `…/01-knowledge-graph/02-entities/node-types.md` | file | **misplaced** | `02-units/01-node/` (registry→02-entities, поля→02-fields) | HIGH | единица NODE как generic-слот; перестаёт быть видна как член семьи — корень боли |
| `…/01-knowledge-graph/03-relations/edge-types.md` | file | **misplaced** | `02-units/02-edge/` | HIGH | единица EDGE в слоте композиции; слот 03-relations должен нести КАК компонуются единицы |
| `…/04-mechanics/act--decomp-07-14.md` | file | **misplaced** | `02-units/03-act/` | HIGH | первоклассная единица-глагол погребена как decomp в чужой механике |
| `…/04-mechanics/lens--decomp-07-14.md` | file | **misplaced** | `02-units/04-lens/` | HIGH | единица-проекция погребена в 04-mechanics |
| `…/04-mechanics/passport-fields--decomp-07-14.md` | file | **misplaced** | `02-units/01-node/02-fields/` (+ развилки Ф2/Ф3/Ф5→questions) | HIGH | 205L B1-аудит 24 полей; passport принадлежит node = domain-local |
| `…/02-domains/README.md` | file | **outdated** | переписать под ХРЕБЕТ×КЛЕТКА + слот 02-units | HIGH | врёт про модель (generic-шаблон), дерево не отвечает само за себя |
| `…/04-mechanics/passport--decomp-07-14.md` | file | **duplicate** | слить в `02-units/01-node/02-fields/`; файл→_archived | MED | 7-строчный огрызок паспорта |
| `…/04-mechanics/node--decomp-07-14.md` | file | **duplicate** | синтез в `02-units/01-node/`; →_archived | MED | дубль node-types + оригинала + trace-07-18 (уникум: «три аудитории») |
| `…/04-mechanics/edge--decomp-07-14.md` | file | **duplicate** | синтез в `02-units/02-edge/`; span→questions | MED | дубль edge-types + оригинала (уникум: span/якорь) |
| `…/04-mechanics/layers--decomp-07-14.md` | file | **ambiguous** | `_unverified/layers.md` ИЛИ 02-fields если «ось паспорта» | MED | выявлено-не-решено: одна ось или несколько; не канон |
| `…/04-mechanics/categories-tags-facets--decomp-07-14.md` | file | **ambiguous** | остаётся domain-local механикой; шов «умные категории↔R4»→questions | MED | форк «домен vs грань» решён 07-13 (грань) — файл корректен domain-local |
| `…/02-domains/GROWTH-MAP.md` | file | **outdated** | закрыть форк category, выровнять под 02-units | MED | держит category как открытый форк (стейл vs резолюция 07-13) |
| `…/02-domains/domains.concept.json` | file | **outdated** | перенацелить на живой `01-knowledge-graph/` | MED | ведёт в мёртвые `_archived`-стабы; навигация сломана |
| `…/_archived/03-category-taxonomy-domain.md` | file | **outdated** | решение→decisions.INDEX; стаб в _archived | MED | несёт РЕЗОЛЮЦИЮ форка, живущую только в архиве |
| `…/04-mechanics/MERGE-NOTES-2026-07-20.md` | file | **right-place** | остаётся до синтеза → потом analyses/ | LOW | claim-ledger вход синтезатора — мост, не мусор |
| `…/_archived/02-agents-orchestration/` (6 стабов) | folder | **outdated** | удалить редиректы (канон в 02-agents) | LOW | STALE-moved 07-19 |
| `…/01-knowledge-graph/01-explain/README.md` | file | **right-place** | остаётся; обновить перечень под 02-units | LOW | вход-объяснение домена корректен |
| `…/01-knowledge-graph/questions/README.md` | file | **right-place** | наполнить развилками из MERGE-NOTES | LOW | узел-вопрос домена, scaffold |
| `…/01-knowledge-graph/05-policy/policy.md` | file | **right-place** | остаётся; опоры каскада завести файлами | LOW | policy-as-data корректна, но опирается на бездомные Конституцию/integrity |
| `…/_archived/{01-kg,02-agents-orch}-domain.md`, `README-old-domains.md` | file | **outdated** | остаются в _archived (redirect-история) | LOW | учтённые стейл-редиректы |

### Зона B — VALUES (`01-overview/01-values/`)

| path | kind | verdict | target home | sev | why |
|---|---|---|---|---|---|
| `…/01-values/01-chitaemost/` (×7 папок) | folder | **outdated** | перецелить ссылки `../V*-name/`→`../_archived/gen1/V*-name/` | MED | архивация gen1 осиротила десятки входящих ссылок |
| `…/07-soglasie/decisions/SPEC-DRAFT-forgetting-hard-erase.concept.json` | file | **outdated** | обновить relatesTo/keyFiles на текущий дом + 02-units/01-node | MED | указывает на старый путь `01-brain/decisions/` |
| `…/01-values/` (корень) | folder | **right-place** | остаётся; привести к фасет-слотам (GROWTH-MAP «след. шаг») | LOW | законный слот хребта; форма совпадает, узла-представления нет |
| `V1..V7-*.md`, `_CARDS`, `GROWTH-MAP`, `_archived/gen1/`, `_cross-cutting/`, `IDEAS-CYCLE2`, `07-soglasie/decisions/` | file/folder | **right-place** | остаются | LOW | карточки-источники, свод-канон, снапшот gen1, сквозные кандидаты — все на месте (ссылки на `../INDEX.md` битые) |

### Зона C — INFRASTRUCTURE (`02-infrastructure/`)

| path | kind | verdict | target home | sev | why |
|---|---|---|---|---|---|
| `04-modules/M-G3-…/policy-as-data--decomp-07-14.md` | file | **misplaced** | сквозной `_mechanics/policy-as-data/` (implements→M-G3) | HIGH | сквозная механика погребена внутри модуля-реализации |
| `04-modules/M-G3-…/{CARD,attachment,contents}--decomp + MERGE-NOTES` | file | **duplicate** | синтез LOSE-NOTHING → `_mechanics/policy-as-data/` | HIGH | 4 несведённых decomp одной механики; MERGE-NOTES=ledger |
| `04-modules/M-G2-orchestrator/context-resolver--decomp-07-14.md` | file | **misplaced** | `_mechanics/resolve-contract/` (спанит M-G1 walk + M-P5 lens) | HIGH | сквозной шов без владельца погребён в чужом модуле |
| `01-overview/MIGRATION-BLUEPRINT.md` | file | **outdated** | `_archived/` | HIGH | карта ДРУГОЙ завершённой миграции (07-06), битые ссылки |
| `02-backend/CONCEPT-03-access-permissions.md` | file | **misplaced** | сквозной `_mechanics/access-as-policy/` (impl→M-G3/M-G1) | MED | дизайн сквозной грант-механики, не backend-код |
| `02-backend/CONCEPT-02-execution-engine.md` | file | **ambiguous** | engine-spec механики движения (M-G1); implements→M-G1 | MED | определение duty-механики движка без implements-ребра |
| `_shared/reification.md` | file | **misplaced** | `01-knowledge-graph/04-mechanics/` (domain-local) | MED | ⚠️ конфликт: router=domain-local, AUDIT-MAP=сквозной _shared (форк F7) |
| `01-overview/MODULES.md` | file | **misplaced** | `04-modules/README.md` | MED | реестр модулей висит в overview, у дома нет README |
| `01-overview/architecture-README.md + .concept.json` | file | **duplicate** | уникум (абстракция МОДУЛЬ)→канон; остаток→_archived | MED | 4 конкурирующих overview-входа в одной папке |
| `01-overview/infrastructure-README.md + -INDEX.md` | file | **outdated** | README устарел; INDEX (5 опор+ADR)→analyses/backbone | MED | старый workflow; INDEX — анализ под ярлыком index |
| `01-overview/stack/` (01-db·02-api·03-taxonomy) | folder | **misplaced** | `brain/plan/stack-decisions/` ИЛИ ADR при ратификации | MED | открытые технологические развилки (DL-15), не overview |
| `01-overview/db-readiness/` | folder | **ambiguous** | `analyses/2026-07-16-db-readiness/` | MED | виток-разбор, дети разъехались; SYNTHESIS=аналитика |
| `README.md` (Related `../01-model/`) | file | **right-place** | починить ссылку на `01-overview/02-domains/` | MED | сосед `01-model` не существует; ось «модель vs инфра» без имени |
| `01-overview/SYNTHESIS-01-2026-07-09.md` | file | **misplaced** | `analyses/2026-07-09-infra-synthesis/` | LOW | датированный синтез-снимок |
| `01-overview/infrastructure-open-questions.md` | file | **misplaced** | `brain/questions/infrastructure-oq.md` | LOW | временный дом до заведения questions/ |
| `03-frontend/` | folder | **homeless** | создать названную папку с README-заглушкой | LOW | имя есть в тексте, слот не материализован |
| `04-modules/M-G1..G5`, `M-P3-loops/`, `ideas/candidates.md`, `01-overview/scenarios/` | folder | **right-place** | остаются | LOW | фасет-форма верна; но дизайн без implements-ребра |

### Зона D — АРХИВНЫЙ ОРИГИНАЛ (`_archived/decomposition-pre-dissolve-2026-07-20/01-model/`)

> Контейнер — **right-place** (снапшот по закону роста 5, заморожен read-only, = claim-ledger источник). Ниже — целевые дома СОДЕРЖИМОГО (все «homeless in canon», т.к. слота 02-units ещё нет).

| path (от `…/01-model/`) | verdict | target home | sev | why |
|---|---|---|---|---|
| `01-node/01-passport/fields.md` | **homeless** | `02-units/01-node/02-fields/passport-fields.md` | HIGH | богатейший артефакт: 24-полевой реестр + border-test + 5 форков |
| `01-node/02-policy-block/contents.md` | **homeless** | `_mechanics/policy-as-data/contents.md` | HIGH | policy=RULE/passport=VALUE/view-def=LOGIC арбитр |
| `01-node/02-policy-block/attachment.md` | **homeless** | `_mechanics/policy-as-data/attachment.md` | HIGH | 2-осевой прорыв (authority×reach), 1 резолвер |
| `01-node/03-context-resolver/architecture.md` | **homeless** | `04-mechanics/context-resolver.md` (impl→M-G2) | HIGH | Reachable∩Relevant∩Permitted, named seam resolve-contract |
| `01-node/_critique.md` | **homeless** | `02-units/01-node/decisions/critique-2026-07-16.md` | HIGH | 5-осевой adversarial sweep, ~15 failure-scenarios |
| `01-node/_critique-fable-erase.md` | **homeless** | `_mechanics/hard-erase/critique-fable-2026-07-16.md` | HIGH | вердикт по hard-erase (6 тезисов SURVIVED/CRACK/BROKEN) |
| `01-node/SYNTHESIS-unit.md` | **homeless** | `02-units/01-node/decisions/synthesis-2026-07-16.md` | HIGH | merge-anchor единицы node (4 агента, top-5 дыр) |
| `01-node/DECISIONS-unit.md` | **homeless** | `02-units/01-node/decisions/DECISIONS-unit.md` | HIGH | D-U1..7 ratification-backlog |
| `01-node/FABLE-ANSWER-hard-erase.md` | **homeless** | `_mechanics/hard-erase/fable-answer-2026-07-16.md` | HIGH | R-ERASE + INV-LINEAGE (нигде больше!) |
| `01-node/FABLE-ANSWER-direction.md` | **homeless** | `02-units/03-act/01-explain/fable-direction-2026-07-16.md` | HIGH | «designed the noun, not the verb»: Act + namespace:type@version + propagation |
| `03-act/README.md` | **homeless** | `02-units/03-act/` | HIGH | скаффолд единицы Акт (H-1 + ADR «Акт и журнал») |
| `04-lens/README.md` | **homeless** | `02-units/04-lens/` | HIGH | скаффолд единицы Линза |
| `05-plan-family/README.md` | **homeless** | `02-units/05-plan-family/` | HIGH | generic-семья plan (единственная без даже decomp в живом) |
| `_shared/constitution/README.md` | **homeless** | `01-overview/backbone/constitution.md` | HIGH | ОПОРА хребта без дома; сюда же INV-LINEAGE, R-ERASE |
| `_shared/mechanisms/README.md` | **homeless** | `_mechanics/README.md` (+ integrity-as-engine-duty) | HIGH | engine-duty register; семя integrity |
| `_shared/mechanisms/hard-erase/README.md` | **homeless** | `_mechanics/hard-erase/README.md` | HIGH | блокер DQ-2 (право на забвение как механизм) |
| `_shared/routing-rule/README.md` | **homeless** | `_mechanics/routing-rule.md` | HIGH | D-7 разводящее правило (field vs policy vs type vs edge) |
| `01-node/analyses/` (numbering,states,logs,plan-task,registry,RECOMMENDATIONS) | folder | **misplaced** | `docs/01-organization/doc-discipline/restructure-2026-07/` | HIGH | org-методология, ошибочно вложена под единицу node |
| `01-node/PROCESS-UPGRADE-2026-07-17.md` | file | **misplaced** | `…/doc-discipline/restructure-2026-07/` | MED | process/skill-конвенция, не node-знание |
| `01-node/FABLE-ANSWER-skill-upgrade.md` | file | **misplaced** | `…/doc-discipline/` | MED | org/skill-методология |
| `01-node/HANDOFF-2026-07-16.md` | file | **misplaced** | `session-handoff/2026-07-16-unit-night/` | MED | trace≠knowledge |
| `01-node/NEXT-STEPS.md` | file | **homeless** | `02-units/03-act/plan/` (несёт Act-план) | MED | смешанный: план Act-единицы + trace |
| `01-node/VISION-SIMPLE.md` | file | **homeless** | `01-overview/` (overview-grade) | MED | публичное видение, пересекает OVERVIEW.md |
| `_shared/passport/README.md` | file | **homeless** | `02-units/01-node/02-fields/` (family-shared? см. §5) | MED | «shared base + per-primitive extension» |
| `_shared/policy-as-data/README.md` | file | **homeless** | `_mechanics/policy-as-data/README.md` | MED | сквозной register — корректный framing |
| `_shared/_to-dissolve/layers.md` | file | **outdated** | слить (layers→actor field + lens), затем retire | MED | помечен к растворению; нюанс в passport-ось |
| `_shared/_to-dissolve/categories-tags-facets.md` | file | **outdated** | слить (→edge-type + node fields), затем retire | MED | помечен к растворению |
| `plan/GLOBAL.md`, `plan/design-queue.md` | file | **homeless** | `01-knowledge-graph/plan/` | MED | активные плановые индексы (marketplace, дизайн-очередь) |
| `README.md` (01-model index) | file | **outdated** | `…/brain-top-level/` (харвест 2 законов + S/T-режимов) | MED | superseded DEVELOPMENTAL-MODEL; собрать законы в фасет-шаблон |
| `00-card.md`, `02-edge/README.md`, `_shared/policy-as-data/CARD.md` | file | **duplicate** | слить в соответствующие 02-units/_mechanics; →_archived | MED | 07-14 theme-cards, twins живых decomp |
| `_shared/mechanisms/orchestration/DESIGN.md`, `plan/README.md`, `state/README.md`, `NAV.concept.json`, `TREE.md` | file | **outdated** | moved-редиректы/снапшоты — drop on merge | LOW | стейл, канон уехал |
| `01-node/{README,START-HERE,FABLE-BRIEF-*,APPLIED.concept.json}` | file | **homeless/misplaced** | node 01-explain / session-handoff / hard-erase bundle | LOW | метод-of-record + trace-указатели + вопрос-артефакты |
| `questions/README.md` | file | **homeless** | `…/doc-discipline/method-03-concept-navigation.md` | LOW | метод «дом вопросов» |

### Зона E — PROCESS/DECISIONS (`decisions, questions, analyses, plan, todo, topics/01-constitution`)

| path (от `01-brain/`) | kind | verdict | target home | sev | why |
|---|---|---|---|---|---|
| `topics/01-constitution` | folder | **homeless** | `_shared/backbone/constitution.md` (снять с FQ3); стаб→редирект | HIGH | верхняя опора хребта как самоотрицающий стаб |
| `decisions/D5-routing-rule/README.md` | file | **misplaced** | `_shared/routing-rule/` (сквозной; impl→04-modules) | MED | сквозная механика в decisions одной темы; битая ссылка design-queue |
| `decisions/D2-agent-memory-location` | folder | **misplaced** | `02-agents/01-orchestration/decisions/` | MED | память агента — тема агентов (парный ADR уже уехал) |
| `decisions/ADR-DRAFT-single-substrate-modular.md` | file | **misplaced** | `02-infrastructure/01-overview/` (или docs/architecture/ADR/) | MED | арх-решение инфры; staging до снятия блокеров |
| `plan/PLAN.md` | file | **outdated** | остаётся; починить ссылки на `_archived/.../01-model/` + `docs/00-states/` | MED | ссылается на снесённые state/ и decomposition/ |
| `questions/2026-07-12-FABLE-DB-council-brief.md` (+FABLE/CANDIDATE 07-12) | file | **misplaced** | `analyses/2026-07-12-fable-series/` | MED | датированные раунд-снапшоты, не открытые вопросы |
| `questions/` (FQ01-24 пул) | folder | **ambiguous** | пул=staging; при кристаллизации→per-unit questions/ | — | закон роста 2 требует questions/ у каждой единицы |
| `decisions/ADR-DRAFT-orchestration-state-plan-task-loop.md` | file | **outdated** | удалить редирект (канон в 02-agents) | LOW | STALE-moved 07-19 |
| `decisions.INDEX.md`, `analyses/`, `todo/TODO.md`, `plan/2026-07-13-*`, `decisions/_archived/DECISIONS-LOG-dup.md` | file/folder | **right-place** | остаются | LOW | санкц. журнал, дом снапшотов, дубль корректно в _archived |
| `questions/FQ03-hrebet-tri-urovnya` | folder | **ambiguous** | вопрос остаётся; извлечь канон Конституции/integrity в backbone | — | опора висит на open-question |

### Зона F — CORE-LEVEL (`docs/02-project/core/` + соседи)

| path | kind | verdict | target home | sev | why |
|---|---|---|---|---|---|
| `02-agents/01-orchestration/02-plan/plan-family--decomp-07-14.md` | file | **misplaced** | `01-brain/…/02-units/05-plan-family/` | HIGH | generic-семья plan (единица памяти) в модуле агентов; recovery её ПРОПУСТИЛ |
| `docs/02-project/core` | folder | **misplaced** | `docs/02-project/01-core` | MED | ненумерован на нумерованном хребте; но только как часть оси (форк F3) |
| `core/INDEX.md` | file | **outdated** | переписать: база=память+базовые-механики → модули поверх | MED | кодирует PEER-модель, не layered; стейл-указатель на topics/ |
| `core/03-contract` | folder | **homeless** | `01-core/03-contract` = «базовые механики взаимодействия с агентами» | MED | пустой стаб; natural home базового слоя, нужен контент |
| `core/02-agents` | folder | **ambiguous** | split altitude: base-primitives vs on-top module | MED | смешаны базовый слой и модуль (внешний TOOLS/agents-manager) |
| `docs/02-project/substrate` | folder | **duplicate** | схлопнуть в `01-brain` (память ЕСТЬ база) | MED | почти пустой стаб дублирует brain-as-substrate |
| `core/02-agents/loop-system` | folder | **duplicate** | `02-agents/01-orchestration/04-loop` | LOW | параллельная staging-копия (виток-2 07-15) |
| `core/02-agents/01-orchestration/agents-orchestration.concept.json` | file | **outdated** | перенацелить на `02-agents/01-orchestration/*` | LOW | ведёт в мёртвый `brain/domains/` |

---

## 5. 🕳️ Упущенные абстракции (несущие, без файла)

| Имя | Почему несущая | Предложенный дом |
|---|---|---|
| **Слот `02-units/`** | санкц. исключение — дом видимой семьи 5 единиц; в живом дереве ОТСУТСТВУЕТ | `…/01-knowledge-graph/02-units/` |
| **Конституция** | верхняя опора хребта (согласие референта · порог доступа · право на забвение · INV-LINEAGE · R-ERASE); только стаб + FQ3 | `01-overview/backbone/constitution.md` |
| **integrity-as-engine-duty** | 2-я опора хребта; инварианты держит движок, а не автор; только абзац в M-G1 | `_mechanics/integrity-as-engine-duty.md` (impl→M-G1) |
| **Ребро `implements`** | «дизайн механики — в модели, КОД — в 04-modules, связь ребром»; НЕ реализовано ни в одном файле | 03-relations слот модуля + зеркальная ссылка |
| **Сквозной бакет `_mechanics/`** | дом определений сквозных механик (policy-as-data, resolve-contract, hard-erase, bitemporal, canonical_id); есть только спорный `_shared/reification` | `02-infrastructure/_mechanics/` и/или домен `_mechanics/` |
| **`02-units/_shared/` (family-shared ярус)** | ⭐ критик: passport/act-passport — контракт на ВСЕЙ семье, не только node; router его не маршрутизирует, хотя диаграмма рисует слот | `…/02-units/_shared/` |
| **Act unit — deep design** | половина открытых дыр — act-holes (resolver↔journal race, idempotency=live gateway dup-bug); дизайн только в прозе FABLE-ANSWER | `02-units/03-act/` |
| **namespace:type@version** | ЕДИНСТВЕННОЕ предусловие федерации/plug-in/маркетплейса; только проза; retrofit невозможен | `_mechanics/type-namespace-versioning.md` |
| **propagation-contract** | «5 имён = 1 механика» (erase-cascade + consent-revoke + stale-variant + derived-cache + smart-category); death-by-design риск | `_mechanics/propagation-contract.md` |
| **resolve-contract** | шов PEP+lens+passport, которым «никто не владеет»; надо назвать и дать владельца (D-7/D8-Q2) | `_mechanics/resolve-contract.md` |
| **hard-erase** | сквозная (любой узел + Согласие); ⚠️ конфликт: value-owned (07-soglasie) vs сквозной _mechanics (форк F6) | `_mechanics/hard-erase/` + Конституция |
| **bitemporal** | обязанность движка (valid-time vs transaction-time); бездомна (FQ12); питает D2/D3 | `_mechanics/` (impl→M-G1) |
| **«Базовые механики взаимодействия с агентами»** | 2-я половина БАЗЫ (как модуль читает/пишет граф, клапан на необратимое, plugin-api); нет дома | `01-core/03-contract` ИЛИ `02-infrastructure/_shared/agent-interface/` |
| **Стык «память-фундамент → модули поверх»** | несущая идея продукта; живёт неявно в peer-INDEX + противоречивом substrate-стабе | `01-core/INDEX.md` или `01-core/00-overview/` |
| **Узел «платформа» + «модуль» как node_type** | 3 сущности слиты; платформа=plug-in-поверхность без дома (D1-Q8) | `02-infrastructure/03-platforms/` + doc-discipline |
| **Supersedes/Superseded-by между канон-доками** | ⭐ критик: DEVELOPMENTAL-MODEL ↔ 11-facet ↔ AUDIT-MAP конфликтуют без маркера supersession (нарушает docs-standard) | фронтматтер трёх доков |

---

## 6. ♻️ Дубли и вход claim-ledger (LOSE-NOTHING)

Гейт: **0 неучтённых строк** из архивного оригинала ДО любого `git mv`. Порядок: заморозить read-only → claim-ledger каждой строки → слить в целевой дом → конфликты 07-14↔07-16/07-18↔архив как **decision/open-question, НЕ молча**.

| Кластер | Датированные версии | Канон-источник | Целевой дом |
|---|---|---|---|
| **node** | `04-mechanics/node--decomp-07-14` · trace `session-handoff/2026-07-18` · `_archived/.../01-node/` (29 файлов) · `02-entities/node-types.md` | архивный оригинал (богатейший); node-types=реестр | `02-units/01-node/` |
| **edge** | `edge--decomp-07-14` · `_archived/.../02-edge/` · `edge-types.md` | edge-types + оригинал | `02-units/02-edge/` (span→questions) |
| **passport** | `passport-fields--decomp-07-14` · `passport--decomp-07-14` · `_archived/01-node/01-passport/fields.md` · `_shared/passport/README` | archive `fields.md` (24 поля) | `02-units/01-node/02-fields/` (Ф2/Ф3/Ф5→decision) |
| **policy-as-data** | 4× M-G3 `*--decomp-07-14` · trace 07-18 · `_archived/_shared/policy-as-data/{CARD,README}` · `01-node/02-policy-block/*` | M-G3/README (реализация) + archive (глубже) | сквозной `_mechanics/policy-as-data/` (impl→M-G3) |
| **context-resolver** | `M-G2/context-resolver--decomp-07-14` · `_archived/01-node/03-context-resolver/architecture.md` | archive architecture.md | `04-mechanics/context-resolver.md` (impl→M-G2) |
| **hard-erase** | `07-soglasie/decisions/SPEC-DRAFT-*` + `--decomp-07-16` + `MERGE-NOTES-hard-erase-07-20` · `_archived/_shared/mechanisms/hard-erase/` · FABLE-ANSWER | `--decomp-07-16` (active) | ⚠️ форк F6: value-owned vs сквозной |
| **loop** | `02-agents/loop-system/` (виток-2 07-15) · `01-orchestration/04-loop/` | 04-loop | `04-loop` (fold LOSE-NOTHING) |
| **substrate** | `docs/02-project/substrate/` (стаб) · `core/01-brain` | brain (богатый канон) | схлопнуть в brain |
| **category-taxonomy** | `_archived/03-category-taxonomy-domain.md` (§РЕЗОЛЮЦИЯ) · GROWTH-MAP (открыт) · `categories-tags-facets--decomp` | архив-резолюция (07-13) | решение→decisions.INDEX; decomp=domain-local |

**MERGE-NOTES-файлы** (`04-mechanics/MERGE-NOTES-2026-07-20`, `M-G3/MERGE-NOTES-2026-07-20`, `07-soglasie/.../MERGE-NOTES-hard-erase-2026-07-20`) = **готовые claim-ledger входы**, держать до синтеза, потом → analyses/ как провенанс.

---

## 7. 🏷️ core → 01-core

**Рекомендация (низкий приоритет, ПОСЛЕ форков F1/F4):** переименовать `core→01-core` **только** как часть согласованной оси уровня `02-project`, не косметически. По Закону роста 3 (нумерация = реальная ось деривации). Сейчас под `02-project/`: `core`, `substrate`, `open-questions`, `INDEX.md`. Одиночный `01-` = ложный сигнал «есть 02, 03».

Согласованный ход: (а) если `substrate` — равноправное смысловое звено → `01-core / 02-substrate`, `open-questions→questions/`; (б) но по факту **`substrate` = дубль brain-as-substrate** (§4-F) → сначала свести, потом нумеровать. **Связь «память как фундамент под модули»** должна стать явным файлом (§5): brain=БАЗА + «базовые механики взаимодействия с агентами»=БАЗА → остальные модули ПОВЕРХ. `core/INDEX.md` переписать с peer-модели на layered.

---

## 8. ⚠️ Стресс-тест критика (verdict: НЕ ратифицировать as-is)

Метафора ХРЕБЕТ×КЛЕТКА и законы 1/2/3/5 — **сохранить**. Но два механизма, которые тестировали — **02-units-исключение** и **router «принадлежит vs служит»** — не проходят self-consistency против доков ТОГО ЖЕ дня:

1. **router misclassifies passport** — свой же flagship-пример. passport делит себя на всю семью (act заводит `01-act-passport`), это family-shared, а не node-local. Router даёт только domain-local / сквозной, промахивается.
2. **node/edge дом конфликтует** — 11-facet §G кладёт node→`02-entities`, edge→`03-relations` (УЖЕ исполнено в дереве!), DEVELOPMENTAL-MODEL → `02-units/`. Ни один док не несёт Supersedes. Builder по одному из них отменяет работу другого того же дня.
3. **reification** — router=domain-local, AUDIT-MAP §2b=сквозной `_shared` (тот же источник CONCEPT-01). Router не самосогласован в руках своих же авторов.
4. **hard-erase** — router схлопывает в один сквозной файл, молча сиротя value-level SPEC (R-ERASE, INV-LINEAGE), который AUDIT-MAP держит под Согласием.
5. **02-units как «правило-обобщение» из n=1** — evolution.md требует ≥2 инстанса + rollback + human approval; предикат «домен, чей предмет = система типов» не закрыт → `category-taxonomy` (сам «type-y») может неконтролируемо претендовать.

**Главный тезис абстракт-мыслителя (совпадает с критиком):** боль НЕ «5 единиц потерялись», а дерево **смешивает две оси и зовёт обе «домен»**: Ось-А (деривация ценность→концерн→механика) и Ось-Б (субъект-данные knowledge-graph/agents/category). Фасет-шаблон обслуживает Ось-Б → разорвал семью (Ось-А-объект). Пока `02-domains` = и 4 концерн-домена, и data-домены — 3 из 4 доменов бездомны навечно.

---

## 9. 🔀 ФОРКИ ВЛАДЕЛЬЦУ (решает он, не мы)

1. **F1 — «Домен» = ? (БЛОКЕР №1).** Концерн-кластер (4 value-домена D1-D4) ИЛИ data-домен (knowledge-graph — единственный, а Эпистемика/Витальность/Управление = грани/policy внутри него)? От ответа зависит нумерация `02-domains` и половина переезда. D1-Q5/Q6.
2. **F2 — 02-units: закон или исключение?** Ратифицировать `02-units/` как checkable-предикат (какие домены получают слот) ИЛИ как логированное one-off n=1? Требует разрешения supersession с 11-facet §G (node→02-entities уже исполнено).
3. **F3 — Ось уровня `02-project` + core→01-core.** Кто равноправные звенья (`substrate` = звено или дубль brain)? Нумеровать после F1/F4.
4. **F4 — Узел «платформа»/«модуль» (D1-Q8).** Завести node_type + дом `02-infrastructure/03-platforms/`? Может добавить звенья в F3.
5. **F5 — family-shared ярус `02-units/_shared/`.** Ввести третий уровень между domain-local и сквозной для passport-подобных контрактов? (критик считает обязательным до git mv).
6. **F6 — hard-erase: где живёт?** Value-owned (`07-soglasie`) vs сквозной `_mechanics/hard-erase` vs оба (SPEC под Согласием + механика в _mechanics)?
7. **F7 — reification: domain-local vs сквозной?** Router и AUDIT-MAP противоречат. Выбрать канон.
8. **F8 — category-taxonomy: закрыть форк?** Формально решён 07-13 (грань графа), но GROWTH-MAP держит открытым. Ратифицировать закрытие → decisions.INDEX?
9. **F9 — Supersession между канон-доками.** Какой из DEVELOPMENTAL-MODEL / 11-facet / AUDIT-MAP побеждает и где? Проставить Supersedes.

---

## 10. 🚦 Следующий ход (НЕ исполнять без ратификации)

Строгий порядок — переезд заблокирован до прохождения гейтов:

1. **Стресс-тест / ответы на форки (§9).** Владелец закрывает F1 (блокер), F5, F6, F7, F9. Без F1 нумерация доменов и половина переезда «стоят на песке».
2. **ADR** на структуру субстрата + 3 опоры хребта (Конституция · integrity · policy-as-data) + решение router/02-units-предиката. Проставить Supersedes между DEVELOPMENTAL-MODEL / 11-facet / AUDIT-MAP.
3. **Опоры → узлы ПЕРЕД движением единиц.** Конституция и integrity получают файлы (backbone/), иначе дерево описывает листья и молчит о стволе.
4. **claim-ledger LOSE-NOTHING.** Заморозить `_archived/.../01-model/` read-only, свести каждую строку из MERGE-NOTES + богатого оригинала; конфликты 07-14↔07-16↔архив → decision/open-question. Гейт: **0 неучтённых**.
5. **git mv** единиц в `02-units/`, сквозных механик в `_mechanics/`, org-методологии в `doc-discipline/`, trace в `session-handoff/`. Обновить навигаторы (README, concept.json), чтобы дерево «отвечало само за себя».
