---
node_type: question
title: "Открытые развилки durable-store (кристаллизованы 2026-08-04)"
status: open
topic: durable-store-substrate
owner: jenya.stasik@gmail.com
date: 2026-08-04
source: councils/2026-08-04-S7-durable-store/SYNTHESIS.md
---

# Открытые развилки — durable-store субстрат

Закрытая → переносится в `decisions/` этой темы. Каждая несёт следующий раунд проработки.

## OQ-1 · Ветка-гипотеза = форк ЛЕНТЫ или вариант ПРОЕКЦИИ? 🔑 (уровень FQ25)
Блокирует расширение StorePort под acts-as-git (Ц3).
- (A) **форк журнала** — расходящаяся история, merge/выброс = «настоящий git», тянет к concurrency/CRDT (дорого).
- (B) **вариант проекции** — та же лента, другой reducer, «ветка» = линза, дёшево, одна истина.
Решать РЕШЕНИЕМ, не кодом (иначе рецидив паттерна P-06). *Владелец 08-04: пока не обдумывать.*

## OQ-2 · PID-reuse в single-writer lock (из R3)
Crash-mid-turn журнал переживает, НО: если ОС переиспользует PID мёртвого писателя под живой чужой процесс,
`pidAlive` вернёт true → boot fail-closed до ручного снятия lock. Нужен heartbeat / start-time-тайбрейк?
Актуально только если шлюз быстро крутит PID. → измерить/решить.

## OQ-3 · Отдельный `kind: file_edit` для file-first актов? (из R2)
Сейчас file-first перо порождает `domain_event` (единственный kind, что граф сворачивает). Отдельный
`file_edit`/`file_observation` = аддитивная правка frozen `ACT_KINDS` в `types.ts`. Заводить свой kind или
оставить на `domain_event` с `provenance.source='file-first'`?

## OQ-4 · R4 — batch/turn-level идемпотентность + egress-outbox (не построено, риск конфликта с core)
Дедуп работает только для 1 `domain_event` на ход; co-emitted `observation`-акты не дедупятся →
claim ADR-draft-0009 «exactly ONE act-batch» не держится на batch-уровне. Egress-outbox (T2 guard) не начат
→ S7 закрыл половину dup-LLM/dup-egress бага. Строить отдельной волной (не в параллель с store-core)?

## OQ-5 · Дом журнала на диске — подтвердить
R1 положил по умолчанию в gitignored `.store/` (переопределяется `--store-dir`). Ок? Или per-topic под
`.gateway/`? doc-discipline-решение.

## OQ-6 · Reconcile двух моделей узла (store-port ↔ @ff/core, TODO M3, из R2)
Проза md → типизированный envelope: сейчас тело едет verbatim в `payload.content`. Полная реконсиляция —
дизайн-шов, не решён. Нужен ли, и в каком объёме?

## Шире (из HANDOFF 08-01, ещё не проработано — «разные идеи», о которых просил владелец)
- **Само-апгрейд** (GitHub-для-агентов): под клапаном vs автономная самомодификация правил (бьётся о Конституцию/KQ-3).
- **Динамическая пересборка папок-в-папках** в новые слои абстракции — про дерево `docs/` или граф данных?
- **«Клиент» + n8n-тулкит** — домен-сущность / коннектор-плагин / generic-слой? (3 прочтения).
- **Policy-scope** — узел с каким уровнем видимости (project/universal), связать с ADR-0004 LSR + constitution.md.
