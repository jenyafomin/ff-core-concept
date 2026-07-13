---
Status: active
Owner: jenya.stasik@gmail.com
Date: 2026-07-06
Scope: project
Related:
  - docs/01-organization/doc-discipline/section-types-registry.md
  - docs/01-organization/doc-discipline/2026-07-06-reorg-and-section-types.md
  - docs/02-project/core/01-brain/MIGRATION-BLUEPRINT.md
---

# 01-brain — единица памяти · МАСТЕР-ИНДЕКС (канон)

> Ядро смысла FF. **Перенесено 2026-07-06 из `topics/10-synthesis/memory-unit/` в дерево** (реорг: канон
> живёт здесь, сырьё остаётся в `topics/` как источник). Топик 56 (brain/память) · Оркестратор: Opus.
> Одна навигируемая карта трека. Новые ветки видны и не мешаются со старыми.

## Слои воронки

| Слой | Что | Где |
|------|-----|-----|
| **L0 — ЦЕЛЬ** | природа единицы + 39 целей (Г1-Г39) | [`L0-memory-unit.md`](L0-memory-unit.md) |
| **L1 — ЦЕННОСТИ** | 7 ценностей (сид Opus → ревизия Fable) | [seed](values/2026-07-05-L1-values-seed.md) · [Opus+L2](values/2026-07-05-L1-values-and-L2-task.md) · [ревизия Fable](values/2026-07-05-L1-values-fable.md) |
| **— портрет** | ячейка «как есть» | [`portrait/cell-portrait-now.md`](portrait/cell-portrait-now.md) |
| **— сценарии** | нелинейные сценарии → концепты | [индекс](scenarios/INDEX.md) |
| **L2 — ИДЕИ/РЕШЕНИЯ** | под каждую ценность — куда копать | [values/](values/) |
| **— синтезы Fable** | сырые диги (промежуточное) | [synthesis/](synthesis/) |
| **— решения** | принятые замки | [decisions/DECISIONS-LOG.md](decisions/DECISIONS-LOG.md) |
| **— задачи / план** | плоский список / последовательность | [todo/](todo/TODO.md) · [plan/](plan/PLAN.md) |

## Источник-сырьё (остаётся в `topics/`, канон ссылается)

- ресёрч prior art → [`topics/60-raw/2026-07-05-memory-research/`](../../../topics/60-raw/2026-07-05-memory-research/)
- забытое → [критик](../../../topics/20-analysis/2026-07-05-forgotten-check.md) · [класс Fable](../../../topics/20-analysis/2026-07-05-forgotten-fable-classified.md)
- deep-сценарии → [Opus](../../../topics/20-analysis/2026-07-05-deep-scenarios-opus.md) · [Sonnet](../../../topics/20-analysis/2026-07-05-deep-scenarios-sonnet.md)

## 7 ценностей (папка на каждую)

| # | Ценность | Файл | Несёт цели |
|---|----------|------|-----------|
| Ц-1 | **Читаемость** | [values/V1-chitaemost.md](values/V1-chitaemost.md) | Г1·Г3·Г4·Г6·Г13·Г21·Г23·Г35·Г37 |
| Ц-2 | **Тождество** | [values/V2-tozhdestvo.md](values/V2-tozhdestvo.md) | canonical_id·Г12·В2·конфликт |
| Ц-3 | **Доверие** | [values/V3-doverie.md](values/V3-doverie.md) | Г7·Г8·Г9·Г10·Г11 |
| Ц-4 | **Витальность** | [values/V4-vitalnost.md](values/V4-vitalnost.md) | Г12·Г15·salience·забывание |
| Ц-5 | **Суверенность** | [values/V5-suverennost.md](values/V5-suverennost.md) | Г14·Г19·Г22·Г26·Г27·Г29·Г30·Г33·Г34 |
| Ц-6 | **Реляционность** | [values/V6-relyacionnost.md](values/V6-relyacionnost.md) | Г16·Г17·Г25·Г28·Г32·ребро-инсайт |
| Ц-7 | **Согласие** | [values/V7-soglasie.md](values/V7-soglasie.md) | Г18·Г20·Г24·Г31·Г38·referent |

Открытые вопросы (FQ1-24 · VQ1-4) → [open-questions/INDEX.md](open-questions/INDEX.md).

## Декомпозиция ценностей → направления → идеи (цикл 1, 2026-07-09)

По методу `value-decomposition` (образец — agents-manager): каждая ценность вскрыта на **направления**
(грани), под каждым — веер развилок и пул идей. Сквозные идеи (задевают ≥2 ценностей) подняты в
`infrastructure/`. Папки-направления живут рядом со старыми `V*`-файлами (те — источник, не удалены).

| Ценность | Папка (README + направления) | Напр. |
|---|---|:--:|
| Ц-1 Читаемость | [values/01-chitaemost/](values/01-chitaemost/README.md) | 6 |
| Ц-2 Тождество | [values/02-tozhdestvo/](values/02-tozhdestvo/README.md) | 6 |
| Ц-3 Доверие | [values/03-doverie/](values/03-doverie/README.md) | 6 |
| Ц-4 Витальность | [values/04-vitalnost/](values/04-vitalnost/README.md) | 6 |
| Ц-5 Суверенность | [values/05-suverennost/](values/05-suverennost/README.md) | 6 |
| Ц-6 Реляционность | [values/06-relyacionnost/](values/06-relyacionnost/README.md) | 6 |
| Ц-7 Согласие | [values/07-soglasie/](values/07-soglasie/README.md) | 6 |

**Инфраструктура (сквозные модули, сосед `values/`):** [infrastructure/](infrastructure/README.md) —
16 модулей · [INDEX.md](infrastructure/INDEX.md) (костяк + горизонты) ·
[ideas/candidates.md](infrastructure/ideas/candidates.md) · [open-questions.md](infrastructure/open-questions.md).
Несущий костяк: Паспорт(policy-as-data) · canonical_id · Bitemporal(В2) · Единый-PEP · Конституция.

**Снимок-синтез (по запросу → результат → на момент):**
[infrastructure/SYNTHESIS-01-2026-07-09.md](infrastructure/SYNTHESIS-01-2026-07-09.md) — 3 цикла
(дивергенция · креатив · сценарии→инфра), 16 модулей + ~20 новых кандидатов, 8 конституционных развилок.
Сценарные разборы: [infrastructure/scenarios/](infrastructure/scenarios/) (01…07).

## Хребет (три уровня)

1. **КОНСТИТУЦИЯ** — инварианты над ячейкой (согласие референта, единый порог доступа, право на забвение).
2. **policy-as-data** — ячейка носит своё поведение («что я есть»).
3. **integrity-as-engine-duty** — категории/связи/дедуп/конфликты/циклы гарантирует только база («что мы вместе»).
> DATA = «что я есть» · DB = «что мы вместе» · CONSTITUTION = «что нельзя нарушить».

## Заложить СЕЙЧАС (ретрофит невозможен)

referent+hard-erase · source=origin+effective · рёбра «проводят поток» · статус-nascent · снапшот-в-момент.

## Статус · Следующий шаг

- Ждём ответы владельца по FQ/VQ → ратификация 7 ценностей → engine-spec / ADR «Конституция памяти».
- `plan/PLAN.md` пуст — ждёт форвард оркестрации по brain.
- ⚠️ **Долг:** аудит внутренних ссылок в перенесённых файлах (относительные пути сместились) — см. session-handoff.
