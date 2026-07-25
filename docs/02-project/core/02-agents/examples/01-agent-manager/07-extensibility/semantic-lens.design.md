---
id: semantic-lens
node_type: design
title: Семантика как линза — rights-aware гибридный retrieval поверх графа-субстрата
status: draft
owner: jenya.stasik@gmail.com
date: 2026-07-25
scope: Project (FF-Personal-Management)
related:
  - ../03-schema/README.md                       # R-1 форма view (from·traverse·filter·shape), R-6 оси роста
  - ../_generated-examples/run-view.mjs           # движок линз (proof-набросок исполняет здесь)
  - ../../../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md   # resolve()=PEP, права=тот же запрос, зеркало
  - ../../../../../00-states/00-global-build/realization-plan/phase-1-engine/README.md            # D-1 (граф=истина, PG=индекс), ranking contract
  - ../../../../../_log/2026-07-25-phase-1-design/RAG-vs-our-model.md                              # почему дыра «нет семантики», гибрид-вывод
---

# Семантика как линза (rights-aware hybrid retrieval)

> _Правки-факты (GPT-ревью, 2026-07-25): применён C-1 (OWASP — раскрытие чувствительной информации = LLM02 №2, vector/embedding-уязвимости = LLM08 №8; не смешивать две категории). C-2/C-3/C-4/C-5/C-6 — соответствующих заявлений в этом файле нет._

> **Зачем.** Наша единственная реальная дыра против RAG — нет семантического поиска. Дизайн закрывает её
> АДДИТИВНО: семантика — не рядом с движком, а внутри `filter` как ещё один предикат; вектор — производный
> индекс (D-1), истина = текст узла; права — тот же `resolve()`, применённый ПЕРЕД similarity. Это то,
> чего у agentic RAG нет (доступ почти отсутствует — OWASP LLM Top-10 2025: раскрытие чувствительной
> информации = риск №2, LLM02; специфические vector/embedding/RAG-уязвимости = риск №8, LLM08; в обоих
> permission-aware retrieval обязателен).

## Несущие решения
1. **Вектор = производный индекс в `pgvector`, НЕ поле истины.** В конверте узла — только декларативный
   указатель `body.embed = {source_field, model, chunk}`, а сам float-вектор живёт в PG (как обратный индекс
   рёбер, R-2, gitignored). Ни `body.embedding` (мусорит истину, дрейф, раздувает git), ни узел-истина.
2. **`similar` — предикат из ЗАКРЫТОГО enum внутри `filter`; ранжирование/усечение — в `shape`.** Форма
   4-стадий `from·traverse·filter·shape` НЕ меняется (аддитивно к R-1, держит view-def ranking contract:
   грамматика = якорь-движок, набор предикатов = расширяемый enum-данные). Новый предикат = код+ADR (R3);
   выбор из набора = данные (R1) — тот же шов controlled/flexible, что D2 в ADR-0004.
3. **Порядок B: rights+структура prefilter → similarity ВНУТРИ кандидатов.** Несущее. Бьёт в OWASP
   LLM02 (раскрытие чувствительной информации, риск №2) и LLM08 (vector/embedding-уязвимости, риск №8).
4. **Гибрид = один SQL:** btree/GIN (права/тип/структура) + HNSW-ANN, prefilter-CTE; `resolve_visible` = тот
   же LSR-PEP, не RLS сбоку; в PG пишет ТОЛЬКО движок (замок D-1).
5. **Провенанс обязателен** (`_score` + matched_field + впустившее ребро); конфиг ретривера = узлы-данные
   (`view` / `meta:embed-model/*` / `threshold`/`top_k`), не скрытый код — принцип-зеркало.
6. **Чанк = узел** (align с гранулярностью прав: права на узле, вектор на узле); дрейф ловим `source_hash`;
   эмбеддинг опт-ин и дельта-батчем.

## Форма линз (JSON)

**`view:semantic-search`:**
```json
{ "id": "view:semantic-search", "type": "view",
  "body": {
    "from": { "type": "*" }, "traverse": [],
    "filter": [
      { "visible_to": "$viewer" },
      { "similar": { "field": "body.text", "query": "$q", "top_k": 20, "threshold": 0.78 } } ],
    "shape": { "fields": ["id","type","body.title"], "order_by": "_score", "limit": 20 },
    "params": { "viewer": null, "q": null } } }
```

**`view:hybrid`** (структурный фильтр × similarity):
```json
{ "id": "view:hybrid", "type": "view",
  "body": {
    "from": { "type": "task" }, "traverse": [ { "pred": "part-of", "depth": 1 } ],
    "filter": [
      { "visible_to": "$viewer" },
      { "field": "state.status", "eq": "open" },
      { "field": "edges", "contains": "$project" },
      { "similar": { "field": "body.text", "query": "$q", "top_k": 50, "threshold": 0.75 } } ],
    "shape": { "fields": ["id","body.title","state.status"], "order_by": "_score", "limit": 15 },
    "params": { "viewer": null, "project": null, "q": null } } }
```
`_score` — служебное поле, добавляемое предикатом `similar`; исполнение `filter`: сначала дешёвые и
несущие безопасность предикаты (`visible_to` через `resolve()`, `type`, `state`, ребро-`contains`),
`similar` — ПОСЛЕДНИМ, по уже допустимым кандидатам; `_score` присваивается только пережившим clamp.

## Rights-aware порядок (почему B, не A)
- **(A) similarity → rights-clamp** (как RAG): ANN по всему стору → потом отсечь недоступное. Две дыры:
  (1) top_k «съедается» недоступными → доступные релевантные вытесняются за горизонт (утечка через
  ранжирование даже при финальной фильтрации); (2) сам факт «есть похожий узел» = topology-leak (класс S12).
- **(B) rights+структура prefilter → similarity внутри кандидатов** — наш выбор. И точность (top_k не
  тратится на запретное), И безопасность (недоступный узел не влияет ни на выдачу, ни на существование).
  Качественнее RAG: там similarity по всему стору, права сбоку/никак; у нас права = тот же PEP и СПЕРЕДИ.

## Хранилище (pgvector)
```sql
CREATE TABLE embeddings (
  node_id text PRIMARY KEY, vec vector(1024),
  source_hash text,        -- дрейф-детектор vs истина-текст
  model text );
CREATE INDEX ON embeddings USING hnsw (vec vector_cosine_ops);
```
Гибрид в одном SQL (prefilter-CTE, порядок B):
```sql
WITH allowed AS (
  SELECT n.id FROM nodes n
  WHERE n.body @> '{"state":{"status":"open"}}'
    AND EXISTS (SELECT 1 FROM edges e WHERE e.source=n.id AND e.predicate='part-of' AND e.target=$project)
    AND resolve_visible(n.id, $viewer) )
SELECT a.id, 1-(m.vec <=> $qvec) AS _score
FROM allowed a JOIN embeddings m ON m.node_id=a.id
WHERE (1-(m.vec <=> $qvec)) >= $threshold
ORDER BY _score DESC LIMIT $k;
```
Генерация: движок при `write` DB-first типа (или fs-diff для file-first) ставит ре-эмбеддинг в очередь,
пишет вектор с `source_hash`. Хэш узла ≠ хэш вектора → stale-маркер (фоновый reconcile).

## Мин. proof (killer-прогон)
`run-view.mjs` + `view:hybrid`, **стаб-эмбеддер** (детерминированный bag-of-tokens cosine — нужна МЕХАНИКА,
не нейросеть). Шаги: `from`+`traverse`+структурные предикаты → кандидаты; `visible_to:$viewer` через
существующий `matchFilter`/resolve → **отсечь недоступное ДО similarity**; `similar` → cosine по пережившим,
`_score`, порог+top_k; `shape` → `order_by:_score`, limit.
**Доказывает НЕ «поиск работает», а механику прав:** узел, семантически ближайший к `$q`, но невидимый
`user:guest`, НЕ попадает в выдачу И НЕ вытесняет видимый — порядок B против наивного A (аналог
NAIVE-vs-FIXED 15/15); выдача несёт `_score` и провенанс; `exit 0`.

## Честные риски
- Качество эмбеддингов = выбор модели-узла; метрику (recall@k на размеченном наборе) — в CI.
- Стоимость эмбеддинга при записи → очередь+батч, дельта по `source_hash`, опт-ин `body.embed`.
- Дрейф индекс↔истина → `source_hash` mismatch = stale; фоновый reconcile (как staleness read-model D-1).
- Чанкинг: дефолт `chunk:"node"` (align с правами); крупные узлы → суб-векторы, наследующие visibility.
- Холодный старт: пустой индекс → гибрид грациозно вырождается в структурный filter (`_score:null`).
- Q-7: HNSW поверх малого allowed-множества недобирает recall → фолбэк на точный `<=>` scan; проверить.

## Как это отвечает на «свою агентную систему»
Из трёх забот agentic RAG у нас уже есть две в модели: **оркестрация** (agent-manager/graph-loop),
**память** (корпус узлов), **стоимость** (cost-tree). Не хватало ровно **семантической линзы** — этот дизайн
её добавляет, оставляя движок фиксированным. Значит «упаковать свою агентную систему» = три заботы RAG
ложатся на наши оси, а RAG впитывается МОДУЛЕМ (семантика = одна из линз), а не конкурентом.
