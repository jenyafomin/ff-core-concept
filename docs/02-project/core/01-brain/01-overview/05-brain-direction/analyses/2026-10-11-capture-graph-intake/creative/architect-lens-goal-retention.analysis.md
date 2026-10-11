# Архитектор: линза-как-данные · цель-узел · retention · люди · теги — форма под ADR-0017
- **Status:** draft · **Owner:** jenya.stasik@gmail.com · **Date:** 2026-10-11
- **Потребитель:** волна первой сессии нового этапа (INTAKE «План» п.2) → critic → автор SPEC/ADR · **Поглощает:** — (отвечает на зерно п.8–15 `../../../ideas/2026-10-11-owner-seed-capture-graph.idea.md`)
- **Related:** ADR-0017 · `packages/brain/src/{domain/sys-types.ts,read/lens.ts,domain/genesis.ts,domain/to-act.ts}` · `packages/engine/src/core/erasure.ts` · `04-engine-reality-and-evolution/ideas/lens-as-data-candidate.idea.md`

## 0. Несущий инвариант (нашёл в коде — диктует всё ниже)
`erasure.ts:34-44`: неудаляемая зона акта = `id, actor, provenance, edges, …`; стираемая — только `payload`, где лежат
`label` и поля (`to-act.ts:169`). Следствие-**дверь данных**: **никакого смысла/имени в id, рёбрах и provenance.**
Id людей, тегов, целей — непрозрачные `u_…`, не слаги (`tag:алиса` переживёт стирание навсегда). Это односторонне уже сейчас.

## 1. Линза как данные
Уже есть: `sys:lens@1` — узел `lens:<id>@<v>`, `shape: enum['compose']`, `spec` текст-JSON (`sys-types.ts:80-94`); интерпретатор
отвергает чужие формы (`lens.ts:139`). Значит «линза = данные» — **пройденная дверь**, расширяем, не изобретаем.

**`sys:lens@2`** (новые значения enum = ломающее для @1 → `@2` + upcaster «compose→compose», ADR-0017 D1). Spec — 4 стадии
(как `ViewDef` из idea lens-as-data): 
- `select`: `types[]`, `scopes[]`, `tags[]` (через ребро), `status`, `include_cold=false` (V4 по умолчанию «только живое»);
- `traverse`: `root` (id или `$ctx.goal`/`$ctx.topic`), `via[]` предикаты, `dir`, `depth`;
- `group`: ось дерева — предикат (`part-of`) **или** поле, вложенность N; `order`: поле/`recordedAt`/`priority`;
- `render`: `layout: feed|tree|mindmap|table|wizard`, `label`-поле, `collapse`, `limit` (V1: дешёвый взгляд — label, не тело).

Две разновидности одного типа: **query-линза** (селектор) и **curated-линза** (явный список id в `spec.members[]` — порядок
в payload, т.к. рёбра неизменны и `edgeIdOf` не несёт порядка).

**Мост concept.json → линза.** concept.json = curated-линза с `layout: wizard`: `id`→`lens_id`, `steps[].path`→адрес-узел
(`note` с `source:{kind:file, ref:path}` — «адрес, не копия», INTAKE стр.13), `title/note/comment`→render-подсказки шага.
Направление строим **сначала обратное — экспорт**: линза рендерится в JSON, проходящий `detectConcept` (`id` + `steps[]`,
`concept-lint.mjs:16-23`) → существующий вьюер шлюза показывает память без новой UI. Импорт файлов — позже (файл может
оставаться истиной, ADR-0016 D7).

**Линза — ребро?** Нет: линза — узел (свой id, версия, policy, переносимость V5). Рёбром является **применение**:
`sys:viewed-through` (цель/область/топик → линза). Так у цели «своя линза показа» (п.13) без копии определения.

## 2. Цель-узел и наслоение
`goal` не в genesis (`genesis.ts:147-195`) → **тропа `u:goal` (candidate)**, позже — в пакет без смены id (ADR-0017 D1).
Предикаты — **сначала переиспользовать ядро** (`genesis.ts:209-226`): задача/проект→цель = `motivated-by` («serves»);
источник→цель = `informed` («evidence-for»); подцель = `part-of`. Новый только `u:answers` (ответ → вопрос цели), если
вопросы цели станут узлами. Меньше предикатов = меньше каши типов (риск idea lens-as-data).
Линза цели: `root=$ctx.goal`, `traverse via [motivated-by, informed, part-of] dir=in depth=3`, `group` по `in-scope`
(слой = проект), `render mindmap|tree`. Одна линза на все цели.
**Луп пишет:** шлюз держит `loop_run` (nextStep, budget, waitingOn) с `rootLoopId = <id цели>`; каждый тик — акт
`note/decision` + рёбра к цели, idem = (loop_run, step) (ADR-0016 D10). Смысл — в мозге, исполнение — в шлюзе (S9 loops).

## 3. Retention как данные
ADR-0017 D5 уже резервирует `policies.retention` в манифесте пакета. Запись-форма: **`sys:retention-policy`**
`{mode: never-store|ttl|erase-on-request, ttl_days, scope_of: payload}` + ребро `sys:governed-by` от области / `type-def` /
манифеста пакета / класса источника (`sys:target kind`). Разрешение — самое строгое из применимых.
Исполнение — в двух местах: (а) **never-store — гейт записи в сервисе мозга до `engine.write`** (журнал append-only, после
записи «не сохранять» уже невозможно); (б) **ttl / по запросу — плановый hard-erase payload** (тикер, M-L3) через шов
`erasure.ts`. Блокер: стирание by-ref-блоба — открытая развилка T-D1b (`erasure.ts:12-16`); без неё ttl — обещание.
**Односторонне сейчас:** всё записанное до hard_erase; хеши-свидетели без соли (`erasure.ts:26-32`); смысл в id/рёбрах (§0).

## 4. Слой людей
`person` в ядре (`genesis.ts:163`, `pii:'person'`), имя — поле → payload (стираемо). Правила: id непрозрачный; связь
person↔задача `assigned-to` (`:222`), ↔разговор `referent` (`:226`, locked), ↔проект `about` (+`in-scope`).
Согласие — **не поле, а запись** `sys:consent` (purpose, read/use, state, история; ребро `about`→person): у согласия есть
история и отзыв (V7: use≠read), поле затёрло бы её. Неделя 1 — роль вместо имени (INTAKE Q4).

## 5. Теги, категории, умные фильтры
Тег = **узел `sys:tag` + ребро `sys:tagged`**, не поле: тождество, слияние дублей садовником через `supersedes` (V2),
работает поперёк пакетов (V6). Категория = тег с `part-of` к тегу-родителю (дерево бесплатно). Умный фильтр =
**сохранённая query-линза** `layout: table|feed` — новой сущности нет.

## 6. ADR vs ADR-0017, порядок, что вне недели 1
| Что | Куда |
|---|---|
| `sys:tag/tagged`, `sys:viewed-through`, `u:goal`, переиспользование ядро-предикатов | влезает в ADR-0017 (sys:/u:, 0 правок engine) — SPEC |
| `sys:lens@2` + интерпретатор форм | SPEC под ADR-0016/0017 (прецедент R-05) + critic |
| retention + hard_erase + by-ref + `sys:consent` | **новый ADR** (V7: место исполнения, необратимость). ⚠ номер 0018 уже занят «кухня шлюза / луп = данные» (ADR-0017 D6; loops §1 п.2) — конфликт, взять следующий |
| правило §0 «нет смысла в id/рёбрах» | дверь данных — дописать в ADR-0017 «до первых данных» |

Порядок: ① правило §0 → ② линза-экспорт «лента дня по топику» в формат concept.json (Q10; только чтение) → ③ `sys:tag` →
④ `u:goal` + линза цели → ⑤ ADR V7 + hard_erase → ⑥ имена людей, retention-гейт, авто-захват.
**Вне недели 1:** имена, retention-исполнение, импорт concept.json, mindmap-рендер, `sys:consent`, связка луп→цель, политики пакетов.

Итог: решение-предложение — линза расширяется до `sys:lens@2` с экспортом в concept.json первым; цель/теги — данные под ADR-0017; retention+согласие+стирание — отдельный V7-ADR (номер 0018 конфликтует); правило «нет смысла в id/рёбрах» — новая дверь данных до первой записи.
