# Skills scan — кандидаты под кооперирующую команду loop-engineering

- **Status:** draft (разведка, не установка)
- **Owner:** JenyaFomin
- **Date:** 2026-07-15
- **Scope:** session-handoff 2026-07-14-agents-audit-and-vision
- **Метод сбора:** локальные скиллы взяты из активного контекста сессии (system-reminder «available skills» + список агентов). Веб-инструменты (WebSearch/WebFetch) в этой сессии были **недоступны** — permission-stream систематически падал («Stream closed»), поэтому внешние источники ниже помечены как **advisory / pattern-only** и НЕ проверены вживую. Прямой `ls ~/.claude/skills` / плагинов также не отработал по той же причине; список установленных скиллов достоверен, но пути к файлам не сверены.

> ⚠️ Всё, что помечено `external` / `advisory` — непроверено в этой сессии. Это НЕ истина, а гипотезы для последующей проверки (когда веб/ls заработают).

---

## A. Установленные локально (installed) — подтверждены контекстом сессии

Ядро будущей команды почти целиком уже есть локально. Тема ↔ «зачем в команде».

| # | Имя | Источник | Тема | Зачем нам в команде | Статус |
|---|-----|----------|------|---------------------|--------|
| 1 | `value-decomposition` | локальный (project) | Разложение идей/ценностей | Линза «цель→ценность→направление→идея→инфра-модуль» с циклами самокритики до «сухо» — сердце декомпозиции концепта | installed |
| 2 | `ask-council` | локальный | Мульти-агентная делиберация | Созывает совет ролей, cross-examine + синтез — для развилок без единственно верного ответа | installed |
| 3 | `pos-debate` | локальный (global) | Adversarial / критика | Параллельные агенты: proposal → критика → rebuttal → синтез; готовый red-team-контур | installed |
| 4 | `fable-orchestrator` | локальный | Оркестрация / роутинг | Режим «абстрактный контролёр»: управляет и делегирует, сам не анализирует — верх loop-контура | installed |
| 5 | `fable-advisor` | локальный | Совет на развилке | Дорогой точечный совет сильнейшей моделью на несущей абстракции/тупике | installed |
| 6 | `session-logging` | локальный (project) | Состояние / хендофф | Логирование сессии как папки тем-проекций; правило «тема = тонкая проекция дока» — управление состоянием | installed |
| 7 | `deep-research` | локальный | Ресёрч (L3) | Fan-out веб-поиск → fetch → adversarial verify → cited report; закрывает слой ресёрча воронки | installed |
| 8 | `pos-plan` | локальный (global) | Оркестрация / планирование | Разбивка на батчи задач с зависимостями и gate готовности — раскладка работы петли | installed |
| 9 | `pos-review` | локальный (global) | Ревью / gate | Структурный quality-gate PASS/FAIL с классификацией находок | installed |
| 10 | `pos-bootstrap` | локальный (global) | Вопрос-ориентированное мышление | Guided elicitation → Charter/Constraints — сократический сбор требований | installed |
| 11 | `pos-init` | локальный (global) | Инициализация/классификация | Factory-инициализация: классификация продукта, выбор паков, Launch Kit | installed |
| 12 | `find-skills` | локальный | Мета / discovery | Поиск и подключение скиллов по запросу «нужен скилл для X» — самопополнение команды | installed |
| 13 | `understand-anything:understand` | плагин (understand-anything) | Дерево знаний / граф | Строит интерактивный knowledge-graph кодовой базы (узлы+связи) — прямой аналог concept.json-навигации | installed |
| 14 | `understand-anything:understand-onboard` | плагин | Onboarding maps | Генерит онбординг-гайд для новых участников — карта входа в проект | installed |
| 15 | `understand-anything:understand-domain` | плагин | Дерево знаний / домен | Извлекает бизнес-домен → domain-flow граф; линза «как знание течёт» | installed |
| 16 | `understand-anything:understand-chat` | плагин | Навигация по графу | Вопросы к кодовой базе через граф знаний — QA-навигация | installed |
| 17 | `understand-anything:understand-knowledge` | плагин | Knowledge-graph (wiki) | Анализ wiki/knowledge-base → граф с entity extraction + topic clustering (Karpathy-pattern) | installed |
| 18 | `code-review` | локальный (global) | Ревью / критика | Ревью диффа на баги + reuse/simplify; уровни effort вплоть до multi-agent | installed |
| 19 | `verify` | локальный (global) | Верификация | Прогон изменения end-to-end до «done» — дисциплина «verify before done» | installed |
| 20 | `context7-mcp` | локальный (global) | Ресёрч / доки | Свежая документация библиотек/SDK через Context7 — точечный факт-чек | installed |

Дополнительно установлены (менее релевантны loop-engineering, отмечаю для полноты, вне топ-20):
`simplify`, `loop` (рекуррентный запуск промпта/команды — механика «петли»!), `schedule`, `claude-api`, `run`, `init`, `review`, `security-review`, `update-config`, `dataviz`, `ui-ux-pro-max`, `seedance-prompt-en`, `keybindings-help`, `fewer-permission-prompts`, `telegram:access`, `telegram:configure`.

> Примечание: `loop` (built-in) — прямая инфраструктура «запусти промпт/slash-команду на интервале»; кандидат в механику самой петли, хотя не «мыслительный» скилл.

## A2. Агенты (не скиллы, но роли команды) — подтверждены контекстом

Полезны как «участники» кооперирующей команды поверх скиллов:
- `abstract-thinker` (opus) — вверх по абстракции, сократический метод, ladder — рефрейм проблемы.
- `analyst` (sonnet) — вглубь, атомизация, cyclic-вопросы.
- `critic` (sonnet) — adversarial, red-team.
- `orchestrator` (sonnet) — роутинг по когнитивному типу, gate-менеджмент.
- `prompter` — elicitation через последовательные вопросы до имплементации.
- `system-architect` (opus) — границы/модули, ADR, делегирует анализ.
- Роли совета из `ask-council` — быстрый пул экспертных линз.

---

## B. Внешние / паттерны (external · advisory · НЕ проверено в этой сессии)

Веб был недоступен — ниже известные публичные ориентиры/паттерны по памяти. Проверить, когда заработает WebSearch/WebFetch. Помечать при использовании как advisory, не истину.

| # | Имя / паттерн | Источник (непроверен) | Тема | Зачем нам | Статус |
|---|---------------|----------------------|------|-----------|--------|
| B1 | anthropics/skills (официальный репо skills) | github.com/anthropics/skills (advisory) | Каталог official skills | Референс-набор Anthropic; сверить дубли/качество с локальными | external/advisory |
| B2 | «awesome-claude-skills» / «awesome-claude-code» списки | github (advisory) | Агрегатор скиллов | Источник кандидатов по всем нашим темам разом | external/advisory |
| B3 | Anthropic «Building effective agents» (orchestrator-workers, evaluator-optimizer) | anthropic.com engineering (advisory) | Loop-engineering паттерны | Каноничные петли: evaluator-optimizer = петля качества; orchestrator-workers = раздача задач | pattern-only |
| B4 | Reflexion / self-refine loop | исследовательский паттерн (advisory) | Петля самокритики | Агент критикует свой вывод и переделывает до порога — совпадает с «до сухо» value-decomposition | pattern-only |
| B5 | Socratic-questioning / «5 Whys» промпт-паттерн | общий паттерн | Вопрос-ориентированное мышление | Углубление L0→L1 воронки диалога-проектирования | pattern-only |
| B6 | Claude «subagents»/agent-teams orchestration | docs.claude.com (advisory) | Мульти-агент оркестрация | Официальная механика команд агентов — каркас кооперации | external/advisory |
| B7 | knowledge-graph / GraphRAG skill | github (advisory) | Дерево знаний | Навигация по графу узлов = наш субстрат (msg 141) | external/advisory |
| B8 | red-team / adversarial-review skill | github (advisory) | Критика | Внешний аналог `pos-debate`/`critic` для стресс-теста | external/advisory |

---

## Заметка: какая команда скиллов напрашивается под loop-engineering

Петля = повторяющийся контур «вопрос → декомпозиция → ресёрч → критика → синтез → фиксация состояния», управляемый оркестратором. Из локального набора она собирается почти целиком:

1. **Контролёр петли:** `fable-orchestrator` (+ `pos-plan` для раскладки на батчи, built-in `loop` как механика интервального прогона). Раздаёт задачи, сам не анализирует.
2. **Генерация/декомпозиция:** `value-decomposition` (цель→ценность→идея, циклы до «сухо») + `pos-bootstrap`/`prompter` для сократического elicitation.
3. **Ресёрч-слой (L3):** `deep-research` + `context7-mcp` — добыть и факт-чекнуть внешнее (advisory до ратификации).
4. **Критика/red-team:** `pos-debate` + `ask-council` + агент `critic`; для кода — `code-review`. Это «evaluator» в evaluator-optimizer петле (B3/B4).
5. **Состояние и карта знаний:** `session-logging` (хендофф/состояние) + `understand-anything:understand*` (граф знаний/онбординг-карта) — чтобы петля не теряла контекст между ходами и имела навигацию concept.json-типа.

Недостающее (искать во внешних источниках, когда веб оживёт): выделенный **evaluator-optimizer** скилл-контур как единое целое и готовый **knowledge-graph/concept.json** навигатор именно для доков (не кода). Оба сейчас закрываются комбинацией локальных, но специализированного скилла нет.
