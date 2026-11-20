---
title: "Ресёрч: готовые инструменты показа графовой памяти человеку и агенту"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-11-01
---

# Ресёрч: готовые инструменты «вид поверх графовой памяти»

Потребитель: лид сессии view-tool (свод линз). Поглощает: ничего.
Вопрос-цель: какие ГОТОВЫЕ инструменты показывают гибкую графовую память с разных позиций человеку и агенту без ручной вёрстки каждого экрана.

## 1. Таблица кандидатов

| Что | Лицензия | Зрелость (2026) | Для кого | Цена интеграции |
|---|---|---|---|---|
| **MCP Apps** (SEP-1865, `ui://`-ресурсы + метаданные tool, iframe↔host по JSON-RPC) | открытый стандарт MCP | spec 2026-01-26 Stable; рендерят Claude (web/desktop/mobile), ChatGPT (dev mode), VS Code (exp.), Goose, Cursor. Claude Code НЕ рендерит — получает текст | оба | средне |
| **MCP-UI** (предшественник, SDK TS/Ruby/Python) | Apache-2.0 | живой, влит в MCP Apps | оба | мало |
| **OpenAI Apps SDK** | проприетарный хост, поверх MCP | prod в ChatGPT; сближен с MCP Apps | человек | средне |
| **A2UI** (Google + CopilotKit): декларативный JSON-UI из каталога доверенных компонентов, рендеры React/Angular/Lit/Flutter/Markdown | Apache-2.0 | v0.9.1, v1.0-кандидат | оба | средне |
| **Vercel AI SDK UI** (tool-parts → React-компонент) | Apache-2.0 | prod; RSC/`streamUI` на паузе, experimental | человек | средне |
| **JSON Forms / RJSF** (форма из JSON Schema + UI Schema) | MIT / Apache-2.0 | очень зрелые | человек (агент даёт схему) | мало |
| **React Flow (xyflow)** — узлы/рёбра как React-компоненты | MIT | очень зрелый | человек | средне |
| **Cytoscape.js** — граф + стили-селекторы (CSS-подобные, по данным) + раскладки | MIT | очень зрелый | человек | мало |
| **Sigma.js + graphology** — WebGL, тысячи узлов | MIT | зрелый | человек | мало-средне |
| **ELK.js / dagre** — авто-раскладка | EPL-2.0 / MIT | зрелые | движок раскладки | мало |
| **tldraw** | своя лицензия (бесплатно с водяным знаком, коммерция платно) | зрелый | человек (+агент через API) | средне |
| **Excalidraw** | MIT | зрелый | человек | средне |
| **JSON Canvas** (открытый формат Obsidian Canvas: nodes/edges/group) | MIT | стабильный 1.0 | оба (агент пишет файл) | мало |
| **Obsidian Bases** (`.base` YAML: filters/formulas/properties/views: table/cards/list/map) | проприетарное приложение, формат открытый | core-фича с 2025 | человек | мало (как образец) |
| **Dataview** (Obsidian, DQL) | MIT | зрелый, в тени Bases | человек | мало |
| **Notion DB views** / **Airtable Interfaces** | SaaS | эталон рынка | человек | много (данные уходят из-под нас) |
| **NocoDB / Baserow** (grid/kanban/gallery/form/calendar поверх SQL/PG) | AGPL / MIT-core | зрелые | человек | средне (надо PG-таблицы, граф плоский) |
| **Appsmith / Retool** | Apache-2.0 / SaaS | зрелые | человек (админки) | средне-много |
| **Tana supertags**, **Anytype** (типы+relations+sets), **Logseq** (queries) | SaaS / свой source-available / AGPL | живые | человек | много (это конкуренты, не компоненты) |

## 2. Паттерн «один набор данных — много видов»: кто как делает

Все зрелые системы сводятся к одной форме: **вид = декларация** `{source/filter, sort, group_by, visible fields, layout-type, layout-options}`, хранится как данные рядом с базой.
- Obsidian Bases — ровно это в YAML (`views: [{type: table, order, groupBy, filters}]`); ближе всех к принципу FF.
- Notion/Airtable/NocoDB/Baserow — то же, но вид хранится в их БД; layout-тип = table/board/calendar/timeline/gallery/form.
- Anytype — «Set/Collection» по типу + relations, виды grid/kanban/gallery/list.
- Графовый вид — отдельный layout с параметрами: стиль-селекторы по `type/status` (Cytoscape), раскладка (ELK/dagre/force), фильтр по рёбрам.

Вывод: наш «вид = параметры к одному исполнителю (group_by/fields/filter/sort/limit)» совпадает с отраслевым стандартом де-факто. Не хватает только поля `layout` (table|board|list|graph|timeline) и стиль-правил по типу/статусу.

## 3. Три вывода: что взять готовым, что своё

1. **Своё — только спецификация вида и исполнитель.** Формат вида (по образцу Obsidian Bases: filters/properties/views) — наш, в данных, портируемый (V5). Исполнитель = уже существующий find/overview в ff-brain. Это ядро; покупать его негде — у всех оно внутри своего продукта.
2. **Готовым — рендереры.** Таблица/борд/список — любой headless-грид (TanStack Table) или A2UI-каталог; граф — Cytoscape.js (стили-селекторы по полям = «гибкость в данных» без вёрстки) или Sigma при больших объёмах; раскладка — ELK. Формы правки — JSON Forms из схемы типа. React Flow/tldraw/Excalidraw — для ручного холста позже, не для авто-видов. JSON Canvas — дешёвый экспорт вида-графа в файл (агент пишет, человек открывает в Obsidian).
3. **Не брать** Notion/Airtable/NocoDB/Tana/Anytype как основу: они требуют, чтобы данные жили у них (ломает V2/V5 и «файлы-истина»). Годятся как образцы UX видов.

## 4. Особо: стандарт «агент через MCP отдаёт UI человеку» — есть

**MCP Apps — это и есть мост «одна структура, два адаптера».** Механика: tool (наш `find` с параметрами вида) возвращает структурированный результат для агента + в метаданных ссылку на `ui://`-ресурс (HTML/JS-виджет), который хост рендерит в песочнице-iframe и кормит тем же результатом; виджет может звать tools обратно через хост. То есть:
- агент получает JSON вида (как сейчас);
- человек в Claude/ChatGPT/VS Code видит таблицу/граф из того же ответа;
- никакой отдельной вёрстки экрана на каждый вид: один универсальный виджет «рендер вида по layout».

Оговорки: (а) Claude Code и наш Telegram-шлюз MCP Apps не рендерят — Telegram/HTTP остаются отдельными адаптерами (текст/Markdown, либо ссылка на HTTP-страницу с тем же виджетом); (б) виджет = код в iframe, значит безопасность в коде, данные в данных — совпадает с принципом. **A2UI** — альтернатива/дополнение: агент отдаёт не код, а декларативное дерево из доверенного каталога, с рендером в т.ч. в Markdown (полезно для Telegram). Реалистичная комбинация: спека вида (наша) → исполнитель → MCP-ответ + `ui://`-виджет на Cytoscape/таблице; Telegram-адаптер рендерит тот же результат в Markdown.

## Источники
- [MCP Apps SEP-1865](https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp) · [анонс MCP Apps](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/) · [Claude/ChatGPT support](https://alpic.ai/blog/mcp-apps-goes-official-claude-chatgpt-support) · [совместимость хостов](https://www.mcpbundles.com/guides/mcp-apps-host-compatibility)
- [A2UI: обзор протокола](https://home.mlops.community/public/blogs/finding-the-holy-grail-of-ai-agent-uis-from-ai-orchestrated-development-to-a2ui) · [стек A2A/MCP/AG-UI/A2UI](https://medium.com/@visrow/a2a-mcp-ag-ui-a2ui-the-essential-2026-ai-agent-protocol-stack-ee0e65a672ef)
- [AI SDK RSC (на паузе)](https://v6.ai-sdk.dev/docs/reference/ai-sdk-rsc)
- [Obsidian Bases skill (формат .base)](https://skills.sh/kepano/obsidian-skills/obsidian-bases)
- Лицензии/зрелость графовых и low-code библиотек — по знаниям агента (xyflow, cytoscape, sigma, elkjs, tldraw, excalidraw, jsoncanvas.org, nocodb, baserow), отдельно не перепроверялись — сверка: 0.

Итог: решение-кандидат — своё «спека вида + исполнитель», готовые рендереры, MCP Apps как окно для человека в AI-хостах; на ратификацию лиду/критику.

Вопрос-цель: ответил — готовые рендереры и стандарт-мост (MCP Apps, A2UI) есть; рамка «без ручной вёрстки» верна при условии одного универсального виджета по полю layout, а не экрана на каждый вид.
