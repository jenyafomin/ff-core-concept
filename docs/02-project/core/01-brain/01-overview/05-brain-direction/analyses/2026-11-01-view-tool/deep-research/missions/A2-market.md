# A2 — Рынок и сценарии: 4 миссии ресёрча (линза снаружи-внутрь)

- Status: draft · Owner: jenya.stasik@gmail.com · Date: 2026-11-01
- Потребитель: команды исследователей deep-research. Поглощает: ничего.
- Related: ../../raw/05-genui-research.md (уже известно: A2UI, AG-UI, json-render, MCP Apps, Cytoscape, Obsidian Bases, Notion/Airtable — НЕ повторять)

## M1. Живые генеративные интерфейсы: что реально остаётся в ежедневном использовании
- **Вопрос-цель:** какие AI-продукты с генеративным/адаптивным UI удерживают пользователей через 3+ месяца и какой именно паттерн их удерживает?
- **Линза:** ретеншн, а не демо.
- **Искать:** Claude Artifacts, ChatGPT Canvas/Apps, v0, Lovable, Bolt, Replit Agent, Notion AI Agents, Perplexity Pages, Gemini Canvas, Poke, Dia. Термины: generative UI, ephemeral UI, chat-to-app, disposable software, malleable software.
- **Где:** Product Hunt (2025-26 топы), HN (Show HN + комментарии «я этим пользуюсь каждый день»), блоги компаний с цифрами retention/WAU, посты Geoffrey Litt, Ink & Switch.
- **Сильная находка:** есть метрика или свидетельство повторного использования ЭТОГО UI (а не чата), плюс причина удержания.
- **Анти-цель:** список фреймворков и спецификаций, пересказ релизов, восторги без данных.

## M2. Интерфейс над графом знаний и персональной памятью
- **Вопрос-цель:** как продукты показывают человеку граф записей и связей так, что он реально смотрит на вид, а не только спрашивает чат?
- **Линза:** вид как ежедневная привычка владельца.
- **Искать:** Mem, Reflect, Tana (supertags/live queries), Heptabase, Capacities, Anytype, Roam, Obsidian-плагины (Canvas, Dataview, Bases-кейсы), Rewind/Limitless, Granola, Glean, Palantir Foundry (Workshop/Ontology), Neo4j Bloom. Термины: knowledge graph UI, saved views, live query, ontology-driven UI.
- **Где:** GitHub trending и awesome-списки, HN, форумы Tana/Obsidian, кейсы Palantir/Glean, Reddit r/PKMS.
- **Сильная находка:** пользователи описывают вид как «рабочий стол», который генерируется из запроса к графу, и объясняют, почему граф-картинка не прижилась (или прижилась).
- **Анти-цель:** красивые визуализации графа без повседневного сценария; «граф-шар» ради шара.

## M3. Дашборды и интерфейсы для агентов: наблюдаемость и контроль
- **Вопрос-цель:** что человек хочет видеть про работу ИИ-агентов (трейсы, записи, проверки, очередь) и как это показывают живые продукты?
- **Линза:** владелец контролирует агентов, «видно, что ИИ делает».
- **Искать:** Langfuse, LangSmith, Arize Phoenix, AgentOps, Helicone, Braintrust, Devin/Cursor/Claude Code Agent View, Linear for Agents, Zapier/n8n agent UI, Cline/Roo. Термины: agent observability, human-in-the-loop approval UI, agent inbox, generative dashboard.
- **Где:** GitHub (stars/issues), блоги LangChain и Langfuse, HN, X-треды операторов агентов.
- **Сильная находка:** конкретные виды (очередь одобрений, лента изменений памяти, диф), которыми пользуются ежедневно, и чего в них не хватало.
- **Анти-цель:** чистый LLM-трейсинг для разработчиков, без сценария «владелец одобряет/читает».

## M4. Telegram и мессенджер как канал генеративного вида
- **Вопрос-цель:** какой минимальный вид в Telegram (Mini App, inline-карточка, картинка, ссылка на веб-вид) работает ежедневно, а где мессенджер ломается?
- **Линза:** главный канал владельца = чат.
- **Искать:** Telegram Mini Apps (Notcoin-эффект неважен; смотреть utility-приложения), Poke, Lindy, Dola, WhatsApp/Telegram-ассистенты с карточками, боты-дашборды (Grammy/aiogram кейсы), Slack Block Kit и Teams Adaptive Cards как референс. Термины: chat-first UI, rich cards, Mini App vs inline, deep link to view.
- **Где:** Product Hunt, core.telegram.org/blog и Bot API changelog, GitHub, Reddit r/TelegramBots, HN.
- **Сильная находка:** сравнение форматов (карточка / картинка / Mini App / ссылка) по частоте использования и трению, с лимитами платформы.
- **Анти-цель:** крипто- и игровые Mini Apps, платёжные боты, общие обзоры «будущее чат-интерфейсов».
