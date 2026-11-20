---
title: "Ресёрч: полностью генеративный UI для агентных систем — как держат контроль"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-11-01
type: analysis
related: ./01-research.md (MCP Apps / A2UI обзорно — здесь не повторяем)
---

# Полностью генеративный UI: что генерирует ИИ и чем ограничен

Вопрос-цель: как устроен «полностью генерируемый интерфейс» в агентных системах и как в нём сохраняется предсказуемость.
Название, которое назвал владелец, — скорее всего **AG-UI** (CopilotKit). Но AG-UI — это транспорт. Сам «генерируемый интерфейс» в этом стеке задаёт **A2UI** (Google + CopilotKit). Обычно их называют вместе.

## Таблица

| Решение | Что генерирует ИИ | Чем ограничен | Транспорт | Лицензия · зрелость | Стек · вне React |
|---|---|---|---|---|---|
| **AG-UI** (CopilotKit) | ничего про внешний вид: ~16 типов событий (run, текст, tool-call, `STATE_SNAPSHOT`/`STATE_DELTA` = RFC 6902 JSON Patch, activity) | схема событий | SSE/WS; внутри можно передавать A2UI, MCP-UI, Open-JSON-UI | MIT · стабилен, SDK для TS/Python/Dart/Elixir | не зависит от фреймворка; сам по себе ничего не рисует |
| **A2UI** (Google) | декларативное плоское JSON-дерево компонентов + отдельная модель данных (`updateComponents`/`updateDataModel`, привязка к путям данных) | **закрытый каталог**: базовый — 12 компонентов (Text, Card, List, Row/Column, Button, TextField…), плюс свои доменные каталоги. Агент только описывает намерение, код на клиенте не выполняется | любой: JSONL-стрим, SSE, WS, A2A, AG-UI, режим Markdown | Apache-2.0 · v0.9.1 в проде, v1.0-RC | React, Angular, Lit, Flutter, **Markdown** (заявлено) |
| **json-render** (Vercel Labs) | плоская JSON-спека (root + map элементов) с `$state/$cond/$computed`, условиями видимости и именованными actions | каталог `defineCatalog` + **Zod-валидация props**: кривой вывод падает с ошибкой, а не рисуется | стрим от модели; пакет `@json-render/mcp` для MCP Apps | Apache-2.0 · ~19k★, очень активен | React, Vue, Svelte, Solid, RN, **ink (терминал)**, **image (SVG/PNG через Satori)**, email (HTML/текст), PDF |
| **Thesys C1 + OpenUI/Crayon** | OpenUI Lang — компактный **собственный язык** разметки (на 50–58% меньше токенов, чем JSON); есть своя модель OUI-1 | свои примитивы компонентов | хостинговый C1 API (платный) или своё размещение OpenUI | OpenUI и Crayon — MIT; C1 — SaaS · активен | React |
| **Tambo** | выбирает зарегистрированный компонент и стримит его props | Zod-схема = определение tool; компоненты «генеративные» и «интерактивные» | свой бэкенд (состояние диалога) | MIT · v1.0 | только React |
| **LangGraph Gen UI** | имя компонента + props (`push_ui_message`) | компоненты пишет разработчик, код подгружается в рантайме (`LoadExternalComponent`) | стрим LangGraph | MIT (платформа — LangSmith) | React |
| **MCP Apps / MCP-UI / OpenAI Apps SDK** | ИИ ничего не генерирует: HTML/JS-виджет пишет разработчик, модель передаёт данные | песочница iframe | MCP (`ui://`) | открытый стандарт · Stable | любой веб; Claude Code и Telegram не рендерят |
| **Adaptive Cards** (Microsoft) | JSON-карточку по схеме 1.5/1.6 (ИИ может генерировать, есть MCP-обёртки) | JSON-схема карточки | любой | MIT · зрелый, но не развивается под агентов | Teams/Outlook/JS/.NET; рендера для Telegram нет |
| **Vercel AI SDK (gen UI)** | вызов tool, который приложение мапит на свой компонент; RSC-путь заморожен | код приложения | стрим AI SDK | Apache-2.0 | React; функционально уже покрыто json-render |

## Три вывода

1. **«Полностью генеративный» у всех зрелых систем = генерация ДЕРЕВА, а не КОДА.** В A2UI, json-render, OpenUI и Adaptive Cards ИИ собирает раскладку и состав экрана сам, но только из компонентов закрытого каталога. Генерацию кода в проде не делает никто. Thesys прямо пишет «generating code for generative UI is a bad idea». MCP Apps и LangGraph гибче за счёт того, что код пишет человек. Значит, разрыва между «полностью генеративно» и «под контролем» нет: контроль держится на каталоге и схеме. Это ровно наш принцип «гибкость в данных, безопасность в коде».

2. **Протокол разделён на три слоя, и брать их стоит по отдельности.** ЧТО показать — формат дерева (A2UI / json-render / OpenUI). КАК доставить — транспорт (AG-UI, MCP Apps, JSONL). ЧЕМ нарисовать — рендерер под каждую поверхность. Для нас слой «чем» — это Telegram и Markdown. Полный набор из коробки есть только у A2UI (Markdown-рендерер) и json-render (ink, image→PNG, текстовое email).

3. **Риск «второго языка программирования» есть везде, отличается дозой.** OpenUI Lang — это прямо отдельный язык, нам он не подходит. В json-render есть выражения (`$cond`, `$computed`) — это мини-язык. В A2UI есть функции каталога и привязки к данным. Безопасное подмножество: каталог плюс привязка к путям данных, без вычислений в спеке. Вычисления остаются в коде (исполнитель вида), а в дерево попадают готовые поля.

## Рекомендация

**Первым брать A2UI как ФОРМАТ дерева вида:**
- Каталог = компоненты, привязанные к видам памяти: `RecordCard`, `RecordList`, `EdgeGraph`, `StatusBoard`. Модель данных = результат `find`/`read`.
- Плюсы: Apache-2.0, открытый стандарт нескольких вендоров (V5 — переносимость спеки), не зависит от транспорта, есть Markdown-путь для Telegram, доставляется и через AG-UI, и через MCP.
- Вычисляемые выражения не включаем.

**json-render держим как запасной вариант и стенд.** Он сильнее как TS-библиотека (Zod-валидация, рендер в PNG для Telegram, MCP Apps). Он же победит, если A2UI v1.0 затянется или Markdown-рендер окажется сырым.

**AG-UI пока не нужен.** У нас транспорт — MCP плюс шлюз. AG-UI понадобится, когда появится живой веб-клиент со стримом состояния.

Самый дешёвый тест: один вид, например «задачи области», в виде A2UI-дерева из 3 компонентов. Исполнитель вида заполняет модель данных, рендерим в Markdown для Telegram и в React-рендерере. Проверяем: (а) модель не выходит за каталог, (б) один и тот же JSON даёт обе поверхности.

Оговорка: Markdown-рендерер A2UI и номера версий взяты из вторичных источников. Перед стройкой их нужно проверить по a2ui.org и GitHub.

Источники: [CopilotKit: AG-UI и A2UI](https://copilotkit.ai/blog/ag-ui-and-a2ui-explained-how-the-emerging-agentic-stack-fits-together) · [A2UI v0.9](https://www.copilotkit.ai/blog/a2ui-whats-new-in-google-generative-ui-spec) · [A2UI custom catalogs](https://a2ui.org/guides/custom-components) · [A2UI components](https://a2ui.org/concepts/components) · [json-render](https://github.com/vercel-labs/json-render) · [Thesys: code-gen — плохая идея](https://www.thesys.dev/blogs/generating-code-for-generative-ui-is-a-bad-idea) · [OpenUI Lang](https://mer.vin/2026/05/openui-lang-mit-generative-ui-that-cuts-llm-output-tokens-versus-json/) · [Tambo](https://github.com/tambo-ai/tambo) · [LangGraph Gen UI](https://docs.langchain.com/langsmith/generative-ui-react) · [AG-UI SDK/события](https://readme.hex.pm/ag_ui_ex/0.1.0)

Итог: решение-кандидат — A2UI-дерево из закрытого каталога видов памяти, без выражений; json-render — запасной вариант; передаю на критика.

Вопрос-цель: ответил — полностью генеративный UI совместим с контролем через закрытый каталог и схему (так устроены все зрелые системы); первым брать A2UI как формат, а вопрос был поставлен верно.
