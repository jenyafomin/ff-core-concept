---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Title: Полная карта навигации docs/
Scope: project
---

# NAVIGATION — Полная карта папок и файлов

**Цель:** быстро найти, где физически лежит каждый материал в дереве docs/.
Читать вместе с `docs/INDEX.md` (точка входа).

---

## РАЗДЕЛ 1: ОРГАНИЗАЦИЯ ПРОЦЕССА (01-organization/)

Как мы работаем, правила, дисциплина, регламент.

```
docs/01-organization/                              ВХОД: docs/01-organization/INDEX.md
├── data-canon/                                    Каноны модели данных/БД (узел, паспорт, рёбра, движок)
│   └── INDEX.md                                   Инварианты хранения истины, правила DATA/DB/CONSTITUTION
├── doc-discipline/                                Стандарт документации (статусы, дерево, конвенции)
│   └── INDEX.md                                   Как форматировать docs, где что лежит, именование
├── process/                                       Протокол диалога, регламент делегирования, тон/фаза
│   └── INDEX.md                                   Цикл раунда: вопрос → ответ → узел → синтез
├── rules-and-skills/                              Место под .claude/rules и скиллы
│   └── INDEX.md                                   Проектируется отдельно (ссылки на внешнее)
├── session-handoff/                               Точка восстановления сессий
│   └── INDEX.md                                   STATE/HANDOFF, как не коллидят сессии
└── CANON-SKELETON-PROPOSAL.md                     Обоснование этого скелета и развилки владельцу
```

**Статус:** ⭐ КАНОН — актуален и основной.

---

## РАЗДЕЛ 2: ПРОЕКТ FF (02-project/)

Что мы строим: фундамент (субстрат), два ядра (brain + агенты) и их контракт.

```
docs/02-project/                                   ВХОД: docs/02-project/INDEX.md
├── substrate/                                     Фундамент: граф узлов, БД, движок как продукт
│   └── INDEX.md                                   Ядро-граф, БД→файлы, клапан на внешние действия
├── core/                                          Два ядра FF и их стык ⟷
│   ├── INDEX.md                                   Обзор связи brain↔агенты, границы ответственности
│   ├── 01-brain/                                  Единица памяти (смысл, узел, паспорт) — АКТИВНОЕ
│   │   └── INDEX.md                               ⟿ Проектируется в docs/topics/10-synthesis/memory-unit/
│   ├── 02-agents/                                 Система агентов через Telegram, реестр прогонов
│   │   └── INDEX.md                               ⟿ Проектируется в /Users/mac16/Documents/IT/Apps/TOOLS/agents-manager
│   └── 03-contract/                               Контракт brain↔агенты (кто читает/пишет граф)
│       └── INDEX.md                               Интерфейс модулей, права доступа
```

**Статус:** ⭐ КАНОН — основной продукт. brain активно проектируется в topics/10-synthesis/memory-unit/.

---

## РАЗДЕЛ 3: ПОРТФЕЛЬ ПРОЕКТОВ (03-projects/)

5 проектов владельца, потребители платформы FF (будущие plug-in).

```
docs/03-projects/                                  ВХОД: docs/03-projects/INDEX.md
├── 7days/                                         Проект 1: 7 дней (целевой трек)
│   └── README.md                                  Цель, статус, связь с FF/субстратом
├── cardex/                                        Проект 2: CardEx (управление карточками)
│   └── README.md                                  Цель, статус, связь с FF/субстратом
├── dwizh/                                         Проект 3: Dwizh (движение, система агентов)
│   └── README.md                                  Цель, статус, связь с FF/субстратом
├── ga-rentacar/                                   Проект 4: GA RentaCar (прокат)
│   └── README.md                                  Цель, статус, связь с FF/субстратом
└── video-social-music/                            Проект 5: Video Social Music
    └── README.md                                  Цель, статус, связь с FF/субстратом
```

**Статус:** ⭐ КАНОН — портфель требований к субстрату. Каждый топик TG может биндиться на свою папку.

---

## РАЗДЕЛ 4: БАЗА ЗНАНИЙ (04-knowladge/)

Общая справка и знания (планируется).

```
docs/04-knowladge/                                 Зарезервирована под базу знаний
```

**Статус:** ПЛАН — структура готова, содержание строится.

---

## РАЗДЕЛ 5: АКТИВНЫЕ РАБОЧИЕ ОБЛАСТИ (topics/10-synthesis/memory-unit/)

**ГЛАВНАЯ АКТИВНАЯ РАБОТА:** проектирование единицы памяти (одна из ядер FF).

```
docs/topics/10-synthesis/memory-unit/              ВХОД: docs/topics/10-synthesis/memory-unit/INDEX.md
├── INDEX.md                                       МАСТЕР-ИНДЕКС: граф целей↔ценностей↔сценариев
├── values/                                        7 ценностей (фундамент)
│   ├── V1-chitaemost.md                           Ц-1: Читаемость (поймешь, что здесь)
│   ├── V2-tozhdestvo.md                           Ц-2: Тождество (canonical_id, разрешение конфликтов)
│   ├── V3-doverie.md                              Ц-3: Доверие (согласие, аудит, инвариант)
│   ├── V4-vitalnost.md                            Ц-4: Витальность (сорт, эмердженс, забывание)
│   ├── V5-suverennost.md                          Ц-5: Суверенность (владеет, экспорт, лок)
│   ├── V6-relyacionnost.md                        Ц-6: Реляционность (ребра, инсайт, граф)
│   └── V7-soglasie.md                             Ц-7: Согласие (referent, цикл), тон
├── open-questions/                                Открытые вопросы FQ1-8 (Fable) + VQ1-4 (Opus)
│   └── INDEX.md                                   Список фундаментальных вопросов для владельца
└── scenarios/                                     Сложные/нелинейные сценарии → вскрытые концепты
    └── INDEX.md                                   Индекс сценариев, решения на масштабе
```

**Статус:** 🔥 АКТИВНОЕ — проектируется СЕЙЧАС (живой index, дата 2026-07-05). Это то, что владелец просил спроектировать.

---

## РАЗДЕЛ 6: АРХИВЫ РАБОТЫ (topics/ остальное)

Второй переход структуры: материалы сессий, анализ, сырьё, логи.

```
docs/topics/00-canon/                              Канон: ценные материалы (копия + ссылка на 01-org)
├── ADR/                                           Одобренные архитектурные решения
└── SPEC/                                          Одобренные спецификации

docs/topics/10-synthesis/                          Выводы агентов после сессий
├── README.md                                      Правило: date-prefix, обратный порядок, живые индексы
├── YYYY-MM-DD-SYNTHESIS-*.md                      Синтез из многоагентной сессии
├── YYYY-MM-DD-SWEEP-*.md                          Обзор сессии
├── YYYY-MM-DD-VERDICT-*.md                        Вердикт / результат gate
├── YYYY-MM-DD-CONCEPT-*.md                        Концептуальная формулировка
└── memory-unit/                                   ⭐ АКТИВНОЕ (см. Раздел 5)

docs/topics/20-analysis/                           Глубокий анализ агентами
├── README.md                                      Входящий материал для синтеза
├── 2026-07-05-deep-scenarios-opus.md              Глубокие сценарии (Opus)
├── 2026-07-05-deep-scenarios-sonnet.md            Глубокие сценарии (Sonnet)
├── 2026-07-05-forgotten-check.md                  Что забыли (критик)
└── 2026-07-05-forgotten-fable-classified.md       Классификация Fable

docs/topics/30-plan/                               Планирование трека/сессий
├── README.md                                      Активные планы, date-prefix
└── 2026-07-04-CANON-three-tracks-and-topic-map.md  Текущий план: 3 трека

docs/topics/40-dialogue/                           Диалоги / расшифровки / вопросы
└── README.md                                      Фиксация обмена с владельцем

docs/topics/50-sessions/                           Логи сессий с датой
├── 2026-07-03-comprehension/                      Сессия X (дата)
└── 2026-07-04-db-v1/                              Сессия Y (дата)

docs/topics/60-raw/                                Raw output агентов (сырьё)
├── README.md                                      Входящий материал из агентов (перед синтезом)
├── 2026-07-04-telegram-comm/                      Raw из Telegram-диалога
└── 2026-07-05-memory-research/                    Raw исследования памяти

docs/topics/70-ideas/                              Идеи (кандидаты в план)
└── README.md                                      Идеи, которые еще не закреплены

docs/topics/80-examples/                           Примеры (граф, узел, сценарии)
└── README.md                                      Конкретные примеры для понимания

docs/topics/90-historical/                         Исторические (прошлые итерации)
└── README.md                                      Архив старых версий

docs/topics/99-qa/                                 QA / проверки
└── README.md                                      Тесты, верификация, чек-листы

docs/topics/TREE.md                                Описание структуры topics/
```

**Статус:** 📦 АРХИВ РАБОЧЕГО — материалы сессий, анализ, сырьё. Читай как входящее, НЕ редактируй без причины.
**Исключение:** `memory-unit/` ⭐ АКТИВНОЕ (перемещено в Раздел 5).

---

## РАЗДЕЛ 7: АРХИВ СТАРОЙ СТРУКТУРЫ (base/)

Первый переход: старая структура (до 2026-07-06). Read-only.

```
docs/base/                                         АРХИВ — переход 1 (НЕ вести, не редактировать)
├── DECISIONS-LOG.md                               Логи решений (для истории)
├── STATE.md                                       Старый статус (superseded, читай только для контекста)
├── HANDOFF-2026-06-16.md                          Старая точка восстановления
├── architecture/                                  Старые ADR
│   └── ADR/                                       
├── council/                                       Логи советов агентов
├── dialogue/                                      Диалоги владельца
├── graph-example/                                 Примеры графа
├── ideas/                                         Старые идеи
├── plan/                                          Старые планы
├── product/                                       Старое описание продукта
├── qa/                                            Старые проверки
├── research/                                      Старые исследования
└── spec/                                          Старые спеки
```

**Статус:** 🔒 АРХИВ — read-only, только для истории. Не редактировать. Новое пишите в 01-02-03, активную работу — в topics/10-synthesis/memory-unit/.

---

## БЫСТРАЯ СПРАВКА: Где что?

| Что ищешь | Где искать |
|-----------|-----------|
| Как мы работаем / дисциплина | `docs/01-organization/` |
| Каноны данных / инварианты БД | `docs/01-organization/data-canon/INDEX.md` |
| Стандарт документов | `docs/01-organization/doc-discipline/INDEX.md` |
| Цель и структура FF | `docs/02-project/INDEX.md` |
| Единица памяти (мозг/brain) | `docs/topics/10-synthesis/memory-unit/INDEX.md` ⭐ АКТИВНОЕ |
| 7 ценностей памяти | `docs/topics/10-synthesis/memory-unit/values/V*.md` |
| Система агентов | `docs/02-project/core/02-agents/INDEX.md` (ссылка на external) |
| Контракт brain↔агенты | `docs/02-project/core/03-contract/INDEX.md` |
| Портфель проектов (5) | `docs/03-projects/*/README.md` |
| Логи сессий с агентами | `docs/topics/50-sessions/` |
| Анализ от агентов | `docs/topics/20-analysis/` |
| Сырьё (raw output) | `docs/topics/60-raw/` |
| Синтез после сессии | `docs/topics/10-synthesis/YYYY-MM-DD-SYNTHESIS-*.md` |
| Планы на будущее | `docs/topics/30-plan/README.md` |
| Открытые вопросы для владельца | `docs/topics/10-synthesis/memory-unit/open-questions/INDEX.md` |
| Старый статус (архив) | `docs/base/STATE.md` (ссылка для контекста) |
| Старые логи решений | `docs/base/DECISIONS-LOG.md` (только история) |

---

## Правила навигации

1. **Входные точки (всегда начни отсюда):**
   - `docs/INDEX.md` — точка входа проекта
   - `docs/02-project/core/01-brain/INDEX.md` — если про мозг/memory-unit
   - `docs/topics/10-synthesis/memory-unit/INDEX.md` — если про значения/ценности ⭐

2. **Дата-префиксы** (в topics/) — читай в обратном порядке (новое первым).
   - `2026-07-06-SYNTHESIS-*.md` свежее чем `2026-07-05-*.md`.

3. **Архив vs канон:**
   - КАНОН: `01-organization/`, `02-project/`, `03-projects/`
   - АРХИВ: `base/`, `topics/` (кроме memory-unit)
   - АКТИВНОЕ: `topics/10-synthesis/memory-unit/`

4. **Quando редактируешь что-то:**
   - Новые материалы → `docs/01-02-03` (канон) или `docs/topics/10-synthesis/memory-unit/` (если про brain).
   - Старые материалы → не трогай, создавай новый файл с датой.
   - Рабочие файлы → `topics/60-raw/`, синтез → `topics/10-synthesis/`.

---

**Последнее обновление:** 2026-07-06 · **Статус:** draft
