---
node_type: analysis
status: draft
date: 2026-08-01
owner: jenya.stasik@gmail.com
title: T-SYNC — пересборка ADR-0006 (синхронизация память↔файлы); умный синк, job-in-DB, adapters, cache
related:
  - ../../../architecture/ADR/ADR-0006-persistence-as-policy.md
  - ../../../architecture/ADR/ADR-0008-log-and-graph-cqrs.md
  - ../../../architecture/ADR/ADR-0004-layered-scope-resolution-and-capability-access.md
  - ../../../_log/2026-07-26-ff-one-system-vision/post-M0-directions/T2-agents-manager-reconciliation.md
  - ../../../02-project/core/00-kernel/durable-storeport.design.md
  - ../../../02-project/core/00-kernel/decisions/ADR-DRAFT-root-seal-durable-store.md
  - ../../../02-project/core/01-brain/decisions/ADR-DRAFT-fork-discipline-read-write-planes.md
  - ../../../_log/2026-07-26-ff-one-system-vision/design/03-capability-policy-as-data.design.md
  - ../../../base/council/raw/2026-06-24-competitors/agent-user-memory.md
---

# T-SYNC — пересборка ADR-0006 (память↔файлы): умный синк

> **Линза:** analyst — иду ВГЛУБЬ. Владелец решил пересобрать ADR-0006 в части синхронизации.
> Deep-read: ADR-0006, ADR-0008, T2-reconciliation, durable-storeport, root-seal ADR-draft,
> fork-discipline ADR-draft, capability-policy-as-data, Basic Memory competitor. Фаза = дизайн, не код.

---

## 1. Что именно отклонил ADR-0006 и валидно ли это сейчас

ADR-0006 (Alternatives §3) отклоняет РОВНО ОДНУ вещь: **симметричный, неарбитрированный, постоянно-двусторонний
sync file↔DB** («два живых писателя = конфликты + второй источник истины, нарушение I-5»). Это НЕ запрет
«синка вообще»: §(f) уже сосуществует с live fs-watcher для file-first типов (движок = первый ЧИТАТЕЛЬ, не
писатель).

**Ядро возражения ВСЁ ЕЩЁ валидно** и НЕ опрокидывается идеей владельца job-in-DB — ЕСЛИ job строится как:
акт-вид в том же append-only логе, исполняемый ровно одним писателем-на-факт за раз. Возражение реально
воскреснет, только если «выбор источника истины» станет runtime/per-call эвристикой, а не декларативной
type-policy (см. риск §3 и развилку #3).

## 2. Рамка умного синка (без изобретения нового — почти всё уже ратифицировано)

Четыре запроса владельца ложатся ~1:1 на уже существующие куски:

- **Выбор источника истины** = уже ADR-0006 §(b) policy-as-data per-type. Расширить полем
  `sync-mode: none | export-on-demand | watch-live | job-mediated`.
- **Job-в-БД** = новый акт-вид **`sync-intent`** в ТОМ ЖЕ логе `acts[]` — НИКОГДА не отдельная мутабельная
  таблица (иначе воскресает анти-паттерн `decision_journal` из T2: «не event-sourced, нет seq/version»).
  Статус job = read-model проекция над `sync-intent`-актами, идемпотентная по `source_ref` — переиспользуем
  протокол T2 idempotent-consumer + outbox дословно (RECEIVED → RUNNING → ACTS_COMMITTED → DONE).
- **Адаптер-к-чему-угодно** = уже спроектированный StorePort + «MCP = тонкая поверхность, не второй
  write-path» (03-capability-policy-as-data §3). Sync-адаптер = StorePort-подобный порт, исполняющий
  sync-intent в тот ЕДИНСТВЕННЫЙ дом, который называет policy типа — никогда в оба сразу.
- **Само-обновляющийся кэш** = уже паттерн current-state / grant-cache проекции (пересобираема, помечается
  staleness). Формализовать «кэш» просто как ещё один opt-in read-model, НИКОГДА не авторитетный.

## 3. Как НЕ воскресить старые проблемы

- **Один дом остаётся жёстким законом write-plane** (fork-discipline ADR-draft, Форма 3): sync-intent обязан
  резолвиться ровно в ОДИН write-path на факт.
- **Job-акты живут в логе, не в боковой таблице.**
- **Типы доступа/policy/реестра остаются DB-first-only** (ADR-0004 D4) — этой темой не трогаются.
- **Идемпотентность по `source_ref` — обязательна**, не опция.
- 🔴 **Критично: вся рамка ЗАБЛОКИРОВАНА на S7 (durable StorePort).** Сегодня `Engine.write()` = RAM-only,
  акт испаряется в конце хода (durable-storeport.design.md). Асинхронный job-mediated синк недоказуем /
  ложно-зелёный, пока durability не закрыта — ровно тот класс ошибки, что уже поймал M2.

## 4. Supersede или amend?

**AMEND, не supersede.** Ядро ADR-0006 (persistence-per-type, замок «канон пишет только движок», CQRS
write/read-model split) НЕ противоречит желанию владельца — его механизм в основном ФОРМАЛИЗУЕТ уже
ратифицированное (ADR-0006/0008/T2/capability-design). Amend должен добавить: акт-вид `sync-intent`, поле
policy `sync-mode`, явное переиспользование T2 idempotent-outbox протокола, и явную зависимость от S7.
**Supersede оправдан ТОЛЬКО** если владелец реально хочет развернуть саму линию DB-first/file-first (см.
развилку #1) — это другое, более тяжёлое решение.

## 5. Открытые развилки владельцу

1. **Scope:** расширить file-first типы до agent-writable (низкий риск, amend) — ИЛИ сделать DB-first типы
   тоже file-редактируемыми/двусторонними (высокий риск, реальное переоткрытие §b/d)?
2. **Статус job:** акт-вид в существующем логе (рекомендую) — или отдельная job-queue таблица (риск повторить
   `decision_journal` = второй источник истины)?
3. **«Понимание ситуации»:** декларативная per-type policy (безопасно) — или runtime/per-call эвристика
   (небезопасно — нарушает тест fork-discipline «стену держит движок, не автор»)?
4. **Подтвердить:** рамка НЕ идёт в код до закрытия S7 (durable StorePort).
5. **«Само-подстраивающаяся БД»:** трогает ли она когда-либо саму policy/схему (а не только данные)? Если да
   — коллизия с KQ-3 (само-референция policy, ещё открыт) и долгом «Конституция не-переписываема данными».

---

## Итог
Мина ADR-0006 **снимается** паттерном job-in-DB (async, один писатель, акт в логе) — при условии, что выбор
источника истины остаётся ДЕКЛАРАТИВНЫМ (policy-as-data), а не runtime-эвристикой. Это **amend ADR-0006**,
не supersede. Жёсткая предпосылка — сначала S7 (durable StorePort), иначе синк ложно-зелёный.
