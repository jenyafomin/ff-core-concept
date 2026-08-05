---
Status: proposed
Owner: jenya.stasik@gmail.com
Date: 2026-08-04
Scope: project
node_type: decision
title: "resolve() Constitution-ceiling: асимметрия write(namespace/prefix)/read(exact) — ратификация (форк F-5 = R8)"
Related:
  - ../analyses/13-post-m2-review-and-m3-gap.analysis.md          # R8 = источник форка
  - ../../../../packages/engine/src/core/resolve.ts               # PEP, зажимы resolveWrite / resolveRead
  - ../../../../packages/engine/test/resolve-ceiling.test.ts      # validation (RED→GREEN, 7 тестов)
  - ../../../../packages/engine/test/fixtures/nodes-cap.json      # seed intent (policy:constitution)
  - ../../../../docs/architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md
Maturity: 88% (реализовано + покрыто тестами) — вариант (c) построен по owner-«строй» (2026-08-04): write-ceiling переведён с плоского deny на GATED namespace-prefix (holder core:manage-core проходит), read-ceiling переименован `no_read → no_read_ids` (exact) + добавлено зарезервированное `no_read_namespaces` (prefix). Validation plan ВЫПОЛНЕН: test/resolve-ceiling.test.ts — RED (3 падения на старом коде) → GREEN (7/7); capability.test.ts 7/7 (fixture-rename без регресса). Остаток до 100%: формальная owner-ратификация статуса proposed→approved и перенос ADR из _inbox в docs/architecture/ADR/.

# ADR-DRAFT: Constitution-ceiling — асимметрия write/read

> **Fork ID:** F-5 (= R8 из post-M2-review). Изначально черновик назвал эту тему «форк F-3» —
> это была КОЛЛИЗИЯ (канонический F-3 = home granularity/fail-open). В канон-реестре этой темы не было;
> присвоен новый номер **F-5 (= R8)** (2026-08-04).

## Context
`resolve.ts` — единственный PEP. Потолок Конституции — зажим ПОСЛЕ свёртки (ADR-0004): `effective = clamp(fold(stack), floor=deny, ceiling=Конституция)`. Зажим двунаправленный, с РАЗНОЙ семантикой:
- **write** (`resolveWrite`) `protected_namespaces.some(ns => node.id.startsWith(ns))` — **PREFIX**.
- **read** (`resolveRead`) `no_read.includes(node.id)` — **EXACT**.

Не регрессия портирования: прототип `run-capability.mjs:171,181` имел ту же форму; заголовок — «Ported VERBATIM». Наследованный, никогда не ратифицированный gap.

**Второй, отдельно найденный дефект (при постройке 2026-08-04):** прежний write-зажим был ПЛОСКИМ (`if (constDeny) return DENY`) — денаил ВСЕХ под protected-namespace, включая держателя `core:manage-core`. Это противоречило и seed-намерению (`policy:constitution.note`: «reject writes from anyone LACKING core:manage-core» — т.е. держатель ДОЛЖЕН проходить), и validation-плану ниже (item 1: «from holder = ALLOW»). Гейт `canWriteNamespace` с правильной gated-логикой уже существовал, но НЕ был вшит в write-путь. Вариант (c) закрывает это: write-ceiling теперь gated.

**Заземление намерения (не проза — seed-корпус).** `nodes-cap.json:273-276`: `protected_namespaces = ["meta:type/","meta:envelope","policy:constitution","policy:access-priority","meta:cap/core:"]` — это СЕМЕЙСТВА control-plane. `no_read = ["node:sealed-diary"]` — ОДИН приватный узел. Имена полей уже кодируют форму: *namespaces* (мн., семейство) vs *no_read* (список id).

## Decision — вариант (c): ратифицировать асимметрию как задуманную форму
Два разных ПОТОЛКА под две разные обязанности ядра:
- **write = namespace-ceiling (prefix), gated by `core:manage-core`** — обязанность *integrity*. Control-plane узлы неймспейснуты (`meta:cap/core:*`), новый `meta:cap/core:X` защищён АВТОМАТически. Держатель `core:manage-core` проходит потолок; остальные — deny. Prefix строго СОДЕРЖИТ exact (полный id — префикс самого себя) ⇒ выразительность не теряется.
- **read = per-node-ceiling (exact)** — обязанность *приватность-как-исключение*. Субстрат agent-first: «всё видно ИИ» — запрет чтения минимальный и точечный (печать конкретного `sealed-diary`), не по семейству.
Асимметрия ВЫРАВНЕНА с двумя обязанностями, а не случайна.

**Легибилити-долг (реальная ловушка R8) закрыт именами, не симметрией — РЕАЛИЗОВАНО (2026-08-04):**
- `resolveRead`: `no_read → no_read_ids` (exact) переименовано; добавлено зарезервированное `no_read_namespaces` (prefix) — рабочее, пустое по умолчанию, включается только когда возникнет реальная нужда запечатать семейство на чтение.
- `resolveWrite`: поле `protected_namespaces` сохранено (уже само-документирует prefix + gated-обязанность), но зажим переведён с плоского deny на **gated** (см. Context, второй дефект).
- Fixture `test/fixtures/nodes-cap.json`: `policy:constitution` обновлён под канонические имена (`no_read_ids` + `no_read_namespaces: []`).
- Прочие тесты держат `no_read: []` (пусто) — безвредный dead-field после переименования; косметическая уборка отдельным проходом (не трогалось, чтобы не столкнуться с durable-агентом на harness-файлах).

## Alternatives considered
- **(a) read → prefix (симметрия, fail-closed-leaning).** Отклонено: `no_read:["node:sealed-diary"]` начнёт молча блокировать `sealed-diary-2`, `sealed-diary-notes`; короткий префикс способен обвалить чтение целого семейства. Тихое РАСШИРЕНИЕ запрета читать бьёт по субстрату «всё видно ИИ» — availability/correctness-риск.
- **(b) write → exact (симметрия, fail-open-leaning).** Отклонено как security-регрессия: пришлось бы перечислять КАЖДЫЙ id неймспейса; любой будущий `meta:cap/core:X` остаётся НЕзащищённым до ручного добавления. Fail-open drift → write-bypass control-plane.
- **(c) оставить разными + переименовать.** Принято (см. выше).

## Consequences
+ Оба потолка сохраняют свою обязанность; нулевая потеря выразительности (prefix ⊇ exact на write).
+ Согласовано с ADR-0004 (ceiling=Конституция) и субстратом agent-first.
+ Имена само-документирующие (`no_read_ids` exact / `no_read_namespaces` prefix); будущий жилец не примет форму за баг.
+ Устранён скрытый дефект: держатель `core:manage-core` больше не денаится плоским write-зажимом (совпадает с seed-намерением).
+ Регресс-якорь в тесте падает, если кто-то «выровняет» семантику без нового ADR.
− `no_read_namespaces` реализован, но по умолчанию пуст (мёртвый путь до первой реальной нужды — сознательно).
− Остаточный косметический долг: пустые `no_read: []` в durable/прочих тест-файлах не переименованы (чтобы не столкнуться с параллельным агентом) — убрать отдельным проходом.

## Validation plan — ВЫПОЛНЕН (RED→GREEN)
Тест: `packages/engine/test/resolve-ceiling.test.ts` (7 тестов, hermetic-графы через `load([...])`, без правки shared-фикстур). Прогон: `npx vitest run test/resolve-ceiling.test.ts`.
- **RED (старый код):** 3 падения — (a) held-write ожидал ALLOW, код давал DENY (плоский зажим); (b) `no_read_ids` игнорировался (код читал `no_read`); (c) `no_read_namespaces` не существовал.
- **GREEN (после правки):** 7/7. Покрыто:
  1. **write-clamp (prefix+gated):** `protected_namespaces=["meta:cap/core:"]` ⇒ write на НОВЫЙ `meta:cap/core:brand-new` от субъекта без `core:manage-core` = DENY; от держателя = ALLOW; узел вне неймспейса не тронут.
  2. **read-clamp (exact):** `no_read_ids=["node:sealed-diary"]` ⇒ read DENY даже при `readable_by`=ALLOW; сиблинг `node:sealed-diary-2` НЕ заблокирован.
  3. **read-clamp (reserved prefix):** `no_read_namespaces=["node:sealed-"]` ⇒ оба сиблинга DENY (доказывает, что семейный запрет доступен по нужде).
  4. **Регресс-якорь:** один тест фиксирует асимметрию write=PREFIX / read=EXACT — падает при «выравнивании».
- **Регресс-контроль:** `capability.test.ts` 7/7 (fixture-rename без потерь). Полный пакет: 87/88 — единственное падение `idempotency.test.ts` вне этой зоны (WIP параллельного durable-агента, не связано с зажимами).

## Owner decision needed
Ратифицировать статус `proposed → approved` и перенести ADR из `_inbox/` в `docs/architecture/ADR/` (ADR-000N). Альтернативы (a)/(b) отклонены и построен (c) по owner-«строй» 2026-08-04.
