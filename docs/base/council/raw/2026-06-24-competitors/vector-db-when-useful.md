---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Title: Когда vector DB реально полезна (а когда нет) — для files-are-truth графа FF
Scope: research / decision input для слоя ENGINE
---

# Vector DB: когда полезна, когда нет — и куда (если) встроить в FF

> Контекст FF: knowledge graph (nodes+edges), хранение = markdown+frontmatter, **files = source of truth**,
> связи по `id`. Узел = тонкий «паспорт» (типизированный, с epistemic/sensitivity/source метками),
> читаемый БЕЗ открытия payload. Известный открытый риск — слой **ENGINE** (index / rollup / cache).
> Вопрос: нужен ли vector index / embeddings, и где именно.

---

## TL;DR — решающее правило

**Vector index нужен ТОЛЬКО когда у тебя есть конкретный failure mode «по смыслу не нашлось».**
То есть: запрос на естественном языке не совпадает по словам с содержимым узла, нужен fuzzy/semantic
recall, «найди похожее по смыслу», дедуп near-duplicate, кластеризация. Точные lookups, фильтры по
метаданным паспорта, обход связей (traversal) и «транзакционная правда» — это НЕ задача векторов.

**Для FF:** vector index — это **вторичный, производный индекс в слое ENGINE**, НИКОГДА не source of
truth. Файлы остаются истиной; вектора — выкидываемый кеш, пересобираемый из файлов. Добавлять не
по умолчанию, а **по доказанной боли**: сначала FTS/BM25 (sqlite-fts / ripgrep по frontmatter+payload),
и только когда измеримо «10-20% запросов агента не находят нужный узел по словам» — добавить embeddings.

---

## 1. В чём vector DB реально хороши

Точная «форма задачи», где embeddings бьют keyword/graph/SQL:

- **Semantic / similarity search** — запрос и документ описывают одно и то же РАЗНЫМИ словами.
  Классический пример: «что сломалось во вторник?» не найдёт инцидент-репорт, если там нет буквально
  этой фразы; вектор найдёт по смыслу. (sqlservercentral, BM25-статьи).
- **Conversational / abstract queries** — естественный язык агента/пользователя, который не совпадает с
  терминологией узлов.
- **Fuzzy recall для агентной памяти** — «вспомни, о чём мы говорили про X», где X сформулирован иначе.
- **Cross-language retrieval** — запрос на одном языке, контент на другом (для FF релевантно: ru-запрос,
  en-термины в паспорте). BM25 это в принципе не умеет.
- **Dedup / near-duplicate detection** — найти «почти такой же» узел перед созданием нового.
- **Clustering / «найди связанные по смыслу»** — группировка узлов без явных edges.

Правило формы: **векторы выигрывают, когда совпадение должно быть по СМЫСЛУ, а не по строке/полю/связи.**

## 2. Где vector DB плохи / overkill

«You probably don't need a vector database» — аргументы (sqlservercentral, несколько Medium/Maven):

- **Точные lookups** — найти узел по `id`, по тегу, по типу: это работа индекса/SQL/FTS, не вектора.
- **Структурные фильтры** — «все задачи со статусом X и sensitivity Y»: это паспорт + WHERE, не embeddings.
- **Relationships / traversal** — «дети по home-edge», «всё, что facet-of этого»: это граф, не вектор.
- **Транзакционная правда** — вектор приблизителен по своей природе; нельзя строить истину на ANN-поиске.
- **Малый корпус** — на тысячах узлов FTS/BM25 даёт результат мгновенно; вектор не окупает сложность.
- **Когда BM25/FTS уже отвечает** — если пользователь «пишет так же, как ищет» (точные термины, коды,
  категории) — keyword precision выше и дешевле.
- **Операционная цена** (ключевое для files-first проекта):
  - **embedding model lock-in** — менять модель эмбеддингов = полный реиндекс корпуса;
  - **staleness** — индекс отстаёт от файлов после правок; нужен механизм инвалидации;
  - **embedding drift** — обновил модель → дрейф качества;
  - **debugging difficulty** — деградация поиска: виноват чанкинг? модель? порог similarity? стейл-индекс?
    причину тяжело локализовать;
  - инфра: self-hosted = overhead, cloud = latency + cost + данные уходят из сети (важно для sensitivity).

Практический совет из источников: **сначала ставь нормальный BM25/FTS. Если людям ок — стоп.** Векторы —
только когда можешь показать конкретные кейсы, где keyword промахивается на 10-20% запросов.

## 3. Vector vs / + Graph (гибрид — это норма 2025)

Главный вывод из GraphRAG/HybridRAG литературы: это **не «или», а «и»**, причём с чётким разделением ролей.

Паттерн (production-проверенный, arxiv 2507.03226, HybridRAG 2408.04948, Neo4j-практика):
- **Граф = структура и истина**: сущности, связи, обход, фильтры.
- **Vector index = вторичный семантический индекс ПОВЕРХ графа**: embeddings узлов/чанков/связей
  привязаны к graph `id`. Граф остаётся source of truth; вектор — слой быстрого «похоже по смыслу».
- **Fusion**: гибридный retrieval сливает vector similarity + graph traversal (+ часто BM25) через
  **Reciprocal Rank Fusion (RRF)**. Vector сужает кандидатов → traversal обогащает контекст структурой.
- Замеры: Hybrid GraphRAG +8% factual correctness; чистый GraphRAG +7% context relevance (Sharma case study).

Как это делают memory-системы (прямые конкуренты по идее «агентная память»):
- **Zep / Graphiti** — temporal knowledge graph; **hybrid retrieval = semantic embeddings + BM25 +
  graph traversal**. Сущности с validity windows; устаревшее помечается timestamp'ом invalid и не
  всплывает. (arxiv 2501.13956). Это очень близко к нашей идее epistemic-меток + edges.
- **Mem0 / Mem0g** — их же бенчмарк (arxiv 2504.19413): graph-вариант чуть выше по общему скору
  (68.44 vs 66.88), но **проигрывает на single-/multi-hop и в ~3x медленнее**. Вывод Mem0: отказались
  от типизированного traversal, оставили дешёвый выигрыш — co-retrieval памяти, делящей сущность.
- **Cognee** — строит KG из документов для выявления связей; вектор + граф вместе.

Урок для FF: **граф-как-истина + вектор-как-вторичный-индекс — это мейнстрим-паттерн, а не экзотика.**
И: добавление графа поверх векторов даёт прирост точности, но платится скоростью — то есть «вектор по
умолчанию + граф когда нужна структура» и «граф по умолчанию + вектор когда нужен смысл» — обе валидны;
у нас граф уже истина, значит вектор — опциональная надстройка.

## 4. Конкретно для FF (files-are-truth + thin-passport граф)

**Куда встроить (если):** vector index живёт в слое **ENGINE** как derived/secondary index, рядом с
rollup/cache. Источник — файлы; ключ — `id` узла; вектор привязан к `id`, не заменяет паспорт.

**Что это покупает:**
- «Найди узлы про X по смыслу» для пользователя и агента, даже если слова не совпадают.
- Agent recall: семантическое «вспомни похожее» поверх агентной памяти/трейсов.
- Dedup при создании узлов; «связанные по смыслу» как подсказка для ручного/авто проставления edges.

**Что встраивать НЕ надо вектором** (это паспорт + граф + FTS):
- lookup по `id`/типу/тегу; фильтры по epistemic/sensitivity/source; обход home/facet-of edges;
  любая «правда» и каскады.

**Цена для нас конкретно:**
- staleness: после правки .md нужно перевычислить эмбеддинг → нужен hook/watcher + хэш контента;
- rebuild: смена embedding-модели = полный реиндекс (но т.к. файлы — истина, реиндекс безопасен и
  воспроизводим — это, наоборот, аргумент ЗА files-first: индекс всегда выкидываемый);
- cost/privacy: эмбеддинги sensitive-узлов нельзя гнать в облако — нужна локальная модель или
  исключение по sensitivity-метке (паспорт это уже позволяет).

**Рамка-рекомендация:**
- **Используй векторы, когда:** появились реальные NL-запросы «по смыслу», промахи FTS измеримы
  (>~10-15% запросов), нужен dedup/«похожие», агентный recall по перефразировке.
- **НЕ используй, когда:** корпус мал, запросы — точные (id/тег/тип/фильтр/traversal), FTS/BM25
  справляется, либо узел sensitive и нет локального эмбеддера.
- **Никогда:** как source of truth, как замена графу/паспорту, как «по умолчанию с первого дня».

## 5. Тулинг (только как decision inputs)

- **sqlite-vec** — embedded, local, zero-server, низкая латентность; идеально для local-first / per-user /
  малых корпусов. Совпадает с нашей files-first философией. Минус: молодой, ограничения concurrency.
  + sqlite-fts рядом даёт BM25 — можно сделать гибрид в одном файле БД.
- **pgvector** — если есть Postgres и <5-10M векторов: «добавь pgvector, не новую БД». Хорош, когда
  структурные данные и вектора в одном месте. Для FF — оверкилл, пока нет Postgres.
- **LanceDB** — embedded на колоночном Lance, in-process, zero-copy; edge/desktop/data-science. Аналог
  sqlite-vec по нише, но новее и меньше сообщество.
- **Dedicated vector DB** (Milvus/Weaviate/Qdrant и т.п.) — нужен только при больших объёмах/throughput;
  для FF на данном этапе — нет.

**Дефолт-выбор для FF, если вектор понадобится:** `sqlite-vec` (+ sqlite-fts для BM25) — embedded,
local-first, выкидываемый индекс из файлов. Никакого отдельного сервера, никаких данных из сети.

---

## Источники
- You Probably Don't Need a Vector Database — https://www.sqlservercentral.com/articles/you-probably-dont-need-a-vector-database
- You Don't Need Elasticsearch: BM25 in Postgres (Tiger) — https://www.tigerdata.com/blog/you-dont-need-elasticsearch-bm25-is-now-in-postgres
- When to Ditch Your Vector DB for Simple BM25 — https://medium.com/@ThinkingLoop/when-to-ditch-your-vector-db-for-simple-bm25-b4f044f1076b
- BM25 vs Vector Search (production) — https://aloknecessary.github.io/blogs/bm25_vs_vector_search/
- Weaviate — Keyword Search (BM25) — https://docs.weaviate.io/weaviate/concepts/search/keyword-search
- Hybrid GraphRAG case study (Sharma) — https://medium.com/@swapnil.sharma1998/hybrid-graphrag-architecture-for-enterprise-knowledge-retrieval-an-implementation-case-study-53bd40ec61ac
- Towards Practical GraphRAG (arxiv 2507.03226) — https://arxiv.org/html/2507.03226v3
- HybridRAG (arxiv 2408.04948) — https://arxiv.org/html/2408.04948v1
- GraphRAG vs Vector RAG (Meilisearch) — https://www.meilisearch.com/blog/graph-rag-vs-vector-rag
- Zep: Temporal KG for Agent Memory (arxiv 2501.13956) — https://arxiv.org/abs/2501.13956
- Agent Memory Systems: Letta/Mem0/Graphiti/Cognee — https://codepointer.substack.com/p/agent-memory-systems-and-knowledge
- Cognee — AI Memory Tools Evaluation (Cognee/Mem0/Zep) — https://medium.com/@cognee/cognee-ai-memory-tools-evaluation-cognee-mem0-zep-graphiti-87425abecbb2
- Comparison sqlite-vec vs pgvector — https://grokipedia.com/page/Comparison_of_sqlite-vec_and_pgvector
- Best Vector Databases 2026 (MarkTechPost) — https://www.marktechpost.com/2026/05/10/best-vector-databases-in-2026-pricing-scale-limits-and-architecture-tradeoffs-across-nine-leading-systems/
- sqlite-vec local vector search (DEV) — https://dev.to/aairom/embedded-intelligence-how-sqlite-vec-delivers-fast-local-vector-search-for-ai-3dpb
