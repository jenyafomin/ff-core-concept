---
Status: review
Owner: jenya.stasik@gmail.com
Date: 2026-07-22
Scope: project
node_type: fork
title: F8 — `category-taxonomy`: закрыть форк?
Related:
  - ../README.md
  - ../../../doc-discipline/restructure-2026-07/brain-top-level/PLACEMENT-AUDIT-2026-07-21.md   # §9
  - ../../../../architecture/ADR/ADR-0005-data-substrate-structure.md   # Ratified-by: ADR-0005 (консолидация 9 форков)
---

# F8 — `category-taxonomy`: закрыть форк?

## Вопрос
Ратифицировать ли **закрытие** форка `category-taxonomy` → запись в `decisions.INDEX`?

## Варианты
- **(А)** Закрыть — формально решён 2026-07-13 (категория = грань графа).
- **(Б)** Держать открытым — как настаивает GROWTH-MAP.

## Ход мысли — что учесть (открыто, не исчерпывающе)
- Формально решён 07-13 (грань графа), но GROWTH-MAP держит открытым — рассинхрон канон-доков (см. F9).
- Закрытие = ратификация + перенос в `decisions.INDEX` (LOSE-NOTHING).

## От чего зависит / downstream
- F9 (какой канон-док побеждает: решение 07-13 vs GROWTH-MAP).

## РЕШЕНИЕ: **(А) закрыть — грань графа, не отдельный домен** _(синтез 2026-07-22, ждёт кивка владельца → ADR)_
- F9 уже решил арбитра: при конфликте канон-доков побеждает спайн/`data-canon` (и его исполнение —
  `decisions.INDEX`), а не GROWTH-MAP. Рассинхрон 07-13-решение ↔ GROWTH-MAP — ровно тот случай, что F9 закрывает.
- Содержательно вопрос уже отвечен дважды: `decisions.INDEX` DL-09/DL-10 («категория = container+членство (акт)»,
  «домен 03 = грань домена 01, policy-группа taxonomy в M-G3, НЕ отдельный домен») и архивный stub
  `01-overview/02-domains/_archived/03-category-taxonomy-domain.md` подтверждает, что доменный вариант отклонён.
- GROWTH-MAP (`01-overview/02-domains/GROWTH-MAP.md`, Status: draft, 2026-07-21) держит вопрос открытым только
  потому, что не синхронизирован с решением — не потому, что есть новый содержательный аргумент. Существенных
  открытых вопросов не осталось.
- **Действие закрытия:** (1) ратифицировать в `decisions.INDEX` — добавить строку, ссылающуюся на DL-09/DL-10 как
  на закрывающие category-taxonomy; (2) в `GROWTH-MAP.md` (02-domains) на строки 32/39 проставить `Supersedes:
  decisions.INDEX#DL-10` и статус вопроса → resolved (LOSE-NOTHING: строки остаются, но помечены как снятые).
