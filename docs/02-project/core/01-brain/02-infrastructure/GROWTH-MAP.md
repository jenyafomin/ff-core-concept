---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-21
Scope: project
node_type: growth-map
title: 02-infrastructure — карта роста ветки
Related:
  - ./README.md
  - ../../../01-organization/doc-discipline/restructure-2026-07/brain-top-level/AUDIT-MAP-2026-07-21.md
  - ../../../01-organization/doc-discipline/restructure-2026-07/brain-top-level/11-facet-template-and-numbering.md
---

# GROWTH-MAP · 02-infrastructure

Как ветка «как строим» углубляется. Скелет (нумерованный хребет + underscore-бакеты):

```
02-infrastructure/
  01-overview/      ← вход: индекс архитектуры, костяк инфры, стек, сценарии, db-readiness, MIGRATION-BLUEPRINT
  02-backend/       ← движок исполнения (CONCEPT-02), доступ/policy-as-data (CONCEPT-03)
  03-frontend/      ← (пока пусто) UI-слой платформы
  04-modules/       ← M-G1..G5, M-P3 (фасет-модули) + ideas/ (пул 16 модулей)
  _shared/          ← сквозные РЕШЁННЫЕ механики (reification.md)
  _unverified/      ← (завести при появлении) выявленные-но-нерешённые механики; вокруг «крутим вопросы»
```

## Направления углубления

1. **`01-overview/` — кандидаты на дальнейший разнос:**
   - `stack/` (01-database · 02-api-graphql · 03-infra-taxonomy) — вероятно выделится в свой
     под-раздел платформы/стека, когда backend/frontend наполнятся.
   - `infrastructure-open-questions.md` (OQ-1..10) — **временный дом**. Позже сольётся в общий
     `questions/` ветки (в AUDIT-MAP цель — `questions/infrastructure-oq.md`). Пока лежит в
     overview, чтобы не потерять; при заведении `questions/` — перенести туда.
   - `01-overview/MIGRATION-BLUEPRINT.md` — карта переноса; по завершении реструктуризации станет архивным
     (кандидат в `_archived/`).

2. **`02-backend/` — зеркало концепт-доменов:** по мере проектирования backend раскладывается
   теми же паттернами, что и модель: `domains/` (зеркало концепт-доменов, те же NN) → логика ·
   единицы (entities) · endpoints · data · сервисы; `_shared/` внутри (utils · middlewares ·
   guards — ⚠️ кандидаты, подтвердить надобность).

3. **`04-modules/` — фасет-форма:** каждый модуль `M-*` описывается фиксированным набором слотов
   (01-explain · 02-entities · 03-relations · 04-mechanics · 05-policy · 06-nuances · decisions/).
   `ideas/` — сырьё-пул, из которого кристаллизуются новые модули.

4. **`_shared/` vs `_unverified/`:** решённая сквозная механика → `_shared/`; выявленная, но ещё
   не решённая → завести `_unverified/` (рабочее имя; ⚠️ альтернатива `_on-verify/`), внутри может
   быть много аналитики и свой внутренний номер.

## Параллельный трек — безопасность/доступ

Отдельно от хребта деривации развивать **модуль безопасности/доступа к данным**: что может
получать АГЕНТ и что — ПОЛЬЗОВАТЕЛЬ. Не часть хребта; кандидат в свой `_`-модуль или отдельный
домен. Пока частично живёт в `02-backend/CONCEPT-03-access-permissions.md`; при разрастании —
выделить в самостоятельный сквозной трек.
