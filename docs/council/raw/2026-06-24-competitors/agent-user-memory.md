---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Title: Competitive research — Agent Memory & User Memory architectures
Scope: DESIGN-phase comparison против нашей модели (thin passport на графе, files=truth, agent-first)
Related: docs/architecture/ADR/ADR-0002 (thin passport), docs/STATE.md
---

# Конкуренты: как они решают Agent Memory и User Memory

> Фаза = DESIGN. Сравниваем подходы, не строим. Все технические термины оставлены на английском.

## Наша модель (для сравнения — кратко)
- **Node = thin passport**: `id · type · schema · created · updated · epistemic · sensitivity · source · principal`. AI читает паспорт БЕЗ открытия payload.
- Принадлежность / важность / cascade — **на рёбрах**; ровно один `home` edge (acyclic spine); многомерность через `facet-of`.
- Control-plane (TYPE/LENS/PATTERN/CONNECTOR) — тоже nodes.
- Хранение = **markdown + frontmatter** (файлы = истина), связи по `id`. Agent-first.
- «Agent memory» и «user memory» = просто node-classes в том же графе (traces, prompts, configs — узлы). Вектора/embeddings — пока НЕ решено.

---

## 1. mem0 (mem0ai)
**Что это:** memory orchestration layer между агентом и хранилищами. https://mem0.ai · https://github.com/mem0ai/mem0 · paper https://arxiv.org/pdf/2504.19413

- **Storage:** hybrid — vector store (Qdrant/PGVector/Pinecone/…) + graph variant **Mem0g** (entities=nodes, relationships=edges) + key-value. Vector — основной режим, граф — опциональный слой.
- **User vs agent memory:** через **scope-параметры**: `user_id` (персистентно по юзеру: preferences, биография), `agent_id` (знания агента: tools, API, conventions, domain facts — общие для всех юзеров этого агента), `run_id`/`session_id` (short-term task state), `app_id`/`org_id` (shared). Рекомендуемый паттерн — **три слоя**: agent-level (global KB) + user-level (персонализация) + session-level (task state).
- **Извлечение/консолидация/забывание:** LLM извлекает факты из диалога → дедуп/конфликт-резолюшн (ADD/UPDATE/DELETE операции над существующими фактами) → automatic filtering против bloat + decay (удаление нерелевантного со временем).
- **Retrieval:** vector similarity + graph traversal (в Mem0g).
- **Scoping nuance:** каждая запись несёт **ровно одну primary entity**; `{user_id}` неявно ограничивает записи где agent_id/run_id = null. Самый частый прод-баг — забыть передать scope → всё стекается в глобальный namespace.
- **vs нас:** mem0 = «извлечённые факты» как атомы; у нас атом = любой node (задача, человек, метрика, trace). Их scope (`user_id`/`agent_id`) — у нас это `principal` + рёбра/home. Их граф опционален и заточен под entity-relations; наш граф — фундамент, не add-on. У них нет epistemic/sensitivity на каждом атоме как first-class. У нас нет (пока) автоматического fact-extraction pipeline и vector retrieval.

## 2. Letta / MemGPT
**Что это:** stateful агенты с self-editing memory, OS-метафора («LLM OS»). https://letta.com · paper MemGPT.

- **Storage:** трёхуровневая иерархия в духе ОС:
  - **Core memory** — маленький блок ВСЕГДА в контексте (persona, user info, critical context); агент пишет в него напрямую (RAM).
  - **Recall memory** — история диалога вне контекста, поиск по запросу (disk cache).
  - **Archival memory** — долговременное cold storage, агент кладёт/ищет через tool calls (обычно vector DB).
- **User vs agent memory:** через **memory blocks** — типизированные блоки в core memory (`persona` = идентичность агента, `human` = факты о юзере). Это и есть разделение agent-self vs user.
- **Извлечение/консолидация:** **self-editing** — агент сам своими tool calls правит блоки в реальном времени; «memory pressure» триггерит eviction core→archival. **Background/sleeptime** turn без юзер-инпута: консолидация archival, переписывание разросшегося human-блока, суммаризация диалога.
- **Retrieval:** explicit tool calls (search recall / archival) + core всегда в контексте.
- **vs нас:** ключевая идея — **агент как куратор собственной памяти** + чёткое разделение «что в контексте всегда / что по запросу». У нас нет понятия «всегда-в-контексте core block» (наш thin passport — про дешёвое чтение метаданных, но не про tiering). Их persona/human-блоки = наши node-classes (agent-memory / person). Они НЕ граф-first (блоки + vector archival, не связный граф по id). Self-editing + sleeptime consolidation — сильная идея для нашего agent-слоя.

## 3. Zep / Graphiti
**Что это:** temporal knowledge graph engine для agent memory. https://getzep.com · https://github.com/getzep/graphiti · paper https://arxiv.org/abs/2501.13956

- **Storage:** **temporal knowledge graph** (поверх Neo4j). Узлы = entities, рёбра = facts/relationships. Гибрид: semantic + keyword (BM25) + graph traversal retrieval.
- **Bi-temporal модель (ключевое отличие):** 4 таймстампа на факт — `t_valid`/`t_invalid` (когда факт был истинным в реальности) и `t_created`/`t_expired` (когда система узнала/инвалидировала). Это даёт честную историю «что было правдой когда».
- **User vs agent memory:** через graph namespaces / group_id (партиционирование графа на юзера/сессию/агента). Интегрирует и unstructured (диалог) и structured (business data) в один граф.
- **Извлечение/консолидация/забывание:** LLM извлекает entities+facts из эпизодов → **edge invalidation**: новый факт, противоречащий старому, не удаляет старый, а помечает `t_invalid` (старое ребро «истекает», не стирается). Это и есть «забывание» как версионирование, а не удаление.
- **Retrieval:** hybrid (semantic + BM25 + graph) с reranking; учитывает temporal validity.
- **vs нас:** ближе всех к нам по духу (граф-first). Их **bi-temporal edge invalidation** — то, чего у нас нет: мы храним `created/updated` на узле, но не валидность факта во времени и не «истечение» ребра. Их граф — entity/fact граф из текста; наш — граф ВСЕХ артефактов жизни (задачи/метрики/configs/traces), control-plane тоже узлы. У них нет epistemic/sensitivity как метки на каждом атоме; у нас нет temporal validity и встроенного extraction.

## 4. Cognee
**Что это:** open-source memory control plane / ECL pipeline для агентов. https://cognee.ai · https://github.com/topoteretes/cognee

- **Storage:** hybrid vector + graph DB. Строит **knowledge graph** (entities + typed relations) поверх ingest из 30+ источников; ontology-grounded.
- **Pipeline ECL (Extract → Cognify → Load):** Extract = ингест сырья (API/DB/docs); **Cognify** = chunking + embeddings + entity/relation extraction; Load = запись векторов + графовых связей в backends.
- **User vs agent memory:** через datasets / namespaces; меньше акцента на user-vs-agent, больше на «structured semantic layer над любыми данными».
- **Retrieval:** hybrid (graph traversal + vector), ontology-aware.
- **vs нас:** Cognee = **pipeline-centric** (как превратить сырьё в граф). У нас граф уже первичен (узлы создаются как паспорта, не извлекаются из документов). Их «cognify» (auto-extraction в граф) — то, что нам пригодится как ОДИН из коннекторов, но не как ядро. Ontology у них ≈ наш TYPE/schema control-plane.

## 5. OpenAI Memory (ChatGPT)
**Что это:** платформенная память ChatGPT. https://openai.com/index/memory-and-new-controls-for-chatgpt/

- **Storage:** два вида — **saved memories** (явно «запомни X»: имя, preferences) и **chat history reference** (с апр.2025 ссылается на ВСЕ прошлые чаты). Под капотом RAG.
- **User vs agent:** только user memory (это потребительский продукт, агент = сам ChatGPT). Нет разделения «рабочая память агента».
- **Извлечение/консолидация:** автоматически — модель сама решает, что важно, обновляет память; юзер может смотреть/править/забывать в настройках или разговором.
- **Retrieval:** RAG-инъекция в context window (system + memory + recent summaries + session).
- **vs нас:** closed, user-only, нет графа, нет epistemic/sensitivity, нет files=truth (всё в их облаке). Полезный урок — UX контроля: «remembering / personalizing» индикаторы + право смотреть/править/забыть. Это резонирует с нашим «всё видно ИИ; видно, что он делает».

## 6. Anthropic / Claude — memory tool + context management
**Что это:** платформенный memory tool + context editing/compaction. https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool · https://platform.claude.com/docs/en/build-with-claude/context-editing

- **Storage:** **файлы в `/memories` директории**, client-side — ВЫ контролируете backend (file/db/cloud/encrypted). Claude делает tool calls (`view/create/str_replace/insert/delete/rename`), приложение исполняет локально. Это **files-as-truth, agent-edits-files** — прямой аналог нашего md+frontmatter.
- **User vs agent:** нет жёсткого разделения; это «рабочая память агента» как набор файлов. Разделение делаете вы структурой папок/файлов.
- **Извлечение/консолидация/забывание:** агент сам пишет/правит/удаляет файлы по ходу работы (self-curated, как Letta, но через файловую систему, не блоки). System prompt принуждает: «ALWAYS VIEW YOUR MEMORY DIRECTORY FIRST… ASSUME INTERRUPTION». **Context editing** (`clear_tool_uses`) чистит старые tool-results из контекста; **compaction** суммирует диалог на сервере. Память переживает compaction-границы.
- **Retrieval:** **just-in-time** — агент сам читает нужные файлы по требованию, а не грузит всё вперёд (явно противопоставлено upfront RAG).
- **Цифры:** memory+context editing = +39% к baseline; context editing один = −84% токенов на 100-turn задаче.
- **vs нас:** **самый близкий по философии** к нашему files=truth + agent-first. Разница: их `/memories` = плоские файлы под одного агента/проект, без графа связей по id, без thin-passport-метаданных (epistemic/sensitivity/principal), без control-plane-as-nodes. Наш граф = их memory tool, но структурированный в связный граф с дешёвым чтением метаданных и эпистемическими метками. Их «just-in-time retrieval» + «assume interruption / progress log» — прямо применимо к нашему agent-слою. Multi-session software pattern (initializer → progress log → end-of-session update) — готовый паттерн для наших агентов.

## 7. Прочие notable

- **LangMem (LangChain/LangGraph):** SDK для long-term memory. Три типа по когнитивной модели: **semantic** (факты; collections vs profiles=user-card), **episodic** (прошлый опыт как few-shot/summaries), **procedural** (правила поведения = правка промпта агента). Memory Manager решает store/update/delete + консолидация. Backend-agnostic (vector/KV/Postgres). **vs нас:** ценный таксономический урок — semantic/episodic/procedural как разные node-classes; procedural memory = self-editing промптов агента (у нас prompts уже узлы). https://langchain.com/blog/langmem-sdk-launch
- **Basic Memory (basicmachines-co):** **markdown-файлы на диске + SQLite индекс**, MCP-native, local-first, two-way sync (человек и AI пишут в те же файлы). Entities (=файлы) → Observations (факты) + Relations (wikilinks) = knowledge graph. **Это почти наша модель в миниатюре** (md=truth, граф через wikilinks, AI+человек на одних файлах). Отличие: у них нет thin-passport-метаданных и control-plane; граф = wikilinks, не типизированные рёбра с cascade/home. https://github.com/basicmachines-co/basic-memory
- **MemoryOS (EMNLP 2025, BAI-LAB):** «memory OS» — три тира **STM → MTM → LPM** (short/mid/long-term personal). Миграция: FIFO (STM→MTM) + **heat-score** promotion (MTM→LPM) по recency/visitation/similarity. Dynamic persona. **vs нас:** идея heat-scored promotion = автоматическое определение «что важно» — у нас важность на рёбрах, но статична; heat = способ её эволюционировать. https://arxiv.org/pdf/2506.06326
- **Supermemory:** memory API/router (vector-centric, managed) — менее уникален архитектурно; commodity «memory-as-a-service».

---

## Сводная таблица

| Система | Хранение | User vs Agent | Extraction/forgetting | Retrieval | Graph-first? | Files=truth? |
|---|---|---|---|---|---|---|
| **mem0** | vector + опц. graph + KV | scope-IDs (user/agent/run/app) | LLM extract, ADD/UPDATE/DELETE, decay | vector + graph | нет (опц.) | нет |
| **Letta/MemGPT** | core/recall/archival (vector) | memory blocks (persona/human) | self-edit + sleeptime consolidation | tool-call search | нет | нет |
| **Zep/Graphiti** | temporal KG (Neo4j) | graph namespaces/group_id | extract + **edge invalidation** (bi-temporal) | hybrid (sem+BM25+graph) | **да** | нет |
| **Cognee** | vector + graph | datasets/namespaces | ECL pipeline (cognify) | hybrid, ontology-aware | да | нет |
| **OpenAI Memory** | RAG store (closed) | только user | auto, user-editable | RAG inject | нет | нет |
| **Claude memory tool** | **файлы /memories** (client-side) | папки (вы решаете) | self-edit files + context editing/compaction | **just-in-time** file read | нет (плоско) | **да** |
| **LangMem** | backend-agnostic | semantic/episodic/procedural types | Memory Manager + consolidation | store query | нет | нет |
| **Basic Memory** | **md + SQLite** | папки/проекты | AI пишет md, sync | semantic + graph | да (wikilinks) | **да** |
| **MemoryOS** | STM/MTM/LPM tiers | personal (user+agent traits) | FIFO + heat-score promotion | tiered retrieval | нет | нет |
| **МЫ** | **md+frontmatter, links by id** | node-classes + principal | (не решено) | (не решено) | **да** | **да** |

---

## Синтез: доминирующие архитектурные паттерны

**Паттерн A — Vector-first fact store (mem0, Cognee, OpenAI, Supermemory, LangMem-default).**
Извлекаем «факты» из диалога, эмбеддим, ищем по similarity. Граф — опциональный слой сверху. Сила: простой retrieval, scale. Слабость: атом = «факт из текста», теряется структура и провенанс; забывание = эвристики/decay.

**Паттерн B — Tiered / OS-style working memory (Letta/MemGPT, MemoryOS, Claude context editing).**
Иерархия «горячее в контексте / тёплое по запросу / холодное в архиве» + автоматическая миграция между тирами (eviction, heat-score, compaction). Сила: управление ограниченным контекстом, self-curation. Это про РАБОЧУЮ память агента, ортогонально хранилищу.

**Паттерн C — Temporal knowledge graph (Zep/Graphiti, отчасти Cognee).**
Память = связный граф entities/facts с версионированием во времени (bi-temporal, edge invalidation). Сила: честная история, провенанс, reasoning по связям; «забывание» = инвалидация, не удаление. Слабость: тяжелее, нужен граф-движок.

**Паттерн D — Files-as-truth, agent-curated (Claude memory tool, Basic Memory).**
Память = обычные файлы (часто md), которые агент сам читает/пишет; just-in-time чтение вместо upfront-загрузки; человек и AI на одних файлах. Сила: прозрачность, ownership, нет vendor lock-in, ревизуемость. Слабость: «из коробки» нет богатого retrieval и нет типизированного графа связей.

### Что из этого наиболее релевантно НАМ (graph-first + files=truth + agent-first)

Мы **уже сидим на пересечении C и D** — этого почти никто не делает вместе. Конкретные заимствования:

1. **Bi-temporal на рёбрах (от Zep/Graphiti).** Добавить валидность факта во времени и **edge invalidation вместо удаления** — мощно ложится на нашу «всё видно ИИ» философию (ничего не стирается, помечается истёкшим). Кандидат в инвариант / ADR.
2. **Just-in-time retrieval + «assume interruption / progress log» (от Claude memory tool).** Прямо применимо к agent-слою: thin passport = именно то, что позволяет агенту дёшево решить, какой узел открыть. Их multi-session pattern (initializer → progress log → end-of-session update) — готовый протокол для наших агентов; резонирует с нашей «compact anxiety / DECISIONS-LOG».
3. **Tiered working memory как ОТДЕЛЬНЫЙ слой (от Letta/MemGPT/MemoryOS).** Не трогая граф-истину, ввести «горячий контекст агента» поверх графа (core block / heat-score важности). Важность у нас на рёбрах — heat-score = способ её эволюционировать динамически.
4. **Self-editing + sleeptime consolidation (от Letta).** Агент в простое чистит/консолидирует свои node-classes (agent-memory) — естественно для нашего «ИИ пишет обратно в граф».
5. **Memory taxonomy semantic/episodic/procedural (от LangMem).** Полезно как набор node-classes: procedural memory = prompt-узлы (у нас уже есть), episodic = traces, semantic = факты.
6. **Validation, что мы НЕ строим зря:** Basic Memory доказывает, что md+граф+files=truth работает в проде с MCP. Наше преимущество над ним — thin-passport-метаданные (epistemic/sensitivity/principal) + типизированные рёбра (home/cascade/facet-of) + control-plane-as-nodes. То есть мы = «Basic Memory с эпистемикой и нормальным графом» ∪ «Graphiti с files=truth» ∪ «Claude memory tool со структурой».

**Открытый вопрос для нас (нерешённый везде одинаково): vectors.** Все Паттерн-A/C-системы добавляют embeddings для semantic retrieval. Нам стоит решить: embeddings как ОТДЕЛЬНЫЙ retrieval-index поверх графа (узлы остаются истиной, вектора — производный кэш), а не как способ хранения. Это совместимо с files=truth.

---

## Источники
- mem0: https://mem0.ai · https://github.com/mem0ai/mem0 · https://arxiv.org/pdf/2504.19413 · https://docs.mem0.ai/platform/features/entity-scoped-memory · https://mem0.ai/blog/state-of-ai-agent-memory-2026
- Letta/MemGPT: https://letta.com · https://medium.com/@piyush.jhamb4u/stateful-ai-agents-a-deep-dive-into-letta-memgpt-memory-models-a2ffc01a7ea1 · https://sureprompts.com/blog/letta-memgpt-walkthrough
- Zep/Graphiti: https://arxiv.org/abs/2501.13956 · https://arxiv.org/html/2501.13956v1 · https://help.getzep.com/graphiti/getting-started/overview · https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/
- Cognee: https://github.com/topoteretes/cognee · https://www.cognee.ai/blog/deep-dives/grounding-ai-memory
- OpenAI Memory: https://openai.com/index/memory-and-new-controls-for-chatgpt/ · https://help.openai.com/en/articles/8590148-memory-faq · https://help.openai.com/en/articles/11146739-how-does-reference-saved-memories-work
- Claude memory tool / context mgmt: https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool · https://platform.claude.com/docs/en/build-with-claude/context-editing · https://anthropic.com/news/context-management · https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- LangMem: https://www.langchain.com/blog/langmem-sdk-launch · https://docs.langchain.com/oss/python/concepts/memory
- Basic Memory: https://github.com/basicmachines-co/basic-memory
- MemoryOS: https://arxiv.org/pdf/2506.06326 · https://github.com/BAI-LAB/MemoryOS
