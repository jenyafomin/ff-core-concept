---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-06-24
Type: competitor-research
Subject: Understand-Anything
---

# Конкурент-ресёрч: Understand-Anything

> Сравниваем с нашей моделью (ADR-0002 «тонкий паспорт интерпретации» + ребра несут принадлежность/каскад).
> Фаза = DESIGN. Цель — извлечь идеи, не копировать.

## 1. Что это (идентификация)

- **Имя:** Understand-Anything (он же `/understand` plugin).
- **Автор:** изначально **Lum1104 (Yuxiang Lin)**, теперь поддерживает организация **Egonex-AI**. MIT.
- **URL:**
  - Активный: https://github.com/Egonex-AI/Understand-Anything
  - Зеркало/оригинал: https://github.com/Lum1104/Understand-Anything
  - README: https://github.com/Egonex-AI/Understand-Anything/blob/main/README.md
  - Разбор: https://dev.to/arshtechpro/understand-anything-turn-any-codebase-into-an-interactive-knowledge-graph-37ed
  - Лендинг: https://ai-trove.com/en/understand-anything
- **Одной строкой:** превращает любую кодовую базу / wiki / доки в **интерактивный граф знаний**, который можно
  исследовать, искать и спрашивать. ~54.7k звёзд.
- **Это НЕ «агрегатор жизни».** Это инструмент **онбординга в код**: «понять чужой репозиторий».
  Пересечение с нами — только в архитектуре данных (граф узлов + агенты строят его), не в продукте.

### Технологический стек
- TypeScript (~71%), JS (~16%), Python (~9%), Astro (лендинг ~2.5%).
- Монорепо на **pnpm workspaces**. Тесты **Vitest**, линт ESLint.
- Дашборд: **React + Vite + Zustand (store)**, граф — React Flow-подобный (CustomNode/ContainerNode/PortalNode),
  раскладка через **ELK** + web-worker, кластеризация **Louvain** (`utils/louvain.ts`), i18n (en/zh/zh-TW/ja/ko/ru).
- Парсинг кода — **Tree-sitter** (детерминированно) + LLM поверх (intent-саммари).
- Поставляется как **плагин** для Claude Code, Cursor, Copilot, Codex, Gemini CLI, OpenCode и ~10 других.

## 2. Внутреннее устройство (модель данных и хранение)

### Хранилище
- Один файл: **`.understand-anything/knowledge-graph.json`** (источник истины графа).
- Рядом: `config.json` (язык/настройки), `intermediate/` (черновики, не коммитятся),
  `diff-overlay.json` (трекинг изменений, локально).
- Делятся графом через git (коммитят `.understand-anything/` минус `intermediate/` и `diff-overlay`); >10MB → git-lfs.
- Т.е. **единый JSON-документ**, не файлы-узлы. Противоположно нашему «файлы = истина, связь по id».

### Схема (из `packages/core/src/types.ts` — авторитетно)

Корень `KnowledgeGraph`: `version · kind?("codebase"|"knowledge") · project · nodes[] · edges[] · layers[] · tour[]`.

**GraphNode** (21 тип узла: 5 code + 8 non-code + 3 domain + 5 knowledge):
```
id · type · name · filePath? · lineRange?[start,end] · summary · tags[] ·
complexity("simple"|"moderate"|"complex") · languageNotes? · domainMeta? · knowledgeMeta?
```
- `domainMeta`: entities[], businessRules[], crossDomainInteractions[], entryPoint, entryType(http|cli|event|cron|manual)
- `knowledgeMeta`: wikilinks[], backlinks[], category, content

**GraphEdge** (35 типов ребёр в 8 категориях):
```
source · target · type · direction("forward"|"backward"|"bidirectional") · description? · weight(0..1)
```
- Structural: imports, exports, contains, inherits, implements
- Behavioral: calls, subscribes, publishes, middleware
- Data flow: reads_from, writes_to, transforms, validates
- Dependencies: depends_on, tested_by, configures
- Semantic: related, similar_to
- Infrastructure: deploys, serves, provisions, triggers
- Schema/Data: migrates, documents, routes, defines_schema
- Domain: contains_flow, flow_step, cross_domain
- Knowledge: cites, contradicts, builds_on, exemplifies, categorized_under, authored_by

**Layer**: id · name · description · **nodeIds[]** (логическая группировка — слой ссылается на узлы, узел НЕ хранит слой).
**TourStep**: order · title · description · nodeIds[] · languageLesson? (обучающий маршрут по зависимостям).

### Конвейер агентов (6 шт., оркестрируются)
1. project-scanner — находит файлы, языки, фреймворки
2. file-analyzer — извлекает функции/классы/импорты → **создаёт узлы и ребра** (до 5 параллельно, 20-30 файлов/батч)
3. architecture-analyzer — назначает слои (API, Service, Data, UI, Utility)
4. tour-builder — генерит обучающие туры по порядку зависимостей
5. graph-reviewer — валидирует полноту и ссылочную целостность
6. domain-analyzer — извлекает бизнес-домены, потоки, шаги (для `/understand-domain`)

Гибрид: Tree-sitter (факты) + LLM (смысл). Инкрементально — пере-анализ только изменённых файлов.
Команды: `/understand`, `/understand-dashboard`, `/understand-chat`, `/understand-diff`,
`/understand-explain <path>`, `/understand-onboard`, `/understand-domain`, `/understand-knowledge`,
`/understand --auto-update`, `--language ru`.

### Сравнение с НАШЕЙ моделью

| Аспект | Understand-Anything | Наша модель (ADR-0002) |
|---|---|---|
| Истина | один `knowledge-graph.json` (производный артефакт) | md+frontmatter, файлы = истина, связь по `id` |
| Узел | «толстый»: summary, tags, complexity, domainMeta, knowledgeMeta встроены | «тонкий паспорт» ~9 полей; нагрузка отдельно, читается без открытия |
| Принадлежность/каскад | через `Layer.nodeIds` + ребра `contains`; нет «одного home» | ровно ОДНО `home`-ребро = каскадный хребет (лес, ацикличный) |
| Многомерность | узел в нескольких слоях/ребрах свободно | `facet-of` ребра (файл = и «сервис», и «про сделки») |
| Control-plane как узлы | НЕТ — типы/слои зашиты в код (NodeType/EdgeType enum) | TYPE/LENS/PATTERN/CONNECTOR — тоже узлы |
| Богатство связей | 35 типов ребёр, direction, weight, описания | у нас связь = ребро по id; их таксономия — хороший ориентир |
| Эпистемика/доверие | НЕТ epistemic/sensitivity/principal | есть метки epistemic/sensitivity + «клапан» на необратимое |
| Кто пишет | агенты строят, человек только смотрит (read-only) | агенты читают И пишут обратно; всё видно ИИ |
| Векторы/эмбеддинги | НЕТ отдельного vector store — «semantic search» это LLM-запрос к графу | (открытый вопрос у нас) |
| Регенерация | граф можно выбросить и пересобрать из кода | граф первичен, не пересобирается из «реальности» |

**Главное отличие философии:** у них граф — **производная, одноразовая, read-only проекция кода** (теряешь —
пересоберёшь). У нас граф — **первичный субстрат**, в который агенты пишут (память, трейсы, задачи) и который НЕ
выводится из чего-то внешнего. Поэтому их «толстый узел в одном JSON» им подходит, а нам — нет.

## 3. Интерфейс просмотра + горячие клавиши

### Навигационная модель
- Force-directed граф в браузере: pan / zoom / клик по узлу. Раскладка ELK + Louvain-кластеры.
- Клик по узлу → панель `NodeInfo`: plain-English саммари, callers/callees (входящие/исходящие ребра),
  место в архитектуре, фрагмент кода (`CodeViewer`).
- **Слои** цвето-кодированы (LayerLegend): API / Service / Data / UI / Utility.
- **Поиск** (`SearchBar`): двухрежимный — **Fuzzy** (по имени/тегам) и **Semantic** (по смыслу,
  «which parts handle auth?»). Плейсхолдер: «Search nodes by name, summary, or tags…».
- **Туры** (`LearnPanel`): пошаговый маршрут по зависимостям с «languageLesson» (учит идиомам языка).
- **Persona-adaptive UI** (`PersonaSelector`): junior dev / PM / power user — меняет уровень детализации.
- **Domain view** (`DomainGraphView`): горизонтальный граф бизнес-процессов (домены → потоки → шаги).
- **PathFinder** (`PathFinderModal`): найти путь между двумя узлами.
- **Filter / Export / Diff / Theme**: фильтр по типам узлов, экспорт PNG/SVG/JSON, diff-режим, выбор темы.
- Отдельный мобильный слой (MobileLayout, MobileBottomNav, MobileDrawer) + onboarding overlay.

### Горячие клавиши (авторитетно — из `App.tsx` + `useKeyboardShortcuts.ts`)
Реализованы как переиспользуемый хук + модалка-справка `KeyboardShortcutsHelp` (категории General/Navigation/Tour/View).
Хук **глушит шорткаты при фокусе в input/textarea** (кроме Escape) — аккуратная деталь.

| Клавиша | Категория | Действие |
|---|---|---|
| `Shift + ?` | General | показать/скрыть справку по шорткатам |
| `Escape` | Navigation | закрыть панели/модалки / вернуться к обзору |
| `/` | Navigation | фокус в строку поиска |
| `→` (ArrowRight) | Tour | следующий шаг тура |
| `←` (ArrowLeft) | Tour | предыдущий шаг тура |
| `d` | View | переключить diff-режим |
| `f` | View | переключить панель фильтров |
| `e` | View | переключить меню экспорта |
| `p` | View | открыть path finder |

- `formatShortcutKey` авто-рендерит ⌘/⇧/⌥ под Mac vs Ctrl/Alt под Win — кросс-платформенно.
- «Press ? anytime to toggle this help / Press ESC to close» — обнаруживаемость встроена.

### Что хорошо / что слабо в UI
**Хорошо:** строка `/` как в Vim/GitHub; единая модалка-справка `?`; Escape-каскад «закрыть → назад к обзору»;
персона-режимы (одни данные, разная глубина); туры с обучением; двухрежимный поиск; кросс-платформенный рендер клавиш.
**Слабо:** нет j/k или стрелочной навигации **по графу** (стрелки заняты под туры, не под перемещение фокуса между
узлами) — нельзя «ходить по рёбрам» с клавиатуры, только мышью; нет команд-палитры (Cmd+K); шорткаты — одиночные
буквы (d/f/e/p) без мнемо-группировки; всё read-only — клавишами ничего не редактируешь/не создаёшь.

## 4. Уроки для нас (takeaways)

1. **Таксономия ребёр — готовый ориентир.** Их 35 типов в 8 категориях (Structural/Behavioral/Data-flow/Deps/
   Semantic/Infra/Schema/Domain/Knowledge) + `direction` + `weight(0..1)` + `description` — это зрелый словарь
   семантики связей. Наши `home`/`facet-of` — про принадлежность; для остальных смыслов их список стоит
   адаптировать. **`weight` на ребре** — дешёвый сигнал силы связи, у нас его нет.
2. **`?`-справка + `/`-поиск + Escape-каскад — заимствовать как стандарт нашего вьюера.** Паттерн
   «хук шорткатов глушит ввод в полях, кроме Esc» + авто-генерируемая модалка из массива шорткатов — чистая,
   копируемая архитектура (один источник: массив `{key, category, description, action}` → и биндинг, и справка).
3. **Persona-adaptive view = наши LENS.** Они одной кнопкой переключают глубину (junior/PM/power). Это ровно наш
   LENS-как-узел, но у них захардкожено. Подтверждает ценность LENS — и показывает, что НАШ вариант (lens = узел,
   а не enum) сильнее: пользователь сможет добавлять свои линзы. (см. [[project-center-of-gravity]])
4. **Подтверждение «control-plane как enum» = тупик.** У них NodeType/EdgeType — зашитые в код TypeScript-enum (21/35).
   Расширить = форкнуть и пересобрать. Это валидирует наше решение делать TYPE/PATTERN/CONNECTOR **узлами** —
   расширяемость без редеплоя. Их жёсткость = наш аргумент.
5. **«Толстый узел в одном JSON» — анти-паттерн для нашего случая.** Им норм, потому что граф одноразовый и read-only.
   Нам он ломает «тонкий паспорт» (нельзя читать метаданные без парса всего узла) и git-дружелюбность (один большой
   файл = конфликты). Подтверждает наш выбор md+frontmatter, файл-на-узел. Не повторять их хранение.
6. **Пробел, который мы можем закрыть: навигация по графу с клавиатуры.** У них стрелки заняты под туры, ходить по
   рёбрам нельзя. Для agent-first вьюера сильная идея — **навигация по `home`/`facet` рёбрам с j/k/стрелок + Cmd+K
   палитра** (прыжок к любому узлу/типу/линзе). Это «улучшение интерфейса», о котором говорил владелец.
7. **Двухрежимный поиск (Fuzzy + Semantic) без отдельного vector store.** Их «semantic» — это LLM-запрос к графу,
   а не эмбеддинг-БД. Полезный намёк для нашего открытого вопроса о векторах: на старте можно НЕ строить vector store,
   а делать смысловой поиск как агент-запрос к графу. Дешевле, проще, отложить решение о векторах.
8. **Read-only — их потолок, наш дифференциатор.** Весь UI только смотрит; агенты пишут, человек наблюдает. Наша
   модель «агенты читают И пишут, всё видно ИИ, клапан на необратимое» — это другой и более амбициозный продукт.
   Не путать их UX-паттерны (хороши для просмотра) с нашими нуждами (нужно ещё и действие/редактирование).
