---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-07-20
Scope: project
node_type: merge-notes
module: M-G3
title: MERGE-NOTES — что уникального в policy-*--decomp против README модуля + domains/01/policy.md
Related:
  - README.md
  - ../../../01-overview/02-domains/01-knowledge-graph/05-policy/policy.md
  - policy-attachment--decomp-2026-07-14.md
  - policy-contents--decomp-2026-07-14.md
  - policy-as-data--decomp-2026-07-14.md
  - policy-as-data-CARD--decomp-2026-07-14.md
---

# MERGE-NOTES (2026-07-20) — policy-дубли из растворённой `decomposition/`

> Для будущего синтеза. По каждому перенесённому файлу — что УНИКАЛЬНО против существующего модуля
> (`README.md`, шейп policy-узла `subject·rule·valueRef·cascadeLevel·scope/applies-to·variant-of`, вердикт
> «много узлов + 1 каскад») и `domains/01-knowledge-graph/policy.md`. Быстрый просмотр. Канон НЕ трогался.

## policy-attachment--decomp-2026-07-14.md (ПРИВЯЗКА)
- **Крупный уникальный вклад:** рефрейм «policy живёт в ДВУХ ортогональных осях» — **A=АВТОРИТЕТ** (cascade
  Конституция>policy>integrity, уже в README) и **B=ОХВАТ** (reach: ячейка→группа→тип→слой→глобально). README
  держит только ось авторитета; ось охвата и её 6 уровней (L0–L5 с таблицей «как крепится/стоимость») — новое.
- **Разрешение конфликта в ДВА шага** (сначала авторитет, потом внутри ранга — частное бьёт общее по охвату) —
  снимает ложный конфликт «Конституция побеждает» vs «частное побеждает». В README резолвер `effective-policy`
  есть, но 2-осевой алгоритм не описан.
- **Открытый спор C-1 (F2):** erase = ТИП (DEC-2) vs ТИП×СЛОЙ (тип `erase=true` в системном слое-журнале) —
  предлагается «оба через разные оси» (тип по охвату + конституционный no-erase слоя по авторитету). Плюс
  открытые D4-Q4 (span-грань как subject) и D8-Q1 (мульти-владелец при равном авторитете+охвате).

## policy-contents--decomp-2026-07-14.md (СОДЕРЖИМОЕ)
- **Уникальный тест-разделитель:** «policy=ПРАВИЛО, паспорт=ЗНАЧЕНИЕ, view-def=ЛОГИКА вывода» — три ведра, одна
  проверка. README перечисляет поля policy-узла, но не даёт критерий «что НЕ кладём в policy».
- **Таблица «что уходит из policy как дубль»:** erase-capability = единственный чистый per-type флаг; retention/
  consent/scope/ACL/confidence — ЗНАЧЕНИЕ на паспорте (policy держит лишь rule-форму/порог/valve со ссылкой);
  «умность категорий» → view-def. Явнее, чем `policy.md` (который держит 7 ценностей→policy, но не границу дублей).
- **Синтез самоописательности через ССЫЛКУ** (Ц5): ячейка несёт `governed-by`-ссылки + паспорт-значения +
  метку `policy_source`, тело правила — один раз в реестре; портируемость через engine-contract handshake или
  снимок `effective-policy` при экспорте. Развилки C1 (узкая governance) и C2 (ссылка vs инлайн-копия).

## policy-as-data--decomp-2026-07-14.md
- Scaffold-однострочник: policy-as-data cross-cutting на всех 4 примитивах; узкие governance-декларации;
  retention/consent/ACL — дом на паспорте (DEC-I-5). Против README нового нет (совпадает с вердиктом модуля).

## policy-as-data-CARD--decomp-2026-07-14.md (theme-card P8)
- **Уникально (владелец 100%):** hard-erase = **свойство ТИПА** (декларация erase-capability), НЕ универсальный
  долг движка — часть типов неудаляемы by design (журнал/определения), личный payload удаляем. Уточняет DL-13/M7.
  (Связь с decisions/SPEC-DRAFT-forgetting-hard-erase.md — где R2 трактует hard-erase как долг движка; тут спор.)
- Открытые для синтеза: FQ7 (каскад hard-erase на потомков-агрегаты), erase vs WAL/бэкапы (crypto-shredding?),
  что ещё кроме erase объявляется per-type (retention/consent/видимость/умность категорий), D5 integrity уровень.
- Мотив «люди сами создают свои модули и единицы памяти» → правила-как-данные без миграций (усиливает growth-модель).

## Для синтезатора (сухой остаток)
1. Ввести ось ОХВАТА (L0–L5) и 2-осевой резолвер в README M-G3 (сейчас только ось авторитета).
2. Зафиксировать инвариант «policy=правило / паспорт=значение / view-def=логика» + таблицу дублей.
3. Развести спор erase: ТИП (SPEC-DRAFT R2 «долг движка») vs ТИП×СЛОЙ vs «свойство типа» (CARD) — три формулировки.
