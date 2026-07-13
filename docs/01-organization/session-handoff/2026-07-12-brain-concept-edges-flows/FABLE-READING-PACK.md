---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-12
Scope: project
node_type: navigator
Related:
  - ../../../02-project/core/01-brain/open-questions/2026-07-12-FABLE-Q-brain-concept-edges-flows.md
---

# 🧭 FABLE READING PACK — навигатор к вопросу «архитектура узла и связи»

> Отдельный файл-навигатор (просьба владельца): «где что находится, какие концепты».
> **Как пользоваться (Fable):** MUST-READ читаешь сам (мало, точно). DELEGATE — отдаёшь агенту за
> выжимкой, свой контекст НЕ жжёшь. ALREADY-DECIDED — не пересобирать, строить НА этом.
> Все пути — полные от корня репо FF. Кросс-проект помечен «ВНЕ проекта» абсолютом.

## ✅ ALREADY-DECIDED (опора, не пересобирать)
| Что решено | Где |
|---|---|
| Связь = сущность памяти, не FK (но паспорт узко — только рёбра-утверждения, В4) | `docs/02-project/core/01-brain/values/06-relyacionnost/README.md` |
| Тип ребра = контракт каскада (направление проработано) | `docs/02-project/core/01-brain/values/06-relyacionnost/02-typed-edges-and-cascade/` |
| «Поток» = обобщение 3 обходов графа (провенанс/consent-taint/forgetting) | `docs/02-project/core/01-brain/infrastructure/open-questions.md` (OQ-8) |
| Реактивность = слой НАД памятью, DAG-инвариант + read-time дефолт | `docs/02-project/core/01-brain/open-questions/SYNTHESIS-2026-07-07-reactivity.md` |
| Брейн = 3 scope + адресация path/node-ID/ref | `docs/02-project/core/01-brain/synthesis/2026-07-12-brain-scopes-and-identity.md` |

## 📖 MUST-READ (читать самому — мало и точно)
| Концепт | Путь | Зачем |
|---|---|---|
| Ядро развилки (рёбра→потоки, раунд-2) | `docs/02-project/core/01-brain/open-questions/CANDIDATE-2026-07-12-edge-type-and-flows.md` | сам вопрос + грани владельца |
| «Ребро как гражданин» (edge-as-citizen) | `docs/02-project/core/01-brain/values/06-relyacionnost/01-edge-as-citizen/` | развилка «сущность vs поле» |
| Тождество (узел vs его варианты) | `docs/02-project/core/01-brain/values/02-tozhdestvo/README.md` | где кончается узел |
| Хребет + «Заложить СЕЙЧАС» (retrofit-cost) | `docs/02-project/core/01-brain/INDEX.md` | критерий now/later |
| FQ23 — почему НЕ использовать как гейт | `docs/02-project/core/01-brain/open-questions/FQ23-stop-pravilo-sloyov/INDEX.md` | не прошёл дог-фудинг |

## 🗂️ DELEGATE (большие каноны — отдать агенту за выжимкой)
| Массив | Путь | Что вытащить |
|---|---|---|
| Полный канон вопросов (FQ) | `docs/02-project/core/01-brain/open-questions/INDEX.md` | только FQ, задевающие узел/ребро/поток |
| Инфраструктура (16 модулей, костяк) | `docs/02-project/core/01-brain/infrastructure/INDEX.md` | какие модули завязаны на рёбра/распространение |

## 🔗 CROSS-SYSTEM (память + агенты как одно целое)
- ⭐ **Мост brain ↔ схема БД агентов** (карта соответствий + развилка слить/мост): `docs/01-organization/session-handoff/2026-07-12-brain-concept-edges-flows/cross-ref-loop-engineering.md`
- Дайджест стыка brain↔агенты (6 точек, 5 идей Loop, вопросы): `docs/01-organization/session-handoff/2026-07-12-brain-concept-edges-flows/raw/cross-system-loop.md`
- Цели памяти и агентов: `docs/topics/10-synthesis/2026-07-04-GOALS-why-memory-and-agents.md`
- **ВНЕ проекта** — разбор Loop Engineering + требования к схеме БД (сущности, локальность, 15 задач Fable): `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/00-organization/session-handoff/2026-07-12-loop-engineering-repo-analysis/concept.json`
- **ВНЕ проекта** (Loop Engineering / петли, план): `/Users/mac16/Documents/IT/Apps/TOOLS/agents-manager/docs/plan/PLAN-0002-loop-engineering-adoption.md`

## ⚠️ BLIND-SPOT (пробел — решить, в объёме или нет)
«Память-как-инструмент»: diff/снапшоты (что менялось за промежуток) · аналитика изменений · явные сферы,
которые память НЕ охватывает. В каноне **не назван** — это §3.4 вопроса к Fable (да/нет в эту сессию).

## Сырьё этой подготовки (для прозрачности)
- `raw/brain-navigator.md` · `raw/cross-system-loop.md` · `raw/fable-framing.md` (в этой же папке).
