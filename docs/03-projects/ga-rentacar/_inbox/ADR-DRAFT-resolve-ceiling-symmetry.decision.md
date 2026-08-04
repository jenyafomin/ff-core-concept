---
Status: draft
Owner: jenya.stasik@gmail.com
Date: 2026-08-03
Scope: project
node_type: decision
title: "resolve() Constitution-ceiling: асимметрия write(prefix)/read(exact) — ратификация (форк F-5 = R8)"
Related:
  - ../analyses/13-post-m2-review-and-m3-gap.analysis.md          # R8 = источник форка
  - ../../../../packages/engine/src/core/resolve.ts               # PEP, строки 224 / 235
  - ../../../../packages/engine/test/fixtures/nodes-cap.json      # 273-276: seed intent
  - ../../../../docs/architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md
---

# ADR-DRAFT: Constitution-ceiling — асимметрия write/read

> **Fork ID:** F-5 (= R8 из post-M2-review). Изначально черновик назвал эту тему «форк F-3» —
> это была КОЛЛИЗИЯ (канонический F-3 = home granularity/fail-open). В канон-реестре этой темы не было;
> присвоен новый номер **F-5 (= R8)** (2026-08-04).

## Context
`resolve.ts` — единственный PEP. Потолок Конституции — зажим ПОСЛЕ свёртки (ADR-0004): `effective = clamp(fold(stack), floor=deny, ceiling=Конституция)`. Зажим двунаправленный, с РАЗНОЙ семантикой:
- **write** (`:224`) `protected_namespaces.some(ns => node.id.startsWith(ns))` — **PREFIX**.
- **read** (`:235`) `no_read.includes(node.id)` — **EXACT**.

Не регрессия портирования: прототип `run-capability.mjs:171,181` имел ту же форму; заголовок — «Ported VERBATIM». Наследованный, никогда не ратифицированный gap.

**Заземление намерения (не проза — seed-корпус).** `nodes-cap.json:273-276`: `protected_namespaces = ["meta:type/","meta:envelope","policy:constitution","policy:access-priority","meta:cap/core:"]` — это СЕМЕЙСТВА control-plane. `no_read = ["node:sealed-diary"]` — ОДИН приватный узел. Имена полей уже кодируют форму: *namespaces* (мн., семейство) vs *no_read* (список id).

## Decision — вариант (c): ратифицировать асимметрию как задуманную форму
Два разных ПОТОЛКА под две разные обязанности ядра:
- **write = namespace-ceiling (prefix)** — обязанность *integrity*. Control-plane узлы неймспейснуты (`meta:cap/core:*`), новый `meta:cap/core:X` защищён АВТОМАТически. Prefix строго СОДЕРЖИТ exact (полный id — префикс самого себя) ⇒ выразительность не теряется.
- **read = per-node-ceiling (exact)** — обязанность *приватность-как-исключение*. Субстрат agent-first: «всё видно ИИ» — запрет чтения минимальный и точечный (печать конкретного `sealed-diary`), не по семейству.
Асимметрия ВЫРАВНЕНА с двумя обязанностями, а не случайна.

**Легибилити-долг (реальная ловушка R8) закрываем именами, не симметрией:** переименовать `no_read → no_read_ids` (exact); зарезервировать опциональный `no_read_namespaces` (prefix) — добавить, ТОЛЬКО когда возникнет реальная нужда запечатать семейство на чтение. Переименование = отдельная обвязанная правка (не в этом ADR).

## Alternatives considered
- **(a) read → prefix (симметрия, fail-closed-leaning).** Отклонено: `no_read:["node:sealed-diary"]` начнёт молча блокировать `sealed-diary-2`, `sealed-diary-notes`; короткий префикс способен обвалить чтение целого семейства. Тихое РАСШИРЕНИЕ запрета читать бьёт по субстрату «всё видно ИИ» — availability/correctness-риск.
- **(b) write → exact (симметрия, fail-open-leaning).** Отклонено как security-регрессия: пришлось бы перечислять КАЖДЫЙ id неймспейса; любой будущий `meta:cap/core:X` остаётся НЕзащищённым до ручного добавления. Fail-open drift → write-bypass control-plane.
- **(c) оставить разными + переименовать.** Принято (см. выше).

## Consequences
+ Оба потолка сохраняют свою обязанность; нулевая потеря выразительности (prefix ⊇ exact на write).
+ Согласовано с ADR-0004 (ceiling=Конституция) и субстратом agent-first.
+ Имена станут само-документирующими; будущий жилец не примет форму за баг.
− Асимметрия остаётся на поверхности до переименования (митигируется этим ADR + тестами).
− `no_read_namespaces` — будущий код-путь (по нужде, не сейчас).

## Validation plan (ОБЯЗАТЕЛЬНО до/вместе с любой правкой)
Сейчас зажим НЕ покрыт: во всех `test/*.ts` `protected_namespaces` и `no_read` = `[]` (clamp никогда не срабатывает). Добавить ДО переименования:
1. **write-clamp:** непустой `protected_namespaces=["meta:cap/core:"]` ⇒ write на `meta:cap/core:new` от субъекта без `core:manage-core` = DENY; от держателя = ALLOW; **новый** узел под неймспейсом защищён без правки политики (доказывает prefix-намерение).
2. **read-clamp:** `no_read=["node:sealed-diary"]` ⇒ read DENY даже когда grant + `readable_by` = ALLOW; **сиблинг** `node:sealed-diary-2` НЕ заблокирован (доказывает exact-намерение).
3. Регресс-якорь: тест падает, если кто-то «выровняет» семантику без нового ADR.

## Owner decision needed
Утвердить (c) как есть, ИЛИ (a)/(b). Отдельно: делать ли переименование `no_read→no_read_ids` сейчас (R1, требует правки fixtures + resolve.ts) или отложить, оставив тесты-якоря.
