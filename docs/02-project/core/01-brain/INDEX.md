---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-21
Scope: project
Related:
  - docs/01-organization/doc-discipline/restructure-2026-07/brain-top-level/AUDIT-MAP-2026-07-21.md
  - docs/01-organization/doc-discipline/restructure-2026-07/brain-top-level/11-facet-template-and-numbering.md
  - docs/02-project/core/01-brain/brain.concept.json
---

# 01-brain — единица памяти · МАСТЕР-ИНДЕКС (канон)

> Ядро смысла FF. **Реструктуризация 2026-07-21:** плоский безномерной корень устранён; дерево собрано в
> нумерованный хребет `01-overview → 02-infrastructure` + контейнеры. Старые пути (`values/`, `domains/`,
> `architecture/`, `infrastructure/`, `synthesis/`, `open-questions/`) больше не существуют.
> Карта переезда: `docs/01-organization/doc-discipline/restructure-2026-07/brain-top-level/AUDIT-MAP-2026-07-21.md`.

## Скелет (верхний уровень)

```
01-brain/
  01-overview/         концепт «как понимаем»
    OVERVIEW.md · L0-memory-unit.md · portrait/ · scenarios/
    01-values/         7 ценностей (карточки V* + декомпозиция 0N-* + _cross-cutting + _archived/gen1)
    02-domains/        домены-ДАННЫХ (01-knowledge-graph = эталон фасет-шаблона)
  03-unit/             единица КАК КОНТРАКТ — СПЕКА ЕДИНИЦЫ v1 (ядро+грани+один путь записи)
  02-infrastructure/   «как строим»
    01-overview/       архитектура-index + db-понимание + stack + scenarios
    02-backend/        движок исполнения + доступ
    04-modules/        M-G1..G5 · M-P3 · ideas/
    _shared/           сквозное (reification…)
  questions/           FQ01-24 + VQ1-4
  analyses/            снапшоты Fable по дате (07-05, 07-12)
  decisions/ + decisions.INDEX.md
  plan/ · todo/ · topics/
  _archived/           устаревшее (state-moved…)
  INDEX.md · brain.concept.json   навигаторы
```

## Слои воронки

| Слой | Что | Где |
|------|-----|-----|
| **L0 — ЦЕЛЬ** | природа единицы + цели Г1-Г39 | [`01-overview/L0-memory-unit.md`](01-overview/L0-memory-unit.md) |
| **L1 — ЦЕННОСТИ** | 7 ценностей (сид→ревизия) | [`01-overview/01-values/`](01-overview/01-values/GROWTH-MAP.md) · сид в [`analyses/2026-07-05-L1-values/`](analyses/2026-07-05-L1-values/) |
| **— портрет** | ячейка «как есть» | [`01-overview/portrait/cell-portrait-now.md`](01-overview/portrait/cell-portrait-now.md) |
| **— сценарии** | нелинейные сценарии → концепты | [`01-overview/scenarios/INDEX.md`](01-overview/scenarios/INDEX.md) |
| **L2 — ИДЕИ/РЕШЕНИЯ** | под каждую ценность — куда копать | [`01-overview/01-values/`](01-overview/01-values/) |
| **КОНТРАКТ — единица** | СПЕКА ЕДИНИЦЫ v1 (ядро+грани+один путь записи+5 швов) | [`03-unit/`](03-unit/INDEX.md) |
| **— синтезы Fable** | сырые диги (снапшоты) | [`analyses/`](analyses/README.md) |
| **— решения** | принятые замки | [`decisions.INDEX.md`](decisions.INDEX.md) |
| **— задачи / план** | список / последовательность | [`todo/TODO.md`](todo/TODO.md) · [`plan/PLAN.md`](plan/PLAN.md) |

## 7 ценностей (карточка-источник + папка-декомпозиция)

| # | Ценность | Карточка-источник | Декомпозиция (6 направлений) |
|---|----------|-------------------|------------------------------|
| Ц-1 | **Читаемость** | [V1](01-overview/01-values/V1-chitaemost.md) | [01-chitaemost/](01-overview/01-values/01-chitaemost/) |
| Ц-2 | **Тождество** | [V2](01-overview/01-values/V2-tozhdestvo.md) | [02-tozhdestvo/](01-overview/01-values/02-tozhdestvo/) |
| Ц-3 | **Доверие** | [V3](01-overview/01-values/V3-doverie.md) | [03-doverie/](01-overview/01-values/03-doverie/) |
| Ц-4 | **Витальность** | [V4](01-overview/01-values/V4-vitalnost.md) | [04-vitalnost/](01-overview/01-values/04-vitalnost/) |
| Ц-5 | **Суверенность** | [V5](01-overview/01-values/V5-suverennost.md) | [05-suverennost/](01-overview/01-values/05-suverennost/) |
| Ц-6 | **Реляционность** | [V6](01-overview/01-values/V6-relyacionnost.md) | [06-relyacionnost/](01-overview/01-values/06-relyacionnost/) |
| Ц-7 | **Согласие** | [V7](01-overview/01-values/V7-soglasie.md) | [07-soglasie/](01-overview/01-values/07-soglasie/) (+ SPEC hard-erase в `decisions/`) |

Открытые вопросы (FQ1-24 · VQ1-4) → [`questions/INDEX.md`](questions/INDEX.md).

## Инфраструктура (модули + движок)

- Модули M-G1..G5 · M-P3 → [`02-infrastructure/04-modules/`](02-infrastructure/04-modules/)
- Костяк + горизонты → [`02-infrastructure/01-overview/infrastructure-INDEX.md`](02-infrastructure/01-overview/infrastructure-INDEX.md)
- Понимание БД → [`02-infrastructure/01-overview/db-readiness/`](02-infrastructure/01-overview/db-readiness/)
- Архитектура-концепт → [`02-infrastructure/01-overview/architecture.concept.json`](02-infrastructure/01-overview/architecture.concept.json)

## Хребет (три уровня)

1. **КОНСТИТУЦИЯ** — инварианты над ячейкой (согласие референта, единый порог доступа, право на забвение).
2. **policy-as-data** — ячейка носит своё поведение («что я есть»).
3. **integrity-as-engine-duty** — категории/связи/дедуп/конфликты/циклы гарантирует только база («что мы вместе»).

## Статус · Следующий шаг

- Переезд PHASE-1 исполнен 2026-07-21 (347→356 файлов, 0 потерь). Навигаторы + внутренние ссылки восстановлены.
- ⚠️ **Долг:** ~200 ссылок на СОСЕДНИЕ деревья (`01-organization/`, `topics/`, `02-agents/`) и переструктурированный владельцем контент ценностей — остаются на аудит (вне карты переезда brain).
- Дальше (concept-first): ответить на несущие — какие **4 домена-модели**, что такое **платформа** (см. `restructure-2026-07/brain-top-level/infra-recording.concept.json`).
