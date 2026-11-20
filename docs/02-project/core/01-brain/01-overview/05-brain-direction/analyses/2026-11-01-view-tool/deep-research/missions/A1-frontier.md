---
title: "Миссии ресёрча A1 — фронтир и неожиданные аналогии"
status: draft
owner: jenya.stasik@gmail.com
date: 2026-11-01
type: plan
---
Потребитель: команды исследователей deep-research → findings/. Поглощает: ничего.
Уже известно, не приносить как находку: A2UI, AG-UI, json-render, MCP Apps, Cytoscape, Obsidian Bases (см. ../../raw/01, 05).

## M1. Вид как данные, которые правит сам пользователь (malleable software)
- **Вопрос-цель:** может ли «вид» стать записью в памяти (тип `view`), которую человек и агент правят на равных, не зовя разработчика?
- **Линза:** end-user programming. Вид = документ, а не экран.
- **Что искать:** Ink & Switch: «Malleable software» (2025), Embark, Potluck, Patchwork, Cambria (линзы схем); Geoffrey Litt (Wildcard, «AI + malleable»); Boxer/HyperCard-наследники; Folk Computer; Webstrates/Codestrates; Notion/Coda formulas как DSL; CHI/UIST 2025–26 по запросам «malleable», «end-user customization with LLM».
- **Где:** inkandswitch.com, geoffreylitt.com, ACM DL (UIST/CHI), arXiv cs.HC, X (@geoffreylitt, @inkandswitch).
- **Сильная находка:** формат вида, который хранится как данные, имеет версии и переживает смену рендерера (V5). Подходит под `record` без нового кода.
- **Анти-цель:** обзоры no-code конструкторов, Retool-подобные админки.

## M2. Масштабируемое пространство вместо экранов (spatial/zoomable)
- **Вопрос-цель:** как показать 1350 адресов и граф так, чтобы при приближении грань раскрывалась дёшево (V1 — label→summary→тело)?
- **Линза:** zoom = уровень детализации; семантический зум.
- **Что искать:** semantic zooming, ZUI (Pad++, Jef Raskin «Zoomworld»), Muse, Heptabase, Kinopio, Scrapbox, Fermat, Napkin; «LOD for knowledge graphs», degree-of-interest trees (Card/Nation), fisheye/focus+context; Bret Victor «Dynamicland»; CHI-работы про LLM-кластеризацию на канвасе (Sensecape, Graphologue, Luminate).
- **Где:** arXiv cs.HC, ACM DL, blog.heptabase.com, worrydream.com, GitHub по topic «zoomable-ui».
- **Сильная находка:** правило «что видно на уровне зума N» задаётся данными (у записи — label/summary/body), а не кодом. Этому соответствуют уже существующие поля.
- **Анти-цель:** очередная библиотека раскладки графа, «hairball»-визуализации.

## M3. Интерфейс как живой агент-собеседник (AI-native ОС/браузеры)
- **Вопрос-цель:** что, если вид не отрисовывают заранее, а агент собирает его под намерение и под вопрос, и при этом видно, ЧТО он сделал (V3)?
- **Линза:** интент → эфемерный интерфейс → след.
- **Что искать:** Google «Generative UI» (Gemini dynamic view, 2025), Arc/Dia, Perplexity Comet, OpenAI Atlas, Rabbit LAM, Microsoft «Copilot Pages», Anthropic Artifacts как паттерн; исследования «ephemeral interfaces», «just-in-time UI», «intent-based UI» (Jakob Nielsen 2025), DynaVis, «Jigsaw/PromptInfuser».
- **Где:** research.google/blog, arXiv cs.HC/cs.AI, Nielsen Norman Group, X (@karpathy о «Software 3.0»).
- **Сильная находка:** механизм, который превращает удачный сгенерированный вид в сохраняемую запись с провенансом. Компаунд: следующая генерация дешевле.
- **Анти-цель:** демо чат-ботов, маркетинговые лендинги без механики.

## M4. Игры и дашборды: мир, который читается с одного взгляда
- **Вопрос-цель:** как человеку за 5 секунд увидеть «живость» памяти: что свежее, что остыло (V4), где противоречия (V3), что связано (V6)?
- **Линза:** геймдизайн и операционные пульты: HUD, fog of war, skill tree, мини-карта.
- **Что искать:** «fog of war knowledge», дерево технологий Civilization/Factorio как граф зависимостей, EVE Online map, Dwarf Fortress Legends; Edward Tufte sparklines, «glanceable displays», ambient visualization; Grafana/Datadog «service map» как аналогия рёбер; GDC-доклады про UI информационно плотных игр.
- **Где:** GDC Vault, gamedeveloper.com, IEEE VIS (VAST), Observable, Reddit r/gamedesign.
- **Сильная находка:** визуальная грамматика для статусов (`cold`, `stale`, `confidence`), которую можно привязать к полям записей одним правилом стиля.
- **Анти-цель:** геймификация (баллы, бейджи), красивые скриншоты без переносимой грамматики.

Итог: миссии готовы к раздаче; перед раздачей проверить у критика, нет ли перекрытия с A2–A4.
