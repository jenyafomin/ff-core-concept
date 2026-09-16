---
status: draft
owner: jenya.stasik@gmail.com
date: 2026-09-15
scope: project
related:
  - ./OVERVIEW.md
  - ./questions/refuse-vs-serve-with-label.question.md
  - docs/00-states/05-assemble-and-direct/_shared/topics/02-truth-keystone/
  - docs/architecture/ADR/ADR-0008-log-and-graph.md
---

# 06-truth-and-epistemic-status — узел правды субстрата

> Дом темы «**правда и эпистемический статус**»: правда субстрата = 6 осей (провенанс · соответствие-миру ·
> непротиворечивость · свежесть · эпистемо-статус · полнота/тишина). Здесь живёт форк поведения движка на
> спорном/протухшем claim и под-вопрос, является ли правда отдельной ногой субстрата или read-time-лицом.

## Содержимое
- [`OVERVIEW.md`](OVERVIEW.md) — что это простыми словами, зачем, статус, светофор.
- [`questions/refuse-vs-serve-with-label.question.md`](questions/refuse-vs-serve-with-label.question.md) —
  ФОРК (fail-closed vs fail-open) + под-вопрос «нога vs лицо».

## Первоисточник (указатель, не копия)
- `docs/00-states/05-assemble-and-direct/_shared/topics/02-truth-keystone/` — разбор 6 осей (итер.6,
  RESOLVED по осям, форк default НЕ решён).

## Связка
- ADR-0008 (log-and-graph) — субстрат = лог + граф; правда навешивается на этот примитив.
- Ценности: **Ц3 Доверие** (центр — провенанс/калибруемое доверие, защита от отравления/устаревания),
  **Ц1 Читаемость** (метка отдаёт грань дёшево, не вскрывая тело).

## Статус
DRAFT. Форк ждёт владельца (`OWNER-QUEUE` → Q-truth-fork). Кода нет до «строй».
