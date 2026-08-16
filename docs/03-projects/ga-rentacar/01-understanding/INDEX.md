---
node_type: overview
status: active
topic: rentacar-understanding
owner: jenya.stasik@gmail.com
date: 2026-08-16
---

# Реестр понимания — RENTACAR (brain-first)

> **Что это.** Единая карта того, что УЖЕ ЕСТЬ в реальной системе аренды авто
> `RENTACAR_EXCEL_ANALYTICS`, сведённая brain-first (узлы/рёбра/проекции). Фаза 1 метода топика
> `RENTACAR`. Не документируем заново — **свести два дома (real docs + FF дизайн) в карту + gaps**,
> затем поверх строить ТЗ под бизнес-процессы (Фаза 2). Дом реестра: этот каталог. LOSE-NOTHING.

## Содержимое (вид)
| Файл | Что | Статус |
|---|---|---|
| `analyses/01-system-map.analysis.md` | Карта кода/сервисов, кандидат-центр, хаос-точки | draft |
| `analyses/02-data-and-sheets.analysis.md` | 3 Google-таблицы, сущности, граф, грязь данных | draft |
| `analyses/03-business-processes.analysis.md` | BP1–BP17 + где полезен агент (опора Фазы-2) | draft (BA) |
| `analyses/04-existing-docs-and-gaps.analysis.md` | Карта двух домов, перекрытия, что ещё нужно | draft |
| `ideas/01-agents-as-projections.idea.md` | Видение владельца: агенты=проекции (сырьё) | draft |
| `questions/open.question.md` | Открытые вопросы Q1–Q21 (owner-decisions + gaps) | draft |

> **Адверсариал-волна 2026-08-16 (critic + co-orchestrator):** вердикт помощника — CLEAR. Критик
> внёс патчи в 01/02/04/05 (заземлены в коде): исправлен порядок синка (Customers ДО Orders),
> PK→уникальный бизнес-ключ, DATA-MODELS.md помечен УСТАРЕВШИМ (реальные entity уже имеют
> trustLevel/sync-gate/tenantId — пересканировать до ТЗ), «центр» понижен до гипотезы. Q17–Q21 — приоритетные.

## Источники (grounds, не дублировать)
- Реальный код/доки: `/Users/mac16/Documents/IT/Apps/PROJETS/RENTACAR_EXCEL_ANALYTICS` (`docs/ba/*`, `docs/DATA-MODELS.md`, `docs/architecture/*`).
- FF дизайн-линия: `docs/03-projects/ga-rentacar/` (ценности, узел/ребро, дедуп, spine P1-P2).

## Состояние
- **Фаза 1 (реестр):** скелет + 4 инвентаря + видение + вопросы собраны (v0, 2026-08-16, синхр. волна).
- **Фаза 2 (ТЗ):** не начата. Опора — `analyses/03-*` + BP-карта брата.
- **Открыто:** Q1–Q16 (`questions/open.question.md`) — часть блокирует переход к ТЗ.

## Следующий ход
1. Ответы владельца по Q1–Q4 (видение) и Q5–Q8 (данные) → приоритизировать.
2. Достроить недостающие инвентари, если критик/помощник подсветят дыры.
3. По «строй ТЗ» — взять 1 бизнес-процесс (напр. штрафы или Investor P&L) как вертикальный срез.
